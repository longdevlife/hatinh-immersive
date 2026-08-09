import { randomUUID } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { Destination } from '../domain/destination';
import { DestinationQueryService } from './destination.queries';
import type { DestinationRepository } from './destination.repository';

describe('DestinationQueryService', () => {
  it('includes the published location contract in destination previews', async () => {
    const destinationId = randomUUID();
    const defaultSceneId = randomUUID();
    const destination = Destination.rehydrate({
      id: destinationId,
      slug: 'thap-pho-co-ha-tinh',
      status: 'published',
      categoryId: null,
      geoPoint: { latitude: 18.3421, longitude: 105.9032 },
      defaultSceneId,
      coverMediaId: null,
      translations: [
        {
          locale: 'vi',
          name: 'Tháp phố cổ Hà Tĩnh',
          summary: 'Điểm đến thử nghiệm.',
          description: 'Mô tả thử nghiệm.',
        },
      ],
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
      updatedAt: new Date('2026-08-09T00:00:00.000Z'),
    });
    const repository: DestinationRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findPublishedBySlug: vi.fn(),
      listPublished: vi.fn(async () => [{ destination, categoryLabel: 'Di sản' }]),
    };

    const previews = await new DestinationQueryService(repository).listPublished('vi');

    expect(previews).toEqual([
      expect.objectContaining({
        id: destinationId,
        geoPoint: { latitude: 18.3421, longitude: 105.9032 },
        defaultSceneId,
      }),
    ]);
  });
});
