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
}

export interface ExploreMapCameraTarget {
  latitude: number;
  longitude: number;
  zoom?: number;
}
