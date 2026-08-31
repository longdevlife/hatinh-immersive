# Phase 1D Content Readiness Audit

Generated: 2026-08-20
Baseline: `main @ 8aa64eeaefceb8fcbbf01cba13442c8dc593f8f3`
Phase: **1D — Content Readiness & Demo Enablement**

## Gate verdict

| Gate | Verdict |
| --- | --- |
| ENGINEERING READY | YES — Phase 1A–1C contracts and fail-closed ingestion foundation are present |
| CONTENT READY | **BLOCKED** |
| PHASE 1D | ACTIVE |
| PHASE 2 | **BLOCKED BY CONTENT READINESS** |

This document records evidence and gaps. It does not change production scene,
audio, transcript, panorama, or rights assignments.

## Reconciled baseline

The canonical inventory contains 19 unique scene IDs:

| Destination | Canonical scenes |
| --- | ---: |
| Sơn Trang Cổ Đạm | 8 |
| Biển Thiên Cầm | 3 |
| Khu lưu niệm Nguyễn Du | 4 |
| Ngã ba Đồng Lộc | 4 |
| **Total** | **19** |

Physical names, coordinates, and final customer-facing mappings remain null or
pending where evidence is insufficient. No legacy/demo order is promoted to
physical truth.

## Panorama evidence

- Production minimum remains a real 2:1 equirectangular source of at least
  `4096×2048`, with no upscale.
- Existing repository audit: 19 canonical records, 0 production-ready.
- Five local demo/reference reconstructions are available at `2048×1024`:
  three Thiên Cầm scenes, one Nguyễn Du scene, and one Đồng Lộc scene.
- Eight Sơn Trang derivatives are only `256×128` and are excluded from the
  usable demo bundle.
- Six canonical scenes have no existing repository panorama package.
- Public Hà Tĩnh/Star Global candidates expose browser-readable cube tiles for
  some destinations, but no explicit full 2:1 master download or reuse grant
  was verified.

Panorama disposition: **19 scenes require replacement or approved recovery**.
The five 2048×1024 files remain valid only for an isolated demo/reference lane.

## Audio and transcript evidence

Required production inventory:

- destination ambient: `0/4` production-ready;
- Vietnamese narration: `0/19` production-ready;
- matching Vietnamese transcripts: `0/19` production-ready.

The public reference viewer was inspected interactively. Shared ambient and
selected prerecorded narration were observed at runtime for the overview,
Thiên Cầm, and Nguyễn Du, but the files were not copied and no rights,
provenance, production assignment, or transcript approval was established.
This is **reference-only evidence**, not production content.

The repository's demo audio entries remain `demo-only`/`src=null` and are not
production playback assets.

## Rights/provenance

See [`rights-evidence.json`](./rights-evidence.json). No candidate currently
has complete production evidence for rights holder, rights/reference,
source/provenance, and content version. A public URL, browser-readable tile,
or runtime audio request is not a license to copy, transform, rehost, or
redistribute the asset.

## Demo-enable lane

Phase 1D demo work may continue without weakening production gates. The
current truthful vertical slice is **Thiên Cầm with three distinct local demo
scenes**. Its assets are below the production minimum and must be labeled as
demo/reference content. Sơn Trang remains a strategic showcase shell until
real scene mapping and approved media exist; its low-resolution placeholders
must not be rendered as production panorama content.

## Acquisition blockers

1. Obtain customer-owned/licensed 2:1 panorama masters and verify physical
   mapping for all required scenes.
2. Obtain four approved ambient files with rights/provenance/version evidence.
3. Obtain nineteen approved VI narration files and nineteen matching
   transcripts.
4. Complete factual/physical verification for names, coordinates, headings,
   links, and story copy.
5. Run Phase 1C ingestion and real desktop/mobile runtime acceptance only
   after the source and rights gates pass.

## Phase boundary

The audit intentionally leaves `CONTENT READY` blocked. Phase 2 must not start
until the Phase 1D content/model gate is sufficiently stable or the user
explicitly changes that gate.
