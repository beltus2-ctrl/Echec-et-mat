import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { socket } from '../socket';
import Board from '../components/Board';
import Icon from '../components/Icons';
import { PlayerBar, Confirm, Segmented, AVATARS } from '../components/ui';
import MoveList from '../components/MoveList';
import GameOverModal from '../components/GameOverModal';
import { ScreenHeader } from './Setup';
import { capturedFromFen, kingSquare, pieceUrl } from '../lib/chessUtil';
import { moveFeedback, play, vibrate } from '../lib/feedback';
import { useStore, getState, update, levelFromXp } from '../lib/store';

function useConnection() {
  const [status, setStatus] = useState(socket.connected ? 'online' : 'connecting');
  useEffect(() => {
    const on = () => setStatus('online');
    const off = () => setStatus('connecting');
    const err = () => setStatus('error');
    socket.on('connect', on);
    socket.on('disconnect', off);
    socket.on('connect_error', err);
    if (!socket.connected) socket.connect();
    return () => {
      socket.off('connect', on);
      socket.off('disconnect', off);
      socket.off('connect_error', err);
    };
  }, []);
  return status;
}

async function shareCode(code) {
  const text = `Viens jouer aux échecs avec moi sur Échec & Mat ! Ouvre l'appli, touche « Inviter un ami » → « Rejoindre » et entre le code : ${code}`;
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title: 'Partie d’échecs', text, dialogTitle: 'Inviter un ami' });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title: 'Partie d’échecs', text });
      return 'shared';
    }
  } catch {
    // user cancelled the share sheet
    return 'cancelled';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export default function Online({ onBack }) {
  const status = useConnection();
  const profile = useStore((s) => s.profile);
  const playerId = useStore((s) => s.playerId);
  const [tab, setTab] = useState('create');
  const [color, setColor] = useState('r');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [room, setRoom] = useState(null); // { roomId, seat, state }
  const [busy, setBusy] = useState(false);
  const roomRef = useRef(null);
  roomRef.current = room;

  useEffect(() => {
    const onJoined = (data) => {
      setBusy(false);
      setError('');
      setRoom(data);
      update((s) => {
        s.lastRoom = data.roomId;
      });
    };
    const onState = (state) => setRoom((r) => (r ? { ...r, state } : r));
    const onSeat = ({ seat }) => setRoom((r) => (r ? { ...r, seat } : r));
    const onError = ({ message, code: c }) => {
      setBusy(false);
      if (c === 'not_found' && !roomRef.current) setError(message);
      else if (!roomRef.current) setError(message);
    };
    // Reclaim our seat after the connection drops (screen lock, network change…)
    const onReconnect = () => {
      const r = roomRef.current;
      if (r) socket.emit('joinRoom', { roomId: r.roomId, name: getState().profile.name, playerId: getState().playerId });
    };
    socket.on('joined', onJoined);
    socket.on('state', onState);
    socket.on('seat', onSeat);
    socket.on('errorMessage', onError);
    socket.on('connect', onReconnect);
    return () => {
      socket.off('joined', onJoined);
      socket.off('state', onState);
      socket.off('seat', onSeat);
      socket.off('errorMessage', onError);
      socket.off('connect', onReconnect);
    };
  }, []);

  function create() {
    setBusy(true);
    setError('');
    socket.emit('createRoom', { name: profile.name, playerId, color: color === 'r' ? null : color });
  }

  function join() {
    if (code.trim().length < 4) {
      setError('Entrez le code reçu de votre ami.');
      return;
    }
    setBusy(true);
    setError('');
    socket.emit('joinRoom', { roomId: code.trim().toUpperCase(), name: profile.name, playerId });
  }

  function leave() {
    if (room) socket.emit('leaveRoom', { roomId: room.roomId });
    setRoom(null);
  }

  if (room && room.state.players.w && room.state.players.b) {
    return <OnlineGame room={room} onLeave={() => { leave(); onBack(); }} connection={status} />;
  }

  if (room) {
    return (
      <div className="screen setup">
        <ScreenHeader title="Salle d'attente" subtitle="En attente de votre ami…" onBack={leave} />
        <div className="waiting">
          <div className="radar">
            <span />
            <span />
            <span />
            <img src={pieceUrl(room.seat === 'b' ? 'b' : 'w', 'k')} alt="" />
          </div>
          <p className="muted">Partagez ce code avec votre ami :</p>
          <div className="room-code">
            {room.roomId.split('').map((ch, i) => (
              <span key={i}>{ch}</span>
            ))}
          </div>
          <p className="muted small">
            Vous jouerez avec les <b>{room.seat === 'b' ? 'noirs' : 'blancs'}</b>
          </p>
          <button
            type="button"
            className="btn primary big"
            onClick={async () => {
              const r = await shareCode(room.roomId);
              if (r === 'copied') setError('Invitation copiée dans le presse-papiers ✓');
            }}
          >
            <Icon name="share" size={18} /> Envoyer l'invitation
          </button>
          {error && <p className="note">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="screen setup">
      <ScreenHeader title="Inviter un ami" subtitle="Partie en ligne" onBack={onBack} />
      <div className={`conn-pill ${status}`}>
        <Icon name="wifi" size={16} />
        {status === 'online' ? 'Connecté au serveur' : status === 'error' ? 'Serveur injoignable — nouvelle tentative…' : 'Connexion au serveur…'}
      </div>
      {status !== 'online' && <p className="note center">Le serveur gratuit peut mettre jusqu'à une minute à se réveiller.</p>}

      <div className="card">
        <h4 className="field-label">Votre nom</h4>
        <input
          className="name-input"
          value={profile.name}
          maxLength={16}
          onChange={(e) =>
            update((st) => {
              st.profile.name = e.target.value;
            })
          }
          aria-label="Votre nom"
        />
      </div>
      <Segmented
        options={[
          { value: 'create', label: 'Créer une partie' },
          { value: 'join', label: 'Rejoindre' },
        ]}
        value={tab}
        onChange={(v) => {
          setTab(v);
          setError('');
        }}
      />

      {tab === 'create' ? (
        <div className="card">
          <p className="muted">Créez une partie, puis envoyez le code à votre ami (WhatsApp, SMS…).</p>
          <h4 className="field-label">Votre couleur</h4>
          <Segmented
            options={[
              { value: 'w', label: 'Blancs', icon: <img src={pieceUrl('w', 'k')} alt="" className="seg-piece" /> },
              { value: 'r', label: 'Hasard', icon: <span className="seg-random">?</span> },
              { value: 'b', label: 'Noirs', icon: <img src={pieceUrl('b', 'k')} alt="" className="seg-piece" /> },
            ]}
            value={color}
            onChange={setColor}
          />
          <button type="button" className="btn primary big" disabled={status !== 'online' || busy} onClick={create}>
            {busy ? <span className="spinner sm" /> : <Icon name="play" fill size={18} />} Créer la partie
          </button>
        </div>
      ) : (
        <div className="card">
          <p className="muted">Entrez le code à 6 caractères reçu de votre ami.</p>
          <input
            className="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC123"
            inputMode="text"
            autoCapitalize="characters"
            aria-label="Code de la partie"
          />
          <button type="button" className="btn primary big" disabled={status !== 'online' || busy} onClick={join}>
            {busy ? <span className="spinner sm" /> : <Icon name="next" size={18} />} Rejoindre
          </button>
        </div>
      )}
      {error && <p className="note error">{error}</p>}
    </div>
  );
}

function OnlineGame({ room, onLeave, connection }) {
  const { state, seat, roomId } = room;
  const profile = useStore((s) => s.profile);
  const [pending, setPending] = useState(null); // optimistic fen
  const [viewIndex, setViewIndex] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showOver, setShowOver] = useState(false);
  const [reward, setReward] = useState(null);
  const [flip, setFlip] = useState(false);
  const prevLen = useRef(state.history.length);
  const recorded = useRef(null);

  const fens = useMemo(() => {
    const c = new Chess();
    const out = [c.fen()];
    for (const m of state.history) {
      c.move(m.san);
      out.push(c.fen());
    }
    return out;
  }, [state.history]);

  // feedback for opponent moves + end of game bookkeeping
  useEffect(() => {
    if (state.history.length > prevLen.current) {
      const c = new Chess(state.fen);
      const last = state.history[state.history.length - 1];
      if (last.color !== seat) moveFeedback({ ...last, flags: last.san.startsWith('O-') ? 'k' : '', captured: last.san.includes('x'), promotion: last.san.includes('=') }, c);
    }
    prevLen.current = state.history.length;
    setPending(null);
  }, [state.history, state.fen, seat]);

  useEffect(() => {
    if (!state.result) {
      recorded.current = null;
      return;
    }
    const key = `${roomId}-${state.history.length}-${state.result.reason}`;
    if (recorded.current === key) return;
    recorded.current = key;
    const me = seat === 'w' || seat === 'b' ? seat : null;
    const score = state.result.winner == null ? 0.5 : state.result.winner === me ? 1 : 0;
    const xp = me ? (score === 1 ? 50 : score === 0.5 ? 25 : 10) : 0;
    const before = levelFromXp(getState().stats.xp).level;
    update((s) => {
      s.stats.xp += xp;
      s.history = [
        {
          id: Date.now(),
          mode: 'online',
          ts: Date.now(),
          names: { w: state.names.w || 'Blancs', b: state.names.b || 'Noirs' },
          playerColor: me,
          winner: state.result.winner,
          reason: state.result.reason,
          moves: state.history.map((m) => m.san),
          ratingDelta: null,
        },
        ...s.history,
      ].slice(0, 60);
    });
    const after = levelFromXp(getState().stats.xp).level;
    setReward({ delta: null, xp, levelUp: after > before ? after : null });
    play(score === 1 ? 'win' : score === 0 ? 'lose' : 'draw');
    vibrate(score === 0 ? 'error' : 'success');
    const t = setTimeout(() => setShowOver(true), 700);
    return () => clearTimeout(t);
  }, [state.result, state.history, state.names, seat, roomId]);

  const isPlayer = seat === 'w' || seat === 'b';
  const fen = pending || state.fen;
  const turn = fen.split(' ')[1];
  const myTurn = isPlayer && turn === seat && !state.result && !pending;
  const shownFen = viewIndex == null ? fen : fens[viewIndex];
  const lastMv = viewIndex == null ? state.history[state.history.length - 1] : state.history[viewIndex - 1];
  const orientation = (flip ? (seat === 'b' ? 'w' : 'b') : seat === 'b' ? 'b' : 'w');
  const chess = useMemo(() => new Chess(shownFen), [shownFen]);
  const checkSq = chess.isCheck() ? kingSquare(chess, chess.turn()) : null;
  const { captured, diff } = capturedFromFen(shownFen);

  const onMove = useCallback(
    (mv) => {
      if (!myTurn || viewIndex != null) return false;
      const c = new Chess(state.fen);
      let m;
      try {
        m = c.move(mv);
      } catch {
        return false;
      }
      moveFeedback(m, c);
      setPending(c.fen());
      socket.emit('makeMove', { roomId, from: m.from, to: m.to, promotion: m.promotion });
      return true;
    },
    [myTurn, viewIndex, state.fen, roomId],
  );

  const bar = (c) => {
    const isMe = c === seat;
    const info = state.players[c];
    return (
      <PlayerBar
        name={state.names[c] || (c === 'w' ? 'Blancs' : 'Noirs')}
        subtitle={isMe ? 'Vous' : info?.connected ? 'En ligne' : 'Déconnecté…'}
        avatar={isMe ? AVATARS[profile.avatar] || AVATARS[0] : { piece: c === 'w' ? 'wk' : 'bk', hue: c === 'w' ? 40 : 220, online: info?.connected }}
        color={c}
        captured={captured[c === 'w' ? 'b' : 'w']}
        diff={c === 'w' ? diff : -diff}
        active={!state.result && turn === c}
      />
    );
  };

  const opp = seat === 'w' ? 'b' : 'w';
  let status;
  if (connection !== 'online') status = { kind: 'check', text: 'Connexion perdue — reconnexion…' };
  else if (state.result) status = { kind: 'over', text: 'Partie terminée' };
  else if (isPlayer && !state.players[opp]?.connected) status = { kind: 'wait', text: 'Votre ami s’est déconnecté, attente de son retour…' };
  else if (myTurn && chess.isCheck()) status = { kind: 'check', text: 'Échec ! Protégez votre roi' };
  else if (myTurn) status = { kind: 'you', text: 'À vous de jouer' };
  else status = { kind: 'wait', text: `${state.names[turn] || 'Votre ami'} réfléchit…` };

  return (
    <div className="screen game-screen">
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={() => (state.result ? onLeave() : setConfirm('leave'))} aria-label="Quitter">
          <Icon name="back" />
        </button>
        <div className="topbar-title">
          <span>Partie en ligne</span>
          <small>Code {roomId}</small>
        </div>
        <button type="button" className="icon-btn" onClick={() => setFlip((f) => !f)} aria-label="Retourner l'échiquier">
          <Icon name="flip" />
        </button>
      </header>

      <div className="game-area">
        {bar(orientation === 'w' ? 'b' : 'w')}
        <Board
          fen={shownFen}
          orientation={orientation}
          movable={myTurn && viewIndex == null ? seat : null}
          onMove={onMove}
          lastMove={lastMv ? { from: lastMv.from, to: lastMv.to } : null}
          check={checkSq}
        />
        {bar(orientation)}
      </div>

      <div className={`status-banner ${status.kind}`}>
        <Icon name={status.kind === 'check' ? 'bolt' : status.kind === 'wait' ? 'clock' : 'info'} size={18} />
        <span>{status.text}</span>
      </div>

      {state.drawOfferedBy && isPlayer && state.drawOfferedBy !== seat && !state.result && (
        <div className="offer">
          <span>{state.names[state.drawOfferedBy]} propose la nulle</span>
          <button type="button" className="btn ghost sm" onClick={() => socket.emit('respondDraw', { roomId, accept: false })}>
            Refuser
          </button>
          <button type="button" className="btn primary sm" onClick={() => socket.emit('respondDraw', { roomId, accept: true })}>
            Accepter
          </button>
        </div>
      )}
      {state.result && state.rematchBy && state.rematchBy !== seat && (
        <div className="offer">
          <span>{state.names[state.rematchBy]} veut une revanche</span>
          <button type="button" className="btn primary sm" onClick={() => socket.emit('rematch', { roomId })}>
            Accepter
          </button>
        </div>
      )}

      <MoveList moves={state.history} viewIndex={viewIndex} onSelect={setViewIndex} />

      <nav className="action-bar">
        {state.result ? (
          <>
            <button type="button" onClick={onLeave}>
              <Icon name="exit" />
              <span>Quitter</span>
            </button>
            <button type="button" onClick={() => setShowOver(true)}>
              <Icon name="trophy" />
              <span>Résultat</span>
            </button>
            <button type="button" className="accent" disabled={state.rematchBy === seat} onClick={() => socket.emit('rematch', { roomId })}>
              <Icon name="refresh" />
              <span>{state.rematchBy === seat ? 'Demandée…' : 'Revanche'}</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setConfirm('resign')} disabled={!isPlayer}>
              <Icon name="flag" />
              <span>Abandon</span>
            </button>
            <button type="button" onClick={() => socket.emit('offerDraw', { roomId })} disabled={!isPlayer || state.drawOfferedBy === seat}>
              <Icon name="handshake" />
              <span>{state.drawOfferedBy === seat ? 'Proposée' : 'Nulle'}</span>
            </button>
            <button type="button" className="accent" onClick={() => shareCode(roomId)}>
              <Icon name="share" />
              <span>Code</span>
            </button>
          </>
        )}
      </nav>

      <Confirm
        open={confirm === 'resign'}
        title="Abandonner la partie ?"
        confirmLabel="Abandonner"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          socket.emit('resign', { roomId });
        }}
      />
      <Confirm
        open={confirm === 'leave'}
        title="Quitter la partie ?"
        text="Si vous quittez maintenant, la partie sera perdue."
        confirmLabel="Quitter"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          onLeave();
        }}
      />
      <GameOverModal
        open={showOver}
        result={state.result}
        perspective={isPlayer ? seat : null}
        names={state.names}
        reward={reward}
        onClose={() => setShowOver(false)}
        onRematch={() => {
          setShowOver(false);
          socket.emit('rematch', { roomId });
        }}
        onHome={onLeave}
      />
    </div>
  );
}
