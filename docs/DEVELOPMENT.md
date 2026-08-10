# Development Guide

This guide covers local setup, runtime modes, environment configuration, generated API clients, and verification for `hatinh-immersive`.

For the product model and renderer invariants, read [ARCHITECTURE.md](./ARCHITECTURE.md). For AI/contributor rules, read [../AGENTS.md](../AGENTS.md).

## Prerequisites

Install:

- Node.js **24.x** (`.nvmrc` currently pins `24.11.1`)
- pnpm **11.3.x**
- Docker / Docker Compose
- Chromium dependencies when running Playwright locally
- a Google Maps Platform project/key with the required Google Maps 3D capability for real 3D rendering

Install dependencies:

```bash
corepack enable
pnpm install --frozen-lockfile
```

## Local infrastructure

Start PostGIS and MinIO:

```bash
docker compose -f infra/compose/compose.dev.yml up -d
```

Default local services:

| Service | Default address |
|---|---|
| API | `http://127.0.0.1:3000` |
| PostGIS | `127.0.0.1:55432` |
| MinIO S3 API | `http://127.0.0.1:59000` |
| MinIO console | `http://127.0.0.1:59001` |
| Swagger | `http://127.0.0.1:3000/api/docs` |
| Health | `http://127.0.0.1:3000/api/v1/health` |

Initialize the database:

```bash
pnpm --filter @hatinh/api db:migrate
pnpm --filter @hatinh/api db:seed
```

The current DB seed creates the `son-trang-co-dam` foundation immersive route. It is not the same dataset as the deterministic front-end 3D/360 demo.

## Running applications

Run all development tasks:

```bash
pnpm dev
```

Or separately:

```bash
pnpm --filter @hatinh/api dev
pnpm --filter @hatinh/web dev
pnpm --filter @hatinh/admin dev
```

The API defaults to port `3000`. Vite normally starts at `5173` and moves to the next available port. API development CORS defaults allow `5173` and `5174`.

## Public web runtime modes

The public app separates **data mode** from **renderer mode**.

### Real 3D + real 360 with deterministic demo data

Recommended when working on the core experience without depending on API content readiness.

Create `apps/web/.env.local`:

```dotenv
VITE_IMMERSIVE_DATA_MODE=fake
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY
# Optional if required by your configured project:
VITE_GOOGLE_MAPS_MAP_ID=YOUR_MAP_ID

# Optional while focusing on the 3D/360 core:
VITE_IMMERSIVE_MINIMAP_MODE=fake
```

Do not set `VITE_IMMERSIVE_RENDERER_MODE=fake` in this mode. The application will use Google 3D and Photo Sphere Viewer for their respective renderers.

Run:

```bash
pnpm --filter @hatinh/web dev
```

### Fully deterministic mode

Useful for UI work and automated tests without external renderer SDKs:

```dotenv
VITE_IMMERSIVE_DATA_MODE=fake
VITE_IMMERSIVE_RENDERER_MODE=fake
```

This selects fake map3d, panorama, and minimap adapters.

### API-backed data mode

```dotenv
VITE_IMMERSIVE_DATA_MODE=api
```

The generated browser client uses relative URLs such as:

```text
/api/v1/destinations/...
```

The committed Vite config does **not** currently define a development proxy for `/api/v1`.

Therefore, starting Vite on `5173` and NestJS on `3000` does not automatically connect the browser client to the API. Use a same-origin reverse proxy/deployment router or add an explicit local proxy strategy for this mode.

## Web environment variables

| Variable | Purpose |
|---|---|
| `VITE_IMMERSIVE_DATA_MODE` | `fake` for committed demo data; otherwise API-backed path |
| `VITE_IMMERSIVE_RENDERER_MODE` | `fake` forces all renderers to fake mode |
| `VITE_IMMERSIVE_MAP3D_MODE` | `fake` forces only 3D map fake mode; otherwise Google |
| `VITE_IMMERSIVE_PANORAMA_MODE` | `fake` forces only panorama fake mode; otherwise Photo Sphere Viewer |
| `VITE_IMMERSIVE_MINIMAP_MODE` | `fake` forces minimap fake mode; otherwise MapLibre |
| `VITE_GOOGLE_MAPS_API_KEY` | browser-visible Google Maps JavaScript key |
| `VITE_GOOGLE_MAPS_MAP_ID` | optional Google Map ID |
| `VITE_MINIMAP_STYLE_URL` | optional production MapLibre style URL |

