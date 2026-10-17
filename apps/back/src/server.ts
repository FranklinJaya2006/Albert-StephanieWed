import "dotenv/config";
import Fastify from "fastify";
import { pool } from "./db";

const app = Fastify({ logger: true });

// WhatsApp numbers arrive in inconsistent formats (08xx, +62xx, 62xx).
// Normalize to a bare 62-prefixed digit string before matching against the DB.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

app.get<{ Querystring: { phone?: string } }>("/api/guests/lookup", async (request, reply) => {
  const { phone } = request.query;
  if (!phone) return reply.status(400).send({ error: "Missing phone" });

  const [rows] = await pool.query(
    "SELECT name, phone, title FROM guests WHERE phone = ?",
    [normalizePhone(phone)]
  );
  const guest = (rows as unknown[])[0];
  if (!guest) return reply.status(404).send({ error: "Guest not found" });
  return guest;
});

const port = Number(process.env.PORT ?? 4000);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
