import { useEffect, useRef, useState } from 'react';
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
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

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
    setIsNavigatingBack(true);

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

  return (
    <>
      {isNavigatingBack && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem',
            backgroundColor: 'var(--theme-bg-app, #0c1410)',
            opacity: 0.96,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              border: '3.5px solid rgba(0, 168, 98, 0.2)',
              borderTopColor: 'var(--theme-primary, #00a862)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p
            style={{
              color: 'var(--theme-text-primary, #f2f7f4)',
              fontSize: '1rem',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Đang mở bản đồ khám phá…
          </p>
        </div>
      )}
      {sonTrangExperience ? (
        <SonTrangExperience
          experience={sonTrangExperience}
          capabilities={capabilities}
          mainRef={destinationMainRef}
          onBackToExplore={onBackToExplore}
          {...(onOpenMap ? { onOpenMap } : {})}
          {...(onEnterPanorama ? { onEnterPanorama } : {})}
          {...(onEnterSelected3D ? { onEnterSelected3D } : {})}
        />
      ) : (
        <DestinationExperience
          destination={view}
          mainRef={destinationMainRef}
          onBackToExplore={onBackToExplore}
          {...(onOpenMap ? { onOpenMap } : {})}
          {...(onEnterPanorama ? { onEnterPanorama } : {})}
          {...(onEnterSelected3D ? { onEnterSelected3D } : {})}
        />
      )}
    </>
  );
}

export { DestinationDetailState };
