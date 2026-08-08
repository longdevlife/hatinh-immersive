# Interactive 3D Location Explorer — Master Design & Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:using-git-worktrees` before implementation, then `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Every code task follows RED → GREEN → REFACTOR → verification → focused commit. Codex is the primary orchestrator. AGY is a delegated UI/UX worker through Herdr when Herdr is available in the execution environment.

**Goal:** Turn the existing Google Maps 3D overview into the primary interactive tourism world: a full-screen 3D map containing real destination locations that users can freely rotate/tilt/zoom, select directly in 3D, fly between without reload, and enter the already-built 360 tour for the selected location.

**Architecture:** Reuse the current Google `Map3DElement` adapter, destination catalog, REST/OpenAPI client, Zustand navigation, and existing 360 system. Extend the 3D engine with interactive location markers and selection events, keep one 3D map instance alive while moving between locations, derive map locations from published destinations, and connect location selection to the existing panorama entry flow. MapLibre/minimap is not the core product for this milestone and must not block delivery.

**Tech Stack:** Node 24, pnpm 11.3, TypeScript 6, React 19, Vite 8, Zustand, TanStack Query, NestJS 11/Fastify 5, PostgreSQL/PostGIS, Drizzle, generated OpenAPI client, Google Maps JavaScript 3D (`Map3DElement`, `Marker3DInteractiveElement`, optional `Model3DInteractiveElement`), Vitest, Playwright.

## Global Constraints

- Preserve the existing monorepo and module boundaries; do not re-scaffold the project.
- Do not rewrite or replace the existing production 360 implementation unless a narrow 3D↔360 integration change is required.
- The primary product is the **full-screen interactive 3D location explorer**. A minimap is secondary/P2.
- Google Maps 3D remains the P0 3D engine.
- The 3D map must stay mounted while users select/fly between locations. Selecting a location must not recreate `Map3DElement`.
- Published destinations are the P0 source of 3D locations. Do not create a new `Map3DLocation` database table in this milestone.
- The same `selectLocation(locationId)` application action must serve 3D marker clicks, search results, location list/rail clicks, and deep-link restoration.
- Entering 360 uses the selected destination's existing `defaultSceneId`; exiting 360 returns to that selected 3D location.
- AGY owns presentation only. AGY must not call Google Maps SDK, fetch APIs, mutate Zustand directly, or change backend/domain/adapters.
- Codex owns contracts, state, engine adapters, API/OpenAPI, integration containers, tests, and final integration.
- Do not introduce another state-management framework, GIS engine, panorama engine, GraphQL layer, microservice, Kafka, or Kubernetes.
- Do not add dependency vulnerability remediation to this milestone unless a dependency directly blocks execution.
- No production immersive/map flow may import shared fixtures.
- Keep Google credentials in environment configuration; no secrets in source.

---

# Part I — Design Specification

## 1. Source-of-truth precedence

For this milestone, resolve conflicts in this order:

1. This document.
2. `docs/superpowers/specs/2026-08-08-reference-parity-productization-design.md` for non-conflicting platform requirements.
3. Existing platform architecture/specs.
4. Current code.

Any older requirement that treats MapLibre/minimap as the primary navigation surface is superseded by this document.

## 2. Product statement

The visitor experience is a **3D tourism world**, not a 2D minimap with a 360 viewer attached.

The main experience is:

```text
FULL-SCREEN HÀ TĨNH 3D WORLD
        │
        ├── destination/location marker A
        ├── destination/location marker B
        ├── destination/location marker C
        └── optional 3D models

User rotates / tilts / zooms freely
        ↓
selects a location directly in 3D
        ↓
camera flies to that location
        ↓
location becomes active
        ↓
user may select another location OR enter existing 360 tour
```

The existing 360 tour is a detail layer:

```text
3D WORLD
  ↓ select Sơn Trang
SƠN TRANG 3D LOCATION
  ↓ Explore 360
EXISTING PANORAMA TOUR
  ↓ Exit 360
SƠN TRANG 3D LOCATION
```

## 3. Current repository gap

The current Google 3D foundation is usable but incomplete for this product.

Current `Map3DEnginePort` only supports:

```ts
interface Map3DEnginePort {
  mount(container: HTMLElement): Promise<void>;
  flyTo(target: CameraTarget): Promise<void>;
  addModel(model: ModelPlacement): Promise<void>;
  destroy(): void;
}
```

It has no concept of multiple interactive tourism locations or user selection.

