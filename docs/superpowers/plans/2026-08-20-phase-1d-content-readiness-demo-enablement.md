# Phase 1D — Content Readiness & Demo Enablement

**Status:** Approved bridge roadmap  
**Date:** 2026-08-20  
**Branch:** `content-readiness-audit`  
**Previous phase:** Phase 1C — engineering foundation complete  
**Next phase:** Phase 2 — Contract Freeze & Product Acceptance

## Purpose

Phase 1C completed the engineering foundation needed for production-shaped panorama/audio handling. The project is **not yet ready to jump directly into Phase 2 contract freeze** because physical scene identity, production panorama content, and production audio/story content are still incomplete.

Phase 1D is therefore the intentional bridge between Phase 1C and Phase 2.

It has two tracks that execute in parallel:

```text
Phase 1C DONE
    ↓
Phase 1D
├── 1D-A Content Readiness
└── 1D-B Demo Enablement
    ↓
Phase 2 Contract Freeze & Product Acceptance
```

This roadmap does not delete or invalidate earlier engineering specs/plans. It narrows the current execution priority and makes the content/demo relationship explicit.

Read `docs/CUSTOMER-DEMO-BRIEF.md` before executing this phase.

---

## Track 1D-A — Content Readiness

### Objective

Establish truthful, evidence-backed scene/media/story inputs that can later be frozen into production contracts without inventing physical facts.

### Workstream A1 — Scene identity

For all 19 canonical scene IDs:

- establish physical identity where evidence exists;
- record customer-facing scene title only after evidence supports it;
- verify coordinates rather than copying legacy/demo guesses;
- classify each scene as `CONFIRMED`, `PROVISIONAL`, or `UNVERIFIED`;
- reject false/duplicate scene mappings.

### Workstream A2 — Panorama acquisition/mapping

For each target scene:

- locate existing repository asset or external/customer candidate;
- verify that the panorama depicts the intended physical place;
- record resolution and source format;
- record provenance/rights/version evidence for production candidates;
- keep demo assets clearly separate from production candidates;
- ingest verified production assets through the existing panorama pipeline.

Production target remains:

```text
2:1 equirectangular source
minimum 4096×2048
preferred 8192×4096
no upscale
```

### Workstream A3 — Audio/content readiness

Required target inventory:

- 4 destination ambient tracks;
- 19 VI narration tracks where required;
- 19 corresponding VI transcripts;
- verified story/factual copy;
- provenance/rights/version metadata.

Do not fabricate cultural/historical facts merely to fill narration slots.

### Workstream A4 — Runtime verification

After verified content is ingested:

- verify public read-model behavior;
- verify preview/manifest/tile loading;
- verify narration/ambient assignment;
- verify fail-closed behavior for incomplete content;
- verify real scene navigation in browser.

---

## Track 1D-B — Demo Enablement

### Objective

Continue building a persuasive customer-facing frontend while production content work is still running.

Demo Enablement is allowed to use explicit demo/reference media. It must not weaken production publication gates.

### Workstream B1 — Home / Discovery

Prioritize:

- cinematic Hà Tĩnh hero;
- “Bạn muốn khám phá điều gì?” interaction;
- interest/audience chips;
- deterministic recommendation cards;
- visible explanation of recommendation fit where useful;
- strong 360 entry/teaser;
- contextual Sơn Trang feature without forced advertising.

### Workstream B2 — Multi-scene immersive vertical slice

Use Thiên Cầm as the first practical 3-scene UX reference because repository demo media already exists for:

```text
thien-cam-boardwalk
thien-cam-shore
thien-cam-lookout
```

Polish:

- Photo Sphere Viewer interaction;
- persistent scene-to-scene navigation;
- navigation hotspots;
- story/info hotspot;
- scene rail;
- fullscreen;
- minimap/spatial awareness;
- failure/retry behavior;
- desktop/mobile layout.

### Workstream B3 — Audio/story presentation

Prove the full UX with demo/draft content where needed:

- ambient playback;
- narration playback;
- ducking;
- transcript/info presentation;
- Media Dock behavior;
- missing-track states.

