<p align="center">
  <img src="apps/web/public/logo.png" alt="Toc-Toc logo" width="140" />
</p>

<h1 align="center">Toc-Toc</h1>

<p align="center">
  Track contractions and the baby's movements in real time, on a trace that looks like a maternity-ward monitor.
</p>

---

## Goal

When labour starts, the usual advice is to time the contractions: when they start, how long they last, how far apart they are. Toc-Toc turns that into a phone app that is easy to use one-handed, even at 3 a.m.:

- **Live monitoring**: tap when a contraction starts and when it ends, and when the baby moves. A trace is drawn as you go, like the paper of a fetal monitor, and you can zoom in on a contraction or look at the whole session.
- **The rhythm at a glance**: frequency over the last 10 minutes, average duration and interval, and the 5-1-1 landmark many maternity units give ("when should I go?").
- **Pain and intensity**: describe how each contraction felt, and choose how high it is drawn on the trace.
- **Practice contractions**: log Braxton-Hicks contractions on their own, outside any session, and follow them day by day.
- **History and printing**: every session is kept; open one to see its trace and journal again, or print it on A4 to show the midwife.
- **Works offline**: every tap is saved on the phone first and sent to the server as soon as it can be reached.
- **Shared, private**: each person signs in (email and password, or Google) and only sees their own data.

> The trace is rebuilt from the taps — it is not a measurement of uterine pressure and does not replace monitoring at a maternity unit.

## Stack

A pnpm monorepo in TypeScript, with two apps:

| | |
|---|---|
| **API** (`apps/api`) | Node.js 24, [Fastify 5](https://fastify.dev/), PostgreSQL 16 (`pg`, migrations with `node-pg-migrate`), JWT sessions in httpOnly cookies (`@fastify/jwt`), Google sign-in (`@fastify/oauth2`), password hashing with Node's `scrypt` |
| **Web** (`apps/web`) | [React 19](https://react.dev/), [Vite 8](https://vite.dev/), [Redux Toolkit](https://redux-toolkit.js.org/) with RTK Query, React Router; the trace is drawn on a `<canvas>` |
| **Tests** | [Vitest](https://vitest.dev/) — unit tests on both sides, integration tests against a real PostgreSQL |
| **Tooling** | TypeScript 6, ESLint, GitHub Actions, Docker |

### Architecture

The API follows a **hexagonal architecture** (ports and adapters):

- `src/core/` — the use cases and their rules (monitorings, contractions, movements, practice contractions, accounts), with no HTTP or SQL. Each use case returns a `Result` instead of throwing.
- `src/adapters/http/` — the Fastify routes under `/api/v1`, with JSON schemas.
- `src/adapters/postgres/` — the PostgreSQL repositories; `migrations/` holds the schema.

The web app is organised by feature (`src/features/auth`, `monitoring`, `practice`). The trace model, the rhythm figures and the print layout are pure functions in `domain/`, tested on their own. Taps go through an outbox in the Redux store, persisted on the phone and replayed in order; ids are UUIDs made by the phone, so a retried request never creates a duplicate.

## Getting started

Requirements: Node 24, pnpm 9 (`corepack enable`), Docker.

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env   # set JWT_SECRET; Google sign-in is optional
docker compose up -d                      # PostgreSQL on port 5445
pnpm install
pnpm --filter @toc-toc/api migrate
pnpm dev                                  # API on :4210, web app on http://localhost:5173
```

| Command | |
|---|---|
| `pnpm test` | unit tests |
| `pnpm test:integration` | integration tests (needs PostgreSQL) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript |
| `pnpm build` | build both apps |

For production, a single Docker image serves both the API and the built web app, and applies the migrations on start (`docker-compose.prod.yml`).
