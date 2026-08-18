# Hà Tĩnh Immersive

A production-oriented digital tourism platform for Hà Tĩnh focused on **2D discovery, destination storytelling and immersive 360° experiences**.

> **MAP FOR DISCOVERY. CONTENT FOR DECISION. SƠN TRANG FOR FOCUS. 360 FOR IMMERSION.**

## Product direction

The current product journey is:

```text
Home
  ↓
Explore Hà Tĩnh
  ↓
2D MapLibre discovery
  ↓
Destination detail / editorial content
  ↓
Sơn Trang Cổ Đạm focus experience
  ↓
Immersive 360°
  ↓
Narration / Auto Tour / hotspots / planning-ready journey
```

Each layer has one primary job:

- **MapLibre 2D** — province-wide discovery and navigation.
- **Destination content** — evaluation and decision-making.
- **Sơn Trang Cổ Đạm** — the deepest showcase/focus experience.
- **360° panorama** — immersion and spatial storytelling.
- **Audio / narration / Auto Tour** — guided storytelling inside immersive scenes.

### About Google 3D

The repository still contains an optional Google Maps 3D adapter and related engineering/tests from earlier exploration work, but **Google 3D is not part of the active production journey or the current 4-phase delivery roadmap**.

Do not treat Google 3D as the primary discovery surface and do not make Phase 2/3/4 work depend on it. If 3D is reconsidered later, it must be justified as a separate product decision where it adds clear user value.

## Current milestone

### Phase 1 — Production Immersive Recovery: technical PASS

The production panorama path now uses the same unified product presentation as the non-production/demo path instead of falling back to legacy controls.

Implemented and regression-gated:

- Unified Media Dock on API/non-demo panorama routes.
- Auto Tour product visibility on startable tours.
- VI/EN locale control in the Unified Panorama Presentation.
- Truthful audio capability: production does not advertise audio that cannot actually play.
- Public panorama media-quality gate before Photo Sphere Viewer rendering.
- Public panorama highest-level width must be at least **4096 px**.
- Demo-only, invalid and very low-resolution public media fail closed.
- The existing 128/256 px Sơn Trang placeholders are blocked from fullscreen public rendering.
- Deep links preserve the requested scene identity across URL, heading and scene rail.
- Dedicated production-like real-PSV rejection E2E coverage.

The remaining Sơn Trang media blocker is content, not renderer correctness: real customer-owned/licensed high-resolution panorama assets are still required.

### Next milestone — Phase 2: Contract Freeze & Product Acceptance

Phase 2 freezes the semantic presentation boundary before visual redesign:

```text
Domain / state / sources / renderer / routing
                    ↓
              stable VM + actions
                    ↓
             presentation layer
```

The contract-freeze work covers:

- Unified Media Dock VM/actions;
- scene rail semantics;
- minimap semantics;
- locale and source/capability boundaries;
- Free Explore and Auto Tour acceptance behavior;
- audio/language/failure semantics;
- accessibility requirements;
- exact file ownership for Agy.

**Do not start the broad Agy UI redesign until Phase 2 is merged.**

## Four-phase roadmap

### Phase 1 — Production Immersive Recovery

**Owner:** Codex  
**Status:** technical PASS / merge gate

Recover production correctness, expose the unified panorama experience, reject invalid public media and add product-facing acceptance tests.

### Phase 2 — Contract Freeze & Product Acceptance

**Owner:** Codex  
**Status:** next

Freeze stable presentation VMs/actions and durable product acceptance tests so presentation work cannot accidentally recreate domain logic.

### Phase 3 — Cinematic Panorama Redesign

**Visual owner:** Agy  
**Engineering/integration owner:** Codex

Redesign the panorama experience into a premium tourism interface: Media Dock, scene rail, minimap, typography, hierarchy, spacing, mobile behavior, transcript presentation and cinematic motion.

### Phase 4 — Sơn Trang Production Storytelling & Showcase Release

**Engineering owner:** Codex  
**Visual/content-presentation owner:** Agy

Replace placeholders with approved scene-specific 360 media, pre-generated narration, ambient sound, transcript/captions, coherent Auto Tour storytelling, production media metadata, performance hardening and release QA.

## Active immersive architecture

```text
Route / deep link
      ↓
ImmersiveExperience composition root
      ↓
Navigation + source capability + renderer state
      ├── MapLibre discovery / minimap
      ├── Photo Sphere Viewer 360
      └── audio / Auto Tour orchestration
      ↓
Unified Panorama Presentation
      ├── ReferenceParityControls
      ├── Unified Media Dock
      ├── scene rail
      ├── minimap
      ├── hotspots
      └── transcript / captions
```

