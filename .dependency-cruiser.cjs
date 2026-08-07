module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Module cycles make ownership and renderer lifecycle unpredictable.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-frontend-api-source-import',
      comment: 'Web and admin consume the generated API client, never Nest internals.',
      severity: 'error',
      from: { path: '^apps/(web|admin)/' },
      to: { path: '^apps/api/src/' },
    },
    {
      name: 'no-domain-presentation-import',
      comment: 'Domain code cannot depend on HTTP presentation code.',
      severity: 'error',
      from: { path: '/domain/' },
      to: { path: '/presentation/' },
    },
    {
      name: 'no-domain-vendor-import',
      comment: 'Vendor renderer SDKs belong in adapters, not domain modules.',
      severity: 'error',
      from: { path: '/domain/' },
      to: {
        path: '/node_modules/(google|maplibre|photo-sphere-viewer|three)/',
      },
    },
  ],
  options: {
    combinedDependencies: true,
    doNotFollow: { path: '^node_modules' },
    enhancedResolveOptions: {
      extensions: ['.cjs', '.js', '.mjs', '.ts', '.tsx'],
    },
    exclude: ['(^|/)node_modules($|/)'],
    moduleSystems: ['es6', 'cjs'],
    preserveSymlinks: false,
  },
};
