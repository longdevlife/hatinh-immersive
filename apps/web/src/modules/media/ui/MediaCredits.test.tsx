import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { MediaAsset } from '../model/media.types';
import { MediaCredits } from './MediaCredits';

const licensedAsset = {
  id: 'licensed-asset',
  kind: 'image',
  src: '/demo/media/thien-cam/hero-real.webp',
  alt: 'Bãi biển Thiên Cầm',
  width: 1774,
  height: 998,
  rightsStatus: 'licensed',
  source: {
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Thiencambeach.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    author: 'Khoitran1957',
    license: 'CC-BY-SA-4.0',
    attributionText: '© Khoitran1957, CC BY-SA 4.0, via Wikimedia Commons.',
    modifiedFromSource: true,
    nativeWidth: 2816,
    nativeHeight: 1584,
  },
} as unknown as MediaAsset;

describe('MediaCredits', () => {
  it('shows source, author, license link and modification notice in one disclosure', () => {
    render(<MediaCredits assets={[licensedAsset]} />);

    expect(
      screen.getByRole('group', { name: 'Thông tin hình ảnh và bản quyền' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nguồn ảnh: Khoitran1957' })).toHaveAttribute(
      'href',
      licensedAsset.source!.sourcePageUrl,
    );
    expect(screen.getByRole('link', { name: 'Giấy phép CC-BY-SA-4.0' })).toHaveAttribute(
      'href',
      licensedAsset.source!.licenseUrl,
    );
    expect(screen.getByText(/Đã chuyển đổi sang WebP/i)).toBeInTheDocument();
  });
});
