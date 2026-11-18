import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { attachDatabasePool } from '@vercel/functions';
import { PrismaClient } from '../generated/prisma/index.js';
import { env, isPlaceholderDatabaseUrl } from './env.js';

let prismaInstance = null;
let poolInstance = null;
let activeConnectionString = '';

function isRemotePostgresUrl(connectionString) {
  return !/localhost|127\.0\.0\.1/i.test(connectionString || '');
}

/**
 * Strips sslmode query parameter for pg-connection-string when we pass an explicit
 * Node TLS config on pg.Pool so Supabase pooler certificates work cleanly without warnings.
 */
function normalizePoolConnectionUrl(connectionString) {
  try {
    const parsed = new URL(connectionString);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('uselibpqcompat');
    return parsed.toString();
  } catch {
    return connectionString;
  }
}

/**
 * Builds a pg.Pool configured for either local PostgreSQL 17 or remote Supabase Cloud PostgreSQL.
 */
export function createPgPool(connectionString, { max } = {}) {
  const isRemote = isRemotePostgresUrl(connectionString);
  return new pg.Pool({
    connectionString: normalizePoolConnectionUrl(connectionString),
    max: max ?? (env.isVercel ? 5 : 10),
    connectionTimeoutMillis: 8000,
    ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

/**
 * Lazily initializes and returns the singleton PrismaClient backed by pg.Pool
 * and attached to Vercel Fluid Compute's idle pool lifecycle.
 */
export function getPrisma() {
  if (prismaInstance && activeConnectionString === env.databaseUrl) {
    return prismaInstance;
  }

  if (isPlaceholderDatabaseUrl(env.databaseUrl)) {
    throw new Error('DATABASE_URL environment variable is not configured.');
  }

  poolInstance = createPgPool(env.databaseUrl);
  activeConnectionString = env.databaseUrl;

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

export async function disconnectDatabase() {
  if (prismaInstance) {
    await prismaInstance.$disconnect().catch(() => {});
    prismaInstance = null;
  }
  if (poolInstance) {
    await poolInstance.end().catch(() => {});
    poolInstance = null;
  }
  activeConnectionString = '';
}
