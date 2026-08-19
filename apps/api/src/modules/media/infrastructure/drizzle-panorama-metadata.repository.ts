import { Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';

import { DatabaseService } from '../../../core/database/database.module';
import {
  panoramaAssetMetadata,
  type PanoramaAssetMetadataRow,
} from '../../../core/database/schema/panorama';
import type {
  PanoramaAssetMetadata,
  PanoramaMetadataRepository,
} from '../application/panorama-metadata.repository';

@Injectable()
export class DrizzlePanoramaMetadataRepository implements PanoramaMetadataRepository {
  constructor(private readonly database: DatabaseService) {}

  async save(metadata: PanoramaAssetMetadata): Promise<void> {
    await this.database.db
      .insert(panoramaAssetMetadata)
      .values(metadata)
      .onConflictDoUpdate({
        target: panoramaAssetMetadata.mediaAssetId,
        set: {
          projection: metadata.projection,
          sourceWidthPx: metadata.sourceWidthPx,
          sourceHeightPx: metadata.sourceHeightPx,
          qualityStatus: metadata.qualityStatus,
          qualityCode: metadata.qualityCode,
          manifestKey: metadata.manifestKey,
          previewKey: metadata.previewKey,
          rights: metadata.rights,
          rightsHolder: metadata.rightsHolder,
          rightsReference: metadata.rightsReference,
          sourceReference: metadata.sourceReference,
          version: metadata.version,
          processedAt: metadata.processedAt,
          updatedAt: metadata.updatedAt,
        },
      });
  }

  async findByMediaAssetId(mediaAssetId: string): Promise<PanoramaAssetMetadata | null> {
    const [row] = await this.database.db
      .select()
      .from(panoramaAssetMetadata)
      .where(eq(panoramaAssetMetadata.mediaAssetId, mediaAssetId));
    return row ? toMetadata(row) : null;
  }

  async findByMediaAssetIds(mediaAssetIds: string[]): Promise<Map<string, PanoramaAssetMetadata>> {
    const uniqueIds = [...new Set(mediaAssetIds)];
    if (uniqueIds.length === 0) return new Map();
    const rows = await this.database.db
      .select()
      .from(panoramaAssetMetadata)
      .where(inArray(panoramaAssetMetadata.mediaAssetId, uniqueIds));
    return new Map(rows.map((row) => [row.mediaAssetId, toMetadata(row)]));
  }
}

function toMetadata(row: PanoramaAssetMetadataRow): PanoramaAssetMetadata {
  return { ...row };
}
