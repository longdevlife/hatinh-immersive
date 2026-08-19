import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../core/database/database.module';
import type { PanoramaProcessingLockPort } from '../application/panorama-processing-lock.port';

@Injectable()
export class PostgresPanoramaProcessingLockAdapter implements PanoramaProcessingLockPort {
  constructor(private readonly database: DatabaseService) {}

  async withLock<T>(mediaAssetId: string, work: () => Promise<T>): Promise<T> {
    const result = await this.database.client.begin(async (transaction) => {
      await transaction`select pg_advisory_xact_lock(hashtextextended(${`panorama:${mediaAssetId}`}, 0))`;
      return { value: await work() };
    });
    return result.value;
  }
}
