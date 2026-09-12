import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  createRoom,
  getRoom,
  deleteRoom,
  assignSeat,
  seatOf,
  removePlayer,
  gameStatus,
  publicState,
} from './rooms.js';

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get('/health', (req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

// socket.id -> roomId, so we can find a player's room on disconnect
const socketRoom = new Map();

function broadcastState(roomId) {
  const room = getRoom(roomId);
  if (!room) return;
  io.to(roomId).emit('state', publicState(room));
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ name } = {}) => {
    const room = createRoom();
    const seat = assignSeat(room, socket.id, name || 'Joueur 1');
    socket.join(room.id);
    socketRoom.set(socket.id, room.id);
    socket.emit('joined', { roomId: room.id, seat, state: publicState(room) });
  });

  socket.on('joinRoom', ({ roomId, name } = {}) => {
    const room = getRoom((roomId || '').toUpperCase());
    if (!room) {
      socket.emit('errorMessage', { message: 'Salle introuvable.' });
      return;
    }
    const seat = assignSeat(room, socket.id, name || 'Joueur');
    socket.join(room.id);
    socketRoom.set(socket.id, room.id);
    socket.emit('joined', { roomId: room.id, seat, state: publicState(room) });
    socket.to(room.id).emit('opponentJoined', { seat, name: name || 'Joueur' });
    broadcastState(room.id);
  });

  socket.on('makeMove', ({ roomId, from, to, promotion } = {}) => {
    const room = getRoom(roomId);
    if (!room) return;

    const seat = seatOf(room, socket.id);
    if (seat !== 'white' && seat !== 'black') {
      socket.emit('errorMessage', { message: "Vous n'êtes pas joueur dans cette partie." });
      return;
    }

    const turnSeat = room.chess.turn() === 'w' ? 'white' : 'black';
    if (seat !== turnSeat) {
      socket.emit('errorMessage', { message: "Ce n'est pas votre tour." });
      return;
    }

    if (gameStatus(room.chess) === 'checkmate' || room.chess.isGameOver()) {
      socket.emit('errorMessage', { message: 'La partie est terminée.' });
      return;
    }

    let move;
    try {
      move = room.chess.move({ from, to, promotion: promotion || 'q' });
    } catch {
      move = null;
    }

    if (!move) {
      socket.emit('errorMessage', { message: 'Coup illégal.' });
      return;
    }

    room.drawOfferedBy = null;
    broadcastState(room.id);
  });

  socket.on('resign', ({ roomId } = {}) => {
    const room = getRoom(roomId);
    if (!room) return;
    const seat = seatOf(room, socket.id);
    if (seat !== 'white' && seat !== 'black') return;
    const winner = seat === 'white' ? 'black' : 'white';
    io.to(room.id).emit('gameEnded', { reason: 'resignation', winner });
  });

  socket.on('offerDraw', ({ roomId } = {}) => {
    const room = getRoom(roomId);
    if (!room) return;
    const seat = seatOf(room, socket.id);
    if (seat !== 'white' && seat !== 'black') return;
    room.drawOfferedBy = seat;
    broadcastState(room.id);
  });

  socket.on('respondDraw', ({ roomId, accept } = {}) => {
    const room = getRoom(roomId);
    if (!room) return;
    if (!room.drawOfferedBy) return;
    if (accept) {
      io.to(room.id).emit('gameEnded', { reason: 'draw_agreement', winner: null });
    }
    room.drawOfferedBy = null;
    broadcastState(room.id);
  });

  socket.on('rematch', ({ roomId } = {}) => {
    const room = getRoom(roomId);
    if (!room) return;
    room.chess.reset();
    room.drawOfferedBy = null;
    broadcastState(room.id);
  });

  socket.on('leaveRoom', ({ roomId } = {}) => {
    const room = getRoom(roomId);
    if (!room) return;
    const vacated = removePlayer(room, socket.id);
    socket.leave(roomId);
    socketRoom.delete(socket.id);
    if (vacated) io.to(room.id).emit('opponentLeft', { seat: vacated });
    if (!room.players.white && !room.players.black && room.spectators.size === 0) {
      deleteRoom(room.id);
    } else {
      broadcastState(room.id);
    }
  });

  socket.on('disconnect', () => {
    const roomId = socketRoom.get(socket.id);
    socketRoom.delete(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    const vacated = removePlayer(room, socket.id);
    if (vacated) io.to(room.id).emit('opponentLeft', { seat: vacated });
    if (!room.players.white && !room.players.black && room.spectators.size === 0) {
      deleteRoom(room.id);
    } else {
      broadcastState(room.id);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Serveur d'échecs en écoute sur le port ${PORT}`);
});
