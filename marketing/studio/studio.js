// Tiny deterministic "motion design" kit: every scene exposes update(t) so that
// frames can be rendered one by one at a fixed frame rate.
import { Chess } from 'chess.js';

export const ASSETS = '../../client/public/';
export const pieceSrc = (c, t) => `${ASSETS}assets/pieces/${c}${t}.webp`;
export const boardSrc = (theme) => `${ASSETS}assets/boards/${theme}.webp`;

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const prog = (t, t0, dur) => clamp((t - t0) / dur);
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeBack = (k) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};
// 0 → 1 → 0 window with fades
export const win = (t, t0, t1, fin = 0.35, fout = 0.35) => Math.min(prog(t, t0, fin), 1 - prog(t, t1 - fout, fout));

export function el(tag, cls, parent, style = {}) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  Object.assign(e.style, style);
  parent?.appendChild(e);
  return e;
}

export function setStyle(e, s) {
  for (const k in s) e.style[k] = s[k];
}

// ---------- sound cue list (rendered to audio afterwards) ----------
export const cues = [];
export const cue = (t, name, gain = 1) => cues.push({ t: Math.round(t * 1000) / 1000, name, gain });

// ---------- background ----------
export function background(root, { hue = 0 } = {}) {
  const bg = el('div', 'bg', root);
  el('div', 'bg-glow g1', bg);
  el('div', 'bg-glow g2', bg);
  const floor = el('div', 'bg-floor', bg);
  return (t) => {
    setStyle(bg.children[0], { transform: `translate(${Math.sin(t * 0.5) * 60}px, ${Math.cos(t * 0.4) * 40}px)` });
    setStyle(bg.children[1], { transform: `translate(${Math.cos(t * 0.35) * 70}px, ${Math.sin(t * 0.45) * 50}px)` });
    setStyle(floor, { backgroundPosition: `0 ${(t * 40) % 120}px`, filter: `hue-rotate(${hue}deg)` });
  };
}

// ---------- text ----------
export function text(parent, html, cls, style = {}) {
  const e = el('div', `txt ${cls || ''}`, parent, style);
  e.innerHTML = html;
  return e;
}

// pop-in then optional pop-out
export function popAnim(e, t, t0, t1 = Infinity, { from = 0.6, dy = 40, rot = 0 } = {}) {
  const kin = easeBack(prog(t, t0, 0.45));
  const kout = easeInOut(prog(t, t1, 0.3));
  const op = Math.min(prog(t, t0, 0.2), 1 - kout);
  const s = lerp(from, 1, kin) * (1 - kout * 0.15);
  setStyle(e, {
    opacity: op,
    transform: `translateY(${(1 - kin) * dy - kout * 30}px) scale(${s}) rotate(${rot * (1 - kin)}deg)`,
    visibility: op <= 0.001 ? 'hidden' : 'visible',
  });
}

export function slideAnim(e, t, t0, t1 = Infinity, { dx = 0, dy = 80 } = {}) {
  const kin = easeOut(prog(t, t0, 0.5));
  const kout = easeInOut(prog(t, t1, 0.35));
  const op = Math.min(kin, 1 - kout);
  setStyle(e, {
    opacity: op,
    transform: `translate(${(1 - kin) * dx - kout * dx}px, ${(1 - kin) * dy - kout * dy * 0.5}px)`,
    visibility: op <= 0.001 ? 'hidden' : 'visible',
  });
}

// word-by-word reveal (TikTok caption style)
export function wordsReveal(parent, words, cls, style) {
  const box = el('div', `txt words ${cls || ''}`, parent, style);
  const spans = words.map((w) => {
    const s = el('span', w.startsWith('*') ? 'hl' : '', box);
    s.textContent = w.replace(/^\*/, '');
    return s;
  });
  return (t, t0, t1 = Infinity, step = 0.12) => {
    const out = 1 - prog(t, t1, 0.3);
    box.style.opacity = out;
    box.style.visibility = out <= 0 || t < t0 ? 'hidden' : 'visible';
    spans.forEach((s, i) => {
      const k = easeBack(prog(t, t0 + i * step, 0.35));
      s.style.opacity = prog(t, t0 + i * step, 0.12);
      s.style.transform = `translateY(${(1 - k) * 30}px) scale(${lerp(0.7, 1, k)})`;
    });
  };
}

// ---------- board ----------
const FILES = 'abcdefgh';

