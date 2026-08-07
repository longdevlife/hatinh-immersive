import { expect, test } from '@playwright/test';

const destinationId = '11111111-1111-4111-8111-111111111111';
const sceneId = '22222222-2222-4222-8222-222222222222';
const hotspotId = '33333333-3333-4333-8333-333333333333';

test('creates a scene and hotspot that appear in the public immersive manifest', async ({
  page,
}) => {
  let sceneCreated = false;
  let hotspotCreated = false;

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === 'GET' && url.pathname === '/api/v1/destinations') {
      await route.fulfill({ json: [] });
      return;
    }

    if (method === 'POST' && url.pathname === '/api/v1/admin/destinations') {
      await route.fulfill({
        json: {
          categoryId: null,
          coverMediaId: null,
          createdAt: '2026-08-08T00:00:00.000Z',
          defaultSceneId: null,
          geoPoint: { latitude: 18.3428, longitude: 105.9057 },
          id: destinationId,
          slug: 'son-trang-co-dam',
          status: 'draft',
          translations: [
            {
              description: '',
              locale: 'vi',
              name: 'Sơn Tràng cổ đàm',
              summary: 'Một hành trình di sản ven núi.',
            },
          ],
          updatedAt: '2026-08-08T00:00:00.000Z',
        },
        status: 201,
      });
      return;
    }

    if (method === 'POST' && url.pathname === '/api/v1/admin/scenes') {
      sceneCreated = true;
      await route.fulfill({
        json: {
          altitude: null,
          createdAt: '2026-08-08T00:00:00.000Z',
          destinationId,
          geoPoint: { latitude: 18.3428, longitude: 105.9057 },
          id: sceneId,
          initialFov: 90,
          initialHeading: 0,
          initialPitch: 0,
          name: 'Cổng vào khu di tích',
          panoramaAssetId: null,
          panoramaAssetStatus: null,
          sortOrder: 0,
          status: 'draft',
          updatedAt: '2026-08-08T00:00:00.000Z',
        },
        status: 201,
      });
      return;
    }

    if (method === 'POST' && url.pathname === '/api/v1/admin/hotspots') {
      hotspotCreated = true;
      await route.fulfill({
        json: {
          createdAt: '2026-08-08T00:00:00.000Z',
          id: hotspotId,
          payload: { title: 'Câu chuyện địa danh' },
          pitch: 0,
          sceneId,
          status: 'draft',
          type: 'information',
          updatedAt: '2026-08-08T00:00:00.000Z',
          yaw: 180,
        },
        status: 201,
      });
      return;
    }

    if (
      method === 'GET' &&
      url.pathname === '/api/v1/destinations/son-trang-co-dam/immersive-manifest'
    ) {
      await route.fulfill({
        json: {
          destination: {
            geoPoint: { latitude: 18.3428, longitude: 105.9057 },
            id: destinationId,
            name: 'Sơn Tràng cổ đàm',
            slug: 'son-trang-co-dam',
          },
          links: [],
          nodes: sceneCreated
            ? [
                {
                  id: sceneId,
                  name: 'Cổng vào khu di tích',
                  panoramaAssetId: null,
                  panoramaAssetStatus: null,
                  sortOrder: 0,
                  status: 'draft',
                },
              ]
            : [],
        },
      });
      return;
    }

    if (method === 'PATCH' || method === 'POST' || method === 'DELETE') {
      await route.fulfill({ status: method === 'DELETE' ? 204 : 200, json: {} });
      return;
    }

    await route.fulfill({ json: {} });
  });

  await page.goto('/workspace');
  await page.getByLabel('Destination name').fill('Sơn Tràng cổ đàm');
  await page.getByLabel('Slug').fill('son-trang-co-dam');
  await page.getByLabel('Summary').fill('Một hành trình di sản ven núi.');
  await page.getByRole('button', { name: 'Create destination' }).click();
  await expect(page.getByRole('heading', { name: 'Sơn Tràng cổ đàm' }).first()).toBeVisible();

  await page.getByLabel('Scene name').fill('Cổng vào khu di tích');
  await page.getByRole('button', { name: 'Create scene' }).click();
  await expect(page.getByRole('heading', { name: 'Scene settings' })).toBeVisible();

  const canvas = page.getByRole('button', { name: 'Panorama editor canvas' });
  await canvas.click({ position: { x: 320, y: 180 } });
  await page.getByLabel('Hotspot title').fill('Câu chuyện địa danh');
  await page.getByRole('button', { name: 'Save hotspot' }).click();
  await expect(page.getByRole('status')).toContainText('Hotspot saved to the scene graph');
  await expect(canvas.getByRole('button', { name: 'Hotspot 1' })).toBeVisible();

  expect(sceneCreated).toBe(true);
  expect(hotspotCreated).toBe(true);

  const manifestResponse = await page.evaluate(async () => {
    const response = await fetch('/api/v1/destinations/son-trang-co-dam/immersive-manifest');
    return response.json();
  });
  expect(manifestResponse.nodes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: sceneId, name: 'Cổng vào khu di tích' }),
    ]),
  );
});
