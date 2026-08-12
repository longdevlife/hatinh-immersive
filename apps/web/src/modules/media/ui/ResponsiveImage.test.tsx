import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { MediaAsset } from '../model/media.types';
import { ResponsiveImage } from './ResponsiveImage';

const asset: MediaAsset = {
  id: 'media-01',
  kind: 'image',
  src: '/demo/media/son-trang/hero.png',
  alt: 'Sơn Trang Cổ Đạm',
  width: 1774,
  height: 887,
  rightsStatus: 'demo-only',
  variants: [
    { src: '/demo/media/son-trang/hero-900.png', width: 900 },
    { src: '/demo/media/son-trang/hero-1774.png', width: 1774 },
  ],
};
const variants = asset.variants!;

describe('ResponsiveImage', () => {
  it('preserves intrinsic dimensions and emits responsive loading hints', () => {
    render(<ResponsiveImage asset={asset} sizes="(min-width: 900px) 50vw, 100vw" />);

    const image = screen.getByRole('img', { name: asset.alt });
    expect(image).toHaveAttribute('src', asset.src);
    expect(image).toHaveAttribute('width', String(asset.width));
    expect(image).toHaveAttribute('height', String(asset.height));
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(image).toHaveAttribute('sizes', '(min-width: 900px) 50vw, 100vw');
    expect(image).toHaveAttribute('srcset', `${variants[0]!.src} 900w, ${variants[1]!.src} 1774w`);
  });
});
