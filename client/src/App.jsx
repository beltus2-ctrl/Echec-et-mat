import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import Home from './screens/Home';
import GameScreen from './screens/GameScreen';
import PuzzleScreen from './screens/PuzzleScreen';
import Online from './screens/Online';
import { AiSetup, LocalSetup } from './screens/Setup';
import { PuzzleList, HistoryList, Replay, Settings } from './screens/Lists';
import Icon from './components/Icons';
import { pieceUrl, boardUrl } from './lib/chessUtil';
import { engine } from './lib/engine';
import { play } from './lib/feedback';

const TABS = [
  { name: 'home', label: 'Accueil', icon: 'home' },
  { name: 'puzzles', label: 'Puzzles', icon: 'puzzle' },
  { name: 'history', label: 'Parties', icon: 'history' },
  { name: 'settings', label: 'Profil', icon: 'settings' },
];

function preload() {
  for (const c of 'wb') for (const t of 'pnbrqk') new Image().src = pieceUrl(c, t);
  for (const b of ['classic', 'walnut', 'marble']) new Image().src = boardUrl(b);
}

export default function App() {
  const [stack, setStack] = useState([{ name: 'home', params: {}, key: 0 }]);
  const route = stack[stack.length - 1];
  const keyRef = useRef(1);

  const go = useCallback((name, params = {}, { replace = false, reset = false } = {}) => {
    const entry = { name, params, key: keyRef.current++ };
    setStack((s) => {
      if (reset) return [s[0], entry].filter((e) => e.name !== name || e === entry);
      if (TABS.some((t) => t.name === name)) return name === 'home' ? [s[0]] : [s[0], entry];
      return replace ? [...s.slice(0, -1), entry] : [...s, entry];
    });
    window.scrollTo(0, 0);
  }, []);

  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const home = useCallback(() => setStack((s) => [s[0]]), []);

  useEffect(() => {
    preload();
    // warm the engine up in the background so the first bot move is instant
    const t = setTimeout(() => engine.init().catch(() => {}), 800);
    if (Capacitor.isNativePlatform()) SplashScreen.hide().catch(() => {});
    return () => clearTimeout(t);
  }, []);

  const stackRef = useRef(stack);
  stackRef.current = stack;
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapApp.addListener('backButton', () => {
      // Open modals close first
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.click();
        return;
      }
      if (stackRef.current.length > 1) {
        const inGame = document.querySelector('.game-screen .topbar .icon-btn');
        if (inGame) inGame.click();
        else back();
      } else CapApp.exitApp();
    });
    return () => {
      sub.then((h) => h.remove());
    };
  }, [back]);

  const startGame = (config) => go('game', { config }, { replace: true });

  let screen;
  const p = route.params;
  switch (route.name) {
    case 'ai-setup':
      screen = <AiSetup onBack={back} onStart={startGame} />;
      break;
    case 'local-setup':
      screen = <LocalSetup onBack={back} onStart={startGame} />;
      break;
    case 'game':
      screen = (
        <GameScreen
          config={p.config}
          resume={p.resume}
          onExit={home}
          onRematch={(config) => go('game', { config }, { replace: true })}
        />
      );
      break;
    case 'online':
      screen = <Online onBack={back} />;
      break;
    case 'puzzles':
      screen = <PuzzleList onBack={home} onOpen={(id) => go('puzzle', { id })} />;
      break;
    case 'puzzle':
      screen = <PuzzleScreen id={p.id} onExit={back} onOpen={(id) => go('puzzle', { id }, { replace: true })} />;
      break;
    case 'history':
      screen = <HistoryList onBack={home} onOpen={(id) => go('replay', { id })} />;
      break;
    case 'replay':
      screen = <Replay id={p.id} onBack={back} />;
      break;
    case 'settings':
      screen = <Settings onBack={home} />;
      break;
    default:
      screen = <Home go={go} />;
  }

  const showTabs = TABS.some((t) => t.name === route.name);

  return (
    <div className="app">
      <div className="app-bg" aria-hidden />
      <main className="view" key={route.key}>
        {screen}
      </main>
      {showTabs && (
        <nav className="tabbar">
          {TABS.map((t) => (
            <button
              key={t.name}
              type="button"
              className={route.name === t.name ? 'on' : ''}
              onClick={() => {
                if (route.name !== t.name) play('tap');
                go(t.name);
              }}
            >
              <Icon name={t.icon} size={22} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
