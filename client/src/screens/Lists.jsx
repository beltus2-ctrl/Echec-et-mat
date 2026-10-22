import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import Icon from '../components/Icons';
import { Avatar, Confirm, Toggle, AVATARS } from '../components/ui';
import Board from '../components/Board';
import MoveList from '../components/MoveList';
import { ScreenHeader } from './Setup';
import { PUZZLES, CATEGORIES } from '../lib/puzzles';
import { useStore, update, resetAll, levelFromXp } from '../lib/store';
import { REASONS, formatDate, boardUrl, kingSquare } from '../lib/chessUtil';
import { play } from '../lib/feedback';

export function PuzzleList({ onBack, onOpen }) {
  const puzzles = useStore((s) => s.puzzles);
  return (
    <div className="screen list-screen">
      <ScreenHeader title="Puzzles" subtitle={`Classement puzzle : ${puzzles.rating}`} onBack={onBack} />
      <div className="puzzle-stats card">
        <div>
          <strong>{Object.keys(puzzles.solved).length}</strong>
          <span>Résolus</span>
        </div>
        <div>
          <strong>{puzzles.rating}</strong>
          <span>Classement</span>
        </div>
        <div>
          <strong>
            <Icon name="fire" size={18} /> {puzzles.streak}
          </strong>
          <span>Série</span>
        </div>
      </div>
      {CATEGORIES.map((c) => {
        const list = PUZZLES.filter((p) => p.mate === c.mate);
        if (!list.length) return null;
        const done = list.filter((p) => puzzles.solved[p.id]).length;
        return (
          <section key={c.mate} className="card puzzle-cat">
            <div className="pc-head">
              <Avatar piece={c.piece} hue={c.hue} size={46} />
              <div>
                <h3>{c.title}</h3>
                <span className="muted">{c.subtitle}</span>
              </div>
              <span className="pc-count">
                {done}/{list.length}
              </span>
            </div>
            <div className="progress">
              <i style={{ width: `${(done / list.length) * 100}%`, '--hue': c.hue }} />
            </div>
            <div className="puzzle-grid">
              {list.map((p, i) => (
                <button key={p.id} type="button" className={`pz ${puzzles.solved[p.id] ? 'solved' : ''}`} onClick={() => onOpen(p.id)}>
                  {puzzles.solved[p.id] ? <Icon name="check" size={16} stroke={3} /> : i + 1}
                </button>
              ))}
            </div>
          </section>
        );
      })}
      <div className="bottom-spacer" />
    </div>
  );
}

