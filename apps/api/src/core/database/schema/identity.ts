import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const identityRoleEnum = pgEnum('identity_role', ['ADMIN', 'EDITOR', 'REVIEWER', 'VIEWER']);
export const identityUserStatusEnum = pgEnum('identity_user_status', ['active', 'disabled']);

export const identityUsers = pgTable(
  'identity_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: identityRoleEnum('role').notNull().default('VIEWER'),
    status: identityUserStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('identity_users_email_unique').on(table.email),
    statusIndex: index('identity_users_status_idx').on(table.status),
  }),
);

export const identitySessions = pgTable(
  'identity_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    accessTokenHash: text('access_token_hash').notNull(),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    accessExpiresAt: timestamp('access_expires_at', { withTimezone: true }).notNull(),
    refreshExpiresAt: timestamp('refresh_expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userForeignKey: foreignKey({
      columns: [table.userId],
      foreignColumns: [identityUsers.id],
      name: 'identity_sessions_user_fk',
    }).onDelete('cascade'),
    userIndex: index('identity_sessions_user_idx').on(table.userId),
    accessExpiryIndex: index('identity_sessions_access_expiry_idx').on(table.accessExpiresAt),
    refreshExpiryIndex: index('identity_sessions_refresh_expiry_idx').on(table.refreshExpiresAt),
  }),
);

export type IdentityUserRow = typeof identityUsers.$inferSelect;
export type IdentitySessionRow = typeof identitySessions.$inferSelect;
