import { expect, test, type Page, type TestInfo } from '@playwright/test';

const publicSceneUrl = '/explore/bien-thien-cam/immersive?mode=panorama&scene=thien-cam-boardwalk';
const customerDemoSceneUrl =
  '/explore/bien-thien-cam/immersive?mode=panorama&demo=customer&scene=thien-cam-boardwalk';

type ViewportRect = { x: number; y: number; width: number; height: number };

function rectanglesOverlap(rectA: ViewportRect, rectB: ViewportRect) {
  return !(
    rectA.x + rectA.width <= rectB.x ||
    rectB.x + rectB.width <= rectA.x ||
    rectA.y + rectA.height <= rectB.y ||
    rectB.y + rectB.height <= rectA.y
  );
}

async function visibleTourArrowBoxes(page: Page) {
  const arrows = page.locator('.psv-virtual-tour-link, .psv-virtual-tour-arrow');

  await expect
    .poll(async () => {
      const boxes = await Promise.all(
        Array.from({ length: await arrows.count() }, (_, index) => arrows.nth(index).boundingBox()),
      );
      return boxes.filter((box): box is ViewportRect => box !== null).length;
    })
    .toBeGreaterThan(0);

  const boxes = await Promise.all(
    Array.from({ length: await arrows.count() }, (_, index) => arrows.nth(index).boundingBox()),
  );

  return boxes.filter((box): box is ViewportRect => box !== null);
}

async function expectTourArrowsClearOfControls(page: Page) {
  const controls = [
    page.getByRole('region', { name: 'Media dock trải nghiệm' }),
    page.getByRole('button', { name: 'Bắt đầu hành trình' }),
    page.getByRole('navigation', { name: 'Hành trình 360 Biển Thiên Cầm' }),
  ];
  const arrowBoxes = await visibleTourArrowBoxes(page);

  for (const control of controls) {
    await expect(control).toBeVisible();
    const controlBox = await control.boundingBox();
    expect(controlBox).not.toBeNull();
    expect(arrowBoxes.some((arrowBox) => rectanglesOverlap(arrowBox, controlBox!))).toBe(false);
  }
}

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

