import { chromium } from 'playwright-core'; import fs from 'node:fs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage(); page.on('pageerror', (e) => console.log(e.message));
await page.setContent('<html><body></body></html>'); await page.addScriptTag({ path: 'board.js' });
fs.mkdirSync('boards', { recursive: true });
for (const t of ['classic', 'walnut', 'marble']) {
  const u = await page.evaluate((t) => window.genBoard(t), t);
  fs.writeFileSync(`boards/${t}.jpg`, Buffer.from(u.split(',')[1], 'base64')); console.log(t, fs.statSync(`boards/${t}.jpg`).size);
}
await browser.close();
