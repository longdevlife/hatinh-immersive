import { describe, expect, it } from 'vitest';

import type { ImmersiveAudioTrack, ImmersiveLocale, PanoramaNode } from '../../../shared/contracts';
import { DEFAULT_SCENE_FALLBACK_DURATION_MS, resolveSceneAudio } from './audio-experience.resolver';

function track(
  id: string,
  type: ImmersiveAudioTrack['type'],
  locale: ImmersiveLocale | null = null,
): ImmersiveAudioTrack {
  return {
    id,
    type,
    label: id,
    src: null,
    rights: 'demo-only',
    locale,
  };
}

function scene(overrides: Partial<PanoramaNode> = {}): PanoramaNode {
  return {
    id: 'scene-one',
    destinationSlug: 'bien-thien-cam',
    name: 'Scene one',
    panoramaUrl: null,
    previewUrl: null,
    mediaQuality: 'missing',
    mediaRights: 'demo-only',
    lat: 18.27,
    lng: 106.09,
    initialView: { heading: 0, pitch: 0, fov: 88 },
    ...overrides,
  };
}

describe('resolveSceneAudio', () => {
  it('inherits the destination ambient when the scene has no override', () => {
    const ambient = track('ambient-main', 'ambient');

    const result = resolveSceneAudio({
      tracks: [ambient],
      destinationAmbientTrackId: ambient.id,
      scene: scene(),
      locale: 'vi',
    });

    expect(result.ambientTrack).toEqual(ambient);
  });

  it('uses a scene ambient override when present', () => {
    const main = track('ambient-main', 'ambient');
    const override = track('ambient-heritage', 'ambient');

    const result = resolveSceneAudio({
      tracks: [main, override],
      destinationAmbientTrackId: main.id,
      scene: scene({ ambientTrackId: override.id }),
      locale: 'vi',
    });

    expect(result.ambientTrack).toEqual(override);
  });

  it('resolves explicit English narration without falling back to Vietnamese', () => {
    const english = track('narration-en', 'narration', 'en');

    const result = resolveSceneAudio({
      tracks: [english],
      destinationAmbientTrackId: null,
      scene: scene({ narrationTrackIds: { en: english.id } }),
      locale: 'en',
    });

    expect(result.narrationTrack).toEqual(english);
    expect(result.narrationLocale).toBe('en');
  });

  it('does not silently use legacy Vietnamese narration for English', () => {
    const vietnamese = track('narration-vi', 'narration', 'vi');

    const result = resolveSceneAudio({
      tracks: [vietnamese],
      destinationAmbientTrackId: null,
      scene: scene({ narrationTrackId: vietnamese.id }),
      locale: 'en',
    });

    expect(result.narrationTrack).toBeNull();
    expect(result.narrationLocale).toBeNull();
    expect(result.alternateNarrationLocales).toEqual(['vi']);
  });

  it('uses the legacy narration reference only for Vietnamese', () => {
    const vietnamese = track('narration-vi', 'narration', 'vi');

    const result = resolveSceneAudio({
      tracks: [vietnamese],
      destinationAmbientTrackId: null,
      scene: scene({ narrationTrackId: vietnamese.id }),
      locale: 'vi',
    });

    expect(result.narrationTrack).toEqual(vietnamese);
    expect(result.narrationLocale).toBe('vi');
  });

  it('reports alternate narration locales when the requested locale is missing', () => {
    const vietnamese = track('narration-vi', 'narration', 'vi');
    const english = track('narration-en', 'narration', 'en');

    const result = resolveSceneAudio({
      tracks: [vietnamese, english],
      destinationAmbientTrackId: null,
      scene: scene({ narrationTrackIds: { vi: vietnamese.id } }),
      locale: 'en',
    });

    expect(result.narrationTrack).toBeNull();
    expect(result.alternateNarrationLocales).toEqual(['vi']);
  });

  it('returns a transcript even when the selected narration audio is missing', () => {
    const transcript = {
      locale: 'vi' as const,
      title: 'Câu chuyện Thiên Cầm',
      segments: [{ id: 'intro', startMs: 0, text: 'Một câu chuyện ngắn.' }],
    };

    const result = resolveSceneAudio({
      tracks: [],
      destinationAmbientTrackId: null,
      scene: scene({ transcripts: { vi: transcript } }),
      locale: 'vi',
    });

    expect(result.narrationTrack).toBeNull();
    expect(result.transcript).toEqual(transcript);
  });

  it('uses the named fallback duration when the scene does not override it', () => {
    const result = resolveSceneAudio({
      tracks: [],
      destinationAmbientTrackId: null,
      scene: scene(),
      locale: 'vi',
    });

    expect(result.fallbackDurationMs).toBe(DEFAULT_SCENE_FALLBACK_DURATION_MS);
  });

  it('uses a scene fallback duration when one is configured', () => {
    const result = resolveSceneAudio({
      tracks: [],
      destinationAmbientTrackId: null,
      scene: scene({ fallbackDurationMs: 12000 }),
      locale: 'vi',
    });

    expect(result.fallbackDurationMs).toBe(12000);
  });
});
