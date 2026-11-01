import "dotenv/config";
import path from "node:path";
import Fastify from "fastify";
import { registerWedding } from "./wedding";

const app = Fastify({ logger: true });
registerWedding(app, {
  filename: process.env.WEDDING_DB_PATH ?? path.resolve(__dirname, "../data/wedding.sqlite"),
  adminPassword: process.env.WEDDING_ADMIN_PASSWORD,
  adminName: process.env.WEDDING_ADMIN_USERNAME,
  secureCookies: process.env.NODE_ENV === "production",
  allowTestReservations: process.env.NODE_ENV === "test" && process.env.WEDDING_ALLOW_TEST_RESERVATIONS === "true",
});

app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT ?? 4000);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
