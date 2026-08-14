import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const defaultDistDirectory = path.join(rootDirectory, 'apps', 'web', 'dist');

const forbiddenInitialShellMarkers = [
  'maplibre-gl',
  '@photo-sphere-viewer',
  'photo-sphere-viewer',
  'google-maps3d',
  'maps.googleapis.com',
  'google.maps',
  'gmp-map-3d',
];
const maxInitialShellBytes = 350 * 1024;
const maxInitialShellGzipBytes = 110 * 1024;

function getAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1];
}

function stripUrlSuffix(value) {
  return value.split(/[?#]/, 1)[0];
}

function isJavaScriptAsset(value) {
  return /\.js$/i.test(stripUrlSuffix(value));
}

function isStylesheetAsset(value) {
  return /\.css$/i.test(stripUrlSuffix(value));
}

export function collectInitialShellAssets(indexHtml) {
  const assets = [];
  const seenHrefs = new Set();
  const tagPattern = /<(script|link)\b[^>]*>/gi;

  for (const match of indexHtml.matchAll(tagPattern)) {
    const tag = match[0];
    const tagName = match[1]?.toLowerCase();
    const src = tagName === 'script' ? getAttribute(tag, 'src') : undefined;
    const href = getAttribute(tag, 'href');
    const rel = getAttribute(tag, 'rel')?.toLowerCase().split(/\s+/) ?? [];
    const candidate = src ?? href;

    if (!candidate) {
      continue;
    }

    const kind =
      tagName === 'script' && isJavaScriptAsset(candidate)
        ? 'entry-script'
        : tagName === 'link' && rel.includes('modulepreload') && isJavaScriptAsset(candidate)
          ? 'modulepreload'
          : tagName === 'link' && rel.includes('stylesheet') && isStylesheetAsset(candidate)
            ? 'stylesheet'
            : null;

    const normalizedHref = stripUrlSuffix(candidate);
    if (!kind || seenHrefs.has(normalizedHref)) {
      continue;
    }

    seenHrefs.add(normalizedHref);
    assets.push({ href: normalizedHref, kind });
  }

  if (!assets.some(({ kind }) => kind === 'entry-script')) {
    throw new Error('WEB_BUNDLE_ENTRY_NOT_FOUND');
  }

  return assets;
}

function readAssetSource(assetSources, href) {
  const source = assetSources instanceof Map ? assetSources.get(href) : assetSources[href];
  if (source === undefined) {
    throw new Error(`WEB_INITIAL_ASSET_NOT_FOUND: ${href}`);
  }

  return source;
}

function assetName(href) {
  return href.split('/').at(-1) || href;
}

function summarizeAsset(asset) {
  return `${assetName(asset.href)}:${asset.bytes}B raw/${asset.gzipBytes}B gzip`;
}

export function analyzeInitialShell(indexHtml, assetSources) {
  const references = collectInitialShellAssets(indexHtml);
  const assets = references.map(({ href, kind }) => {
    const source = readAssetSource(assetSources, href);
    const bytes = Buffer.byteLength(source);
    const gzipBytes = gzipSync(source, { level: 9 }).byteLength;
    const markers = forbiddenInitialShellMarkers.filter((marker) => source.includes(marker));

    return { bytes, gzipBytes, href, kind, markers };
  });

  return {
    assets,
    assetSummary: assets.map(summarizeAsset).join(', '),
    forbiddenAssets: assets.filter(({ markers }) => markers.length > 0),
    gzipBytes: assets.reduce((total, asset) => total + asset.gzipBytes, 0),
    rawBytes: assets.reduce((total, asset) => total + asset.bytes, 0),
  };
}

export function validateInitialShell(report) {
  if (report.rawBytes > maxInitialShellBytes || report.gzipBytes > maxInitialShellGzipBytes) {
    throw new Error(
      `WEB_INITIAL_BUNDLE_BUDGET_EXCEEDED: raw=${report.rawBytes} gzip=${report.gzipBytes} ` +
        `limits=${maxInitialShellBytes}/${maxInitialShellGzipBytes} ` +
        `assets=${report.assetSummary}`,
    );
  }

  if (report.forbiddenAssets.length > 0) {
    const violations = report.forbiddenAssets
      .map(({ href, markers }) => `${assetName(href)} [${markers.join(', ')}]`)
      .join('; ');
    throw new Error(
      `WEB_HEAVY_RENDERER_IN_INITIAL_SHELL: ${violations} assets=${report.assetSummary}`,
    );
  }
}

function resolveDistAssetPath(distDirectory, href) {
  const relativePath = decodeURIComponent(href).replace(/^[/\\]+/, '');
  const resolvedPath = path.resolve(distDirectory, relativePath);
  const relativeToDist = path.relative(distDirectory, resolvedPath);
  if (relativeToDist.startsWith('..') || path.isAbsolute(relativeToDist)) {
    throw new Error(`WEB_INITIAL_ASSET_OUTSIDE_DIST: ${href}`);
  }

  return resolvedPath;
}

export async function runCheck({ distDirectory = defaultDistDirectory } = {}) {
  const indexHtml = await readFile(path.join(distDirectory, 'index.html'), 'utf8');
  const references = collectInitialShellAssets(indexHtml);
  const assetSources = new Map();

  for (const { href } of references) {
    const assetPath = resolveDistAssetPath(distDirectory, href);
    assetSources.set(href, await readFile(assetPath, 'utf8'));
  }

  const report = analyzeInitialShell(indexHtml, assetSources);
  validateInitialShell(report);

  console.log(
    `web bundle ok: raw=${report.rawBytes} gzip=${report.gzipBytes} ` +
      `assets=${report.assetSummary}`,
  );
  return report;
}

const isMainModule = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMainModule) {
  await runCheck();
}
