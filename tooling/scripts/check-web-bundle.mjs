import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const distDirectory = path.join(rootDirectory, 'apps', 'web', 'dist');
const indexHtml = await readFile(path.join(distDirectory, 'index.html'), 'utf8');
const entryMatch = indexHtml.match(/<script[^>]+src="\/?([^"?]+\.js)"/);

if (!entryMatch?.[1]) {
  throw new Error('WEB_BUNDLE_ENTRY_NOT_FOUND');
}

const entryPath = path.join(distDirectory, entryMatch[1].replaceAll('/', path.sep));
const entrySource = await readFile(entryPath, 'utf8');
const entryBytes = (await stat(entryPath)).size;
const entryGzipBytes = gzipSync(entrySource, { level: 9 }).byteLength;
const forbiddenInitialShellMarkers = ['maplibre-gl', '@photo-sphere-viewer/core'];
const forbiddenMarkers = forbiddenInitialShellMarkers.filter((marker) =>
  entrySource.includes(marker),
);
const maxEntryBytes = 350 * 1024;
const maxEntryGzipBytes = 110 * 1024;

if (entryBytes > maxEntryBytes || entryGzipBytes > maxEntryGzipBytes) {
  throw new Error(
    `WEB_INITIAL_BUNDLE_BUDGET_EXCEEDED: raw=${entryBytes} gzip=${entryGzipBytes} ` +
      `limits=${maxEntryBytes}/${maxEntryGzipBytes}`,
  );
}

if (forbiddenMarkers.length > 0) {
  throw new Error(`WEB_HEAVY_RENDERER_IN_INITIAL_SHELL: ${forbiddenMarkers.join(', ')}`);
}

console.log(`web bundle ok: entry=${entryMatch[1]} raw=${entryBytes} gzip=${entryGzipBytes}`);
