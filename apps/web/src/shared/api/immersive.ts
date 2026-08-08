import { useGetImmersiveManifest } from '@hatinh/api-client';
import { useMemo } from 'react';

import {
  mapImmersiveManifest,
  type ImmersiveManifestVm,
} from '../../modules/immersive-navigation/api/immersive-manifest.mapper';

export type ImmersiveLocale = 'vi' | 'en';

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

export {
  getImmersiveManifest,
  getScene,
  getSceneNeighbors,
  useGetScene,
  useGetSceneNeighbors,
} from '@hatinh/api-client';

export { useGetImmersiveManifest };
