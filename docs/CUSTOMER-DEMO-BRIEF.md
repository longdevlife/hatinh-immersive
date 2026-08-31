# Hà Tĩnh Tourism Demo — Customer & Execution Brief

**Status:** Approved operating brief  
**Current execution phase:** **Phase 1D — Content Readiness & Demo Enablement**  
**Primary near-term product focus:** **Home / Discovery + Immersive 360**  
**Repository:** `longdevlife/hatinh-immersive`

> Read this document before continuing customer-demo work.
>
> If this brief conflicts with older documents about the **current demo scope**, follow the latest explicit user direction represented here. This brief does **not** override stable renderer, state, API, media, lifecycle, or verification invariants in `AGENTS.md` and `docs/ARCHITECTURE.md`.

---

## 1. What the customer actually asked for

The customer wants a Hà Tĩnh tourism website that helps visitors discover places, understand what is worth visiting, and understand **how to go**.

The customer document explicitly includes a section equivalent to:

> **“Lịch trình & Bản đồ — Đi thế nào?”**

with 1-day, 2N1Đ, and 3N2Đ journey concepts, maps, movement guidance, and directions.

A concrete 2-day example discussed from the customer document is:

```text
Day 1
Khu lưu niệm Nguyễn Du
→ Biển Xuân Thành
→ Sơn Trang Cổ Đạm
→ dinner
→ bungalow

Day 2
Nông trại
→ workshop
→ cultural experience
→ buy local specialties
→ return
```

The customer also wants a contextual cultural bridge such as:

```text
Nguyễn Du / Truyện Kiều
→ khu vực Cổ Đạm
→ Ca trù / Vườn Kiều / làng nghề
→ Sơn Trang Cổ Đạm
```

### Important interpretation

The customer document does **not** mean that a 360 camera must continuously travel from Nguyễn Du to Sơn Trang.

The regional journey/map and the internal immersive tour are different product layers:

```text
REGIONAL / ITINERARY LAYER
Nguyễn Du → Xuân Thành → Sơn Trang

IMMERSIVE DESTINATION LAYER
linked 360 viewpoints inside one destination
```

The 360 experience is an added demo/product direction intended to make the proposal more persuasive and immersive.

---

## 2. What we are building now

For the current customer-demo cycle, focus on:

### P0 now

- strong Home / discovery presentation;
- discovery by visitor needs/interests;
- destination recommendation cards;
- a compelling entry into immersive 360;
- real multi-scene 360 where usable media exists;
- scene-to-scene navigation;
- hotspots;
- minimap / scene spatial awareness where useful;
- story/info media;
- narration and ambient audio experience;
- Auto Tour;
- Sơn Trang Cổ Đạm as an important contextual showcase, without turning the whole site into a Sơn Trang advertisement.

### Preserve but do not prioritize implementation yet

- curated itinerary/map presentation;
- customer journey examples;
- regional “Đi thế nào?” experience.

These remain customer requirements and must not be forgotten, but they must not block Home + Immersive 360 demo progress.

### Not in the current implementation focus

- full Trip Builder;
- automatic 1-day / 2N1Đ / 3N2Đ itinerary generation;
- route optimization;
- real booking;
- payments;
- CRM;
- QR check-in;
- inventory / availability;
- Web Admin;
- W1–W13 operational system;
- complex backend personalization.

UI mock states are allowed if they improve the customer demo, but do not build unnecessary backend workflows.

---

## 3. Current demo happy path

The current frontend should support this story:

```text
HOME
↓
“Bạn muốn khám phá điều gì?”
↓
visitor selects needs/interests
↓
recommendation cards update
↓
open a destination
↓
“Khám phá 360°”
↓
linked panorama scenes
↓
hotspot / story / navigation
↓
minimap / scene awareness
↓
ambient + narration + transcript
↓
Auto Tour
↓
exit / discover another destination
```

Do not wait for every production asset before polishing this flow.

---

## 4. Current phase model

### Completed foundation

```text
Phase 1A–1C
engineering foundation
+ panorama/audio contracts
+ ingestion pipeline
+ fail-closed public media behavior
= DONE
```

### Current phase

```text
Phase 1D — Content Readiness & Demo Enablement
```

