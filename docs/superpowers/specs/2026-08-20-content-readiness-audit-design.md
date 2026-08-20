# Content Readiness Audit Design

**Date:** 2026-08-20
**Baseline:** `main @ 8aa64eeaefceb8fcbbf01cba13442c8dc593f8f3`
**Status:** Design for review

## Purpose

Phase 1C made panorama publication fail closed. A scene now receives public panorama URLs only when the assigned panorama is production-eligible: the media asset is `ready`, panorama metadata is `accepted`, canonical derivatives exist, and provenance fields are complete. As a result, legacy/demo panorama content no longer appears automatically in the public runtime.

The Content Readiness Audit determines what content actually exists, what can be recovered, what must be replaced, what is legally/technically usable, and what remains blocked before Phase 2 contract freeze and product acceptance.

The audit is evidence-driven and provider-neutral. It does not assume Mapillary, Star Global, existing repository media, or any other provider is suitable before evidence is collected.

## Decision

Use a **scene-first evidence audit**.

Each canonical immersive scene is the primary audit unit. For every scene we reconcile the physical place, current repository/database identity, existing media, external candidates, rights/provenance, technical quality, editorial quality, audio, transcript, and final readiness classification.

Do not begin Phase 2 contract freeze until the Content Readiness gate defined in this document is satisfied or the user explicitly changes that gate.

## Current Baseline Scope

Audit the current four-destination immersive baseline:

- Sơn Trang – Cổ Đạm: 8 canonical production scenes
- Biển Thiên Cầm: 3 scenes
- Khu lưu niệm Nguyễn Du: 4 scenes
- Ngã ba Đồng Lộc: 4 scenes

Current working total: **19 scenes**.

The audit must verify this count from current production/runtime fixtures and must not treat the old `demo-seed.ts` 12-scene Sơn Trang route as canonical production truth.

Audio/content baseline to audit:

- 4 destination ambient tracks
- 19 Vietnamese narration tracks
- 19 matching Vietnamese transcripts
- factual scene names/descriptions used by narration and presentation

## Non-Goals

This audit does not:

- redesign the immersive UI;
- weaken the Phase 1C fail-closed publication gate;
- fabricate rights metadata;
- upscale low-resolution imagery to make it pass;
- treat ordinary wide-angle photos as 360 panoramas;
- treat a technically retrievable public asset as automatically licensed for production rehosting;
- start Phase 2 feature/contract work before the content gate is resolved;
- copy a reference website pixel-for-pixel.

## Source Priority

Provider selection follows evidence, not preference.

Default discovery order:

1. Official Hà Tĩnh / Star Global 3D/360 dataset
2. Existing HaTinhProject assets and historical media references
3. Customer/local-authority-owned source files
4. Direct photographer/provider licensed source files
5. Wikimedia Commons or other explicit open-license sources
6. Mapillary / Panoramax / KartaView as coverage candidates
7. New capture

The order is a search priority, not an automatic rights verdict.

### Official Hà Tĩnh 3D/360

Public sources confirm that Hà Tĩnh operates `dulichhatinh360.com` and that Thiên Cầm, Nguyễn Du, Đồng Lộc and other destinations are digitized there. Star Global's public case study states that the Hà Tĩnh project contains 146 ground/aerial 360 views plus 170+ 2D images and narration/audio.

These assets are therefore high-value discovery/recovery candidates.

However:

`PUBLICLY VIEWABLE` or `TECHNICALLY DOWNLOADABLE` does not equal `PRODUCTION RIGHTS APPROVED`.

The audit stores evidence of source availability separately from production rights approval.

### Demo-only public downloads

If a provider exposes a genuine public download function or direct public asset URL without bypassing authentication, paywalls, DRM, access controls, or other protections, the asset may be retained as a **demo/reference candidate**.

Such an asset must remain separated from production-ready assets unless rights to self-host, transform, and redistribute are evidenced.

Demo/reference assets must never be entered into the Phase 1C production pipeline using fabricated `customer-owned` or `licensed` metadata.

## Audit Model

### 1. Canonical Scene Inventory

For each destination establish:

- destination ID and slug;
- canonical scene ID;
- scene name VI;
- sort order;
- current lat/lng;
- physical place represented;
- scene type: ground panorama, aerial panorama, or non-panorama;
- current panorama assignment;
- current narration/transcript assignments;
- legacy/demo aliases if they exist.

Required outcome: one canonical row per current production scene, with demo/legacy scenes explicitly marked non-canonical.

### 2. Physical and Factual Truth

For every scene record:

