import { describe, expect, it } from 'vitest';

import {
  createDestinationDetailHref,
  createExploreReturnHref,
  parseExploreReturnHref,
} from './explore-context';

describe('Explore discovery return context', () => {
  it('round-trips query, category, and selected destination', () => {
    const href = createExploreReturnHref({
      query: 'Nguyễn',
      category: 'Di sản & văn hóa',
      destinationSlug: 'khu-luu-niem-nguyen-du',
      view: 'map',
    });

    expect(parseExploreReturnHref(href)).toEqual({
      query: 'Nguyễn',
      category: 'Di sản & văn hóa',
      destinationSlug: 'khu-luu-niem-nguyen-du',
      view: 'map',
    });
  });

  it('uses the selected destination as the safe direct-link fallback', () => {
    expect(createExploreReturnHref({ destinationSlug: 'bien-thien-cam' })).toBe(
      '/explore?destination=bien-thien-cam',
    );
  });

  it('rejects non-explore return paths', () => {
    expect(parseExploreReturnHref('/admin')).toBeNull();
  });

  it('rejects absolute external return paths', () => {
    expect(parseExploreReturnHref('https://example.com/explore?destination=evil')).toBeNull();
  });

  it('rejects backslash-normalized external return paths', () => {
    expect(parseExploreReturnHref('\\\\evil.com/explore?destination=evil')).toBeNull();
  });

  it('rejects invalid view values instead of inventing discovery state', () => {
    expect(parseExploreReturnHref('/explore?destination=bien-thien-cam&view=grid')).toBeNull();
  });

  it('creates a safe destination fallback only with a valid internal return context', () => {
    expect(
      createDestinationDetailHref(
        'bien-thien-cam',
        '/explore?q=bi%E1%BB%83n&destination=bien-thien-cam&view=map',
      ),
    ).toBe(
      '/explore/bien-thien-cam?returnTo=%2Fexplore%3Fq%3Dbi%25E1%25BB%2583n%26destination%3Dbien-thien-cam%26view%3Dmap',
    );
    expect(createDestinationDetailHref('bien-thien-cam', '\\\\evil.com/explore')).toBe(
      '/explore/bien-thien-cam',
    );
  });
});