More importantly, the current `Map3DViewport` mount effect depends on `engine`, `model`, and `target`. When the selected target changes, React cleans up the effect and calls `engine.destroy()`. That is incompatible with location-to-location camera travel because a target change can recreate the map instead of flying inside one persistent 3D world.

The destination API already stores `geoPoint` and `defaultSceneId` in destination details, but the published destination preview list does not expose them. P0 should extend the existing published destination read model rather than invent a parallel location persistence system.

## 4. P0 user journeys

### 4.1 Enter 3D world

1. Visitor opens Explore.
2. One Google `Map3DElement` mounts.
3. Published map-ready destinations are loaded from REST/OpenAPI.
4. Interactive 3D markers are placed at real destination coordinates.
5. Visitor can rotate, tilt, and zoom the Google 3D map directly.

### 4.2 Click a location in the 3D world

1. User clicks a `Marker3DInteractiveElement`.
2. Google adapter emits `locationSelected(locationId)`.
3. Application calls the single `selectLocation(locationId)` orchestration path.
4. Zustand records the selected destination without resetting/recreating the map renderer.
5. `engine.flyTo(location.camera)` runs.
6. Location chrome updates with title, summary, category, and `Khám phá 360°` when `defaultSceneId` exists.
7. URL/deep-link updates without page reload.

### 4.3 Search/list selection

Search and location list must call the exact same `selectLocation(locationId)` path as marker clicks. They must not duplicate camera logic.

### 4.4 Move between locations

Selecting A → B → C must produce camera flights in a single map instance:

```text
Map mount count = 1
A selected → flyTo(A)
B selected → flyTo(B)
C selected → flyTo(C)
Map destroy count = 0
```

Destroy occurs only when leaving the 3D renderer/session or retrying a fatal renderer failure.

### 4.5 Enter/exit 360

`Enter 360` uses the selected destination's `defaultSceneId` and the existing panorama navigation system.

When the visitor exits 360:

- mode returns to `overview3d`;
- selected destination/location remains the same;
- the 3D engine returns/flys to the selected destination camera preset;
- the location panel remains coherent with that destination.

## 5. P0 domain/view contracts

Published destinations are mapped to this frontend view model:

```ts
export interface Map3DLocationVm {
  id: string;
  slug: string;
  name: string;
  summary: string;
  categoryLabel: string | null;
  coverImageUrl: string | null;
  lat: number;
  lng: number;
  defaultSceneId: string | null;
  camera: CameraTarget;
}
```

P0 camera presets are deterministic and derived client-side from destination coordinates:

```ts
export function buildDefaultLocationCamera(location: Pick<Map3DLocationVm, 'lat' | 'lng'>): CameraTarget {
  return {
    lat: location.lat,
    lng: location.lng,
    altitude: 0,
    heading: 0,
    tilt: 55,
    range: 1200,
  };
}
```

This avoids a schema migration solely for camera tuning. Per-location persisted camera presets may be added later after the core interaction proves useful.

## 6. Destination API contract

Extend `DestinationPreview` rather than adding a new P0 endpoint:

```ts
export interface DestinationPreview {
  id: string;
  slug: string;
  name: string;
  summary: string;
  coverImageUrl: string | null;
  categoryLabel: string | null;
  geoPoint: { latitude: number; longitude: number } | null;
  defaultSceneId: string | null;
}
```

`GET /api/v1/destinations?locale=vi` remains the public list source.

Map-ready locations are entries where `geoPoint !== null`.

`defaultSceneId` may be null. Such a destination is still selectable in 3D but must not display an enabled 360 entry action.

## 7. 3D engine contract

Extend the port to support interactive locations:

```ts
export interface Map3DLocation {
  id: string;
  label: string;
  lat: number;
  lng: number;
  altitude?: number;
}

export interface Map3DEnginePort {
  mount(container: HTMLElement): Promise<void>;
  setLocations(locations: readonly Map3DLocation[]): void;
  subscribeLocationSelected(listener: (locationId: string) => void): () => void;
  flyTo(target: CameraTarget): Promise<void>;
  addModel(model: ModelPlacement): Promise<void>;
  destroy(): void;
}
```

Application-level selection does **not** belong inside the Google adapter. The adapter reports clicks; the orchestration layer decides selected state and camera movement.

## 8. Google adapter design

`Maps3DLibrary` must import/use `Marker3DInteractiveElement` in addition to `Map3DElement` and `Model3DElement`.

