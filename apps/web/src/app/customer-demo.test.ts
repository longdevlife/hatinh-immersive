import { describe, expect, it } from 'vitest';

import { isCustomerDemoRoute } from './customer-demo';

describe('customer demo 360 route opt-in', () => {
  it('requires the explicit customer opt-in on the panorama route', () => {
    expect(
      isCustomerDemoRoute(
        '?mode=panorama&demo=customer&scene=thien-cam-boardwalk',
        'bien-thien-cam',
      ),
    ).toBe(true);
  });

  it('does not enable customer demo from the public panorama route', () => {
    expect(isCustomerDemoRoute('?mode=panorama&scene=thien-cam-boardwalk', 'bien-thien-cam')).toBe(
      false,
    );
  });

  it('does not allow customer demo to expose Sơn Trang fixtures', () => {
    expect(
      isCustomerDemoRoute('?mode=panorama&demo=customer&scene=scene-01', 'son-trang-co-dam'),
    ).toBe(false);
  });

  it('does not treat customer opt-in on another mode as a panorama demo', () => {
    expect(isCustomerDemoRoute('?mode=overview3d&demo=customer', 'bien-thien-cam')).toBe(false);
  });
});
