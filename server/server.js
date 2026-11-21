import express from 'express';
import { env } from './src/config/env.js';
import { configureApp } from './src/app.js';

const app = express();
configureApp(app);

if (!env.isVercel && env.nodeEnv !== 'test') {
  const srv = app.listen(env.port, () => {
    const addr = srv.address();
    if (addr) {
      console.log(`API server listening on http://localhost:${addr.port}`);
    }
  });

  srv.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[BIMS Server] Port ${env.port} is already in use. Stop the process occupying port ${env.port} or set a different PORT in server/.env.`
      );
      process.exit(1);
    }
    throw err;
  });
}

export default app;
