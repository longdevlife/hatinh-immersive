# Content Readiness Audit

This directory contains evidence-driven audit artifacts for the site-wide immersive content gate before Phase 2.

Baseline: `main @ 8aa64eeaefceb8fcbbf01cba13442c8dc593f8f3`.

Current canonical scope: 19 immersive scenes across Sơn Trang, Biển Thiên Cầm, Khu lưu niệm Nguyễn Du, and Ngã ba Đồng Lộc.

Rules:
- Audit is scene-first and provider-neutral.
- Demo/public-download availability is not the same as production reuse rights.
- Phase 1C fail-closed panorama publication rules stay unchanged.
- Unknown physical facts, coordinates, rights, or source dimensions remain unknown; do not fabricate them.
- Canonical production verdicts are `READY_TO_INGEST`, `RECOVERABLE`, `REPLACE`, `BLOCKED_RIGHTS`, and `NOT_REQUIRED`.

Key artifacts:
- `scene-inventory.json` — canonical scene reconciliation.
- `external-candidates.json` — external/public discovery sources and usage lanes.
- forthcoming `panorama-inventory.json`, `audio-inventory.json`, `transcript-inventory.json`, and `acquisition-gaps.json`.
