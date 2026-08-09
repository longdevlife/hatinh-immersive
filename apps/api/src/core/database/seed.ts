import { createDatabaseFromUrl, migrateDatabase } from './db';
import { seedDemoImmersiveRoute } from './demo-seed';

async function main() {
  const database = createDatabaseFromUrl();

  try {
    await migrateDatabase(database.db);
    await seedDemoImmersiveRoute(database.db);
    console.log('Seeded demo immersive route: son-trang-co-dam');
  } finally {
    await database.client.end({ timeout: 5 });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
