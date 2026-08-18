# Production Immersive Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. **Repository override:** do not create worktrees; use the existing single physical checkout only. Codex remains implementation lead and may use `herdr dispatch` only for the AGY presentation task after the Media Dock VM/actions contract is frozen.

**Goal:** Connect approved file-backed ambient audio, localized narration, transcripts, provenance metadata, and production playback capability to the existing immersive manifest and audio lifecycle without changing panorama/navigation semantics.

**Architecture:** Reuse `media_assets` as the only physical file registry and add normalized immersive-audio semantic/assignment tables. The public immersive manifest is the single API request and must be referentially closed. The existing browser-file source, `AudioController`, `AudioTourCoordinator`, Auto Tour controller, and Media Dock remain the runtime architecture; Phase 1B extends their inputs and presentation facts rather than replacing them.

**Tech Stack:** Node 24, pnpm 11.3.0, NestJS, PostgreSQL, Drizzle ORM, OpenAPI generated client, React 19, TypeScript 6, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-19-production-immersive-audio-design.md` at/after commit `9e40298b6f56a32793bc4538842d747e1ae41181`.

## Global Constraints

- Base branch ancestry must include `6db1fc2f99e545b321d2716c8c14adefb0a83dd8` (PR #25 merge).
- Work only on `feat/production-immersive-audio-content`; never implement on `main`.
- Exactly one physical checkout. No `git worktree add`, no clone-per-task, no parallel branches.
- TDD for every behavior change: RED test first, verify failure, minimal GREEN, verify pass, then refactor.
- No runtime production SpeechSynthesis/TTS. `demo-speech-synthesis` remains demo-only.
- Audio failure never blocks panorama or navigation.
- No silent EN → VI narration fallback.
- No `new Audio()`, `speechSynthesis`, business `setTimeout`, or business `requestAnimationFrame` in presentational React.
- `AutoTourController` remains the only Auto Tour progression owner.
- Do not restart the same destination ambient track on ordinary scene changes.
- Every public non-null audio/transcript reference must resolve to an object in the same manifest.
- Internal provenance (`rightsHolder`, `rightsReference`, inheritance flag) must never leak into the public manifest.
- `voiceId` is metadata only; it never activates TTS. `version` is the approved content revision.
- Transcript timing is explicit: `plain` or `timed`; UI must consume explicit caption capability, not infer it from timestamps.
- Phase 2, Phase 3 cinematic redesign, Google 3D, real panorama ingestion, booking/chatbot/CMS expansion are out of scope.
- Approved production audio content is an external blocker; test fixtures must be explicitly test-only.

---

## File Map

### API/database
- Create: `apps/api/src/core/database/schema/immersive-audio.ts`
- Modify: `apps/api/src/core/database/db.ts`
- Create: `apps/api/src/core/database/migrations/0005_immersive_audio.sql`
- Create: `apps/api/src/core/database/migrations/meta/0005_snapshot.json` via the repository's Drizzle generation flow
- Modify: `apps/api/src/core/database/migrations/meta/_journal.json` via generation flow
- Create: `apps/api/src/core/database/immersive-audio.spec.ts`
- Modify: `apps/api/src/modules/virtual-tour/application/virtual-tour.repository.ts`
- Modify: `apps/api/src/modules/virtual-tour/application/virtual-tour.queries.ts`
- Modify: `apps/api/src/modules/virtual-tour/infrastructure/drizzle-virtual-tour.repository.ts`
- Modify: `apps/api/src/modules/virtual-tour/presentation/http/virtual-tour.dto.ts`
- Modify: `apps/api/src/modules/virtual-tour/presentation/http/virtual-tour.controller.ts` only if DTO mapping is controller-owned
- Modify: `apps/api/src/core/http/openapi.schemas.ts`
- Add/modify the nearest existing virtual-tour query/controller tests rather than creating duplicate test harnesses.

### Generated contract/web mapping
- Regenerate: `packages/api-client/openapi.json`
- Regenerate: `packages/api-client/src/generated/**`
- Modify: `apps/web/src/shared/contracts/immersive.ts`
- Modify: `apps/web/src/modules/immersive-navigation/api/immersive-manifest.mapper.ts`
- Modify: `apps/web/src/modules/immersive-navigation/api/immersive-manifest.mapper.test.ts`

### Runtime/domain
- Modify: `apps/web/src/modules/immersive-audio/domain/audio-experience.resolver.ts`
- Modify: `apps/web/src/modules/immersive-audio/domain/audio-experience.resolver.test.ts`
- Modify only if a failing lifecycle test requires it: `apps/web/src/modules/immersive-audio/domain/audio.controller.ts`
- Modify corresponding tests: `apps/web/src/modules/immersive-audio/domain/audio.controller.test.ts`
- Modify: `apps/web/src/modules/immersive-audio/adapters/immersive-audio-source.ts`
- Modify: `apps/web/src/modules/immersive-audio/adapters/immersive-audio-source.test.ts`
- Modify only if file-backed behavior requires adapter coverage: `apps/web/src/modules/immersive-audio/adapters/browser-audio.adapter.ts`
- Test: `apps/web/src/modules/immersive-audio/adapters/browser-audio.adapter.test.ts`
- Modify: `apps/web/src/modules/immersive-navigation/ui/useImmersiveAudioTour.ts`
- Modify: `apps/web/src/modules/immersive-navigation/ui/useImmersiveAudioTour.test.ts`

### Frozen Media Dock contract / AGY presentation
- Modify: `apps/web/src/modules/immersive-navigation/ui/reference-parity.presentation.ts`
- Modify: `apps/web/src/modules/immersive-navigation/ui/reference-parity.presentation.test.ts`
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.tsx`
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.media-dock.test.tsx`
- AGY-only after freeze: `apps/web/src/modules/immersive-navigation/ui/ImmersiveMediaDock.tsx`
- AGY-only after freeze: `apps/web/src/modules/immersive-navigation/ui/ImmersiveMediaDock.css`
- AGY-only after freeze: `apps/web/src/modules/immersive-navigation/ui/ImmersiveMediaDock.test.tsx`
- AGY-only after freeze: `apps/web/src/modules/immersive-navigation/ui/ImmersiveTranscriptPanel.tsx`
- AGY-only after freeze: `apps/web/src/modules/immersive-navigation/ui/ImmersiveTranscriptPanel.test.tsx`

---

### Task 1: Add normalized immersive-audio database contract

**Owner:** Codex

**Files:**
- Create: `apps/api/src/core/database/schema/immersive-audio.ts`
- Modify: `apps/api/src/core/database/db.ts`
- Create: `apps/api/src/core/database/immersive-audio.spec.ts`
- Generate/create: `apps/api/src/core/database/migrations/0005_immersive_audio.sql`
- Generate: `apps/api/src/core/database/migrations/meta/0005_snapshot.json`
- Modify via generator: `apps/api/src/core/database/migrations/meta/_journal.json`

**Produces:**
- `immersiveAudioTracks`
- `immersiveDestinationAmbientTracks`
- `immersiveSceneAmbientOverrides`
- `immersiveAudioTranscripts`
- `immersiveAudioTranscriptSegments`
- `immersiveSceneNarrations`
- enums for audio kind, locale, rights, publication status, transcript timing mode

- [ ] **Step 1: Write RED database tests against real PostgreSQL**

Cover at minimum:

```ts
it('rejects a non-audio media asset assigned to an immersive track', async () => { /* commit must reject */ });
it('rejects ambient track with locale or voiceId', async () => { /* commit must reject */ });
it('rejects narration assignment when track locale differs', async () => { /* commit must reject */ });
it('rejects transcript assignment when locale differs', async () => { /* commit must reject */ });
it('rejects licensed content without rights holder and rights reference', async () => { /* commit must reject */ });
it('accepts plain transcript segments with null timing', async () => { /* commit succeeds */ });
it('rejects overlapping timed transcript segments', async () => { /* commit rejects */ });
it('rejects a non-final open-ended timed segment', async () => { /* commit rejects */ });
```

- [ ] **Step 2: Run database tests and record RED evidence**

Run the repository/API test command targeting `immersive-audio.spec.ts`. Expected: failures because schema/tables/constraints do not exist.

- [ ] **Step 3: Implement Drizzle schema**

Use the spec's exact semantic model. Key shapes:

```ts
type AudioKind = 'ambient' | 'narration';
type AudioLocale = 'vi' | 'en';
type AudioRights = 'customer-owned' | 'licensed' | 'demo-only';
type PublicationStatus = 'draft' | 'published';
type TranscriptTimingMode = 'plain' | 'timed';
```

`immersive_audio_tracks` must include `media_asset_id`, `rights_holder`, `rights_holder_inherited`, `rights_reference`, `duration_ms`, `voice_id`, and `version` exactly as specified.

- [ ] **Step 4: Generate migration, then hand-edit only the cross-table PostgreSQL constraint-trigger portion**

Generate the normal Drizzle schema migration first. Add `DEFERRABLE INITIALLY DEFERRED` constraint triggers for cross-table kind/locale/media-kind/provenance/timing invariants. Do not duplicate physical file state into a mutable `readiness` column.

- [ ] **Step 5: Run migration/database tests GREEN**

Expected: every invalid assignment is rejected by PostgreSQL at commit; valid transcript-only and metadata-only narration states are accepted.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/core/database/schema/immersive-audio.ts \
  apps/api/src/core/database/db.ts \
  apps/api/src/core/database/immersive-audio.spec.ts \
  apps/api/src/core/database/migrations
git commit -m "feat(api): add immersive audio persistence contract"
```

