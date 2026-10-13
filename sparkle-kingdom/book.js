// Sparkle Kingdom fun screens (v5, Phase 1): Sticker Book, Glimmer's Wardrobe (gem shop + pets), Daily Surprise gift.
// DOM overlays on the map only (never during play). Big buttons (>= 52 px). Button taps use the soft menu tick only.
(function () {
  const F = window.SKFun, X = window.SKFx, WD = window.SKWardrobe, S = window.SKSave, Au = window.SKAudio, H = window.SKHooks, save = S.get();
  const $ = id => document.getElementById(id);
  const V = {
    gift: 'A surprise gift for you!', sticker: 'You got a new sticker!', shiny: 'Ooh, a shiny sticker!', page: 'You filled a whole page!',
    outfit: 'A new outfit for Glimmer!', gems: 'Gem shower!', silly: 'Silly hat day!', wear: 'Looking fabulous!', pet: 'Your new friend is here!',
    more: 'Collect more gems for this one!', tomorrow: 'See you tomorrow for another surprise!', book: 'Look at all your stickers!'
  };
  let vBusy = 0;
  const say = (t, pri) => { const n = performance.now(); if (!pri && n < vBusy) return; vBusy = n + 900 + t.length * 55; try { Au.say(t); } catch (e) { } };
  const tick = () => { try { Au.init(); Au.tap(); } catch (e) { } };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const app = $('app');
  const X_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M26 26 L74 74 M74 26 L26 74" stroke="#a0207a" stroke-width="14" stroke-linecap="round"/></svg>';
  const ARROW = d => '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="' + (d < 0 ? 'M64 18 L30 50 L64 82' : 'M36 18 L70 50 L36 82') + '" fill="none" stroke="#a0207a" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const GEM = window.SKArt.SVG.gem;
  // ---------- map buttons ----------
  const bot = document.querySelector('#map .bot'), mid = document.querySelector('#map .mid');
  const bBook = el('button', 'rb si fz-b', X.book + '<b id="bookN">0</b>'); bBook.id = 'bBook'; bBook.setAttribute('aria-label', 'Sticker book');
  const bShop = el('button', 'rb si fz-b', X.hanger); bShop.id = 'bShop'; bShop.setAttribute('aria-label', 'Wardrobe');
  bot.insertBefore(bBook, $('stkBar')); bot.insertBefore(bShop, $('stkBar'));
  const bGift = el('button', 'fz-gift', X.gift); bGift.id = 'bGift'; bGift.setAttribute('aria-label', 'Surprise gift'); bGift.hidden = true; mid.appendChild(bGift);
  // ---------- overlays ----------
  const ov = (id, label) => { const s = el('section', 'ov fz-ov'); s.id = id; s.hidden = true; const p = el('div', 'panel fz-panel'); p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', label); s.appendChild(p); app.appendChild(s); return p; };
  const closeBtn = (fn) => { const b = el('button', 'rb si fz-x', X_SVG); b.setAttribute('aria-label', 'Close'); b.addEventListener('click', () => { tick(); fn(); }); return b; };
  // Sticker Book
  const pb = ov('bookM', 'Sticker book'); let page = 0, flash = -1;
  pb.innerHTML = '<div class="fz-top"><button class="rb si" id="bkPrev" aria-label="Previous page">' + ARROW(-1) + '</button><h2 id="bkTitle"></h2><button class="rb si" id="bkNext" aria-label="Next page">' + ARROW(1) + '</button></div><div class="fz-grid" id="bkGrid"></div><div class="fz-dots" id="bkDots"></div><div class="fz-cnt" id="bkCnt"></div>';
  { const x = closeBtn(() => { $('bookM').hidden = true; }); x.classList.add('in'); pb.querySelector('.fz-top').appendChild(x); }
  function drawBook() {
    const p = F.PAGES[page]; $('bkTitle').textContent = p.name; $('bkGrid').style.setProperty('--pc', p.c);
    $('bkGrid').classList.toggle('done', F.pageDone(page)); $('bkGrid').classList.toggle('shine', flash === page); flash = -1;
    $('bkGrid').innerHTML = p.s.map(([id, src]) => { const own = F.has(id); return '<i class="fz-st' + (own ? ' on' : '') + (own && F.isShiny(id) ? ' shiny' : '') + '" aria-label="' + (own ? id : 'not found yet') + '">' + (own ? X.sticker(id, p.c) : '<span>' + (src.daily ? X.gift : '?') + '</span>') + '</i>'; }).join('');
    $('bkDots').innerHTML = F.PAGES.map((q, i) => '<i class="' + (i === page ? 'cur' : '') + (F.pageDone(i) ? ' full' : '') + '" style="--pc:' + q.c + '"></i>').join('');
    $('bkCnt').innerHTML = F.count() + ' / ' + F.total;
  }
  $('bkPrev').addEventListener('click', () => { tick(); page = (page + 6) % 7; drawBook(); });
  $('bkNext').addEventListener('click', () => { tick(); page = (page + 1) % 7; drawBook(); });
  function openBook(pg, shineIt) { if (pg != null && pg >= 0) page = pg; if (shineIt) flash = page; drawBook(); $('bookM').hidden = false; if (!S.seen('book')) { S.markSeen('book'); say(V.book, true); } }
  bBook.addEventListener('click', () => { tick(); openBook(); });
  // Wardrobe + pet shop
  const ps = ov('shopM', 'Wardrobe'); let slot = 'hat', armed = '';
  const SLOT_ICON = { hat: ['party', 'Hats'], cape: ['royal', 'Capes'], wings: ['butterfly', 'Wings'], shoes: ['gold', 'Shoes'], pet: ['bunny', 'Pets'] };
  ps.innerHTML = '<div class="fz-top"><img id="shHero" alt="Glimmer"><div class="plate"><span class="ic">' + GEM + '</span><span id="shGems">0</span></div></div><div class="fz-tabs" id="shTabs"></div><div class="fz-items" id="shItems"></div><div class="fz-pn" id="shPn" hidden><span>Name</span><button class="lb" id="shName"></button></div>';
  ps.prepend(closeBtn(() => { $('shopM').hidden = true; armed = ''; }));
  $('shTabs').innerHTML = F.SLOTS.map(s => '<button class="fz-tab" data-s="' + s + '" aria-label="' + SLOT_ICON[s][1] + '"><img alt="" src="' + WD.icon(s, SLOT_ICON[s][0]) + '"></button>').join('');
  function drawShop() {
    $('shGems').textContent = save.gems; $('shHero').src = H.emit('portrait') || '';
    [...$('shTabs').children].forEach(b => b.classList.toggle('on', b.dataset.s === slot));
    const on = save.wd.on[slot];
    $('shItems').innerHTML = F.ITEMS.filter(i => i.slot === slot).map(i => { const own = F.owns(i.id), wearing = own && on === i.id, can = save.gems >= i.cost;
      return '<button class="fz-it' + (own ? ' own' : can ? '' : ' far') + (wearing ? ' on' : '') + (armed === i.id ? ' armed' : '') + '" data-id="' + i.id + '" aria-label="' + i.name + '"><img alt="" src="' + WD.icon(i.slot, i.art) + '"><span class="nm">' + i.name + '</span><span class="pr">' +
        (wearing ? 'On' : own ? 'Wear' : armed === i.id ? 'Buy!' : '<span class="ic">' + GEM + '</span>' + i.cost) + '</span></button>'; }).join('');
    const showPn = slot === 'pet' && F.ITEMS.some(i => i.slot === 'pet' && F.owns(i.id)); $('shPn').hidden = !showPn; if (showPn) $('shName').textContent = F.petNameNow();
  }
  $('shTabs').addEventListener('click', e => { const b = e.target.closest('.fz-tab'); if (!b) return; tick(); slot = b.dataset.s; armed = ''; drawShop(); });
  $('shItems').addEventListener('click', e => {
    const b = e.target.closest('.fz-it'); if (!b) return; const id = b.dataset.id, it = F.ITEM[id]; tick();
    if (F.owns(id)) { F.wear(id); if (save.wd.on[it.slot] === id) say(V.wear); armed = ''; H.emit('lookChanged'); drawShop(); return; }
    if (save.gems < it.cost) { armed = ''; say(V.more); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); return; }
    if (armed !== id) { armed = id; drawShop(); return; }   // second tap buys (no accidental spends)
    const r = F.buy(id); armed = ''; if (!r.ok) return; try { Au.sticker ? Au.sticker() : Au.crown(); } catch (x) { }
    say(it.slot === 'pet' ? V.pet : V.outfit, true); if (it.slot === 'pet') setTimeout(() => say(petHi(), true), 1900);
    if (r.stickers.length) setTimeout(() => say(V.sticker, true), 3800);
    H.emit('lookChanged'); drawShop(); refresh();
  });
  const petHi = () => 'Hello, ' + F.petNameNow() + '!';
  $('shName').addEventListener('click', () => { tick(); const L = F.PET_NAMES, i = L.indexOf(F.petNameNow()); F.petName(L[(i + 1) % L.length]); $('shName').textContent = F.petNameNow(); say(petHi(), true); });
  bShop.addEventListener('click', () => { tick(); slot = 'hat'; armed = ''; drawShop(); $('shopM').hidden = false; });
  // Daily Surprise
  const pg = ov('giftM', 'Surprise'); pg.classList.add('fz-giftp');
  pg.innerHTML = '<div class="fz-box" id="gBox">' + X.gift + '</div><div class="fz-prize" id="gPrize" hidden></div><div class="fz-gt" id="gText"></div><button class="lb" id="gOk" aria-label="Yay"></button>';
  $('gOk').innerHTML = window.SKArt.SVG.play + '<span>Yay!</span>';
  function openGift() {
    if (!F.surpriseReady()) return; const r = F.openSurprise(); if (!r) return; tick(); bGift.hidden = true;
    $('gBox').hidden = false; $('gBox').className = 'fz-box open'; $('gPrize').hidden = true; $('gText').textContent = ''; $('giftM').hidden = false;
    setTimeout(() => { $('gBox').hidden = true; const P = $('gPrize'); P.hidden = false;
      if (r.kind === 'sticker') { const st = F.STK[r.id]; P.innerHTML = X.sticker(r.id, F.PAGES[st.page].c); $('gText').textContent = 'New sticker!'; say(V.sticker, true); if (r.page >= 0) setTimeout(() => say(V.page, true), 2200); }
      else if (r.kind === 'outfit') { const it = F.ITEM[r.id]; P.innerHTML = '<img alt="" src="' + WD.icon(it.slot, it.art) + '">'; $('gText').textContent = it.name + '!'; say(V.outfit, true); }
      else if (r.kind === 'gems') { P.innerHTML = '<span class="gs">' + GEM + GEM + GEM + '</span>'; $('gText').textContent = '+' + r.n; say(V.gems, true); }
      else { P.innerHTML = '<img alt="" src="' + WD.icon('hat', 'teapot') + '">'; $('gText').textContent = 'Silly hat day!'; say(V.silly, true); H.emit('lookChanged'); }
      try { Au.crown(); } catch (x) { } refresh(); }, 900);
  }
  bGift.addEventListener('click', openGift);
  $('gOk').addEventListener('click', () => { tick(); $('giftM').hidden = true; if (!S.seen('tmrw')) { S.markSeen('tmrw'); say(V.tomorrow); } });
  // ---------- map refresh (called by game.js through the onMapOpen hook) ----------
  function refresh() { $('bookN').textContent = F.count(); bGift.hidden = !F.surpriseReady(); }
  H.on('onMapOpen', first => { H.emit('onDayStart'); refresh(); ['bookM', 'shopM', 'giftM'].forEach(id => $(id).hidden = true); if (F.surpriseReady()) setTimeout(() => { if (!bGift.hidden && !$('map').hidden) say(V.gift); }, first ? 3200 : 900); });
  window.SKBook = { openBook, openGift, refresh, V, close() { ['bookM', 'shopM', 'giftM'].forEach(id => $(id).hidden = true); }, get open() { return ['bookM', 'shopM', 'giftM'].some(id => !$(id).hidden); } };
})();
