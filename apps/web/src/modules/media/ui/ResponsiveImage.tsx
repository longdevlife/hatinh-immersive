import type { ImgHTMLAttributes } from 'react';

import type { MediaAsset } from '../model/media.types';

export interface ResponsiveImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'alt' | 'height' | 'src' | 'srcSet' | 'width'
> {
  asset: MediaAsset;
  sizes?: string;
  loading?: 'eager' | 'lazy';
}

export function ResponsiveImage({
  asset,
  className,
  loading = 'lazy',
  sizes,
  style,
  ...props
}: ResponsiveImageProps) {
  const srcSet = asset.variants?.map((variant) => `${variant.src} ${variant.width}w`).join(', ');

  return (
    <img
      {...props}
      src={asset.src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      loading={loading}
      decoding="async"
      {...(srcSet ? { srcSet } : {})}
      {...(sizes ? { sizes } : {})}
      className={className}
      style={{ aspectRatio: `${asset.width} / ${asset.height}`, ...style }}
    />
  );
}
