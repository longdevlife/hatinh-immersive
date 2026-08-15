import { expect, test } from '@playwright/test';

const tours = [
  {
    slug: 'bien-thien-cam',
    railName: 'Hành trình 360 Biển Thiên Cầm',
    scenes: ['thien-cam-boardwalk', 'thien-cam-shore', 'thien-cam-lookout'],
  },
  {
    slug: 'son-trang-co-dam',
    railName: 'Hành trình 360 Sơn Trang Cổ Đạm',
    scenes: [
      'son-trang-gate',
      'son-trang-entrance-path',
      'son-trang-courtyard',
      'son-trang-culture',
      'son-trang-ecology-path',
      'son-trang-ecology',
      'son-trang-spiritual-path',
      'son-trang-spiritual',
    ],
  },
  {
    slug: 'khu-luu-niem-nguyen-du',
    railName: 'Hành trình 360 Khu lưu niệm Nguyễn Du',
    scenes: [
      'nguyen-du-courtyard',
      'nguyen-du-memorial-house',
      'nguyen-du-statue',
      'nguyen-du-garden-path',
    ],
  },
  {
    slug: 'nga-ba-dong-loc',
    railName: 'Hành trình 360 Ngã ba Đồng Lộc',
    scenes: ['dong-loc-memorial', 'dong-loc-monument', 'dong-loc-remembrance', 'dong-loc-approach'],
  },
] as const;

test.describe('reference-parity multi-destination immersive tours', () => {
  for (const tour of tours) {
    test(`${tour.slug} supports forward, backward, rail and hotspot movement`, async ({ page }) => {
      await page.goto(`/explore/${tour.slug}/immersive?mode=panorama&scene=${tour.scenes[0]}`);

      const rail = page.getByRole('navigation', { name: tour.railName });
      await expect(rail.getByRole('button')).toHaveCount(tour.scenes.length);
      await expect(rail.getByRole('button').first()).toHaveAttribute('aria-current', 'step');

      const viewport = page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' });
      await expect(viewport).toHaveAttribute('data-e2e-panorama-mount-count', '1');
      await expect(viewport).toHaveAttribute('data-e2e-panorama-destroy-count', '0');

      for (const sceneId of tour.scenes.slice(1, 3)) {
        const sceneIndex = tour.scenes.findIndex((candidate) => candidate === sceneId);
        const sceneButton = rail.locator('button').nth(sceneIndex);
        await sceneButton.click();
        await expect(page).toHaveURL(new RegExp(`scene=${sceneId}`));
        await expect(rail.locator('button').nth(sceneIndex)).toHaveAttribute(
          'aria-current',
          'step',
        );
      }

      const firstSceneButton = rail.locator('button').first();
      await firstSceneButton.click();
      await expect(page).toHaveURL(new RegExp(`scene=${tour.scenes[0]}`));

      await expect(viewport).toHaveAttribute('data-e2e-panorama-mount-count', '1');
      await expect(viewport).toHaveAttribute('data-e2e-panorama-destroy-count', '0');

      await page.getByRole('button', { name: /Mở / }).first().click();
      await expect(page).toHaveURL(new RegExp(`scene=${tour.scenes[1]}`));
    });
  }
});
