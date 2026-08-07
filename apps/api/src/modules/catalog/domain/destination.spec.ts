import { randomUUID } from 'node:crypto';

import { Destination, DestinationRuleError } from './destination';

const baseDestination = {
  id: randomUUID(),
  slug: 'son-trang-co-dam',
  categoryId: null,
  geoPoint: { latitude: 18.3421, longitude: 105.9032 },
  defaultSceneId: randomUUID(),
  coverMediaId: null,
  translations: [
    {
      locale: 'vi',
      name: 'Sơn Trang Cổ Đạm',
      summary: 'Một điểm đến immersive của Hà Tĩnh.',
      description: 'Nội dung giới thiệu điểm đến.',
    },
  ],
};

describe('Destination publication rules', () => {
  it('publishes a complete destination and transitions it to published', () => {
    const destination = Destination.create(baseDestination);

    destination.publish();

    expect(destination.toPrimitives()).toEqual(expect.objectContaining({ status: 'published' }));
  });

  it('rejects publication when Vietnamese content, coordinates, or a default scene is missing', () => {
    const destination = Destination.create({
      ...baseDestination,
      geoPoint: null,
      defaultSceneId: null,
      translations: [],
    });

    expect(() => destination.publish()).toThrowError(DestinationRuleError);
    expect(() => destination.publish()).toThrowError(/not ready/i);
  });

  it('does not allow an archived destination to be published again', () => {
    const destination = Destination.rehydrate({
      ...baseDestination,
      status: 'archived',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(() => destination.publish()).toThrowError(/archived/i);
  });

  it('does not let an already-published destination become incomplete', () => {
    const destination = Destination.create(baseDestination);
    destination.publish();

    expect(() => destination.update({ defaultSceneId: null })).toThrowError(/not ready/i);
    expect(destination.status).toBe('published');
  });
});