Phase 1D intentionally has two parallel tracks.

#### Track 1D-A — Content Readiness

```text
scene discovery
→ physical verification
→ panorama mapping
→ rights/provenance/version evidence
→ audio/narration/transcript readiness
→ production ingestion
→ runtime verification
```

Codex owns engineering/data integration. AGY may assist visual/physical verification.

#### Track 1D-B — Demo Enablement

```text
Home / Discovery
→ recommendation interaction
→ 360 entry
→ multi-scene viewer polish
→ hotspots
→ scene rail
→ minimap
→ audio/story UI
→ Auto Tour
→ Sơn Trang showcase shell
→ responsive/presentation polish
```

This track may use clearly labeled demo media to develop UX. Demo media must not be promoted to production truth.

### Next phase

Do **not** call the current work Phase 2.

Phase 2 starts after the Phase 1D content/model gate is sufficiently stable:

```text
Phase 2 — Contract Freeze & Product Acceptance
```

Then:

```text
Phase 3 — Presentation / UI Final Polish
Phase 4 — Sơn Trang Production Content & Release Hardening
```

---

## 5. Scene truth model

Every scene must carry one of these truth states during Phase 1D:

### `CONFIRMED`

Physical identity and evidence are established and the asset mapping is verified.

### `PROVISIONAL`

Useful for product storytelling/demo intent, but physical mapping is not yet locked.

### `UNVERIFIED`

Claimed or suggested by a source/agent but insufficient evidence is available.

Agents must not silently promote `PROVISIONAL` or `UNVERIFIED` content to production truth simply to fill scene counts.

---

## 6. Canonical scene baseline

The current architecture has **19 canonical scene IDs** across four destinations.

### Sơn Trang Cổ Đạm — 8 canonical IDs

```text
son-trang-gate
son-trang-entrance-path
son-trang-courtyard
son-trang-culture
son-trang-ecology-path
son-trang-ecology
son-trang-spiritual-path
son-trang-spiritual
```

The IDs are canonical engineering identifiers, but physical names/coordinates are not yet sufficiently verified to treat the current labels as final customer-facing truth.

### Thiên Cầm — 3 canonical IDs

```text
thien-cam-boardwalk
thien-cam-shore
thien-cam-lookout
```

These three have existing repository demo panoramas usable for **multi-scene UX development**. They are not production-quality source masters.

### Khu lưu niệm Nguyễn Du — 4 canonical IDs

```text
nguyen-du-courtyard
nguyen-du-memorial-house
nguyen-du-statue
nguyen-du-garden-path
```

External official-platform research has found promising ground panorama candidates. Do not map numbered external scenes to these canonical scenes by guess or by ordering alone. Visual/physical verification is required.

### Ngã ba Đồng Lộc — 4 canonical IDs

```text
dong-loc-memorial
dong-loc-monument
dong-loc-remembrance
dong-loc-approach
```

Keep external-source availability **UNVERIFIED** until new evidence provides concrete scene IDs/URLs/artifacts and visual confirmation.

---

## 7. Sơn Trang provisional storytelling blueprint

The customer-facing Sơn Trang experience should eventually tell a coherent internal story. For design purposes, use the following as **PROVISIONAL STORY INTENT**, not as confirmed physical mapping:

```text
01 Cổng / khu đón khách
02 Lối vào / cảnh quan
03 Nông trại / trải nghiệm sinh thái
04 Vườn Kiều
05 Không gian Ca trù / văn hóa
06 Không gian trải nghiệm địa phương
07 Nhà hàng / ẩm thực
08 Bungalow / nghỉ dưỡng
```

Do not rename canonical scene IDs or invent coordinates merely to force this sequence.

Required workflow:

```text
candidate panorama
→ identify physical place
→ verify it belongs to the destination
→ compare to story intent
→ record evidence
→ CONFIRMED or REJECTED
→ only then lock customer-facing mapping
```

---

## 8. What every production-capable scene ultimately needs

A complete scene record should be able to provide:

