/**
 * Four "high-end, high-contrast" theme concepts for the app UI itself,
 * rendered on the real app: each theme only overrides the colour tokens in
 * src/styles/index.css (plus a serif for titles), so whichever is chosen can
 * be built by changing those tokens.
 *
 *   npx vite --port 5173            (in another terminal)
 *   FONTS=/path/to/node_modules/@fontsource node design/ui-concepts/ui-themes.cjs
 *
 * Writes <theme>-home.png, <theme>-week.png and <theme>-preview.png here,
 * plus current-*.png for comparison.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const HERE = __dirname;
const FONTS = process.env.FONTS;
if (!FONTS) throw new Error('Set FONTS to a node_modules/@fontsource folder');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEW = { width: 412, height: 892 };

const b64 = (p) => fs.readFileSync(p).toString('base64');
const face = (family, file, weight, style = 'normal') =>
  `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};src:url(data:font/woff2;base64,${b64(FONTS + file)}) format('woff2');}`;
const FACES = [
  face('Playfair', '/playfair-display/files/playfair-display-latin-700-normal.woff2', 700),
  face('Cormorant', '/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff2', 700),
  face('DMSerif', '/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2', 400),
].join('\n');

const TITLES = `h1, h2, h3, .welcome__title, .step__title, .modal__title, .planner-header__titles h1,
  .empty-state__title, .carer-group__title, .settings-group__title, .holiday-card__name, .holiday-card__title`;

const THEMES = [
  {
    id: 'a-midnight-gold', name: 'A · Midnight & Gold', note: 'Dark navy, gold accents, Playfair titles',
    title: "'Playfair', serif", titleWeight: 700,
    t: {
      bg: '#0B1524', card: '#14223A', border: '#273A5A', text: '#F6F1E7', text2: '#B8C2D1', text3: '#8C98AB',
      accent: '#D4AF6A', 'accent-bg': '#2A2A22', 'accent-text': '#0B1524',
      'red-text': '#FFB4A8', 'danger-bg': '#8E2B22', 'danger-on': '#FFFFFF',
      green: '#7FB77E', amber: '#D4AF6A', red: '#E07A6F',
      'carer-family-bg': '#173F37', 'carer-family-text': '#BFEBDD',
      'carer-club-bg': '#2B2A5C', 'carer-club-text': '#DAD7FF',
      'carer-parent-bg': '#4A3714', 'carer-parent-text': '#F6DDA5',
      'carer-playdate-bg': '#4E2236', 'carer-playdate-text': '#F8CFE0',
      'carer-other-bg': '#2E3442', 'carer-other-text': '#DCE1EA',
      'carer-gap-bg': '#4A1E1E', 'carer-gap-text': '#FFC2BA',
    },
  },
  {
    id: 'b-ivory-ink', name: 'B · Ivory & Ink', note: 'Warm ivory, black ink buttons, Cormorant titles',
    title: "'Cormorant', serif", titleWeight: 700, titleScale: 1.18,
    t: {
      bg: '#F6F1E6', card: '#FFFDF8', border: '#DED3BF', text: '#14110F', text2: '#4B433B', text3: '#7A7064',
      accent: '#14110F', 'accent-bg': '#ECE3D2', 'accent-text': '#FFFDF8',
      'red-text': '#9E2A1E', 'danger-bg': '#9E2A1E', 'danger-on': '#FFFFFF',
      green: '#6E9A5B', amber: '#C99A3E', red: '#C9604F',
      'carer-family-bg': '#DDEBE2', 'carer-family-text': '#123D2C',
      'carer-club-bg': '#E3E0F3', 'carer-club-text': '#2A245E',
      'carer-parent-bg': '#F2E3C6', 'carer-parent-text': '#4A2D06',
      'carer-playdate-bg': '#F3DDE3', 'carer-playdate-text': '#5C1A31',
      'carer-other-bg': '#E9E4D9', 'carer-other-text': '#38342C',
      'carer-gap-bg': '#F8E0DA', 'carer-gap-text': '#7A1C12',
    },
  },
  {
    id: 'c-emerald-champagne', name: 'C · Emerald & Champagne', note: 'Deep green, champagne gold, DM Serif titles',
    title: "'DMSerif', serif", titleWeight: 400,
    t: {
      bg: '#0C231B', card: '#143428', border: '#24503F', text: '#F5ECD6', text2: '#C9C0A6', text3: '#9C9580',
      accent: '#E3C887', 'accent-bg': '#2E3A24', 'accent-text': '#0C231B',
      'red-text': '#FFB8A8', 'danger-bg': '#8A2E22', 'danger-on': '#FFFFFF',
      green: '#8CC08A', amber: '#E3C887', red: '#E38170',
      'carer-family-bg': '#1E5444', 'carer-family-text': '#CDEFE2',
      'carer-club-bg': '#2E3462', 'carer-club-text': '#DCDDFF',
      'carer-parent-bg': '#55421A', 'carer-parent-text': '#F7E2AE',
      'carer-playdate-bg': '#572840', 'carer-playdate-text': '#F8D2E3',
      'carer-other-bg': '#2E3D36', 'carer-other-text': '#DCE6E0',
      'carer-gap-bg': '#521F1C', 'carer-gap-text': '#FFC6BC',
    },
  },
  {
    id: 'd-noir-coral', name: 'D · Noir & Coral', note: 'Near-black, coral accent, bold modern sans',
    title: "'Inter Display', Inter, sans-serif", titleWeight: 800,
    t: {
      bg: '#0D0C0C', card: '#1A1817', border: '#33302D', text: '#FFFFFF', text2: '#BDB5AE', text3: '#8F8780',
      accent: '#FF7A59', 'accent-bg': '#3A1E16', 'accent-text': '#1A0C08',
      'red-text': '#FFB3A3', 'danger-bg': '#B33A26', 'danger-on': '#FFFFFF',
      green: '#7CC48A', amber: '#F2B45A', red: '#FF7A59',
      'carer-family-bg': '#16443A', 'carer-family-text': '#C6F0E2',
      'carer-club-bg': '#2E2A60', 'carer-club-text': '#DEDBFF',
      'carer-parent-bg': '#4D3512', 'carer-parent-text': '#FFDFA8',
      'carer-playdate-bg': '#56203A', 'carer-playdate-text': '#FFD0E2',
      'carer-other-bg': '#302D2B', 'carer-other-text': '#E4DFDA',
      'carer-gap-bg': '#4F1A14', 'carer-gap-text': '#FFC0B4',
    },
  },
];

function themeCss(th) {
  const vars = Object.entries(th.t).map(([k, v]) => `--${k}:${v} !important;`).join('');
  return `${FACES}
  :root, :root[data-theme] { ${vars} color-scheme: ${th.t.bg < '#8' ? 'dark' : 'light'}; }
  body { font-family: Inter, -apple-system, Roboto, sans-serif !important; }
  ${TITLES} { font-family: ${th.title} !important; font-weight: ${th.titleWeight} !important;
    letter-spacing: ${th.titleWeight >= 800 ? '-0.02em' : '0'}; ${th.titleScale ? `font-size: ${th.titleScale}em;` : ''} }`;
}

async function setUpFamily(browser) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const s = await ctx.newPage();
  await s.goto('http://localhost:5173/');
  await s.getByRole('button', { name: 'Get started' }).click();
  for (const name of ['Ava', 'Leo']) {
    await s.getByPlaceholder('e.g. Ada').fill(name);
    await s.getByRole('button', { name: 'Add child' }).click();
    await wait(300);
  }
  await s.getByRole('button', { name: 'Next' }).click();
  for (const n of ['Mum', 'Dad', 'Grandparents', 'Holiday club']) {
    await s.locator('.pick-row__toggle', { hasText: n }).click();
    await wait(100);
  }
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
  const plan = [
    [0, 'Holiday club', 'Morning'], [1, 'Holiday club', 'Morning'], [2, 'Holiday club', 'Morning'],
    [0, 'Mum', 'Afternoon'], [1, 'Mum', 'Afternoon'], [2, 'Mum', 'Afternoon'],
    [3, 'Grandparents', 'All day'], [4, 'Dad', 'Morning'],
  ];
  for (const child of [0, 1]) {
    for (const [day, carer, choice] of plan) {
      const col = s.locator('.week-grid__child').nth(child).locator('.day-col').nth(day);
      await col.locator('button').last().click();
      await wait(250);
      const card = s.locator('.child-card').nth(child);
      await card.getByRole('button', { name: /Who’s looking after|Add another carer/ }).last().click();
      await card.locator('.carer-card', { hasText: carer }).click();
      await card.locator('.time-choice', { hasText: choice }).first().click();
      const save = card.getByRole('button', { name: /^Save / });
      await save.scrollIntoViewIfNeeded();
      await save.click();
      await wait(250);
      await s.getByRole('button', { name: 'Back to the week' }).click();
      await wait(250);
    }
  }
  const state = await ctx.storageState({ indexedDB: true });
  await ctx.close();
  return state;
}

async function shoot(browser, state, id, css) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, storageState: state });
  if (css) {
    await ctx.addInitScript((c) => {
      document.addEventListener('DOMContentLoaded', () => {
        const st = document.createElement('style');
        st.textContent = c;
        document.head.appendChild(st);
      });
    }, css);
  }
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173/');
  await wait(1200);
  await p.screenshot({ path: path.join(HERE, `${id}-home.png`) });
  await p.locator('.holiday-card__body').click();
  await wait(500);
  const week = p.getByRole('button', { name: 'Week' });
  if ((await week.getAttribute('aria-pressed')) !== 'true') await week.click();
  await wait(500);
  await p.screenshot({ path: path.join(HERE, `${id}-week.png`) });
  await ctx.close();
}

async function sheet(browser, th) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 1080 } });
  const p = await ctx.newPage();
  const img = (f) => `data:image/png;base64,${b64(path.join(HERE, f))}`;
  await p.setContent(`<body style="margin:0;background:#E9E6E1;font-family:Inter,sans-serif;padding:36px">
    <div style="font-size:40px;font-weight:800;color:#14110F">${th.name}</div>
    <div style="font-size:22px;color:#4A433C;margin:6px 0 24px">${th.note}</div>
    <div style="display:flex;gap:28px">
      <img src="${img(th.id + '-home.png')}" style="width:450px;border-radius:22px;box-shadow:0 10px 30px rgba(0,0,0,.2)">
      <img src="${img(th.id + '-week.png')}" style="width:450px;border-radius:22px;box-shadow:0 10px 30px rgba(0,0,0,.2)">
    </div></body>`);
  await p.screenshot({ path: path.join(HERE, `${th.id}-preview.png`), fullPage: true });
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  const state = await setUpFamily(browser);
  await shoot(browser, state, 'current', null);
  await sheet(browser, { id: 'current', name: 'Today', note: 'The current light theme, for comparison' });
  for (const th of THEMES) {
    await shoot(browser, state, th.id, themeCss(th));
    await sheet(browser, th);
    console.log('wrote', th.id);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
