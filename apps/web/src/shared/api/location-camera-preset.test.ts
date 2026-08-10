import { describe, expect, it } from 'vitest';

import { toLocationCameraPreset } from './location-camera-preset';

describe('toLocationCameraPreset', () => {
  it('keeps curated camera values and omits nullable altitude when absent', () => {
    expect(
      toLocationCameraPreset({
        center: { lat: 18.6647657, lng: 105.7667208, altitude: null },
        heading: 118,
        tilt: 57,
        range: 900,
      }),
    ).toEqual({
      center: { lat: 18.6647657, lng: 105.7667208 },
      heading: 118,
      tilt: 57,
      range: 900,
    });
  });

  it('does not create a preset for a missing API value', () => {
    expect(toLocationCameraPreset(undefined)).toBeUndefined();
  });
});
