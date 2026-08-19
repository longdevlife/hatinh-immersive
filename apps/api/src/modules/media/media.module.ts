import { Module } from '@nestjs/common';

import { loadEnvironment } from '../../core/config/environment';
import { DatabaseModule } from '../../core/database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { MEDIA_UPLOAD_POLICY, MediaCommandService } from './application/media.commands';
import { MEDIA_ASSET_REPOSITORY } from './application/media.repository';
import { OBJECT_STORAGE } from './application/object-storage.port';
import { PanoramaIngestionService } from './application/panorama-ingestion.service';
import { PANORAMA_METADATA_REPOSITORY } from './application/panorama-metadata.repository';
import { PANORAMA_PROCESSOR } from './application/panorama-processing.port';
import { PUBLIC_MEDIA_URL_OPTIONS } from './application/public-media-url';
import { DrizzleMediaAssetRepository } from './infrastructure/drizzle-media.repository';
import { DrizzlePanoramaMetadataRepository } from './infrastructure/drizzle-panorama-metadata.repository';
import { S3ObjectStorageAdapter } from './infrastructure/s3-object-storage.adapter';
import { SharpPanoramaProcessor } from './infrastructure/sharp-panorama.processor';
import { AdminMediaController } from './presentation/http/admin-media.controller';

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [AdminMediaController],
  providers: [
    MediaCommandService,
    PanoramaIngestionService,
    DrizzleMediaAssetRepository,
    DrizzlePanoramaMetadataRepository,
    S3ObjectStorageAdapter,
    SharpPanoramaProcessor,
    {
      provide: MEDIA_ASSET_REPOSITORY,
      useExisting: DrizzleMediaAssetRepository,
    },
    {
      provide: OBJECT_STORAGE,
      useExisting: S3ObjectStorageAdapter,
    },
    {
      provide: PANORAMA_METADATA_REPOSITORY,
      useExisting: DrizzlePanoramaMetadataRepository,
    },
    {
      provide: PANORAMA_PROCESSOR,
      useExisting: SharpPanoramaProcessor,
    },
    {
      provide: PUBLIC_MEDIA_URL_OPTIONS,
      useFactory: () => {
        const environment = loadEnvironment();
        return { publicOrigin: environment.storage.publicOrigin };
      },
    },
    {
      provide: MEDIA_UPLOAD_POLICY,
      useFactory: () => {
        const environment = loadEnvironment();
        return {
          maxSizeBytes: environment.mediaMaxBytes,
          presignExpiresInSeconds: environment.storage.presignExpiresInSeconds,
        };
      },
    },
  ],
  exports: [
    MediaCommandService,
    PanoramaIngestionService,
    MEDIA_ASSET_REPOSITORY,
    PANORAMA_METADATA_REPOSITORY,
    PUBLIC_MEDIA_URL_OPTIONS,
  ],
})
export class MediaModule {}
