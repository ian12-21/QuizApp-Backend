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

// Socket.IO connection handler (add this to your index.ts)
io.on('connection', (socket: Socket) => {
    const address = socket.handshake.query.address as string;
    // console.log('New user connected', socket.id, 'Address:', address);

    // Quiz creation - create a room 
    socket.on("quiz:create", ({pin, creatorAddress}) => {
        const room = `quiz:${pin}`;
        socket.join(room);
        
        // Initialize room players if not exists
        if (!quizRooms[room]) {
            quizRooms[room] = new Set();
        }

        // Add creator to the room
        quizRooms[room].add(creatorAddress);

        // console.log(`Quiz room created for pin: ${pin} by ${creatorAddress}`);
        // console.log(`Current players in room: ${Array.from(quizRooms[room])}`);
        
        // Emit updated player list to all room members
        io.to(room).emit("quiz:players", Array.from(quizRooms[room]));
        
        // Emit confirmation event to creator 
        socket.emit("quiz:created", {pin, creatorAddress});
    });

    // Join quiz queue
    socket.on("quiz:join", async ({pin, playerAddress}) => {
        const room = `quiz:${pin}`;
        
        // Check if quiz room exists
        if (!quizRooms[room]) {
            // console.log(`Quiz room ${room} doesn't exist. Creating it.`);
            quizRooms[room] = new Set();
        }
        
        // Check if player is already in the room
        if (quizRooms[room].has(playerAddress)) {
            // console.log(`Player ${playerAddress} is already in room ${room}.`);
        }else{
            quizRooms[room].add(playerAddress);
            socket.join(room);
        }
        
        // console.log(`User ${playerAddress} joined quiz: ${pin}`);
        // console.log(`Current players in room: ${Array.from(quizRooms[room])}`);
        
        // Broadcast updated player list to all room members
        io.to(room).emit("quiz:players", Array.from(quizRooms[room]));
        
        // Confirm join to the player
        socket.emit("quiz:joined", {pin, playerAddress});
    });

    // Start quiz event - redirect all players to live quiz component
    socket.on("quiz:start", ({pin}) => {
        const room = `quiz:${pin}`;
        // console.log(`Starting quiz for pin: ${pin}`);
        // console.log(`Players in room ${room}:`, Array.from(quizRooms[room] || []));
        
        // Emit to all players in the room
        io.to(room).emit("quiz:started", {
            redirectUrl: `/active-quiz/${pin}`
        });
        // console.log(`Quiz started event sent to room: ${room}`);
    });
    
    // End quiz event - redirect all players to leaderboard
    socket.on("quiz:end", ({quizAddress, pin}) => {
        const room = `quiz:${pin}`;
        // console.log(`Ending quiz for pin: ${pin}`);
        
        io.to(room).emit("quiz:ended", {
            redirectUrl: `/leaderboard/${quizAddress}/${pin}`
        });
        // console.log(`Quiz ended for pin: ${pin}`);
        
        // Clean up the room
        if (quizRooms[room]) {
            delete quizRooms[room];
            // console.log(`Cleaned up room: ${room}`);
        }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        // console.log("User disconnected", address);

        // Remove player from all quiz rooms
        Object.keys(quizRooms).forEach(room => {
            const roomPlayers = quizRooms[room];
            if (roomPlayers.has(address)) {
                roomPlayers.delete(address);
                
                // console.log(`Removing player ${address} from room ${room}`);
                // console.log(`Remaining players: ${Array.from(roomPlayers)}`);
                
                // Broadcast updated player list
                io.to(room).emit("quiz:players", Array.from(roomPlayers));
                
                // If room is empty, clean it up
                if (roomPlayers.size === 0) {
                    delete quizRooms[room];
                    // console.log(`Cleaned up empty room: ${room}`);
                }
            }
        });
    });
});


// API endpoints
app.post('/api/quiz/create', async (req, res) => {
    try {
        const { pin, creatorAddress, quizAddress, quizName, answersString,
            playerAddresses, questions
         } = req.body;
        const result = await quizService.createQuiz(
            pin,
            creatorAddress,
            quizAddress,
            quizName,
            answersString,
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

//stores the answer for a question for each player
app.post('/api/quiz/:quizAddress/submit-answers', async (req, res) => {
    try {
        const { userAnswer } = req.body;
        if (!userAnswer) {
            return res.status(400).json({ error: 'User answer is required' });
        }
        
        const result = await quizService.submitAnswer(userAnswer);
        res.json(result);
    }catch (error: unknown) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }    
});

//function for submiting all users every answer to backend & contract
// app.get('/api/quiz/:quizAddress/submit-all-answers', async (req, res) => {
//     try {
//         const { quizAddress } = req.params;
//         const result = await quizService.submitAllAnswers(quizAddress);
//         res.json(result);
//     }catch (error: unknown) {
//         if (error instanceof Error) {
//             res.status(500).json({ error: error.message });
//         } else {
//             res.status(500).json({ error: 'An unknown error occurred' });
//         }
//     }    
// });

// End quiz and set winner
app.get('/api/quiz/:quizAddress/end', async (req, res) => {
    try {
        const { quizAddress } = req.params;
        const result = await quizService.getQuizWinner(quizAddress);
        res.json(result);
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(404).json({ error: 'An unknown error occurred' });
        }
    }
});


//function for preparing transaction data for frontend signing
app.get('/api/quiz/:quizAddress/prepare-submit-answers', async (req, res) => {
    try {
        const { quizAddress } = req.params;
        const result = await quizService.prepareSubmitAllAnswers(quizAddress);
        res.json(result);
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
});

// Get top 3 players (2nd and 3rd place, excluding winner)
app.get('/api/quiz/:quizAddress/top3players', async (req, res) => {
    try {
        const { quizAddress } = req.params;
        const result = await quizService.getTop3Players(quizAddress);
        res.json(result);
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred' });
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