Important architectural rules:

1. Content source chooses **data/capabilities**, not modern-vs-legacy UI.
2. `ImmersiveExperience.tsx` remains the composition root.
3. Presentation consumes semantic VM/actions; it does not own routing, audio or Auto Tour state machines.
4. One Auto Tour progression owner only.
5. Async scene/audio work must validate active ownership before committing results.
6. Production SpeechSynthesis is not allowed; browser SpeechSynthesis is demo-only.
7. No silent EN → VI narration fallback.
8. Audio is allowed to fail; the immersive experience is not allowed to fail because audio failed.
9. Public panorama media must pass runtime quality validation before real PSV renders it.
10. Panorama navigation keeps the renderer lifecycle stable across scene transitions.

## 360° media safety

Public panorama media is validated at runtime before being handed to Photo Sphere Viewer.

Current recovery policy:

```text
highest manifest level width >= 4096 px
public path cannot use demo-only media
explicit invalid/missing media is rejected
invalid manifest parsing fails closed
```

Low-resolution fixtures may still be used under an explicit demo/test policy for deterministic verification.

> The current committed Sơn Trang 128/256 px panorama fixtures are development placeholders. They are intentionally rejected on the public production path. Real customer-owned/licensed Sơn Trang panorama media remains a Phase 4 content requirement.

## Audio and Auto Tour

The immersive runtime already contains the core audio and guided-tour machinery.

### Free Explore

```text
enter scene
→ ambient when allowed
→ narration remains manual
→ user may play/pause/resume the story
→ camera rotation never auto-starts narration
→ scene change cleans up old narration
```

### Auto Tour

```text
scene commit
→ settle
→ narration when available
→ short hold
→ transition
```

Auto Tour owns progression. Presentation controls call semantic Auto Tour actions rather than creating independent timers.

Production narration is intended to use reviewed, pre-generated files. Demo SpeechSynthesis remains demo-only.

## Current capabilities

### Explore and navigation

- MapLibre-based province discovery foundation;
- destination detail flow and preserved Explore return context;
- deep-link scene/camera state;
- responsive minimap foundation;
- deterministic fake engines for tests.

### Immersive 360

- Photo Sphere Viewer 5;
- `EquirectangularTilesAdapter`;
- linked panorama scene graph;
- preview-first multi-resolution pipeline support;
- persistent renderer lifecycle;
- committed/requested scene transaction semantics;
- stale async protection and rollback;
- truthful unavailable/failure composition;
- public media-quality enforcement.

### Audio storytelling

- audio controller/domain;
- browser-file production source policy;
- demo-only SpeechSynthesis source policy;
- narration ownership/race protection;
- ambient/narration coordination;
- Unified Media Dock;
- captions/transcript presentation foundation;
- Auto Tour orchestration.

### Optional / non-active capability

- Google Maps JavaScript 3D adapter and related test coverage remain in the codebase.
- This capability is **not active in the current production product journey** and is **not a prerequisite for Phase 2–4**.

### Platform foundation

- NestJS/Fastify REST API;
- PostgreSQL/PostGIS;
- Drizzle ORM;
- generated OpenAPI/React Query client;
- S3-compatible media storage;
- authenticated admin/CMS foundation;
- Vitest, Playwright, architecture checks and CI;
- Docker/API smoke coverage.

## Repository layout

```text
hatinh-immersive/
├── apps/
│   ├── web/                  # public Explore / 360 experience
│   ├── admin/                # authenticated CMS/editor
│   └── api/                  # NestJS/Fastify REST API
├── packages/
│   ├── api-client/           # generated browser client
│   ├── immersive-contracts/  # shared panorama/media contracts
│   ├── ui/
│   └── ...
├── tooling/
│   ├── panorama/             # panorama processing/validation
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

**Web:** React 19, Vite 8, TypeScript 6, React Router, TanStack Query, Zustand 5, MapLibre GL JS 6, Photo Sphere Viewer 5.

**Optional legacy/experimental adapter:** Google Maps JavaScript 3D remains in the repository but is not part of the active production journey.

**API:** NestJS 11, Fastify 5, PostgreSQL 17 + PostGIS 3.5, Drizzle ORM, Zod, Pino, S3-compatible storage, Swagger/OpenAPI.

**Tooling:** Node.js 24, pnpm 11.3, Turborepo, Vitest, Playwright, ESLint, Prettier, dependency-cruiser, Knip, Husky/commitlint.

## Quick start

Requirements:

```text
Node >=24 <25
pnpm >=11.3.0 <12
Docker / Docker Compose
```

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

## Renderer/runtime modes

The active public journey depends on MapLibre and Photo Sphere Viewer. The repository also retains fake renderers for deterministic testing.

```dotenv
# All-fake deterministic mode
VITE_IMMERSIVE_RENDERER_MODE=fake

