export const PUBLIC_MEDIA_URL_OPTIONS = Symbol('PUBLIC_MEDIA_URL_OPTIONS');

export interface PublicMediaUrlOptions {
  publicOrigin?: string | null;
}

export interface PanoramaMediaKeys {
  manifestKey: string | null;
  previewKey?: string | null;
}

export interface PublicPanoramaMediaUrls {
  manifestUrl: string | null;
  previewUrl: string | null;
}

export function resolvePanoramaMediaUrls(
  keys: PanoramaMediaKeys,
  options: PublicMediaUrlOptions = {},
): PublicPanoramaMediaUrls {
  const manifestUrl = resolvePublicMediaUrl(keys.manifestKey, options);
  const previewKey =
    keys.previewKey === undefined && keys.manifestKey !== null
      ? derivePreviewKey(keys.manifestKey)
      : (keys.previewKey ?? null);

  return {
    manifestUrl,
    previewUrl: manifestUrl ? resolvePublicMediaUrl(previewKey, options) : null,
  };
}

export function resolvePublicMediaUrl(
  storageKey: string | null | undefined,
  options: PublicMediaUrlOptions = {},
): string | null {
  const normalizedKey = storageKey?.trim();
  if (!normalizedKey) {
    return null;
  }

  if (isHttpUrl(normalizedKey)) {
    return normalizedKey;
  }

  const publicOrigin = options.publicOrigin?.trim();
  if (!publicOrigin) {
    return null;
  }

  const origin = new URL(publicOrigin);
  const base = origin.toString().endsWith('/') ? origin.toString() : `${origin.toString()}/`;
  return new URL(normalizedKey.replace(/^\/+/, ''), base).toString();
}

function derivePreviewKey(manifestKey: string): string {
  const normalizedKey = manifestKey.trim();
  if (isHttpUrl(normalizedKey)) {
    return new URL('preview.webp', normalizedKey).toString();
  }

  const separatorIndex = normalizedKey.lastIndexOf('/');
  return `${separatorIndex >= 0 ? normalizedKey.slice(0, separatorIndex + 1) : ''}preview.webp`;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
