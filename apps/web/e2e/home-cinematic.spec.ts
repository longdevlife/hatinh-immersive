import { expect, test } from '@playwright/test';

test.describe('cinematic tourism home', () => {
  test('keeps the active destination, card selection, and real routes synchronized', async ({
    page,
  }) => {
    await page.goto('/');

    const hero = page.getByTestId('home-cinematic-hero');
    const cards = hero.getByTestId('home-cinematic-card');
    await expect(hero).toHaveAttribute('data-active-slug', 'son-trang-co-dam');
    await expect(cards).toHaveCount(4);
    await expect(
      cards.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-destination-slug')),
      ),
    ).resolves.toEqual([
      'son-trang-co-dam',
      'bien-thien-cam',
      'khu-luu-niem-nguyen-du',
      'nga-ba-dong-loc',
    ]);
    await expect(hero.getByRole('link', { name: 'Khám phá Sơn Trang Cổ Đạm' })).toHaveAttribute(
      'href',
      '/explore/son-trang-co-dam',
    );

    await page.getByRole('button', { name: 'Chọn Biển Thiên Cầm' }).click();
    await expect(hero).toHaveAttribute('data-active-slug', 'bien-thien-cam');
    await expect(hero.getByRole('link', { name: 'Khám phá Biển Thiên Cầm' })).toHaveAttribute(
      'href',
      '/explore/bien-thien-cam',
    );

    await page.getByRole('button', { name: 'Điểm đến trước' }).click();
    await expect(hero).toHaveAttribute('data-active-slug', 'son-trang-co-dam');
    await expect(
      cards.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-destination-slug')),
      ),
    ).resolves.toEqual([
      'son-trang-co-dam',
      'bien-thien-cam',
      'khu-luu-niem-nguyen-du',
      'nga-ba-dong-loc',
    ]);

    await page.getByRole('link', { name: 'Mở bản đồ khám phá' }).click();
    await expect(page).toHaveURL('/explore');
  });

  test('keeps the mobile hero and card rail within the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByTestId('home-cinematic-hero')).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  });
});