All `VITE_*` values are browser-visible. Never put server secrets in them.

## API environment

The API validates environment with Zod. Development defaults match the Compose stack.

Typical local values:

```dotenv
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

DATABASE_URL=postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive
DATABASE_SSL=false
DATABASE_PREPARE=true
DATABASE_MAX_CONNECTIONS=10

CORS_ORIGINS=http://localhost:5173,http://localhost:5174

S3_ENDPOINT=http://127.0.0.1:59000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=hatinh
S3_SECRET_ACCESS_KEY=hatinhminio
S3_BUCKET=hatinh-immersive-media
S3_FORCE_PATH_STYLE=true

# Needed when ready panorama media should resolve to public browser URLs.
S3_PUBLIC_ORIGIN=http://YOUR_PUBLIC_MEDIA_ORIGIN
```

Additional settings cover:

- rate limiting;
- log level;
- DB preparation/pool settings;
- media size limit;
- S3 presign expiry;
- bootstrap admin credentials/role;
- access/refresh token TTL.

Authoritative schema:

```text
apps/api/src/core/config/environment.ts
```

Production requires `DATABASE_SSL=true`.

## API and Swagger

Global REST prefix:

```text
/api/v1
```

Swagger UI:

```text
/api/docs
```

Core public immersive endpoint:

```text
GET /api/v1/destinations/:slug/immersive-manifest?locale=vi
```

## Generated API client

The browser uses the workspace package:

```text
@hatinh/api-client
```

It is generated with Orval from the API OpenAPI output.

After changing API contracts:

```bash
pnpm api:generate
```

Do not manually edit:

```text
packages/api-client/src/generated/**
```

## Admin application

`apps/admin` is the authenticated content-management workspace.

Current routes:

```text
/
/workspace
```

Current scope includes destination/tour content editing foundations, auth boundaries, and API-backed administration.

Keep admin UI separated from database/domain implementation details; use the generated API client boundary.

## Quality gates

Root commands:

```bash
pnpm repo:smoke
pnpm format:check
pnpm lint
pnpm architecture:check
pnpm deadcode
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm test:e2e
```

Web-specific:

```bash
pnpm --filter @hatinh/web check:bundle
pnpm --filter @hatinh/web test:e2e:minimap
```

Panorama tooling:

```bash
pnpm panorama:test
```

CI currently covers repository smoke, format, lint, architecture, dead code, typecheck, unit/integration tests, builds, bundle budget, Playwright critical paths, minimap deterministic E2E, production-manifest E2E smoke, and API Docker image health.

## Verification policy

Do not infer success from another check.

Examples:

- lint passing does not prove typecheck;
- typecheck passing does not prove build;
- unit tests passing do not prove E2E;
- a successful fake-renderer E2E does not prove Google 3D entitlement/coverage.

Run the focused test that proves the changed behavior, then run the broader gates appropriate to the changed area.

## Useful commands

| Command | Purpose |
|---|---|
| `pnpm dev` | run workspace dev tasks |
| `pnpm build` | build workspace |
| `pnpm lint` | lint workspace |
| `pnpm typecheck` | TypeScript checks |
| `pnpm test` | unit tests |
| `pnpm test:integration` | integration tests |
| `pnpm test:e2e` | end-to-end tests |
| `pnpm architecture:check` | dependency/module boundary checks |
| `pnpm deadcode` | Knip dead-code check |
| `pnpm repo:smoke` | repository smoke validation |
| `pnpm api:generate` | export OpenAPI + regenerate client |
| `pnpm --filter @hatinh/api db:migrate` | migrate local DB |
| `pnpm --filter @hatinh/api db:seed` | seed foundation immersive data |
| `pnpm panorama:build -- ...` | generate panorama tiles |
| `pnpm panorama:test` | test panorama tooling |
| `pnpm --filter @hatinh/panorama-tooling panorama:demo` | regenerate local demo panoramas |

## Deployment notes

- Never commit Google keys, S3 credentials, or bootstrap admin secrets.
- Keep API CORS origins explicit.
- Production API requires DB SSL.
- `apps/web/vercel.json` provides SPA fallback for deep `/explore/...` routes in Vercel-style deployments.
- Production panorama bytes should be served through public object-storage/CDN URLs, not the API process.
