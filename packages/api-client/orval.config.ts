import { defineConfig } from 'orval';

export default defineConfig({
  hatinh: {
    input: {
      target: './openapi.json',
    },
    output: {
      mode: 'single',
      target: 'src/generated/immersive-api.ts',
      schemas: 'src/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      prettier: true,
      override: {
        mutator: {
          name: 'customFetch',
          path: './src/mutator.ts',
        },
      },
    },
  },
});
