import { Router } from 'express';
import { z } from 'zod';
import { QuizService } from '../services/quizService';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';

const createQuizSchema = z.object({
  pin: z.string().min(1),
  creatorAddress: z.string().min(1),
  quizAddress: z.string().min(1),
  quizName: z.string().min(1),
  answersString: z.string().min(1),
  playerAddresses: z.array(z.string()),
  questions: z.array(z.object({
    question: z.string().min(1),
    answers: z.array(z.string()),
    correctAnswer: z.number(),
  })),
});

const addPlayersSchema = z.object({
  playerAddresses: z.array(z.string().min(1)).min(1),
});

const submitAnswerSchema = z.object({
  userAnswer: z.object({
    quizAddress: z.string().min(1),
    userAddress: z.string().min(1),
    questionIndex: z.number().int().min(0),
    answer: z.union([z.number(), z.string()]),
    answerTimeMs: z.number().min(0),
  }),
});

const searchQuerySchema = z.object({
  q: z.string().min(1),
});

export function createQuizRouter(quizService: QuizService): Router {
  const router = Router();

  router.post('/quiz/create', validate(createQuizSchema), asyncHandler(async (req, res) => {
    const result = await quizService.createQuiz(req.body);
    res.json(result);
  }));

  router.get('/quiz/search/results', validate(searchQuerySchema, 'query'), asyncHandler(async (req, res) => {
    const results = await quizService.searchQuizzes(req.query.q as string);
    res.json(results);
  }));

  router.get('/quiz/:pin', asyncHandler(async (req, res) => {
    const result = await quizService.getQuizByPin(req.params.pin);
    res.json(result);
  }));

  router.post('/quiz/:pin/add-players', validate(addPlayersSchema), asyncHandler(async (req, res) => {
    const result = await quizService.addPlayers(req.params.pin, req.body.playerAddresses);
    res.json(result);
  }));

  router.post('/quiz/:quizAddress/submit-answers', validate(submitAnswerSchema), asyncHandler(async (req, res) => {
    const result = await quizService.submitAnswer(req.body.userAnswer);
    res.json(result);
  }));

  router.get('/quiz/:quizAddress/end', asyncHandler(async (req, res) => {
    const result = await quizService.getQuizWinner(req.params.quizAddress);
    res.json(result);
  }));

  router.get('/quiz/:quizAddress/prepare-submit-answers', asyncHandler(async (req, res) => {
    const result = await quizService.prepareSubmitAllAnswers(req.params.quizAddress);
    res.json(result);
  }));

  router.get('/quiz/:quizAddress/top3players', asyncHandler(async (req, res) => {
    const result = await quizService.getTop3Players(req.params.quizAddress);
    res.json(result);
  }));

  return router;
}
