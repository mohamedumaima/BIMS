import { Router } from 'express';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { getDatabaseStatus } from '../services/dataStore.js';

const router = Router();

router.get('/', async (_req, res) => {
  const dbState = await getDatabaseStatus();
  const cloudinaryReady = isCloudinaryConfigured();
  const supabaseStorageReady = Boolean(getSupabaseAdmin());

  return res.json({
    status: 'ok',
    service: 'ceylon-spices-bims-api',
    database:
      dbState.connected && dbState.schemaReady
        ? 'connected'
        : dbState.connected
        ? 'schema_pending'
        : 'synchronized',
    databaseProvider: dbState.provider,
    schemaReady: dbState.schemaReady,
    postgresDirect: dbState.connected && dbState.schemaReady,
    cloudinaryConfigured: cloudinaryReady,
    supabaseStorageConfigured: supabaseStorageReady,
    mediaStorageProvider: cloudinaryReady
      ? 'cloudinary'
      : supabaseStorageReady
      ? 'supabase-storage'
      : 'inline-fallback',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

export default router;
