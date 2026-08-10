# Hà Tĩnh Immersive

Interactive 3D tourism exploration for Hà Tĩnh: discover real geographic locations in a full-screen Google 3D world, fly between locations without rebuilding the map, and enter connected tiled 360° tours from the selected location.

> **Repository-level source of truth:** this README explains what the project is, how the current `main` branch is structured, how to run it, and the architectural rules contributors and AI agents must preserve. Feature-level designs and execution plans live under `docs/superpowers/`.

---

## Product north star

The primary product surface is **not a minimap** and is **not a collection of disconnected panorama pages**.

The intended journey is:

```text
FULL-SCREEN GOOGLE 3D WORLD
        ↓
real geographic locations rendered inside the 3D map
        ↓
marker / search / location-list selection
        ↓
fly the SAME mounted Map3DElement to the selected location
        ↓
enter that location's existing 360° tour
        ↓
move through linked panorama scenes with progressive tiles
        ↓
exit 360°
        ↓
return to the SAME selected 3D location
```

Core interaction rules:

- Google 3D is the main overview/exploration surface.
- Locations are spatial objects anchored to real `lat/lng[/altitude]` coordinates.
- Production 3D locations must use Google Maps 3D interactive elements, not absolute-positioned React/DOM fake markers over the canvas.
- User location selection must converge on one orchestration path regardless of whether the source is a 3D marker, search result, or location list.
- Selecting A → B → C must preserve one mounted Google `Map3DElement`; selection changes camera state, not renderer identity.
- The 360 subsystem is entered from a selected location and should preserve one Photo Sphere Viewer instance while moving between scenes.
- MapLibre/minimap is a secondary navigation aid. It is not the product north star and must not drive product architecture.

---

## What is on `main` today

The current branch contains a working foundation plus a deterministic local demo of the target 3D ↔ 360 journey.

### Interactive 3D location exploration

`apps/web/src/modules/map3d/` wraps Google Maps JavaScript 3D behind `Map3DEnginePort`.

Current capabilities include:

- one mounted `Map3DElement` per overview session;
- `Marker3DInteractiveElement` locations placed from geographic coordinates;
- marker `gmp-click` events routed back into application state;
- per-location camera presets (`center`, `heading`, `tilt`, `range`);
- camera flights with `flyCameraTo()`;
- optional `Model3DElement` / GLB placement;
- bounded Google 3D readiness timeout and retry-safe cleanup;
- location updates without rebuilding the map.

`Map3DViewport` intentionally separates engine mount lifecycle from location/camera/model updates. Changing the selected location must not destroy the map.

### Persistent tiled 360° virtual tours

`apps/web/src/modules/panorama/` wraps Photo Sphere Viewer behind `PanoramaEnginePort`.

The current viewer supports:

- `EquirectangularTilesAdapter`;
- `VirtualTourPlugin`;
- real scene links mapped into virtual-tour links;
- preview-first, multi-resolution tiled panoramas;
- persistent viewer lifecycle across scene changes;
- committed-scene semantics;
- stale scene success/failure protection;
- rollback to the last successfully committed scene when the latest requested scene fails;
- heading/pitch/FOV synchronization;
- adjacent scene preload through the viewer plugin.

### Shared 3D ↔ 360 navigation state

`apps/web/src/modules/immersive-navigation/` orchestrates the visitor journey.

The Zustand store tracks both location-level and scene-level state, including:

```text
selectedLocationId
selectedLocationPreset
committedSceneId
committedView
requestedSceneId
transitionId
mode: overview3d | panorama
activeRenderer
renderer status
network quality
```

The URL is part of the state contract. Example:

```text
/explore/bien-thien-cam?mode=overview3d&location=thien-cam-beach
```

and in panorama mode:

```text
/explore/bien-thien-cam?mode=panorama&location=thien-cam-beach&scene=thien-cam-shore&h=118&p=0&fov=88
```

### Deterministic local demo

The committed front-end demo catalog currently contains three real-coordinate Hà Tĩnh locations:

- **Biển Thiên Cầm**
- **Khu lưu niệm Nguyễn Du**
- **Ngã ba Đồng Lộc**

The Thiên Cầm demo includes a three-scene linked 360 route. Nguyễn Du and Đồng Lộc include single-scene demo tours.

Demo panorama media is committed under:

```text
apps/web/public/demo/360/
```

