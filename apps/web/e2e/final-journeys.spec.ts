import { expect, test } from '@playwright/test';

test('desktop completes home to filtered destination detail without entering a renderer', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bắt đầu khám phá' }).click();

  await expect(page).toHaveURL('/explore');
  await page.getByRole('button', { name: 'Di sản & văn hóa' }).click();

  await expect(page.getByTestId('destination-card-nguyen-du-memorial')).toBeVisible();
  await expect(page.getByTestId('destination-card-thien-cam-beach')).toBeHidden();

  await page.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }).click();
  await page
    .getByTestId('explore-selected-destination')
    .getByRole('button', { name: 'Xem chi tiết' })
    .click();

  await expect(page).toHaveURL('/explore/khu-luu-niem-nguyen-du');
  await expect(page.getByRole('main', { name: 'Thông tin điểm đến' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Khu lưu niệm Nguyễn Du' })).toBeVisible();
  await expect(page.locator('[data-renderer-status]')).toHaveCount(0);
});

test('mobile opens the map, receives a POI selection from the map engine, and opens detail', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explore');

  await page.getByRole('button', { name: 'Xem bản đồ' }).click();

  const map = page.getByRole('application', { name: 'Bản đồ khám phá Hà Tĩnh' });
  await expect(map).toHaveAttribute('data-explore-map-status', 'ready');

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('hatinh:e2e:explore-map-select', {
        detail: { destinationId: 'thien-cam-beach' },
      }),
    );
  });

  await expect(map).toHaveAttribute('data-selected-destination-id', 'thien-cam-beach');
  await page
    .getByTestId('explore-selected-destination')
    .getByRole('button', { name: 'Xem chi tiết' })
    .click();

  await expect(page).toHaveURL('/explore/bien-thien-cam');
  await expect(page.getByRole('main', { name: 'Thông tin điểm đến' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Biển Thiên Cầm' })).toBeVisible();
  await expect(page.locator('[data-renderer-status]')).toHaveCount(0);
});
