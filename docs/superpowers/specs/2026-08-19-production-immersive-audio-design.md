# Production Immersive Audio Contract + Wiring

**Status:** proposed design for approval
**Phase:** 1B — Production Immersive Audio Contract + Wiring
**Base:** `6db1fc2f99e545b321d2716c8c14adefb0a83dd8`
**Branch:** `feat/production-immersive-audio-content`

## 1. Purpose and decision

This design connects approved, file-backed ambient and narration content to the
existing immersive experience without replacing the current audio lifecycle.
The physical file remains a `media_assets` row with `media_kind = audio`.
Semantic records describe how that asset belongs to a destination or scene.
The public immersive manifest resolves those records into the existing web
audio contracts.

The selected architecture is:

```text
media_assets(kind=audio)
  → immersive audio semantic records and assignments
  → public immersive manifest
  → OpenAPI / generated client
  → web mapper
  → ImmersiveManifestVm
  → explicit browser-file source
  → existing AudioController / AudioTourCoordinator
  → existing Media Dock VM
```

The API is the source of truth for ownership, publication, rights and media
readiness. The browser source is the source of truth for runtime capability
(for example, whether the browser can construct an `Audio` element). React
presentation code does not infer either business readiness or rights.

This phase does not create production audio files. Until approved
customer-owned or licensed files are supplied, production-shaped fixtures are
test-only and must remain explicitly labelled as such.

## 2. Existing architecture audit

The current repository already has the required runtime layers:

- `media_assets` supports `panorama`, `image`, `audio` and `model3d`, with
  physical processing states including `pending`, `uploaded`, `processing`,
  `ready` and `failed`.
- The API immersive manifest currently returns destination, scene nodes,
  links and hotspots. It does not yet return audio metadata.
- The generated client therefore has no audio fields for the manifest.
- The web `ImmersiveManifestVm` already has optional `audioTracks` and
  `ambientTrackId`, but the production mapper currently leaves them empty.
- `PanoramaNode` already has scene ambient, localized narration references and
  transcript fields for the fake/demo composition; the API mapper does not yet
  populate them.
- `resolveSceneAudio` already distinguishes destination ambient, scene ambient
  override, localized narration and transcript availability. It deliberately
  does not fall back from English narration to Vietnamese narration.
- `createImmersiveAudioSource('browser-file')` is the production source
  boundary. The SpeechSynthesis source is reachable only through the explicit
  `demo-speech-synthesis` policy.
- `AudioController`, `AudioTourCoordinator`, `AutoTourController` and the
  Media Dock VM already own transport, ducking, stale-request and progression
  behavior. This design extends their inputs; it does not replace them.

## 3. Database model

### 3.1 Physical media

`media_assets` remains the only physical media registry. Audio upload and
processing use the existing media lifecycle:

```text
media_kind = audio
status = pending → uploaded → processing → ready
                              ↘ failed
```

The existing `storage_key` is resolved through the existing public media
origin/object-storage boundary. Audio bytes are served directly from the
configured public object-storage/CDN URL. They are not proxied through the
NestJS API.

An audio semantic track may have no physical asset while it is being prepared.
That represents metadata/transcript availability only; it is never playable.

### 3.2 Semantic tables

The canonical model uses five semantic tables plus transcript segments. The
tables are assignments, not a second physical media system.

#### `immersive_audio_tracks`

One stable semantic identity for an ambient or narration track.

| Field | Semantics |
| --- | --- |
| `id` | UUID primary key; stable across manifest revisions |
| `kind` | `ambient` or `narration` |
| `locale` | `NULL` for ambient; required `vi` or `en` for narration |
| `label` | Editorial content label, not UI control copy |
| `media_asset_id` | Nullable FK to `media_assets.id`; required for a playable track |
| `rights` | `customer-owned`, `licensed` or `demo-only` |
| `rights_holder` | Nullable only for explicit project-owner inheritance or demo-only content |
| `rights_holder_inherited` | Boolean audit flag; true only for customer-owned project-owner inheritance |
| `rights_reference` | Nullable internal approval, license or provenance reference |
| `publication_status` | `draft` or `published` |
| `duration_ms` | Nullable known duration; non-negative when present |
| `voice_id` | Nullable narration voice/performer identity; always null for ambient |
| `version` | Nullable content/audio revision; required for published ready production tracks |
| timestamps | Audit fields |

Database constraints enforce the kind/locale invariant:

