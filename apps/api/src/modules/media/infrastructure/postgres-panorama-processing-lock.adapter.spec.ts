import { describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../../../core/database/database.module';
import { PostgresPanoramaProcessingLockAdapter } from './postgres-panorama-processing-lock.adapter';

describe('PostgresPanoramaProcessingLockAdapter', () => {
  it('holds the advisory lock on a dedicated connection so a one-connection repository pool remains usable', async () => {
    const statements: string[] = [];
    const lockClient = Object.assign(
      async (strings: TemplateStringsArray) => {
        statements.push(strings.join('?'));
        return [];
      },
      { end: vi.fn(async () => undefined) },
    );
    const repositoryWork = vi.fn(async () => 'processed');
    const database = {
      createDedicatedClient: vi.fn(() => lockClient),
    } as unknown as DatabaseService;
    const adapter = new PostgresPanoramaProcessingLockAdapter(database);

    await expect(adapter.withLock('asset-1', repositoryWork)).resolves.toBe('processed');

    expect(database.createDedicatedClient).toHaveBeenCalledOnce();
    expect(repositoryWork).toHaveBeenCalledOnce();
    expect(statements).toEqual([
      'select pg_advisory_lock(hashtextextended(?, 0))',
      'select pg_advisory_unlock(hashtextextended(?, 0))',
    ]);
    expect(lockClient.end).toHaveBeenCalledWith({ timeout: 5 });
  });
});
