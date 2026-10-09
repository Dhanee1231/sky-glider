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
const def = () => ({ v: 2, coins: 30, best: {}, plays: 0, owned: { skin: ['pinkgem'], glitter: ['pink', 'gold'], frame: ['none', 'silver'], theme: ['pinkgold', 'moon', 'ocean', 'candy'], outfit: ['none', 'bow'] },
  eq: { skin: 'pinkgem', glitter: 'pink', frame: 'silver', outfit: 'bow' }, songTheme: {}, stickers: {}, packs: 1, daily: { last: '', streak: 0 }, badges: {}, maxCombo: 0,
  set: { sound: true, beat: true, missFx: true, vis: 0, calibrated: false, offset: 0, lang: 'en', practice: false, diff: 'easy' } });
let S; try { S = Object.assign(def(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = def(); }
for (const k in def().owned) if (!S.owned[k]) S.owned[k] = def().owned[k];
if ((S.v || 1) < 2) { S.v = 2; S.set = Object.assign({ missFx: true, vis: 0, calibrated: false }, S.set); }
if (!S.set.calibrated && /Android/i.test(navigator.userAgent)) { S.set.offset = 25; S.set.vis = 10; } // sensible Android defaults (touch + display pipeline) until she runs the tap test
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
A.muted = !S.set.sound;

// ---------- i18n (English / Hindi labels) ----------
const HI = { title: 'जेम टाइल्स', tag: 'संगीत के साथ चमकीली टाइलें टैप करो!', play: '▶ खेलो', gift: '🎁 रोज़ का तोहफ़ा', addSong: '🎵 मेरा गाना जोड़ो', shop: '🛍️ दुकान', album: '📒 स्टिकर', badges: '🏅 बैज', closet: '🎀 गीगी की अलमारी',
  easy: 'आसान', normal: 'सामान्य', hard: 'कठिन', practice: '💗 अभ्यास', settings: 'सेटिंग्स', sound: 'आवाज़', beat: 'मिस इफ़ेक्ट', sync: 'सिंक', calib: '👆 टैप टेस्ट', start: 'शुरू', choose: 'गाना चुनो', mySong: 'मेरा गाना', name: 'नाम', pic: 'तस्वीर', color: 'रंग', theme: 'थीम',
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
  if (!G.on) { const t = ts / 1000, w = bg.clientWidth || innerWidth, h = bg.clientHeight || innerHeight, d = Math.max(1, Math.min(DPR, Math.sqrt(1.6e6 / (w * h))));
    if (bg.width !== Math.round(w * d) || bg.height !== Math.round(h * d)) { bg.width = Math.round(w * d); bg.height = Math.round(h * d); }
    bgc.setTransform(1, 0, 0, 1, 0, 0); bgc.drawImage(Art.scene(menuTheme, w, h, d, 'menu'), 0, 0); bgc.setTransform(d, 0, 0, d, 0, 0); Art.bg(bgc, menuTheme, w, h, t, t * 1.6, 0.4, true);
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
  segOn('#soundSeg', S.set.sound ? 1 : 0); segOn('#beatSeg', S.set.missFx !== false ? 1 : 0); $('#visVal').textContent = S.set.vis || 0; segOn('#langSeg', S.set.lang); $('#offRange').value = S.set.offset; $('#offVal').textContent = S.set.offset;
}
$('#soundSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.sound = b.dataset.v === '1'; A.setMuted(!S.set.sound); save(); renderSettings(); });
$('#beatSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.missFx = b.dataset.v === '1'; save(); renderSettings(); });
$('#langSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.lang = b.dataset.v; save(); applyLang(); renderSettings(); });
$('#offRange').addEventListener('input', e => { S.set.offset = +e.target.value; S.set.calibrated = true; $('#offVal').textContent = S.set.offset; save(); });
$('#calibBtn').addEventListener('click', () => { go('calib'); $('#calOut').textContent = ''; $('#calBar').style.width = '0'; });
const CAL = { on: false, clicks: [], taps: [], mode: 'audio' };
$('#calStart').addEventListener('click', () => startCal('audio'));
$('#calVis').addEventListener('click', () => startCal('visual'));
function startCal(mode) {
  const ctx = A.init(); CAL.on = true; CAL.mode = mode; CAL.taps = []; CAL.clicks = []; $('#calBar').style.width = '0';
  clock.off = null; updateClock(); const t0 = ctx.currentTime + 0.8;
  if (mode === 'audio') { for (let i = 0; i < 12; i++) { CAL.clicks.push(t0 + i * 0.6); A.click(t0 + i * 0.6, i % 4 === 0); } $('#calOut').textContent = 'Listen… tap on every click!'; }
  else { const p0 = performance.now() + 800; for (let i = 0; i < 12; i++) CAL.clicks.push((p0 + i * 600) / 1000); $('#calOut').textContent = 'Watch… tap when the gem lands on the line!'; visAnim(p0); }
  setTimeout(finishCal, (0.8 + 12 * 0.6 + 0.6) * 1000);
}
function visAnim(p0) { const cvv = $('#calCv'), cc = cvv.getContext('2d'); cvv.classList.remove('hidden');
  (function f() { if (!CAL.on) { cvv.classList.add('hidden'); return; } const [w, h] = fit(cvv); cc.setTransform(DPR, 0, 0, DPR, 0, 0); cc.clearRect(0, 0, w, h);
    const ph = ((performance.now() - p0) / 600) % 1, y = (ph < 0 ? 0 : ph) * (h - 30); cc.fillStyle = '#ff4fa3'; cc.fillRect(0, h - 22, w, 4); Art.gem(cc, 'heart', w / 2, 10 + y * 0.92, 30, '#fff', '#ff4fa3'); requestAnimationFrame(f); })(); }
$('#tapPad').addEventListener('pointerdown', e => { if (!CAL.on) return; updateClock(); const p = perfOf(e); CAL.taps.push(CAL.mode === 'audio' ? p / 1000 + clock.off : p / 1000); $('#calBar').style.width = Math.min(100, CAL.taps.length / 12 * 100) + '%'; });
function finishCal() {
  if (!CAL.on) return; CAL.on = false;
  const d = CAL.taps.map(t => { let best = 9; for (const c of CAL.clicks) if (Math.abs(t - c) < Math.abs(best)) best = t - c; return best; }).filter(v => Math.abs(v) < 0.3).sort((a, b) => a - b);
  if (d.length < 6) { $('#calOut').textContent = 'Not enough taps — try again!'; return; }
  const med = Math.round(d[Math.floor(d.length / 2)] * 1000 / 5) * 5;
  if (CAL.mode === 'audio') S.set.offset = med; else S.set.vis = Math.max(-100, Math.min(150, med)); S.set.calibrated = true; save();
  $('#calOut').textContent = CAL.mode === 'audio' ? `Sound synced! Tap offset ${S.set.offset} ms ✨` : `Screen synced! Visual offset ${S.set.vis} ms ✨`; A.sfx('star');
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
    rec.anv = AN.VERSION; rec.charts = { easy: AN.makeChart(an, 'easy', 1), normal: AN.makeChart(an, 'normal', 1), hard: AN.makeChart(an, 'hard', 1) };
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

// =================== GAME ENGINE (v2: Guitar-Hero model) ===================
// The song is ONE continuous audio track. Taps never create sounds or AudioNodes. Every note position and every
// judgement comes from the audio clock (getOutputTimestamp), never from accumulated frame deltas.
const cv = $('#cv'), c = cv.getContext('2d', { alpha: false, desynchronized: true });
const G = { on: false };
const decoded = new Map(), rendered = new Map();
const DIFF = { easy: { lead: 1.55, hearts: 5, mul: 0.85, ramp: 0.08, win: 0.14, great: 0.08, perf: 0.04 },
  normal: { lead: 1.2, hearts: 3, mul: 1, ramp: 0.15, win: 0.11, great: 0.065, perf: 0.033 },
  hard: { lead: 0.95, hearts: 3, mul: 1.12, ramp: 0.22, win: 0.09, great: 0.055, perf: 0.028 } };
const COUNT = 2.0, PAD = 0.35; // countdown seconds; silence at the start of rendered built-in tracks
// ---------- audio clock ----------
const clock = { off: null };
function updateClock() { // off = (audio time being HEARD) - (performance time)
  const ctx = A.ctx(); let est = null;
  if (ctx.getOutputTimestamp) { const ts = ctx.getOutputTimestamp(); if (ts && ts.contextTime > 0 && ts.performanceTime > 0) est = ts.contextTime - ts.performanceTime / 1000; }
  if (est == null) est = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0) - performance.now() / 1000;
  if (clock.off == null || Math.abs(est - clock.off) > 0.04) clock.off = est; else clock.off += (est - clock.off) * 0.08;
}
const perfOf = e => { const t = e && e.timeStamp, n = performance.now(); return t > 0 && t <= n + 5 && n - t < 1000 ? t : n; };
const songAt = perfMs => perfMs / 1000 + clock.off - G.startAt; // audio-track position heard at that moment
const judgeAt = perfMs => songAt(perfMs) - S.set.offset / 1000;
const songTime = () => songAt(performance.now());
// ---------- built-in arrangement (melody + chords/bass + drums), the same note list drives the chart ----------
const KEYS = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
function chordsFor(key) { const minor = /m$/.test(key), tonic = KEYS[key.replace(/m$/, '')] || 0;
  const deg = minor ? [[0, 'm', 1.1], [3, '', 1], [5, 'm', 1.05], [7, '', 1.1], [8, '', 1], [10, '', 0.95]] : [[0, '', 1.15], [2, 'm', 0.95], [4, 'm', 0.9], [5, '', 1.1], [7, '', 1.12], [9, 'm', 1]];
  return deg.map(([d, q, w]) => { const r = (tonic + d) % 12; return { root: r, pcs: [r, (r + (q ? 3 : 4)) % 12, (r + 7) % 12], w }; }); }
function parseMelody(m) { let b = 0; const out = []; for (const tok of m.trim().split(/\s+/)) { const [n, d] = tok.split(':'), dur = d ? parseFloat(d) : 1; if (n !== 'R') out.push({ b, midi: A.midi(n), dur }); b += dur; } return { notes: out, beats: b }; }
function arrange(song, diff) {
  const D = DIFF[diff], { notes, beats } = parseMelody(song.m), bpm0 = song.bpm * D.mul, k = D.ramp / beats, bar = song.bar || 4;
  const tOf = b => PAD + (k ? 60 / (bpm0 * k) * Math.log(1 + k * b) : 60 * b / bpm0);
  const mel = notes.map(n => ({ type: 'piano', m: n.midi, t: tOf(n.b), d: tOf(n.b + n.dur) - tOf(n.b), v: 0.85, wet: 1 }));
  const back = [], CH = chordsFor(song.key || 'C'), nb = Math.ceil(beats / bar);
  for (let i = 0; i < nb; i++) { const b0 = i * bar, b1 = b0 + bar, w = new Array(12).fill(0);
    for (const n of notes) { const ov = Math.min(b1, n.b + n.dur) - Math.max(b0, n.b); if (ov > 0) w[n.midi % 12] += ov * (n.b >= b0 && n.b < b0 + 1 ? 1.5 : 1); }
    let best = CH[0], bs = -1; for (const ch of CH) { const s = ch.pcs.reduce((a, p) => a + w[p], 0) * ch.w; if (s > bs) { bs = s; best = ch; } }
    const t0 = tOf(b0), t1 = tOf(Math.min(b1, beats)), root = 36 + best.root, pad = best.pcs.map(p => 55 + ((p - 7 + 12) % 12));
    back.push({ type: 'pad', ms: pad, t: t0, d: t1 - t0, v: diff === 'easy' ? 0.8 : 1, wet: 1 });
    back.push({ type: 'bass', m: root, t: t0, d: (bar >= 4 ? tOf(b0 + bar / 2) : t1) - t0 - 0.02, v: 0.7 });
    if (bar >= 4) back.push({ type: 'bass', m: root + 7, t: tOf(b0 + bar / 2), d: t1 - tOf(b0 + bar / 2) - 0.02, v: 0.6 });
    for (let b = b0; b < Math.min(b1, beats); b += 0.5) { const t = tOf(b), pos = b - b0;
      if (pos === 0 || (bar >= 4 && pos === bar / 2)) back.push({ type: 'kick', t, v: 0.55 }); else if (Number.isInteger(pos) && (bar === 2 || (bar === 4 && pos % 2 === 1))) back.push({ type: 'clap', t, v: 0.16 });
      back.push({ type: 'hat', t, v: Number.isInteger(pos) ? 0.06 : 0.035 }); } }
  // tiles: one per melody note (Easy pairs very short notes), so every tap IS a note you hear
  let groups = []; if (diff === 'easy') { for (let i = 0; i < notes.length; i++) { const n = notes[i]; if (n.dur < 0.5 && notes[i + 1] && notes[i + 1].dur <= 0.5) { groups.push([n, notes[i + 1]]); i++; } else groups.push([n]); } } else groups = notes.map(n => [n]);
  const tiles = []; let lane = 1, prev = null, flip = 1;
  groups.forEach((g, i) => { const n = g[0], t = tOf(n.b);
    if (prev) { const dp = n.midi - prev.midi; if (dp > 0) lane += dp > 4 ? 2 : 1; else if (dp < 0) lane -= dp < -4 ? 2 : 1; else { lane += flip; flip = -flip; } if (lane > 3) lane = 6 - lane; if (lane < 0) lane = -lane; lane = Math.max(0, Math.min(3, lane)); if (lane === prev.lane && t - prev.t < 0.45) lane = (lane + 2) % 4; }
    const holdB = diff === 'easy' ? 2 : 1.5, isHold = g.length === 1 && n.dur >= holdB;
    tiles.push({ t, lane, dur: isHold ? (tOf(n.b + n.dur) - t) * 0.85 : 0, shapeI: i });
    if (diff !== 'easy' && !isHold && n.dur >= 1 && i > 0 && (diff === 'hard' ? n.b % 2 === 0 : n.b % 4 === 0)) tiles.push({ t, lane: (lane + 2) % 4, dur: 0, shapeI: i + 1, pair: true });
    prev = { midi: g[g.length - 1].midi, lane, t }; });
  const beatTimes = []; for (let b = 0; b <= Math.ceil(beats); b++) beatTimes.push([tOf(b), b]);
  return { tiles, mel, back, end: tOf(beats) + 0.6, beatTimes, bpm: bpm0, melTimes: mel.map(e => e.t) };
}
async function prepare(song, diff, onP) {
  const ctx = A.init();
  if (song.custom) {
    let full = await DB.get(song.id); if (!full) throw new Error('missing');
    if ((full.anv || 1) < AN.VERSION) { onP(0.2, 'Re-making tiles with the new beat finder…'); full = await reanalyze(full); }
    if (!decoded.get(song.id)) { onP(0.5, 'Getting your song ready…'); decoded.set(song.id, await ctx.decodeAudioData(await full.blob.arrayBuffer())); }
    const tiles = full.charts[diff].map((n, i) => ({ t: n.t, lane: n.lane, dur: n.dur || 0, shapeI: i, lane2: n.lane2 }));
    tiles.slice().forEach(t => { if (t.lane2 != null) tiles.push({ ...t, lane: t.lane2, pair: true, shapeI: t.shapeI + 1 }); });
    tiles.sort((a, b) => a.t - b.t);
    return { tiles, end: full.duration + 0.3, bpm: full.bpm, beatTimes: full.an.beats.map((b, i) => [b.t, i]), stems: { full: decoded.get(song.id) }, energy: full.energy, theme: full.theme, songOffset: (full.offset || 0) / 1000 };
  }
  const key = song.id + '|' + diff; let r = rendered.get(key);
  if (!r) { const ar = arrange(song, diff); onP(0.3, '🎹 Warming up the band…');
    const [mel, back] = await Promise.all([A.renderStem(ar.mel, ar.end + 2.2, 0.22), A.renderStem(ar.back, ar.end + 2.2, 0.12)]);
    r = { ...ar, stems: { mel, back } }; rendered.set(key, r); if (rendered.size > 4) rendered.delete(rendered.keys().next().value); }
  return r;
}
async function reanalyze(full) { const { mono } = await AN.decodeToMono(await full.blob.arrayBuffer()); const an = AN.analyzeMono(mono);
  Object.assign(full, { an, bpm: an.bpm, anv: AN.VERSION, charts: { easy: AN.makeChart(an, 'easy', full.seed || 1), normal: AN.makeChart(an, 'normal', full.seed || 1), hard: AN.makeChart(an, 'hard', full.seed || 1) } });
  await DB.put(full); return full; }
// ---------- start ----------
const loadUI = (p, t) => { $('#mLoad').classList.add('on'); $('#loadBar').style.width = (p * 100) + '%'; $('#loadMsg').textContent = t; };
async function startGame(song, diff) {
  const ctx = A.init(); await ctx.resume(); A.inGame = true;
  let b; try { loadUI(0.05, 'Loading…'); b = await prepare(song, diff, loadUI); } catch (e) { console.warn(e); $('#mLoad').classList.remove('on'); A.inGame = false; toast('Could not load that song'); return; }
  loadUI(1, 'Ready!');
  const tiles = b.tiles.map((t, i) => ({ ...t, id: i, state: 0, holdP: 0 }));
  let theme = S.songTheme[song.id] || b.theme || song.theme || 'pinkgold';
  Object.assign(G, { on: true, song, diff, D: DIFF[diff], b, tiles, theme, score: 0, combo: 0, maxCombo: 0, hearts: S.set.practice ? Infinity : DIFF[diff].hearts, practice: S.set.practice, usedPractice: S.set.practice,
    j: { perfect: 0, great: 0, good: 0, miss: 0 }, holds: new Map(), press: new Map(), mood: 'idle', moodT: 0, paused: false, ended: false, sp: 0, spUntil: -1, flash: 0, laneFlash: [0, 0, 0, 0], laneHit: [0, 0, 0, 0],
    flares: [0, 0, 0, 0], first: 0, hudDirty: true, lastProg: -1, pops: [], ft: [], fi: [], lastFrame: 0, ivl: [], pendingTap: null, nodesAtStart: 0 });
  // build the playback graph ONCE (no nodes are created after this until the song ends)
  const master = A.master(); G.nodes = [];
  if (b.stems.full) { const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(); src.buffer = b.stems.full; lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = 0.5; src.connect(lp); lp.connect(master); G.srcs = [src]; G.muffle = lp; G.duck = null; }
  else { const m = ctx.createBufferSource(), bk = ctx.createBufferSource(), mg = ctx.createGain(); m.buffer = b.stems.mel; bk.buffer = b.stems.back; m.connect(mg); mg.connect(master); bk.connect(master); G.srcs = [m, bk]; G.duck = mg; G.muffle = null; }
  G.lat = b.songOffset || 0; G.startAt = ctx.currentTime + COUNT + 0.1 + G.lat; G.srcs.forEach(s => s.start(G.startAt - G.lat));
  clock.off = null; updateClock();
  $('#mLoad').classList.remove('on'); $('#game').classList.add('on'); $$('.screen').forEach(s => s.classList.remove('on'));
  layout(); updHud(); requestAnimationFrame(frame);
}
function updHud() { $('#hHearts').textContent = G.hearts === Infinity ? '💗 ∞' : '💗'.repeat(Math.max(0, G.hearts)) + '🤍'.repeat(Math.max(0, G.D.hearts - G.hearts)); $('#hScore').textContent = G.score.toLocaleString(); G.hudDirty = false; }
// ---------- layout + perspective highway ----------
let L = {};
let GDPR = 2;
function fitGame() { const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight; GDPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.0e6 / (w * h))));
  const cw = Math.round(w * GDPR), ch = Math.round(h * GDPR); if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; } return [w, h]; }
function layout() { const [W, H] = fitGame(); if (L.W === W && L.H === H) return; const bw = Math.min(W * 0.98, H * 0.82, 700), P = 1.7;
  L = { W, H, cx: W / 2, bw, lw: bw / 4, strikeY: H * 0.83, horizonY: H * 0.09, P, sFar: 1 / (1 + P) }; L.span = L.strikeY - L.horizonY; }
const proj = u => { const s = 1 / (1 + L.P * Math.max(-0.12, u)); return [s, L.strikeY - L.span * (1 - s) / (1 - L.sFar)]; };
const laneX = (l, s) => L.cx + (l - 1.5) * L.lw * s;
function laneAt(x, y) { const fr = Math.max(0, Math.min(1, (L.strikeY - y) / L.span)), s = 1 - fr * (1 - L.sFar); return Math.floor((x - L.cx) / (L.lw * s) + 2); }
const HWX = () => Math.max(0, Math.floor(L.cx - L.bw * 0.62)); const highway = () => Art.spr(`hw|${L.W}|${L.H}`, Math.ceil(L.bw * 1.24), L.H, (h) => { h.translate(-HWX(), 0);
  const s1 = 1, s0 = L.sFar, y0 = L.horizonY, y1 = L.H, sB = 1 / (1 + L.P * -0.12);
  const pts = [[laneX(-0.5, s0), y0], [laneX(3.5, s0), y0], [L.cx + 2 * L.lw * sB, y1], [L.cx - 2 * L.lw * sB, y1]];
  const g = h.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(40,0,40,.05)'); g.addColorStop(0.6, 'rgba(60,0,50,.32)'); g.addColorStop(1, 'rgba(60,0,50,.45)');
  h.fillStyle = g; h.beginPath(); pts.forEach(([x, y], i) => i ? h.lineTo(x, y) : h.moveTo(x, y)); h.fill();
  h.strokeStyle = 'rgba(255,255,255,.35)'; h.lineWidth = 1.5; for (let l = 0; l <= 4; l++) { h.beginPath(); h.moveTo(laneX(l - 0.5, s0), y0); h.lineTo(L.cx + (l - 2) * L.lw * sB, y1); h.stroke(); }
  const rail = h.createLinearGradient(0, y0, 0, y1); rail.addColorStop(0, 'rgba(255,241,176,.2)'); rail.addColorStop(1, '#ffd76a'); h.strokeStyle = rail; h.lineWidth = 5;
  [[-0.5, -2], [3.5, 2]].forEach(([a, b]) => { h.beginPath(); h.moveTo(laneX(a, s0), y0); h.lineTo(L.cx + b * L.lw * sB, y1); h.stroke(); });
  const sl = h.createLinearGradient(L.cx - L.bw / 2, 0, L.cx + L.bw / 2, 0); sl.addColorStop(0, '#fff1b0'); sl.addColorStop(0.5, '#fff'); sl.addColorStop(1, '#f0b84a'); h.fillStyle = sl; h.fillRect(L.cx - L.bw / 2, L.strikeY - 3, L.bw, 6); });
const LANECOL = ['#ff5fae', '#b98cff', '#5ad1ff', '#ffc94d'];
const flareImg = l => Art.spr('flare|' + l, 128, 128, f => { f.strokeStyle = LANECOL[l]; f.lineWidth = 10; f.beginPath(); f.arc(64, 64, 52, 0, Math.PI * 2); f.stroke(); f.strokeStyle = '#fff'; f.lineWidth = 4; f.beginPath(); f.arc(64, 64, 52, 0, Math.PI * 2); f.stroke();
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; Art.sparkle(f, 64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52, 9, '#fff'); } });
const btnImg = (l, on) => Art.spr(`btn|${l}|${on}|${Math.round(L.lw)}`, L.lw, L.lw * 0.7, (b, w, h) => {
  b.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,.25)'; b.strokeStyle = LANECOL[l]; b.lineWidth = Math.max(3, w * 0.05); b.beginPath(); b.ellipse(w / 2, h / 2, w * 0.38, h * 0.36, 0, 0, Math.PI * 2); b.fill(); b.stroke();
  Art.gem(b, ['heart', 'star', 'diamond', 'crown'][l], w / 2, h / 2, h * (on ? 0.55 : 0.45), '#fff', LANECOL[l]); });
