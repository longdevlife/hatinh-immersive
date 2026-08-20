import { describe, expect, it } from 'vitest';

import { parsePanoramaProcessArgs, runPanoramaProcess } from './process-panorama';

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

  it('assigns an already-ready panorama without trying to process it again', async () => {
    const calls: string[] = [];
    const result = await runPanoramaProcess(
      {
        ...parsePanoramaProcessArgs(validArgs),
        sceneId: '703fd151-f09b-48f0-8014-5e968176e351',
      },
      {
        ingestion: {
          findReadyResult: async () => readyMetadata(),
          process: async () => {
            calls.push('process');
            return readyMetadata();
          },
        },
        commands: {
          assignPanoramaToScene: async () => {
            calls.push('assign');
            return { id: '703fd151-f09b-48f0-8014-5e968176e351' };
          },
        },
      } as never,
    );

    expect(calls).toEqual(['assign']);
    expect(result.sceneId).toBe('703fd151-f09b-48f0-8014-5e968176e351');
  });

  it('can retry scene assignment after processing succeeded but the first assignment failed', async () => {
    let storedReady = false;
    let assignmentAttempts = 0;
    const dependencies = {
      ingestion: {
        findReadyResult: async () => (storedReady ? readyMetadata() : null),
        process: async () => {
          storedReady = true;
          return readyMetadata();
        },
      },
      commands: {
        assignPanoramaToScene: async () => {
          assignmentAttempts += 1;
          if (assignmentAttempts === 1) throw new Error('scene temporarily unavailable');
          return { id: '703fd151-f09b-48f0-8014-5e968176e351' };
        },
      },
    };
    const input = {
      ...parsePanoramaProcessArgs(validArgs),
      sceneId: '703fd151-f09b-48f0-8014-5e968176e351',
    };

    await expect(runPanoramaProcess(input, dependencies as never)).rejects.toThrow(
      'scene temporarily unavailable',
    );
    await expect(runPanoramaProcess(input, dependencies as never)).resolves.toMatchObject({
      sceneId: '703fd151-f09b-48f0-8014-5e968176e351',
    });
    expect(assignmentAttempts).toBe(2);
  });
});

function readyMetadata() {
  const now = new Date('2026-08-19T00:00:00.000Z');
  return {
    mediaAssetId: '1fbb8d08-0a19-4da2-8af0-57811d8e0d55',
    projection: 'equirectangular' as const,
    sourceWidthPx: 4096,
    sourceHeightPx: 2048,
    qualityStatus: 'accepted' as const,
    qualityCode: null,
    manifestKey: 'processed/panorama/1fbb8d08-0a19-4da2-8af0-57811d8e0d55/manifest.json',
    previewKey: 'processed/panorama/1fbb8d08-0a19-4da2-8af0-57811d8e0d55/preview.webp',
    rights: 'customer-owned' as const,
    rightsHolder: 'Hà Tĩnh Tourism',
    rightsReference: 'approval-01',
    sourceReference: 'delivery-01',
    version: 'v1',
    processedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function replaceAt(values: string[], index: number, value: string) {
  const copy = [...values];
  copy[index] = value;
  return copy;
}
