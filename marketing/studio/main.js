import { SCENES } from './scenes.js';
import { cues } from './studio.js';

const name = new URLSearchParams(location.search).get('scene');
const scene = SCENES[name];
const root = document.getElementById('root');
root.style.width = `${scene.W}px`;
root.style.height = `${scene.H}px`;
const api = scene.build(root);

async function ready() {
  await document.fonts.ready;
  await Promise.all(
    [...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))),
  );
  // touch every frame once so lazily created piece images are loaded too
  for (let t = 0; t < api.dur; t += 0.25) api.update(t);
  await Promise.all(
    [...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))),
  );
  api.update(0);
}

window.seek = (t) => api.update(t);
window.info = { W: scene.W, H: scene.H, dur: api.dur, cues };
window.ready = ready();
