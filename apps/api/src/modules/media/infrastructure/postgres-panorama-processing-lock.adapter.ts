import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../core/database/database.module';
import type { PanoramaProcessingLockPort } from '../application/panorama-processing-lock.port';

@Injectable()
export class PostgresPanoramaProcessingLockAdapter implements PanoramaProcessingLockPort {
  constructor(private readonly database: DatabaseService) {}

  async withLock<T>(mediaAssetId: string, work: () => Promise<T>): Promise<T> {
    const lockClient = this.database.createDedicatedClient();
    const lockKey = `panorama:${mediaAssetId}`;
    try {
      await lockClient`select pg_advisory_lock(hashtextextended(${lockKey}, 0))`;
      return await work();
    } finally {
      await lockClient`select pg_advisory_unlock(hashtextextended(${lockKey}, 0))`;
      await lockClient.end({ timeout: 5 });
    }
  }
}
