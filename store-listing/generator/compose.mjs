import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const DIR = new URL('./', import.meta.url).pathname;
const OUT = DIR + '../';
import { MARK } from './compose-mark.mjs';
const img = (n) => 'data:image/png;base64,' + readFileSync(`${DIR}shots/${n}.png`).toString('base64');
const f64 = (n) => readFileSync(`${DIR}fonts/${n}.woff2`).toString('base64');
const FONTS = `<style>@font-face{font-family:Nunito;font-weight:200 1000;src:url(data:font/woff2;base64,${f64('nunito')}) format('woff2')}
@font-face{font-family:Inter;font-weight:500;src:url(data:font/woff2;base64,${f64('inter')}) format('woff2')}</style>`;


const slides = [
  ['light-home',   'Every school holiday, planned', 'See at a glance which days still need childcare cover', '#185FA5'],
  ['light-planner','Gaps jump out',                 'Red means nobody’s booked yet — sort it before the break starts', '#A32D2D'],
  ['light-day',    'Assign cover in a tap',         'Gran, holiday club or a playdate — morning and afternoon', '#085041'],
  ['light-share',  'Share it with the other parent','Send the week as a picture, or the whole plan as a code', '#3C3489'],
  ['light-list',   'Every day, every child',        'Switch to a list to see the whole break in one scroll', '#633806'],
  ['light-carers', 'Everyone who helps, in one place','Family, clubs, playdates — with daily costs', '#72243E'],
  ['dark-planner', 'Private by design',              'No account, no cloud. Your plan stays on your phone', '#1A1A1A'],
];

const slideHtml = ([shot, title, sub, colour]) => `<!doctype html><html><head>${FONTS}<style>
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;background:${colour};font-family:Inter,sans-serif;position:relative}
.glow{position:absolute;inset:0;background:radial-gradient(900px 700px at 80% 105%,rgba(255,255,255,.18),transparent 60%),radial-gradient(700px 500px at 0% 0%,rgba(255,255,255,.10),transparent 60%)}
.brand{position:absolute;top:84px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:18px;color:#fff;font:800 38px Nunito;letter-spacing:.5px;opacity:.95}
h1{position:absolute;top:170px;left:70px;right:70px;text-align:center;color:#fff;font:900 88px/1.04 Nunito;letter-spacing:-1px}
p{position:absolute;top:${title.length>24?380:290}px;left:110px;right:110px;text-align:center;color:rgba(255,255,255,.86);font:500 40px/1.35 Inter}
.phone{position:absolute;left:50%;transform:translateX(-50%);top:${title.length>24?560:470}px;width:760px;height:1520px;border-radius:92px;background:#101010;padding:22px;box-shadow:0 40px 90px rgba(0,0,0,.35),inset 0 0 0 3px #333}
.screen{width:100%;height:100%;border-radius:72px;overflow:hidden;background:#fff;position:relative}
.screen img{width:100%;display:block}
.cam{position:absolute;top:22px;left:50%;transform:translateX(-50%);width:26px;height:26px;border-radius:50%;background:#101010;z-index:2}
.status{height:56px;background:${shot.startsWith('dark')?'#1A1A1A':'#F5F3EE'}}
</style></head><body><div class="glow"></div>
<div class="brand">${MARK(56)}KidRota</div>
<h1>${title}</h1><p>${sub}</p>
<div class="phone"><div class="screen"><div class="cam"></div><div class="status"></div><img src="${img(shot)}"></div></div>
</body></html>`;

const feature = `<!doctype html><html><head>${FONTS}<style>
*{margin:0;box-sizing:border-box}
body{width:1024px;height:500px;overflow:hidden;background:#185FA5;font-family:Inter,sans-serif;position:relative}
.glow{position:absolute;inset:0;background:radial-gradient(600px 400px at 90% 100%,rgba(255,255,255,.2),transparent 60%)}
.txt{position:absolute;left:64px;top:0;bottom:0;width:520px;display:flex;flex-direction:column;justify-content:center;color:#fff}
.brand{display:flex;align-items:center;gap:18px;font:900 64px Nunito;margin-bottom:22px}
h2{font:800 40px/1.15 Nunito;margin-bottom:16px}
p{font:500 22px/1.4 Inter;color:rgba(255,255,255,.85)}
.phone{position:absolute;right:70px;top:48px;width:330px;height:660px;border-radius:44px;background:#101010;padding:10px;transform:rotate(-6deg);box-shadow:0 30px 60px rgba(0,0,0,.35)}
.screen{width:100%;height:100%;border-radius:34px;overflow:hidden;background:#F5F3EE;padding-top:18px}
.screen img{width:100%;display:block}
</style></head><body><div class="glow"></div>
<div class="txt"><div class="brand">${MARK(80)}KidRota</div><h2>School holiday childcare, sorted.</h2><p>Plan who’s got the kids every day of the break — and spot the gaps at a glance.</p></div>
<div class="phone"><div class="screen"><img src="${img('light-planner')}"></div></div>
</body></html>`;

const icon = `<!doctype html><html><head><style>*{margin:0}body{width:512px;height:512px}</style></head><body>${MARK(512).replace('rx="22"','rx="0"')}</body></html>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const render = async (html, w, h, file) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: OUT + file }); await page.close();
};
for (const [i, s] of slides.entries()) await render(slideHtml(s), 1080, 1920, `phone-${i + 1}-${s[0]}.png`);
await render(feature, 1024, 500, 'feature-graphic-1024x500.png');
await render(icon, 512, 512, 'icon-512.png');
await browser.close();
