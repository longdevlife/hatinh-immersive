# 3D Locations and Tiled 360 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a runnable local demo where three real-coordinate Hà Tĩnh locations are native Google 3D markers, selection flies one persistent map to curated camera presets, and each location enters a local tiled Photo Sphere Viewer tour with persistent scene-to-scene navigation.

**Architecture:** Keep the existing map3d and panorama ports. Strengthen the map contract with an explicit `LocationCameraPreset`, keep native `Marker3DInteractiveElement` children inside one `Map3DElement`, and provide demo data through the existing view-model boundary. Generate static panorama manifests/previews/tiles with the existing Sharp tooling and load all image bytes directly from Vite static paths; NestJS remains outside the media path.

**Tech Stack:** React 19, TypeScript 6, Zustand, Google Maps JavaScript 3D library, Photo Sphere Viewer 5 with `VirtualTourPlugin` and `EquirectangularTilesAdapter`, Sharp panorama tooling, Vitest, Playwright, pnpm/Turbo.

## Global Constraints

- P0 markers MUST be native `Marker3DInteractiveElement` instances appended to `Map3DElement`.
- React/HTML markers positioned over the map canvas are forbidden.
- Marker positions are geographic `{ lat, lng, altitude? }` values.
- Every location owns a curated `{ center, heading, tilt, range }` camera preset.
- One Google map instance survives A → B → C; one Photo Sphere Viewer survives scene A → B → C.
- Google readiness is bounded; no infinite spinner.
- `UI event → engine.flyTo(cameraPreset)` is at most 100 ms in deterministic integration tests.
- `loadNode → preview/base visible` is at most 1,000 ms in the documented local demo environment.
- `navigation activation → visible transition start` is at most 300 ms for preloaded linked scenes; high-resolution tile completion is excluded.
- Demo media loads directly from static/object-storage-style URLs, never through NestJS.
- No MapLibre expansion, Custom Street View, new database table, microservices, GraphQL, Kafka, Kubernetes, or new state manager.
- Only the approved design, this plan, and explicitly required ADRs may be committed as Markdown; do not add status-report Markdown.

---

### Task 1: Lock CameraPreset and native Google marker contracts

**Files:**
- Modify: `apps/web/src/shared/contracts/immersive.ts`
- Modify: `apps/web/src/modules/immersive-navigation/model/navigation.types.ts`
- Modify: `apps/web/src/modules/immersive-navigation/model/navigation.store.ts`
- Modify: `apps/web/src/modules/immersive-navigation/model/navigation.store.test.ts`
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.tsx`
- Modify: `apps/web/src/modules/map3d/adapters/fake-map3d.adapter.ts`
- Modify: `apps/web/src/modules/map3d/adapters/google-maps3d.adapter.ts`
- Modify: `apps/web/src/modules/map3d/adapters/google-maps3d.adapter.test.ts`

**Interfaces:**
- Produces: `LocationCameraPreset`, `Map3DLocation.cameraPreset`, and `Map3DEnginePort.flyTo(preset: LocationCameraPreset)`.
- Preserves: `Map3DLocation.position` as the only geographic marker position.
- Preserves: the existing flat `CameraTarget` only for the manifest's initial overview camera; it
  must not be used as a substitute for a location's required curated preset.

- [ ] **Step 1: Write failing contract and adapter tests**

Add assertions that the location owns a required preset, the marker constructor receives only geographic position/label, the marker is appended to the map element, and native `gmp-click` emits the location id:

```ts
const location: Map3DLocation = {
  id: 'thien-cam',
  label: 'Biển Thiên Cầm',
  position: { lat: 18.2771383, lng: 106.098072 },
  cameraPreset: {
    center: { lat: 18.2771383, lng: 106.098072, altitude: 180 },
    heading: 32,
    tilt: 58,
    range: 1_250,
  },
};

await engine.mount(container);
await engine.setLocations([location]);

