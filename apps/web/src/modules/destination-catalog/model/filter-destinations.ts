import type { DestinationPreviewVm } from '../../../shared/contracts';

export type DestinationCategoryFilter = 'all' | string;

export interface DestinationFilterInput {
  query: string;
  category: DestinationCategoryFilter;
}

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('vi')
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function filterDestinations(
  destinations: readonly DestinationPreviewVm[],
  input: DestinationFilterInput,
): DestinationPreviewVm[] {
  const normalizedQuery = normalize(input.query);
  const normalizedCategory = normalize(input.category);
  const showAllCategories = normalizedCategory === '' || normalizedCategory === 'all';

  return destinations.filter((destination) => {
    const category = destination.categoryLabel ? normalize(destination.categoryLabel) : '';
    const searchableText = [destination.name, destination.summary, destination.categoryLabel ?? '']
      .map(normalize)
      .join(' ');

    const matchesQuery = normalizedQuery === '' || searchableText.includes(normalizedQuery);
    const matchesCategory =
      showAllCategories || (category !== '' && category === normalizedCategory);

    return matchesQuery && matchesCategory;
  });
}
