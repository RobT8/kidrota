const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const D = require('path').join(__dirname, 'video2/');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEW = { width: 412, height: 892 };

async function book(page, card, { carer, choice, from, to, days, slow }) {
  const w = slow ? wait : async () => {};
  await tap(page, card.getByRole('button', { name: /Who’s looking after Ava|Add another carer/ })); await w(700);
  await tap(page, card.locator('.carer-card', { hasText: carer })); await w(700);
  if (choice) { await tap(page, card.locator('.time-choice', { hasText: choice }).first()); await w(700); }
  else {
    await tap(page, card.locator('.time-choice', { hasText: 'Other times' })); await w(500);
    await card.getByLabel('From', { exact: true }).fill(from); await w(300);
    await card.getByLabel('To', { exact: true }).fill(to); await w(700);
  }
  const leo = card.getByLabel('Leo', { exact: true });
  await leo.scrollIntoViewIfNeeded(); await w(300);
  await tap(page, leo); await w(700);
  if (days) {
    await tap(page, card.getByRole('button', { name: 'Pick days' })); await w(600);
    for (const d of days) { await tap(page, card.locator('.day-pick', { hasText: d })); await w(500); }
  }
  const save = card.getByRole('button', { name: /^Save / });
  await save.scrollIntoViewIfNeeded(); await w(600);
  await tap(page, save); await w(slow ? 1200 : 400);
}

// Visible finger tap: a soft circle where the click lands.
async function tap(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box) {
    await page.evaluate(({ x, y }) => {
      const dot = document.createElement('div');
      dot.style.cssText = `position:fixed;left:${x / 2 - 13}px;top:${y / 2 - 13}px;width:26px;height:26px;border-radius:50%;background:rgba(43,27,46,.28);border:2px solid rgba(43,27,46,.45);z-index:99999;pointer-events:none;transition:transform .45s ease,opacity .45s ease`;
      document.body.appendChild(dot);
      requestAnimationFrame(() => { dot.style.transform = 'scale(1.6)'; dot.style.opacity = '0'; });
      setTimeout(() => dot.remove(), 600);
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    await wait(180);
  }
  await locator.click();
}

(async () => {
  const browser = await chromium.launch();
  // 1) Set up the family off camera.
  const setup = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const s = await setup.newPage();
  await s.goto('http://localhost:5173/');
  await s.getByRole('button', { name: 'Get started' }).click();
  for (const name of ['Ava', 'Leo']) {
    await s.getByPlaceholder('e.g. Ada').fill(name);
    await s.getByRole('button', { name: 'Add child' }).click();
    await wait(400);
  }
  await s.getByRole('button', { name: 'Next' }).click();
  for (const n of ['Mum', 'Dad', 'Grandparents', 'Holiday club']) { await s.locator('.pick-row__toggle', { hasText: n }).click(); await wait(150); }
  await s.getByRole('button', { name: 'Start planning' }).click();
  await s.getByRole('button', { name: 'Add holiday' }).click();
  await s.getByPlaceholder('e.g. October half term').fill('February half term');
  await s.locator('input[type=date]').nth(0).fill('2027-02-15');
  await s.locator('input[type=date]').nth(1).fill('2027-02-19');
  await s.getByRole('button', { name: 'Save' }).click();
  await wait(300);
  await s.locator('.holiday-card__body').click();
  await s.getByRole('button', { name: 'Week' }).click();
  await wait(300);
  for (const [day, opts] of [[3, { carer: 'Grandparents', choice: 'All day' }], [4, { carer: 'Dad', choice: 'Morning' }]]) {
    await s.locator('.week-grid__child').nth(0).locator('.day-col').nth(day).locator('button').first().click();
    await wait(400);
    await book(s, s.locator('.child-card').nth(0), opts);
    await s.getByRole('button', { name: 'Back to the week' }).click();
    await wait(400);
  }
  const state = await setup.storageState({ indexedDB: true });
  await setup.close();

  // 2) Record the demo.
  const ctx = await browser.newContext({ viewport: { width: 824, height: 1784 }, storageState: state, recordVideo: { dir: D, size: { width: 824, height: 1784 } } });
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.zoom = '2'; }); });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = [];
  const mark = (name) => marks.push({ name, t: (Date.now() - t0) / 1000 });
  await page.goto('http://localhost:5173/');
  await wait(1500);
  mark('home');
  await wait(2500);
  await tap(page, page.locator('.holiday-card__body'));
  await wait(800);
  const week = page.getByRole('button', { name: 'Week' });
  if (!(await week.getAttribute('aria-pressed')) || (await week.getAttribute('aria-pressed')) === 'false') { await tap(page, week); }
  mark('week');
  await wait(2800);
  await tap(page, page.locator('.week-grid__child').nth(0).locator('.day-col').nth(0).locator('button').first());
  await wait(1000);
  mark('book');
  const card = page.locator('.child-card').nth(0);
  await book(page, card, { carer: 'Holiday club', from: '08:00', to: '15:00', days: ['Tue', 'Wed'], slow: true });
  mark('book2');
  await book(page, card, { carer: 'Mum', choice: 'Rest of day', days: ['Tue', 'Wed'], slow: true });
  await tap(page, page.getByRole('button', { name: 'Back to the week' }));
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(600);
  mark('gaps');
  await wait(3500);
  await tap(page, page.getByRole('button', { name: /Share/ }));
  await wait(1200);
  mark('share');
  await wait(2500);
  await tap(page, page.getByRole('button', { name: 'Close', exact: true }));
  await wait(700);
  await tap(page, page.getByRole('button', { name: 'Back to holidays' }));
  await wait(800);
  mark('home-end');
  await wait(3000);
  mark('end');
  await ctx.close();
  fs.writeFileSync(D + 'marks.json', JSON.stringify(marks, null, 1));
  const vid = fs.readdirSync(D).find((f) => f.endsWith('.webm'));
  fs.renameSync(D + vid, D + 'demo.webm');
  console.log(marks);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