The adapter owns:

- marker creation;
- `gmp-click` event registration;
- marker removal when the location set changes;
- listener cleanup on destroy;
- locationId → marker bookkeeping;
- camera calls;
- Google-specific types.

The adapter does not own:

- destination search;
- React panels;
- URL updates;
- Zustand actions;
- API calls;
- 360 routing.

## 9. Persistent `Map3DViewport`

`Map3DViewport` must separate lifecycle from data updates.

Required effect ownership:

```text
Effect A [engine]
  mount once
  subscribe location click once
  cleanup → destroy

Effect B [engine, locations]
  setLocations(locations)
  NO destroy

Effect C [engine, target]
  flyTo(target)
  NO destroy

Effect D [engine, model]
  add/update optional model as supported
  NO renderer recreation solely because target changed
```

This is a hard acceptance rule.

## 10. Navigation state

Do not overload `enterOverview(destinationId)` for every marker click because that action resets the immersive state.

Add a non-destructive selection action:

```ts
selectMap3DLocation(destinationId: string): void;
```

Semantics:

```ts
selectMap3DLocation: (destinationId) =>
  set((state) => ({
    destinationId,
    mode: 'overview3d',
    activeRenderer: 'map3d',
    selectedHotspotId: null,
    error: null,
    map3dStatus: state.map3dStatus,
  }))
```

It must not clear renderer readiness, visited panorama scenes, or network quality solely because the user selected another 3D location.

## 11. 3D Explorer integration model

Create a dedicated integration/container layer that owns:

- TanStack Query for `listDestinations`;
- mapping API destination previews → `Map3DLocationVm[]`;
- selected location resolution from Zustand/path;
- camera target derivation;
- engine marker click → `selectLocation`;
- search/list click → `selectLocation`;
- deep-link updates;
- 360 entry using selected `defaultSceneId`;
- return from 360 to selected 3D location.

Pure UI receives only view models and callbacks.

## 12. Visual/UI requirements

The 3D canvas dominates the viewport. UI is overlay chrome, not a dashboard.

Desktop P0:

```text
┌────────────────────────────────────────────────────────┐
│ HÀ TĨNH 3D     [Tìm địa điểm...]             VI/EN    │
│                                                        │
│            FULL-SCREEN GOOGLE 3D WORLD                 │
│                                                        │
│      ● Sơn Trang             ● Thiên Cầm              │
│                                                        │
│                   ● Thành Sen                          │
│                                                        │
│  ┌───────────────────────────────┐                     │
│  │ Sơn Trang Cổ Đạm             │                     │
│  │ short summary                 │                     │
│  │ [Khám phá 360°]              │                     │
│  └───────────────────────────────┘                     │
└────────────────────────────────────────────────────────┘
```

Mobile P0:

- 3D canvas remains primary;
- compact top search/control row;
- selected location shown in a bottom sheet/card;
- `Khám phá 360°` thumb-reachable;
- no hover-only action;
- touch targets at least 44×44 CSS px.

## 13. AGY ownership

AGY is responsible only for presentational work:

- location search visual/control;
- selected-location card/bottom sheet;
- location result list/rail;
- 3D mode chrome;
- loading/error/no-location states;
- responsive/mobile behavior;
- accessibility of those controls;
- CSS/tokens/polish.

AGY must not edit:

```text
apps/api/**
packages/api-client/**
apps/web/src/modules/map3d/domain/**
apps/web/src/modules/map3d/adapters/**
apps/web/src/modules/map3d/model/**
apps/web/src/modules/immersive-navigation/model/**
apps/web/src/shared/api/**
```

AGY may edit/create:

```text
apps/web/src/modules/map3d/ui/chrome/**
apps/web/src/shared/ui/**
apps/web/src/app/styles/**
```

`apps/web/src/modules/map3d/ui/Map3DViewport.tsx` remains Codex-owned because it controls renderer lifecycle.

## 14. Herdr orchestration contract

Codex is the primary orchestrator and must use Herdr to dispatch AGY when Herdr is available in its execution environment.

Do not assume or invent a Herdr command syntax in advance. At execution start Codex must inspect the actual environment:

```bash
command -v herdr || true
herdr --help
```

If Herdr is exposed as a tool/MCP rather than a CLI, Codex must read that tool's available actions instead of inventing shell commands.

If Herdr is unavailable, Codex must report exactly:

```text
HERDR_UNAVAILABLE: AGY delegation cannot be started in this environment.
```

