# Content Readiness Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an evidence-backed site-wide Content Readiness Audit for the 19 canonical immersive scenes and the associated panorama, ambient audio, VI narration, and transcript assets, then identify exactly what can be recovered, what must be replaced, and what is ready to ingest.

**Architecture:** Treat each canonical scene as the audit unit. Separate discovery/demo availability from production eligibility. Existing project assets and official Hà Tĩnh / Star Global 360 resources are discovery inputs; Phase 1C production gates remain authoritative for publication. Audit artifacts are machine-readable JSON plus a human summary and must not mutate production assignments.

**Tech Stack:** TypeScript/Node.js, PostgreSQL/Drizzle read models, existing Phase 1C panorama pipeline contracts, JSON/Markdown audit artifacts, GitHub issue tracking.

**Spec:** `docs/superpowers/specs/2026-08-20-content-readiness-audit-design.md`

## Global Constraints

- Baseline is `main @ 8aa64eeaefceb8fcbbf01cba13442c8dc593f8f3`.
- Scope is 19 current canonical immersive scenes across Sơn Trang, Thiên Cầm, Nguyễn Du, and Đồng Lộc.
- Production panorama minimum is 4096×2048, ratio 1.95–2.05, no upscale.
- Production panorama rights values remain only `customer-owned` or `licensed`.
- Public production runtime stays fail-closed; do not re-enable legacy/demo fallback.
- Official/public-downloadable external media may be catalogued as `demo-only` candidates, but must not be labeled production licensed without evidence.
- Do not fabricate panorama, provenance, narration, transcript, capture coordinates, or rights evidence.
- No Phase 2 feature work until the Content Readiness gate is resolved.

---

### Task 1: Canonical scene inventory

**Files:**
- Create: `content-readiness/scene-inventory.json`
- Create: `content-readiness/README.md`
- Read: current immersive E2E fixtures, production scene definitions, destination manifests, legacy `demo-seed.ts`

**Interfaces:**
- Consumes: existing destination/scene IDs from `main`
- Produces: one normalized record per canonical scene with `destinationSlug`, `sceneId`, `sceneName`, `sortOrder`, `lat`, `lng`, `panoramaRequired`, `legacyRefs`, and `auditStatus`

- [ ] **Step 1:** Enumerate all current production-shaped scene IDs from source/tests and reconcile duplicates or legacy-only scene records.
- [ ] **Step 2:** Assert the canonical count is exactly 19 and group 8/3/4/4 by destination.
- [ ] **Step 3:** Record legacy/demo scene references separately; never promote the 12-scene demo seed to canonical truth.
- [ ] **Step 4:** Write `content-readiness/scene-inventory.json` with evidence references for each record.
- [ ] **Step 5:** Review for invented coordinates/names; unknown physical truth must be `null` plus `needsVerification: true`.
- [ ] **Step 6:** Commit with `docs(content): add canonical immersive scene inventory`.

### Task 2: Existing panorama recovery audit

**Files:**
- Create: `content-readiness/panorama-inventory.json`
- Read: `apps/api/src/core/database/schema/media.ts`
- Read: `apps/api/src/core/database/schema/panorama*.ts` and Phase 1C migrations
- Read: legacy/demo media references and public demo media under web assets

**Interfaces:**
- Consumes: `scene-inventory.json`
- Produces: candidate panorama records with `sceneId`, `provider`, `sourceReference`, `legacyAssetId`, `sourceAvailable`, `dimensions`, `projection`, `technicalStatus`, `rightsStatus`, `physicalMatch`, and canonical verdict

- [ ] **Step 1:** Find every panorama reference currently associated with the 19 scenes or their historical/demo equivalents.
- [ ] **Step 2:** Distinguish source image, generated manifest, preview, and tiles; a manifest alone is not a recoverable master.
- [ ] **Step 3:** Record technical evidence only when known; do not infer source dimensions from a preview.
- [ ] **Step 4:** Classify each record as `READY_TO_INGEST`, `RECOVERABLE`, `REPLACE`, `BLOCKED_RIGHTS`, or `NOT_REQUIRED`.
- [ ] **Step 5:** Commit with `docs(content): audit existing panorama candidates`.

### Task 3: Official Hà Tĩnh / Star Global external candidate inventory

**Files:**
- Create: `content-readiness/external-candidates.json`
- Create: `content-readiness/reference-sources.md`