---

### Task 2: Extend virtual-tour repository/read model with public audio data

**Owner:** Codex

**Files:**
- Modify: `apps/api/src/modules/virtual-tour/application/virtual-tour.repository.ts`
- Modify: `apps/api/src/modules/virtual-tour/application/virtual-tour.queries.ts`
- Modify: `apps/api/src/modules/virtual-tour/infrastructure/drizzle-virtual-tour.repository.ts`
- Test the nearest existing virtual-tour query/repository test suite.

**Consumes:** Task 1 tables.

**Produces:** a public immersive-manifest read model whose audio references are referentially closed.

- [ ] **Step 1: Add RED read-model tests**

Required cases:

```ts
expect(manifest.ambientTrackId).toBe(readyAmbient.id);
expect(manifest.nodes[0].narrationTrackIds.vi).toBe(readyViNarration.id);
expect(manifest.nodes[0].narrationTrackIds.en).toBeNull();
expect(manifest.nodes[0].transcriptIds.en).toBe(englishTranscriptOnly.id);
```

Add filtered-content closure assertions:

```ts
expect(manifest.audioTracks.some((track) => track.id === draftTrack.id)).toBe(false);
expect(manifest.nodes[0].narrationTrackIds.vi).toBeNull(); // when target was filtered
```

- [ ] **Step 2: Verify RED**

