// Static visuals: Play Store screenshots, feature graphic and social posts.
import puzzles from '../../client/src/data/puzzles.json';
import { ASSETS, Board, background, text, phone, el, pieceSrc, boardSrc } from './studio.js';

const shot = (name) => `../captures/${name}.png`;
const still = (W, H, draw) => ({ W, H, build: (root) => (draw(root), { dur: 0, update() {} }) });

function storeShot(capture, title, sub, hue) {
  return still(1080, 1920, (root) => {
    background(root, { hue })(1.3);
    root.style.filter = '';
    el('div', 'store-tint', root, { inset: '0', background: `radial-gradient(80% 50% at 50% 30%, hsla(${190 + hue},80%,55%,0.22), transparent 70%)` });
    text(root, title, 'hook store-title', { top: '110px' });
    text(root, sub, 'sub', { top: '345px', padding: '0 70px', fontSize: '44px' });
    const p = phone(root, shot(capture), { x: 160, y: 470, w: 760 });
    p.style.boxShadow = '0 80px 140px -30px rgba(0,0,0,0.95), 0 0 0 3px rgba(255,255,255,0.12), 0 0 120px rgba(56,217,236,0.18)';
  });
}

function brandBar(root, y, label = 'Échec & Mat · appli d’échecs gratuite') {
  const bar = el('div', 'brand-bar', root, { top: `${y}px` });
  const img = el('img', '', bar);
  img.src = `${ASSETS}icon-512.png`;
  el('span', '', bar).textContent = label;
}

function puzzlePost(id, title, hue) {
  const p = puzzles.find((x) => x.id === id);
  const side = p.fen.split(' ')[1];
  return still(1080, 1350, (root) => {
    background(root, { hue })(2);
    text(root, title, 'hook', { top: '50px', fontSize: '112px' });
    text(root, `<span class="badge"><img src="${pieceSrc(side, 'k')}">${side === 'w' ? 'Les blancs' : 'Les noirs'} jouent et gagnent</span>`, '', { top: '205px' });
    const b = new Board(root, { x: 126, y: 315, size: 800, fen: p.fen, orientation: side });
    b.update(0);
    text(root, 'Ta réponse en commentaire', 'cap', { top: '1158px', fontSize: '56px' });
    brandBar(root, 1250);
  });
}

export const IMAGES = {
  // ---- Play Store phone screenshots (1080×1920) ----
  'store-1': storeShot('02-partie-indice', 'Les échecs,<br><b>en plus beau</b>', 'Pièces 3D en bois, sons et animations réalistes', 0),
  'store-2': storeShot('03-niveaux', '<b>8 adversaires</b><br>à ta mesure', 'Du débutant (400 Elo) au grand maître (2800 Elo)', 60),
  'store-3': storeShot('05-puzzle', '<b>101 puzzles</b><br>de mat', 'Trouve l’échec et mat en 1, 2 ou 3 coups', 120),
  'store-4': storeShot('04-deux-joueurs', 'Joue à deux<br><b>sur un téléphone</b>', 'Avec pendule, entre amis ou en famille', 180),
  'store-5': storeShot('08-en-ligne', 'Défie tes amis<br><b>à distance</b>', 'Un code à partager, et la partie commence', 240),
  'store-6': storeShot('07-victoire', 'Progresse et<br><b>monte de niveau</b>', 'Classement Elo, XP et défi du jour', 300),
  'store-7': storeShot('01-accueil', 'Joue même<br><b>sans Internet</b>', 'Ordinateur, deux joueurs et puzzles hors ligne', 30),
  'store-8': storeShot('09-historique', 'Revois<br><b>tes parties</b>', 'Rejoue chaque coup pour t’améliorer', 90),

  // ---- Play Store feature graphic (1024×500) ----
  'feature-graphic': still(1024, 500, (root) => {
    background(root)(0.7);
    const floor = el('div', 'fg-board', root, { backgroundImage: `url(${boardSrc('classic')})` });
    void floor;
    el('div', 'fg-fade', root);
    const pieces = [
      ['b', 'q', 615, 80, 210],
      ['w', 'k', 735, 30, 250],
    ];
    for (const [c, t, x, y, w] of pieces) {
      const i = el('img', 'piece-hero', root, { left: `${x}px`, top: `${y}px`, width: `${w}px` });
      i.src = pieceSrc(c, t);
    }
    text(root, 'Échec <b>&amp;</b> Mat', 'hook', { top: '118px', left: '58px', right: 'auto', width: '600px', fontSize: '92px', textAlign: 'left', whiteSpace: 'nowrap' });
    text(root, 'Les échecs, en plus beau.', 'sub', { top: '238px', left: '60px', right: 'auto', width: '560px', fontSize: '34px', textAlign: 'left' });
    const chips = el('div', 'fg-chips', root, { top: '312px', left: '60px' });
    for (const c of ['8 niveaux', '101 puzzles', 'En ligne']) el('span', 'chip', chips).textContent = c;
  }),

  // ---- social posts (1080×1350, Instagram / Facebook) ----
  'post-defi-mat-en-1': puzzlePost('m1-13', 'Mat en <b>1</b> ?', 0),
  'post-defi-mat-en-2': puzzlePost('m2-5', 'Mat en <b>2</b> ?', 40),
  'post-defi-mat-en-3': puzzlePost('m3-21', 'Mat en <b>3</b> ?', 300),
  'post-lancement': still(1080, 1350, (root) => {
    background(root)(2.4);
    text(root, 'Nouvelle appli', 'hook', { top: '70px', fontSize: '110px' });
    text(root, '<b>d’échecs</b>', 'hook', { top: '190px', fontSize: '110px' });
    const p = phone(root, shot('02-partie-indice'), { x: 350, y: 320, w: 380 });
    p.style.transform = 'rotate(-4deg)';
    const k = el('img', 'piece-hero', root, { left: '700px', top: '560px', width: '330px' });
    k.src = pieceSrc('w', 'k');
    const q = el('img', 'piece-hero', root, { left: '50px', top: '620px', width: '290px' });
    q.src = pieceSrc('b', 'q');
    const chips = el('div', 'fg-chips big', root, { top: '1160px', left: '0', right: '0', justifyContent: 'center' });
    for (const c of ['Gratuit', 'Sans pub', 'Hors ligne']) el('span', 'chip', chips).textContent = c;
    brandBar(root, 1262, 'Échec & Mat · lien en bio');
  }),
  'statut-defi-ami': still(1080, 1920, (root) => {
    background(root)(3.1);
    text(root, 'Je te défie', 'hook', { top: '200px', fontSize: '140px' });
    text(root, '<b>aux échecs !</b>', 'hook', { top: '355px', fontSize: '140px' });
    el('div', 'vs-glow', root);
    const w = el('img', 'piece-hero', root, { left: '90px', top: '640px', width: '470px' });
    w.src = pieceSrc('w', 'k');
    const b = el('img', 'piece-hero', root, { left: '520px', top: '640px', width: '470px' });
    b.src = pieceSrc('b', 'k');
    text(root, '<span class="vs">VS</span>', '', { top: '900px' });
    text(root, 'Télécharge <b>Échec &amp; Mat</b> (gratuit), touche « Inviter un ami » puis entre mon code :', 'sub', { top: '1440px', padding: '0 90px', fontSize: '46px' });
    const code = el('div', 'code-boxes', root, { top: '1660px' });
    for (let i = 0; i < 6; i++) el('span', '', code);
  }),
};