- ambient tracks have `locale IS NULL`;
- narration tracks have `locale IS NOT NULL`;
- `duration_ms` is null or non-negative;
- a non-null `media_asset_id` is unique to one semantic track;
- ambient tracks have `voice_id IS NULL`;
- `rights_holder_inherited` is true only when `rights = customer-owned`;
- published, ready production tracks have a non-empty `version`;
- a referenced media asset must be `media_kind = audio`.

Rights provenance is enforced as follows:

- `licensed` requires non-empty `rights_holder` and `rights_reference`;
- `customer-owned` requires either non-empty `rights_holder` or
  `rights_holder_inherited = true`;
- `demo-only` is never eligible for the public production manifest;
- `rights_reference` is an internal audit value and is not a visitor-facing
  URL requirement.

The media-kind, kind/locale, provenance and publication/version rules are
enforced by database constraint triggers in addition to domain/repository
validation. The base `media_assets.media_kind` is immutable after an asset is
referenced by a semantic track.

`readiness` is intentionally not duplicated as a mutable semantic column. It
is resolved by the API from the semantic track and the physical media asset:

| Condition | Public readiness |
| --- | --- |
| no `media_asset_id` | `unavailable` |
| asset is pending/uploaded/processing | `unavailable` |
| asset is failed | `invalid` |
| asset is ready and kind is audio | `ready` |

This keeps physical processing state and publication state as the two canonical
sources instead of creating a third state that can drift.

#### `immersive_destination_ambient_tracks`

Destination ownership for the main ambient track:

```text
destination_id  PK/FK destinations.id
track_id        FK immersive_audio_tracks.id
```

There is at most one assignment per destination. The referenced track must be
an ambient track with `locale IS NULL`. A track may be reused by destinations
when the content owner intentionally chooses the same atmosphere.

#### `immersive_scene_ambient_overrides`

Optional scene-level ambient override:

```text
scene_id  PK/FK virtual_tour_scenes.id
track_id  FK immersive_audio_tracks.id NOT NULL
```

The referenced track must be ambient and locale-neutral. At most one override
exists per scene. No override means the destination ambient remains the
default.

#### `immersive_scene_narrations`

Localized scene narration assignment:

```text
scene_id       FK virtual_tour_scenes.id
locale         vi | en
track_id       nullable FK immersive_audio_tracks.id
transcript_id  nullable FK immersive_audio_transcripts.id
```

Constraints:

- unique `(scene_id, locale)`;
- unique `track_id` where `track_id IS NOT NULL`;
- unique `transcript_id` where `transcript_id IS NOT NULL`;
- at least one of `track_id` or `transcript_id` is present;
- `track_id`, when present, references a narration track with the same locale;
- `transcript_id`, when present, references a transcript with the same locale;
- a scene narration assignment belongs to the scene's destination through the
  scene FK; cross-destination assignment is rejected by domain validation;
- a narration track is scene-owned and cannot be assigned to a second scene;
- a transcript may be associated with one scene locale assignment only.

This permits a published English transcript with no English audio file. It
does not create a fake playable track.

#### `immersive_audio_transcripts`

Transcript metadata:

```text
id                 UUID primary key
locale             vi | en
title              editorial transcript title
timing_mode        plain | timed
rights             customer-owned | licensed | demo-only
rights_holder      nullable with the same inheritance rules as audio tracks
rights_reference   nullable internal approval/license/provenance reference
rights_holder_inherited boolean customer-owned project-owner inheritance flag
publication_status draft | published
```

`immersive_audio_transcript_segments` stores ordered, validated segments:

```text
id             UUID primary key
transcript_id  FK immersive_audio_transcripts.id ON DELETE CASCADE
start_ms       nullable non-negative integer
end_ms         nullable integer greater than start_ms when present
sort_order     non-negative integer
text           non-empty text
```

There is a unique `(transcript_id, sort_order)` constraint. Transcript content
is therefore normalized and independently usable when narration is absent.
Timing is explicit rather than inferred from nullable values:

- `timing_mode = plain`: every segment has `start_ms IS NULL` and
  `end_ms IS NULL`; `sort_order` is the only semantic ordering;
- `timing_mode = timed`: every segment has a non-null `start_ms`; `end_ms` is
  non-null and greater than `start_ms` except for an explicitly valid final
  open-ended segment;
- timed segments are monotonic and non-overlapping in `sort_order`;
- a plain transcript is not advertised as caption-timestamp capable.

