import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { attachDatabasePool } from '@vercel/functions';
import { PrismaClient } from '../generated/prisma/index.js';
import { env } from './env.js';

let prismaInstance = null;
let poolInstance = null;

/**
 * Lazily initializes and returns the singleton PrismaClient backed by pg.Pool
 * and attached to Vercel Fluid Compute's idle pool lifecycle.
 */
export function getPrisma() {
  if (prismaInstance) {
    return prismaInstance;
  }

  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not configured.');
  }

  poolInstance = new pg.Pool({
    connectionString: env.databaseUrl,
    max: env.isVercel ? 5 : 10,
  });

  if (env.isVercel) {
    attachDatabasePool(poolInstance);
  }

  const adapter = new PrismaPg(poolInstance);
  prismaInstance = new PrismaClient({ adapter });
  return prismaInstance;
}

export async function checkDatabaseHealth() {
  const prisma = getPrisma();
  await prisma.$queryRaw`SELECT 1`;
  return true;
}
