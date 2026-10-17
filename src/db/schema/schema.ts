import { pgSchema } from "drizzle-orm/pg-core";

/**
 * Every app table and enum lives in the `enescena` Postgres schema, never in
 * `public`, and carries no name prefix (ADR-0021). Declare tables with
 * `enescena.table(...)` and enums with `enescena.enum(...)`; `pgTable` and
 * `pgEnum` would put them in `public`.
 */
export const enescena = pgSchema("enescena");
