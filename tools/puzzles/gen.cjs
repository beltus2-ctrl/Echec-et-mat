// Generates mate-in-N puzzles from engine self-play games.
const { Chess } = require('chess.js');
const fs = require('fs');

const workerId = Number(process.env.WID || 0);
const target = Number(process.env.TARGET || 30);
const out = `puzzles-${workerId}.jsonl`;

function makeEngine() {
  let resolver = null;
  let lines = [];
  const sf = require('stockfish')('lite-single', (line) => {
    lines.push(line);
    if (resolver && (line.startsWith('bestmove') || line === 'readyok')) {
      const r = resolver;
      resolver = null;
      const l = lines;
      lines = [];
      r(l);
    }
  });
  const send = (cmd) => sf.processCommand(cmd);
  const wait = () => new Promise((res) => (resolver = res));
  return {
    async ready() {
      const p = wait();
      send('isready');
      await p;
    },
    async go(fen, opts) {
      lines = [];
      const p = wait();
      send(`position fen ${fen}`);
      send(`go ${opts}`);
      return p;
    },
    send,
  };
}

function parseInfo(lines) {
  const pvs = {};
  for (const l of lines) {
    if (!l.startsWith('info') || !l.includes(' pv ')) continue;
    const mp = Number((l.match(/multipv (\d+)/) || [0, 1])[1]);
    const mate = l.match(/score mate (-?\d+)/);
    const cp = l.match(/score cp (-?\d+)/);
    const pv = l.split(' pv ')[1].trim().split(' ');
    pvs[mp] = { mate: mate ? Number(mate[1]) : null, cp: cp ? Number(cp[1]) : null, pv };
  }
  return pvs;
}

let seed = Date.now() + workerId * 7919;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

async function main() {
  const eng = makeEngine();
  await new Promise((r) => setTimeout(r, 2000));
  eng.send('uci');
  await eng.ready();
  let found = 0;
  let games = 0;
  while (found < target) {
    games++;
    const g = new Chess();
    // random opening
    const openPlies = 4 + Math.floor(rnd() * 5);
    for (let i = 0; i < openPlies; i++) {
      const ms = g.moves();
      g.move(ms[Math.floor(rnd() * ms.length)]);
    }
    const skill = 2 + Math.floor(rnd() * 8);
    let tookFromGame = 0;
    let lastPly = -10;
    if (process.env.DBG) console.log("new game", games);
    while (!g.isGameOver() && g.history().length < 200) {
      const fen = g.fen();
      const ply = g.history().length + openPlies;
      if (ply > 14 && ply - lastPly > 6 && tookFromGame < 2) {
        eng.send('setoption name Skill Level value 20');
        const quick = parseInfo(await eng.go(fen, 'depth 8'))[1];
        if (quick && quick.mate && quick.mate > 0 && quick.mate <= 3) {
        eng.send('setoption name MultiPV value 2');
        const pvs = parseInfo(await eng.go(fen, 'depth 14'));
        eng.send('setoption name MultiPV value 1');
        const a = pvs[1];
        const b = pvs[2];
        if (a && a.mate && a.mate > 0 && a.mate <= 3 && a.pv.length >= a.mate * 2 - 1) {
          const n = a.mate;
          const secondOk = !b || b.mate === null || b.mate <= 0 || b.mate > n + 1;
          // filter: avoid puzzles where the first move simply captures a queen/rook hanging (still ok) - keep all
          if (secondOk) {
            // verify PV and uniqueness of intermediate user moves
            const t = new Chess(fen);
            let ok = true;
            const line = a.pv.slice(0, n * 2 - 1);
            for (let i = 0; i < line.length; i++) {
              const uci = line[i];
              if (i > 0 && i % 2 === 0 && i < line.length - 1) {
                const sub = parseInfo(await (async () => {
                  eng.send('setoption name MultiPV value 2');
                  const r = await eng.go(t.fen(), 'depth 14');
                  eng.send('setoption name MultiPV value 1');
                  return r;
                })());
                const remaining = n - i / 2;
                if (!sub[1] || sub[1].mate !== remaining || sub[1].pv[0] !== uci) ok = false;
                if (sub[2] && sub[2].mate !== null && sub[2].mate > 0 && sub[2].mate <= remaining) ok = false;
              }
              try {
                t.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
              } catch {
                ok = false;
                break;
              }
            }
            if (ok && t.isCheckmate()) {
              fs.appendFileSync(out, JSON.stringify({ fen, moves: line, mate: n }) + '\n');
              found++;
              tookFromGame++;
              lastPly = ply;
              console.log(`w${workerId} game ${games} found ${found} mate${n}`);
            }
          }
        }
        }
      }
      if (process.env.DBG) console.log("ply", ply, fen);
      eng.send(`setoption name Skill Level value ${skill}`);
      const res = parseInfo(await eng.go(fen, 'depth 8'));
      const best = res[1]?.pv?.[0];
      if (!best) break;
      g.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] });
    }
  }
  process.exit(0);
}
main();
