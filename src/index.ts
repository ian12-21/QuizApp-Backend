import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { QuizService } from './services/quizService';

// Initialize environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize quiz service
const quizService = new QuizService();

// API endpoints
app.post('/api/quiz/create', async (req, res) => {
    try {
        const { pin, quizAddress, answersString, playerAddresses } = req.body;
        const result = await quizService.createQuiz(
            pin,
            quizAddress,
            answersString,
            playerAddresses
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

app.get('/api/quiz/address/:address', async (req, res) => {
    try {
        console.log('Getting quiz for address:', req.params.address);
        const result = await quizService.getQuizByAddress(req.params.address);
        console.log('Quiz found:', result);
        res.json(result);
    } catch (error: unknown) {
        console.error('Error getting quiz by address:', error);
        if (error instanceof Error) {
            res.status(500).json({ 
                error: error.message,
                details: 'Failed to retrieve quiz'
            });
        } else {
            res.status(500).json({ 
                error: 'An unknown error occurred',
                details: 'Failed to retrieve quiz'
            });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});