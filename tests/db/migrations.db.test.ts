import type { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { createTestDatabase, rowsOf } from "#/test-support/database.ts";
import type { TestDatabase } from "#/test-support/database.ts";

let client: PGlite;
let db: TestDatabase;

beforeEach(async () => {
  ({ client, db } = await createTestDatabase());
});

afterEach(async () => {
  await client.close();
});

describe("migrations on PGlite", () => {
  it("put every app table in the enescena schema and none in public", async () => {
    const rows = rowsOf<{ table_schema: string; table_name: string }>(
      await db.execute(sql`
        select table_schema, table_name
        from information_schema.tables
        where table_schema in ('enescena', 'public')
      `),
    );

    const inEnescena = rows
      .filter((row) => row.table_schema === "enescena")
      .map((row) => row.table_name);
    const inPublic = rows
      .filter((row) => row.table_schema === "public")
      .map((row) => row.table_name);

    // ADR-0021: `public` is for extensions only, so a table that lands there was
    // declared with `pgTable` instead of `enescena.table`.
    expect(inEnescena).toEqual(
      expect.arrayContaining(["user", "session", "account", "verification"]),
    );
    expect(inPublic).toEqual([]);
  });

  it("name no table with the old en_escena_ prefix", async () => {
    const rows = rowsOf<{ table_name: string }>(
      await db.execute(sql`
        select table_name from information_schema.tables
        where table_name like 'en\\_escena\\_%'
      `),
    );

    expect(rows).toEqual([]);
  });
});
