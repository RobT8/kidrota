const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const D = require('path').join(__dirname, 'v2/');
const icon = 'data:image/png;base64,' + fs.readFileSync('/home/user/kidrota/design/icon/play-store-icon-512.png').toString('base64');
const coral = 'background:linear-gradient(160deg,#FFB38A 0%,#E2725B 55%,#B4465E 100%);';
const lines = [
  'All your holidays on one screen',
  'Gaps show in red',
  'Book the whole week in one go',
  'Hand-overs made easy',
  'See what’s left to sort',
  'Share the plan as a picture',
  'No account. No ads. Totally private.',
  'School holiday care, sorted.',
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const shot = async (html, file, w = 1920, h = 1080, transparent = false) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<!doctype html><html><head><style>*{margin:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden;font-family:'Segoe UI',Roboto,Arial,sans-serif;${transparent ? 'background:transparent' : ''}}</style></head><body>${html}</body></html>`);
    await p.waitForTimeout(120);
    await p.screenshot({ path: D + file, omitBackground: transparent });
  };
  await shot(`<div style="position:absolute;inset:0;${coral}"></div>
    <div style="position:absolute;top:70px;left:90px;display:flex;align-items:center;gap:20px;color:#fff;font-size:46px;font-weight:800"><img src="${icon}" style="width:84px;height:84px;border-radius:22px;box-shadow:0 8px 20px rgba(0,0,0,.2)">KidRota</div>`, 'bg.png');
  // Phone frame: 1032 x 2197, screen hole 1000 x 2165 at (16,16), rounded.
  await shot(`<div style="position:absolute;left:0;top:0;width:1032px;height:2197px;border-radius:84px;border:16px solid #2B1B2E"></div>
    <div style="position:absolute;left:16px;top:16px;width:1000px;height:2165px;border-radius:68px;box-shadow:0 0 0 60px #2B1B2E"></div>`, 'frame.png', 1032, 2197, true);
  for (const [i, text] of lines.entries()) {
    const body = text.split('|').map((t) => `<div>${t}</div>`).join('<div style="height:24px"></div>');
    await shot(`<div style="position:absolute;left:90px;top:0;bottom:0;width:640px;display:flex;flex-direction:column;justify-content:center;color:#fff;font-size:96px;font-weight:800;line-height:1.05;letter-spacing:-2px;text-wrap:balance;text-shadow:0 4px 24px rgba(80,0,30,.3)">${body}</div>`, `line${i + 1}.png`, 1920, 1080, true);
  }
  const card = (title, sub, extra = '') => `<div style="position:absolute;inset:0;${coral}display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center">
    <img src="${icon}" style="width:220px;height:220px;border-radius:52px;box-shadow:0 16px 40px rgba(0,0,0,.25)">
    <div style="font-size:130px;font-weight:800;margin-top:40px;letter-spacing:-2px">KidRota</div>
    <div style="font-size:60px;font-weight:700;margin-top:10px">${title}</div>
    <div style="font-size:40px;margin-top:22px;color:#FFF1EA">${sub}</div>${extra}</div>`;
  await shot(card('Who has the kids this holiday?', 'The school holiday childcare planner'), 'intro.png');
  await shot(card('School holiday care, sorted.', 'No account · No ads · Your plans stay on your phone',
    `<div style="margin-top:50px;background:#2B1B2E;border-radius:22px;padding:22px 46px;font-size:42px;font-weight:700">Get it on Google Play</div>`), 'outro.png');
  await b.close();
})();
