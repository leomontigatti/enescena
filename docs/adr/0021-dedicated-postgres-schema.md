# ADR-0021: App tables live in a dedicated `enescena` schema, unprefixed

**Status**: accepted

Date: 2026-10-17

Every app table and enum is created in the `enescena` Postgres schema, under its
plain name (`enescena.user`, `enescena.event`), from the first migration.
`public` holds only extensions, `pgboss` the job queue and `drizzle` the
migration journal.

This settles leomontigatti/en-escena#506 for the rebuild (ADR-0020). The en-escena
app started from a template that prefixed every table (`en_escena_*`) in `public`,
with no ADR. The prefix was then the only thing that kept names like `user` and
`event` from colliding there, so it couldn't be dropped without a schema move.
By the time that was worth doing, the change had grown to 27 tables, 11 enums
prefixed by hand, raw SQL relying on `search_path`, constraint names hard-coded
in error handling, and a test harness that selected tables by prefix. All of
that had to change in one migration, against production.

Doing it on day one costs nothing, so the rebuild starts there, and the data
moves into the new names once, at the cut-over, instead of in a rename migration
against the running app. The rules are:

- **Tables and enums** are declared with `enescena.table()` and `enescena.enum()`
  (`src/db/schema/schema.ts`). `pgTable()` and `pgEnum()` would put them in
  `public`, and `tests/db/migrations.db.test.ts` fails if any table lands there.
- **drizzle-kit** reads only `enescena` (`schemaFilter` in `drizzle.config.ts`).
- **Raw SQL qualifies every name.** The connection's `search_path` is not
  changed. A missed qualification then fails loudly instead of resolving
  silently to the wrong place.
- **Constraint names** are Drizzle's defaults, and they carry no prefix. Code
  that matches a constraint by name (for example, mapping a unique violation to a
  form error) is covered by a test, because typecheck cannot see the string. A
  constraint name a port copies from en-escena drops its `en_escena_` prefix.
- **Tests** select tables by schema (`table_schema = 'enescena'`), never by name
  pattern. The one exception is the migration test that proves no table carries
  the old `en_escena_` prefix, which a port could copy across.
- **The lint** bans `pgTable` and `pgEnum` imports (`vite.config.ts`), and
  `tests/lint/adr-rules.test.ts` proves the ban holds.
