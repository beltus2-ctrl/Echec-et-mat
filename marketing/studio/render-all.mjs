// Renders every video into ../videos (or the folder given as argument).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] || path.join(here, '../videos'));
fs.mkdirSync(outDir, { recursive: true });
const scenes = ['defi-mat-en-1', 'defi-mat-en-2', 'defi-mat-en-3', 'coup-du-berger', 'bande-annonce', 'bande-annonce-16x9'];
for (const s of scenes) {
  execFileSync('node', [path.join(here, 'render.mjs'), s, path.join(outDir, `${s}.mp4`)], { stdio: 'inherit' });
}
