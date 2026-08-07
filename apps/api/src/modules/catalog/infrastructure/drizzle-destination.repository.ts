import { Injectable } from '@nestjs/common';
import { and, asc, eq, type SQL } from 'drizzle-orm';

import { DatabaseService } from '../../../core/database/database.module';
import {
  catalogCategories,
  catalogDestinationTranslations,
  catalogDestinations,
  type CatalogDestinationRow,
  type CatalogDestinationTranslationRow,
} from '../../../core/database/schema/catalog';
import { Destination } from '../domain/destination';
import type {
  DestinationRecord,
  DestinationRepository,
} from '../application/destination.repository';

@Injectable()
export class DrizzleDestinationRepository implements DestinationRepository {
  constructor(private readonly database: DatabaseService) {}

  async save(destination: Destination): Promise<void> {
    const props = destination.toPrimitives();

    await this.database.db.transaction(async (transaction) => {
      await transaction
        .insert(catalogDestinations)
        .values({
          id: props.id,
          slug: props.slug,
          status: props.status,
          categoryId: props.categoryId,
          geoPoint: props.geoPoint,
          defaultSceneId: props.defaultSceneId,
          coverMediaId: props.coverMediaId,
          createdAt: props.createdAt,
          updatedAt: props.updatedAt,
        })
        .onConflictDoUpdate({
          target: catalogDestinations.id,
          set: {
            slug: props.slug,
            status: props.status,
            categoryId: props.categoryId,
            geoPoint: props.geoPoint,
            defaultSceneId: props.defaultSceneId,
            coverMediaId: props.coverMediaId,
            updatedAt: props.updatedAt,
          },
        });

      await transaction
        .delete(catalogDestinationTranslations)
        .where(eq(catalogDestinationTranslations.destinationId, props.id));

      if (props.translations.length > 0) {
        await transaction.insert(catalogDestinationTranslations).values(
          props.translations.map((translation) => ({
            destinationId: props.id,
            locale: translation.locale,
            name: translation.name,
            summary: translation.summary,
            description: translation.description,
            updatedAt: props.updatedAt,
          })),
        );
      }
    });
  }

  async findById(id: string): Promise<DestinationRecord | null> {
    const rows = await this.findRows(eq(catalogDestinations.id, id));
    return rows.length > 0 ? toRecord(rows) : null;
  }

  async findPublishedBySlug(slug: string): Promise<DestinationRecord | null> {
    const rows = await this.findRows(
      eq(catalogDestinations.slug, slug),
      eq(catalogDestinations.status, 'published'),
    );
    return rows.length > 0 ? toRecord(rows) : null;
  }

  async listPublished(): Promise<DestinationRecord[]> {
    const rows = await this.database.db
      .select({
        destination: catalogDestinations,
        translation: catalogDestinationTranslations,
        category: catalogCategories,
      })
      .from(catalogDestinations)
      .leftJoin(
        catalogDestinationTranslations,
        eq(catalogDestinationTranslations.destinationId, catalogDestinations.id),
      )
      .leftJoin(catalogCategories, eq(catalogCategories.id, catalogDestinations.categoryId))
      .where(eq(catalogDestinations.status, 'published'))
      .orderBy(asc(catalogDestinations.createdAt));

    return groupRows(rows).map(toRecord);
  }

  private async findRows(...conditions: SQL[]) {
    const rows = await this.database.db
      .select({
        destination: catalogDestinations,
        translation: catalogDestinationTranslations,
        category: catalogCategories,
      })
      .from(catalogDestinations)
      .leftJoin(
        catalogDestinationTranslations,
        eq(catalogDestinationTranslations.destinationId, catalogDestinations.id),
      )
      .leftJoin(catalogCategories, eq(catalogCategories.id, catalogDestinations.categoryId))
      .where(and(...conditions));

    return rows;
  }
}

type JoinedRow = {
  destination: CatalogDestinationRow;
  translation: CatalogDestinationTranslationRow | null;
  category: { label: string } | null;
};

function groupRows(rows: JoinedRow[]): JoinedRow[][] {
  const grouped = new Map<string, JoinedRow[]>();

  for (const row of rows) {
    const group = grouped.get(row.destination.id) ?? [];
    group.push(row);
    grouped.set(row.destination.id, group);
  }

  return [...grouped.values()];
}

function toRecord(rows: JoinedRow[]): DestinationRecord {
  const first = rows[0];
  if (!first) {
    throw new Error('Cannot map an empty destination result');
  }

  return {
    destination: Destination.rehydrate({
      id: first.destination.id,
      slug: first.destination.slug,
      status: first.destination.status,
      categoryId: first.destination.categoryId,
      geoPoint: first.destination.geoPoint,
      defaultSceneId: first.destination.defaultSceneId,
      coverMediaId: first.destination.coverMediaId,
      translations: rows.flatMap((row) =>
        row.translation
          ? [
              {
                locale: row.translation.locale,
                name: row.translation.name,
                summary: row.translation.summary,
                description: row.translation.description,
              },
            ]
          : [],
      ),
      createdAt: first.destination.createdAt,
      updatedAt: first.destination.updatedAt,
    }),
    categoryLabel: first.category?.label ?? null,
  };
}