expect(markerOptions).toEqual({
  label: 'Biển Thiên Cầm',
  position: { lat: 18.2771383, lng: 106.098072 },
});
expect(map.children).toContain(marker);
marker.dispatchEvent(new Event('gmp-click'));
expect(selectedIds).toEqual(['thien-cam']);
```

Add a store test proving selected state stores the complete preset, not a synthesized lat/lng target.

- [ ] **Step 2: Run RED tests**

Run:

```bash
pnpm --filter @hatinh/web test -- src/modules/map3d/adapters/google-maps3d.adapter.test.ts src/modules/immersive-navigation/model/navigation.store.test.ts
```

Expected: FAIL because `cameraPreset` and the new `flyTo` signature do not exist.

- [ ] **Step 3: Implement the minimal contract migration**

Use these exact contracts:

```ts
export interface GeographicPosition {
  lat: number;
  lng: number;
  altitude?: number;
}

export interface LocationCameraPreset {
  center: GeographicPosition;
  heading: number;
  tilt: number;
  range: number;
}

export interface Map3DLocation {
  id: string;
  label: string;
  position: GeographicPosition;
  cameraPreset: LocationCameraPreset;
}

export interface Map3DEnginePort {
  mount(container: HTMLElement): Promise<void>;
  setLocations(locations: Map3DLocation[]): Promise<void>;
  subscribeLocationSelected(listener: (locationId: string) => void): () => void;
  flyTo(preset: LocationCameraPreset): Promise<void>;
  addModel(model: ModelPlacement): Promise<void>;
  destroy(): void;
}
```

Translate a location preset to Google options only inside the adapter. Keep the existing initial
overview conversion as a separate `toInitialCamera(target: CameraTarget)` function so the two
contracts cannot be accidentally interchanged:

```ts
function toCamera(preset: LocationCameraPreset): GoogleCameraOptions {
  return {
    center: preset.center,
    heading: preset.heading,
    tilt: preset.tilt,
    range: preset.range,
  };
}
```

Do not add a React marker component or overlay container.

- [ ] **Step 4: Run GREEN tests and focused typecheck**

```bash
pnpm --filter @hatinh/web test -- src/modules/map3d/adapters/google-maps3d.adapter.test.ts src/modules/immersive-navigation/model/navigation.store.test.ts
pnpm --filter @hatinh/web typecheck
```

Expected: tests and typecheck PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/shared/contracts/immersive.ts apps/web/src/modules/immersive-navigation/model/navigation.types.ts apps/web/src/modules/immersive-navigation/model/navigation.store.ts apps/web/src/modules/immersive-navigation/model/navigation.store.test.ts apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.tsx apps/web/src/modules/map3d/adapters/fake-map3d.adapter.ts apps/web/src/modules/map3d/adapters/google-maps3d.adapter.ts apps/web/src/modules/map3d/adapters/google-maps3d.adapter.test.ts
git commit -m "refactor(map3d): require curated location camera presets"
```

---

### Task 2: Bound Google 3D readiness and preserve retry lifecycle

**Files:**
- Modify: `apps/web/src/modules/map3d/adapters/google-maps3d.adapter.ts`
- Modify: `apps/web/src/modules/map3d/adapters/google-maps3d.adapter.test.ts`
- Modify: `apps/web/src/modules/map3d/ui/Map3DViewport.test.tsx`
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx`

**Interfaces:**
- Consumes: `LocationCameraPreset` from Task 1.
- Produces: `GoogleMaps3DAdapterOptions.readinessTimeoutMs?: number`, defaulting to `8_000`.

- [ ] **Step 1: Write failing timeout and cleanup tests**

Use fake timers to prove a map that never emits `gmp-steadychange` rejects, removes listeners/map children, and can be retried without duplicate markers:

```ts
const engine = new GoogleMaps3DEngine({
  loadLibrary: async () => library,
  readinessTimeoutMs: 8_000,
});
const mounting = engine.mount(container);

