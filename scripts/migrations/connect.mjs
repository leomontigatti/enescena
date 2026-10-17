/**
 * Connecting to the database at container start, retrying only until it
 * answers. Split from `scripts/migrate.mjs` so the retry rules are tested
 * without a database.
 */

const connectRetryBudgetMs = 45_000;
const initialRetryDelayMs = 500;
const maxRetryDelayMs = 5_000;

// The app and Postgres are co-located containers with no start ordering, so a
// refused connection right after a host reboot is expected rather than
// exceptional. Anything outside this set (bad credentials, missing database,
// failing DDL) is deterministic and must not be retried.
const transientConnectionCodes = new Set([
  // Node socket errors.
  "ECONNREFUSED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENOTFOUND",
  "EPIPE",
  "ETIMEDOUT",
  // Postgres SQLSTATEs: connection exception class, and admin shutdown / crash
  // / cannot connect now.
  "08000",
  "08003",
  "08006",
  "57P01",
  "57P02",
  "57P03",
]);

/** @param {unknown} error */
export function isTransientConnectionError(error) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = /** @type {{ code?: unknown }} */ (error).code;

  if (typeof code === "string" && transientConnectionCodes.has(code)) {
    return true;
  }

  // node-postgres reports a dropped connection, and one that passed
  // `connectionTimeoutMillis` unanswered, with no code, only a message.
  const message = /** @type {{ message?: unknown }} */ (error).message;

  return typeof message === "string" && /Connection terminated|timeout expired/.test(message);
}

/** @param {number} milliseconds */
function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Connects, retrying only until the database answers. Once it has, every later
 * failure is treated as fatal, which keeps the two error classes cleanly
 * separated: a database that is still booting is waited out, a migration that
 * cannot apply stops the container.
 *
 * Returns the connected client, because a failed connect leaves a client
 * unusable and a retry needs a fresh one: `createClient` makes one per attempt.
 *
 * @template {{ connect(): Promise<unknown>, end(): Promise<unknown> }} Client
 * @param {{
 *   createClient: () => Client,
 *   wait?: (milliseconds: number) => Promise<unknown>,
 *   budgetMs?: number,
 * }} options
 * @returns {Promise<Client>}
 */
export async function connectWithRetry({
  createClient,
  wait = sleep,
  budgetMs = connectRetryBudgetMs,
}) {
  const deadline = Date.now() + budgetMs;
  let delay = initialRetryDelayMs;

  for (;;) {
    const client = createClient();

    try {
      await client.connect();
      return client;
    } catch (error) {
      await client.end().catch(() => undefined);

      if (!isTransientConnectionError(error) || Date.now() >= deadline) {
        throw error;
      }

      console.log(`[migrate] database not reachable yet, retrying in ${delay}ms.`);
      await wait(delay);
      delay = Math.min(delay * 2, maxRetryDelayMs);
    }
  }
}
