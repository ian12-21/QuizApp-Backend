import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { QuizService } from './services/quizService';

// Initialize environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize quiz service
const quizService = new QuizService();

// API endpoints
app.post('/api/quiz/create', async (req, res) => {
    try {
        const { creatorAddress, questions } = req.body;
        const result = await quizService.createQuiz(
            creatorAddress,
            questions,
        );
        res.json(result);
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
});

app.get('/api/quiz/:pin', async (req, res) => {
    try {
        const result = await quizService.getQuizByPin(req.params.pin);
        res.json(result);
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(404).json({ error: 'An unknown error occurred' });
        }
    }
});

app.post('/api/quiz/start', async (req, res) => {
    try {
        const { quizAddress, creatorAddress, pin, playerAddresses } = req.body;
        const result = await quizService.startQuiz(quizAddress, creatorAddress, pin, playerAddresses);
        res.json(result);
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
});

app.post('/api/quiz/end', async (req, res) => {
    try {
        const { quizAddress, creatorAddress, pin, playerScores } = req.body;
        const result = await quizService.endQuiz(
            quizAddress,
            creatorAddress,
            pin,
            playerScores
        );
        res.json(result);
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});