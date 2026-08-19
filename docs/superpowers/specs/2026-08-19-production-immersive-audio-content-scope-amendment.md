# Production Immersive Audio — Content Scope Amendment

**Status:** APPROVED amendment
**Phase:** 1B — Production Immersive Audio Contract + Wiring
**Applies to:** `docs/superpowers/specs/2026-08-19-production-immersive-audio-design.md`
**Reason:** Clarify that the production audio architecture and content baseline are province-wide/multi-destination. Sơn Trang Cổ Đạm remains the deepest showcase, not the only destination receiving narration/ambient content.

## 1. Scope decision

The Phase 1B audio architecture MUST be destination-generic. No database table, API DTO, mapper, resolver, controller, Media Dock VM, E2E fixture strategy, or presentation label may encode Sơn Trang as a special-case product dependency.

The first editorial content baseline covers every destination currently represented in the immersive demo catalog:

| Destination slug | Destination | Scene count | VI narration baseline | Main ambient baseline |
| --- | --- | ---: | ---: | ---: |
| `son-trang-co-dam` | Sơn Trang Cổ Đạm | 8 | 8 scene scripts | 1 main + optional scene/zone overrides |
| `bien-thien-cam` | Biển Thiên Cầm | 3 | 3 scene scripts | 1 main |
| `khu-luu-niem-nguyen-du` | Khu lưu niệm Nguyễn Du | 4 | 4 scene scripts | 1 main |
| `nga-ba-dong-loc` | Ngã ba Đồng Lộc | 4 | 4 scene scripts | 1 main |
| **Total** |  | **19** | **19 VI scripts** | **4 main ambient tracks** |

Sơn Trang may additionally use up to two optional ambient overrides for the ecology and spiritual zones. Those overrides are polish, not a requirement for the generic runtime architecture.

## 2. Product hierarchy

All supported immersive destinations receive the same baseline capabilities:

```text
Destination
├── main ambient track
├── scenes
│   ├── VI narration
│   ├── VI transcript
│   ├── optional EN narration
│   ├── optional EN transcript
│   └── optional ambient override
└── Auto Tour-compatible story sequencing
```

Sơn Trang is the showcase tier:

- more scenes;
- richer narration density;
- optional ambient overrides;
- stronger cinematic storytelling;
- later Phase 3 presentation polish.

This distinction is CONTENT DEPTH, not a different technical architecture.

## 3. Content readiness

`ENGINEERING READY` and `CONTENT READY` remain separate.

Engineering readiness is achieved when the generic schema/API/client/mapper/runtime/VM/UI/E2E pipeline works with production-shaped file-backed fixtures across multiple destination slugs.

Content readiness for the initial public immersive set requires approved/customer-owned/licensed assets and provenance for the four destinations above:

- 19 approved VI narration recordings, one per current scene;
- 19 approved VI transcripts matching those narrations (plain or timed);
- 4 approved main ambient tracks, one per destination;
- optional Sơn Trang ecology/spiritual ambient overrides if available;
- rights holder/reference/version metadata for every published audio asset;
- editorial/factual approval for narration scripts before recording/publication.

EN narration/transcripts remain optional for the first content baseline. Missing EN narration MUST continue to be represented truthfully and MUST NOT silently play VI.

## 4. Script/content source of truth

The editorial source of truth for the first 19-scene baseline is:

`docs/content/2026-08-19-hatinh-immersive-audio-storytelling-v1.md`

That document contains narration drafts, duration targets, voice direction, ambient direction, and source/approval notes. It is editorial content, not runtime business logic.

Production code MUST NOT import narration text from Markdown. Approved content enters the normalized audio/transcript model through the content ingestion/admin/import path appropriate to the repository.

## 5. No fabricated production content

Until approved recordings and rights evidence exist:

- do not generate files and label them customer-approved;
- do not convert demo SpeechSynthesis into production narration;
- do not mark test fixtures as public production tracks;
- do not claim `CONTENT READY` merely because the engineering pipeline is green.

Pre-generated AI voice may be used only after the final script, voice identity, file, rights/provenance, and publication approval are explicitly recorded. Runtime production TTS remains forbidden.

## 6. Multi-destination acceptance invariant

At least the following must be proven before Phase 1B engineering is called generic:

1. the same manifest/audio contract works for more than one destination slug;
2. destination ambient IDs never bleed across destinations;
3. scene narration/transcript assignments are scoped to the requested destination;
4. missing audio on one destination cannot affect another destination;
5. locale selection remains exact for every destination;
6. Media Dock labels/state are derived from VM facts and contain no Sơn Trang-specific business condition;
7. production-shaped E2E covers at least two distinct destination slugs or an equivalent parameterized multi-destination fixture.

## 7. Superseded wording

Any earlier plan/spec sentence that describes the Phase 1B external content blocker as only “Sơn Trang ambient + VI narration” is superseded by this amendment.

The correct blocker is:

```text
Initial immersive content baseline:
4 destinations
19 current scenes
19 approved VI narration files + transcripts
4 approved destination ambient tracks
+ optional Sơn Trang zone overrides
+ rights/provenance/version approval
```

Sơn Trang remains the showcase destination, but Phase 1B is not a Sơn Trang-only audio subsystem.
