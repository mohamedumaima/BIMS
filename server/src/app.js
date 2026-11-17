import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import operationsRoutes from './routes/operations.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function configureApp(app) {
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        const err = new Error(`CORS blocked for origin: ${origin}`);
        err.statusCode = 403;
        return callback(err);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (env.nodeEnv !== 'test') {
    app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  app.get('/', (_req, res) => {
    res.json({
      name: 'Ceylon Spices BIMS — Business Management & Import Export API',
      status: 'running',
      health: '/api/health',
    });
  });

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api', operationsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export function createApp() {
  const app = express();
  return configureApp(app);
}
