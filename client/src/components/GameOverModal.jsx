import { Modal, CountUp, Avatar } from './ui';
import Icon from './Icons';
import { REASONS } from '../lib/chessUtil';
import { levelFromXp, useStore } from '../lib/store';
import Confetti from './Confetti';

export default function GameOverModal({ open, result, perspective, names, bot, reward, onClose, onRematch, onSwap, onHome }) {
  const xp = useStore((s) => s.stats.xp);
  if (!result) return null;
  let title;
  let kind;
  if (perspective) {
    if (result.winner == null) {
      title = 'Partie nulle';
      kind = 'draw';
    } else if (result.winner === perspective) {
      title = 'Victoire !';
      kind = 'win';
    } else {
      title = 'Défaite';
      kind = 'loss';
    }
  } else if (result.winner == null) {
    title = 'Partie nulle';
    kind = 'draw';
  } else {
    title = `${names ? names[result.winner] : result.winner === 'w' ? 'Les blancs' : 'Les noirs'} gagne !`;
    kind = 'win';
  }
  const lvl = levelFromXp(xp);
  const winnerPiece = result.winner === 'b' ? 'bk' : 'wk';

  return (
    <Modal open={open} onClose={onClose} className={`gameover ${kind}`}>
      {open && kind === 'win' && <Confetti />}
      <div className="go-hero">
        <div className="go-glow" />
        <Avatar piece={kind === 'loss' && bot ? bot.piece : winnerPiece} hue={kind === 'loss' ? 0 : kind === 'draw' ? 210 : 45} size={96} ring />
      </div>
      <h2 className="go-title">{title}</h2>
      <p className="go-reason">{REASONS[result.reason] ? `${result.winner == null ? 'Nulle' : kind === 'loss' ? 'Perdu' : 'Gagné'} ${REASONS[result.reason]}` : ''}</p>

      {reward && (
        <div className="go-rewards">
          {reward.delta != null && (
            <div className={`go-chip ${reward.delta >= 0 ? 'up' : 'down'}`}>
              <Icon name="trophy" size={18} />
              <span>
                {reward.delta >= 0 ? '+' : '−'}
                <CountUp to={Math.abs(reward.delta)} /> Elo
              </span>
            </div>
          )}
          <div className="go-chip xp">
            <Icon name="star" size={18} />
            <span>
              +<CountUp to={reward.xp} /> XP
            </span>
          </div>
        </div>
      )}
      <div className="go-level">
        <div className="go-level-top">
          <span>Niveau {lvl.level}</span>
          <span>
            {lvl.current}/{lvl.need} XP
          </span>
        </div>
        <div className="xp-bar">
          <i style={{ width: `${(lvl.current / lvl.need) * 100}%` }} />
        </div>
        {reward?.levelUp && <div className="level-up">Niveau {reward.levelUp} atteint ! 🎉</div>}
      </div>

      <div className="go-actions">
        <button type="button" className="btn primary big" onClick={onRematch}>
          <Icon name="refresh" size={20} /> Rejouer
        </button>
        {onSwap && (
          <button type="button" className="btn ghost" onClick={onSwap}>
            <Icon name="flip" size={18} /> Changer de couleur
          </button>
        )}
        <div className="go-row">
          <button type="button" className="btn ghost" onClick={onClose}>
            <Icon name="eye" size={18} /> Revoir
          </button>
          <button type="button" className="btn ghost" onClick={onHome}>
            <Icon name="home" size={18} /> Accueil
          </button>
        </div>
      </div>
    </Modal>
  );
}
