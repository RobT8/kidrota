// Frames the recorded walkthrough in a phone with captions: portrait + landscape MP4.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
const DIR = new URL('./', import.meta.url).pathname;
const V = DIR + 'video/', OUT = DIR + '../';
const { MARK } = await import('./compose-mark.mjs');
const f64 = (n) => readFileSync(`${DIR}fonts/${n}.woff2`).toString('base64');
const FONTS = `<style>@font-face{font-family:Nunito;font-weight:200 1000;src:url(data:font/woff2;base64,${f64('nunito')})}
@font-face{font-family:Inter;font-weight:500;src:url(data:font/woff2;base64,${f64('inter')})}*{margin:0;box-sizing:border-box}</style>`;
const BG = '#185FA5';
const CAPTIONS = {
  home:   ['Every school holiday, planned', 'See at a glance which days still need cover'],
  grid:   ['Gaps jump out', 'Red means nobody’s booked yet'],
  day:    ['Fill a gap in two taps', 'Pick Gran, the club or a playdate'],
  filled: ['Gap sorted', 'The week updates straight away'],
  list:   ['Every day, every child', 'The whole break in one list'],
  share:  ['Share it with the other parent', 'As a picture, or the whole plan as a code'],
};
// Voice-over clips (vo/<beat>.wav) are optional; with them, the end card waits for its line.
const VO = DIR + 'vo/';
const voice = existsSync(VO + 'durations.json') ? JSON.parse(readFileSync(VO + 'durations.json')) : null;
const END_SECS = voice ? Math.max(3, voice.end + 1.2) : 3;
const FPS = 30;
const run = (args) => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

// 1. Screencast frames → constant-rate app video.
const tl = JSON.parse(readFileSync(V + 'timeline.json'));
const lines = tl.frames.map((t, i) => {
  const d = (tl.frames[i + 1] ?? t + 0.1) - t;
  return `file 'frames/${String(i).padStart(5, '0')}.jpg'\nduration ${d.toFixed(4)}`;
});
writeFileSync(V + 'frames.txt', lines.join('\n') + `\nfile 'frames/${String(tl.frames.length - 1).padStart(5, '0')}.jpg'\n`);
const appDur = tl.frames.at(-1) + 0.1;
run(['-f', 'concat', '-safe', '0', '-i', V + 'frames.txt', '-vf', `fps=${FPS},scale=600:1200:flags=lanczos`, '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', V + 'app.mp4']);

// 2. Layouts. Screen rect is where the app video goes; the bezel PNG sits on top of it.
const LAYOUTS = {
  portrait:  { w: 1080, h: 1920, screen: { x: 240, y: 500, w: 600, h: 1200 }, bezel: 20, radius: 64, status: 44 },
  landscape: { w: 1920, h: 1080, screen: { x: 1210, y: 90, w: 450, h: 900 }, bezel: 16, radius: 50, status: 34 },
};
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const render = async (html, L, file, transparent = false) => {
  const p = await browser.newPage({ viewport: { width: L.w, height: L.h } });
  await p.setContent(FONTS + html); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: file, omitBackground: transparent }); await p.close();
};
const phoneBox = (L) => { const s = L.screen, b = L.bezel; return `left:${s.x - b}px;top:${s.y - L.status - b}px;width:${s.w + 2 * b}px;height:${s.h + L.status + 2 * b}px;border-radius:${L.radius + b}px`; };
const glow = `<div style="position:absolute;inset:0;background:radial-gradient(900px 700px at 85% 105%,rgba(255,255,255,.18),transparent 60%),radial-gradient(700px 500px at 0% 0%,rgba(255,255,255,.10),transparent 60%)"></div>`;
const caption = (name, L, [title, sub]) => {
  const portrait = L.h > L.w;
  const text = portrait
    ? `<div style="position:absolute;left:60px;right:60px;top:40px;height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff">
         <div style="display:flex;align-items:center;gap:16px;font:800 36px Nunito;margin-bottom:26px">${MARK(52)}KidRota</div>
         <h1 style="font:900 80px/1.05 Nunito;letter-spacing:-1px">${title}</h1>
         <p style="font:500 38px/1.35 Inter;color:rgba(255,255,255,.86);margin-top:20px">${sub}</p></div>`
    : `<div style="position:absolute;left:140px;width:880px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;color:#fff">
         <div style="display:flex;align-items:center;gap:18px;font:800 40px Nunito;margin-bottom:40px">${MARK(60)}KidRota</div>
         <h1 style="font:900 96px/1.04 Nunito;letter-spacing:-1px">${title}</h1>
         <p style="font:500 42px/1.35 Inter;color:rgba(255,255,255,.86);margin-top:28px">${sub}</p></div>`;
  return `<body style="width:${L.w}px;height:${L.h}px;background:${BG};position:relative;overflow:hidden">${glow}${text}
    <div style="position:absolute;${phoneBox(L)};background:#101010;box-shadow:0 40px 90px rgba(0,0,0,.35)"></div>
    <div style="position:absolute;left:${L.screen.x}px;top:${L.screen.y - L.status}px;width:${L.screen.w}px;height:${L.status + 40}px;background:#F5F3EE;border-radius:${L.radius}px ${L.radius}px 0 0"></div></body>`;
};
const bezel = (L) => `<body style="width:${L.w}px;height:${L.h}px;background:transparent;position:relative">
  <div style="position:absolute;${phoneBox(L)};border:${L.bezel}px solid #101010;box-shadow:inset 0 0 0 1px #000, 0 0 0 3px #2a2a2a"></div>
  <div style="position:absolute;left:${L.screen.x + L.screen.w / 2 - 11}px;top:${L.screen.y - L.status + (L.status - 22) / 2}px;width:22px;height:22px;border-radius:50%;background:#101010"></div></body>`;
