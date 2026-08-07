import { Injectable, Module, OnModuleDestroy } from '@nestjs/common';

import { createDatabaseFromUrl } from './db';

export const DB = Symbol('DB');

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly database = createDatabaseFromUrl();

  readonly db = this.database.db;
  readonly client = this.database.client;

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
