# Architecture

This document describes the current architecture of `hatinh-immersive` on `main` and the invariants that future work must preserve.

## Product model

The product is an interactive 3D location explorer with connected tiled 360° tours.

```text
FULL-SCREEN GOOGLE 3D WORLD
        ↓
real geographic locations
        ↓
marker / search / location-list selection
        ↓
fly the same mounted Map3DElement
        ↓
enter selected location's 360° tour
        ↓
linked panorama scene graph
        ↓
exit 360°
        ↓
return to the same selected 3D location
```

The primary navigation surface is Google 3D. MapLibre/minimap is secondary.

## System overview

```text
┌──────────────────────────────────────────────────────────────┐
│                         apps/web                             │
│                                                              │
│ React Router / UI                                            │
│        │                                                     │
│        ▼                                                     │
│ ImmersiveExperience                                         │
│        │                                                     │
│        ├── Zustand immersive navigation state               │
│        │                                                     │
│        ├── TanStack Query                                   │
│        │       │                                             │
│        │       ▼                                             │
│        │ @hatinh/api-client → /api/v1                       │
│        │                                                     │
│        ├── Map3DEnginePort                                  │
│        │       ▼                                             │
│        │ Google Maps JS 3D adapter                          │
│        │                                                     │
│        ├── PanoramaEnginePort                               │
│        │       ▼                                             │
│        │ Photo Sphere Viewer adapter                        │
│        │                                                     │
│        └── MinimapEnginePort (secondary)                    │
│                ▼                                             │
│              MapLibre                                       │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                         apps/api                             │
│                                                              │
│ NestJS + Fastify                                             │
│   ├── catalog                                                │
│   ├── virtual-tour                                          │
│   ├── media                                                  │
│   ├── identity                                               │
│   └── audit/platform concerns                               │
│                          │                                   │
│                          ▼                                   │
│                  PostgreSQL + PostGIS                        │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
                Object storage / CDN
            manifest + preview + panorama tiles
```

## Frontend module boundaries

### `map3d`

`apps/web/src/modules/map3d/` owns the Google Maps JavaScript 3D integration.

The application-facing contract is `Map3DEnginePort`:

```text
mount(container)
setLocations(locations)
subscribeLocationSelected(listener)
flyTo(cameraPreset)
addModel(model)
destroy()
```

`Map3DLocation` carries:

- stable application ID;
- label;
- geographic position;
- curated `LocationCameraPreset`.

The Google adapter maps these objects to native `Marker3DInteractiveElement` elements and routes `gmp-click` back through the port.

### `panorama`

`apps/web/src/modules/panorama/` owns Photo Sphere Viewer integration.

The viewer uses:

- `EquirectangularTilesAdapter`;
- `VirtualTourPlugin`;
- linked panorama nodes;
- preview-first multi-resolution media;
- persistent viewer lifecycle across scene changes.

`PanoramaNode.links` are mapped to native virtual-tour links. Normal A → B → C navigation must not recreate the viewer.

### `immersive-navigation`

`apps/web/src/modules/immersive-navigation/` orchestrates the user journey across renderers.

The important state distinction is between requested and committed panorama state:

```text
selectedLocationId
selectedLocationPreset
committedSceneId
committedView
requestedSceneId
transitionId
mode
activeRenderer
renderer statuses
```

A requested scene does not become committed until the renderer succeeds. Stale async results are ignored and a failed latest request rolls back to the last committed scene.

### `minimap`

`apps/web/src/modules/minimap/` wraps MapLibre. It is a supporting spatial-awareness feature, not the product's primary exploration model.

## Renderer lifecycle invariants

### Google 3D

Within one overview session:

```text
mount once
  ↓
install/update locations
  ↓
fly A
  ↓
fly B
  ↓
fly C
  ↓
destroy only when leaving/retrying/unmounting
```

`Map3DViewport` intentionally separates the mount effect from location, camera, and model update effects.

### Panorama

Within one panorama session:

```text
mount viewer once
  ↓
load scene A
  ↓
load scene B
  ↓
load scene C
  ↓
destroy only when leaving/retrying/unmounting
```

Renderer identity is not scene identity.

### Heavy renderer rule

Do not keep the full Google 3D renderer and full panorama renderer active simultaneously. The supporting minimap may remain where appropriate.

## State ownership

- **TanStack Query** owns server/cache state.
- **Zustand** owns transient immersive navigation and renderer state.
- **React local state** owns presentation-only concerns.
- **URL/deep-link state** is part of the navigation contract.
- **Generated OpenAPI client** is the browser ↔ API network boundary.

Do not mirror full API entities into Zustand.

## Deep links

Overview example:

```text
/explore/bien-thien-cam?mode=overview3d&location=thien-cam-beach
```

Panorama example:

```text
/explore/bien-thien-cam?mode=panorama&location=thien-cam-beach&scene=thien-cam-shore&h=118&p=0&fov=88
```

The URL should describe committed navigation state, not a failed/stale renderer request.

## API read model

The public immersive flow uses:

```text
GET /api/v1/destinations/:slug/immersive-manifest?locale=vi
```

The manifest combines:

- destination metadata;
- default scene;
- published scene nodes;
- scene links;
- published hotspots;
- public panorama manifest/preview URLs when the referenced media asset is ready.

The web maps API DTOs into application/view models before renderers consume them.

## Media delivery

NestJS owns metadata and URL resolution. It should not proxy normal panorama tile traffic.

```text
browser
   ↓
manifest URL / preview / tiles
   ↓
static host / object storage / CDN
```

See [MEDIA.md](./MEDIA.md).

## Current deterministic demo

The front-end demo catalog contains three real-coordinate Hà Tĩnh locations:

- Biển Thiên Cầm;
- Khu lưu niệm Nguyễn Du;
- Ngã ba Đồng Lộc.

Thiên Cầm contains a three-scene linked 360 route. Demo media is committed under `apps/web/public/demo/360/`.

The API database seed is a different foundation dataset (`son-trang-co-dam`, 12 scenes). Do not treat the two datasets as interchangeable.

## Current boundaries

1. Google 3D availability depends on Google project configuration, browser/WebGL support, and geographic coverage.
2. The web contract supports curated camera presets, but persisted/admin-managed camera presets are not yet a fully established server-side catalog capability.
3. The generated API client uses relative `/api/v1` URLs. The committed Vite config currently has no `/api/v1` dev proxy.
4. Demo imagery is demonstration content, not production-ready Hà Tĩnh tourism imagery.
5. The public/admin UI is still in active productization even though renderer architecture is substantially ahead of final visual polish.

## Architecture change checklist

Before merging renderer/navigation changes, verify that the change does not accidentally:

- replace native 3D spatial markers with DOM overlays;
- remount Google 3D per location;
- remount Photo Sphere Viewer per scene;
- commit panorama state before load success;
- allow stale async results to overwrite current state;
- push server/cache entities into Zustand;
- leak vendor SDK types through domain/application code;
- proxy panorama tiles through the API;
- make the minimap the primary navigation surface.

See [../AGENTS.md](../AGENTS.md) for contributor and agent execution rules.
