// Gem Tiles: main app (screens, rewards, game engine, custom songs).
(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const A = window.TAudio, Art = window.Art, AN = window.TileAnalyze;
const KEY = 'gemtiles-v1';
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

// ---------- catalog of rewards ----------
const SHOP = {
  skin: [['pinkgem', 'Pink Heart Gem', 0], ['hearts', 'Ruby Hearts', 60], ['stars', 'Gold Stars', 60], ['diamonds', 'Diamonds', 90], ['bubbles', 'Lilac Pearls', 90], ['crowns', 'Royal Crowns', 140], ['mix', 'Gem Mix', 160], ['candy', 'Mint Candy', 110], ['neon', 'Neon Glow', 180]],
  glitter: [['pink', 'Pink', 0], ['gold', 'Gold', 0], ['silver', 'Silver', 30], ['lilac', 'Lilac', 40], ['aqua', 'Aqua', 40], ['mint', 'Mint', 40], ['rainbow', 'Rainbow', 90]],
  frame: [['none', 'No frame', 0], ['silver', 'Silver frame', 0], ['gold', 'Gold frame', 70], ['rosegold', 'Rose-gold frame', 90], ['pearl', 'Pearl frame', 110]],
  theme: [['pinkgold', 'Pink & Gold', 0], ['moon', 'Moonlight', 0], ['ocean', 'Ocean', 0], ['candy', 'Candy', 0], ['galaxy', 'Galaxy', 60], ['rainbow', 'Rainbow', 60], ['festival', 'Bollywood Festival', 100], ['disco', 'Neon Disco', 120]],
  outfit: [['none', 'Just Gigi', 0], ['bow', 'Pink bow', 0], ['tiara', 'Silver tiara', 50], ['glasses', 'Star glasses', 60], ['headphones', 'Headphones', 70], ['garland', 'Marigold garland', 80], ['bindi', 'Sparkle bindi', 40], ['wizard', 'Wizard hat', 100], ['crown', 'Golden crown', 200]]
};
const STICKERS = [['🦄', 'c'], ['🌈', 'c'], ['🍭', 'c'], ['🧁', 'c'], ['🐱', 'c'], ['🐰', 'c'], ['🦋', 'c'], ['🌸', 'c'], ['🍓', 'c'], ['🎀', 'c'], ['🐬', 'c'], ['🌟', 'c'], ['🍩', 'c'], ['🐼', 'c'], ['🌻', 'c'], ['🎈', 'c'], ['🐞', 'c'], ['🍉', 'c'], ['🐧', 'c'], ['🌙', 'c'],
  ['💎', 'r'], ['👸', 'r'], ['🧚', 'r'], ['🪷', 'r'], ['🪔', 'r'], ['🦚', 'r'], ['🎠', 'r'], ['🏰', 'r'], ['🫧', 'r'], ['🪩', 'r'],
  ['👑', 'g'], ['💖', 'g'], ['🏆', 'g'], ['🌠', 'g'], ['🐉', 'g'], ['🪄', 'g']];
const BADGES = [['first', '🎵', 'First song'], ['star3', '🌟', 'First 3 stars'], ['fc', '💯', 'First full combo'], ['crown', '👑', 'First crown'], ['p10', '🔟', '10 songs played'], ['p50', '🎶', '50 songs played'],
  ['combo50', '🔥', '50 combo'], ['combo100', '🚀', '100 combo'], ['hard', '💪', 'Clear a Hard song'], ['custom', '📀', 'Add your own song'], ['streak3', '📅', '3-day gift streak'], ['streak7', '🗓️', '7-day gift streak'],
  ['stick10', '📒', '10 stickers'], ['golden', '✨', 'Golden sticker'], ['shop', '🛍️', 'First shop buy'], ['allstars', '🌌', '50 stars']];

// ---------- state ----------
const def = () => ({ v: 1, coins: 30, best: {}, plays: 0, owned: { skin: ['pinkgem'], glitter: ['pink', 'gold'], frame: ['none', 'silver'], theme: ['pinkgold', 'moon', 'ocean', 'candy'], outfit: ['none', 'bow'] },
  eq: { skin: 'pinkgem', glitter: 'pink', frame: 'silver', outfit: 'bow' }, songTheme: {}, stickers: {}, packs: 1, daily: { last: '', streak: 0 }, badges: {}, maxCombo: 0,
  set: { sound: true, beat: true, offset: 0, lang: 'en', practice: false, diff: 'easy' } });
let S; try { S = Object.assign(def(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = def(); }
for (const k in def().owned) if (!S.owned[k]) S.owned[k] = def().owned[k];
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
A.muted = !S.set.sound;

// ---------- i18n (English / Hindi labels) ----------
const HI = { title: 'जेम टाइल्स', tag: 'संगीत के साथ चमकीली टाइलें टैप करो!', play: '▶ खेलो', gift: '🎁 रोज़ का तोहफ़ा', addSong: '🎵 मेरा गाना जोड़ो', shop: '🛍️ दुकान', album: '📒 स्टिकर', badges: '🏅 बैज', closet: '🎀 गीगी की अलमारी',
  easy: 'आसान', normal: 'सामान्य', hard: 'कठिन', practice: '💗 अभ्यास', settings: 'सेटिंग्स', sound: 'आवाज़', beat: 'ताल (बने गाने)', sync: 'सिंक', calib: '👆 टैप टेस्ट', start: 'शुरू', choose: 'गाना चुनो', mySong: 'मेरा गाना', name: 'नाम', pic: 'तस्वीर', color: 'रंग', theme: 'थीम',
  songSync: 'गाना सिंक', save: '💾 सेव', regen: '🔀 नई टाइलें', del: '🗑️ हटाओ', paused: 'रुका हुआ', resume: '▶ खेलते रहो', restart: '↺ फिर से', quit: '🏠 गाने', outHearts: 'दिल ख़त्म!', outMsg: 'तुम बहुत अच्छा कर रही हो। जारी रखें?', cont: '💗 जारी रखो (अभ्यास)', finish: '🏁 खत्म',
  addHow: 'इस फ़ोन से गाने की फ़ाइल चुनो। गाना फ़ोन से बाहर नहीं जाता।', calibHow: 'हर क्लिक पर बड़े हीरे को टैप करो। 12 क्लिक!', syncNote: 'अगर टाइलें जल्दी या देर से लगें तो टैप टेस्ट करो।' };
const EN = {}; $$('[data-t]').forEach(e => { e.dataset.en = e.textContent; if (!(e.dataset.t in EN)) EN[e.dataset.t] = e.textContent; });
const tr = k => (S.set.lang === 'hi' && HI[k]) || EN[k] || k;
const applyLang = () => { document.documentElement.lang = S.set.lang; $$('[data-t]').forEach(e => e.textContent = (S.set.lang === 'hi' && HI[e.dataset.t]) || e.dataset.en); };

// ---------- helpers ----------
const toast = (html, ms = 1800) => { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = html; document.body.appendChild(d); setTimeout(() => d.remove(), ms); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const totalStars = () => { let n = 0; for (const id in S.best) for (const d in S.best[id]) n += S.best[id][d].stars || 0; return n; };
const crownsOf = id => { const b = S.best[id] || {}; return (b.normal && b.normal.stars === 3 ? 1 : 0) + (b.hard && b.hard.stars === 3 ? 1 : 0) + (b.hard && b.hard.fc ? 1 : 0); };
const award = id => { if (S.badges[id]) return; S.badges[id] = Date.now(); const b = BADGES.find(x => x[0] === id); if (b) setTimeout(() => { toast(`<div style="font-size:40px">${b[1]}</div>New badge: ${b[2]}!`, 2400); A.sfx('unlock'); }, 600); save(); };
let customs = []; // loaded from IndexedDB

// ---------- IndexedDB for custom songs ----------
const DB = { db: null,
  open() { return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => { const r = indexedDB.open('gemtiles', 1); r.onupgradeneeded = () => r.result.createObjectStore('songs', { keyPath: 'id' }); r.onsuccess = () => res(this.db = r.result); r.onerror = () => rej(r.error); }); },
  async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('songs', mode), st = t.objectStore('songs'), r = fn(st); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); },
  all() { return this.tx('readonly', s => s.getAll()); }, put(o) { return this.tx('readwrite', s => s.put(o)); }, del(id) { return this.tx('readwrite', s => s.delete(id)); }, get(id) { return this.tx('readonly', s => s.get(id)); }
};
const loadCustoms = async () => { try { customs = (await DB.all()).map(o => { const { blob, ...m } = o; return m; }).sort((a, b) => a.created - b.created); } catch (e) { customs = []; } };

// ---------- background canvas (menus) ----------
const bg = $('#bg'), bgc = bg.getContext('2d'); let menuTheme = 'pinkgold', DPR = Math.min(2, window.devicePixelRatio || 1);
const fit = cv => { const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight; if (cv.width !== Math.round(w * DPR) || cv.height !== Math.round(h * DPR)) { cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR); } return [w, h]; };
const mh = $('#mascotHome'), mhc = mh.getContext('2d'); let mascotMood = 'idle', moodUntil = 0;
function menuLoop(ts) {
  if (!G.on) { const t = ts / 1000, [w, h] = fit(bg); bgc.setTransform(DPR, 0, 0, DPR, 0, 0); Art.bg(bgc, menuTheme, w, h, t, t * 1.6, 0.4);
    if ($('#home').classList.contains('on')) { const [mw, mhh] = fit(mh); mhc.setTransform(DPR, 0, 0, DPR, 0, 0); mhc.clearRect(0, 0, mw, mhh); Art.mascot(mhc, mw / 2, mhh * 0.58, Math.min(mw, mhh) * 0.75, ts < moodUntil ? mascotMood : 'idle', S.eq.outfit, t); } }
  requestAnimationFrame(menuLoop);
}

