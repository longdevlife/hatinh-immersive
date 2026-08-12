export {
  DestinationDetailRoute,
  DestinationDetailState,
} from './application/DestinationDetailRoute';
export type { DestinationDetailRouteProps } from './application/DestinationDetailRoute';
export {
  canEnterSelected3D,
  getDestinationCapabilities,
  getSelected3DAvailability,
  resolveDestinationCapabilityConfig,
} from './model/destination-capabilities';
export type { DestinationCapabilityConfig } from './model/destination-capabilities';
export {
  createDestinationImmersiveHref,
  createExploreMapHref,
} from './model/destination-detail-links';
export {
  toDestinationDetailPresentationVm,
  toDestinationDetailViewModel,
  type DestinationCapabilities,
  type DestinationDetailFactVm,
  type DestinationDetailPresentationVm,
  type DestinationDetailSectionVm,
  type DestinationDetailViewModel,
  type DestinationExperienceProps,
} from './model/destination-detail.types';
