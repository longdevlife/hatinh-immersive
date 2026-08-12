export interface ExploreReturnContext {
  query?: string;
  category?: string;
  destinationSlug: string;
}

export function createExploreReturnHref(context: ExploreReturnContext): string {
  const params = new URLSearchParams();
  if (context.query?.trim()) {
    params.set('q', context.query.trim());
  }
  if (context.category?.trim()) {
    params.set('category', context.category.trim());
  }
  params.set('destination', context.destinationSlug);
  return `/explore?${params.toString()}`;
}

export function parseExploreReturnHref(input: string): ExploreReturnContext | null {
  let url: URL;
  try {
    url = new URL(input, 'https://immersive.hatinh.local');
  } catch {
    return null;
  }

  if (url.pathname !== '/explore') {
    return null;
  }

  const destinationSlug = url.searchParams.get('destination')?.trim();
  if (!destinationSlug) {
    return null;
  }

  const query = url.searchParams.get('q')?.trim();
  const category = url.searchParams.get('category')?.trim();
  return {
    ...(query ? { query } : {}),
    ...(category ? { category } : {}),
    destinationSlug,
  };
}
