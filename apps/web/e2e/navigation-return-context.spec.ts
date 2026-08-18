import { expect, test } from '@playwright/test';

test('restores exact Explore context across Detail, immersive Back, browser Back and Forward', async ({
  page,
}) => {
  const exploreUrl =
    '/explore?q=Nguy%E1%BB%85n&category=Di+s%E1%BA%A3n+%26+v%C4%83n+h%C3%B3a&destination=khu-luu-niem-nguyen-du&view=map';

  await page.goto(exploreUrl);
  await expect(page).toHaveURL(exploreUrl);
  await page.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }).click();
  await page.getByRole('button', { name: 'Xem chi tiết' }).click();

  const detailUrl = /\/explore\/khu-luu-niem-nguyen-du\?returnTo=/;
  await expect(page).toHaveURL(detailUrl);
  await page.getByRole('button', { name: 'Khám phá 360°' }).click();
  await expect(page).toHaveURL(/\/explore\/khu-luu-niem-nguyen-du\/immersive\?mode=panorama/);

  await page.getByRole('button', { name: 'Quay lại thế giới 3D' }).click();
  await expect(page).toHaveURL(detailUrl);
  await expect(page.getByRole('heading', { name: 'Khu lưu niệm Nguyễn Du' })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(exploreUrl);
  await expect(page.getByTestId('destination-card-nguyen-du-memorial')).toHaveAttribute(
    'aria-current',
    'true',
  );

  await page.goForward();
  await expect(page).toHaveURL(detailUrl);
  await page.goForward();
  await expect(page).toHaveURL(/\/explore\/khu-luu-niem-nguyen-du\/immersive\?mode=panorama/);
});

test('direct immersive deep link falls back safely to matching Detail', async ({ page }) => {
  await page.goto('/explore/bien-thien-cam/immersive?mode=panorama&scene=thien-cam-boardwalk');

  await expect(page.getByRole('heading', { name: 'Lối dạo Thiên Cầm' })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại thế giới 3D' }).click();
  await expect(page).toHaveURL('/explore/bien-thien-cam');
  await expect(page.getByRole('heading', { name: 'Biển Thiên Cầm' })).toBeVisible();
});

test('mobile Detail map CTA restores map mode and destination selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    '/explore/bien-thien-cam?returnTo=%2Fexplore%3Fq%3Dbi%E1%BB%83n%26destination%3Dbien-thien-cam',
  );

  await page.getByRole('button', { name: 'Xem trên bản đồ' }).click();
  await expect(page).toHaveURL('/explore?q=bi%E1%BB%83n&destination=bien-thien-cam&view=map');
  await expect(page.getByRole('region', { name: 'Bản đồ khám phá Hà Tĩnh' })).toHaveAttribute(
    'data-explore-map-status',
    'ready',
  );
  await expect(page.getByTestId('destination-card-thien-cam-beach')).toHaveAttribute(
    'aria-current',
    'true',
  );

  await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
  await expect(page).toHaveURL('/explore?q=bi%E1%BB%83n&destination=bien-thien-cam&view=cards');
  await expect(page.getByTestId('destination-card-thien-cam-beach')).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('direct Detail back uses the truthful destination fallback', async ({ page }) => {
  await page.goto('/explore/khu-luu-niem-nguyen-du');
  await page.getByRole('button', { name: 'Quay lại khám phá' }).click();
  await expect(page).toHaveURL('/explore?destination=khu-luu-niem-nguyen-du');
});

test('invalid immersive mode preserves the trusted Explore context in the Detail fallback', async ({
  page,
}) => {
  const returnTo = '/explore?q=bi%E1%BB%83n&destination=bien-thien-cam&view=map';

  await page.goto(
    `/explore/bien-thien-cam/immersive?mode=unsupported&returnTo=${encodeURIComponent(returnTo)}`,
  );

  await expect(page).toHaveURL(`/explore/bien-thien-cam?returnTo=${encodeURIComponent(returnTo)}`);
  await expect(page.getByRole('heading', { name: 'Biển Thiên Cầm' })).toBeVisible();
});

test('invalid panorama scene and location are canonicalized without a new history entry', async ({
  page,
}) => {
  await page.goto('/explore/bien-thien-cam/immersive?mode=panorama&location=unknown&scene=missing');

  await expect(page).toHaveURL(
    '/explore/bien-thien-cam/immersive?mode=panorama&location=thien-cam-beach&scene=thien-cam-boardwalk&h=0&p=0&fov=90',
  );
  await expect(page.getByRole('main', { name: 'Khám phá Biển Thiên Cầm' })).toBeVisible();
});
