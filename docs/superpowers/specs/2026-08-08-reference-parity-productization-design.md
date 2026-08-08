# Reference Parity Productization — Design Specification

**Status:** Approved design baseline  
**Date:** 2026-08-08  
**Repository:** `longdevlife/hatinh-immersive`  
**Milestone target:** Raise the current public immersive experience from foundation/prototype quality to approximately **65–75% reference parity** with the useful capabilities of `map3d.visithcmc.vn`, without cloning its visual design.

---

## 1. Purpose

The repository already contains a strong engineering foundation: monorepo/tooling, React/Vite apps, NestJS/Fastify API, PostgreSQL/PostGIS, Drizzle, OpenAPI client generation, Google Maps 3D adapter, Photo Sphere Viewer adapter, MapLibre engine, deep-link logic, media tooling, tests and CI.

The next milestone is **not another foundation phase**.

The purpose of this milestone is to connect the existing capabilities into a real, coherent visitor product:

```text
3D destination overview
        ↓
cinematic fly-to
        ↓
enter ground-level 360
        ↓
persistent node-to-node panorama navigation
        ↓
real synchronized minimap
        ↓
real content/media/search/language/share utilities
```

The desired product feeling is:

> Google Earth + Street View + a modern digital museum

The reference site is used for capability parity and interaction inspiration only. Do not copy its exact visual language.

---

## 2. Current-State Diagnosis

The milestone is designed around the actual repository state.

### 2.1 Keep — do not rewrite

Keep the existing architecture and production-grade foundations:

- pnpm workspace + Turborepo;
- React/Vite/TypeScript web and admin apps;
- NestJS/Fastify API;
- PostgreSQL/PostGIS/Drizzle;
- REST/OpenAPI/generated client;
- Zustand immersive navigation state;
- Google Maps 3D adapter;
- Photo Sphere Viewer adapter;
- MapLibre adapter;
- direct media upload / panorama tooling;
- Playwright/Vitest/architecture checks/CI.

### 2.2 Product gaps to close

The current public journey still has several prototype characteristics:

1. `ImmersiveExperience` builds the production experience from fixture data.
2. Panorama media fixture URLs point to placeholder hosts rather than a real environment-owned media source.
3. Photo Sphere Viewer exists, but scene changes are integrated in a way that can remount/destroy the viewer per node.
4. VirtualTourPlugin exists, but the real scene-link graph is not fully delegated to the persistent viewer instance.
5. A real MapLibre minimap engine exists, but the visible visitor UI still uses a schematic `MinimapFrame` implementation.
6. Backend/domain capabilities are more complete than the visitor-facing integration.
7. Search, scene browser, language, fullscreen, share and multimedia utilities are incomplete relative to the reference capability set.

Therefore the milestone theme is:

```text
CONNECT WHAT EXISTS
        ↓
REMOVE PRODUCTION FAKES
        ↓
PERSIST RENDERERS
        ↓
USE REAL MEDIA + REAL GIS
        ↓
ADD PARITY UX
        ↓
HARDEN
```

---

## 3. Scope

### 3.1 Required in this milestone

The presentation-ready product slice must include:

- Google 3D overview;
- destination fly-to;
- optional custom GLB/glTF placement;
- smooth 3D → 360 handoff;
- 10–15 linked panorama nodes for one destination/route;
- real or project-hosted panorama manifests and tiles;
- persistent Photo Sphere Viewer instance across scene navigation;
- native/in-engine scene-link navigation;
- adjacent-node preload;
- real MapLibre minimap;
- current location and heading synchronization;
- route/path and visited-node visualization;
- minimap node navigation;
- destination search;
- scene browser/scene selector;
- information hotspot;
- image/media hotspot;
- audio guide/hotspot;
- VI/EN locale support;
- fullscreen;
- share/deep-link;
- refresh/deep-link restoration;
- weak-network and renderer failure handling;
- automated E2E and lifecycle regression tests.

### 3.2 Explicitly out of scope

Do not expand this milestone into:

- ticketing/payment;
- booking;
- CRM/loyalty;
- POS/ERP;
- HR/workforce;
- Beacon;
- AR;
- AI recommendation;
- panorama depth measurement;
- full photogrammetric digital twin;
- native apps;
- microservices;
- Kubernetes;
- Kafka/event streaming;
- advanced selfie/check-in tooling;
- advanced measurement tooling.

---

# Design Section 1 — Product Architecture

## 4. Target Production Data Flow

Production must no longer use immersive fixtures as the main data source.

### 4.1 Target flow

