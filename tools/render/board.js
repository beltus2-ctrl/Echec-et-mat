function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function makeNoise(seed) {
  const r = rng(seed); const N = 256; const perm = new Uint8Array(512); const g = new Float32Array(N);
  for (let i = 0; i < N; i++) { perm[i] = i; g[i] = r(); }
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < N; i++) perm[i + N] = perm[i];
  const f = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255, xf = x - Math.floor(x), yf = y - Math.floor(y);
    const a = g[perm[xi + perm[yi]]], b = g[perm[xi + 1 + perm[yi]]], c = g[perm[xi + perm[yi + 1]]], d = g[perm[xi + 1 + perm[yi + 1]]];
    const u = f(xf), v = f(yf);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };
}
function fbm(n, x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * n(x * f, y * f); a *= 0.5; f *= 2; } return s; }
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function woodSquare(img, W, x0, y0, S, pal, n, n2, seed, vertical) {
  const r = rng(seed); const ox = r() * 500, oy = r() * 500; const tone = (r() - 0.5) * 0.12; const freq = 0.9 + r() * 0.5;
  const A = hex(pal[0]), B = hex(pal[1]), C = hex(pal[2]);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    let u = (vertical ? i : j) / S, v = (vertical ? j : i) / S;
    const warp = fbm(n, v * 0.9 + ox, u * 2.2 + oy, 4) * 1.6 + v * 0.4;
    const grain = Math.sin((u * 34 * freq + warp * 3.2) * Math.PI);
    const ring = Math.pow(0.5 + 0.5 * grain, 5);
    const fiber = n2(v * 3 + ox, u * 420 + oy) - 0.5;
    const fiber2 = n2(v * 1.5 + oy, u * 160 + ox) - 0.5;
    let col = mix(A, B, Math.min(1, Math.max(0, 0.18 + ring * 0.55 + fiber * 0.45 + fiber2 * 0.3)));
    col = mix(col, C, Math.max(0, fbm(n, u * 3 + ox, v * 1.2 + oy, 3) - 0.5) * 1.1);
    // bevel / edge darkening
    const e = Math.min(i, j, S - 1 - i, S - 1 - j);
    let k = 1 + tone; if (e < 2) k *= 0.82; else if (e < 4) k *= 0.93;
    if (i < 3 || j < 3) k *= 1.04;
    const p = ((y0 + j) * W + x0 + i) * 4;
    img.data[p] = Math.min(255, col[0] * k); img.data[p + 1] = Math.min(255, col[1] * k); img.data[p + 2] = Math.min(255, col[2] * k); img.data[p + 3] = 255;
  }
}

function marbleSquare(img, W, x0, y0, S, pal, n, seed) {
  const r = rng(seed); const ox = r() * 500, oy = r() * 500;
  const A = hex(pal[0]), B = hex(pal[1]), C = hex(pal[2]);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = i / S + ox, y = j / S + oy;
    const t = fbm(n, x * 1.4, y * 1.4, 6);
    const vein = Math.pow(1 - Math.abs(Math.sin((x * 0.9 + y * 0.6 + t * 2.4) * Math.PI)), 22) + 0.4 * Math.pow(1 - Math.abs(Math.sin((x * 1.7 - y * 0.8 + t * 3.1) * Math.PI)), 40);
    const cloud = fbm(n, x * 1.5 + 9, y * 1.5, 5);
    let col = mix(A, B, cloud * 0.9);
    col = mix(col, C, vein * 0.8);
    const e = Math.min(i, j, S - 1 - i, S - 1 - j); let k = e < 2 ? 0.88 : 1;
    const p = ((y0 + j) * W + x0 + i) * 4;
    img.data[p] = col[0] * k; img.data[p + 1] = col[1] * k; img.data[p + 2] = col[2] * k; img.data[p + 3] = 255;
  }
}

const THEMES = {
  classic: { kind: 'wood', light: ['#f1ddb8', '#d9b886', '#e6cb9c'], dark: ['#a8693a', '#7c4523', '#935a30'], vertical: [false, true] },
  walnut: { kind: 'wood', light: ['#d9b783', '#bd935c', '#caa36d'], dark: ['#5b3a24', '#3b2414', '#4b2e1b'], vertical: [true, true] },
  marble: { kind: 'marble', light: ['#f3f1ec', '#dcd8cf', '#9c968a'], dark: ['#2f4a45', '#1b2d2a', '#a7c2b8'] },
};

window.genBoard = (name, S = 160) => {
  const th = THEMES[name]; const W = S * 8;
  const c = document.createElement('canvas'); c.width = c.height = W; const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, W);
  const n = makeNoise(42), n2 = makeNoise(7);
  for (let rI = 0; rI < 8; rI++) for (let f = 0; f < 8; f++) {
    const light = (rI + f) % 2 === 0; const pal = light ? th.light : th.dark; const seed = rI * 8 + f + 1;
    if (th.kind === 'wood') woodSquare(img, W, f * S, rI * S, S, pal, n, n2, seed * 97, th.vertical[light ? 0 : 1]);
    else marbleSquare(img, W, f * S, rI * S, S, pal, n, seed * 31);
  }
  ctx.putImageData(img, 0, 0);
  // lacquer sheen
  const gr = ctx.createLinearGradient(0, 0, W, W);
  gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.10)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, W);
  return c.toDataURL('image/jpeg', 0.86);
};