await vi.advanceTimersByTimeAsync(8_000);
await expect(mounting).rejects.toThrow('GOOGLE_MAPS_3D_READY_TIMEOUT');
expect(container.children).toHaveLength(0);
```

Add a viewport test that the timeout becomes renderer status `error` and retry invokes a fresh mount once.

- [ ] **Step 2: Run RED tests**

```bash
pnpm --filter @hatinh/web test -- src/modules/map3d/adapters/google-maps3d.adapter.test.ts src/modules/map3d/ui/Map3DViewport.test.tsx src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx
```

Expected: FAIL because readiness has no timeout.

- [ ] **Step 3: Implement abort-aware bounded readiness**

Extend `waitForMapReady` with a timeout that uses the same cleanup path as success, error, and abort:

```ts
const DEFAULT_READINESS_TIMEOUT_MS = 8_000;

function waitForMapReady(
  map: GoogleMap3DElement,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(
      () => rejectWith(new Error('GOOGLE_MAPS_3D_READY_TIMEOUT')),
      timeoutMs,
    );
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      map.removeEventListener('gmp-error', onError);
      map.removeEventListener('gmp-steadychange', onSteadyChange);
      signal.removeEventListener('abort', onAbort);
    };
    // Existing resolve/reject handlers call cleanup exactly once.
  });
}
```

Keep authorization/referrer failures actionable through the existing renderer error UI; do not leave status `loading` after rejection.

- [ ] **Step 4: Run GREEN tests**

```bash
pnpm --filter @hatinh/web test -- src/modules/map3d/adapters/google-maps3d.adapter.test.ts src/modules/map3d/ui/Map3DViewport.test.tsx src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx
```

Expected: PASS with no unhandled promise rejection.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/map3d/adapters/google-maps3d.adapter.ts apps/web/src/modules/map3d/adapters/google-maps3d.adapter.test.ts apps/web/src/modules/map3d/ui/Map3DViewport.test.tsx apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx
git commit -m "fix(map3d): bound renderer readiness and retry"
```

---

### Task 3: Add three eligible Hà Tĩnh demo locations and shared selection orchestration

