// Replays every puzzle and checks that the solution is legal and ends in checkmate.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const file = process.argv[2] || new URL('../../client/src/data/puzzles.json', import.meta.url);
const puzzles = JSON.parse(readFileSync(file, 'utf8'));
let bad = 0;
for (const p of puzzles) {
  const c = new Chess(p.fen);
  try {
    for (const u of p.moves) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    if (!c.isCheckmate() || p.moves.length !== p.mate * 2 - 1) throw new Error('pas de mat');
  } catch (e) {
    bad++;
    console.log('INVALIDE', p.id, e.message);
  }
}
console.log(`${puzzles.length} puzzles, ${bad} invalides`);
process.exit(bad ? 1 : 0);
