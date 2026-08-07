import { existsSync } from 'node:fs';

const required = ['pnpm-workspace.yaml', 'turbo.json', 'tsconfig.base.json', 'eslint.config.mjs'];

for (const file of required) {
  if (!existsSync(file)) {
    throw new Error(`Missing repository foundation file: ${file}`);
  }
}
