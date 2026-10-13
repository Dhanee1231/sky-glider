// Sparkle Kingdom fun systems (v5, Phase 1): hook bus, sticker book catalog + awards, shiny stickers, daily surprise,
// Glimmer's wardrobe + pets bought with gems. Pure state here (UI lives in book.js). All save data goes through SKSave
// (same key sparkle-kingdom.v1; fields day / wd / shiny / stk, all optional). Everything is no-fail: nothing is ever taken away.
(function () {
  const S = window.SKSave, save = S.get();
  // ---------- hook bus (game.js only calls these; listeners never throw into the game loop) ----------
  const L = {};
  window.SKHooks = {
    on(n, f) { (L[n] || (L[n] = [])).push(f); },
    emit(n, a, b, c, d) { const fs = L[n]; let r; if (fs) for (let i = 0; i < fs.length; i++) { try { const v = fs[i](a, b, c, d); if (v !== undefined) r = v; } catch (e) { } } return r; }
  };
  // ---------- sticker book: 10 pages x 6 = 60 stickers (v7 added pages 8-10; fr = hidden friend found in that level). src: lv = beat level, cr = any crown in level, sec = secret room,
  //            daily = daily surprise, stomp / gems / stars / own / pet / rescue = play milestones ----------
  const PAGES = [
    { id: 'clouds', name: 'Clouds', c: '#5fb8ff', s: [['heart', { lv: 1 }], ['cloud', { cr: 1 }], ['sun', { sec: 1 }], ['kite', { daily: 1 }], ['moon', { daily: 1 }], ['drop', { daily: 1 }]] },
    { id: 'flowers', name: 'Flowers', c: '#7ed68a', s: [['flower', { lv: 2 }], ['tulip', { cr: 2 }], ['daisy', { sec: 2 }], ['bee', { daily: 1 }], ['mush', { daily: 1 }], ['leaf', { stomp: 25 }]] },
    { id: 'rainbows', name: 'Rainbows', c: '#ff7ab0', s: [['rainbow', { lv: 3 }], ['umbrella', { cr: 3 }], ['slide', { sec: 3 }], ['balloon', { daily: 1 }], ['paint', { daily: 1 }], ['bigstar', { gems: 150 }]] },
    { id: 'gems', name: 'Gems', c: '#8a4be0', s: [['gem', { lv: 4 }], ['ring', { cr: 4 }], ['diamond', { sec: 4 }], ['jar', { gems: 300 }], ['twinkle', { daily: 1 }], ['coin', { gems: 600 }]] },
    { id: 'friends', name: 'Friends', c: '#ffb04a', s: [['bunny', { pet: 'bunny' }], ['kitten', { pet: 'kitten' }], ['puppy', { pet: 'puppy' }], ['bird', { pet: 'bird' }], ['puff', { stomp: 10 }], ['bubble', { rescue: 1 }]] },
    { id: 'silly', name: 'Silly', c: '#2fd8c8', s: [['teapot', { daily: 1 }], ['banana', { daily: 1 }], ['stache', { daily: 1 }], ['sock', { daily: 1 }], ['pancake', { stomp: 50 }], ['giggle', { daily: 1 }]] },
    { id: 'royal', name: 'Royal', c: '#f5c542', s: [['crown', { lv: 5 }], ['castle', { cr: 5 }], ['throne', { stars: 15 }], ['tiara', { own: 3 }], ['wand', { daily: 1 }], ['cake', { daily: 1 }]] },
    { id: 'sweetmoon', name: 'Sweet Moon', c: '#ff8fd0', s: [['candy', { lv: 6 }], ['lolly', { cr: 6 }], ['moonstar', { lv: 7 }], ['lantern', { cr: 7 }], ['shell', { lv: 8 }], ['fish', { cr: 8 }]] },
    { id: 'hidden', name: 'Hidden Friends', c: '#5fd8e8', s: [['h1', { fr: 1 }], ['h2', { fr: 2 }], ['h3', { fr: 3 }], ['h4', { fr: 4 }], ['h5', { fr: 5 }], ['h6', { fr: 6 }]] },
    { id: 'party', name: 'Party', c: '#b07aff', s: [['h7', { fr: 7 }], ['h8', { fr: 8 }], ['party', { lv: 9 }], ['disco', { cr: 9 }], ['sundae', { sec: 6 }], ['comet', { sec: 7 }]] }
  ];
  const STK = {}; PAGES.forEach((p, pi) => p.s.forEach(([id, src]) => { STK[id] = { id, page: pi, src }; }));
  const has = id => !!save.stk[id], isShiny = id => save.shiny[id] === 1;
  const count = () => { let n = 0; for (const id in STK) if (has(id)) n++; return n; };
  const pageDone = pi => PAGES[pi].s.every(([id]) => has(id));
  function give(id) { if (!STK[id] || has(id)) return false; const before = pageDone(STK[id].page); save.stk[id] = 1; S.later(); return { id, page: !before && pageDone(STK[id].page) ? STK[id].page : -1 }; }
  // ---------- wardrobe + pets (prices low on purpose: nothing grindy) ----------
  const ITEMS = [
    { id: 'party', slot: 'hat', name: 'Party Hat', cost: 20 }, { id: 'flower', slot: 'hat', name: 'Flower Crown', cost: 30 }, { id: 'bunny', slot: 'hat', name: 'Bunny Ears', cost: 40 }, { id: 'wizard', slot: 'hat', name: 'Star Wizard', cost: 60 },
    { id: 'royal', slot: 'cape', name: 'Royal Cape', cost: 50 }, { id: 'star', slot: 'cape', name: 'Star Cape', cost: 60 },
    { id: 'butterfly', slot: 'wings', name: 'Butterfly', cost: 40 }, { id: 'fairy', slot: 'wings', name: 'Rainbow', cost: 70 }, { id: 'starw', art: 'star', slot: 'wings', name: 'Star Wings', cost: 80 },
    { id: 'sneak', slot: 'shoes', name: 'Sneakers', cost: 20 }, { id: 'gold', slot: 'shoes', name: 'Gold Shoes', cost: 40 }, { id: 'rbshoe', art: 'rainbow', slot: 'shoes', name: 'Rainbow Shoes', cost: 50 },
    { id: 'p_bunny', art: 'bunny', slot: 'pet', name: 'Bunny Cloud', cost: 60 }, { id: 'p_kitten', art: 'kitten', slot: 'pet', name: 'Star Kitten', cost: 80 },
    { id: 'p_puppy', art: 'puppy', slot: 'pet', name: 'Gem Puppy', cost: 100 }, { id: 'p_bird', art: 'bird', slot: 'pet', name: 'Rainbow Bird', cost: 120 }
  ];
  const ITEM = {}; ITEMS.forEach(i => { i.art = i.art || i.id; ITEM[i.id] = i; });
  const SLOTS = ['hat', 'cape', 'wings', 'shoes', 'pet'];
  const PET_NAMES = ['Sprinkle', 'Button', 'Pip', 'Twinkle', 'Biscuit', 'Bubbles', 'Lulu', 'Coco'];
  const owns = id => save.wd.own[id] === 1;
  const ownedCount = () => ITEMS.filter(i => owns(i.id)).length;
  function buy(id) {   // returns {ok, item, stickers:[...]} ; never lets gems go below 0
    const it = ITEM[id]; if (!it || owns(id)) return { ok: false }; if (save.gems < it.cost) return { ok: false, short: it.cost - save.gems };
    save.gems -= it.cost; save.wd.own[id] = 1; save.wd.on[it.slot] = id; if (it.slot === 'pet' && !save.wd.pn) save.wd.pn = PET_NAMES[0];
    const st = milestones(); S.persist(); return { ok: true, item: it, stickers: st };
  }
  function wear(id) { const it = ITEM[id]; if (!it || !owns(id)) return; save.wd.on[it.slot] = save.wd.on[it.slot] === id ? null : id; S.later(); }
  function petName(n) { if (PET_NAMES.includes(n)) { save.wd.pn = n; S.later(); } }
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  // the look the game draws (unknown/unowned ids are ignored, never deleted)
  function look() {
    const o = {}; for (const s of SLOTS) { const id = save.wd.on[s]; if (id && ITEM[id] && owns(id) && ITEM[id].slot === s) o[s] = ITEM[id].art; }
    if (save.wd.silly === today()) o.hat = 'teapot'; return o;
  }
  // ---------- milestones (checked at level end, after a buy, after a surprise) ----------
  const cnt = k => { const v = save.wd[k]; return typeof v === 'number' && isFinite(v) ? Math.max(0, v) : 0; };
  function bump(k, n) { save.wd[k] = Math.min(1e6, cnt(k) + (n || 1)); S.later(); }
  function milestones() {
    let best = 0, stars = 0; for (let i = 1; i <= S.LEVELS; i++) { const e = S.level(i); best += e.g; stars += e.s; }
    const out = [];
    for (const id in STK) { if (has(id)) continue; const r = STK[id].src; let ok = false;
      if (r.lv) ok = S.done(r.lv); else if (r.cr) ok = S.crownCount(r.cr) > 0; else if (r.sec) ok = S.secret(r.sec);
      else if (r.stomp) ok = cnt('stomps') >= r.stomp; else if (r.gems) ok = best >= r.gems; else if (r.stars) ok = stars >= r.stars;
      else if (r.own) ok = ownedCount() >= r.own; else if (r.pet) ok = owns('p_' + r.pet); else if (r.rescue) ok = cnt('rescues') >= r.rescue;
      else if (r.fr) ok = S.friend(r.fr);
      if (ok) { const g = give(id); if (g) out.push(g); } }
    return out;
  }
  // 3-crown run: one sticker on that level's page turns shiny (owned ones first; Royal page for the boss)
  function shinyFor(lvId) {
    const p = PAGES[{ 1: 0, 2: 1, 3: 2, 4: 3, 5: 6, 6: 7, 7: 7, 8: 7, 9: 9 }[lvId]]; if (!p) return '';
    const c = p.s.map(x => x[0]).filter(id => has(id) && !isShiny(id)); if (!c.length) return '';
    const id = c[Math.random() * c.length | 0]; save.shiny[id] = 1; S.later(); return id;
  }
  // level end: returns the new stickers + shiny for the result screen
  function onLevelEnd(lvId, stars, gems, crownMask) {
    const st = milestones(); const sh = crownMask === 7 ? shinyFor(lvId) : '';
    S.persist(); return { stickers: st, shiny: sh };
  }
  // ---------- daily surprise: once per local calendar day; missing days costs nothing ----------
  const surpriseReady = () => save.day.opened !== today();
  // v6: castle decorations (owned in cinv, placed in castle), from gems, the daily gift and the bead moon
  const FX = window.SKFx, DECOR = FX.DECOR, DSLOTS = FX.SLOTS;
  const ownsDecor = k => save.cinv[k] === 1, placed = k => save.castle[k] === k;
  function buyDecor(k) { const d = DECOR[k]; if (!d || ownsDecor(k)) return { ok: false }; if (save.gems < d.cost) return { ok: false, short: d.cost - save.gems }; save.gems -= d.cost; save.cinv[k] = 1; S.persist(); return { ok: true }; }
  function place(k) { if (!ownsDecor(k)) return false; save.castle[k] = k; S.persist(); window.SKHooks.emit('castleChanged'); return true; }
  const placedCount = () => DSLOTS.filter(placed).length;
  // one prize (shared by the daily gift and the bead bonus): weights by what is still left to find
  function prize(opts) {
    const dailies = Object.keys(STK).filter(id => STK[id].src.daily && !has(id));
    const cheap = ITEMS.filter(i => !owns(i.id) && i.slot !== 'pet' && i.cost <= 50);
    const decor = DSLOTS.filter(k => !ownsDecor(k));
    const pool = []; if (dailies.length) pool.push(['sticker', 4]); if (decor.length) pool.push(['castle', opts && opts.castle ? 6 : 3]); if (cheap.length) pool.push(['outfit', 2]); pool.push(['gems', 2]); if (!(opts && opts.noSilly)) pool.push(['silly', 1.5]);
    let r = Math.random() * pool.reduce((a, p) => a + p[1], 0), kind = 'gems'; for (const p of pool) { if ((r -= p[1]) < 0) { kind = p[0]; break; } }
    let res;
    if (kind === 'sticker') { const id = dailies[Math.random() * dailies.length | 0]; const g = give(id); res = { kind, id, page: g ? g.page : -1 }; }
    else if (kind === 'castle') { const k = decor[Math.random() * decor.length | 0]; save.cinv[k] = 1; res = { kind, id: k }; }
    else if (kind === 'outfit') { const it = cheap[Math.random() * cheap.length | 0]; save.wd.own[it.id] = 1; res = { kind, id: it.id }; }
    else if (kind === 'gems') { save.gems = Math.min(1e6, save.gems + 25); res = { kind: 'gems', n: 25 }; }
    else { save.wd.silly = today(); res = { kind: 'silly' }; }
    res.more = milestones(); S.persist(); return res;
  }
  function openSurprise() { if (!surpriseReady()) return null; save.day.opened = today(); return prize(); }
  // v6: Sparkle Days moon: one bead for each day she plays (never resets, never nags); every 3 beads opens a bonus gift
  const beads = () => save.day.beads || 0, bonusGot = () => num0(save.day.bg);
  const num0 = v => typeof v === 'number' && isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  const bonusReady = () => Math.floor(beads() / 3) > bonusGot();
  function openBonus() { if (!bonusReady()) return null; save.day.bg = bonusGot() + 1; return prize({ castle: 1, noSilly: 1 }); }
  let beadNew = false;
  function onDayStart() { const t = today(); if (save.day.last !== t || !save.day.beads) { if (save.day.last !== t || !save.day.beads) { save.day.beads = Math.min(999, beads() + 1); beadNew = true; } save.day.last = t; S.persist(); } }
  window.SKHooks.on('onLevelEnd', onLevelEnd);
  window.SKHooks.on('onStomp', () => bump('stomps'));
  window.SKHooks.on('onRescue', () => bump('rescues'));
  window.SKHooks.on('onDayStart', onDayStart);
  window.SKFun = { PAGES, STK, ITEMS, ITEM, SLOTS, PET_NAMES, has, isShiny, count, pageDone, owns, ownedCount, buy, wear, petName, look, milestones, onLevelEnd, surpriseReady, openSurprise, today, total: Object.keys(STK).length, prize, buyDecor, place, ownsDecor, placed, placedCount, beads, bonusReady, openBonus, takeBeadNew() { const b = beadNew; beadNew = false; return b; }, setMg(id, sc) { const o = save.mg[id]; save.mg[id] = Math.max(typeof o === 'number' ? o : 0, Math.min(999, sc | 0)); S.persist(); }, mgFound: () => Object.keys(save.mg).filter(k => k === 'gemcatch' || k === 'bubble' || k === 'peek' || k === 'cake'), petNameNow: () => save.wd.pn || PET_NAMES[0] };
})();