and is generated from local 2:1 equirectangular demo sources using the repository panorama tooling.

> Demo imagery is demonstration content. Do not describe it as production-ready tourism imagery.

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                        apps/web                              │
│                                                              │
│   React Router / UI                                          │
│          │                                                   │
│          ▼                                                   │
│   ImmersiveExperience                                       │
│          │                                                   │
│          ├────────── Zustand navigation state               │
│          │                                                   │
│          ├────────── TanStack Query                         │
│          │               │                                   │
│          │               ▼                                   │
│          │        @hatinh/api-client                        │
│          │               │                                   │
│          │               ▼                                   │
│          │           /api/v1                                 │
│          │                                                   │
│          ├────────── Map3DEnginePort                         │
│          │               │                                   │
│          │               ▼                                   │
│          │      Google Maps JS 3D adapter                   │
│          │                                                   │
│          ├────────── PanoramaEnginePort                      │
│          │               │                                   │
│          │               ▼                                   │
│          │      Photo Sphere Viewer adapter                 │
│          │                                                   │
│          └────────── MinimapEnginePort (secondary)           │
│                          │                                   │
│                          ▼                                   │
│                     MapLibre adapter                         │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                        apps/api                              │
│                                                              │
│ NestJS + Fastify                                             │
│   ├── catalog / destinations                                 │
│   ├── virtual-tour / scenes + links + hotspots              │
│   ├── media / S3-compatible object storage                  │
│   ├── identity / admin auth                                  │
│   └── audit / platform concerns                              │
│                         │                                    │
│                         ▼                                    │
│                PostgreSQL + PostGIS                          │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
                Object storage / CDN
             panorama manifest + preview + tiles
```

### State ownership

Use the existing ownership model:

- **TanStack Query** — server/cache state.
- **Zustand** — transient immersive navigation and renderer state.
- **React component state** — local presentation state only.
- **Generated OpenAPI client** — browser ↔ API contract.

Do not mirror complete API entities into Zustand and do not call NestJS repositories/entities from front-end code.

### Renderer ownership

Vendor APIs belong inside adapters.

```text
Google Maps JS 3D   → apps/web/src/modules/map3d/adapters/
Photo Sphere Viewer → apps/web/src/modules/panorama/adapters/
MapLibre             → apps/web/src/modules/minimap/adapters/
```

Pure UI should consume view models and callbacks rather than initialize vendor SDKs directly.

---

## Repository layout

```text
hatinh-immersive/
├── apps/
│   ├── web/                 # public 3D / 360 visitor experience
│   ├── admin/               # authenticated CMS/editor workspace
│   └── api/                 # NestJS/Fastify REST API
├── packages/
│   ├── api-client/          # Orval-generated REST/React Query client
│   ├── immersive-contracts/ # shared panorama/media contracts
│   ├── ui/                  # shared presentation primitives
│   ├── eslint-config/       # shared lint configuration
│   ├── tsconfig/            # shared TypeScript configuration
│   └── test-utils/          # shared test helpers
├── tooling/
│   ├── panorama/            # 2:1 equirectangular → preview/tile pyramid/manifest
│   └── scripts/             # repo, architecture, bundle and maintenance scripts
├── infra/
│   ├── compose/             # local PostGIS + MinIO
│   └── docker/              # deployment container definitions
├── docs/
│   ├── adr/
│   └── superpowers/         # approved design specs and implementation plans
├── .github/workflows/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Tech stack

### Frontend

- React 19
- Vite 8
- TypeScript 6
- React Router 7
- TanStack Query 5
- Zustand 5
- Google Maps JavaScript 3D
- Photo Sphere Viewer 5
- MapLibre GL JS 6
- Playwright
- Vitest / Testing Library

### Backend

- NestJS 11
- Fastify 5
- PostgreSQL 17 + PostGIS 3.5
- Drizzle ORM
- Zod
- Pino / nestjs-pino
- S3-compatible storage via AWS SDK
- Swagger/OpenAPI

### Repository tooling

- Node.js 24
- pnpm 11
- Turborepo
- ESLint
- Prettier
- dependency-cruiser
- Knip
- Husky / commitlint

Exact versions are pinned in workspace `package.json` files. The repository currently pins Node through `.nvmrc`.

---

## Prerequisites

Install:

