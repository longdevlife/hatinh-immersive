import { expect, test } from '@playwright/test';

test('public fake demo keeps Sơn Trang as a showcase shell without a 360 CTA', async ({ page }) => {
  await page.goto('/explore/son-trang-co-dam');

  await expect(page.getByRole('heading', { name: 'Sơn Trang Cổ Đạm' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Khám phá 360°' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Xem trên bản đồ' })).toHaveCount(0);
});

test('public fake Explore does not create an unverified Sơn Trang map destination', async ({
  page,
}) => {
  await page.goto('/explore?view=map');

  const map = page.getByRole('region', { name: 'Bản đồ khám phá Hà Tĩnh' });
  await expect(map).toHaveAttribute('data-explore-map-status', 'ready');
  await expect(map).toHaveAttribute(
    'data-destination-ids',
    'thien-cam-beach,nguyen-du-memorial,dong-loc-junction',
  );
  await expect(map).not.toHaveAttribute('data-destination-ids', /son-trang-co-dam/);
});

test('public fake direct Sơn Trang panorama links fall back without synthetic scenes', async ({
  page,
}) => {
  await page.goto('/explore/son-trang-co-dam/immersive?mode=panorama');

  await expect(page).toHaveURL('/explore/son-trang-co-dam');
  await expect(page.getByRole('heading', { name: 'Sơn Trang Cổ Đạm' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /Hành trình 360/i })).toHaveCount(0);
  await expect(page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' })).toHaveCount(
    0,
  );
});
