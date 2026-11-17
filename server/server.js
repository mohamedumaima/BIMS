import express from 'express';
import { env } from './src/config/env.js';
import { configureApp } from './src/app.js';

const app = express();
configureApp(app);

if (!env.isVercel && env.nodeEnv !== 'test') {
  app.listen(env.port, () => {
    console.log(`API server listening on http://localhost:${env.port}`);
  });
}

export default app;
