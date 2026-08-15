import { expect, test, type Locator, type Page } from '@playwright/test';

const tours = [
  {
    slug: 'bien-thien-cam',
    railName: 'Hành trình 360 Biển Thiên Cầm',
    scenes: ['thien-cam-boardwalk', 'thien-cam-shore', 'thien-cam-lookout'],
  },
  {
    slug: 'son-trang-co-dam',
    railName: 'Hành trình 360 Sơn Trang Cổ Đạm',
    scenes: ['son-trang-gate', 'son-trang-entrance-path', 'son-trang-courtyard'],
  },
  {
    slug: 'khu-luu-niem-nguyen-du',
    railName: 'Hành trình 360 Khu lưu niệm Nguyễn Du',
    scenes: ['nguyen-du-courtyard', 'nguyen-du-memorial-house', 'nguyen-du-statue'],
  },
  {
    slug: 'nga-ba-dong-loc',
    railName: 'Hành trình 360 Ngã ba Đồng Lộc',
    scenes: ['dong-loc-memorial', 'dong-loc-monument', 'dong-loc-remembrance'],
  },
] as const;

async function getDirectionalArrow(page: Page, targetSceneId: string): Promise<Locator> {
  const arrowLayer = page.locator('.psv-virtual-tour-arrows');
  await expect(arrowLayer).toBeVisible();

  const links = arrowLayer.locator('.psv-virtual-tour-link');
  await expect.poll(() => links.count()).toBeGreaterThan(0);

  await links.evaluateAll((elements, target) => {
    for (const element of elements) {
      delete (element as HTMLElement).dataset.e2eTargetScene;
      const link = (element as HTMLElement & { tourLink?: { nodeId?: string } }).tourLink;
      if (link?.nodeId === target) {
        (element as HTMLElement).dataset.e2eTargetScene = target;
      }
    }
  }, targetSceneId);

  const arrow = arrowLayer.locator(`[data-e2e-target-scene="${targetSceneId}"]`);
  await expect(arrow).toHaveCount(1);
  await expect(arrow).toBeVisible();
  return arrow;
}

async function expectCommittedScene(page: Page, sceneId: string): Promise<void> {
  const viewport = page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' });
  await expect(page).toHaveURL(new RegExp(`scene=${sceneId}`));
  await expect(viewport).toHaveAttribute('data-renderer-status', 'ready');
}

test.describe('real Photo Sphere Viewer directional arrows', () => {
  for (const tour of tours) {
    test(`${tour.slug} walks A → B → C → B through real PSV arrows`, async ({ page }) => {
      const [firstScene, secondScene, thirdScene] = tour.scenes;
      await page.goto(`/explore/${tour.slug}/immersive?mode=panorama&scene=${firstScene}`);

      const viewport = page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' });
      const rail = page.getByRole('navigation', { name: tour.railName });

      await expectCommittedScene(page, firstScene);
      await expect(viewport).toHaveAttribute('data-e2e-panorama-mount-count', '1');
      await expect(viewport).toHaveAttribute('data-e2e-panorama-destroy-count', '0');
      await expect(rail.getByRole('button').first()).toHaveAttribute('aria-current', 'step');

      await (await getDirectionalArrow(page, secondScene)).click();
      await expectCommittedScene(page, secondScene);

      await (await getDirectionalArrow(page, thirdScene)).click();
      await expectCommittedScene(page, thirdScene);

      await (await getDirectionalArrow(page, secondScene)).click();
      await expectCommittedScene(page, secondScene);

      await expect(viewport).toHaveAttribute('data-e2e-panorama-mount-count', '1');
      await expect(viewport).toHaveAttribute('data-e2e-panorama-destroy-count', '0');
    });
  }
});