Run the focused virtual-tour query/repository suite. Expected: missing audio fields/read paths.

- [ ] **Step 3: Extend repository contract with semantic read rows**

Repository output must provide enough raw data for the query layer to derive readiness from `publication_status + media_assets.status/media_kind`, but it must not expose internal provenance in the public DTO.

- [ ] **Step 4: Build public sets before projecting references**

Algorithm invariant:

```ts
const publicTracks = filterPublicTracks(rawTracks);
const publicTranscripts = filterPublicTranscripts(rawTranscripts);
const publicTrackIds = new Set(publicTracks.map((x) => x.id));
const publicTranscriptIds = new Set(publicTranscripts.map((x) => x.id));
// Project every destination/scene reference through these sets; otherwise null.
```

No non-null reference may point outside the returned arrays.

- [ ] **Step 5: Resolve public `src` only for ready approved file-backed audio**

`src` is non-null only when published, rights are not demo-only, the media asset exists, kind is audio, and status is ready. Failed/non-ready assets use truthful readiness and `src: null`.

- [ ] **Step 6: Run focused API tests GREEN and commit**

```bash
git add apps/api/src/modules/virtual-tour
git commit -m "feat(api): expose public immersive audio read model"
```

---

### Task 3: Freeze HTTP/OpenAPI production audio contract and regenerate client

**Owner:** Codex

**Files:**
- Modify: `apps/api/src/modules/virtual-tour/presentation/http/virtual-tour.dto.ts`
- Modify if required by mapping location: `apps/api/src/modules/virtual-tour/presentation/http/virtual-tour.controller.ts`
- Modify: `apps/api/src/core/http/openapi.schemas.ts`
- Regenerate: `packages/api-client/openapi.json`
- Regenerate: `packages/api-client/src/generated/**`
- Add/update API DTO/OpenAPI tests.

**Produces exact public shapes:**

