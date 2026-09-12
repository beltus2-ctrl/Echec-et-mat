import { useEffect, useState } from 'react';
import { socket } from './socket';
import Game from './components/Game';
import './App.css';

function App() {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleJoined({ roomId, seat, state }) {
      setSession({ roomId, seat, initialState: state });
      setConnecting(false);
    }
    function handleError({ message }) {
      setError(message);
      setConnecting(false);
    }
    function handleDisconnect() {
      setSession(null);
      setError('Connexion au serveur perdue.');
    }

    socket.on('joined', handleJoined);
    socket.on('errorMessage', handleError);
    socket.on('disconnect', handleDisconnect);
    return () => {
      socket.off('joined', handleJoined);
      socket.off('errorMessage', handleError);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  function withConnection(action) {
    if (socket.connected) {
      action();
    } else {
      socket.once('connect', action);
      socket.connect();
    }
  }

  function createRoom() {
    setError('');
    setConnecting(true);
    withConnection(() => socket.emit('createRoom', { name: name.trim() || 'Joueur 1' }));
  }

  function joinRoom(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setError('');
    setConnecting(true);
    withConnection(() =>
      socket.emit('joinRoom', {
        roomId: joinCode.trim().toUpperCase(),
        name: name.trim() || 'Joueur',
      })
    );
  }

  function leaveRoom() {
    if (session) socket.emit('leaveRoom', { roomId: session.roomId });
    socket.disconnect();
    setSession(null);
  }

  if (session) {
    return (
      <Game
        roomId={session.roomId}
        seat={session.seat}
        initialState={session.initialState}
        onLeave={leaveRoom}
      />
    );
  }

  return (
    <div className="lobby">
      <h1>♟️ Échec et Mat</h1>
      <p className="subtitle">Jeu d'échecs multijoueur en temps réel</p>

      <label className="field">
        Votre nom
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Joueur"
          maxLength={20}
        />
      </label>

      {error && <div className="error-banner">{error}</div>}

      <div className="lobby-actions">
        <button className="primary" onClick={createRoom} disabled={connecting}>
          Créer une salle
        </button>

        <div className="divider">ou</div>

        <form onSubmit={joinRoom} className="join-form">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Code de la salle"
            maxLength={6}
          />
          <button type="submit" disabled={connecting}>
            Rejoindre
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
