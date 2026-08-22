import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createDemoAmbientTrack } from './demo-content';

type ProvenanceTrack = {
  destinationSlug: string;
  trackId: string;
  itemName: string;
  originalFilename: string;
  sourceUrl: string;
  catalogUrl: string;
  itemPageUrl: string;
  downloadedAt: string;
  sha256: string;
  licenseUrl: string;
  license: string;
  termsUrl: string;
  termsCapturedAt: string;
  licenseCapturedAt: string;
  rights: 'demo-only';
};

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../');
const PROVENANCE_PATH = resolve(REPO_ROOT, 'content-readiness/phase-1d-demo-audio-provenance.json');
const AUDIO_PATHS: Readonly<Record<string, string>> = {
  'bien-thien-cam': 'apps/web/public/demo/audio/phase-1d/bien-thien-cam-sea-waves.mp3',
  'khu-luu-niem-nguyen-du': 'apps/web/public/demo/audio/phase-1d/nguyen-du-garden-ambience.mp3',
  'nga-ba-dong-loc': 'apps/web/public/demo/audio/phase-1d/dong-loc-wind-ambience.mp3',
  'son-trang-co-dam': 'apps/web/public/demo/audio/phase-1d/son-trang-forest-birds.mp3',
};

function readProvenance(): ProvenanceTrack[] {
  return JSON.parse(readFileSync(PROVENANCE_PATH, 'utf8')).tracks as ProvenanceTrack[];
}

describe('Phase 1D demo ambient provenance', () => {
  it('keeps one verified, non-empty Mixkit file for every destination ambient track', () => {
    const records = readProvenance();

    expect(records).toHaveLength(4);
    expect(new Set(records.map((record) => record.trackId)).size).toBe(4);

    for (const record of records) {
      const relativePath = AUDIO_PATHS[record.destinationSlug];
      if (!relativePath) {
        throw new Error(`Missing demo audio path for ${record.destinationSlug}`);
      }
      const filePath = resolve(REPO_ROOT, relativePath);

      expect(existsSync(filePath), record.destinationSlug).toBe(true);
      expect(statSync(filePath).size, record.destinationSlug).toBeGreaterThan(0);
      expect(
        createHash('sha256').update(readFileSync(filePath)).digest('hex'),
        record.destinationSlug,
      ).toBe(record.sha256);
      expect(record.sourceUrl).toMatch(/^https:\/\/assets\.mixkit\.co\/.+\.mp3$/);
      expect(record.catalogUrl).toMatch(/^https:\/\/mixkit\.co\/free-sound-effects\//);
      expect(record.itemPageUrl).toMatch(
        /^https:\/\/mixkit\.co\/free-sound-effects\/download\/\d+\//,
      );
      expect(record.licenseUrl).toBe('https://mixkit.co/license/');
      expect(record.termsUrl).toBe('https://mixkit.co/license/');
      expect(record.termsCapturedAt).toBe('2026-08-20');
      expect(record.licenseCapturedAt).toBe('2026-08-20');
      expect(record.rights).toBe('demo-only');
    }
  });

  it('wires verified ambient files only into the explicit demo lane', () => {
    for (const [destinationSlug, relativePath] of Object.entries(AUDIO_PATHS)) {
      const track = createDemoAmbientTrack(destinationSlug);

      expect(track.id).toBe(`ambient:${destinationSlug}`);
      expect(track.src).toBe('/' + relativePath.replace('apps/web/public/', ''));
      expect(track.rights).toBe('demo-only');
      expect(track.readiness).toBe('ready');
    }
  });
});