- normalized physical location name;
- coordinate confidence (`high`, `medium`, `low`);
- location evidence/source;
- factual description source(s);
- whether the scene is still a meaningful stop in the intended visitor journey;
- whether the scene should actually require a 360 panorama.

Do not freeze heading, hotspot placement, or final narration facts against invented/demo coordinates.

### 3. Existing Asset Recovery

Search current repository references, current database/storage records available to the operator, historical branches/fixtures, and provider references.

For each candidate record:

- current/legacy asset ID;
- storage key or public source URL;
- original filename if known;
- media kind;
- source availability;
- whether an original/master exists or only derivatives exist;
- checksum when file bytes are available;
- relationship to the canonical scene.

### 4. Rights and Provenance

Minimum production evidence must support the fields already required by Phase 1C:

- `rights`: `customer-owned` or `licensed`;
- `rightsHolder`;
- `rightsReference`;
- `sourceReference`;
- `version`.

The audit evidence record additionally captures when available:

- creator/photographer;
- provider;
- original source URL;
- acquisition/download date;
- license name/version;
- attribution text;
- modification/derivative obligations;
- capture date;
- evidence notes/document reference.

Never infer `licensed` merely because an image is accessible on the public web.

### 5. Panorama Technical QC

A production panorama candidate must be compatible with the existing Phase 1C processor:

- supported source type: JPEG, PNG, or WebP;
- source size <= 64 MiB;
- width >= 4096 px;
- height >= 2048 px;
- aspect ratio between 1.95:1 and 2.05:1;
- no upscale;
- input stays within the existing processor pixel limit;
- image is a real equirectangular/full 360 source rather than a cropped normal photograph.

Human visual QC additionally checks:

- physical scene match;
- horizon/level;
- seam/stitch quality;
- blur and focus;
- exposure/dynamic range;
- ghosting;
- zenith/nadir defects;
- privacy/sensitive details;
- whether visual quality is suitable for tourism presentation.

Technical validity and product quality are separate decisions.

### 6. Audio and Transcript QC

For each destination ambient track and scene narration/transcript:

- existence and source bytes;
- exact destination/scene assignment;
- `customer-owned`, `licensed`, or explicitly demo-only status as supported by the current audio model;
- rights holder/reference;
- version;
- duration;
- narration locale;
- voice/version approval;
- clipping/noise/silence review;
- transcript text parity with approved narration;
- transcript availability for accessibility.

Do not fabricate production narration using runtime SpeechSynthesis/TTS.

### 7. External Candidate Discovery

For a canonical scene that lacks a viable existing asset, search candidate providers using the physical location and coordinates.

For every provider candidate capture:

- provider name;
- provider asset/image/view ID;
- source URL;
- public availability;
- panorama type (`spherical`, `equirectangular`, aerial, ground, unknown);
- dimensions if discoverable;
- capture date if discoverable;
- creator if discoverable;
- physical match confidence;
- license/rights evidence;
- attribution/share-alike/derivative obligations;
- technical suitability;
- editorial suitability.

Mapillary/Panoramax/KartaView results are candidates only; existence of coverage is not a recommendation.

### 8. Production Runtime Acceptance

After an asset is rights-approved and passes preflight, it may move to the existing content ingestion workflow:

source -> Phase 1C ingestion -> canonical preview/tiles/manifest -> scene assignment -> public read model -> real PSV verification.

Acceptance then checks:

- manifest loads from public runtime;
- preview/tiles resolve;
- scene starts at a sensible view;
- next/previous scene navigation is coherent;
- desktop rendering;
- mobile rendering;
- narration playback;
- ambient playback;
- transcript display;
- failure/fallback behavior;
- provenance/version recorded.

## Classification

### Production verdict

Exactly one of:

- `READY_TO_INGEST` — physical match, rights evidence, technical QC and editorial QC pass; source bytes are available.
- `RECOVERABLE` — a promising source exists but one or more recoverable requirements remain, such as obtaining master bytes, confirming a document reference, or completing human QC.
- `REPLACE` — current candidate is unsuitable and a new source is required.
- `BLOCKED_RIGHTS` — technically/editorially useful source exists but production rehosting/derivative rights are not evidenced.
- `NOT_REQUIRED` — canonical product decision says this scene does not require that media type.

No `probably ready`, `almost ready`, or other ambiguous verdicts.

### Demo eligibility

Track separately from production verdict:

- `ELIGIBLE` — asset can be used in an isolated demo/reference lane under the provider's public download/use mechanism without pretending it is production licensed.
- `INELIGIBLE` — demo use is disallowed by provider controls/terms or technically unsuitable.
- `UNKNOWN` — not yet determined.

