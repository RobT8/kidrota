/**
 * Regenerate every icon and splash image from artwork.cjs.
 *
 *   node design/icon/generate.cjs
 *
 * Needs Playwright (it renders the SVG in Chromium): `npm i -g playwright`.
 * Writes into android/app/src/main/res, public/favicon.svg and
 * design/icon/play-store-icon-512.png.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const icon = require('./artwork.cjs');

const ROOT = path.resolve(__dirname, '../..');
const RES = path.join(ROOT, 'android/app/src/main/res');
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const SPLASH = {
  'drawable/splash.png': [480, 320],
  'drawable-port-mdpi/splash.png': [320, 480], 'drawable-port-hdpi/splash.png': [480, 800],
  'drawable-port-xhdpi/splash.png': [720, 1280], 'drawable-port-xxhdpi/splash.png': [960, 1600],
  'drawable-port-xxxhdpi/splash.png': [1280, 1920],
  'drawable-land-mdpi/splash.png': [480, 320], 'drawable-land-hdpi/splash.png': [800, 480],
  'drawable-land-xhdpi/splash.png': [1280, 720], 'drawable-land-xxhdpi/splash.png': [1600, 960],
  'drawable-land-xxxhdpi/splash.png': [1920, 1280],
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  async function render(svgText, width, height, out, background = 'transparent') {
    await page.setViewportSize({ width, height });
    await page.setContent(
      `<html><body style="margin:0;background:${background};display:grid;place-items:center;width:${width}px;height:${height}px">${svgText}</body></html>`,
    );
    await page.screenshot({ path: out, omitBackground: background === 'transparent' });
    console.log('wrote', path.relative(ROOT, out), `${width}x${height}`);
  }
  const sized = (svgText, w, h) => svgText.replace(/width="108" height="108"/, `width="${w}" height="${h}"`);

  for (const [density, scale] of Object.entries(DENSITIES)) {
    const dir = path.join(RES, `mipmap-${density}`);
    const launcher = Math.round(48 * scale);
    const foreground = Math.round(108 * scale);
    await render(sized(icon.tile(), launcher, launcher), launcher, launcher, path.join(dir, 'ic_launcher.png'));
    await render(sized(icon.round(), launcher, launcher), launcher, launcher, path.join(dir, 'ic_launcher_round.png'));
    await render(sized(icon.foreground(), foreground, foreground), foreground, foreground, path.join(dir, 'ic_launcher_foreground.png'));
  }

  // Splash: the icon tile centred on the brand blue, about two-fifths of the short side.
  for (const [file, [w, h]] of Object.entries(SPLASH)) {
    const size = Math.round(Math.min(w, h) * 0.42);
    await render(sized(icon.tile(), size, size), w, h, path.join(RES, file), icon.BLUE);
  }

  await render(sized(icon.square(), 512, 512), 512, 512, path.join(__dirname, 'play-store-icon-512.png'));
  fs.writeFileSync(path.join(ROOT, 'public/favicon.svg'), icon.tile());
  console.log('wrote public/favicon.svg');
  await browser.close();
})();
