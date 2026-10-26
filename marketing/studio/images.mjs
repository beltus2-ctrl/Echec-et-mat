// Renders every static visual (Play Store + social networks) as PNG.
// Usage: node images.mjs [outDir]
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] || path.join(here, '..'));
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

fs.writeFileSync(path.join(here, 'images-main.js'), `import { IMAGES } from './images.js';
const s = IMAGES[new URLSearchParams(location.search).get('scene')];
const root = document.getElementById('root');
root.style.width = s.W + 'px'; root.style.height = s.H + 'px';
s.build(root);
window.info = { W: s.W, H: s.H };
window.ready = (async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))); })();
`);
await build({
  entryPoints: [path.join(here, 'images-main.js')],
  bundle: true,
  format: 'iife',
  outfile: path.join(here, 'bundle-images.js'),
  nodePaths: [path.join(here, '../../client/node_modules')],
  logLevel: 'error',
});
fs.writeFileSync(path.join(here, 'images.html'), fs.readFileSync(path.join(here, 'index.html'), 'utf8').replace('bundle.js', 'bundle-images.js'));

const { IMAGES } = await import('./images-list.mjs');
const browser = await chromium.launch({ executablePath: CHROME, args: ['--allow-file-access-from-files'] });
for (const [name, dir] of IMAGES) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', (e) => console.error(name, e.message));
  await page.goto(`file://${path.join(here, 'images.html')}?scene=${name}`);
  await page.waitForFunction(() => window.info);
  const info = await page.evaluate(() => window.info);
  await page.setViewportSize({ width: info.W, height: info.H });
  await page.evaluate(() => window.ready);
  await page.waitForTimeout(150);
  fs.mkdirSync(path.join(outDir, dir), { recursive: true });
  await page.screenshot({ path: path.join(outDir, dir, `${name}.png`) });
  await page.close();
  console.log('ok', `${dir}/${name}.png`);
}
await browser.close();
for (const f of ['images-main.js', 'bundle-images.js', 'images.html']) fs.rmSync(path.join(here, f));
