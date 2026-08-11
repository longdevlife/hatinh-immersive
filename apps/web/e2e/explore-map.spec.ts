import { expect, test } from '@playwright/test';

test('explore discovery synchronizes card selection with the deterministic map state', async ({
  page,
}) => {
  const tileRequests: string[] = [];
  page.on('request', (request) => {
    if (/tile\.openstreetmap\.org/i.test(request.url())) {
      tileRequests.push(request.url());
    }
  });

  await page.goto('/explore');
  const map = page.getByRole('application', { name: 'Bản đồ khám phá Hà Tĩnh' });

  await expect(page.locator('#explore-title')).toBeVisible();
  await expect(map).toHaveAttribute('data-explore-map-status', 'ready');
  await expect(map).toHaveAttribute('data-selected-destination-id', '');

  await page.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }).click();

  await expect(page.getByTestId('destination-card-nguyen-du-memorial')).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(map).toHaveAttribute('data-selected-destination-id', 'nguyen-du-memorial');
  expect(tileRequests).toEqual([]);
});

test('mobile keeps destination cards primary until Xem bản đồ is activated', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explore');

  const mapShell = page.getByTestId('explore-map');
  const destinationList = page.getByRole('region', { name: 'Danh sách điểm đến' });
  await expect(destinationList).toBeVisible();
  await expect(mapShell).toBeHidden();

  await page.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }).click();
  await expect(destinationList.getByRole('button', { name: 'Xem chi tiết' })).toBeVisible();

  await page.getByRole('button', { name: 'Xem bản đồ' }).click();

  await expect(mapShell).toBeVisible();
  await expect(destinationList).toBeHidden();
  await expect(page.getByRole('application', { name: 'Bản đồ khám phá Hà Tĩnh' })).toHaveAttribute(
    'data-explore-map-status',
    'ready',
  );

  await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
  await expect(destinationList).toBeVisible();
  await expect(mapShell).toBeHidden();
  await expect(page.getByTestId('destination-card-nguyen-du-memorial')).toHaveAttribute(
    'aria-current',
    'true',
  );

  await page.getByRole('button', { name: 'Xem bản đồ' }).click();
  await expect(mapShell).toBeVisible();
  await expect(page.getByRole('application', { name: 'Bản đồ khám phá Hà Tĩnh' })).toHaveAttribute(
    'data-selected-destination-id',
    'nguyen-du-memorial',
  );
});
