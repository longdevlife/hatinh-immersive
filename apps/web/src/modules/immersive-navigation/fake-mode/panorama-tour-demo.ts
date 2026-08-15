import type { ImmersiveManifestVm } from '../api/immersive-manifest.mapper';
import {
  buildDemoManifest,
  buildDemoDestinationTour,
  getDemoSceneDefinitions,
  type DemoTourBuildMode,
} from './demo-tour-catalog';

const SON_TRANG_SLUG = 'son-trang-co-dam';

export const SON_TRANG_PANORAMA_TOUR_SCENE_IDS = getDemoSceneDefinitions(SON_TRANG_SLUG).map(
  ({ id }) => id,
);

export type DemoPanoramaMediaMode = DemoTourBuildMode;

export function createDemoPanoramaTourManifest(
  manifest: ImmersiveManifestVm,
  mediaMode: DemoPanoramaMediaMode = 'public',
): ImmersiveManifestVm {
  const tour = buildDemoDestinationTour(manifest.destination, mediaMode);
  const composed = buildDemoManifest(manifest.destination, mediaMode);

  return {
    ...composed,
    destination: {
      ...manifest.destination,
      defaultSceneId: tour.defaultSceneId,
    },
  };
}
