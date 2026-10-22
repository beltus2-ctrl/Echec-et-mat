import { Chess } from 'chess.js';
import { customAlphabet } from 'nanoid';

const generateRoomId = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

// roomId -> room state
const rooms = new Map();

function createRoom() {
  let roomId = generateRoomId();
  while (rooms.has(roomId)) roomId = generateRoomId();

  const room = {
    id: roomId,
    chess: new Chess(),
    // a seat survives a short disconnection thanks to the player's stable id
    seats: { w: null, b: null }, // { playerId, socketId, name }
    spectators: new Set(),
    drawOfferedBy: null,
    rematchBy: null,
    result: null,
    touchedAt: Date.now(),
  };
  rooms.set(roomId, room);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function deleteRoom(roomId) {
  rooms.delete(roomId);
}

function seatOfPlayer(room, playerId) {
  if (room.seats.w?.playerId === playerId) return 'w';
  if (room.seats.b?.playerId === playerId) return 'b';
  return null;
}

function seatOf(room, socketId) {
  if (room.seats.w?.socketId === socketId) return 'w';
  if (room.seats.b?.socketId === socketId) return 'b';
  if (room.spectators.has(socketId)) return 'spectator';
  return null;
}

function assignSeat(room, { socketId, playerId, name, prefer }) {
  room.touchedAt = Date.now();
  const existing = playerId ? seatOfPlayer(room, playerId) : null;
  if (existing) {
    room.seats[existing].socketId = socketId;
    if (name) room.seats[existing].name = name;
    return existing;
  }
  const order = prefer === 'b' ? ['b', 'w'] : ['w', 'b'];
  for (const c of order) {
    if (!room.seats[c]) {
      room.seats[c] = { playerId, socketId, name };
      return c;
    }
  }
  room.spectators.add(socketId);
  return 'spectator';
}

// Marks the player as disconnected but keeps the seat so they can come back.
function disconnect(room, socketId) {
  for (const c of ['w', 'b']) {
    if (room.seats[c]?.socketId === socketId) {
      room.seats[c].socketId = null;
      return c;
    }
  }
  room.spectators.delete(socketId);
  return null;
}

function leave(room, socketId) {
  for (const c of ['w', 'b']) {
    if (room.seats[c]?.socketId === socketId) {
      room.seats[c] = null;
      return c;
    }
  }
  room.spectators.delete(socketId);
  return null;
}

function isEmpty(room) {
  return !room.seats.w?.socketId && !room.seats.b?.socketId && room.spectators.size === 0;
}

function gameStatus(chess) {
  if (chess.isCheckmate()) return 'checkmate';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isThreefoldRepetition()) return 'repetition';
  if (chess.isInsufficientMaterial()) return 'insufficient';
  if (chess.isDrawByFiftyMoves()) return 'fifty';
  if (chess.isCheck()) return 'check';
  return 'in_progress';
}

function resultFromBoard(chess) {
  const status = gameStatus(chess);
  if (status === 'checkmate') return { winner: chess.turn() === 'w' ? 'b' : 'w', reason: 'checkmate' };
  if (['stalemate', 'repetition', 'insufficient', 'fifty'].includes(status)) return { winner: null, reason: status };
  return null;
}

function swapSeats(room) {
  const { w, b } = room.seats;
  room.seats = { w: b, b: w };
}

function publicState(room) {
  const seat = (c) => room.seats[c];
  return {
    roomId: room.id,
    fen: room.chess.fen(),
    turn: room.chess.turn(),
    history: room.chess.history({ verbose: true }).map((m) => ({ from: m.from, to: m.to, san: m.san, color: m.color })),
    status: gameStatus(room.chess),
    names: { w: seat('w')?.name || null, b: seat('b')?.name || null },
    players: {
      w: seat('w') ? { id: seat('w').playerId, connected: !!seat('w').socketId } : null,
      b: seat('b') ? { id: seat('b').playerId, connected: !!seat('b').socketId } : null,
    },
    spectatorCount: room.spectators.size,
    drawOfferedBy: room.drawOfferedBy,
    rematchBy: room.rematchBy,
    result: room.result,
  };
}

// Drop rooms nobody touched for a few hours.
function sweep(maxIdleMs = 4 * 60 * 60 * 1000) {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.touchedAt > maxIdleMs) rooms.delete(id);
  }
}

export {
  rooms,
  createRoom,
  getRoom,
  deleteRoom,
  assignSeat,
  seatOf,
  seatOfPlayer,
  disconnect,
  leave,
  isEmpty,
  gameStatus,
  resultFromBoard,
  swapSeats,
  publicState,
  sweep,
};