```ts
type AudioTrackResponse = {
  id: string;
  type: 'ambient' | 'narration';
  label: string;
  locale: 'vi' | 'en' | null;
  src: string | null;
  durationMs: number | null;
  rights: 'customer-owned' | 'licensed';
  readiness: 'ready' | 'unavailable' | 'invalid';
  voiceId: string | null;
  version: string | null;
};

type TranscriptResponse = {
  id: string;
  locale: 'vi' | 'en';
  title: string;
  timingMode: 'plain' | 'timed';
  rights: 'customer-owned' | 'licensed';
  segments: Array<{ id: string; startMs: number | null; endMs: number | null; text: string }>;
};
```

- [ ] **Step 1: Write RED DTO/OpenAPI tests for top-level `audioTracks`, `transcripts`, `ambientTrackId` and scene localized IDs.**
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement DTO/schema mapping with no internal provenance fields.**
- [ ] **Step 4: Run `pnpm api:generate`. Never hand-edit generated client files.**
- [ ] **Step 5: Assert generated client contains all new fields and does not expose `rightsReference`, `rightsHolder`, `rightsHolderInherited`, draft status, or demo-only rights in the public response.**
- [ ] **Step 6: Run API typecheck/tests and commit.**

```bash
git add apps/api/src/modules/virtual-tour/presentation/http \
  apps/api/src/core/http/openapi.schemas.ts \
  packages/api-client/openapi.json packages/api-client/src/generated
git commit -m "feat(api): publish immersive audio manifest contract"
```

---

### Task 4: Map generated production audio into web contracts

**Owner:** Codex

**Files:**
- Modify: `apps/web/src/shared/contracts/immersive.ts`
- Modify: `apps/web/src/modules/immersive-navigation/api/immersive-manifest.mapper.ts`
- Modify: `apps/web/src/modules/immersive-navigation/api/immersive-manifest.mapper.test.ts`
- Update fake/demo catalog fixtures only when TypeScript compatibility requires the new transcript shape; do not turn them into production records.

**Produces:**

```ts
type ImmersiveCaptionCapability = 'none' | 'plain-transcript' | 'timed-captions';

type ImmersiveTranscriptContent = {
  id: string;
  locale: 'vi' | 'en';
  title: string;
  timingMode: 'plain' | 'timed';
  segments: readonly {
    id: string;
    startMs: number | null;
    endMs: number | null;
    text: string;
  }[];
};
```

Preserve `ImmersiveAudioTrack.voiceId` and `.version`. Keep the shared demo type broad enough for `demo-only`, but production mapper output is public-only.

- [ ] **Step 1: Write RED mapper tests** for ambient, scene override, exact-locale narration, transcript-only EN, plain/timed transcript modes, voice/version preservation, and no EN→VI fallback.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement minimal mapper changes; never recompute rights/publication business rules in the browser.**
- [ ] **Step 4: Run mapper + shared contract tests GREEN.**
- [ ] **Step 5: Commit.**

```bash
git add apps/web/src/shared/contracts/immersive.ts \
  apps/web/src/modules/immersive-navigation/api/immersive-manifest.mapper.ts \
  apps/web/src/modules/immersive-navigation/api/immersive-manifest.mapper.test.ts
git commit -m "feat(web): map production immersive audio manifest"
```

---

### Task 5: Wire production source capability and lifecycle without rewriting the audio domain

**Owner:** Codex

**Files:**
- Modify: `apps/web/src/modules/immersive-audio/domain/audio-experience.resolver.ts`
- Test: `apps/web/src/modules/immersive-audio/domain/audio-experience.resolver.test.ts`
- Modify: `apps/web/src/modules/immersive-audio/adapters/immersive-audio-source.ts`
- Test: `apps/web/src/modules/immersive-audio/adapters/immersive-audio-source.test.ts`
- Modify only if RED requires: `apps/web/src/modules/immersive-audio/domain/audio.controller.ts`
- Test: `apps/web/src/modules/immersive-audio/domain/audio.controller.test.ts`
- Modify: `apps/web/src/modules/immersive-navigation/ui/useImmersiveAudioTour.ts`
- Test: `apps/web/src/modules/immersive-navigation/ui/useImmersiveAudioTour.test.ts`

- [ ] **Step 1: Add RED tests for file-backed public readiness**

```ts
expect(source.canPlayTrack({ ...track, readiness: 'ready', src: '/audio/vi.mp3' })).toBe(true);
expect(source.canPlayTrack({ ...track, readiness: 'unavailable', src: null })).toBe(false);
```

Keep demo SpeechSynthesis tests proving only `rights: 'demo-only'` + explicit demo policy can use it.