**Files:**
- Create: `apps/web/src/modules/immersive-navigation/fake-mode/demo-catalog.ts`
- Create: `apps/web/src/modules/immersive-navigation/fake-mode/demo-catalog.test.ts`
- Modify: `apps/web/src/modules/immersive-navigation/fake-mode/manifest.ts`
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx`
- Modify: `apps/web/e2e/immersive-parity.spec.ts`

**Interfaces:**
- Consumes: `LocationCameraPreset` and `Map3DLocation` from Task 1.
- Produces: `DEMO_DESTINATIONS`, `getDemoManifest(slug)`, and validated location-to-entry-scene mapping.

- [ ] **Step 1: Write failing catalog validation tests**

Require three unique slugs, valid WGS84 coordinates, finite preset fields, matching preset/marker centers, an entry scene for every destination, and links targeting existing nodes:

```ts
expect(DEMO_DESTINATIONS).toHaveLength(3);
for (const destination of DEMO_DESTINATIONS) {
  expect(destination.location.position.lat).toBeGreaterThanOrEqual(-90);
  expect(destination.location.position.lat).toBeLessThanOrEqual(90);
  expect(destination.location.position.lng).toBeGreaterThanOrEqual(-180);
  expect(destination.location.position.lng).toBeLessThanOrEqual(180);
  expect(destination.location.cameraPreset.center.lat).toBe(destination.location.position.lat);
  expect(destination.location.cameraPreset.center.lng).toBe(destination.location.position.lng);
  expect(getDemoManifest(destination.preview.slug).defaultSceneId).not.toBeNull();
}
```

- [ ] **Step 2: Run RED test**

```bash
pnpm --filter @hatinh/web test -- src/modules/immersive-navigation/fake-mode/demo-catalog.test.ts
```

Expected: FAIL because `demo-catalog.ts` does not exist.

- [ ] **Step 3: Implement the candidate catalog with curated initial presets**

Use these verified geographic candidates and initial presets:

```ts
export const DEMO_LOCATION_CANDIDATES = [
  {
    id: 'thien-cam-beach',
    slug: 'bien-thien-cam',
    name: 'Biển Thiên Cầm',
    position: { lat: 18.2771383, lng: 106.098072 },
    cameraPreset: {
      center: { lat: 18.2771383, lng: 106.098072, altitude: 180 },
      heading: 32,
      tilt: 58,
      range: 1_250,
    },
  },
  {
    id: 'nguyen-du-memorial',
    slug: 'khu-luu-niem-nguyen-du',
    name: 'Khu lưu niệm Nguyễn Du',
    position: { lat: 18.6647657, lng: 105.7667208 },
    cameraPreset: {
      center: { lat: 18.6647657, lng: 105.7667208, altitude: 145 },
      heading: 118,
      tilt: 57,
      range: 900,
    },
  },
  {
    id: 'dong-loc-junction',
    slug: 'nga-ba-dong-loc',
    name: 'Ngã ba Đồng Lộc',
    position: { lat: 18.4022035, lng: 105.7395203 },
    cameraPreset: {
      center: { lat: 18.4022035, lng: 105.7395203, altitude: 160 },
      heading: 205,
      tilt: 58,
      range: 1_050,
    },
  },
] as const;
```

Before marking the task complete, open each candidate in the target Google 3D environment. Rotate, tilt, and zoom; tune only `altitude`, `heading`, `tilt`, and `range`. A candidate that lacks usable coverage must be replaced in this order using the same review: Chùa Hương Tích (`18.5342785, 105.7890804`), then Hồ Kẻ Gỗ (`18.1686273, 105.9329787`). Record the final reviewed values in `demo-catalog.ts`, not in a separate status report.

In fake/demo mode, `App` passes both the complete destination list and the route slug's manifest to `ImmersiveExperience`. Marker clicks and search/list selection continue through existing `selectLocation()`; do not add a second orchestration path.

- [ ] **Step 4: Prove A → B → C begins flights immediately on one engine**

Add an integration assertion that records event and invocation times:

```ts
const selectedAt = performance.now();
map3d.emitLocationSelected('nguyen-du-memorial');
await waitFor(() =>
  expect(map3d.lastFlyPreset?.center).toEqual({
    lat: 18.6647657,
    lng: 105.7667208,
    altitude: 145,
  }),
);
expect(map3d.lastFlyInvokedAt - selectedAt).toBeLessThanOrEqual(100);
expect(map3d.mountCount).toBe(1);
```

Run:

```bash
pnpm --filter @hatinh/web test -- src/modules/immersive-navigation/fake-mode/demo-catalog.test.ts src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx
pnpm --filter @hatinh/web test:e2e -- immersive-parity.spec.ts
```

Expected: PASS; A/B/C use one mounted engine.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/immersive-navigation/fake-mode/demo-catalog.ts apps/web/src/modules/immersive-navigation/fake-mode/demo-catalog.test.ts apps/web/src/modules/immersive-navigation/fake-mode/manifest.ts apps/web/src/app/App.tsx apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx apps/web/e2e/immersive-parity.spec.ts
git commit -m "feat(immersive): add curated Ha Tinh demo locations"
```

---

### Task 4: Build local progressive panorama media and real demo tour graphs

**Files:**
- Create: `tooling/panorama/demo-sources/thien-cam-boardwalk.webp`
- Create: `tooling/panorama/demo-sources/thien-cam-shore.webp`
- Create: `tooling/panorama/demo-sources/thien-cam-lookout.webp`
- Create: `tooling/panorama/demo-sources/nguyen-du-courtyard.webp`
- Create: `tooling/panorama/demo-sources/dong-loc-memorial.webp`
- Create: `tooling/panorama/src/demo.ts`
- Create: `tooling/panorama/test/demo.test.ts`
- Modify: `tooling/panorama/package.json`
- Generate: `apps/web/public/demo/360/**/manifest.json`
- Generate: `apps/web/public/demo/360/**/preview.webp`
- Generate: `apps/web/public/demo/360/**/tiles/**/*.webp`
- Modify: `apps/web/src/modules/immersive-navigation/fake-mode/demo-catalog.ts`

