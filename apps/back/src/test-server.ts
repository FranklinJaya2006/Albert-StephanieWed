import "dotenv/config";
import path from "node:path";

if (process.env.NODE_ENV === "production") throw new Error("The test server cannot run in production.");
process.env.NODE_ENV = "test";
process.env.WEDDING_ALLOW_TEST_RESERVATIONS = "true";
process.env.WEDDING_DB_PATH = path.resolve(__dirname, "../data/wedding-test.sqlite");
// Load only after the test environment and separate database are selected.
require("./server");
