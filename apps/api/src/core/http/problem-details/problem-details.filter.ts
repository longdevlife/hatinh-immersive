import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { ServerResponse } from 'node:http';

import type { ApiProblem } from './problem-details.types';

interface TraceableRequest {
  headers: FastifyRequest['headers'];
  originalUrl?: string;
  url: string;
  traceId?: string;
}

interface NativeHttpResponse extends ServerResponse {
  setHeader(name: string, value: string): this;
}

type HttpResponse = FastifyReply | NativeHttpResponse;

function isFastifyReply(response: HttpResponse): response is FastifyReply {
  return 'header' in response && typeof response.header === 'function';
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<TraceableRequest>();
    const reply = context.getResponse<HttpResponse>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = exception instanceof HttpException ? exception.getResponse() : undefined;
    const traceId = request.traceId ?? randomUUID();
    const message = this.getMessage(response);
    const isValidation = status === HttpStatus.UNPROCESSABLE_ENTITY;

    const problem: ApiProblem = {
      type:
        status === HttpStatus.NOT_FOUND
          ? 'https://errors.example.vn/not-found'
          : isValidation
            ? 'https://errors.example.vn/validation'
            : 'https://errors.example.vn/internal-server-error',
      title:
        status === HttpStatus.NOT_FOUND
          ? 'Not Found'
          : isValidation
            ? 'Validation failed'
            : 'Internal Server Error',
      status,
      detail: message,
      instance: request.originalUrl ?? request.url,
      code:
        status === HttpStatus.NOT_FOUND
          ? 'NOT_FOUND'
          : isValidation
            ? 'VALIDATION_ERROR'
            : 'INTERNAL_SERVER_ERROR',
      traceId,
    };

    const errors = this.getErrors(response);
    if (errors) {
      problem.errors = errors;
    }

    if (isFastifyReply(reply)) {
      reply
        .header('x-trace-id', traceId)
        .type('application/problem+json')
        .status(status)
        .send(problem);
      return;
    }

    reply.setHeader('x-trace-id', traceId);
    reply.setHeader('content-type', 'application/problem+json');
    reply.statusCode = status;
    reply.end(JSON.stringify(problem));
  }

  private getMessage(response: unknown) {
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object' && 'message' in response) {
      const message = response.message;
      return Array.isArray(message) ? message.join('; ') : String(message);
    }

    return 'The request could not be completed.';
  }

  private getErrors(response: unknown): Record<string, string[]> | undefined {
    if (!response || typeof response !== 'object' || !('errors' in response)) {
      return undefined;
    }

    const errors = response.errors;
    if (!errors || typeof errors !== 'object') {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(errors).map(([field, messages]) => [
        field,
        Array.isArray(messages) ? messages.map(String) : [String(messages)],
      ]),
    );
  }
}
