import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useImmersiveDestinations } from '../../../shared/api/immersive';
import type { DestinationPreviewVm } from '../../../shared/contracts';
import {
  createExploreReturnHref,
  parseExploreReturnHref,
} from '../../../shared/navigation/explore-context';
import { SonTrangExperience, toSonTrangExperienceVm } from '../../son-trang';
import {
  getDestinationCapabilities,
  type DestinationCapabilityConfig,
} from '../model/destination-capabilities';
import {
  createDestinationImmersiveHref,
  createExploreMapHref,
} from '../model/destination-detail-links';
import { toDestinationDetailViewModel } from '../model/destination-detail.types';
import { DestinationExperience } from '../ui/DestinationExperience';

export interface DestinationDetailRouteProps {
  destinations?: readonly DestinationPreviewVm[];
  capabilityConfig?: DestinationCapabilityConfig;
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
  const view = toDestinationDetailViewModel(destination, capabilities);
  const sonTrangExperience = toSonTrangExperienceVm(destination);
  const returnTo = new URLSearchParams(location.search).get('returnTo');
  const exploreReturnContext = returnTo ? parseExploreReturnHref(returnTo) : null;
  const exploreReturnHref = exploreReturnContext
    ? createExploreReturnHref(exploreReturnContext)
    : createExploreReturnHref({ destinationSlug: destination.slug });
  const onBackToExplore = () => navigate(exploreReturnHref);
  const onOpenMap = () => navigate(createExploreMapHref(destination.slug));
  const onEnterPanorama = capabilities.hasPanorama
    ? () => navigate(createDestinationImmersiveHref(destination, 'panorama'))
    : undefined;
  const onEnterSelected3D = capabilities.hasSelected3D
    ? () => navigate(createDestinationImmersiveHref(destination, 'overview3d'))
    : undefined;

  if (sonTrangExperience) {
    return (
      <SonTrangExperience
        experience={sonTrangExperience}
        capabilities={capabilities}
        mainRef={destinationMainRef}
        onBackToExplore={onBackToExplore}
        onOpenMap={onOpenMap}
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
      onOpenMap={onOpenMap}
      {...(onEnterPanorama ? { onEnterPanorama } : {})}
      {...(onEnterSelected3D ? { onEnterSelected3D } : {})}
    />
  );
}

export { DestinationDetailState };
