import type {
  ImmersiveAudioTrack,
  ImmersiveLocale,
  ImmersiveTranscriptContent,
  PanoramaNode,
} from '../../../shared/contracts';

export const DEFAULT_SCENE_FALLBACK_DURATION_MS = 8000;

export interface ResolvedSceneAudio {
  ambientTrack: ImmersiveAudioTrack | null;
  narrationTrack: ImmersiveAudioTrack | null;
  transcript: ImmersiveTranscriptContent | null;
  fallbackDurationMs: number;
  narrationLocale: ImmersiveLocale | null;
  alternateNarrationLocales: readonly ImmersiveLocale[];
}

export interface ResolveSceneAudioInput {
  tracks: readonly ImmersiveAudioTrack[];
  destinationAmbientTrackId: string | null;
  scene: PanoramaNode;
  locale: ImmersiveLocale;
}

export function resolveSceneAudio({
  tracks,
  destinationAmbientTrackId,
  scene,
  locale,
}: ResolveSceneAudioInput): ResolvedSceneAudio {
  const findTrack = (id: string | null | undefined, type: ImmersiveAudioTrack['type']) => {
    const track = id ? tracks.find((candidate) => candidate.id === id) : undefined;
    return track?.type === type ? track : null;
  };

  const ambientTrack =
    findTrack(scene.ambientTrackId, 'ambient') ?? findTrack(destinationAmbientTrackId, 'ambient');
  const narrationTrack = resolveNarrationTrack(tracks, scene, locale);
  const alternateNarrationLocales = (['vi', 'en'] as const).filter(
    (candidate) => candidate !== locale && resolveNarrationTrack(tracks, scene, candidate) !== null,
  );

  return {
    ambientTrack,
    narrationTrack,
    transcript: scene.transcripts?.[locale] ?? null,
    fallbackDurationMs: scene.fallbackDurationMs ?? DEFAULT_SCENE_FALLBACK_DURATION_MS,
    narrationLocale: narrationTrack ? locale : null,
    alternateNarrationLocales,
  };
}

function resolveNarrationTrack(
  tracks: readonly ImmersiveAudioTrack[],
  scene: PanoramaNode,
  locale: ImmersiveLocale,
): ImmersiveAudioTrack | null {
  const localizedId = scene.narrationTrackIds?.[locale];
  const trackId = localizedId ?? (locale === 'vi' ? scene.narrationTrackId : null);
  const track = trackId ? tracks.find((candidate) => candidate.id === trackId) : undefined;

  if (!track || track.type !== 'narration') {
    return null;
  }

  if (track.locale && track.locale !== locale) {
    return null;
  }

  return track;
}
