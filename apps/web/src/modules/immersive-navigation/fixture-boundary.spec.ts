import { readFileSync, readdirSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const moduleRoot = resolve(process.cwd(), 'src/modules/immersive-navigation');
const productionRoots = [moduleRoot, resolve(moduleRoot, '../../app')];

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(path);
    }

    const isSource = ['.ts', '.tsx'].includes(extname(entry.name));
    const isTest = /\.(spec|test)\.[^.]+$/.test(entry.name);
    const isFakeMode = path.includes(`${resolve(moduleRoot, 'fake-mode')}`);
    return isSource && !isTest && !isFakeMode ? [path] : [];
  });
}

describe('production fixture boundary', () => {
  it('does not import shared fixtures from production immersive modules', () => {
    const sourceFiles = productionRoots.flatMap(collectSourceFiles);
    const illegalImports = sourceFiles.filter((path) =>
      /shared[\\/]fixtures/.test(readFileSync(path, 'utf8')),
    );

    expect(illegalImports.map((path) => basename(path))).toEqual([]);
  });
});
