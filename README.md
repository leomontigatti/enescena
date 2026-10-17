<img src="assets/icon.svg" width="64" height="64" alt="">

# enescena

En Escena runs a dance competition: registrations, schedules, judging, results
and finances. This repository rebuilds the app that runs today from
`leomontigatti/en-escena`, feature by feature, on a new stack; production still
runs that app until the cut-over.

Stack and the reasons for it: [ADR-0020](docs/adr/0020-stack.md). Database schema:
[ADR-0021](docs/adr/0021-dedicated-postgres-schema.md). Domain vocabulary:
[GLOSSARY.md](GLOSSARY.md); its rules: [docs/domain/](docs/domain/README.md).

## Start

```sh
cp .env.example .env            # then set BETTER_AUTH_SECRET: openssl rand -base64 32
docker compose up -d --wait postgres
pnpm install
pnpm db:migrate
pnpm dev
```

More: [local development](docs/operations/local-development.md),
[scripts](docs/operations/scripts.md). Coding agents start at [AGENTS.md](AGENTS.md).
