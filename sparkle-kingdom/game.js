// Sparkle Kingdom: engine + screens. One canvas, a fixed 1/120 s physics step (same feel at 60 and 120 Hz), no allocation inside the loop.
// Control: touch and hold anywhere = Glimmer lifts; let go = she floats down. The world scrolls by itself. No lives, no timers, no game over.
(function () {
  'use strict';
  const A = SKArt, S = SKSave, Au = SKAudio, LV = SKLevels, FZ = window.FunZone;
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d', { alpha: false });
  const TILE = LV.TILE, BAND = 300, DT = 1 / 120, TAU = Math.PI * 2;
  const PR = 10;                                  // Glimmer's hit radius (units); friendly on purpose
  const PRAISE = ['Sparkly flying', 'You did it', 'Super gliding', 'Amazing', 'What a star', 'Wonderful flying'];
  const LINES = {
    welcome: 'Welcome to Sparkle Kingdom', hold: 'Hold your finger to fly up. Let go to float down.', pop: 'Dive down onto the grumpy puffs to pop them!',
    block: 'Fly up into the heart blocks!', gate: 'Fly through the rainbow gate!', oops: 'Oops, that is okay. Try again!', check: 'Checkpoint!',
    heartstar: 'You got a heart star!', rainbow: 'Rainbow trail!', sticker: 'You found a new sticker!', three: 'Wow, three stars!', two: 'Two stars!', one: 'One star!',
    boss: 'Here comes the Silver Puffball. Dive on its head three times!', win: 'You beat the Silver Puffball! You are the hero of Sparkle Kingdom!', pick: 'Pick a level!', rotate: 'Turn your phone sideways for more room!'
  };
  const say = (line, o) => Au.say(line, o);
  const sayName = line => { try { return FZ ? FZ.withName(line) : line + '!'; } catch (e) { return line + '!'; } };
  const calm = () => { try { return FZ && FZ.calm(); } catch (e) { return false; } };
  const save = S.get();

  // ---------- size / camera ----------
  let W = 0, H = 0, dpr = 1, scale = 1, oy = 0, viewW = 480, px = 130, groundGrad = null, skyGrad = null;
  let lastW = 0, lastH = 0;
  function fit() {
    W = innerWidth; H = innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    scale = Math.min(H / BAND, W / 360); oy = (H - BAND * scale) / 2; viewW = W / scale; px = viewW * 0.28;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); skyGrad = null; groundGrad = null; lastW = W; lastH = H;
  }

  // ---------- state ----------
  let state = 'map', lvl = null, ents = [], ecount = 0, lo = 0, camX = 0, speed = 0, wt = 0, tAcc = 0, last = 0, raf = 0;
  let py = 150, vy = 0, hold = false, glow = 2, invuln = 0, rb = 0, chain = 0, chainT = 0, runGems = 0, cpX = 0, shake = 0, flash = 0, fade = 0;
  let progEnd = 1, boss = null, arenaCam = -1, gateX = 0, finished = false, finT = 0, finStars = 0, scn = null, scnId = '', ready = 0, respawns = 0, gateY = 150;
  let look = S.glim(), glimArt = A.glimmer(look), mapT = 0;
  let lowQ = false, slowT = 0;
  const yHist = new Float32Array(256); let yh = 0;
  const ptrs = new Set();
  const debug = { noHurt: false };

  // ---------- particles (fixed pool) ----------
  const NP = 140, pX = new Float32Array(NP), pY = new Float32Array(NP), pVX = new Float32Array(NP), pVY = new Float32Array(NP), pL = new Float32Array(NP), pT = new Uint8Array(NP), pS = new Float32Array(NP);
  const PSPR = [A.P.starW, A.P.starG, A.P.heart, A.P.dot, A.P.dotP]; let pi = 0;
  function spark(x, y, n, type, spd, life) {
    if (calm()) n = Math.ceil(n / 3); else if (lowQ) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (0.35 + Math.random() * 0.65) * (spd || 90); pi = (pi + 1) % NP; pX[pi] = x; pY[pi] = y; pVX[pi] = Math.cos(a) * v; pVY[pi] = Math.sin(a) * v - 20; pL[pi] = (life || 0.7) * (0.6 + Math.random() * 0.5); pT[pi] = type == null ? (Math.random() * 3 | 0) : type; pS[pi] = 0.7 + Math.random() * 0.6; }
  }
  function confetti(n) {
    if (calm()) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) { pi = (pi + 1) % NP; pX[pi] = camX + Math.random() * viewW; pY[pi] = -10 - Math.random() * 60; pVX[pi] = (Math.random() - .5) * 40; pVY[pi] = 40 + Math.random() * 80; pL[pi] = 2.2 + Math.random(); pT[pi] = Math.random() * 5 | 0; pS[pi] = .8 + Math.random() * .6; }
  }
  function stepParticles(dt) { for (let i = 0; i < NP; i++) if (pL[i] > 0) { pL[i] -= dt; pX[i] += pVX[i] * dt; pY[i] += pVY[i] * dt; pVY[i] += 60 * dt; } }

  // ---------- level loading ----------
  function groundAt(x) {
    const g = lvl.gh, n = g.length, c = x / TILE - 0.5; if (c <= 0) return 282 - TILE * (n ? g[0] : 0);
    if (c >= n - 1) return 282 - TILE * g[n - 1];
    const i = c | 0, f = c - i, s = (1 - Math.cos(f * Math.PI)) / 2; return 282 - TILE * (g[i] * (1 - s) + g[i + 1] * s);
  }
  function load(i) {
    const def = LV.DEFS.find(d => d.id === i), b = LV.build(def); lvl = b; lvl.gh = Float32Array.from(b.ground);
    ents = []; arenaCam = -1; gateX = 1e9;
    for (let c = 0; c < b.cols; c++) for (let r = 0; r < LV.ROWS; r++) {
      const ch = b.rows[r][c]; if (ch === '.') continue; const x = c * TILE + TILE / 2, y = r * TILE + TILE / 2;
      const e = { k: ch, x, y, y0: y, x0: x, on: true, ph: (c * 1.7 + r * 0.9) % TAU, r: 8, hit: false, t: 0 };
      if (ch === 'b') e.r = 13; else if (ch === 'j') e.r = 14; else if (ch === 'n') e.r = 14; else if (ch === 'G') e.r = 13; else if (ch === 'H') e.r = 14; else if (ch === 'P' || ch === 'R') e.r = 14;
      else if (ch === 'K') { e.y = groundAt(x) - 22; e.r = 20; } else if (ch === 'E') { gateX = x; e.y = 150; } else if (ch === 'B') { arenaCam = x; }
      if (ch !== 'B') ents.push(e);
    }
    ecount = ents.length; return def;
  }
  function startLevel(i) {
    const def = load(i); lvl.def = def; scnId = def.theme; scn = A.scenery(def.theme);
    skyGrad = null; groundGrad = null; camX = 0; speed = 0; wt = 0; py = 150; vy = 0; glow = 2; invuln = 0; rb = 0; chain = 0; chainT = 0; runGems = 0; cpX = 0; shake = 0; flash = 0; fade = 0; lo = 0;
    boss = null; gateSpawned = false; progEnd = lvl.def.boss ? Math.max(1, arenaCam) : gateX; finished = false; finT = 0; ready = 0; respawns = 0; hold = false; ptrs.clear(); pL.fill(0); yHist.fill(150);
    $('map').hidden = true; $('hud').hidden = false; $('pauseM').hidden = true; $('resM').hidden = true;
    setHearts(); setGems(); setProg(0); state = 'play'; look = S.glim(); glimArt = A.glimmer(look);
    pushGuard(); try { FZ && FZ.wake(true); } catch (e) { }
    Au.init(); Au.start();
    const first = !S.seen('hold');
    $('hint').hidden = !first; $('hint').classList.toggle('tall', H > W);
    if (first) { S.markSeen('hold'); say(LINES.hold); if (H > W && !S.seen('rotate')) { S.markSeen('rotate'); setTimeout(() => say(LINES.rotate), 4200); } }
    else if (def.boss) say(LINES.boss);
    startLoop();
  }
  // ---------- the HUD ----------
  let hudGlow = -1, hudGems = -1;
  function setHearts() { if (hudGlow === glow) return; hudGlow = glow; const h = $('hearts').children; for (let i = 0; i < 3; i++) h[i].classList.toggle('off', i >= glow); }
  function setGems() { if (hudGems === runGems) return; hudGems = runGems; $('gemc').textContent = runGems; }
  const progDot = $('progDot'); let progLast = -1;
  function setProg(f) { const v = Math.round(f * 200) / 2; if (v === progLast) return; progLast = v; progDot.style.left = v + '%'; }
  // ---------- hits ----------
  function hurt() {
    if (invuln > 0 || debug.noHurt) return;
    Au.hurt(); try { FZ && FZ.buzz(30); } catch (e) { }
    spark(camX + px, py, 8, 2, 70, 0.7); shake = calm() ? 0 : 0.25; invuln = 1.7;
    if (glow > 1) { glow--; vy = -110; setHearts(); }
    else respawn();
  }
  function respawn() {
    respawns++; glow = 2; setHearts(); fade = 1; speed = 0; ready = 0.0;
    camX = Math.max(0, cpX - 40); if (boss) camX = arenaCam; lo = 0; py = 150; vy = 0; invuln = 2.2;
    for (let i = 0; i < ecount; i++) { const e = ents[i]; if (e.x < camX + px + 120 && e.x > camX - 60 && (e.k === 'b' || e.k === 'j' || e.k === 'n') && e.on) e.on = false; }  // clear friends sitting on top of her
    say(LINES.oops);
  }
  // ---------- one physics step ----------
  function step(dt) {
    wt += dt; mapT += dt;
    if (state !== 'play') { stepParticles(dt); return; }
    if (finished) { finT += dt; stepParticles(dt); speed *= 0.992; camX += speed * dt; vy += (-40 - vy) * dt * 2; py += vy * dt; return; }
    if (invuln > 0) invuln -= dt; if (rb > 0) rb -= dt; if (chainT > 0) { chainT -= dt; if (chainT <= 0) chain = 0; } if (shake > 0) shake -= dt; if (flash > 0) flash -= dt * 2.5; if (fade > 0) fade -= dt * 1.6;
    // scroll: eases in at the start, holds still in the boss arena
    const target = lvl.def.speed; ready += dt;
    if (ready < 0.6) speed = 0; else speed += (target - speed) * Math.min(1, dt * 2.5);
    if (arenaCam >= 0 && !boss && camX >= arenaCam - 30) startBoss();
    if (boss && !boss.done) { camX = arenaCam; } else camX += speed * dt;
    // glide: hold = lift, release = float down
    { vy += ((hold ? -820 : 0) + 420) * dt; if (vy < -190) vy = -190; if (vy > 230) vy = 230; py += vy * dt; }
    const wx = camX + px, fl = groundAt(wx) - PR;
    if (py < 12) { py = 12; if (vy < 0) vy = 0; }
    if (py > fl) { py = fl; if (vy > 120) spark(wx, fl + PR, 4, 3, 40, .4); if (vy > 0) vy = 0; }
    yh = (yh + 1) & 255; yHist[yh] = py;
    const view = camX + viewW + 90, near = camX - 70;
    while (lo < ecount && ents[lo].x < near - 30) lo++;
    for (let i = lo; i < ecount; i++) {
      const e = ents[i]; if (e.x > view) break; if (!e.on) continue;
      const k = e.k, dx = e.x - wx;
      if (k === 'g' || k === 'G') {
        e.ph += 0;
        if (rb > 0) { const dy = e.y - py, d2 = dx * dx + dy * dy; if (d2 < 8100 && d2 > 1) { const d = Math.sqrt(d2), s = 300 * dt; e.x -= dx / d * s; e.y -= dy / d * s; } }
        const ddx = e.x - wx, ddy = e.y - py, rr = e.r + PR + 2;
        if (ddx * ddx + ddy * ddy < rr * rr) { e.on = false; const n = k === 'G' ? 5 : 1; runGems += n; setGems(); Au.gem(runGems); spark(e.x, e.y, 3, 1, 50, .45); }
      } else if (k === 'b' || k === 'j' || k === 'n') {
        if (k === 'b') e.y = e.y0 + Math.sin(wt * 1.6 + e.ph) * 10;
        else if (k === 'j') { e.x -= 22 * dt; e.y = e.y0 + Math.sin(wt * 2.2 + e.ph) * 4; }
        else e.y = e.y0 - Math.abs(Math.sin(wt * 2.3 + e.ph)) * 44 + 22;
        const ddx = e.x - wx, ddy = e.y - py, rr = e.r + PR;
        if (ddx * ddx + ddy * ddy < rr * rr) {
          if (rb > 0 || (py < e.y - 1 && vy > -40)) popEnemy(e, true); else hurt();
        }
      } else if (k === 'H') {
        if (!e.hit) { const ddx = Math.abs(e.x - wx), ddy = Math.abs(e.y - py); if (ddx < 13 + PR - 2 && ddy < 13 + PR - 2) hitBlock(e); }
      } else if (k === 'P' || k === 'R') {
        const ddx = e.x - wx, ddy = e.y - py, rr = e.r + PR + 4;
        if (ddx * ddx + ddy * ddy < rr * rr) {
          e.on = false; spark(e.x, e.y, 14, null, 110, .8); flash = 0.5;
          if (k === 'P') { if (glow < 3) glow++; setHearts(); Au.heart(); say(LINES.heartstar, { gain: .9 }); } else { rb = 10; Au.rainbow(); say(LINES.rainbow, { gain: .9 }); }
        }
      } else if (k === 'K') {
        if (!e.hit && wx >= e.x) { e.hit = true; cpX = e.x; Au.check(); spark(e.x, e.y, 16, null, 100, .9); flash = 0.35; say(LINES.check, { gain: .8 }); }
      } else if (k === 'E') {
        if (wx >= e.x) { gateY = py; finish(); }
      }
    }
    // teach the two ideas the first time she sees them (spoken once, saved)
    if (lvl.def.id === 1) {
      for (let i = lo; i < ecount && ents[i].x < camX + viewW * 0.85; i++) { const e = ents[i]; if (!e.on) continue;
        if (e.k === 'b' && !S.seen('pop') && e.x > camX + px + 40) { S.markSeen('pop'); say(LINES.pop); break; }
        if (e.k === 'H' && !S.seen('block') && e.x > camX + px + 40) { S.markSeen('block'); say(LINES.block); break; } }
    }
    if (boss) stepBoss(dt);
    if (rb > 0 && !calm() && (yh & 3) === 0) spark(wx - 8, py, 1, null, 25, .5);
    stepParticles(dt);
    if (!finished && (yh & 7) === 0) setProg(Math.min(1, (camX + px) / progEnd));
  }
  function popEnemy(e, bounce) {
    e.on = false; chain++; chainT = 1.3; Au.pop(chain); spark(e.x, e.y, 14, null, 110, .8); spark(e.x, e.y, 3, 2, 60, .8);
    if (bounce && rb <= 0) vy = -230; runGems += 2; setGems(); if (chain >= 3 && chain % 3 === 0) sayPraiseSoon();
  }
  let praiseAt = 0;
  function sayPraiseSoon() { const now = performance.now(); if (now - praiseAt < 9000) return; praiseAt = now; say(sayName(PRAISE[Math.random() * PRAISE.length | 0])); }
  function hitBlock(e) {
    e.hit = true; Au.block(); spark(e.x, e.y, 10, null, 80, .7); if (vy < 0) vy = 40;
    // what comes out: a heart-star when she needs one, sometimes a rainbow trail, else a fountain of gems
    const roll = (e.ph * 7) % 1;
    if (glow < 3 && roll < 0.55) spawnItem('P', e); else if (roll > 0.72) spawnItem('R', e); else { for (let i = 0; i < 4; i++) spawnGem(e.x + (i - 1.5) * 12, e.y - 26 - (i % 2) * 8); }
  }
  function spawnItem(k, at) { insert({ k, x: at.x, y: at.y - 30, y0: at.y - 30, x0: at.x, on: true, ph: 0, r: 14, hit: false, t: 0 }); }
  function spawnGem(x, y) { insert({ k: 'g', x, y, y0: y, x0: x, on: true, ph: 0, r: 8, hit: false, t: 0 }); }
  // keep the list sorted by x (new things appear a few columns ahead of the scan, so a short insertion is cheap)
  function insert(o) { let i = ecount; ents.push(o); ecount++; while (i > 0 && ents[i - 1].x > o.x) { ents[i] = ents[i - 1]; i--; } ents[i] = o; if (i < lo) lo = i; }
  // ---------- boss: the Silver Puffball ----------
  function startBoss() {
    boss = { hp: 3, ph: 0, w: 1.0, sx: viewW + 120, by: 120, st: 'enter', t: 0, done: false, puffs: [], nextPuff: 3, hitCool: 0, bonk: 0 };
    say(LINES.boss, { gain: .95 }); Au.start();
  }
  function stepBoss(dt) {
    const b = boss, wx = camX + px; b.t += dt; if (b.hitCool > 0) b.hitCool -= dt; if (b.bonk > 0) b.bonk -= dt;
    if (b.done) { b.t += 0; if (b.t > 0.9 && !gateSpawned) spawnGate(); return; }
    if (b.st === 'enter') { b.sx += (px + 70 - b.sx) * Math.min(1, dt * 1.6); if (b.t > 2.2) { b.st = 'patrol'; b.t = 0; } }
    else if (b.st === 'patrol') {
      b.ph += dt * b.w * 0.95; b.sx = px + 70 + 135 * Math.cos(b.ph); b.by = 135 + 42 * Math.sin(b.ph * 1.7);
      b.nextPuff -= dt; if (b.nextPuff <= 0) { b.nextPuff = 3.6 / b.w; for (let i = 0; i < 3; i++) if (!b.puffs[i] || !b.puffs[i].on) { b.puffs[i] = { on: true, x: b.sx - 30, y: b.by + 8 }; break; } }
    } else if (b.st === 'dizzy') {
      b.sx += (px + 190 - b.sx) * Math.min(1, dt * 2.2); b.by += (66 - b.by) * Math.min(1, dt * 2.2);
      if (b.t > 2.4) { b.st = 'patrol'; b.t = 0; b.ph = Math.PI * 0.55; b.w *= 1.15; }
    }
    // Glimmer vs the Puffball
    if (b.st === 'patrol' || b.st === 'enter') {
      const bx = camX + b.sx, dx = bx - wx, dy = b.by - py, rr = 44 + PR;
      if (dx * dx + dy * dy < rr * rr) {
        if (b.st === 'patrol' && py < b.by - 14 && vy > -40) hitBoss(bx);
        else if (b.bonk <= 0) { b.bonk = 0.7; Au.bonk(); vy = dy > 0 ? -170 : 150; shake = calm() ? 0 : 0.12; spark(wx, py, 5, 4, 60, .5); }
      }
    }
    for (let i = 0; i < 3; i++) { const p = b.puffs[i]; if (!p || !p.on) continue;
      p.x -= 115 * dt; const dx = camX + p.x - wx, dy = p.y - py;
      if (p.x < -40) { p.on = false; continue; }
      if (dx * dx + dy * dy < 22 * 22) { if (py < p.y - 2 && vy > -40) { p.on = false; Au.pop(2); spark(camX + p.x, p.y, 10, null, 90, .7); runGems += 2; setGems(); vy = -200; } else if (b.bonk <= 0) { p.on = false; b.bonk = 0.6; Au.bonk(); vy = dy > 0 ? -150 : 130; spark(wx, py, 5, 4, 60, .5); } } }
  }
  let gateSpawned = false;
  function spawnGate() { gateSpawned = true; gateX = camX + viewW + 160; insert({ k: 'E', x: gateX, y: 150, y0: 150, x0: gateX, on: true, ph: 0, r: 10, hit: false, t: 0 }); for (let i = 0; i < 14; i++) spawnGem(camX + px + 40 + i * 24, 150 - Math.sin(i / 13 * Math.PI) * 70); }
  function hitBoss(bx) {
    const b = boss; b.hp--; chain++; b.st = 'dizzy'; b.t = 0; vy = -250; b.hitCool = 1; Au.pop(chain + 3); Au.boing();
    spark(bx, b.by - 20, 18, null, 130, .9); flash = 0.4; shake = calm() ? 0 : 0.2; runGems += 5; setGems();
    if (b.hp <= 0) { b.done = true; b.t = 0; gateSpawned = false; for (let i = 0; i < 3; i++) spark(bx, b.by, 26, i === 1 ? 1 : 2, 170, 1.4); Au.fanfare(); say(LINES.win, { gain: .95 }); b.sx = 1e5; arenaCam = -1; boss.t = 0; boss.gone = true; progEnd = gateX = camX + viewW + 160; }
  }
  // ---------- finishing ----------
  function finish() {
    if (finished) return; finished = true; finT = 0; hold = false;
    const y = gateY; finStars = y < 110 ? 3 : y < 190 ? 2 : 1;
    confetti(70); Au.fanfare(); setTimeout(() => Au.star(0), 300); if (finStars > 1) setTimeout(() => Au.star(1), 520); if (finStars > 2) setTimeout(() => Au.star(2), 740);
    const r = S.finish(lvl.def.id, finStars, runGems); try { FZ && FZ.wake(false); } catch (e) { }
    setTimeout(() => showResult(r), 1500);
  }
  function showResult(r) {
    if (state !== 'play') return; state = 'result';
    const st = $('resStars').children; for (let i = 0; i < 3; i++) { st[i].classList.toggle('on', i < finStars); st[i].style.animationDelay = (i * 0.25) + 's'; }
    $('resGems').textContent = runGems; const stk = $('resStk'); stk.hidden = !r.newSticker; if (r.newSticker) stk.innerHTML = A.SVG.sticker[r.newSticker];
    const next = lvl.def.id < S.LEVELS; $('bNext').hidden = !next; $('resM').hidden = false; $('hud').hidden = true; $('hint').hidden = true;
    say(finStars === 3 ? LINES.three : finStars === 2 ? LINES.two : LINES.one);
    setTimeout(() => { if (state === 'result') say(sayName(PRAISE[Math.random() * PRAISE.length | 0])); }, 1800);
    if (r.newSticker) setTimeout(() => { if (state === 'result') say(LINES.sticker); }, 3600);
  }
  // ---------- drawing ----------
  function drawScenery(cx) {
    if (!scn) { scn = A.scenery('meadow'); scnId = 'meadow'; }
    const t = scn.t;
    if (!skyGrad) { skyGrad = ctx.createLinearGradient(0, 0, 0, H); skyGrad.addColorStop(0, t.sky[0]); skyGrad.addColorStop(1, t.sky[1]); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
    const sw = A.STRIP * scale, bandB = oy + 300 * scale;
    // clouds (slow) and far hills (slower), tiled
    let o = -((cx * 0.12 * scale) % sw); for (let x = o; x < W; x += sw) ctx.drawImage(scn.cloud, x, oy + 10 * scale, sw, 160 * scale);
    o = -((cx * 0.25 * scale) % sw); for (let x = o; x < W; x += sw) ctx.drawImage(scn.far, x, bandB - 250 * scale, sw, 200 * scale);
    if (oy > 4 && !lowQ) { o = -((cx * 0.18 * scale) % sw); for (let x = o; x < W; x += sw) ctx.drawImage(scn.cloud, x, Math.max(0, oy - 150 * scale), sw, 160 * scale); }
  }
  function drawTerrain() {
    const t = scn.t, x0 = camX - 20, x1 = camX + viewW + 20;
    if (!groundGrad) { groundGrad = ctx.createLinearGradient(0, 120, 0, 420); groundGrad.addColorStop(0, t.ground[0]); groundGrad.addColorStop(1, t.ground[1]); }
    const bottom = (H - oy) / scale + 10;
    ctx.beginPath(); ctx.moveTo(x0, bottom); for (let x = Math.floor(x0 / 12.5) * 12.5; x <= x1; x += 12.5) ctx.lineTo(x, groundAt(x)); ctx.lineTo(x1, groundAt(x1)); ctx.lineTo(x1, bottom); ctx.closePath();
    ctx.fillStyle = groundGrad; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = t.edge;
    ctx.beginPath(); for (let x = Math.floor(x0 / 12.5) * 12.5, f = 1; x <= x1; x += 12.5) { if (f) { ctx.moveTo(x, groundAt(x)); f = 0; } else ctx.lineTo(x, groundAt(x)); } ctx.stroke();
    const c0 = Math.max(0, Math.floor(x0 / TILE)), c1 = Math.min(lvl.cols - 1, Math.ceil(x1 / TILE));
    for (let c = c0; c <= c1; c++) if (((c * 7 + 3) % 3) === 0) { const f = A.flowers[c % 3], x = c * TILE + 12; ctx.drawImage(f, x - 9, groundAt(x) - 17, 18, 20); }
  }
  const GEMBOB = 0;
  function stamp(s, x, y, k, a) { const w = s.w * (k || 1), h = s.h * (k || 1); if (a != null && a < 1) ctx.globalAlpha = a; ctx.drawImage(s, x - w / 2, y - h / 2, w, h); if (a != null && a < 1) ctx.globalAlpha = 1; }
  const RB = ['#ff5f7e', '#ffb04a', '#ffe15a', '#5fe08a', '#5fb8ff', '#b07aff'];
  function drawWorld() {
    const sx = shake > 0 ? (Math.random() - .5) * 6 : 0, sy = shake > 0 ? (Math.random() - .5) * 6 : 0;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (-camX * scale + sx), dpr * (oy + sy));
    drawTerrain();
    const view = camX + viewW + 80, near = camX - 80;
    for (let i = lo; i < ecount; i++) {
      const e = ents[i]; if (e.x > view) break; if (e.x < near) continue; const k = e.k;
      if (k === 'g') { if (e.on) stamp(A.gems[((e.x / TILE) | 0) % 4], e.x, e.y + Math.sin(wt * 3 + e.x * 0.05) * 1.5); }
      else if (k === 'G') { if (e.on) stamp(A.gemBig, e.x, e.y + Math.sin(wt * 2.4 + e.x) * 2, 1 + Math.sin(wt * 4) * 0.04); }
      else if (k === 'H') stamp(e.hit ? A.blockUsed : A.blockHeart, e.x, e.y, 1 + (e.hit ? 0 : Math.sin(wt * 3 + e.ph) * 0.03));
      else if (k === 'b') { if (e.on) stamp(A.bunny, e.x, e.y); }
      else if (k === 'j') { if (e.on) { const q = 1 + Math.sin(wt * 5 + e.ph) * 0.06; ctx.drawImage(A.jelly, e.x - 23 * q, e.y - 18 / q, 46 * q, 36 / q); } }
      else if (k === 'n') { if (e.on) stamp(A.snow, e.x, e.y); }
      else if (k === 'P') { if (e.on) stamp(A.heartStar, e.x, e.y + Math.sin(wt * 3) * 3, 1 + Math.sin(wt * 5) * 0.06); }
      else if (k === 'R') { if (e.on) stamp(A.rainbowPick, e.x, e.y + Math.sin(wt * 3) * 3); }
      else if (k === 'K') stamp(e.hit ? A.checkpointOn : A.checkpointOff, e.x, groundAt(e.x) - 30);
      else if (k === 'E') drawGate(e);
    }
    if (boss && !boss.gone) drawBoss();
    drawGlimmer();
    for (let i = 0; i < NP; i++) if (pL[i] > 0) { const s = PSPR[pT[i]], q = Math.min(1, pL[i] * 2.5) * pS[i]; ctx.globalAlpha = Math.min(1, pL[i] * 2.5); ctx.drawImage(s, pX[i] - s.w * q / 2, pY[i] - s.h * q / 2, s.w * q, s.h * q); }
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(.35, flash * .5).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
    if (fade > 0) { ctx.fillStyle = 'rgba(255,214,236,' + Math.min(1, fade).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
  }
  function drawGate(e) {
    ctx.globalAlpha = .9; ctx.drawImage(A.gate, e.x - 26, 150 - 210, 52, 420); ctx.globalAlpha = 1;
    [55, 150, 245].forEach((y, i) => { stamp(A.heartStar, e.x - 40, y, 0.7 + Math.sin(wt * 4 + i) * 0.05, 0.9); });
  }
  function drawBoss() {
    const b = boss, bx = camX + b.sx, by = b.by, spr = b.st === 'dizzy' ? A.bossDizzy : A.bossOk, k = 1 + Math.sin(wt * 3) * 0.03;
    ctx.globalAlpha = .6; stamp(A.P.shadow, bx, groundAt(bx) + 2, 3.2, .5); ctx.globalAlpha = 1;
    if (b.st === 'dizzy') { for (let i = 0; i < 3; i++) { const a = wt * 5 + i * 2.1; stamp(A.P.starG, bx + Math.cos(a) * 46, by - 50 + Math.sin(a) * 8, 1); } }
    stamp(spr, bx, by, k);
    for (let i = 0; i < 3; i++) { const p = b.puffs[i]; if (p && p.on) stamp(A.puff, camX + p.x, p.y, 1.1); }
  }
  function drawGlimmer() {
    const wx = camX + px, G = glimArt, blink = invuln > 0 && !calm() && ((invuln * 10) | 0) % 2 === 0, al = blink ? 0.45 : 1;
    if (rb > 0) { ctx.lineWidth = 3; ctx.globalAlpha = Math.min(1, rb) * .9; for (let k = 0; k < 6; k++) { ctx.strokeStyle = RB[k]; ctx.beginPath(); for (let i = 0; i < 14; i++) { const lag = (i * 6 + 2), h = yHist[(yh - lag) & 255]; const X = wx - 6 - i * 6, Y = h + (k - 2.5) * 3 ; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); } ctx.stroke(); } ctx.globalAlpha = 1; }
    ctx.globalAlpha = al;
    for (let i = 4; i >= 1; i--) { const lag = Math.round(i * 14 / Math.max(90, speed || 90) * 120), h = yHist[(yh - lag) & 255]; stamp(i % 2 ? G.segA : G.segB, wx - i * 13, h + Math.sin(wt * 6 + i) * 1.4, 1 - i * 0.05); }
    ctx.save(); ctx.translate(wx, py); ctx.rotate(Math.max(-.4, Math.min(.5, vy / 500)));
    const f = Math.sin(wt * 16) * 0.5 + 0.5; ctx.save(); ctx.translate(-2, -8); ctx.scale(1, 0.55 + f * 0.6); ctx.rotate(-.5); ctx.drawImage(G.wing, -20, -18, 40, 36); ctx.restore();
    ctx.drawImage(G.head, -28, -30, 56, 60); ctx.restore(); ctx.globalAlpha = 1;
  }
  const MAPLVL = { gh: new Float32Array(400), cols: 400 };
  let mapScn = null;
  function drawMapBackdrop() {
    if (!mapScn) { mapScn = A.scenery('meadow'); skyGrad = null; groundGrad = null; }
    const keepS = scn, keepL = lvl, keepC = camX, keepV = viewW, keepO = oy; scn = mapScn; lvl = MAPLVL; oy = Math.max(oy, H * 0.9 - BAND * scale);
    const cx = calm() ? 0 : mapT * 22; viewW = W / scale; camX = cx;
    drawScenery(cx); ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (-cx * scale), dpr * oy); drawTerrain(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scn = keepS; lvl = keepL; camX = keepC; viewW = keepV; oy = keepO;
  }
  // ---------- main loop ----------
  function frame(ts) {
    raf = 0; if (state === 'pause') return;
    let dt = (ts - last) / 1000, rawDt = dt; last = ts; if (!(dt > 0)) dt = 0.016; if (dt > 0.05) dt = 0.05;
    // auto quality: if frames stay slow for ~1.5 s, halve the sparkles and skip the far cloud layer (never changes how it plays)
    if (state === 'play' && !lowQ) { if (rawDt > 0.0215 && rawDt < 0.2) { slowT += rawDt; if (slowT > 1.5) lowQ = true; } else slowT = Math.max(0, slowT - rawDt * 2); }
    tAcc += dt; let n = 0; while (tAcc >= DT && n < 12) { step(DT); tAcc -= DT; n++; } if (n === 12) tAcc = 0;
    if (state === 'map') drawMapBackdrop();  else { drawScenery(camX); drawWorld(); }
    if (state === 'play' || state === 'map' || state === 'result') raf = requestAnimationFrame(frame);
    fpsTick(ts);
  }
  let fN = 0, fT = 0; window.__fps = 0;
  function fpsTick(ts) { fN++; if (ts - fT > 1000) { window.__fps = Math.round(fN * 1000 / (ts - fT)); fN = 0; fT = ts; } }
  function startLoop() { if (raf) return; last = performance.now(); tAcc = 0; raf = requestAnimationFrame(frame); }
  // ---------- pause / folding / back ----------
  function pause() {
    if (state !== 'play' || finished) return; state = 'pause'; hold = false; ptrs.clear(); $('pauseM').hidden = false; $('hint').hidden = true; Au.stopSay(); try { FZ && FZ.wake(false); } catch (e) { }
    drawScenery(camX); drawWorld();
  }
  function resume() { if (state !== 'pause') return; $('pauseM').hidden = true; state = 'play'; hold = false; ptrs.clear(); try { FZ && FZ.wake(true); } catch (e) { } startLoop(); }
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
    clearTimeout(rz); rz = setTimeout(() => { fit(); if (state === 'pause') { drawScenery(camX); drawWorld(); } else if (state === 'map') startLoop(); }, 150);
  }
  addEventListener('resize', onResize); addEventListener('orientationchange', onResize);
  try { FZ && FZ.onChange(() => { Au.refresh(); }); } catch (e) { }
  // ---------- input ----------
  const stage = $('app');
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button,a')) return; Au.init();
    if (state !== 'play') return; ptrs.add(e.pointerId); hold = true; if (!$('hint').hidden) $('hint').hidden = true;
    try { stage.setPointerCapture(e.pointerId); } catch (x) { }
  });
  const up = e => { ptrs.delete(e.pointerId); hold = ptrs.size > 0; };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => stage.addEventListener(n, up));
  addEventListener('keydown', e => { if (e.repeat) return; if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { if (state === 'play') { hold = true; $('hint').hidden = true; } e.preventDefault(); } if (e.code === 'Escape' || e.code === 'KeyP') { state === 'play' ? pause() : resume(); } });
  addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') hold = false; });
  stage.addEventListener('contextmenu', e => e.preventDefault());

  // ---------- the map screen ----------
  function heroPortrait() {
    const c = document.createElement('canvas'); c.width = 360; c.height = 240; const g = c.getContext('2d'), G = glimArt;
    g.translate(180, 130); g.scale(2.4, 2.4);
    for (let i = 4; i >= 1; i--) g.drawImage(i % 2 ? G.segA : G.segB, -i * 15 - 14, Math.sin(i * 1.3) * 3 - 8, 28, 28);
    g.save(); g.translate(-2, -8); g.rotate(-.5); g.drawImage(G.wing, -20, -18, 40, 36); g.restore(); g.drawImage(G.head, -28, -30, 56, 60);
    return c.toDataURL();
  }
  function buildMap() {
    look = S.glim(); glimArt = A.glimmer(look); $('hero').src = heroPortrait();
    const nodes = $('nodes'); nodes.innerHTML = ''; let cur = 0;
    for (let i = 1; i <= S.LEVELS; i++) {
      const unlocked = S.unlocked(i), e = S.level(i), b = document.createElement('button'); b.className = 'node' + (unlocked ? '' : ' lock') + (i === S.LEVELS ? ' boss' : '');
      b.setAttribute('aria-label', 'Level ' + i); b.dataset.i = i; b.disabled = !unlocked;
      const def = LV.DEFS[i - 1];
      b.innerHTML = '<span class="ni">' + A.SVG.level[def.icon] + '</span>' + (unlocked ? '<span class="ns">' + [0, 1, 2].map(k => '<i>' + (k < e.s ? A.SVG.star : A.SVG.starOff) + '</i>').join('') + '</span>' : '<span class="nl">' + A.SVG.lock + '</span>');
      nodes.appendChild(b); if (unlocked && e.s === 0 && !cur) cur = i;
    }
    if (!cur) cur = S.LEVELS; const b = nodes.children[cur - 1]; if (b) { const m = document.createElement('img'); m.className = 'me'; m.src = $('hero').src; m.alt = ''; b.appendChild(m); }
    $('stkBar').innerHTML = S.STICKERS.map(id => '<i class="' + (save.stk[id] ? 'on' : '') + '">' + (save.stk[id] ? A.SVG.sticker[id] : '') + '</i>').join('');
    $('gemTotal').textContent = save.gems; const n = S.skyStickers(); $('skN').textContent = n;
    $('bMute').innerHTML = save.muted ? A.SVG.mute : A.SVG.sound;
  }
  function toMap(first) {
    state = 'map'; $('map').hidden = false; $('hud').hidden = true; $('pauseM').hidden = true; $('resM').hidden = true; $('hint').hidden = true;
    hold = false; ptrs.clear(); finished = false; boss = null; Au.stopSay(); try { FZ && FZ.wake(false); } catch (e) { }
    buildMap(); skyGrad = null; groundGrad = null; startLoop();
    if (first && !S.seen('welcome')) { S.markSeen('welcome'); setTimeout(() => say(sayName(LINES.welcome)), 400); }
    else if (!first) { try { FZ && FZ.breakCheck({ dir: 'audio/', muted: save.muted }); } catch (e) { } }
  }
  $('nodes').addEventListener('click', e => { const b = e.target.closest('.node'); if (!b || b.disabled) return; Au.init(); startLevel(+b.dataset.i); });
  $('bPause').addEventListener('click', () => { Au.init(); pause(); });
  $('bResume').addEventListener('click', () => { Au.init(); resume(); });
  $('bRestart').addEventListener('click', () => { $('pauseM').hidden = true; startLevel(lvl.def.id); });
  $('bMap').addEventListener('click', () => toMap(false));
  $('bMap2').addEventListener('click', () => toMap(false));
  $('bAgain').addEventListener('click', () => startLevel(lvl.def.id));
  $('bNext').addEventListener('click', () => startLevel(lvl.def.id + 1));
  $('bMute').addEventListener('click', () => { Au.init(); S.setMuted(!save.muted); Au.setMuted(save.muted); $('bMute').innerHTML = save.muted ? A.SVG.mute : A.SVG.sound; if (save.muted) Au.stopSay(); });
  $('bHome').addEventListener('click', e => { e.preventDefault(); const h = $('bHome').getAttribute('href'); location.href = h; });
  $('bHome').innerHTML = A.SVG.home; $('bPause').innerHTML = A.SVG.pause; $('bResume').innerHTML = A.SVG.play; $('bRestart').innerHTML = A.SVG.redo; $('bMap').innerHTML = A.SVG.map;
  $('bNext').innerHTML = A.SVG.play; $('bAgain').innerHTML = A.SVG.redo; $('bMap2').innerHTML = A.SVG.map; $('resStars').innerHTML = [0, 1, 2].map(() => '<i>' + A.SVG.star + '</i>').join('');
  $('hearts').innerHTML = [0, 1, 2].map(() => '<i>' + A.SVG.heart + '</i>').join(''); $('gemIc').innerHTML = A.SVG.gem; $('gemIc2').innerHTML = A.SVG.gem; $('gemIc3').innerHTML = A.SVG.gem; $('skIc').innerHTML = A.SVG.plane;
  fit(); Au.setMuted(save.muted); toMap(true);
  // test hooks for the QA scripts (no effect on play)
  window.SKTest = { get state() { return state; }, start: startLevel, map: () => toMap(false), set noHurt(v) { debug.noHurt = !!v; }, get cam() { return camX; }, set cam(v) { camX = v; lo = 0; }, get py() { return py; }, get glow() { return glow; }, get gems() { return runGems; }, get boss() { return boss && { hp: boss.hp, st: boss.st, sx: boss.sx, by: boss.by }; }, get px() { return px; },
    hold(v) { hold = !!v; }, get holding() { return hold; }, pause, resume, finishNow() { gateY = 80; finish(); }, get stars() { return finStars; }, get ents() { return ents; }, setPy(y) { py = y; vy = 0; } };
})();
