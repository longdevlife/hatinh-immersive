import { expect, test } from '@playwright/test';

test('desktop Hybrid controls keep cards, markers, filters, preview, and style state aligned', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/explore');

  const destinationList = page.getByRole('region', { name: 'Danh sách điểm đến' });
  const map = page.getByRole('region', { name: 'Bản đồ khám phá Hà Tĩnh' });
  await expect(destinationList).toBeVisible();
  await expect(map).toHaveAttribute('data-explore-map-status', 'ready');
  await expect(destinationList.locator('[data-testid^="destination-card-"]')).toHaveCount(4);
  await expect(page.getByRole('combobox', { name: 'Kiểu bản đồ' })).toHaveValue('default');

  await page.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }).click();
  await expect(map).toHaveAttribute('data-selected-destination-id', 'nguyen-du-memorial');
  const selection = page.getByTestId('explore-selected-destination');
  await expect(selection).toBeVisible();
  await expect(
    selection.getByRole('link', { name: 'Mở tuyến đường đến Khu lưu niệm Nguyễn Du' }),
  ).toHaveAttribute('href', /destination=18\.6647657%2C105\.7667208/);

  await page.getByRole('combobox', { name: 'Kiểu bản đồ' }).selectOption('alternate');
  await expect(page.getByRole('combobox', { name: 'Kiểu bản đồ' })).toHaveValue('alternate');

  await page.screenshot({ path: testInfo.outputPath('explore-map-hybrid-desktop-selected.png') });

  await page.getByRole('button', { name: 'Chọn điểm đến Biển Thiên Cầm' }).click();
  await page.getByRole('button', { name: 'Lịch sử' }).click();
  await expect(map).toHaveAttribute('data-selected-destination-id', '');
  await expect(selection).toBeHidden();
  await expect(
    destinationList.getByTestId('destination-card-dong-loc-junction'),
  ).not.toHaveAttribute('aria-current');
  await page.screenshot({ path: testInfo.outputPath('explore-map-hybrid-desktop-filtered.png') });
});

test('mobile remains card-first and opens a real full-map mode with return-to-list', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explore');

  const destinationList = page.getByRole('region', { name: 'Danh sách điểm đến' });
  const mapShell = page.getByTestId('explore-map');
  await expect(destinationList).toBeVisible();
  await expect(mapShell).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('explore-map-hybrid-mobile-cards.png') });

  await page.getByRole('button', { name: 'Chọn điểm đến Biển Thiên Cầm' }).click();
  await page.getByRole('button', { name: 'Xem bản đồ' }).click();

  await expect(mapShell).toBeVisible();
  await expect(destinationList).toBeHidden();
  await expect(page.getByRole('region', { name: 'Bản đồ khám phá Hà Tĩnh' })).toHaveAttribute(
    'data-selected-destination-id',
    'thien-cam-beach',
  );
  await expect(page.getByRole('button', { name: 'Quay lại danh sách' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
  await page.screenshot({ path: testInfo.outputPath('explore-map-hybrid-mobile-map.png') });

  await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
  await expect(destinationList).toBeVisible();
  await expect(mapShell).toBeHidden();
  await expect(page.getByTestId('destination-card-thien-cam-beach')).toHaveAttribute(
    'aria-current',
    'true',
  );
});
