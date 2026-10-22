import { useEffect, useState } from 'react';
import { pieceUrl, formatClock, PIECE_VALUE } from '../lib/chessUtil';
import Icon from './Icons';

export const AVATARS = [
  { piece: 'wk', hue: 205 },
  { piece: 'wq', hue: 280 },
  { piece: 'wn', hue: 150 },
  { piece: 'wb', hue: 25 },
  { piece: 'wr', hue: 340 },
  { piece: 'bk', hue: 45 },
  { piece: 'bq', hue: 180 },
  { piece: 'bn', hue: 235 },
];

export function Avatar({ piece = 'wk', hue = 205, size = 48, online = false, ring = false }) {
  return (
    <div
      className={`avatar ${ring ? 'ring' : ''}`}
      style={{
        width: size,
        height: size,
        '--hue': hue,
      }}
    >
      <img src={pieceUrl(piece[0], piece[1])} alt="" draggable={false} />
      {online && <span className="online-dot" />}
    </div>
  );
}

export function PlayerBar({ name, subtitle, avatar, color, captured, diff, clock, active, thinking, lowTime, flipped }) {
  return (
    <div className={`player-bar ${active ? 'active' : ''} ${flipped ? 'flipped' : ''}`}>
      <Avatar {...avatar} size={42} />
      <div className="pb-main">
        <div className="pb-name">
          <span className={`side-chip ${color}`} />
          <span className="pb-title">{name}</span>
          {thinking && (
            <span className="thinking">
              <i />
              <i />
              <i />
            </span>
          )}
        </div>
        <div className="pb-sub">
          {captured && captured.length > 0 ? (
            <span className="captured">
              {captured.map((t, i) => (
                <img key={i} src={pieceUrl(color === 'w' ? 'b' : 'w', t)} alt="" style={{ marginLeft: i && captured[i - 1] === t ? -9 : 1 }} />
              ))}
              {diff > 0 && <b className="adv">+{diff}</b>}
            </span>
          ) : (
            <span className="muted">{subtitle}</span>
          )}
        </div>
      </div>
      {clock != null && (
        <div className={`clock ${active ? 'running' : ''} ${lowTime ? 'low' : ''}`}>
          <Icon name="clock" size={14} />
          {formatClock(clock)}
        </div>
      )}
    </div>
  );
}

export function capturedFor(capturedList) {
  // value-sorted list of pieces this side has taken
  return [...capturedList].sort((a, b) => PIECE_VALUE[b] - PIECE_VALUE[a]);
}

export function Modal({ open, onClose, children, className = '' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${className}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ open, title, text, confirmLabel = 'Confirmer', danger, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} className="confirm">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          Annuler
        </button>
        <button type="button" className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Toggle({ checked, onChange, label, icon, hint }) {
  return (
    <label className="toggle-row">
      {icon && (
        <span className="tr-icon">
          <Icon name={icon} size={20} />
        </span>
      )}
      <span className="tr-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" />
    </label>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CountUp({ to, duration = 900, prefix = '' }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - start) / duration);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return (
    <>
      {prefix}
      {v}
    </>
  );
}

export function RatingChart({ data, height = 150 }) {
  const pts = data.slice(-14);
  if (pts.length < 2) pts.unshift(pts[0] ?? 800);
  const min = Math.floor((Math.min(...pts) - 20) / 50) * 50;
  const max = Math.ceil((Math.max(...pts) + 20) / 50) * 50;
  const W = 320;
  const H = height;
  const padL = 34;
  const padB = 10;
  const x = (i) => padL + ((W - padL - 8) * i) / Math.max(1, pts.length - 1);
  const y = (v) => 8 + ((H - padB - 8) * (max - v)) / Math.max(1, max - min);
  const ticks = [];
  const step = Math.max(50, Math.ceil((max - min) / 3 / 50) * 50);
  for (let t = min; t <= max; t += step) ticks.push(t);
  const path = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${path} L${x(pts.length - 1)},${H - padB} L${x(0)},${H - padB} Z`;
  const last = pts[pts.length - 1];
  const up = last >= pts[pts.length - 2];
  return (
    <svg className="rating-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Évolution du classement">
      <defs>
        <linearGradient id="rc-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3be0a0" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3be0a0" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W} y1={y(t)} y2={y(t)} className="grid" />
          <text x={0} y={y(t) + 4} className="tick">
            {t}
          </text>
        </g>
      ))}
      {pts.map((_, i) => (
        <line key={i} x1={x(i)} x2={x(i)} y1={8} y2={H - padB} className="grid v" />
      ))}
      <path d={area} fill="url(#rc-fill)" />
      <path d={path} className="line" />
      {pts.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === pts.length - 1 ? 4.5 : 2.5} className={i === pts.length - 1 ? (up ? 'dot up' : 'dot down') : 'dot'} />
      ))}
    </svg>
  );
}
