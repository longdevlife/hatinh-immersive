import type { ImmersiveAudioTrack } from '../../../shared/contracts';
import type { AudioAdapter, AudioTrackHandle } from '../domain/audio.controller';

export function createBrowserAudioAdapter(): AudioAdapter {
  return {
    create(track: ImmersiveAudioTrack): AudioTrackHandle | null {
      if (!track.src || typeof Audio === 'undefined') {
        return null;
      }

      const element = new Audio(track.src);
      element.preload = 'auto';
      element.loop = track.type === 'ambient';

      return {
        play: () => element.play(),
        pause: () => element.pause(),
        stop: () => {
          element.pause();
          element.currentTime = 0;
        },
        setVolume: (volume) => {
          element.volume = Math.max(0, Math.min(1, volume));
        },
        onEnded: (listener) => {
          element.addEventListener('ended', listener);
          return () => element.removeEventListener('ended', listener);
        },
      };
    },
  };
}
