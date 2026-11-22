import { defineConfig } from "drizzle-kit";

// Prototype: SQLite (via libSQL). Production: switch dialect to "postgresql"
// and the schema import to pg-core. See docs/architecture.md.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "file:./data/commons.db" },
});
