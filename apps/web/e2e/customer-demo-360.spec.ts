import { expect, test, type Page, type TestInfo } from '@playwright/test';

const publicSceneUrl = '/explore/bien-thien-cam/immersive?mode=panorama&scene=thien-cam-boardwalk';
const customerDemoSceneUrl =
  '/explore/bien-thien-cam/immersive?mode=panorama&demo=customer&scene=thien-cam-boardwalk';

async function capturePanoramaEvidence(
  page: Page,
  testInfo: TestInfo,
  input: {
    name: string;
    url: string;
    viewport: { width: number; height: number };
    state: 'ready' | 'public-unavailable' | 'showcase-shell';
  },
) {
  await page.setViewportSize(input.viewport);
  await page.goto(input.url);

  if (input.state === 'ready') {
    await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();
    await expect(page.getByTestId('panorama-demo-badge')).toBeVisible();
  } else if (input.state === 'public-unavailable') {
    await expect(page.getByRole('heading', { name: '360° đang được cập nhật' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /Hành trình 360/ })).toHaveCount(0);
  } else {
    await expect(page).toHaveURL(/\/explore\/son-trang-co-dam(?:\?|$)/);
    await expect(page.getByRole('main', { name: 'Trải nghiệm Sơn Trang Cổ Đạm' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sơn Trang Cổ Đạm' })).toBeVisible();
    await expect(
      page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Khám phá 360°' })).toHaveCount(0);
  }

  await page.screenshot({
    path: testInfo.outputPath(`${input.name}-${input.viewport.width}x${input.viewport.height}.png`),
    fullPage: false,
  });
}

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

test('captures Product-reviewable panorama evidence for desktop and mobile states', async ({
  page,
}, testInfo) => {
  await capturePanoramaEvidence(page, testInfo, {
    name: 'customer-demo-boardwalk',
    url: customerDemoSceneUrl,
    viewport: { width: 1440, height: 900 },
    state: 'ready',
  });
  await capturePanoramaEvidence(page, testInfo, {
    name: 'customer-demo-boardwalk',
    url: customerDemoSceneUrl,
    viewport: { width: 1920, height: 1080 },
    state: 'ready',
  });
  await capturePanoramaEvidence(page, testInfo, {
    name: 'customer-demo-boardwalk',
    url: customerDemoSceneUrl,
    viewport: { width: 390, height: 844 },
    state: 'ready',
  });
  await capturePanoramaEvidence(page, testInfo, {
    name: 'customer-demo-boardwalk',
    url: customerDemoSceneUrl,
    viewport: { width: 430, height: 932 },
    state: 'ready',
  });
  await capturePanoramaEvidence(page, testInfo, {
    name: 'public-unavailable',
    url: publicSceneUrl,
    viewport: { width: 1440, height: 900 },
    state: 'public-unavailable',
  });
  await capturePanoramaEvidence(page, testInfo, {
    name: 'son-trang-unavailable',
    url: '/explore/son-trang-co-dam/immersive?mode=panorama&demo=customer&scene=scene-01',
    viewport: { width: 1440, height: 900 },
    state: 'showcase-shell',
  });
});

test('captures the final Panorama-only UX acceptance matrix', async ({ page }, testInfo) => {
  const screenshot = async (name: string) => {
    await page.screenshot({
      path: testInfo.outputPath(`${name}.png`),
      fullPage: false,
    });
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(customerDemoSceneUrl);
  await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();
  await expect(page.getByTestId('panorama-demo-badge')).toBeVisible();

  const desktopDock = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await expect(desktopDock.getByRole('button', { name: 'Nghe câu chuyện' })).toBeVisible();
  await screenshot('panorama-ux-desktop-idle-1440x900');

  await desktopDock.getByRole('button', { name: 'Nghe câu chuyện' }).click();
  await expect(desktopDock.getByRole('button', { name: 'Tạm dừng câu chuyện' })).toBeVisible();
  await screenshot('panorama-ux-desktop-story-playing-1440x900');

  await page.goto(customerDemoSceneUrl);
  await page.getByRole('button', { name: 'Mở bản đồ thu nhỏ' }).click();
  await expect(page.getByRole('application', { name: 'Bản đồ tuyến tham quan' })).toBeVisible();
  await screenshot('panorama-ux-desktop-minimap-expanded-1440x900');

  await page.goto(customerDemoSceneUrl);
  const autoTourDock = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await autoTourDock.getByRole('button', { name: 'Bắt đầu tự động tham quan' }).click();
  await expect(
    autoTourDock.getByRole('group', { name: 'Điều khiển tự động tham quan' }),
  ).toBeVisible();
  await screenshot('panorama-ux-desktop-auto-tour-1440x900');

  // Keep the mobile evidence focused on the Media Dock; the minimap preference
  // is intentionally session-persistent, so close it before changing viewport.
  await page.getByRole('button', { name: 'Đóng bản đồ thu nhỏ' }).click();
  await expect(page.getByRole('button', { name: 'Mở bản đồ thu nhỏ' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(customerDemoSceneUrl);
  const mobileDock = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  const expandButton = mobileDock.getByRole('button', { name: 'Mở điều khiển trải nghiệm' });
  await expect(expandButton).toHaveAttribute('aria-expanded', 'false');
  await screenshot('panorama-ux-mobile-collapsed-390x844');

  await expandButton.click();
  await expect(
    mobileDock.getByRole('button', { name: 'Thu gọn điều khiển trải nghiệm' }),
  ).toHaveAttribute('aria-expanded', 'true');
  await screenshot('panorama-ux-mobile-expanded-390x844');

  await mobileDock.getByRole('button', { name: 'Mở bản chép lời' }).click();
  const transcriptPanel = page.getByRole('dialog', { name: 'Bản chép lời' });
  await expect(transcriptPanel).toBeVisible();
  await transcriptPanel.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await screenshot('panorama-ux-mobile-transcript-390x844');

  await transcriptPanel.getByRole('button', { name: 'Mở rộng toàn bộ bản chép lời' }).click();
  await expect(transcriptPanel).toHaveAttribute('data-sheet-state', 'expanded');
  await transcriptPanel.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await screenshot('panorama-ux-mobile-transcript-expanded-390x844');

  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto(customerDemoSceneUrl);
  await expect(page.getByRole('button', { name: 'Mở điều khiển trải nghiệm' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await screenshot('panorama-ux-mobile-collapsed-430x932');

  await page.goto(publicSceneUrl);
  await expect(page.getByRole('heading', { name: '360° đang được cập nhật' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /Hành trình 360/ })).toHaveCount(0);
  await screenshot('panorama-ux-public-unavailable-430x932');
});
