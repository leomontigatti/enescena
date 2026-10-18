# Review

What the shared `implement` skill's step 5 and the `code-review` skill need to know about En
Escena. It handles money (payments, prices, `comprobante`s emitted through ARCA), competition
results, and personal data of dancers, many of them minors (Ley 25.326): the areas below are
where a wrong change hurts.

## Full review

A diff that touches any of these goes to the full review, beside the migrations, `GLOSSARY.md`
terms and destructive scripts the shared skill always sends there:

- **Money**: payments, prices, finances, seminar prices, `comprobante`s and the ARCA adapter, on
  the admin and on the portal.
- **Results or judging**: scores, judging, votes, results and rankings, the `Gran final`,
  presentations, the audit.
- **Auth**: Better Auth's config and handler, sessions, roles and permissions, and who may call a
  server function.
- **Personal data**: dancer and individual documents and their photos, and anything that stores,
  shows or sends them.
- **The production container's start**: the entrypoint and migration runner, which run at every
  deploy.

The paths, for `review.py`. Feature directories do not exist yet; the patterns match the names
the ports will use (`docs/domain/`), wherever the module sits:

```review-paths
full money: ^src/[^ ]*(financ|payment|price|comprobante|arca|pagos|precios|finanzas|comprobantes)
full results or judging: ^src/[^ ]*(score|judg|vote|votar|result|ranking|finalist|grand-final|gran-final|presentation|audit)
full auth: ^src/lib/auth(-client)?\.ts$
full auth: ^src/routes/api/auth/
full auth: ^src/[^ ]*(auth|password|permission|access)
full personal data: ^src/[^ ]*(document|individual|particular|dancer|bailarin)
full schema: ^src/db/(client\.ts|schema/)
full migration: ^src/db/migrations/
full migration: ^scripts/(migrate\.mjs|migrations/)
full migration: ^drizzle\.config\.ts$
full production start: ^(Dockerfile|scripts/docker-entrypoint\.sh)$
full destructive script: ^scripts/worktree-db\.ts$
full glossary: ^GLOSSARY\.md$
quiet: ^\.coderabbit\.yaml$
quiet: ^\.fallowrc\.json$
quiet: ^\.vite-hooks/
quiet: ^\.github/(dependabot\.yml|pull_request_template\.md)$
quiet: ^t3\.json$
quiet: ^components\.json$
quiet: ^assets/
quiet: ^\.env\.example$
```

## Always ask

A finding in one of these areas is the user's call unless the issue already settles it:

- money: payments, prices, finances, `comprobante` emission;
- results or judging;
- auth;
- personal data.

## Hotspots

Where this codebase gets hurt, for the correctness brief. The app is new, so most of these come
from en-escena's history (its `docs/agents/review.md`) and follow the ports here:

- amounts that round, split or sum to something other than the total;
- a server function or route reachable by a user who should be refused;
- a second write path (another server function or route reaching the same row) missing the
  authz or validation check the first one has;
- a migration the previous container runs against during the deploy, or a table or enum that
  lands outside the `enescena` schema (ADR-0021);
- state that goes stale after a mutation or a navigation (a TanStack Query cache not
  invalidated); markup that differs between the server render and hydration;
- personal data (names, document numbers, document photos, emails) that reaches a log, an error
  message, an alert or a job's log line;
- a script that deletes or overwrites (a reset, a restore, a database drop) pointed at the wrong
  target or run with an empty variable.

## Breadth

- **Admin and portal.** A behaviour reachable from the admin is usually reachable from the portal
  too, or from a list and its detail. Name the paths you checked and the ones deliberately
  different.
- **Parity with en-escena.** A port matches the behaviour of the en-escena code it replaces, and
  the domain rules in `docs/domain/`; name what it leaves out on purpose (ADR-0020).
- **Docs.** The documentation rules are [workflows.md](./workflows.md#documentation).

## One-way doors

Always one-way on En Escena, beside the shared list:

- An email sent to a user (Resend).
- A `comprobante` emitted through ARCA, and any change to how an existing `comprobante` reads.
- Writes to payments, prices or `comprobante`s that reach production data.
- The cut-over from en-escena: the production data move into the `enescena` schema (ADR-0021).
- Production infrastructure, as [infrastructure.md](../operations/infrastructure.md) describes it.
