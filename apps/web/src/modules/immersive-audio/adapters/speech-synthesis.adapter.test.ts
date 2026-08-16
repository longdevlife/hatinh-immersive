import { describe, expect, it, vi } from 'vitest';

import { createSpeechSynthesisAudioAdapter } from './speech-synthesis.adapter';

class FakeUtterance {
  readonly text: string;
  lang = '';
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

function narration(overrides: Record<string, unknown> = {}) {
  return {
    id: 'demo-narration',
    type: 'narration' as const,
    label: 'Câu chuyện Sơn Trang',
    src: null,
    rights: 'demo-only' as const,
    locale: 'vi' as const,
    ...overrides,
  };
}

describe('speech synthesis audio adapter', () => {
  it('accepts only demo-only narration tracks without a file source', async () => {
    const synthesis = {
      speak: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(),
      paused: false,
    };
    vi.stubGlobal('speechSynthesis', synthesis);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);

    const adapter = createSpeechSynthesisAudioAdapter();

    expect(adapter.create(narration())).not.toBeNull();
    expect(adapter.create(narration({ type: 'ambient', id: 'ambient' }))).toBeNull();
    expect(adapter.create(narration({ rights: 'licensed' }))).toBeNull();
    expect(adapter.create(narration({ src: '/audio/narration.ogg' }))).toBeNull();

    vi.unstubAllGlobals();
  });

  it('speaks the demo narration, exposes no seek timeline, and forwards lifecycle controls', async () => {
    const synthesis = {
      speak: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(),
      paused: false,
    };
    vi.stubGlobal('speechSynthesis', synthesis);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);

    const handle = createSpeechSynthesisAudioAdapter().create(narration());
    const ended = vi.fn();

    expect(handle).not.toBeNull();
    handle?.onEnded(ended);
    await handle?.play();

    const utterance = synthesis.speak.mock.calls[0]?.[0] as FakeUtterance;
    expect(utterance.text).toBe('Câu chuyện Sơn Trang');
    expect(utterance.lang).toBe('vi-VN');
    expect(handle?.getPlaybackSnapshot()).toEqual({
      currentTimeSeconds: 0,
      durationSeconds: 0,
      canSeek: false,
    });
    expect(handle?.seek(2)).toBe(false);

    handle?.pause();
    expect(synthesis.pause).toHaveBeenCalledTimes(1);
    synthesis.paused = true;
    await handle?.play();
    expect(synthesis.resume).toHaveBeenCalledTimes(1);

    utterance.onend?.();
    expect(ended).toHaveBeenCalledTimes(1);

    handle?.stop();
    expect(synthesis.cancel).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('reports speech errors separately instead of treating them as successful completion', async () => {
    const synthesis = {
      speak: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(),
      paused: false,
    };
    vi.stubGlobal('speechSynthesis', synthesis);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);

    const handle = createSpeechSynthesisAudioAdapter().create(narration());
    const ended = vi.fn();
    const error = vi.fn();
    handle?.onEnded(ended);
    handle?.onError?.(error);
    await handle?.play();

    const utterance = synthesis.speak.mock.calls[0]?.[0] as FakeUtterance;
    utterance.onerror?.();

    expect(ended).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('pauses active speech for mute and resumes it when volume is restored', async () => {
    const synthesis = {
      speak: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(),
      paused: false,
    };
    vi.stubGlobal('speechSynthesis', synthesis);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);

    const handle = createSpeechSynthesisAudioAdapter().create(narration());
    await handle?.play();
    handle?.setVolume(0);
    handle?.setVolume(1);

    expect(synthesis.pause).toHaveBeenCalledTimes(1);
    expect(synthesis.resume).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('does not resume manually paused speech when mute is toggled', async () => {
    const synthesis = {
      speak: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(),
      paused: false,
    };
    vi.stubGlobal('speechSynthesis', synthesis);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);

    const handle = createSpeechSynthesisAudioAdapter().create(narration());
    await handle?.play();
    handle?.pause();
    synthesis.paused = true;
    handle?.setVolume(0);
    handle?.setVolume(1);

    expect(synthesis.resume).not.toHaveBeenCalled();

    await handle?.play();
    expect(synthesis.resume).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('returns no handle when speech synthesis is unavailable', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);

    expect(createSpeechSynthesisAudioAdapter().create(narration())).toBeNull();

    vi.unstubAllGlobals();
  });
});
