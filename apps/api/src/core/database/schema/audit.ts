import { foreignKey, index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { identityUsers } from './identity';

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id'),
    action: varchar('action', { length: 120 }).notNull(),
    resourceType: varchar('resource_type', { length: 120 }).notNull(),
    resourceId: uuid('resource_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    requestId: varchar('request_id', { length: 120 }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    actorForeignKey: foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [identityUsers.id],
      name: 'audit_events_actor_user_fk',
    }).onDelete('set null'),
    resourceIndex: index('audit_events_resource_idx').on(table.resourceType, table.resourceId),
    actorIndex: index('audit_events_actor_idx').on(table.actorUserId, table.occurredAt),
    occurredAtIndex: index('audit_events_occurred_at_idx').on(table.occurredAt),
  }),
);

export type AuditEventRow = typeof auditEvents.$inferSelect;
