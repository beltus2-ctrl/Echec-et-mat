import { Chess } from 'chess.js';

// Thin wrapper around the Stockfish WASM worker (UCI over postMessage).
class Engine {
  constructor() {
    this.worker = null;
    this.ready = null;
    this.current = null;
    this.queue = null;
  }

  init() {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(`${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`);
      } catch (e) {
        reject(e);
        return;
      }
      let resolved = false;
      this.worker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : '';
        if (!resolved && line === 'readyok') {
          resolved = true;
          resolve();
          return;
        }
        this.onLine(line);
      };
      this.worker.onerror = (e) => {
        if (!resolved) reject(e);
      };
      this.worker.postMessage('uci');
      this.worker.postMessage('isready');
    });
    return this.ready;
  }

  onLine(line) {
    const job = this.current;
    if (!job) return;
    if (line.startsWith('info') && line.includes(' pv ')) {
      const mate = line.match(/score mate (-?\d+)/);
      const cp = line.match(/score cp (-?\d+)/);
      job.info = {
        mate: mate ? Number(mate[1]) : null,
        cp: cp ? Number(cp[1]) : null,
        pv: line.split(' pv ')[1].trim().split(' '),
      };
    } else if (line.startsWith('bestmove')) {
      this.current = null;
      if (!job.cancelled) job.resolve({ bestmove: line.split(' ')[1], info: job.info });
      else job.resolve(null);
      if (this.queue) {
        const next = this.queue;
        this.queue = null;
        this.start(next);
      }
    }
  }

  start(job) {
    this.current = job;
    for (const cmd of job.setup) this.worker.postMessage(cmd);
    this.worker.postMessage(`position fen ${job.fen}`);
    this.worker.postMessage(`go ${job.go}`);
  }

  async run(fen, go, setup = []) {
    await this.init();
    return new Promise((resolve) => {
      const job = { fen, go, setup, resolve, info: null, cancelled: false };
      if (this.current) {
        if (this.queue) this.queue.resolve(null);
        this.queue = job;
        this.current.cancelled = true;
        this.worker.postMessage('stop');
      } else {
        this.start(job);
      }
    });
  }

  stop() {
    if (this.queue) {
      this.queue.resolve(null);
      this.queue = null;
    }
    if (this.current) {
      this.current.cancelled = true;
      this.worker?.postMessage('stop');
    }
  }
}

export const engine = new Engine();

export const BOTS = [
  { level: 1, name: 'Léo', title: 'Débutant', elo: 400, piece: 'wp', hue: 150, skill: 0, depth: 1, randomness: 0.5 },
  { level: 2, name: 'Camille', title: 'Novice', elo: 700, piece: 'wn', hue: 190, skill: 1, depth: 2, randomness: 0.28 },
  { level: 3, name: 'Hugo', title: 'Amateur', elo: 1000, piece: 'wb', hue: 215, skill: 3, depth: 4, randomness: 0.14 },
  { level: 4, name: 'Inès', title: 'Joueuse de club', elo: 1300, piece: 'wr', hue: 260, skill: 6, depth: 6, randomness: 0.05 },
  { level: 5, name: 'Victor', title: 'Confirmé', elo: 1600, piece: 'wq', hue: 290, skill: 9, depth: 8, randomness: 0 },
  { level: 6, name: 'Sofia', title: 'Experte', elo: 1900, piece: 'wk', hue: 330, skill: 13, depth: 11, randomness: 0 },
  { level: 7, name: 'Alexandre', title: 'Maître', elo: 2200, piece: 'bq', hue: 20, skill: 17, depth: 14, randomness: 0 },
  { level: 8, name: 'Stockfish', title: 'Grand Maître', elo: 2800, piece: 'bk', hue: 42, skill: 20, depth: 18, randomness: 0, movetime: 1500 },
];

function randomMove(fen) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;
  // Beginners grab material when they see it.
  const captures = moves.filter((m) => m.captured);
  const pool = captures.length && Math.random() < 0.5 ? captures : moves;
  const m = pool[Math.floor(Math.random() * pool.length)];
  return m.from + m.to + (m.promotion || '');
}

export async function botMove(fen, bot) {
  if (bot.randomness && Math.random() < bot.randomness) {
    return randomMove(fen);
  }
  const go = bot.movetime ? `movetime ${bot.movetime}` : `depth ${bot.depth}`;
  const res = await engine.run(fen, go, [`setoption name Skill Level value ${bot.skill}`]);
  if (!res) return null;
  return res.bestmove && res.bestmove !== '(none)' ? res.bestmove : randomMove(fen);
}

export async function hintMove(fen) {
  const res = await engine.run(fen, 'depth 14', ['setoption name Skill Level value 20']);
  if (!res || !res.bestmove || res.bestmove === '(none)') return null;
  return res;
}

export function uciToMove(uci) {
  if (!uci) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}
