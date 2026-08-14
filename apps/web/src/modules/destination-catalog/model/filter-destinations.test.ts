import { DEMO_DESTINATIONS } from '../../immersive-navigation/fake-mode/demo-catalog';
import type { DestinationPreviewVm } from '../../../shared/contracts';

import { filterDestinations } from './filter-destinations';

const destinations = DEMO_DESTINATIONS.map(({ preview }) => preview);
const bySlug = (slug: string) => {
  const destination = destinations.find((candidate) => candidate.slug === slug);
  if (!destination) {
    throw new Error(`Missing fixture destination: ${slug}`);
  }
  return destination;
};

const thienCam = bySlug('bien-thien-cam');
const sonTrang = bySlug('son-trang-co-dam');
const dongLoc = bySlug('nga-ba-dong-loc');

describe('filterDestinations', () => {
  it('returns every destination for an empty query and the all category', () => {
    expect(filterDestinations(destinations, { query: '', category: 'all' })).toEqual(destinations);
  });

  it('matches a query against name, summary, or category', () => {
    expect(filterDestinations(destinations, { query: 'thiên cầm', category: 'all' })).toHaveLength(
      1,
    );
    expect(
      filterDestinations(destinations, { query: 'ký ức thanh niên', category: 'all' }),
    ).toHaveLength(1);
    expect(filterDestinations(destinations, { query: 'lịch sử', category: 'all' })).toHaveLength(1);
  });

  it('matches Vietnamese text without requiring input diacritics', () => {
    expect(filterDestinations(destinations, { query: 'thien cam', category: 'all' })).toEqual([
      thienCam,
    ]);
  });

  it('matches a category exactly after normalization', () => {
    expect(filterDestinations(destinations, { query: '', category: 'di san & van hoa' })).toEqual(
      expect.arrayContaining([sonTrang, bySlug('khu-luu-niem-nguyen-du')]),
    );
    expect(filterDestinations(destinations, { query: '', category: 'Biển' })).toHaveLength(0);
  });

  it('combines query and category filters', () => {
    expect(
      filterDestinations(destinations, {
        query: 'Hà Tĩnh',
        category: 'lịch sử',
      }),
    ).toEqual([dongLoc]);
  });

  it('keeps destinations with no category visible only for all', () => {
    const uncategorized: DestinationPreviewVm = {
      ...thienCam,
      id: 'uncategorized',
      categoryLabel: null,
    };
    const input = [...destinations, uncategorized];

    expect(filterDestinations(input, { query: '', category: 'all' })).toContain(uncategorized);
    expect(filterDestinations(input, { query: '', category: 'biển & thiên nhiên' })).not.toContain(
      uncategorized,
    );
  });

  it('returns an empty list when no destination matches', () => {
    expect(filterDestinations(destinations, { query: 'không tồn tại', category: 'all' })).toEqual(
      [],
    );
  });
});
