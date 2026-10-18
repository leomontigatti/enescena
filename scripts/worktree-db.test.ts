import { describe, expect, it } from "vite-plus/test";

import {
  choosePort,
  databaseUrlFor,
  parseEnvPort,
  planPrune,
  renderEnvLocal,
  worktreeDatabaseName,
} from "./worktree-db.ts";

describe("worktreeDatabaseName", () => {
  it("names the database after the worktree directory", () => {
    expect(worktreeDatabaseName("/home/poto/.t3/worktrees/enescena/t3code-c2b191df")).toMatch(
      /^enescena-wt-t3code-c2b191df-[0-9a-f]{8}$/,
    );
  });

  it("folds characters Postgres would need quoting for", () => {
    expect(worktreeDatabaseName("/tmp/Fix_Seed.Race")).toMatch(
      /^enescena-wt-fix-seed-race-[0-9a-f]{8}$/,
    );
  });

  it("keeps the name of a worktree stable across runs", () => {
    expect(worktreeDatabaseName("/tmp/fix-seed")).toBe(worktreeDatabaseName("/tmp/fix-seed"));
  });

  it("gives two worktrees whose folders fold to the same slug their own databases", () => {
    expect(worktreeDatabaseName("/tmp/fix_seed")).not.toBe(worktreeDatabaseName("/tmp/fix-seed"));
  });

  it("gives two long folders that differ only past the cut their own databases", () => {
    const stem = "a".repeat(80);

    expect(worktreeDatabaseName(`/tmp/${stem}-one`)).not.toBe(
      worktreeDatabaseName(`/tmp/${stem}-two`),
    );
  });

  it("stays inside Postgres's 63-byte identifier limit", () => {
    expect(worktreeDatabaseName(`/tmp/${"a".repeat(80)}`)).toHaveLength(63);
  });
});

describe("databaseUrlFor", () => {
  it("keeps the base URL's server and swaps only the database", () => {
    expect(
      databaseUrlFor("postgres://postgres:postgres@localhost:5435/enescena", "enescena-wt-x"),
    ).toBe("postgres://postgres:postgres@localhost:5435/enescena-wt-x");
  });
});

describe("choosePort", () => {
  it("is stable for the same worktree", () => {
    const first = choosePort("enescena-wt-a", new Set());

    expect(choosePort("enescena-wt-a", new Set())).toBe(first);
    expect(first).toBeGreaterThanOrEqual(5200);
    expect(first).toBeLessThan(6000);
  });

  it("steps past a port another worktree already claims", () => {
    const taken = choosePort("enescena-wt-a", new Set());

    expect(choosePort("enescena-wt-a", new Set([taken]))).toBe(taken === 5999 ? 5200 : taken + 1);
  });
});

describe("renderEnvLocal / parseEnvPort", () => {
  it("writes a file whose port reads back", () => {
    const content = renderEnvLocal({
      databaseUrl: "postgres://postgres:postgres@localhost:5435/enescena-wt-x",
      port: 5321,
    });

    expect(content).toContain(
      'DATABASE_URL="postgres://postgres:postgres@localhost:5435/enescena-wt-x"',
    );
    expect(content).toContain('BETTER_AUTH_URL="http://localhost:5321"');
    expect(parseEnvPort(content)).toBe(5321);
  });

  it("reads no port from a file without one", () => {
    expect(parseEnvPort('DATABASE_URL="x"\n')).toBeUndefined();
  });
});

describe("planPrune", () => {
  it("drops only worktree databases whose worktree is gone", () => {
    const live = worktreeDatabaseName("/wt/live");

    expect(
      planPrune({
        databases: ["enescena", "enescena-test", "postgres", live, "enescena-wt-gone-0badf00d"],
        worktreePaths: ["/home/poto/projects/enescena", "/wt/live"],
      }),
    ).toEqual(["enescena-wt-gone-0badf00d"]);
  });
});
