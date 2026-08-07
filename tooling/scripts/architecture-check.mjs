import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.cjs', '.js', '.mjs', '.ts', '.tsx']);
const IMPORT_PATTERN =
  /\b(?:import\s+(?:[\s\S]*?\s+from\s+)?|export\s+(?:[\s\S]*?\s+from\s+)?|import\s*\(\s*)['"]([^'"]+)['"]/g;

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '');
}

function resolveImport(filePath, importPath) {
  if (!importPath.startsWith('.')) {
    return importPath;
  }

  return normalizePath(
    path.posix.normalize(path.posix.join(path.posix.dirname(filePath), importPath)),
  );
}

function moduleBoundaryViolation(filePath, importPath) {
  const sourceMatch = filePath.match(/^apps\/web\/src\/modules\/([^/]+)\//);
  if (!sourceMatch || !importPath.startsWith('.')) {
    return null;
  }

  const resolvedImport = resolveImport(filePath, importPath);
  const targetMatch = resolvedImport.match(/^apps\/web\/src\/modules\/([^/]+)(?:\/(.*))?$/);
  if (!targetMatch || targetMatch[1] === sourceMatch[1]) {
    return null;
  }

  const targetPath = targetMatch[2] ?? '';
  if (targetPath === '' || /^index(?:\.[cm]?[jt]sx?)?$/.test(targetPath)) {
    return null;
  }

  return {
    code: 'web-module-internal-import',
    filePath,
    importPath,
  };
}

function dependencyViolations(filePath, importPath) {
  const resolvedImport = resolveImport(filePath, importPath);
  const violations = [];

  if (
    /^(apps\/(?:web|admin)\/)/.test(filePath) &&
    /^(?:apps\/api\/src\/|.*\/apps\/api\/src\/)/.test(resolvedImport)
  ) {
    violations.push({ code: 'frontend-api-source-import', filePath, importPath });
  }

  if (/\/domain\//.test(filePath) && /\/presentation\//.test(resolvedImport)) {
    violations.push({ code: 'domain-presentation-import', filePath, importPath });
  }

  if (
    /\/domain\//.test(filePath) &&
    /(?:^|[/@-])(google(?:maps)?|maplibre(?:-gl)?|photo-sphere-viewer|three)(?:[/@.-]|$)/i.test(
      importPath,
    )
  ) {
    violations.push({ code: 'domain-vendor-import', filePath, importPath });
  }

  return violations;
}

export function findArchitectureViolations(sources) {
  const violations = [];

  for (const { filePath, source } of sources) {
    const normalizedFilePath = normalizePath(filePath);
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const importPath = match[1];
      if (!importPath) {
        continue;
      }

      const boundaryViolation = normalizedFilePath.includes('.test.')
        ? null
        : moduleBoundaryViolation(normalizedFilePath, importPath);
      if (boundaryViolation) {
        violations.push(boundaryViolation);
      }
      violations.push(...dependencyViolations(normalizedFilePath, importPath));
    }
  }

  return violations;
}

async function collectSourceFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files;
}

export async function scanWorkspace(rootDirectory = process.cwd()) {
  const directories = ['apps', 'packages'].map((directory) => path.join(rootDirectory, directory));
  const filePaths = (await Promise.all(directories.map(collectSourceFiles))).flat();
  const sources = await Promise.all(
    filePaths.map(async (filePath) => ({
      filePath: normalizePath(path.relative(rootDirectory, filePath)),
      source: await readFile(filePath, 'utf8'),
    })),
  );
  return findArchitectureViolations(sources);
}

if (process.argv.includes('--workspace')) {
  const violations = await scanWorkspace();
  if (violations.length > 0) {
    console.error(JSON.stringify(violations, null, 2));
    process.exitCode = 1;
  }
}
