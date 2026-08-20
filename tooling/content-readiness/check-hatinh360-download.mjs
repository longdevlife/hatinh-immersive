import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve(process.env.OUT ?? 'artifact/hatinh360-download-probe');
const URL = 'https://platform.starglobal3d.com/smart-tourism-360/du-lich-ha-tinh/khu-du-lich-thien-cam';
const patterns = [
  /download/gi,
  /makescreenshoturl/gi,
  /makescreenshot_hires/gi,
  /urlSnap/gi,
  /snapscreen/gi,
  /toDataURL/gi,
  /createObjectURL/gi,
  /\.download\s*=/gi,
  /saveAs\s*\(/gi,
  /tải/gi,
  /camera/gi,
  /check[- ]?in/gi,
  /chụp/gi,
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'vi-VN', viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
const jsResponses = new Map();
const textResponses = [];

page.on('response', async (response) => {
  const headers = await response.allHeaders().catch(() => ({}));
  const contentType = headers['content-type'] ?? '';
  const url = response.url();
  if (/javascript|ecmascript/i.test(contentType) || /\.js(?:\?|$)/i.test(url)) {
    try {
      const text = await response.text();
      if (text.length <= 8_000_000) jsResponses.set(url, text);
    } catch {}
  }
  if (/xml|json|text/i.test(contentType) && /snap|skin|tour|scene|project|group|360|krpano/i.test(url)) {
    try {
      const text = await response.text();
      if (text.length <= 3_000_000) textResponses.push({ url, contentType, text });
    } catch {}
  }
});

async function inspectDom(label) {
  const dom = await page.evaluate(() => {
    const rows = [];
    for (const el of [...document.querySelectorAll('*')]) {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 260);
      const aria = el.getAttribute('aria-label');
      const title = el.getAttribute('title');
      const href = el.getAttribute('href');
      const onclick = el.getAttribute('onclick');
      const className = typeof el.className === 'string' ? el.className : '';
      const src = el.getAttribute('src');
      const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      const interesting = /download|tải|camera|snap|screen|save|export|image|ảnh|check[- ]?in|chụp/i.test(`${text} ${aria ?? ''} ${title ?? ''} ${href ?? ''} ${onclick ?? ''} ${className} ${src ?? ''}`);
      const clickable = style.cursor === 'pointer' || ['BUTTON', 'A'].includes(el.tagName) || el.getAttribute('role') === 'button' || onclick;
      if (interesting || (clickable && visible)) {
        rows.push({
          tag: el.tagName.toLowerCase(), text, aria, title, href, onclick, className, src, visible,
          box: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
          outerHtml: el.outerHTML.slice(0, 1200),
        });
      }
    }
    const globals = Object.keys(window).filter((key) => /krpano|snap|download|save|camera|checkin/i.test(key));
    return {
      title: document.title,
      url: location.href,
      rows: rows.slice(0, 2000),
      globals,
      handleKrpanoScreenshot: typeof window.handleKrpanoScreenshot === 'function' ? window.handleKrpanoScreenshot.toString().slice(0, 12000) : null,
      localStorageKeys: Object.keys(localStorage),
      bodyText: (document.body?.innerText || '').slice(0, 30000),
    };
  });
  await writeFile(path.join(OUT, `${label}-dom.json`), JSON.stringify(dom, null, 2) + '\n');
  await page.screenshot({ path: path.join(OUT, `${label}.png`), fullPage: false });
  return dom;
}

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForTimeout(12_000);
const landing = await inspectDom('01-landing');

const startButton = page.getByRole('button', { name: /bắt đầu khám phá/i }).first();
if (await startButton.isVisible().catch(() => false)) {
  await startButton.click();
} else {
  const textStart = page.getByText(/bắt đầu khám phá/i).first();
  if (await textStart.isVisible().catch(() => false)) await textStart.click();
}
await page.waitForTimeout(25_000);
const tour = await inspectDom('02-tour');

// The public UI uses an icon-only hamburger in the top-left. Inspect it without relying on text labels.
const topLeftCandidates = tour.rows
  .filter((row) => row.visible && row.box.x >= 0 && row.box.x < 120 && row.box.y >= 0 && row.box.y < 120 && row.box.width > 10 && row.box.height > 10)
  .sort((a, b) => a.box.width * a.box.height - b.box.width * b.box.height);
let menuClick = null;
if (topLeftCandidates.length) {
  const target = topLeftCandidates[0];
  menuClick = target;
  await page.mouse.click(target.box.x + target.box.width / 2, target.box.y + target.box.height / 2);
  await page.waitForTimeout(2_000);
}
const menu = await inspectDom('03-menu');

const matches = [];
for (const [url, text] of jsResponses) {
  const lower = text.toLowerCase();
  const matched = patterns.filter((pattern) => { pattern.lastIndex = 0; return pattern.test(text); }).map((pattern) => pattern.source);
  if (!matched.length) continue;
  const snippets = [];
  for (const token of ['handlekrpanoscreenshot','download','makescreenshoturl','makescreenshot_hires','urlsnap','snapscreen','todataurl','createobjecturl','saveas','camera','check-in','checkin','chụp','tải']) {
    const index = lower.indexOf(token);
    if (index >= 0) snippets.push(text.slice(Math.max(0, index - 600), Math.min(text.length, index + 1800)));
  }
  matches.push({ url, matched, snippets });
}
for (const item of textResponses) {
  const matched = patterns.filter((pattern) => { pattern.lastIndex = 0; return pattern.test(item.text); }).map((pattern) => pattern.source);
  if (matched.length) matches.push({ url: item.url, matched, snippets: [item.text.slice(0, 10000)] });
}

const allRows = [...landing.rows, ...tour.rows, ...menu.rows];
const downloadLike = (row) => row.visible && /download|tải|camera|snap|save|export|check[- ]?in|chụp/i.test(`${row.text} ${row.aria ?? ''} ${row.title ?? ''} ${row.href ?? ''} ${row.onclick ?? ''} ${row.className} ${row.src ?? ''}`);
const summary = {
  url: URL,
  enteredTour: /toàn cảnh|bản đồ|thông tin|thiên cầm/i.test(tour.bodyText) || !!tour.globals.find((key) => /krpano/i.test(key)),
  menuClick,
  jsResponses: jsResponses.size,
  matchedResources: matches.length,
  visibleDownloadLikeDom: allRows.filter(downloadLike).length,
  explicitDownloadAnchors: allRows.filter((row) => row.visible && row.tag === 'a' && /download|tải/i.test(`${row.text} ${row.href ?? ''}`)).length,
  tourDownloadLikeRows: tour.rows.filter(downloadLike),
  menuDownloadLikeRows: menu.rows.filter(downloadLike),
  localStorageHasUrlSnap: menu.localStorageKeys.includes('urlSnap'),
  hasHandleKrpanoScreenshot: !!menu.handleKrpanoScreenshot,
  globals: menu.globals,
};

await writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
await writeFile(path.join(OUT, 'matches.json'), JSON.stringify(matches, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
await browser.close();
