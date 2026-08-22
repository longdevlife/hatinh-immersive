import { expect, test } from '@playwright/test';

const publicSceneUrl = '/explore/bien-thien-cam/immersive?mode=panorama&scene=thien-cam-boardwalk';
const customerDemoSceneUrl =
  '/explore/bien-thien-cam/immersive?mode=panorama&demo=customer&scene=thien-cam-boardwalk';

test('the same 2048x1024 Thiên Cầm asset is rejected publicly and opens in explicit customer demo mode', async ({
  page,
}) => {
  await page.goto(publicSceneUrl);

  await expect(page.getByRole('heading', { name: '360° đang được cập nhật' })).toBeVisible();
  await expect(page.locator('[data-renderer-status="ready"]')).toHaveCount(0);
  await expect(page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' })).toHaveCount(
    0,
  );

  await page.goto(customerDemoSceneUrl);

  await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();
  await expect(
    page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' }),
  ).toBeVisible();
  await expect(page.getByTestId('panorama-demo-badge')).toHaveText('Bản demo 360° · Ảnh tham khảo');
  await expect(page.getByRole('heading', { name: 'Lối dạo Thiên Cầm' })).toBeVisible();

  const rail = page.getByRole('navigation', { name: 'Hành trình 360 Biển Thiên Cầm' });
  await expect(rail).toBeVisible();
  for (const sceneLabel of ['Lối dạo Thiên Cầm', 'Bờ biển Thiên Cầm', 'Điểm ngắm Thiên Cầm']) {
    const sceneButton = rail.getByRole('button', { name: sceneLabel, exact: true });
    await expect(sceneButton).toBeEnabled();
    await expect(sceneButton).not.toHaveClass(/is-unavailable/);
    await expect(sceneButton).toHaveAttribute('aria-label', sceneLabel);
  }
  await rail.getByRole('button', { name: 'Bờ biển Thiên Cầm' }).click();

  await expect(page.getByRole('heading', { name: 'Bờ biển Thiên Cầm' })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('demo')).toBe('customer');
  await expect.poll(() => new URL(page.url()).searchParams.get('scene')).toBe('thien-cam-shore');
  await expect(page.getByTestId('panorama-demo-badge')).toBeVisible();

  await rail.getByRole('button', { name: 'Điểm ngắm Thiên Cầm' }).click();

  await expect(page.getByRole('heading', { name: 'Điểm ngắm Thiên Cầm' })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('scene')).toBe('thien-cam-lookout');
  await expect(page.getByTestId('panorama-demo-badge')).toBeVisible();
});

test('Sơn Trang remains unavailable when customer demo is explicitly requested', async ({
  page,
}) => {
  await page.goto('/explore/son-trang-co-dam/immersive?mode=panorama&demo=customer&scene=scene-01');

  await expect(page).toHaveURL(/\/explore\/son-trang-co-dam(?:\?|$)/);
  await expect(page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Khám phá 360°' })).toHaveCount(0);
});
