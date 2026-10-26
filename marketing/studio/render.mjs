// Renders a scene frame by frame and encodes it to MP4 with its soundtrack.
// Usage: node render.mjs <scene> <out.mp4> [--preview t1,t2,...]
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [scene, out, flag, list] = process.argv.slice(2);
const FPS = 30;
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

await build({
  entryPoints: [path.join(here, 'main.js')],
  bundle: true,
  format: 'iife',
  outfile: path.join(here, 'bundle.js'),
  nodePaths: [path.join(here, '../../client/node_modules')],
  loader: { '.json': 'json' },
  logLevel: 'error',
});

const browser = await chromium.launch({ executablePath: CHROME, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(`file://${path.join(here, 'index.html')}?scene=${scene}`);
await page.waitForFunction(() => window.info);
const info = await page.evaluate(() => window.info);
await page.setViewportSize({ width: info.W, height: info.H });
await page.evaluate(() => window.ready);

if (flag === '--preview') {
  for (const t of list.split(',').map(Number)) {
    await page.evaluate((x) => window.seek(x), t);
    await page.screenshot({ path: `${out}-${t}.png` });
  }
  await browser.close();
  process.exit(0);
}

const frames = Math.ceil(info.dur * FPS);
const wav = `${out}.wav`;
fs.writeFileSync(`${out}.cues.json`, JSON.stringify({ dur: info.dur, cues: info.cues }));
execFileSync('python3', [path.join(here, 'audio.py'), `${out}.cues.json`, wav], { stdio: 'inherit' });

const ff = spawn('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', wav,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
  '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out,
], { stdio: ['pipe', 'inherit', 'inherit'] });

const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  await page.evaluate((x) => window.seek(x), f / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 150 === 0) console.log(`${scene}: ${f}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
fs.rmSync(wav);
fs.rmSync(`${out}.cues.json`);
await browser.close();
console.log('done', out);