export function HistoryList({ onBack, onOpen }) {
  const history = useStore((s) => s.history);
  return (
    <div className="screen list-screen">
      <ScreenHeader title="Historique" subtitle={`${history.length} parties`} onBack={onBack} />
      {history.length === 0 && (
        <div className="empty">
          <Icon name="history" size={42} />
          <p>Aucune partie terminée pour l'instant.</p>
        </div>
      )}
      <div className="history-list">
        {history.map((g) => {
          let outcome = 'draw';
          if (g.winner && g.playerColor) outcome = g.winner === g.playerColor ? 'win' : 'loss';
          else if (g.winner) outcome = 'win';
          const label = g.winner == null ? 'Nulle' : g.playerColor ? (outcome === 'win' ? 'Victoire' : 'Défaite') : `${g.names[g.winner]} gagne`;
          return (
            <button key={g.id} type="button" className={`history-item ${outcome}`} onClick={() => onOpen(g.id)}>
              <span className="hi-badge">{g.winner == null ? '½' : outcome === 'loss' ? '0' : '1'}</span>
              <span className="hi-main">
                <strong>
                  {g.names.w} <em>vs</em> {g.names.b}
                </strong>
                <span>
                  {label} {REASONS[g.reason] || ''} · {Math.ceil(g.moves.length / 2)} coups
                </span>
              </span>
              <span className="hi-side">
                {g.ratingDelta != null && <b className={g.ratingDelta >= 0 ? 'up' : 'down'}>{g.ratingDelta >= 0 ? `+${g.ratingDelta}` : g.ratingDelta}</b>}
                <small>{formatDate(g.ts)}</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="bottom-spacer" />
    </div>
  );
}

export function Replay({ id, onBack }) {
  const game = useStore((s) => s.history.find((g) => g.id === id));
  const { fens, verbose } = useMemo(() => {
    const c = new Chess();
    const f = [c.fen()];
    const v = [];
    for (const san of game?.moves || []) {
      v.push(c.move(san));
      f.push(c.fen());
    }
    return { fens: f, verbose: v };
  }, [game]);
  const [view, setView] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!game) return null;
  const idx = view == null ? verbose.length : view;
  const fen = fens[idx];
  const mv = verbose[idx - 1];
  const chess = new Chess(fen);
  const base = game.playerColor || 'w';
  const orientation = flip ? (base === 'w' ? 'b' : 'w') : base;

  return (
    <div className="screen game-screen">
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Retour">
          <Icon name="back" />
        </button>
        <div className="topbar-title">
          <span>
            {game.names.w} vs {game.names.b}
          </span>
          <small>{formatDate(game.ts)}</small>
        </div>
        <button type="button" className="icon-btn" onClick={() => setFlip((f) => !f)} aria-label="Retourner">
          <Icon name="flip" />
        </button>
      </header>
      <div className="game-area">
        <div className="replay-name">{orientation === 'w' ? game.names.b : game.names.w}</div>
        <Board fen={fen} orientation={orientation} lastMove={mv ? { from: mv.from, to: mv.to } : null} check={chess.isCheck() ? kingSquare(chess, chess.turn()) : null} />
        <div className="replay-name">{orientation === 'w' ? game.names.w : game.names.b}</div>
      </div>
      <MoveList moves={verbose} viewIndex={view} onSelect={setView} />
      <nav className="action-bar">
        <button type="button" onClick={() => setView(0)}>
          <Icon name="first" />
          <span>Début</span>
        </button>
        <button type="button" onClick={() => setView(Math.max(0, idx - 1))}>
          <Icon name="back" />
          <span>Précédent</span>
        </button>
        <button
          type="button"
          className="accent"
          onClick={() => {
            const n = idx + 1;
            setView(n >= verbose.length ? null : n);
            play('move');
          }}
        >
          <Icon name="next" />
          <span>Suivant</span>
        </button>
        <button type="button" onClick={() => setView(null)}>
          <Icon name="last" />
          <span>Fin</span>
        </button>
      </nav>
    </div>
  );
}

const THEMES = [
  { id: 'classic', name: 'Bois clair' },
  { id: 'walnut', name: 'Noyer' },
  { id: 'marble', name: 'Marbre' },
];

export function Settings({ onBack }) {
  const s = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const set = (k) => (v) =>
    update((st) => {
      st.settings[k] = v;
    });
  const lvl = levelFromXp(s.stats.xp);

  return (
    <div className="screen list-screen">
      <ScreenHeader title="Profil & réglages" onBack={onBack} />

      <section className="card profile-card">
        <Avatar {...(AVATARS[s.profile.avatar] || AVATARS[0])} size={72} ring />
        <div className="pf-main">
          <input
            className="name-input"
            value={s.profile.name}
            maxLength={16}
            onChange={(e) =>
              update((st) => {
                st.profile.name = e.target.value;
              })
            }
            aria-label="Votre nom"
          />
          <span className="muted">
            Niveau {lvl.level} · {s.stats.rating} Elo · {s.stats.played} parties
          </span>
        </div>
      </section>
      <div className="avatar-picker">
        {AVATARS.map((a, i) => (
          <button
            key={i}
            type="button"
            className={s.profile.avatar === i ? 'on' : ''}
            onClick={() =>
              update((st) => {
                st.profile.avatar = i;
              })
            }
          >
            <Avatar {...a} size={46} />
          </button>
        ))}
      </div>

      <h4 className="section-title">Échiquier</h4>
      <div className="theme-picker">
        {THEMES.map((t) => (
          <button key={t.id} type="button" className={s.settings.boardTheme === t.id ? 'on' : ''} onClick={() => set('boardTheme')(t.id)}>
            <span className="tp-img" style={{ backgroundImage: `url(${boardUrl(t.id)})` }} />
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      <section className="card settings-list">
        <Toggle icon="eye" label="Afficher les coups possibles" checked={s.settings.showLegal} onChange={set('showLegal')} />
        <Toggle icon="info" label="Coordonnées sur l'échiquier" checked={s.settings.showCoords} onChange={set('showCoords')} />
        <Toggle icon="bolt" label="Animations des pièces" checked={s.settings.animations} onChange={set('animations')} />
      </section>

      <h4 className="section-title">Sons & vibrations</h4>
      <section className="card settings-list">
        <Toggle icon="sound" label="Sons" checked={s.settings.sound} onChange={(v) => { set('sound')(v); if (v) setTimeout(() => play('move'), 50); }} />
        <Toggle icon="vibrate" label="Vibrations" checked={s.settings.haptics} onChange={set('haptics')} />
      </section>

      <section className="card about">
        <h4>À propos</h4>
        <p>
          Échec & Mat est une application <b>100 % gratuite</b>, sans publicité ni achat intégré. Le moteur d'échecs est{' '}
          <b>Stockfish</b> (licence GPL v3), il fonctionne entièrement hors ligne sur votre téléphone.
        </p>
        <button type="button" className="btn danger ghost" onClick={() => setConfirmReset(true)}>
          <Icon name="trash" size={18} /> Réinitialiser mes statistiques
        </button>
      </section>
      <div className="bottom-spacer" />

      <Confirm
        open={confirmReset}
        title="Tout réinitialiser ?"
        text="Classement, historique, puzzles résolus et XP seront effacés."
        confirmLabel="Réinitialiser"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAll();
          setConfirmReset(false);
        }}
      />
    </div>
  );
}
