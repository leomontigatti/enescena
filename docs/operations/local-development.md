# Local development

From a fresh clone to a running dev server, with a database, migrations and the git hook.

## Prerequisites

- **Node 22.23.2**, from `.nvmrc` (`fnm use` or `nvm use` reads it).
- **pnpm**, the version in `packageManager`. Run `corepack enable` once, and pnpm
  picks the right version from the repo.
- **Vite+ (`vp`)** is a dev dependency, so `pnpm <script>` and `pnpm exec vp` find it.
  A global install is optional.
- **Git 2.32 or later**, for `vp staged` in the pre-commit hook.
- **Docker**, for the local Postgres 17 container.
- **gitleaks 8.30.1** (optional): the pre-commit hook runs it when present, and warns
  otherwise. CI runs it blocking. Install instructions:
  `docs/operations/ci.md`, "Running the gates locally".

## First run

```sh
pnpm install                       # runs `prepare`, which installs the git hooks
cp .env.example .env               # then set BETTER_AUTH_SECRET
openssl rand -base64 32            # paste the output as BETTER_AUTH_SECRET
docker compose up -d --no-recreate  # Postgres 17 as enescena-postgres, host port 5435; never replaces a running one
pnpm db:migrate                    # applies the migrations to the `enescena` database
pnpm dev                           # http://localhost:3000
```

`.env` is gitignored. `.env.example` lists every variable the app reads.

`pnpm install` installs the git hook dispatcher through `prepare`. To install without
hooks (for example in CI or a container), set `VP_GIT_HOOKS=0`.

## The database

`docker-compose.yml` starts one container, `enescena-postgres`, with the role
`postgres` and the database `enescena`, on host port 5435 so it runs beside the
en-escena app's Postgres (5433) during the rebuild. One URL, `DATABASE_URL`, serves the
app, the migrations and pg-boss ([ADR-0020](../adr/0020-stack.md)): En Escena has no
row-level security, so there is no separate app role. Every app table lives in the
`enescena` schema ([ADR-0021](../adr/0021-dedicated-postgres-schema.md)).

## One database per worktree

The main checkout uses the `enescena` database from `.env`. Each linked worktree
(`git worktree add`) gets its own database, `enescena-wt-<slug>-<hash>` (the folder name, then a hash of its full path), and its own port, in a
gitignored `.env.local`. That keeps concurrent sessions from migrating or testing over
each other's data.

- Nothing to do: `pnpm dev` and `pnpm db:migrate` run `pnpm db:worktree ensure` first,
  which creates the worktree's database on first use.
- To set it up explicitly, or to see its URL: `pnpm db:worktree`.
- The port is chosen from the worktree's name and kept across runs. A port another
  worktree already claims is skipped.

## Migrations

The schema lives in `src/db/schema/`. Migrations are generated from it and committed
under `src/db/migrations/`.

1. Change the schema.
2. `pnpm db:generate`: writes a new migration and its snapshot. It connects to nothing.
3. `pnpm db:migrate`: applies it to this worktree's database.
4. `pnpm check:migrations`: the same rules CI enforces (order, immutability, safety).
   It compares against `origin/main`, so fetch that first.

Never edit a migration that is already on `main`. Drizzle hashes the whole `.sql`
file, so editing even a comment makes the production container refuse to start.
`scripts/migrations/journal.mjs` explains the rule.

## Tests

- `pnpm test:unit`: the `*.test.ts(x)` files. No database.
- `pnpm test:db`: the `*.db.test.ts` files, on PGlite, an in-process Postgres. No
  Docker, no container. It is what CI runs.
- `pnpm test`: both.

## The git hook

`.vite-hooks/pre-commit` runs on every commit:

1. gitleaks over the staged diff, if it is installed (`.gitleaks.toml`);
2. `vp staged`, which runs `vp check --fix` on the staged files (the `staged` block in
   `vite.config.ts`), and re-stages what it fixed;
3. `pnpm typecheck` over the whole project;
4. `pnpm check:fallow`, which needs `origin/main` fetched ([fallow.md](../agents/fallow.md)).

Any failure stops the commit. To check that the hook is installed in this clone:

```sh
pnpm exec vp hooks status
```

`core.hooksPath` should read `.vite-hooks/_`. To turn hooks off in this clone only,
`pnpm exec vp hooks disable`; `pnpm exec vp hooks enable` turns them back on. Hooks
can be skipped with `git commit --no-verify`, which is why CI runs the same checks
blocking.

## Running the production build locally

```sh
pnpm build                         # .output/
pnpm start                         # node .output/server/index.mjs, on PORT
```

To run the container image the same way production does, migrations included:

```sh
docker build -t enescena:local .
docker run --rm --network host \
  -e DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5435/scratch \
  -e BETTER_AUTH_SECRET=local-only -e BETTER_AUTH_URL=http://127.0.0.1:3000 \
  enescena:local
```

Use a scratch database for that (`docker exec enescena-postgres createdb -U postgres
scratch`) rather than `enescena`, since the container applies migrations to whatever
`DATABASE_URL` names.

## Stopping

`pnpm dev:stop` stops this worktree's dev server, by its port. `docker compose stop`
stops the database; `docker compose down` removes the container and keeps the volume.
`docker compose down -v` deletes the volume and every local database with it.
