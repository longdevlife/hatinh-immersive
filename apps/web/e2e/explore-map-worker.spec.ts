import { expect, test } from '@playwright/test';

const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAATSURBVDhPYxgFo2AUjAIwYGAAAAQQAAGnRHxjAAAAAElFTkSuQmCC',
  'base64',
);

const TEST_STYLE = {
  layers: [{ id: 'local', source: 'local', type: 'raster' }],
  sources: {
    local: {
      tileSize: 256,
      tiles: ['/test/explore-tiles/{z}/{x}/{y}.png'],
      type: 'raster',
    },
  },
  version: 8,
};

type MapProbeState = {
  destinationRenderedCount: number;
  destinationSourceCount: number;
  destinationSourceIds: string[];
  destinationSourceLoaded: boolean;
  selectedDestinationIds: string[];
  selectedHaloRenderedCount: number;
};

type E2eGeoJsonSource = {
  setData(data: unknown): Promise<void>;
};

type E2eMap = {
  addLayer(layer: unknown): void;
  addSource(id: string, source: unknown): void;
  getSource(id: string): E2eGeoJsonSource | undefined;
  isSourceLoaded(sourceId: string): boolean;
  queryRenderedFeatures(options?: { layers?: string[] }): unknown[];
  querySourceFeatures(sourceId: string): Array<{ properties?: Record<string, unknown> }>;
};

declare global {
  interface Window {
    __hatinhExploreMapForE2e?: E2eMap;
  }
}

test('production MapLibre build serves its worker and settles real GeoJSON updates', async ({
  page,
}) => {
  const workerResponses: Array<{ contentType: string; status: number; url: string }> = [];

  page.on('response', (response) => {
    if (/maplibre-gl-worker(?:-[^/?]+)?\.(?:mjs|js)(?:\?|$)/i.test(response.url())) {
      workerResponses.push({
        contentType: response.headers()['content-type'] ?? '',
        status: response.status(),
        url: response.url(),
      });
    }
  });

  await page.route('**/test/explore-map-style.json', async (route) => {
    await route.fulfill({
      body: JSON.stringify(TEST_STYLE),
      contentType: 'application/json',
    });
  });
  await page.route(/\/test\/explore-tiles\/\d+\/\d+\/\d+\.png$/, async (route) => {
    await route.fulfill({ body: TRANSPARENT_PNG, contentType: 'image/png' });
  });

  await page.goto('/explore');
  const map = page.getByRole('region', { name: 'Bản đồ khám phá Hà Tĩnh' });
  await expect(map).toHaveAttribute('data-explore-map-status', 'ready');

  await expect.poll(() => workerResponses.length, { timeout: 30_000 }).toBeGreaterThan(0);
  const workerResponse = workerResponses.at(-1)!;
  expect(workerResponse.status).toBe(200);
  expect(workerResponse.contentType).toMatch(/(?:java|ecma)script/i);
  expect(workerResponse.url).not.toContain('/index.html');

  const readMapProbe = () =>
    page.evaluate(() => {
      const map = window.__hatinhExploreMapForE2e;
      if (!map) {
        return null;
      }

      const source = map.getSource('explore-destinations');
      const sourceFeatures = map.querySourceFeatures('explore-destinations');
      const renderedFeatures = map.queryRenderedFeatures({ layers: ['explore-destinations'] });
      const selectedFeatures = sourceFeatures.filter(
        (feature) => feature.properties?.isSelected === true,
      );
      const destinationSourceIds = [
        ...new Set(
          sourceFeatures
            .map((feature) => feature.properties?.id)
            .filter((id): id is string => typeof id === 'string'),
        ),
      ].sort();
      const selectedDestinationIds = [
        ...new Set(
          selectedFeatures
            .map((feature) => feature.properties?.id)
            .filter((id): id is string => typeof id === 'string'),
        ),
      ].sort();

      return {
        destinationRenderedCount: renderedFeatures.length,
        destinationSourceCount: sourceFeatures.length,
        destinationSourceIds,
        destinationSourceLoaded: map.isSourceLoaded('explore-destinations'),
        selectedDestinationIds,
        selectedHaloRenderedCount: map.queryRenderedFeatures({
          layers: ['explore-destinations-selection-halo'],
        }).length,
        sourceExists: Boolean(source),
      } satisfies MapProbeState & { sourceExists: boolean };
    });

  await expect.poll(readMapProbe, { timeout: 30_000 }).toMatchObject({
    destinationRenderedCount: expect.any(Number),
    destinationSourceIds: [
      'dong-loc-junction',
      'nguyen-du-memorial',
      'son-trang-co-dam',
      'thien-cam-beach',
    ],
    destinationSourceLoaded: true,
    selectedDestinationIds: [],
    selectedHaloRenderedCount: 0,
    sourceExists: true,
  });
  expect((await readMapProbe())!.destinationRenderedCount).toBeGreaterThan(0);

  const canarySetDataResolved = await page.evaluate(async () => {
    const map = window.__hatinhExploreMapForE2e;
    if (!map) {
      return false;
    }

    map.addSource('e2e-geojson-canary', {
      data: { features: [], type: 'FeatureCollection' },
      type: 'geojson',
    });
    map.addLayer({
      id: 'e2e-geojson-canary-circle',
      paint: { 'circle-color': '#ff00aa', 'circle-radius': 6 },
      source: 'e2e-geojson-canary',
      type: 'circle',
    });
    const source = map.getSource('e2e-geojson-canary');
    if (!source) {
      return false;
    }

    await source.setData({
      features: [
        {
          geometry: { coordinates: [105.9032, 18.3421], type: 'Point' },
          properties: {},
          type: 'Feature',
        },
      ],
      type: 'FeatureCollection',
    });
    return true;
  });
  expect(canarySetDataResolved).toBe(true);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const map = window.__hatinhExploreMapForE2e;
        if (!map) {
          return { querySourceCount: 0, renderedCount: 0 };
        }

        return {
          querySourceCount: map.querySourceFeatures('e2e-geojson-canary').length,
          renderedCount: map.queryRenderedFeatures({ layers: ['e2e-geojson-canary-circle'] })
            .length,
        };
      }),
    )
    .toEqual({ querySourceCount: 1, renderedCount: 1 });

  await page.getByRole('button', { name: 'Chọn điểm đến Sơn Trang Cổ Đạm' }).click();
  await expect(map).toHaveAttribute('data-selected-destination-id', 'son-trang-co-dam');
  await expect.poll(readMapProbe, { timeout: 30_000 }).toMatchObject({
    destinationRenderedCount: expect.any(Number),
    destinationSourceIds: expect.arrayContaining(['son-trang-co-dam']),
    destinationSourceLoaded: true,
    selectedDestinationIds: ['son-trang-co-dam'],
    selectedHaloRenderedCount: 1,
  });
  expect((await readMapProbe())!.destinationRenderedCount).toBeGreaterThan(0);
});
