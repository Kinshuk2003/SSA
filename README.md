# SSA Mission Control Platform

A full-stack space situational awareness tool that keeps a live satellite catalog in sync with the CelesTrak On-Orbit Registry and presents it through a Mission Control dashboard.

The entire Tech stack — PostgreSQL, Redis, Node.js, NestJS, React, Docker, BullMQ, Drizzle ORM, Zod



## Running the stack

The only prerequisite is Docker with Compose V2 installed.

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:8080` once all services are healthy. The first sync runs automatically on startup if no sync has completed yet for the current day.

The API is available at `http://localhost:3000/api`.

### Environment variables

Copy `.env.example` to `.env` before starting. The defaults work out of the box for local development — you only need to change them if you want to use a different port or an external database. The meaningful ones:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://ssa:ssa@postgres:5432/ssa` | Postgres connection string |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string |
| `PORT` | `3000` | API port on the host |
| `WEBCLIENT_PORT` | `8080` | Frontend port on the host |
| `CELESTRAK_URL` | CelesTrak SATCAT CSV URL | Override for testing with a local fixture |
| `SYNC_BATCH_SIZE` | `500` | Rows per processing batch |

### Service startup order

The compose file is explicit about dependency ordering. The `migrate` container runs first and exits cleanly before the API or worker are allowed to start. PostgreSQL and Redis must pass their healthchecks before anything that depends on them starts. This means you will never get a startup failure due to "database not ready yet" — the ordering is enforced, not hoped for.



## What the dashboard looks like

The catalog table with filtering, sorting, and the sync status callout:

![Mission Control Dashboard](docs/Screenshot%202026-05-05%20004638.png)

The record injection drawer, used to manually add classified or non-public objects:

![Add Record Drawer](docs/Screenshot%202026-05-05%20004701.png)


## Architecture and design decisions

### Monorepo layout

```
apps/
  mission-control-admin/   NestJS REST API server
  ingestion-service/       BullMQ worker (no HTTP server)
  webclient/               React 18 + Vite

libs/
  shared/                  Zod schemas and TypeScript types — single source of truth
  db/                      Drizzle ORM, repositories, SQL migrations, migrate runner
```

Module boundary rules are enforced at lint time via `@nx/enforce-module-boundaries`. The web app cannot import from `libs/db`. The API and worker cannot import from each other. These are not conventions — they are lint errors in CI.

### The ingestion pipeline

**Why BullMQ, not a plain cron that runs a SQL INSERT loop?**

The immediate answer is resilience. A cron job that downloads 3 MB of CSV and then writes ~58,000 rows in a single transaction will fail if the connection drops halfway through, and there is no clean recovery path. Breaking the work into batches that are individually retried gives you a much cleaner failure mode — a batch that fails gets retried up to three times before landing in the dead-letter queue. The rest of the sync continues.

The longer answer is scalability. At the current data volume, a single-process approach is fine. But the design separates the fetcher (which downloads and validates the CSV) from the processors (which do the database writes). Scaling writes horizontally is just a matter of running more processor containers — no code changes required.

**The pipeline, step by step:**

1. `SyncSchedulerService` fires at 00:00 UTC via `@nestjs/schedule`. It adds a job to a BullMQ queue with a deterministic `jobId` (`daily-sync:2026-05-04T00:00:00.000Z`). If that job already exists in the queue, BullMQ silently ignores the duplicate — this is the first layer of protection against double-firing.

2. `SyncJobProcessor` picks up the job and calls into `SyncOrchestratorService`, which does the real work.

3. The orchestrator attempts to claim the run with an atomic `INSERT ... ON CONFLICT (scheduled_at) DO NOTHING`. If another worker already holds the lock, `RETURNING` comes back empty and this instance stands down. This is the second, authoritative layer — it works even if Redis is flushed, because the lock lives in PostgreSQL.

4. CelesTrak's CSV is downloaded as a stream and parsed row-by-row with PapaParse. Every row is validated with the Zod schema from `libs/shared`. Invalid rows increment a failure counter but do not abort the sync.

5. Valid rows are processed in batches of 500. For each batch: fetch existing content hashes from the database in one query, compute SHA-256 of each incoming row in memory, diff the two sets, then write only the rows that actually changed. This minimizes write amplification in the postgreSQL and keeps the `updated_at` timestamp meaningful.

6. The `sync_jobs` table gets a final `UPDATE` with the outcome — `completed` with counters, or `failed` with an error message.

**Why `@nestjs/schedule` for the cron instead of BullMQ's built-in repeatable jobs?**

