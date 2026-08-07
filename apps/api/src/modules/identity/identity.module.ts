import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../core/database/database.module';
import { AdminAuthController } from './presentation/http/admin-auth.controller';
import { AccessSessionGuard, IdentityRolesGuard } from './identity.guards';
import { IdentityService } from './identity.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminAuthController],
  providers: [IdentityService, AccessSessionGuard, IdentityRolesGuard],
  exports: [IdentityService, AccessSessionGuard, IdentityRolesGuard],
})
export class IdentityModule {}