async function installDeterministicDemoNarrationHarness(page: Page) {
  await page.addInitScript(() => {
    class StableDemoUtterance {
      text: string;
      lang = '';
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(text: string) {
        this.text = text;
      }
    }

    const stableSpeechSynthesis = {
      paused: false,
      pending: false,
      speaking: false,
      speak(utterance: StableDemoUtterance) {
        this.speaking = true;
        this.paused = false;
        void utterance;
      },
      pause() {
        this.paused = true;
      },
      resume() {
        this.paused = false;
      },
      cancel() {
        this.speaking = false;
        this.paused = false;
      },
    };

    Object.defineProperty(globalThis, 'speechSynthesis', {
      configurable: true,
      value: stableSpeechSynthesis,
    });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: StableDemoUtterance,
    });
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

test('desktop scene portal hover label is visibly rendered outside the thumbnail strip', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(customerDemoSceneUrl);
  await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();

  const rail = page.getByRole('navigation', { name: 'Hành trình 360 Biển Thiên Cầm' });
  const shorePortal = rail.getByRole('button', { name: 'Bờ biển Thiên Cầm', exact: true });
  const hoverLabel = shorePortal.locator('.panorama-tour-rail__label');

  await shorePortal.hover();
  await expect(hoverLabel).toHaveCSS('opacity', '1');

  const visibleRatio = await hoverLabel.evaluate(
    (label) =>
      new Promise<number>((resolve) => {
        const observer = new IntersectionObserver(([entry]) => {
          observer.disconnect();
          resolve(entry?.intersectionRatio ?? 0);
        });
        observer.observe(label);
      }),
  );

  expect(visibleRatio).toBeGreaterThan(0.95);

  const hoverLabelBox = await hoverLabel.boundingBox();
  const startJourneyBox = await page
    .getByRole('button', { name: 'Bắt đầu hành trình' })
    .boundingBox();
  expect(hoverLabelBox).not.toBeNull();
  expect(startJourneyBox).not.toBeNull();
  expect(rectanglesOverlap(hoverLabelBox!, startJourneyBox!)).toBe(false);
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

  await installDeterministicDemoNarrationHarness(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(customerDemoSceneUrl);
  await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();
  await expect(page.getByTestId('panorama-demo-badge')).toBeVisible();

  const desktopDock = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await expect(desktopDock.getByRole('button', { name: 'Nghe câu chuyện' })).toBeVisible();
  await expect(page.getByTestId('panorama-utility-cluster')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tắt âm thanh' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mở bản đồ thu nhỏ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Toàn màn hình' })).toBeVisible();
  await page.getByRole('button', { name: 'Mở tiện ích khác' }).click();
  await expect(page.getByRole('button', { name: 'Chia sẻ cảnh này' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đổi ngôn ngữ sang Tiếng Anh' })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng tiện ích khác' }).click();
  await screenshot('panorama-ux-desktop-idle-1440x900');

  await desktopDock.getByRole('button', { name: 'Mở tùy chọn câu chuyện' }).click();
  const desktopStorySheet = page.getByRole('dialog', { name: 'Câu chuyện' });
  await expect(desktopStorySheet).toBeVisible();
  // The explicit demo SpeechSynthesis policy can narrate this scene but cannot
  // play its file-backed ambient track. Keep the sheet capability-truthful:
  // no ambient transport is rendered until the active source can play it.
  await expect(desktopStorySheet.getByRole('button', { name: /nhạc nền/i })).toHaveCount(0);
  await desktopStorySheet.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await screenshot('panorama-ux-desktop-story-sheet-1440x900');
  await desktopStorySheet.getByRole('button', { name: 'Đóng câu chuyện' }).click();

  await desktopDock.getByRole('button', { name: 'Nghe câu chuyện' }).click();
  await expect(desktopDock.getByRole('button', { name: 'Tạm dừng câu chuyện' })).toBeVisible();
  await expect(desktopDock).toHaveAttribute('data-story-state', 'playing');
  await screenshot('panorama-ux-desktop-story-playing-1440x900');
  await screenshot('panorama-ux-desktop-utilities-bright-sky-1440x900');

  await page.goto(customerDemoSceneUrl);
  await page.getByRole('button', { name: 'Mở bản đồ thu nhỏ' }).click();
  const minimap = page.getByRole('application', { name: 'Bản đồ tuyến tham quan' });
  await expect(minimap).toBeVisible();
  await expect(minimap.locator('.minimap-viewport__header > div')).toBeHidden();
  await screenshot('panorama-ux-desktop-minimap-expanded-1440x900');

  await page.goto(customerDemoSceneUrl);
  await page.getByRole('button', { name: 'Bắt đầu hành trình' }).click();
  await expect(page.getByRole('group', { name: 'Điều khiển tự động tham quan' })).toBeVisible();
  await expect(page.getByText('Đang tham quan 1 / 3')).toBeVisible();
  await screenshot('panorama-ux-desktop-auto-tour-1440x900');

  // Keep the mobile evidence focused on the Media Dock; the minimap preference
  // is intentionally session-persistent, so close it before changing viewport.
  await page.getByRole('button', { name: 'Đóng bản đồ thu nhỏ' }).click();
  await expect(page.getByRole('button', { name: 'Mở bản đồ thu nhỏ' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(customerDemoSceneUrl);
  const mobileDock = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await expect(mobileDock.getByRole('button', { name: 'Nghe câu chuyện' })).toBeVisible();
  await expect(mobileDock.getByRole('button', { name: 'Mở tùy chọn câu chuyện' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bắt đầu hành trình' })).toBeVisible();
  await screenshot('panorama-ux-mobile-collapsed-390x844');

  await mobileDock.getByRole('button', { name: 'Mở tùy chọn câu chuyện' }).click();
  const mobileStorySheet = page.getByRole('dialog', { name: 'Câu chuyện' });
  await expect(mobileStorySheet).toBeVisible();
  await expect(mobileStorySheet.getByRole('button', { name: /nhạc nền/i })).toHaveCount(0);
  await mobileStorySheet.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await screenshot('panorama-ux-mobile-story-sheet-390x844');

  await mobileStorySheet.getByRole('button', { name: 'Mở bản chép lời' }).click();
  const transcriptPanel = page.getByRole('dialog', { name: 'Bản chép lời' });
  await expect(transcriptPanel).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Câu chuyện' })).toHaveCount(0);
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
  await expect(page.getByRole('button', { name: 'Mở tùy chọn câu chuyện' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bắt đầu hành trình' })).toBeVisible();
  await screenshot('panorama-ux-mobile-collapsed-430x932');

  await page.goto(publicSceneUrl);
  await expect(page.getByRole('heading', { name: '360° đang được cập nhật' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /Hành trình 360/ })).toHaveCount(0);
  await screenshot('panorama-ux-public-unavailable-430x932');
});

test('mobile 390x844 expanded minimap does not overlap Back, utilities, scene identity, media dock, or scene rail', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(customerDemoSceneUrl);
  await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();

  // Open minimap
  await page.getByRole('button', { name: 'Mở bản đồ thu nhỏ' }).click();
  const minimap = page.getByRole('application', { name: 'Bản đồ tuyến tham quan' });
  await expect(minimap).toBeVisible();

  const minimapBBox = await minimap.boundingBox();
  expect(minimapBBox).not.toBeNull();

  // 1. Back button
  const backBtn = page.getByRole('button', { name: 'Quay lại' });
  await expect(backBtn).toBeVisible();
  const backBBox = await backBtn.boundingBox();
  expect(backBBox).not.toBeNull();
  expect(rectanglesOverlap(minimapBBox!, backBBox!)).toBe(false);

  // 2. Utilities cluster
  const utilities = page.getByTestId('panorama-utility-cluster');
  await expect(utilities).toBeVisible();
  const utilitiesBBox = await utilities.boundingBox();
  expect(utilitiesBBox).not.toBeNull();
  expect(rectanglesOverlap(minimapBBox!, utilitiesBBox!)).toBe(false);

  // 3. Scene identity (context title & badge)
  const sceneIdentity = page.locator('.reference-parity__context, .scene-identity').first();
  await expect(sceneIdentity).toBeVisible();
  const identityBBox = await sceneIdentity.boundingBox();
  expect(identityBBox).not.toBeNull();
  expect(rectanglesOverlap(minimapBBox!, identityBBox!)).toBe(false);

  // 4. Media dock
  const mediaDock = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await expect(mediaDock).toBeVisible();
  const dockBBox = await mediaDock.boundingBox();
  expect(dockBBox).not.toBeNull();
  expect(rectanglesOverlap(minimapBBox!, dockBBox!)).toBe(false);

  // 5. Scene thumbnail rail
  const rail = page.getByRole('navigation', { name: 'Hành trình 360 Biển Thiên Cầm' });
  await expect(rail).toBeVisible();
  const railBBox = await rail.boundingBox();
  expect(railBBox).not.toBeNull();
  expect(rectanglesOverlap(minimapBBox!, railBBox!)).toBe(false);
});

test('mobile customer-demo transport keeps primary PSV tour arrows unobscured and controls non-overlapping', async ({
  page,
}) => {
  await installDeterministicDemoNarrationHarness(page);

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(customerDemoSceneUrl);
    await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();

    const mediaDock = page.getByRole('region', { name: 'Media dock trải nghiệm' });
    const startAutoTourBtn = page.getByRole('button', { name: 'Bắt đầu hành trình' });
    const rail = page.getByRole('navigation', { name: 'Hành trình 360 Biển Thiên Cầm' });

    await expect(mediaDock).toBeVisible();
    await expect(startAutoTourBtn).toBeVisible();
    await expect(rail).toBeVisible();

    const dockBox = await mediaDock.boundingBox();
    const autoTourBox = await startAutoTourBtn.boundingBox();
    const railBox = await rail.boundingBox();

    expect(dockBox).not.toBeNull();
    expect(autoTourBox).not.toBeNull();
    expect(railBox).not.toBeNull();

    // 1) dock and Start Auto Tour do not overlap
    expect(rectanglesOverlap(dockBox!, autoTourBox!)).toBe(false);
    expect(rectanglesOverlap(dockBox!, railBox!)).toBe(false);
    expect(rectanglesOverlap(autoTourBox!, railBox!)).toBe(false);

    // 2) both remain reachable with compliant touch target sizes
    const playBtn = mediaDock.getByRole('button', { name: 'Nghe câu chuyện' });
    const triggerBtn = mediaDock.getByRole('button', { name: 'Mở tùy chọn câu chuyện' });
    await expect(playBtn).toBeVisible();
    await expect(triggerBtn).toBeVisible();

    const playBox = await playBtn.boundingBox();
    const triggerBox = await triggerBtn.boundingBox();
    expect(playBox).not.toBeNull();
    expect(triggerBox).not.toBeNull();
    expect(playBox!.height).toBeGreaterThanOrEqual(44);
    expect(triggerBox!.width).toBeGreaterThanOrEqual(44);
    expect(triggerBox!.height).toBeGreaterThanOrEqual(44);
    expect(autoTourBox!.height).toBeGreaterThanOrEqual(44);

    // 3) PSV arrow does not overlap either control or rail
    await expectTourArrowsClearOfControls(page);

    // 4) no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    if (viewport.width === 390) {
      await playBtn.click();
      await expect(mediaDock).toHaveAttribute('data-story-state', 'playing');
      await expectTourArrowsClearOfControls(page);
    }
  }
});
