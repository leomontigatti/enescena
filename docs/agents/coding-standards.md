# Coding standards

These bind every session and every reviewer, human or agent. The principles
come first; the En Escena rules (schema, money, personal data) are at the end
and do not bend.

## Testing

Tests verify behaviour through public interfaces, not implementation details.
Code can change internally; a test should fail only when observable behaviour
changes. Name tests for what the system does, not how it does it.

Mock at system boundaries only: external APIs, time and randomness, and file
systems, queues or databases when a real instance is not practical. Do not mock
our own internal collaborators. If code is hard to test without mocking an
internal module, redesign the interface.

Prefer a real database for DB behaviour: `*.db.test.ts` runs on PGlite, in
process, through the same functions the app calls.

Every test names the bug it catches: the wrong implementation that would make it
fail. Tests that cannot name one are not written. The anti-patterns (tautological,
pass-through, restating text, implementation-coupled) and the rules on fixtures and
redundant tests are in the shared `tdd` skill, and this stack's test notes in
[tdd-db.md](./tdd-db.md) and [tdd-frontend.md](./tdd-frontend.md). A test never
asserts that a document contains fixed text; it checks structure against something
outside the document (a link resolves, an index matches its files).

### Test support files

A fixture, builder or request helper that tests share lives in one of two places:

- **One module's tests**: `<name>.test-support.ts`, beside the code it builds for.
- **Tests across modules**: a file in `src/test-support/`.

No other suffix. Before adding a file, extend the one that already builds those
rows or requests.

### Component tests

Test logic and observable behaviour. Do not render components to static markup to
assert props, classes or attributes, and do not test that a callback fired unless
something observable follows. Keep reducers, state machines, validation, formatting
and label logic in pure modules, tested without React, and render-test only a user
flow whose outcome matters (what is submitted, what the user is told, what becomes
disabled) or an accessibility contract (focus, labels, roles). What a component
looks like is checked in the browser ([verification.md](./verification.md)).

A regression test for a real bug stays even when its assertion looks like markup:
the bug is why it exists, and its name should say so.

## TDD

Work in vertical slices: one failing test, the least code that passes it, then the
next behaviour. Do not write a suite of imagined tests before touching the
implementation. Refactor only while green.

## Interface design

Prefer deep modules: small public interfaces that hide real complexity. Scrutinise
optional parameters; they cause bugs by omission. When a service can refuse, return
`{ ok: true, … }` or `{ ok: false, reason }`, with `reason` a short code the caller
maps to copy. The service itself says nothing a user reads.

Accept dependencies instead of constructing external ones inside a module. Return
values rather than hiding behaviour behind side effects.

## Style

Clarity over cleverness: explicit control flow over dense conditionals and nested
ternaries. Comments explain non-obvious intent or a constraint; they do not narrate
the next line. Lint and formatting are the tools' job, not a review comment.

## Code language

The product is Spanish; the codebase is English.

**Spanish for anything a user reads. English for everything else.**

| Layer                                  | Language                         | Example                                         |
| -------------------------------------- | -------------------------------- | ----------------------------------------------- |
| UI strings, page titles, URLs          | Spanish                          | `"Comprobante"`, `/administracion/comprobantes` |
| Code identifiers, comments, docs, ADRs | English                          | `loadAcademyFinances`                           |
| Commit messages, PR titles and bodies  | English                          | `fix(choreographies): keep the order number`    |
| Issues and review replies              | English                          | `Port the payments list`                        |
| External-system adapters               | the external system's vocabulary | `ArcaVoucher`, `createVoucher`                  |

Route filenames are URLs, so they stay Spanish while the symbols they export are
English. Identifiers follow [GLOSSARY.md](../../GLOSSARY.md): a term there names
the code concept, and its `ui:` value is the copy the user reads. A
conventional-commit scope names a code area, so it is English too
(`fix(choreographies):`, not `fix(coreografias):`); quoted UI copy in a subject
stays Spanish, because it is data.

Spanish inside English prose appears only as data, in backticks, as the copy or
the term a comment or doc is about: ``// the `Cupo de cronograma` column``, never
`// the cupo of the cronograma`. A bare Spanish noun in an English sentence is
the same mistake as a Spanish identifier. A thrown `Error` is engineering prose,
so its message is English. A user-facing refusal is a structured result, never a
thrown `Error`.

Do not translate existing comments you are not otherwise touching.

### Reserved Spanish terms

One domain noun stays Spanish inside identifiers: **`comprobante`**, a term of art
of ARCA regulation (RG 1415). It is a generic container for a `Factura C` and a
`Nota de crédito C` alike, which English has no word for; its URL is Spanish, so
the noun needs no mapping; and `voucher` is already the ARCA adapter's word for
the WSFEv1 payload. Growing this list requires an ADR.

### Adapters speak the external system's language

The ARCA adapter speaks WSFEv1 (`ArcaVoucher`, `createVoucher`,
`getLastVoucher`): domain term outside the adapter's directory, protocol term
inside, so the seam between the two vocabularies stays visible.

### Surface prefix

**Unmarked means admin.** Admin is the primary surface, so its symbols carry no
prefix; other surfaces are marked (`ChoreographyDetailView` on the admin,
`PortalChoreographyDetailView` on the portal). Shell chrome that names the admin
itself (`AdminShell`) is the one exception: there `Admin` is part of the name, not
a surface prefix.

## Errors and catches

A `catch` that turns a failure into user copy hides it from everyone else. It
either tests the condition it expects and rethrows the rest, or logs a tagged line
before converting (`console.error("[area:what]", { ids, error })`), with ids and never a
request body, document, email, password or token. A bare `catch {}` needs the
expected condition in the code or a one-line reason.

## En Escena rules

- **Tables and enums live in the `enescena` schema, unprefixed**
  ([ADR-0021](../adr/0021-dedicated-postgres-schema.md)): declare them with
  `enescena.table()` and `enescena.enum()` from `src/db/schema/schema.ts`, never
  `pgTable()` or `pgEnum()` (lint rejects both). Raw SQL qualifies every name
  (`enescena.user`) instead of relying on `search_path`, and code that matches a
  constraint by name (a unique violation, say) is covered by a test, because
  typecheck cannot see it.
- **A port reproduces en-escena's behaviour** ([ADR-0020](../adr/0020-stack.md)):
  the rules are `GLOSSARY.md` and `docs/domain/`, not the old code's shape.
  Changing a rule is a separate decision, never folded into a port.
- **Money is whole pesos, in integers.** Amounts round, split and sum to the
  total by the rules in [finances.md](../domain/finances.md); a `comprobante`, once
  emitted, is amended by another one, never edited
  ([ADR-0014](../adr/0014-arbitrary-amount-allocation-and-comprobante-amendments.md)).
- **No personal data in logs, errors or alerts.** Names, document numbers and
  photos, emails and phone numbers stay out of `console`, error messages and job
  payload logs. Ids are enough to find a record.
- **Instants are `timestamptz`.** A bare `timestamp` holds no instant.
- **Migrations are raw SQL where Drizzle stops**, and an applied migration is never
  edited.

## Stack notes

- Imports use the `#/` alias for `src/` and carry explicit `.ts` or `.tsx`
  extensions.
- Route files in `src/routes/` are the TanStack Router file routes; the generated
  `src/routeTree.gen.ts` is committed, not edited.
- Validate input with Zod 4, one schema for the form and the server function.
- The app, its migrations and pg-boss share one direct `DATABASE_URL`
  ([ADR-0020](../adr/0020-stack.md)); see `src/db/client.ts` and `src/server/jobs.ts`.