and continue only Codex-owned engineering tasks. It must not impersonate AGY or claim AGY completed work.

### AGY dispatch timing

Do not dispatch AGY before the UI contracts are frozen.

Correct order:

```text
Codex Tasks 1–4
  ↓ contracts stable
Codex dispatches AGY work packet through Herdr
  ↓
Codex continues integration/test work that does not edit AGY-owned files
  ↓
AGY returns branch/commit/patch
  ↓
Codex reviews ownership + behavior
  ↓
Codex integrates and runs full verification
```

### Exact AGY work packet to send through Herdr

Codex must send AGY this content verbatim or with only repository/branch metadata added:

```text
AGY WORK PACKET — INTERACTIVE 3D LOCATION EXPLORER

Mission:
Design and implement the presentation layer for a full-screen 3D tourism map. The Google 3D canvas is the primary product. Users select real locations in the 3D world, the camera flies there, and the UI exposes location information plus an optional “Khám phá 360°” entry. Do not design a minimap as the primary navigation surface.

Read first:
1. docs/superpowers/plans/2026-08-09-interactive-3d-location-explorer-master.md
2. apps/web/src/shared/contracts/immersive.ts
3. apps/web/src/modules/map3d/ui/Map3DViewport.tsx — READ ONLY
4. existing immersive styles/components for visual consistency

You own only:
- apps/web/src/modules/map3d/ui/chrome/**
- apps/web/src/shared/ui/** when a truly reusable primitive is needed
- apps/web/src/app/styles/**

You must not edit:
- apps/api/**
- packages/api-client/**
- map3d/domain/**
- map3d/adapters/**
- map3d/model/**
- immersive-navigation/model/**
- shared/api/**
- Map3DViewport.tsx

Implement these controlled components:

export interface Map3DExplorerChromeProps {
  locations: Map3DLocationVm[];
  selectedLocationId: string | null;
  rendererStatus: RendererStatus;
  onLocationSelect(locationId: string): void;
  onEnterPanorama(): void;
  onRetryRenderer(): void;
}

Required UX:
- Full-screen canvas remains visually dominant.
- Search filters location name/category client-side and emits onLocationSelect only.
- Selecting a search result does not navigate or fetch directly.
- Selected location card shows name, category, summary, and cover image when available.
- Show “Khám phá 360°” only/enabled when the selected view model indicates a panorama entry scene exists.
- Desktop: compact top search + floating selected-location card.
- Mobile: compact top controls + bottom sheet/card.
- Keyboard accessible, visible focus, no hover-only controls, 44px touch targets.
- Provide loading, renderer-error, and no-map-ready-location states.
- Do not initialize Google Maps or MapLibre.
- Do not use fixture data in production components.

Testing:
- React Testing Library tests for search filtering, selection callback, 360 CTA enabled/disabled state, keyboard accessibility, and error retry.
- No test may require the real Google SDK.

Deliverable:
Return the commit/branch/patch plus a concise summary of files changed and tests run. Do not modify files outside ownership.
```

---

# Part II — Implementation Plan

## Task 0: Establish isolated execution and Herdr capability

**Files:** No product files changed.

**Produces:** isolated Codex branch/worktree; verified baseline; known Herdr dispatch mechanism or explicit `HERDR_UNAVAILABLE` state.

