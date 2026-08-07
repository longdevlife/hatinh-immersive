import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../core/database/database.module';
import { CatalogModule } from '../catalog/catalog.module';
import { VirtualTourCommandService } from './application/virtual-tour.commands';
import { VIRTUAL_TOUR_REPOSITORY } from './application/virtual-tour.repository';
import { VirtualTourQueryService } from './application/virtual-tour.queries';
import { DrizzleVirtualTourRepository } from './infrastructure/drizzle-virtual-tour.repository';
import { AdminHotspotController } from './presentation/http/admin-hotspot.controller';
import { AdminSceneController } from './presentation/http/admin-scene.controller';
import { AdminSceneLinkController } from './presentation/http/admin-scene-link.controller';
import { VirtualTourController } from './presentation/http/virtual-tour.controller';

@Module({
  imports: [DatabaseModule, CatalogModule],
  controllers: [
    VirtualTourController,
    AdminSceneController,
    AdminSceneLinkController,
    AdminHotspotController,
  ],
  providers: [
    VirtualTourQueryService,
    VirtualTourCommandService,
    DrizzleVirtualTourRepository,
    {
      provide: VIRTUAL_TOUR_REPOSITORY,
      useExisting: DrizzleVirtualTourRepository,
    },
  ],
  exports: [VirtualTourQueryService, VirtualTourCommandService],
})
export class VirtualTourModule {}
