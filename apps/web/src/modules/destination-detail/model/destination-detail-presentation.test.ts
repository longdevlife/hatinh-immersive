import { describe, expect, it } from 'vitest';

import { DEMO_DESTINATIONS } from '../../immersive-navigation/fake-mode/demo-catalog';
import { getDestinationCapabilities } from './destination-capabilities';
import { toDestinationDetailPresentationVm } from './destination-detail.types';

describe('destination detail presentation mapping', () => {
  it('maps the golden Sơn Trang destination to governed media and supported facts', () => {
    const destination = DEMO_DESTINATIONS.find(
      ({ preview }) => preview.slug === 'son-trang-co-dam',
    )!.preview;
    const view = toDestinationDetailPresentationVm(
      destination,
      getDestinationCapabilities(destination),
    );

    expect(view.media.hero?.src).toBe('/demo/media/son-trang/hero.webp');
    expect(view.media.gallery).toHaveLength(5);
    expect(view.facts.map(({ id }) => id)).toEqual(['category', 'location']);
    expect(view.sections).toHaveLength(1);
    expect(JSON.stringify(view)).not.toContain('Chưa có hình ảnh');
  });

  it('does not invent unsupported visitor facts when the source has no values', () => {
    const destination = {
      ...DEMO_DESTINATIONS[0]!.preview,
      categoryLabel: null,
      geoPoint: null,
      media: { hero: null, gallery: [] },
    };
    const view = toDestinationDetailPresentationVm(destination, {
      hasPanorama: false,
      hasSelected3D: false,
      selected3DAvailability: 'disabled',
    });

    expect(view.facts).toEqual([]);
    expect(view.locationLabel).toBeNull();
  });
});
