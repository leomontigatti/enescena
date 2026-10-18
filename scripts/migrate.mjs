import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

import { connectWithRetry } from "./migrations/connect.mjs";
import { findJournalInconsistencies, readHashedJournalEntries } from "./migrations/journal.mjs";

/**
 * Applies pending migrations, then exits. Run by the container entrypoint
 * before the app serves, because the production Postgres is not reachable from
 * outside the VPS and `pnpm db:migrate` has no route to it.
 *
 * Migrations connect through `DATABASE_URL`, which must be a direct connection:
 * the advisory lock below needs a session that a transaction pooler would not
 * keep.
 *
 * Written in plain `.mjs` on purpose: `tsx` and `drizzle-kit` are
 * devDependencies and are stripped from the runtime image by `pnpm prune`,
 * while `drizzle-orm` and `pg` are production dependencies.
 */

// Resolved relative to this file so the same expression works in the repo and
// in the image, where `src/db/migrations` is copied to the identical path.
const migrationsFolder = fileURLToPath(new URL("../src/db/migrations", import.meta.url));

const migrationLockName = "enescena-migrations";
const advisoryLockTimeoutMs = 60_000;
const tableLockTimeout = "5s";

/**
 * Blocking, not `pg_try_advisory_lock`: a second starter should wait and then
 * correctly no-op, not fail to boot. Consequence 3 in scripts/migrations/journal.mjs
 * is what makes the lock necessary: without it two overlapping container starts
 * act on the same stale watermark and the second re-runs committed DDL.
 *
 * The timeout bounds the wait for the advisory lock only. It is restored
 * afterwards rather than zeroed, so whatever `statement_timeout` the role
 * carries still governs the migrations themselves; the table locks the DDL
 * itself takes are bounded separately, by `withMigrationLockTimeout`.
 *
 * @param {pg.Client} client
 */
async function acquireMigrationLock(client) {
  const previous = await client.query(
    "select current_setting('statement_timeout') as statement_timeout",
  );
  const previousStatementTimeout = String(previous.rows[0]?.statement_timeout ?? "0");

  await client.query("select set_config('statement_timeout', $1, false)", [
    String(advisoryLockTimeoutMs),
  ]);

  try {
    await client.query("select pg_advisory_lock(hashtext($1))", [migrationLockName]);
  } finally {
    await client.query("select set_config('statement_timeout', $1, false)", [
      previousStatementTimeout,
    ]);
  }
}

/**
 * Bounds how long the migration DDL waits for a *table* lock. Without it an
 * `ALTER TABLE` blocked behind a long-running query waits forever, and every
 * query that arrives afterwards queues behind the lock request it is holding:
 * the whole table stops answering while nothing visibly fails.
 *
 * Session level, which a single client makes exactly the migrator's connection,
 * and restored afterwards like the advisory lock's `statement_timeout`.
 *
 * Failure mode when the timeout fires: the statement errors, Drizzle's
 * transaction rolls back and this script exits non-zero, so the container does
 * not start. The old container keeps serving and a redeploy retries: a deploy
 * that waits rather than a schema half-applied.
 *
 * @param {pg.Client} client
 * @param {() => Promise<void>} run
 */
async function withMigrationLockTimeout(client, run) {
  const previous = await client.query("select current_setting('lock_timeout') as lock_timeout");
  const previousLockTimeout = String(previous.rows[0]?.lock_timeout ?? "0");

  await client.query("select set_config('lock_timeout', $1, false)", [tableLockTimeout]);

  try {
    await run();
  } finally {
    await client.query("select set_config('lock_timeout', $1, false)", [previousLockTimeout]);
  }
}

/** @param {pg.Client} client */
async function releaseMigrationLock(client) {
  await client.query("select pg_advisory_unlock(hashtext($1))", [migrationLockName]);
}

/** @param {pg.Client} client */
async function assertJournalIsConsistent(client) {
  const appliedRows = await client
    .query("select hash, created_at from drizzle.__drizzle_migrations")
    .then((result) => result.rows)
    .catch((/** @type {unknown} */ error) => {
      // A database that Drizzle has never touched has no journal table yet. That
      // is a fresh install, not an inconsistency.
      if (
        typeof error === "object" &&
        error !== null &&
        /** @type {{ code?: unknown }} */ (error).code === "42P01"
      ) {
        return [];
      }

      throw error;
    });

  const inconsistencies = findJournalInconsistencies({
    entries: readHashedJournalEntries(migrationsFolder),
    appliedMigrations: appliedRows.map((row) => ({
      hash: String(row.hash),
      createdAt: Number(row.created_at),
    })),
  });

  if (inconsistencies.length === 0) {
    return;
  }

  for (const inconsistency of inconsistencies) {
    const explanation =
      inconsistency.reason === "not-applied"
        ? "is older than the applied watermark but was never applied, so Drizzle will skip it forever"
        : "was applied with a different hash, so its .sql file changed after being applied";

    console.error(`[migrate] ${inconsistency.tag} ${explanation}.`);
  }

  throw new Error("Migration journal is inconsistent with drizzle.__drizzle_migrations.");
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("[migrate] DATABASE_URL is required.");
    process.exit(1);
  }

  // A single client, not a pool: the advisory lock is session-scoped, so the
  // lock and the migrations it guards have to run on the same connection.
  const client = await connectWithRetry({
    createClient: () =>
      new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 }),
  });

  // Notices are noise ("schema already exists, skipping"); a warning is a
  // migration reporting rows it left for a person to fix.
  client.on("notice", (notice) => {
    if (notice.severity === "WARNING") {
      console.warn(`[migrate] ${notice.message}`);
    }
  });

  try {
    await acquireMigrationLock(client);

    try {
      await assertJournalIsConsistent(client);
      await withMigrationLockTimeout(client, () => migrate(drizzle(client), { migrationsFolder }));
      console.log("[migrate] migrations up to date.");
    } finally {
      await releaseMigrationLock(client);
    }
  } finally {
    await client.end();
  }
}

try {
  await main();
} catch (error) {
  console.error("[migrate] failed, refusing to start the application.");
  console.error(error);
  process.exit(1);
}
