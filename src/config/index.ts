import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    uri: process.env.MONGODB_URI || '',
    name: 'quiz',
  },
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  cors: {
    origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:4200,http://localhost:3000').split(','),
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },
};

export default config;
