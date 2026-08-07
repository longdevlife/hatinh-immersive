import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import argon2 from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

import { DB } from '../../core/database/database.module';
import type { Db } from '../../core/database/db';
import { loadEnvironment, type AppEnvironment } from '../../core/config/environment';
import { identitySessions, identityUsers } from '../../core/database/schema/identity';
import {
  ACCESS_COOKIE_NAME,
  parseCookieHeader,
  REFRESH_COOKIE_NAME,
  serializeSessionCookie,
} from './identity.cookies';
import type { AuthenticatedPrincipal, IdentityRole } from './identity.types';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password.');
    this.name = 'InvalidCredentialsError';
  }
}

export class InvalidSessionError extends Error {
  constructor() {
    super('The session is invalid or expired.');
    this.name = 'InvalidSessionError';
  }
}

export interface SessionCookies {
  access: string;
  refresh: string;
}

export interface AuthSession {
  cookies: SessionCookies;
  principal: AuthenticatedPrincipal;
}

interface ParsedSessionCookie {
  sessionId: string;
  token: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createToken(): string {
  return randomBytes(32).toString('base64url');
}

function parseSessionCookie(value: string | undefined): ParsedSessionCookie | undefined {
  if (!value) return undefined;
  const separator = value.indexOf('.');
  if (separator <= 0 || separator === value.length - 1) return undefined;

  const sessionId = value.slice(0, separator);
  const token = value.slice(separator + 1);
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return undefined;
  return { sessionId, token };
}

function cookieValue(sessionId: string, token: string): string {
  return `${sessionId}.${token}`;
}

function toPrincipal(user: {
  id: string;
  email: string;
  role: IdentityRole;
}): AuthenticatedPrincipal {
  return { id: user.id, email: user.email, role: user.role };
}

@Injectable()
export class IdentityService implements OnModuleInit {
  private readonly environment: AppEnvironment = loadEnvironment();

  constructor(@Inject(DB) private readonly db: Db) {}

  async onModuleInit(): Promise<void> {
    const { bootstrapEmail, bootstrapPassword, bootstrapRole } = this.environment.auth;
    if (!bootstrapEmail || !bootstrapPassword) return;

    const passwordHash = await argon2.hash(bootstrapPassword, ARGON2_OPTIONS);
    await this.db
      .insert(identityUsers)
      .values({
        email: normalizeEmail(bootstrapEmail),
        passwordHash,
        role: bootstrapRole,
        status: 'active',
      })
      .onConflictDoUpdate({
        target: identityUsers.email,
        set: { passwordHash, role: bootstrapRole, status: 'active', updatedAt: new Date() },
      });
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const [user] = await this.db
      .select({
        id: identityUsers.id,
        email: identityUsers.email,
        passwordHash: identityUsers.passwordHash,
        role: identityUsers.role,
      })
      .from(identityUsers)
      .where(
        and(eq(identityUsers.email, normalizeEmail(email)), eq(identityUsers.status, 'active')),
      )
      .limit(1);

    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw new InvalidCredentialsError();
    }

    return this.createSession(toPrincipal(user));
  }

  async authenticateAccessCookie(
    cookieHeader: string | undefined,
  ): Promise<AuthenticatedPrincipal | null> {
    const cookies = parseCookieHeader(cookieHeader);
    const parsed = parseSessionCookie(cookies[ACCESS_COOKIE_NAME]);
    if (!parsed) return null;

    const [session] = await this.db
      .select({
        id: identitySessions.id,
        userId: identitySessions.userId,
        accessTokenHash: identitySessions.accessTokenHash,
        accessExpiresAt: identitySessions.accessExpiresAt,
      })
      .from(identitySessions)
      .where(and(eq(identitySessions.id, parsed.sessionId), isNull(identitySessions.revokedAt)))
      .limit(1);
    if (!session || session.accessExpiresAt <= new Date()) return null;
    if (!(await argon2.verify(session.accessTokenHash, parsed.token))) return null;

    const [user] = await this.db
      .select({ id: identityUsers.id, email: identityUsers.email, role: identityUsers.role })
      .from(identityUsers)
      .where(and(eq(identityUsers.id, session.userId), eq(identityUsers.status, 'active')))
      .limit(1);
    if (!user) return null;

    await this.db
      .update(identitySessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(identitySessions.id, session.id));

    return toPrincipal(user);
  }