- [ ] **Step 2: Add RED lifecycle tests** for same-ambient no restart, scene override/restoration, narration failure restoring ambient, scene/locale stale completion rejection, and Auto Tour fallback on missing/failed narration.
- [ ] **Step 3: Verify RED.**
- [ ] **Step 4: Implement the minimum changes through existing source/controller/coordinator boundaries.** Do not put transport state in Zustand and do not add React progression timers.
- [ ] **Step 5: Run focused domain/hook tests GREEN.**
- [ ] **Step 6: Commit.**

```bash
git add apps/web/src/modules/immersive-audio \
  apps/web/src/modules/immersive-navigation/ui/useImmersiveAudioTour.ts \
  apps/web/src/modules/immersive-navigation/ui/useImmersiveAudioTour.test.ts
git commit -m "feat(audio): wire production immersive audio capability"
```

---

### Task 6: Freeze the Media Dock VM/actions contract

**Owner:** Codex

**Files:**
- Modify: `apps/web/src/modules/immersive-navigation/ui/reference-parity.presentation.ts`
- Modify: `apps/web/src/modules/immersive-navigation/ui/reference-parity.presentation.test.ts`
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.tsx`
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.media-dock.test.tsx`

**Produces frozen presentation facts:**

```ts
type ImmersiveCaptionCapability = 'none' | 'plain-transcript' | 'timed-captions';

// Existing Media Dock VM gains/locks explicit semantic facts, not raw inference:
transcript: {
  available: boolean;
  capability: ImmersiveCaptionCapability;
  content: ImmersiveTranscriptContent | null;
};
```

Narration availability must still be based on `canPlayTrack`, exact locale, and API truth. Plain transcript does not imply timed captions.

- [ ] **Step 1: Add RED presentation-contract tests** proving all three caption capabilities and production file capability visibility.
- [ ] **Step 2: Add RED integration test:** production-shaped manifest with `src` makes the unified dock expose narration; transcript-only EN exposes transcript but no EN play action.
- [ ] **Step 3: Verify RED.**
- [ ] **Step 4: Implement VM/composition-root wiring only. Do not redesign JSX/CSS.**
- [ ] **Step 5: Run presentation and `ImmersiveExperience.media-dock` tests GREEN.**
- [ ] **Step 6: Record the exact frozen `ImmersiveMediaDockVm` and `ImmersiveMediaDockActions` interfaces in the task report.**
- [ ] **Step 7: Commit.**

```bash
git add apps/web/src/modules/immersive-navigation/ui/reference-parity.presentation.ts \
  apps/web/src/modules/immersive-navigation/ui/reference-parity.presentation.test.ts \
  apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.tsx \
  apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.media-dock.test.tsx
git commit -m "feat(web): freeze production audio media dock contract"
```

**Dispatch gate:** only after this commit is GREEN may Codex use `herdr dispatch` for Task 7.

---

### Task 7: Implement Phase 1B audio presentation using AGY

**Owner:** AGY via Codex `herdr dispatch`

**Allowed files only:**
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveMediaDock.tsx`
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveMediaDock.css`
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveMediaDock.test.tsx`
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveTranscriptPanel.tsx`
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveTranscriptPanel.test.tsx`

**Forbidden:** API/backend, generated client, mapper, `AudioController`, `AudioTourCoordinator`, `AutoTourController`, source adapters/resolvers, router, navigation store, PSV/panorama lifecycle, `reference-parity.presentation.ts` semantic logic.

- [ ] **Step 1: Codex dispatches AGY with the frozen VM/actions interfaces and screenshots/reference states.**
- [ ] **Step 2: AGY writes/updates component tests before JSX/CSS changes.** Required visible states: sound gate, narration idle/playing/paused/unavailable, plain transcript, timed captions, autoplay blocked, mobile/desktop transcript presentation.
- [ ] **Step 3: AGY implements presentation only.** Plain transcript offers transcript reading but not synchronized caption behavior. `timed-captions` may expose CC. No state reconstruction from raw track fields.
- [ ] **Step 4: AGY runs component tests and visual QA at desktop and mobile widths.** Touch targets remain at least 44px; reduced motion respected.
- [ ] **Step 5: Codex reviews AGY diff before accepting it.** Reject any semantic/domain change or forbidden file modification.
- [ ] **Step 6: Commit accepted AGY presentation.**

```bash
git add apps/web/src/modules/immersive-navigation/ui/ImmersiveMediaDock.tsx \
  apps/web/src/modules/immersive-navigation/ui/ImmersiveMediaDock.css \
  apps/web/src/modules/immersive-navigation/ui/ImmersiveMediaDock.test.tsx \
  apps/web/src/modules/immersive-navigation/ui/ImmersiveTranscriptPanel.tsx \
  apps/web/src/modules/immersive-navigation/ui/ImmersiveTranscriptPanel.test.tsx