Production audio readiness remains governed by Track 1D-A.

### Workstream B4 — Auto Tour

Prove a coherent curated automatic sequence using the same canonical scene graph and audio/story surfaces.

Do not create a second scene source solely for Auto Tour.

### Workstream B5 — Sơn Trang showcase shell

Build a flexible presentation shell that can accept verified real content later.

Use the following only as provisional storytelling intent:

```text
Cổng / khu đón khách
→ Lối vào / cảnh quan
→ Nông trại / sinh thái
→ Vườn Kiều
→ Ca trù / văn hóa
→ Trải nghiệm địa phương
→ Nhà hàng / ẩm thực
→ Bungalow / nghỉ dưỡng
```

Do not lock these labels to canonical scene IDs without physical verification.

---

## Execution ownership

### Codex

Owns:

- domain/model/contracts;
- scene/media evidence structures;
- panorama/audio ingestion;
- source policies;
- renderer/state/router/API integration;
- focused tests and repository gates;
- final integration.

Codex must continue demo engineering while content is incomplete. Missing production content is not permission to weaken production gates and is not a reason to stop all frontend progress.

### AGY

Owns presentation/visual work after bounded contracts are clear:

- Home composition;
- typography/spacing;
- destination-card presentation;
- 360 chrome;
- scene rail;
- minimap visual treatment;
- Media Dock visuals;
- story/info panel visuals;
- responsive behavior;
- motion/cinematic polish;
- visual comparison of candidate scenes when requested.

AGY must not redefine router/state/audio/PSV/domain semantics.

### ChatGPT / architecture review

Owns:

- current source-of-truth interpretation;
- scene blueprint intent;
- contradictions between customer scope and implementation plans;
- acceptance gates;
- approval before content/model assumptions become frozen.

---

## Current content priority

For Phase 1D execution:

```text
1. Thiên Cầm
   → polish a truthful 3-scene demo vertical slice

2. Nguyễn Du
   → physically map official/external candidates to canonical scenes

3. Sơn Trang
   → close the real-content gap aggressively because it is the strategic showcase

4. Đồng Lộc
   → keep external availability unverified until concrete evidence exists
```

This is an execution priority, not a ranking of destination importance.

---

## Phase 1D demo-ready checkpoint

The project may be considered **demo-vertical-slice ready** when fresh verification shows:

- Home/discovery presentation is coherent;
- recommendation interaction works;
- one destination has at least 3 distinct usable panorama scenes;
- scene-to-scene navigation works in one persistent viewer;
- hotspot navigation works;
- at least one story/info interaction works;
- scene rail works;
- minimap/spatial awareness works where enabled;
- ambient/narration/transcript flow is demonstrated;
- Auto Tour works;
- missing-media states are graceful;
- desktop/mobile presentation is usable.

This checkpoint is **not** the same as `CONTENT READY` or production release readiness.

---

## Phase 1D → Phase 2 gate

Begin **Phase 2 — Contract Freeze & Product Acceptance** only when the following are sufficiently stable:

- target destination set agreed;
- required physical scene meanings verified or explicitly excluded;
- at least one accepted multi-scene destination proves the model;
- Sơn Trang scene strategy agreed;
- panorama source strategy established;
- scene-link/heading model proven against real content;
- narration/story model agreed;
- ambient-audio model agreed;
- fake/demo coordinates are not treated as production truth;
- unresolved gaps are explicit and bounded.

Phase 2 should freeze truthful contracts and product behavior, not freeze guesses.

---

## Relationship to older plans

Earlier specs/plans remain valid for non-conflicting engineering architecture.

Current execution precedence:

```text
latest explicit user direction
→ docs/CUSTOMER-DEMO-BRIEF.md
→ this Phase 1D bridge roadmap
→ current branch code/tests
→ current content-readiness spec/plan for audit mechanics
→ AGENTS.md / architecture invariants
→ older non-conflicting milestone/foundation docs
```

Do not delete old plans merely because Phase 1D changes current execution priority.