**Interfaces:**
- Produces: direct static manifests at
  `/demo/360/thien-cam-boardwalk/manifest.json`,
  `/demo/360/thien-cam-shore/manifest.json`,
  `/demo/360/thien-cam-lookout/manifest.json`,
  `/demo/360/nguyen-du-courtyard/manifest.json`, and
  `/demo/360/dong-loc-memorial/manifest.json`.
- Produces: a three-node bidirectional Thiên Cầm graph and one-node entry tours for Nguyễn Du and Đồng Lộc.

- [ ] **Step 1: Write a failing deterministic media test**

The test runs the demo generator into a temporary directory, parses each manifest, checks previews/representative tiles exist, and validates every URL referenced by the catalog:

```ts
for (const scene of DEMO_SCENES) {
  const output = path.join(temporaryRoot, scene.id);
  await generatePanoramaTiles({
    inputPath: scene.sourcePath,
    outputDir: output,
    tileSize: 256,
    previewWidth: 512,
    quality: 72,
  });
  const manifest = parsePanoramaManifest(
    JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8')),
  );
  await stat(path.join(output, manifest.preview));
  await stat(path.join(output, 'tiles/0/0-0.webp'));
}
```

- [ ] **Step 2: Run RED test**

```bash
pnpm --filter @hatinh/panorama-tooling test
```

Expected: FAIL because demo sources/generator do not exist.

- [ ] **Step 3: Generate five locally owned 2:1 demo panoramas**

Use the image generation tool with this fixed art direction: realistic tourism panorama, seamless 360-degree equirectangular projection, horizon centered, no text/logos/faces, Hà Tĩnh coastal or memorial context, warm natural daylight, and distinct landmarks at front/left/right. Generate one raster per listed source path. Verify every source is exactly 2:1 before tiling; reject and regenerate distorted or non-equirectangular outputs.

- [ ] **Step 4: Implement reproducible demo tiling**

Export this source list from `demo.ts` and invoke existing `generatePanoramaTiles` with fixed settings:

```ts
export const DEMO_SCENES = [
  'thien-cam-boardwalk',
  'thien-cam-shore',
  'thien-cam-lookout',
  'nguyen-du-courtyard',
  'dong-loc-memorial',
] as const;

const options = {
  tileSize: 256,
  previewWidth: 512,
  quality: 72,
} as const;
```

Add `"panorama:demo": "tsx src/demo.ts"` and generate outputs into `apps/web/public/demo/360`. Do not fetch runtime media from the Internet and do not add a Nest endpoint.

- [ ] **Step 5: Connect scene links and run GREEN tests**

Thiên Cầm links must be `boardwalk ↔ shore ↔ lookout`; use geographic coordinates separated by approximately 5–15 metres and explicit yaw/pitch values. The other two entry tours contain one valid node each. Replace every `cdn.example.vn` runtime URL in demo mode with the local manifest URLs.

```bash
pnpm --filter @hatinh/panorama-tooling panorama:demo
pnpm --filter @hatinh/panorama-tooling test
pnpm --filter @hatinh/web test -- src/modules/immersive-navigation/fake-mode/demo-catalog.test.ts src/modules/panorama/adapters/photo-sphere-viewer.adapter.test.ts
```

Expected: all manifests parse; previews and tiles exist; catalog graph validation PASS.

- [ ] **Step 6: Commit**

```bash
git add tooling/panorama/demo-sources tooling/panorama/src/demo.ts tooling/panorama/test/demo.test.ts tooling/panorama/package.json apps/web/public/demo/360 apps/web/src/modules/immersive-navigation/fake-mode/demo-catalog.ts
git commit -m "feat(panorama): add tiled local demo tours"
```

---

### Task 5: Verify persistent 3D ↔ 360 orchestration and measurable transitions