// ---------- particles (fixed pool, no per-frame allocation) ----------
const POOL = Array.from({ length: 140 }, () => ({ on: false })); let poolI = 0;
function emit(x, y, n, big) { const GL = Art.GLITTER[G.spUntil > 0 ? 'gold' : S.eq.glitter], shape = Art.SHAPE_OF[S.eq.skin] || 'heart';
  for (let i = 0; i < n; i++) { const p = POOL[poolI = (poolI + 1) % POOL.length], a = Math.random() * Math.PI * 2, v = (big ? 220 : 120) + Math.random() * 260;
    p.on = true; p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 160; p.age = 0; p.life = 0.45 + Math.random() * 0.35; p.s = 3 + Math.random() * 7; p.col = GL[i % GL.length]; p.gem = i % 5 === 0 ? (i % 10 === 0 ? 'star' : shape) : null; } }
// ---------- judging ----------
const mult = () => Math.min(4, 1 + Math.floor(G.combo / 10)) * (G.spUntil > 0 ? 2 : 1);
function hitTile(t, dt, pid) {
  const a = Math.abs(dt), j = a <= G.D.perf ? 'perfect' : a <= G.D.great ? 'great' : 'good';
  G.j[j]++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); G.score += { perfect: 100, great: 70, good: 40 }[j] * mult(); t.judge = j; t.dt = dt;
  G.laneHit[t.lane] = 1; G.flares[t.lane] = 1; emit(laneX(t.lane, 1), L.strikeY, j === 'perfect' ? 16 : 10, j === 'perfect');
  if (G.pops.length > 5) G.pops.shift(); G.pops.push({ x: laneX(t.lane, 1), y: L.strikeY - L.lw * 0.6, txt: j === 'perfect' ? 'Perfect!' : j === 'great' ? 'Great!' : 'Good', a: 1, col: j === 'perfect' ? '#ff4fa3' : j === 'great' ? '#a66bff' : '#3aa0d8' });
  if (G.spUntil < 0) { G.sp = Math.min(1, G.sp + (j === 'perfect' ? 0.045 : 0.03)); }
  if (t.dur > 0) { t.state = 3; G.holds.set(pid, t); } else t.state = 1;
  if ([10, 25, 50, 75, 100, 150, 200].includes(G.combo)) { G.mood = 'wow'; G.moodT = performance.now() + 1400; G.pops.push({ x: L.cx, y: L.H * 0.3, txt: `${G.combo} combo!`, a: 1.5, big: 1, col: '#ff4fa3' }); }
  else if (G.combo % 5 === 0) { G.mood = 'happy'; G.moodT = performance.now() + 600; }
  G.hudDirty = true; G.pendingTap = G.pendingTap || { perf: G.tapPerf };
}
function missTile(t, now) {
  t.state = 2; G.j.miss++; G.combo = 0; G.mood = 'oops'; G.moodT = performance.now() + 800; G.flash = 1; G.hudDirty = true;
  if (S.set.missFx !== false) { const ctx = A.ctx(), n = ctx.currentTime; // subtle GH-style miss: duck the melody stem / muffle the track (~200 ms). Param automation only, no new nodes.
    if (G.duck) { const g = G.duck.gain; g.cancelScheduledValues(n); g.setValueAtTime(g.value, n); g.linearRampToValueAtTime(0.35, n + 0.03); g.linearRampToValueAtTime(1, n + 0.25); }
    if (G.muffle) { const f = G.muffle.frequency; f.cancelScheduledValues(n); f.setValueAtTime(f.value, n); f.exponentialRampToValueAtTime(900, n + 0.03); f.exponentialRampToValueAtTime(20000, n + 0.28); } }
  if (G.hearts !== Infinity && !t.pair) { G.hearts--; if (G.hearts <= 0) outOfHearts(); }
}
// input: pointerdown (no click delay), multi-touch, judged at the event's own timestamp mapped to the audio clock
cv.addEventListener('pointerdown', e => {
  if (!G.on || G.paused) return; try { cv.setPointerCapture(e.pointerId); } catch (_) { }
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, lane = laneAt(x, y); if (lane < 0 || lane > 3) return;
  const perf = perfOf(e), now = judgeAt(perf); G.press.set(e.pointerId, lane); G.tapPerf = perf;
  let best = null, bd = 1e9; for (let i = G.first; i < G.tiles.length; i++) { const t = G.tiles[i]; if (t.t - now > G.D.win) break; if (t.state || t.lane !== lane) continue; const d = Math.abs(now - t.t); if (d <= G.D.win && d < bd) { bd = d; best = t; } }
  if (best) hitTile(best, now - best.t, e.pointerId); else { G.laneFlash[lane] = 0.6; if (G.diff === 'hard') { G.combo = 0; G.hudDirty = true; } }
}, { passive: true });
const endHold = e => { G.press.delete(e.pointerId); const t = G.holds.get(e.pointerId); if (!t) return; G.holds.delete(e.pointerId); if (t.holdP >= 0.85) { t.holdP = 1; G.score += 50 * mult(); emit(laneX(t.lane, 1), L.strikeY, 12, true); } t.state = 1; };
cv.addEventListener('pointerup', endHold, { passive: true }); cv.addEventListener('pointercancel', endHold, { passive: true });
// ---------- frame ----------
let FONT = '';
function frame(ts) {
  if (!G.on) return; requestAnimationFrame(frame);
  const f0 = performance.now(); if (G.lastFrame) G.fi.push(ts - G.lastFrame); G.lastFrame = ts; layout();
  if (!G.paused) updateClock();
  const T = ts / 1000, now = G.paused ? G.pauseAt : songAt(f0), jnow = now - S.set.offset / 1000, vnow = now + (S.set.vis || 0) / 1000, lead = G.D.lead;
  if (!FONT) FONT = getComputedStyle(document.body).fontFamily;
  if (!G.paused) {
    while (G.first < G.tiles.length && G.tiles[G.first].state && G.tiles[G.first].state !== 3 && G.tiles[G.first].t < jnow - 1) G.first++;
    for (let i = G.first; i < G.tiles.length; i++) { const t = G.tiles[i]; if (t.t > jnow + 0.2) break;
      if (t.state === 0 && jnow - t.t > G.D.win) missTile(t, jnow);
      else if (t.state === 3) { t.holdP = Math.min(1, (jnow - t.t) / t.dur); G.score += mult(); G.hudDirty = true; if (t.holdP >= 1) { t.state = 1; for (const [k, v] of G.holds) if (v === t) G.holds.delete(k); G.score += 50 * mult(); emit(laneX(t.lane, 1), L.strikeY, 12, true); } } }
    if (G.sp >= 1 && G.spUntil < 0) { G.spUntil = now + 8; G.sp = 1; G.pops.push({ x: L.cx, y: L.H * 0.38, txt: '⭐ STAR POWER ⭐', a: 1.8, big: 1, col: '#d4a017' }); }
    if (G.spUntil > 0) { G.sp = Math.max(0, (G.spUntil - now) / 8); if (now > G.spUntil) { G.spUntil = -1; G.sp = 0; } }
    const prog = Math.max(0, Math.min(1, now / G.b.end)); if (Math.abs(prog - G.lastProg) > 0.004) { $('#prog').style.transform = `scaleX(${prog.toFixed(3)})`; G.lastProg = prog; }
    if (now > G.b.end && !G.ended) { G.ended = true; setTimeout(finishGame, 250); }
  }
  if (G.hudDirty) updHud();
  // beat phase (drives background pulse/speed)
  let beat = Math.max(0, now) * (G.b.bpm || 100) / 60; const bt = G.b.beatTimes; if (bt && bt.length > 1) { let i = G._bi || 0; while (i < bt.length - 1 && bt[i + 1][0] <= now) i++; while (i > 0 && bt[i][0] > now) i--; G._bi = i; if (bt[i + 1] && now >= bt[0][0]) beat = i + Math.min(1, (now - bt[i][0]) / (bt[i + 1][0] - bt[i][0])); }
  const SK = window.__skip || {}; c.setTransform(GDPR, 0, 0, GDPR, 0, 0); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(Art.scene(G.theme, L.W, L.H, GDPR, 'hw', h => { h.save(); h.translate(HWX(), 0); h.drawImage(highway(), 0, 0); h.restore(); }), 0, 0); c.setTransform(GDPR, 0, 0, GDPR, 0, 0); if (!SK.bg) Art.bg(c, G.theme, L.W, L.H, T, beat, G.b.energy != null ? G.b.energy : 0.5, true);
  
  const spOn = G.spUntil > 0;
  if (spOn) { c.globalAlpha = 0.35 + 0.25 * Math.sin(T * 8); c.drawImage(Art.glowImg('#ffd76a'), L.cx - L.bw * 0.6, L.strikeY - L.span * 0.5, L.bw * 1.2, L.span * 0.7); c.globalAlpha = 1; }
  // beat lines on the highway
  c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 2; c.beginPath();
  if (bt) for (let i = Math.max(0, (G._bi || 0) - 1); i < bt.length; i++) { const u = (bt[i][0] - vnow) / lead; if (u > 1) break; if (u < -0.1) continue; const [s, y] = proj(u); c.moveTo(L.cx - 2 * L.lw * s, y); c.lineTo(L.cx + 2 * L.lw * s, y); }
  c.stroke();
  // lane flashes
  for (let l = 0; l < 4; l++) { const f = Math.max(G.laneFlash[l], G.laneHit[l]); if (f > 0.02) { c.globalAlpha = f * 0.55; c.drawImage(Art.glowImg(LANECOL[l]), laneX(l, 1) - L.lw * 0.7, L.strikeY - L.lw * 1.6, L.lw * 1.4, L.lw * 2.2); c.globalAlpha = 1; G.laneFlash[l] *= 0.85; G.laneHit[l] *= 0.88; } }
  // notes: far to near so nearer draw on top
  const skin = spOn ? 'stars' : S.eq.skin, glit = spOn ? 'gold' : S.eq.glitter, tw = L.lw * 0.84, th = L.lw * 0.6, P1 = Art.PAL[skin] || Art.PAL.pinkgem;
  let last = G.first; while (last < G.tiles.length && (G.tiles[last].t - vnow) / lead <= 1.02) last++;
  if (!SK.notes) for (let i = last - 1; i >= G.first; i--) { const t = G.tiles[i]; if (t.state === 1 && !(t.dur > 0)) continue; if (t.state === 2 && vnow - t.t > 0.25) continue;
    const u = (t.t - vnow) / lead;
    if (t.dur > 0 && t.state !== 2 && !(t.state === 1 && t.holdP >= 1)) { // hold tail / note streak
      const u1 = Math.min(1.02, (t.t + t.dur - vnow) / lead); if (u1 > -0.1) { const [sa, ya] = proj(t.state === 3 ? 0 : Math.max(-0.1, u)), [sb, yb] = proj(u1), x = laneX(t.lane, 1), xa = laneX(t.lane, sa), xb = laneX(t.lane, sb), wa = L.lw * 0.17 * sa, wb = L.lw * 0.17 * sb;
        c.fillStyle = t.state === 3 ? '#ffffff' : P1[1]; c.globalAlpha = t.state === 3 ? 0.95 : 0.8; c.beginPath(); c.moveTo(xa - wa, ya); c.lineTo(xb - wb, yb); c.lineTo(xb + wb, yb); c.lineTo(xa + wa, ya); c.fill(); c.globalAlpha = 1;
        if (t.state === 3) { c.globalAlpha = 0.6 + 0.3 * Math.sin(T * 20); c.drawImage(Art.glowImg(LANECOL[t.lane]), x - L.lw * 0.5, L.strikeY - L.lw * 0.5, L.lw, L.lw); c.globalAlpha = 1; if ((ts | 0) % 3 === 0) emit(x, L.strikeY, 1); } } }
    if (t.state === 3 || (t.state === 1 && t.dur > 0)) continue;
    if (u > 1.02) continue; const [s, y] = proj(u), w = tw * s, h = th * s, shape = Art.SHAPE_OF[skin] || Art.MIX[t.shapeI % 6];
    if (t.state === 2) c.globalAlpha = 0.35;
    const im = Art.tileImg(skin, glit, S.eq.frame, shape, tw, th), k = w / tw; c.drawImage(im, laneX(t.lane, s) - (tw / 2 + 12) * k, y - (th + 12) * k + h * 0.25, im.width * k, im.height * k);
    c.globalAlpha = 1; Art.spark(c, laneX(t.lane, s) + w * 0.3, y - h * 0.7, 4 * s, '#ffffff', 0.5 + 0.5 * Math.sin(T * 7 + t.id)); }
  // hit flares: expanding gem rings at the strike line
  for (let l = 0; l < 4; l++) { const f = G.flares[l]; if (f > 0.03) { const r = L.lw * (0.35 + (1 - f) * 0.45); c.globalAlpha = f; c.drawImage(flareImg(l), laneX(l, 1) - r, L.strikeY - r * 0.7, r * 2, r * 1.4); c.globalAlpha = 1; G.flares[l] *= 0.86; } }
  // lane buttons at the strike line
  const down = [0, 0, 0, 0]; for (const l of G.press.values()) down[l] = 1;
  for (let l = 0; l < 4; l++) { const im = btnImg(l, down[l] || G.laneHit[l] > 0.4 ? 1 : 0); c.drawImage(im, laneX(l, 1) - L.lw / 2, L.strikeY - L.lw * 0.35, L.lw, L.lw * 0.7); }
  // particles
  if (!SK.fx) for (const p of POOL) { if (!p.on) continue; p.age += 1 / 60; if (p.age >= p.life) { p.on = false; continue; } const k = 1 - p.age / p.life; p.vy += 900 / 60; p.x += p.vx / 60; p.y += p.vy / 60;
    if (p.gem) { c.globalAlpha = k; Art.gemFast(c, p.gem, p.x, p.y, p.s * 2.4, '#fff', p.col); c.globalAlpha = 1; } else Art.spark(c, p.x, p.y, p.s * k + 1, p.col, k); }
  // pops
  c.textAlign = 'center';
  for (let i = G.pops.length - 1; i >= 0; i--) { const p = G.pops[i]; p.a -= 0.03; if (p.a <= 0) { G.pops.splice(i, 1); continue; } c.globalAlpha = Math.min(1, p.a); c.font = `800 ${p.big ? 32 : 20}px ${FONT}`; c.lineWidth = 5; c.strokeStyle = '#fff'; const yy = p.y - (1 - Math.min(1, p.a)) * 30; c.strokeText(p.txt, p.x, yy); c.fillStyle = p.col; c.fillText(p.txt, p.x, yy); }
  c.globalAlpha = 1;
  // combo meter + multiplier + star power meter (left of highway on wide screens, top otherwise)
  const side = L.cx - L.bw / 2 > 90, mx = side ? L.cx - L.bw / 2 - 50 : 44, my = side ? L.H * 0.62 : Math.max(96, L.H * 0.12), m = mult(), seg = G.combo % 10 / 10;
  c.lineWidth = 8; c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(mx, my, 30, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = m >= 4 ? '#ffd76a' : '#ff4fa3'; c.beginPath(); c.arc(mx, my, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (m >= 4 && !spOn ? 1 : seg)); c.stroke();
  c.font = `800 22px ${FONT}`; c.fillStyle = '#fff'; c.strokeStyle = '#c2186b'; c.lineWidth = 4; c.strokeText('x' + m, mx, my + 8); c.fillText('x' + m, mx, my + 8);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(mx - 30, my + 42, 60, 8); c.fillStyle = spOn ? '#ffd76a' : '#b98cff'; c.fillRect(mx - 30, my + 42, 60 * G.sp, 8);
  if (G.combo >= 3) { c.font = `800 18px ${FONT}`; c.strokeText(G.combo + ' combo', mx, my + 72); c.fillText(G.combo + ' combo', mx, my + 72); }
  // countdown
  if (now < 0) { const n = Math.ceil(-now / (COUNT / 3)); if (n <= 3) { c.font = `800 ${L.lw * 0.9}px ${FONT}`; c.lineWidth = 8; c.strokeStyle = '#ff4fa3'; c.fillStyle = '#fff'; c.strokeText(n, L.cx, L.H * 0.45); c.fillText(n, L.cx, L.H * 0.45); } }
  // mascot
  const ms = Math.min(84, L.H * 0.11); if (!SK.mascot) Art.mascotFast(c, L.cx - L.bw / 2 > ms * 1.2 ? L.cx - L.bw / 2 - ms * 0.6 : L.W - ms * 0.55, L.cx - L.bw / 2 > ms * 1.2 ? L.H * 0.35 : L.H - ms * 0.6, ms, performance.now() < G.moodT ? G.mood : 'idle', S.eq.outfit, T);
  if (G.flash > 0.02) { c.fillStyle = 'rgba(255,120,170,' + (0.15 * G.flash).toFixed(3) + ')'; c.fillRect(0, 0, L.W, L.H); G.flash *= 0.85; }
  if (G.pendingTap) { G.ivl.push(performance.now() - G.pendingTap.perf); G.pendingTap = null; }
  G.ft.push(performance.now() - f0); if (G.ft.length > 8000) { G.ft.splice(0, 4000); G.fi.splice(0, 4000); }
}
function outOfHearts() { pauseGame(true); $('#mOut').classList.add('on'); const mc = $('#mascotOut').getContext('2d'); mc.clearRect(0, 0, 160, 130); Art.mascot(mc, 80, 75, 100, 'oops', S.eq.outfit, 0); }
function pauseGame(noModal) { if (G.paused) return; G.paused = true; G.pauseAt = songTime(); A.ctx().suspend(); if (!noModal) $('#mPause').classList.add('on'); }
function resumeGame() { $('#mPause').classList.remove('on'); $('#mOut').classList.remove('on'); A.ctx().resume().then(() => { clock.off = null; updateClock(); G.paused = false; }); }
$('#pauseBtn').addEventListener('click', () => pauseGame());
$('#resumeBtn').addEventListener('click', resumeGame);
$('#contBtn').addEventListener('click', () => { G.hearts = Infinity; G.practice = true; G.usedPractice = true; G.hudDirty = true; resumeGame(); });
const stopAudio = () => { (G.srcs || []).forEach(s => { try { s.stop(); } catch (e) { } }); G.srcs = []; A.ctx().resume(); A.inGame = false; };
const restart = () => { $('#mPause').classList.remove('on'); $('#mOut').classList.remove('on'); stopAudio(); G.on = false; $('#game').classList.remove('on'); startGame(G.song, G.diff); };
$('#restartBtn').addEventListener('click', restart); $('#outRetry').addEventListener('click', restart);
$('#quitBtn').addEventListener('click', () => { $('#mPause').classList.remove('on'); stopAudio(); quit(); });
$('#outEnd').addEventListener('click', () => { $('#mOut').classList.remove('on'); A.ctx().resume(); finishGame(); });
function quit() { G.on = false; $('#game').classList.remove('on'); go('songs'); }
document.addEventListener('visibilitychange', () => { if (document.hidden && G.on && !G.paused && !G.ended) pauseGame(); });

function finishGame() {
  if (!G.on) return; stopAudio(); G.tiles.forEach(t => { if (t.state === 0) { t.state = 2; G.j.miss++; } }); const n = G.tiles.length, j = G.j, acc = n ? (j.perfect + j.great * 0.85 + j.good * 0.6) / n : 0;
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
window.__tiles = { S: () => S, G: () => G, go, startGame, allSongs, loadCustoms, DB, songTime, judgeAt, finishGame, layout: () => L, laneX, proj, save, openPack, CAL, arrange, rendered, clock, updateClock, prepare, reanalyze };
applyLang(); loadCustoms().then(async () => { go('home');
  const old = customs.filter(c => (c.anv || 1) < AN.VERSION); if (!old.length) return; toast(`✨ Updating ${old.length} of your songs with the new beat finder…`, 2500);
  for (const c of old) { try { const full = await DB.get(c.id); if (full) await reanalyze(full); } catch (e) { console.warn('re-chart failed', e); } }
  await loadCustoms(); if (cur === 'songs') renderSongs(); });
requestAnimationFrame(menuLoop);
window.addEventListener('resize', () => { DPR = Math.min(2, window.devicePixelRatio || 1); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadSW = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(r => r.update()).catch(() => { });
}
})();
