import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { socket } from '../socket';

const STATUS_LABELS = {
  in_progress: '',
  check: 'Échec !',
  stalemate: 'Pat — partie nulle',
  repetition: 'Nulle par répétition',
  insufficient_material: 'Nulle — matériel insuffisant',
  draw: 'Partie nulle',
};

const SEAT_LABELS = { white: 'Blancs', black: 'Noirs', spectator: 'Spectateur' };

export default function Game({ roomId, seat, initialState, onLeave }) {
  const [state, setState] = useState(initialState || null);
  const [error, setError] = useState('');
  const [ended, setEnded] = useState(null);

  useEffect(() => {
    function handleState(s) {
      setState(s);
    }
    function handleError({ message }) {
      setError(message);
      setTimeout(() => setError(''), 2500);
    }
    function handleEnded(info) {
      setEnded(info);
    }
    function handleOpponentLeft({ seat: leftSeat }) {
      setError(`${SEAT_LABELS[leftSeat]} a quitté la partie.`);
    }

    socket.on('state', handleState);
    socket.on('errorMessage', handleError);
    socket.on('gameEnded', handleEnded);
    socket.on('opponentLeft', handleOpponentLeft);

    return () => {
      socket.off('state', handleState);
      socket.off('errorMessage', handleError);
      socket.off('gameEnded', handleEnded);
      socket.off('opponentLeft', handleOpponentLeft);
    };
  }, []);

  if (!state) return <p className="loading">Connexion à la salle…</p>;

  const turnSeat = state.turn;
  const isMyTurn = seat === turnSeat;
  const isDrawish = ['stalemate', 'repetition', 'insufficient_material', 'draw'].includes(
    state.status
  );
  const gameOver = state.status === 'checkmate' || isDrawish || !!ended;

  function onPieceDrop({ sourceSquare, targetSquare }) {
    if (!targetSquare || seat !== turnSeat || gameOver) return false;

    const localChess = new Chess(state.fen);
    let move;
    try {
      move = localChess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch {
      move = null;
    }
    if (!move) return false;

    socket.emit('makeMove', { roomId, from: sourceSquare, to: targetSquare, promotion: 'q' });
    return true;
  }

  function copyRoomId() {
    navigator.clipboard?.writeText(roomId).catch(() => {});
  }

  function newGame() {
    setEnded(null);
    socket.emit('rematch', { roomId });
  }

  let statusLabel = '';
  if (ended) {
    statusLabel =
      ended.reason === 'resignation'
        ? `${SEAT_LABELS[ended.winner]} gagnent par abandon`
        : 'Partie nulle par accord mutuel';
  } else if (state.status === 'checkmate') {
    statusLabel = `Échec et mat — ${turnSeat === 'white' ? 'les Noirs' : 'les Blancs'} gagnent`;
  } else {
    statusLabel = STATUS_LABELS[state.status] || '';
  }

  const isPlayer = seat === 'white' || seat === 'black';

  return (
    <div className="game">
      <div className="game-header">
        <div>
          Salle : <strong>{roomId}</strong>{' '}
          <button onClick={copyRoomId} className="link-btn" type="button">
            copier
          </button>
        </div>
        <div>
          Vous jouez : <strong>{SEAT_LABELS[seat] || 'Spectateur'}</strong>
        </div>
      </div>

      <div className={`turn-banner ${isMyTurn && !gameOver ? 'my-turn' : ''} ${gameOver ? 'game-over' : ''}`}>
        {gameOver
          ? statusLabel
          : isMyTurn
            ? 'À vous de jouer'
            : `Au tour de : ${SEAT_LABELS[turnSeat]}`}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="board-wrap">
        <Chessboard
          options={{
            position: state.fen,
            onPieceDrop,
            boardOrientation: seat === 'black' ? 'black' : 'white',
            allowDragging: isPlayer && seat === turnSeat && !gameOver,
          }}
        />
      </div>

      <div className="players">
        <div>♔ Blancs : {state.names.white || 'en attente…'}</div>
        <div>♚ Noirs : {state.names.black || 'en attente…'}</div>
        {state.spectatorCount > 0 && <div>{state.spectatorCount} spectateur(s)</div>}
      </div>

      {state.drawOfferedBy && isPlayer && state.drawOfferedBy !== seat && (
        <div className="draw-offer">
          L'adversaire propose une partie nulle.
          <button onClick={() => socket.emit('respondDraw', { roomId, accept: true })}>
            Accepter
          </button>
          <button onClick={() => socket.emit('respondDraw', { roomId, accept: false })}>
            Refuser
          </button>
        </div>
      )}

      <div className="controls">
        {isPlayer && !gameOver && (
          <>
            <button onClick={() => socket.emit('offerDraw', { roomId })}>Proposer nulle</button>
            <button onClick={() => socket.emit('resign', { roomId })}>Abandonner</button>
          </>
        )}
        {isPlayer && gameOver && <button onClick={newGame}>Nouvelle partie</button>}
        <button onClick={onLeave}>Quitter la salle</button>
      </div>

      <details className="history">
        <summary>Historique des coups ({state.history.length})</summary>
        <ol>
          {state.history.map((m, i) => (
            <li key={i}>{m.san}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}
