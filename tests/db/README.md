# DB tests

`pnpm test:db` runs the `*.db.test.ts` files under `src/` and `tests/db/`
against PGlite, an in-process Postgres. Each file gets its own instance with
every migration in `src/db/migrations` applied, so files run in parallel and
need no server.

- `src/test-support/database.ts` creates the instance (`createTestDatabase`). A migration that
  creates an extension needs it loaded there too: PGlite only has the
  extensions it is handed.
- `rowsOf` names the row shape of a raw `execute` result.

PGlite is a fast path, not a replacement for production Postgres. Anything that
depends on a server feature PGlite lacks (LISTEN/NOTIFY, advisory locks across
sessions, pooler behaviour) needs a real-Postgres check. The local
`enescena-postgres` container is the one to use for that.
