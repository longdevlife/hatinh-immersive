import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ImmersiveAudioTrack } from '../../../shared/contracts';
import { createImmersiveAudioSource } from './immersive-audio-source';

const demoNarration: ImmersiveAudioTrack = {
  id: 'demo-narration',
  type: 'narration',
  label: 'Demo narration',
  src: null,
  rights: 'demo-only',
  locale: 'vi',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('immersive audio source policy', () => {
  it('allows a ready file-backed production track when the browser audio capability exists', () => {
    vi.stubGlobal('Audio', class Audio {});
    const source = createImmersiveAudioSource('browser-file');

    expect(
      source.canPlayTrack({
        ...demoNarration,
        rights: 'licensed',
        src: '/audio/vi.mp3',
        readiness: 'ready',
      }),
    ).toBe(true);
  });

  it('rejects a source URL when the API marks the production track unavailable', () => {
    vi.stubGlobal('Audio', class Audio {});
    const source = createImmersiveAudioSource('browser-file');

    expect(
      source.canPlayTrack({
        ...demoNarration,
        rights: 'customer-owned',
        src: '/audio/vi.mp3',
        readiness: 'unavailable',
      }),
    ).toBe(false);
  });

  it('keeps null-url narration unavailable for browser-file-only mode', () => {
    const source = createImmersiveAudioSource('browser-file');

    expect(source.canPlayTrack(demoNarration)).toBe(false);
  });

  it('allows null-url demo narration only through explicit SpeechSynthesis mode', () => {
    vi.stubGlobal('speechSynthesis', {});
    vi.stubGlobal('SpeechSynthesisUtterance', class SpeechSynthesisUtterance {});

    const source = createImmersiveAudioSource('demo-speech-synthesis');

    expect(source.canPlayTrack(demoNarration)).toBe(true);
    expect(source.adapter.create(demoNarration)).not.toBeNull();
  });

  it('does not make licensed null-url narration TTS-capable', () => {
    vi.stubGlobal('speechSynthesis', {});
    vi.stubGlobal('SpeechSynthesisUtterance', class SpeechSynthesisUtterance {});

    const source = createImmersiveAudioSource('demo-speech-synthesis');

    expect(source.canPlayTrack({ ...demoNarration, rights: 'licensed' })).toBe(false);
  });
});
