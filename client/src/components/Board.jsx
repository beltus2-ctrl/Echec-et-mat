import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { boardUrl, pieceUrl } from '../lib/chessUtil';
import { useStore } from '../lib/store';
import { play, vibrate } from '../lib/feedback';

const FILES = 'abcdefgh';

function toXY(square, orientation) {
  const f = FILES.indexOf(square[0]);
  const r = Number(square[1]) - 1;
  return orientation === 'w' ? { x: f, y: 7 - r } : { x: 7 - f, y: r };
}

function fromXY(x, y, orientation) {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return orientation === 'w' ? FILES[x] + (8 - y) : FILES[7 - x] + (y + 1);
}

function parsePieces(fen) {
  const rows = fen.split(' ')[0].split('/');
  const out = [];
  rows.forEach((row, i) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) f += Number(ch);
      else {
        out.push({
          square: FILES[f] + (8 - i),
          type: ch.toLowerCase(),
          color: ch === ch.toUpperCase() ? 'w' : 'b',
        });
        f++;
      }
    }
  });
  return out;
}

const dist = (a, b) => Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) + Math.abs(Number(a[1]) - Number(b[1]));

let idCounter = 0;
// Give each piece a stable id across positions so moves can be animated.
function matchPieces(prev, next, lastMove) {
  const used = new Set();
  const result = new Array(next.length);
  next.forEach((p, i) => {
    const same = prev.find((q, j) => !used.has(j) && q.square === p.square && q.type === p.type && q.color === p.color);
    if (same) {
      used.add(prev.indexOf(same));
      result[i] = { ...p, id: same.id };
    }
  });
  next.forEach((p, i) => {
    if (result[i]) return;
    let best = -1;
    let bestD = 99;
    prev.forEach((q, j) => {
      if (used.has(j) || q.color !== p.color) return;
      const promo = lastMove && lastMove.to === p.square && q.type === 'p' && lastMove.from === q.square;
      if (q.type !== p.type && !promo) return;
      const stillThere = next.some((n) => n.square === q.square && n.type === q.type && n.color === q.color);
      if (stillThere) return;
      const d = lastMove && q.square === lastMove.from && p.square === lastMove.to ? -1 : dist(q.square, p.square);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    if (best >= 0) {
      used.add(best);
      result[i] = { ...p, id: prev[best].id };
    } else {
      result[i] = { ...p, id: ++idCounter };
    }
  });
  const removed = prev.filter((_, j) => !used.has(j));
  return { pieces: result, removed };
}

export default function Board({
  fen,
  orientation = 'w',
  movable = null, // 'w' | 'b' | null
  onMove,
  lastMove = null,
  hint = null,
  flash = null,
  premoveSquare = null,
  check = null,
  shake = 0,
}) {
  const settings = useStore((s) => s.settings);
  const boardRef = useRef(null);
  const prevRef = useRef({ pieces: [], fen: null });
  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null);
  const [promotion, setPromotion] = useState(null);
  const [ghosts, setGhosts] = useState([]);
  const dragRef = useRef(null);
  const [sel, setSel] = useState({ fen, selected: null });

  // Clear selection when the position changes (derived-state pattern).
  if (sel.fen !== fen) {
    setSel({ fen, selected: null });
    if (selected) setSelected(null);
    if (promotion) setPromotion(null);
  }

  const { pieces, removed } = useMemo(() => {
    const next = parsePieces(fen);
    if (prevRef.current.fen === fen) return { pieces: prevRef.current.pieces, removed: [] };
    const res = matchPieces(prevRef.current.pieces, next, lastMove);
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  useEffect(() => {
    const changed = prevRef.current.fen !== fen;
    prevRef.current = { pieces, fen };
    if (changed && removed.length && settings.animations) {
      setGhosts(removed.map((r) => ({ ...r, gid: `g${r.id}-${fen.length}` })));
      const t = setTimeout(() => setGhosts([]), 260);
      return () => clearTimeout(t);
    }
  }, [pieces, removed, fen, settings.animations]);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return null;
    }
  }, [fen]);

  const targets = useMemo(() => {
    if (!selected || !chess || !movable) return [];
    return chess.moves({ square: selected, verbose: true });
  }, [selected, chess, movable]);

  const pieceAt = (sq) => pieces.find((p) => p.square === sq);

  function pointToSquare(clientX, clientY) {
    const rect = boardRef.current.getBoundingClientRect();
    const size = rect.width / 8;
    const x = Math.floor((clientX - rect.left) / size);
    const y = Math.floor((clientY - rect.top) / size);
    return fromXY(x, y, orientation);
  }

  function tryMove(from, to) {
    const legal = (chess?.moves({ square: from, verbose: true }) || []).filter((m) => m.to === to);
    if (!legal.length) return false;
    if (legal.some((m) => m.promotion)) {
      setPromotion({ from, to, color: legal[0].color });
      return true;
    }
    setSelected(null);
    onMove?.({ from, to });
    return true;
  }

  function onPointerDown(e) {
    if (promotion || !boardRef.current) return;
    if (e.button !== undefined && e.button !== 0) return;
    const sq = pointToSquare(e.clientX, e.clientY);
    if (!sq) return;
    const p = pieceAt(sq);
    if (selected && sq !== selected && targets.some((m) => m.to === sq)) {
      tryMove(selected, sq);
      return;
    }
    if (p && movable && p.color === movable) {
      const wasSelected = selected === sq;
      setSelected(sq);
      const rect = boardRef.current.getBoundingClientRect();
      dragRef.current = { square: sq, sx: e.clientX, sy: e.clientY, active: false, rect, wasSelected };
      boardRef.current.setPointerCapture?.(e.pointerId);
      if (!wasSelected) {
        play('tap');
      }
      return;
    }
    if (p && movable && p.color !== movable && selected) {
      play('error');
      vibrate('error');
    }
    setSelected(null);
  }

  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.active && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
    d.active = true;
    setDrag({ square: d.square, x: e.clientX - d.rect.left, y: e.clientY - d.rect.top, size: d.rect.width / 8, over: pointToSquare(e.clientX, e.clientY) });
  }

  function onPointerUp(e) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.active) {
      setDrag(null);
      const to = pointToSquare(e.clientX, e.clientY);
      if (to && to !== d.square) {
        if (!tryMove(d.square, to)) {
          play('error');
          vibrate('error');
        }
      }
    } else if (d.wasSelected) {
      setSelected(null);
    }
  }

  function choosePromotion(type) {
    const p = promotion;
    setPromotion(null);
    setSelected(null);
    if (type) onMove?.({ from: p.from, to: p.to, promotion: type });
  }

  const animate = settings.animations && !drag;
  const lastTo = lastMove?.to;

  const sqStyle = (square) => {
    const { x, y } = toXY(square, orientation);
    return { transform: `translate(${x * 100}%, ${y * 100}%)` };
  };

  const coords = settings.showCoords;

  return (
    <div className={`board-shell ${shake ? 'shake' : ''}`} key={shake ? `s${shake}` : undefined}>
      <div
        className="board"
        ref={boardRef}
        style={{ backgroundImage: `url(${boardUrl(settings.boardTheme)})` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
          setDrag(null);
        }}
      >
        {coords && (
          <div className="coords" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <span key={`r${i}`} className={`coord rank ${i % 2 === 0 ? 'on-light' : 'on-dark'}`} style={{ top: `${i * 12.5}%` }}>
                {orientation === 'w' ? 8 - i : i + 1}
              </span>
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <span key={`f${i}`} className={`coord file ${i % 2 === 0 ? 'on-light' : 'on-dark'}`} style={{ left: `${i * 12.5}%` }}>
                {orientation === 'w' ? FILES[i] : FILES[7 - i]}
              </span>
            ))}
          </div>
        )}

        {lastMove && (
          <>
            <div className="sq hl-last" style={sqStyle(lastMove.from)} />
            <div className="sq hl-last" style={sqStyle(lastMove.to)} />
          </>
        )}
        {premoveSquare && <div className="sq hl-premove" style={sqStyle(premoveSquare)} />}
        {selected && <div className="sq hl-selected" style={sqStyle(selected)} />}
        {check && <div className="sq hl-check" style={sqStyle(check)} />}
        {flash && <div key={flash.key} className={`sq hl-flash ${flash.kind}`} style={sqStyle(flash.square)} />}
        {drag?.over && <div className="sq hl-over" style={sqStyle(drag.over)} />}

        {settings.showLegal &&
          targets.map((m) => (
            <div key={m.to + (m.promotion || '')} className={`sq target ${m.captured ? 'capture' : ''}`} style={sqStyle(m.to)}>
              <span />
            </div>
          ))}

        {ghosts.map((g) => (
          <div key={g.gid} className="piece ghost" style={{ ...sqStyle(g.square), zIndex: 9 }}>
            <img src={pieceUrl(g.color, g.type)} alt="" draggable={false} />
          </div>
        ))}

        {pieces.map((p) => {
          const { y } = toXY(p.square, orientation);
          const dragging = drag && drag.square === p.square;
          return (
            <div
              key={p.id}
              className={`piece ${animate ? 'anim' : ''} ${dragging ? 'lifted' : ''} ${p.square === selected ? 'selected' : ''}`}
              style={{ ...sqStyle(p.square), zIndex: p.square === lastTo ? 25 : 10 + y }}
            >
              <img src={pieceUrl(p.color, p.type)} alt={`${p.color}${p.type}`} draggable={false} />
            </div>
          );
        })}

        {drag && (() => {
          const p = pieceAt(drag.square);
          if (!p) return null;
          return (
            <div
              className="piece dragging"
              style={{
                transform: `translate(${drag.x - drag.size / 2}px, ${drag.y - drag.size * 0.95}px) scale(1.18)`,
                width: drag.size,
                height: drag.size,
              }}
            >
              <img src={pieceUrl(p.color, p.type)} alt="" draggable={false} />
            </div>
          );
        })()}

        {hint && (
          <svg className="arrows" viewBox="0 0 800 800" aria-hidden>
            <defs>
              <marker id="ah" markerWidth="4" markerHeight="4" refX="2.2" refY="2" orient="auto">
                <path d="M0,0 L4,2 L0,4 z" fill="rgba(36, 214, 160, 0.9)" />
              </marker>
            </defs>
            {(() => {
              const a = toXY(hint.from, orientation);
              const b = toXY(hint.to, orientation);
              const ax = a.x * 100 + 50, ay = a.y * 100 + 50, bx = b.x * 100 + 50, by = b.y * 100 + 50;
              const len = Math.hypot(bx - ax, by - ay);
              const ex = bx - ((bx - ax) / len) * 30, ey = by - ((by - ay) / len) * 30;
              return (
                <line x1={ax} y1={ay} x2={ex} y2={ey} stroke="rgba(36, 214, 160, 0.85)" strokeWidth="22" strokeLinecap="round" markerEnd="url(#ah)" />
              );
            })()}
          </svg>
        )}

        {promotion && (
          <div className="promo-overlay" onPointerDown={(e) => { e.stopPropagation(); choosePromotion(null); }}>
            <div
              className="promo-col"
              style={{
                left: `${toXY(promotion.to, orientation).x * 12.5}%`,
                [toXY(promotion.to, orientation).y === 0 ? 'top' : 'bottom']: 0,
                flexDirection: toXY(promotion.to, orientation).y === 0 ? 'column' : 'column-reverse',
              }}
            >
              {['q', 'n', 'r', 'b'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className="promo-btn"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    choosePromotion(t);
                  }}
                >
                  <img src={pieceUrl(promotion.color, t)} alt={t} draggable={false} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
