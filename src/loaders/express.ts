import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import config from '../config';
import { createQuizRouter } from '../api/quizRoutes';
import { createAuthRouter } from '../api/authRoutes';
import { errorHandler } from '../middlewares/errorHandler';
import { QuizService } from '../services/quizService';
import { AuthService } from '../services/authService';
import Quiz from '../models/Quiz';
import UserAnswers from '../models/UserAnswers';
import User from '../models/User';
import { getQuizContractInterface } from '../config/smartContract';

export const expressLoader = (app: Express): void => {
  app.use(helmet());

  app.use(cors({
    origin: config.cors.origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json());

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
  });
  app.use('/api/', limiter);

  // Stricter rate limit for auth endpoints to prevent brute force
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30, // 30 requests per 15 minutes for auth
    message: { error: 'Too many authentication attempts, please try again later.' },
  });
  app.use('/api/auth/', authLimiter);

  // Wire up dependencies — following dependency injection pattern
  const quizService = new QuizService(Quiz, UserAnswers, getQuizContractInterface);
  const quizRouter = createQuizRouter(quizService);

  const authService = new AuthService(User);
  const authRouter = createAuthRouter(authService);

  app.use('/api', quizRouter);
  app.use('/api', authRouter);

  // Error handler must be last
  app.use(errorHandler);
};