import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve(process.env.OUT ?? 'artifact/hatinh360-download-probe');
const URL = 'https://platform.starglobal3d.com/smart-tourism-360/du-lich-ha-tinh/khu-du-lich-thien-cam';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'vi-VN', viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();

const inspect = async (label) => {
  const data = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('button,a,[role="button"],input,label,[onclick],div,span')]
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 300),
          aria: el.getAttribute('aria-label'),
          title: el.getAttribute('title'),
          className: typeof el.className === 'string' ? el.className : '',
          visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
          box: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
          html: el.outerHTML.slice(0, 1200),
        };
      })
      .filter((row) => row.visible && (/download|tải|camera|snap|check[- ]?in|chụp|lưu ảnh|save|xuất ảnh/i.test(`${row.text} ${row.aria ?? ''} ${row.title ?? ''} ${row.className}`) || (row.box.x < 150 && row.box.y < 150)));
    return {
      bodyText: (document.body?.innerText || '').slice(0, 50000),
      rows,
      localStorageKeys: Object.keys(localStorage),
      hasKrpano: !!window.krpano,
      hasHandleKrpanoScreenshot: typeof window.handleKrpanoScreenshot === 'function',
      handleKrpanoScreenshot: typeof window.handleKrpanoScreenshot === 'function' ? window.handleKrpanoScreenshot.toString().slice(0, 16000) : null,
      scene: window.krpano?.get?.('xml.scene') ?? null,
    };
  });
  await writeFile(path.join(OUT, `${label}.json`), JSON.stringify(data, null, 2) + '\n');
  await page.screenshot({ path: path.join(OUT, `${label}.png`) });
  return data;
};

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForTimeout(15_000);
const landing = await inspect('force-01-landing');

// Start-screen button is rendered inside krpano/canvas, so use the known viewport position.
await page.mouse.click(960, 575);
await page.waitForTimeout(20_000);
const tour = await inspect('force-02-tour');

// Public viewer hamburger/menu position from the live layout.
await page.mouse.click(25, 25);
await page.waitForTimeout(2_000);
const menu = await inspect('force-03-menu');

const summary = {
  landingContainsStart: /Bắt đầu khám phá/i.test(landing.bodyText),
  tourContainsStart: /Bắt đầu khám phá/i.test(tour.bodyText),
  tourScene: tour.scene,
  hasHandleKrpanoScreenshot: tour.hasHandleKrpanoScreenshot,
  tourDownloadRows: tour.rows,
  menuDownloadRows: menu.rows,
  localStorageHasUrlSnap: menu.localStorageKeys.includes('urlSnap'),
};
await writeFile(path.join(OUT, 'force-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
await browser.close();
