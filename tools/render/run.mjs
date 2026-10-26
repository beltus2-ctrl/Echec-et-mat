import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = process.argv[2] || 'out';
const only = process.argv[3];
fs.mkdirSync(out, { recursive: true });
await build({ entryPoints: ['entry.js'], bundle: true, format: 'iife', outfile: 'bundle.js', logLevel: 'error' });
fs.writeFileSync('page.html', `<html><body style="margin:0;background:transparent"><script src="bundle.js"></script></body></html>`);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[err]', e.message));
await page.goto('file://' + process.cwd() + '/page.html');
const W = 512, H = 896;
await page.evaluate(([w, h]) => window.R.setup(w, h).then((r) => (window.r = r)), [W, H]);
for (const color of ['w', 'b']) {
  for (const type of ['p', 'n', 'b', 'r', 'q', 'k']) {
    if (only && !only.includes(type)) continue;
    const yaw = type === 'n' ? (color === 'w' ? -0.55 : 0.55 + Math.PI) : 0;
    const url = await page.evaluate(([t, c, y]) => window.r.render(t, c, y), [type, color, yaw]);
    fs.writeFileSync(`${out}/${color}${type}.png`, Buffer.from(url.split(',')[1], 'base64'));
    console.log('rendered', color + type);
  }
}
await browser.close();