```text
Scene
├── physical identity
├── canonical scene ID
├── customer-facing title
├── panorama 360 source/derivatives
├── thumbnail / preview
├── coordinates
├── initial heading / pitch / FOV
├── navigation links
├── hotspot positions
├── story/info content
├── VI narration
├── VI transcript
├── optional localized transcript/content
├── provenance / source
├── rights metadata
└── media/content version
```

Do not fabricate missing coordinates, provenance, rights, or cultural facts.

---

## 9. Panorama rules

### Production target

Preferred source:

```text
2:1 equirectangular panorama
minimum 4096×2048
preferred 8192×4096 where available
no upscale
```

The existing pipeline generates preview + multiresolution tiles + manifest.

### Demo lane

Lower-resolution existing repository assets may be used to develop:

- viewer UX;
- scene navigation;
- hotspots;
- scene rail;
- minimap synchronization;
- audio/story presentation;
- Auto Tour;
- responsive layout.

They must remain clearly classified as demo/reference content.

### Never do this

- duplicate one panorama into many fake physical scenes;
- crop a normal photo and call it a 360 panorama;
- use a WebGL screenshot as an equirectangular panorama master;
- invent source/provenance/rights;
- treat 256×128 or 2048×1024 demo media as production-quality source masters;
- guess physical scene mapping from file order alone.

External public viewer resources may be used for research/evidence. Browser-readable resources are not automatically a reusable production content license.

---

## 10. Audio, ambient music, narration, and presentation

The repository already has audio architecture/contracts. Phase 1D must populate and validate content without replacing that architecture.

### Target inventory

- **4 destination ambient tracks** — one per destination;
- **19 Vietnamese scene narrations** — one per canonical scene where required;
- **19 Vietnamese transcripts** corresponding to narration;
- provenance/rights/version metadata for production audio.

Current repository placeholders are not production audio.

### Ambient direction

Ambient should support atmosphere but never overpower narration.

Provisional creative direction:

```text
Sơn Trang
→ restrained nature ambience; wind/birds/local environment only when source-appropriate

Thiên Cầm
→ gentle coastal/wave ambience

Nguyễn Du
→ subtle, calm, culturally respectful ambience

Đồng Lộc
→ very restrained and respectful; avoid entertainment-like treatment
```

Use audio ducking: narration lowers ambient while speaking and restores it afterward.

### Narration style

Vietnamese narration should:

- be concise;
- sound like a guided tourism story, not a brochure being read aloud;
- explain why the scene matters;
- avoid invented historical/cultural claims;
- be synchronized with transcript content;
- generally target roughly **20–45 seconds per scene**, adjusted when the content warrants less or more.

### Provisional Sơn Trang narration intent

```text
Cổng / khu đón khách
→ short introduction to Sơn Trang and Cổ Đạm

Nông trại / ecology
→ family/local agriculture/participatory experience

Vườn Kiều
→ cultural connection to Nguyễn Du / Truyện Kiều only when verified content supports it

Ca trù / cultural space
→ heritage and cultural-performance context, with verified wording

Food / restaurant
→ local culinary experience

Bungalow / stay
→ nature/relaxation and a natural tour closing moment
```

Do not fabricate narration facts merely to make the demo sound complete. Mark copy as draft until source facts are verified.

---

## 11. Home / Discovery product direction

The Home page should communicate value within the first 30 seconds.

Preferred structure:

```text
Cinematic Hà Tĩnh hero
↓
“Bạn muốn khám phá điều gì?”
↓
interest / audience chips
↓
“Gợi ý dành cho bạn”
↓
destination / experience cards
↓
360 featured entry
↓
contextual Sơn Trang feature
↓
stories / guide content
```

Example interest dimensions:

```text
Thiên nhiên
Biển
Văn hóa – Di sản
Ẩm thực
Gia đình
Trẻ em
Nghỉ dưỡng
Check-in
Trải nghiệm địa phương
```

For the demo, recommendation may be deterministic frontend tag matching. Do not build a complex AI recommendation backend unless explicitly requested later.

Sơn Trang should appear because it matches visitor context, not because every path is forced toward Sơn Trang.

---

## 12. Immersive 360 demo acceptance target

The nearest demo milestone does **not** require 19/19 production scenes.

A useful customer-demo vertical slice requires at least:

