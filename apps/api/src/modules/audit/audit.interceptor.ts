import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { from, mergeMap, type Observable } from 'rxjs';

import { AuditService } from './audit.service';
import type { AuthenticatedRequest } from '../identity/identity.types';

function mutationAction(method: string, pathname: string): string | undefined {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) return undefined;
  if (pathname.includes('/admin/auth/')) return undefined;
  if (pathname.endsWith('/publish')) return 'content.publish';
  if (method === 'POST') return 'content.create';
  if (method === 'DELETE') return 'content.delete';
  return 'content.update';
}

function resourceType(pathname: string): string {
  const match = pathname.match(/\/admin\/([^/]+)/);
  return match?.[1] ?? 'unknown';
}

function resourceId(request: AuthenticatedRequest, response: unknown): string | undefined {
  const params = request.params as Record<string, unknown> | undefined;
  const parameterId = typeof params?.id === 'string' ? params.id : undefined;
  if (parameterId) return parameterId;
  if (response && typeof response === 'object' && 'id' in response) {
    const id = response.id;
    return typeof id === 'string' ? id : undefined;
  }
  return undefined;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const pathname = request.url.split('?')[0] ?? request.url;
    const action = mutationAction(request.method, pathname);
    if (!action || !request.user) return next.handle();
    const requestId = request.id ? String(request.id) : undefined;

    return next.handle().pipe(
      mergeMap((response) => {
        const eventResourceId = resourceId(request, response);
        return from(
          this.auditService.record({
            action,
            actorUserId: request.user!.id,
            metadata: {
              method: request.method,
              path: pathname,
              statusCode: context.switchToHttp().getResponse().statusCode,
            },
            ...(eventResourceId ? { resourceId: eventResourceId } : {}),
            resourceType: resourceType(pathname),
            ...(requestId ? { requestId } : {}),
          }),
        ).pipe(mergeMap(() => from([response])));
      }),
    );
  }
}
