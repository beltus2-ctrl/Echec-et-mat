import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from '../components/Board';
import Icon from '../components/Icons';
import { PlayerBar, Confirm, AVATARS } from '../components/ui';
import MoveList from '../components/MoveList';
import GameOverModal from '../components/GameOverModal';
import { BOTS, botMove, hintMove, engine, uciToMove } from '../lib/engine';
import { capturedFromFen, gameOverInfo, kingSquare } from '../lib/chessUtil';
import { moveFeedback, play, vibrate } from '../lib/feedback';
import { getState, update, useStore, eloDelta, levelFromXp } from '../lib/store';

function buildFromMoves(moves) {
  const chess = new Chess();
  const fens = [chess.fen()];
  const verbose = [];
  for (const san of moves) {
    const m = chess.move(san);
    verbose.push(m);
    fens.push(chess.fen());
  }
  return { chess, fens, verbose };
}

export default function GameScreen({ config, resume, onExit, onRematch }) {
  const profile = useStore((s) => s.profile);
  const settings = useStore((s) => s.settings);
  const isAi = config.mode === 'ai';
  const bot = isAi ? BOTS.find((b) => b.level === config.level) : null;
  const botColor = isAi ? (config.playerColor === 'w' ? 'b' : 'w') : null;

  const initial = useMemo(() => buildFromMoves(resume?.moves || []), [resume]);
  const chessRef = useRef(initial.chess);
  const [fens, setFens] = useState(initial.fens);
  const [moves, setMoves] = useState(initial.verbose);
  const [viewIndex, setViewIndex] = useState(null);
  const [result, setResult] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [flip, setFlip] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [showOver, setShowOver] = useState(false);
  const [reward, setReward] = useState(null);
  const [toast, setToast] = useState(null);
  const [clocks, setClocks] = useState(() =>
    config.time ? resume?.clocks || { w: config.time.base * 60000, b: config.time.base * 60000 } : null,
  );
  const clockRef = useRef(clocks);
  clockRef.current = clocks;

  const fen = fens[fens.length - 1];
  const turn = fen.split(' ')[1];
  const shownFen = viewIndex == null ? fen : fens[viewIndex];
  const shownMove = viewIndex == null ? moves[moves.length - 1] : moves[viewIndex - 1];

  const humanTurn = !result && (!isAi || turn === config.playerColor);
  const baseOrientation = isAi ? config.playerColor : config.autoFlip ? turn : 'w';
  const orientation = flip ? (baseOrientation === 'w' ? 'b' : 'w') : baseOrientation;

  const showToast = useCallback((text) => {
    setToast({ text, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- persistence of the ongoing game ----
  const saveProgress = useCallback(
    (mv, ck) => {
      update((s) => {
        s.saved = { config, moves: mv.map((m) => m.san), clocks: ck, ts: Date.now() };
      });
    },
    [config],
  );

  const finish = useCallback(
    (res) => {
      setResult(res);
      setThinking(false);
      engine.stop();
      const st = getState();
      const pc = isAi ? config.playerColor : null;
      let score = null;
      if (isAi) score = res.winner == null ? 0.5 : res.winner === pc ? 1 : 0;
      const delta = isAi ? eloDelta(st.stats.rating, bot.elo, score, 32) : 0;
      const xpGain = isAi ? (score === 1 ? 40 + bot.level * 10 : score === 0.5 ? 25 : 10) : 15;
      const beforeLevel = levelFromXp(st.stats.xp).level;
      update((s) => {
        s.saved = null;
        s.stats.xp += xpGain;
        if (isAi) {
          s.stats.played++;
          if (score === 1) {
            s.stats.won++;
            s.stats.streak++;
            s.stats.bestStreak = Math.max(s.stats.bestStreak, s.stats.streak);
          } else if (score === 0) {
            s.stats.lost++;
            s.stats.streak = 0;
          } else s.stats.drawn++;
          s.stats.rating = Math.max(100, s.stats.rating + delta);
          s.stats.ratingHistory = [...s.stats.ratingHistory, s.stats.rating].slice(-40);
        }
        const names = isAi
          ? { [pc]: s.profile.name, [pc === 'w' ? 'b' : 'w']: `${bot.name} (niv. ${bot.level})` }
          : config.names;
        s.history = [
          {
            id: Date.now(),
            mode: config.mode,
            ts: Date.now(),
            names: { w: names.w, b: names.b },
            playerColor: pc,
            winner: res.winner,
            reason: res.reason,
            moves: chessRef.current.history(),
            ratingDelta: isAi ? delta : null,
          },
          ...s.history,
        ].slice(0, 60);
      });
      const afterLevel = levelFromXp(getState().stats.xp).level;
      setReward({ delta: isAi ? delta : null, xp: xpGain, levelUp: afterLevel > beforeLevel ? afterLevel : null });
      if (isAi) play(score === 1 ? 'win' : score === 0 ? 'lose' : 'draw');
      else play(res.winner ? 'win' : 'draw');
      vibrate(isAi && score === 0 ? 'error' : 'success');
      setTimeout(() => setShowOver(true), res.reason === 'checkmate' ? 900 : 300);
    },
    [isAi, bot, config],
  );

  const applyMove = useCallback(
    (mv) => {
      const chess = chessRef.current;
      let move;
      try {
        move = chess.move(mv);
      } catch {
        return false;
      }
      if (!move) return false;
      moveFeedback(move, chess);
      setHint(null);
      setViewIndex(null);
      const newMoves = chess.history({ verbose: true });
      const newFen = chess.fen();
      setMoves(newMoves);
      setFens((f) => [...f, newFen]);
      let ck = clockRef.current;
      if (ck && config.time.inc) {
        ck = { ...ck, [move.color]: ck[move.color] + config.time.inc * 1000 };
        setClocks(ck);
      }
      const over = gameOverInfo(chess);
      if (over.over) finish(over);
      else saveProgress(newMoves, ck);
      return true;
    },
    [config.time, finish, saveProgress],
  );

  // ---- bot ----
  useEffect(() => {
    if (!isAi || result || turn !== botColor) return;
    let cancelled = false;
    setThinking(true);
    const started = Date.now();
    const fenAtStart = fen;
    botMove(fenAtStart, bot)
      .then((uci) => {
        if (cancelled || !uci) return;
        const wait = Math.max(0, 450 + Math.random() * 350 - (Date.now() - started));
        setTimeout(() => {
          if (cancelled || chessRef.current.fen() !== fenAtStart) return;
          setThinking(false);
          applyMove(uciToMove(uci));
        }, wait);
      })
      .catch(() => {
        if (!cancelled) {
          setThinking(false);
          showToast("Le moteur n'a pas pu démarrer");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAi, result, turn, botColor, fen, bot, applyMove, showToast]);

  useEffect(() => () => engine.stop(), []);

  // ---- clocks ----
  useEffect(() => {
    if (!config.time || result || moves.length === 0) return;
    let last = performance.now();
    let warned = false;
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      const side = chessRef.current.turn();
      const prev = clockRef.current;
      const left = prev[side] - dt;
      if (left <= 0) {
        setClocks({ ...prev, [side]: 0 });
        finish({ over: true, winner: side === 'w' ? 'b' : 'w', reason: 'timeout' });
        return;
      }
      if (left < 10000 && !warned && prev[side] >= 10000) {
        warned = true;
        play('lowtime');
      }
      setClocks({ ...prev, [side]: left });
    }, 100);
    return () => clearInterval(id);
  }, [config.time, result, moves.length, finish]);

  // ---- actions ----
  function onUserMove(mv) {
    if (!humanTurn || viewIndex != null) return false;
    return applyMove(mv);
  }

  function undo() {
    if (result || moves.length === 0) return;
    const chess = chessRef.current;
    engine.stop();
    setThinking(false);
    let n = 1;
    if (isAi) {
      n = turn === config.playerColor ? 2 : 1;
      if (moves.length < n) n = moves.length;
      // If the player is black and only the bot's first move remains, nothing to undo.
      if (turn === config.playerColor && moves.length === 1) return;
    }
    for (let i = 0; i < n; i++) chess.undo();
    const nm = chess.history({ verbose: true });
    setMoves(nm);
    setFens((f) => f.slice(0, f.length - n));
    setHint(null);
    setViewIndex(null);
    play('tap');
    saveProgress(nm, clockRef.current);
  }

  async function askHint() {
    if (!humanTurn || hintLoading) return;
    setHintLoading(true);
    try {
      const res = await hintMove(fen);
      if (res && chessRef.current.fen() === fen) {
        setHint(uciToMove(res.bestmove));
        play('notify');
      }
    } catch {
      showToast('Indice indisponible');
    }
    setHintLoading(false);
  }

  async function offerDraw() {
    if (result) return;
    if (!isAi) {
      setConfirm('draw');
      return;
    }
    if (moves.length < 20) {
      showToast(`${bot.name} refuse : la partie ne fait que commencer.`);
      return;
    }
    const res = await engine.run(fen, 'depth 10', ['setoption name Skill Level value 20']);
    const cp = res?.info?.mate != null ? (res.info.mate > 0 ? 1000 : -1000) : res?.info?.cp ?? 0;
    // score is from the side to move's point of view
    const botScore = turn === botColor ? cp : -cp;
    if (botScore <= 30) {
      finish({ over: true, winner: null, reason: 'agreement' });
    } else {
      showToast(`${bot.name} refuse la nulle.`);
      play('error');
    }
  }

  const { captured, diff } = capturedFromFen(shownFen);
  const shownChess = useMemo(() => new Chess(shownFen), [shownFen]);
  const checkSq = shownChess.isCheck() ? kingSquare(shownChess, shownChess.turn()) : null;

  const topColor = orientation === 'w' ? 'b' : 'w';
  const bottomColor = orientation;
  const playerInfo = (c) => {
    if (isAi) {
      if (c === config.playerColor) {
        const av = AVATARS[profile.avatar] || AVATARS[0];
        return { name: profile.name, subtitle: `${getState().stats.rating} Elo`, avatar: av };
      }
      return { name: bot.name, subtitle: `${bot.title} · ${bot.elo}`, avatar: { piece: bot.piece, hue: bot.hue } };
    }
    return {
      name: config.names[c],
      subtitle: c === 'w' ? 'Blancs' : 'Noirs',
      avatar: c === 'w' ? { piece: 'wk', hue: 40 } : { piece: 'bk', hue: 220 },
    };
  };
  const bar = (c) => {
    const info = playerInfo(c);
    return (
      <PlayerBar
        {...info}
        color={c}
        captured={captured[c === 'w' ? 'b' : 'w']}
        diff={c === 'w' ? diff : -diff}
        clock={clocks ? clocks[c] : null}
        lowTime={clocks && clocks[c] < 20000}
        active={!result && turn === c}
        thinking={isAi && thinking && c === botColor}
      />
    );
  };

  let status;
  if (result) status = { text: 'Partie terminée', kind: 'over' };
  else if (viewIndex != null) status = { text: 'Revue des coups — touchez ▶▶ pour revenir', kind: 'review' };
  else if (isAi && turn === botColor) status = { text: `${bot.name} réfléchit…`, kind: 'wait' };
  else if (chessRef.current.isCheck()) status = { text: 'Échec ! Protégez votre roi', kind: 'check' };
  else if (isAi) status = { text: `À vous de jouer avec les ${config.playerColor === 'w' ? 'blancs' : 'noirs'}`, kind: 'you' };
  else status = { text: `Au tour de ${config.names[turn]} (${turn === 'w' ? 'blancs' : 'noirs'})`, kind: 'you' };

  const title = isAi ? `Contre ${bot.name}` : 'Deux joueurs';

  return (
    <div className="screen game-screen">
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={() => (result || moves.length === 0 ? onExit() : setConfirm('exit'))} aria-label="Retour">
          <Icon name="back" />
        </button>
        <div className="topbar-title">
          <span>{title}</span>
          <small>{isAi ? `Niveau ${bot.level} · ${bot.title}` : config.time ? `${config.time.base} min + ${config.time.inc} s` : 'Sans limite de temps'}</small>
        </div>
        <button type="button" className="icon-btn" onClick={() => setFlip((f) => !f)} aria-label="Retourner l'échiquier">
          <Icon name="flip" />
        </button>
      </header>

      <div className="game-area">
        {bar(topColor)}
        <Board
          fen={shownFen}
          orientation={orientation}
          movable={viewIndex == null && humanTurn ? turn : null}
          onMove={onUserMove}
          lastMove={shownMove ? { from: shownMove.from, to: shownMove.to } : null}
          hint={viewIndex == null ? hint : null}
          check={checkSq}
        />
        {bar(bottomColor)}
      </div>

      <div className={`status-banner ${status.kind}`}>
        <Icon name={status.kind === 'check' ? 'bolt' : status.kind === 'wait' ? 'cpu' : 'info'} size={18} />
        <span>{status.text}</span>
      </div>

      <MoveList moves={moves} viewIndex={viewIndex} onSelect={setViewIndex} />

      <nav className="action-bar">
        {result ? (
          <>
            <button type="button" onClick={onExit}>
              <Icon name="home" />
              <span>Accueil</span>
            </button>
            <button type="button" onClick={() => setShowOver(true)}>
              <Icon name="trophy" />
              <span>Résultat</span>
            </button>
            <button type="button" className="accent" onClick={() => onRematch(config)}>
              <Icon name="refresh" />
              <span>Rejouer</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setConfirm('resign')}>
              <Icon name="flag" />
              <span>Abandon</span>
            </button>
            <button type="button" onClick={offerDraw}>
              <Icon name="handshake" />
              <span>Nulle</span>
            </button>
            <button type="button" onClick={undo} disabled={moves.length === 0}>
              <Icon name="undo" />
              <span>Annuler</span>
            </button>
            <button type="button" className="accent" onClick={askHint} disabled={!humanTurn}>
              <span className="bulb-wrap">
                <Icon name="bulb" />
                {hintLoading && <span className="spinner sm" />}
              </span>
              <span>Indice</span>
            </button>
          </>
        )}
      </nav>

      {toast && (
        <div className="toast" key={toast.key}>
          {toast.text}
        </div>
      )}

      <Confirm
        open={confirm === 'resign'}
        title="Abandonner la partie ?"
        text={isAi ? `${bot.name} remportera la partie.` : `${config.names[turn]} abandonne : ${config.names[turn === 'w' ? 'b' : 'w']} gagne.`}
        confirmLabel="Abandonner"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          const loser = isAi ? config.playerColor : turn;
          finish({ over: true, winner: loser === 'w' ? 'b' : 'w', reason: 'resign' });
        }}
      />
      <Confirm
        open={confirm === 'draw'}
        title="Partie nulle ?"
        text="Les deux joueurs sont-ils d'accord pour une nulle ?"
        confirmLabel="Oui, nulle"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          finish({ over: true, winner: null, reason: 'agreement' });
        }}
      />
      <Confirm
        open={confirm === 'exit'}
        title="Quitter la partie ?"
        text="Votre partie est sauvegardée : vous pourrez la reprendre depuis l'accueil."
        confirmLabel="Quitter"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          onExit();
        }}
      />

      <GameOverModal
        open={showOver}
        result={result}
        perspective={isAi ? config.playerColor : null}
        names={isAi ? null : config.names}
        bot={bot}
        reward={reward}
        settings={settings}
        onClose={() => setShowOver(false)}
        onRematch={() => onRematch(config)}
        onSwap={isAi ? () => onRematch({ ...config, playerColor: config.playerColor === 'w' ? 'b' : 'w' }) : null}
        onHome={onExit}
      />
    </div>
  );
}
