import { describe, expect, it } from 'vitest';

import type { DestinationPreviewVm } from '../../../shared/contracts';
import {
  getDestinationCapabilities,
  resolveDestinationCapabilityConfig,
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
      selected3DAvailability: 'disabled',
    });
    expect(getDestinationCapabilities(createDestination({ defaultSceneId: null }))).toEqual({
      hasPanorama: false,
      hasSelected3D: false,
      selected3DAvailability: 'disabled',
    });
  });

  it('does not treat coordinates as selected-3D capability', () => {
    expect(getDestinationCapabilities(createDestination())).toMatchObject({
      hasSelected3D: false,
    });
  });

  it('only enables selected 3D from explicit product configuration', () => {
    const config: DestinationCapabilityConfig = {
      selected3DAvailabilityBySlug: { 'destination-01': 'available' },
    };

    expect(getDestinationCapabilities(createDestination(), config)).toEqual({
      hasPanorama: false,
      hasSelected3D: true,
      selected3DAvailability: 'available',
    });
  });

  it('maps unavailable selected 3D separately from disabled and never infers it from geoPoint', () => {
    const unavailable = getDestinationCapabilities(
      createDestination({ geoPoint: { latitude: 18.4, longitude: 105.9 } }),
      { selected3DAvailabilityBySlug: { 'destination-01': 'unavailable' } },
    );

    expect(unavailable).toEqual({
      hasPanorama: false,
      hasSelected3D: false,
      selected3DAvailability: 'unavailable',
    });
    expect(
      getDestinationCapabilities(createDestination({ geoPoint: null })).selected3DAvailability,
    ).toBe('disabled');
  });

  it('keeps selected3DSlugs as an available compatibility input', () => {
    expect(
      getDestinationCapabilities(createDestination(), {
        selected3DSlugs: new Set(['destination-01']),
      }),
    ).toMatchObject({
      hasSelected3D: true,
      selected3DAvailability: 'available',
    });
  });

  it('parses explicit build/runtime selected-3D availability entries', () => {
    expect(
      resolveDestinationCapabilityConfig({
        VITE_IMMERSIVE_SELECTED_3D_CAPABILITIES:
          'son-trang-co-dam=available,bien-thien-cam=unavailable',
      }),
    ).toEqual({
      selected3DAvailabilityBySlug: {
        'son-trang-co-dam': 'available',
        'bien-thien-cam': 'unavailable',
      },
    });
  });
});
