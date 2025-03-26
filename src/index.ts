import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { QuizService } from './services/quizService';
import { connectToDatabase } from './config/database';
import console from 'console';

// Initialize environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:4200', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
    }
})

// Middleware
app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize quiz service
const quizService = new QuizService();

// Socket.IO
io.on('connection', (socket: Socket) => {
    console.log('New user connected', socket.id, socket.handshake.query.address);

    //quiz creation - create a room 
    socket.on("quiz:create", ({pin, creatorAddress}) => {
        socket.join(`quiz:${pin}`);
        console.log(`Quiz room created for pin: ${pin} by ${creatorAddress}`);
        //emit confirmation event to client 
        socket.emit("quiz:created", {pin, creatorAddress});
    });

    //join quiz queue
    socket.on("quiz:join", async ({pin, playerAddress}) => {
        //verify room exists before joining
        const room = `quiz:${pin}`;
        const roomSockets = await io.in(room).fetchSockets();
        //join the room
        socket.join(room);
        console.log(`User ${playerAddress} joined quiz: ${pin}`);
        //broadcast to all users in the room that a new player joined
        io.to(room).emit("quiz:player:joined", {
            playerAddress,
            players: roomSockets.map(s => s.handshake.query.address)
        });
    });

    //start quiz event - redirect all players to live quiz comp
    socket.on("quiz:start", ({pin}) => {
        io.to(`quiz:${pin}`).emit("quiz:started", {
            redirectUrl: `/active-quiz/${pin}`
        });
        console.log(`Quiz started for pin: ${pin}`);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

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

const PORT = 3000;

// Connect to MongoDB and start the server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectToDatabase();
        
        // Start the Express server
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();