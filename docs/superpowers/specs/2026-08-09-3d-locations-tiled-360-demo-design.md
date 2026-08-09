# 3D Locations and Tiled 360 Demo Design

## Objective

Deliver a deterministic local demo of the core journey:

Google 3D overview → select a real Hà Tĩnh location → fly the existing persistent map to that location → enter that location's 360 tour → move between linked panorama scenes while progressively loading image tiles → exit to the same selected 3D location.

This is a focused stabilization and demonstration slice. It does not attempt full reference-parity UI or production media ingestion.

## Locked Product Flow

1. The overview opens one full-screen Google `Map3DElement`.
2. At least three demo destinations use verified Hà Tĩnh coordinates and appear as interactive 3D markers.
3. Marker, search, and destination-list selection call the same `selectLocation(locationId)` orchestration path.
4. Selecting A, B, or C resolves that location's curated camera preset and immediately calls
   `flyTo(cameraPreset)` on the existing map instance. The map must not remount between selections.
5. The selected location exposes one entry action for its linked 360 tour.
6. Entering 360 keeps the existing 3D selection as the return location.
7. Photo Sphere Viewer displays a lightweight preview first, then progressively requests multi-resolution tiles.
8. Scene links are supplied to `VirtualTourPlugin`; selecting a navigation hotspot moves to the linked scene without recreating the viewer.
9. Exiting 360 restores overview mode and flies or remains at the selected location.

## Demo Data and Media

- Demo destination and tour data may be static local data, isolated behind the same view-model contracts used by REST data.
- Every demo location owns a curated camera preset:

  ```ts
  interface LocationCameraPreset {
    center: {
      lat: number;
      lng: number;
      altitude?: number;
    };
    heading: number;
    tilt: number;
    range: number;
  }
  ```

- A demo location is eligible for P0 only when all three conditions pass:
  1. its geographic coordinate is verified;
  2. Google 3D renders the location with usable coverage in the target demo environment;
  3. a manually reviewed camera preset produces a useful tourism view.
- A location with correct coordinates but unusable Google 3D coverage is excluded from P0.
- Demo panoramas are locally owned/generated equirectangular images with a 2:1 aspect ratio.
- Existing panorama tooling generates a preview, tile pyramid, and manifest for every demo scene.
- The web app loads panorama media directly from static/object-storage-style URLs. NestJS must not proxy image bytes.
- Fake `cdn.example.vn` URLs must not be used by a runnable local demo.
- Production remains REST/OpenAPI/TanStack Query plus object storage/CDN; demo media paths do not redefine production architecture.

## Renderer Lifecycle and Performance

### Google 3D

- One engine and one mounted `Map3DElement` survive A → B → C selection.
- Every P0 destination marker is a native Google `Marker3DInteractiveElement` appended to the
  mounted `Map3DElement` 3D world.
- Marker position is geographic `{ lat, lng, altitude? }`; destination coordinates are the source
  of truth.
- React/HTML markers positioned over the map canvas are forbidden.
- Rotating, tilting, zooming, or flying the map preserves each marker's spatial relationship with
  its real-world location because marker placement is owned by the Google 3D scene graph.
- Marker installation happens after mount and is updated without rebuilding the map.
- Native `gmp-click` events are translated into the shared `selectLocation(locationId)`
  orchestration path.
- 3D selection latency is measured from the marker/search/list UI event to the
  `engine.flyTo(cameraPreset)` invocation and must be at most 100 ms in deterministic integration
  tests.
- Map readiness has a bounded timeout. Permission, script, or renderer failures transition to an actionable error state instead of an infinite spinner.
- A retry creates a clean mount attempt without duplicate markers or listeners.

### Panorama

- One Photo Sphere Viewer instance survives scene A → B → C transitions.
- The committed scene changes only after the target scene succeeds.
- Stale scene success/failure is ignored.
- If the latest requested scene fails, the viewer restores the last successfully committed scene.
- First-scene latency is measured from `loadNode` invocation until the preview/base image is
  visibly rendered and must be at most 1,000 ms in the documented local demo environment.
- Preloaded linked-scene latency is measured from navigation activation until the scene transition
  visibly begins and must be at most 300 ms.
- High-resolution tile completion is explicitly excluded from the 300 ms requirement; sharp tiles
  continue loading progressively.

## UI Scope

Core interaction clarity is P0:

- selected destination and current mode are unambiguous;
- loading is compact and non-blocking where possible;
- renderer failures expose retry and a useful reason;
- the 360 entry action appears only when the selected destination has a tour;
- scene navigation uses clear directional hotspots;
- exit 360 clearly returns to the 3D overview.

Full visual parity, ancillary toolbars, content library, elaborate motion, and broad responsive redesign remain outside this slice.

## Error Handling

- Missing/unauthorized Google configuration produces a bounded `unavailable` or `error` state.
- A missing panorama manifest, preview, or tile produces a scene-level error while preserving the committed scene.
- Demo-data validation fails tests when a location has invalid coordinates, a tour has no entry scene, a link targets a missing node, or a referenced local media asset does not exist.
- Retry never reloads the page and never duplicates renderer instances.

## Testing Strategy

Every behavior change follows RED → GREEN → REFACTOR.

- Unit tests: demo graph validation, camera-preset validation, Google readiness timeout, selection
  orchestration, committed-scene rollback, and media URL expansion.
- Adapter tests: persistent Google map/markers, markers appended as native
  `Marker3DInteractiveElement` children of `Map3DElement`, geographic marker options, native
  `gmp-click` selection, and persistent PSV/VirtualTour node transitions.
- Integration tests: location selection → panorama entry → linked-scene movement → return to selected location.
- Production-path E2E with deterministic renderer: A → B → C flights and 3D ↔ 360 round trip.
- Local-media browser smoke: manifests, previews, and representative tiles return successfully without external network dependencies.
- Existing lint, typecheck, architecture, dead-code, build, bundle, and CI gates remain mandatory.

## Scope Exclusions

- No Google Custom Street View integration.
- No MapLibre/minimap expansion for this milestone.
- No new database table or backend media proxy.
- No microservices, GraphQL, Kafka, Kubernetes, or new state-management framework.
- No claim of production-ready Hà Tĩnh imagery; demo media must be visibly identified as demonstration content where necessary.

## Definition of Done

- Three real-coordinate Hà Tĩnh demo locations are selectable in Google 3D.
- Every included location passes coordinate verification, usable Google 3D coverage review, and
  manual camera-preset review in the target demo environment.
- Every location selection flies to its curated center, heading, tilt, and range.
- All destination markers are native Google 3D elements attached to `Map3DElement`; no
  React/HTML overlay marker implementation exists.
- Marker positions remain geographically anchored while the user rotates, tilts, zooms, and flies
  the Google 3D camera.
- A → B → C uses one mounted map and produces visible flights.
- Each selected location can enter its linked demo 360 tour.
- At least one tour contains three linked, tiled scenes with progressive loading.
- Scene navigation does not recreate Photo Sphere Viewer and obeys committed-scene rollback semantics.
- Exit 360 returns to the same selected 3D location.
- Renderer failures stop loading within a bounded time and offer retry.
- All focused and repository quality gates pass.
- No unsolicited/generated Markdown status reports are committed.
- The approved Superpowers design, implementation plan, and explicitly required ADRs are allowed
  and remain source of truth.