- [ ] Read `superpowers:using-git-worktrees`, `superpowers:test-driven-development`, and `superpowers:verification-before-completion` before touching code.
- [ ] Create/use an isolated worktree on branch `feat/interactive-3d-location-explorer`.
- [ ] Run baseline:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm architecture:check
pnpm typecheck
pnpm test
pnpm build
```

Expected: record all pre-existing failures before implementation; do not attribute them to new work.

- [ ] Discover Herdr without guessing syntax:

```bash
command -v herdr || true
herdr --help
```

If command does not exist, record `HERDR_UNAVAILABLE` and continue only Codex-owned tasks.

---

## Task 1: Make destination list map-ready through the existing REST/OpenAPI path

**Files:**
- Modify: `apps/api/src/modules/catalog/application/destination.queries.ts`
- Modify: `apps/api/src/core/http/openapi.schemas.ts`
- Keep route: `apps/api/src/modules/catalog/presentation/http/destination.controller.ts`
- Regenerate: `packages/api-client/openapi.json`
- Regenerate generated client output under: `packages/api-client/src/**`
- Test: use the existing catalog/API test convention discovered in the repo; if no focused catalog query test exists, create `apps/api/src/modules/catalog/application/destination.queries.map3d.test.ts`.

**Produces:** `listDestinations()` returns `geoPoint` and `defaultSceneId` for published destinations.

- [ ] Write a failing test asserting a published destination preview contains:

```ts
expect(result[0]).toMatchObject({
  id: expect.any(String),
  geoPoint: { latitude: 18.3421, longitude: 105.9032 },
  defaultSceneId: expect.any(String),
});
```

and that a destination without coordinates returns `geoPoint: null` rather than being fabricated.

- [ ] Run focused API test and verify RED.

```bash
pnpm --filter @hatinh/api test -- destination.queries.map3d
```

- [ ] Extend `DestinationPreview` and `toPreview()`:

```ts
export interface DestinationPreview {
  id: string;
  slug: string;
  name: string;
  summary: string;
  coverImageUrl: string | null;
  categoryLabel: string | null;
  geoPoint: { latitude: number; longitude: number } | null;
  defaultSceneId: string | null;
}
```

`toPreview()` must map from the existing destination primitives; do not query another table per destination.

- [ ] Extend `destinationPreviewResponseSchema.required` and `properties` with nullable `geoPoint` and nullable `defaultSceneId`.
- [ ] Run focused tests GREEN.
- [ ] Regenerate OpenAPI client:

```bash
pnpm api:generate
pnpm --filter @hatinh/api-client typecheck
```

- [ ] Commit:

```bash
git add apps/api packages/api-client
git commit -m "feat(catalog): expose map-ready destination locations"
```

---

## Task 2: Add 3D location contracts and deterministic API→view-model mapping

**Files:**
- Modify: `apps/web/src/shared/contracts/immersive.ts`
- Create: `apps/web/src/modules/map3d/model/map3d-location.ts`
- Create: `apps/web/src/modules/map3d/model/map3d-location.test.ts`
- Modify: `apps/web/src/modules/map3d/index.ts` if required by existing public API convention.

**Produces:** `Map3DLocationVm`, `Map3DLocation`, `buildDefaultLocationCamera()`, and a mapper from generated destination preview DTOs.

- [ ] Write RED tests:

```ts
it('maps a geocoded destination into a 3D location', () => {
  const vm = toMap3DLocationVm({
    id: 'd1',
    slug: 'son-trang',
    name: 'Sơn Trang Cổ Đạm',
    summary: 'Điểm đến',
    coverImageUrl: null,
    categoryLabel: 'Văn hóa',
    geoPoint: { latitude: 18.3421, longitude: 105.9032 },
    defaultSceneId: 'scene-1',
  });

  expect(vm).toMatchObject({
    id: 'd1',
    lat: 18.3421,
    lng: 105.9032,
    defaultSceneId: 'scene-1',
    camera: { lat: 18.3421, lng: 105.9032, tilt: 55, range: 1200 },
  });
});

it('rejects a destination without coordinates from the map-ready mapper', () => {
  expect(toMap3DLocationVm({
    id: 'd2', slug: 'no-geo', name: 'No Geo', summary: '', coverImageUrl: null,
    categoryLabel: null, geoPoint: null, defaultSceneId: null,
  })).toBeNull();
});
```

- [ ] Run RED:

```bash
pnpm --filter @hatinh/web test -- map3d-location.test.ts
```

- [ ] Implement exact contracts from Part I sections 5 and 7.
- [ ] Implement `toMap3DLocationVm(dto): Map3DLocationVm | null` and `buildDefaultLocationCamera()`.
- [ ] Run GREEN and typecheck.
- [ ] Commit:

```bash
git add apps/web/src/shared/contracts apps/web/src/modules/map3d
git commit -m "feat(map3d): define interactive location contracts"
```

---

## Task 3: Extend Google Maps 3D adapter with interactive location markers

**Files:**
- Modify: `apps/web/src/modules/map3d/adapters/google-maps3d.adapter.ts`
- Modify: `apps/web/src/modules/map3d/adapters/google-maps3d.adapter.test.ts`
- Modify: `apps/web/src/modules/map3d/domain/map3d-engine.port.ts` only as a re-export surface if needed.

**Consumes:** `Map3DLocation`, extended `Map3DEnginePort`.

**Produces:** clickable Google 3D markers and clean subscription lifecycle.

- [ ] Extend the fake Google library in the adapter test with a `FakeMarker3DInteractiveElement` that stores constructor options and dispatches `gmp-click`.
- [ ] Write RED tests asserting:

```ts
engine.setLocations([
  { id: 'son-trang', label: 'Sơn Trang', lat: 18.3421, lng: 105.9032 },
  { id: 'thien-cam', label: 'Thiên Cầm', lat: 18.268, lng: 106.105 },
]);

const selected: string[] = [];
const unsubscribe = engine.subscribeLocationSelected((id) => selected.push(id));

// dispatch gmp-click on the first fake interactive marker
expect(selected).toEqual(['son-trang']);

engine.setLocations([{ id: 'thien-cam', label: 'Thiên Cầm', lat: 18.268, lng: 106.105 }]);
expect(/* old marker removed, one current marker remains */).toBe(true);

