# Hà Tĩnh 360 Download Capability Probe

Date: 2026-08-20

Target: `https://platform.starglobal3d.com/smart-tourism-360/du-lich-ha-tinh/khu-du-lich-thien-cam`

## What was checked

- Public DOM and visible controls.
- Public network responses and Next.js bundles loaded by the viewer.
- krpano manifests and included skin XML.
- Explicit download anchors/controls.
- Screenshot/check-in implementation surfaced by the public application.

## Findings

1. No explicit panorama download link was found in the inspected public viewer. The earlier full reconnaissance across 8 routes recorded `explicitDownloadLinks = 0`.
2. The public viewer exposes krpano multires cube-tile pyramids and VR cube faces, but no 2:1 equirectangular master file was observed.
3. The viewer loads `snapscreen_showroom.xml`. That XML contains screenshot implementation code which calls the krpano WebGL screenshot API and stores the result in `localStorage.urlSnap`.
4. The sample `Make Screenshot` and `Make Hi-Res Screenshot` krpano layers in that XML are commented out, so those XML buttons are not themselves exposed as active public controls.
5. A loaded public Next.js bundle exposes `window.handleKrpanoScreenshot` and calls `window.krpano.makescreenshoturl(800, 600)` (or the equivalent krpano action), then reads `localStorage.urlSnap`. This is a flat current-view screenshot path, not a full spherical panorama export.
6. The public experience contains `Điểm check-in` content. Star Global's own product documentation describes Virtual Check-in as composing a user's image into a digitized 3D/360 view and sharing the resulting image.
7. No public `<a download>` or equivalent visitor-facing control for downloading a full panorama master was observed in the probe.

## Classification

- Flat screenshot / virtual check-in capability: **CONFIRMED**.
- Publicly exposed full 360 equirectangular download: **NOT FOUND**.
- Browser-readable cube tiles: **CONFIRMED**.
- Public 2:1 master panorama source: **NOT FOUND**.

The screenshot/check-in capability must not be confused with a downloadable panorama source. It produces a normal rendered view of the current camera orientation (the application path observed uses 800x600), whereas Phase 1C requires a full equirectangular source at least 4096x2048.

## Evidence references

- `tour-view360.xml` includes `https://sanpham.starglobal3d.vn/managements/skin/snapscreen_showroom.xml`.
- Star Global smart-tourism product page: `https://starglobal3d.com/smart-tourism-360`.
- Star Global Virtual Check-in description: `https://starglobal3d.com/brochure/smartheritage3d/`.
- Probe workflow artifacts were generated read-only from the public viewer on GitHub Actions and are intentionally not production media inputs.
