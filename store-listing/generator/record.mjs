// Drives the real app through a short story and records it via CDP screencast.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { backup } from './seed.mjs';
const DIR = new URL('./video/', import.meta.url).pathname;
mkdirSync(DIR + 'frames', { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  localStorage.setItem('kidrota.theme', 'light');
  // Visible tap ripple, so viewers can follow the finger.
  addEventListener('pointerdown', (e) => {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;
      background:rgba(24,95,165,.35);border:2px solid rgba(24,95,165,.7);pointer-events:none;z-index:99999;
      transition:transform .45s ease-out,opacity .45s ease-out;transform:scale(.4);opacity:1`;
    document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = 'scale(1.4)'; d.style.opacity = '0'; });
    setTimeout(() => d.remove(), 600);
  }, true);
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto('http://localhost:5173/');
await page.waitForSelector('.screen:not(.screen--centred)', { timeout: 30000 });
await page.evaluate(async (b) => { const m = await import('/src/db/backup.ts'); await m.importData(b); }, backup);
await page.goto('http://localhost:5173/#/'); await page.reload();
await page.waitForSelector('.holiday-list'); await page.waitForTimeout(800);

// Screencast frames arrive only when something repaints, each with a timestamp.
const cdp = await ctx.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async (f) => {
  const n = frames.length;
  writeFileSync(`${DIR}frames/${String(n).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64'));
  frames.push(f.metadata.timestamp);
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
const t0 = Date.now() / 1000;
const marks = [];
const mark = (id) => marks.push({ id, t: Date.now() / 1000 - t0 });
// When a voice-over exists, hold each scene until its line has finished.
const VO = new URL('./vo/durations.json', import.meta.url).pathname;
const voice = existsSync(VO) ? JSON.parse(readFileSync(VO)) : {};
const hold = async () => {
  const last = marks.at(-1), need = (voice[last.id] ?? 0) + 0.7;
  const left = need - (Date.now() / 1000 - t0 - last.t);
  if (left > 0) await page.waitForTimeout(left * 1000);
};
const wait = (ms) => page.waitForTimeout(ms);
const tap = async (loc) => { await loc.scrollIntoViewIfNeeded(); await wait(250); await loc.click(); };
const smoothTo = (sel, block = 'center') => page.evaluate(([s, b]) => document.querySelector(s)?.scrollIntoView({ behavior: 'smooth', block: b }), [sel, block]);
const smoothTop = () => page.evaluate(() => { scrollTo({ top: 0, behavior: 'smooth' }); document.querySelectorAll('*').forEach((el) => el.scrollTop && el.scrollTo({ top: 0, behavior: 'smooth' })); });

await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 600, maxHeight: 1200, everyNthFrame: 1 });
// Keep a repaint ticking so still moments still produce frames.
await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01;z-index:-1'; document.body.appendChild(d); let i = 0; setInterval(() => { d.style.background = (i++ % 2) ? '#fff' : '#fefefe'; }, 33); });

mark('home'); await wait(2800); await hold();
await tap(page.getByText('Summer holidays').first()); mark('grid'); await wait(3000); await hold();
await tap(page.getByRole('button', { name: /Leo.*Wed.*(afternoon|PM)|Wed.*Leo.*(afternoon|PM)/i }).first()
  .or(page.locator('.slot--gap').first())); mark('day'); await wait(1300);
await smoothTo('.child-card:last-of-type .carer-picker', 'center'); await wait(1300);
await tap(page.locator('.child-card').last().locator('.carer-card', { hasText: 'Grandma' }).last()); await wait(1600); await hold();
await tap(page.getByRole('button', { name: 'Back to the week' })); mark('filled'); await wait(2600); await hold();
await tap(page.getByRole('button', { name: /^list$/i })); mark('list'); await wait(1400);
await smoothTo('.screen > :last-child', 'end'); await wait(1800);
await smoothTop(); await wait(900); await hold();
await tap(page.getByRole('button', { name: /^week$/i })); await wait(700);
await tap(page.getByRole('button', { name: /^share/i }).first()); mark('share'); await wait(3000); await hold();
mark('end');
await cdp.send('Page.stopScreencast');
writeFileSync(DIR + 'timeline.json', JSON.stringify({ frames: frames.map((t) => t - frames[0]), marks: marks.map((m) => ({ ...m, t: m.t - (frames[0] - t0 > 0 ? 0 : 0) })) }, null, 1));
console.log('frames', frames.length, 'duration', (frames.at(-1) - frames[0]).toFixed(1), marks);
await browser.close();
