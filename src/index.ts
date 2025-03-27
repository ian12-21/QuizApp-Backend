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

const quizRooms: {[key: string]: Set<string>} = {};

// Socket.IO
io.on('connection', (socket: Socket) => {
    const address = socket.handshake.query.address as string;
    console.log('New user connected', socket.id, 'Address:', address);

    // Quiz creation - create a room 
    socket.on("quiz:create", ({pin, creatorAddress}) => {
        const room = `quiz:${pin}`;
        socket.join(room);
        
        // Initialize room players if not exists
        if (!quizRooms[room]) {
            quizRooms[room] = new Set();
        }

        console.log(`Quiz room created for pin: ${pin} by ${creatorAddress}`);
        console.log(`Current players in room: ${Array.from(quizRooms[room])}`);
        
        // Emit updated player list
        io.to(room).emit("quiz:players", Array.from(quizRooms[room]));
        
        // Emit confirmation event to client 
        socket.emit("quiz:created", {pin, creatorAddress});
    });

    // Join quiz queue
    socket.on("quiz:join", async ({pin, playerAddress}) => {
        const room = `quiz:${pin}`;
        
        // Ensure room exists in tracking
        if (!quizRooms[room]) {
            quizRooms[room] = new Set();
        }
        
        // Add player to room
        quizRooms[room].add(playerAddress);
        socket.join(room);
        
        console.log(`User ${playerAddress} joined quiz: ${pin}`);
        console.log(`Current players in room: ${Array.from(quizRooms[room])}`);
        
        // Broadcast updated player list to all room members
        io.to(room).emit("quiz:players", Array.from(quizRooms[room]));
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected", address);

        // Remove player from all quiz rooms
        Object.keys(quizRooms).forEach(room => {
            const roomPlayers = quizRooms[room];
            const playerToRemove = Array.from(roomPlayers).find(
                player => player === address
            );
            
            if (playerToRemove) {
                roomPlayers.delete(playerToRemove);
                
                console.log(`Removing player ${playerToRemove} from room ${room}`);
                console.log(`Remaining players: ${Array.from(roomPlayers)}`);
                
                // Broadcast updated player list
                io.to(room).emit("quiz:players", Array.from(roomPlayers));
            }
        });
    });

    // Start quiz event - redirect all players to live quiz component
    socket.on("quiz:start", ({pin}) => {
        io.to(`quiz:${pin}`).emit("quiz:started", {
            redirectUrl: `/active-quiz/${pin}`
        });
        console.log(`Quiz started for pin: ${pin}`);
    });
    
    // End quiz event - redirect all players to leaderboard
    socket.on("quiz:end", ({quizAddress, pin}) => {
        io.to(`quiz:${pin}`).emit("quiz:ended", {
            redirectUrl: `/leaderboard/${quizAddress}/${pin}`
        });
        console.log(`Quiz ended for pin: ${pin}`);
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

//add players to the quiz instance in the database
app.post('/api/quiz/:pin/add-players', async (req, res) => {
    try {
        const { playerAddresses } = req.body;
        if (!playerAddresses) {
            return res.status(400).json({ error: 'Player addresses are required' });
        }
        
        const result = await quizService.addPlayers(req.params.pin, playerAddresses);
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