import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';

import { AccessSessionGuard } from '../../identity.guards';
import {
  IdentityService,
  InvalidCredentialsError,
  InvalidSessionError,
} from '../../identity.service';
import type { AuthenticatedRequest } from '../../identity.types';

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const authResponseSchema = {
  type: 'object',
  required: ['user'],
  properties: {
    user: {
      type: 'object',
      required: ['id', 'email', 'role'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        role: { type: 'string', enum: ['ADMIN', 'EDITOR', 'REVIEWER', 'VIEWER'] },
      },
    },
  },
};

function parseLoginBody(body: unknown): { email: string; password: string } {
  const parsed = loginBodySchema.safeParse(body);
  if (parsed.success) return parsed.data;
  throw new UnprocessableEntityException({
    message: 'The request contains invalid fields.',
    errors: parsed.error.flatten().fieldErrors,
  });
}

function setSessionCookies(
  reply: FastifyReply,
  cookies: { access: string; refresh: string },
): void {
  reply.header('Set-Cookie', [cookies.access, cookies.refresh]);
}

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'adminLogin' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
    },
  })
  @ApiOkResponse({ schema: authResponseSchema })
  async login(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    try {
      const input = parseLoginBody(body);
      const session = await this.identityService.login(input.email, input.password);
      setSessionCookies(reply, session.cookies);
      return { user: session.principal };
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid email or password.');
      }
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'refreshAdminSession' })
  @ApiOkResponse({ schema: authResponseSchema })
  async refresh(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      const session = await this.identityService.refresh(request.headers.cookie);
      setSessionCookies(reply, session.cookies);
      return { user: session.principal };
    } catch (error) {
      if (error instanceof InvalidSessionError) {
        setSessionCookies(reply, this.identityService.serializeClearedCookies());
        throw new UnauthorizedException('The session is invalid or expired.');
      }
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'logoutAdminSession' })
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.identityService.logout(request.headers.cookie);
    setSessionCookies(reply, this.identityService.serializeClearedCookies());
  }

  @Get('me')
  @UseGuards(AccessSessionGuard)
  @ApiOperation({ operationId: 'getAdminSession' })
  @ApiOkResponse({ schema: authResponseSchema })
  me(@Req() request: AuthenticatedRequest) {
    if (!request.user) throw new UnauthorizedException('Authentication is required.');
    return { user: request.user };
  }
}
