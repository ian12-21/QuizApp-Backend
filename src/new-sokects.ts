// Socket.IO connection handler (add this to your index.ts)
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

        // Add creator to the room
        quizRooms[room].add(creatorAddress);

        console.log(`Quiz room created for pin: ${pin} by ${creatorAddress}`);
        console.log(`Current players in room: ${Array.from(quizRooms[room])}`);
        
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
            console.log(`Quiz room ${room} doesn't exist. Creating it.`);
            quizRooms[room] = new Set();
        }
        
        // Add player to room tracking
        quizRooms[room].add(playerAddress);
        socket.join(room);
        
        console.log(`User ${playerAddress} joined quiz: ${pin}`);
        console.log(`Current players in room: ${Array.from(quizRooms[room])}`);
        
        // Broadcast updated player list to all room members
        io.to(room).emit("quiz:players", Array.from(quizRooms[room]));
        
        // Confirm join to the player
        socket.emit("quiz:joined", {pin, playerAddress});
    });

    // Start quiz event - redirect all players to live quiz component
    socket.on("quiz:start", ({pin}) => {
        const room = `quiz:${pin}`;
        console.log(`Starting quiz for pin: ${pin}`);
        console.log(`Players in room ${room}:`, Array.from(quizRooms[room] || []));
        
        // Emit to all players in the room
        io.to(room).emit("quiz:started", {
            redirectUrl: `/active-quiz/${pin}`
        });
        console.log(`Quiz started event sent to room: ${room}`);
    });
    
    // End quiz event - redirect all players to leaderboard
    socket.on("quiz:end", ({quizAddress, pin}) => {
        const room = `quiz:${pin}`;
        console.log(`Ending quiz for pin: ${pin}`);
        
        io.to(room).emit("quiz:ended", {
            redirectUrl: `/leaderboard/${quizAddress}/${pin}`
        });
        console.log(`Quiz ended for pin: ${pin}`);
        
        // Clean up the room
        if (quizRooms[room]) {
            delete quizRooms[room];
            console.log(`Cleaned up room: ${room}`);
        }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected", address);

        // Remove player from all quiz rooms
        Object.keys(quizRooms).forEach(room => {
            const roomPlayers = quizRooms[room];
            if (roomPlayers.has(address)) {
                roomPlayers.delete(address);
                
                console.log(`Removing player ${address} from room ${room}`);
                console.log(`Remaining players: ${Array.from(roomPlayers)}`);
                
                // Broadcast updated player list
                io.to(room).emit("quiz:players", Array.from(roomPlayers));
                
                // If room is empty, clean it up
                if (roomPlayers.size === 0) {
                    delete quizRooms[room];
                    console.log(`Cleaned up empty room: ${room}`);
                }
            }
        });
    });
});