- Node.js **24.x** (`.nvmrc` currently pins `24.11.1`)
- pnpm **11.3.x**
- Docker / Docker Compose
- Chromium dependencies when running Playwright locally
- a Google Maps Platform project/key with the required Google Maps 3D capability for real 3D rendering

Then install workspace dependencies:

```bash
corepack enable
pnpm install --frozen-lockfile
```

---

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

The Compose defaults match the API development defaults.

Initialize the database:

```bash
pnpm --filter @hatinh/api db:migrate
pnpm --filter @hatinh/api db:seed
```

The current DB seed creates the foundation `son-trang-co-dam` immersive route. See **Current boundaries** below before assuming it is identical to the committed front-end demo catalog.

---

## Running the repository

Run all development tasks:

```bash
pnpm dev
```

Or run applications independently:

```bash
pnpm --filter @hatinh/api dev
pnpm --filter @hatinh/web dev
pnpm --filter @hatinh/admin dev
```

The API defaults to port `3000`. Vite normally starts on `5173` and selects the next available port when another Vite app is already running; the API CORS defaults allow `5173` and `5174`.

---

## Web runtime modes

The public app supports separate **data** and **renderer** modes.

### 1. Recommended interactive local 3D + 360 demo

Use committed demo data but real Google 3D / Photo Sphere Viewer engines.

Create `apps/web/.env.local`:

```dotenv
VITE_IMMERSIVE_DATA_MODE=fake
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY
# Optional when required by the configured Google project:
VITE_GOOGLE_MAPS_MAP_ID=YOUR_MAP_ID

# Optional: keep the secondary minimap fake while focusing on the 3D/360 core.
VITE_IMMERSIVE_MINIMAP_MODE=fake
```

Do **not** set `VITE_IMMERSIVE_RENDERER_MODE=fake` in this mode. With no renderer override, the app selects Google 3D, Photo Sphere Viewer, and MapLibre as their real engines.

Then run:

```bash
pnpm --filter @hatinh/web dev
```

Open the home page and start with the default Thiên Cầm destination.

### 2. Fully deterministic renderer mode

Useful for automated tests and UI work without external renderer SDKs:

```dotenv
VITE_IMMERSIVE_DATA_MODE=fake
VITE_IMMERSIVE_RENDERER_MODE=fake
```

This replaces Google 3D, panorama, and minimap engines with deterministic fake adapters.

### 3. API-backed data mode

```dotenv
VITE_IMMERSIVE_DATA_MODE=api
```

The generated browser client uses relative `/api/v1/...` URLs.

**Important:** the current Vite config does not define a development proxy for `/api/v1`. API-backed browser development therefore expects `/api/v1` to be available on the same origin (for example through a reverse proxy/deployment router) or requires an explicit local proxy setup outside the current committed config.

Do not assume that starting Vite on `5173` and NestJS on `3000` automatically connects the generated client to the API.

---

## Web environment variables

| Variable | Purpose |
|---|---|
| `VITE_IMMERSIVE_DATA_MODE` | `fake` for committed deterministic demo data; otherwise API-backed data path |
| `VITE_IMMERSIVE_RENDERER_MODE` | `fake` forces all renderer adapters to fake mode |
| `VITE_IMMERSIVE_MAP3D_MODE` | `fake` forces only 3D map fake mode; otherwise Google |
| `VITE_IMMERSIVE_PANORAMA_MODE` | `fake` forces only panorama fake mode; otherwise Photo Sphere Viewer |
| `VITE_IMMERSIVE_MINIMAP_MODE` | `fake` forces fake minimap; otherwise MapLibre |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key used by the 3D adapter |
| `VITE_GOOGLE_MAPS_MAP_ID` | optional Google Map ID |
| `VITE_MINIMAP_STYLE_URL` | optional production MapLibre style URL |

Only variables prefixed with `VITE_` are exposed to browser code. Never put server secrets in them.

---

## API environment

The API validates environment configuration with Zod. Development defaults are intentionally aligned with the local Compose stack.

Important variables:

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

