import type { Destination } from '../domain/destination';

export const DESTINATION_REPOSITORY = Symbol('DESTINATION_REPOSITORY');

export interface DestinationRecord {
  destination: Destination;
  categoryLabel: string | null;
}

export interface DestinationRepository {
  save(destination: Destination): Promise<void>;
  findById(id: string): Promise<DestinationRecord | null>;
  findPublishedBySlug(slug: string): Promise<DestinationRecord | null>;
  listPublished(): Promise<DestinationRecord[]>;
}
