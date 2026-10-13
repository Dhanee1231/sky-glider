// Sparkle Kingdom mini-games: Gem Catch + Bubble Pop (v6), Puffball Peekaboo + Cake Stack (v7). 30 seconds at most, ALWAYS end in a win, can be skipped
// any time, replayable from the map once found (best score in save.mg). DOM sprites moved with transforms from one rAF loop
// using real elapsed time; small fixed pools (no allocation per frame). Touching the screen makes no sound; catches/pops chime.
(function () {
  const F = window.SKFun, X = window.SKFx, Au = window.SKAudio, B = window.SKBook, H = window.SKHooks;
  const $ = id => document.getElementById(id), el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const calm = () => document.documentElement.classList.contains('fz-calm');
  const GAMES = {
    gemcatch: { name: 'Gem Catch', goal: 15, intro: 'Gem Catch! Move the basket to catch the gems!', win: 'Great catching!' },
    bubble: { name: 'Bubble Pop', goal: 12, intro: 'Bubble Pop! Pop the bubbles to free your friends!', win: 'You freed all your friends!' },
    peek: { name: 'Puffball Peekaboo', goal: 5, intro: 'Puffball Peekaboo! Watch the puffball hide, then tap its cup!', win: 'Peekaboo! You are a super finder!' },
    cake: { name: 'Cake Stack', goal: 8, intro: 'Cake Stack! Tap to drop each layer on the cake!', win: 'What a yummy tall cake!' }
  };
  const ORDER = ['gemcatch', 'bubble', 'peek', 'cake'];
  const COUNT = ['One!', 'Two!', 'Three!', 'Four!', 'Five!', 'Six!', 'Seven!', 'Eight!'];
  const BCOL = [['#ff8fd0', 'pink'], ['#7ad8ff', 'blue'], ['#ffe15a', 'yellow'], ['#7ee08a', 'green'], ['#b48aff', 'purple']];
  const CUP = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M16 92 L28 16 Q50 6 72 16 L84 92Z" fill="#ff8fd0" stroke="#fff" stroke-width="6" stroke-linejoin="round"/><path d="M24 64 H76" stroke="#ffe15a" stroke-width="8"/><circle cx="50" cy="12" r="8" fill="#ffe15a" stroke="#fff" stroke-width="4"/></svg>';
  const PUFF = '<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="#eef0f8" stroke="#a9afc8" stroke-width="4"><circle cx="50" cy="56" r="30"/><circle cx="26" cy="58" r="14"/><circle cx="74" cy="58" r="14"/></g><circle cx="41" cy="54" r="5" fill="#3a1a6b"/><circle cx="59" cy="54" r="5" fill="#3a1a6b"/><path d="M40 66 Q50 76 60 66" stroke="#3a1a6b" stroke-width="4" fill="none"/><circle cx="32" cy="64" r="5" fill="#ff9ed6" opacity=".7"/><circle cx="68" cy="64" r="5" fill="#ff9ed6" opacity=".7"/></svg>';
  const LAYER = c => '<svg viewBox="0 0 200 50" preserveAspectRatio="none" aria-hidden="true"><rect x="4" y="6" width="192" height="40" rx="14" fill="' + c + '" stroke="#fff" stroke-width="5"/><path d="M14 14 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0" fill="#fff" opacity=".9"/></svg>';
  const ICON = { gemcatch: () => GEMS[0], bubble: () => bubbleHTML('bunny'), peek: () => CUP, cake: () => LAYER('#ff8fd0') };
  const XS = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M26 26 L74 74 M74 26 L26 74" stroke="#a0207a" stroke-width="14" stroke-linecap="round"/></svg>';
  const SKIP = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M18 20 L54 50 L18 80Z M50 20 L86 50 L50 80Z" fill="#a0207a"/></svg>';
  const app = $('app'), root = el('section', 'fz-mg'); root.id = 'mgM'; root.hidden = true;
  root.innerHTML = '<div class="fz-mgtop"><div class="plate fz-mgsc"><span id="mgIc" class="ic"></span><span id="mgN">0</span><span>/</span><span id="mgGoal">0</span></div><div class="fz-mgbar"><i id="mgBar"></i></div><button class="lb si" id="mgSkip" aria-label="Skip">' + SKIP + '<span>Skip</span></button></div><div class="fz-mgarea" id="mgArea"></div>' +
    '<div class="ov fz-ov" id="mgEnd" hidden><div class="panel fz-panel"><h2 class="fz-h" id="mgTitle"></h2><div id="mgStars" class="fz-mgstars"></div><div class="fz-gt" id="mgRes"></div><button class="lb" id="mgDone" aria-label="Done"></button></div></div>' +
    '<div class="ov fz-ov" id="mgPick" hidden><div class="panel fz-panel"><h2 class="fz-h">Mini-games</h2><div class="fz-mgpick" id="mgList"></div><button class="rb si fz-x" id="mgPickX" aria-label="Close">' + XS + '</button></div></div>';
  app.appendChild(root);
  $('mgDone').innerHTML = window.SKArt.SVG.play + '<span>Yay!</span>'; $('mgStars').innerHTML = [0, 1, 2].map(() => '<i>' + window.SKArt.SVG.star + '</i>').join('');
  const area = $('mgArea');
  const N = 10, spr = [], sx = new Float32Array(N), sy = new Float32Array(N), sv = new Float32Array(N), sw = new Float32Array(N), on = new Uint8Array(N), kind = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const s = el('div', 'fz-sp'); s.hidden = true; area.appendChild(s); spr.push(s); }
  const basket = el('div', 'fz-basket', '<svg viewBox="0 0 120 70" aria-hidden="true"><path d="M6 14 H114 L100 64 H20Z" fill="#ffd9ee" stroke="#d6339f" stroke-width="6" stroke-linejoin="round"/><path d="M20 30 H100 M28 46 H92" stroke="#ff8fd0" stroke-width="5"/></svg>'); area.appendChild(basket);
  const pop = el('div', 'fz-mgpop'); area.appendChild(pop);
  const plate = el('div', 'fz-plate'); plate.hidden = true; area.insertBefore(plate, area.firstChild);
  const GEMS = ['#9ae8ff', '#ff8fd0', '#b48aff', '#ffe15a'].map(c => '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M30 14 H70 L90 38 L50 92 L10 38Z" fill="' + c + '" stroke="#fff" stroke-width="6" stroke-linejoin="round"/><path d="M10 38 H90 M38 38 L50 92 L62 38" stroke="#fff" stroke-width="3" fill="none"/><ellipse cx="34" cy="26" rx="8" ry="4" fill="#fff" opacity=".8"/></svg>');
  const FRIENDS = ['bunny', 'kitten', 'puppy', 'bird', 'puff'];
  const bubbleHTML = (f, c) => '<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="translate(18 18) scale(.64)">' + X.E[f] + '</g><circle cx="50" cy="50" r="46" fill="' + (c ? c + '55' : 'rgba(170,225,255,.35)') + '" stroke="' + (c || '#bfefff') + '" stroke-width="5"/><ellipse cx="34" cy="28" rx="12" ry="7" fill="#fff" opacity=".8" transform="rotate(-30 34 28)"/></svg>';
  // v7 state: peek = cups at slots, cake = stacked layers
  const slot = [0, 1, 2], cupX = new Float32Array(3); let ph = '', phT = 0, round = 0, hideAt = 0, swaps = 0, sa = 0, sb = 0, lift = -1, show = -1, lh = 40, slideX = 0, slideV = 1, wob = 0;
  let G = null, raf = 0, last = 0, t = 0, n = 0, goal = 0, W = 0, Hh = 0, bx = 0, bw = 0, spawnT = 0, done = null, ended = false, vBusy = 0;
  const say = (l, p) => { const k = performance.now(); if (!p && k < vBusy) return; vBusy = k + 1500; B.say(l, true); };
  function size() { const r = area.getBoundingClientRect(); W = r.width; Hh = r.height; bw = Math.max(110, Math.min(200, W * 0.28)); basket.style.width = bw + 'px'; if (!bx) bx = W / 2; }
  function start(id, after) {
    G = id; done = after || null; ended = false; n = 0; t = 0; spawnT = 0; bx = 0; const g = GAMES[id]; goal = g.goal;
    root.hidden = false; $('mgEnd').hidden = true; $('mgPick').hidden = true; root.dataset.g = id; $('mgN').textContent = 0; $('mgGoal').textContent = goal; $('mgIc').innerHTML = ICON[id]();
    basket.hidden = id !== 'gemcatch'; on.fill(0); spr.forEach(s => { s.hidden = true; s.className = 'fz-sp'; });
    size(); setBar(); F.setMg(id, 0); say(g.intro); H.emit('mgStart', id);
    if (id === 'peek') { round = 0; spr.forEach((s, i) => { if (i < 4) { s.hidden = false; s.innerHTML = i < 3 ? CUP : PUFF; s.className = 'fz-sp' + (i < 3 ? ' fz-cup' : ''); } }); newRound(); }
    plate.hidden = id !== 'cake'; if (id === 'cake') { const pw = Math.max(170, Math.min(300, W * 0.46)); plate.style.width = pw + 'px'; plate.style.transform = 'translate(' + (W / 2 - pw / 2).toFixed(0) + 'px,' + (Hh - 34).toFixed(0) + 'px)'; lh = Math.max(26, Math.min(44, (Hh - 150) / 8.5)); slideX = 0; slideV = 1; wob = 0; dropLayer(true); }
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function setBar() { $('mgBar').style.transform = 'scaleX(' + Math.min(1, n / goal).toFixed(3) + ')'; }
  function spawn() {
    for (let i = 0; i < N; i++) if (!on[i]) { on[i] = 1; const s = spr[i]; s.hidden = false;
      if (G === 'gemcatch') { kind[i] = Math.random() * 4 | 0; s.innerHTML = GEMS[kind[i]]; sw[i] = 54; sx[i] = 30 + Math.random() * (W - 60); sy[i] = -60; sv[i] = (calm() ? 120 : 160) + Math.random() * 90; }
      else { kind[i] = Math.random() * 5 | 0; s.innerHTML = bubbleHTML(FRIENDS[kind[i]], BCOL[kind[i]][0]); sw[i] = Math.max(80, Math.min(120, W * 0.2)); sx[i] = sw[i] / 2 + Math.random() * (W - sw[i]); sy[i] = Hh + sw[i]; sv[i] = (calm() ? 60 : 80) + Math.random() * 50; }
      s.style.width = s.style.height = sw[i] + 'px'; return; }
  }
  // ---------- v7 Puffball Peekaboo: 3 cups, a slow shuffle, 5 rounds; a wrong cup just shows where the puffball was ----------
  const cupW = () => Math.max(84, Math.min(140, W * 0.22)), slotX = k => W / 2 + (k - 1) * Math.min(W * 0.3, cupW() * 1.5);
  function newRound() { ph = 'show'; phT = 0; hideAt = Math.random() * 3 | 0; swaps = calm() ? 2 : 3; lift = hideAt; show = -1; for (let i = 0; i < 3; i++) slot[i] = i; if (round === 0) say('Watch the puffball!', true); }
  function stepPeek(dt) {
    phT += dt; const cw = cupW(), base = Hh * 0.62;
    if (ph === 'show' && phT > 1.6) { ph = 'cover'; phT = 0; lift = -1; }
    else if (ph === 'cover' && phT > 0.5) { ph = 'swap'; phT = 0; sa = Math.random() * 3 | 0; sb = (sa + 1 + (Math.random() * 2 | 0)) % 3; }
    else if (ph === 'swap' && phT > (calm() ? 1.1 : 0.85)) { const k = slot[sa]; slot[sa] = slot[sb]; slot[sb] = k; phT = 0; if (--swaps <= 0) { ph = 'pick'; say('Where is it?'); } else { sa = Math.random() * 3 | 0; sb = (sa + 1 + (Math.random() * 2 | 0)) % 3; } }
    else if (ph === 'reveal' && phT > 1.8) { if (++round >= goal) return win(); newRound(); }
    for (let i = 0; i < 3; i++) {
      let x = slotX(slot[i]), y = base;
      if (ph === 'swap' && (i === sa || i === sb)) { const p = Math.min(1, phT / (calm() ? 1.1 : 0.85)), e = p * p * (3 - 2 * p), o = i === sa ? sb : sa; x = slotX(slot[i]) + (slotX(slot[o]) - slotX(slot[i])) * e; y = base + Math.sin(e * Math.PI) * (i === sa ? -36 : 36); }
      if (i === lift || i === show) y -= cw * 0.75; cupX[i] = x;
      spr[i].style.width = spr[i].style.height = cw + 'px'; spr[i].style.transform = 'translate(' + (x - cw / 2).toFixed(1) + 'px,' + (y - cw / 2).toFixed(1) + 'px)';
    }
    const pw = cw * 0.7; spr[3].style.width = spr[3].style.height = pw + 'px'; spr[3].style.transform = 'translate(' + (cupX[hideAt] - pw / 2).toFixed(1) + 'px,' + (base + cw * 0.5 - pw).toFixed(1) + 'px)';
    spr[3].style.opacity = (ph === 'show' || ph === 'reveal' || ph === 'cover' && phT < 0.25) ? 1 : 0;
  }
  function pickCup(i) { if (ph !== 'pick') return; ph = 'reveal'; phT = 0; lift = i; show = hideAt;
    if (i === hideAt) { got(cupX[i], Hh * 0.4); say('Peekaboo!', true); } else say('There it is!', true); }
  // ---------- v7 Cake Stack: a layer slides along the top, tap drops it; 8 layers or 30 s; a wobbly cake still wins ----------
  function dropLayer(first) { const i = Math.min(N - 1, n); const s = spr[i]; s.hidden = false; s.className = 'fz-sp fz-layer'; s.innerHTML = LAYER(BCOL[i % 5][0]); sw[i] = Math.max(120, Math.min(220, W * 0.36)); s.style.width = sw[i] + 'px'; s.style.height = lh + 'px'; slideX = first ? sw[i] / 2 : slideX; }
  function stepCake(dt) {
    const i = Math.min(N - 1, n), w = sw[i], sp = (calm() ? 120 : 170) + n * 10; slideX += slideV * sp * dt;
    if (slideX > W - w / 2) { slideX = W - w / 2; slideV = -1; } if (slideX < w / 2) { slideX = w / 2; slideV = 1; }
    const yTop = Hh - 30 - (n + 3) * lh; wob += dt;
    spr[i].style.transform = 'translate(' + (slideX - w / 2).toFixed(1) + 'px,' + Math.max(4, yTop).toFixed(1) + 'px)';
    for (let k = 0; k < Math.min(n, N - 1); k++) { const sway = Math.sin(wob * 2.2 + k * 0.6) * Math.min(6, Math.abs(sx[k] - W / 2) * 0.05) * (k / 8); spr[k].style.transform = 'translate(' + (sx[k] - sw[k] / 2 + sway).toFixed(1) + 'px,' + sy[k].toFixed(1) + 'px)'; }
  }
  function placeLayer() { const i = Math.min(N - 1, n), prev = n ? sx[n - 1] : W / 2; sx[i] = prev + (slideX - prev) * 0.35; sy[i] = Hh - 30 - (n + 1) * lh;   // lands kindly near the cake
    const c = COUNT[n]; got(sx[i], sy[i]); if (c) B.say(c, true); if (n < goal) dropLayer(false); }
  function loop(ts) {
    raf = 0; if (!G || ended) return; let dt = (ts - last) / 1000; last = ts; if (!(dt > 0)) dt = 0.016; if (dt > 0.05) dt = 0.05; t += dt;
    if (G === 'peek') { stepPeek(dt); if (!ended) raf = requestAnimationFrame(loop); return; }
    if (G === 'cake') { stepCake(dt); if (n >= goal || t >= 30) return win(); raf = requestAnimationFrame(loop); return; }
    spawnT -= dt; const live = on.reduce((a, b) => a + b, 0); if (spawnT <= 0 && live < (G === 'gemcatch' ? 5 : 6)) { spawn(); spawnT = G === 'gemcatch' ? 0.55 : 0.7; }
    const by = Hh - 70;
    for (let i = 0; i < N; i++) if (on[i]) {
      if (G === 'gemcatch') { sy[i] += sv[i] * dt; if (sy[i] > by - 30 && sy[i] < by + 10 && Math.abs(sx[i] - bx) < bw / 2) { on[i] = 0; spr[i].hidden = true; got(sx[i], by - 20); continue; } if (sy[i] > Hh + 40) { on[i] = 0; spr[i].hidden = true; continue; } }
      else { sy[i] -= sv[i] * dt; sx[i] += Math.sin(t * 2 + i) * 14 * dt; if (sy[i] < -sw[i]) { on[i] = 0; spr[i].hidden = true; continue; } }
      spr[i].style.transform = 'translate(' + (sx[i] - sw[i] / 2).toFixed(1) + 'px,' + (sy[i] - sw[i] / 2).toFixed(1) + 'px)';
    }
    if (G === 'gemcatch') basket.style.transform = 'translate(' + (bx - bw / 2).toFixed(1) + 'px,' + (by - 20).toFixed(1) + 'px)';
    if (n >= goal || t >= 30) return win();   // always a win: the timer only ends the game
    raf = requestAnimationFrame(loop);
  }
  function got(x, y) { n++; $('mgN').textContent = n; setBar(); try { G === 'gemcatch' ? Au.gem(n) : (Au.pop(n % 5 + 1)); } catch (e) { }
    pop.style.transform = 'translate(' + (x - 30).toFixed(0) + 'px,' + (y - 30).toFixed(0) + 'px)'; pop.classList.remove('go'); void pop.offsetWidth; pop.classList.add('go'); if ((G === 'gemcatch' || G === 'bubble') && (n === 5 || n === 10)) say(n === 5 ? 'Amazing!' : 'Super!'); }
  area.addEventListener('pointerdown', e => { if (!G || ended) return; const r = area.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (G === 'gemcatch') { bx = Math.max(bw / 2, Math.min(W - bw / 2, x)); try { area.setPointerCapture(e.pointerId); } catch (x2) { } return; }
    if (G === 'cake') { if (n < goal) placeLayer(); return; }
    if (G === 'peek') { const cw = cupW(); let bi = -1, bd = 1e9; for (let i = 0; i < 3; i++) { const d = Math.abs(x - cupX[i]); if (d < bd) { bd = d; bi = i; } } if (bd < cw * 0.75) pickCup(bi); return; }
    for (let i = 0; i < N; i++) if (on[i] && Math.hypot(x - sx[i], y - sy[i]) < sw[i] * 0.62) { on[i] = 0; spr[i].hidden = true; got(sx[i], sy[i]); if (G === 'bubble') H.emit('mgColor', BCOL[kind[i]][1], n); break; } });
  area.addEventListener('pointermove', e => { if (G !== 'gemcatch' || ended || !e.buttons && e.pointerType === 'mouse') return; const r = area.getBoundingClientRect(); bx = Math.max(bw / 2, Math.min(W - bw / 2, e.clientX - r.left)); });
  function win() {
    ended = true; cancelAnimationFrame(raf); F.setMg(G, n); const g = GAMES[G], st = n >= goal ? 3 : n >= goal / 2 ? 2 : 1;
    $('mgTitle').textContent = g.name; [...$('mgStars').children].forEach((e, i) => e.classList.toggle('on', i < st)); $('mgRes').textContent = 'You did it! ' + n; $('mgEnd').hidden = false; $('mgEnd').dataset.g = G;
    try { Au.fanfare(); } catch (e) { } say(g.win, true); H.emit('mgEnd', G, n);
  }
  function finish() { cancelAnimationFrame(raf); raf = 0; ended = true; root.hidden = true; const g = G; G = null; spr.forEach(s => { s.hidden = true; s.style.opacity = ''; s.className = 'fz-sp'; }); plate.hidden = true; const d = done; done = null; H.emit('mapRefresh'); if (d) d(g); }
  $('mgDone').addEventListener('click', () => { try { Au.tap(); } catch (e) { } finish(); });
  $('mgSkip').addEventListener('click', () => { try { Au.tap(); } catch (e) { } if (G) F.setMg(G, n); finish(); });
  // pause when hidden (no timers run in the background)
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (G && !ended && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } });
  addEventListener('resize', () => { if (G) size(); });
  // ---------- after every other level (1 Gem Catch, 3 Bubble Pop, 5 Peekaboo, 7 Cake Stack), always skippable ----------
  const AFTER = { 1: 'gemcatch', 3: 'bubble', 5: 'peek', 7: 'cake' };
  function afterLevel(id, cont) { const g = AFTER[id]; if (!g) return false; start(g, cont); return true; }
  H.on('afterLevel', afterLevel);
  function chooser() { const found = F.mgFound(); $('mgList').innerHTML = ORDER.filter(k => found.includes(k)).map(k => { const best = window.SKSave.get().mg[k] || 0; return '<button class="lb" data-g="' + k + '" aria-label="' + GAMES[k].name + '">' + ICON[k]() + '<span>' + GAMES[k].name + '</span><small>Best ' + best + '</small></button>'; }).join('');
    root.hidden = false; $('mgEnd').hidden = true; $('mgPick').hidden = false; basket.hidden = true; G = null; }
  $('mgList').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; try { Au.tap(); } catch (x) { } start(b.dataset.g, null); });
  $('mgPickX').addEventListener('click', () => { try { Au.tap(); } catch (x) { } root.hidden = true; });
  window.SKMini = { start, chooser, afterLevel, GAMES, get on() { return !root.hidden; }, get n() { return n; }, get phase() { return ph; }, finish, win: () => { if (G && !ended) win(); } };
})();
