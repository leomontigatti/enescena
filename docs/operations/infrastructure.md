# Production infrastructure

**This repository is not deployed.** Production is still the en-escena app, from
`leomontigatti/en-escena`, and it stays so until the cut-over (ADR-0020). This page
records what production is today, what this app will need from it, and what the
cut-over has to do. The hosts themselves (access, firewalls, Tailscale) are described
in the private `leomontigatti/infra` repository; read its `README.md` and `AGENTS.md`
before touching a server.

## Production today

The full account is en-escena's
[infrastructure.md](https://github.com/leomontigatti/en-escena/blob/master/docs/operations/infrastructure.md);
the facts this app depends on:

- **Host**: the Hostinger VPS `rylai`, in São Paulo (`sa-east`), the location
  [ADR-0013](../adr/0013-exit-supabase.md) records. Only `80`/`443` are public, `443`
  from Cloudflare only; administration goes over Tailscale.
- **Platform**: Coolify. `rylai` runs the agent and the Traefik proxy; the dashboard
  is a separate control-plane VPS.
- **Domain**: `sistema.enescena.com.ar`, behind Cloudflare. DNS and outbound email
  (Resend, from `enescena.com.ar`): en-escena's
  [dns-and-email.md](https://github.com/leomontigatti/en-escena/blob/master/docs/operations/dns-and-email.md).
- **Database**: Coolify-managed Postgres 17 on the same VPS, database `enescena`, no
  published port. en-escena's tables are `en_escena_*` in `public`.
- **Storage**: uploaded files live on a Coolify volume (`/var/lib/en-escena/storage`),
  with Backblaze B2 as a backup destination only.
- **Backups and restore drills**: en-escena's
  [backups.md](https://github.com/leomontigatti/en-escena/blob/master/docs/operations/backups.md).

## The cut-over (not started)

To be planned as its own work, once the ported features cover production:

- a Coolify application for this repository, built from its `Dockerfile`;
- the data moved from en-escena's `en_escena_*` tables in `public` into the
  `enescena` schema (ADR-0021), in the same `enescena` database, rehearsed on a
  restored backup first;
- the storage volume and the environment (`BETTER_AUTH_SECRET`, email, ARCA, B2)
  carried over;
- the domain switched to the new application, and en-escena's retired.

## What the app needs

The app container is one process: `node .output/server/index.mjs` on port 3000, with
migrations applied first by the entrypoint (below). It reads one database URL,
`DATABASE_URL`, used by the app, the migrations and pg-boss (ADR-0020). It must be a
direct connection, never a transaction pooler: the migration lock and pg-boss rely on
session features. Coolify holds it and every other secret; none goes in the repository
(`.gitignore` ignores `.env`; `.gitleaks.toml` catches a password in a URL in a
committed file).

## Migrations run at container start

`scripts/docker-entrypoint.sh` runs `scripts/migrate.mjs` before the command. The script:

- connects with `DATABASE_URL`, retrying only while the database is unreachable;
- takes an advisory lock, so two overlapping starts cannot apply the same migration twice;
- checks the journal against `drizzle.__drizzle_migrations` and refuses to continue if
  an applied migration's file changed;
- applies the pending migrations, with a 5-second lock timeout on DDL.

A failed migration exits non-zero, so the container does not start. The entrypoint is an
`ENTRYPOINT`, not a chained `CMD`, so a start command set in Coolify does not skip it.
Coolify keeps the previous container serving while the new one migrates, which is what
makes a destructive migration dangerous, and why `check:migrations` flags drops and
renames.

## Healthcheck

There is no health route yet. The image's `HEALTHCHECK` probes `/`, which answers 200
without a session: the server is up, not that the database is reachable. Add a route
that checks the database before the cut-over, and point Coolify's healthcheck at it.

## Logs and personal data

En Escena holds personal data of dancers, many of them minors (Ley 25.326): names,
document numbers and document photos. None goes in logs, thrown error messages or
alerts: do not log request or response bodies on the server path, and name the failure,
never the record.
