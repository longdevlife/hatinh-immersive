import { DEFAULT_HA_TINH_RASTER_STYLE } from '../../../shared/map/ha-tinh-raster-style';

export type MinimapStyle = string | Record<string, unknown>;

export { DEFAULT_HA_TINH_RASTER_STYLE as DEFAULT_HA_TINH_MINIMAP_STYLE } from '../../../shared/map/ha-tinh-raster-style';

export function requireMinimapStyle(
  style: MinimapStyle | undefined,
): asserts style is MinimapStyle {
  if (!style) {
    throw new Error('MINIMAP_STYLE_REQUIRED');
  }
}

export function resolveMinimapStyle(input: {
  allowDemoFallback?: boolean;
  isProduction: boolean;
  styleUrl?: string;
}): MinimapStyle {
  const styleUrl = input.styleUrl?.trim();
  if (styleUrl) {
    return styleUrl;
  }

  if (input.isProduction && !input.allowDemoFallback) {
    throw new Error('MINIMAP_PRODUCTION_STYLE_REQUIRED');
  }

  return DEFAULT_HA_TINH_RASTER_STYLE;
}
