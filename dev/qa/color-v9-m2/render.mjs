// Headless review renderer for Color Magic v9 M2.
// Loads the pack scripts in Chrome, checks the art rules, and writes 2048 px PNGs plus a contact sheet.
// No network. No extra dependencies. Original pack art is paths only; this file only reviews it.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readFileSync, statSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const outDir = path.join(here, 'out');
mkdirSync(outDir, { recursive: true });
const doRender = process.argv.includes('--render');
const port = 9333 + Math.floor(Math.random() * 400);
const profile = '/tmp/cm9-m2-chrome-' + port;

const html = `<!doctype html><meta charset="utf-8"><title>cm9 m2</title>
<canvas id="c" width="2048" height="2048"></canvas>
<script src="${path.join(root, 'color/packs/kit.js')}"></script>
<script src="${path.join(root, 'color/packs/kit2.js')}"></script>
<script src="${path.join(root, 'color/packs/rainbow.js')}"></script>
<script src="${path.join(root, 'color/packs/garden.js')}"></script>
<script src="${path.join(root, 'color/packs/space.js')}"></script>
<script>
const OUT = '#b2346f';
function drawPic(ctx, pic) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, 2048, 2048);
  ctx.fillStyle = pic.bg;
  ctx.fillRect(0, 0, 2048, 2048);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 10;
  ctx.strokeStyle = OUT;
  for (const s of pic.shapes) {
    ctx.fillStyle = pic.pal[s[0]];
    ctx.save();
    if (s[2]) ctx.clip(new Path2D(s[2]));
    const p = new Path2D(s[1]);
    ctx.fill(p);
    ctx.stroke(p);
    if (s[2]) ctx.stroke(new Path2D(s[2]));
    ctx.restore();
  }
  for (const l of pic.line) ctx.stroke(new Path2D(l));
}
function shapeAreas(pic, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const k = size / 2048, mul = (2048 / size) ** 2, areas = [];
  for (let i = 0; i < pic.shapes.length; i++) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.save();
    if (pic.shapes[i][2]) ctx.clip(new Path2D(pic.shapes[i][2]));
    ctx.fill(new Path2D(pic.shapes[i][1]));
    ctx.restore();
    const d = ctx.getImageData(0, 0, size, size).data;
    let n = 0;
    for (let p = 3; p < d.length; p += 4) if (d[p] > 128) n++;
    areas.push(n * mul);
  }
  return areas;
}
function packSummary(size) {
  const min = 0.01 * 2048 * 2048;
  const out = [];
  for (const id of Object.keys(CM_PACKS).sort((a, b) => CM_PACKS[a].order - CM_PACKS[b].order)) {
    const pack = CM_PACKS[id];
    for (const pic of pack.pics) {
      const areas = shapeAreas(pic, size);
      const big = pic.shapes.length >= 40 && pic.shapes.length <= 80;
      const fails = [];
      areas.forEach((a, i) => { if (big && a < min) fails.push({ i, a: Math.round(a), pct: +(a / (2048 * 2048) * 100).toFixed(3) }); });
      out.push({
        pack: id, id: pic.id, name: pic.name, stars: pic.stars, n: pic.shapes.length, colors: pic.pal.length,
        big, minPct: +(Math.min(...areas) / (2048 * 2048) * 100).toFixed(3), fails
      });
    }
  }
  return out;
}
function renderOne(id) {
  let pic = null;
  for (const p of Object.values(CM_PACKS)) pic = p.pics.find(x => x.id === id) || pic;
  const c = document.getElementById('c');
  drawPic(c.getContext('2d'), pic);
  return c.toDataURL('image/png').split(',')[1];
}
function contactSheet() {
  const pics = [];
  for (const id of ['rainbow', 'garden', 'space']) for (const pic of CM_PACKS[id].pics) pics.push(pic);
  const cols = 5, cell = 420, label = 64, pad = 28, head = 54;
  const groups = [['Rainbow Skies', 10], ['Magic Garden', 8], ['Space Party', 7]];
  let rows = 0;
  for (const g of groups) rows += Math.ceil(g[1] / cols);
  const W = pad * 2 + cols * cell, H = pad * 2 + groups.length * head + rows * (cell + label);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff1ee';
  g.fillRect(0, 0, W, H);
  const src = document.getElementById('c');
  let y = pad, n = 0;
  g.textAlign = 'left';
  g.fillStyle = '#5b2a86';
  for (const [title, count] of groups) {
    g.font = '700 32px sans-serif';
    g.fillText(title, pad, y + 36);
    y += head;
    const r = Math.ceil(count / cols);
    for (let i = 0; i < count; i++) {
      const pic = pics[n++];
      const col = i % cols, row = (i / cols) | 0;
      const x = pad + col * cell, yy = y + row * (cell + label);
      drawPic(src.getContext('2d'), pic);
      g.drawImage(src, x + 10, yy, cell - 20, cell - 20);
      g.font = '600 18px sans-serif';
      g.fillStyle = '#5b2a86';
      g.fillText(pic.name, x + 10, yy + cell - 4);
      g.font = '16px sans-serif';
      g.fillStyle = '#8a5080';
      g.fillText(pic.id + '   ' + pic.shapes.length + ' regions   ' + pic.pal.length + ' colors   ' + pic.stars + ' star' + (pic.stars > 1 ? 's' : ''), x + 10, yy + cell + 20);
    }
    y += r * (cell + label);
  }
  return { w: W, h: H, png: c.toDataURL('image/png').split(',')[1] };
}
</script>`;

