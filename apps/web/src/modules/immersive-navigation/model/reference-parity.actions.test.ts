import { describe, expect, it, vi } from 'vitest';

import { shareImmersiveScene, toggleImmersiveFullscreen } from './reference-parity.actions';

describe('reference parity browser actions', () => {
  it('uses the Web Share API when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);

    await expect(
      shareImmersiveScene({
        title: 'Biển Thiên Cầm',
        url: 'https://example.test/explore/bien-thien-cam/immersive',
        share,
        copy: vi.fn(),
      }),
    ).resolves.toBe('shared');

    expect(share).toHaveBeenCalledWith({
      title: 'Biển Thiên Cầm',
      url: 'https://example.test/explore/bien-thien-cam/immersive',
    });
  });

  it('falls back to copying the canonical URL when native sharing is unavailable', async () => {
    const copy = vi.fn().mockResolvedValue(undefined);

    await expect(
      shareImmersiveScene({
        title: 'Sơn Trang Cổ Đạm',
        url: 'https://example.test/explore/son-trang-co-dam/immersive',
        copy,
      }),
    ).resolves.toBe('copied');

    expect(copy).toHaveBeenCalledWith('https://example.test/explore/son-trang-co-dam/immersive');
  });

  it('does not throw when both share and copy are unavailable', async () => {
    await expect(
      shareImmersiveScene({
        title: 'Nguyễn Du',
        url: 'https://example.test/explore/khu-luu-niem-nguyen-du/immersive',
      }),
    ).resolves.toBe('unavailable');
  });

  it('requests or exits fullscreen through the browser document contract', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    const documentLike = {
      fullscreenElement: null,
      documentElement: { requestFullscreen },
      exitFullscreen,
    };

    await toggleImmersiveFullscreen(documentLike);
    expect(requestFullscreen).toHaveBeenCalledTimes(1);

    await toggleImmersiveFullscreen({
      ...documentLike,
      fullscreenElement: documentLike.documentElement,
    });
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });
});
