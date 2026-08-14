export type MediaKind = 'image' | 'panorama';

export type MediaRightsStatus =
  'customer-owned' | 'licensed' | 'demo-only' | 'candidate-needs-permission';

export type MediaSourceLicense =
  | 'public-domain'
  | 'CC-BY-SA-4.0'
  | 'CC-BY-SA-3.0'
  | 'GFDL'
  | 'customer-owned'
  | 'demo-only'
  | 'candidate-needs-permission';

export interface MediaSourceMetadata {
  sourcePageUrl: string;
  licenseUrl: string;
  author: string | null;
  license: MediaSourceLicense;
  attributionText: string | null;
  modifiedFromSource: boolean;
  nativeWidth: number;
  nativeHeight: number;
}

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
  source?: MediaSourceMetadata;
  variants?: readonly MediaVariant[];
}

export interface DestinationMediaVm {
  hero: MediaAsset | null;
  gallery: readonly MediaAsset[];
}
