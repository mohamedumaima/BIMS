import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { createPgPool } from '../src/config/db.js';
import { isPlaceholderDatabaseUrl } from '../src/config/env.js';
import { seedPrismaDatabase } from '../src/services/seedService.js';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (isPlaceholderDatabaseUrl(connectionString)) {
  throw new Error(
    'Real DATABASE_URL or DIRECT_URL is required in server/.env before running prisma db seed.'
  );
}

const pool = createPgPool(connectionString);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await seedPrismaDatabase(prisma);
  console.log(
    'Seeded Ceylon Spices BIMS users, RBAC permissions, 7 spices, LKR suppliers, USD/LKR buyers, orders, and shipments.'
  );
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