# Surface-specific test/runtime overrides
VITE_IMMERSIVE_MINIMAP_MODE=fake
VITE_IMMERSIVE_PANORAMA_MODE=fake
```

`VITE_IMMERSIVE_MAP3D_MODE` exists because the optional Google 3D adapter remains in the codebase; it is not part of the current production roadmap.

Panorama tour content policy is separate from renderer selection. Demo content/source must never be used merely to make production presentation appear.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the complete environment matrix and local API setup.

## Panorama tooling

Build tiled media from a 2:1 equirectangular panorama:

```bash
pnpm panorama:build -- \
  --input /path/to/panorama.jpg \
  --output /path/to/output
```

Validate panorama output:

```bash
pnpm panorama:validate -- /path/to/output
```

See [docs/MEDIA.md](docs/MEDIA.md) for media contracts, tiling and storage details.

## API client

REST prefix:

```text
/api/v1
```

Swagger:

```text
/api/docs
```

After API contract changes:

```bash
pnpm api:generate
```

Do not manually edit `packages/api-client/src/generated/**`.

## Quality gates

Core repository gates:

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

Immersive-specific CI additionally covers real/fake panorama paths, public panorama quality, production-like real PSV rejection, reference parity, navigation, minimap, MapLibre worker and production manifest journeys. Existing Google 3D/Selected3D tests protect dormant code but do not define the active product journey.

A green unit test run is **not** sufficient for immersive release approval. Production-facing milestones also require product-level E2E and visual evidence.

## Agent workflow

This repository uses a Codex-first engineering workflow.

### Codex

Engineering lead/orchestrator:

- architecture and contracts;
- router/state/data;
- renderer lifecycle;
- audio/Auto Tour semantics;
- backend/API;
- tests and CI;
- integration and release verification.

### Agy

Presentation/UI owner after contracts are frozen:

- visual composition;
- responsive UI;
- typography and spacing;
- Media Dock presentation;
- scene rail/minimap presentation;
- transcript UI;
- iconography and motion;
- cinematic visual QA.

Agy must not recreate router, audio, Auto Tour, source-policy or PSV lifecycle semantics inside presentation code. Codex must not independently redesign Phase 3 UI.

One physical checkout is the project default. Do not use worktrees for the current phased execution workflow.

See [AGENTS.md](AGENTS.md) and `docs/superpowers/` before agentic implementation.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — renderer lifecycle, state ownership and architectural boundaries.
- [Development](docs/DEVELOPMENT.md) — local setup, environment and verification.
- [Panorama media](docs/MEDIA.md) — source requirements, manifests, tiling and storage.
- [Agent instructions](AGENTS.md) — Codex/Agy ownership and repository rules.
- `docs/superpowers/specs/` — approved designs/specifications.
- `docs/superpowers/plans/` — phase implementation plans.

## Current production blockers

The main remaining immersive content blocker is **real Sơn Trang production media**:

- scene-specific customer-owned/licensed panorama imagery;
- minimum runtime acceptance currently starts at 4096×2048-equivalent equirectangular resolution;
- reviewed pre-generated narration files;
- reviewed ambient tracks;
- production transcript/caption content and rights metadata.

These belong to Phase 4. They must not be solved by upscaling the current placeholders or enabling runtime TTS in production.

## Next after Phase 1 merge

After Phase 1 is merged:

1. verify the merged `main` deployment once using the production Sơn Trang deep link;
2. confirm the low-resolution placeholder still fails closed and the deployed build matches the merged SHA;
3. generate the **Phase 2 Contract Freeze implementation plan** from the new `main` using the approved Superpowers spec;
4. freeze Unified Media Dock, scene rail, minimap, locale/source-capability and failure-state contracts;
5. add durable product acceptance/accessibility tests that survive visual redesign;
6. merge Phase 2;
7. only then dispatch Agy for Phase 3 cinematic panorama redesign.

Do not begin Phase 4 content production or broad UI redesign while Phase 2 contracts are still moving.
