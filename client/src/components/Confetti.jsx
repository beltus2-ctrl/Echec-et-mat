import { useEffect, useRef } from 'react';

const COLORS = ['#ffd54a', '#ffb300', '#3be0a0', '#4fc3f7', '#ff6b8b', '#ffffff'];

export default function Confetti({ count = 120 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    const W = () => canvas.width;
    const H = () => canvas.height;
    const parts = Array.from({ length: count }, () => ({
      x: W() / 2 + (Math.random() - 0.5) * W() * 0.2,
      y: H() * 0.35,
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (-Math.random() * 14 - 6) * dpr,
      s: (Math.random() * 6 + 4) * dpr,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    let raf;
    const start = performance.now();
    const tick = (t) => {
      ctx.clearRect(0, 0, W(), H());
      const fade = Math.max(0, 1 - (t - start) / 3500);
      for (const p of parts) {
        p.vy += 0.35 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (fade > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count]);
  return <canvas ref={ref} className="confetti" aria-hidden />;
}
