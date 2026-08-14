export interface ExploreReturnContext {
  query?: string;
  category?: string;
  destinationSlug: string;
  view?: 'cards' | 'map';
}

const INTERNAL_NAVIGATION_ORIGIN = 'https://immersive.hatinh.local';

export function createExploreReturnHref(context: ExploreReturnContext): string {
  const params = new URLSearchParams();
  if (context.query?.trim()) {
    params.set('q', context.query.trim());
  }
  if (context.category?.trim()) {
    params.set('category', context.category.trim());
  }
  params.set('destination', context.destinationSlug);
  if (context.view) {
    params.set('view', context.view);
  }
  return `/explore?${params.toString()}`;
}

export function createDestinationDetailHref(destinationSlug: string, returnTo?: string): string {
  const context = returnTo ? parseExploreReturnHref(returnTo) : null;
  if (!context) {
    return `/explore/${encodeURIComponent(destinationSlug)}`;
  }

  return `/explore/${encodeURIComponent(destinationSlug)}?returnTo=${encodeURIComponent(createExploreReturnHref(context))}`;
}

export function parseExploreReturnHref(input: string): ExploreReturnContext | null {
  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(input)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(input, INTERNAL_NAVIGATION_ORIGIN);
  } catch {
    return null;
  }

  if (url.origin !== INTERNAL_NAVIGATION_ORIGIN || url.pathname !== '/explore') {
    return null;
  }

  const destinationSlug = url.searchParams.get('destination')?.trim();
  if (!destinationSlug) {
    return null;
  }

  const query = url.searchParams.get('q')?.trim();
  const category = url.searchParams.get('category')?.trim();
  const rawView = url.searchParams.get('view')?.trim();
  if (rawView && rawView !== 'cards' && rawView !== 'map') {
    return null;
  }
  const view: ExploreReturnContext['view'] =
    rawView === 'cards' || rawView === 'map' ? rawView : undefined;

  return {
    ...(query ? { query } : {}),
    ...(category ? { category } : {}),
    ...(view ? { view } : {}),
    destinationSlug,
  };
}
