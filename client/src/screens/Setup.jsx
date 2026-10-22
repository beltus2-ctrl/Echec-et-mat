import { useState } from 'react';
import Icon from '../components/Icons';
import { Avatar, Segmented, Toggle } from '../components/ui';
import { BOTS } from '../lib/engine';
import { pieceUrl } from '../lib/chessUtil';
import { useStore, update } from '../lib/store';
import { play } from '../lib/feedback';

function ScreenHeader({ title, subtitle, onBack }) {
  return (
    <header className="topbar">
      <button type="button" className="icon-btn" onClick={onBack} aria-label="Retour">
        <Icon name="back" />
      </button>
      <div className="topbar-title">
        <span>{title}</span>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <span className="icon-btn ghost" />
    </header>
  );
}

export { ScreenHeader };

const COLOR_OPTIONS = [
  { value: 'w', label: 'Blancs', icon: <img src={pieceUrl('w', 'k')} alt="" className="seg-piece" /> },
  { value: 'r', label: 'Hasard', icon: <span className="seg-random">?</span> },
  { value: 'b', label: 'Noirs', icon: <img src={pieceUrl('b', 'k')} alt="" className="seg-piece" /> },
];

export function AiSetup({ onBack, onStart }) {
  const last = useStore((s) => s.lastAi) || { level: 2, color: 'w' };
  const rating = useStore((s) => s.stats.rating);
  const [level, setLevel] = useState(last.level);
  const [color, setColor] = useState(last.color);
  const bot = BOTS.find((b) => b.level === level);

  function start() {
    update((s) => {
      s.lastAi = { level, color };
    });
    const playerColor = color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    onStart({ mode: 'ai', level, playerColor });
  }

  return (
    <div className="screen setup">
      <ScreenHeader title="Contre l'ordinateur" subtitle={`Votre classement : ${rating}`} onBack={onBack} />

      <div className="bot-hero" style={{ '--hue': bot.hue }}>
        <div className="bh-glow" />
        <img src={pieceUrl(bot.piece[0], bot.piece[1])} alt="" className="bh-piece" key={bot.level} />
        <div className="bh-info">
          <span className="bh-level">Niveau {bot.level}</span>
          <h2>{bot.name}</h2>
          <span className="bh-title">
            {bot.title} · <b>{bot.elo}</b> Elo
          </span>
        </div>
      </div>

      <div className="bot-grid">
        {BOTS.map((b) => (
          <button
            key={b.level}
            type="button"
            className={`bot-tile ${b.level === level ? 'on' : ''}`}
            onClick={() => {
              setLevel(b.level);
              play('tap');
            }}
          >
            <Avatar piece={b.piece} hue={b.hue} size={46} />
            <span className="bt-name">{b.name}</span>
            <span className="bt-elo">{b.elo}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <h4 className="field-label">Vous jouez avec</h4>
        <Segmented options={COLOR_OPTIONS} value={color} onChange={setColor} />
      </div>

      <div className="sticky-cta">
        <button type="button" className="btn primary big" onClick={start}>
          <Icon name="play" fill size={18} /> Jouer contre {bot.name}
        </button>
      </div>
    </div>
  );
}

const TIMES = [
  { value: 'none', label: '∞', time: null },
  { value: '3+2', label: '3+2', time: { base: 3, inc: 2 } },
  { value: '5', label: '5 min', time: { base: 5, inc: 0 } },
  { value: '10', label: '10 min', time: { base: 10, inc: 0 } },
  { value: '15+10', label: '15+10', time: { base: 15, inc: 10 } },
];

export function LocalSetup({ onBack, onStart }) {
  const profileName = useStore((s) => s.profile.name);
  const last = useStore((s) => s.lastLocal);
  const autoFlipDefault = useStore((s) => s.settings.autoFlip);
  const [white, setWhite] = useState(last?.white || profileName);
  const [black, setBlack] = useState(last?.black || 'Invité');
  const [time, setTime] = useState(last?.time || 'none');
  const [autoFlip, setAutoFlip] = useState(autoFlipDefault);

  function start() {
    update((s) => {
      s.lastLocal = { white, black, time };
      s.settings.autoFlip = autoFlip;
    });
    onStart({
      mode: 'local',
      names: { w: white.trim() || 'Blancs', b: black.trim() || 'Noirs' },
      time: TIMES.find((t) => t.value === time).time,
      autoFlip,
    });
  }

  return (
    <div className="screen setup">
      <ScreenHeader title="Deux joueurs" subtitle="Sur le même téléphone" onBack={onBack} />

      <div className="versus">
        <div className="vs-player">
          <img src={pieceUrl('w', 'k')} alt="" />
          <input value={white} onChange={(e) => setWhite(e.target.value)} maxLength={16} aria-label="Nom du joueur blanc" />
          <small>Blancs</small>
        </div>
        <button
          type="button"
          className="vs-swap"
          onClick={() => {
            setWhite(black);
            setBlack(white);
            play('tap');
          }}
          aria-label="Échanger les couleurs"
        >
          <span>VS</span>
          <Icon name="flip" size={16} />
        </button>
        <div className="vs-player">
          <img src={pieceUrl('b', 'k')} alt="" />
          <input value={black} onChange={(e) => setBlack(e.target.value)} maxLength={16} aria-label="Nom du joueur noir" />
          <small>Noirs</small>
        </div>
      </div>

      <div className="card">
        <h4 className="field-label">
          <Icon name="clock" size={16} /> Cadence
        </h4>
        <Segmented options={TIMES} value={time} onChange={setTime} />
      </div>

      <div className="card">
        <Toggle
          icon="flip"
          label="Retourner l'échiquier à chaque coup"
          hint="Pratique quand on se passe le téléphone"
          checked={autoFlip}
          onChange={setAutoFlip}
        />
      </div>

      <div className="sticky-cta">
        <button type="button" className="btn primary big" onClick={start}>
          <Icon name="play" fill size={18} /> Commencer la partie
        </button>
      </div>
    </div>
  );
}