Database constraint triggers validate the mode/segment combinations and the
timed ordering. Domain validation duplicates these checks for friendly errors.

### 3.3 Database-level semantic integrity

Foreign keys and unique indexes protect ownership and cardinality. Cross-table
semantic invariants are enforced by PostgreSQL `CONSTRAINT TRIGGER`s marked
`DEFERRABLE INITIALLY DEFERRED`, so a transaction can create related rows in a
safe order while the database remains authoritative at commit:

- destination ambient assignment checks the target track exists, has
  `kind = ambient` and `locale IS NULL`;
- scene ambient override checks the target track exists, has
  `kind = ambient` and `locale IS NULL`;
- scene narration assignment checks the target track, when non-null, has
  `kind = narration` and `track.locale = assignment.locale`;
- scene narration transcript assignment checks the target transcript, when
  non-null, has `transcript.locale = assignment.locale`;
- every non-null audio `media_asset_id` checks the target
  `media_assets.media_kind = audio`;
- track rights/provenance, voice/ambient and publication/version constraints
  are checked at commit;
- transcript segment triggers enforce plain/timed mode and timed ordering.

Where PostgreSQL composite foreign keys can express a relation without
duplicating mutable kind/locale data, they may be used; the constraint trigger
is the required fallback for the cross-table kind and locale checks. Domain and
repository validation repeats the same rules for actionable error messages,
but cannot weaken or replace the database constraints.

Migration tests must attempt each invalid assignment against a real PostgreSQL
test database and assert that the database rejects it, not only that a service
method rejects it.

### 3.4 Delete behavior

- deleting a destination cascades its destination ambient assignment;
- deleting a scene cascades its scene ambient and narration assignments;
- deleting a track is restricted while any assignment references it;
- deleting a transcript is restricted while a scene narration references it;
- deleting transcript segments cascades with their transcript;
- deleting a physical media asset is restricted while an audio track references
  it.

The system uses semantic deletion/unpublishing for customer content rather
than deleting referenced production records.

### 3.5 Migration and backfill

The migration is additive:

1. add semantic enums and tables;
2. add the media-kind constraint validation;
3. add rights/provenance, voice/version and transcript timing constraints;
4. deploy API read/write support;
5. regenerate the client from the exported OpenAPI document;
6. create assignments only for approved audio content.

There is no automatic backfill from hotspot JSON, fake catalog fixtures or
existing panorama records. Existing destinations/scenes remain valid with no
audio assignments. A future import/admin workflow may create approved records,
but that workflow is outside this phase.

## 4. Public API and OpenAPI contract

The existing endpoint remains the single network request:

```http
GET /api/v1/destinations/:slug/immersive-manifest?locale=vi|en
```

`locale` remains the requested content locale and defaults to `vi`. The audio
assignment maps include both supported locales so the client can distinguish
missing English from an accidental Vietnamese fallback without another audio
request.

### 4.1 Manifest response

The response adds these required top-level properties:

```ts
type ImmersiveManifestResponse = {
  destination: DestinationDetail;
  defaultSceneId: string | null;
  nodes: SceneNodeResponse[];
  links: SceneLinkResponse[];
  hotspots: HotspotResponse[];
  audioTracks: AudioTrackResponse[];
  transcripts: TranscriptResponse[];
  ambientTrackId: string | null;
};
```

Each scene node adds:

```ts
type SceneNodeResponse = {
  // existing scene fields...
  ambientOverrideTrackId: string | null;
  narrationTrackIds: {
    vi: string | null;
    en: string | null;
  };
  transcriptIds: {
    vi: string | null;
    en: string | null;
  };
};
```

`AudioTrackResponse` is:

```ts
type AudioTrackResponse = {
  id: string;
  type: 'ambient' | 'narration';
  label: string;
  locale: 'vi' | 'en' | null;
  src: string | null;
  durationMs: number | null;
  // Public DTO: only approved public rights are representable here.
  rights: 'customer-owned' | 'licensed';
  readiness: 'ready' | 'unavailable' | 'invalid';
  voiceId: string | null;
  version: string | null;
};
```

`TranscriptResponse` is:

```ts
type TranscriptResponse = {
  id: string;
  locale: 'vi' | 'en';
  title: string;
  timingMode: 'plain' | 'timed';
  // Public DTO: internal demo/draft rights are filtered before serialization.
  rights: 'customer-owned' | 'licensed';
  segments: Array<{
    id: string;
    startMs: number | null;
    endMs: number | null;
    text: string;
  }>;
};
```