git commit -m "feat(web): present production immersive audio states"
```

---

### Task 8: Add production-shaped integration/E2E coverage

**Owner:** Codex

**Files:**
- Add the smallest production-shaped audio fixture under the existing test fixture/public test-media convention; it must be clearly test-only.
- Modify the nearest existing production immersive Playwright spec(s) rather than creating a duplicate server harness.
- Modify: `apps/web/src/modules/immersive-navigation/ui/ImmersiveExperience.media-dock.test.tsx` if browser-level assertions need a React integration fixture.

- [ ] **Step 1: Write RED production-shaped E2E** proving a manifest-provided file-backed narration reaches the browser audio adapter and the Media Dock shows truthful controls.
- [ ] **Step 2: Add failure E2E:** audio 404/play failure leaves panorama/navigation usable and restores ambient/silent state without blocking takeover.
- [ ] **Step 3: Add locale E2E:** active EN with no EN narration never plays VI; EN transcript may remain available.
- [ ] **Step 4: Verify RED, then add only the fixture/wiring needed for GREEN.** Do not add real/customer-content claims.
- [ ] **Step 5: Run the focused E2E set GREEN and commit.**

```bash
git add apps/web tests packages
git commit -m "test(audio): cover production immersive audio end to end"
```

Before committing, inspect `git diff --name-only` and unstage unrelated generated or test-output artifacts.

---

### Task 9: Full verification, PR evidence, and stop for independent review

**Owner:** Codex

- [ ] **Step 1: Fresh full verification**

Run:

```bash
pnpm api:generate
pnpm format:check
pnpm lint
pnpm architecture:check
pnpm deadcode
pnpm typecheck
pnpm test
pnpm test:integration
pnpm --filter @hatinh/web build
pnpm --filter @hatinh/web check:bundle
git diff --check
git status --short
```

Also run the repository's relevant production panorama/navigation/reference-parity Playwright suites plus the new production-audio E2E.

- [ ] **Step 2: Inspect the final diff**

Reject accidental Phase 2/3, Google 3D, panorama media ingestion, production TTS, or AGY edits outside its allowed presentation paths.

- [ ] **Step 3: Separate evidence**

Report two statuses explicitly:

```text
ENGINEERING READY: schema/API/client/mapper/runtime/UI/E2E evidence
CONTENT READY: blocked until approved Sơn Trang ambient + VI narration + provenance are supplied
```

Do not claim production content acceptance from test fixtures.

- [ ] **Step 4: Push branch and open/update one Draft PR**

PR must remain Draft for independent review. Include exact HEAD, test counts, E2E evidence, AGY visual evidence, and the external content blocker.

- [ ] **Step 5: STOP**

Do not merge, mark Ready, start Phase 2, or start Phase 3. Return the PR/HEAD to the reviewer.

---

## Codex Execution Order

```text
Task 1 DB contract
→ Task 2 public read model
→ Task 3 OpenAPI/client
→ Task 4 web mapper/contracts
→ Task 5 runtime capability/lifecycle
→ Task 6 FREEZE Media Dock VM/actions
→ herdr dispatch AGY for Task 7
→ Task 8 integration/E2E
→ Task 9 verification + Draft PR
```

Tasks 1–6 are Codex-only. Task 7 is AGY presentation-only. Task 8–9 return to Codex ownership.

## Plan Self-Review

- Spec coverage: DB integrity, provenance, plain/timed transcripts, public closure, locale semantics, runtime source capability, lifecycle, Media Dock capability, AGY boundary, E2E, external content blocker are each mapped to a task.
- Placeholder scan: no TODO/TBD/"implement later" instructions are used; implementation decisions are fixed by the approved spec.
- Type consistency: `plain | timed`, `none | plain-transcript | timed-captions`, public rights values, `voiceId`, `version`, readiness, and localized narration/transcript references use the same names across API/web/tasks.
- Scope guard: no Google 3D or Phase 2/3 requirements are introduced.
