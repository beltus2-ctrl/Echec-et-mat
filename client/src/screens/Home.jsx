import { useStore, levelFromXp } from '../lib/store';
import { Avatar, AVATARS, RatingChart } from '../components/ui';
import Icon, { Crown } from '../components/Icons';
import { pieceUrl, boardUrl } from '../lib/chessUtil';
import { BOTS } from '../lib/engine';
import { PUZZLES, dailyPuzzle } from '../lib/puzzles';

export default function Home({ go }) {
  const s = useStore();
  const { profile, stats, saved, settings } = s;
  const lvl = levelFromXp(stats.xp);
  const av = AVATARS[profile.avatar] || AVATARS[0];
  const daily = dailyPuzzle();
  const dailyDone = !!s.puzzles.solved[daily.id];
  const solvedCount = Object.keys(s.puzzles.solved).length;
  const winRate = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  const savedBot = saved?.config?.mode === 'ai' ? BOTS.find((b) => b.level === saved.config.level) : null;

  return (
    <div className="screen home">
      <header className="home-header">
        <button type="button" className="profile-chip" onClick={() => go('settings')}>
          <Avatar {...av} size={54} online />
          <div className="pc-text">
            <div className="pc-level">
              NIVEAU {lvl.level} <Icon name="star" size={16} />
            </div>
            <div className="xp-bar">
              <i style={{ width: `${(lvl.current / lvl.need) * 100}%` }} />
            </div>
            <div className="pc-xp">
              {lvl.current}/{lvl.need} XP
            </div>
          </div>
        </button>

        <button type="button" className={`orb ${dailyDone ? 'done' : ''}`} onClick={() => go('puzzle', { id: daily.id })}>
          <span className="orb-floor" />
          <span className="orb-ring" />
          <span className="orb-label">
            {dailyDone ? (
              <>
                DÉFI
                <br />
                RÉUSSI
              </>
            ) : (
              <>
                DÉFI DU
                <br />
                JOUR
              </>
            )}
          </span>
        </button>

        <div className="rating-chip" title="Votre classement Elo">
          <span className="crown-bubble">
            <Crown size={30} />
          </span>
          <span className="rating-num">{stats.rating}</span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-board" style={{ backgroundImage: `url(${boardUrl(settings.boardTheme)})` }} />
        <div className="hero-fade" />
        <img className="hero-piece hp-k" src={pieceUrl('w', 'k')} alt="" />
        <img className="hero-piece hp-q" src={pieceUrl('b', 'q')} alt="" />
        <img className="hero-piece hp-n" src={pieceUrl('w', 'n')} alt="" />
        <div className="hero-text">
          <h1>
            Échec <span>&</span> Mat
          </h1>
          <p>Bonjour {profile.name}, prêt pour une partie ?</p>
        </div>
      </section>

      {saved && (
        <button type="button" className="resume-card" onClick={() => go('game', { config: saved.config, resume: saved })}>
          <div className="rc-icon">
            <Icon name="play" fill size={22} />
          </div>
          <div className="rc-text">
            <strong>Reprendre la partie</strong>
            <span>
              {savedBot ? `Contre ${savedBot.name} · niveau ${savedBot.level}` : 'Deux joueurs'} · {saved.moves.length} coup{saved.moves.length > 1 ? 's' : ''} joué{saved.moves.length > 1 ? 's' : ''}
            </span>
          </div>
          <Icon name="next" />
        </button>
      )}

      <section className="modes">
        <button type="button" className="mode-card m-ai" onClick={() => go('ai-setup')}>
          <img src={pieceUrl('b', 'k')} alt="" className="mc-piece" />
          <div className="mc-text">
            <span className="mc-kicker">
              <Icon name="cpu" size={15} /> Hors ligne
            </span>
            <strong>Contre l'ordinateur</strong>
            <span>8 niveaux, du débutant au grand maître</span>
          </div>
        </button>
        <button type="button" className="mode-card m-local" onClick={() => go('local-setup')}>
          <img src={pieceUrl('w', 'q')} alt="" className="mc-piece" />
          <div className="mc-text">
            <span className="mc-kicker">
              <Icon name="users" size={15} /> Même téléphone
            </span>
            <strong>Deux joueurs</strong>
            <span>Affrontez un proche face à face</span>
          </div>
        </button>
        <button type="button" className="mode-card m-online" onClick={() => go('online')}>
          <img src={pieceUrl('w', 'n')} alt="" className="mc-piece" />
          <div className="mc-text">
            <span className="mc-kicker">
              <Icon name="globe" size={15} /> En ligne
            </span>
            <strong>Inviter un ami</strong>
            <span>Jouez à distance avec un code</span>
          </div>
        </button>
        <button type="button" className="mode-card m-puzzle" onClick={() => go('puzzles')}>
          <img src={pieceUrl('b', 'n')} alt="" className="mc-piece" />
          <div className="mc-text">
            <span className="mc-kicker">
              <Icon name="puzzle" size={15} /> {solvedCount}/{PUZZLES.length} résolus
            </span>
            <strong>Puzzles</strong>
            <span>Trouvez l'échec et mat</span>
          </div>
        </button>
      </section>

      <section className="card stats-card">
        <div className="card-head">
          <h3>Classement progrès</h3>
          <span className="muted">{stats.rating} Elo</span>
        </div>
        <RatingChart data={stats.ratingHistory} />
        <div className="stat-row">
          <div>
            <strong>{stats.played}</strong>
            <span>Parties</span>
          </div>
          <div>
            <strong>{winRate}%</strong>
            <span>Victoires</span>
          </div>
          <div>
            <strong>{stats.streak}</strong>
            <span>Série</span>
          </div>
          <div>
            <strong>{s.puzzles.rating}</strong>
            <span>Puzzles</span>
          </div>
        </div>
      </section>
      <div className="bottom-spacer" />
    </div>
  );
}
