// Better Auth's tables are generated: `npx auth@<better-auth version> generate
// --adapter drizzle --dialect pg --config src/lib/auth.ts --output
// src/db/schema/auth.ts`. The output then needs two edits: every `pgTable(`
// becomes `enescena.table(` (ADR-0021), and every `timestamp()` gets
// `withTimezone: true` (instants are `timestamptz`). Regenerate after
// adding an auth plugin.
export * from "#/db/schema/schema.ts";
export * from "#/db/schema/auth.ts";
