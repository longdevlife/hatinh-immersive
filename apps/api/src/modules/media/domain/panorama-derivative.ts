export function panoramaDerivativePrefix(mediaAssetId: string): string {
  return `processed/panorama/${mediaAssetId}`;
}

export function hasCanonicalPanoramaDerivativeKeys(input: {
  mediaAssetId: string;
  manifestKey: string | null;
  previewKey: string | null;
}): boolean {
  const prefix = panoramaDerivativePrefix(input.mediaAssetId);
  return (
    input.manifestKey === `${prefix}/manifest.json` && input.previewKey === `${prefix}/preview.webp`
  );
}
