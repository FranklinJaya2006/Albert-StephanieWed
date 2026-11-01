import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { FastifyInstance, FastifyRequest } from "fastify";

type Booking = { id: string; token: string; name: string; attending: "yes" | "no"; event: string; guests: number; createdAt: string };
type Options = { filename: string; adminPassword?: string; adminName?: string; secureCookies?: boolean; allowTestReservations?: boolean };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export function registerWedding(app: FastifyInstance, options: Options) {
  if (options.filename !== ":memory:") mkdirSync(path.dirname(path.resolve(options.filename)), { recursive: true });
  const db = new DatabaseSync(options.filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, request_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL, attending TEXT NOT NULL CHECK(attending IN ('yes','no')),
      event TEXT NOT NULL CHECK(event IN ('ceremony','reception','both','')),
      guests INTEGER NOT NULL CHECK(guests BETWEEN 0 AND 5), createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS checkins (
      reservation_id TEXT NOT NULL REFERENCES reservations(id), event TEXT NOT NULL CHECK(event IN ('ceremony','reception')),
      scannedAt TEXT NOT NULL, operator TEXT NOT NULL, PRIMARY KEY(reservation_id,event)
    );
    CREATE TABLE IF NOT EXISTS wishes (id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, name TEXT NOT NULL, message TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS reservations_created ON reservations(createdAt);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON admin_sessions(expires_at);
    CREATE TABLE IF NOT EXISTS invitations (id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, name TEXT NOT NULL, maxGuests INTEGER NOT NULL CHECK(maxGuests BETWEEN 1 AND 5), createdAt TEXT NOT NULL);
  `);
  if (!db.prepare("PRAGMA table_info(reservations)").all().some((column) => column.name === "invitation_id")) db.exec("ALTER TABLE reservations ADD COLUMN invitation_id TEXT REFERENCES invitations(id)");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS reservation_one_per_invitation ON reservations(invitation_id) WHERE invitation_id IS NOT NULL");
  app.addHook("onClose", async () => { db.close(); });
  const sessionCookie = (value: string, age: number) => `wedding_session=${value}; Path=/api/wedding; HttpOnly; SameSite=Strict; Max-Age=${age}${options.secureCookies ? "; Secure" : ""}`;
  const adminName = options.adminName || "admin";
  const configured = Boolean(options.adminName && options.adminPassword && options.adminPassword.length >= 8);
  const expectedPassword = scryptSync(options.adminPassword ?? randomBytes(32).toString("hex"), "wedding-admin-password", 64);
  const limits = new Map<string, { count: number; until: number }>();
  function allowed(request: FastifyRequest, kind: string, max: number) {
    const now = Date.now();
    for (const [key, value] of limits) if (value.until < now) limits.delete(key);
    const key = `${kind}:${request.ip}`;
    const entry = limits.get(key) ?? { count: 0, until: now + 15 * 60000 };
    entry.count++; limits.set(key, entry);
    return entry.count <= max;
  }
  function authorized(request: FastifyRequest) {
    const token = /(?:^|;\s*)wedding_session=([a-f0-9]{64})(?:;|$)/.exec(request.headers.cookie ?? "")?.[1];
    return token && db.prepare("SELECT 1 FROM admin_sessions WHERE token_hash=? AND expires_at>?").get(hash(token), Date.now());
  }
  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/api/wedding/")) return;
    reply.header("Cache-Control", "no-store");
    if (!["GET", "HEAD"].includes(request.method)) {
      const origin = request.headers.origin;
      if (request.headers["sec-fetch-site"] === "cross-site" || (origin && !["http:", "https:"].some(protocol => origin === `${protocol}//${request.headers.host}`))) {
        return reply.status(403).send({ error: "Cross-site requests are not allowed." });
      }
    }
    if (request.url.startsWith("/api/wedding/admin/") && !authorized(request)) return reply.status(401).send({ error: "Please sign in." });
  });
  const booking = (token: string) => db.prepare("SELECT id,token,name,attending,event,guests,createdAt FROM reservations WHERE token=?").get(token) as Booking | undefined;

  app.get("/api/wedding/reservation-options", async () => ({ allowUninvited: options.allowTestReservations === true }));
  app.get<{ Params: { token: string } }>("/api/wedding/invitations/:token", async (request, reply) => {
    if (!/^[a-f0-9]{64}$/.test(request.params.token)) return reply.status(404).send({ error: "Invalid invitation link. Please use the personal link sent by the organizer." });
    const invite = db.prepare("SELECT id,name,maxGuests FROM invitations WHERE token=?").get(request.params.token);
    if (!invite) return reply.status(404).send({ error: "Invitation not found. Please contact the organizer." });
    const saved = db.prepare("SELECT token FROM reservations WHERE invitation_id=?").get(String(invite.id));
    return { name: invite.name, maxGuests: invite.maxGuests, reservation: saved ? booking(String(saved.token)) : null };
  });
  app.post<{ Body: { name?: unknown; maxGuests?: unknown } }>("/api/wedding/admin/invitations", async (request, reply) => {
    const { name, maxGuests } = request.body ?? {};
    if (typeof name !== "string" || !name.trim() || name.length > 120 || typeof maxGuests !== "number" || !Number.isInteger(maxGuests) || maxGuests < 1 || maxGuests > 5) return reply.status(400).send({ error: "Enter a guest name and a party limit between 1 and 5." });
    const invite = { id: randomUUID(), token: randomBytes(32).toString("hex"), name: name.trim(), maxGuests, createdAt: new Date().toISOString() };
    db.prepare("INSERT INTO invitations VALUES(?,?,?,?,?)").run(invite.id, invite.token, invite.name, maxGuests, invite.createdAt);
    return reply.status(201).send(invite);
  });
  app.get("/api/wedding/admin/invitations", async () => db.prepare("SELECT i.id,i.token,i.name,i.maxGuests,i.createdAt,r.id AS reservationId FROM invitations i LEFT JOIN reservations r ON r.invitation_id=i.id ORDER BY i.createdAt DESC LIMIT 100").all());

  app.post<{ Body: { name?: unknown; attending?: unknown; event?: unknown; guests?: unknown; requestKey?: unknown; invitationToken?: unknown } }>("/api/wedding/reservations", { bodyLimit: 8192 }, async (request, reply) => {
    if (!allowed(request, "reservation", 300)) return reply.status(429).send({ error: "Too many submissions. Please try again later." });
    const input = request.body ?? {};
    let name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name || name.length > 120 || !["yes", "no"].includes(String(input.attending)) || typeof input.requestKey !== "string" || !/^[\w-]{16,100}$/.test(input.requestKey)) return reply.status(400).send({ error: "Please enter a valid name and attendance." });
    const event = input.attending === "yes" ? input.event : "";
    const guests = input.attending === "yes" ? input.guests : 0;
    if (input.attending === "yes" && (!["ceremony", "reception", "both"].includes(String(event)) || typeof guests !== "number" || !Number.isInteger(guests) || guests < 1 || guests > 5)) return reply.status(400).send({ error: "Choose an event and between 1 and 5 guests." });
    const invite = typeof input.invitationToken === "string" && /^[a-f0-9]{64}$/.test(input.invitationToken)
      ? db.prepare("SELECT id,name,maxGuests FROM invitations WHERE token=?").get(input.invitationToken) : undefined;
    if (!invite && (options.allowTestReservations !== true || input.invitationToken)) return reply.status(403).send({ error: "Please use your personal invitation link to confirm your attendance." });
    if (invite) {
      name = String(invite.name);
      const saved = db.prepare("SELECT token FROM reservations WHERE invitation_id=?").get(String(invite.id));
      if (saved) return booking(String(saved.token));
      if (Number(guests) > Number(invite.maxGuests)) return reply.status(400).send({ error: `This invitation allows up to ${invite.maxGuests} guests.` });
    }
    const previous = db.prepare("SELECT token,invitation_id FROM reservations WHERE request_key=?").get(input.requestKey);
    if (previous && String(previous.invitation_id ?? "") !== String(invite?.id ?? "")) return reply.status(409).send({ error: "Please refresh your invitation and try again." });
    if (previous) return booking(String(previous.token));
    const id = randomUUID(), token = randomBytes(32).toString("hex");
    try {
      db.prepare("INSERT INTO reservations(id,token,request_key,name,attending,event,guests,createdAt,invitation_id) VALUES(?,?,?,?,?,?,?,?,?)").run(id, token, input.requestKey, name, String(input.attending), String(event), Number(guests), new Date().toISOString(), invite ? String(invite.id) : null);
    } catch (error) {
      if (invite) {
        const saved = db.prepare("SELECT token FROM reservations WHERE invitation_id=?").get(String(invite.id));
        if (saved) return booking(String(saved.token));
      }
      throw error;
    }
    return reply.status(201).send(booking(token));
  });
  app.get<{ Params: { token: string } }>("/api/wedding/reservations/:token", async (request, reply) => {
    if (!/^[a-f0-9]{64}$/.test(request.params.token)) return reply.status(404).send({ error: "Reservation not found. Please use your access card link." });
    const saved = booking(request.params.token);
    return saved ?? reply.status(404).send({ error: "Reservation not found." });
  });
  app.get("/api/wedding/wishes", async () => db.prepare("SELECT id,name,message,createdAt FROM wishes ORDER BY createdAt DESC LIMIT 100").all());
  app.post<{ Body: { name?: unknown; message?: unknown; requestKey?: unknown } }>("/api/wedding/wishes", { bodyLimit: 10000 }, async (request, reply) => {
    if (!allowed(request, "wishes", 120)) return reply.status(429).send({ error: "Too many messages. Please try again later." });
    const { name, message, requestKey } = request.body ?? {};
    if (typeof name !== "string" || !name.trim() || name.length > 120 || typeof message !== "string" || !message.trim() || message.length > 2000 || typeof requestKey !== "string" || !/^[\w-]{16,100}$/.test(requestKey)) return reply.status(400).send({ error: "Please enter a name and a wish of up to 2,000 characters." });
    const previous = db.prepare("SELECT id,name,message,createdAt FROM wishes WHERE request_key=?").get(requestKey);
    if (previous) return previous;
    const id = randomUUID(), createdAt = new Date().toISOString();
    db.prepare("INSERT INTO wishes VALUES(?,?,?,?,?)").run(id, requestKey, name.trim(), message.trim(), createdAt);
    return reply.status(201).send({ id, name: name.trim(), message: message.trim(), createdAt });
  });
  app.post<{ Body: { username?: unknown; password?: unknown } }>("/api/wedding/login", { bodyLimit: 2048 }, async (request, reply) => {
    if (!configured) return reply.status(503).send({ error: "Admin sign-in is not configured. Set WEDDING_ADMIN_USERNAME and WEDDING_ADMIN_PASSWORD on the server (password at least 8 characters)." });
    const attempts = limits.get(`login:${request.ip}`);
    if (attempts && attempts.until > Date.now() && attempts.count >= 10) return reply.status(429).send({ error: "Too many sign-in attempts. Please try again in 15 minutes." });
    const { username, password } = request.body ?? {};
    const supplied = scryptSync(typeof password === "string" && password.length <= 256 ? password : "", "wedding-admin-password", 64);
    const validPassword = timingSafeEqual(supplied, expectedPassword);
    const validUsername = timingSafeEqual(Buffer.from(hash(typeof username === "string" ? username : "")), Buffer.from(hash(adminName)));
    if (!validPassword || !validUsername) {
      allowed(request, "login", 10);
      return reply.status(401).send({ error: "Incorrect username or password." });
    }
    limits.delete(`login:${request.ip}`);
    db.prepare("DELETE FROM admin_sessions WHERE expires_at<=?").run(Date.now());
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO admin_sessions VALUES(?,?)").run(hash(token), Date.now() + 12 * 3600000);
    return reply.header("Set-Cookie", sessionCookie(token, 12 * 3600)).send({ ok: true });
  });
  app.get("/api/wedding/admin/session", async () => ({ ok: true }));
  app.post("/api/wedding/admin/logout", async (request, reply) => {
    const token = /wedding_session=([a-f0-9]{64})/.exec(request.headers.cookie ?? "")?.[1];
    if (token) db.prepare("DELETE FROM admin_sessions WHERE token_hash=?").run(hash(token));
    return reply.header("Set-Cookie", sessionCookie("", 0)).send({ ok: true });
  });
  app.post<{ Body: { qr?: unknown; event?: unknown } }>("/api/wedding/admin/checkins", { bodyLimit: 2048 }, async (request, reply) => {
    const { qr, event } = request.body ?? {};
    const match = typeof qr === "string" && /^ASW:v1:([a-f0-9]{64}):(ceremony|reception)$/.exec(qr.trim());
    if (!match) return reply.status(400).send({ error: "Invalid QR code. Please use a newly issued entrance access card." });
    if (event !== match[2]) return reply.status(400).send({ error: "This card is for a different event. Select the correct entrance or ask for the other card." });
    const saved = booking(match[1]);
    if (!saved || saved.attending !== "yes" || (saved.event !== "both" && saved.event !== event)) return reply.status(403).send({ error: "This access card is not valid for admission." });
    const scannedAt = new Date().toISOString();
    const inserted = db.prepare("INSERT OR IGNORE INTO checkins VALUES(?,?,?,?)").run(saved.id, String(event), scannedAt, adminName);
    const checkin = db.prepare("SELECT scannedAt FROM checkins WHERE reservation_id=? AND event=?").get(saved.id, String(event));
    const { token: _token, ...guest } = saved;
    return { duplicate: inserted.changes === 0, reservation: guest, event, scannedAt: checkin?.scannedAt };
  });
  app.get<{ Querystring: { search?: string; event?: string; attendance?: string; status?: string; page?: string; date?: string } }>("/api/wedding/admin/reservations", async (request, reply) => {
    const { search = "", event = "all", attendance = "all", status = "all", date = "" } = request.query;
    const page = Number(request.query.page ?? 1);
    if (!Number.isInteger(page) || page < 1 || search.length > 120 || !["all", "ceremony", "reception"].includes(event) || !["all", "yes", "no"].includes(attendance) || !["all", "checked-in", "not-checked-in"].includes(status) || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) return reply.status(400).send({ error: "Invalid filters." });
    const clauses: string[] = [], values: string[] = [];
    if (search) { clauses.push("(r.name LIKE ? OR r.id LIKE ?)"); values.push(`%${search}%`, `%${search}%`); }
    if (event !== "all") { clauses.push("(r.event=? OR r.event='both')"); values.push(event); }
    if (attendance !== "all") { clauses.push("r.attending=?"); values.push(attendance); }
    if (date) { clauses.push("substr(r.createdAt,1,10)=?"); values.push(date); }
    if (status !== "all") {
      clauses.push(`${status === "not-checked-in" ? "NOT " : ""}EXISTS(SELECT 1 FROM checkins c WHERE c.reservation_id=r.id${event === "all" ? "" : " AND c.event=?"})`);
      if (event !== "all") values.push(event);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = db.prepare(`SELECT COUNT(*) AS total FROM reservations r ${where}`).get(...values)?.total;
    const entries = db.prepare(`SELECT r.id,r.name,r.attending,r.event,r.guests,r.createdAt,
      (SELECT scannedAt FROM checkins WHERE reservation_id=r.id AND event='ceremony') AS ceremonyScannedAt,
      (SELECT scannedAt FROM checkins WHERE reservation_id=r.id AND event='reception') AS receptionScannedAt
      FROM reservations r ${where} ORDER BY r.createdAt DESC LIMIT 30 OFFSET ?`).all(...values, (page - 1) * 30);
    const summary = db.prepare("SELECT COUNT(*) AS reservations, COALESCE(SUM(CASE WHEN attending='yes' THEN guests ELSE 0 END),0) AS expectedGuests FROM reservations").get();
    const checkins = db.prepare("SELECT COUNT(*) AS cards,COALESCE(SUM(r.guests),0) AS guests FROM checkins c JOIN reservations r ON r.id=c.reservation_id").get();
    return { entries, total, page, pageSize: 30, summary: { ...summary, checkedInCards: checkins?.cards, admittedGuests: checkins?.guests } };
  });
  return db;
}
