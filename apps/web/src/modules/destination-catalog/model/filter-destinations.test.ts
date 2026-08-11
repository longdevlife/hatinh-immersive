import { DEMO_DESTINATIONS } from '../../immersive-navigation/fake-mode/demo-catalog';
import type { DestinationPreviewVm } from '../../../shared/contracts';

import { filterDestinations } from './filter-destinations';

const destinations = DEMO_DESTINATIONS.map(({ preview }) => preview);

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
      destinations[0],
    ]);
  });

  it('matches a category exactly after normalization', () => {
    expect(filterDestinations(destinations, { query: '', category: 'di san & van hoa' })).toEqual([
      destinations[1],
    ]);
    expect(filterDestinations(destinations, { query: '', category: 'Biển' })).toHaveLength(0);
  });

  it('combines query and category filters', () => {
    expect(
      filterDestinations(destinations, {
        query: 'Hà Tĩnh',
        category: 'lịch sử',
      }),
    ).toEqual([destinations[2]]);
  });

  it('keeps destinations with no category visible only for all', () => {
    const uncategorized: DestinationPreviewVm = {
      ...destinations[0]!,
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
