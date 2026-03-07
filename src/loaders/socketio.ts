import { Server, Socket } from 'socket.io';
import http from 'http';
import config from '../config';

const quizRooms: { [key: string]: Set<string> } = {};

export const socketioLoader = (server: http.Server): Server => {
  const io = new Server(server, {
    cors: {
      origin: config.cors.origins,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    const address = socket.handshake.query.address as string;

    socket.on('quiz:create', ({ pin, creatorAddress }) => {
      const room = `quiz:${pin}`;
      socket.join(room);

      if (!quizRooms[room]) {
        quizRooms[room] = new Set();
      }

      quizRooms[room].add(creatorAddress);

      io.to(room).emit('quiz:players', Array.from(quizRooms[room]));
      socket.emit('quiz:created', { pin, creatorAddress });
    });

    socket.on('quiz:join', async ({ pin, playerAddress }) => {
      const room = `quiz:${pin}`;

      if (!quizRooms[room]) {
        quizRooms[room] = new Set();
      }

      if (!quizRooms[room].has(playerAddress)) {
        quizRooms[room].add(playerAddress);
        socket.join(room);
      }

      io.to(room).emit('quiz:players', Array.from(quizRooms[room]));
      socket.emit('quiz:joined', { pin, playerAddress });
    });

    socket.on('quiz:start', ({ pin }) => {
      const room = `quiz:${pin}`;
      io.to(room).emit('quiz:started', {
        redirectUrl: `/active-quiz/${pin}`,
      });
    });

    socket.on('quiz:end', ({ quizAddress, pin }) => {
      const room = `quiz:${pin}`;
      io.to(room).emit('quiz:ended', {
        redirectUrl: `/leaderboard/${quizAddress}/${pin}`,
      });

      if (quizRooms[room]) {
        delete quizRooms[room];
      }
    });

    socket.on('disconnect', () => {
      Object.keys(quizRooms).forEach((room) => {
        const roomPlayers = quizRooms[room];
        if (roomPlayers.has(address)) {
          roomPlayers.delete(address);

          io.to(room).emit('quiz:players', Array.from(roomPlayers));

          if (roomPlayers.size === 0) {
            delete quizRooms[room];
          }
        }
      });
    });
  });

  return io;
};
