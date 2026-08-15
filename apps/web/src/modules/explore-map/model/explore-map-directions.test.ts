import { describe, expect, it } from 'vitest';

import { buildDirectionsUrl } from './explore-map-directions';

describe('Explore Map directions', () => {
  it('builds an external directions URL from destination coordinates', () => {
    expect(buildDirectionsUrl({ latitude: 18.2771383, longitude: 106.098072 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=18.2771383%2C106.098072',
    );
  });

  it('does not expose a directions action for missing or invalid coordinates', () => {
    expect(buildDirectionsUrl(null)).toBeNull();
    expect(buildDirectionsUrl({ latitude: Number.NaN, longitude: 106 })).toBeNull();
    expect(buildDirectionsUrl({ latitude: 91, longitude: 106 })).toBeNull();
    expect(buildDirectionsUrl({ latitude: 18, longitude: -181 })).toBeNull();
  });
});
