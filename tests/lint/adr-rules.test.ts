import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vite-plus/test";

// The lint rule that enforces ADR-0021, tested through `vp lint`
// itself so the rule, its message and its file overrides are all exercised.
//
// A probe that breaks a rule cannot be committed (it would fail every lint run),
// and `--no-ignore` does not lift the config's own ignore patterns. So each probe
// is written here, linted, and removed when the file's tests end.

const root = fileURLToPath(new URL("../..", import.meta.url));
const probeDir = path.join("tests", "lint", `.probes-${process.pid}`);

afterAll(() => {
  rmSync(path.join(root, probeDir), { recursive: true, force: true });
});

function probe(name: string, source: string): string {
  mkdirSync(path.join(root, probeDir), { recursive: true });
  const file = path.join(probeDir, name);
  writeFileSync(path.join(root, file), source);
  return file;
}

interface Diagnostic {
  code: string;
}

function restrictedImports(...files: string[]): Diagnostic[] {
  const result = spawnSync("node_modules/.bin/vp", ["lint", "--format", "json", ...files], {
    cwd: root,
    encoding: "utf8",
    // `vp` fails to start on an inherited non-TTY stdin; a pipe is fine.
    stdio: ["pipe", "pipe", "pipe"],
  });
  const report = JSON.parse(result.stdout.slice(result.stdout.indexOf("{"))) as {
    diagnostics: Diagnostic[];
    number_of_files: number;
  };
  // Guards the test itself: zero files linted would read as zero findings.
  expect(report.number_of_files).toBe(files.length);
  return report.diagnostics.filter((d) => d.code.includes("no-restricted-imports"));
}

// Each case spawns a type-aware `vp lint`: well under a second warm, slower cold.
describe("ADR lint rules", { timeout: 30_000 }, () => {
  it("reject pgTable outside the enescena schema (ADR-0021)", () => {
    const file = probe(
      "public-table.ts",
      `import { pgTable, text } from "drizzle-orm/pg-core";\n\nexport const stray = pgTable("stray", { id: text("id") });\n`,
    );

    const found = restrictedImports(file);

    expect(found).toHaveLength(1);
  });

  it("allow the schema helper that declares tables in enescena", () => {
    expect(restrictedImports("src/db/schema/schema.ts", "src/db/schema/auth.ts")).toEqual([]);
  });
});
