import { randomUUID } from 'node:crypto';

import { normalizeGeoPoint, type GeoPoint } from './geo-point';

export type DestinationStatus = 'draft' | 'published' | 'archived';

export interface DestinationTranslation {
  locale: string;
  name: string;
  summary: string;
  description: string;
}

export interface DestinationProps {
  id: string;
  slug: string;
  status: DestinationStatus;
  categoryId: string | null;
  geoPoint: GeoPoint | null;
  defaultSceneId: string | null;
  coverMediaId: string | null;
  translations: DestinationTranslation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDestinationInput {
  id?: string;
  slug: string;
  categoryId?: string | null;
  geoPoint?: GeoPoint | null;
  defaultSceneId?: string | null;
  coverMediaId?: string | null;
  translations: DestinationTranslation[];
}

export interface UpdateDestinationInput {
  slug?: string;
  categoryId?: string | null;
  geoPoint?: GeoPoint | null;
  defaultSceneId?: string | null;
  coverMediaId?: string | null;
  translations?: DestinationTranslation[];
}

export type DestinationRuleCode =
  'INVALID_DESTINATION' | 'DESTINATION_NOT_READY' | 'DESTINATION_ARCHIVED';

export class DestinationRuleError extends Error {
  constructor(
    public readonly code: DestinationRuleCode,
    message: string,
    public readonly reasons: string[] = [],
  ) {
    super(message);
    this.name = 'DestinationRuleError';
  }
}

export class Destination {
  private constructor(private props: DestinationProps) {}

  static create(input: CreateDestinationInput): Destination {
    const now = new Date();

    return new Destination(
      validateProps({
        id: input.id ?? randomUUID(),
        slug: input.slug,
        status: 'draft',
        categoryId: input.categoryId ?? null,
        geoPoint: input.geoPoint ?? null,
        defaultSceneId: input.defaultSceneId ?? null,
        coverMediaId: input.coverMediaId ?? null,
        translations: input.translations,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  static rehydrate(props: DestinationProps): Destination {
    return new Destination(validateProps(props));
  }

  get id() {
    return this.props.id;
  }

  get status() {
    return this.props.status;
  }

  update(input: UpdateDestinationInput) {
    const nextProps: DestinationProps = {
      ...this.props,
      slug: input.slug ?? this.props.slug,
      categoryId: input.categoryId === undefined ? this.props.categoryId : input.categoryId,
      geoPoint: input.geoPoint === undefined ? this.props.geoPoint : input.geoPoint,
      defaultSceneId:
        input.defaultSceneId === undefined ? this.props.defaultSceneId : input.defaultSceneId,
      coverMediaId: input.coverMediaId === undefined ? this.props.coverMediaId : input.coverMediaId,
      translations: input.translations ?? this.props.translations,
      updatedAt: new Date(),
    };

    const validatedProps = validateProps(nextProps);
    if (validatedProps.status === 'published') {
      const readinessReasons = getPublicationReadinessReasons(validatedProps);
      if (readinessReasons.length > 0) {
        throw new DestinationRuleError(
          'DESTINATION_NOT_READY',
          'Destination is not ready for publication.',
          readinessReasons,
        );
      }
    }

    this.props = validatedProps;
  }

  publish() {
    if (this.props.status === 'archived') {
      throw new DestinationRuleError(
        'DESTINATION_ARCHIVED',
        'An archived destination cannot be published.',
      );
    }

    const readinessReasons = getPublicationReadinessReasons(this.props);

    if (readinessReasons.length > 0) {
      throw new DestinationRuleError(
        'DESTINATION_NOT_READY',
        'Destination is not ready for publication.',
        readinessReasons,
      );
    }

    this.props = {
      ...this.props,
      status: 'published',
      updatedAt: new Date(),
    };
  }

  archive() {
    this.props = {
      ...this.props,
      status: 'archived',
      updatedAt: new Date(),
    };
  }

  translation(locale: string): DestinationTranslation | null {
    const translation = this.props.translations.find((item) => item.locale === locale);
    return translation ? { ...translation } : null;
  }

  toPrimitives(): DestinationProps {
    return {
      ...this.props,
      geoPoint: this.props.geoPoint ? { ...this.props.geoPoint } : null,
      translations: this.props.translations.map((translation) => ({ ...translation })),
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
    };
  }
}

function getPublicationReadinessReasons(props: DestinationProps): string[] {
  const reasons: string[] = [];
  const vietnameseTranslation = props.translations.find(
    (translation) => translation.locale === 'vi',
  );

  if (!vietnameseTranslation) {
    reasons.push('Vietnamese translation is required.');
  }
  if (props.geoPoint === null) {
    reasons.push('A WGS84 geo point is required.');
  }
  if (props.defaultSceneId === null) {
    reasons.push('A default scene is required.');
  }

  return reasons;
}

function validateProps(props: DestinationProps): DestinationProps {
  if (!props.id.trim()) {
    throw new DestinationRuleError('INVALID_DESTINATION', 'Destination id is required.');
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(props.slug) || props.slug.length > 160) {
    throw new DestinationRuleError(
      'INVALID_DESTINATION',
      'Destination slug must be lowercase kebab-case and at most 160 characters.',
    );
  }

  const translations = props.translations.map(normalizeTranslation);
  const locales = new Set(translations.map((translation) => translation.locale));
  if (locales.size !== translations.length) {
    throw new DestinationRuleError(
      'INVALID_DESTINATION',
      'Destination translations must contain each locale only once.',
    );
  }

  return {
    ...props,
    geoPoint: normalizeGeoPoint(props.geoPoint),
    translations,
  };
}

function normalizeTranslation(translation: DestinationTranslation): DestinationTranslation {
  const locale = translation.locale.trim();
  const name = translation.name.trim();
  const summary = translation.summary.trim();
  const description = translation.description.trim();

  if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale) || !name || !summary) {
    throw new DestinationRuleError(
      'INVALID_DESTINATION',
      'Translation locale, name, and summary are required.',
    );
  }

  return { locale, name, summary, description };
}