// ---------- screens ----------
let cur = 'home';
function go(id) { if (id === 'closet') { shopTab = 'outfit'; id = 'shop'; } $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); cur = id; menuTheme = 'pinkgold';
  ({ home: renderHome, songs: renderSongs, shop: renderShop, album: renderAlbum, badges: renderBadges, settings: renderSettings, add: resetAdd }[id] || (() => { }))(); }
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { A.init(); A.sfx('tap'); go(b.dataset.go); } });
function renderHome() { $('#hStars').textContent = '⭐ ' + totalStars(); $('#hCoins').textContent = '🪙 ' + S.coins; $('#giftBtn').textContent = (S.daily.last === today() ? '✅ ' : '🎁 ') + tr('gift').replace('🎁 ', '') + (S.daily.streak ? ` · ${S.daily.streak}🔥` : ''); }

// ---------- songs list ----------
const allSongs = () => window.TILE_SONGS.map(s => ({ ...s, builtin: true })).concat(customs.map(c => ({ ...c, custom: true })));
function renderSongs() {
  const ts = totalStars(); $('#sStars').textContent = '⭐ ' + ts;
  $$('#diffSeg button').forEach(b => b.classList.toggle('on', b.dataset.d === S.set.diff)); $('#practiceBtn').classList.toggle('on', S.set.practice);
  const L = $('#songList'); L.innerHTML = '';
  allSongs().forEach(s => {
    const locked = s.builtin && ts < s.cost, b = (S.best[s.id] || {})[S.set.diff] || {}, cr = crownsOf(s.id), d = document.createElement('div');
    d.className = 'card song' + (locked ? ' locked' : ''); d.dataset.id = s.id;
    const col = s.color || ({ moon: '#b9a6ff', pinkgold: '#ffb3d9', ocean: '#8fe3ff', galaxy: '#c08cff', candy: '#ffd6ec', disco: '#ff7ce0', festival: '#ffc04d', rainbow: '#bfe9ff' })[s.theme] || '#ffb3d9';
    d.innerHTML = `<div class="em" style="background:${esc(col)}">${esc(s.emoji || '🎵')}</div><div style="min-width:0"><div class="ti" dir="auto">${esc(s.title)}</div>
      <div class="sub">${s.custom ? '📀 My song · ' + Math.round(s.bpm) + ' BPM' : esc(s.by)}${locked ? ` · 🔒 ${s.cost}⭐` : ''}</div>
      <div class="stars">${'⭐'.repeat(b.stars || 0)}${'☆'.repeat(3 - (b.stars || 0))} ${'👑'.repeat(cr)}</div></div>` + (s.custom ? `<button class="btn icon silver edit" data-edit="${s.id}" aria-label="Edit">✏️</button>` : locked ? '' : `<button class="btn icon silver edit" data-theme="${s.id}" aria-label="Theme">🎨</button>`);
    L.appendChild(d);
  });
}
$('#diffSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.diff = b.dataset.d; save(); renderSongs(); });
$('#practiceBtn').addEventListener('click', () => { S.set.practice = !S.set.practice; save(); renderSongs(); toast(S.set.practice ? '💗 Practice: no hearts lost!' : 'Practice off'); });
$('#songList').addEventListener('click', e => {
  const ed = e.target.closest('[data-edit]'); if (ed) { e.stopPropagation(); openEdit(ed.dataset.edit); return; }
  const th = e.target.closest('[data-theme]'); if (th) { e.stopPropagation(); const id = th.dataset.theme, song = window.TILE_SONGS.find(x => x.id === id), curT = S.songTheme[id] || song.theme;
    msg(`<h2>Theme for this song</h2><div class="row">${Object.keys(Art.THEMES).map(k => `<button class="btn small ${k === curT ? 'gold' : 'silver'}" data-pick="${k}" data-song="${id}">${Art.THEMES[k].name}${S.owned.theme.includes(k) || k === song.theme ? '' : ' 🔒'}</button>`).join('')}</div><button class="btn" onclick="this.closest('.modal').classList.remove('on')">Done</button>`); return; }
  const c = e.target.closest('.song'); if (!c) return; A.init(); const s = allSongs().find(x => x.id === c.dataset.id);
  if (s.builtin && totalStars() < s.cost) { toast(`🔒 Earn ${s.cost - totalStars()} more ⭐ to unlock!`); return; }
  startGame(s, S.set.diff);
});

// ---------- daily gift ----------
$('#giftBtn').addEventListener('click', () => {
  A.init(); if (S.daily.last === today()) { toast('🎁 Come back tomorrow for another gift!'); return; }
  const y = new Date(); y.setDate(y.getDate() - 1); const yk = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
  S.daily.streak = S.daily.last === yk ? S.daily.streak + 1 : 1; S.daily.last = today();
  const coins = 20 + Math.min(6, S.daily.streak - 1) * 5, pack = S.daily.streak % 3 === 0 ? 1 : 0; S.coins += coins; S.packs += pack; save();
  if (S.daily.streak >= 3) award('streak3'); if (S.daily.streak >= 7) award('streak7');
  A.sfx('gift'); mascotMood = 'wow'; moodUntil = performance.now() + 2500;
  msg(`<div style="font-size:64px">🎁</div><h2>Daily gift!</h2><p style="font-size:22px;font-weight:800">+${coins} 🪙 ${pack ? '+ 1 mystery sticker pack 🎴' : ''}</p><p>Day ${S.daily.streak} in a row 🔥 — come back tomorrow for more!</p><button class="btn" onclick="this.closest('.modal').classList.remove('on')">Yay!</button>`);
  renderHome();
});
const msg = html => { $('#msgCard').innerHTML = html; $('#mMsg').classList.add('on'); };

// ---------- shop / closet ----------
let shopTab = 'skin';
const TABN = { skin: '💎 Tiles', glitter: '✨ Glitter', frame: '🖼️ Frames', theme: '🌌 Themes', outfit: '🎀 Gigi' };
function renderShop() {
  $('#shCoins').textContent = '🪙 ' + S.coins;
  $('#shopTabs').innerHTML = Object.keys(TABN).map(k => `<button class="btn small ${k === shopTab ? 'gold' : 'silver'}" data-tab="${k}">${TABN[k]}</button>`).join('');
  const g = $('#shopGrid'); g.innerHTML = '';
  SHOP[shopTab].forEach(([id, name, price]) => {
    const own = S.owned[shopTab].includes(id), eq = shopTab === 'theme' ? false : S.eq[shopTab] === id, d = document.createElement('div');
    d.className = 'card item' + (eq ? ' eq' : ''); d.dataset.id = id;
    d.innerHTML = `<canvas></canvas><div class="nm">${esc(name)}</div><div class="pr">${eq ? '✅ Wearing' : own ? (shopTab === 'theme' ? '✅ Yours' : 'Tap to use') : '🪙 ' + price}</div>`;
    g.appendChild(d); const cv = d.querySelector('canvas'); requestAnimationFrame(() => drawPreview(cv, shopTab, id));
  });
}
function drawPreview(cv, kind, id) {
  const [w, h] = fit(cv), c = cv.getContext('2d'); if (w < 20 || h < 40) return; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, w, h); const t = performance.now() / 1000;
  if (kind === 'theme') { Art.bg(c, id, w, h, t, t, 0.5); return; }
  if (kind === 'outfit') { Art.mascot(c, w / 2, h * 0.6, h * 0.8, 'happy', id, t); return; }
  const eq = { ...S.eq, [kind]: id }, tw = Math.min(w * 0.4, 70);
  [0, 1].forEach(i => Art.tile(c, { x: w / 2 - tw - 4 + i * (tw + 8), y: 8 + i * 10, w: tw, h: h - 26, skin: eq.skin, glitter: eq.glitter, frame: eq.frame, shape: Art.SHAPE_OF[eq.skin] || Art.MIX[i * 2], t, seed: i + 3 }));
}
$('#shopTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { shopTab = b.dataset.tab; renderShop(); } });
$('#shopGrid').addEventListener('click', e => {
  const it = e.target.closest('.item'); if (!it) return; A.init(); const id = it.dataset.id, [, name, price] = SHOP[shopTab].find(x => x[0] === id);
  if (!S.owned[shopTab].includes(id)) {
    if (S.coins < price) { toast(`Need ${price - S.coins} more 🪙 — play songs to earn coins!`); A.sfx('miss'); return; }
    S.coins -= price; S.owned[shopTab].push(id); award('shop'); A.sfx('unlock'); toast(`✨ ${esc(name)} is yours!`);
  }
  if (shopTab === 'theme') { menuTheme = id; toast('Pick it for any song from the ✏️ song settings or it shows up automatically!'); }
  else { S.eq[shopTab] = id; if (shopTab === 'outfit') { mascotMood = 'happy'; moodUntil = performance.now() + 1500; } }
  save(); renderShop();
});

// ---------- stickers ----------
function renderAlbum() {
  const have = STICKERS.filter(s => S.stickers[s[0]]).length; $('#alCount').textContent = `${have}/${STICKERS.length}`; $('#packN').textContent = S.packs;
  $('#albumGrid').innerHTML = STICKERS.map(([e, r]) => { const n = S.stickers[e] || 0; return `<div class="sticker ${n ? (r === 'g' ? 'golden' : r === 'r' ? 'rare' : '') : 'none'}">${n ? e : '❔'}${n > 1 ? `<small>×${n}</small>` : ''}</div>`; }).join('');
}
function openPack() {
  if (S.packs < 1) { toast('Earn packs with new ⭐ and 👑, or buy one with 🪙'); return; }
  S.packs--; const got = [];
  for (let i = 0; i < 3; i++) { const r = Math.random(), tier = r < 0.04 ? 'g' : r < 0.26 ? 'r' : 'c', pool = STICKERS.filter(s => s[1] === tier), s = pool[Math.floor(Math.random() * pool.length)]; got.push(s); S.stickers[s[0]] = (S.stickers[s[0]] || 0) + 1; }
  if (got.some(s => s[1] === 'g')) award('golden'); if (STICKERS.filter(s => S.stickers[s[0]]).length >= 10) award('stick10'); save(); A.sfx('gift');
  msg(`<h2>Mystery pack!</h2><div class="row">${got.map(([e, r]) => `<div class="sticker ${r === 'g' ? 'golden' : r === 'r' ? 'rare' : ''}" style="width:90px;font-size:52px">${e}</div>`).join('')}</div>
    <p style="font-weight:800">${got.some(s => s[1] === 'g') ? '✨ GOLDEN sticker! ✨' : got.some(s => s[1] === 'r') ? '💜 A rare one!' : 'So cute!'}</p><button class="btn" onclick="this.closest('.modal').classList.remove('on')">Add to album</button>`);
  renderAlbum();
}
$('#openPack').addEventListener('click', () => { A.init(); openPack(); });
$('#buyPack').addEventListener('click', () => { A.init(); if (S.coins < 40) { toast('Need 40 🪙'); return; } S.coins -= 40; S.packs++; save(); renderAlbum(); A.sfx('coin'); });
function renderBadges() { $('#badgeGrid').innerHTML = BADGES.map(([id, e, n]) => `<div class="card badge ${S.badges[id] ? '' : 'off'}"><div class="b">${e}</div><div class="nm" style="font-weight:800">${esc(n)}</div></div>`).join(''); }

// ---------- settings + calibration ----------
function renderSettings() {
  const segOn = (sel, v) => $$(sel + ' button').forEach(b => b.classList.toggle('on', b.dataset.v === String(v)));
  segOn('#soundSeg', S.set.sound ? 1 : 0); segOn('#beatSeg', S.set.beat ? 1 : 0); segOn('#langSeg', S.set.lang); $('#offRange').value = S.set.offset; $('#offVal').textContent = S.set.offset;
}
$('#soundSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.sound = b.dataset.v === '1'; A.setMuted(!S.set.sound); save(); renderSettings(); });
$('#beatSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.beat = b.dataset.v === '1'; save(); renderSettings(); });
$('#langSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.lang = b.dataset.v; save(); applyLang(); renderSettings(); });
$('#offRange').addEventListener('input', e => { S.set.offset = +e.target.value; $('#offVal').textContent = S.set.offset; save(); });
$('#calibBtn').addEventListener('click', () => { go('calib'); $('#calOut').textContent = ''; $('#calBar').style.width = '0'; });
const CAL = { on: false, clicks: [], taps: [] };
$('#calStart').addEventListener('click', () => {
  const ctx = A.init(); CAL.on = true; CAL.taps = []; CAL.clicks = []; const t0 = ctx.currentTime + 0.8;
  for (let i = 0; i < 12; i++) { CAL.clicks.push(t0 + i * 0.6); A.click(t0 + i * 0.6, i % 4 === 0); }
  $('#calOut').textContent = 'Listen… tap on every click!'; setTimeout(finishCal, (0.8 + 12 * 0.6 + 0.6) * 1000);
});
$('#tapPad').addEventListener('pointerdown', e => { e.preventDefault(); if (!CAL.on) return; const ctx = A.ctx(); CAL.taps.push(ctx.currentTime); $('#calBar').style.width = Math.min(100, CAL.taps.length / 12 * 100) + '%'; });
function finishCal() {
  CAL.on = false; const ctx = A.ctx(), lat = (ctx.outputLatency || ctx.baseLatency || 0);
  const d = CAL.taps.map(t => { let best = 9; for (const c of CAL.clicks) if (Math.abs(t - c) < Math.abs(best)) best = t - c; return best; }).filter(v => Math.abs(v) < 0.3).sort((a, b) => a - b);
  if (d.length < 6) { $('#calOut').textContent = 'Not enough taps — try again!'; return; }
  const med = d[Math.floor(d.length / 2)]; S.set.offset = Math.round((med - lat) * 1000 / 5) * 5; save();
  $('#calOut').textContent = `All synced! Your timing offset is ${S.set.offset} ms. ✨`; A.sfx('star');
}
CAL.finish = finishCal;

// ---------- add my song ----------
function resetAdd() { $('#addBusy').classList.add('hidden'); $('#addErr').textContent = ''; $('#fileIn').value = ''; }
$('#fileIn').addEventListener('change', async e => { const f = e.target.files && e.target.files[0]; if (f) await addSongFile(f); });
async function addSongFile(file) {
  const err = m => { $('#addErr').textContent = m; $('#addBusy').classList.add('hidden'); };
  if (file.size > 60 * 1024 * 1024) return err('That file is too big (over 60 MB). Try a shorter song.');
  $('#addBusy').classList.remove('hidden'); $('#addErr').textContent = ''; const bar = $('#addBar'), m = $('#addMsg');
  const step = (p, t) => { bar.style.width = (p * 100) + '%'; m.textContent = t; return new Promise(r => setTimeout(r, 30)); };
  try {
    await step(0.1, '🎧 Opening your song…'); const buf = await file.arrayBuffer();
    await step(0.25, '🎶 Listening to the music…'); const { mono, duration } = await AN.decodeToMono(buf);
    if (duration < 8) return err('That song is too short. Pick one longer than 8 seconds.'); if (duration > 600) return err('That song is over 10 minutes. Pick a shorter one.');
    await step(0.5, '🥁 Finding the beat…'); const an = AN.analyzeMono(mono);
    await step(0.85, '💎 Making sparkly tiles…');
    const energy = Math.min(1, an.onsets.length / duration / 4), theme = Art.suggestTheme(an.bpm, energy);
    const title = file.name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 60) || 'My song';
    const rec = { id: 'c' + Date.now().toString(36), title, emoji: '🎵', color: '#ffb3d9', theme, suggested: theme, energy, bpm: an.bpm, duration, an, seed: 1, offset: 0, created: Date.now(), type: file.type || 'audio/mpeg', blob: new Blob([buf], { type: file.type || 'audio/mpeg' }) };
    rec.charts = { easy: AN.makeChart(an, 'easy', 1), normal: AN.makeChart(an, 'normal', 1), hard: AN.makeChart(an, 'hard', 1) };
    await DB.put(rec); decoded.set(rec.id, null); await loadCustoms(); award('custom'); await step(1, 'Done!');
    A.sfx('unlock'); openEdit(rec.id, true);
  } catch (ex) { console.warn(ex); err("Hmm, that file couldn't be played on this phone. Try an mp3 or m4a file."); }
}
window.__addSongFile = addSongFile;

// ---------- edit custom song ----------
const EMO = ['🎵', '💖', '💎', '👑', '🦄', '🌈', '⭐', '🌙', '🪩', '🪔', '🌸', '🎀', '🐱', '🦋', '🔥', '🎤', '💃', '🍭'];
const COLS = ['#ffb3d9', '#ff7cb8', '#ffd76a', '#c9d1de', '#b98cff', '#8fe3ff', '#9ff0c8', '#ffb38a'];
let editing = null;
async function openEdit(id, fresh) {
  const r = customs.find(c => c.id === id); if (!r) return; editing = { ...r }; go('edit');
  $('#edTitle').value = r.title; $('#edOff').value = r.offset || 0; $('#edOffVal').textContent = r.offset || 0;
  $('#edSuggest').textContent = `(suggested: ${Art.THEMES[r.suggested].name} for ${Math.round(r.bpm)} BPM)`;
  $('#edInfo').textContent = `${Math.round(r.bpm)} BPM · ${Math.floor(r.duration / 60)}:${String(Math.round(r.duration % 60)).padStart(2, '0')} · tiles: ${r.charts.easy.length} easy / ${r.charts.normal.length} normal / ${r.charts.hard.length} hard` + (fresh ? ' · Give it a name and a picture!' : '');
  renderEditPickers();
}
function renderEditPickers() {
  $('#edEmoji').innerHTML = EMO.map(e => `<button class="${e === editing.emoji ? 'on' : ''}" data-e="${e}">${e}</button>`).join('');
  $('#edColor').innerHTML = COLS.map(c => `<div class="swatch ${c === editing.color ? 'on' : ''}" data-c="${c}" style="background:${c}"></div>`).join('');
  $('#edTheme').innerHTML = Object.keys(Art.THEMES).map(k => `<button class="btn small ${k === editing.theme ? 'gold' : 'silver'}" data-th="${k}" style="width:auto">${Art.THEMES[k].name}${S.owned.theme.includes(k) ? '' : ' 🔒'}</button>`).join('');
}
$('#edEmoji').addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (b) { editing.emoji = b.dataset.e; renderEditPickers(); } });
$('#edColor').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { editing.color = b.dataset.c; renderEditPickers(); } });
$('#edTheme').addEventListener('click', e => { const b = e.target.closest('[data-th]'); if (!b) return; if (!S.owned.theme.includes(b.dataset.th) && b.dataset.th !== editing.suggested) { toast('🔒 Unlock this theme in the Shop'); return; } editing.theme = b.dataset.th; renderEditPickers(); });
$('#edOff').addEventListener('input', e => { editing.offset = +e.target.value; $('#edOffVal').textContent = editing.offset; });
$('#edSave').addEventListener('click', async () => { const full = await DB.get(editing.id); Object.assign(full, { title: $('#edTitle').value.trim() || 'My song', emoji: editing.emoji, color: editing.color, theme: editing.theme, offset: editing.offset }); await DB.put(full); await loadCustoms(); A.sfx('coin'); toast('💾 Saved!'); go('songs'); });
$('#edRegen').addEventListener('click', async () => { const full = await DB.get(editing.id); full.seed = (full.seed || 1) + 1; full.charts = { easy: AN.makeChart(full.an, 'easy', full.seed), normal: AN.makeChart(full.an, 'normal', full.seed), hard: AN.makeChart(full.an, 'hard', full.seed) }; await DB.put(full); await loadCustoms(); toast('🔀 Fresh tiles made!'); openEdit(full.id); });
$('#edDel').addEventListener('click', () => msg(`<h2>Delete this song?</h2><p dir="auto">${esc(editing.title)}</p><div class="row"><button class="btn" id="delYes">🗑️ Delete</button><button class="btn silver" onclick="this.closest('.modal').classList.remove('on')">Keep it</button></div>`));
document.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b) return; const id = b.dataset.song, k = b.dataset.pick, song = window.TILE_SONGS.find(x => x.id === id);
  if (!S.owned.theme.includes(k) && k !== song.theme) { toast('🔒 Unlock this theme in the Shop'); return; } if (k === song.theme) delete S.songTheme[id]; else S.songTheme[id] = k; save(); A.sfx('coin'); $$('[data-pick]').forEach(x => x.className = 'btn small ' + (x === b ? 'gold' : 'silver')); });
