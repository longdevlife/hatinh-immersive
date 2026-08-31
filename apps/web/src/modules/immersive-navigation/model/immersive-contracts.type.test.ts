import { describe, expectTypeOf, it } from 'vitest';

import type {
  ImmersiveCaptionCapabilityContract,
  ImmersiveMediaDockModeContract,
  ImmersiveMediaDockNarrationStatusContract,
  ImmersiveMediaQualityContract,
  ImmersiveSceneTransactionStatusContract,
  ReferenceParitySceneContract,
  ReferenceParitySceneRole,
} from './immersive-contracts';

describe('Phase 2 frozen product union exactness', () => {
  it('keeps the caption capability contract closed and exact', () => {
    expectTypeOf<ImmersiveCaptionCapabilityContract>().toEqualTypeOf<
      'none' | 'plain-transcript' | 'timed-captions'
    >();
  });

  it('keeps the media-quality contract independent and exact', () => {
    expectTypeOf<ImmersiveMediaQualityContract>().toEqualTypeOf<
      'ready' | 'low-resolution' | 'missing' | 'invalid'
    >();
    expectTypeOf<
      ReferenceParitySceneContract['mediaQuality']
    >().toEqualTypeOf<ImmersiveMediaQualityContract>();
  });

  it('keeps every other Phase 2 product union closed and exact', () => {
    expectTypeOf<ReferenceParitySceneRole>().toEqualTypeOf<'major-stop' | 'connector'>();
    expectTypeOf<ImmersiveMediaDockModeContract>().toEqualTypeOf<'free-explore' | 'auto-tour'>();
    expectTypeOf<ImmersiveMediaDockNarrationStatusContract>().toEqualTypeOf<
      'idle' | 'loading' | 'playing' | 'paused' | 'unavailable'
    >();
    expectTypeOf<ImmersiveSceneTransactionStatusContract>().toEqualTypeOf<
      'idle' | 'entering-panorama' | 'navigating-scene'
    >();
  });
});