export class Board {
  constructor(parent, { x, y, size, fen, orientation = 'w', theme = 'classic', coords = true }) {
    this.size = size;
    this.orientation = orientation;
    this.wrap = el('div', 'v-board-shell', parent, { left: `${x}px`, top: `${y}px`, width: `${size}px` });
    this.board = el('div', 'v-board', this.wrap, { width: `${size}px`, height: `${size}px`, backgroundImage: `url(${boardSrc(theme)})` });
    this.sq = size / 8;
    this.layerHl = el('div', 'layer', this.board);
    this.layerPieces = el('div', 'layer', this.board);
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', '0 0 800 800');
    this.svg.setAttribute('class', 'v-arrows');
    this.board.appendChild(this.svg);
    if (coords) {
      for (let i = 0; i < 8; i++) {
        const r = el('span', `v-coord ${i % 2 ? 'dk' : 'lt'}`, this.board, { top: `${i * this.sq + 6}px`, right: '8px' });
        r.textContent = orientation === 'w' ? 8 - i : i + 1;
        const f = el('span', `v-coord ${i % 2 ? 'lt' : 'dk'}`, this.board, { left: `${i * this.sq + 8}px`, bottom: '4px' });
        f.textContent = orientation === 'w' ? FILES[i] : FILES[7 - i];
      }
    }
    this.chess = new Chess(fen);
    this.states = [this.snapshot()];
    this.moves = [];
    this.arrows = [];
    this.marks = [];
    this.imgs = new Map();
    this.hlEls = [];
  }

  snapshot(prev, move) {
    // map square -> {id,type,color}
    if (!prev) {
      const map = {};
      let id = 0;
      for (const row of this.chess.board()) for (const p of row) if (p) map[p.square] = { id: ++id, type: p.type, color: p.color };
      this.nextId = id;
      return { map, check: this.chess.isCheck(), turn: this.chess.turn() };
    }
    const map = { ...prev.map };
    const mover = map[move.from];
    delete map[move.from];
    if (move.flags.includes('e')) delete map[move.to[0] + move.from[1]];
    map[move.to] = { ...mover, type: move.promotion || mover.type };
    if (move.flags.includes('k') || move.flags.includes('q')) {
      const r = move.color === 'w' ? '1' : '8';
      const [rf, rt] = move.flags.includes('k') ? ['h' + r, 'f' + r] : ['a' + r, 'd' + r];
      map[rt] = map[rf];
      delete map[rf];
    }
    return { map, check: this.chess.isCheck(), turn: this.chess.turn() };
  }

