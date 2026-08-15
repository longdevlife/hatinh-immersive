export type ExploreMapStyle = string | Record<string, unknown>;

export type ExploreMapLocationStatus =
  'idle' | 'requesting' | 'available' | 'denied' | 'unavailable';

export interface ExploreMapStyleOption {
  id: string;
  label: string;
  style: ExploreMapStyle;
}

export interface ExploreMapUserLocation {
  latitude: number;
  longitude: number;
}

export interface ExploreMapDestination {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  categoryLabel: string | null;
  featured: boolean;
}

export interface ExploreMapViewportState {
  destinations: readonly ExploreMapDestination[];
  selectedDestinationId: string | null;
  userLocation?: ExploreMapUserLocation | null;
}

export interface ExploreMapCameraTarget {
  latitude: number;
  longitude: number;
  zoom?: number;
}
