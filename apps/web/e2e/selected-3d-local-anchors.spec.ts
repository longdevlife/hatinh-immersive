import { expect, test } from '@playwright/test';

test('flies through four local Sơn Trang viewpoints with one persistent renderer', async ({
  page,
}) => {
  await page.goto('/explore/son-trang-co-dam');

  await page.getByRole('button', { name: 'Xem 3D' }).click();

  const renderer = page.getByRole('application', { name: 'Không gian bản đồ 3D' });
  await expect(renderer).toHaveAttribute('data-renderer-status', 'ready');
  await expect(renderer).toHaveAttribute('data-e2e-map3d-mount-count', '1');

  const viewpoints = page.getByRole('navigation', { name: 'Các góc nhìn 3D' });
  await expect(viewpoints.getByRole('button', { name: 'Cổng', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page).toHaveURL(/mode=overview3d&location=son-trang-gate/);
  await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lat', '18.3421');
  await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lng', '105.9032');

  const journey = [
    { name: 'Văn hóa', lat: '18.34232', lng: '105.90348' },
    { name: 'Sinh thái', lat: '18.34192', lng: '105.90372' },
    { name: 'Tâm linh', lat: '18.34246', lng: '105.90296' },
  ];
  for (const { name, lat, lng } of journey) {
    await viewpoints.getByRole('button', { name, exact: true }).click();
    await expect(viewpoints.getByRole('button', { name, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lat', lat);
    await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lng', lng);
  }

  await expect(renderer).toHaveAttribute('data-e2e-map3d-mount-count', '1');
  await expect(renderer).toHaveAttribute('data-e2e-map3d-destroy-count', '0');
  await expect(page).toHaveURL(/mode=overview3d&location=son-trang-spiritual/);
  await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lat', '18.34246');
  await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lng', '105.90296');
});
