import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve(process.env.RECON_OUT ?? 'artifact/hatinh360-recon');
const ORIGIN = 'https://dulichhatinh360.com';
const TEXT_OUT = path.join(OUT, 'text-responses');
const seedPaths = [
  '/',
  '/khu-du-lich-thien-cam',
  '/khu-du-lich-thach-hai',
  '/khu-du-lich-loc-ha',
  '/diem-du-lich-da-bac-eco',
  '/khu-luu-niem-nguyen-du',
  '/nga-ba-dong-loc',
];

await mkdir(OUT, { recursive: true });
await mkdir(TEXT_OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'vi-VN',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

const responseRecords = new Map();
const requestFailures = [];
const capturedBodies = [];
const bodyCaptureJobs = [];

function safeFileName(url, index) {
  const parsed = new URL(url);
  const base = `${parsed.hostname}${parsed.pathname}${parsed.search}`
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
  return `${String(index).padStart(4, '0')}-${base || 'response'}.txt`;
}

function shouldCaptureBody(url, contentType, status) {
  if (status !== 200) return false;
  const parsed = new URL(url);
  const hostAllowed = [
    'platform.starglobal3d.com',
    's3.hcm-1.cloud.cmctelecom.vn',
    'sanpham.starglobal3d.vn',
    'sanpham.starglobal3d.com',
  ].includes(parsed.hostname);
  if (!hostAllowed) return false;
  const textType = /json|xml|javascript|text\/plain/i.test(contentType ?? '');
  const usefulUrl = /full-path|group-scene|autotour|tour-view360|gs3d\.xml|tour-42-ha-tinh\.xml|\.xml(?:\?|$)|\.json(?:\?|$)/i.test(url);
  return textType && usefulUrl;
}

page.on('response', (response) => {
  const job = (async () => {
    const request = response.request();
    const headers = await response.allHeaders().catch(() => ({}));
    const url = response.url();
    const record = {
      url,
      status: response.status(),
      resourceType: request.resourceType(),
      method: request.method(),
      contentType: headers['content-type'] ?? null,
      contentLength: headers['content-length'] ?? null,
      contentDisposition: headers['content-disposition'] ?? null,
      cacheControl: headers['cache-control'] ?? null,
    };
    responseRecords.set(url, record);

    if (!shouldCaptureBody(url, record.contentType, record.status)) return;
    try {
      const body = await response.body();
      if (body.byteLength > 2 * 1024 * 1024) {
        capturedBodies.push({ url, skipped: 'body-too-large', bytes: body.byteLength });
        return;
      }
      const index = capturedBodies.length + 1;
      const file = safeFileName(url, index);
      await writeFile(path.join(TEXT_OUT, file), body);
      capturedBodies.push({ url, file: `text-responses/${file}`, bytes: body.byteLength, contentType: record.contentType });
    } catch (error) {
      capturedBodies.push({ url, captureError: error instanceof Error ? error.message : String(error) });
    }
  })();
  bodyCaptureJobs.push(job);
});

page.on('requestfailed', (request) => {
  requestFailures.push({
    url: request.url(),
    resourceType: request.resourceType(),
    failure: request.failure()?.errorText ?? 'unknown',
  });
});

const pages = [];
const discoveredInternal = new Set(seedPaths.map((value) => new URL(value, ORIGIN).href));

async function inspectCurrentPage(label) {
  await page.waitForTimeout(7_500);
  const pageInfo = await page.evaluate(() => {
    const normalize = (value) => (typeof value === 'string' ? value.trim() : '');
    const anchors = [...document.querySelectorAll('a[href]')].map((anchor) => ({
      text: normalize(anchor.textContent),
      href: anchor.href,
      download: anchor.hasAttribute('download'),
      target: anchor.getAttribute('target'),
    }));
    const controls = [...document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')]
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        text: normalize(element.textContent) || normalize(element.getAttribute('aria-label')) || normalize(element.getAttribute('title')),
        ariaLabel: element.getAttribute('aria-label'),
        title: element.getAttribute('title'),
      }))
      .filter((item) => item.text || item.ariaLabel || item.title);
    const media = [...document.querySelectorAll('img, audio, video, source, iframe')].map((element) => ({
      tag: element.tagName.toLowerCase(),
      src: element.getAttribute('src'),
      currentSrc: 'currentSrc' in element ? element.currentSrc : null,
      title: element.getAttribute('title'),
      alt: element.getAttribute('alt'),
    }));
    return {
      title: document.title,
      url: location.href,
      anchors,
      controls,
      media,
      textSample: normalize(document.body?.innerText).slice(0, 12_000),
    };
  });

  for (const anchor of pageInfo.anchors) {
    try {
      const parsed = new URL(anchor.href);
      if (parsed.origin === ORIGIN) discoveredInternal.add(parsed.href);
    } catch {
      // Ignore malformed URLs from the page.
    }
  }

  const frames = page.frames().map((frame) => ({ name: frame.name(), url: frame.url() }));
  const safe = label.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'page';
  await page.screenshot({ path: path.join(OUT, `${safe}.png`), fullPage: false }).catch(() => {});
  await writeFile(path.join(OUT, `${safe}.html`), await page.content(), 'utf8').catch(() => {});
  pages.push({ ...pageInfo, frames, screenshot: `${safe}.png`, html: `${safe}.html` });
}