**Files:**
- Modify: `apps/web/src/modules/panorama/adapters/photo-sphere-viewer.adapter.test.ts`
- Modify: `apps/web/src/modules/panorama/ui/PanoramaViewport.test.tsx`
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx`
- Modify: `apps/web/e2e/panorama-lifecycle.spec.ts`
- Create: `apps/web/e2e/demo-media.spec.ts`
- Modify: `apps/web/playwright.config.ts`

**Interfaces:**
- Consumes: demo catalog/media from Tasks 3–4.
- Preserves: committed scene differs from requested scene until successful `loadNode` completion.
- Produces: browser evidence for local preview/media and 3D return-location behavior.

- [ ] **Step 1: Write failing persistent-viewer and rollback tests**

Cover rapid A → B → C where B becomes stale and C fails; the adapter directs the existing virtual
tour back to A and viewer construction count remains one. Observe public collaborator calls instead
of adding a test-only public engine property:

```ts
const loadB = engine.loadNode(sceneB);
const loadC = engine.loadNode(sceneC);
resolveB();
rejectC(new Error('tile failed'));
await Promise.allSettled([loadB, loadC]);
expect(setCurrentNode.mock.calls.map(([nodeId]) => nodeId)).toEqual([
  'thien-cam-boardwalk',
  'thien-cam-shore',
  'thien-cam-lookout',
  'thien-cam-boardwalk',
]);
expect(runtime.viewerConstructCount).toBe(1);
```

Add integration coverage: select Nguyễn Du → enter its entry scene → exit → selected location and camera preset remain Nguyễn Du.

- [ ] **Step 2: Run RED tests**

```bash
pnpm --filter @hatinh/web test -- src/modules/panorama/adapters/photo-sphere-viewer.adapter.test.ts src/modules/panorama/ui/PanoramaViewport.test.tsx src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx
```

Expected: the new observable committed-scene/transition assertions FAIL until adapter/view integration exposes and preserves the semantics.

- [ ] **Step 3: Implement only missing lifecycle behavior**

Keep the existing viewer, `VirtualTourPlugin`, stale-generation checks, and cache. Add only the minimum state/event boundary needed by tests; do not rebuild PSV on node changes. `setCurrentNode` must use native VirtualTour links and must restore the last committed node after the latest request fails.

- [ ] **Step 4: Add deterministic browser timing and static-media smoke tests**

In `demo-media.spec.ts`, assert all five manifest/preview/representative tile requests return `200` from the local Vite server. In `panorama-lifecycle.spec.ts`, measure:

```ts
await page.evaluate(() => performance.mark('scene-nav-start'));
await page.getByRole('button', { name: 'Đi tiếp' }).click();
await expect(page.locator('[data-scene-transition="active"]')).toBeVisible();
const duration = await page.evaluate(
  () => performance.now() - performance.getEntriesByName('scene-nav-start').at(-1)!.startTime,
);
expect(duration).toBeLessThanOrEqual(300);
```

For first scene, start at `loadNode` instrumentation and stop when the PSV preview/base layer is visible; enforce `<= 1_000 ms` only in the documented local demo project, never against external Google/CDN traffic.

- [ ] **Step 5: Run GREEN tests and E2E**

```bash
pnpm --filter @hatinh/web test -- src/modules/panorama/adapters/photo-sphere-viewer.adapter.test.ts src/modules/panorama/ui/PanoramaViewport.test.tsx src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx
pnpm --filter @hatinh/web test:e2e
```

Expected: unit/integration/E2E PASS; one map and one PSV survive their respective transitions.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/modules/panorama/adapters/photo-sphere-viewer.adapter.test.ts apps/web/src/modules/panorama/ui/PanoramaViewport.test.tsx apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx apps/web/e2e/panorama-lifecycle.spec.ts apps/web/e2e/demo-media.spec.ts apps/web/playwright.config.ts
git commit -m "test(immersive): prove persistent 3d and panorama journeys"
```

---

### Task 6: Delegate presentation polish to AGY and integrate without crossing ownership

**Files AGY may modify:**
- `apps/web/src/modules/map3d/ui/chrome/**`
- `apps/web/src/shared/ui/**`
- `apps/web/src/app/styles/**`

**Files Codex retains:**
- Google adapters and `Map3DViewport`
- Panorama adapters and lifecycle
- Contracts, Zustand, API/backend, OpenAPI client
- Demo catalog/media integration, tests, and deep links

