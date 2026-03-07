import { Express } from 'express';
import http from 'http';
import { mongooseLoader } from './mongoose';
import { expressLoader } from './express';
import { socketioLoader } from './socketio';

export const init = async ({ app, server }: { app: Express; server: http.Server }): Promise<void> => {
  await mongooseLoader();
  expressLoader(app);
  socketioLoader(server);
};