unsubscribe();
engine.destroy();
expect(/* all marker listeners and DOM children removed */).toBe(true);
```

- [ ] Run RED:

```bash
pnpm --filter @hatinh/web test -- google-maps3d.adapter.test.ts
```

- [ ] Extend `Maps3DLibrary` with `Marker3DInteractiveElement`.
- [ ] Maintain `Map<string, GoogleMarker3DInteractiveElement>` and a `Set<(locationId: string) => void>`.
- [ ] Implement `setLocations()` to reconcile/remove/recreate marker elements without recreating the map.
- [ ] Each marker must use real lat/lng and the destination name as label/title; attach `gmp-click` and emit the mapped id.
- [ ] `destroy()` must remove markers/listeners before map removal.
- [ ] Run GREEN + typecheck.
- [ ] Commit:

```bash
git add apps/web/src/modules/map3d
git commit -m "feat(map3d): add interactive 3d location markers"
```

---

## Task 4: Make `Map3DViewport` persistent across target/location changes

**Files:**
- Modify: `apps/web/src/modules/map3d/ui/Map3DViewport.tsx`
- Create or modify the focused viewport test according to repo convention: `apps/web/src/modules/map3d/ui/Map3DViewport.test.tsx`

**Produces:** one map mount per 3D session; target updates call `flyTo()` only.

- [ ] Write RED lifecycle test using a fake engine:

```ts
const engine = makeFakeMap3DEngine();
const { rerender, unmount } = render(
  <Map3DViewport
    engine={engine}
    locations={[locationA, locationB]}
    target={locationA.camera}
    onLocationSelect={onLocationSelect}
  />,
);

await waitFor(() => expect(engine.mount).toHaveBeenCalledTimes(1));

rerender(
  <Map3DViewport
    engine={engine}
    locations={[locationA, locationB]}
    target={locationB.camera}
    onLocationSelect={onLocationSelect}
  />,
);

expect(engine.mount).toHaveBeenCalledTimes(1);
expect(engine.destroy).toHaveBeenCalledTimes(0);
expect(engine.flyTo).toHaveBeenLastCalledWith(locationB.camera);

unmount();
expect(engine.destroy).toHaveBeenCalledTimes(1);
```

- [ ] Run RED:

```bash
pnpm --filter @hatinh/web test -- Map3DViewport.test.tsx
```

- [ ] Split mount/subscription effect from location and camera update effects exactly as defined in Part I section 9.
- [ ] Add props:

```ts
locations?: readonly Map3DLocation[];
onLocationSelect?: (locationId: string) => void;
```

- [ ] A marker click must call the callback but must not directly mutate React/Zustand state inside `Map3DViewport`.
- [ ] Run GREEN + existing map3d tests.
- [ ] Commit:

```bash
git add apps/web/src/modules/map3d/ui
git commit -m "fix(map3d): keep 3d world mounted between location flights"
```

---

## Task 5: Add non-destructive 3D location selection state and central orchestration

**Files:**
- Modify: `apps/web/src/modules/immersive-navigation/model/navigation.types.ts`
- Modify: `apps/web/src/modules/immersive-navigation/model/navigation.store.ts`
- Modify/create focused store tests following existing convention.
- Create: `apps/web/src/modules/map3d/model/use-map3d-explorer.ts`
- Create: `apps/web/src/modules/map3d/model/use-map3d-explorer.test.tsx`

**Produces:** one `selectLocation()` path used by marker/search/list/deep-link.

- [ ] Write RED store test proving location selection does not reset renderer:

```ts
state.enterOverview('a');
state.setRendererStatus('map3d', 'ready');
state.selectMap3DLocation('b');

