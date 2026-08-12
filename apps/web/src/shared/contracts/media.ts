export type MediaKind = 'image' | 'panorama';

export type MediaRightsStatus = 'customer-owned' | 'licensed' | 'demo-only';

export interface MediaVariant {
  src: string;
  width: number;
}

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  src: string;
  alt: string;
  width: number;
  height: number;
  attribution?: string | null;
  rightsStatus: MediaRightsStatus;
  variants?: readonly MediaVariant[];
}

export interface DestinationMediaVm {
  hero: MediaAsset | null;
  gallery: readonly MediaAsset[];
}
