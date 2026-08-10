export type ImmersiveRendererMode = 'fake' | 'maplibre' | 'google' | 'photo-sphere-viewer';

export interface ImmersiveRendererModes {
  map3d: 'fake' | 'google';
  minimap: 'fake' | 'maplibre';
  panorama: 'fake' | 'photo-sphere-viewer';
}

export interface ImmersiveRendererModeEnvironment {
  VITE_IMMERSIVE_MAP3D_MODE?: string;
  VITE_IMMERSIVE_MINIMAP_MODE?: string;
  VITE_IMMERSIVE_PANORAMA_MODE?: string;
  VITE_IMMERSIVE_RENDERER_MODE?: string;
}

export function resolveRendererModes(environment: unknown): ImmersiveRendererModes {
  const modes = environment as ImmersiveRendererModeEnvironment;
  const aggregateFake = modes.VITE_IMMERSIVE_RENDERER_MODE === 'fake';

  return {
    map3d: aggregateFake || modes.VITE_IMMERSIVE_MAP3D_MODE === 'fake' ? 'fake' : 'google',
    panorama:
      aggregateFake || modes.VITE_IMMERSIVE_PANORAMA_MODE === 'fake'
        ? 'fake'
        : 'photo-sphere-viewer',
    minimap:
      modes.VITE_IMMERSIVE_MINIMAP_MODE === 'maplibre'
        ? 'maplibre'
        : aggregateFake || modes.VITE_IMMERSIVE_MINIMAP_MODE === 'fake'
          ? 'fake'
          : 'maplibre',
  };
}
