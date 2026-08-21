import { test, expect } from '@playwright/test';

test('editorial surfaces follow the selected dark theme', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('hatinh.uiTheme', 'light');
  });

  await page.goto('/explore', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Chuyển sang chế độ tối' }).click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  const styles = await page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const computed = window.getComputedStyle(element);
      return {
        background: computed.backgroundColor,
        color: computed.color,
      };
    };

    return {
      page: read('.explore-experience'),
      layout: read('.explore-experience__layout'),
      panel: read('.explore-experience__destinations'),
      cardTitle: read('.destination-card__title'),
    };
  });

  expect(styles.page).toEqual({ background: 'rgb(12, 20, 16)', color: 'rgb(242, 247, 244)' });
  expect(styles.layout).toEqual({
    background: 'rgb(19, 31, 25)',
    color: 'rgb(242, 247, 244)',
  });
  expect(styles.panel).toEqual({
    background: 'rgb(19, 31, 25)',
    color: 'rgb(242, 247, 244)',
  });
  expect(styles.cardTitle).toEqual({
    background: 'rgba(0, 0, 0, 0)',
    color: 'rgb(242, 247, 244)',
  });
});

test('destination detail keeps readable editorial contrast in dark theme', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('hatinh.uiTheme', 'dark');
  });

  await page.goto('/explore/bien-thien-cam', { waitUntil: 'networkidle' });

  const styles = await page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const computed = window.getComputedStyle(element);
      return { background: computed.backgroundColor, color: computed.color };
    };

    return {
      page: read('.destination-detail'),
      title: read('.destination-detail__title'),
      content: read('.destination-detail__editorial'),
    };
  });

  expect(styles.page).toEqual({ background: 'rgb(12, 20, 16)', color: 'rgb(242, 247, 244)' });
  expect(styles.title).toEqual({ background: 'rgba(0, 0, 0, 0)', color: 'rgb(242, 247, 244)' });
  expect(styles.content).toEqual({
    background: 'rgb(19, 31, 25)',
    color: 'rgb(242, 247, 244)',
  });
});