const pagePath = path.join(here, 'review.html');
writeFileSync(pagePath, html);

function ruleScan() {
  const files = ['rainbow.js', 'garden.js', 'space.js', 'kit2.js'].map(n => path.join(root, 'color/packs', n));
  const provenance = 'Original art drawn in code by Grok 4.7 (paths only) for Dhanee\'s Playground, Oct 2026, review: Studio Lead';
  const rules = [];
  for (const f of files) {
    const t = readFileSync(f, 'utf8');
    const name = path.basename(f);
    rules.push([name + ' provenance', t.includes(provenance)]);
    const bad = [];
    if (/data:image|https?:|url\s*\(|@font|<text|<img|\.png|\.jpg|\.svg|\.webp|generateImage/i.test(t)) bad.push('external-or-raster');
    rules.push([name + ' paths only', bad.length === 0, bad.join(',')]);
  }
  return rules;
}

rmSync(profile, { recursive: true, force: true });
const chrome = spawn('google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile,
  '--allow-file-access-from-files', 'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });
let chromeLog = '';
chrome.stderr.on('data', d => { chromeLog += d; });
chrome.stdout.on('data', d => { chromeLog += d; });

async function waitJson() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + port + '/json/version');
      if (r.ok) return r.json();
    } catch { /* chrome still booting */ }
    await sleep(200);
  }
  throw new Error('chrome did not start\n' + chromeLog.slice(-2000));
}

let ws;
function send(method, params, sessionId) {
  const id = send.next++;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout ' + method)), 120000);
    send.pending.set(id, msg => { clearTimeout(t); msg.error ? reject(new Error(method + ' ' + JSON.stringify(msg.error))) : resolve(msg.result); });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}
send.next = 1;
send.pending = new Map();

try {
  await waitJson();
  const list = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  const page = list.find(t => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && send.pending.has(msg.id)) { const fn = send.pending.get(msg.id); send.pending.delete(msg.id); fn(msg); }
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: 'file://' + pagePath });
  for (let i = 0; i < 50; i++) {
    const r = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
    if (r.result.value === 'complete' && await readyPacks()) break;
    await sleep(100);
  }
  if (!await readyPacks()) throw new Error('packs did not load');

  const summary = await send('Runtime.evaluate', {
    expression: 'JSON.stringify(packSummary(512))',
    returnByValue: true,
    timeout: 120000
  });
  if (summary.exceptionDetails) throw new Error(JSON.stringify(summary.exceptionDetails));
  const rows = JSON.parse(summary.result.value);
  const rules = ruleScan();
  console.log('ART RULES');
  for (const [name, ok, extra] of rules) console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  ' + extra : ''));
  console.log('\nPICTURES');
  let failN = 0;
  for (const row of rows) {
    const mark = row.fails.length ? 'FAIL' : 'PASS';
    if (row.fails.length) failN++;
    console.log(mark, row.pack, row.id, row.big ? 'BIG' : '   ', 'n=' + row.n, 'colors=' + row.colors, 'stars=' + row.stars, 'min=' + row.minPct + '%', row.name);
    for (const f of row.fails) console.log('   shape', f.i, f.pct + '%', f.a + 'px');
  }
  const byPack = {};
  for (const row of rows) (byPack[row.pack] ||= []).push(row);
  console.log('\nPACK BIG COUNTS');
  for (const [pack, list] of Object.entries(byPack)) {
    const big = list.filter(r => r.big).length;
    console.log((big >= 3 ? 'PASS' : 'FAIL') + '  ' + pack + ' big=' + big);
  }
  writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(rows, null, 2));

  if (doRender && failN === 0) {
    for (const row of rows) {
      const shot = await send('Runtime.evaluate', { expression: 'renderOne(' + JSON.stringify(row.id) + ')', returnByValue: true, timeout: 60000 });
      if (shot.exceptionDetails) throw new Error(row.id + ' ' + JSON.stringify(shot.exceptionDetails));
      const file = path.join(outDir, row.pack + '-' + row.id + '.png');
      writeFileSync(file, Buffer.from(shot.result.value, 'base64'));
      console.log('wrote', file, statSync(file).size);
    }
    const sheet = await send('Runtime.evaluate', { expression: 'JSON.stringify(contactSheet())', returnByValue: true, timeout: 120000 });
    if (sheet.exceptionDetails) throw new Error(JSON.stringify(sheet.exceptionDetails));
    const parsed = JSON.parse(sheet.result.value);
    const sheetFile = path.join(outDir, 'contact-sheet.png');
    writeFileSync(sheetFile, Buffer.from(parsed.png, 'base64'));
    console.log('wrote', sheetFile, parsed.w + 'x' + parsed.h, statSync(sheetFile).size);
  } else if (doRender) {
    console.log('skip png render until area checks pass');
  }
  if (failN || rules.some(r => !r[1])) process.exitCode = 1;
} finally {
  try { chrome.kill('SIGKILL'); } catch { /* already gone */ }
  rmSync(profile, { recursive: true, force: true });
}

async function readyPacks() {
  const r = await send('Runtime.evaluate', { expression: 'typeof CM_PACKS!=="undefined" && !!(CM_PACKS.rainbow && CM_PACKS.garden && CM_PACKS.space)', returnByValue: true });
  return !!(r.result && r.result.value);
}
