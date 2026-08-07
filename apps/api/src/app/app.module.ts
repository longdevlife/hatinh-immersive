import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { ProblemDetailsFilter } from '../core/http/problem-details/problem-details.filter';
import { TraceIdMiddleware } from '../core/observability/trace-id.middleware';
import { HealthModule } from '../core/health/health.module';
import { DatabaseModule } from '../core/database/database.module';
import { CatalogModule } from '../modules/catalog/catalog.module';
import { VirtualTourModule } from '../modules/virtual-tour/virtual-tour.module';
import { MediaModule } from '../modules/media/media.module';
import { IdentityModule } from '../modules/identity/identity.module';
import { AuditModule } from '../modules/audit/audit.module';
import { AuditInterceptor } from '../modules/audit/audit.interceptor';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
      },
    }),
    DatabaseModule,
    CatalogModule,
    VirtualTourModule,
    MediaModule,
    IdentityModule,
    AuditModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}