### 4.2 Public filtering and resolved URLs

The public manifest query returns only records that are published for public
use. `demo-only` tracks and transcripts are excluded from the production API
response; they remain available only through the explicit fake/demo
composition.

The public manifest has a strict referential-closure invariant:

> Every non-null audio ID returned by the public manifest references an object
> included in that same manifest.

Therefore:

- `ambientTrackId` is null unless its track is present in `audioTracks`;
- `ambientOverrideTrackId` is null unless its track is present in
  `audioTracks`;
- `narrationTrackIds.vi` and `.en` are null unless the corresponding tracks are
  present in `audioTracks`;
- `transcriptIds.vi` and `.en` are null unless the corresponding transcripts
  are present in `transcripts`;
- draft, demo-only, cross-destination or otherwise filtered records cause the
  relevant reference to be null, never a dangling ID.

The query builds the public track/transcript sets first, then projects scene
and destination references against those sets. The API test suite must assert
closure for empty, partial and filtered assignments.

Published metadata-only narration is allowed when it has a transcript but no
ready file. In that case:

```text
readiness = unavailable
src = null
```

`src` is populated only when all of these are true:

```text
publication_status = published
rights != demo-only
media asset exists
media asset kind = audio
media asset status = ready
```

Failed or non-ready files never receive a URL that looks playable. The URL is
resolved from the existing public object-storage/CDN boundary, not from an API
streaming or proxy endpoint.

The API query also validates that every returned scene assignment belongs to a
scene in the requested destination and that every returned track/transcript is
reachable from that manifest. Unrelated destination audio is never leaked.

`publicationStatus`, `rightsReference`, `rightsHolder` and
`rightsHolderInherited` are internal/domain provenance facts and are not
serialized in the public manifest. The public DTO intentionally cannot express
draft or demo-only records. The shared web/demo type remains broader for
explicit fake-mode fixtures, but production mapping accepts only the public
DTO shape.

The backend audit rules are:

- customer-owned content requires an explicit rights holder or an explicit
  `rights_holder_inherited = true` reference to the configured project owner;
- licensed content requires both rights holder and an internal
  `rights_reference` (license, approval or provenance record);
- demo-only content may retain internal provenance but is excluded from the
  public production query;
- the same provenance requirements apply to published transcripts;
- `version` is required for a published ready production track and identifies
  the approved audio/content revision;
- `voice_id` is nullable for narration when the approved source does not expose
  a voice identity, and is always null for ambient;
- no rights reference or holder is exposed to visitors unless a later product
  contract explicitly requires a coarse attribution display.

## 5. Generated client and web mapping

The OpenAPI export is the source for the generated client. Generated files are
never edited manually:

```text
apps/api OpenAPI schema
  → pnpm api:generate
  → packages/api-client/openapi.json
  → packages/api-client/src/generated/**
```

The web mapper transports API truth without recomputing publication, rights or
readiness. It joins top-level `audioTracks` and `transcripts` by the IDs in
each scene node and produces the existing VM shape:

```ts
interface ImmersiveManifestVm {
  // existing fields...
  audioTracks: readonly ImmersiveAudioTrack[];
  ambientTrackId: string | null;
}

interface PanoramaNode {
  // existing fields...
  ambientTrackId: string | null; // scene ambient override
  narrationTrackIds: {
    vi?: string;
    en?: string;
  };
  transcripts: Partial<Record<ImmersiveLocale, ImmersiveTranscriptContent>>;
}
```

`ImmersiveAudioTrack` is extended minimally with API truth:

```ts
type ImmersiveAudioTrack = {
  id: string;
  type: 'ambient' | 'narration';
  label: string;
  src: string | null;
  rights: 'customer-owned' | 'licensed' | 'demo-only';
  locale: 'vi' | 'en' | null;
  durationMs: number | null;
  voiceId?: string | null;
  version?: string | null;
  publicationStatus?: 'draft' | 'published';
  readiness?: 'ready' | 'unavailable' | 'invalid';
};
```

The optional publication/readiness fields preserve compatibility with the
existing fake/demo catalog, whose broader shared type can still represent
explicit `demo-only` fixtures. Production mapper output is always
`publicationStatus = published`, a public rights value and an API-provided
readiness value. `voiceId` is metadata for a pre-generated narration voice or
performer identity; it is never an instruction to invoke SpeechSynthesis.
`version` identifies the approved content/audio revision and is preserved
through API and mapper updates.

