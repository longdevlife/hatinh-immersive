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
  for (const name of ['Văn hóa', 'Sinh thái', 'Tâm linh']) {
    await viewpoints.getByRole('button', { name }).click();
    await expect(viewpoints.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
  }

  await expect(renderer).toHaveAttribute('data-e2e-map3d-mount-count', '1');
  await expect(renderer).toHaveAttribute('data-e2e-map3d-destroy-count', '0');
  await expect(page).toHaveURL(/mode=overview3d&location=son-trang-spiritual/);
  await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lat', '18.34246');
  await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lng', '105.90296');
});
