import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('generated API contract', () => {
  it('keeps the generated client boundary backed by the exported OpenAPI document', () => {
    const openApiPath = fileURLToPath(new URL('../openapi.json', import.meta.url));
    const openApi = JSON.parse(readFileSync(openApiPath, 'utf8')) as {
      openapi: string;
      paths: Record<string, unknown>;
    };

    expect(openApi.openapi).toMatch(/^3\.0\./);
    expect(openApi.paths['/api/v1/destinations/{slug}/immersive-manifest']).toBeDefined();
    expect(openApi.paths['/api/v1/scenes/{sceneId}/neighbors']).toBeDefined();
    expect(openApi.paths['/api/v1/admin/scenes']).toBeDefined();
  });

  it('will expose generated functions and query hooks', async () => {
    const generated = await import('./generated/immersive-api');

    expect(generated.getImmersiveManifest).toBeTypeOf('function');
    expect(generated.useGetImmersiveManifest).toBeTypeOf('function');
    expect(generated.createScene).toBeTypeOf('function');
    expect(generated.useCreateScene).toBeTypeOf('function');
  });
});
