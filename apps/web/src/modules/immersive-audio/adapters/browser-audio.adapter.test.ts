import { describe, expect, it, vi } from 'vitest';

import { createBrowserAudioAdapter } from './browser-audio.adapter';

describe('browser audio adapter', () => {
  it('creates a controllable audio handle only for a usable source', () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    const load = vi.fn();
    const audio = { play, pause, load, volume: 1, onended: null } as unknown as HTMLAudioElement;
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
