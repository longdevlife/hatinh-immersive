import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { ProblemDetailsFilter } from '../core/http/problem-details/problem-details.filter';
import { TraceIdMiddleware } from '../core/observability/trace-id.middleware';
import { HealthModule } from '../core/health/health.module';
import { DatabaseModule } from '../core/database/database.module';
import { CatalogModule } from '../modules/catalog/catalog.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
      },
    }),
    DatabaseModule,
    CatalogModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}