# Required when API panorama media should resolve to browser-accessible public URLs.
# Example: CDN/public MinIO gateway origin.
S3_PUBLIC_ORIGIN=http://YOUR_PUBLIC_MEDIA_ORIGIN
```

Additional API settings cover rate limits, logging, maximum media size, presign expiry and bootstrap admin authentication. Read:

```text
apps/api/src/core/config/environment.ts
```

for the authoritative schema and defaults.

Production enforces `DATABASE_SSL=true`.

---

## API and generated client

REST endpoints are globally prefixed with:

```text
/api/v1
```

Swagger UI is mounted at:

```text
/api/docs
```

The public immersive path uses an optimized manifest endpoint:

```text
GET /api/v1/destinations/:slug/immersive-manifest?locale=vi
```

The API manifest includes destination metadata, published scene nodes, scene links, hotspots, and public panorama manifest/preview URLs when the referenced media asset is `ready` and can be resolved through the configured public media origin.

The browser uses `@hatinh/api-client`, generated by Orval from the API OpenAPI output.

Regenerate it after API contract changes:

```bash
pnpm api:generate
```

Do not manually edit:

```text
packages/api-client/src/generated/
```

---

## Panorama media pipeline

The repository owns a standalone panorama tooling package:

```text
tooling/panorama/
```

Input requirements:

- equirectangular panorama;
- 2:1 aspect ratio.

Output:

```text
<scene>/
├── preview.webp
├── manifest.json
└── tiles/
    ├── 0/
    ├── 1/
    ├── 2/
    └── ...
```

Generate production-style tiles from an image:

```bash
pnpm panorama:build -- \
  --input /path/to/panorama.jpg \
  --output /path/to/output
