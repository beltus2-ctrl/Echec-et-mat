import { useSyncExternalStore } from 'react';

const KEY = 'echec-et-mat:v2';

export const DEFAULT_SETTINGS = {
  boardTheme: 'classic',
  sound: true,
  haptics: true,
  showLegal: true,
  showCoords: true,
  animations: true,
  autoFlip: false,
};

const DEFAULT_STATE = {
  profile: { name: 'Joueur', avatar: 0 },
  settings: DEFAULT_SETTINGS,
  stats: {
    rating: 800,
    ratingHistory: [800],
    xp: 0,
    played: 0,
    won: 0,
    lost: 0,
    drawn: 0,
    streak: 0,
    bestStreak: 0,
  },
  puzzles: { solved: {}, rating: 800, streak: 0 },
  history: [],
  saved: null,
  playerId: null,
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function merge(stored) {
  if (!stored) return structuredClone(DEFAULT_STATE);
  return {
    ...DEFAULT_STATE,
    ...stored,
    profile: { ...DEFAULT_STATE.profile, ...stored.profile },
    settings: { ...DEFAULT_SETTINGS, ...stored.settings },
    stats: { ...DEFAULT_STATE.stats, ...stored.stats },
    puzzles: { ...DEFAULT_STATE.puzzles, ...stored.puzzles },
  };
}

let state = merge(read());
if (!state.playerId) {
  state.playerId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable: the app keeps working in memory
  }
}

export function getState() {
  return state;
}

export function update(fn) {
  const next = structuredClone(state);
  fn(next);
  state = next;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(selector = (s) => s) {
  return useSyncExternalStore(subscribe, () => selector(state));
}

export function resetAll() {
  const playerId = state.playerId;
  state = structuredClone(DEFAULT_STATE);
  state.playerId = playerId;
  persist();
  listeners.forEach((l) => l());
}

// ---- XP & levels ----
export function levelFromXp(xp) {
  let level = 1;
  let need = 100;
  let rest = xp;
  while (rest >= need) {
    rest -= need;
    level++;
    need = 100 + (level - 1) * 50;
  }
  return { level, current: rest, need };
}

// ---- Elo ----
export function eloDelta(rating, opponent, score, k = 32) {
  const expected = 1 / (1 + Math.pow(10, (opponent - rating) / 400));
  return Math.round(k * (score - expected));
}
