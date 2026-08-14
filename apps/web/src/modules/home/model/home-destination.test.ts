import { describe, expect, it } from 'vitest';

import { DEMO_DESTINATIONS } from '../../immersive-navigation/fake-mode/demo-catalog';
import { createHomeDestinationVm } from './home-destination';

describe('home destination presentation model', () => {
  it('maps the governed demo catalog to real detail links and hero assets', () => {
    const destinations = DEMO_DESTINATIONS.map(({ preview }) => preview)
      .map(createHomeDestinationVm)
      .filter(
        (destination): destination is NonNullable<typeof destination> => destination !== null,
      );

    expect(destinations).toHaveLength(4);
    expect(destinations.map((destination) => destination.slug)).toEqual([
      'son-trang-co-dam',
      'bien-thien-cam',
      'khu-luu-niem-nguyen-du',
      'nga-ba-dong-loc',
    ]);
    expect(
      destinations.every((destination) => destination.hero.src.startsWith('/demo/media/')),
    ).toBe(true);
    expect(
      destinations.every((destination) => destination.cardImage.src.startsWith('/demo/media/')),
    ).toBe(true);
    expect(
      destinations.every((destination) => destination.cardImage.id !== destination.hero.id),
    ).toBe(true);
    expect(destinations.map((destination) => destination.detailHref)).toEqual([
      '/explore/son-trang-co-dam',
      '/explore/bien-thien-cam',
      '/explore/khu-luu-niem-nguyen-du',
      '/explore/nga-ba-dong-loc',
    ]);
    expect(destinations.find((destination) => destination.isFocus)?.slug).toBe('son-trang-co-dam');
  });

  it('omits a destination without a governed hero asset', () => {
    const destination = {
      ...DEMO_DESTINATIONS[0]!.preview,
      media: { hero: null, gallery: [] },
    };

    expect(createHomeDestinationVm(destination)).toBeNull();
  });

  it('falls back to the hero only when a destination has no gallery media', () => {
    const destination = {
      ...DEMO_DESTINATIONS[0]!.preview,
      media: { hero: DEMO_DESTINATIONS[0]!.preview.media!.hero, gallery: [] },
    };

    const viewModel = createHomeDestinationVm(destination);

    expect(viewModel?.cardImage.id).toBe(viewModel?.hero.id);
  });
});
