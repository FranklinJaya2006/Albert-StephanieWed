import "dotenv/config";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import Fastify from "fastify";

// Booth photos arrive as base64 JPEG data URLs (~1–3 MB), above Fastify's 1 MB default.
const app = Fastify({ logger: true, bodyLimit: 12 * 1024 * 1024 });

app.get("/health", async () => ({ status: "ok" }));

// --- Photo booth (apps/booth) ---
// No database: each photo is <id>.jpg plus a small <id>.json beside it (who, which filter, when).
// The .json is written last, so a photo only shows up once it is complete.

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? path.join(__dirname, "../uploads/booth"));
const BOOTH_FILTERS = new Set(["frame", "color"]);
const JPEG_PREFIX = "data:image/jpeg;base64,";
const FILE_NAME = /^[\w-]+\.jpg$/;
const META_NAME = /^[\w-]+\.json$/;

type PhotoMeta = { id: string; username: string; filter: string; createdAt: string };

function isAdmin(key: unknown): boolean {
  const expected = process.env.BOOTH_ADMIN_KEY;
  if (!expected || typeof key !== "string") return false;
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

app.post<{ Body: { username?: unknown; filter?: unknown; image?: unknown } }>(
  "/api/booth/photos",
  async (request, reply) => {
    const { username, filter, image } = request.body ?? {};
    const name = typeof username === "string" ? username.trim() : "";
    if (!name || name.length > 60) return reply.status(400).send({ error: "Invalid username" });
    if (typeof filter !== "string" || !BOOTH_FILTERS.has(filter)) {
      return reply.status(400).send({ error: "Invalid filter" });
    }
    if (typeof image !== "string" || !image.startsWith(JPEG_PREFIX)) {
      return reply.status(400).send({ error: "Image must be a JPEG data URL" });
    }
    const bytes = Buffer.from(image.slice(JPEG_PREFIX.length), "base64");
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      return reply.status(400).send({ error: "Not a JPEG image" });
    }

    const id = `${Date.now()}-${randomUUID()}`;
    const photoPath = path.join(UPLOAD_DIR, `${id}.jpg`);
    const meta: PhotoMeta = { id, username: name, filter, createdAt: new Date().toISOString() };
    await writeFile(photoPath, bytes);
    try {
      await writeFile(path.join(UPLOAD_DIR, `${id}.json`), JSON.stringify(meta));
    } catch (err) {
      await unlink(photoPath).catch(() => {});
      throw err;
    }
    return reply.status(201).send({ id });
  }
);

// Admin-only: the key travels as a query param so <img src> can load files too.
app.get<{ Querystring: { key?: string } }>("/api/booth/photos", async (request, reply) => {
  if (!isAdmin(request.query.key)) return reply.status(401).send({ error: "Unauthorized" });

  const files = (await readdir(UPLOAD_DIR)).filter((f) => META_NAME.test(f));
  const photos = await Promise.all(
    files.map(async (f) => {
      try {
        const meta = JSON.parse(await readFile(path.join(UPLOAD_DIR, f), "utf8")) as PhotoMeta;
        return { ...meta, url: `/api/booth/files/${meta.id}.jpg` };
      } catch {
        return null; // unreadable or half-written sidecar: skip it rather than fail the whole list
      }
    })
  );
  return photos
    .filter((p) => p !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});

app.get<{ Params: { name: string }; Querystring: { key?: string } }>(
  "/api/booth/files/:name",
  async (request, reply) => {
    if (!isAdmin(request.query.key)) return reply.status(401).send({ error: "Unauthorized" });
    const { name } = request.params;
    if (!FILE_NAME.test(name)) return reply.status(400).send({ error: "Invalid file name" });
    const filePath = path.join(UPLOAD_DIR, name);
    try {
      await access(filePath);
    } catch {
      return reply.status(404).send({ error: "Not found" });
    }
    return reply.type("image/jpeg").send(createReadStream(filePath));
  }
);

const port = Number(process.env.PORT ?? 4000);
mkdir(UPLOAD_DIR, { recursive: true })
  .then(() => app.listen({ port, host: "0.0.0.0" }))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