  // schedule a move (SAN or uci) starting at t0
  move(t0, mv, { dur = 0.45, sound = true } = {}) {
    const m = typeof mv === 'string' && /^[a-h][1-8][a-h][1-8]/.test(mv) ? { from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] } : mv;
    const res = this.chess.move(m);
    const prev = this.states[this.states.length - 1];
    this.states.push(this.snapshot(prev, res));
    this.moves.push({ t0, dur, res });
    if (sound) {
      const name = this.chess.isCheckmate() ? 'mate' : this.chess.isCheck() ? 'check' : res.captured ? 'capture' : res.flags.includes('k') || res.flags.includes('q') ? 'castle' : 'move';
      cue(t0 + dur * 0.92, name);
    }
    return res;
  }

  arrow(t0, t1, from, to, color = '36,214,160') {
    this.arrows.push({ t0, t1, from, to, color });
  }

  mark(t0, t1, square, kind = 'hint') {
    this.marks.push({ t0, t1, square, kind });
  }

  xy(square) {
    const f = FILES.indexOf(square[0]);
    const r = Number(square[1]) - 1;
    return this.orientation === 'w' ? { x: f, y: 7 - r } : { x: 7 - f, y: r };
  }

  img(id, color, type) {
    let e = this.imgs.get(id);
    if (!e) {
      e = el('div', 'v-piece', this.layerPieces, { width: `${this.sq}px`, height: `${this.sq}px` });
      el('img', '', e).src = pieceSrc(color, type);
      e._type = type;
      this.imgs.set(id, e);
    }
    if (e._type !== type) {
      e.firstChild.src = pieceSrc(color, type);
      e._type = type;
    }
    return e;
  }

  hl(i, square, cls, opacity = 1) {
    let e = this.hlEls[i];
    if (!e) {
      e = el('div', '', this.layerHl, { width: `${this.sq}px`, height: `${this.sq}px` });
      this.hlEls[i] = e;
    }
    if (!square) {
      e.style.display = 'none';
      return;
    }
    const { x, y } = this.xy(square);
    e.className = `v-hl ${cls}`;
    setStyle(e, { display: 'block', transform: `translate(${x * this.sq}px, ${y * this.sq}px)`, opacity });
  }

  update(t) {
    // which move is active?
    let i = -1;
    for (let k = 0; k < this.moves.length; k++) if (t >= this.moves[k].t0) i = k;
    const active = i >= 0 ? this.moves[i] : null;
    const k = active ? easeInOut(prog(t, active.t0, active.dur)) : 1;
    const before = this.states[i >= 0 ? i : 0];
    const after = this.states[i + 1] || before;
    const shown = active && k < 1 ? before : after;
    const seen = new Set();
    const place = (sqName, p, from, z = 0, fade = 1) => {
      const e = this.img(p.id, p.color, p.type);
      seen.add(p.id);
      const a = this.xy(from || sqName);
      const b = this.xy(sqName);
      const x = lerp(a.x, b.x, from ? k : 1);
      const y = lerp(a.y, b.y, from ? k : 1);
      const lift = from ? Math.sin(Math.PI * k) * 0.25 : 0;
      setStyle(e, {
        display: 'block',
        transform: `translate(${x * this.sq}px, ${(y - lift) * this.sq}px)`,
        zIndex: String(10 + Math.round(y * 2) + z),
        opacity: fade,
      });
    };
    if (active && k < 1) {
      const m = active.res;
      const movers = { [m.from]: m.to };
      if (m.flags.includes('k') || m.flags.includes('q')) {
        const r = m.color === 'w' ? '1' : '8';
        if (m.flags.includes('k')) movers['h' + r] = 'f' + r;
        else movers['a' + r] = 'd' + r;
      }
      for (const [sq, p] of Object.entries(before.map)) {
        if (movers[sq]) {
          const np = after.map[movers[sq]];
          place(movers[sq], { ...p, type: k > 0.85 && np ? np.type : p.type }, sq, 40);
        } else {
          const captured = sq === m.to || (m.flags.includes('e') && sq === m.to[0] + m.from[1]);
          place(sq, p, null, 0, captured ? 1 - clamp((k - 0.6) / 0.4) : 1);
        }
      }
    } else {
      for (const [sq, p] of Object.entries(shown.map)) place(sq, p);
    }
    for (const [id, e] of this.imgs) if (!seen.has(id)) e.style.display = 'none';

    // highlights
    let h = 0;
    if (active) {
      this.hl(h++, active.res.from, 'last');
      this.hl(h++, active.res.to, 'last', k);
    }
    const st = active && k >= 1 ? after : active ? before : this.states[0];
    if (st.check) {
      const king = Object.entries(st.map).find(([, p]) => p.type === 'k' && p.color === st.turn);
      if (king) this.hl(h++, king[0], 'check', 0.75 + 0.25 * Math.sin(t * 8));
    }
    for (const mk of this.marks) {
      if (t >= mk.t0 && t <= mk.t1) this.hl(h++, mk.square, mk.kind, win(t, mk.t0, mk.t1, 0.2, 0.2) * (0.7 + 0.3 * Math.sin(t * 9)));
    }
    for (; h < this.hlEls.length; h++) this.hl(h, null);

    // arrows
    this.svg.innerHTML = '';
    for (const a of this.arrows) {
      if (t < a.t0 || t > a.t1) continue;
      const g = easeOut(prog(t, a.t0, 0.45));
      const op = win(t, a.t0, a.t1, 0.15, 0.3);
      const p = this.xy(a.from);
      const q = this.xy(a.to);
      const ax = p.x * 100 + 50, ay = p.y * 100 + 50, bx = q.x * 100 + 50, by = q.y * 100 + 50;
      const len = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / len, uy = (by - ay) / len;
      const ex = ax + (bx - ax) * g - ux * 34 * g, ey = ay + (by - ay) * g - uy * 34 * g;
      const hx = ex + ux * 34, hy = ey + uy * 34;
      const nx = -uy, ny = ux;
      this.svg.innerHTML += `<g opacity="${op}"><line x1="${ax}" y1="${ay}" x2="${ex}" y2="${ey}" stroke="rgba(${a.color},0.9)" stroke-width="24" stroke-linecap="round"/>
        <polygon points="${hx},${hy} ${ex + nx * 30},${ey + ny * 30} ${ex - nx * 30},${ey - ny * 30}" fill="rgba(${a.color},0.95)"/></g>`;
    }
  }
}

