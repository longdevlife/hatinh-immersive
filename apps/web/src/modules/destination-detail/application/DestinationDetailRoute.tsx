import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useImmersiveDestinations } from '../../../shared/api/immersive';
import type { DestinationPreviewVm } from '../../../shared/contracts';
import {
  createExploreReturnHref,
  parseExploreReturnHref,
} from '../../../shared/navigation/explore-context';
import {
  SonTrangExperience,
  toSonTrangExperienceVm,
  type SonTrangExperienceMedia,
} from '../../son-trang';
import {
  getDestinationCapabilities,
  type DestinationCapabilityConfig,
} from '../model/destination-capabilities';
import {
  createDestinationImmersiveHref,
  createExploreMapHref,
} from '../model/destination-detail-links';
import { toDestinationDetailPresentationVm } from '../model/destination-detail.types';
import { DestinationExperience } from '../ui/DestinationExperience';

export interface DestinationDetailRouteProps {
  destinations?: readonly DestinationPreviewVm[];
  capabilityConfig?: DestinationCapabilityConfig;
  sonTrangMedia?: SonTrangExperienceMedia;
}

interface DestinationRouteState {
  origin?: 'explore' | 'destination-detail';
}

function DestinationDetailState({ kind }: { kind: 'loading' | 'error' | 'not-found' }) {
  const state = {
    loading: {
      message: 'Đang tải thông tin điểm đến…',
      role: 'status',
    },
    error: {
      message: 'Không thể tải thông tin điểm đến. Vui lòng thử lại sau.',
      role: 'alert',
    },
    'not-found': {
      message: 'Không tìm thấy điểm đến này.',
      role: 'alert',
    },
  } as const;
  const current = state[kind];

  return (
    <main className="destination-detail-state" aria-live="polite" role={current.role}>
      <p>{current.message}</p>
    </main>
  );
}

export function DestinationDetailRoute({
  destinations: destinationsOverride,
  capabilityConfig,
  sonTrangMedia,
}: DestinationDetailRouteProps) {
  const { destinationSlug } = useParams<{ destinationSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const destinationsQuery = useImmersiveDestinations('vi', destinationsOverride === undefined);
  const destinations = destinationsOverride ?? destinationsQuery.data;
  const destination = destinations?.find((candidate) => candidate.slug === destinationSlug);
  const destinationId = destination?.id;
  const destinationMainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!destinationId) {
      return;
    }

    destinationMainRef.current?.focus({ preventScroll: true });
  }, [destinationId]);

  if (destinationsOverride === undefined && destinationsQuery.isPending) {
    return <DestinationDetailState kind="loading" />;
  }

  if (destinationsOverride === undefined && destinationsQuery.isError) {
    return <DestinationDetailState kind="error" />;
  }

  if (!destination) {
    return <DestinationDetailState kind="not-found" />;
  }

  const capabilities = getDestinationCapabilities(destination, capabilityConfig);
  const view = toDestinationDetailPresentationVm(destination, capabilities);
  const sonTrangExperience = toSonTrangExperienceVm(destination, sonTrangMedia);
  const returnTo = new URLSearchParams(location.search).get('returnTo');
  const exploreReturnContext = returnTo ? parseExploreReturnHref(returnTo) : null;
  const resolvedExploreReturnContext = exploreReturnContext ?? {
    destinationSlug: destination.slug,
  };
  const exploreReturnHref = createExploreReturnHref(resolvedExploreReturnContext);
  const cameFromExplore = (location.state as DestinationRouteState | null)?.origin === 'explore';
  const onBackToExplore = () => {
    if (cameFromExplore) {
      navigate(-1);
      return;
    }

    navigate(exploreReturnHref, { replace: true });
  };
  const onOpenMap = destination.geoPoint
    ? () => navigate(createExploreMapHref(destination.slug, resolvedExploreReturnContext))
    : undefined;
  const onEnterPanorama = capabilities.hasPanorama
    ? () =>
        navigate(
          createDestinationImmersiveHref(destination, 'panorama', { returnTo: exploreReturnHref }),
          { state: { origin: 'destination-detail' } },
        )
    : undefined;
  const onEnterSelected3D = capabilities.hasSelected3D
    ? () =>
        navigate(
          createDestinationImmersiveHref(destination, 'overview3d', {
            returnTo: exploreReturnHref,
          }),
          { state: { origin: 'destination-detail' } },
        )
    : undefined;

  if (sonTrangExperience) {
    return (
      <SonTrangExperience
        experience={sonTrangExperience}
        capabilities={capabilities}
        mainRef={destinationMainRef}
        onBackToExplore={onBackToExplore}
        {...(onOpenMap ? { onOpenMap } : {})}
        {...(onEnterPanorama ? { onEnterPanorama } : {})}
        {...(onEnterSelected3D ? { onEnterSelected3D } : {})}
      />
    );
  }

  return (
    <DestinationExperience
      destination={view}
      mainRef={destinationMainRef}
      onBackToExplore={onBackToExplore}
      {...(onOpenMap ? { onOpenMap } : {})}
      {...(onEnterPanorama ? { onEnterPanorama } : {})}
      {...(onEnterSelected3D ? { onEnterSelected3D } : {})}
    />
  );
}

export { DestinationDetailState };
