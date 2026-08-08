export type MinimapStyle = string | Record<string, unknown>;

export const DEFAULT_HA_TINH_MINIMAP_STYLE: Record<string, unknown> = {
  layers: [
    {
      id: 'openstreetmap',
      source: 'openstreetmap',
      type: 'raster',
    },
  ],
  sources: {
    openstreetmap: {
      attribution: '© OpenStreetMap contributors',
      tileSize: 256,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      type: 'raster',
    },
  },
  version: 8,
};

export function requireMinimapStyle(
  style: MinimapStyle | undefined,
): asserts style is MinimapStyle {
  if (!style) {
    throw new Error('MINIMAP_STYLE_REQUIRED');
  }
}

export function resolveMinimapStyle(input: {
  isProduction: boolean;
  styleUrl?: string;
}): MinimapStyle {
  const styleUrl = input.styleUrl?.trim();
  if (styleUrl) {
    return styleUrl;
  }

  if (input.isProduction) {
    throw new Error('MINIMAP_PRODUCTION_STYLE_REQUIRED');
  }

  return DEFAULT_HA_TINH_MINIMAP_STYLE;
}