const endCard = (L) => `<body style="width:${L.w}px;height:${L.h}px;background:${BG};position:relative;overflow:hidden">${glow}
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center">
    ${MARK(L.h > L.w ? 240 : 200)}
    <div style="font:900 ${L.h > L.w ? 120 : 110}px Nunito;margin-top:40px">KidRota</div>
    <div style="font:800 ${L.h > L.w ? 52 : 50}px/1.2 Nunito;margin-top:16px;padding:0 60px">School holiday childcare, sorted.</div>
    <div style="font:500 36px Inter;margin-top:56px;padding:18px 40px;border:2px solid rgba(255,255,255,.6);border-radius:999px">Get it on Google Play</div>
  </div></body>`;

// Music (synthesised, see music.py) ducked under the voice-over, muxed onto the video.
function mixAudio(video, out, total) {
  const music = V + 'music.wav';
  if (!existsSync(music)) execFileSync('python3', [DIR + 'music.py', music, total.toFixed(2)], { stdio: 'inherit' });
  if (!voice) {
    run(['-i', video, '-i', music, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', out]);
    return;
  }
  // Each line starts a beat after its scene appears; the last one over the end card.
  const starts = Object.fromEntries(tl.marks.filter((m) => voice[m.id] !== undefined).map((m) => [m.id, m.t + 0.3]));
  starts.end = appDur + 0.5;
  const ids = Object.keys(voice);
  const inputs = ids.flatMap((id) => ['-i', `${VO}${id}.wav`]);
  const delayed = ids.map((id, i) => `[${i + 2}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${Math.round(starts[id] * 1000)}:all=1[v${i}]`).join(';');
  run([
    '-i', video, '-i', music, ...inputs,
    '-filter_complex',
    `${delayed};${ids.map((_, i) => `[v${i}]`).join('')}amix=inputs=${ids.length}:normalize=0,volume=1.6,asplit[vo][key];` +
    `[1:a]volume=0.55[m];[m][key]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=450[duck];` +
    `[duck][vo]amix=inputs=2:normalize=0,alimiter=limit=0.95,atrim=duration=${total.toFixed(3)}[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', out,
  ]);
}

for (const [name, L] of Object.entries(LAYOUTS)) {
  const d = `${V}${name}/`; mkdirSync(d, { recursive: true });
  // Background track: one caption card per story beat, cut on the recorded marks.
  const beats = tl.marks.filter((m) => CAPTIONS[m.id]);
  const concat = [];
  for (const [i, m] of beats.entries()) {
    await render(caption(m.id, L, CAPTIONS[m.id]), L, `${d}${m.id}.png`);
    const end = beats[i + 1]?.t ?? appDur;
    concat.push(`file '${m.id}.png'\nduration ${(end - (i ? m.t : 0)).toFixed(3)}`);
  }
  writeFileSync(`${d}bg.txt`, concat.join('\n') + `\nfile '${beats.at(-1).id}.png'\n`);
  await render(bezel(L), L, `${d}bezel.png`, true);
  await render(endCard(L), L, `${d}end.png`);
  const s = L.screen, total = appDur + END_SECS;
  run([
    '-f', 'concat', '-safe', '0', '-i', `${d}bg.txt`,
    '-i', V + 'app.mp4',
    '-loop', '1', '-i', `${d}bezel.png`,
    '-loop', '1', '-t', String(END_SECS), '-i', `${d}end.png`,
    '-filter_complex',
    `[0:v]fps=${FPS},format=yuv420p,tpad=stop_mode=clone:stop_duration=${END_SECS}[bg];` +
    `[1:v]scale=${s.w}:${s.h}:flags=lanczos,tpad=stop_mode=clone:stop_duration=${END_SECS}[app];` +
    `[bg][app]overlay=${s.x}:${s.y}[a];[a][2:v]overlay=0:0:shortest=1[b];` +
    `[3:v]fps=${FPS},format=rgba,fade=in:st=0:d=0.5:alpha=1,setpts=PTS+${appDur.toFixed(3)}/TB[e];` +
    `[b][e]overlay=0:0:eof_action=pass,fade=in:st=0:d=0.4,trim=duration=${total.toFixed(3)}[v]`,
    '-map', '[v]', '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    `${d}silent.mp4`,
  ]);
  mixAudio(`${d}silent.mp4`, `${OUT}kidrota-demo-${name}.mp4`, total);
}
await browser.close();
console.log('done', (appDur + END_SECS).toFixed(1), 's');
