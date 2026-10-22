import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  rooms,
  createRoom,
  getRoom,
  deleteRoom,
  assignSeat,
  seatOf,
  disconnect,
  leave,
  isEmpty,
  resultFromBoard,
  swapSeats,
  publicState,
  sweep,
} from './rooms.js';

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get('/health', (req, res) => res.json({ ok: true, rooms: rooms.size }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  pingInterval: 20000,
  pingTimeout: 25000,
});

// socket.id -> roomId, so we can find a player's room on disconnect
const socketRoom = new Map();

function broadcastState(room) {
  room.touchedAt = Date.now();
  io.to(room.id).emit('state', publicState(room));
}

const cleanName = (n, fallback) => (typeof n === 'string' && n.trim() ? n.trim().slice(0, 20) : fallback);

function join(socket, room, { name, playerId, prefer }) {
  const seat = assignSeat(room, { socketId: socket.id, playerId, name: cleanName(name, 'Joueur'), prefer });
  socket.join(room.id);
  socketRoom.set(socket.id, room.id);
  socket.emit('joined', { roomId: room.id, seat, state: publicState(room) });
  return seat;
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ name, playerId, color } = {}) => {
    const room = createRoom();
    const prefer = color === 'b' ? 'b' : color === 'w' ? 'w' : Math.random() < 0.5 ? 'w' : 'b';
    join(socket, room, { name, playerId, prefer });
  });

  socket.on('joinRoom', ({ roomId, name, playerId } = {}) => {
    const room = getRoom(String(roomId || '').toUpperCase().trim());
    if (!room) {
      socket.emit('errorMessage', { code: 'not_found', message: 'Partie introuvable. Vérifiez le code.' });
      return;
    }
    const seat = join(socket, room, { name, playerId });
    socket.to(room.id).emit('opponentJoined', { seat });
    broadcastState(room);
  });

  socket.on('makeMove', ({ roomId, from, to, promotion } = {}) => {
    const room = getRoom(roomId);
    if (!room) return;
    const seat = seatOf(room, socket.id);
    if (seat !== 'w' && seat !== 'b') return;
    if (room.result) {
      socket.emit('errorMessage', { message: 'La partie est terminée.' });
      return;
    }
    if (room.chess.turn() !== seat) {
      socket.emit('errorMessage', { message: "Ce n'est pas votre tour." });
      broadcastState(room);
      return;
    }
    try {
      room.chess.move({ from, to, promotion: promotion || 'q' });
    } catch {
      socket.emit('errorMessage', { message: 'Coup illégal.' });
      broadcastState(room);
      return;
    }
    room.drawOfferedBy = null;
    room.result = resultFromBoard(room.chess);
    broadcastState(room);
  });

  socket.on('resign', ({ roomId } = {}) => {
    const room = getRoom(roomId);
    if (!room || room.result) return;
    const seat = seatOf(room, socket.id);
    if (seat !== 'w' && seat !== 'b') return;
    room.result = { winner: seat === 'w' ? 'b' : 'w', reason: 'resign' };
    broadcastState(room);
  });

  socket.on('offerDraw', ({ roomId } = {}) => {
    const room = getRoom(roomId);
    if (!room || room.result) return;
    const seat = seatOf(room, socket.id);
    if (seat !== 'w' && seat !== 'b') return;
    room.drawOfferedBy = seat;
    broadcastState(room);
  });

  socket.on('respondDraw', ({ roomId, accept } = {}) => {
    const room = getRoom(roomId);
    if (!room || !room.drawOfferedBy || room.result) return;
    const seat = seatOf(room, socket.id);
    if (seat !== 'w' && seat !== 'b') return;
    if (seat === room.drawOfferedBy) return;
    if (accept) room.result = { winner: null, reason: 'agreement' };
    room.drawOfferedBy = null;
    broadcastState(room);
  });

  socket.on('rematch', ({ roomId } = {}) => {
    const room = getRoom(roomId);
    if (!room || !room.result) return;
    const seat = seatOf(room, socket.id);
    if (seat !== 'w' && seat !== 'b') return;
    if (room.rematchBy && room.rematchBy !== seat) {
      // both players agreed: new game with colours swapped
      room.chess.reset();
      room.result = null;
      room.drawOfferedBy = null;
      room.rematchBy = null;
      swapSeats(room);
      for (const c of ['w', 'b']) {
        const sid = room.seats[c]?.socketId;
        if (sid) io.to(sid).emit('seat', { seat: c });
      }
    } else {
      room.rematchBy = seat;
    }
    broadcastState(room);
  });

  socket.on('leaveRoom', ({ roomId } = {}) => {
    const room = getRoom(roomId);
    if (!room) return;
    const seat = seatOf(room, socket.id);
    if ((seat === 'w' || seat === 'b') && !room.result && room.chess.history().length > 0) {
      room.result = { winner: seat === 'w' ? 'b' : 'w', reason: 'abandon' };
    }
    const vacated = leave(room, socket.id);
    socket.leave(roomId);
    socketRoom.delete(socket.id);
    if (vacated) io.to(room.id).emit('opponentLeft', { seat: vacated });
    if (isEmpty(room) && !room.seats.w && !room.seats.b) deleteRoom(room.id);
    else broadcastState(room);
  });

  socket.on('disconnect', () => {
    const roomId = socketRoom.get(socket.id);
    socketRoom.delete(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    disconnect(room, socket.id);
    broadcastState(room);
  });
});

setInterval(() => sweep(), 10 * 60 * 1000).unref();

httpServer.listen(PORT, () => {
  console.log(`Serveur d'échecs en écoute sur le port ${PORT}`);
});