document.addEventListener('click', async e => { if (e.target.id === 'delYes') { await DB.del(editing.id); delete S.best[editing.id]; save(); await loadCustoms(); $('#mMsg').classList.remove('on'); toast('Deleted'); go('songs'); } });

// =================== GAME ENGINE ===================
const cv = $('#cv'), c = cv.getContext('2d');
const G = { on: false };
const decoded = new Map();
const DIFF = { easy: { lead: 2.1, hearts: 5, mul: 0.8, ramp: 0.1, win: 0.2 }, normal: { lead: 1.6, hearts: 3, mul: 1, ramp: 0.2, win: 0.16 }, hard: { lead: 1.25, hearts: 3, mul: 1.15, ramp: 0.3, win: 0.13 } };
function parseMelody(m) { let b = 0; const out = []; for (const tok of m.trim().split(/\s+/)) { const [n, d] = tok.split(':'), dur = d ? parseFloat(d) : 1; if (n !== 'R') out.push({ b, midi: A.midi(n), dur }); b += dur; } return { notes: out, beats: b }; }
function buildBuiltin(song, diff) {
  const D = DIFF[diff], { notes, beats } = parseMelody(song.m), bpm0 = song.bpm * D.mul, k = D.ramp / beats, lead = 2.2;
  const tOf = b => lead + (k ? 60 / (bpm0 * k) * Math.log(1 + k * b) : 60 * b / bpm0);
  // easy: group very short notes so each tile plays 1-2 melody notes
  let groups = []; if (diff === 'easy') { for (let i = 0; i < notes.length; i++) { const n = notes[i]; if (n.dur < 0.5 && notes[i + 1] && notes[i + 1].dur <= 0.5) { groups.push([n, notes[i + 1]]); i++; } else groups.push([n]); } } else groups = notes.map(n => [n]);
  const tiles = []; let lane = 1, prev = null, flip = 1;
  groups.forEach((g, i) => {
    const n = g[0], last = g[g.length - 1], bEnd = last.b + last.dur, t = tOf(n.b), durS = tOf(bEnd) - t;
    if (prev) { const dp = n.midi - prev.midi; if (dp > 0) lane += dp > 4 ? 2 : 1; else if (dp < 0) lane -= dp < -4 ? 2 : 1; else { lane += flip; flip = -flip; } if (lane > 3) lane = 3 - (lane - 3) - 0; if (lane < 0) lane = -lane; lane = Math.max(0, Math.min(3, lane)); if (prev && lane === prev.lane && t - prev.t < 0.45) lane = (lane + 2) % 4; }
    const holdB = diff === 'easy' ? 2 : 1.5, isHold = g.length === 1 && n.dur >= holdB;
    const tile = { t, lane, dur: isHold ? durS * 0.8 : 0, play: g.map(x => [x.midi, tOf(x.b) - t, tOf(x.b + x.dur) - tOf(x.b)]), shapeI: i };
    tiles.push(tile);
    if (diff !== 'easy' && !isHold && n.dur >= 1 && (diff === 'hard' ? n.b % 2 === 0 : n.b % 4 === 0) && i > 0) tiles.push({ t, lane: (lane + 2) % 4, dur: 0, play: [[n.midi - (n.midi % 12 >= 4 ? 4 : 3), 0, tile.play[0][2]]], shapeI: i + 1, pair: true });
    prev = { midi: last.midi, lane, t };
  });
  const beatTimes = []; for (let b = 0; b <= Math.ceil(beats); b += 0.5) beatTimes.push([tOf(b), b]);
  return { tiles, end: tOf(beats) + 1.2, beatTimes, bpm: bpm0, tOf };
}
async function startGame(song, diff) {
  const ctx = A.init(); await ctx.resume();
  let built, audioBuf = null, theme = song.theme || 'pinkgold';
  if (song.custom) {
    const full = await DB.get(song.id); if (!full) { toast('Song not found'); return; }
    if (!decoded.get(song.id)) { toast('🎧 Getting your song ready…', 1200); const ab = await full.blob.arrayBuffer(); decoded.set(song.id, await ctx.decodeAudioData(ab)); }
    audioBuf = decoded.get(song.id); const lead = 2.2;
    built = { tiles: full.charts[diff].map((n, i) => ({ t: n.t + lead, lane: n.lane, dur: n.dur || 0, play: null, shapeI: i, lane2: n.lane2 })), end: lead + full.duration + 0.5, bpm: full.bpm, lead };
    built.tiles.slice().forEach(t => { if (t.lane2 != null) built.tiles.push({ ...t, lane: t.lane2, pair: true, shapeI: t.shapeI + 1 }); });
    built.tiles.sort((a, b) => a.t - b.t); built.beatTimes = full.an.beats.map((b, i) => [b.t + lead, i]); theme = full.theme || theme; built.songOffset = (full.offset || 0) / 1000; built.energy = full.energy;
  } else built = buildBuiltin(song, diff);
  if (S.songTheme[song.id]) theme = S.songTheme[song.id];
  built.tiles.forEach((t, i) => { t.id = i; t.state = 0; /*0 waiting 1 hit 2 missed 3 holding*/ t.holdP = 0; });
  Object.assign(G, { on: true, song, diff, D: DIFF[diff], b: built, theme, audioBuf, score: 0, combo: 0, maxCombo: 0, hearts: S.set.practice ? Infinity : DIFF[diff].hearts, practice: S.set.practice, usedPractice: S.set.practice,
    j: { perfect: 0, great: 0, good: 0, miss: 0 }, fx: [], pops: [], holds: new Map(), nextBeat: 0, mood: 'idle', moodT: 0, paused: false, finished: false, flash: 0, laneFlash: [0, 0, 0, 0], ended: false, nextSched: 0 });
  G.lat = (ctx.outputLatency || ctx.baseLatency || 0) + S.set.offset / 1000 + (built.songOffset || 0);
  $('#game').classList.add('on'); $$('.screen').forEach(s => s.classList.remove('on'));
  G.t0 = ctx.currentTime + 0.15; G.src = null;
  if (audioBuf) { const s = ctx.createBufferSource(); s.buffer = audioBuf; s.connect(A.musicBus()); s.start(G.t0 + built.lead); G.src = s; }
  updHud(); requestAnimationFrame(frame);
}
const songTime = () => A.ctx().currentTime - G.t0 - G.lat;
function scheduleBeat(now) { // backing beat for built-in songs (on the audio clock, a little ahead)
  if (G.audioBuf || !S.set.beat) return; const bt = G.b.beatTimes, ctx = A.ctx();
  while (G.nextSched < bt.length && bt[G.nextSched][0] < now + 0.25) { const [t, b] = bt[G.nextSched], at = G.t0 + t; if (at > ctx.currentTime) { if (b % 1 === 0) { if (b % 2 === 0) A.kick(at, 0.45); else A.clap(at, 0.12); } else A.hat(at, 0.06); } G.nextSched++; }
}
function updHud() { $('#hHearts').textContent = G.hearts === Infinity ? '💗 ∞' : '💗'.repeat(Math.max(0, G.hearts)) + '🤍'.repeat(Math.max(0, G.D.hearts - G.hearts)); $('#hScore').textContent = G.score.toLocaleString(); }
let L = { x: 0, w: 0, lw: 0, W: 0, H: 0, hitY: 0 };
function layout() { const [W, H] = fit(cv); const bw = Math.min(W, Math.max(320, H * 0.72), 620); L = { W, H, w: bw, x: (W - bw) / 2, lw: bw / 4, hitY: H * 0.82 }; }
function judge(dt) { const a = Math.abs(dt); return a < 0.06 ? 'perfect' : a < 0.12 ? 'great' : 'good'; }
const PTS = { perfect: 100, great: 70, good: 40 };
function hitTile(t, now, pid) {
  const dt = now - t.t, j = judge(dt); G.j[j]++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
  G.score += Math.round(PTS[j] * (1 + Math.min(G.combo, 60) / 30)); t.judge = j;
  const ctx = A.ctx();
  if (t.play) t.play.forEach(([m, off, d]) => A.piano(m, ctx.currentTime + Math.max(0, off), d, j === 'good' ? 0.6 : 0.85)); else A.sfx('tap');
  const x = L.x + (t.lane + 0.5) * L.lw, y = L.hitY - 20; burst(x, y, j); G.pops.push({ x, y: y - 40, txt: j === 'perfect' ? 'Perfect! 💖' : j === 'great' ? 'Great!' : 'Good', a: 1 }); G.laneFlash[t.lane] = 1;
  if (t.dur > 0) { t.state = 3; G.holds.set(pid, t); } else t.state = 1;
  if ([10, 25, 50, 75, 100, 150, 200].includes(G.combo)) { G.mood = 'wow'; G.moodT = performance.now() + 1500; G.pops.push({ x: L.W / 2, y: L.H * 0.35, txt: `${G.combo} combo! ✨`, a: 1.4, big: 1 }); A.sfx('star'); }
  else if (G.combo % 5 === 0) { G.mood = 'happy'; G.moodT = performance.now() + 700; }
  updHud();
}
function missTile(t) {
  t.state = 2; G.j.miss++; G.combo = 0; G.mood = 'oops'; G.moodT = performance.now() + 900; A.sfx('miss'); G.flash = 1;
  if (t.play && G.practice) t.play.forEach(([m, off, d]) => A.piano(m, A.ctx().currentTime + off, d, 0.35)); // practice: still hear the tune
  if (G.hearts !== Infinity && !t.pair) { G.hearts--; updHud(); if (G.hearts <= 0) outOfHearts(); }
}
function burst(x, y, j) {
  const GL = Art.GLITTER[S.eq.glitter], shape = Art.SHAPE_OF[S.eq.skin] || 'heart', n = j === 'perfect' ? 22 : 14;
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 320;
    G.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, life: 0.7 + Math.random() * 0.5, age: 0, s: 4 + Math.random() * 9, col: GL[i % GL.length], kind: i % 4 === 0 ? 'shape' : 'spark', shape: i % 8 === 0 ? Art.MIX[i % 6] : shape, rot: Math.random() * 6 }); }
  G.fx.push({ x, y, ring: 1, age: 0, life: 0.4, col: GL[0] });
}
// input: multi-touch via pointer events
cv.addEventListener('pointerdown', e => {
  if (!G.on || G.paused) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { }
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, lane = Math.floor((x - L.x) / L.lw); if (lane < 0 || lane > 3) return;
  const now = songTime(), pps = (L.hitY) / G.D.lead; let best = null, bd = 1e9;
  for (const t of G.b.tiles) { if (t.state || t.lane !== lane) continue; const dt = now - t.t; if (dt > G.D.win + 0.05) continue; if (dt < -0.9) break;
    const yb = L.hitY - (t.t - now) * pps, h = tileH(t, pps), inside = y >= yb - h - 30 && y <= yb + 40;
    if ((Math.abs(dt) <= G.D.win || (inside && dt > -0.45)) && Math.abs(dt) < bd) { bd = Math.abs(dt); best = t; } }
  if (best) hitTile(best, now, e.pointerId); else { G.laneFlash[lane] = 0.5; if (G.diff === 'hard') G.combo = 0; }
}, { passive: false });
const endHold = e => { const t = G.holds.get(e.pointerId); if (!t) return; G.holds.delete(e.pointerId); t.state = 1; const done = t.holdP >= 0.9; if (done) { G.score += 50; burst(L.x + (t.lane + 0.5) * L.lw, L.hitY - 20, 'perfect'); } };
cv.addEventListener('pointerup', endHold); cv.addEventListener('pointercancel', endHold);
const tileH = (t, pps) => t.dur > 0 ? Math.max(t.dur * pps, L.lw * 1.1) : Math.min(L.lw * 1.25, L.H * 0.2);

