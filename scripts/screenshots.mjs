import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:5293';
const OUT  = resolve('docs/screenshots');

const shots = [
  { file: '01-basic.png',              path: '/demo/01-basic.html',              w: 1400, h: 480 },
  { file: '05-dependency-arrows.png',  path: '/demo/05-dependency-arrows.html',  w: 1400, h: 520 },
  { file: '07-critical-path.png',      path: '/demo/07-critical-path.html',      w: 1400, h: 560 },
  { file: '40-tradie-bathroom.png',    path: '/demo/40-tradie-bathroom-reno.html', w: 1400, h: 720 },
  { file: '41-tradie-house-build.png', path: '/demo/41-tradie-house-build.html',   w: 1400, h: 720 },
  { file: '15-resource-histogram.png', path: '/demo/15-resource-histogram.html', w: 1400, h: 620 },
  { file: '19-virtual-10k.png',        path: '/demo/19-virtual-10k-tasks.html',  w: 1400, h: 640 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const s of shots) {
    const ctx  = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    if (s.setup) {
      await s.setup(page);
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: resolve(OUT, s.file), fullPage: false });
    console.log('saved', s.file);
    await ctx.close();
  }
} finally {
  await browser.close();
}
