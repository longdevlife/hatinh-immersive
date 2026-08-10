# Panorama Media Guide

This document describes the panorama media contract and tiling workflow used by `hatinh-immersive`.

The browser should progressively load panorama content through a preview + multi-resolution tile pyramid. Normal tile traffic must not be proxied through NestJS.

## Source requirements

Panorama source images are expected to be:

- equirectangular;
- 2:1 aspect ratio;
- high enough resolution for the intended viewer quality;
- owned/licensed for the target environment.

Demo imagery committed in the repository is demonstration content and must not be presented as production-ready tourism imagery.

## Output layout

The panorama tooling produces:

```text
<scene>/
├── preview.webp
├── manifest.json
└── tiles/
    ├── 0/
    ├── 1/
    ├── 2/
    └── ...
```

The manifest describes:

- panorama type/version;
- preview asset;
- tile URL template;
- resolution levels and grid dimensions.

The web runtime parses the shared manifest contract and maps it to Photo Sphere Viewer's `EquirectangularTilesAdapter`.

## Tooling package

Panorama tooling lives at:

```text
tooling/panorama/
```

The package uses Sharp and the shared `@hatinh/immersive-contracts` package.

### Build one panorama

```bash
pnpm panorama:build -- \
  --input /path/to/panorama.jpg \
  --output /path/to/output
```

Options:

```text
--tile-size <pixels>    default 512
--preview-width <px>    default 512
--quality <1-100>       default 82
```

### Regenerate committed demo panoramas

```bash
pnpm --filter @hatinh/panorama-tooling panorama:demo
```

The demo generator writes to:

```text
apps/web/public/demo/360/
```

Current demo scene IDs include:

```text
thien-cam-boardwalk
thien-cam-shore
thien-cam-lookout
nguyen-du-courtyard
dong-loc-memorial
```

## Runtime flow

The browser-facing flow is:

```text
PanoramaNode.panoramaUrl
        ↓
manifest.json
        ↓
preview.webp shown first
        ↓
EquirectangularTilesAdapter requests required tiles
        ↓
higher-resolution content arrives progressively
```

A scene node may also provide `previewUrl`; otherwise the client can derive the preview URL from the manifest location when appropriate.

## Production storage model

Production media metadata lives in the API/database, while panorama bytes live in object storage/CDN.

```text
Admin/upload pipeline
      ↓
S3-compatible object storage
      ↓
processed/<destination>/<scene>/manifest.json
processed/<destination>/<scene>/preview.webp
processed/<destination>/<scene>/tiles/...
      ↓
public storage/CDN origin
      ↓
browser
```

NestJS resolves public URLs when a referenced media asset is ready. The API returns URLs/metadata; it should not stream every panorama tile.

The API environment variable used to create browser-accessible object URLs is:

```text
S3_PUBLIC_ORIGIN
```

Without a public origin, relative storage keys cannot become usable public panorama URLs through the normal API response path.

## Media readiness

The immersive manifest only exposes public panorama URLs when the corresponding media asset is considered ready and the URL can be resolved.

Do not assume a scene with a `panoramaAssetId` is immediately browser-renderable.

The current database seed contains foundation media records that may remain in `processing`, while the deterministic front-end demo uses already-generated local files under `apps/web/public/demo/360/`.

These paths intentionally serve different development purposes.

## Photo Sphere Viewer integration

The adapter lives under:

```text
apps/web/src/modules/panorama/adapters/
```

Important behavior:

- preview/tile manifests are parsed through shared contracts;
- scene links are supplied to `VirtualTourPlugin`;
- the same Photo Sphere Viewer instance remains mounted during normal scene navigation;
- scene transition results use committed/requested semantics in the immersive-navigation layer;
- adjacent/preloaded nodes may reuse loaded manifest/tile information.

Do not redesign the media pipeline in a way that forces a full original equirectangular image download for every visitor scene.

## Demo media validation

The repository includes browser smoke coverage that checks representative local demo assets can be requested without external media dependencies.

When changing demo scene definitions or panorama output paths, validate that:

- every referenced `manifest.json` exists;
- each manifest resolves a preview;
- representative tile URLs exist;
- scene IDs match the demo catalog;
- no runnable demo references placeholder hosts such as `cdn.example.*`.

## Testing

Panorama tooling tests:

```bash
pnpm panorama:test
```

Regenerate demo media when source/tooling changes:

```bash
pnpm --filter @hatinh/panorama-tooling panorama:demo
```

For viewer/media changes also run the relevant web unit/integration/E2E checks described in [DEVELOPMENT.md](./DEVELOPMENT.md).

## Security and delivery notes

- Do not commit private media credentials.
- `VITE_*` variables are browser-visible and are not suitable for S3 secrets.
- Use presigned/direct upload flows for large admin uploads.
- Public panorama delivery should use HTTP(S) object-storage/CDN origins.
- Reject unsafe path traversal when resolving storage keys to public URLs.
- Treat media licensing/ownership as a production content requirement separate from technical demo readiness.
