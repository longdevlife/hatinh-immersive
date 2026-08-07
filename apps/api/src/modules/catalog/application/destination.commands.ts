import { Inject, Injectable } from '@nestjs/common';

import {
  Destination,
  type CreateDestinationInput,
  type UpdateDestinationInput,
} from '../domain/destination';
import { DESTINATION_REPOSITORY, type DestinationRepository } from './destination.repository';

@Injectable()
export class DestinationCommandService {
  constructor(@Inject(DESTINATION_REPOSITORY) private readonly repository: DestinationRepository) {}

  async create(input: CreateDestinationInput): Promise<Destination> {
    const destination = Destination.create(input);
    await this.repository.save(destination);
    return destination;
  }

  async update(id: string, input: UpdateDestinationInput): Promise<Destination | null> {
    const record = await this.repository.findById(id);
    if (!record) {
      return null;
    }

    record.destination.update(input);
    await this.repository.save(record.destination);
    return record.destination;
  }

  async publish(id: string): Promise<Destination | null> {
    const record = await this.repository.findById(id);
    if (!record) {
      return null;
    }

    record.destination.publish();
    await this.repository.save(record.destination);
    return record.destination;
  }
}
