export const CUSTOMER_DEMO_DESTINATION_SLUG = 'bien-thien-cam';

/**
 * Customer Demo 360 is an explicit route opt-in. Public panorama URLs never
 * inherit this relaxed media policy implicitly.
 */
export function isCustomerDemoRoute(search: string, destinationSlug: string): boolean {
  const params = new URLSearchParams(search);

  return (
    params.get('mode') === 'panorama' &&
    params.get('demo') === 'customer' &&
    destinationSlug === CUSTOMER_DEMO_DESTINATION_SLUG
  );
}
