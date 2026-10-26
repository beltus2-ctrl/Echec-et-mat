import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { getState } from './store';

// All sounds are synthesised with WebAudio so the app works fully offline.
let ctx = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(ac) {
  const len = Math.floor(ac.sampleRate * 0.12);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  return buf;
}
let noise = null;

// Wooden "tock": filtered noise transient + a short resonant body.
function knock(ac, t, { freq = 1700, body = 210, gain = 0.6, decay = 0.09 } = {}) {
  noise ??= noiseBuffer(ac);
  const src = ac.createBufferSource();
  src.buffer = noise;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 1.4;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t);
  src.stop(t + decay + 0.02);

  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(body * 1.4, t);
  o.frequency.exponentialRampToValueAtTime(body, t + 0.04);
  const og = ac.createGain();
  og.gain.setValueAtTime(gain * 0.55, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.9);
  o.connect(og).connect(ac.destination);
  o.start(t);
  o.stop(t + decay + 0.02);
}

function tone(ac, t, freq, dur = 0.25, gain = 0.18, type = 'sine') {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const SOUNDS = {
  move: (ac, t) => knock(ac, t),
  capture: (ac, t) => {
    knock(ac, t, { freq: 1300, body: 160, gain: 0.75, decay: 0.12 });
    knock(ac, t + 0.06, { freq: 2100, body: 240, gain: 0.35, decay: 0.07 });
  },
  castle: (ac, t) => {
    knock(ac, t);
    knock(ac, t + 0.11, { freq: 1500, body: 190 });
  },
  check: (ac, t) => {
    knock(ac, t, { gain: 0.7 });
    tone(ac, t + 0.02, 880, 0.22, 0.1, 'triangle');
    tone(ac, t + 0.02, 1320, 0.18, 0.05, 'sine');
  },
  promote: (ac, t) => {
    knock(ac, t);
    [784, 988, 1175].forEach((f, i) => tone(ac, t + 0.05 + i * 0.06, f, 0.25, 0.09, 'triangle'));
  },
  win: (ac, t) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(ac, t + i * 0.11, f, 0.5, 0.13, 'triangle'));
    tone(ac, t + 0.44, 1568, 0.8, 0.06);
  },
  lose: (ac, t) => {
    [392, 349, 311, 262].forEach((f, i) => tone(ac, t + i * 0.14, f, 0.5, 0.12, 'triangle'));
  },
  draw: (ac, t) => {
    [440, 554, 440].forEach((f, i) => tone(ac, t + i * 0.12, f, 0.4, 0.1, 'triangle'));
  },
  error: (ac, t) => {
    tone(ac, t, 180, 0.18, 0.16, 'square');
  },
  tap: (ac, t) => knock(ac, t, { freq: 2600, body: 420, gain: 0.18, decay: 0.04 }),
  notify: (ac, t) => {
    tone(ac, t, 988, 0.18, 0.1);
    tone(ac, t + 0.1, 1319, 0.3, 0.1);
  },
  lowtime: (ac, t) => tone(ac, t, 1046, 0.08, 0.08, 'square'),
};

export function play(name) {
  if (!getState().settings.sound) return;
  try {
    const ac = audio();
    if (!ac) return;
    SOUNDS[name]?.(ac, ac.currentTime + 0.005);
  } catch {
    // audio is best-effort
  }
}

export function vibrate(kind = 'light') {
  if (!getState().settings.haptics) return;
  try {
    if (Capacitor.isNativePlatform()) {
      if (kind === 'success') Haptics.notification({ type: NotificationType.Success });
      else if (kind === 'error') Haptics.notification({ type: NotificationType.Error });
      else Haptics.impact({ style: kind === 'heavy' ? ImpactStyle.Heavy : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light });
    } else if (navigator.vibrate) {
      navigator.vibrate(kind === 'heavy' ? 30 : kind === 'error' ? [20, 40, 20] : 12);
    }
  } catch {
    // haptics are best-effort
  }
}

export function moveFeedback(move, chess) {
  if (chess.isCheck()) {
    play('check');
    vibrate('medium');
  } else if (move.promotion) {
    play('promote');
    vibrate('medium');
  } else if (move.flags.includes('k') || move.flags.includes('q')) {
    play('castle');
    vibrate();
  } else if (move.captured) {
    play('capture');
    vibrate('medium');
  } else {
    play('move');
    vibrate();
  }
}
