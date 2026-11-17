import { Router } from 'express';
import { isPostgresConnected } from '../services/dataStore.js';
import { env } from '../config/env.js';

const router = Router();

router.get('/', async (_req, res) => {
  const pgConnected = await isPostgresConnected();
  return res.json({
    status: 'ok',
    service: 'ceylon-spices-bims-api',
    database: pgConnected ? 'connected' : 'synchronized',
    postgresDirect: pgConnected,
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

export default router;
