import { useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from '../components/Board';
import Icon from '../components/Icons';
import { PUZZLES, nextPuzzle } from '../lib/puzzles';
import { kingSquare, pieceUrl } from '../lib/chessUtil';
import { moveFeedback, play, vibrate } from '../lib/feedback';
import { getState, update, eloDelta } from '../lib/store';
import { uciToMove } from '../lib/engine';
import Confetti from '../components/Confetti';

export default function PuzzleScreen({ id, onExit, onOpen }) {
  const puzzle = PUZZLES.find((p) => p.id === id) || PUZZLES[0];
  const side = puzzle.fen.split(' ')[1];
  const chessRef = useRef(new Chess(puzzle.fen));
  const [fen, setFen] = useState(puzzle.fen);
  const [step, setStep] = useState(0);
  const [lastMove, setLastMove] = useState(null);
  const [state, setState] = useState('play'); // play | wrong | solved
  const [failed, setFailed] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [flash, setFlash] = useState(null);
  const [shake, setShake] = useState(0);
  const [gain, setGain] = useState(null);
  const [locked, setLocked] = useState(false);

  const expected = uciToMove(puzzle.moves[step]);
  const isLastUserMove = step === puzzle.moves.length - 1;

  function solve() {
    setState('solved');
    play('win');
    vibrate('success');
    const already = !!getState().puzzles.solved[puzzle.id];
    let delta = 0;
    if (!failed && hintLevel === 0 && !already) delta = eloDelta(getState().puzzles.rating, puzzle.rating, 1, 24);
    const xp = already ? 0 : failed || hintLevel ? 8 : 15;
    update((s) => {
      s.puzzles.solved[puzzle.id] = true;
      s.puzzles.rating = Math.max(100, s.puzzles.rating + delta);
      s.puzzles.streak = failed ? 0 : s.puzzles.streak + 1;
      s.stats.xp += xp;
    });
    setGain({ delta, xp });
  }

  function onMove(mv) {
    if (state !== 'play' || locked) return false;
    const chess = chessRef.current;
    let move;
    try {
      move = chess.move(mv);
    } catch {
      return false;
    }
    const correct =
      (move.from === expected.from && move.to === expected.to && (!expected.promotion || move.promotion === expected.promotion)) ||
      (isLastUserMove && chess.isCheckmate());
    setFen(chess.fen());
    setLastMove({ from: move.from, to: move.to });
    if (!correct) {
      moveFeedback(move, chess);
      setLocked(true);
      setFailed(true);
      setState('wrong');
      setTimeout(() => {
        play('error');
        vibrate('error');
        setFlash({ square: move.to, kind: 'error', key: Date.now() });
        setShake((s) => s + 1);
      }, 150);
      setTimeout(() => {
        chess.undo();
        setFen(chess.fen());
        const prev = chess.history({ verbose: true }).pop();
        setLastMove(prev ? { from: prev.from, to: prev.to } : null);
        setState('play');
        setLocked(false);
      }, 1100);
      return true;
    }
    moveFeedback(move, chess);
    setHintLevel(0);
    if (chess.isCheckmate()) {
      setFlash({ square: kingSquare(chess, chess.turn()), kind: 'success', key: Date.now() });
      setTimeout(solve, 350);
      return true;
    }
    // opponent reply
    setLocked(true);
    setTimeout(() => {
      const reply = uciToMove(puzzle.moves[step + 1]);
      const r = chess.move(reply);
      moveFeedback(r, chess);
      setFen(chess.fen());
      setLastMove({ from: r.from, to: r.to });
      setStep(step + 2);
      setLocked(false);
    }, 550);
    return true;
  }

  function hint() {
    if (state !== 'play') return;
    play('notify');
    setFailed(true);
    if (hintLevel === 0) {
      setHintLevel(1);
      setFlash({ square: expected.from, kind: 'hint', key: Date.now() });
    } else {
      setHintLevel(2);
    }
  }

  function showSolution() {
    if (state === 'solved') return;
    setFailed(true);
    setHintLevel(2);
  }

  const chess = useMemo(() => new Chess(fen), [fen]);
  const check = chess.isCheck() ? kingSquare(chess, chess.turn()) : null;
  const next = nextPuzzle(puzzle.id, getState().puzzles.solved);
  const idx = PUZZLES.filter((p) => p.mate === puzzle.mate).findIndex((p) => p.id === puzzle.id) + 1;

  const sideLabel = side === 'w' ? 'les blancs' : 'les noirs';
  let banner;
  if (state === 'solved') banner = { kind: 'solved', text: 'Bravo ! Échec et mat trouvé' };
  else if (state === 'wrong') banner = { kind: 'wrong', text: "Ce n'est pas le bon coup… réessayez" };
  else if (step > 0) banner = { kind: 'progress', text: `Bien joué ! Continuez : mat en ${puzzle.mate - step / 2}` };
  else banner = { kind: 'play', text: `Trouver l'échec et mat pour ${sideLabel}` };

  return (
    <div className="screen puzzle-screen">
      {state === 'solved' && <Confetti count={90} />}
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onExit} aria-label="Retour">
          <Icon name="back" />
        </button>
        <div className="topbar-title">
          <span>
            Mat en {puzzle.mate} · n°{idx}
          </span>
          <small>Classement puzzle {getState().puzzles.rating}</small>
        </div>
        <div className="puzzle-side">
          <img src={pieceUrl(side, 'k')} alt={side === 'w' ? 'Blancs' : 'Noirs'} />
        </div>
      </header>

      <div className="puzzle-top">
        <div className="pt-badge">
          <Icon name="puzzle" size={16} /> {puzzle.mate === 1 ? 'Un coup' : `${puzzle.mate} coups`}
        </div>
        <div className="pt-dots">
          {Array.from({ length: puzzle.mate }, (_, i) => (
            <i key={i} className={i < step / 2 || state === 'solved' ? 'on' : ''} />
          ))}
        </div>
      </div>

      <div className="game-area">
        <Board
          fen={fen}
          orientation={side}
          movable={state === 'play' && !locked ? side : null}
          onMove={onMove}
          lastMove={lastMove}
          hint={hintLevel >= 2 && state === 'play' ? expected : null}
          flash={flash}
          check={check}
          shake={shake}
        />
      </div>

      <div className={`puzzle-banner ${banner.kind}`}>
        <span className="pb-icon">
          <Icon name={banner.kind === 'solved' ? 'check' : banner.kind === 'wrong' ? 'close' : 'info'} size={20} stroke={2.4} />
        </span>
        <span>{banner.text}</span>
      </div>

      {state === 'solved' && gain && (
        <div className="puzzle-reward">
          {gain.delta > 0 && <span className="go-chip up">+{gain.delta} classement</span>}
          {gain.xp > 0 && <span className="go-chip xp">+{gain.xp} XP</span>}
          {gain.delta === 0 && gain.xp === 0 && <span className="go-chip">Déjà résolu</span>}
        </div>
      )}

      <nav className="action-bar">
        <button type="button" onClick={onExit}>
          <Icon name="exit" />
          <span>Quitter</span>
        </button>
        {state === 'solved' ? (
          <>
            <button type="button" onClick={() => onOpen(puzzle.id, true)}>
              <Icon name="refresh" />
              <span>Rejouer</span>
            </button>
            <button type="button" className="accent" onClick={() => onOpen(next.id)}>
              <Icon name="next" />
              <span>Suivant</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={showSolution}>
              <Icon name="eye" />
              <span>Solution</span>
            </button>
            <button type="button" className="accent" onClick={hint}>
              <Icon name="bulb" />
              <span>Indice</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