```text
PostgreSQL/PostGIS
      ↓
NestJS immersive read model
      ↓
GET /api/v1/destinations/:slug/immersive-manifest
      ↓
Generated OpenAPI client
      ↓
TanStack Query
      ↓
DTO → UI/view-model mapper
      ↓
ImmersiveExperience
      ├── Map3D engine
      ├── Panorama engine
      └── Minimap engine
```

### 4.2 Fixture rule

Fixtures remain valid only for:

- unit tests;
- component preview;
- visual regression environments;
- explicit fake-renderer E2E mode;
- local UI scenario demonstrations.

Production route/integration modules must not import `shared/fixtures`.

CI must enforce this boundary.

---

## 5. Renderer Ownership and Lifecycle

### 5.1 3D overview

Google Maps JavaScript 3D remains the default overview renderer behind `Map3DEnginePort`.

The application owns mode/state; the Google adapter owns vendor-specific lifecycle.

### 5.2 Panorama

Photo Sphere Viewer remains the production panorama engine for this milestone.

The milestone must use **one persistent panorama viewer instance** while the user remains in panorama mode.

Correct lifecycle:

```text
overview3d
  Google 3D mounted
        ↓ enter 360
  Google 3D destroyed
        ↓
  Photo Sphere Viewer mounted once
        ↓
  scene-01
        ↓
  scene-02
        ↓
  scene-03
        ↓ leave panorama
  Photo Sphere Viewer destroyed once
```

Incorrect lifecycle:

```text
scene-01 viewer
   ↓ destroy
scene-02 viewer
   ↓ destroy
scene-03 viewer
```

Changing a scene is not equivalent to changing the renderer.

### 5.3 Minimap

MapLibre may remain active alongside the panorama renderer because it is a smaller supporting renderer and is a first-class spatial-awareness requirement.

---

## 6. Architectural Boundaries

The following remain mandatory:

- vendor SDK APIs only inside adapters/integration modules;
- pure UI does not fetch or initialize map/panorama engines;
- server state belongs to TanStack Query;
- transient immersive state belongs to Zustand;
- UI receives view models and callback contracts;
- frontends do not import Nest entities/repositories;
- generated OpenAPI client remains the network contract;
- media bytes bypass NestJS.

No new state-management or API framework is introduced.

---

# Design Section 2 — Scene Graph, Panorama and Media

## 7. Immersive Manifest Read Model

The visitor must be able to initialize the route using a single optimized read model rather than a chain of scene/link/hotspot requests.

Canonical endpoint:

```text
GET /api/v1/destinations/:slug/immersive-manifest?locale=vi
```

Conceptual response:

```ts
interface ImmersiveManifestDto {
  destination: {
    id: string;
    slug: string;
    name: string;
    summary: string;
    categoryLabel: string | null;
    coverImageUrl: string | null;
    geo: { lat: number; lng: number };
    overviewCamera?: CameraTargetDto;
    model3d?: ModelPlacementDto | null;
  };
  defaultSceneId: string;
  scenes: ImmersiveSceneDto[];
}

interface ImmersiveSceneDto {
  id: string;
  name: string;
  lat: number;
  lng: number;
  initialView: {
    heading: number;
    pitch: number;
    fov: number;
  };
  panorama: {
    manifestUrl: string;
    previewUrl: string | null;
  };
  links: Array<{
    id: string;
    targetSceneId: string;
    label: string | null;
    yaw: number;
    pitch: number;
  }>;
  hotspots: Array<{
    id: string;
    type: 'information' | 'media' | 'audio' | 'external';
    yaw: number;
    pitch: number;
    label: string | null;
    payload: unknown;
  }>;
}
```

The exact generated DTO names may follow existing repository conventions, but the semantics above are required.

---

## 8. Scene Graph Rules

Scene navigation is defined by `SceneLink`, not generic hotspots.

The graph may be non-linear.

Example:

```text
01 → 02 → 03 → 04 → 05
                   ├→ 06 → 07
                   └→ 09 → 10
```

Required invariants remain:

- source and target cannot be identical;
- links point to valid scenes;
- public manifest exposes only publishable scenes/assets;
- yaw normalized to `[0, 360)`;
- pitch constrained to renderer range;
- default scene is valid and published;
- a scene referencing unavailable production panorama media is not publishable.

---

## 9. Persistent Virtual Tour Integration

The Photo Sphere Viewer adapter must receive enough graph information to configure VirtualTourPlugin correctly.

Each panorama node maps to a virtual-tour node with real outgoing links.

Conceptual mapping:

