import { Injectable, Module, OnModuleDestroy } from '@nestjs/common';

import { loadEnvironment } from '../config/environment';
import { createDatabaseFromUrl } from './db';

export const DB = Symbol('DB');

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly environment = loadEnvironment();
  private readonly database = createDatabaseFromUrl(undefined, this.environment);

  readonly db = this.database.db;
  readonly client = this.database.client;

  createDedicatedClient() {
    return createDatabaseFromUrl(undefined, {
      ...this.environment,
      database: { ...this.environment.database, maxConnections: 1 },
    }).client;
  }

  async onModuleDestroy() {
    await this.client.end({ timeout: 5 });
  }
}

@Module({
  providers: [
    DatabaseService,
    {
      provide: DB,
      inject: [DatabaseService],
      useFactory: (database: DatabaseService) => database.db,
    },
  ],
  exports: [DatabaseService, DB],
})
export class DatabaseModule {}
