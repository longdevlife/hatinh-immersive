import assert from 'node:assert/strict';

import { findArchitectureViolations } from './architecture-check.mjs';

const illegalImport = findArchitectureViolations([
  {
    filePath: 'apps/web/src/modules/immersive-navigation/ui/ExploreShell.tsx',
    source: "import { mapEngine } from '../../map3d/adapters/google-maps3d.adapter';",
  },
]);

assert.deepEqual(illegalImport, [
  {
    code: 'web-module-internal-import',
    filePath: 'apps/web/src/modules/immersive-navigation/ui/ExploreShell.tsx',
    importPath: '../../map3d/adapters/google-maps3d.adapter',
  },
]);

const legalImport = findArchitectureViolations([
  {
    filePath: 'apps/web/src/modules/immersive-navigation/ui/ExploreShell.tsx',
    source: "import { Map3DViewport } from '../../map3d';",
  },
]);

assert.deepEqual(legalImport, []);