function frame(ts) {
  if (!G.on) return; requestAnimationFrame(frame); layout();
  const T = ts / 1000, now = G.paused ? G.pauseAt : songTime(), pps = L.hitY / G.D.lead;
  if (!G.paused) {
    scheduleBeat(now);
    for (const t of G.b.tiles) { if (t.t - now > 0.5) break; if (t.state === 0 && now - t.t > G.D.win) missTile(t);
      if (t.state === 3) { t.holdP = Math.min(1, (now - t.t) / t.dur); G.score += 1; if (Math.random() < 0.3) burst(L.x + (t.lane + 0.5) * L.lw, L.hitY - 10, 'good'); if (t.holdP >= 1) { t.state = 1; for (const [k, v] of G.holds) if (v === t) G.holds.delete(k); G.score += 50; } } }
    const prog = Math.min(1, Math.max(0, now / G.b.end)); $('#prog').style.width = (prog * 100) + '%';
    if (now > G.b.end && !G.ended) { G.ended = true; setTimeout(finishGame, 300); }
  }
  // beat phase for background
  let beat = now * (G.b.bpm || 100) / 60; const bt = G.b.beatTimes; if (bt && bt.length) { let i = G._bi || 0; while (i < bt.length - 1 && bt[i + 1][0] <= now) i++; while (i > 0 && bt[i][0] > now) i--; G._bi = i; if (bt[i + 1]) beat = i + Math.max(0, Math.min(1, (now - bt[i][0]) / (bt[i + 1][0] - bt[i][0]))); }
  c.setTransform(DPR, 0, 0, DPR, 0, 0); Art.bg(c, G.theme, L.W, L.H, T, beat, G.b.energy != null ? G.b.energy : 0.5);
  // board
  c.fillStyle = 'rgba(255,255,255,.14)'; Art.rr(c, L.x + 2, 0, L.w - 4, L.H, 0); c.fill();
  for (let i = 1; i < 4; i++) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(L.x + i * L.lw - 0.5, 0, 1, L.H); }
  for (let i = 0; i < 4; i++) if (G.laneFlash[i] > 0) { const g = c.createLinearGradient(0, L.hitY, 0, 0); g.addColorStop(0, `rgba(255,255,255,${0.4 * G.laneFlash[i]})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(L.x + i * L.lw, 0, L.lw, L.hitY); G.laneFlash[i] = Math.max(0, G.laneFlash[i] - 0.06); }
  // hit line: a string of little gems
  const lg = c.createLinearGradient(L.x, 0, L.x + L.w, 0); lg.addColorStop(0, '#fff1b0'); lg.addColorStop(0.5, '#ffffff'); lg.addColorStop(1, '#f0b84a'); c.fillStyle = lg; c.globalAlpha = 0.9; c.fillRect(L.x, L.hitY - 2, L.w, 4); c.globalAlpha = 1;
  for (let i = 0; i < 4; i++) Art.gem(c, 'diamond', L.x + (i + 0.5) * L.lw, L.hitY, 14, '#fff', '#ffb3d9');
  // tiles
  const fever = G.combo >= 30;
  for (const t of G.b.tiles) { const dtt = t.t - now; if (dtt > G.D.lead + 0.3) break; if (t.state === 1 && !(t.dur > 0)) continue;
    const yb = L.hitY - dtt * pps, h = tileH(t, pps); if (yb - h > L.H || yb < -10 && t.state !== 3) continue;
    const shape = Art.SHAPE_OF[S.eq.skin] || Art.MIX[t.shapeI % 6]; let y = yb - h, hh = h;
    if (t.state === 3 || (t.state === 1 && t.dur > 0)) { if (t.state === 1 && t.dur > 0 && t.holdP >= 0.9) continue; const consumed = Math.max(0, (now - t.t) * pps); hh = Math.max(L.lw * 0.6, h - consumed); y = L.hitY - hh; }
    Art.tile(c, { x: L.x + t.lane * L.lw + 4, y, w: L.lw - 8, h: hh, skin: fever ? 'stars' : S.eq.skin, glitter: fever ? 'gold' : S.eq.glitter, frame: S.eq.frame, shape, t: T, seed: t.id, hold: t.dur > 0 ? t.holdP : null, held: t.state === 3, dim: t.state === 2 });
  }
  // particles
  const dt = 1 / 60; G.fx = G.fx.filter(p => (p.age += dt) < p.life);
  for (const p of G.fx) { const k = 1 - p.age / p.life;
    if (p.ring) { c.strokeStyle = p.col; c.globalAlpha = k; c.lineWidth = 4; c.beginPath(); c.arc(p.x, p.y, 20 + (1 - k) * 60, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; continue; }
    p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98;
    if (p.kind === 'shape') { c.globalAlpha = k; Art.gem(c, p.shape, p.x, p.y, p.s * 2.2, '#fff', p.col); c.globalAlpha = 1; } else Art.sparkle(c, p.x, p.y, p.s * k, p.col, k); }
  // judgement pops
  G.pops = G.pops.filter(p => (p.a -= 0.025) > 0);
  for (const p of G.pops) { c.globalAlpha = Math.min(1, p.a); c.font = `800 ${p.big ? 34 : 22}px ${getComputedStyle(document.body).fontFamily}`; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = '#c2186b'; c.strokeText(p.txt, p.x, p.y - (1 - p.a) * 30); c.fillStyle = '#fff'; c.fillText(p.txt, p.x, p.y - (1 - p.a) * 30); c.globalAlpha = 1; }
  // combo + mascot
  if (G.combo >= 3) { c.font = `800 ${Math.min(64, L.lw * 0.6)}px ${getComputedStyle(document.body).fontFamily}`; c.textAlign = 'center'; c.globalAlpha = 0.85; c.fillStyle = '#fff'; c.strokeStyle = '#ff4fa3'; c.lineWidth = 6; c.strokeText(G.combo, L.x + L.w / 2, L.H * 0.2); c.fillText(G.combo, L.x + L.w / 2, L.H * 0.2); c.font = '800 16px sans-serif'; c.fillText('COMBO', L.x + L.w / 2, L.H * 0.2 + 22); c.globalAlpha = 1; }
  const ms = Math.min(90, L.H * 0.12), mx = L.x > ms ? L.x - ms * 0.6 : L.W - ms * 0.55, my = L.x > ms ? L.H * 0.55 : L.H - ms * 0.55;
  Art.mascot(c, mx, my, ms, performance.now() < G.moodT ? G.mood : 'idle', S.eq.outfit, T);
  if (G.flash > 0) { c.fillStyle = `rgba(255,120,170,${0.18 * G.flash})`; c.fillRect(0, 0, L.W, L.H); G.flash -= 0.06; }
}
function outOfHearts() { pauseGame(true); $('#mOut').classList.add('on'); const mc = $('#mascotOut').getContext('2d'); mc.clearRect(0, 0, 160, 130); Art.mascot(mc, 80, 75, 100, 'oops', S.eq.outfit, 0); }
function pauseGame(noModal) { if (G.paused) return; G.paused = true; G.pauseAt = songTime(); A.ctx().suspend(); if (!noModal) $('#mPause').classList.add('on'); }
function resumeGame() { $('#mPause').classList.remove('on'); $('#mOut').classList.remove('on'); A.ctx().resume().then(() => { G.paused = false; }); }
$('#pauseBtn').addEventListener('click', () => pauseGame());
$('#resumeBtn').addEventListener('click', resumeGame);
$('#contBtn').addEventListener('click', () => { G.hearts = Infinity; G.practice = true; G.usedPractice = true; updHud(); resumeGame(); });
const stopAudio = () => { try { G.src && G.src.stop(); } catch (e) { } A.ctx().resume(); };
const restart = () => { $('#mPause').classList.remove('on'); $('#mOut').classList.remove('on'); stopAudio(); G.on = false; startGame(G.song, G.diff); };
$('#restartBtn').addEventListener('click', restart); $('#outRetry').addEventListener('click', restart);
$('#quitBtn').addEventListener('click', () => { $('#mPause').classList.remove('on'); stopAudio(); quit(); });
$('#outEnd').addEventListener('click', () => { $('#mOut').classList.remove('on'); A.ctx().resume(); finishGame(); });
function quit() { G.on = false; $('#game').classList.remove('on'); go('songs'); }
document.addEventListener('visibilitychange', () => { if (document.hidden && G.on && !G.paused && !G.ended) pauseGame(); });

function finishGame() {
  if (!G.on) return; stopAudio(); G.b.tiles.forEach(t => { if (t.state === 0) { t.state = 2; G.j.miss++; } }); const n = G.b.tiles.length, j = G.j, acc = n ? (j.perfect + j.great * 0.85 + j.good * 0.6) / n : 0;
  const fc = j.miss === 0 && n > 0; let stars = acc >= 0.88 ? 3 : acc >= 0.7 ? 2 : acc >= 0.3 ? 1 : 0;
  const id = G.song.id, before = totalStars(), crownsBefore = crownsOf(id); S.best[id] = S.best[id] || {}; const prev = S.best[id][G.diff] || { stars: 0, score: 0 };
  const newBest = G.score > (prev.score || 0);
  S.best[id][G.diff] = { stars: Math.max(prev.stars || 0, stars), score: Math.max(prev.score || 0, G.score), fc: prev.fc || (fc && !G.usedPractice) };
  const gainedStars = totalStars() - before, gainedCrowns = crownsOf(id) - crownsBefore;
  const coins = Math.round(G.score / 400) + stars * 5 + (fc ? 10 : 0) + 2; S.coins += coins; S.packs += gainedStars + gainedCrowns; S.plays++; S.maxCombo = Math.max(S.maxCombo || 0, G.maxCombo);
  award('first'); if (stars === 3) award('star3'); if (fc) award('fc'); if (crownsOf(id) > 0) award('crown'); if (S.plays >= 10) award('p10'); if (S.plays >= 50) award('p50');
  if (G.maxCombo >= 50) award('combo50'); if (G.maxCombo >= 100) award('combo100'); if (G.diff === 'hard' && stars > 0) award('hard'); if (totalStars() >= 50) award('allstars');
  save(); A.sfx(stars ? 'star' : 'coin');
  const msgs = ['Keep practicing, you can do it! 💪', 'Nice playing! 🌸', 'Wonderful! 💖', 'SUPERSTAR! 👑'];
  $('#resCard').innerHTML = `<canvas id="resMascot" width="150" height="120" style="width:150px;height:120px"></canvas>
    <h2 dir="auto">${esc(G.song.title)}</h2><div class="big-stars">${[0, 1, 2].map(i => `<span style="animation-delay:${0.2 + i * 0.25}s">${i < stars ? '⭐' : '☆'}</span>`).join('')}</div>
    <div style="font-size:30px">${'👑'.repeat(crownsOf(id))}</div><p style="font-weight:800;font-size:20px">${msgs[stars]}</p>
    <div class="stat"><span>Score</span><span>${G.score.toLocaleString()}${newBest ? ' 🆕' : ''}</span></div>
    <div class="stat"><span>💖 Perfect</span><span>${j.perfect}</span></div><div class="stat"><span>✨ Great</span><span>${j.great}</span></div><div class="stat"><span>👍 Good</span><span>${j.good}</span></div><div class="stat"><span>🌧️ Missed</span><span>${j.miss}</span></div>
    <div class="stat"><span>🔥 Best combo</span><span>${G.maxCombo}${fc ? ' · FULL COMBO!' : ''}</span></div>
    <p style="font-weight:800">+${coins} 🪙 ${gainedStars + gainedCrowns ? ` · +${gainedStars + gainedCrowns} sticker pack${gainedStars + gainedCrowns > 1 ? 's' : ''} 🎴` : ''}</p>
    <div class="row"><button class="btn" id="resAgain">↺ Again</button><button class="btn silver" id="resSongs">🎵 Songs</button>${S.packs ? '<button class="btn gold" id="resPack">🎴 Open pack</button>' : ''}</div>`;
  $('#mRes').classList.add('on'); const rm = $('#resMascot').getContext('2d'); let t0 = performance.now();
  (function anim() { if (!$('#mRes').classList.contains('on')) return; rm.clearRect(0, 0, 150, 120); Art.mascot(rm, 75, 68, 95, stars >= 2 ? 'wow' : 'happy', S.eq.outfit, (performance.now() - t0) / 1000); requestAnimationFrame(anim); })();
  G.on = false; $('#game').classList.remove('on'); window.__lastResult = { stars, score: G.score, j: { ...j }, n, fc, maxCombo: G.maxCombo };
}
document.addEventListener('click', e => {
  if (e.target.id === 'resAgain') { $('#mRes').classList.remove('on'); startGame(G.song, G.diff); }
  if (e.target.id === 'resSongs') { $('#mRes').classList.remove('on'); go('songs'); }
  if (e.target.id === 'resPack') { $('#mRes').classList.remove('on'); go('album'); openPack(); }
});

// ---------- boot ----------
window.__tiles = { S: () => S, G: () => G, go, startGame, allSongs, loadCustoms, DB, songTime, finishGame, layout: () => L, save, openPack, CAL };
applyLang(); loadCustoms().then(() => { go('home'); });
requestAnimationFrame(menuLoop);
window.addEventListener('resize', () => { DPR = Math.min(2, window.devicePixelRatio || 1); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadSW = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(r => r.update()).catch(() => { });
}
})();