Demo eligibility never promotes a production verdict.

## Machine-readable Deliverables

Create under `content-readiness/`:

- `scene-inventory.json`
- `panorama-inventory.json`
- `audio-inventory.json`
- `transcript-inventory.json`
- `rights-evidence.json`
- `external-candidates.json`
- `acquisition-gaps.json`
- `CONTENT-READINESS-AUDIT.md`

All JSON must use deterministic ordering so diffs remain reviewable.

### Scene record

Each `scene-inventory.json` record contains:

```json
{
  "destinationSlug": "khu-du-lich-thien-cam",
  "sceneId": "example-scene-id",
  "sceneNameVi": "Example scene",
  "sortOrder": 0,
  "lat": 0,
  "lng": 0,
  "physicalLocation": "Example physical location",
  "coordinateConfidence": "low",
  "locationEvidence": [],
  "requiresPanorama": true,
  "canonical": true,
  "legacyAliases": []
}
```

### Panorama candidate record

```json
{
  "sceneId": "example-scene-id",
  "provider": "official-hatinh360",
  "providerAssetId": null,
  "sourceUrl": null,
  "sourceAvailability": "unknown",
  "captureType": "unknown",
  "widthPx": null,
  "heightPx": null,
  "physicalMatchConfidence": "unknown",
  "rightsStatus": "unknown",
  "rightsHolder": null,
  "rightsReference": null,
  "sourceReference": null,
  "version": null,
  "checksumSha256": null,
  "technicalQc": "pending",
  "editorialQc": "pending",
  "productionVerdict": "RECOVERABLE",
  "demoEligibility": "UNKNOWN"
}
```

The implementation may add narrowly-scoped fields but must not weaken or rename the canonical verdicts without a design update.

## Content Ready Gate

The current site-wide gate is satisfied when:

1. the canonical 19-scene inventory is reconciled;
2. every scene requiring panorama has a production panorama that has passed rights, technical and editorial QC and has been ingested/assigned successfully;
3. four destination ambient tracks are production-ready;
4. nineteen Vietnamese narrations are production-ready;
5. nineteen corresponding Vietnamese transcripts are production-ready and match narration;
6. no production asset relies on fabricated provenance;
7. real PSV desktop/mobile/public runtime acceptance passes for the four baseline destinations;
8. all unresolved gaps are zero or explicitly changed by the user as a product-scope decision.

Until then:

- `ENGINEERING READY = YES`
- `CONTENT READY = BLOCKED`
- `PHASE 2 = BLOCKED BY CONTENT GATE`

## Roles

### Codex

Owns repository/data audit and machine-readable evidence skeleton:

- enumerate canonical scene/runtime references;
- trace legacy/current media references;
- populate technical metadata that can be measured objectively;
- build deterministic audit files;
- perform ingestion/assignment only after individual assets are approved.

Codex must not invent legal conclusions or change production business rules to make content pass.

### ChatGPT

Owns:

- audit design and acceptance rules;
- external source research;
- provenance/rights classification policy;
- independent review and final readiness gate;
- contradiction resolution.

### AGY

Owns post-ingestion presentation verification:

- real panorama visual QA;
- desktop/mobile browser acceptance;
- audio/transcript presentation verification;
- presentation defects only, not backend/domain bypasses.

### User/content owner

Owns final product direction and approval of physical/factual content and any business decision that changes the production gate.

## Reference Research

- Hà Tĩnh official 3D/360 platform: https://dulichhatinh360.com/
- Hà Tĩnh provincial article confirming digitized destinations and platform operation: https://hatinh.gov.vn/vi/bai-viet/ha-tinh-day-manh-so-hoa-du-lich-lan-toa-hinh-anh-diem-den-tren-nen-tang-3d360
- Provincial investment portal listing Thiên Cầm and other digitized destinations: https://xuctiendautu.hatinh.gov.vn/articles/800
- Star Global Hà Tĩnh case study describing 146 360 ground/aerial views and 170+ 2D images: https://starglobal3d.com/blog/case-studies-8/so-vhtt-du-lich-ha-tinh-36
- Creative Commons BY 4.0 license reference: https://creativecommons.org/licenses/by/4.0/
- Wikimedia reuse guidance: https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
- Photo Sphere XMP reference: https://developers.google.com/streetview/spherical-metadata
- WCAG 2.2: https://www.w3.org/TR/WCAG22/

## Acceptance of this design

Once this design is approved, the next artifact is a Superpowers implementation plan that decomposes the audit into independently reviewable tasks. No production content mutation occurs before the audit inventory and evidence rules are in place.