Transcript mapping preserves the explicit timing mode:

```ts
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

The mapper does not infer timed captions from non-null timestamps. It maps
`timingMode` directly and exposes an explicit presentation capability to the
Media Dock contract:

```ts
type ImmersiveCaptionCapability = 'none' | 'plain-transcript' | 'timed-captions';
```

`none` means no transcript exists, `plain-transcript` means readable ordered
text exists without synchronization, and `timed-captions` means the transcript
is eligible for timestamp-following captions. Presentation code must consume
this fact rather than inspect segment nullability.

The production API mapper never changes `demo-only` into production content,
never turns `src: null` into a source, and never chooses Vietnamese for a
missing English assignment. The fake/demo catalog remains an explicit source
of test/demo manifests.

## 6. Locale semantics

Vietnamese is the default locale. Narration selection is an exact lookup:

```text
active locale = vi → scene.narrationTrackIds.vi
active locale = en → scene.narrationTrackIds.en
```

If the English ID is null or its track is not playable, English narration is
unavailable. The resolver must not substitute the Vietnamese track. The
presentation may expose that Vietnamese narration is available, but playback
requires an explicit locale change.

Transcript capability is independent:

- English transcript + no English audio is valid;
- Vietnamese audio + no Vietnamese transcript is valid;
- no transcript is not an audio failure;
- transcript text is never used to synthesize production audio.

Changing locale changes the active content locale through the existing locale
contract. It does not mutate audio domain state or create a second audio
source. A locale change invalidates stale narration ownership for the previous
scene/locale and resolves the new exact assignment.

Ambient tracks are locale-neutral in this phase.

## 7. Ambient and scene lifecycle

The existing audio controller remains the only transport owner.

Ambient resolution:

```text
scene ambient override
  ?? destination ambient
```

Lifecycle invariants:

- entering immersive may start ambient only after the existing sound/user
  gesture policy allows it;
- the same ambient track is not restarted on an ordinary scene change;
- changing to a scene override transitions to the override;
- leaving the override restores the destination ambient;
- when returning to the destination ambient, the controller preserves its
  playhead where the existing adapter supports it;
- an ambient load/play failure restores a silent usable state and never blocks
  panorama navigation;
- leaving immersive stops and releases audio handles.

No `Audio` object is created by React presentation components.

## 8. Free Explore behavior

Free Explore has no narration autoplay:

```text
enter scene
  → sound/user-gesture policy
  → ambient may play

user selects Play Story
  → exact locale narration starts
  → ambient ducks

pause
  → same narration handle pauses
  → ambient restores appropriately

resume
  → same narration ownership/position resumes
  → ambient ducks again

scene change
  → old narration stops and invalidates its context
  → new scene narration remains idle until explicitly requested
```

The existing controller's generation/ownership guards remain authoritative.
Every completion, error and autoplay rejection is accepted only when its
destination, scene, locale, track and request ownership are still current.

## 9. Auto Tour behavior

`AutoTourController` remains the single progression owner. React does not add
Auto Tour timers or duplicate progression state.

The coordinator sequence is:

```text
scene committed
  → settle
  → exact-locale narration when a playable file exists
  → hold after natural completion
  → next scene
