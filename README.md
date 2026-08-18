# Hà Tĩnh Immersive

A production-oriented digital tourism platform for Hà Tĩnh focused on **2D discovery, destination storytelling and immersive 360° experiences**.

> **MAP FOR DISCOVERY. CONTENT FOR DECISION. SƠN TRANG FOR FOCUS. 360 FOR IMMERSION.**

## Product direction

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
Narration / ambient audio / Auto Tour / hotspots
```

Primary roles:

- **MapLibre 2D** — province-wide discovery and navigation.
- **Destination content** — evaluation and decision-making.
- **Sơn Trang Cổ Đạm** — deepest showcase/focus experience.
- **360° panorama** — immersion and spatial storytelling.
- **Ambient audio / narration / Auto Tour** — guided storytelling inside immersive scenes.

### Google 3D

The repository still contains an optional Google Maps 3D adapter and related tests from earlier exploration work, but **Google 3D is not part of the active production journey or the current delivery roadmap**.

Do not make current product work depend on Google 3D. If 3D is reconsidered later, it must be a separate product decision with a clear user-value case.

## Current milestone

### Phase 1 — Production Immersive Recovery: acceptance reopened

PR #25 fixed several real engineering defects, including source-independent Unified Panorama Presentation, locale switching, public-media validation and real-PSV rejection coverage.

However, current product acceptance is **not complete and the PR must remain Draft**.

Current blockers:

1. **Sơn Trang 360 is not usable on the public path.** The committed Sơn Trang panorama fixtures only reach 128/256 px while public runtime requires a highest manifest level of at least 4096 px. The renderer correctly rejects them, but there is currently no production-quality panorama to show instead.
2. **Runtime media rejection is classified as a generic renderer error.** The API can still mark a scene `ready` while the runtime validator rejects the actual panorama manifest. This creates duplicated/contradictory UI: renderer error state together with scene rail, minimap and Media Dock instead of one semantic content-unavailable state.
3. **Production ambient and narration content are not wired.** Public runtime uses the file-backed audio source, but the current immersive API response does not provide production `audioTracks`/destination ambient data to the web presentation.
4. **Media Dock presentation still has an acceptance bug.** A mobile-only “Thu gọn/Mở điều khiển âm thanh” control can leak into desktop through CSS specificity and is misleading when no audio exists.
5. **Panorama Back copy still references `3D`.** The active product no longer uses Google 3D as the destination to return to.

Do **not** start Phase 2 Contract Freeze until these Phase 1 acceptance blockers are resolved or explicitly re-scoped by the product owner.

## Required Phase 1 completion gate

Before PR #25 may merge:

```text
Sơn Trang public entry has a truthful usable outcome
+ runtime media rejection maps to one semantic unavailable state
+ no duplicate renderer / rail / minimap / dock error chrome
+ desktop Media Dock has no mobile-only audio toggle
+ Back returns to destination detail without “3D” product copy
+ production audio contract is explicit
+ ambient/narration either have real playable sources or are intentionally absent with correct UI
+ exact-head CI and production-equivalent screenshots pass
```

A green CI run alone is not enough.

## Four-phase roadmap

### Phase 1 — Production Immersive Recovery

**Owner:** Codex  
**Status:** in progress / acceptance reopened

Recover production correctness and make the Sơn Trang immersive entry truthful and usable.

### Phase 2 — Contract Freeze & Product Acceptance

**Owner:** Codex  
**Status:** blocked by Phase 1 acceptance

Freeze stable presentation VMs/actions and durable product acceptance tests only after real Phase 1 behavior is correct.

### Phase 3 — Cinematic Panorama Redesign

**Visual owner:** Agy  
**Engineering/integration owner:** Codex

Redesign Media Dock, scene rail, minimap, typography, hierarchy, spacing, mobile behavior, transcript presentation and cinematic motion after Phase 2 contracts are frozen.

### Phase 4 — Sơn Trang Production Storytelling & Showcase Release

**Engineering owner:** Codex  
**Visual/content-presentation owner:** Agy

Complete scene-specific production 360 media, reviewed narration, ambient audio, transcript/captions, Auto Tour storytelling, rights/version metadata, performance hardening and release QA.

> If the product owner requires playable Sơn Trang panorama and audio before Phase 2, the minimum required media/audio slice moves forward into Phase 1 rather than being postponed to Phase 4.

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
      ├── utility controls
      ├── Unified Media Dock
      ├── scene rail
      ├── minimap
      ├── hotspots
      └── transcript / captions
```

Architectural rules:

