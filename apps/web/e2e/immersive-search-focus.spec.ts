import { expect, test } from '@playwright/test';

test('keeps the unified media dock keyboard focusable', async ({ page }) => {
  await page.goto('/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90');

  const mediaDock = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await expect(mediaDock).toBeVisible();

  const autoTourButton = page.getByRole('button', { name: 'Bắt đầu hành trình' });
  await expect(autoTourButton).toBeVisible();
  await autoTourButton.focus();
  await expect(autoTourButton).toBeFocused();
});