```

When narration is absent, unavailable, rejected by autoplay policy or fails to
load/play:

- ambient is restored when applicable;
- the narration request is marked unavailable for the current context;
- the configured fallback duration is used once;
- the tour continues;
- no retry loop is created;
- a stale completion cannot advance a newer scene.

Manual narration cannot take ownership of an Auto Tour narration request.
Manual navigation validates the command before cancelling owned narration or
Auto Tour context, preserving the existing race protections.

## 10. Failure and async ownership invariants

Audio failure is content/runtime state, not immersive renderer failure.

| Failure | Required behavior |
| --- | --- |
| narration 404/decode/network | mark current narration unavailable, restore ambient, keep transcript, continue Auto Tour fallback |
| ambient failure | continue silently; no blocking error takeover |
| autoplay blocked | expose user-action-required state; no rejection loop |
| old scene completion | discard when scene/request/track/locale ownership is stale |
| old destination completion | discard after destination/session change |
| old locale completion | discard after locale change |
| invalid/unpublished/demo-only production track | unavailable; never playable |

The minimum ownership tuple is:

```text
audio session generation
destination identity
scene identity
locale
track identity
request/transport generation
```

The implementation may use the existing controller/coordinator handle and
generation representation, but every async callback must be checked against
the current owner before mutating state or advancing Auto Tour.

## 11. Media Dock contract boundary

Codex freezes the semantic VM/actions before presentation delegation. The
existing Media Dock remains the presentation consumer of semantic facts:

- ambient capability and current state;
- narration capability for the active locale;
- transcript availability independent of audio availability;
- playing, paused, unavailable and autoplay-blocked states;
- mute/unmute and narration transport actions;
- Auto Tour-owned pause/resume actions;
- locale availability without implicit fallback.

The VM must receive source capability from the explicit browser-file source,
not from `Boolean(track.src)` alone. `src: null` is unavailable under the
browser-file production policy. Demo SpeechSynthesis capability remains
explicitly demo-only.

AGY receives only this frozen VM/actions contract and may not reconstruct
capability, ownership, locale fallback or progression state in JSX.

## 12. Test-first implementation strategy

Each behavior change follows RED → GREEN → REFACTOR. The test plan is split
by boundary.

### Database and domain

1. Ambient track locale is null; narration locale is required.
2. Scene narration is unique by scene and locale.
3. A scene narration requires a track or transcript.
4. Ambient destination and scene assignments accept only ambient tracks.
5. Narration assignment accepts only same-locale narration tracks.
6. Non-audio media assets cannot be assigned to audio tracks.
7. Deletion restrictions preserve referenced production records.
8. Plain transcript segments accept null timing values and preserve semantic
   order.
9. Timed transcript segments require explicit timing and reject invalid ranges,
   overlap and invalid open-ended segments.
10. Rights/provenance, voice/ambient and published-version constraints are
    enforced by the database.

### API and generated contract

11. The public manifest returns `audioTracks`, `transcripts` and
    `ambientTrackId`.
12. Scene response returns ambient override, localized narration IDs and
    transcript IDs.
13. Ready approved file-backed audio receives a resolved public `src`.
14. Missing/non-ready files receive `src: null` and non-ready readiness.
15. Draft and demo-only production content is not returned as playable.
16. Cross-destination assignments are rejected.
17. Every non-null public audio reference has a corresponding object in the
    same manifest; filtered records produce null references.
18. `pnpm api:generate` produces the new client fields without manual edits.

### Web mapper and resolver

19. Mapper does not drop audio tracks, voice/version metadata or transcript
    content.
20. Mapper joins scene references to the correct localized transcript and
    preserves `plain` versus `timed` timing mode.
21. Browser-file source resolves a real `src` only when the API says the track
    is public-ready and the browser capability exists.
22. `src: null` is unavailable under browser-file policy.
23. Demo SpeechSynthesis remains reachable only under explicit demo policy.
24. English missing narration never selects Vietnamese.
25. Transcript availability remains true when its audio track is absent.
26. Media Dock receives explicit `none`, `plain-transcript` or
    `timed-captions` capability rather than inferring timing.

### Audio controller and Auto Tour integration

27. Destination ambient starts only after the existing sound/user-gesture
    policy.
28. Same ambient track is not restarted across a normal scene change.
29. Scene ambient override transitions and restores the destination ambient.
30. Narration ducks ambient and restores it on pause/end/failure.
31. Pause/resume preserves narration ownership and position.
32. Scene change stops old narration and new narration does not autoplay.
33. Narration failure restores ambient and leaves immersive usable.
34. Auto Tour continues through missing/unavailable narration using fallback.
35. Auto Tour continues through narration play failure using fallback.
36. Stale scene/request/track/locale completion cannot mutate current state.

### Media Dock and production-shaped E2E

37. Media Dock capability reflects semantic readiness plus browser-file source
    capability.
38. Unavailable audio does not render a misleading playable control.
39. A production-shaped manifest with a real test audio file reaches the
    browser `Audio` adapter and emits play/progress/end behavior.
40. Desktop and mobile cover sound enabled, narration playing, narration
    paused and audio unavailable states.
41. Panorama navigation and Back behavior remain green when audio fails.

Test fixtures use a local, explicitly test-labelled audio file or deterministic
adapter. They do not become production records or public demo content.

## 13. Verification gates

Before implementation is considered complete, run fresh gates appropriate to
the changed boundaries:

```text
focused database/domain/API/mapper/audio/Media Dock tests
pnpm api:generate
pnpm --filter @hatinh/web test
pnpm --filter @hatinh/web lint
pnpm --filter @hatinh/web typecheck
pnpm architecture:check
pnpm deadcode
pnpm format:check
pnpm --filter @hatinh/web build
pnpm --filter @hatinh/web check:bundle
pnpm test:integration
production-shaped audio E2E
fake/real panorama E2E
reference-parity E2E
git diff --check
```

The final report must separate engineering evidence from content evidence.
Green tests prove the plumbing; they do not prove that approved customer
audio files exist.

## 14. Codex / AGY ownership

### Codex owns

- database schema and migrations;
- semantic audio ownership and validation;
- API query/read model and DTOs;
- OpenAPI and generated client regeneration;
- web contracts and mapper;
- source/capability boundary;
- AudioController integration;
- AudioTourCoordinator and Auto Tour integration;
- Media Dock VM/actions contract;
- tests, E2E, CI and integration.

### AGY may own after contract freeze

- Media Dock audio presentation;
- narration idle/playing/paused/unavailable states;
- ambient/sound status presentation;
- transcript panel presentation;
- desktop/mobile responsive layout;
- accessibility presentation, labels, icons and spacing.

### AGY must not modify

- database or backend/API;
- generated client or mapper;
- AudioController, AudioTourCoordinator or AutoTourController;
- audio adapters/source resolver/capability semantics;
- router, navigation store or deep-link behavior;
- PSV or panorama lifecycle;
- rights/readiness rules;
- business state reconstruction in JSX.

Phase 1B UI is usability and responsive coherence only. It does not redesign
the panorama HUD, scene rail, minimap, global typography or cinematic motion
language.

## 15. Explicit non-goals

- Phase 2 contract work;
- Phase 3 cinematic redesign;
- Google 3D;
- real Sơn Trang panorama ingestion;
- runtime production SpeechSynthesis/TTS;
- chatbot, booking or unrelated CMS expansion;
- unrelated navigation refactoring;
- replacement of the existing panorama renderer or audio lifecycle;
- fabrication, scraping or synthetic substitution of production audio.

## 16. Migration/content blocker

The engineering contract can be implemented and tested with explicit
test-labelled fixtures. Production acceptance remains blocked until the
customer supplies approved files and provenance for at least:

- Sơn Trang destination ambient audio;
- approved scene narration files, starting with Vietnamese;
- any approved English narration files;
- transcript ownership/licensing metadata where applicable.

No fixture may be promoted by configuration alone into approved production
content. The public manifest must remain truthful when these assets are absent.

## 17. Self-review

This spec was reviewed against the required risks:

- **Ownership:** destination ambient, scene override and scene locale
  assignments have separate owners and uniqueness constraints.
- **Duplicate source of truth:** physical readiness remains in `media_assets`;
  publication remains in semantic records; public readiness is derived once at
  the API boundary.
- **Nullable states:** missing audio may be represented as a transcript-only
  assignment or an unavailable track, but no unavailable track receives a
  playable URL.
- **Transcript timing:** `plain` and `timed` are explicit modes; plain
  segments use null timing and timed caption capability is never inferred.
- **Public closure:** every non-null manifest reference is projected only after
  its target survives public filtering and is included in the same manifest.
- **Database integrity:** kind, locale, media-kind, assignment, provenance and
  transcript timing rules are enforced with PostgreSQL constraints/triggers,
  not only repository checks.
- **Locale fallback:** EN never falls back silently to VI; transcript and
  audio capabilities are independent.
- **Rights/readiness:** demo-only, draft, non-ready and failed content are
  never silently presented as production-playable audio.
- **Metadata compatibility:** `voiceId` and `version` remain available through
  DB, public API and shared web/demo contracts with their production semantics.
- **Transcript ownership:** transcripts are first-class normalized records and
  can exist without audio.
- **Frontend-derived state:** business rights/readiness comes from the API;
  runtime playability comes only from the explicit source capability boundary.
- **Race/lifecycle:** destination, scene, locale, track and request ownership
  are required for async completion acceptance.
- **Scope:** no Phase 2/3, Google 3D, panorama ingestion or production TTS is
  included.

No unresolved architectural ambiguity remains. The only external blocker is
the availability and approval of real customer-owned/licensed audio content.
