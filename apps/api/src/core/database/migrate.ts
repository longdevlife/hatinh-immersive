import { migrateDatabase, createDatabaseFromUrl } from './db';

async function main() {
  const database = createDatabaseFromUrl();

  try {
    await migrateDatabase(database.db);
  } finally {
    await database.client.end({ timeout: 5 });
  }
}

void main().catch((error: unknown) => {
  console.error('Database migration failed', error);
  process.exitCode = 1;
});
