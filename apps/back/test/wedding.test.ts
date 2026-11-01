import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Fastify from "fastify";
import { registerWedding } from "../src/wedding";

const password = "A-test-password-12345";
async function setup(filename = ":memory:", allowTestReservations = true) {
  const app = Fastify();
  registerWedding(app, { filename, adminPassword: password, adminName: "organizer", secureCookies: true, allowTestReservations });
  await app.ready();
  return app;
}
async function login(app: Awaited<ReturnType<typeof setup>>) {
  const response = await app.inject({ method: "POST", url: "/api/wedding/login", payload: { username: "organizer", password } });
  assert.equal(response.statusCode, 200);
  assert.match(String(response.headers["set-cookie"]), /HttpOnly.*SameSite=Strict.*Secure/);
  return String(response.headers["set-cookie"]).split(";")[0];
}
async function reserve(app: Awaited<ReturnType<typeof setup>>, overrides: Record<string, unknown> = {}) {
  const response = await app.inject({ method: "POST", url: "/api/wedding/reservations", payload: { name: "Test Guest", attending: "yes", event: "both", guests: 2, requestKey: crypto.randomUUID(), ...overrides } });
  assert.ok([200, 201].includes(response.statusCode), response.body);
  return response.json();
}

test("reservations are validated, issued by the server, idempotent and private", async (t) => {
  const app = await setup(); t.after(() => app.close());
  const key = crypto.randomUUID();
  const first = await reserve(app, { requestKey: key });
  const retry = await reserve(app, { requestKey: key });
  assert.equal(first.id, retry.id); assert.equal(first.token, retry.token); assert.match(first.token, /^[a-f0-9]{64}$/);
  const reopened = await app.inject(`/api/wedding/reservations/${first.token}`);
  assert.equal(reopened.json().id, first.id);
  assert.equal((await app.inject(`/api/wedding/reservations/${first.id}`)).statusCode, 404);
  assert.equal((await app.inject("/api/wedding/admin/reservations")).statusCode, 401);
  const bad = await app.inject({ method: "POST", url: "/api/wedding/reservations", payload: { name: "Invalid", attending: "yes", event: "both", guests: 9, requestKey: crypto.randomUUID() } });
  assert.equal(bad.statusCode, 400);
});

test("event-specific check-ins reject forgeries, duplicates, wrong events and declined RSVPs", async (t) => {
  const app = await setup(); t.after(() => app.close());
  const guest = await reserve(app), declined = await reserve(app, { attending: "no" });
  const cookie = await login(app);
  const scan = (qr: string, event = "ceremony", auth = true) => app.inject({ method: "POST", url: "/api/wedding/admin/checkins", headers: auth ? { cookie } : {}, payload: { qr, event } });
  const ceremony = `ASW:v1:${guest.token}:ceremony`, reception = `ASW:v1:${guest.token}:reception`;
  assert.equal((await scan(ceremony, "ceremony", false)).statusCode, 401);
  assert.equal((await scan("ASW-SANDBOX:old-id:ceremony")).statusCode, 400);
  assert.equal((await scan(`ASW:demo:${guest.token}:ceremony`)).statusCode, 400);
  assert.equal((await scan(ceremony, "reception")).statusCode, 400);
  assert.equal((await scan(`ASW:v1:${"a".repeat(64)}:ceremony`)).statusCode, 403);
  assert.equal((await scan(`ASW:v1:${declined.token}:ceremony`)).statusCode, 403);
  const results = await Promise.all([scan(ceremony), scan(ceremony)]);
  assert.equal(results.filter((r) => !r.json().duplicate).length, 1);
  assert.equal(results.filter((r) => r.json().duplicate).length, 1);
  assert.equal((await scan(reception, "reception")).json().duplicate, false);
  const list = (await app.inject({ url: "/api/wedding/admin/reservations?status=checked-in&event=ceremony", headers: { cookie } })).json();
  assert.equal(list.total, 1); assert.equal(list.summary.checkedInCards, 2); assert.equal(list.summary.admittedGuests, 4);
  assert.ok(list.entries[0].ceremonyScannedAt); assert.ok(list.entries[0].receptionScannedAt);
  assert.equal(list.entries[0].token, undefined);
});

test("admin filters and pagination work; single-event cards cannot enter the other event", async (t) => {
  const app = await setup(); t.after(() => app.close());
  const cookie = await login(app);
  const ceremony = await reserve(app, { name: "Alice", event: "ceremony" });
  await reserve(app, { name: "Bob", event: "reception" });
  await reserve(app, { name: "Declined", attending: "no" });
  const get = (query: string) => app.inject({ url: `/api/wedding/admin/reservations?${query}`, headers: { cookie } });
  assert.equal((await get("search=Alice")).json().total, 1);
  assert.equal((await get("event=reception")).json().total, 1);
  assert.equal((await get("attendance=no")).json().total, 1);
  assert.equal((await get("search=%27%20OR%201%3D1--")).json().total, 0);
  assert.equal((await get("page=-1")).statusCode, 400);
  const invalid = await app.inject({ method: "POST", url: "/api/wedding/admin/checkins", headers: { cookie }, payload: { qr: `ASW:v1:${ceremony.token}:reception`, event: "reception" } });
  assert.equal(invalid.statusCode, 403);
  const valid = await app.inject({ method: "POST", url: "/api/wedding/admin/checkins", headers: { cookie }, payload: { qr: `ASW:v1:${ceremony.token}:ceremony`, event: "ceremony" } });
  assert.equal(valid.statusCode, 200);
  assert.equal((await get("status=not-checked-in&event=ceremony")).json().total, 0);
  for (let i = 0; i < 30; i++) await reserve(app, { name: `Guest ${i}` });
  assert.equal((await get("page=1")).json().entries.length, 30);
  assert.equal((await get("page=2")).json().entries.length, 3);
});

