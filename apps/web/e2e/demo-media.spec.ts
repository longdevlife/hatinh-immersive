import { expect, test } from '@playwright/test';

const demoScenes = [
  'thien-cam-boardwalk',
  'thien-cam-shore',
  'thien-cam-lookout',
  'nguyen-du-courtyard',
  'dong-loc-memorial',
] as const;

test('serves every local demo preview, manifest, and representative tile', async ({ page }) => {
  for (const scene of demoScenes) {
    const manifestResponse = await page.request.get(`/demo/360/${scene}/manifest.json`);
    expect(manifestResponse.status()).toBe(200);
    const manifest = (await manifestResponse.json()) as {
      preview: string;
      tileUrlTemplate: string;
    };

    const previewResponse = await page.request.get(`/demo/360/${scene}/${manifest.preview}`);
    expect(previewResponse.status()).toBe(200);
    expect((await previewResponse.body()).byteLength).toBeGreaterThan(0);

    const tilePath = manifest.tileUrlTemplate
      .replace('{level}', '0')
      .replace('{col}', '0')
      .replace('{row}', '0');
    const tileResponse = await page.request.get(`/demo/360/${scene}/${tilePath}`);
    expect(tileResponse.status()).toBe(200);
    expect((await tileResponse.body()).byteLength).toBeGreaterThan(0);
  }
});
