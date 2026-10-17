import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "#/db/schema/index.ts";

export type TestDatabase = PgliteDatabase<typeof schema>;

const migrationsFolder = fileURLToPath(new URL("../db/migrations", import.meta.url));

/**
 * A fresh in-process Postgres (PGlite) with every migration applied. One per
 * test file: the db project runs files in parallel, and each file's instance
 * is its own database.
 *
 * A migration that creates an extension needs it handed to `PGlite.create`
 * here, from `@electric-sql/pglite/contrib`: PGlite only has the extensions it
 * is given.
 */
export async function createTestDatabase(): Promise<{
  client: PGlite;
  db: TestDatabase;
}> {
  const client = await PGlite.create();
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder });

  return { client, db };
}

/**
 * The rows of a raw `execute` result, which drizzle types loosely; the test
 * names the row shape here instead.
 */
export function rowsOf<T>(result: unknown): T[] {
  return (result as { rows: T[] }).rows;
}
