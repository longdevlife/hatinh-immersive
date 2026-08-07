import { generatePanoramaTiles, type GeneratePanoramaTilesOptions } from './pipeline.js';

const HELP = `Usage: pnpm --filter @hatinh/panorama-tooling panorama:build -- --input <file> --output <directory> [options]

Options:
  --input <file>          Original 2:1 equirectangular panorama.
  --output <directory>    Directory for preview.webp, manifest.json, and tiles/.
  --tile-size <pixels>    Power-of-two tile size, minimum 64 (default: 512).
  --preview-width <px>    Preview width (default: 512).
  --quality <1-100>       WebP quality (default: 82).
  --help                  Show this help.
`;

const argumentsMap = parseArguments(process.argv.slice(2));
if (argumentsMap.has('help')) {
  console.log(HELP);
} else {
  const inputPath = requiredArgument(argumentsMap, 'input');
  const outputDir = requiredArgument(argumentsMap, 'output');
  const options: GeneratePanoramaTilesOptions = {
    inputPath,
    outputDir,
  };
  const tileSize = optionalInteger(argumentsMap, 'tile-size');
  const previewWidth = optionalInteger(argumentsMap, 'preview-width');
  const quality = optionalInteger(argumentsMap, 'quality');
  if (tileSize !== undefined) options.tileSize = tileSize;
  if (previewWidth !== undefined) options.previewWidth = previewWidth;
  if (quality !== undefined) options.quality = quality;
  const result = await generatePanoramaTiles(options);
  console.log(`Generated panorama manifest: ${result.manifestPath}`);
}

function parseArguments(argv: string[]): Map<string, string | true> {
  const result = new Map<string, string | true>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument?.startsWith('--')) {
      throw new Error(`Unexpected argument: ${argument ?? ''}\n\n${HELP}`);
    }
    const name = argument.slice(2);
    if (name === 'help') {
      result.set(name, true);
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${name}.\n\n${HELP}`);
    }
    result.set(name, value);
    index += 1;
  }
  return result;
}

function requiredArgument(argumentsMap: Map<string, string | true>, name: string): string {
  const value = argumentsMap.get(name);
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing --${name}.\n\n${HELP}`);
  }
  return value;
}

function optionalInteger(
  argumentsMap: Map<string, string | true>,
  name: string,
): number | undefined {
  const value = argumentsMap.get(name);
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new Error(`--${name} must be an integer.\n\n${HELP}`);
  }
  return Number(value);
}