BullMQ repeatable jobs store the schedule in Redis. If Redis is flushed or the queue is cleared, the schedule disappears. Using `@nestjs/schedule` keeps the schedule in source code — it is version-controlled, visible in code review, and does not depend on Redis being in a particular state.

**The startup catch-up check:**

When the worker starts, it checks whether the most recent scheduled midnight has a completed sync job. If not — whether because the container was down at midnight, or the previous run failed — it immediately triggers a catch-up run. This means missing the 00:00 window is self-healing.

### Content-hash change detection

Simply upserting every row every night would generate enormous write amplification and make the `updated_at` timestamp meaningless. The solution is to compute a SHA-256 hash of all trackable fields for each incoming row and compare it against the stored hash before touching the database.

The rows that are unchanged cost one hash comparison in memory and zero database writes.

The SQL upsert has a second check as a safety net:

```sql
INSERT INTO satellites ... ON CONFLICT (norad_cat_id)
DO UPDATE SET ... WHERE satellites.content_hash IS DISTINCT FROM EXCLUDED.content_hash
```

This means even if the application-level hash comparison misses something (e.g., a race between two workers), the database itself will not perform a write unless the data actually changed.

### Database schema decisions

**`norad_cat_id` as a natural primary key.** NORAD catalog IDs are globally unique, externally assigned integers that are never reused. A surrogate UUID would add a join column with no benefit.

**`period NUMERIC(10,4)` instead of `FLOAT`.** Floating-point arithmetic produces values like `92.6800000001` that look fine but fail equality comparisons. NUMERIC stores exactly what was ingested.

**`decay_date DATE NULL`.** NULL is meaningful here — it means the object is still in orbit. Using a sentinel value like `9999-12-31` would be wrong and would break any date arithmetic.

**`orbit_type` stores CelesTrak fate codes (`ORB`, `IMP`, `LAN`, `DOC`)**, not orbit regimes. These codes indicate whether an object is still orbiting, has impacted Earth, landed, or is docked. The orbit regime displayed in the UI (LEO, MEO, GEO, GTO, HEO) is derived from apogee and perigee altitude — it is a computed display value, not a stored field.

### The `sync_jobs` table as the distributed lock

The `UNIQUE (scheduled_at)` constraint is the lock. Two workers racing to claim the midnight window both issue `INSERT INTO sync_jobs (scheduled_at, ...) ON CONFLICT (scheduled_at) DO NOTHING`. PostgreSQL's atomicity guarantees that exactly one of them gets the row. The other gets nothing back from `RETURNING` and exits cleanly.

This means the distributed lock requires no external locking library and any other extra setup.

### API design

mission-control-admin exposes a read-only surface. Satellites are queried, through the API — data enters the system exclusively through the ingestion pipeline. The one exception is `POST /api/satellites`, which inserts a record from the UI for the objects.

**Keyset cursor pagination.** Each response includes a `nextCursor` — an opaque base64-encoded value derived from the last row's sort field and NORAD ID. The next page query uses `WHERE (sort_field, norad_cat_id) > (cursor_val, cursor_id) LIMIT 101`, which lets PostgreSQL seek directly to the right position in a composite B-tree index and read exactly the rows needed. Query time stays constant regardless of how deep into the catalog you are.

**All query parameters are validated by Zod before the controller sees them.**

### Frontend architecture

State lives in `Dashboard.tsx`. Custom hooks handle the async concerns:

- `useSatellites` fetches the current page, manages an `AbortController` to cancel in-flight requests when parameters change, and handles errors.
- `useSyncStatus` polls `/api/sync/status` every 30 seconds and silently retains the last known state if a poll fails.

### Swappability

- For Swapping the database ORM, we need to only rewrite the two concrete repository classes in `libs/db`. Everything above them depends on interfaces, not implementations.
---

## Project structure in detail

```
apps/
  mission-control-admin/
    src/
      satellites/          Controller + service + repository injection
      sync/                Sync status polling, sync trigger endpoint
      common/              ZodValidationPipe, AllExceptionsFilter
      database/           DatabaseModule

  ingestion-service/
    src/
      fetcher/             HTTP stream, PapaParse, Zod validation, hash computation
      sync/                Sync orchestrator, BullMQ processor, sync scheduler

  webclient/
    src/
      api/client.ts        All fetch calls
      hooks/               React hooks for API data
      lib/                 helpers, toaster singleton, form validation
      components/          UI components

libs/
  shared/
    src/schemas/           Zod schemas
    src/types/             Inferred TypeScript types from Zod schemas

  db/
    src/
      migrations/          SQL migration files
      repositories/        TypeScript repository classes
      migrate.ts           One-shot runner used by the migrate Docker service
```