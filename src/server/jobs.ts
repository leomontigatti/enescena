import { PgBoss } from "pg-boss";

// The start, not just the queue, lives on `globalThis`: the dev server
// re-evaluates this module on every edit, and a started queue never goes idle,
// so a module variable would leave one more running queue per edit. Caching the
// promise also keeps two concurrent first callers from starting two queues.
const globalForBoss = globalThis as typeof globalThis & { __enescenaBoss?: Promise<PgBoss> };

/**
 * The pg-boss queue, in the same Postgres (ADR-0020). Nothing enqueues yet;
 * transactional email is the first candidate.
 *
 * It needs a direct connection, never a transaction pooler: pg-boss relies on
 * session features (`LISTEN/NOTIFY`, advisory locks) that transaction pooling
 * breaks. Started lazily, on the first job, so a request that never enqueues
 * opens no connection for it.
 */
export async function getBoss(): Promise<PgBoss> {
  if (!globalForBoss.__enescenaBoss) {
    const starting = startBoss();
    globalForBoss.__enescenaBoss = starting;
    // A failed start is not cached, so the next call tries again.
    starting.catch(() => {
      if (globalForBoss.__enescenaBoss === starting) {
        globalForBoss.__enescenaBoss = undefined;
      }
    });
  }
  return globalForBoss.__enescenaBoss;
}

async function startBoss(): Promise<PgBoss> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  const boss = new PgBoss({ connectionString, max: 4 });
  boss.on("error", (error) => {
    console.error("[jobs]", error);
  });
  await boss.start();
  return boss;
}
