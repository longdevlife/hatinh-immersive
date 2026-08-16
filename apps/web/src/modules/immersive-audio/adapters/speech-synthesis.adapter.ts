import type { ImmersiveAudioTrack } from '../../../shared/contracts';
import type {
  AudioAdapter,
  AudioPlaybackSnapshot,
  AudioTrackHandle,
} from '../domain/audio.controller';

const EMPTY_SNAPSHOT: AudioPlaybackSnapshot = {
  currentTimeSeconds: 0,
  durationSeconds: 0,
  canSeek: false,
};

function localeToSpeechLanguage(locale: ImmersiveAudioTrack['locale']): string {
  return locale === 'en' ? 'en-US' : 'vi-VN';
}

function createHandle(
  track: ImmersiveAudioTrack,
  synthesis: SpeechSynthesis,
  Utterance: typeof SpeechSynthesisUtterance,
): AudioTrackHandle {
  const endedListeners = new Set<() => void>();
  let activeUtterance: SpeechSynthesisUtterance | null = null;
  let mutedByVolume = false;

  const finish = (utterance: SpeechSynthesisUtterance) => {
    if (activeUtterance !== utterance) {
      return;
    }
    activeUtterance = null;
    for (const listener of endedListeners) {
      listener();
    }
  };

  return {
    play: async () => {
      if (activeUtterance && synthesis.paused) {
        synthesis.resume();
        return;
      }
      if (activeUtterance) {
        return;
      }

      const utterance = new Utterance(track.label);
      utterance.lang = localeToSpeechLanguage(track.locale);
      utterance.onend = () => finish(utterance);
      utterance.onerror = () => finish(utterance);
      activeUtterance = utterance;

      try {
        synthesis.speak(utterance);
      } catch (error) {
        activeUtterance = null;
        throw error;
      }
    },
    pause: () => synthesis.pause(),
    stop: () => {
      activeUtterance = null;
      mutedByVolume = false;
      synthesis.cancel();
    },
    setVolume: (volume) => {
      if (!activeUtterance) {
        return;
      }
      if (volume <= 0 && !mutedByVolume) {
        synthesis.pause();
        mutedByVolume = true;
      } else if (volume > 0 && mutedByVolume) {
        synthesis.resume();
        mutedByVolume = false;
      }
    },
    fadeTo: async () => {
      // SpeechSynthesis is a demo fallback and cannot be crossfaded.
    },
    seek: () => false,
    getPlaybackSnapshot: () => ({ ...EMPTY_SNAPSHOT }),
    onProgress: () => () => undefined,
    onEnded: (listener) => {
      endedListeners.add(listener);
      return () => endedListeners.delete(listener);
    },
  };
}

/**
 * Demo-only narration fallback. Production narration must use reviewed audio
 * files through createBrowserAudioAdapter instead.
 */
export function createSpeechSynthesisAudioAdapter(): AudioAdapter {
  return {
    create(track: ImmersiveAudioTrack): AudioTrackHandle | null {
      if (
        track.type !== 'narration' ||
        track.rights !== 'demo-only' ||
        track.src !== null ||
        typeof speechSynthesis === 'undefined' ||
        typeof SpeechSynthesisUtterance === 'undefined'
      ) {
        return null;
      }

      return createHandle(track, speechSynthesis, SpeechSynthesisUtterance);
    },
  };
}
