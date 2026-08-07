import { Inject, Injectable } from '@nestjs/common';

import type { DestinationRecord, DestinationRepository } from './destination.repository';
import { DESTINATION_REPOSITORY } from './destination.repository';

export interface DestinationPreview {
  id: string;
  slug: string;
  name: string;
  summary: string;
  coverImageUrl: string | null;
  categoryLabel: string | null;
}

export interface DestinationDetail extends DestinationPreview {
  status: 'draft' | 'published' | 'archived';
  description: string;
  categoryId: string | null;
  defaultSceneId: string | null;
  geoPoint: { latitude: number; longitude: number } | null;
  coverMediaId: string | null;
}

@Injectable()
export class DestinationQueryService {
  constructor(@Inject(DESTINATION_REPOSITORY) private readonly repository: DestinationRepository) {}

  async listPublished(locale = 'vi'): Promise<DestinationPreview[]> {
    const records = await this.repository.listPublished();
    return records.map((record) => toPreview(record, locale));
  }

  async findPublishedBySlug(slug: string, locale = 'vi'): Promise<DestinationDetail | null> {
    const record = await this.repository.findPublishedBySlug(slug);
    return record ? toDetail(record, locale) : null;
  }
}

function toPreview(record: DestinationRecord, locale: string): DestinationPreview {
  const props = record.destination.toPrimitives();
  const translation = selectTranslation(record, locale);

  return {
    id: props.id,
    slug: props.slug,
    name: translation?.name ?? '',
    summary: translation?.summary ?? '',
    coverImageUrl: null,
    categoryLabel: record.categoryLabel,
  };
}

function toDetail(record: DestinationRecord, locale: string): DestinationDetail {
  const props = record.destination.toPrimitives();
  const translation = selectTranslation(record, locale);

  return {
    ...toPreview(record, locale),
    status: props.status,
    description: translation?.description ?? '',
    categoryId: props.categoryId,
    defaultSceneId: props.defaultSceneId,
    geoPoint: props.geoPoint,
    coverMediaId: props.coverMediaId,
  };
}

function selectTranslation(record: DestinationRecord, locale: string) {
  return record.destination.translation(locale) ?? record.destination.translation('vi');
}
