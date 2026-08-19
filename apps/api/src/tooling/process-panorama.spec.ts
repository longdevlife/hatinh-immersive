import { describe, expect, it } from 'vitest';

import { parsePanoramaProcessArgs } from './process-panorama';

const validArgs = [
  '--asset',
  '1fbb8d08-0a19-4da2-8af0-57811d8e0d55',
  '--rights',
  'customer-owned',
  '--rights-holder',
  'Hà Tĩnh Tourism',
  '--rights-reference',
  'approval-01',
  '--source-reference',
  'delivery-01',
  '--version',
  'v1',
];

describe('process-panorama CLI arguments', () => {
  it('parses a complete production ingestion request', () => {
    expect(parsePanoramaProcessArgs(validArgs)).toEqual({
      mediaAssetId: '1fbb8d08-0a19-4da2-8af0-57811d8e0d55',
      rights: 'customer-owned',
      rightsHolder: 'Hà Tĩnh Tourism',
      rightsReference: 'approval-01',
      sourceReference: 'delivery-01',
      version: 'v1',
      sceneId: null,
    });
  });

  it.each([
    ['missing asset', validArgs.slice(2)],
    ['invalid asset', ['--asset', 'bad-id', ...validArgs.slice(2)]],
    ['invalid rights', replaceAt(validArgs, 3, 'demo-only')],
    ['blank holder', replaceAt(validArgs, 5, ' ')],
    ['blank reference', replaceAt(validArgs, 7, ' ')],
    ['blank source', replaceAt(validArgs, 9, ' ')],
    ['blank version', replaceAt(validArgs, 11, ' ')],
    ['invalid scene', [...validArgs, '--scene', 'bad-scene']],
  ])('rejects %s', (_case, args) => {
    expect(() => parsePanoramaProcessArgs(args)).toThrow();
  });

  it('accepts an optional valid scene UUID', () => {
    expect(
      parsePanoramaProcessArgs([...validArgs, '--scene', '703fd151-f09b-48f0-8014-5e968176e351'])
        .sceneId,
    ).toBe('703fd151-f09b-48f0-8014-5e968176e351');
  });
});

function replaceAt(values: string[], index: number, value: string) {
  const copy = [...values];
  copy[index] = value;
  return copy;
}
