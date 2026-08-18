import type { ImmersiveAudioTrack } from '../../../shared/contracts';
import type { AudioAdapter } from '../domain/audio.controller';
import { createBrowserAudioAdapter } from './browser-audio.adapter';
import { createSpeechSynthesisAudioAdapter } from './speech-synthesis.adapter';

export type ImmersiveAudioSourcePolicy = 'browser-file' | 'demo-speech-synthesis';

export interface ImmersiveAudioSource {
  adapter: AudioAdapter;
  canPlayTrack(track: ImmersiveAudioTrack): boolean;
}

function canPlayBrowserFile(track: ImmersiveAudioTrack): boolean {
  return (
    (track.readiness === undefined || track.readiness === 'ready') &&
    Boolean(track.src) &&
    typeof Audio !== 'undefined'
  );
}

function canPlayDemoSpeech(track: ImmersiveAudioTrack): boolean {
  return (
    track.type === 'narration' &&
    track.rights === 'demo-only' &&
    (track.readiness === undefined || track.readiness === 'ready') &&
    track.src === null &&
    typeof speechSynthesis !== 'undefined' &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

/**
 * Selects the runtime audio boundary and exposes its capability without
 * making the presentation layer infer playability from track metadata.
 * SpeechSynthesis is deliberately reachable only through the explicit
 * demo-only policy; browser/customer audio remains file-backed.
 */
export function createImmersiveAudioSource(
  policy: ImmersiveAudioSourcePolicy,
): ImmersiveAudioSource {
  if (policy === 'demo-speech-synthesis') {
    return {
      adapter: createSpeechSynthesisAudioAdapter(),
      canPlayTrack: canPlayDemoSpeech,
    };
  }

  return {
    adapter: createBrowserAudioAdapter(),
    canPlayTrack: canPlayBrowserFile,
  };
}
