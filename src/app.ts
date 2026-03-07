import express from 'express';
import http from 'http';
import config from './config';
import { init } from './loaders';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  await init({ app, server });

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

startServer();