```ts
{
  id: scene.id,
  gps: [scene.lng, scene.lat],
  panorama: hydratedPanorama,
  thumbnail: scene.previewUrl,
  links: scene.links.map((link) => ({
    nodeId: link.targetSceneId,
    position: {
      yaw: degreesToRadians(link.yaw),
      pitch: degreesToRadians(link.pitch),
    },
  })),
}
```

Do not hardcode `links: []` in the production graph.

### Scene transition behavior

When a user chooses a neighboring scene:

1. orient toward the link when appropriate;
2. transition/fade using the existing viewer instance;
3. update application scene state after successful transition;
4. update minimap current node;
5. update deep-link;
6. prefetch likely neighbors.

If the next scene fails, keep the current scene usable.

---

## 10. Media Pipeline

Panorama sources are converted to multiresolution assets.

Example input:

```text
scene-01-original.jpg
12000 × 6000
```

Output:

```text
scene-01/
├── preview.webp
├── manifest.json
└── tiles/
    ├── 0/
    ├── 1/
    ├── 2/
    ├── 3/
    └── 4/
```

Media is uploaded to S3-compatible object storage and delivered from CDN/storage origin.

The API returns URLs/metadata only.

NestJS must never proxy tile/model/audio bytes in the normal visitor path.

---

## 11. Demo Dataset

The milestone is validated on one polished destination route.

Target data:

- one destination, initially Sơn Trang Cổ Đạm demo or equivalent approved destination;
- 10–15 panorama nodes;
- at least one branch in the node graph;
- real geographic coordinates;
- at least five hotspots:
  - two information/story hotspots;
  - one image/media hotspot;
  - one audio hotspot;
  - one heritage/cultural story hotspot;
- one synchronized route on the minimap;
- optional one GLB/glTF placement in overview mode.

The dataset should be small enough to polish and large enough to demonstrate a real virtual-tour graph.

---

## 12. Prefetch Strategy

Do not preload the whole route.

### Good network

- current scene required assets;
- preview/base data for up to two likely neighboring scenes.

### Constrained network

- current scene;
- preview/base data for at most one likely next scene;
- reduce aggressive high-resolution prefetch.

### Offline

- preserve currently loaded content where possible;
- prevent impossible navigation without destroying the current experience.

The prefetch algorithm may prefer link order/sort order for this milestone; predictive analytics are out of scope.

---

# Design Section 3 — Product UX and Reference Capability Parity

## 13. UX Direction

The product remains visually independent from the reference site.

Reference parity means capability parity, not visual cloning.

The immersive canvas remains dominant and UI chrome remains minimal.

### Desktop concept

```text
┌─────────────────────────────────────────────────┐
│ BRAND      SEARCH                 VI/EN    SHARE│
│                                                 │
│                                                 │
│                   3D / 360                      │
│                                                 │
│                         ┌────────────────────┐  │
│                         │   REAL MINIMAP     │  │
│                         └────────────────────┘  │
│                                                 │
│ Destination / Scene                            │
│                                                 │
│ INFO AUDIO   scene/nav controls      FULLSCREEN│
└─────────────────────────────────────────────────┘
```

### Mobile concept

- full available viewport immersive canvas;
- compact top brand/search/menu;
- thumb-reachable bottom actions;
- minimap collapses to a compact floating control;
- information uses bottom sheet;
- no hover-only interaction.

---

## 14. Real MapLibre Minimap

The production public journey must use the existing MapLibre engine, not schematic CSS node placement.

Required layers/behaviors:

- basemap;
- route LineString;
- all scene nodes;
- visited-state visualization;
- current node marker;
- current viewing heading/direction;
- selected next node;
- click/tap scene navigation;
- recenter/ease to the current scene where appropriate.

Data flow:

```text
Photo Sphere Viewer position update
        ↓
heading/pitch state
        ↓
Zustand
        ↓
MapLibre minimap state
        ↓
marker/direction update
```

Node selection:

```text
MapLibre node click
        ↓
immersive navigation action
        ↓
Photo Sphere Viewer scene transition
```

The existing schematic `MinimapFrame` may remain only as test/preview/fallback code if useful; it must not be the normal production minimap.

---

## 15. P0 Reference-Parity Utilities

Required for this milestone:

1. destination search;
2. information panel;
3. audio guide control;
4. scene browser/selector;
5. real minimap;
6. fullscreen;
7. share/deep-link;
8. language VI/EN.

### P1 if capacity remains

- auto-rotate;
- gyroscope/orientation;
- curated tour progress;
- gallery;
- compact help panel.

Do not delay P0 to implement P1.

---

## 16. Scene Browser

The scene browser uses the same manifest graph as panorama/minimap.