- one destination with **3+ distinct usable panorama scenes**;
- real scene-to-scene navigation behavior;
- drag/touch look-around;
- zoom;
- fullscreen;
- navigation hotspots;
- at least one story/info interaction;
- scene rail / scene selector;
- minimap or equivalent scene-spatial awareness where appropriate;
- ambient audio UX;
- narration + transcript flow;
- Auto Tour;
- graceful missing-media/failure behavior;
- desktop and mobile usability.

Thiên Cầm is currently the practical first multi-scene UX reference because three repository demo panoramas already exist.

Sơn Trang remains the strategic showcase, but do not fake its production content while real scene mapping is incomplete.

---

## 13. Codex instructions

Codex is the engineering/data integration owner.

Codex should:

1. Read this brief, `AGENTS.md`, current architecture, and current Phase 1D content audit before changing implementation.
2. Continue Home/360 engineering and integration even while production content is incomplete.
3. Use existing demo assets only in explicit demo/test lanes.
4. Keep Photo Sphere Viewer persistent across scene-to-scene transitions.
5. Keep vendor SDK/state/API responsibilities behind existing boundaries.
6. Continue scene/panorama evidence collection and physical mapping.
7. Record scene truth as confirmed/provisional/unverified rather than guessing.
8. Prepare/ingest verified panorama, ambient, narration, transcript, provenance, rights, and version data through existing pipelines.
9. Preserve fail-closed production media behavior.
10. Ask AGY for bounded visual verification/presentation work after contracts are clear.
11. Do not independently redesign the final presentation system.
12. Report evidence when claiming a scene or content source is verified.

### Codex content priority

```text
1. Thiên Cầm — establish polished 3-scene immersive vertical slice
2. Nguyễn Du — physically map verified official candidates
3. Sơn Trang — aggressively close the real-content gap because it is the strategic showcase
4. Đồng Lộc — proceed when source evidence is concrete
```

This priority is for current demo/content work, not a statement of tourism importance.

---

## 14. AGY instructions

AGY is presentation/UI and browser-visual verification support.

AGY should focus on:

- Home visual hierarchy;
- destination-card presentation;
- immersive viewer composition;
- hotspot readability;
- scene rail/thumbnail presentation;
- minimap presentation;
- Media Dock / audio controls;
- information/story panels;
- transitions and micro-interactions;
- desktop/mobile visual QA;
- visual/physical comparison of candidate panorama scenes when evidence is required.

AGY must not independently change:

- domain contracts;
- router semantics;
- Zustand ownership;
- API/OpenAPI contracts;
- Photo Sphere Viewer lifecycle semantics;
- audio orchestration semantics;
- production media publication rules.

When AGY claims a candidate represents a physical scene, provide a screenshot/artifact/source reference supporting the claim.

---

## 15. Phase 1D → Phase 2 gate

Phase 1D can continue demo work while content remains incomplete.

Move to **Phase 2 — Contract Freeze & Product Acceptance** only when the following are sufficiently stable to freeze without relying on fabricated assumptions:

- canonical destination set agreed for the target product slice;
- physical meaning of required scenes verified or explicitly excluded;
- at least one real/accepted multi-scene destination proves the model;
- Sơn Trang scene strategy agreed;
- panorama source strategy established;
- scene-link/heading model proven against real content;
- narration/story model agreed;
- ambient audio model agreed;
- fake coordinates/demo placeholders are not treated as production truth;
- unresolved content gaps are explicitly tracked rather than hidden.

Phase 2 freezes contracts/product behavior. It must not be used as a shortcut to declare incomplete content production-ready.

---

## 16. Source-of-truth precedence for current demo work

Resolve conflicts in this order:

1. latest explicit user/customer-project direction;
2. this `CUSTOMER-DEMO-BRIEF.md` for current demo/product scope;
3. current code and tests on the working branch;
4. newest approved Phase 1D content-readiness spec/plan for content/media audit;
5. `AGENTS.md` / architecture invariants for engineering boundaries;
6. older reference-parity/foundation documents for non-conflicting architecture/capabilities.

Do not delete old specs/plans merely because the current demo focus is narrower. Preserve them as engineering history and foundation unless an explicit migration says otherwise.
