import { SetMetadata } from '@nestjs/common';

import { IDENTITY_ROLES_METADATA } from './identity.guards';
import type { IdentityRole } from './identity.types';

export const Roles = (...roles: IdentityRole[]) => SetMetadata(IDENTITY_ROLES_METADATA, roles);
