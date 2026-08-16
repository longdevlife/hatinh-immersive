import type { ImmersiveAudioTrack } from '../../../shared/contracts';
import type {
  AudioAdapter,
  AudioPlaybackSnapshot,
  AudioTrackHandle,
} from '../domain/audio.controller';

function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume));
}

function getSnapshot(element: HTMLAudioElement): AudioPlaybackSnapshot {
  const durationSeconds =
    Number.isFinite(element.duration) && element.duration > 0 ? element.duration : 0;
  const currentTimeSeconds = Number.isFinite(element.currentTime)
    ? Math.max(0, element.currentTime)
    : 0;
  return {
    currentTimeSeconds,
    durationSeconds,
    canSeek: durationSeconds > 0,
  };
}

export function createBrowserAudioAdapter(): AudioAdapter {
  return {
    create(track: ImmersiveAudioTrack): AudioTrackHandle | null {
      if (!track.src || typeof Audio === 'undefined') {
        return null;
      }

      const element = new Audio(track.src);
      element.preload = 'auto';
      element.loop = track.type === 'ambient';
      const progressListeners = new Set<(snapshot: AudioPlaybackSnapshot) => void>();
      let fadeFrame: number | null = null;
      let cancelFade: (() => void) | null = null;

      const emitProgress = () => {
        const snapshot = getSnapshot(element);
        for (const listener of progressListeners) {
          listener(snapshot);
        }
      };

      element.addEventListener('timeupdate', emitProgress);
      element.addEventListener('durationchange', emitProgress);
      element.addEventListener('loadedmetadata', emitProgress);

      return {
        play: () => element.play(),
        pause: () => element.pause(),
        stop: () => {
          cancelFade?.();
          cancelFade = null;
          element.pause();
          element.currentTime = 0;
          emitProgress();
        },
        setVolume: (volume) => {
          element.volume = clampVolume(volume);
        },
        fadeTo: (volume, durationMs) => {
          cancelFade?.();
          cancelFade = null;
          const target = clampVolume(volume);
          if (durationMs <= 0) {
            element.volume = target;
            return Promise.resolve();
          }

          const startVolume = element.volume;
          const startedAt = performance.now();
          return new Promise<void>((resolve) => {
            let settled = false;
            const settle = () => {
              if (settled) {
                return;
              }
              settled = true;
              if (fadeFrame !== null && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(fadeFrame);
              }
              fadeFrame = null;
              cancelFade = null;
              resolve();
            };
            cancelFade = settle;
            const tick = (now: number) => {
              const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs));
              element.volume = startVolume + (target - startVolume) * progress;
              if (progress >= 1) {
                settle();
                return;
              }
              if (typeof requestAnimationFrame === 'function') {
                fadeFrame = requestAnimationFrame(tick);
              } else {
                fadeFrame = window.setTimeout(() => tick(performance.now()), 16);
              }
            };
            if (typeof requestAnimationFrame === 'function') {
              fadeFrame = requestAnimationFrame(tick);
            } else {
              fadeFrame = window.setTimeout(() => tick(performance.now()), 16);
            }
          });
        },
        seek: (seconds) => {
          const snapshot = getSnapshot(element);
          if (!snapshot.canSeek) {
            return false;
          }
          element.currentTime = Math.max(0, Math.min(snapshot.durationSeconds, seconds));
          emitProgress();
          return true;
        },
        getPlaybackSnapshot: () => getSnapshot(element),
        onProgress: (listener) => {
          progressListeners.add(listener);
          return () => progressListeners.delete(listener);
        },
        onEnded: (listener) => {
          element.addEventListener('ended', listener);
          return () => element.removeEventListener('ended', listener);
        },
      };
    },
  };
}
