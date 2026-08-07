import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { ServerResponse } from 'node:http';

interface TraceableRequest extends FastifyRequest {
  traceId?: string;
}

interface NativeHttpResponse {
  setHeader(name: string, value: string): void;
}

type MiddlewareResponse = FastifyReply | (ServerResponse & NativeHttpResponse);

function isFastifyReply(response: MiddlewareResponse): response is FastifyReply {
  return 'header' in response && typeof response.header === 'function';
}

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(request: TraceableRequest, reply: MiddlewareResponse, next: () => void) {
    const incomingTraceId = request.headers['x-request-id'];
    const traceId = typeof incomingTraceId === 'string' ? incomingTraceId : randomUUID();

    request.traceId = traceId;
    if (isFastifyReply(reply)) {
      reply.header('x-trace-id', traceId);
    } else {
      reply.setHeader('x-trace-id', traceId);
    }
    next();
  }
}
