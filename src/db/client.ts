import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "#/db/schema/index.ts";

type Schema = typeof schema;
type Database = NodePgDatabase<Schema> & { $client: Pool };

// The pool lives on `globalThis`, not in a module variable: the dev server
// re-evaluates this module on every edit, and a module variable would open a new
// pool each time and never close the old one.
const globalForPool = globalThis as typeof globalThis & { __enescenaDbPool?: Pool };

let dbInstance: Database | undefined;

// One role and one URL for the app, its migrations and pg-boss (ADR-0020):
// En Escena has a single tenant, so there is no row-level security to put a
// separate app role under.
function getPool(): Pool {
  if (!globalForPool.__enescenaDbPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    globalForPool.__enescenaDbPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 10_000,
    });
  }
  return globalForPool.__enescenaDbPool;
}

function getDb(): Database {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

// Lazy: importing `#/db/client.ts` neither validates `DATABASE_URL` nor opens a
// connection, so a build or a unit test that reaches it transitively needs no
// database.
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
