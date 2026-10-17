# ADR-0020: Rebuild En Escena on the Rubens stack

**Status**: accepted

Date: 2026-10-17

En Escena runs in production from `leomontigatti/en-escena`, a React Router app.
This repository rebuilds it, feature by feature, on the stack and tooling of
Rubens (`leomontigatti/rubens`, its ADR-0001), so both apps share one toolchain,
one agent workflow and one set of habits. The rebuild replaces the app at a
cut-over; until then en-escena keeps serving and stays the source of truth for
behaviour.

| Concern         | en-escena today                       | Here                                                |
| --------------- | ------------------------------------- | --------------------------------------------------- |
| Framework       | React Router 8, `@react-router/serve` | TanStack Start (React 19), served by Nitro on Node  |
| Toolchain       | Vite, Vitest, Oxlint, Prettier, husky | Vite+ (`vp`): Vite, Vitest, Oxlint, Oxfmt, Rolldown |
| Database        | Postgres 17                           | Postgres 17                                         |
| Driver          | `postgres` (postgres.js)              | `pg` (node-postgres)                                |
| ORM             | Drizzle                               | Drizzle, raw SQL migrations where Drizzle stops     |
| Schema          | `en_escena_*` tables in `public`      | Unprefixed tables in `enescena` (ADR-0021)          |
| Auth            | Better Auth                           | Better Auth                                         |
| Client data     | Route loaders and actions             | TanStack Query; TanStack Form, Table and Virtual    |
| Forms           | React Hook Form                       | TanStack Form                                       |
| Validation      | Zod 4                                 | Zod 4                                               |
| Background jobs | None                                  | pg-boss, in the same Postgres                       |
| UI              | shadcn/ui on Tailwind 4               | shadcn/ui on Tailwind 4                             |

## Decisions

- **Rebuild beside the app, not in place.** The framework, the forms and the
  driver all change, so an in-place migration would touch every route at once in
  a repository with live work in flight. A second repository lets each feature be
  ported and tested on its own, and the production database moves once, at the
  cut-over, into the new schema (ADR-0021).
- **The domain carries over unchanged.** `GLOSSARY.md`, `docs/domain/` and the
  domain ADRs (0002, 0003, 0009, 0013, 0014, 0017, 0018, 0019) are copied from
  en-escena under their original numbers, so their cross-references still hold.
  A port reproduces the behaviour they describe; changing a rule is a separate
  decision, not part of a port.
- **One database role and one URL.** Rubens splits an owner role from an app role
  because row-level security is its tenant boundary. En Escena has one tenant and
  no RLS, so the app, the migrations and pg-boss share `DATABASE_URL`, as
  en-escena does today. That URL must be a direct connection: the migration lock
  and pg-boss need session features a transaction pooler breaks.
- **Feature dependencies come with their feature.** en-escena also uses ARCA
  invoicing (`@arcasdk/core`), Resend, drag and drop (`@dnd-kit`), carousels
  (Embla), QR codes, spreadsheet export and zip files. None is installed here
  until the feature that needs it is ported, and each is re-checked then rather
  than copied.

## Consequences

- Until the cut-over, a fix to production lands in en-escena, and its port here
  must follow it. A ported feature names the en-escena commit it matches.
- TanStack Start churns faster than React Router, and Nitro 3 is a beta pinned to
  an exact version; Rubens ADR-0001 records the same trade-off.
