import { describe, expect, it } from 'vitest';

import { createExploreReturnHref, parseExploreReturnHref } from './explore-context';

describe('Explore discovery return context', () => {
  it('round-trips query, category, and selected destination', () => {
    const href = createExploreReturnHref({
      query: 'Nguyễn',
      category: 'Di sản & văn hóa',
      destinationSlug: 'khu-luu-niem-nguyen-du',
    });

    expect(parseExploreReturnHref(href)).toEqual({
      query: 'Nguyễn',
      category: 'Di sản & văn hóa',
      destinationSlug: 'khu-luu-niem-nguyen-du',
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
});
