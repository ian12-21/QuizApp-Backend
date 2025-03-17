import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { QuizService } from './services/quizService';
import { connectToDatabase } from './config/database';

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
        const { pin, creatorAddress, quizAddress, quizName, answersHash,
            playerAddresses, questions
         } = req.body;
        const result = await quizService.createQuiz(
            pin,
            creatorAddress,
            quizAddress,
            quizName,
            answersHash,
            playerAddresses,
            questions
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

// End quiz and set winner
app.post('/api/quiz/:pin/end', async (req, res) => {
    try {
        const { winnerAddress } = req.body;
        if (!winnerAddress) {
            return res.status(400).json({ error: 'Winner address is required' });
        }
        
        const result = await quizService.endQuiz(req.params.pin, winnerAddress);
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

// Connect to MongoDB and start the server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectToDatabase();
        
        // Start the Express server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();