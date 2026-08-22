# Reference Sources

## Official Hà Tĩnh / Star Global 3D/360

- Public platform: https://dulichhatinh360.com
- Project viewer: https://platform.starglobal3d.com/smart-tourism-360/du-lich-ha-tinh/
- Current general public panorama manifest: `https://s3.hcm-1.cloud.cmctelecom.vn/starglobal-3d/smart-tourism-360/du-lich-ha-tinh/tour-view360.xml`.
- Broader Hà Tĩnh panorama manifest: `https://sanpham.starglobal3d.vn/smart-tourism-3d/viet-nam-34-tinh/tour_xml/gd5/tour-42-ha-tinh.xml`.
- Star Global case study states 146 360-degree ground/aerial views and 170+ 2D images for the Hà Tĩnh project, with narration/audio integration.

### Read-only reconnaissance evidence — 2026-08-20

A Playwright runner inspected eight public routes and captured the viewer's public network traffic without bypassing access controls.

- 581 network responses; 314 candidate media/API responses; 124 JSON/XML/text bodies captured.
- No explicit public panorama download link or download control was found.
- The current `tour-view360.xml` contains 150 krpano scenes and exposes multiresolution cube-tile pyramids rather than 2:1 master equirectangular files.
- Ground cube pyramids commonly report `512,640,1152,2304,4736`; aerial examples report `512,768,1664,3200,6400`.
- Current direct routes for Thiên Cầm, Thạch Hải, Lộc Hà, and Đá Bạc ECO returned 200. The guessed direct routes `/khu-luu-niem-nguyen-du` and `/nga-ba-dong-loc` returned 404.
- The broader `tour-42-ha-tinh.xml` contains 26 scenes, including four ground + one aerial Nguyễn Du scene and four ground + one aerial Thiên Cầm scene.
- No Đồng Lộc string was found in the 124 captured public response bodies, so Đồng Lộc remains an unresolved external-source gap in this reconnaissance.
- The public autotour API currently lists four autotours. Thiên Cầm has an autotour titled `Tham quan các điểm du lịch biển Thiên Cầm`; its top-level `audio` field is `null`.
- No direct `.mp3`, `.m4a`, `.wav`, or `.ogg` media URL was observed in this capture. This is not evidence that narration/audio is absent elsewhere in the platform.

Audit rule: public visibility and browser-readable cube tiles are discovery evidence only. They are not an explicit download/reuse grant. Do not reconstruct or rehost Star Global cube tiles unless a permitted download/reuse basis is established. Production classification always requires rights evidence accepted by the existing Phase 1C model.

## Existing repository demo packages

`apps/web/public/demo/360` contains derivatives for 13 of the 19 canonical scenes. Five can be reconstructed at 2048×1024 for demo/reference (three Thiên Cầm, one Nguyễn Du, one Đồng Lộc). The eight canonical Sơn Trang packages are only 256×128 placeholders. None of the existing repository panorama material satisfies the Phase 1C production minimum or establishes production rights by itself.
