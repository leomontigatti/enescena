# Architecture Decisions

Read ADRs selectively: start with the topic that matches the change. Format and
when to write one: the shared `domain-modeling` skill's `ADR-FORMAT.md`.

`docs/adr/*.md` is live decisions only. A superseded ADR moves to
`docs/adr/superseded/`, kept for its rationale.

The domain ADRs below were copied from `leomontigatti/en-escena` under their
original numbers (ADR-0020). The ones they cite as superseded (0001, 0005, 0006,
0008, 0010, 0011, 0012) stay in that repository's `docs/adr/superseded/`.

## By topic

- Stack, tooling and the rebuild: `0020-stack.md`
- Database schema and naming: `0021-dedicated-postgres-schema.md`
- Access and authentication: `0003-direct-internal-user-access.md`, `0013-exit-supabase.md`
- Event context: `0002-selectable-event-contexts.md`
- Infrastructure and hosting: `0013-exit-supabase.md`
- `Gran final` and public vote: `0018-voter-identity-outside-access.md`
- Individual users (`Particular`): `0019-individual-owns-its-own-pool.md`
- Finances: `0009-inscription-based-finances.md`, `0014-arbitrary-amount-allocation-and-comprobante-amendments.md`, `0017-waived-inscription.md`

## Decisions

- [ADR-0002: Selectable event contexts](./0002-selectable-event-contexts.md) - accepts `Evento activo` as the only V1 event context.
- [ADR-0003: Direct internal user access](./0003-direct-internal-user-access.md) - records internal username access before the Supabase Auth migration.
- [ADR-0009: Inscription-based finances](./0009-inscription-based-finances.md) - models finances around inscriptions and payment assignments as the single operational source of truth (ratified, not superseded, by ADR-0014).
- [ADR-0013: Exit Supabase](./0013-exit-supabase.md) - why en-escena left Supabase for self-hosted auth, storage and database; what runs today is in `docs/operations/infrastructure.md`.
- [ADR-0014: Arbitrary-amount allocation, the live discount, and the comprobante amendment star](./0014-arbitrary-amount-allocation-and-comprobante-amendments.md) - the rationale of en-escena's finance map #547; the model itself is `docs/domain/finances.md`.
- [ADR-0017: A free inscription is a waiver, not a zero price or a discount](./0017-waived-inscription.md) - a free place is a `Bonificada` waiver on the inscription.
- [ADR-0018: A voter is not a user, and the `Gran final` is not an award](./0018-voter-identity-outside-access.md) - the public voter's identity stays outside the access domain.
- [ADR-0019: An individual owns its inscriptions and money the way an academy does](./0019-individual-owns-its-own-pool.md) - the `individual` (`Particular`) is a participating entity of its own kind.
- [ADR-0020: Rebuild En Escena on the Rubens stack](./0020-stack.md) - TanStack Start on Vite+, Drizzle on `pg`, Better Auth, pg-boss; one database role; the domain carries over unchanged.
- [ADR-0021: App tables live in a dedicated `enescena` schema, unprefixed](./0021-dedicated-postgres-schema.md) - settles en-escena#506 for the rebuild: no `public`, no name prefix, qualified raw SQL.
