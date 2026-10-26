import { useEffect, useRef } from 'react';
import Icon from './Icons';

const FR = { K: 'R', Q: 'D', R: 'T', B: 'F', N: 'C' };
export const frSan = (san) => san.replace(/[KQRBN]/g, (c) => FR[c]);

export default function MoveList({ moves, viewIndex, onSelect }) {
  const ref = useRef(null);
  const current = viewIndex == null ? moves.length : viewIndex;

  useEffect(() => {
    const el = ref.current?.querySelector('.mv.current');
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [current, moves.length]);

  const go = (i) => {
    if (i >= moves.length) onSelect(null);
    else onSelect(Math.max(0, i));
  };

  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) pairs.push(i);

  return (
    <div className="movelist">
      <button type="button" className="ml-nav" onClick={() => go(current - 1)} disabled={current === 0} aria-label="Coup précédent">
        <Icon name="back" size={18} />
      </button>
      <div className="ml-scroll" ref={ref}>
        {moves.length === 0 && <span className="ml-empty">Les coups apparaîtront ici</span>}
        {pairs.map((i) => (
          <span key={i} className="ml-pair">
            <span className="ml-num">{i / 2 + 1}.</span>
            <button type="button" className={`mv ${current === i + 1 ? 'current' : ''}`} onClick={() => go(i + 1)}>
              {frSan(moves[i].san)}
            </button>
            {moves[i + 1] && (
              <button type="button" className={`mv ${current === i + 2 ? 'current' : ''}`} onClick={() => go(i + 2)}>
                {frSan(moves[i + 1].san)}
              </button>
            )}
          </span>
        ))}
      </div>
      <button type="button" className="ml-nav" onClick={() => go(current + 1)} disabled={viewIndex == null} aria-label="Coup suivant">
        <Icon name="next" size={18} />
      </button>
      <button type="button" className="ml-nav" onClick={() => onSelect(null)} disabled={viewIndex == null} aria-label="Position actuelle">
        <Icon name="last" size={18} />
      </button>
    </div>
  );
}
