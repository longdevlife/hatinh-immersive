import { Inject, Injectable } from '@nestjs/common';
import { DB } from '../../core/database/database.module';
import type { Db } from '../../core/database/db';
import { auditEvents } from '../../core/database/schema/audit';

export interface AuditEventInput {
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async record(event: AuditEventInput): Promise<void> {
    await this.db.insert(auditEvents).values({
      actorUserId: event.actorUserId,
      action: event.action,
      resourceType: event.resourceType,
      ...(event.resourceId ? { resourceId: event.resourceId } : {}),
      metadata: event.metadata ?? {},
      ...(event.requestId ? { requestId: event.requestId } : {}),
    });
  }
}
