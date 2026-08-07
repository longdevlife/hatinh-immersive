import type { FastifyRequest } from 'fastify';

export const IDENTITY_ROLES = ['ADMIN', 'EDITOR', 'REVIEWER', 'VIEWER'] as const;
export type IdentityRole = (typeof IDENTITY_ROLES)[number];

export interface AuthenticatedPrincipal {
  id: string;
  email: string;
  role: IdentityRole;
}

export type AuthenticatedRequest = FastifyRequest & {
  user?: AuthenticatedPrincipal;
  traceId?: string;
};