```

Optional flags:

```text
--tile-size <pixels>    default 512
--preview-width <px>    default 512
--quality <1-100>       default 82
```

Regenerate the committed local demo panorama set:

```bash
pnpm --filter @hatinh/panorama-tooling panorama:demo
```

The demo generator writes to:

```text
apps/web/public/demo/360/
```

In production, panorama bytes should be delivered directly from object storage/CDN. NestJS returns metadata/URLs and should not proxy normal tile traffic.

---

## Admin application

`apps/admin` is the authenticated content-management workspace.

Current intent:

- manage destinations;
- shape panorama scenes;
- manage scene links;
- annotate hotspots/content;
- manage/publish media-backed immersive content;
- enforce role/auth boundaries through the existing identity layer.

Entry routes:

```text
/
/workspace
```

Do not couple admin presentation components directly to database entities. Admin should use the same generated API-client boundary as other front ends.

---

## Quality gates

Root scripts:

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

Web-specific checks:

```bash
pnpm --filter @hatinh/web check:bundle
pnpm --filter @hatinh/web test:e2e:minimap
```

Panorama tooling:

```bash
pnpm panorama:test
```

CI on `main` / pull requests runs repository smoke, formatting, lint, architecture checks, dead-code detection, typecheck, unit tests, integration tests, application builds, bundle budget, Playwright critical-path tests, minimap deterministic E2E, production-manifest E2E smoke, and an API Docker image health check.

### Before claiming a change is complete

At minimum, run the focused test for the changed behavior plus:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For architecture, API, renderer lifecycle or cross-application changes, also run the relevant integration/E2E and architecture gates.

---

## Current boundaries and known gaps

These are intentional facts about the current `main` branch and should not be hidden by documentation or agent assumptions.

### 1. Google 3D availability is external

Real Google 3D rendering depends on the configured Google project/key, product availability/entitlement, browser/WebGL capability and geographic coverage. A successful build does not guarantee Google 3D availability at every coordinate.

### 2. The committed front-end demo and DB seed are different datasets

The deterministic web demo uses:

```text
apps/web/src/modules/immersive-navigation/fake-mode/demo-catalog.ts
apps/web/public/demo/360/
```

and currently demonstrates Thiên Cầm, Nguyễn Du and Đồng Lộc with local generated tiled media.

The API seed currently creates a separate `son-trang-co-dam` foundation route with 12 scenes. Its seeded panorama media records are `processing`, so it should not be expected to expose ready production panorama URLs immediately.

Do not silently treat these datasets as interchangeable.

### 3. Curated 3D camera presets are strongest in demo mode today

The web contract supports `cameraPreset`, and the local demo defines curated presets for its 3D locations. API-backed locations can fall back to a camera derived from `geoPoint` when no curated preset is supplied.

Persisted/admin-managed location camera presets are not yet a fully established catalog capability on the current server model.

### 4. Local API-backed web routing is not zero-config

Generated API-client URLs are relative, while Vite currently has no committed `/api/v1` dev proxy. Use a same-origin reverse proxy/deployment setup or add an explicit development routing strategy before expecting `VITE_IMMERSIVE_DATA_MODE=api` to work from an independently served Vite origin.

### 5. The public UI remains in active productization

The home page and admin still contain foundation/preview language. The renderer/product architecture is ahead of final visual polish and final production content readiness.

---

## Contributor / AI-agent rules

These rules exist because violating them can make the application look functional while breaking the intended product.

### Preserve the product model

1. **Do not turn the minimap into the primary navigation surface.**
2. **Do not replace spatial Google 3D markers with DOM overlays.**
3. **Do not remount Google 3D when selecting another location.**
4. **Do not remount Photo Sphere Viewer for normal scene-to-scene navigation.**
5. **Do not commit a requested panorama scene before the renderer confirms success.**
6. **Do not let stale async scene results overwrite a newer navigation transaction.**
7. **Do not proxy normal panorama tile bytes through NestJS.**
8. **Do not bypass the generated API client with ad-hoc production fetch logic.**
9. **Do not import vendor SDK types throughout application/domain code; keep them behind adapters.**
10. **Do not rewrite stable 360/backend infrastructure merely to add a presentation feature.**

### Ownership guidance for parallel agents

Engineering/orchestration work normally owns:

```text
apps/api/**
packages/api-client/**
apps/web/src/modules/*/domain/**
apps/web/src/modules/*/model/**
apps/web/src/modules/*/adapters/**
apps/web/src/shared/api/**
```

Presentation/UI work normally owns:

```text
packages/ui/**
apps/web/src/app/styles/**
apps/web/src/shared/ui/**
apps/web/src/modules/*/ui/**
apps/admin/src/app/styles/**
apps/admin/src/modules/*/ui/**
```

Merge-sensitive integration surfaces such as routers, module `index.ts` files and shared contracts require coordination.

When Codex delegates UI work to AGY/another UI agent, freeze contracts first, give the UI agent a bounded work packet, and review path ownership before integration.

---

## Development workflow

Recommended sequence for non-trivial changes:

```text
inspect current main
    ↓
read relevant approved spec/plan
    ↓
write failing test
    ↓
minimal implementation
    ↓
refactor while green
    ↓
focused verification
    ↓
repository quality gates
    ↓
small conventional commit
```

The repository uses Conventional Commit style through commitlint.

For Superpowers-driven work, approved documents live under:

```text
docs/superpowers/specs/
docs/superpowers/plans/
```

Treat newer approved milestone specs as more specific than older broad foundation documents when the two conflict.

---

## Useful commands

| Command | Purpose |
|---|---|
| `pnpm dev` | run workspace dev tasks in parallel |
| `pnpm build` | build all applications/packages |
| `pnpm lint` | lint workspace |
| `pnpm typecheck` | TypeScript checks |
| `pnpm test` | unit tests |
| `pnpm test:integration` | integration tests |
| `pnpm test:e2e` | end-to-end tests |
| `pnpm architecture:check` | dependency/module boundary checks |
| `pnpm deadcode` | Knip dead-code check |
| `pnpm repo:smoke` | repository smoke validation |
| `pnpm api:generate` | export OpenAPI and regenerate browser client |
| `pnpm panorama:build -- ...` | build tiled panorama assets |
| `pnpm panorama:test` | panorama tooling tests |
| `pnpm --filter @hatinh/api db:migrate` | migrate local database |
| `pnpm --filter @hatinh/api db:seed` | seed foundation immersive data |
| `pnpm --filter @hatinh/panorama-tooling panorama:demo` | regenerate local demo panorama assets |

---

## Security and deployment notes

- Never commit Google keys, S3 credentials or admin bootstrap secrets.
- `VITE_*` values are browser-visible and must never contain server secrets.
- Production API requires database SSL.
- Keep CORS origins explicit.
- Large media uses direct S3-compatible upload/presign flows.
- Browser panorama delivery should use public object-storage/CDN URLs.
- `apps/web/vercel.json` provides SPA fallback so deep `/explore/...` URLs resolve to the React application on Vercel-style deployments.

---

## Status summary

The repository is no longer just a minimap or isolated renderer prototype. The current core is an **interactive 3D location explorer with a connected persistent tiled 360 journey**.

The next work should deepen production data/content integration, camera/content authoring and product polish without regressing the core invariant:

> **Users discover and move between real locations directly in the full-screen 3D world, then enter and return from location-specific 360° tours.**
