import { describe, expect, it } from "vite-plus/test";

import { connectWithRetry, isTransientConnectionError } from "./connect.mjs";

describe("isTransientConnectionError", () => {
  it("treats a refused socket and a database still starting up as transient", () => {
    expect(isTransientConnectionError({ code: "ECONNREFUSED" })).toBe(true);
    expect(isTransientConnectionError({ code: "57P03" })).toBe(true);
  });

  it("treats a connection node-postgres dropped without a code as transient", () => {
    expect(isTransientConnectionError(new Error("Connection terminated unexpectedly"))).toBe(true);
  });

  it("treats node-postgres's connection timeout as transient", () => {
    // What `pg` throws when `connectionTimeoutMillis` passes with no answer:
    // a bare message, no code.
    expect(isTransientConnectionError(new Error("timeout expired"))).toBe(true);
  });

  it("treats bad credentials, a missing database and non-errors as fatal", () => {
    expect(isTransientConnectionError({ code: "28P01" })).toBe(false);
    expect(isTransientConnectionError({ code: "3D000" })).toBe(false);
    expect(isTransientConnectionError(new Error("syntax error"))).toBe(false);
    expect(isTransientConnectionError(null)).toBe(false);
    expect(isTransientConnectionError("ECONNREFUSED")).toBe(false);
  });
});

function fakeClients(failures: unknown[]) {
  const made: { ended: boolean }[] = [];
  const createClient = () => {
    const failure = failures[made.length];
    const client = {
      ended: false,
      connect: async () => {
        if (failure !== undefined) throw failure;
      },
      end: async () => {
        client.ended = true;
      },
    };
    made.push(client);
    return client;
  };
  return { made, createClient };
}

const noWait = async () => undefined;

describe("connectWithRetry", () => {
  it("retries a transient failure on a fresh client and returns the one that connected", async () => {
    const { made, createClient } = fakeClients([{ code: "ECONNREFUSED" }, { code: "57P03" }]);

    const client = await connectWithRetry({ createClient, wait: noWait, budgetMs: 60_000 });

    expect(made).toHaveLength(3);
    expect(client).toBe(made[2]);
    expect(made.slice(0, 2).every((failed) => failed.ended)).toBe(true);
  });

  it("throws a fatal failure at once, without retrying", async () => {
    const fatal = { code: "28P01" };
    const { made, createClient } = fakeClients([fatal]);

    await expect(connectWithRetry({ createClient, wait: noWait, budgetMs: 60_000 })).rejects.toBe(
      fatal,
    );
    expect(made).toHaveLength(1);
  });

  it("gives up on a transient failure once the budget is spent", async () => {
    const refused = { code: "ECONNREFUSED" };
    const { made, createClient } = fakeClients([refused, refused, refused]);

    await expect(connectWithRetry({ createClient, wait: noWait, budgetMs: 0 })).rejects.toBe(
      refused,
    );
    expect(made).toHaveLength(1);
  });

  it("doubles the delay between attempts up to the cap", async () => {
    const refused = { code: "ECONNREFUSED" };
    const { createClient } = fakeClients([refused, refused, refused, refused, refused]);
    const delays: number[] = [];

    await connectWithRetry({
      createClient,
      wait: async (ms: number) => {
        delays.push(ms);
      },
      budgetMs: 60_000,
    });

    expect(delays).toEqual([500, 1_000, 2_000, 4_000, 5_000]);
  });
});
