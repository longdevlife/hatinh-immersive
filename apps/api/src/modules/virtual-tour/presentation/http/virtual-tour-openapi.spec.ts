import { describe, expect, it } from 'vitest';

import {
  immersiveManifestResponseSchema,
  sceneNodeResponseSchema,
} from '../../../../core/http/openapi.schemas';

describe('immersive audio HTTP contract', () => {
  it('publishes audio collections and scene-localized references', () => {
    expect(immersiveManifestResponseSchema.required).toEqual(
      expect.arrayContaining(['ambientTrackId', 'audioTracks', 'transcripts']),
    );
    expect(sceneNodeResponseSchema.required).toEqual(
      expect.arrayContaining(['ambientOverrideTrackId', 'narrationTrackIds', 'transcriptIds']),
    );

    const audioTrackSchema = immersiveManifestResponseSchema.properties.audioTracks.items;
    expect(audioTrackSchema.properties).toEqual(
      expect.objectContaining({
        id: expect.anything(),
        type: expect.anything(),
        src: expect.anything(),
        readiness: expect.anything(),
        voiceId: expect.anything(),
        version: expect.anything(),
      }),
    );

    const transcriptSchema = immersiveManifestResponseSchema.properties.transcripts.items;
    expect(transcriptSchema.properties).toEqual(
      expect.objectContaining({
        id: expect.anything(),
        locale: expect.anything(),
        timingMode: expect.anything(),
        segments: expect.anything(),
      }),
    );
  });

  it('does not expose internal audio provenance fields in the public schema', () => {
    const audioTrackProperties =
      immersiveManifestResponseSchema.properties.audioTracks.items.properties;
    const transcriptProperties =
      immersiveManifestResponseSchema.properties.transcripts.items.properties;

    expect(audioTrackProperties).not.toHaveProperty('rightsReference');
    expect(audioTrackProperties).not.toHaveProperty('rightsHolder');
    expect(audioTrackProperties).not.toHaveProperty('publicationStatus');
    expect(transcriptProperties).not.toHaveProperty('rightsReference');
    expect(transcriptProperties).not.toHaveProperty('rightsHolder');
    expect(transcriptProperties).not.toHaveProperty('publicationStatus');
  });
});