// ---------- confetti ----------
export function confetti(parent, { x, y, count = 140, seed = 7 }) {
  const c = el('canvas', 'v-confetti', parent);
  c.width = 1080;
  c.height = 1920;
  const ctx = c.getContext('2d');
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const colors = ['#ffd54a', '#ffb300', '#3be0a0', '#4fc3f7', '#ff6b8b', '#ffffff'];
  const parts = Array.from({ length: count }, () => ({
    vx: (rnd() - 0.5) * 1500,
    vy: -rnd() * 1500 - 400,
    s: rnd() * 18 + 10,
    r: rnd() * 6,
    vr: (rnd() - 0.5) * 10,
    c: colors[Math.floor(rnd() * colors.length)],
  }));
  return (t, t0) => {
    ctx.clearRect(0, 0, c.width, c.height);
    const dt = t - t0;
    if (dt < 0 || dt > 3.2) return;
    const fade = 1 - clamp((dt - 2.2) / 1);
    for (const p of parts) {
      const px = x + p.vx * dt * Math.exp(-dt * 0.6);
      const py = y + p.vy * dt + 1100 * dt * dt;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(px, py);
      ctx.rotate(p.r + p.vr * dt);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
  };
}

// ---------- countdown ring ----------
export function countdown(parent, { x, y, size, from, t0 }) {
  const box = el('div', 'v-count', parent, { left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px` });
  box.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="track"/><circle cx="50" cy="50" r="44" class="bar"/></svg><span></span>`;
  const bar = box.querySelector('.bar');
  const num = box.querySelector('span');
  for (let i = 0; i < from; i++) cue(t0 + i, i === from - 1 ? 'tick2' : 'tick');
  return (t) => {
    const k = (t - t0) / from;
    const vis = t >= t0 - 0.3 && t <= t0 + from + 0.4;
    box.style.opacity = vis ? Math.min(prog(t, t0 - 0.3, 0.3), 1 - prog(t, t0 + from, 0.4)) : 0;
    bar.style.strokeDashoffset = String(276.5 * clamp(k));
    const n = Math.max(1, from - Math.floor(clamp(t - t0, 0, from - 0.001)));
    num.textContent = n;
    const frac = (t - t0) % 1;
    num.style.transform = `scale(${1 + 0.35 * Math.max(0, 1 - frac * 4)})`;
    box.classList.toggle('urgent', n <= 2);
  };
}

// ---------- phone mockup ----------
export function phone(parent, src, { x, y, w }) {
  const h = w * (2532 / 1170);
  const p = el('div', 'v-phone', parent, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
  const scr = el('div', 'v-screen', p);
  el('img', '', scr).src = src;
  return p;
}

// ---------- end card ----------
export function endCard(root, { t0, line1 = 'Échec & Mat', line2, chips = ['Gratuit', 'Sans pub', 'Hors ligne'], cta = 'Lien en bio' }) {
  const card = el('div', 'v-end', root);
  const icon = el('img', 'v-end-icon', card);
  icon.src = `${ASSETS}icon-512.png`;
  const t1 = text(card, line1.replace('&', '<b>&amp;</b>'), 'v-end-title');
  const t2 = text(card, line2, 'v-end-sub');
  const chipBox = el('div', 'v-chips', card);
  const chipEls = chips.map((c) => text(chipBox, c, 'chip'));
  const ctaEl = text(card, cta, 'v-cta');
  cue(t0, 'whoosh');
  cue(t0 + 0.5, 'pop');
  cue(t0 + 1.4, 'chime', 0.8);
  return (t) => {
    const k = prog(t, t0, 0.5);
    card.style.opacity = k;
    card.style.visibility = k <= 0 ? 'hidden' : 'visible';
    popAnim(icon, t, t0 + 0.1, Infinity, { from: 0.3, rot: -12 });
    icon.style.filter = `drop-shadow(0 0 ${40 + 20 * Math.sin(t * 3)}px rgba(56,217,236,0.55))`;
    popAnim(t1, t, t0 + 0.45);
    popAnim(t2, t, t0 + 0.7);
    chipEls.forEach((c, i) => popAnim(c, t, t0 + 1.0 + i * 0.12, Infinity, { from: 0.4 }));
    popAnim(ctaEl, t, t0 + 1.4);
    ctaEl.style.transform += ` scale(${1 + 0.05 * Math.sin(t * 6)})`;
  };
}
