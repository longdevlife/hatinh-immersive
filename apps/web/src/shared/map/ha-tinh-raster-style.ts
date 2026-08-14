export const DEFAULT_HA_TINH_RASTER_STYLE: Record<string, unknown> = {
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