  async refresh(cookieHeader: string | undefined): Promise<AuthSession> {
    const cookies = parseCookieHeader(cookieHeader);
    const parsed = parseSessionCookie(cookies[REFRESH_COOKIE_NAME]);
    if (!parsed) throw new InvalidSessionError();

    const [session] = await this.db
      .select()
      .from(identitySessions)
      .where(and(eq(identitySessions.id, parsed.sessionId), isNull(identitySessions.revokedAt)))
      .limit(1);
    if (!session || session.refreshExpiresAt <= new Date()) throw new InvalidSessionError();
    if (!(await argon2.verify(session.refreshTokenHash, parsed.token))) {
      throw new InvalidSessionError();
    }

    const [user] = await this.db
      .select({ id: identityUsers.id, email: identityUsers.email, role: identityUsers.role })
      .from(identityUsers)
      .where(and(eq(identityUsers.id, session.userId), eq(identityUsers.status, 'active')))
      .limit(1);
    if (!user) throw new InvalidSessionError();

    const accessToken = createToken();
    const refreshToken = createToken();
    const accessTokenHash = await argon2.hash(accessToken, ARGON2_OPTIONS);
    const refreshTokenHash = await argon2.hash(refreshToken, ARGON2_OPTIONS);
    const now = new Date();
    const accessExpiresAt = new Date(now.getTime() + this.environment.auth.accessTtlSeconds * 1000);
    const refreshExpiresAt = new Date(
      now.getTime() + this.environment.auth.refreshTtlSeconds * 1000,
    );
    const updated = await this.db
      .update(identitySessions)
      .set({
        accessTokenHash,
        refreshTokenHash,
        accessExpiresAt,
        refreshExpiresAt,
        rotatedAt: now,
        lastUsedAt: now,
      })
      .where(
        and(
          eq(identitySessions.id, session.id),
          eq(identitySessions.refreshTokenHash, session.refreshTokenHash),
          isNull(identitySessions.revokedAt),
        ),
      )
      .returning({ id: identitySessions.id });
    if (updated.length === 0) throw new InvalidSessionError();

    return {
      cookies: this.serializeCookies(session.id, accessToken, refreshToken),
      principal: toPrincipal(user),
    };
  }

  async logout(cookieHeader: string | undefined): Promise<void> {
    const cookies = parseCookieHeader(cookieHeader);
    const parsed =
      parseSessionCookie(cookies[REFRESH_COOKIE_NAME]) ??
      parseSessionCookie(cookies[ACCESS_COOKIE_NAME]);
    if (!parsed) return;

    await this.db
      .update(identitySessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(identitySessions.id, parsed.sessionId), isNull(identitySessions.revokedAt)));
  }

  serializeCookies(sessionId: string, accessToken: string, refreshToken: string): SessionCookies {
    const secure = this.environment.nodeEnv === 'production';
    return {
      access: serializeSessionCookie(
        ACCESS_COOKIE_NAME,
        cookieValue(sessionId, accessToken),
        this.environment.auth.accessTtlSeconds,
        secure,
      ),
      refresh: serializeSessionCookie(
        REFRESH_COOKIE_NAME,
        cookieValue(sessionId, refreshToken),
        this.environment.auth.refreshTtlSeconds,
        secure,
      ),
    };
  }

  serializeClearedCookies(): SessionCookies {
    const secure = this.environment.nodeEnv === 'production';
    return {
      access: serializeSessionCookie(ACCESS_COOKIE_NAME, '', 0, secure),
      refresh: serializeSessionCookie(REFRESH_COOKIE_NAME, '', 0, secure),
    };
  }

  private async createSession(principal: AuthenticatedPrincipal): Promise<AuthSession> {
    const accessToken = createToken();
    const refreshToken = createToken();
    const accessTokenHash = await argon2.hash(accessToken, ARGON2_OPTIONS);
    const refreshTokenHash = await argon2.hash(refreshToken, ARGON2_OPTIONS);
    const now = new Date();
    const accessExpiresAt = new Date(now.getTime() + this.environment.auth.accessTtlSeconds * 1000);
    const refreshExpiresAt = new Date(
      now.getTime() + this.environment.auth.refreshTtlSeconds * 1000,
    );
    const [session] = await this.db
      .insert(identitySessions)
      .values({
        userId: principal.id,
        accessTokenHash,
        refreshTokenHash,
        accessExpiresAt,
        refreshExpiresAt,
      })
      .returning({ id: identitySessions.id });
    if (!session) throw new Error('IDENTITY_SESSION_CREATE_FAILED');

    return {
      cookies: this.serializeCookies(session.id, accessToken, refreshToken),
      principal,
    };
  }
}