It must not introduce a separate scene data source.

Accepted presentation styles:

- compact numbered scene strip;
- thumbnail carousel;
- grouped route stops if later supported.

Selection calls the same central `navigateToScene(sceneId)` path used by minimap and panorama links.

---

## 17. Search

This milestone does not require Elasticsearch.

A simple API-backed destination search is sufficient.

Conceptual route:

```text
GET /api/v1/destinations?q=<query>&locale=vi
```

Client behavior:

```text
search input
    ↓ debounce
API query
    ↓
select destination
    ↓
overview mode
    ↓
fly-to selected destination
```

No destination names should be hardcoded into production UI navigation.

---

## 18. Localization

VI/EN is required.

Content locale must come from the data/content model rather than JSX string conditionals.

Fallback order:

```text
requested locale
    ↓
vi
```

UI system strings should be centralized in a lightweight locale layer. Do not introduce a large localization platform unless repository needs justify it.

---

## 19. Google Custom Street View Spike

Google Custom Street View is a **non-blocking technical spike**, not the production engine for this milestone.

Use three representative panorama nodes and compare:

- transition smoothness;
- tile loading behavior;
- custom hotspot flexibility;
- minimap synchronization;
- custom UI freedom;
- mobile gesture quality;
- bundle/runtime cost;
- vendor lock-in.

Record the result as an ADR/spike report.

Default decision:

> Retain Photo Sphere Viewer unless the spike demonstrates a clear product or performance advantage large enough to justify migration cost.

The spike must not block reference-parity delivery.

---

# Design Section 4 — Reliability, Testing and Acceptance

## 20. Critical E2E Journey

Playwright must cover the visitor journey end-to-end:

```text
home
 ↓
search/select destination
 ↓
3D overview loads
 ↓
fly-to
 ↓
enter 360
 ↓
scene-01
 ↓
navigate scene-02
 ↓
rotate panorama
 ↓
minimap heading changes
 ↓
select another scene from minimap
 ↓
open information hotspot
 ↓
play audio
 ↓
change language
 ↓
share/deep-link
 ↓
reload
 ↓
same scene + orientation restored
```

Real third-party network services may be replaced by deterministic adapters in CI, but the production integration must also have an environment smoke path.

---

## 21. Renderer Lifecycle Regression Test

This is a mandatory regression test.

Expected lifecycle:

```text
enter overview:
Map3D mount count = 1

enter panorama:
Map3D destroy count = 1
Panorama mount count = 1

scene-01 → scene-02 → scene-03:
Panorama mount count = 1
Panorama destroy count = 0

leave panorama:
Panorama destroy count = 1
```

A scene change that remounts the panorama renderer fails the milestone.

---

## 22. Production Fixture Boundary Test

CI must reject imports from fixture modules in production immersive integration code.

Allowed:

```text
*.test.*
*.spec.*
e2e fake-mode setup
component preview/stories
explicit test utilities
```

Disallowed:

```text
production ImmersiveExperience
production route loaders/query hooks
production DTO/view-model mapper
production renderer integration
```

---

## 23. Minimap Integration Gate

The production experience must mount the real minimap integration:

```text
Minimap integration container
        ↓
MinimapViewport
        ↓
MapLibreMinimapEngine
```

A CSS-only/schematic minimap does not satisfy acceptance.

---

## 24. Failure and Weak-Network Behavior

Required cases:

### Google 3D unavailable

- show fallback entry state;
- destination remains accessible;
- allow entering supported content/360 path if appropriate.

### Panorama manifest failure

- show local renderer error;
- page shell remains healthy;
- retry is available.

### High-resolution tile failure

- keep low-resolution preview/base content visible where engine permits;
- retry at tile/scene level rather than crash application.

### Next scene failure

- current scene remains active;
- non-blocking error;
- navigation can be retried or another link selected.

### Offline

- preserve already-loaded scene/content where possible;
- disable impossible network navigation clearly.

---

## 25. Performance Requirements

Inherited project goals remain:

- mobile-first;
- LCP ≤ 2.5 s;
- INP ≤ 200 ms;
- CLS ≤ 0.1.

Bundle/lifecycle requirements:

- Google Maps 3D SDK not in initial homepage critical bundle;
- Photo Sphere Viewer not in initial homepage critical bundle;
- MapLibre not in initial homepage critical bundle;
- immersive engines lazy-load by route/mode;
- only one heavy overview/panorama renderer active at a time;
- immutable media uses CDN-friendly caching;
- large panorama originals are never downloaded as the standard visitor representation.

Collect or expose useful measurements for:

