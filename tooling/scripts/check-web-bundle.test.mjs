import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeInitialShell, validateInitialShell } from './check-web-bundle.mjs';

function fixtureIndexHtml() {
  return `
    <script type="module" src="/assets/entry.js"></script>
    <link rel="modulepreload" href="/assets/preload.js">
    <link rel="stylesheet" href="/assets/shell.css">
  `;
}

test('analyzes entry, modulepreload, and stylesheet assets while ignoring dynamic chunks', () => {
  const report = analyzeInitialShell(
    fixtureIndexHtml(),
    new Map([
      ['/assets/entry.js', 'entry'],
      ['/assets/preload.js', 'preload'],
      ['/assets/shell.css', 'shell'],
      ['/assets/dynamic-google-renderer.js', 'maps.googleapis.com'],
    ]),
  );

  assert.deepEqual(
    report.assets.map(({ kind, href, bytes }) => ({ kind, href, bytes })),
    [
      { kind: 'entry-script', href: '/assets/entry.js', bytes: 5 },
      { kind: 'modulepreload', href: '/assets/preload.js', bytes: 7 },
      { kind: 'stylesheet', href: '/assets/shell.css', bytes: 5 },
    ],
  );
  assert.equal(report.rawBytes, 17);
  assert.match(report.assetSummary, /entry\.js:5B/);
  assert.doesNotThrow(() => validateInitialShell(report));
});

test('rejects heavy renderer markers in any directly loaded initial asset', () => {
  const report = analyzeInitialShell(
    fixtureIndexHtml(),
    new Map([
      ['/assets/entry.js', 'entry'],
      ['/assets/preload.js', 'gmp-map-3d'],
      ['/assets/shell.css', '@photo-sphere-viewer/core'],
      ['/assets/dynamic-google-renderer.js', 'maps.googleapis.com'],
    ]),
  );

  assert.throws(
    () => validateInitialShell(report),
    (error) => {
      assert(error instanceof Error);
      assert.match(error.message, /WEB_HEAVY_RENDERER_IN_INITIAL_SHELL/);
      assert.match(error.message, /preload\.js/);
      assert.match(error.message, /shell\.css/);
      assert.match(error.message, /gmp-map-3d/);
      assert.match(error.message, /@photo-sphere-viewer/);
      return true;
    },
  );
});

test('applies the initial-shell budget to the combined directly loaded assets', () => {
  const report = analyzeInitialShell(
    fixtureIndexHtml(),
    new Map([
      ['/assets/entry.js', 'e'.repeat(300 * 1024)],
      ['/assets/preload.js', 'p'.repeat(40 * 1024)],
      ['/assets/shell.css', 'c'.repeat(20 * 1024)],
    ]),
  );

  assert.throws(
    () => validateInitialShell(report),
    (error) => {
      assert(error instanceof Error);
      assert.match(error.message, /WEB_INITIAL_BUNDLE_BUDGET_EXCEEDED/);
      assert.match(error.message, /entry\.js/);
      assert.match(error.message, /preload\.js/);
      assert.match(error.message, /shell\.css/);
      return true;
    },
  );
});
