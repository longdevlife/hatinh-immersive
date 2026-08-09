# Task 1 Report — Lock CameraPreset and native Google marker contracts

## Status

DONE_WITH_CONCERNS

## Files changed

- `apps/web/src/shared/contracts/immersive.ts`
- `apps/web/src/shared/contracts/index.ts`
- `apps/web/src/modules/immersive-navigation/model/navigation.types.ts`
- `apps/web/src/modules/immersive-navigation/model/navigation.store.ts`
- `apps/web/src/modules/immersive-navigation/model/navigation.store.test.ts`
- `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.tsx`
- `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx`
- `apps/web/src/modules/map3d/adapters/fake-map3d.adapter.ts`
- `apps/web/src/modules/map3d/adapters/google-maps3d.adapter.ts`
- `apps/web/src/modules/map3d/adapters/google-maps3d.adapter.test.ts`
- `apps/web/src/modules/map3d/domain/map3d-engine.port.ts`
- `apps/web/src/modules/map3d/index.ts`
- `apps/web/src/modules/map3d/ui/Map3DViewport.tsx`
- `apps/web/src/modules/map3d/ui/Map3DViewport.test.tsx`
- `apps/web/src/modules/renderers/fake-renderers.test.ts`

## RED evidence

Command:

```bash
pnpm --filter @hatinh/web test -- src/modules/map3d/adapters/google-maps3d.adapter.test.ts src/modules/immersive-navigation/model/navigation.store.test.ts
```

Result: failed as intended with 2 failing tests. The Google adapter received a nested preset but produced `center.lat` and `center.lng` as `undefined`; the navigation store did not expose `selectedLocationPreset`.

## GREEN commands/results

```bash
pnpm --filter @hatinh/web test -- src/modules/map3d/adapters/google-maps3d.adapter.test.ts src/modules/immersive-navigation/model/navigation.store.test.ts
```

PASS — 2 test files, 19 tests.

```bash
pnpm --filter @hatinh/web typecheck
```

PASS — `tsc -p tsconfig.json --noEmit`.

```bash
pnpm --filter @hatinh/web test
pnpm --filter @hatinh/web typecheck
pnpm --filter @hatinh/web lint
```

PASS on the committed tree — 24 test files, 101 tests; typecheck and lint clean.

## Commit SHA

`5e50e89cd1c929400ab9203d1a0811ee61a3d4ed`

## Self-review concerns

- The workspace runs Node `v22.15.0`, while the repository declares `>=24 <25`. pnpm emitted an unsupported-engine warning for every verification command, although all checks passed.
- `Map3DViewport` was necessarily included beyond the brief's file list because it is the port consumer that invokes `flyTo`; it now accepts `LocationCameraPreset`, preserving the port contract end-to-end.

## Fix Round 1

### Files changed

- `apps/web/src/shared/contracts/immersive.ts`
- `apps/web/src/shared/fixtures/destination.fixture.ts`
- `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.tsx`
- `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx`
- `apps/web/src/modules/map3d/ui/Map3DViewport.tsx`
- `apps/web/src/modules/map3d/ui/Map3DViewport.test.tsx`

### RED evidence

```bash
pnpm --filter @hatinh/web test -- src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx src/modules/map3d/ui/Map3DViewport.test.tsx
```

FAILED as intended — 2 new regressions failed. A destination with only a geographic point was included with the synthesized `{ heading: 0, tilt: 55, range: 900 }` preset, and a pending `setLocations` operation prevented `FakeMap3DEngine.flyTo` within 100 ms of a selection.

### GREEN commands/results

```bash
pnpm --filter @hatinh/web test -- src/modules/map3d/adapters/google-maps3d.adapter.test.ts src/modules/immersive-navigation/model/navigation.store.test.ts src/modules/immersive-navigation/ui/ImmersiveExperience.test.tsx src/modules/map3d/ui/Map3DViewport.test.tsx
```

PASS — 4 test files, 36 tests.

```bash
pnpm --filter @hatinh/web test
pnpm --filter @hatinh/web typecheck
pnpm --filter @hatinh/web lint
```

PASS — 24 test files, 103 tests; typecheck and lint clean.

### Commit SHA

`6cf9d6037e532071294554ee993ea98edf561579`
