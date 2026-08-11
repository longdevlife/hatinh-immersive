export type Selected3DAvailability = 'available' | 'unavailable' | 'disabled';

export interface DestinationCapabilities {
  hasPanorama: boolean;
  hasSelected3D: boolean;
  selected3DAvailability: Selected3DAvailability;
}
