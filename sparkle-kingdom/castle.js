// Sparkle Kingdom v6 (fun Phase 2): Sparkle Castle decorating (12 slots, its own screen; the castle is also drawn behind the
// map), the Sparkle Days bead moon (+ bonus gift every 3 beads), the mini-game replay button, the "one more thing" map hint
// and the cozy "Glimmer naps" screen under the Fun Zone break card. DOM overlays on the map only; buttons >= 52 px.
(function () {
  const F = window.SKFun, X = window.SKFx, S = window.SKSave, Au = window.SKAudio, H = window.SKHooks, B = window.SKBook, save = S.get();
  const $ = id => document.getElementById(id), el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const V = { place: 'The castle looks beautiful!', pick: 'Tap a sparkly spot to decorate your castle!', bead: 'Another bead for the Sparkle Days moon!', bonus: 'Three beads! A bonus gift!', nap: 'Glimmer is taking a little nap.', more: B.V.more };
  const say = (t, p) => B.say(t, p), tick = () => { try { Au.init(); Au.tap(); } catch (e) { } };
  const GEM = window.SKArt.SVG.gem, XS = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M26 26 L74 74 M74 26 L26 74" stroke="#a0207a" stroke-width="14" stroke-linecap="round"/></svg>';
  // ---------- map buttons (a column on the left of the map) ----------
  const mid = document.querySelector('#map .mid'), side = el('div', 'fz-side'); side.id = 'fzSide'; mid.appendChild(side);
  const mkB = (id, svg, label) => { const b = el('button', 'rb si fz-b', svg); b.id = id; b.setAttribute('aria-label', label); side.appendChild(b); return b; };
  const bCastle = mkB('bCastle', X.castleIcon, 'Sparkle Castle'), bMoon = mkB('bMoon', X.moonSVG(0, false), 'Sparkle Days'), bGames = mkB('bGames', X.games, 'Mini-games');
  const app = $('app');
  const ov = (id, label, cls) => { const s = el('section', 'ov fz-ov'); s.id = id; s.hidden = true; const p = el('div', 'panel fz-panel ' + (cls || '')); p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', label); s.appendChild(p); app.appendChild(s); return p; };
  const close = (p, id) => { const b = el('button', 'rb si fz-x', XS); b.setAttribute('aria-label', 'Close'); b.addEventListener('click', () => { tick(); $(id).hidden = true; refresh(); }); p.prepend(b); };
  // ---------- castle screen ----------
  const pc = ov('castleM', 'Sparkle Castle', 'fz-castlep'); pc.innerHTML = '<h2 class="fz-h">Sparkle Castle</h2><div class="fz-cwrap" id="cWrap"><div id="cArt"></div><div id="cSlots"></div></div><div class="fz-cinfo"><div class="plate"><span class="ic">' + GEM + '</span><span id="cGems">0</span></div><span id="cCount"></span></div>'; close(pc, 'castleM');
  let armed = '';
  function drawCastle() {
    $('cArt').innerHTML = X.castleSVG(save.castle); $('cGems').textContent = save.gems; $('cCount').textContent = F.placedCount() + ' / 12';
    $('cSlots').innerHTML = X.SLOTS.filter(k => !F.placed(k)).map(k => { const d = X.DECOR[k], own = F.ownsDecor(k), can = save.gems >= d.cost;
      return '<button class="fz-slot' + (own ? ' own' : can ? '' : ' far') + (armed === k ? ' armed' : '') + '" data-k="' + k + '" style="left:' + (d.hx / 4) + '%;top:' + (d.hy / 3) + '%" aria-label="' + d.name + '">' + (own ? '<b>+</b>' : armed === k ? '<b class="buy">Buy!</b>' : '<span class="ic">' + GEM + '</span><span>' + d.cost + '</span>') + '</button>'; }).join('');
  }
  $('cSlots').addEventListener('click', e => {
    const b = e.target.closest('.fz-slot'); if (!b) return; const k = b.dataset.k, d = X.DECOR[k]; tick();
    if (!F.ownsDecor(k)) { if (save.gems < d.cost) { armed = ''; say(V.more); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); return; }
      if (armed !== k) { armed = k; drawCastle(); return; } F.buyDecor(k); }
    armed = ''; F.place(k); try { Au.crown(); } catch (x) { } drawCastle(); burst(d); say(V.place, true);
  });
  function burst(d) { if (document.documentElement.classList.contains('fz-calm')) return; const w = $('cWrap'), s = el('i', 'fz-burst'); s.style.left = (d.x / 4) + '%'; s.style.top = (d.y / 3) + '%'; w.appendChild(s); setTimeout(() => s.remove(), 900); }
  function openCastle() { armed = ''; drawCastle(); $('castleM').hidden = false; if (!S.seen('castle')) { S.markSeen('castle'); say(V.pick, true); } }
  bCastle.addEventListener('click', () => { tick(); openCastle(); });
  // ---------- Sparkle Days moon ----------
  const pm = ov('moonM', 'Sparkle Days', 'fz-moonp'); pm.innerHTML = '<h2 class="fz-h">Sparkle Days</h2><div class="fz-moon" id="mArt"></div><div class="fz-gt" id="mText"></div><button class="lb" id="mGift" aria-label="Open bonus gift"></button>'; close(pm, 'moonM');
  $('mGift').innerHTML = X.gift + '<span>Gift!</span>';
  function drawMoon() { const n = F.beads(), ready = F.bonusReady(); $('mArt').innerHTML = X.moonSVG(ready ? 3 : n % 3, ready); $('mText').textContent = n + (n === 1 ? ' Sparkle Day' : ' Sparkle Days'); $('mGift').hidden = !ready; }
  bMoon.addEventListener('click', () => { tick(); drawMoon(); $('moonM').hidden = false; });
  $('mGift').addEventListener('click', () => { tick(); const r = F.openBonus(); if (!r) return; $('moonM').hidden = true; say(V.bonus, true); setTimeout(() => B.reveal(r), 300); refresh(); });
  // ---------- mini-game replay ----------
  bGames.addEventListener('click', () => { tick(); if (window.SKMini) SKMini.chooser(); });
  // ---------- castle drawn behind the map (rasterized once per change/size; game.js stamps it with one drawImage) ----------
  let img = null, ready = false, ver = 0, cache = null, cacheKey = '';
  function loadImg() { ready = false; ver++; const v = ver, im = new Image(); im.onload = () => { if (v === ver) { img = im; ready = true; cache = null; } }; im.src = 'data:image/svg+xml,' + encodeURIComponent(X.castleSVG(save.castle)); }
  function backdrop(w, h) { if (!ready) return null; w = Math.round(w); h = Math.round(h); const k = w + 'x' + h; if (cache && cacheKey === k) return cache;
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); cache = c; cacheKey = k; return c; }
  H.on('castleChanged', loadImg); loadImg();
  // ---------- "one more thing": one gentle pulse on the next fun thing (never a nag, no sound) ----------
  function refresh() {
    const ready = F.bonusReady(); bMoon.innerHTML = X.moonSVG(ready ? 3 : F.beads() % 3, ready); bGames.hidden = !F.mgFound().length;
    document.querySelectorAll('.fz-hint').forEach(e => e.classList.remove('fz-hint'));
    const cheapest = X.SLOTS.filter(k => !F.placed(k)).some(k => F.ownsDecor(k) || save.gems >= X.DECOR[k].cost);
    const t = F.surpriseReady() ? $('bGift') : ready ? bMoon : cheapest ? bCastle : F.ITEMS.some(i => !F.owns(i.id) && save.gems >= i.cost) ? $('bShop') : null;
    if (t) t.classList.add('fz-hint');
  }
  H.on('mapRefresh', refresh);
  H.on('onMapOpen', () => { ['castleM', 'moonM'].forEach(id => $(id).hidden = true); refresh(); if (F.takeBeadNew() && F.beads() > 1) setTimeout(() => { if (!$('map').hidden) say(F.bonusReady() ? V.bonus : V.bead); }, 5200); });
  // ---------- Glimmer naps (under the Fun Zone break card; the game saved first) ----------
  const nap = el('section', 'fz-nap'); nap.id = 'napM'; nap.hidden = true; nap.innerHTML = '<div class="fz-napz"><b>z</b><b>z</b><b>Z</b></div><img id="napPic" alt="Glimmer sleeping"><div class="fz-gt">Glimmer naps</div>'; app.appendChild(nap);
  H.on('napStart', () => { $('napPic').src = H.emit('portrait') || ''; nap.hidden = false; });
  H.on('napEnd', () => { nap.hidden = true; });
  window.SKCastle = { open: openCastle, backdrop, refresh, get ready() { return ready; }, V };
})();
