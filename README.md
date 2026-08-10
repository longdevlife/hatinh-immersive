# Hà Tĩnh Immersive

Interactive 3D tourism exploration for Hà Tĩnh: discover real geographic locations in a full-screen Google 3D world, fly between locations without rebuilding the map, and enter connected tiled 360° tours from the selected location.

## Product

```text
FULL-SCREEN GOOGLE 3D WORLD
        ↓
real geographic locations
        ↓
marker / search / location-list selection
        ↓
fly the SAME mounted Map3DElement
        ↓
enter the selected location's 360° tour
        ↓
move through linked tiled panorama scenes
        ↓
exit 360°
        ↓
return to the SAME selected 3D location
```

The **3D world is the primary exploration surface**. MapLibre/minimap is secondary.

Core rules:

- locations are real geographic objects anchored to `lat/lng[/altitude]`;
- Google 3D locations use native interactive 3D elements, not DOM overlays;
- A → B → C location selection keeps one mounted Google `Map3DElement`;
- panorama scene navigation keeps one Photo Sphere Viewer instance;
- production panorama media is preview-first and multi-resolution tiled.

## Current capabilities

### Interactive Google 3D locations

- native `Marker3DInteractiveElement` locations;
- marker click → shared location-selection flow;
- curated location camera presets;
- smooth camera flights with `flyCameraTo()`;
- optional GLB/model placement;
- bounded renderer readiness/error handling;
- location updates without rebuilding the map.

### Connected tiled 360° tours

- Photo Sphere Viewer 5;
- `EquirectangularTilesAdapter`;
- `VirtualTourPlugin` scene graph;
- preview-first progressive tiles;
- persistent viewer lifecycle;
- committed/requested scene transaction semantics;
- stale async result protection and rollback.

### Platform foundation

- NestJS/Fastify REST API;
- PostgreSQL/PostGIS;
- Drizzle ORM;
- generated OpenAPI/React Query client;
- S3-compatible media storage;
- authenticated admin/CMS foundation;
- Vitest, Playwright, architecture checks, CI and Docker smoke tests.

## Deterministic demo

The committed web demo includes real-coordinate Hà Tĩnh locations:

- **Biển Thiên Cầm** — three linked 360° scenes;
- **Khu lưu niệm Nguyễn Du**;
- **Ngã ba Đồng Lộc**.

Demo tiled panorama media lives under:

```text
apps/web/public/demo/360/
```

> Demo imagery is demonstration content, not production-ready tourism imagery.

## Repository layout

```text
hatinh-immersive/
├── apps/
│   ├── web/                  # public 3D / 360 experience
│   ├── admin/                # authenticated CMS/editor
│   └── api/                  # NestJS/Fastify REST API
├── packages/
│   ├── api-client/           # Orval-generated browser client
│   ├── immersive-contracts/  # shared panorama/media contracts
│   ├── ui/
│   └── ...
├── tooling/
│   ├── panorama/             # panorama tiling pipeline
│   └── scripts/
├── infra/                    # Docker / local infrastructure
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── MEDIA.md
│   ├── adr/
│   └── superpowers/
├── AGENTS.md
└── README.md
```

## Tech stack

**Web:** React 19, Vite 8, TypeScript 6, React Router 7, TanStack Query 5, Zustand 5, Google Maps JavaScript 3D, Photo Sphere Viewer 5, MapLibre GL JS 6.

**API:** NestJS 11, Fastify 5, PostgreSQL 17 + PostGIS 3.5, Drizzle ORM, Zod, Pino, S3-compatible storage, Swagger/OpenAPI.

**Tooling:** Node.js 24, pnpm 11, Turborepo, Vitest, Playwright, ESLint, Prettier, dependency-cruiser, Knip, Husky/commitlint.

## Quick start

Requirements:

- Node.js 24.x (`.nvmrc`)
- pnpm 11.3.x
- Docker / Docker Compose

Install:

```bash
corepack enable
pnpm install --frozen-lockfile
```

Start PostGIS + MinIO:

```bash
docker compose -f infra/compose/compose.dev.yml up -d
```

Initialize the API database when needed:

```bash
pnpm --filter @hatinh/api db:migrate
pnpm --filter @hatinh/api db:seed
```

Run the workspace:

```bash
pnpm dev
```

Or run apps separately:

```bash
pnpm --filter @hatinh/api dev
pnpm --filter @hatinh/web dev
pnpm --filter @hatinh/admin dev
```

## Recommended local 3D + 360 demo

Create `apps/web/.env.local`:

```dotenv
VITE_IMMERSIVE_DATA_MODE=fake
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY
# Optional:
VITE_GOOGLE_MAPS_MAP_ID=YOUR_MAP_ID
VITE_IMMERSIVE_MINIMAP_MODE=fake
```

Do **not** set `VITE_IMMERSIVE_RENDERER_MODE=fake` if you want the real Google 3D and Photo Sphere Viewer renderers.

For fully deterministic fake renderers:

```dotenv
VITE_IMMERSIVE_DATA_MODE=fake
VITE_IMMERSIVE_RENDERER_MODE=fake
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for all runtime modes, API environment variables and the current local `/api/v1` routing caveat.

## Panorama tooling

Build a tiled panorama from a 2:1 equirectangular image:

```bash
pnpm panorama:build -- \
  --input /path/to/panorama.jpg \
  --output /path/to/output
```

Regenerate committed demo panoramas:

```bash
pnpm --filter @hatinh/panorama-tooling panorama:demo
```

See [docs/MEDIA.md](docs/MEDIA.md) for manifest, tiling and object-storage details.

## API client

REST is globally prefixed with:

```text
/api/v1
```

Swagger:

```text
/api/docs
```

After API contract changes regenerate the browser client:

```bash
pnpm api:generate
```

Do not manually edit `packages/api-client/src/generated/**`.

## Quality gates

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

Additional renderer/tooling checks are documented in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — 3D ↔ 360 model, renderer lifecycle, state ownership and current boundaries.
- [Development](docs/DEVELOPMENT.md) — local setup, runtime modes, environment, API client, admin and verification.
- [Panorama media](docs/MEDIA.md) — source requirements, tiling, manifests and object-storage delivery.
- [Agent instructions](AGENTS.md) — Codex/AGY ownership, architectural rules and verification policy.
- `docs/superpowers/specs/` — approved feature/milestone designs.
- `docs/superpowers/plans/` — implementation plans.

## Current boundaries

- Real Google 3D depends on Google project configuration, browser/WebGL support and geographic coverage.
- The committed front-end demo and the API `son-trang-co-dam` DB seed are different datasets.
- Curated 3D camera presets are strongest in demo mode; persisted/admin-managed presets are not yet a complete server-side catalog capability.
- The generated browser client uses relative `/api/v1` URLs; the committed Vite config currently has no `/api/v1` development proxy.
- The public/admin UI remains in active productization.

## Status

The repository's current core is an **interactive 3D location explorer with a connected persistent tiled 360° journey**.

> Users discover and move between real locations directly in the full-screen 3D world, then enter and return from location-specific 360° tours.
