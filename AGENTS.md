# AGENTS.md

Instructions for AI coding agents and parallel contributors working in this repository.

The root [README.md](./README.md) explains the product and quick start. Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) before changing renderer, navigation, API, or state behavior.

## Product invariant

The primary visitor surface is the **full-screen interactive Google 3D world**.

```text
Google 3D world
    ↓
select a real geographic location
    ↓
fly the same mounted Map3DElement
    ↓
enter that location's 360° tour
    ↓
move through linked tiled panorama scenes
    ↓
exit 360°
    ↓
return to the same selected 3D location
```

MapLibre/minimap is secondary. Do not redesign the product around it.

## Non-negotiable architecture rules

1. Do not replace Google Maps 3D spatial location markers with absolute-positioned DOM/React fake markers.
2. Do not remount Google 3D when selecting another location. A → B → C changes camera/location state, not renderer identity.
3. Do not remount Photo Sphere Viewer for normal scene-to-scene navigation.
4. Do not commit a requested panorama scene before the renderer confirms success.
5. Ignore stale async scene results when a newer transition exists.
6. Roll back the latest failed panorama request to the last successfully committed scene.
7. Keep Google Maps, Photo Sphere Viewer, and MapLibre SDK details behind adapter boundaries.
8. Do not proxy normal panorama tile traffic through NestJS. Serve media from static/object-storage/CDN URLs.
9. Do not bypass the generated `@hatinh/api-client` with ad-hoc production fetch code.
10. TanStack Query owns server/cache state; Zustand owns transient immersive navigation/render state.
11. Do not mirror whole API entities into Zustand.
12. Do not rewrite stable 360/backend infrastructure merely to add presentation features.

## Source of truth

When documents disagree, use this order:

1. explicit user/request requirements for the current task;
2. current code and tests on the working branch;
3. the newest approved milestone spec/plan under `docs/superpowers/`;
4. older broad foundation documents.

Inspect the current implementation before changing it. Do not implement from commit titles or assumptions.

## Development workflow

For non-trivial behavior changes:

```text
inspect current code
    ↓
read relevant approved spec/plan
    ↓
write a failing focused test
    ↓
minimal implementation
    ↓
refactor while green
    ↓
run focused verification
    ↓
run repository quality gates appropriate to the change
    ↓
small conventional commit
```

Use RED → GREEN → REFACTOR for behavior changes.

Never claim completion from code inspection alone. Run the command that proves the claim and report the actual result.

## Path ownership for parallel agents

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

Merge-sensitive surfaces require coordination:

```text
apps/**/src/app/**
apps/**/src/**/index.ts
apps/web/src/shared/contracts/**
package.json / workspace configuration
router/integration containers
```

## Codex ↔ AGY / UI-agent handoff

When Codex delegates presentation work through Herdr or another orchestration mechanism:

1. inspect the available Herdr/tool interface first; do not invent CLI syntax;
2. freeze domain/view-model/callback contracts before dispatch;
3. send AGY a bounded work packet with exact owned paths and acceptance criteria;
4. keep vendor SDKs, state orchestration, API wiring, and tests under Codex/engineering ownership;
5. require AGY to avoid modifying shared contracts unless explicitly assigned;
6. review the returned diff for path ownership before integrating it;
7. run focused tests and repository gates after integration.

AGY should receive presentation contracts, not Google Maps/Photo Sphere Viewer internals.

## Generated code

Do not manually edit:

```text
packages/api-client/src/generated/**
```

After API contract changes run:

```bash
pnpm api:generate
```

## Media rules

Panorama source images are 2:1 equirectangular assets. The tooling produces preview + multi-resolution tiles + manifest.

Read [docs/MEDIA.md](./docs/MEDIA.md) before changing panorama contracts, tiling, URLs, or object-storage behavior.

## Verification

Choose checks based on scope. Common repository gates:

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

For web bundle or renderer changes also consider:

```bash
pnpm --filter @hatinh/web check:bundle
pnpm --filter @hatinh/web test:e2e:minimap
```

For panorama tooling:

```bash
pnpm panorama:test
```

Do not report a gate as passing unless it was run for the current change and its output confirms success.
