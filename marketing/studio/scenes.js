import puzzles from '../../client/src/data/puzzles.json';
import {
  ASSETS,
  Board,
  background,
  text,
  popAnim,
  slideAnim,
  wordsReveal,
  confetti,
  countdown,
  phone,
  endCard,
  cue,
  el,
  setStyle,
  prog,
  easeOut,
  easeBack,
  easeInOut,
  lerp,
  win,
  pieceSrc,
} from './studio.js';

const shot = (name) => `../captures/${name}.png`;

function badge(root, html, y, cls = '') {
  return text(root, `<span class="badge ${cls}">${html}</span>`, '', { top: `${y}px` });
}

// ------------------------------------------------------------------
// Puzzle challenge: hook, countdown, animated solution, end card
// ------------------------------------------------------------------
function puzzleChallenge({ id, line1, line2, count, explain, endLine }) {
  const p = puzzles.find((x) => x.id === id);
  const side = p.fen.split(' ')[1];
  const sideTxt = side === 'w' ? 'Les blancs jouent' : 'Les noirs jouent';
  return {
    W: 1080,
    H: 1920,
    build(root) {
      const bg = background(root);
      const h1 = text(root, line1, 'hook', { top: '150px' });
      const h2 = text(root, line2, 'hook', { top: '285px' });
      const bSide = badge(root, `<img src="${pieceSrc(side, 'k')}">${sideTxt}`, 455);
      const bComment = badge(root, 'Réponds en commentaire', 455, 'gold');
      const bSol = badge(root, 'Solution', 455, 'gold');
      const board = new Board(root, { x: 86, y: 590, size: 880, fen: p.fen, orientation: side });
      const T0 = 1.6;
      const ring = countdown(root, { x: 540, y: 1640, size: 200, from: count, t0: T0 });
      const S = T0 + count + 0.35;
      // solution
      let t = S + 0.5;
      for (let i = 0; i < p.moves.length; i++) {
        const uci = p.moves[i];
        if (i % 2 === 0) {
          board.mark(t, t + 0.9, uci.slice(0, 2), 'hint');
          board.arrow(t + 0.15, t + 1.35, uci.slice(0, 2), uci.slice(2, 4));
          cue(t + 0.15, 'pop', 0.6);
          board.move(t + 0.9, uci, { dur: 0.5 });
          t += 1.6;
        } else {
          board.move(t, uci, { dur: 0.45 });
          t += 0.9;
        }
      }
      const tm = t - 0.6;
      const stamp = text(root, '<span>Échec et mat !</span>', 'stamp', { top: '930px' });
      cue(tm, 'stamp');
      const conf = confetti(root, { x: 540, y: 1000 });
      const cap = text(root, explain, 'cap box small', { top: '1560px' });
      const tEnd = tm + 3.6;
      const end = endCard(root, { t0: tEnd, line2: endLine });
      cue(0.1, 'whoosh');
      cue(0.45, 'pop');
      cue(0.75, 'pop');
      return {
        dur: tEnd + 4.6,
        update(tt) {
          bg(tt);
          popAnim(h1, tt, 0.15);
          popAnim(h2, tt, 0.45, Infinity, { from: 0.3, rot: -6 });
          popAnim(bSide, tt, 1.0, 3.7);
          popAnim(bComment, tt, 3.9, S - 0.2);
          popAnim(bSol, tt, S);
          const kb = easeOut(prog(tt, 0.25, 0.7));
          setStyle(board.wrap, { opacity: kb, transform: `translateY(${(1 - kb) * 200}px) scale(${lerp(0.9, 1, kb) * (1 + 0.012 * Math.sin(tt * 2))})` });
          board.update(tt);
          ring(tt);
          popAnim(stamp, tt, tm, tEnd - 0.4, { from: 2.2, rot: -14 });
          if (tt > tm) stamp.style.transform += ' rotate(-6deg)';
          conf(tt, tm);
          popAnim(cap, tt, tm + 0.8, tEnd - 0.2);
          end(tt);
        },
      };
    },
  };
}