for (const seedPath of seedPaths) {
  const url = new URL(seedPath, ORIGIN).href;
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await inspectCurrentPage(seedPath);
    pages.at(-1).navigationStatus = response?.status() ?? null;
  } catch (error) {
    pages.push({ url, navigationError: error instanceof Error ? error.message : String(error) });
  }
}

const priorityTerms = ['thien-cam', 'nguyen-du', 'dong-loc', 'nguyen', 'dongloc'];
const extraUrls = [...discoveredInternal]
  .filter((url) => priorityTerms.some((term) => url.toLowerCase().includes(term)))
  .slice(0, 20);
for (const url of extraUrls) {
  if (pages.some((entry) => entry.url === url)) continue;
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await inspectCurrentPage(new URL(url).pathname);
    pages.at(-1).navigationStatus = response?.status() ?? null;
  } catch (error) {
    pages.push({ url, navigationError: error instanceof Error ? error.message : String(error) });
  }
}

await Promise.allSettled(bodyCaptureJobs);

const network = [...responseRecords.values()].sort((a, b) => a.url.localeCompare(b.url));
const candidatePattern = /(?:\.xml(?:\?|$)|\.json(?:\?|$)|\.jpe?g(?:\?|$)|\.webp(?:\?|$)|\.png(?:\?|$)|\.mp3(?:\?|$)|\.m4a(?:\?|$)|\.wav(?:\?|$)|\.m3u8(?:\?|$)|\.mp4(?:\?|$)|krpano|pano|tour|scene|tile|cube|sphere|360)/i;
const candidates = network.filter((record) => candidatePattern.test(record.url) || candidatePattern.test(record.contentType ?? ''));
const downloads = pages.flatMap((entry) => (entry.anchors ?? []).filter((anchor) => anchor.download || /tải|download/i.test(`${anchor.text} ${anchor.href}`)).map((anchor) => ({ page: entry.url, ...anchor })));
const controls = pages.flatMap((entry) => (entry.controls ?? []).filter((control) => /tải|download|360|toàn cảnh|tham quan/i.test(`${control.text} ${control.ariaLabel ?? ''} ${control.title ?? ''}`)).map((control) => ({ page: entry.url, ...control })));

await writeFile(path.join(OUT, 'pages.json'), `${JSON.stringify(pages, null, 2)}\n`, 'utf8');
await writeFile(path.join(OUT, 'network.json'), `${JSON.stringify(network, null, 2)}\n`, 'utf8');
await writeFile(path.join(OUT, 'candidates.json'), `${JSON.stringify(candidates, null, 2)}\n`, 'utf8');
await writeFile(path.join(OUT, 'captured-bodies.json'), `${JSON.stringify(capturedBodies, null, 2)}\n`, 'utf8');
await writeFile(path.join(OUT, 'download-links.json'), `${JSON.stringify(downloads, null, 2)}\n`, 'utf8');
await writeFile(path.join(OUT, 'interesting-controls.json'), `${JSON.stringify(controls, null, 2)}\n`, 'utf8');
await writeFile(path.join(OUT, 'request-failures.json'), `${JSON.stringify(requestFailures, null, 2)}\n`, 'utf8');
await writeFile(
  path.join(OUT, 'summary.json'),
  `${JSON.stringify({
    origin: ORIGIN,
    inspectedPages: pages.length,
    networkResponses: network.length,
    candidateResponses: candidates.length,
    capturedTextBodies: capturedBodies.filter((entry) => entry.file).length,
    explicitDownloadLinks: downloads.length,
    interestingControls: controls.length,
    requestFailures: requestFailures.length,
  }, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  inspectedPages: pages.length,
  networkResponses: network.length,
  candidateResponses: candidates.length,
  capturedTextBodies: capturedBodies.filter((entry) => entry.file).length,
  explicitDownloadLinks: downloads.length,
  interestingControls: controls.length,
}, null, 2));

await browser.close();
