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
    players: { white: null, black: null },
    names: { white: null, black: null },
    spectators: new Set(),
    drawOfferedBy: null,
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

function assignSeat(room, socketId, name) {
  if (!room.players.white) {
    room.players.white = socketId;
    room.names.white = name;
    return 'white';
  }
  if (!room.players.black) {
    room.players.black = socketId;
    room.names.black = name;
    return 'black';
  }
  room.spectators.add(socketId);
  return 'spectator';
}

function seatOf(room, socketId) {
  if (room.players.white === socketId) return 'white';
  if (room.players.black === socketId) return 'black';
  if (room.spectators.has(socketId)) return 'spectator';
  return null;
}

function removePlayer(room, socketId) {
  let vacated = null;
  if (room.players.white === socketId) {
    room.players.white = null;
    room.names.white = null;
    vacated = 'white';
  } else if (room.players.black === socketId) {
    room.players.black = null;
    room.names.black = null;
    vacated = 'black';
  } else {
    room.spectators.delete(socketId);
  }
  return vacated;
}

function gameStatus(chess) {
  if (chess.isCheckmate()) return 'checkmate';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isThreefoldRepetition()) return 'repetition';
  if (chess.isInsufficientMaterial()) return 'insufficient_material';
  if (chess.isDraw()) return 'draw';
  if (chess.isCheck()) return 'check';
  return 'in_progress';
}

function publicState(room) {
  return {
    roomId: room.id,
    fen: room.chess.fen(),
    turn: room.chess.turn() === 'w' ? 'white' : 'black',
    history: room.chess.history({ verbose: true }),
    status: gameStatus(room.chess),
    names: room.names,
    hasWhite: !!room.players.white,
    hasBlack: !!room.players.black,
    spectatorCount: room.spectators.size,
    drawOfferedBy: room.drawOfferedBy,
  };
}

export {
  rooms,
  createRoom,
  getRoom,
  deleteRoom,
  assignSeat,
  seatOf,
  removePlayer,
  gameStatus,
  publicState,
};