// ------------------------------------------------------------------
// Tutorial: the "coup du berger" (Scholar's mate)
// ------------------------------------------------------------------
const berger = {
  W: 1080,
  H: 1920,
  build(root) {
    const bg = background(root);
    const h1 = text(root, 'Gagne en', 'hook', { top: '150px' });
    const h2 = text(root, '<b>4 coups</b>', 'hook', { top: '285px' });
    const b1 = badge(root, 'Le coup du berger', 455, 'gold');
    const b2 = badge(root, "Comment l'éviter ?", 455, 'red');
    const board = new Board(root, { x: 86, y: 590, size: 880, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' });
    const steps = [
      { t: 2.0, mv: 'e4', cap: '1. Le pion du roi <b>au centre</b>' },
      { t: 3.4, mv: 'e5' },
      { t: 4.4, mv: 'Bc4', cap: '2. Le fou vise <b>f7</b>, le point faible', arrow: ['c4', 'f7', 5.0, 8.6], mark: ['f7', 5.0, 8.6] },
      { t: 6.2, mv: 'Nc6' },
      { t: 7.4, mv: 'Qh5', cap: '3. La dame rejoint <b>l’attaque</b>', arrow: ['h5', 'f7', 8.0, 11.4] },
      { t: 9.4, mv: 'Nf6', cap: 'Les noirs attaquent la dame… <b class="red">erreur !</b>' },
      { t: 11.6, mv: 'Qxf7', cap: '4. Dame prend f7 : <b>échec et mat</b>' },
    ];
    const caps = [];
    steps.forEach((s, i) => {
      board.move(s.t, s.mv, { dur: 0.5 });
      if (s.arrow) board.arrow(s.arrow[2], s.arrow[3], s.arrow[0], s.arrow[1], s.arrow[1] === 'f7' && s.mv === 'Qh5' ? '255,93,115' : '36,214,160');
      if (s.mark) board.mark(s.mark[1], s.mark[2], s.mark[0], 'danger');
      if (s.cap) {
        const next = steps.slice(i + 1).find((x) => x.cap);
        caps.push({ e: text(root, s.cap, 'cap box', { top: '1545px' }), t0: s.t - 0.1, t1: next ? next.t - 0.2 : 13.8 });
      }
    });
    cue(9.9, 'error', 0.7);
    const tm = 12.1;
    cue(tm, 'stamp');
    const stamp = text(root, '<span>Échec et mat !</span>', 'stamp', { top: '930px' });
    const conf = confetti(root, { x: 540, y: 1000 });
    const avoid = text(root, 'Après Dh5, joue <b>…g6</b> : la dame est chassée', 'cap box', { top: '1545px' });
    // second board: back to the position after 3.Qh5 to show the right defence
    const board2 = new Board(root, { x: 86, y: 590, size: 880, fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3' });
    board2.arrow(15.0, 16.2, 'g7', 'g6', '59,224,160');
    board2.move(16.0, 'g6', { dur: 0.5 });
    board2.arrow(16.7, 17.8, 'g6', 'h5', '59,224,160');
    // replay "avoid" idea: arrows on the starting attack
    const tEnd = 18.0;
    const end = endCard(root, { t0: tEnd, line2: 'Entraîne-toi contre 8 adversaires', cta: 'Lien en bio' });
    cue(0.1, 'whoosh');
    cue(0.45, 'pop');
    cue(14.2, 'whoosh');
    return {
      dur: tEnd + 4.6,
      update(t) {
        bg(t);
        popAnim(h1, t, 0.15);
        popAnim(h2, t, 0.45, Infinity, { from: 0.3, rot: -6 });
        popAnim(b1, t, 1.0, 14.0);
        popAnim(b2, t, 14.2);
        const kb = easeOut(prog(t, 0.25, 0.7));
        setStyle(board.wrap, { opacity: kb, transform: `translateY(${(1 - kb) * 200}px) scale(${lerp(0.9, 1, kb)})` });
        const sw = easeInOut(prog(t, 14.2, 0.5));
        setStyle(board.wrap, { opacity: kb * (1 - sw), visibility: sw >= 1 ? 'hidden' : 'visible' });
        setStyle(board2.wrap, { opacity: sw, visibility: sw <= 0 ? 'hidden' : 'visible' });
        board.update(t);
        board2.update(Math.max(t, 14.2));
        caps.forEach((c) => popAnim(c.e, t, c.t0, c.t1, { from: 0.85, dy: 30 }));
        popAnim(stamp, t, tm, 14.0, { from: 2.2, rot: -14 });
        if (t > tm) stamp.style.transform += ' rotate(-6deg)';
        conf(t, tm);
        popAnim(avoid, t, 14.4, tEnd - 0.2, { from: 0.85, dy: 30 });
        end(t);
      },
    };
  },
};

// ------------------------------------------------------------------
// Trailer (vertical 9:16 or landscape 16:9)
// ------------------------------------------------------------------
function trailer(W, H) {
  const land = W > H;
  return {
    W,
    H,
    build(root) {
      if (land) root.classList.add('land');
      const bg = background(root);
      // layout helpers
      const capStyle = (top) => (land ? { top: `${top}px`, left: '60px', right: 'auto', width: '860px' } : { top: `${top}px` });
      const cy = land ? { cap: 380, sub: 520 } : { cap: 150, sub: 330 };

      // --- A: hero pieces & title
      const glow = el('div', '', root, {
        left: land ? '1150px' : '140px', top: land ? '120px' : '700px', width: '800px', height: '800px', borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(56,217,236,0.35), transparent)',
      });
      const k = el('img', 'piece-hero', root, { width: land ? '470px' : '560px', left: land ? '1310px' : '400px', top: land ? '90px' : '800px' });
      k.src = pieceSrc('w', 'k');
      const q = el('img', 'piece-hero', root, { width: land ? '400px' : '470px', left: land ? '1060px' : '110px', top: land ? '250px' : '1000px' });
      q.src = pieceSrc('b', 'q');
      const title = text(root, 'Échec <b>&amp;</b> Mat', 'hook', { ...capStyle(land ? 330 : 260), fontSize: land ? '150px' : '170px' });
      const tag = text(root, 'Les échecs, en plus beau.', 'sub', { ...capStyle(land ? 520 : 470), fontSize: land ? '52px' : '56px' });

      // --- B: board demo
      const bSize = land ? 840 : 900;
      const board = new Board(root, { x: land ? 1000 : 76, y: land ? 106 : 560, size: bSize, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' });
      const line = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'O-O', 'Nxe4'];
      line.forEach((mv, i) => board.move(3.9 + i * 0.36, mv, { dur: 0.3 }));
      board.arrow(7.3, 8.3, 'f1', 'e1');
      const capB1 = wordsReveal(root, ['Des', 'pièces', '*3D', 'en', 'bois'], '', capStyle(cy.cap));
      const capB2 = text(root, 'Animations fluides, sons réalistes', 'sub', capStyle(land ? cy.sub : cy.sub + 40));

      // --- C..F: phones
      const pw = land ? 430 : 620;
      const px = land ? 1210 : (W - pw) / 2;
      const py = land ? 70 : 470;
      const ph1 = phone(root, shot('03-niveaux'), { x: px, y: py, w: pw });
      const ph2 = phone(root, shot('05-puzzle'), { x: px, y: py, w: pw });
      const pw2 = land ? 380 : 470;
      const ph3a = phone(root, shot('04-deux-joueurs'), { x: land ? 1010 : 70, y: land ? 110 : 560, w: pw2 });
      const ph3b = phone(root, shot('08-en-ligne'), { x: land ? 1440 : 540, y: land ? 70 : 520, w: pw2 });
      const ph4 = phone(root, shot('07-victoire'), { x: px, y: py, w: pw });
      const capC = wordsReveal(root, ['*8', 'adversaires'], '', capStyle(cy.cap));
      const subC = text(root, 'Du débutant au grand maître', 'sub', capStyle(cy.sub - (land ? 0 : 50)));
      const capD = wordsReveal(root, ['*101', 'puzzles', 'de', 'mat'], '', capStyle(cy.cap));
      const subD = text(root, 'Trouve l’échec et mat en 1, 2 ou 3 coups', 'sub', capStyle(cy.sub - (land ? 0 : 50)));
      const capE = wordsReveal(root, ['Joue', 'avec', 'tes', '*amis'], '', capStyle(cy.cap));
      const subE = text(root, 'Sur le même téléphone ou à distance', 'sub', capStyle(cy.sub - (land ? 0 : 50)));
      const capF = wordsReveal(root, ['Progresse', '&', '*gagne'], '', capStyle(cy.cap));
      const subF = text(root, 'Classement Elo, niveaux, défi du jour', 'sub', capStyle(cy.sub - (land ? 0 : 50)));
      const conf = confetti(root, { x: land ? 1430 : 540, y: land ? 400 : 1000, seed: 3 });

      const tEnd = 22.0;
      const end = endCard(root, { t0: tEnd, line2: 'Le jeu d’échecs 100 % gratuit sur Android', cta: land ? 'Télécharge-le gratuitement' : 'Lien en bio' });

      // sounds
      cue(0.15, 'whoosh');
      cue(1.2, 'stamp', 0.7);
      cue(1.6, 'pop');
      [3.4, 8.4, 11.8, 15.2, 18.6].forEach((tt) => cue(tt, 'whoosh'));
      cue(18.9, 'chime', 0.7);

      const phoneIn = (e, t, t0, t1, fromRight = true, rot = 0) => {
        const kin = easeOut(prog(t, t0, 0.6));
        const kout = easeInOut(prog(t, t1, 0.4));
        const op = Math.min(kin, 1 - kout);
        setStyle(e, {
          opacity: op,
          visibility: op <= 0 ? 'hidden' : 'visible',
          transform: `translate(${(1 - kin) * (fromRight ? 500 : -500)}px, ${kout * -120}px) rotate(${rot * kin}deg) scale(${lerp(0.85, 1, kin) * (1 + 0.015 * Math.sin(t * 2))})`,
        });
      };

      return {
        dur: tEnd + 4.8,
        update(t) {
          bg(t);
          // A
          const ka = easeOut(prog(t, 0.1, 1.2));
          const kq = easeOut(prog(t, 0.45, 1.2));
          const outA = easeInOut(prog(t, 3.0, 0.5));
          setStyle(k, { transform: `translateY(${(1 - ka) * 900 + outA * 300}px) scale(${1 + 0.02 * Math.sin(t * 2)})`, opacity: 1 - outA });
          setStyle(q, { transform: `translateY(${(1 - kq) * 900 + outA * 300}px)`, opacity: 1 - outA });
          setStyle(glow, { opacity: Math.min(prog(t, 0.6, 0.8), 1 - outA) * (0.8 + 0.2 * Math.sin(t * 3)) });
          popAnim(title, t, 1.2, 3.0, { from: 2, rot: 0 });
          popAnim(tag, t, 1.6, 3.0);
          // B
          const kb = easeOut(prog(t, 3.4, 0.6));
          const ob = easeInOut(prog(t, 8.1, 0.4));
          setStyle(board.wrap, { opacity: Math.min(kb, 1 - ob), visibility: t > 3.3 && t < 8.6 ? 'visible' : 'hidden', transform: `scale(${lerp(0.8, 1, kb) * (1 + 0.04 * prog(t, 3.4, 5))}) translateY(${ob * -100}px)` });
          board.update(t);
          capB1(t, 3.6, 8.1);
          popAnim(capB2, t, 5.6, 8.1);
          // C
          phoneIn(ph1, t, 8.4, 11.6);
          capC(t, 8.5, 11.6);
          popAnim(subC, t, 9.0, 11.6);
          // D
          phoneIn(ph2, t, 11.8, 15.0, false);
          capD(t, 11.9, 15.0);
          popAnim(subD, t, 12.4, 15.0);
          // E
          phoneIn(ph3a, t, 15.2, 18.4, false, -6);
          phoneIn(ph3b, t, 15.4, 18.4, true, 6);
          capE(t, 15.3, 18.4);
          popAnim(subE, t, 15.8, 18.4);
          // F
          phoneIn(ph4, t, 18.6, 21.8);
          capF(t, 18.7, 21.8);
          popAnim(subF, t, 19.2, 21.8);
          conf(t, 19.0);
          end(t);
        },
      };
    },
  };
}

export const SCENES = {
  'defi-mat-en-1': puzzleChallenge({
    id: 'm1-36',
    line1: 'Tu trouves',
    line2: 'le <b>mat en 1</b> ?',
    count: 5,
    explain: 'La dame, protégée par le <b>cavalier</b>, emprisonne le roi',
    endLine: '101 puzzles comme celui-ci, gratuits',
  }),
  'defi-mat-en-2': puzzleChallenge({
    id: 'm2-33',
    line1: 'Mat en 2',
    line2: 'Tu le <b>vois</b> ?',
    count: 7,
    explain: 'La dame se <b>sacrifie</b> pour dévier la tour, puis la tour mate',
    endLine: '101 puzzles comme celui-ci, gratuits',
  }),
  'defi-mat-en-3': puzzleChallenge({
    id: 'm3-25',
    line1: 'Niveau expert',
    line2: '<b>Mat en 3</b>',
    count: 9,
    explain: 'Sacrifice de dame, puis les deux tours <b>finissent le travail</b>',
    endLine: '101 puzzles comme celui-ci, gratuits',
  }),
  'coup-du-berger': berger,
  'bande-annonce': trailer(1080, 1920),
  'bande-annonce-16x9': trailer(1920, 1080),
};

void ASSETS;
void easeBack;
void win;
void slideAnim;
