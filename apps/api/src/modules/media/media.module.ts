import { Module } from '@nestjs/common';

import { loadEnvironment } from '../../core/config/environment';
import { DatabaseModule } from '../../core/database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { MEDIA_UPLOAD_POLICY, MediaCommandService } from './application/media.commands';
import { MEDIA_ASSET_REPOSITORY } from './application/media.repository';
import { OBJECT_STORAGE } from './application/object-storage.port';
import { DrizzleMediaAssetRepository } from './infrastructure/drizzle-media.repository';
import { S3ObjectStorageAdapter } from './infrastructure/s3-object-storage.adapter';
import { AdminMediaController } from './presentation/http/admin-media.controller';

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [AdminMediaController],
  providers: [
    MediaCommandService,
    DrizzleMediaAssetRepository,
    S3ObjectStorageAdapter,
    {
      provide: MEDIA_ASSET_REPOSITORY,
      useExisting: DrizzleMediaAssetRepository,
    },
    {
      provide: OBJECT_STORAGE,
      useExisting: S3ObjectStorageAdapter,
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
  exports: [MediaCommandService],
})
export class MediaModule {}
