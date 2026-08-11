import { expect, test } from '@playwright/test';

test('keeps search focus treatment on the rounded command surface', async ({ page }) => {
  await page.goto('/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90');

  await page.getByRole('button', { name: 'Mở tìm kiếm' }).click();

  const search = page.getByRole('search', { name: 'Tìm kiếm điểm đến' });
  const input = search.getByRole('searchbox', { name: 'Nhập tên điểm đến' });

  await expect(input).toBeFocused();
  await expect
    .poll(() => input.evaluate((element) => getComputedStyle(element).outlineStyle))
    .toBe('none');
  await expect
    .poll(() => search.evaluate((element) => getComputedStyle(element).outlineStyle))
    .toBe('solid');
});
