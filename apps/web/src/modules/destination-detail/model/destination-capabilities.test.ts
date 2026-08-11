import { describe, expect, it } from 'vitest';

import type { DestinationPreviewVm } from '../../../shared/contracts';
import {
  getDestinationCapabilities,
  type DestinationCapabilityConfig,
} from './destination-capabilities';

function createDestination(overrides: Partial<DestinationPreviewVm> = {}): DestinationPreviewVm {
  return {
    id: 'destination-01',
    slug: 'destination-01',
    name: 'Destination 01',
    summary: 'A destination summary.',
    coverImageUrl: null,
    categoryLabel: 'Di sản',
    defaultSceneId: null,
    geoPoint: { latitude: 18.3421, longitude: 105.9032 },
    ...overrides,
  };
}

describe('destination capabilities', () => {
  it('derives panorama capability from defaultSceneId', () => {
    expect(getDestinationCapabilities(createDestination({ defaultSceneId: 'scene-01' }))).toEqual({
      hasPanorama: true,
      hasSelected3D: false,
    });
    expect(getDestinationCapabilities(createDestination({ defaultSceneId: null }))).toEqual({
      hasPanorama: false,
      hasSelected3D: false,
    });
  });

  it('does not treat coordinates as selected-3D capability', () => {
    expect(getDestinationCapabilities(createDestination())).toMatchObject({
      hasSelected3D: false,
    });
  });

  it('only enables selected 3D from explicit product configuration', () => {
    const config: DestinationCapabilityConfig = {
      selected3DSlugs: new Set(['destination-01']),
    };

    expect(getDestinationCapabilities(createDestination(), config)).toEqual({
      hasPanorama: false,
      hasSelected3D: true,
    });
  });
});
