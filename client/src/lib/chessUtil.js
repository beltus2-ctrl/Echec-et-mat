export const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const ORDER = ['q', 'r', 'b', 'n', 'p'];

export const pieceUrl = (color, type) => `${import.meta.env.BASE_URL}assets/pieces/${color}${type}.webp`;
export const boardUrl = (theme) => `${import.meta.env.BASE_URL}assets/boards/${theme}.webp`;

// Pieces missing from the board compared with the starting set.
export function capturedFromFen(fen) {
  const board = fen.split(' ')[0];
  const count = { w: {}, b: {} };
  for (const ch of board) {
    if (/[a-z]/i.test(ch)) {
      const color = ch === ch.toUpperCase() ? 'w' : 'b';
      const t = ch.toLowerCase();
      count[color][t] = (count[color][t] || 0) + 1;
    }
  }
  // captured[c] = pieces of colour c that were taken (i.e. collected by the opponent)
  const captured = { w: [], b: [] };
  let material = { w: 0, b: 0 };
  for (const c of ['w', 'b']) {
    for (const t of ORDER) {
      const missing = Math.max(0, START_COUNT[t] - (count[c][t] || 0));
      for (let i = 0; i < missing; i++) captured[c].push(t);
      material[c] += (count[c][t] || 0) * PIECE_VALUE[t];
    }
  }
  return { captured, diff: material.w - material.b };
}

export function gameOverInfo(chess) {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'b' : 'w';
    return { over: true, winner, reason: 'checkmate' };
  }
  if (chess.isStalemate()) return { over: true, winner: null, reason: 'stalemate' };
  if (chess.isInsufficientMaterial()) return { over: true, winner: null, reason: 'insufficient' };
  if (chess.isThreefoldRepetition()) return { over: true, winner: null, reason: 'repetition' };
  if (chess.isDrawByFiftyMoves()) return { over: true, winner: null, reason: 'fifty' };
  return { over: false };
}

export const REASONS = {
  checkmate: 'par échec et mat',
  resign: 'par abandon',
  timeout: 'au temps',
  stalemate: 'par pat',
  insufficient: 'par manque de matériel',
  repetition: 'par triple répétition',
  fifty: 'par la règle des 50 coups',
  agreement: "d'un commun accord",
  abandon: 'par forfait',
};

export function kingSquare(chess, color) {
  const b = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (p && p.type === 'k' && p.color === color) return p.square;
    }
  }
  return null;
}

export function formatClock(ms) {
  if (ms == null) return '';
  const total = Math.max(0, ms);
  const s = Math.floor(total / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (total < 10000) return `${sec}.${Math.floor((total % 1000) / 100)}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
