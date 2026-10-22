import data from '../data/puzzles.json';

const RATING = { 1: 900, 2: 1300, 3: 1700 };

export const PUZZLES = data.map((p) => ({ ...p, rating: RATING[p.mate] }));

export const CATEGORIES = [
  { mate: 1, title: 'Mat en 1', subtitle: 'Un seul coup pour conclure', piece: 'wq', hue: 150 },
  { mate: 2, title: 'Mat en 2', subtitle: 'Préparez le coup fatal', piece: 'wr', hue: 210 },
  { mate: 3, title: 'Mat en 3', subtitle: 'Pour les tacticiens aguerris', piece: 'bk', hue: 330 },
];

export function dailyPuzzle() {
  const day = Math.floor(Date.now() / 86400000);
  const pool = PUZZLES.filter((p) => p.mate >= 2);
  const list = pool.length ? pool : PUZZLES;
  return list[day % list.length];
}

export function nextPuzzle(currentId, solved) {
  const idx = PUZZLES.findIndex((p) => p.id === currentId);
  for (let k = 1; k <= PUZZLES.length; k++) {
    const p = PUZZLES[(idx + k) % PUZZLES.length];
    if (!solved[p.id]) return p;
  }
  return PUZZLES[(idx + 1) % PUZZLES.length];
}