**Interfaces:**
- Consumes: frozen Tasks 1–5 behavior and selectors/actions already exposed to presentation.
- Produces: compact loading/error/selection presentation without changing renderer ownership or dependencies.

- [ ] **Step 1: Verify Herdr caller context and inspect the existing AGY pane**

```powershell
if ($env:HERDR_ENV -ne '1') { throw 'Herdr context is required for AGY dispatch.' }
$agents = herdr agent list | ConvertFrom-Json
$agy = $agents.result.agents | Where-Object {
  $_.agent -eq 'agy' -and $_.workspace_id -eq $env:HERDR_WORKSPACE_ID -and $_.cwd -eq 'D:\DuAnKDLHaTinh'
}
if ($null -eq $agy) { throw 'The existing AGY agent in this repository was not found.' }
herdr pane list --workspace $env:HERDR_WORKSPACE_ID
```

Use the existing AGY agent name or its exact pane id from JSON. Do not create another folder/worktree and do not invent an agent target.

- [ ] **Step 2: Dispatch the frozen UI work packet**

```text
Polish only the P0 presentation for the existing 3D location → 360 journey.

Allowed paths:
- apps/web/src/modules/map3d/ui/chrome/**
- apps/web/src/shared/ui/**
- apps/web/src/app/styles/**

Required outcomes:
- full-screen Google 3D remains visually dominant;
- selected location and 360 entry are clear without repeated labels;
- loading is compact and never obscures the whole map longer than necessary;
- renderer error exposes one clear retry action;
- desktop and mobile controls remain keyboard accessible;
- do not clone map3d.visithcmc.vn.

Forbidden:
- no Google/PSV adapter, Map3DViewport, domain, Zustand, API, OpenAPI, backend,
  dependency, package.json, or architecture changes;
- no React/HTML map markers or map-canvas overlays representing destinations;
- do not add a state-management or animation dependency.

Run focused UI tests and report changed paths plus test output. Do not commit.
```

Submit through the installed Herdr primitive to the verified unique agent name `agy`:

```powershell
$agyPrompt = @'
Polish only the P0 presentation for the existing 3D location to 360 journey. Modify only apps/web/src/modules/map3d/ui/chrome/**, apps/web/src/shared/ui/**, and apps/web/src/app/styles/**. Keep Google 3D visually dominant, remove repeated labels, use compact loading, expose one retry action, and retain keyboard accessibility. Do not modify adapters, Map3DViewport, panorama lifecycle, contracts, Zustand, API, OpenAPI, backend, dependencies, or architecture. Do not create React/HTML destination markers. Run focused UI tests, report changed paths and test output, and do not commit.
'@
herdr agent prompt agy $agyPrompt --wait --timeout 120000
```

- [ ] **Step 3: Review AGY output before integration**

Reject changes outside allowed paths, repeated-content regressions, hidden native markers, renderer lifecycle changes, or new dependencies. Run:

```bash
git diff --name-only
pnpm --filter @hatinh/web test -- src/modules/map3d/ui/chrome/Map3DChrome.test.tsx
pnpm --filter @hatinh/web typecheck
```

- [ ] **Step 4: Commit presentation changes**

```bash
git add apps/web/src/modules/map3d/ui/chrome apps/web/src/shared/ui apps/web/src/app/styles
git commit -m "feat(web): polish immersive location chrome"
```

- [ ] **Step 5: Run final quality gates and live browser QA**

Use Node 24 as required by repository engines, then run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm architecture:check
pnpm deadcode
pnpm test:integration
pnpm build
pnpm --filter @hatinh/web check:bundle
pnpm test:e2e
git diff --check
```

Live QA must verify all three native markers remain geographically anchored while rotating/tilting/zooming, A → B → C visibly flies one Google map using reviewed presets, each location enters its own 360 entry scene, Thiên Cầm navigates through three tiled scenes, and exit returns to the selected location. Capture failures in tests/code, not a new Markdown report.

- [ ] **Step 6: Commit any focused QA fix separately, then request review**

Each independently testable QA fix receives its own conventional commit. Push the feature branch and open a PR only after all gates pass.
