import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../core/database/database.module';
import { DestinationCommandService } from './application/destination.commands';
import { DESTINATION_REPOSITORY } from './application/destination.repository';
import { DestinationQueryService } from './application/destination.queries';
import { DrizzleDestinationRepository } from './infrastructure/drizzle-destination.repository';
import { AdminDestinationController } from './presentation/http/admin-destination.controller';
import { DestinationController } from './presentation/http/destination.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [DestinationController, AdminDestinationController],
  providers: [
    DestinationQueryService,
    DestinationCommandService,
    DrizzleDestinationRepository,
    {
      provide: DESTINATION_REPOSITORY,
      useExisting: DrizzleDestinationRepository,
    },
  ],
  exports: [DestinationQueryService, DestinationCommandService],
})
export class CatalogModule {}
