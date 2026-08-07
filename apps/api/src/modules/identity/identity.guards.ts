import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IdentityService } from './identity.service';
import type { AuthenticatedRequest, IdentityRole } from './identity.types';

export const IDENTITY_ROLES_METADATA = Symbol('identity_roles');

@Injectable()
export class AccessSessionGuard implements CanActivate {
  constructor(private readonly identityService: IdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = await this.identityService.authenticateAccessCookie(request.headers.cookie);
    if (!principal) throw new UnauthorizedException('Authentication is required.');
    request.user = principal;
    return true;
  }
}

@Injectable()
export class IdentityRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<IdentityRole[]>(IDENTITY_ROLES_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) throw new UnauthorizedException('Authentication is required.');
    if (!roles.includes(request.user.role)) {
      throw new ForbiddenException('Your role cannot perform this action.');
    }
    return true;
  }
}
