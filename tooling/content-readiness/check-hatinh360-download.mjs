import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve(process.env.OUT ?? 'artifact/hatinh360-download-probe');
const URL = 'https://platform.starglobal3d.com/smart-tourism-360/du-lich-ha-tinh/khu-du-lich-thien-cam';
const patterns = [
  /download/ig,
  /makescreenshoturl/ig,
  /makescreenshot_hires/ig,
  /urlSnap/ig,
  /snapscreen/ig,
  /toDataURL/ig,
  /createObjectURL/ig,
  /\.download\s*=/ig,
  /saveAs\s*\(/ig,
  /tải/ig,
  /camera/ig,
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'vi-VN', viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
const jsResponses = new Map();
const textResponses = [];

page.on('response', async (response) => {
  const headers = await response.allHeaders().catch(() => ({}));
  const ct = headers['content-type'] ?? '';
  const url = response.url();
  if (/javascript|ecmascript/i.test(ct) || /\.js(?:\?|$)/i.test(url)) {
    try {
      const text = await response.text();
      if (text.length <= 8_000_000) jsResponses.set(url, text);
    } catch {}
  }
  if (/xml|json|text/i.test(ct) && /snap|skin|tour|scene|project|group|360|krpano/i.test(url)) {
    try {
      const text = await response.text();
      if (text.length <= 3_000_000) textResponses.push({ url, contentType: ct, text });
    } catch {}
  }
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForTimeout(30_000);
await page.screenshot({ path: path.join(OUT, 'viewer.png'), fullPage: false });

const dom = await page.evaluate(() => {
  const rows = [];
  const all = [...document.querySelectorAll('*')];
  for (const el of all) {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 240);
    const aria = el.getAttribute('aria-label');
    const title = el.getAttribute('title');
    const href = el.getAttribute('href');
    const onclick = el.getAttribute('onclick');
    const cls = typeof el.className === 'string' ? el.className : '';
    const src = el.getAttribute('src');
    const interesting = /download|tải|camera|snap|screen|save|export|image|ảnh/i.test(`${text} ${aria ?? ''} ${title ?? ''} ${href ?? ''} ${onclick ?? ''} ${cls} ${src ?? ''}`);
    const clickable = style.cursor === 'pointer' || el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button' || onclick;
    if (interesting || (clickable && rect.width > 0 && rect.height > 0)) {
      rows.push({
        tag: el.tagName.toLowerCase(), text, aria, title, href, onclick, className: cls, src,
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
        box: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      });
    }
  }
  const globals = Object.keys(window).filter((k) => /krpano|snap|download|save|camera/i.test(k));
  return {
    title: document.title,
    url: location.href,
    rows: rows.slice(0, 1500),
    globals,
    localStorageKeys: Object.keys(localStorage),
    bodyText: (document.body?.innerText || '').slice(0, 20000),
    htmlSample: document.documentElement.outerHTML.slice(0, 500000),
  };
});

const matches = [];
for (const [url, text] of jsResponses) {
  const lower = text.toLowerCase();
  const matched = patterns.filter((p) => { p.lastIndex = 0; return p.test(text); }).map((p) => p.source);
  if (!matched.length) continue;
  const snippets = [];
  for (const token of ['download','makescreenshoturl','makescreenshot_hires','urlsnap','snapscreen','todataurl','createobjecturl','saveas','camera']) {
    let idx = lower.indexOf(token);
    if (idx >= 0) snippets.push(text.slice(Math.max(0, idx - 350), Math.min(text.length, idx + 900)));
  }
  matches.push({ url, matched, snippets });
}
for (const item of textResponses) {
  const matched = patterns.filter((p) => { p.lastIndex = 0; return p.test(item.text); }).map((p) => p.source);
  if (matched.length) matches.push({ url: item.url, matched, snippets: [item.text.slice(0, 5000)] });
}

const summary = {
  url: URL,
  jsResponses: jsResponses.size,
  matchedResources: matches.length,
  visibleDownloadLikeDom: dom.rows.filter((r) => r.visible && /download|tải|camera|snap|save|export/i.test(`${r.text} ${r.aria ?? ''} ${r.title ?? ''} ${r.href ?? ''} ${r.onclick ?? ''} ${r.className} ${r.src ?? ''}`)).length,
  explicitDownloadAnchors: dom.rows.filter((r) => r.visible && r.tag === 'a' && /download|tải/i.test(`${r.text} ${r.href ?? ''}`)).length,
  localStorageHasUrlSnap: dom.localStorageKeys.includes('urlSnap'),
  globals: dom.globals,
};

await writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
await writeFile(path.join(OUT, 'dom.json'), JSON.stringify(dom, null, 2) + '\n');
await writeFile(path.join(OUT, 'matches.json'), JSON.stringify(matches, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
await browser.close();