**Interfaces:**
- Consumes: canonical scene inventory and publicly accessible official viewer/resources
- Produces: discovery records with `provider`, `destination`, `viewName`, `publicUrl`, `downloadMechanism`, `captureType`, `candidateSceneIds`, `technicalEvidence`, `usageLane`, and `rightsEvidence`

- [ ] **Step 1:** Inventory publicly visible official Hà Tĩnh 3D/360 destinations and scene/view names without bypassing access controls.
- [ ] **Step 2:** Where the official viewer exposes a public download action, record the exact public download mechanism and downloaded file metadata; otherwise record `downloadMechanism: null`.
- [ ] **Step 3:** Mark files obtained via an official public download as `usageLane: demo-only-official-download` until production rights evidence exists.
- [ ] **Step 4:** For each downloaded panorama, inspect actual width/height, MIME, file size, checksum, and whether it is a full 2:1 equirectangular source rather than a screenshot/preview.
- [ ] **Step 5:** Map candidate views to canonical scenes using only high-confidence physical matches; ambiguous matches remain unassigned.
- [ ] **Step 6:** Commit with `docs(content): catalogue official Ha Tinh 360 candidates`.

### Task 4: Audio and transcript readiness audit

**Files:**
- Create: `content-readiness/audio-inventory.json`
- Create: `content-readiness/transcript-inventory.json`
- Read: `apps/api/src/core/database/schema/immersive-audio.ts`

**Interfaces:**
- Consumes: 4 destinations and 19 canonical scenes
- Produces: 4 ambient target records, 19 VI narration target records, 19 VI transcript target records with current evidence/status

- [ ] **Step 1:** Enumerate all current production/demo audio tracks and transcript assignments.
- [ ] **Step 2:** Separate `demo-only` from `customer-owned`/`licensed` material.
- [ ] **Step 3:** Audit track file presence, media asset status, duration, locale, rights holder/reference, version, and assignment.
- [ ] **Step 4:** Audit transcript presence, locale, rights, assignment, and narration parity.
- [ ] **Step 5:** Generate exact missing counts instead of assuming 4/19/19 are all missing.
- [ ] **Step 6:** Commit with `docs(content): audit immersive audio and transcripts`.

### Task 5: Acquisition gap report and gate verdict

**Files:**
- Create: `content-readiness/acquisition-gaps.json`
- Create: `content-readiness/CONTENT-READINESS-AUDIT.md`

**Interfaces:**
- Consumes: all four audit inventories
- Produces: exact acquisition/recovery worklist and a gate verdict for Phase 2

- [ ] **Step 1:** Aggregate per-scene panorama verdicts and per-destination/scene audio/transcript verdicts.
- [ ] **Step 2:** Produce counts for recoverable panorama, rights-blocked panorama, replacement panorama, ready panorama, missing ambient, missing VI narration, and missing VI transcript.
- [ ] **Step 3:** Prioritize recovery order: official Hà Tĩnh/Star Global candidate → existing project source → direct/local source → open licensed source → mapping imagery fallback → new capture.
- [ ] **Step 4:** State `CONTENT READY = YES` only if every required production asset has acceptable evidence and is ready for content-only ingestion/assignment; otherwise remain blocked with explicit reasons.
- [ ] **Step 5:** Post the summary and exact blockers to GitHub Issue #31.
- [ ] **Step 6:** Commit with `docs(content): finalize content readiness audit`.

### Task 6: Demo panorama ZIP handoff

**Files:**
- Local/output only: `hatinh-360-demo-candidates.zip`
- Include: `README.txt`, `manifest.json`, and only panorama files actually obtained through public/official download mechanisms or other explicitly reusable sources

**Interfaces:**
- Consumes: Task 3 downloaded demo-only candidates plus any clearly reusable project-owned/open assets
- Produces: a user-downloadable ZIP for demo/reference use; does not change production DB or rights classification

- [ ] **Step 1:** Copy only legitimately obtained candidate files into a clean staging directory grouped by destination.
- [ ] **Step 2:** Generate `manifest.json` with source URL, provider, acquisition timestamp, checksum, dimensions, and `usageLane` for every file.
- [ ] **Step 3:** Exclude screenshots, low-resolution previews, broken/corrupt files, and any resource requiring bypass of access controls.
- [ ] **Step 4:** Create `hatinh-360-demo-candidates.zip`.
- [ ] **Step 5:** Verify the ZIP opens and every listed file checksum matches the manifest.
- [ ] **Step 6:** Hand the ZIP to the user separately from production content acceptance.
