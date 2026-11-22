import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { commonsDb?: ReturnType<typeof createDb> };

function createDb() {
  const client = createClient({ url: process.env.DATABASE_URL ?? "file:./data/commons.db" });
  return drizzle(client, { schema });
}

/** Single shared connection (reused across hot reloads in development). */
export const db = globalForDb.commonsDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.commonsDb = db;

export { schema };
