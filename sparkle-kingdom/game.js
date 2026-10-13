// Sparkle Kingdom (v3): engine + screens. One canvas, a fixed 1/120 s physics step (same feel at 60 and 120 Hz), pooled particles,
// every picture pre-rendered (art.js). Glimmer runs by herself: TAP = jump (coyote time + jump buffer), TAP IN THE AIR = wing flap,
// HOLD = float down slowly (and ride wind columns). No lives, no timers, no game over: gaps are bouncy clouds, and a bubble
// carries her to safety when her hearts run out.
(function () {
  'use strict';
  const A = SKArt, S = SKSave, Au = SKAudio, LV = SKLevels, FZ = window.FunZone;
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d', { alpha: false });
  const TILE = LV.TILE, BAND = 300, DT = 1 / 120, TAU = Math.PI * 2, GY0 = 282, PIT = 1e4;
  const PR = 11;                                                     // Glimmer's body radius (units); friendly on purpose
  const GRAV = 1500, JUMP = 535, FLAP = 430, SPRING = 790, COYOTE = 0.11, BUFFER = 0.15, FLOATG = 470, FLOATMAX = 78, FALLMAX = 560;
  const PRAISE = ['You did it', 'Amazing', 'What a star', 'Super jumping', 'Bouncy and brilliant', 'Sparkle power'];
  const LINES = {
    welcome: 'Welcome to Sparkle Kingdom', tap: 'Tap to jump! Hold to float down slowly.', flap: 'Tap again in the air to flap your wings!',
    pop: 'Jump on the grumpy puffs to pop them!', block: 'Jump up and bump the heart blocks!', gift: 'Surprise!', pit: 'Bouncy clouds!',
    wind: 'Hold to ride the wind!', gate: 'Jump and flap to grab the big star!', oops: 'Whoops! Bubble rescue!', check: 'Checkpoint!',
    heartstar: 'You got a heart star!', rainbow: 'Rainbow trail!', magnet: 'Gem magnet!', shield: 'Bubble shield!', giant: 'Giant Glimmer!',
    crown: 'You found a sparkle crown!', allcrowns: 'All three crowns! Golden sticker!', secret: 'You found a secret room!',
    combo3: 'Combo!', combo5: 'Super combo!', combo8: 'Mega combo!', sticker: 'You found a new sticker!', three: 'Wow, three stars!', two: 'Two stars!', one: 'One star!',
    boss: 'Here comes the Silver Puffball. Jump on its head three times!', boss2: 'Two more!', boss1: 'One more time!',
    win: 'You beat the Silver Puffball! You are the hero of Sparkle Kingdom!', rotate: 'Turn your phone sideways for more room!'
  };
  const LEVEL_SAY = { 1: 'Cloud Meadow!', 2: 'Flower Hills!', 3: 'Rainbow Slides!', 4: 'Gem Garden!' };
  const sayName = line => { try { return FZ ? FZ.withName(line) : line + '!'; } catch (e) { return line + '!'; } };
  const calm = () => { try { return FZ && FZ.calm(); } catch (e) { return false; } };
  const save = S.get();
  // voice: one line at a time; teaching lines (pri) may cut in, the rest wait their turn or are skipped
  let vBusy = 0;
  function speak(line, pri) { const now = performance.now(); if (!pri && now < vBusy) return false; vBusy = now + 700 + line.length * 60; Au.say(line); return true; }

  // ---------- size / camera / quality ----------
  let W = 0, H = 0, dpr = 1, scale = 1, oy = 0, viewW = 480, px = 130, lastW = 0, lastH = 0, q = 0, resK = 1;
  let scn = null, scnKey = '', vig = null;
  function fit() {
    W = innerWidth; H = innerHeight;
    let d = Math.min(window.devicePixelRatio || 1, 1.5); d = Math.min(d, Math.sqrt(1.2e6 / Math.max(1, W * H))); dpr = Math.max(0.75, d * resK);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    scale = Math.min(H / BAND, W / 300); oy = (H - BAND * scale) * 0.6; viewW = W / scale; px = viewW * 0.26;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); lastW = W; lastH = H; scnKey = '';
    gemTarget = null;
  }
  function theme(id) {
    const RS = scale * dpr, top = oy / scale + 2, key = id + '|' + RS.toFixed(3) + '|' + Math.ceil(top);
    if (key !== scnKey) { scn = A.scenery(id, RS, top); scnKey = key; pattern = null; qGrace = 1.2; }
    return scn;
  }
  let pattern = null, qGrace = 1.2, runId = 0;   // runId changes whenever a level starts or the map opens (stale wipes are ignored)
  const curTheme = () => state === 'map' || !def ? 'meadow' : inBonus ? 'treasure' : def.theme;

  // ---------- state ----------
  let state = 'map', lvl = null, def = null, ents = [], ecount = 0, lo = 0, plats = [], plo = 0, winds = [], camX = 0, speed = 0, wt = 0, tAcc = 0, last = 0, raf = 0;
  let fy = GY0, vy = 0, onG = true, coy = 0, buf = 0, fresh = 0, pend = 0, flaps = 1, jumpT = 1, hold = false, sqS = 0, sqV = 0, runPh = 0, wingT = 0;
  let glow = 2, inv = 0, shield = false, magT = 0, rbT = 0, giantT = 0, gs = 1, bubbleT = 0, faceK = 'head', faceT = 0, blinkT = 2;
  let chain = 0, chainT = 0, combo = 0, runGems = 0, total = 1, crownsRun = 0, gateStar = false, jumps = 0, frozen = false;
  let shake = 0, flash = 0, fade = 0, ready = 0, finished = false, finT = 0, finStars = 0, forceStars = 0;
  let boss = null, arenaCam = -1, progEnd = 1, main = null, inBonus = false;
  let look = S.glim(), G = A.glimmer(look), mapT = 0, slowT = 0, fastT = 0;
  const yHist = new Float32Array(256); let yh = 0;
  const ptrs = new Set();
  const debug = { noHurt: false, auto: false, skip: 0 };   // skip = test-only bit mask of layers not drawn (perf experiments)

  // ---------- particles (fixed pool) ----------
  const NP = 240, pX = new Float32Array(NP), pY = new Float32Array(NP), pVX = new Float32Array(NP), pVY = new Float32Array(NP), pL = new Float32Array(NP), pM = new Float32Array(NP), pT = new Uint8Array(NP), pS = new Float32Array(NP), pG = new Float32Array(NP);
  const PSPR = [A.P.starW, A.P.starG, A.P.heart, A.P.dot, A.P.dotP, A.P.cloud, A.P.sh[0], A.P.sh[1], A.P.sh[2], A.P.sh[3], A.P.conf[0], A.P.conf[1], A.P.conf[2], A.P.conf[3], A.P.conf[4], A.P.conf[5], A.P.ring, A.P.zzz, A.P.note];
  const T_STAR = 0, T_GOLD = 1, T_HEART = 2, T_DOT = 3, T_DOTP = 4, T_CLOUD = 5, T_SH = 6, T_CONF = 10, T_RING = 16, T_ZZZ = 17, T_NOTE = 18;
  let pi = 0;
  function emit(x, y, vx, vy, life, type, sc, grav) { pi = (pi + 1) % NP; pX[pi] = x; pY[pi] = y; pVX[pi] = vx; pVY[pi] = vy; pL[pi] = pM[pi] = life; pT[pi] = type; pS[pi] = sc; pG[pi] = grav; }
  function spark(x, y, n, type, spd, life) {
    if (calm()) n = Math.ceil(n / 3); else if (q > 0) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (0.35 + Math.random() * 0.65) * (spd || 90); emit(x, y, Math.cos(a) * v, Math.sin(a) * v - 20, (life || 0.7) * (0.6 + Math.random() * 0.5), type == null ? (Math.random() * 3 | 0) : type, 0.7 + Math.random() * 0.6, 60); }
  }
  function shards(x, y, n) { if (calm()) n = Math.ceil(n / 3); for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 60 + Math.random() * 90; emit(x, y, Math.cos(a) * v, Math.sin(a) * v - 40, 0.6 + Math.random() * 0.3, T_SH + (i & 3), 0.8 + Math.random() * 0.5, 320); } }
  function puffs(x, y, n, spd) { for (let i = 0; i < n; i++) { const a = Math.PI + (i / Math.max(1, n - 1)) * Math.PI, v = (spd || 40) * (0.6 + Math.random() * 0.5); emit(x, y, Math.cos(a) * v, Math.sin(a) * v * 0.4 - 6, 0.45 + Math.random() * 0.2, T_CLOUD, 0.6 + Math.random() * 0.5, -20); } }
  function ringFx(x, y, sc) { emit(x, y, 0, 0, 0.45, T_RING, sc || 1, 0); }
  function confetti(n) { if (calm()) n = Math.ceil(n / 3); for (let i = 0; i < n; i++) emit(camX + Math.random() * viewW, -10 - Math.random() * 60, (Math.random() - .5) * 40, 40 + Math.random() * 80, 2.2 + Math.random(), T_CONF + (Math.random() * 6 | 0), .9 + Math.random() * .5, 30); }
  function stepParticles(dt) { for (let i = 0; i < NP; i++) if (pL[i] > 0) { pL[i] -= dt; pX[i] += pVX[i] * dt; pY[i] += pVY[i] * dt; pVY[i] += pG[i] * dt; if (pT[i] === T_CLOUD) { pVX[i] *= 0.96; } } }
  // number popups (world space) and gems flying to the counter (screen space)
  const NPOP = 14, popX = new Float32Array(NPOP), popY = new Float32Array(NPOP), popL = new Float32Array(NPOP), popS = new Array(NPOP).fill(null); let popI = 0;
  function popup(x, y, key) { const s = A.POP[key]; if (!s) return; popI = (popI + 1) % NPOP; popX[popI] = x; popY[popI] = y; popL[popI] = 0.9; popS[popI] = s; }
  const NFG = 28, fgX = new Float32Array(NFG), fgY = new Float32Array(NFG), fgT = new Float32Array(NFG), fgK = new Uint8Array(NFG); let fgI = 0, gemTarget = null, plateK = 0;
  function flyGem(wx, wy, k) {
    fgI = (fgI + 1) % NFG; fgX[fgI] = (wx - camX) * scale; fgY[fgI] = oy + wy * scale; fgT[fgI] = 0.0001; fgK[fgI] = k;
  }
  // ambient sparkles drifting in screen space
  const NA = 22, aX = new Float32Array(NA), aY = new Float32Array(NA), aP = new Float32Array(NA), aV = new Float32Array(NA);
  for (let i = 0; i < NA; i++) { aX[i] = Math.random(); aY[i] = Math.random(); aP[i] = Math.random() * TAU; aV[i] = 0.4 + Math.random() * 0.6; }

  // ---------- level loading ----------
  const gAt = c => c < 0 ? lvl.gh[0] : c >= lvl.cols ? lvl.gh[lvl.cols - 1] : lvl.gh[c];
  function groundAt(x) {
    const u = x / TILE, c = Math.floor(u); if (gAt(c) < 0) return PIT;
    const v = u - 0.5, i = Math.floor(v), f = v - i; let a = gAt(i), b = gAt(i + 1); if (a < 0) a = b; if (b < 0) b = a;
    const s = (1 - Math.cos(f * Math.PI)) / 2; return GY0 - TILE * (a * (1 - s) + b * s);
  }
  const ENEMY = { b: 1, j: 1, n: 1, y: 1, p: 1 }, ITEM = { P: 1, R: 1, U: 1, S: 1, Z: 1 }, GROUNDED = { b: 1, j: 1, n: 1, F: 1, K: 1 };
  const ER = { b: 14, j: 14, n: 14, y: 12, p: 11 };
  function mkEnt(k, x, y) { return { k, x, y, y0: y, x0: x, on: true, ph: (x * 0.07) % TAU, r: 8, hit: false, t: 0, st: 0, vx: 0, vy: 0, fx: 'grump', ft: 0, ci: -1, home: false, sq: 0 }; }
  function load(levelDef, list) {
    const b = LV.build(levelDef, list); lvl = b; lvl.gh = Float32Array.from(b.ground);
    ents = []; plats = []; winds = []; arenaCam = -1; total = 0; let ci = list ? 2 : 0;
    for (let c = 0; c < b.cols; c++) for (let r = 0; r < LV.ROWS; r++) {
      const ch = b.rows[r][c]; if (ch === '.' || ch === '=') continue; const x = c * TILE + TILE / 2, y = r * TILE + TILE / 2;
      if (ch === 'B') { arenaCam = x; continue; }
      if (ch === 'W') { winds.push({ x0: x - 17, x1: x + 17, x }); continue; }
      const e = mkEnt(ch, x, y);
      if (GROUNDED[ch]) { e.y = e.y0 = groundAt(x); }
      if (ch === 'g') { e.r = 8; total += 1; } else if (ch === 'G') { e.r = 13; total += 5; } else if (ch === 'Q') { total += 5; }
      else if (ch === 'C') { e.r = 14; e.ci = ci++; if (S.crowns(levelDef.id) & (1 << e.ci)) e.had = true; }
      else if (ENEMY[ch]) { e.r = ER[ch]; e.vx = ch === 'b' ? -22 : 0; }
      else if (ITEM[ch]) e.r = 14;
      else if (ch === 'E') { e.y = 150; ents.push(Object.assign(mkEnt('T', x, 118), { r: 26 })); }
      ents.push(e);
    }
    for (let r = 0; r < LV.ROWS; r++) { const row = b.rows[r]; for (let c = 0; c < b.cols; c++) if (row[c] === '=') { let e = c; while (e + 1 < b.cols && row[e + 1] === '=') e++; plats.push({ x0: c * TILE, x1: (e + 1) * TILE, y: r * TILE + 5, c0: c, c1: e }); c = e; } }
    ents.sort((a, b) => a.x - b.x); plats.sort((a, b) => a.x0 - b.x0); ecount = ents.length; lo = 0; plo = 0;
    if (!total) total = 1;
  }
  function resetPlayer() {
    fy = groundAt(camX + px); vy = 0; onG = true; coy = 0; buf = 0; fresh = 0; pend = 0; flaps = 1; jumpT = 1; sqS = 0; sqV = 0; hold = false; ptrs.clear();
    yHist.fill(fy - PR);
  }
  function startLevel(i) {
    runId++; def = LV.DEFS.find(d => d.id === i); main = null; inBonus = false; load(def);
    camX = 0; speed = 0; wt = 0; glow = 2; inv = 0; shield = false; magT = 0; rbT = 0; giantT = 0; gs = 1; bubbleT = 0; faceK = 'head';
    chain = 0; chainT = 0; combo = 0; runGems = 0; crownsRun = 0; gateStar = false; jumps = 0; frozen = false;
    shake = 0; flash = 0; fade = 0.8; finished = false; finT = 0; forceStars = 0; ready = 0; boss = null; pL.fill(0); popL.fill(0); fgT.fill(0);
    progEnd = def.boss ? Math.max(1, arenaCam) : (ents.find(e => e.k === 'E') || { x: lvl.cols * TILE }).x;
    resetPlayer(); theme(def.theme); Au.fast(1);
    $('map').hidden = true; $('hud').hidden = false; $('pauseM').hidden = true; $('resM').hidden = true; $('setM').hidden = true;
    hudGlow = hudGems = hudCr = -1; setHearts(); setGems(); setCrowns(); setProg(0); state = 'play'; look = S.glim(); G = A.glimmer(look);
    pushGuard(); try { FZ && FZ.wake(true); } catch (e) { }
    Au.init(); Au.start(); Au.music(def.theme);
    banner(def); qGrace = 1.2;
    const first = !S.seen('tap');
    $('hint').hidden = !first;
    if (first) { S.markSeen('tap'); speak(LINES.tap, true); if (H > W && !S.seen('rotate')) { S.markSeen('rotate'); setTimeout(() => { if (state === 'play') speak(LINES.rotate); }, 4800); } }
    else if (!def.boss) speak(LEVEL_SAY[def.id] || def.name, true);
    startLoop();
  }
  function banner(d) {
    const b = $('banner'); b.innerHTML = '<span>' + A.SVG.level[d.icon] + '</span>'; b.hidden = false; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    clearTimeout(banner.t); banner.t = setTimeout(() => { b.hidden = true; }, 2300);
  }
  // ---------- the HUD ----------
  let hudGlow = -1, hudGems = -1, hudCr = -1;
  function setHearts() { if (hudGlow === glow) return; hudGlow = glow; const h = $('hearts').children; for (let i = 0; i < 3; i++) h[i].classList.toggle('off', i >= glow); }
  function setGems() { if (hudGems === runGems) return; hudGems = runGems; $('gemc').textContent = runGems; }
  function setCrowns() { const m = crownsRun | (def ? S.crowns(def.id) : 0); if (hudCr === m) return; hudCr = m; const c = $('crowns').children; for (let i = 0; i < 3; i++) c[i].innerHTML = (m >> i & 1) ? A.SVG.crown : A.SVG.crownOff; }
  const progDot = $('progDot'), gemPlate = $('gemPlate'); let progLast = -1;
  function setProg(f) { const v = Math.round(f * 200) / 2; if (v === progLast) return; progLast = v; progDot.style.left = v + '%'; }
  function findGemTarget() { const r = $('gemIc').getBoundingClientRect(); gemTarget = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  // ---------- moves ----------
  const R = () => PR * gs;
  function doJump() {
    vy = -JUMP * (gs > 1.2 ? 1.08 : 1); onG = false; coy = 0; buf = 0; fresh = 0; jumpT = 0; flaps = 1; sqS = 0.3; sqV = 0;
    puffs(camX + px, fy, 4, 50); jumps++; if (jumps === 1) $('hint').hidden = true;
    if (jumps === 4 && !S.seen('flap')) { S.markSeen('flap'); speak(LINES.flap, true); }
  }
  function doFlap() {
    vy = Math.min(vy, -FLAP); flaps--; buf = 0; fresh = 0; jumpT = 0; sqS = 0.18; wingT = 0.3;
    const x = camX + px - 6 * gs, y = fy - 18 * gs; for (let i = 0; i < 5; i++) emit(x, y, -40 - Math.random() * 50, 30 + Math.random() * 50, 0.45, i & 1 ? T_STAR : T_DOTP, 0.8, 40);
  }
  function floorAt(wx, prevF, rr) {
    let f = groundAt(wx);
    while (plo < plats.length && plats[plo].x1 < camX - 80) plo++;
    for (let i = plo; i < plats.length; i++) { const p = plats[i]; if (p.x0 > wx + rr) break; if (p.x1 < wx - rr) continue; if (p.y >= prevF - 3 && p.y < f) f = p.y; }
    for (let i = lo; i < ecount; i++) { const e = ents[i]; if (e.x - 14 > wx + rr) break; if ((e.k === 'H' || e.k === 'M') && Math.abs(e.x - wx) < 12.5 + rr) { const top = e.y - 12.5; if (top >= prevF - 3 && top < f) f = top; } }
    return f;
  }
  function inWind(wx) { for (let i = 0; i < winds.length; i++) { const w = winds[i]; if (wx > w.x0 && wx < w.x1) return true; } return false; }
  function land(fl, v) {
    fy = fl; if (!onG) { if (v > 240) { sqS = -Math.min(0.32, v / 1500); sqV = 0; puffs(camX + px, fl, 5, 60); if (gs > 1.2) giantLand(); } combo = 0; flaps = 1; }
    onG = true; vy = 0;
  }
  function giantLand() {
    Au.thud(); shake = calm() ? 0 : 0.18; const wx = camX + px;
    for (let i = lo; i < ecount; i++) { const e = ents[i]; if (e.x > wx + 90) break; if (e.on && ENEMY[e.k] && e.st === 0 && Math.abs(e.x - wx) < 90 && e.k !== 'y') stomp(e, false); }
  }
  // ---------- hits ----------
  function hurt(e) {
    if (inv > 0 || debug.noHurt || bubbleT > 0) return;
    if (e) { e.fx = 'giggle'; e.ft = 1.2; e.x += 6; }
    if (shield) { shield = false; inv = 1.2; Au.shieldPop(); ringFx(camX + px, fy - R(), 1.6); vy = -300; onG = false; return; }
    Au.hurt(); try { FZ && FZ.buzz(30); } catch (x) { }
    spark(camX + px, fy - R(), 8, T_HEART, 70, 0.7); shake = calm() ? 0 : 0.2; inv = 1.6; faceK = 'oops'; faceT = 0.7; combo = 0;
    glow--; setHearts(); vy = -320; onG = false;
    if (glow <= 0) rescue();
  }
  function rescue() {
    bubbleT = 1.4; vy = 0; Au.bubble(); speak(LINES.oops);
  }
  // ---------- one physics step ----------
  function step(dt) {
    wt += dt; mapT += dt;
    if (state !== 'play') { stepParticles(dt); return; }
    if (frozen) return;
    if (inv > 0) inv -= dt; if (chainT > 0) { chainT -= dt; if (chainT <= 0) chain = 0; } if (shake > 0) shake -= dt; if (flash > 0) flash -= dt * 2.5; if (fade > 0) fade -= dt * 1.8;
    if (faceT > 0) { faceT -= dt; if (faceT <= 0) faceK = 'head'; } blinkT -= dt; if (blinkT < -0.12) blinkT = 2 + Math.random() * 2.5;
    if (wingT > 0) wingT -= dt; if (plateK > 0) { plateK -= dt * 4; gemPlate.style.transform = plateK > 0 ? 'scale(' + (1 + plateK * 0.18).toFixed(3) + ')' : ''; }
    if (magT > 0) magT -= dt; if (rbT > 0) { rbT -= dt; if (rbT <= 0) Au.fast(1); }
    if (giantT > 0) giantT -= dt; gs += ((giantT > 0 ? 1.6 : 1) - gs) * Math.min(1, dt * 6);
    // squash & stretch spring
    sqV += (-260 * sqS - 16 * sqV) * dt; sqS += sqV * dt;
    if (finished) { finT += dt; stepParticles(dt); speed *= 0.99; camX += speed * dt; if (!onG) { vy += GRAV * 0.6 * dt; fy += vy * dt; const g = groundAt(camX + px); if (fy >= g) land(g, vy); } stepPops(dt); return; }
    // scroll: eases in at the start, holds still in the boss arena
    ready += dt; const target = lvl.speed * (rbT > 0 ? 1.12 : 1);
    if (ready < 0.6) speed = 0; else speed += (target - speed) * Math.min(1, dt * 2.5);
    if (arenaCam >= 0 && !boss && camX >= arenaCam - 30) startBoss();
    if (boss && !boss.done) camX = arenaCam; else camX += speed * dt;
    const wx = camX + px;
    if (debug.auto) autopilot(wx);
    if (pend) { pend = 0; buf = BUFFER; fresh = 1; }
    if (bubbleT > 0) {
      bubbleT -= dt; vy = 0; fy += (205 - fy) * Math.min(1, dt * 3); onG = false;
      if (bubbleT <= 0) { glow = 2; setHearts(); inv = 1.6; Au.shieldPop(); ringFx(wx, fy - R(), 1.8); spark(wx, fy - R(), 10, T_DOT, 80, .6); vy = -150; flaps = 1; }
    } else {
      const rr = R();
      if (onG) coy = COYOTE; else coy -= dt;
      if (buf > 0) {
        if (onG || coy > 0) doJump();
        else if (fresh && flaps > 0 && !(vy > 0 && fy + vy * 0.12 >= floorAt(wx, fy, 6) - 2)) doFlap();
        buf -= dt;
      }
      fresh = 0; jumpT += dt;
      let g = GRAV, maxF = FALLMAX;
      if (vy < 0 && !hold && jumpT > 0.1) g = GRAV * 1.7;
      if (vy > 0 && hold) { g = FLOATG; maxF = FLOATMAX; }
      if (winds.length && inWind(wx)) { if (hold) g = -1150; else { g = GRAV * 0.45; maxF = 150; } if ((yh & 3) === 0) emit(wx + (Math.random() - .5) * 20, fy + 10, 0, -120, 0.5, T_DOT, 0.7, 0); if (!S.seen('wind')) { S.markSeen('wind'); speak(LINES.wind, true); } }
      vy += g * dt; if (vy > maxF) vy = maxF; if (vy < -640) vy = -640;
      const prevF = fy; fy += vy * dt;
      if (fy - 2 * rr < 2) { fy = 2 + 2 * rr; if (vy < 0) vy = 0; }
      const fl = floorAt(wx, prevF, 6), gy = groundAt(wx);
      if (vy >= 0) { if (fy >= fl) land(fl, vy); else if (onG && fl - fy < 10) fy = fl; else onG = false; }
      else onG = false;
      if (gy !== PIT && fy > gy) { fy = gy; if (vy > 0) vy = 0; onG = true; }
      if (fy > 314 && !onG) {  // a gap: the bouncy clouds throw her back up
        vy = hold ? -780 : -730; flaps = 1; combo = 0; sqS = 0.3; Au.boing(); Au.splash(); puffs(wx, 300, 8, 90); spark(wx, 300, 6, T_HEART, 80, .6);
        if (!S.seen('pit')) { S.markSeen('pit'); speak(LINES.pit, true); }
      }
      if (onG) runPh += dt * Math.max(speed, 60) * 0.11;
    }
    const cy = fy - R();
    yh = (yh + 1) & 255; yHist[yh] = cy;
    interact(dt, wx, cy);
    if (boss) stepBoss(dt, wx, cy);
    if (rbT > 0 && !calm() && (yh & 3) === 0) emit(wx - 10, cy + (Math.random() - .5) * 14, -30, 0, 0.5, T_CONF + (yh >> 2) % 6, 0.8, 0);
    if (magT > 0 && !calm() && (yh & 7) === 0) { const a = wt * 6; emit(wx + Math.cos(a) * 26, cy + Math.sin(a) * 26, 0, 0, 0.3, T_GOLD, 0.6, 0); }
    stepParticles(dt); stepPops(dt);
    if (!inBonus && (yh & 7) === 0) setProg(Math.min(1, (camX + px) / progEnd));
  }
  function stepPops(dt) { for (let i = 0; i < NPOP; i++) if (popL[i] > 0) { popL[i] -= dt; popY[i] -= 28 * dt; } for (let i = 0; i < NFG; i++) if (fgT[i] > 0) { fgT[i] += dt * 2.2; if (fgT[i] >= 1) { fgT[i] = 0; plateK = 1; } } }
  // ---------- everything she can touch ----------
  function interact(dt, wx, cy) {
    const rr = R(), view = camX + viewW + 90, near = camX - 90;
    while (lo < ecount && ents[lo].x < near - 40) lo++;
    for (let i = lo; i < ecount; i++) {
      const e = ents[i]; if (e.x > view) break; if (!e.on) continue;
      const k = e.k; let dx = e.x - wx;
      if (k === 'g' || k === 'G') {
        if (magT > 0 || e.home) { const dy = e.y - cy, d2 = dx * dx + dy * dy; if (d2 < 19600 && d2 > 1) { const d = Math.sqrt(d2), s = (e.home ? 260 : 380) * dt; e.x -= dx / d * s; e.y -= dy / d * s; } }
        else if (e.vy) { e.vy += 700 * dt; e.y += e.vy * dt; e.x += e.vx * dt; e.t += dt; if (e.t > 0.35) e.home = true; }
        const ddx = e.x - wx, ddy = e.y - cy, r2 = e.r + rr + 4;
        if (ddx * ddx + ddy * ddy < r2 * r2) collectGem(e);
      } else if (k === 'Q') {
        if (!e.hit && Math.abs(dx) < 10 + rr * 0.5 && Math.abs(e.y - cy) < 26) { e.hit = true; runGems += 5; setGems(); Au.ring(); ringFx(e.x, e.y, 1.5); spark(e.x, e.y, 10, T_GOLD, 90, .6); popup(e.x, e.y - 30, '+5'); flyGem(e.x, e.y, 2); }
      } else if (k === 'C') {
        const dy = e.y - cy; if (dx * dx + dy * dy < (e.r + rr + 6) ** 2) collectCrown(e);
      } else if (ENEMY[k]) {
        moveEnemy(e, dt, wx);
        if (e.st === 0) {
          const ecy = enemyCy(e), dy = ecy - cy, rad = e.r + rr - 2;
          if (dx * dx + dy * dy < rad * rad && bubbleT <= 0) {
            if (rbT > 0 || gs > 1.3) stomp(e, false);
            else if (vy > 30 && cy < ecy - e.r * 0.2) stomp(e, true);
            else hurt(e);
          }
        } else if (e.st === 1) { e.t += dt; if (e.t > 0.22) poof(e); }
      } else if (k === 'H' || k === 'M') {
        if (e.t > 0) e.t -= dt;
        if (vy < 0 && Math.abs(dx) < 12.5 + rr * 0.6) { const head = fy - 2 * rr; if (head <= e.y + 12.5 && head > e.y - 2) { vy = 80; fy = e.y + 12.5 + 2 * rr + 0.5; if (!e.hit) hitBlock(e); else Au.bonk(); } }
      } else if (ITEM[k]) {
        e.t += dt; if (e.vy) { e.vy += 300 * dt; if (e.vy > 0) e.vy = 0; e.y += e.vy * dt; }
        if (e.home && e.t > 0.45) { const dy = e.y - cy, d = Math.sqrt(dx * dx + dy * dy) || 1, s = 240 * dt; e.x -= dx / d * s; e.y -= dy / d * s; dx = e.x - wx; }
        const dy = e.y - cy; if (dx * dx + dy * dy < (e.r + rr + 6) ** 2) takePower(e);
      } else if (k === 'F') {
        if (e.t > 0) e.t -= dt;
        if (Math.abs(dx) < 13 + rr * 0.4 && fy >= e.y - 16 && fy <= e.y + 3 && vy >= 0 && bubbleT <= 0) { vy = hold ? -SPRING - 40 : -SPRING; onG = false; flaps = 1; jumpT = 0; combo = 0; e.t = 0.25; sqS = 0.35; sqV = 0; Au.boing(); spark(e.x, e.y - 14, 8, T_HEART, 80, .6); }
      } else if (k === 'O') {
        const dy = e.y - cy; if (dx * dx + dy * dy < (24 + rr) ** 2 && !inBonus && def.bonus) enterBonus(e);
      } else if (k === 'X') {
        if (wx >= e.x - 6 && inBonus) exitBonus();
      } else if (k === 'K') {
        if (!e.hit && wx >= e.x) { e.hit = true; Au.check(); spark(e.x, e.y - 40, 16, null, 100, .9); confettiAt(e.x, e.y - 60, 16); flash = 0.3; if (glow < 3) { glow++; setHearts(); } speak(LINES.check); }
      } else if (k === 'T') {
        e.t += dt; const dy = e.y - cy; if (!e.hit && dx * dx + dy * dy < (e.r + rr) ** 2) { e.hit = true; gateStar = true; Au.bigStar(); spark(e.x, e.y, 22, T_GOLD, 140, 1); ringFx(e.x, e.y, 2.4); flash = 0.4; }
        if (!e.hit && dx < 150 && dx > 60 && !S.seen('gatestar')) { S.markSeen('gatestar'); speak(LINES.gate, true); }
      } else if (k === 'E') {
        if (wx >= e.x) finish();
      }
      // teach ideas the first time she meets them (spoken once, saved)
      if (dx > 50 && dx < 170) {
        if (ENEMY[k] && k !== 'p' && !S.seen('pop')) { S.markSeen('pop'); speak(LINES.pop, true); }
        else if ((k === 'H' || k === 'M') && !e.hit && !S.seen('block')) { S.markSeen('block'); speak(LINES.block, true); }
      }
    }
  }
  function confettiAt(x, y, n) { if (calm()) n = Math.ceil(n / 3); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 80 + Math.random() * 120; emit(x, y, Math.cos(a) * v, Math.sin(a) * v, 1.3, T_CONF + (i % 6), 1, 260); } }
  function collectGem(e) {
    e.on = false; const big = e.k === 'G', n = big ? 5 : 1; runGems += n; setGems(); chain++; chainT = 0.7;
    if (big) { Au.bigGem(); shards(e.x, e.y, 10); ringFx(e.x, e.y, 1.2); popup(e.x, e.y - 22, '+5'); } else { Au.gem(chain); spark(e.x, e.y, 3, T_STAR, 50, .4); }
    flyGem(e.x, e.y, big ? 2 : ((e.x / TILE) | 0) % 4 & 3);
    if (faceT <= 0) { faceK = 'joy'; faceT = 0.25; }
  }
  function collectCrown(e) {
    e.on = false; crownsRun |= 1 << e.ci; const all = S.addCrown(def.id, e.ci); setCrowns();
    Au.crown(); spark(e.x, e.y, 24, T_GOLD, 150, 1.1); shards(e.x, e.y, 12); ringFx(e.x, e.y, 2.2); flash = 0.45; shake = calm() ? 0 : 0.1; faceK = 'joy'; faceT = 0.8;
    speak(all ? LINES.allcrowns : LINES.crown, true);
  }
  const enemyCy = e => e.k === 'y' ? e.y : e.y - e.r - 1;
  function moveEnemy(e, dt, wx) {
    if (e.ft > 0) e.ft -= dt;
    if (e.st === 0) e.fx = e.ft > 0 ? 'giggle' : (e.x - wx > 0 && e.x - wx < 140 && (!onG || e.x - wx < 60)) ? 'eek' : 'grump';
    if (e.st !== 0) return;
    if (e.k === 'b') { const nx = e.x + e.vx * dt; if (groundAt(nx + (e.vx < 0 ? -12 : 12)) === PIT) e.vx = -e.vx; else e.x = nx; e.y = groundAt(e.x); e.t += dt; }
    else if (e.k === 'j') { e.t += dt; if (e.vy === 0 && e.t > 1.3) { e.vy = -300; e.t = 0; } if (e.vy !== 0 || e.y < groundAt(e.x)) { e.vy += 900 * dt; e.y += e.vy * dt; const g = groundAt(e.x); if (e.y >= g) { e.y = g; e.vy = 0; e.sq = 0.3; } } if (e.sq > 0) e.sq -= dt; }
    else if (e.k === 'n') { e.y = e.y0 - Math.abs(Math.sin(wt * 2.4 + e.ph)) * 52; }
    else if (e.k === 'y') { e.y = e.y0 + Math.sin(wt * 2.2 + e.ph) * 16; }
    else if (e.k === 'p') { e.x -= e.vx * dt; const g = groundAt(e.x); e.y = (g === PIT ? GY0 : g) - Math.abs(Math.sin(wt * 6 + e.ph)) * 6; if (e.x < camX - 60) e.on = false; }
  }
  function stomp(e, bounce) {
    e.st = 1; e.t = 0; e.fx = 'dizzy'; combo++; const n = Math.min(combo, 5); runGems += n; setGems();
    Au.pop(combo); Au.squeak(); spark(e.x, enemyCy(e), 8, T_STAR, 100, .6); popup(e.x, enemyCy(e) - 26, combo >= 2 ? 'x' + Math.min(combo, 9) : '+' + n); flyGem(e.x, enemyCy(e), 1);
    if (bounce) { vy = hold ? -600 : -470; onG = false; flaps = 1; jumpT = 0; sqS = 0.25; sqV = 0; }
    if (combo >= 2) Au.combo(combo);
    if (combo === 3) speak(LINES.combo3); else if (combo === 5) speak(LINES.combo5); else if (combo === 8) speak(LINES.combo8);
    if (faceT <= 0) { faceK = 'joy'; faceT = 0.4; }
  }
  function poof(e) {
    e.on = false; const y = enemyCy(e); puffs(e.x, y, 6, 70); spark(e.x, y, 6, T_HEART, 90, .8); ringFx(e.x, y, 1);
  }
  function hitBlock(e) {
    e.hit = true; e.t = 0.25; Au.block(); spark(e.x, e.y - 10, 8, null, 80, .6);
    if (e.k === 'M') {   // a surprise gift: a power-up pops out and floats to her
      Au.gift(); confettiAt(e.x, e.y - 12, 14); flash = 0.25;
      const pool = glow < 2 ? ['P', 'S', 'U'] : ['U', 'S', 'Z', 'R', 'U', 'Z']; const k = pool[(Math.random() * pool.length) | 0];
      const it = mkEnt(k, e.x, e.y - 18); it.r = 14; it.vy = -160; it.home = true; insert(it); speak(LINES.gift);
    } else if (glow < 3 && ((e.x * 7) % 3) < 1) { const it = mkEnt('P', e.x, e.y - 18); it.r = 14; it.vy = -160; it.home = true; insert(it); }
    else for (let i = 0; i < 5; i++) { const g = mkEnt('g', e.x, e.y - 14); g.vx = (i - 2) * 26; g.vy = -260 - (i % 2) * 60; insert(g); }
  }
  function takePower(e) {
    e.on = false; const k = e.k, x = e.x, y = e.y; spark(x, y, 16, null, 120, .8); ringFx(x, y, 1.6); flash = 0.4; Au.power(); faceK = 'joy'; faceT = 0.6;
    if (k === 'P') { if (glow < 3) glow++; setHearts(); Au.heart(); speak(LINES.heartstar); }
    else if (k === 'R') { rbT = 8; inv = Math.max(inv, 0.1); Au.fast(1.25); speak(LINES.rainbow); }
    else if (k === 'U') { magT = 10; speak(LINES.magnet); }
    else if (k === 'S') { shield = true; speak(LINES.shield); }
    else if (k === 'Z') { giantT = 7; Au.giant(); shake = calm() ? 0 : 0.15; speak(LINES.giant); }
  }
  // keep the list sorted by x (new things appear near her, so a short insertion is cheap)
  function insert(o) { let i = ecount; ents.push(o); ecount++; while (i > 0 && ents[i - 1].x > o.x) { ents[i] = ents[i - 1]; i--; } ents[i] = o; if (i < lo) lo = i; }

  // ---------- secret rooms ----------
  function wipe(mid) {
    const w = $('wipe'); w.hidden = false; w.classList.remove('out'); w.classList.add('in'); frozen = true;
    const run = runId; setTimeout(() => { if (run === runId) mid(); w.classList.remove('in'); w.classList.add('out'); frozen = false; setTimeout(() => { if (w.classList.contains('out')) w.hidden = true; }, 420); }, calm() ? 150 : 380);
  }
  function enterBonus(e) {
    if (inBonus || frozen) return; e.on = false; Au.portal(); S.markSecret(def.id); speak(LINES.secret, true);
    const saved = { lvl, ents, ecount, lo, plats, plo, winds, camX, total, exitX: e.x + 160 };
    wipe(() => { if (state !== 'play' && state !== 'pause') return; main = saved; inBonus = true; load(def, def.bonus); camX = 0; resetPlayer(); fy = 150; onG = false; theme('treasure'); Au.music('treasure'); ready = 0.4; });
  }
  function exitBonus() {
    if (!inBonus || frozen || !main) return; Au.portal();
    wipe(() => { const m = main; main = null; inBonus = false; lvl = m.lvl; ents = m.ents; ecount = m.ecount; plats = m.plats; winds = m.winds; total = m.total; camX = m.exitX - px; lo = 0; plo = 0; resetPlayer(); theme(def.theme); Au.music(def.theme); });
  }

  // ---------- boss: the Silver Puffball ----------
  function startBoss() {
    boss = { hp: 3, st: 'enter', t: 0, sx: viewW + 140, by: 110, ph: 0, spd: 1, face: 'grump', puffT: 1.2, sq: 0, bonk: 0, done: false, gone: false };
    speak(LINES.boss, true); Au.start(); Au.music('silver'); Au.fast(1.1);
  }
  function stepBoss(dt, wx, cy) {
    const b = boss; b.t += dt; if (b.sq > 0) b.sq -= dt; if (b.bonk > 0) b.bonk -= dt;
    if (b.done) { b.by -= 30 * dt; b.sx += 20 * dt; if ((yh & 15) === 0) emit(camX + b.sx, b.by - 40, 0, -40, 1, T_HEART, 1, -10); if (b.t > 2.6) { b.gone = true; if (!b.gate) spawnGate(); } return; }
    const gy = GY0 - 44;
    if (b.st === 'enter') { b.sx += (px + 170 - b.sx) * Math.min(1, dt * 1.6); if (b.t > 2) { b.st = 'float'; b.t = 0; } }
    else if (b.st === 'float') {
      b.ph += dt * 1.1 * b.spd; b.sx = px + 160 + Math.cos(b.ph) * 60; b.by = 105 + Math.sin(b.ph * 1.6) * 22; b.face = 'grump';
      b.puffT -= dt * b.spd; if (b.puffT <= 0) { b.puffT = 2.3; const p = mkEnt('p', camX + b.sx - 20, gy); p.r = 11; p.vx = 85 * b.spd; insert(p); Au.bossLaugh(); }
      if (b.t > 5.5) { b.st = 'swoop'; b.t = 0; }
    } else if (b.st === 'swoop') {
      b.sx += (px + 190 - b.sx) * Math.min(1, dt * 2.5); b.by += (gy - b.by) * Math.min(1, dt * 2.5);
      if (b.t > 0.9) { b.st = 'tired'; b.t = 0; b.face = 'tired'; Au.thud(); puffs(camX + b.sx, GY0, 8, 80); }
    } else if (b.st === 'tired') {
      b.sx -= 42 * b.spd * dt; b.by = gy + Math.sin(wt * 3) * 1.5; if ((yh & 31) === 0) emit(camX + b.sx + 30, b.by - 46, 12, -30, 1.2, T_ZZZ, 1, 0);
      if (b.sx < px - 80) { b.st = 'float'; b.t = 0; b.face = 'hmph'; }
    } else if (b.st === 'dizzy') {
      b.face = 'dizzy'; if (b.t > 1.5) { b.st = 'rise'; b.t = 0; b.face = 'hmph'; Au.bossLaugh(); }
    } else if (b.st === 'rise') {
      b.by += (105 - b.by) * Math.min(1, dt * 2); b.sx += (px + 160 - b.sx) * Math.min(1, dt * 2); if (b.t > 1) { b.st = 'float'; b.t = 0; b.ph = 0; }
    }
    // Glimmer vs the Puffball: landing on its head is a hit; touching its side just bounces her up (never hurts)
    if (b.st === 'tired' || b.st === 'float' || b.st === 'swoop') {
      const bx = camX + b.sx, dx = bx - wx, dy = b.by - cy, rad = 40 + R();
      if (dx * dx + dy * dy < rad * rad) {
        if (b.st === 'tired' && vy > 0 && cy < b.by - 20) hitBoss(bx);
        else if (bubbleT <= 0 && (b.st === 'tired' || dy > 0)) { if (b.bonk <= 0) { vy = -680; onG = false; flaps = 1; Au.boing(); b.sq = 0.2; b.bonk = 0.3; spark(wx, cy, 5, T_STAR, 60, .5); } }
        else if (bubbleT <= 0 && vy < 0) { vy = 140; Au.bonk(); }
      }
    }
  }
  function hitBoss(bx) {
    const b = boss; b.hp--; b.st = 'dizzy'; b.t = 0; b.sq = 0.35; vy = -560; onG = false; flaps = 1; combo++; Au.pop(combo + 3); Au.boing();
    spark(bx, b.by - 30, 18, null, 130, .9); ringFx(bx, b.by, 2.5); flash = 0.4; shake = calm() ? 0 : 0.2; runGems += 5; setGems(); popup(bx, b.by - 60, '+5'); b.spd *= 1.18;
    if (b.hp === 2) speak(LINES.boss2, true); else if (b.hp === 1) speak(LINES.boss1, true);
    if (b.hp <= 0) {
      b.done = true; b.t = 0; b.face = 'happy'; for (let i = 0; i < 3; i++) spark(bx, b.by, 24, i === 1 ? T_GOLD : T_HEART, 170, 1.4); confetti(60); Au.fanfare(); speak(LINES.win, true);
      for (let i = lo; i < ecount; i++) if (ents[i].k === 'p') ents[i].on = false;
      const c = mkEnt('C', bx - 30, 150); c.r = 14; c.ci = 2; c.home = true; insert(c);
      for (let i = 0; i < 12; i++) { const g = mkEnt('g', bx, b.by); g.vx = (i - 6) * 18; g.vy = -280 - (i % 3) * 50; insert(g); }
    }
  }
  function spawnGate() { boss.gate = true; arenaCam = -1; const x = camX + viewW + 120; progEnd = x; const e = mkEnt('E', x, 150); insert(e); const t = mkEnt('T', x, 118); t.r = 26; insert(t); }

  // ---------- finishing ----------
  function finish() {
    if (finished) return; finished = true; finT = 0; hold = false;
    finStars = forceStars || (1 + (gateStar ? 1 : 0) + (runGems >= total * 0.6 ? 1 : 0));
    confetti(70); Au.fanfare(); Au.stopMusic(); setTimeout(() => Au.star(0), 300); if (finStars > 1) setTimeout(() => Au.star(1), 520); if (finStars > 2) setTimeout(() => Au.star(2), 740);
    const r = S.finish(def.id, finStars, runGems); try { FZ && FZ.wake(false); } catch (e) { }
    setTimeout(() => showResult(r), 1700);
  }
  function showResult(r) {
    if (state !== 'play') return; state = 'result';
    const st = $('resStars').children; for (let i = 0; i < 3; i++) { st[i].classList.toggle('on', i < finStars); st[i].style.animationDelay = (i * 0.25) + 's'; }
    $('resGems').textContent = runGems; const m = S.crowns(def.id); const rc = $('resCrowns').children; for (let i = 0; i < 3; i++) rc[i].innerHTML = (m >> i & 1) ? A.SVG.crown : A.SVG.crownOff;
    const stk = $('resStk'); stk.hidden = !r.newSticker; stk.classList.toggle('gold', m === 7); if (r.newSticker) stk.innerHTML = A.SVG.sticker[r.newSticker];
    const next = def.id < S.LEVELS; $('bNext').hidden = !next; $('rGo').innerHTML = (next ? A.SVG.play : A.SVG.map) + '<span>' + (next ? 'Next' : 'Map') + '</span>'; $('rGo').setAttribute('aria-label', next ? 'Next level' : 'Map'); $('rGo').dataset.next = next ? 1 : ''; $('resM').hidden = false; $('hud').hidden = true; $('hint').hidden = true;
    speak(finStars === 3 ? LINES.three : finStars === 2 ? LINES.two : LINES.one, true);
    setTimeout(() => { if (state === 'result') speak(sayName(PRAISE[Math.random() * PRAISE.length | 0]), true); }, 1800);
    if (r.newSticker) setTimeout(() => { if (state === 'result') speak(LINES.sticker, true); }, 3600);
    Au.music('map');
  }

  // ---------- drawing ----------
  // strips are blitted 1:1 in device pixels at whole-pixel positions (no scaling while playing)
  function tileStrip(img, par, cx, yU, drift) {
    const sw = img.width, Wd = cv.width; let o = -Math.round(((cx * par + (drift || 0)) * scale * dpr) % sw); if (o > 0) o -= sw;
    const y = Math.round((oy + yU * scale) * dpr); for (let x = o; x < Wd; x += sw) ctx.drawImage(img, x, y);
  }
  function drawBack(cx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    tileStrip(scn.far, 0.16, cx, -(scn.far.hu - 272));   // opaque: sky + sun + mountains + castle
    if (debug.skip & 1) return;
    tileStrip(scn.clouds, 0.1, cx, 4, wt * 7);
    tileStrip(scn.mid, 0.36, cx, 135);
    tileStrip(scn.near, 0.62, cx, 220);
  }
  function terrainPath(x0, x1, bottom, top) {
    const c0 = Math.max(0, Math.floor(x0 / TILE)), c1 = Math.min(lvl.cols - 1, Math.ceil(x1 / TILE));
    ctx.beginPath();
    for (let c = c0; c <= c1;) {
      if (lvl.gh[c] < 0) { c++; continue; } let e = c; while (e + 1 <= c1 && lvl.gh[e + 1] >= 0) e++;
      const xa = c === c0 ? x0 : c * TILE, xb = e === c1 ? x1 : (e + 1) * TILE;
      if (top) { ctx.moveTo(xa, groundAt(xa) + (c === c0 ? 0 : 14)); } else { ctx.moveTo(xa, bottom); }
      ctx.lineTo(xa, groundAt(xa)); for (let x = Math.ceil(xa / 12.5) * 12.5; x < xb; x += 12.5) ctx.lineTo(x, groundAt(x)); ctx.lineTo(xb, groundAt(xb - 0.5));
      if (top) { if (e !== c1) ctx.lineTo(xb, groundAt(xb - 0.5) + 14); } else { ctx.lineTo(xb, bottom); ctx.closePath(); }
      c = e + 1;
    }
  }
  const DOTS = [0.1, 11];
  function drawTerrain() {
    const t = scn.t, x0 = camX - 30, x1 = camX + viewW + 30, bottom = (H - oy) / scale + 10;
    const c0 = Math.max(0, Math.floor(x0 / TILE)), c1 = Math.min(lvl.cols - 1, Math.ceil(x1 / TILE));
    // bouncy cloud sea in the gaps
    for (let c = c0; c <= c1; c++) if (lvl.gh[c] < 0) { const x = c * TILE + 12.5; ctx.fillStyle = t.near[1]; ctx.fillRect(x - 13, 288, 26, bottom - 288); ctx.drawImage(A.cloudSea, x - 16, 296 + Math.sin(wt * 2 + c) * 2, 32, 26); ctx.drawImage(A.cloudSea, x - 6, 312 + Math.sin(wt * 2.4 + c * 2) * 2, 32, 26); }
    if (!pattern) { pattern = ctx.createPattern(scn.pat, 'repeat'); try { pattern.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, 0, 0])); } catch (e) { } }
        // a layer cake: solid body (+ sprinkles), a lighter top layer and a cream line drawn as strokes (much cheaper than a big gradient fill)
    terrainPath(x0, x1, bottom, false); ctx.fillStyle = t.ground[1]; ctx.fill(); if (q < 1) { ctx.fillStyle = pattern; ctx.fill(); }
    terrainPath(x0, x1, bottom, true);
    ctx.save(); ctx.translate(0, 13); ctx.lineWidth = 26; ctx.strokeStyle = t.ground[0]; ctx.stroke(); if (q < 1) { ctx.translate(0, 17); ctx.lineWidth = 3; ctx.strokeStyle = t.ground[2]; ctx.globalAlpha = 0.45; ctx.stroke(); ctx.globalAlpha = 1; }
    if (bottom > 360 && q < 2) { ctx.translate(0, q < 1 ? 50 : 80); ctx.lineWidth = 12; ctx.strokeStyle = t.ground[0]; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.translate(0, 70); ctx.lineWidth = 5; ctx.strokeStyle = t.edge; ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();
    if (q < 1) { ctx.save(); ctx.translate(0, 3); ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(90,20,80,.18)'; ctx.stroke(); ctx.restore(); }
    ctx.lineWidth = 7; ctx.strokeStyle = t.edge; ctx.stroke();
    if (q < 2) { ctx.save(); ctx.translate(0, 6); ctx.setLineDash(DOTS); ctx.lineWidth = 3.4; ctx.strokeStyle = t.edge2; ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
    const D = A.deco[t.deco] || A.deco.flower;
    for (let c = c0; c <= c1; c++) { const h = (c * 2654435761) >>> 0; if (h % 5 > 1 || lvl.gh[c] < 0 || gAt(c - 1) < 0 || gAt(c + 1) < 0) continue; const s = D[h % 3], x = c * TILE + 4 + (h >> 8) % 16; ctx.drawImage(s, x - s.w / 2, groundAt(x) - s.h + 3, s.w, s.h); }
  }
  function stamp(s, x, y, k, a) { const w = s.w * (k || 1), h = s.h * (k || 1); if (a != null && a < 1) ctx.globalAlpha = a; ctx.drawImage(s, x - w / 2, y - h / 2, w, h); if (a != null && a < 1) ctx.globalAlpha = 1; }
  function stampFeet(s, x, feet, sx, sy) { const w = s.w * sx, h = s.h * sy; ctx.drawImage(s, x - w / 2, feet - h, w, h); }
  function drawPlats(x0, x1) {
    for (let i = plo; i < plats.length; i++) { const p = plats[i]; if (p.x0 > x1) break; if (p.x1 < x0) continue;
      for (let c = p.c0; c <= p.c1; c++) { const s = c === p.c0 ? A.platL : c === p.c1 ? A.platR : A.platM; ctx.drawImage(s, c * TILE + 12.5 - 15, p.y - 6 + Math.sin(wt * 1.5 + p.c0) * 0.8, 30, 20); } }
  }
  function drawWorld() {
    const sx = shake > 0 ? (Math.random() - .5) * 7 : 0, sy = shake > 0 ? (Math.random() - .5) * 7 : 0;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (-camX * scale + sx), dpr * (oy + sy));
    if (!(debug.skip & 2)) drawTerrain();
    const view = camX + viewW + 80, near = camX - 80;
    for (let i = 0; i < winds.length; i++) { const w = winds[i]; if (w.x > near && w.x < view) { ctx.globalAlpha = 0.55 + Math.sin(wt * 5 + w.x) * 0.15; ctx.drawImage(A.wind, w.x - 18, groundAt(w.x) - 300 + ((wt * 60) % 34) - 17, 36, 300); ctx.globalAlpha = 1; } }
    drawPlats(near, view);
    const gf = ((wt * 9) | 0);
    for (let i = lo; i < ecount; i++) {
      const e = ents[i]; if (e.x > view) break; if (e.x < near) continue; const k = e.k;
      if (k === 'g') { if (e.on) { const f = (gf + ((e.x * 0.13) | 0)) % 16; ctx.drawImage(A.gems[((e.x0 / TILE) | 0) & 3][f < 6 ? f : 6], e.x - 8.5, e.y - 8.5 + Math.sin(wt * 3 + e.x0 * 0.05) * 1.5, 17, 17); } }
      else if (k === 'G') { if (e.on) { const f = (gf + 3) % 14; stamp(A.glow, e.x, e.y, 1.2, 0.6); stamp(A.gemBig[f < 6 ? f : 6], e.x, e.y + Math.sin(wt * 2.4 + e.x) * 2, 1 + Math.sin(wt * 4) * 0.04); } }
      else if (k === 'Q') stamp(e.hit ? A.ringDone : A.ring, e.x, e.y, 1 + (e.hit ? 0 : Math.sin(wt * 4 + e.x) * 0.04));
      else if (k === 'C') { if (e.on) { stamp(A.glowGold, e.x, e.y, 1.6 + Math.sin(wt * 3) * 0.1, 0.8); stamp(A.crown, e.x, e.y + Math.sin(wt * 2.5) * 3, 0.9 + Math.sin(wt * 5) * 0.04, e.had ? 0.75 : 1); if ((gf & 7) === 0 && !calm()) emit(e.x + (Math.random() - .5) * 26, e.y + (Math.random() - .5) * 20, 0, -10, .5, T_STAR, .6, 0); } }
      else if (k === 'H' || k === 'M') { const bo = e.t > 0 ? -Math.sin(e.t / 0.25 * Math.PI) * 6 : 0; stamp(e.hit ? A.blockUsed : k === 'M' ? A.blockGift : A.blockHeart, e.x, e.y + bo, 1 + (e.hit ? 0 : Math.sin(wt * 3 + e.ph) * 0.03)); }
      else if (ENEMY[k]) { if (e.on) drawEnemy(e); }
      else if (ITEM[k]) { if (e.on) { stamp(A.glow, e.x, e.y, 1.3, 0.7); const s = k === 'P' ? A.heartStar : k === 'R' ? A.rainbowPick : k === 'U' ? A.magnet : k === 'S' ? A.shieldPick : A.giantPick; stamp(s, e.x, e.y + Math.sin(wt * 3 + e.ph) * 3, 1 + Math.sin(wt * 5) * 0.06); } }
      else if (k === 'F') { const s = e.t > 0 ? A.flowerDn : A.flowerUp; stampFeet(s, e.x, e.y + 6, 1, 1 + (e.t > 0 ? 0 : Math.sin(wt * 4 + e.ph) * 0.04)); }
      else if (k === 'O' || k === 'X') { if (e.on) { const s = k === 'O' ? A.portal : A.portalOut; stamp(A.glow, e.x, e.y, 2, 0.8); ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(wt * 2.5); ctx.drawImage(s, -28, -28, 56, 56); ctx.restore(); } }
      else if (k === 'K') stampFeet(e.hit ? A.checkpointOn : A.checkpointOff, e.x, e.y + 8, 1, 1);
      else if (k === 'E') { ctx.globalAlpha = 0.95; ctx.drawImage(A.gate, e.x - 35, 0, 70, 300); ctx.globalAlpha = 1; }
      else if (k === 'T') { if (!e.hit) { stamp(A.bigStar, e.x, e.y + Math.sin(wt * 2.5) * 5, 1 + Math.sin(wt * 4) * 0.06); } }
    }
    if (boss && !boss.gone) drawBoss();
    drawGlimmer();
    for (let i = 0; i < NP; i++) if (pL[i] > 0) {
      const s = PSPR[pT[i]], f = pL[i] / pM[i];
      if (pT[i] === T_RING) { const k = pS[i] * (0.4 + (1 - f) * 1.6); ctx.globalAlpha = f; ctx.drawImage(s, pX[i] - s.w * k / 2, pY[i] - s.h * k / 2, s.w * k, s.h * k); continue; }
      const qk = Math.min(1, f * 3) * pS[i]; ctx.globalAlpha = Math.min(1, f * 2.5); ctx.drawImage(s, pX[i] - s.w * qk / 2, pY[i] - s.h * qk / 2, s.w * qk, s.h * qk);
    }
    for (let i = 0; i < NPOP; i++) if (popL[i] > 0) { const s = popS[i], f = popL[i] / 0.9, k = f > 0.8 ? 1 + (f - 0.8) * 3 : 1; ctx.globalAlpha = Math.min(1, f * 2.5); ctx.drawImage(s, popX[i] - s.w * k / 2, popY[i] - s.h * k / 2, s.w * k, s.h * k); }
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScreenFx();
  }
  function drawScreenFx() {
    // gems flying to the counter
    if (!gemTarget && state === 'play') findGemTarget();
    if (gemTarget) for (let i = 0; i < NFG; i++) if (fgT[i] > 0) { const t = fgT[i], e = t * t, x = fgX[i] + (gemTarget.x - fgX[i]) * e, y = fgY[i] + (gemTarget.y - fgY[i]) * e - Math.sin(t * Math.PI) * 40, s = A.gems[fgK[i]][6], k = 14 + (1 - t) * 8; ctx.drawImage(s, x - k / 2, y - k / 2, k, k); }
    if (debug.skip & 4) return;
    if (q < 1 && !calm()) drawAmbient();
    if (q < 1) { if (!vig || vig.W !== W || vig.H !== H) makeVig(); ctx.drawImage(vig, 0, 0, W, H); }
    if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(.35, flash * .5).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
    if (fade > 0) { ctx.fillStyle = 'rgba(255,214,236,' + Math.min(1, fade).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
  }
  function makeVig() { vig = document.createElement('canvas'); vig.width = 128; vig.height = 128; vig.W = W; vig.H = H; const g = vig.getContext('2d'), gr = g.createRadialGradient(64, 60, 30, 64, 64, 92); gr.addColorStop(0, 'rgba(120,20,110,0)'); gr.addColorStop(1, 'rgba(120,20,110,.28)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  function drawAmbient() {
    const t = scn.t, s = A.ambS[t.amb] || A.P.starW, k = Math.max(10, 10 * scale * 0.5);
    for (let i = 0; i < NA; i++) {
      let x = (aX[i] * W - wt * 12 * aV[i] * scale) % W; if (x < 0) x += W; let y = (aY[i] * H + wt * (t.amb === 'snow' || t.amb === 'petal' ? 22 : -8) * aV[i] * scale) % H; if (y < 0) y += H;
      ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(wt * 2.5 + aP[i])); const kk = k * (0.6 + aV[i] * 0.6); ctx.drawImage(s, x - kk / 2, y - kk / 2, kk, kk);
    }
    ctx.globalAlpha = 1;
  }
  function drawEnemy(e) {
    const k = e.k, set = k === 'b' ? A.bunny : k === 'j' ? A.jelly : k === 'n' ? A.snow : k === 'y' ? A.flyer : A.puff, s = set[e.fx] || set.grump;
    if (e.st === 1) { const f = e.t / 0.22; stampFeet(s, e.x, k === 'y' ? e.y + e.r : e.y + 2, 1 + f * 0.5, Math.max(0.3, 1 - f * 0.7)); return; }
    if (k === 'b') { const hop = Math.abs(Math.sin(e.t * 9)) * 2.5; stamp(A.shadow, e.x, e.y, 0.9, 0.7); stampFeet(s, e.x, e.y + 4 - hop, 1, 1); }
    else if (k === 'j') { const sq = e.sq > 0 ? e.sq : 0, wob = Math.sin(wt * 6 + e.ph) * 0.05; stamp(A.shadow, e.x, groundAt(e.x), 0.9, 0.7); stampFeet(s, e.x, e.y + 2, 1 + sq + wob, 1 - sq - wob); }
    else if (k === 'n') { stamp(A.shadow, e.x, groundAt(e.x), 0.8, 0.6); const bot = Math.abs(Math.sin(wt * 2.4 + e.ph)) < 0.15; stampFeet(s, e.x, e.y + 4, bot ? 1.15 : 1, bot ? 0.88 : 1); }
    else if (k === 'y') { stamp(s, e.x, e.y, 1, null); }
    else stampFeet(s, e.x, e.y + 3, 1, 1);
  }
  function drawBoss() {
    const b = boss, bx = camX + b.sx, by = b.by, spr = A.boss[b.face] || A.boss.grump, sq = b.sq > 0 ? Math.sin(b.sq / 0.35 * Math.PI) * 0.25 : 0, k = 1 + Math.sin(wt * 3) * 0.025;
    stamp(A.shadow, bx, GY0 + 1, 3.2, Math.max(0.15, 0.8 - (GY0 - by) / 300));
    if (b.st === 'dizzy') for (let i = 0; i < 3; i++) { const a = wt * 5 + i * 2.1; stamp(A.P.starG, bx + Math.cos(a) * 46, by - 56 + Math.sin(a) * 8, 1.2); }
    const w = spr.w * k * (1 + sq), h = spr.h * k * (1 - sq); ctx.drawImage(spr, bx - w / 2, by - h / 2 + (spr.h * k - h) / 2, w, h);
  }
  function drawGlimmer() {
    const wx = camX + px, r = R(), blink = inv > 0 && bubbleT <= 0 && !calm() && ((inv * 10) | 0) % 2 === 0;
    // shadow on whatever is under her
    const fl = floorAt(wx, fy, 6); if (fl < PIT) { const hgt = Math.max(0, fl - fy); stamp(A.shadow, wx, fl + 1, gs * Math.max(0.4, 1 - hgt / 220), Math.max(0.2, 1 - hgt / 180)); }
    if (rbT > 0) { ctx.lineWidth = 3.2; ctx.globalAlpha = Math.min(1, rbT) * 0.85; for (let c = 0; c < 6; c++) { ctx.strokeStyle = A.RBOW[c]; ctx.beginPath(); for (let i = 0; i < 16; i++) { const h = yHist[(yh - i * 5) & 255], X = wx - 8 - i * speed * 5 / 120, Y = h + (c - 2.5) * 3; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); } ctx.stroke(); } ctx.globalAlpha = 1; }
    if (blink) ctx.globalAlpha = 0.45;
    const sy = 1 + sqS, sxx = 1 - sqS * 0.55;
    ctx.save(); ctx.translate(wx, fy); ctx.scale(sxx * gs, sy * gs);
    const lag = Math.max(1, Math.round(10.5 / Math.max(70, speed || 70) * 120));
    for (let i = 4; i >= 1; i--) {
      const hy = (yHist[(yh - lag * i) & 255] - fy) / gs + PR, bob = onG ? -Math.abs(Math.sin(runPh - i * 0.9)) * 2.2 : 0, x = -i * 10.5, y = hy - 10 + bob;
      if (onG && hy > -3) { const fp = Math.sin(runPh * 2 - i * 1.3) * 2.2; ctx.drawImage(G.foot, x - 4 + fp, -3.5, 8, 6); ctx.drawImage(G.foot, x - 4 - fp, -2.5, 8, 6); }
      ctx.drawImage(i % 2 ? G.segA : G.segB, x - 14, y - 14, 28, 28);
    }
    // wings
    const flapA = wingT > 0 ? Math.sin((0.3 - wingT) / 0.3 * TAU) * 0.9 : (!onG && hold && vy > 0) ? Math.sin(wt * 32) * 0.55 : onG ? Math.sin(wt * 9) * 0.12 : Math.sin(wt * 18) * 0.35;
    ctx.save(); ctx.translate(-5, -24); ctx.rotate(-0.35 + flapA * 0.6); ctx.scale(1, 0.75 + Math.abs(flapA) * 0.4); ctx.drawImage(G.wing, -22, -20, 44, 40); ctx.restore();
    // head (tilts with her speed up/down)
    ctx.save(); ctx.translate(2, -15); ctx.rotate(Math.max(-0.25, Math.min(0.25, vy / 1800)));
    const head = faceK === 'oops' ? G.oops : faceK === 'joy' ? G.joy : (blinkT < 0 ? G.blink : (!onG && vy < -150 ? G.joy : G.head));
    ctx.drawImage(head, -32, -32, 64, 64); ctx.restore();
    ctx.restore(); ctx.globalAlpha = 1;
    if (shield || bubbleT > 0) { const k = (bubbleT > 0 ? 1.15 : 0.95) * gs * (1 + Math.sin(wt * 5) * 0.04); stamp(A.bubble, wx - 4, fy - r - 6 * gs, k, 0.95); }
    if (magT > 0 && magT < 2 && ((magT * 6) | 0) % 2) stamp(A.glow, wx, fy - r, 1.4, 0.5);
  }
  function drawGame() { drawBack(camX); drawWorld(); }

  // ---------- the map backdrop (a slow walk through Cloud Meadow towards the castle) ----------
  const MAPLVL = { gh: new Float32Array(400), cols: 400 };
  function drawMapBackdrop() {
    theme('meadow'); const keepL = lvl, keepC = camX; lvl = MAPLVL;
    const cx = calm() ? 0 : mapT * 18; camX = cx % 4000;
    drawBack(camX); ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (-camX * scale), dpr * oy); drawTerrain(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (q < 1 && !calm()) drawAmbient();
    lvl = keepL; camX = keepC;
  }

  // ---------- autopilot (QA test hook only: plays like a careful kid) ----------
  let apHoldT = 0;
  function autopilot(wx) {
    let want = false, wantHold = false;
    const ahead = (a, b) => { for (let i = lo; i < ecount; i++) { const e = ents[i]; const d = e.x - wx; if (d > b) break; if (d < a || !e.on) continue; return e; } return null; };
    if (boss && !boss.done) {
      const d = boss.sx - px; if (boss.st === 'tired' && d < 95 && d > 20 && onG) want = true;
      for (let i = lo; i < ecount; i++) { const e = ents[i]; if (e.k === 'p' && e.on && e.st === 0 && e.x - wx < 46 && e.x - wx > 0 && onG) want = true; }
      wantHold = !onG && vy > 0 && !(boss.st === 'tired' && Math.abs(d) < 40);
    } else {
      for (let i = lo; i < ecount; i++) {
        const e = ents[i], d = e.x - wx; if (d > 90) break; if (d < -6 || !e.on) continue;
        if (ENEMY[e.k] && e.st === 0 && d < 52 + speed * 0.12 && d > 8 && Math.abs(enemyCy(e) - (fy - PR)) < 60) want = true;
        if ((e.k === 'H' || e.k === 'M') && !e.hit && d < 34 && d > 0) want = true;
        if ((e.k === 'g' || e.k === 'G' || e.k === 'C' || ITEM[e.k] || e.k === 'Q' || e.k === 'O') && d < 30 && e.y < fy - 34 && e.y > fy - 160) want = true;
        if (e.k === 'T' && d < 60) want = true;
      }
      if (groundAt(wx + 26) === PIT && onG) want = true;
      const t = ahead(-6, 50); if (!onG && vy > 40 && (groundAt(wx) === PIT || (t && (t.k === 'T' || t.k === 'C' || t.k === 'O')))) want = true;
      wantHold = !onG && (groundAt(wx + 20) === PIT || inWind(wx));
      if (onG && inWind(wx)) want = true;
    }
    if (want && apHoldT <= 0) { pend = 1; apHoldT = 0.18; }
    if (apHoldT > 0) apHoldT -= DT;
    hold = wantHold || apHoldT > 0.05;
  }

  // ---------- main loop ----------
  function frame(ts) {
    raf = 0; if (state === 'pause') return;
    let dt = (ts - last) / 1000; const rawDt = dt; last = ts; if (!(dt > 0)) dt = 0.016; if (dt > 0.05) dt = 0.05;
    // auto quality: frames slow for ~1.5 s -> drop ambient/vignette/beads, then the pattern and the canvas resolution (never changes play)
    if (qGrace > 0) qGrace -= Math.min(rawDt, 0.1); else if ((state === 'play' || state === 'map') && q < 3) { if (rawDt > 0.0205 && rawDt < 0.2) { slowT += rawDt; if (slowT > 1.5) { q++; slowT = 0; if (q >= 2 && resK > 0.7) { resK = q >= 3 ? 0.62 : 0.78; fit(); theme(curTheme()); } } } else slowT = Math.max(0, slowT - rawDt * 0.5); }
    tAcc += dt; let n = 0; while (tAcc >= DT && n < 12) { step(DT); tAcc -= DT; n++; } if (n === 12) tAcc = 0;
    if (state === 'map') drawMapBackdrop(); else if (lvl && scn) drawGame();
    Au.tick();
    if (state === 'play' || state === 'map' || state === 'result') raf = requestAnimationFrame(frame);
    fpsTick(ts, rawDt);
  }
  let fN = 0, fT = 0, worst = 0; window.__fps = 0; window.__worst = 0;
  function fpsTick(ts, rawDt) { fN++; if (rawDt < 0.5 && rawDt > worst) worst = rawDt; if (ts - fT > 1000) { window.__fps = Math.round(fN * 1000 / (ts - fT)); window.__worst = Math.round(worst * 1000); worst = 0; fN = 0; fT = ts; } }
  function startLoop() { if (raf) return; last = performance.now(); tAcc = 0; raf = requestAnimationFrame(frame); }
  // ---------- pause / folding / back ----------
  function pause() {
    if (state !== 'play' || finished) return; state = 'pause'; hold = false; ptrs.clear(); $('pauseM').hidden = false; $('hint').hidden = true; Au.stopSay(); Au.stopMusic(); try { FZ && FZ.wake(false); } catch (e) { }
    if (lvl && scn) drawGame();
  }
  function resume() { if (state !== 'pause') return; $('pauseM').hidden = true; $('setM').hidden = true; state = 'play'; hold = false; ptrs.clear(); Au.music(inBonus ? 'treasure' : def.theme); try { FZ && FZ.wake(true); } catch (e) { } startLoop(); }
  let guarded = false;
  function pushGuard() { if (!guarded) { try { history.pushState({ sk: 1 }, ''); guarded = true; } catch (e) { } } }
  addEventListener('popstate', () => {
    if (!guarded) return; guarded = false;
    if (state === 'play') { pause(); pushGuard(); } else if (state === 'pause') { pushGuard(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); hold = false; ptrs.clear(); } else if (state === 'map' || state === 'result') startLoop(); });
  addEventListener('blur', () => { hold = false; ptrs.clear(); pause(); });
  addEventListener('pagehide', pause);
  let rz = 0;
  function onResize() {
    // folding or unfolding: pause first (a size jump of more than ~15%), then re-fit once things settle
    const dw = Math.abs(innerWidth - lastW) / (lastW || 1), dh = Math.abs(innerHeight - lastH) / (lastH || 1);
    if (dw > 0.15 || dh > 0.15) { pause(); hold = false; ptrs.clear(); }
    clearTimeout(rz); rz = setTimeout(() => { fit(); theme(curTheme()); if (state === 'pause') drawGame(); else if (state === 'map') startLoop(); }, 150);
  }
  addEventListener('resize', onResize); addEventListener('orientationchange', onResize);
  try { FZ && FZ.onChange(() => { Au.refresh(); }); } catch (e) { }
  // ---------- input: one finger does everything (taps make no sound) ----------
  const stage = $('app');
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button,a')) return; Au.init();
    if (state !== 'play') return; ptrs.add(e.pointerId); hold = true; pend = 1; if (!$('hint').hidden) $('hint').hidden = true;
    try { stage.setPointerCapture(e.pointerId); } catch (x) { }
  });
  const up = e => { ptrs.delete(e.pointerId); hold = ptrs.size > 0; };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => stage.addEventListener(n, up));
  addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { if (!e.repeat && state === 'play') { hold = true; pend = 1; $('hint').hidden = true; } e.preventDefault(); } if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyP')) { state === 'play' ? pause() : resume(); } });
  addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') hold = false; });
  stage.addEventListener('contextmenu', e => e.preventDefault());

  // ---------- the map screen ----------
  function heroPortrait() {
    const c = document.createElement('canvas'); c.width = 380; c.height = 250; const g = c.getContext('2d');
    g.translate(205, 150); g.scale(2.6, 2.6);
    for (let i = 4; i >= 1; i--) { const x = -i * 11, y = Math.sin(i * 1.3) * 3 - 8; g.drawImage(G.foot, x - 6, y + 8, 8, 6); g.drawImage(G.foot, x - 1, y + 9, 8, 6); g.drawImage(i % 2 ? G.segA : G.segB, x - 14, y - 14, 28, 28); }
    g.save(); g.translate(-5, -27); g.rotate(-0.5); g.drawImage(G.wing, -22, -20, 44, 40); g.restore(); g.drawImage(G.joy, -30, -50, 64, 64);
    return c.toDataURL();
  }
  function buildMap() {
    look = S.glim(); G = A.glimmer(look); const pic = heroPortrait(); $('hero').src = pic;
    const nodes = $('nodes'); nodes.innerHTML = ''; let cur = 0;
    for (let i = 1; i <= S.LEVELS; i++) {
      const unlocked = S.unlocked(i), e = S.level(i), b = document.createElement('button'); b.className = 'node' + (unlocked ? '' : ' lock') + (i === S.LEVELS ? ' boss' : '');
      b.setAttribute('aria-label', 'Level ' + i); b.dataset.i = i; b.disabled = !unlocked;
      const d = LV.DEFS[i - 1], cm = S.crowns(i);
      b.innerHTML = '<span class="ni">' + A.SVG.level[d.icon] + '</span>' + (unlocked ? '<span class="ns">' + [0, 1, 2].map(k => '<i>' + (k < e.s ? A.SVG.star : A.SVG.starOff) + '</i>').join('') + '</span>' : '<span class="nl">' + A.SVG.lock + '</span>') +
        (unlocked && cm ? '<span class="nc">' + [0, 1, 2].map(k => '<i>' + ((cm >> k & 1) ? A.SVG.crown : A.SVG.crownOff) + '</i>').join('') + '</span>' : '');
      nodes.appendChild(b); if (unlocked && e.s === 0 && !cur) cur = i;
    }
    if (!cur) cur = S.LEVELS; const b = nodes.children[cur - 1]; if (b) { b.classList.add('cur'); const m = document.createElement('img'); m.className = 'me'; m.src = pic; m.alt = ''; b.appendChild(m); }
    $('stkBar').innerHTML = S.STICKERS.map((id, i) => '<i class="' + (save.stk[id] ? 'on' : '') + (S.crowns(i + 1) === 7 ? ' gold' : '') + '">' + (save.stk[id] ? A.SVG.sticker[id] : '') + '</i>').join('');
    $('gemTotal').textContent = save.gems; $('skN').textContent = S.skyStickers();
    $('bMute').innerHTML = save.muted ? A.SVG.mute : A.SVG.sound;
  }
  function toMap(first) {
    runId++; state = 'map'; $('map').hidden = false; $('hud').hidden = true; $('pauseM').hidden = true; $('resM').hidden = true; $('setM').hidden = true; $('hint').hidden = true; $('banner').hidden = true;
    hold = false; ptrs.clear(); finished = false; boss = null; main = null; inBonus = false; Au.stopSay(); try { FZ && FZ.wake(false); } catch (e) { }
    buildMap(); Au.music('map'); startLoop();
    if (first && !S.seen('welcome')) { S.markSeen('welcome'); setTimeout(() => speak(sayName(LINES.welcome), true), 400); }
    else if (!first) { try { FZ && FZ.breakCheck({ dir: 'audio/', muted: save.muted }); } catch (e) { } }
  }
  const go = fn => () => { if (frozen) return; Au.init(); Au.tap(); fn(); };
  $('nodes').addEventListener('click', e => { const b = e.target.closest('.node'); if (!b || b.disabled || frozen) return; Au.init(); Au.tap(); const i = +b.dataset.i; wipe(() => startLevel(i)); });
  $('bPause').addEventListener('click', () => { Au.init(); pause(); });
  $('bResume').addEventListener('click', go(resume));
  $('bRestart').addEventListener('click', go(() => { $('pauseM').hidden = true; startLevel(def.id); }));
  $('bMap').addEventListener('click', go(() => wipe(() => toMap(false))));
  $('bMap2').addEventListener('click', go(() => wipe(() => toMap(false))));
  $('bAgain').addEventListener('click', go(() => startLevel(def.id)));
  $('bNext').addEventListener('click', go(() => wipe(() => startLevel(def.id + 1))));
  $('bMute').addEventListener('click', () => { Au.init(); S.setMuted(!save.muted); Au.setMuted(save.muted); $('bMute').innerHTML = save.muted ? A.SVG.mute : A.SVG.sound; if (save.muted) Au.stopSay(); else { Au.tap(); Au.music('map'); } });
  $('bHome').addEventListener('click', e => { e.preventDefault(); const h = $('bHome').getAttribute('href'); location.href = h; });
  $('bHome').innerHTML = A.SVG.home; $('bPause').innerHTML = A.SVG.pause; $('bResume').innerHTML = A.SVG.play; $('bRestart').innerHTML = A.SVG.redo; $('bMap').innerHTML = A.SVG.map;
  $('bNext').innerHTML = A.SVG.play; $('bAgain').innerHTML = A.SVG.redo; $('bMap2').innerHTML = A.SVG.map; $('resStars').innerHTML = [0, 1, 2].map(() => '<i>' + A.SVG.star + '</i>').join('');
  $('hearts').innerHTML = [0, 1, 2].map(() => '<i>' + A.SVG.heart + '</i>').join(''); $('crowns').innerHTML = '<i></i><i></i><i></i>'; $('resCrowns').innerHTML = '<i></i><i></i><i></i>';
  $('gemIc').innerHTML = A.SVG.gem; $('gemIc2').innerHTML = A.SVG.gem; $('gemIc3').innerHTML = A.SVG.gem; $('skIc').innerHTML = A.SVG.plane; $('hintTap').innerHTML = A.SVG.tap;
  // ---------- v4: Home / Next-or-Map / Settings on the pause + result screens, Settings panel (volume, music, voice) ----------
  const lab = (svg, w) => svg + '<span>' + w + '</span>';
  ['pHome', 'rHome'].forEach(id => { $(id).innerHTML = lab(A.SVG.home, 'Home'); $(id).addEventListener('click', e => { e.preventDefault(); if (frozen) return; Au.stopSay(); location.href = $(id).getAttribute('href'); }); });
  $('rGo').addEventListener('click', go(() => { if ($('rGo').dataset.next) wipe(() => startLevel(def.id + 1)); else wipe(() => toMap(false)); }));
  const GEAR = '<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" d="M43 8h14l3 12 9 4 11-6 10 10-6 11 4 9 12 3v14l-12 3-4 9 6 11-10 10-11-6-9 4-3 12H43l-3-12-9-4-11 6-10-10 6-11-4-9-12-3V43l12-3 4-9-6-11 10-10 11 6 9-4z"/><circle cx="50" cy="50" r="15" fill="#fff"/></svg>';
  $('bSet').innerHTML = GEAR; $('bSet').style.color = '#a0207a'; ['pSet', 'rSet'].forEach(id => $(id).innerHTML = lab(GEAR, 'Settings'));
  $('sVolIc').innerHTML = A.SVG.sound; $('sDone').innerHTML = lab(A.SVG.play, 'Done');
  function drawSet() { const t = S.settings(), n = Math.round(t.vol / 25); [...$('volBar').children].forEach((e, i) => e.classList.toggle('on', i < n));
    $('sMus').classList.toggle('on', t.mus); $('sMus').textContent = t.mus ? 'On' : 'Off'; $('sVoice').classList.toggle('on', t.voice); $('sVoice').textContent = t.voice ? 'On' : 'Off'; }
  function openSet() { if (frozen) return; Au.init(); drawSet(); $('setM').hidden = false; }
  function setS(o) { S.setSettings(o); Au.refresh(); drawSet(); }
  ['bSet', 'pSet', 'rSet'].forEach(id => $(id).addEventListener('click', openSet));
  $('sUp').addEventListener('click', () => { setS({ vol: Math.min(100, S.settings().vol + 25) }); Au.tap(); });
  $('sDown').addEventListener('click', () => { setS({ vol: Math.max(0, S.settings().vol - 25) }); Au.tap(); });
  $('sMus').addEventListener('click', () => setS({ mus: !S.settings().mus }));
  $('sVoice').addEventListener('click', () => { setS({ voice: !S.settings().voice }); if (!S.settings().voice) Au.stopSay(); });
  $('sDone').addEventListener('click', () => { $('setM').hidden = true; });
  fit(); Au.setMuted(save.muted); toMap(true);
  // test hooks for the QA scripts (no effect on play)
  window.SKTest = {
    get state() { return state; }, start: startLevel, map: () => toMap(false), set noHurt(v) { debug.noHurt = !!v; }, set auto(v) { debug.auto = !!v; }, get auto() { return debug.auto; },
    get cam() { return camX; }, set cam(v) { camX = v; lo = 0; plo = 0; resetPlayer(); }, get py() { return fy - R(); }, get feet() { return fy; }, get vy() { return vy; }, get onGround() { return onG; },
    get glow() { return glow; }, get gems() { return runGems; }, get total() { return total; }, get boss() { return boss && { hp: boss.hp, st: boss.st, sx: boss.sx, by: boss.by }; }, get px() { return px; },
    hold(v) { hold = !!v; }, get holding() { return hold; }, tap() { pend = 1; hold = true; setTimeout(() => { if (!ptrs.size) hold = false; }, 80); }, pause, resume,
    finishNow(n) { forceStars = n || 3; gateStar = true; finish(); }, get stars() { return finStars; }, get ents() { return ents; }, setPy(y) { fy = y + R(); vy = 0; },
    get q() { return q; }, get dpr() { return dpr; }, get inBonus() { return inBonus; }, get crowns() { return crownsRun; }, get gs() { return gs; },
    enterBonus() { const e = ents.find(x => x.k === 'O' && x.on); if (e) enterBonus(e); return !!e; }, exitBonus, give(k) { const e = mkEnt(k, camX + px, fy - R()); takePower(e); },
    hurt() { hurt(null); }, set skip(v) { debug.skip = v; }, get bubble() { return bubbleT > 0; }, lockQ(v) { q = v; slowT = -1e9; }
  };
})();
