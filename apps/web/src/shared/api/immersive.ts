import { useGetImmersiveManifest, useListDestinations } from '@hatinh/api-client';
import { useMemo } from 'react';

import type { DestinationPreviewVm, ImmersiveLocale } from '../contracts';
import {
  mapImmersiveManifest,
  type ImmersiveManifestVm,
} from '../../modules/immersive-navigation/api/immersive-manifest.mapper';
import { toLocationCameraPreset } from './location-camera-preset';

export function useImmersiveManifest(slug: string, locale: ImmersiveLocale = 'vi', enabled = true) {
  const query = useGetImmersiveManifest(
    slug,
    { locale },
    {
      query: {
        enabled,
        staleTime: 60_000,
      },
    },
  );
  const data = useMemo(
    () =>
      query.data?.status === 200 && query.data.data
        ? mapImmersiveManifest(query.data.data)
        : undefined,
    [query.data?.data, query.data?.status],
  );

  return {
    ...query,
    data,
  } as typeof query & { data: ImmersiveManifestVm | undefined };
}

export function useImmersiveDestinations(locale: ImmersiveLocale = 'vi', enabled = true) {
  const query = useListDestinations(
    { locale },
    {
      query: {
        enabled,
        staleTime: 60_000,
      },
    },
  );
  const data = useMemo<DestinationPreviewVm[]>(
    () =>
      query.data?.status === 200
        ? query.data.data.map((destination) => {
            const cameraPreset = toLocationCameraPreset(destination.cameraPreset);
            return {
              id: destination.id,
              name: destination.name,
              slug: destination.slug,
              summary: destination.summary,
              coverImageUrl: destination.coverImageUrl,
              categoryLabel: destination.categoryLabel,
              defaultSceneId: destination.defaultSceneId,
              geoPoint: destination.geoPoint,
              ...(cameraPreset ? { cameraPreset } : {}),
            };
          })
        : [],
    [query.data],
  );

  return {
    ...query,
    data,
  };
}

export {
  getImmersiveManifest,
  getScene,
  getSceneNeighbors,
  useGetScene,
  useGetSceneNeighbors,
} from '@hatinh/api-client';

export { useGetImmersiveManifest };