test("login fails closed, cross-site writes fail, sessions expire on logout", async (t) => {
  const app = await setup(); t.after(() => app.close());
  assert.equal((await app.inject({ method: "POST", url: "/api/wedding/login", payload: { username: "organizer", password: "wrong" } })).statusCode, 401);
  const cookie = await login(app);
  assert.equal((await app.inject({ method: "POST", url: "/api/wedding/admin/logout", headers: { cookie, origin: "https://evil.example" } })).statusCode, 403);
  assert.equal((await app.inject({ url: "/api/wedding/admin/session", headers: { cookie } })).statusCode, 200);
  await app.inject({ method: "POST", url: "/api/wedding/admin/logout", headers: { cookie } });
  assert.equal((await app.inject({ url: "/api/wedding/admin/session", headers: { cookie } })).statusCode, 401);
  const closed = Fastify(); registerWedding(closed, { filename: ":memory:" }); t.after(() => closed.close());
  assert.equal((await closed.inject({ method: "POST", url: "/api/wedding/login", payload: { username: "admin", password } })).statusCode, 503);
});

test("wishes persist without duplicate retries and invalid messages are rejected", async (t) => {
  const app = await setup(); t.after(() => app.close());
  const payload = { requestKey: crypto.randomUUID(), name: "Friend", message: "Congratulations!" };
  const send = () => app.inject({ method: "POST", url: "/api/wedding/wishes", payload });
  assert.equal((await send()).json().id, (await send()).json().id);
  assert.equal((await app.inject("/api/wedding/wishes")).json().length, 1);
  assert.equal((await app.inject({ method: "POST", url: "/api/wedding/wishes", payload: { ...payload, message: " " } })).statusCode, 400);
});

test("database survives application restart with the same reservation ID and check-in", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "wedding-checkin-test-"));
  const filename = path.join(folder, "wedding.sqlite");
  try {
    const first = await setup(filename);
    const guest = await reserve(first); const cookie = await login(first);
    await first.inject({ method: "POST", url: "/api/wedding/admin/checkins", headers: { cookie }, payload: { qr: `ASW:v1:${guest.token}:ceremony`, event: "ceremony" } });
    await first.close();
    const second = await setup(filename);
    try {
      assert.equal((await second.inject(`/api/wedding/reservations/${guest.token}`)).json().id, guest.id);
      const cookie2 = await login(second);
      const again = await second.inject({ method: "POST", url: "/api/wedding/admin/checkins", headers: { cookie: cookie2 }, payload: { qr: `ASW:v1:${guest.token}:ceremony`, event: "ceremony" } });
      assert.equal(again.json().duplicate, true);
    } finally { await second.close(); }
  } finally {
    for (const file of await readdir(folder)) await unlink(path.join(folder, file));
    await rmdir(folder);
  }
});

test("personal invitations accept exactly one RSVP even with new keys and simultaneous requests", async (t) => {
  const app = await setup(":memory:", false); t.after(() => app.close());
  const cookie = await login(app);
  const created = await app.inject({ method: "POST", url: "/api/wedding/admin/invitations", headers: { cookie }, payload: { name: "Invited Family", maxGuests: 2 } });
  assert.equal(created.statusCode, 201);
  const invitation = created.json();
  assert.match(invitation.token, /^[a-f0-9]{64}$/);
  const before = (await app.inject(`/api/wedding/invitations/${invitation.token}`)).json();
  assert.equal(before.reservation, null); assert.equal(before.maxGuests, 2);
  const submit = (overrides: Record<string, unknown> = {}) => app.inject({ method: "POST", url: "/api/wedding/reservations", payload: { requestKey: crypto.randomUUID(), invitationToken: invitation.token, name: "Different browser name", attending: "yes", event: "both", guests: 2, ...overrides } });
  assert.equal((await submit({ guests: 3 })).statusCode, 400);
  const simultaneous = await Promise.all(Array.from({ length: 5 }, () => submit()));
  const first = simultaneous[0].json();
  for (const result of simultaneous) { assert.equal(result.json().id, first.id); assert.equal(result.json().token, first.token); }
  assert.equal(first.name, "Invited Family");
  const second = (await submit({ attending: "no", event: "", guests: 0 })).json();
  assert.equal(second.id, first.id); assert.equal(second.attending, "yes");
  const reopened = (await app.inject(`/api/wedding/invitations/${invitation.token}`)).json();
  assert.equal(reopened.reservation.id, first.id);
  const list = (await app.inject({ url: "/api/wedding/admin/reservations", headers: { cookie } })).json();
  assert.equal(list.total, 1);
  const invitations = (await app.inject({ url: "/api/wedding/admin/invitations", headers: { cookie } })).json();
  assert.equal(invitations[0].reservationId, first.id);
});

test("live mode rejects uninvited submissions; only explicit server test mode permits them", async (t) => {
  const app = await setup(":memory:", false); t.after(() => app.close());
  assert.equal((await app.inject("/api/wedding/reservation-options")).json().allowUninvited, false);
  const payload = { name: "Not invited", attending: "no", requestKey: crypto.randomUUID(), test: true };
  assert.equal((await app.inject({ method: "POST", url: "/api/wedding/reservations?test=true", payload })).statusCode, 403);
  assert.equal((await app.inject({ method: "POST", url: "/api/wedding/admin/invitations", payload: { name: "No auth", maxGuests: 1 } })).statusCode, 401);
  const testing = await setup(":memory:", true); t.after(() => testing.close());
  assert.equal((await testing.inject("/api/wedding/reservation-options")).json().allowUninvited, true);
  assert.equal((await testing.inject({ method: "POST", url: "/api/wedding/reservations", payload })).statusCode, 201);
});