- 3D initialization duration;
- panorama initialization duration;
- node transition duration;
- tile/manifest failures;
- WebGL initialization failures.

---

## 26. Accessibility

Target WCAG 2.2 AA.

Required:

- visible keyboard focus;
- semantic buttons/controls;
- dialogs/sheets manage focus;
- touch-friendly targets;
- reduced-motion mode;
- sufficient text contrast;
- controls do not depend on hover;
- immersive visual content has accessible supporting HTML information.

3D/panorama imagery itself is not treated as a replacement for accessible text content.

---

## 27. Security / Platform Constraints

Existing platform security conventions remain in force:

- no secrets in Vite-exposed config;
- controlled CORS/CSP origins;
- direct object-storage upload for large admin media;
- rate limiting for sensitive write/auth operations;
- audit sensitive publishing/content changes;
- existing auth/role architecture remains the admin baseline.

No security architecture rewrite belongs in this milestone unless an actual blocker is discovered.

---

## 28. Reference Parity Evaluation

Parity is assessed by capability group, not pixel similarity.

Target after this milestone:

| Area | Target |
|---|---:|
| 3D destination experience | ≥ 80% |
| 360 navigation | ≥ 80% |
| Real media/data | ≥ 70% |
| Minimap/GIS | ≥ 80% |
| Search/content | ≥ 65% |
| Toolbar utilities | ≥ 60% |
| Multimedia | ≥ 65% |
| Mobile experience | ≥ 70% |
| Advanced extras | ≤ 40% acceptable |

This yields an intended useful reference parity of approximately **65–75%**, while intentionally excluding non-core advanced extras.

---

## 29. Definition of Done

The milestone is complete only when all of the following are true:

- production visitor journey does not import immersive fixtures;
- immersive manifest is served through the real REST/OpenAPI path;
- PostgreSQL/PostGIS supplies the scene graph/read model;
- panorama media uses project-owned storage/CDN/local equivalent URLs;
- demo contains 10–15 linked panorama nodes;
- panorama renderer remains mounted across node transitions;
- VirtualTourPlugin receives real scene links;
- adjacent-node preload is active and network-aware;
- Google 3D overview hands off to panorama coherently;
- real MapLibre minimap is visible in production;
- panorama heading synchronizes with minimap direction;
- minimap node selection navigates scenes;
- information/media/audio hotspots work;
- destination search works through API data;
- scene browser works through the same graph;
- VI/EN works with content fallback;
- fullscreen works;
- share/deep-link works;
- refresh restores scene and view;
- failure/weak-network behavior is tested;
- renderer lifecycle regression test passes;
- production-fixture boundary test passes;
- architecture checks pass;
- typecheck/lint/unit/integration/E2E/build quality gates pass.

---

## 30. Implementation Ordering Constraint

The future implementation plan must prioritize integration over new feature breadth.

Required ordering principle:

1. establish production immersive read model/API client path;
2. remove fixture dependency from production journey;
3. fix persistent panorama lifecycle and real scene links;
4. integrate real MapLibre minimap;
5. connect real/project-hosted panorama media;
6. complete deep-link/state synchronization;
7. add P0 parity utilities;
8. harden network/performance/accessibility;
9. run Google Custom Street View spike without blocking production milestone.

Do not start by redesigning the repository or adding more infrastructure.

---

## 31. Non-Goals / YAGNI Guard

During implementation, reject changes whose main justification is future possibility rather than the current milestone.

Specifically avoid:

- new microservice boundaries;
- new message brokers;
- a second state-management system;
- a second production panorama engine;
- a second GIS engine;
- generalized plugin frameworks without current consumers;
- refactoring stable backend modules unrelated to immersive productization;
- replacing the existing design system solely for visual preference.

---

## 32. Design Decision Summary

1. **Keep the repository foundation.** It is not the current bottleneck.
2. **Use real API-driven production data.** Fixtures become test/preview assets only.
3. **Keep Photo Sphere Viewer as the production 360 engine.**
4. **Keep Google Maps 3D as the overview engine.**
5. **Use one persistent panorama viewer per panorama-mode session.**
6. **Feed the real `SceneLink` graph into VirtualTourPlugin.**
7. **Use the already-built MapLibre engine as the production minimap.**
8. **Use CDN/object-storage panorama tiles and manifests.**
9. **Add P0 reference capabilities without cloning the reference visual design.**
10. **Treat Google Custom Street View as a non-blocking comparative spike.**
11. **Measure success through explicit E2E/lifecycle/data/performance acceptance gates.**
12. **Stop at a polished 65–75% capability-parity product slice before expanding scope.**
