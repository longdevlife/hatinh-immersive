import { describe, expect, it, vi } from 'vitest';

import { createBrowserAudioAdapter } from './browser-audio.adapter';

function createAudioMock({ duration = 12 } = {}) {
  const listeners = new Map<string, Set<EventListener>>();
  const play = vi.fn().mockResolvedValue(undefined);
  const pause = vi.fn();
  const load = vi.fn();
  const audio = {
    play,
    pause,
    load,
    volume: 1,
    currentTime: 0,
    duration,
    onended: null,
    addEventListener(type: string, listener: EventListener) {
      const handlers = listeners.get(type) ?? new Set<EventListener>();
      handlers.add(listener);
      listeners.set(type, handlers);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener);
    },
    emit(type: string) {
      for (const listener of listeners.get(type) ?? []) {
        listener(new Event(type));
      }
    },
  } as unknown as HTMLAudioElement & { emit(type: string): void };

  return { audio, play, pause, load };
}

describe('browser audio adapter', () => {
  it('creates a controllable audio handle only for a usable source', () => {
    const { audio, play, pause } = createAudioMock();
    vi.stubGlobal(
      'Audio',
      vi.fn(function AudioMock() {
        return audio;
      }),
    );

    const adapter = createBrowserAudioAdapter();
    const handle = adapter.create({
      id: 'ambient-demo',
      type: 'ambient',
      label: 'Demo',
      src: '/demo/audio/ambient.ogg',
      rights: 'demo-only',
    });

    expect(handle).not.toBeNull();
    handle?.setVolume(0.2);
    void handle?.play();
    handle?.pause();
    expect(audio.volume).toBe(0.2);
    expect(play).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('publishes playback progress and supports bounded seeking', () => {
    const { audio } = createAudioMock({ duration: 20 });
    vi.stubGlobal(
      'Audio',
      vi.fn(function AudioMock() {
        return audio;
      }),
    );

    const handle = createBrowserAudioAdapter().create({
      id: 'narration-progress',
      type: 'narration',
      label: 'Narration',
      src: '/demo/audio/narration.ogg',
      rights: 'demo-only',
    });
    const snapshots: Array<{ currentTimeSeconds: number; durationSeconds: number }> = [];
    handle?.onProgress((snapshot) => snapshots.push(snapshot));

    audio.currentTime = 7.5;
    audio.emit('timeupdate');

    expect(snapshots.at(-1)).toEqual({
      currentTimeSeconds: 7.5,
      durationSeconds: 20,
      canSeek: true,
    });
    expect(handle?.seek(999)).toBe(true);
    expect(audio.currentTime).toBe(20);
    expect(handle?.seek(-1)).toBe(true);
    expect(audio.currentTime).toBe(0);

    vi.unstubAllGlobals();
  });

  it('reports non-seekable state when media duration is not available', () => {
    const { audio } = createAudioMock({ duration: Number.NaN });
    vi.stubGlobal(
      'Audio',
      vi.fn(function AudioMock() {
        return audio;
      }),
    );

    const handle = createBrowserAudioAdapter().create({
      id: 'narration-no-duration',
      type: 'narration',
      label: 'Narration',
      src: '/demo/audio/narration.ogg',
      rights: 'demo-only',
    });

    expect(handle?.getPlaybackSnapshot()).toEqual({
      currentTimeSeconds: 0,
      durationSeconds: 0,
      canSeek: false,
    });
    expect(handle?.seek(2)).toBe(false);

    vi.unstubAllGlobals();
  });

  it('fades to a target volume and resets playback when stopped', async () => {
    const { audio } = createAudioMock({ duration: 20 });
    vi.stubGlobal(
      'Audio',
      vi.fn(function AudioMock() {
        return audio;
      }),
    );

    const handle = createBrowserAudioAdapter().create({
      id: 'ambient-fade',
      type: 'ambient',
      label: 'Ambient',
      src: '/demo/audio/ambient.ogg',
      rights: 'demo-only',
    });

    audio.currentTime = 8;
    await handle?.fadeTo(0.3, 0);
    expect(audio.volume).toBeCloseTo(0.3);

    handle?.stop();
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.currentTime).toBe(0);

    vi.unstubAllGlobals();
  });

  it('returns no handle for an unavailable audio source', () => {
    const adapter = createBrowserAudioAdapter();

    expect(
      adapter.create({
        id: 'missing',
        type: 'narration',
        label: 'Missing',
        src: null,
        rights: 'demo-only',
      }),
    ).toBeNull();
  });
});