1. Content source chooses **data/capabilities**, not modern-vs-legacy UI.
2. `ImmersiveExperience.tsx` remains the composition root.
3. Presentation consumes semantic VM/actions; it does not own routing, audio or Auto Tour state machines.
4. One Auto Tour progression owner only.
5. Async scene/audio work validates active ownership before committing results.
6. Production SpeechSynthesis is not allowed; browser SpeechSynthesis is demo-only.
7. No silent EN → VI narration fallback.
8. Audio may fail; immersive must not fail because audio failed.
9. Public panorama media must pass runtime quality validation before real PSV renders it.
10. Content-unavailable and retryable renderer-error states must be semantically distinguishable.

## Panorama media safety

Current public policy:

```text
highest manifest level width >= 4096 px
public path cannot use demo-only media
explicit invalid/missing media is rejected
invalid manifest parsing fails closed
```

Low-resolution fixtures remain valid for explicit demo/test policy only.

The current Sơn Trang fixtures are development placeholders, not production media. Do not solve this by upscaling 128/256 px assets or disabling the quality gate.

## Audio and Auto Tour

The runtime already contains audio and Auto Tour domain machinery, but **domain machinery is not the same as production content**.

Production playback requires file-backed tracks:

```text
production immersive manifest/content source
        ↓
ambient track + scene narration tracks + locale/transcript metadata
        ↓
browser-file audio source
        ↓
Media Dock / Auto Tour
```

Production narration should use reviewed pre-generated files. Runtime SpeechSynthesis remains demo-only.

### Free Explore

```text
enter scene
→ ambient when available/allowed
→ narration remains manual
→ play/pause/resume story
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

Auto Tour owns progression. Presentation must not create an independent timer.

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
- public runtime media validation.

### Audio storytelling foundation

- audio controller/domain;
- browser-file production source policy;
- demo-only SpeechSynthesis source policy;
- narration ownership/race protection;
- ambient/narration coordination;
- Unified Media Dock;
- captions/transcript presentation foundation;
- Auto Tour orchestration.

### Optional / non-active capability

- Google Maps JavaScript 3D adapter and tests remain in the codebase.
- It is not an active production surface and is not a prerequisite for current phases.

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
│   └── ui/
├── tooling/
│   ├── panorama/             # panorama processing/validation
│   └── scripts/
├── infra/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── MEDIA.md
│   └── superpowers/
├── AGENTS.md
└── README.md
```

## Tech stack

**Web:** React 19, Vite 8, TypeScript 6, React Router, TanStack Query, Zustand 5, MapLibre GL JS 6, Photo Sphere Viewer 5.

**API:** NestJS 11, Fastify 5, PostgreSQL 17 + PostGIS 3.5, Drizzle ORM, Zod, Pino, S3-compatible storage, Swagger/OpenAPI.

**Tooling:** Node.js 24, pnpm 11.3, Turborepo, Vitest, Playwright, ESLint, Prettier, dependency-cruiser and Knip.

## Quick start

Requirements:

```text
Node >=24 <25
pnpm >=11.3.0 <12
Docker / Docker Compose
```

```bash
corepack enable
pnpm install --frozen-lockfile
docker compose -f infra/compose/compose.dev.yml up -d
pnpm dev
```

API database when needed:

```bash
pnpm --filter @hatinh/api db:migrate
pnpm --filter @hatinh/api db:seed
```

## Panorama tooling

```bash
pnpm panorama:build -- --input /path/to/panorama.jpg --output /path/to/output
pnpm panorama:validate -- /path/to/output
```

See [docs/MEDIA.md](docs/MEDIA.md).

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

Immersive milestones additionally require production-like E2E and desktop/mobile visual evidence.

## Agent workflow

### Codex

Owns architecture, contracts, router/state/data, renderer lifecycle, audio/Auto Tour semantics, backend/API, tests, CI and integration.

### Agy

Owns presentation/UI only after contract freeze: composition, responsive UI, typography, spacing, Media Dock visuals, scene rail/minimap presentation, transcript, iconography, motion and visual QA.

Agy must not recreate router/audio/Auto Tour/source/PSV semantics in presentation code. Codex must not independently redesign Phase 3 UI.

One physical checkout; no worktrees for the current phased workflow.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [Panorama media](docs/MEDIA.md)
- [Agent instructions](AGENTS.md)
- `docs/superpowers/specs/`
- `docs/superpowers/plans/`

## Immediate next action

Keep PR #25 Draft. Resolve Phase 1 acceptance on the current branch first. Only after a new product-level review passes should the PR be marked Ready, merged, and followed by Phase 2 Contract Freeze.
