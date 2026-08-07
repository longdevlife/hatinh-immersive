import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DatabaseService } from '../../../core/database/database.module';
import { mediaAssets, type MediaAssetRow } from '../../../core/database/schema/media';
import { MediaAsset, type MediaAssetProps } from '../domain/media-asset';
import type { MediaAssetRepository } from '../application/media.repository';

@Injectable()
export class DrizzleMediaAssetRepository implements MediaAssetRepository {
  constructor(private readonly database: DatabaseService) {}

  async save(asset: MediaAsset): Promise<void> {
    const props = asset.toPrimitives();
    await this.database.db
      .insert(mediaAssets)
      .values({
        id: props.id,
        mediaKind: props.mediaKind,
        originalFilename: props.originalFilename,
        contentType: props.contentType,
        sizeBytes: props.sizeBytes,
        storageKey: props.storageKey,
        status: props.status,
        etag: props.etag,
        failureCode: props.failureCode,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
        uploadedAt: props.uploadedAt,
        readyAt: props.readyAt,
      })
      .onConflictDoUpdate({
        target: mediaAssets.id,
        set: {
          status: props.status,
          etag: props.etag,
          failureCode: props.failureCode,
          updatedAt: props.updatedAt,
          uploadedAt: props.uploadedAt,
          readyAt: props.readyAt,
        },
      });
  }

  async findById(id: string): Promise<MediaAsset | null> {
    const rows = await this.database.db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
    const row = rows[0];
    return row ? MediaAsset.rehydrate(toProps(row)) : null;
  }
}

function toProps(row: MediaAssetRow): MediaAssetProps {
  return {
    id: row.id,
    mediaKind: row.mediaKind,
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    status: row.status,
    etag: row.etag,
    failureCode: row.failureCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    uploadedAt: row.uploadedAt,
    readyAt: row.readyAt,
  };
}
