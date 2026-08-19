# Production Immersive Audio Implementation Plan — Content Scope Amendment

> This amendment is binding together with `docs/superpowers/plans/2026-08-19-production-immersive-audio.md`. When wording conflicts, this amendment wins. It does not change the normalized audio architecture; it corrects the content/acceptance scope from Sơn Trang-only to multi-destination.

## Goal

Keep Phase 1B implementation generic for every destination while making the first content baseline explicit: 4 current immersive destinations, 19 current scenes, 19 VI narration/transcript entries, 4 destination ambient tracks, and optional Sơn Trang zone overrides.

## Global amendment

Codex MUST NOT hard-code any of these slugs into schema/domain/runtime behavior:

- `son-trang-co-dam`
- `bien-thien-cam`
- `khu-luu-niem-nguyen-du`
- `nga-ba-dong-loc`

They are content/test data, not architecture branches.

AGY MUST NOT add Sơn Trang-specific presentation logic to Media Dock or transcript components. Presentation may show scene/destination labels supplied by the frozen VM, but behavior remains generic.

## Amendment to Tasks 1–3 — DB/API contract

No schema redesign is required. The approved normalized model already supports multiple destinations.

Add/retain tests that prove:

- two different destinations can have different main ambient tracks simultaneously;
- narration assignment uniqueness is scene/locale scoped without cross-destination leakage;
- public manifest query for destination A never emits tracks/transcripts assigned only to destination B;
- referential closure is maintained independently for each destination;
- a destination with no audio assignments still returns a valid immersive manifest with null/empty audio references.

## Amendment to Task 4 — Web mapper/contracts

Mapper tests MUST use more than one destination-shaped fixture.

Required assertions:

```ts
expect(sonTrang.ambientTrackId).not.toBe(thienCam.ambientTrackId);
expect(sonTrang.panoramaNodes.every((node) => node.destinationSlug === 'son-trang-co-dam')).toBe(true);
expect(thienCam.panoramaNodes.every((node) => node.destinationSlug === 'bien-thien-cam')).toBe(true);
```

Do not encode these literal slugs into production mapper conditions; literals belong only in fixtures/tests.

## Amendment to Tasks 5–6 — Runtime and frozen VM

Before freezing the Media Dock VM/actions contract, prove that switching destination context invalidates stale audio ownership:

```text
Destination A narration/ambient active
→ navigate to Destination B
→ A transport/callback completion becomes stale
→ B resolves its own ambient/narration/transcript
→ no A audio state leaks into B UI
```

The frozen VM must carry destination/scene identity only as display/context data. UI capability must remain based on semantic facts such as playability, transcript capability, locale, and audio state.

## Amendment to Task 7 — AGY presentation

AGY receives a presentation matrix covering at least:

- Sơn Trang scene with narration + timed captions;
- Thiên Cầm scene with narration + plain transcript;
- Nguyễn Du scene with transcript but unavailable narration;
- Đồng Lộc scene with audio unavailable/silent fallback.

These may be component fixtures. They MUST NOT introduce product logic based on destination slug.

AGY remains restricted to the five previously approved presentation files.

## Amendment to Task 8 — Production-shaped E2E

The production-shaped E2E must demonstrate multi-destination correctness.

Minimum acceptable evidence:

1. one file-backed audio scenario on destination A;
2. navigate/switch to destination B with a different audio assignment;
3. destination B receives only B tracks/transcripts;
4. old destination audio ownership is stopped/discarded;
5. panorama/navigation stays usable if B audio fails or is missing;
6. EN missing narration does not fall back to VI on either destination.

A parameterized fixture is preferred over duplicate E2E harnesses.

## Amendment to Task 9 — Final status wording

Replace the old Sơn Trang-only content status with:

```text
ENGINEERING READY:
Generic schema/API/client/mapper/runtime/VM/UI/E2E pipeline verified across multiple destination slugs.

CONTENT READY:
Requires approved assets for the initial 4-destination / 19-scene baseline:
- 19 VI narration recordings;
- 19 VI transcripts;
- 4 main destination ambient tracks;
- optional Sơn Trang ecology/spiritual overrides;
- rights/provenance/version metadata;
- editorial/factual approval.
```

If these assets do not exist yet, report `CONTENT READY: BLOCKED BY APPROVED AUDIO ASSETS`, while still allowing `ENGINEERING READY` if all technical gates pass.

## Content document

Codex and AGY should read for context but MUST NOT reinterpret as code architecture:

`docs/content/2026-08-19-hatinh-immersive-audio-storytelling-v1.md`

The content document is the editorial baseline for recordings/transcripts. It is not imported directly by the application.

## Execution order remains unchanged

```text
Codex Tasks 1–6
→ freeze Media Dock VM/actions
→ herdr dispatch AGY Task 7
→ Codex Task 8 multi-destination E2E
→ Codex Task 9 verification + Draft PR
```

No new planning checkpoint is required. Codex should consume this amendment before implementation and proceed with TDD.