expect(getState()).toMatchObject({
  destinationId: 'b',
  mode: 'overview3d',
  activeRenderer: 'map3d',
  map3dStatus: 'ready',
});
```

- [ ] Add `selectMap3DLocation(destinationId: string): void` to navigation actions with semantics from Part I section 10.
- [ ] Implement `useMap3DExplorer()` using the generated `listDestinations` query through the existing shared API/TanStack Query conventions.
- [ ] Filter `geoPoint === null` from `locations`; never fabricate coordinates.
- [ ] Expose:

```ts
interface Map3DExplorerModel {
  locations: Map3DLocationVm[];
  selectedLocation: Map3DLocationVm | null;
  target: CameraTarget | undefined;
  selectLocation(locationId: string): void;
  enterSelectedPanorama(): void;
}
```

- [ ] `selectLocation()` must update state and deep-link, then target derivation causes the persistent viewport to fly.
- [ ] `enterSelectedPanorama()` must no-op/disable when `defaultSceneId === null`; otherwise invoke the existing panorama entry path with that scene id.
- [ ] Run focused tests GREEN.
- [ ] Commit:

```bash
git add apps/web/src/modules/immersive-navigation apps/web/src/modules/map3d/model
git commit -m "feat(map3d): orchestrate location selection and 360 entry"
```

---

## Task 6: Dispatch AGY through Herdr for 3D Explorer chrome

**Files owned by AGY:**
- Create: `apps/web/src/modules/map3d/ui/chrome/Map3DExplorerChrome.tsx`
- Create: `apps/web/src/modules/map3d/ui/chrome/LocationSearch.tsx`
- Create: `apps/web/src/modules/map3d/ui/chrome/SelectedLocationCard.tsx`
- Create corresponding `*.test.tsx` files.
- Modify/create styles under `apps/web/src/app/styles/**`.

**Consumes:** frozen `Map3DLocationVm`, `RendererStatus`, callback-only props.

**Produces:** presentation-only, responsive P0 UI.

- [ ] Codex confirms Tasks 1–5 contracts are committed before dispatch.
- [ ] Codex uses the actual Herdr dispatch mechanism discovered in Task 0 and sends the exact AGY work packet from Part I section 14.
- [ ] Codex must continue only non-overlapping engineering work while AGY executes.
- [ ] On AGY return, Codex verifies changed paths are within ownership before merging/applying.
- [ ] Codex runs:

```bash
pnpm --filter @hatinh/web test -- map3d
pnpm --filter @hatinh/web lint
pnpm --filter @hatinh/web typecheck
```

- [ ] Reject/return AGY work if it initializes Google SDK, fetches data directly, mutates Zustand, imports fixtures in production UI, or edits Codex-owned paths.
- [ ] Integrate with focused commit:

```bash
git commit -m "feat(ui): add 3d location explorer chrome"
```

---

## Task 7: Connect full-screen 3D explorer to the existing immersive experience

**Files:**
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.tsx`
- Modify: `apps/web/src/modules/map3d/ui/Map3DViewport.tsx` only if integration prop wiring requires no new lifecycle semantics.
- Modify relevant module `index.ts` exports.
- Modify router/deep-link tests only where required.

**Produces:** real production journey with 3D markers, search/list selection, camera flight, and 360 entry/return.

- [ ] Write RED integration test with fake Map3D/Panorama engines proving:

```text
initial 3D mount = 1
select location B from marker callback
→ store destinationId = B
→ map3d flyTo(B.camera)
→ map3d mount still = 1
select location C from search callback
→ map3d flyTo(C.camera)
→ map3d mount still = 1
enter 360
→ panorama uses C.defaultSceneId
exit 360
→ selected location remains C
→ returning 3D target = C.camera
```

- [ ] Remove overview target derivation from immersive fixtures. Production 3D location data comes from the generated API client path.
- [ ] Pass `locations`, selected `target`, and marker selection callback into the persistent `Map3DViewport`.
- [ ] Render AGY `Map3DExplorerChrome` over the 3D canvas in overview mode.
- [ ] Ensure selecting another destination/location does not reload the page or destroy/recreate Google 3D.
- [ ] Preserve existing panorama functionality; do not refactor panorama internals unless required by the entry/exit contract.
- [ ] Run GREEN + focused E2E/integration.
- [ ] Commit:

```bash
git add apps/web/src/modules
git commit -m "feat(explore): connect interactive 3d locations to immersive tour"
```

---

## Task 8: Deep-link, accessibility, mobile, failure and performance gates

**Files:**
- Modify existing deep-link module/tests under `apps/web/src/modules/immersive-navigation/lib/**` only if current route cannot preserve selected destination cleanly.
- Modify: `apps/web/e2e/**` using existing Playwright conventions.
- Modify styles/UI tests only within ownership.

**Produces:** demo-ready and regression-protected 3D world.

- [ ] Add Playwright scenario using deterministic fake 3D engine hooks where CI cannot load Google:

```text
Open Explore location A
3D renderer ready
Select B
camera-flight event B observed
Select C
camera-flight event C observed
map mount count remains 1
Enter 360 at C.defaultSceneId
Exit 360
selected location C restored
Reload deep link
selected location C restored
```

- [ ] Add failure scenario:

```text
Google 3D creation fails
→ error UI shown
→ Retry calls renderer retry
→ no blank page
```

- [ ] Add accessibility checks for search, selected-location card, 360 CTA and keyboard selection.
- [ ] Confirm Google 3D SDK remains lazy and absent from initial homepage critical bundle.
- [ ] Run full quality gates:

```bash
pnpm format:check
pnpm lint
pnpm architecture:check
pnpm deadcode
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm --filter @hatinh/web check:bundle
pnpm test:e2e
```

- [ ] Commit any final targeted hardening:

```bash
git commit -m "test(map3d): harden interactive location explorer"
```

---

# Part III — Definition of Done

The milestone is complete only when all statements below are true:

1. Google 3D is the primary full-screen exploration surface in overview mode.
2. The user can manually rotate, tilt, and zoom the 3D world.
3. Published destinations with coordinates appear as interactive 3D markers at real lat/lng positions.
4. Clicking a 3D marker selects the location through the central application action.
5. Search/list selection uses the same action as marker selection.
6. Selecting A → B → C produces camera flights without recreating `Map3DElement`.
7. `Map3DViewport` mount count remains one during location-to-location travel.
8. Selected location is reflected in the UI and deep-link.
9. A destination with `defaultSceneId` exposes `Khám phá 360°`.
10. Entering 360 opens the existing tour at the selected destination's entry scene.
11. Exiting 360 returns to the same selected 3D location.
12. A destination without coordinates is not fabricated onto the map.
13. A destination without `defaultSceneId` remains selectable but has no enabled 360 entry.
14. AGY UI is presentation-only and obeys path ownership.
15. No production 3D flow imports fixtures.
16. MapLibre/minimap work is not required to declare this milestone complete.
17. Google 3D failure has a usable retry/fallback state.
18. Desktop and mobile controls are keyboard/touch accessible.
19. Full format/lint/architecture/typecheck/test/build/bundle/E2E gates pass or every pre-existing baseline failure is explicitly separated from new changes.

# Part IV — Stop Conditions

Codex must stop and report instead of improvising when:

- the checked-out repository differs materially from the interfaces/paths in this document;
- Google Maps 3D coverage for the required Hà Tĩnh demo area is insufficient for the desired visual result;
- generated API client output cannot be regenerated cleanly;
- the existing 360 implementation no longer exposes a stable `enterPanorama(sceneId)` / exit-to-overview contract;
- AGY/Herdr attempts to modify Codex-owned engine/domain/backend paths;
- Herdr is required by the owner but is not available in the execution environment.

A stop report must include the exact blocker, files inspected, command/test evidence, and the smallest decision required from the owner.

# Part V — Codex kickoff instruction

When the owner gives this file to Codex, the only kickoff instruction needed is:

```text
Execute docs/superpowers/plans/2026-08-09-interactive-3d-location-explorer-master.md as the source of truth.

You are the primary orchestrator. Follow Superpowers: use an isolated worktree, TDD for every behavior change, focused commits, and verification before completion claims.

Do not redesign the 360 system; treat it as an existing subsystem and only integrate 3D location entry/return.

The P0 product is the full-screen interactive Google 3D world with clickable real destinations and persistent camera travel between locations. MapLibre/minimap is not P0.

After Tasks 1–5 freeze the contracts, delegate Task 6 to AGY through the actual Herdr mechanism available in your environment using the AGY work packet embedded in the plan. Do not invent Herdr syntax; inspect the environment first. Review AGY output for path ownership and behavior before integrating it.

Execute tasks in order and do not claim completion until the Definition of Done and full quality gates pass.
```
