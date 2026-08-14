import { validatePanoramaManifest } from './validate.js';

const HELP = `Usage: pnpm --filter @hatinh/panorama-tooling panorama:validate -- --manifest <file> [options]

Options:
  --manifest <file>       Panorama manifest to validate.
  --minimum-width <px>    Minimum useful panorama width (default: 4096).
  --help                  Show this help.
`;

const argumentsMap = parseArguments(process.argv.slice(2));
if (argumentsMap.has('help')) {
  console.log(HELP);
} else {
  const manifestPath = requiredArgument(argumentsMap, 'manifest');
  const minimumWidth = optionalInteger(argumentsMap, 'minimum-width');
  const options = {
    manifestPath,
    ...(minimumWidth === undefined ? {} : { minimumWidth }),
  };
  const result = await validatePanoramaManifest(options);
  console.log(`Validated panorama: max=${result.maximumWidth}px, tiles=${result.tileCount}`);
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
