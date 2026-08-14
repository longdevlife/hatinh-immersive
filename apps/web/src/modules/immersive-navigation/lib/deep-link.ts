import type { ImmersiveMode } from '../../../shared/contracts';

import { DEFAULT_NAVIGATION_VIEW, normalizeNavigationView } from '../model/navigation.view';
import type { NavigationView } from '../model/navigation.types';

const IMMERSIVE_EXPLORE_PATH = /^\/explore\/([^/]+)\/immersive\/?$/;
const LEGACY_EXPLORE_PATH = /^\/explore\/([^/]+)\/?$/;
const DEFAULT_ORIGIN = 'https://immersive.hatinh.local';

export interface ImmersiveDeepLinkState {
  destinationSlug: string;
  mode: ImmersiveMode;
  locationId: string | null;
  sceneId: string | null;
  view: NavigationView;
  returnTo?: string;
}

function parseFiniteNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeView(view: Partial<NavigationView> = {}): NavigationView {
  const normalized = normalizeNavigationView(DEFAULT_NAVIGATION_VIEW, view);

  return {
    heading: Number(normalized.heading.toFixed(3)),
    pitch: Number(normalized.pitch.toFixed(3)),
    fov: Number(normalized.fov.toFixed(3)),
  };
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(3)));
}

function decodeDestinationSlug(encodedSlug: string): string | null {
  try {
    const slug = decodeURIComponent(encodedSlug);
    return slug.length > 0 ? slug : null;
  } catch {
    return null;
  }
}

export function encodeImmersiveDeepLink(state: ImmersiveDeepLinkState): string {
  if (state.destinationSlug.trim() === '') {
    throw new Error('IMMERSIVE_DESTINATION_SLUG_REQUIRED');
  }

  const params = new URLSearchParams();
  params.set('mode', state.mode);

  if (state.locationId?.trim()) {
    params.set('location', state.locationId);
  }

  if (state.mode === 'panorama') {
    const view = normalizeView(state.view);
    if (state.sceneId?.trim()) {
      params.set('scene', state.sceneId);
    }
    params.set('h', formatNumber(view.heading));
    params.set('p', formatNumber(view.pitch));
    params.set('fov', formatNumber(view.fov));
  }
  if (state.returnTo) {
    params.set('returnTo', state.returnTo);
  }

  return `/explore/${encodeURIComponent(state.destinationSlug)}/immersive?${params.toString()}`;
}

export function decodeImmersiveDeepLink(input: string): ImmersiveDeepLinkState | null {
  let url: URL;
  try {
    url = new URL(input, DEFAULT_ORIGIN);
  } catch {
    return null;
  }

  const match = IMMERSIVE_EXPLORE_PATH.exec(url.pathname) ?? LEGACY_EXPLORE_PATH.exec(url.pathname);
  if (!match?.[1]) {
    return null;
  }

  const destinationSlug = decodeDestinationSlug(match[1]);
  if (!destinationSlug) {
    return null;
  }

  const requestedMode = url.searchParams.get('mode');
  if (requestedMode !== 'panorama' && requestedMode !== 'overview3d') {
    return null;
  }

  const mode: ImmersiveMode = requestedMode;
  const locationId = url.searchParams.get('location')?.trim() || null;
  const returnTo = url.searchParams.get('returnTo')?.trim() || undefined;
  if (mode === 'overview3d') {
    return {
      destinationSlug,
      mode,
      locationId,
      sceneId: null,
      view: { ...DEFAULT_NAVIGATION_VIEW },
      ...(returnTo ? { returnTo } : {}),
    };
  }

  const heading = parseFiniteNumber(url.searchParams.get('h'));
  const pitch = parseFiniteNumber(url.searchParams.get('p'));
  const fov = parseFiniteNumber(url.searchParams.get('fov'));

  return {
    destinationSlug,
    mode,
    locationId,
    sceneId: url.searchParams.get('scene')?.trim() || null,
    view: normalizeView({
      ...(heading === undefined ? {} : { heading }),
      ...(pitch === undefined ? {} : { pitch }),
      ...(fov === undefined ? {} : { fov }),
    }),
    ...(returnTo ? { returnTo } : {}),
  };
}
