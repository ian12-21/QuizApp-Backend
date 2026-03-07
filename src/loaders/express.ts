import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import config from '../config';
import { createQuizRouter } from '../api/quizRoutes';
import { errorHandler } from '../middlewares/errorHandler';
import { QuizService } from '../services/quizService';
import Quiz from '../models/Quiz';
import UserAnswers from '../models/UserAnswers';
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

  // Wire up dependencies
  const quizService = new QuizService(Quiz, UserAnswers, getQuizContractInterface);
  const quizRouter = createQuizRouter(quizService);
  app.use('/api', quizRouter);

  // Error handler must be last
  app.use(errorHandler);
};
