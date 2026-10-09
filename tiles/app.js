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
  theme: [['pinkgold', 'Pink & Gold', 0], ['moon', 'Moonlight', 0], ['ocean', 'Ocean', 0], ['candy', 'Candy', 0], ['galaxy', 'Galaxy', 60], ['rainbow', 'Rainbow', 60], ['festival', 'Bollywood Festival', 100], ['disco', 'Neon Disco', 120], ['rainbowroad', '🌈 Rainbow Road', 150], ['candyk', '🍭 Candy Kingdom', 80], ['neon', '🌃 Neon City Drive', 120], ['reef', '🐠 Underwater Reef', 90], ['volcano', '🌋 Volcano Valley', 110], ['ice', '❄️ Ice Castle', 90], ['jungle', '🌴 Jungle Temple', 100], ['cloudc', '☁️ Cloud Castle', 100]],
  outfit: [['none', 'Just Gigi', 0], ['bow', 'Pink bow', 0], ['tiara', 'Silver tiara', 50], ['glasses', 'Star glasses', 60], ['headphones', 'Headphones', 70], ['garland', 'Marigold garland', 80], ['bindi', 'Sparkle bindi', 40], ['wizard', 'Wizard hat', 100], ['crown', 'Golden crown', 200]]
};
const STICKERS = [['🦄', 'c'], ['🌈', 'c'], ['🍭', 'c'], ['🧁', 'c'], ['🐱', 'c'], ['🐰', 'c'], ['🦋', 'c'], ['🌸', 'c'], ['🍓', 'c'], ['🎀', 'c'], ['🐬', 'c'], ['🌟', 'c'], ['🍩', 'c'], ['🐼', 'c'], ['🌻', 'c'], ['🎈', 'c'], ['🐞', 'c'], ['🍉', 'c'], ['🐧', 'c'], ['🌙', 'c'],
  ['💎', 'r'], ['👸', 'r'], ['🧚', 'r'], ['🪷', 'r'], ['🪔', 'r'], ['🦚', 'r'], ['🎠', 'r'], ['🏰', 'r'], ['🫧', 'r'], ['🪩', 'r'],
  ['👑', 'g'], ['💖', 'g'], ['🏆', 'g'], ['🌠', 'g'], ['🐉', 'g'], ['🪄', 'g']];
const BADGES = [['first', '🎵', 'First song'], ['star3', '🌟', 'First 3 stars'], ['fc', '💯', 'First full combo'], ['crown', '👑', 'First crown'], ['p10', '🔟', '10 songs played'], ['p50', '🎶', '50 songs played'],
  ['combo50', '🔥', '50 combo'], ['combo100', '🚀', '100 combo'], ['hard', '💪', 'Clear a Hard song'], ['custom', '📀', 'Add your own song'], ['streak3', '📅', '3-day gift streak'], ['streak7', '🗓️', '7-day gift streak'],
  ['stick10', '📒', '10 stickers'], ['pu1', '🧲', 'First power-up'], ['puall', '🌟', 'All 6 power-ups'], ['rainbow', '🌈', 'Rainbow Blast!'], ['dodge25', '💨', 'Dodge 25 obstacles'], ['dodgeperfect', '🏎️', 'Dodge 5 + no misses'], ['golden', '✨', 'Golden sticker'], ['shop', '🛍️', 'First shop buy'], ['allstars', '🌌', '50 stars']];

// ---------- state ----------
const def = () => ({ v: 2, coins: 30, best: {}, plays: 0, owned: { skin: ['pinkgem'], glitter: ['pink', 'gold'], frame: ['none', 'silver'], theme: ['pinkgold', 'moon', 'ocean', 'candy'], outfit: ['none', 'bow'] },
  eq: { skin: 'pinkgem', glitter: 'pink', frame: 'silver', outfit: 'bow' }, songTheme: {}, stickers: {}, packs: 1, daily: { last: '', streak: 0 }, badges: {}, maxCombo: 0,
  set: { sound: true, beat: true, missFx: true, vis: 0, calibrated: false, offset: 0, lang: 'en', practice: false, diff: 'easy' } });
let S; try { S = Object.assign(def(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = def(); }
for (const k in def().owned) if (!S.owned[k]) S.owned[k] = def().owned[k];
for (const k of Object.keys(Art.THEMES)) if (!S.owned.theme.includes(k)) S.owned.theme.push(k); // all worlds unlocked
if ((S.v || 1) < 3) { S.v = 3; S.set.speed = S.set.speed || 'slow'; }
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
function go(id) { if (id === 'closet') { shopTab = 'outfit'; id = 'shop'; } if (id === 'worlds') { shopTab = 'theme'; id = 'shop'; } $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); cur = id; menuTheme = 'pinkgold';
  ({ home: renderHome, songs: renderSongs, shop: renderShop, album: renderAlbum, badges: renderBadges, settings: renderSettings, add: resetAdd, lab: () => renderLab() }[id] || (() => { }))(); }
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
  LAB = null; startGame(s, S.set.diff);
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
  segOn('#soundSeg', S.set.sound ? 1 : 0); segOn('#speedSeg', S.set.speed || 'slow'); segOn('#obsSeg', S.set.obstacles !== false ? 1 : 0); segOn('#obsPSeg', S.set.obsPractice ? 1 : 0); segOn('#puSeg', S.set.powerups !== false ? 1 : 0); segOn('#shakeSeg', S.set.shake !== false ? 1 : 0); segOn('#fxSeg', S.set.fxOn !== false ? 1 : 0); segOn('#intSeg', S.set.intensity || 'med'); $('#fxVol').value = Math.round((S.set.fxVol == null ? 0.5 : S.set.fxVol) * 100); segOn('#beatSeg', S.set.missFx !== false ? 1 : 0); $('#visVal').textContent = S.set.vis || 0; segOn('#langSeg', S.set.lang); $('#offRange').value = S.set.offset; $('#offVal').textContent = S.set.offset;
}
[['obsSeg', 'obstacles'], ['obsPSeg', 'obsPractice'], ['puSeg', 'powerups'], ['shakeSeg', 'shake'], ['fxSeg', 'fxOn']].forEach(([id, k]) => $('#' + id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set[k] = b.dataset.v === '1'; save(); renderSettings(); }));
$('#intSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.intensity = b.dataset.v; save(); renderSettings(); });
$('#fxVol').addEventListener('input', e => { S.set.fxVol = +e.target.value / 100; save(); A.init(); A.setFx(S.set.fxOn !== false, S.set.fxVol); });
$('#fxVol').addEventListener('change', () => A.fx('powerup'));
// ---------- test lab ----------
const LABS = { world: null, obs: null, pu: null };
function renderLab() { const w = Object.keys(Art.THEMES), ob = ['bomb', 'car', 'spiky', 'cloud', 'snowball', 'lava', 'crab'], pu = Object.keys(PU);
  const btns = (arr, key, lab) => arr.map(x => `<button class="btn small ${LABS[key] === x ? 'gold' : 'silver'}" data-lab="${key}" data-v="${x}">${lab(x)}</button>`).join('');
  $('#labBody').innerHTML = `<div class="lbl">🌍 World</div><div class="row">${btns(w, 'world', x => Art.THEMES[x].name)}</div><div class="lbl">💣 Obstacle</div><div class="row">${btns(ob, 'obs', x => x)}<button class="btn small ${!LABS.obs ? 'gold' : 'silver'}" data-lab="obs" data-v="">world's own</button></div>
  <div class="lbl">⚡ Power-up</div><div class="row">${btns(pu, 'pu', x => PU[x].e + ' ' + PU[x].name)}<button class="btn small ${!LABS.pu ? 'gold' : 'silver'}" data-lab="pu" data-v="">mix</button></div>
  <div class="lbl">🔊 Effects</div><div class="row">${['powerup', 'poof', 'combo', 'starpower', 'intro', 'fanfare'].map(k => `<button class="btn small silver" data-fx="${k}">${k}</button>`).join('')}</div>
  <div class="row"><button class="btn gold" id="labGo">▶ Preview</button></div>`; }
$('#labBody').addEventListener('click', e => { const b = e.target.closest('[data-lab]'); if (b) { LABS[b.dataset.lab] = b.dataset.v || null; renderLab(); return; } const f = e.target.closest('[data-fx]'); if (f) { A.init(); A.setFx(true, S.set.fxVol == null ? 0.5 : S.set.fxVol); A.fx(f.dataset.fx); return; }
  if (e.target.id === 'labGo') { LAB = { world: LABS.world || 'rainbowroad', obs: LABS.obs, pu: LABS.pu }; startGame(window.TILE_SONGS.find(s => s.id === 'ode'), 'easy'); } });
window.__lab = LABS; window.__renderLab = renderLab;
$('#speedSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.speed = b.dataset.v; save(); renderSettings(); });
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
const cv = $('#cv'), c = cv.getContext('2d'), bcv = $('#bgcv'), bc = bcv.getContext('2d', { alpha: false });
// v2.2: block browser gestures in the game area (scroll, zoom, pull-to-refresh, long-press menu, selection)
['touchstart', 'touchmove', 'touchend'].forEach(ev => $('#game').addEventListener(ev, e => { if (e.target === cv || e.target === bcv) e.preventDefault(); }, { passive: false }));
$('#game').addEventListener('contextmenu', e => e.preventDefault()); document.addEventListener('gesturestart', e => e.preventDefault());
const G = { on: false };
const decoded = new Map(), rendered = new Map();
const DIFF = { easy: { lead: 2.3, gap: 0.4, hearts: 6, mul: 0.85, ramp: 0.06, win: 0.18, great: 0.1, perf: 0.06 },
  normal: { lead: 1.8, gap: 0.25, hearts: 3, mul: 1, ramp: 0.12, win: 0.13, great: 0.065, perf: 0.033 },
  hard: { lead: 1.35, gap: 0, hearts: 3, mul: 1.12, ramp: 0.22, win: 0.09, great: 0.055, perf: 0.028 } };
let LAB = null; const COUNT = 2.0, PAD = 0.35; // countdown seconds; silence at the start of rendered built-in tracks
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
  // merge notes closer than the difficulty's minimum gap into one tile (the tile lands on the first, musically strongest-placed note)
  const groups = []; for (const n of notes) { const g = groups[groups.length - 1]; if (g && D.gap && tOf(n.b) - tOf(g[0].b) < D.gap) g.push(n); else groups.push([n]); }
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
    if (DIFF[diff].gap) { const kept = []; for (const t of tiles) { const p = kept.filter(k => !k.pair).slice(-1)[0]; if (p && !t.pair && t.t - p.t < DIFF[diff].gap) continue; if (t.pair && p && Math.abs(t.t - p.t) > 0.001) continue; kept.push(t); }
      for (let i = 0; i < kept.length - 1; i++) if (kept[i].dur && kept[i].t + kept[i].dur > kept[i + 1].t - DIFF[diff].gap) kept[i].dur = Math.max(0, kept[i + 1].t - DIFF[diff].gap - kept[i].t); tiles.length = 0; tiles.push(...kept); }
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
let STARTING = false;
async function startGame(song, diff) { if (STARTING) return; STARTING = true; try { await startGame0(song, diff); } finally { STARTING = false; } }
async function startGame0(song, diff) {
  LOOP++; G.on = false; (G.srcs || []).forEach(s => { try { s.stop(); } catch (e) { } }); G.srcs = []; // kill any previous loop/audio before starting
  const ctx = A.init(); await ctx.resume(); A.inGame = true;
  if (!ctx.__watch) { ctx.__watch = 1; ctx.addEventListener('statechange', () => { if (ctx.state !== 'running' && G.on && !G.paused && !G.ended) pauseGame(); }); }
  let b; try { loadUI(0.05, 'Loading…'); b = await prepare(song, diff, loadUI); } catch (e) { console.warn(e); $('#mLoad').classList.remove('on'); A.inGame = false; toast('Could not load that song'); return; }
  loadUI(1, 'Ready!');
  const tiles = b.tiles.map((t, i) => ({ ...t, id: i, state: 0, holdP: 0 }));
  let theme = (LAB && LAB.world) || S.songTheme[song.id] || b.theme || song.theme || 'pinkgold';
  Object.assign(G, { on: true, song, diff, D: DIFF[diff], b, tiles, theme, score: 0, combo: 0, maxCombo: 0, hearts: S.set.practice ? Infinity : DIFF[diff].hearts, practice: S.set.practice, usedPractice: S.set.practice,
    j: { perfect: 0, great: 0, good: 0, miss: 0 }, holds: new Map(), press: new Map(), mood: 'idle', moodT: 0, paused: false, ended: false, sp: 0, spUntil: -1, flash: 0, laneFlash: [0, 0, 0, 0], laneHit: [0, 0, 0, 0],
    flares: [0, 0, 0, 0], pu: {}, shield: 0, poofs: [], shake: 0, rainbowFlash: 0, slow: 1, nowS: 0, win: DIFF[diff].win, lead: DIFF[diff].lead, stats: { pu: {}, dodged: 0, rainbow: false }, items: [], lab: LAB, _bi: 0, qLog: [], bgN: 0, bgDirty: true, Q: null, first: 0, hudDirty: true, lastProg: -1, pops: [], ft: [], fi: [], lastFrame: 0, ivl: [], pendingTap: null, nodesAtStart: 0 });
  // build the playback graph ONCE (no nodes are created after this until the song ends)
  const master = A.master(); G.nodes = [];
  if (b.stems.full) { const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(); src.buffer = b.stems.full; lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = 0.5; src.connect(lp); lp.connect(master); G.srcs = [src]; G.muffle = lp; G.duck = null; }
  else { const m = ctx.createBufferSource(), bk = ctx.createBufferSource(), mg = ctx.createGain(); m.buffer = b.stems.mel; bk.buffer = b.stems.back; m.connect(mg); mg.connect(master); bk.connect(master); G.srcs = [m, bk]; G.duck = mg; G.muffle = null; }
  G.lat = b.songOffset || 0; G.startAt = ctx.currentTime + COUNT + 0.1 + G.lat; G.srcs.forEach(s => s.start(G.startAt - G.lat));
  clock.off = null; updateClock();
  $('#mLoad').classList.remove('on'); $('#game').classList.add('on'); $$('.screen').forEach(s => s.classList.remove('on'));
  A.setFx(S.set.fxOn !== false, S.set.fxVol == null ? 0.5 : S.set.fxVol); G.items = buildItems(b, diff); layout(); warmSprites(); setTimeout(() => A.fx('intro'), 300); layout(); updHud(); startLoop();
}
function warmSprites() { try { const sk = S.eq.skin, gl = S.eq.glitter, tw = L.lw * 0.92, th = L.lw * 0.74; for (let i = 0; i < 6; i++) Art.tileImg(sk, gl, S.eq.frame, Art.SHAPE_OF[sk] || Art.MIX[i], tw, th); Art.tileImg('stars', 'gold', S.eq.frame, 'star', tw, th);
  for (const it of G.items) it.kind === 'pu' ? puImg(it.pu) : obsImg(it.ob); for (let l = 0; l < 4; l++) { btnImg(l, 0); btnImg(l, 1); flareImg(l); Art.glowImg(LANECOL[l]); } cloudPuff(); edgeGlow(); Art.scene(G.theme, L.W, L.H, 1, 'hw', h => { h.save(); h.translate(HWX(), 0); h.drawImage(highway(), 0, 0); h.restore(); }); } catch (e) { console.warn(e); } }
function updHud() { $('#hHearts').textContent = G.hearts === Infinity ? '💗 ∞' : '💗'.repeat(Math.max(0, G.hearts)) + '🤍'.repeat(Math.max(0, G.D.hearts - G.hearts)); $('#hScore').textContent = G.score.toLocaleString(); G.hudDirty = false; }
// ---------- layout + perspective highway ----------
let L = {};
let GDPR = 2;
let BDPR = 1;
function fitGame() { const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight, q = G.qual || 0;
  GDPR = Math.max(1, Math.min(window.devicePixelRatio || 1, [2, 1.75, 1.25, 1][q], Math.sqrt([2.0e6, 1.4e6, 1.0e6, 0.75e6][q] / (w * h))));
  BDPR = Math.max(0.5, Math.min(GDPR, [1.25, 1, 0.8, 0.6][q]));
  const cw = Math.round(w * GDPR), ch = Math.round(h * GDPR); if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; G.bgDirty = true; }
  const bw = Math.round(w * BDPR), bh = Math.round(h * BDPR); if (bcv.width !== bw || bcv.height !== bh) { bcv.width = bw; bcv.height = bh; G.bgDirty = true; } return [w, h]; }
function layout() { const [W, H] = fitGame(); if (L.W === W && L.H === H) return; G.bgDirty = true; const bw = Math.min(W * 0.98, H * 1.25, 860), P = 0.9;
  L = { W, H, cx: W / 2, bw, lw: bw / 4, strikeY: H * 0.8, horizonY: H * 0.08, P, sFar: 1 / (1 + P) }; L.span = L.strikeY - L.horizonY; }
const proj = u => { const s = 1 / (1 + L.P * Math.max(-0.12, u)); return [s, L.strikeY - L.span * (1 - s) / (1 - L.sFar)]; };
const laneX = (l, s) => L.cx + (l - 1.5) * L.lw * s;
function laneAt(x, y) { const fr = Math.max(0, Math.min(1, (L.strikeY - L.lw * 0.9 - y) / L.span)), s = 1 - fr * (1 - L.sFar), v = (x - L.cx) / (L.lw * s) + 2; // generous: full-width lanes near the strike line
  return v >= -0.5 && v < 0 ? 0 : v >= 4 && v < 4.5 ? 3 : Math.floor(v); }
const HWX = () => Math.max(0, Math.floor(L.cx - L.bw * 0.62)); const highway = () => Art.spr(`hw|${L.W}|${L.H}|${Art.highwayStyle(G.theme)}`, Math.ceil(L.bw * 1.24), L.H, (h) => { h.translate(-HWX(), 0); const HS = Art.highwayStyle(G.theme);
  const s1 = 1, s0 = L.sFar, y0 = L.horizonY, y1 = L.H, sB = 1 / (1 + L.P * -0.12);
  const pts = [[laneX(-0.5, s0), y0], [laneX(3.5, s0), y0], [L.cx + 2 * L.lw * sB, y1], [L.cx - 2 * L.lw * sB, y1]];
  const g = h.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(40,0,40,.05)'); g.addColorStop(0.6, 'rgba(60,0,50,.32)'); g.addColorStop(1, 'rgba(60,0,50,.45)');
  const surf = { neon: ['rgba(5,0,30,.25)', 'rgba(10,0,40,.75)'], ice: ['rgba(200,235,255,.2)', 'rgba(180,225,255,.65)'], lava: ['rgba(40,5,5,.3)', 'rgba(50,10,5,.8)'], reef: ['rgba(0,60,90,.2)', 'rgba(0,80,110,.55)'], candy: ['rgba(255,190,225,.25)', 'rgba(255,170,215,.65)'], stone: ['rgba(60,70,50,.3)', 'rgba(70,80,55,.75)'], cloud: ['rgba(255,255,255,.25)', 'rgba(255,255,255,.7)'] }[HS];
  if (surf) { g.addColorStop(0, surf[0]); g.addColorStop(1, surf[1]); }
  h.fillStyle = g; h.beginPath(); pts.forEach(([x, y], i) => i ? h.lineTo(x, y) : h.moveTo(x, y)); h.fill();
  if (HS === 'rainbow') ['#ff4d6d', '#ff9f1c', '#ffe14d', '#4ade80', '#38bdf8', '#a78bfa'].forEach((col, i) => { const a0 = -0.5 + i * 4 / 6, a1 = a0 + 4 / 6; h.fillStyle = col; h.globalAlpha = 0.55; h.beginPath(); h.moveTo(laneX(a0, s0), y0); h.lineTo(laneX(a1, s0), y0); h.lineTo(L.cx + (a1 - 1.5) * L.lw * sB, y1); h.lineTo(L.cx + (a0 - 1.5) * L.lw * sB, y1); h.fill(); h.globalAlpha = 1; });
  if (HS === 'lava') { h.strokeStyle = 'rgba(255,120,0,.7)'; h.lineWidth = 2; for (let i = 0; i < 14; i++) { const u = i / 14, s = 1 / (1 + L.P * u), y = L.strikeY - L.span * (1 - s) / (1 - L.sFar); h.beginPath(); h.moveTo(laneX(-0.3 + (i % 4), s), y); h.lineTo(laneX(0.2 + (i % 4), s), y + 8 * s); h.stroke(); } }
  if (HS === 'rainbow' || HS === 'neon') for (let i = 0; i < 16; i++) { const u = i / 16, s = 1 / (1 + L.P * u), y = L.strikeY - L.span * (1 - s) / (1 - L.sFar); [-0.5, 3.5].forEach(a => { h.fillStyle = HS === 'neon' ? '#3dfcff' : ['#ff4d6d', '#ffe14d', '#38bdf8'][i % 3]; h.beginPath(); h.arc(laneX(a, s), y, 4 * s + 1, 0, 7); h.fill(); }); }
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
let DT = 1 / 60, BGSTEP = 2; const RB5 = ['#ff6b9e', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
const POOL = Array.from({ length: 140 }, () => ({ on: false })); let poolI = 0;
function emit(x, y, n, big) { const GL = Art.GLITTER[G.spUntil > 0 ? 'gold' : S.eq.glitter], shape = Art.SHAPE_OF[S.eq.skin] || 'heart';
  if ((G.qual || 0) >= 2) n = Math.ceil(n / 2); for (let i = 0; i < n; i++) { const p = POOL[poolI = (poolI + 1) % POOL.length], a = Math.random() * Math.PI * 2, v = (big ? 220 : 120) + Math.random() * 260;
    p.on = true; p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 160; p.age = 0; p.life = 0.45 + Math.random() * 0.35; p.s = 3 + Math.random() * 7; p.col = GL[i % GL.length]; p.gem = i % 5 === 0 ? (i % 10 === 0 ? 'star' : shape) : null; } }
// ---------- judging ----------
const mult = () => Math.min(4, 1 + Math.floor(G.combo / 10)) * (G.spUntil > 0 ? 2 : 1) * (G.pu.double > G.nowS ? 2 : 1);
function hitTile(t, dt, pid) {
  const a = Math.abs(dt), j = a <= G.D.perf ? 'perfect' : a <= G.D.great ? 'great' : 'good';
  G.j[j]++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); G.score += { perfect: 100, great: 70, good: 40 }[j] * mult(); t.judge = j; t.dt = dt;
  G.laneHit[t.lane] = 1; G.flares[t.lane] = 1; emit(laneX(t.lane, 1), L.strikeY, j === 'perfect' ? 16 : 10, j === 'perfect');
  if (G.pops.length > 5) G.pops.shift(); G.pops.push({ x: laneX(t.lane, 1), y: L.strikeY - L.lw * 0.6, txt: j === 'perfect' ? 'Perfect!' : j === 'great' ? 'Great!' : 'Good', a: 1, col: j === 'perfect' ? '#ff4fa3' : j === 'great' ? '#a66bff' : '#3aa0d8' });
  if (G.spUntil < 0) { G.sp = Math.min(1, G.sp + (j === 'perfect' ? 0.045 : 0.03)); }
  if (t.dur > 0) { t.state = 3; G.holds.set(pid, t); } else t.state = 1;
  if ([10, 25, 50, 75, 100, 150, 200].includes(G.combo)) { G.mood = 'wow'; G.moodT = performance.now() + 1400; G.pops.push({ x: L.cx, y: L.H * 0.3, txt: `${G.combo} combo!`, a: 1.5, big: 1, col: '#ff4fa3' }); firework(G.combo >= 50 ? 4 : 2); A.fx('combo'); if (G.combo >= 25) G.shake = Math.max(G.shake, 0.5); }
  else if (G.combo % 5 === 0) { G.mood = 'happy'; G.moodT = performance.now() + 600; }
  if (G.diff === 'easy' && G.combo % 15 === 0 && G.hearts !== Infinity && G.hearts < G.D.hearts) { G.hearts++; G.pops.push({ x: L.cx, y: L.H * 0.45, txt: '💗 +1', a: 1.2, col: '#ff4fa3' }); } // Easy: streaks heal
  G.hudDirty = true; if (pid !== -1) G.pendingTap = G.pendingTap || { perf: G.tapPerf };
}
function missTile(t, now) {
  t.state = 2; G.j.miss++; G.combo = 0; G.mood = 'oops'; G.moodT = performance.now() + 800; G.flash = 1; G.hudDirty = true;
  if (S.set.missFx !== false) { const ctx = A.ctx(), n = ctx.currentTime; // subtle GH-style miss: duck the melody stem / muffle the track (~200 ms). Param automation only, no new nodes.
    if (G.duck) { const g = G.duck.gain; g.cancelScheduledValues(n); g.setValueAtTime(g.value, n); g.linearRampToValueAtTime(0.35, n + 0.03); g.linearRampToValueAtTime(1, n + 0.25); }
    if (G.muffle) { const f = G.muffle.frequency; f.cancelScheduledValues(n); f.setValueAtTime(f.value, n); f.exponentialRampToValueAtTime(900, n + 0.03); f.exponentialRampToValueAtTime(20000, n + 0.28); } }
  if (G.shield > 0 && !t.pair) { G.shield--; G.pops.push({ x: L.cx, y: L.H * 0.4, txt: '🛡️ Saved!', a: 1.2, col: '#3aa0d8' }); G.combo = 0; return; }
  if (G.hearts !== Infinity && !t.pair) { G.hearts--; if (G.hearts <= 0) outOfHearts(); }
}
// input: pointerdown (no click delay), multi-touch, judged at the event's own timestamp mapped to the audio clock
cv.addEventListener('pointerdown', e => {
  if (!G.on || G.paused || G.ended) return; if (e.pointerType === 'mouse' && e.button !== 0) return; try { cv.setPointerCapture(e.pointerId); } catch (_) { }
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, lane = laneAt(x, y); if (lane < 0 || lane > 3) return;
  const perf = perfOf(e), now = judgeAt(perf); G.press.set(e.pointerId, lane); G.tapPerf = perf;
  let best = null, bd = 1e9; for (let i = G.first; i < G.tiles.length; i++) { const t = G.tiles[i]; if (t.t - now > G.win) break; if (t.state || t.lane !== lane) continue; const d = Math.abs(now - t.t); if (d <= G.win && d < bd) { bd = d; best = t; } }
  if (!best) { const fr = Math.max(0, Math.min(1, (L.strikeY - L.lw * 0.9 - y) / L.span)), s = 1 - fr * (1 - L.sFar), v = (x - L.cx) / (L.lw * s) + 2, f = v - Math.floor(v), nb = f < 0.3 ? lane - 1 : f > 0.7 ? lane + 1 : -1;
    if (nb >= 0 && nb <= 3) for (let i = G.first; i < G.tiles.length; i++) { const t = G.tiles[i]; if (t.t - now > G.win) break; if (t.state || t.lane !== nb) continue; const d = Math.abs(now - t.t); if (d <= G.win * 0.8 && d < bd) { bd = d; best = t; } }
    if (best) G.press.set(e.pointerId, best.lane); }
  let it = null; if (!best) for (const x of G.items) { if (x.t - now > G.win) break; if (!x.state && x.lane === lane && Math.abs(x.t - now) <= G.win * (x.kind === 'obs' ? 0.7 : 1.3)) { it = x; break; } }
  if (best) hitTile(best, now - best.t, e.pointerId); else if (it) { if (it.kind === 'pu') collect(it); else hitObstacle(it); } else { G.laneFlash[lane] = 0.6; if (G.diff === 'hard') { G.combo = 0; G.hudDirty = true; } }
}, { passive: true });
const endHold = e => { G.press.delete(e.pointerId); const t = G.holds.get(e.pointerId); if (!t) return; G.holds.delete(e.pointerId); if (t.holdP >= 0.85) { t.holdP = 1; G.score += 50 * mult(); emit(laneX(t.lane, 1), L.strikeY, 12, true); } t.state = 1; };
cv.addEventListener('pointerup', endHold, { passive: true }); cv.addEventListener('pointercancel', endHold, { passive: true });
// ---------- v2b: power-ups, obstacles, immersive reactions ----------
const PU = { magnet: { e: '🧲', col: '#ff4fa3', name: 'Magnet', dur: 5 }, shield: { e: '🛡️', col: '#5ad1ff', name: 'Shield', dur: 0 }, slowmo: { e: '🐢', col: '#9ff0c8', name: 'Slow-Mo', dur: 6 },
  double: { e: '✖️2', col: '#ffd76a', name: 'Double Points', dur: 8 }, rainbow: { e: '🌈', col: '#b98cff', name: 'Rainbow Blast', dur: 0 }, heart: { e: '💗', col: '#ff7cb8', name: 'Heart', dur: 0 } };
const OBS = ['bomb', 'car', 'spiky', 'cloud'];
const puImg = k => Art.spr('pu|' + k, 120, 120, (p) => { const g = p.createRadialGradient(60, 60, 4, 60, 60, 58); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, PU[k].col); g.addColorStop(1, PU[k].col + '00'); p.fillStyle = g; p.fillRect(0, 0, 120, 120);
  p.fillStyle = '#fff'; p.beginPath(); p.arc(60, 60, 34, 0, 7); p.fill(); p.lineWidth = 6; p.strokeStyle = PU[k].col; p.stroke(); p.font = '800 36px sans-serif'; p.textAlign = 'center'; p.textBaseline = 'middle'; p.fillStyle = '#5a1747'; p.fillText(PU[k].e, 60, 62);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; Art.sparkle(p, 60 + Math.cos(a) * 46, 60 + Math.sin(a) * 46, 7, '#fff'); } });
const obsImg = k => Art.spr('ob|' + k, 128, 128, (o) => { const g = o.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, 'rgba(255,40,40,.55)'); g.addColorStop(1, 'rgba(255,40,40,0)'); o.fillStyle = g; o.fillRect(0, 0, 128, 128); // warning glow
  o.lineWidth = 4; o.strokeStyle = '#2b0a1e';
  if (k === 'bomb') { o.fillStyle = '#2d2d3a'; o.beginPath(); o.arc(60, 70, 32, 0, 7); o.fill(); o.fillStyle = '#555'; o.fillRect(52, 32, 18, 10); o.strokeStyle = '#a0522d'; o.beginPath(); o.moveTo(61, 32); o.quadraticCurveTo(70, 14, 86, 18); o.stroke(); o.fillStyle = '#fff'; o.beginPath(); o.arc(50, 62, 7, 0, 7); o.arc(70, 62, 7, 0, 7); o.fill(); o.fillStyle = '#000'; o.beginPath(); o.arc(52, 64, 3, 0, 7); o.arc(72, 64, 3, 0, 7); o.fill(); o.strokeStyle = '#fff'; o.beginPath(); o.arc(60, 84, 8, 3.6, 5.8); o.stroke(); }
  if (k === 'car') { o.fillStyle = '#ff3b3b'; Art.rr(o, 22, 50, 84, 34, 12); o.fill(); o.stroke(); o.fillStyle = '#ffd1d1'; Art.rr(o, 40, 36, 46, 24, 8); o.fill(); o.fillStyle = '#222'; [38, 90].forEach(x => { o.beginPath(); o.arc(x, 88, 11, 0, 7); o.fill(); }); o.fillStyle = '#fff7a8'; o.fillRect(100, 58, 8, 10); o.fillStyle = '#fff'; o.font = '800 18px sans-serif'; o.fillText('7', 58, 76); }
  if (k === 'spiky') { o.fillStyle = '#8a3ffc'; o.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 26 : 42; o.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } o.closePath(); o.fill(); o.stroke(); o.fillStyle = '#fff'; o.beginPath(); o.arc(55, 58, 7, 0, 7); o.arc(73, 58, 7, 0, 7); o.fill(); o.fillStyle = '#000'; o.beginPath(); o.arc(55, 60, 3, 0, 7); o.arc(73, 60, 3, 0, 7); o.fill(); o.strokeStyle = '#000'; o.beginPath(); o.moveTo(48, 50); o.lineTo(60, 54); o.moveTo(80, 50); o.lineTo(68, 54); o.stroke(); }
  if (k === 'snowball') { o.fillStyle = '#ffffff'; o.beginPath(); o.arc(64, 66, 34, 0, 7); o.fill(); o.strokeStyle = '#9ccfff'; o.stroke(); o.fillStyle = '#2b0a1e'; o.beginPath(); o.arc(54, 60, 4, 0, 7); o.arc(74, 60, 4, 0, 7); o.fill(); o.fillStyle = '#ff8a2a'; o.beginPath(); o.moveTo(64, 66); o.lineTo(84, 70); o.lineTo(64, 72); o.fill(); }
  if (k === 'lava') { o.fillStyle = '#ff5a00'; o.beginPath(); o.moveTo(30, 96); o.quadraticCurveTo(28, 40, 64, 30); o.quadraticCurveTo(100, 40, 98, 96); o.closePath(); o.fill(); o.fillStyle = '#ffd23f'; o.beginPath(); o.arc(52, 70, 9, 0, 7); o.arc(78, 58, 6, 0, 7); o.fill(); o.fillStyle = '#2b0a1e'; o.beginPath(); o.arc(56, 56, 4, 0, 7); o.arc(74, 56, 4, 0, 7); o.fill(); }
  if (k === 'crab') { o.fillStyle = '#ff4d4d'; o.beginPath(); o.ellipse(64, 72, 34, 22, 0, 0, 7); o.fill(); o.stroke(); [[26, 50], [102, 50]].forEach(([x, y]) => { o.beginPath(); o.arc(x, y, 12, 0.3, 5.9); o.lineTo(x, y); o.fill(); o.stroke(); }); o.fillStyle = '#fff'; o.beginPath(); o.arc(54, 50, 7, 0, 7); o.arc(74, 50, 7, 0, 7); o.fill(); o.fillStyle = '#000'; o.beginPath(); o.arc(54, 50, 3, 0, 7); o.arc(74, 50, 3, 0, 7); o.fill(); }
  if (k === 'cloud') { o.fillStyle = '#6b7280'; o.beginPath(); o.arc(64, 60, 26, 0, 7); o.arc(40, 70, 20, 0, 7); o.arc(88, 70, 20, 0, 7); o.fill(); o.fillStyle = '#ffe14d'; o.beginPath(); o.moveTo(62, 84); o.lineTo(52, 108); o.lineTo(64, 104); o.lineTo(58, 124); o.lineTo(78, 96); o.lineTo(66, 98); o.lineTo(72, 84); o.fill(); o.fillStyle = '#fff'; o.beginPath(); o.arc(54, 62, 5, 0, 7); o.arc(74, 62, 5, 0, 7); o.fill(); o.strokeStyle = '#111'; o.beginPath(); o.moveTo(46, 52); o.lineTo(58, 57); o.moveTo(82, 52); o.lineTo(70, 57); o.stroke(); } });
let OB_SET = OBS;
function buildItems(b, diff) {
  if (G.lab) { const it = []; let k = 0; for (let t = 2.5; t < b.end - 1; t += 1.6, k++) { const lane = k % 4; if (G.tiles.some(n => n.lane === lane && Math.abs(n.t - t) < 0.35)) continue; it.push(k % 2 ? { t, lane, kind: 'obs', ob: G.lab.obs || ((Art.THEMES[G.theme] || {}).obs || OBS)[k % 2], state: 0 } : { t, lane, kind: 'pu', pu: G.lab.pu || Object.keys(PU)[k % 6], state: 0 }); } return it; }
  const items = [], notes = G.tiles, beats = (b.beatTimes || []).map(x => x[0]).filter(t => t > 1.5 && t < b.end - 2);
  const free = (t, lane, pad) => !notes.some(n => n.lane === lane && t > n.t - pad && t < n.t + (n.dur || 0) + pad) && !items.some(i => Math.abs(i.t - t) < 0.6);
  let rs = 7; const R = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  // power-ups on beats every ~10-14 s
  const kinds = Object.keys(PU); let nextP = 6 + R() * 4;
  if (S.set.powerups !== false) for (const t of beats) if (t >= nextP) { const lanes = [0, 1, 2, 3].filter(l => free(t, l, 0.35)); if (lanes.length) { items.push({ t, lane: lanes[Math.floor(R() * lanes.length)], kind: 'pu', pu: kinds[Math.floor(R() * kinds.length)], state: 0 }); nextP = t + (diff === 'easy' ? 9 : 12) + R() * 4; } }
  const obsOn = S.set.obstacles !== false && (!G.practice || S.set.obsPractice);
  if (obsOn) { const per10 = diff === 'easy' ? 0.5 : diff === 'normal' ? 1.6 : 2.6; let nextO = 5 + R() * 3;
    for (let i = 0; i < beats.length - 1; i++) { const t = (beats[i] + beats[i + 1]) / 2; if (t < nextO) continue; // between beats, off the notes
      const lanes = [0, 1, 2, 3].filter(l => free(t, l, diff === 'easy' ? 0.5 : 0.4)); if (!lanes.length) continue;
      items.push({ t, lane: lanes[Math.floor(R() * lanes.length)], kind: 'obs', ob: (OB_SET = (Art.THEMES[G.theme] || {}).obs || OBS, (G.lab && G.lab.obs) || OB_SET[Math.floor(R() * OB_SET.length)]), state: 0 }); nextO = t + 10 / per10 * (0.7 + R() * 0.6); } }
  return items.sort((a, b) => a.t - b.t);
}
const WHOOSH = { buf: null };
function whoosh() { A.fx('powerup'); return; const ctx = A.ctx(); if (!WHOOSH.buf) { const n = Math.round(ctx.sampleRate * 0.35); WHOOSH.buf = ctx.createBuffer(1, n, ctx.sampleRate); const d = WHOOSH.buf.getChannelData(0); let y = 0;
    for (let i = 0; i < n; i++) { const x = i / n; y = y * 0.92 + (Math.random() * 2 - 1) * 0.08; d[i] = y * Math.sin(Math.PI * x) * 0.9; } }
  const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = WHOOSH.buf; g.gain.value = 0.18; s.connect(g); g.connect(A.master()); s.start(); }
function collect(it) {
  it.state = 1; const k = it.pu, P = PU[k], now = G.nowS; G.stats.pu[k] = (G.stats.pu[k] || 0) + 1; whoosh(); G.shake = 0.4;
  G.pops.push({ x: L.cx, y: L.H * 0.34, txt: P.e + ' ' + P.name + '!', a: 1.6, big: 1, col: P.col }); emit(laneX(it.lane, 1), L.strikeY, 18, true);
  if (k === 'shield') G.shield = Math.min(5, G.shield + 3); else if (k === 'heart') { if (G.hearts !== Infinity) G.hearts = Math.min(G.D.hearts, G.hearts + 1); G.hudDirty = true; }
  else if (k === 'rainbow') { let n = 0; for (let i = G.first; i < G.tiles.length; i++) { const t = G.tiles[i]; if (t.t - now > G.lead) break; if (!t.state && !t.dur) { t.state = 1; n++; G.j.perfect++; G.combo++; emit(laneX(t.lane, 0.8), L.H * 0.5, 4); } }
    G.maxCombo = Math.max(G.maxCombo, G.combo); G.score += 300 + n * 150; G.rainbowFlash = 1; G.stats.rainbow = true; }
  else G.pu[k] = Math.min(now + P.dur * 2, Math.max(now, G.pu[k] || 0) + P.dur);
}
function hitObstacle(it) {
  A.fx('poof'); it.state = 2; G.poofs.push({ x: laneX(it.lane, 1), y: L.strikeY - L.lw * 0.4, a: 1 }); G.shake = 0.7;
  if (G.shield > 0) { G.shield--; G.pops.push({ x: L.cx, y: L.H * 0.4, txt: '🛡️ Blocked!', a: 1.2, col: '#3aa0d8' }); return; }
  G.combo = 0; G.flash = 1; G.mood = 'oops'; G.moodT = performance.now() + 900; G.pops.push({ x: laneX(it.lane, 1), y: L.strikeY - L.lw, txt: 'Poof! 💨', a: 1.3, col: '#6b7280' });
  if (G.hearts !== Infinity && !(G.diff === 'easy' && G.hearts <= 1)) { G.hearts--; G.hudDirty = true; if (G.hearts <= 0) outOfHearts(); } // Easy: an obstacle never takes the last heart
}
function updItems(jnow) {
  for (const it of G.items) { if (it.t > jnow + 0.2) break; if (it.state) continue; const late = jnow - it.t;
    if (it.kind === 'obs' && late > G.win) { it.state = 3; G.stats.dodged++; G.score += 50; A.fx('dodge'); G.pops.push({ x: laneX(it.lane, 1), y: L.strikeY - L.lw * 0.8, txt: 'Dodged! +50', a: 1, col: '#22a37f' }); }
    if (it.kind === 'pu' && late > G.win) it.state = 3; }
}
function drawItems(vnow, lead, T) {
  for (const it of G.items) { const u = (it.t - vnow) / lead; if (u > 1.02) break; if (it.state === 1 || it.state === 2 || u < -0.15) continue;
    const [s, y] = proj(u), sz = L.lw * 0.8 * s, x = laneX(it.lane, s) + (it.ob === 'car' ? Math.sin(T * 30) * 2 : 0), bob = it.kind === 'pu' ? Math.sin(T * 6) * 4 * s : 0;
    c.drawImage(it.kind === 'pu' ? puImg(it.pu) : obsImg(it.ob), x - sz / 2, y - sz * 0.75 + bob, sz, sz);
    if (it.ob === 'bomb') Art.spark(c, x + sz * 0.17, y - sz * 0.62, 6 * s * (1 + 0.5 * Math.sin(T * 25)), '#ffd76a', 1); // fuse spark
    if (it.ob === 'car') { c.globalAlpha = 0.5; c.fillStyle = '#fff'; c.fillRect(x - sz * 0.05, y - sz * 0.95, sz * 0.1, sz * 0.25 * s); c.globalAlpha = 1; } }
  for (let i = G.poofs.length - 1; i >= 0; i--) { const p = G.poofs[i]; p.a -= 2.4 * DT; if (p.a <= 0) { G.poofs.splice(i, 1); continue; } c.globalAlpha = p.a; c.drawImage(cloudPuff(), p.x - 60 * (2 - p.a), p.y - 40 * (2 - p.a), 120 * (2 - p.a), 80 * (2 - p.a)); c.globalAlpha = 1; }
}
const cloudPuff = () => Art.spr('puff', 120, 80, p => { p.fillStyle = '#eef'; p.beginPath(); p.arc(60, 44, 26, 0, 7); p.arc(34, 50, 20, 0, 7); p.arc(86, 50, 20, 0, 7); p.arc(60, 26, 18, 0, 7); p.fill(); });
// power-up HUD timers (top right, under the score)
function drawPuHud(now) { let y = 74; c.textAlign = 'left';
  const row = (e, frac, col) => { const x = L.W - 132; c.fillStyle = 'rgba(255,255,255,.85)'; Art.rr(c, x, y, 120, 34, 17); c.fill(); c.font = `800 18px ${FONT}`; c.fillStyle = '#5a1747'; c.fillText(e, x + 8, y + 24); c.fillStyle = col; c.fillRect(x + 44, y + 13, 68 * Math.max(0, Math.min(1, frac)), 8); y += 40; };
  for (const k in G.pu) { const left = G.pu[k] - now; if (left > 0) row(PU[k].e, left / PU[k].dur, PU[k].col); }
  if (G.shield > 0) row('🛡️×' + G.shield, 1, '#5ad1ff'); c.textAlign = 'center'; }
// immersive extras: skyline/parallax silhouettes with beat lights, combo fireworks, star-power rays, edge glow
const skyline = (theme, W, H) => Art.spr(`sky|${theme}|${W}|${H}`, W * 1.5, H * 0.32, (k, w, h) => {
  const col = { disco: '#1a0533', moon: '#2b2d6e', galaxy: '#140733', ocean: '#03305a', festival: '#5a0c18', candy: '#ffb3d9', rainbow: '#9fd8ff', pinkgold: '#ff8cc6' }[theme] || '#5a1747';
  k.fillStyle = col; let x = 0, i = 0; while (x < w) { const bw = 30 + ((i * 37) % 50), bh = h * (0.35 + ((i * 53) % 60) / 100); if (theme === 'ocean' || theme === 'candy' || theme === 'rainbow' || theme === 'pinkgold') { k.beginPath(); k.arc(x + bw / 2, h, bw * 0.9, Math.PI, 0); k.fill(); } else k.fillRect(x, h - bh, bw, bh); x += bw + 4; i++; } });
const lights = (theme, W, H) => Art.spr(`lights|${theme}|${W}|${H}`, W * 1.5, H * 0.32, (k, w, h) => { let x = 0, i = 0; while (x < w) { const bw = 30 + ((i * 37) % 50), bh = h * (0.35 + ((i * 53) % 60) / 100);
  for (let yy = h - bh + 8; yy < h - 6; yy += 12) for (let xx = x + 5; xx < x + bw - 5; xx += 9) if (((xx * 7 + yy * 3) | 0) % 5 < 2) { k.fillStyle = ['#ffe066', '#ff7ce0', '#7dfcff'][(xx + yy) % 3]; k.fillRect(xx, yy, 4, 5); } x += bw + 4; i++; } });
const edgeGlow = () => Art.spr(`edge|${L.W}|${L.H}`, L.W / 2, L.H / 2, (e, w, h) => { const g = e.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)'); e.fillStyle = g; e.fillRect(0, 0, w, h); });
const edgeTint = col => Art.spr(`edgeT|${col}|${L.W}|${L.H}`, L.W / 2, L.H / 2, (e, w, h) => { e.drawImage(edgeGlow(), 0, 0); e.globalCompositeOperation = 'source-in'; e.fillStyle = col; e.fillRect(0, 0, w, h); });
const rays = () => Art.spr('rays', 512, 512, r => { r.translate(256, 256); for (let i = 0; i < 16; i++) { r.rotate(Math.PI / 8); r.fillStyle = i % 2 ? 'rgba(255,215,106,.35)' : 'rgba(255,255,255,.18)'; r.beginPath(); r.moveTo(0, 0); r.lineTo(-30, -256); r.lineTo(30, -256); r.fill(); } });
const FW = Array.from({ length: 60 }, () => ({ on: false }));
function firework(n) { if ((G.qual || 0) >= 3) return; for (let k = 0; k < n; k++) { const cx = L.W * (0.15 + Math.random() * 0.7), cy = L.H * (0.12 + Math.random() * 0.25), col = ['#ff4fa3', '#ffd76a', '#7dfcff', '#b98cff', '#9ff0c8'][k % 5];
  for (let i = 0; i < 12; i++) { const p = FW.find(f => !f.on); if (!p) return; const a = i / 12 * Math.PI * 2; Object.assign(p, { on: true, x: cx, y: cy, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, age: 0, col }); } } }
function drawImmersive(T, beat, energy, spOn, back, cx) { const c = cx || window.__gc;
  const pulse = Math.pow(1 - (beat % 1 + 1) % 1, 3);
  if (back) { const city = G.theme === 'neon' || G.theme === 'disco'; if (city) { const sk = skyline(G.theme, L.W, L.H), off = -((T * 12) % (L.W * 0.5)), y = L.H * 0.68 - pulse * 3; c.globalAlpha = 0.55; c.drawImage(sk, off, y); c.globalAlpha = 0.25 + 0.6 * pulse * (0.5 + energy); c.drawImage(lights(G.theme, L.W, L.H), off, y); c.globalAlpha = 1; }
    if (spOn) { c.save(); c.translate(L.cx, L.H * 0.3); c.rotate(T * 0.4); const R = Math.max(L.W, L.H); c.drawImage(rays(), -R, -R, R * 2, R * 2); c.restore(); }
    for (const p of FW) { if (!p.on) continue; p.age += DT * BGSTEP; if (p.age > 1.1) { p.on = false; continue; } p.vy += 60 * DT * BGSTEP; p.x += p.vx * DT * BGSTEP; p.y += p.vy * DT * BGSTEP; Art.spark(c, p.x, p.y, 4, p.col, 1 - p.age / 1.1); }
    return; }
  const col = spOn ? '#ffd76a' : G.pu.double > G.nowS ? '#ffd76a' : G.shield > 0 ? '#5ad1ff' : (Art.THEMES[G.theme] || {}).ui || '#ff4fa3';
  c.globalAlpha = Math.min(0.9, 0.18 + 0.35 * pulse * (0.4 + energy) + (spOn ? 0.25 : 0)); c.drawImage(edgeTint(col), 0, 0, L.W, L.H); c.globalAlpha = 1;
}

// ---------- frame ----------
let FONT = '', F32, F20, F22, F18; const DOWN = [0, 0, 0, 0];
let LOOP = 0, LOOPS = 0; // exactly one gameplay rAF loop at a time
function startLoop() { const id = ++LOOP; LOOPS++; const step = ts => { if (id !== LOOP || !G.on) { LOOPS--; return; } requestAnimationFrame(step); frame(ts); }; requestAnimationFrame(step); }
function autoQuality(dtMs) { // adaptive quality: drop on sustained long frames, recover after a calm stretch
  const Q = G.Q || (G.Q = { base: 16.7, ema: 16.7, bad: 0, good: 0, mins: [] }); if (G.paused || dtMs > 250) return;
  Q.mins.push(dtMs); if (Q.mins.length > 120) Q.mins.shift(); if (Q.mins.length >= 30) { const s = Q.mins.slice().sort((a, b) => a - b); Q.base = Math.max(6, s[Math.floor(s.length * 0.1)]); }
  Q.ema += (dtMs - Q.ema) * 0.1; if (Q.ema > Q.base * 1.3) { Q.bad += dtMs; Q.good = 0; } else if (Q.ema < Q.base * 1.08) { Q.good += dtMs; Q.bad = 0; }
  if (Q.bad > 700 && (G.qual || 0) < 3) { G.qual = (G.qual || 0) + 1; Q.bad = 0; Q.hold = Math.min(60000, (Q.hold || 5000) * 2); Q.ema = Q.base; G.bgDirty = true; G.qLog.push(['down', G.qual, Math.round(G.nowS)]); }
  if (Q.good > (Q.hold || 5000) && (G.qual || 0) > (G.qMin || 0)) { G.qual--; Q.good = 0; G.bgDirty = true; G.qLog.push(['up', G.qual, Math.round(G.nowS)]); } }
function finishTail(now) { if (G.pendingTap) { G.ivl.push(performance.now() - G.pendingTap.perf); G.pendingTap = null; } }
function frame(ts) {
  const f0 = performance.now(); if (G.lastFrame) { const d = ts - G.lastFrame; G.fi.push(d); DT = Math.min(0.05, Math.max(0.001, d / 1000)); if (S.set.autoQ !== false) autoQuality(d); } G.lastFrame = ts; layout();
  if (!G.paused) updateClock();
  const T = ts / 1000, now = G.paused ? G.pauseAt : songAt(f0), jnow = now - S.set.offset / 1000, vnow = now + (S.set.vis || 0) / 1000, lead0 = G.D.lead * ({ slow: 1, normal: 0.82, fast: 0.66 }[S.set.speed || 'slow'] || 1);
  G.nowS = now; G.slow += ((G.pu.slowmo > now ? 1.5 : 1) - G.slow) * 0.06; const lead = lead0 * G.slow; G.lead = lead; G.win = G.D.win * (G.pu.slowmo > now ? 1.4 : 1);
  if (!FONT) { FONT = getComputedStyle(document.body).fontFamily; F32 = `800 32px ${FONT}`; F20 = `800 20px ${FONT}`; F22 = `800 22px ${FONT}`; F18 = `800 18px ${FONT}`; }
  if (!G.paused) {
    while (G.first < G.tiles.length && G.tiles[G.first].state && G.tiles[G.first].state !== 3 && G.tiles[G.first].t < jnow - 1) G.first++;
    for (let i = G.first; i < G.tiles.length; i++) { const t = G.tiles[i]; if (t.t > jnow + 0.2) break;
      if (t.state === 0 && G.pu.magnet > now && !t.dur && jnow >= t.t) { hitTile(t, 0, -1); continue; }
      if (t.state === 0 && jnow - t.t > G.win) missTile(t, jnow);
      else if (t.state === 3) { t.holdP = Math.min(1, (jnow - t.t) / t.dur); G.score += mult(); G.hudDirty = true; if (t.holdP >= 1) { t.state = 1; for (const [k, v] of G.holds) if (v === t) G.holds.delete(k); G.score += 50 * mult(); emit(laneX(t.lane, 1), L.strikeY, 12, true); } } }
    updItems(jnow);
    if (G.sp >= 1 && G.spUntil < 0) { G.spUntil = now + 8; G.sp = 1; G.pops.push({ x: L.cx, y: L.H * 0.38, txt: '⭐ STAR POWER ⭐', a: 1.8, big: 1, col: '#d4a017' }); A.fx('starpower'); firework(5); G.shake = 0.6; }
    if (G.spUntil > 0) { G.sp = Math.max(0, (G.spUntil - now) / 8); if (now > G.spUntil) { G.spUntil = -1; G.sp = 0; } }
    const prog = Math.max(0, Math.min(1, now / G.b.end)); if (Math.abs(prog - G.lastProg) > 0.004) { $('#prog').style.transform = `scaleX(${prog.toFixed(3)})`; G.lastProg = prog; }
    if (now > G.b.end && !G.ended) { G.ended = true; const tok = LOOP; setTimeout(() => { if (tok === LOOP) finishGame(); }, 250); }
  }
  if (G.hudDirty) updHud();
  // beat phase (drives background pulse/speed)
  let beat = Math.max(0, now) * (G.b.bpm || 100) / 60; const bt = G.b.beatTimes; if (bt && bt.length > 1) { let i = Math.min(G._bi || 0, bt.length - 2); while (i < bt.length - 1 && bt[i + 1][0] <= now) i++; while (i > 0 && bt[i][0] > now) i--; G._bi = i; if (bt[i + 1] && now >= bt[0][0]) beat = i + Math.min(1, (now - bt[i][0]) / (bt[i + 1][0] - bt[i][0])); }
  const SK = window.__skip || {}; const shk = G.shake > 0.02 ? G.shake * 6 : 0; G.shake *= Math.pow(0.88, DT * 60); const sx = shk ? (Math.random() - 0.5) * shk : 0, sy = shk ? (Math.random() - 0.5) * shk : 0;
  const spOn = G.spUntil > 0, energy = G.b.energy != null ? G.b.energy : 0.5;
  // background layer (separate low-res canvas, redrawn at 30 fps or less; the compositor stacks it under the gameplay layer)
  BGSTEP = [2, 2, 4, 1e9][G.qual || 0]; if (G.bgSp !== spOn) { G.bgSp = spOn; G.bgDirty = true; } G.bgN = (G.bgN || 0) + 1;
  if (!SK.nobg && (G.bgDirty || G.bgN % BGSTEP === 0)) { G.bgDirty = false; const q = G.qual || 0; Art.intensity = { low: 0.4, med: 0.75, high: 1.2 }[S.set.intensity || 'med'] * [1, 0.7, 0.5, 0.3][q];
    bc.setTransform(BDPR, 0, 0, BDPR, 0, 0); bc.drawImage(Art.scene(G.theme, L.W, L.H, 1, 'hw', h => { h.save(); h.translate(HWX(), 0); h.drawImage(highway(), 0, 0); h.restore(); }), 0, 0, L.W, L.H);
    if (!SK.bg && q < 3) Art.bg(bc, G.theme, L.W, L.H, T, beat, energy, true); if (q < 3) { drawImmersive(T, beat, energy, spOn, true, bc); drawImmersive(T, beat, energy, spOn, false, bc); }
    if (spOn) { bc.globalAlpha = 0.35 + 0.25 * Math.sin(T * 8); bc.drawImage(Art.glowImg('#ffd76a'), L.cx - L.bw * 0.6, L.strikeY - L.span * 0.5, L.bw * 1.2, L.span * 0.7); bc.globalAlpha = 1; } }
  // gameplay layer
  const shOn = S.set.shake !== false; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); if (SK.all) return; c.setTransform(GDPR, 0, 0, GDPR, shOn ? sx * GDPR : 0, shOn ? sy * GDPR : 0); window.__gc = c;
  // beat lines on the highway
  if (SK.part1) { finishTail(now); return; }
  c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 2; c.beginPath();
  if (bt) for (let i = Math.max(0, (G._bi || 0) - 1); i < bt.length; i++) { const u = (bt[i][0] - vnow) / lead; if (u > 1) break; if (u < -0.1) continue; const [s, y] = proj(u); c.moveTo(L.cx - 2 * L.lw * s, y); c.lineTo(L.cx + 2 * L.lw * s, y); }
  c.stroke();
  if (SK.p1b) { finishTail(now); return; }
  // lane flashes
  for (let l = 0; l < 4; l++) { const f = Math.max(G.laneFlash[l], G.laneHit[l]); if (f > 0.02) { c.globalAlpha = f * 0.55; if ((G.qual || 0) < 2) c.drawImage(Art.glowImg(LANECOL[l]), laneX(l, 1) - L.lw * 0.7, L.strikeY - L.lw * 1.6, L.lw * 1.4, L.lw * 2.2); c.globalAlpha = 1; G.laneFlash[l] *= Math.pow(0.85, DT * 60); G.laneHit[l] *= Math.pow(0.88, DT * 60); } }
  if (SK.p1c) { finishTail(now); return; }
  // notes: far to near so nearer draw on top
  const skin = spOn ? 'stars' : S.eq.skin, glit = spOn ? 'gold' : S.eq.glitter, tw = L.lw * 0.92, th = L.lw * 0.74, P1 = Art.PAL[skin] || Art.PAL.pinkgem;
  let last = G.first; while (last < G.tiles.length && (G.tiles[last].t - vnow) / lead <= 1.02) last++;
  if (!SK.notes) for (let i = last - 1; i >= G.first; i--) { const t = G.tiles[i]; if (t.state === 1 && !(t.dur > 0)) continue; if (t.state === 2 && vnow - t.t > 0.25) continue;
    const u = (t.t - vnow) / lead;
    if (t.dur > 0 && t.state !== 2 && !(t.state === 1 && t.holdP >= 1)) { // hold tail / note streak
      const u1 = Math.min(1.02, (t.t + t.dur - vnow) / lead); if (u1 > -0.1) { const [sa, ya] = proj(t.state === 3 ? 0 : Math.max(-0.1, u)), [sb, yb] = proj(u1), x = laneX(t.lane, 1), xa = laneX(t.lane, sa), xb = laneX(t.lane, sb), wa = L.lw * 0.17 * sa, wb = L.lw * 0.17 * sb;
        c.fillStyle = t.state === 3 ? '#ffffff' : P1[1]; c.globalAlpha = t.state === 3 ? 0.95 : 0.8; c.beginPath(); c.moveTo(xa - wa, ya); c.lineTo(xb - wb, yb); c.lineTo(xb + wb, yb); c.lineTo(xa + wa, ya); c.fill(); c.globalAlpha = 1;
        if (t.state === 3) { c.globalAlpha = 0.6 + 0.3 * Math.sin(T * 20); c.drawImage(Art.glowImg(LANECOL[t.lane]), x - L.lw * 0.5, L.strikeY - L.lw * 0.5, L.lw, L.lw); c.globalAlpha = 1; if ((G.bgN % 3) === 0) emit(x, L.strikeY, 1); } } }
    if (t.state === 3 || (t.state === 1 && t.dur > 0)) continue;
    if (u > 1.02) continue; const [s, y] = proj(u), w = tw * s, h = th * s, shape = Art.SHAPE_OF[skin] || Art.MIX[t.shapeI % 6];
    if (t.state === 2) c.globalAlpha = 0.35;
    const im = Art.tileImg(skin, glit, S.eq.frame, shape, tw, th), k = w / tw; c.drawImage(im, laneX(t.lane, s) - (tw / 2 + 12) * k, y - (th + 12) * k + h * 0.25, im.width * k, im.height * k);
    c.globalAlpha = 1; if ((G.qual || 0) < 1) Art.spark(c, laneX(t.lane, s) + w * 0.3, y - h * 0.7, 4 * s, '#ffffff', 0.5 + 0.5 * Math.sin(T * 7 + t.id)); }
  // hit flares: expanding gem rings at the strike line
  for (let l = 0; l < 4; l++) { const f = G.flares[l]; if (f > 0.03) { const r = L.lw * (0.35 + (1 - f) * 0.45); c.globalAlpha = f; c.drawImage(flareImg(l), laneX(l, 1) - r, L.strikeY - r * 0.7, r * 2, r * 1.4); c.globalAlpha = 1; G.flares[l] *= Math.pow(0.86, DT * 60); } }
  drawItems(vnow, lead, T);
  if (SK.part2) { finishTail(now); return; }
  // lane buttons at the strike line
  const down = DOWN; down.fill(0); for (const l of G.press.values()) down[l] = 1;
  for (let l = 0; l < 4; l++) { const im = btnImg(l, down[l] || G.laneHit[l] > 0.4 ? 1 : 0); c.drawImage(im, laneX(l, 1) - L.lw * 0.52, L.strikeY - L.lw * 0.45, L.lw * 1.04, L.lw * 0.9); }
  // particles
  if (!SK.fx) for (const p of POOL) { if (!p.on) continue; p.age += DT; if (p.age >= p.life) { p.on = false; continue; } const k = 1 - p.age / p.life; p.vy += 900 * DT; p.x += p.vx * DT; p.y += p.vy * DT;
    if (p.gem) { c.globalAlpha = k; Art.gemFast(c, p.gem, p.x, p.y, p.s * 2.4, '#fff', p.col); c.globalAlpha = 1; } else Art.spark(c, p.x, p.y, p.s * k + 1, p.col, k); }
  if (SK.part3) { finishTail(now); return; }
  // pops
  c.textAlign = 'center';
  for (let i = G.pops.length - 1; i >= 0; i--) { const p = G.pops[i]; p.a -= 1.8 * DT; if (p.a <= 0) { G.pops.splice(i, 1); continue; } c.globalAlpha = Math.min(1, p.a); c.font = p.big ? F32 : F20; c.lineWidth = 5; c.strokeStyle = '#fff'; const yy = p.y - (1 - Math.min(1, p.a)) * 30; c.strokeText(p.txt, p.x, yy); c.fillStyle = p.col; c.fillText(p.txt, p.x, yy); }
  c.globalAlpha = 1;
  // combo meter + multiplier + star power meter (left of highway on wide screens, top otherwise)
  const side = L.cx - L.bw / 2 > 90, mx = side ? L.cx - L.bw / 2 - 50 : 44, my = side ? L.H * 0.62 : Math.max(96, L.H * 0.12), m = mult(), seg = G.combo % 10 / 10;
  c.lineWidth = 8; c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(mx, my, 30, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = m >= 4 ? '#ffd76a' : '#ff4fa3'; c.beginPath(); c.arc(mx, my, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (m >= 4 && !spOn ? 1 : seg)); c.stroke();
  c.font = F22; c.fillStyle = '#fff'; c.strokeStyle = '#c2186b'; c.lineWidth = 4; c.strokeText('x' + m, mx, my + 8); c.fillText('x' + m, mx, my + 8);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(mx - 30, my + 42, 60, 8); c.fillStyle = spOn ? '#ffd76a' : '#b98cff'; c.fillRect(mx - 30, my + 42, 60 * G.sp, 8);
  if (G.combo >= 3) { c.font = F18; c.strokeText(G.combo + ' combo', mx, my + 72); c.fillText(G.combo + ' combo', mx, my + 72); }
  // countdown
  if (now < 0) { const n = Math.ceil(-now / (COUNT / 3)); if (n <= 3) { c.font = `800 ${L.lw * 0.9}px ${FONT}`; c.lineWidth = 8; c.strokeStyle = '#ff4fa3'; c.fillStyle = '#fff'; c.strokeText(n, L.cx, L.H * 0.45); c.fillText(n, L.cx, L.H * 0.45); } }
  if (SK.part4) { finishTail(now); return; }
  // mascot
  const ms = Math.min(84, L.H * 0.11); if (!SK.mascot) Art.mascotFast(c, L.cx - L.bw / 2 > ms * 1.2 ? L.cx - L.bw / 2 - ms * 0.6 : L.W - ms * 0.55, L.cx - L.bw / 2 > ms * 1.2 ? L.H * 0.35 : L.H - ms * 0.6, ms, performance.now() < G.moodT ? G.mood : 'idle', S.eq.outfit, T);
  if (G.rainbowFlash > 0.02) { c.globalAlpha = G.rainbowFlash * 0.5; for (let i = 0; i < 5; i++) { c.fillStyle = RB5[i]; c.fillRect(0, L.H * i / 5, L.W, L.H / 5); } c.globalAlpha = 1; G.rainbowFlash *= Math.pow(0.9, DT * 60); } drawPuHud(now);
  if (G.flash > 0.02) { c.fillStyle = 'rgba(255,120,170,' + (0.15 * G.flash).toFixed(3) + ')'; c.fillRect(0, 0, L.W, L.H); G.flash *= Math.pow(0.85, DT * 60); }
  if (G.pendingTap) { G.ivl.push(performance.now() - G.pendingTap.perf); G.pendingTap = null; }
  G.ft.push(performance.now() - f0); if (G.ft.length > 8000) { G.ft.splice(0, 4000); G.fi.splice(0, 4000); }
}
function outOfHearts() { pauseGame(true); $('#mOut').classList.add('on'); const mc = $('#mascotOut').getContext('2d'); mc.clearRect(0, 0, 160, 130); Art.mascot(mc, 80, 75, 100, 'oops', S.eq.outfit, 0); }
function pauseGame(noModal) { if (G.paused) return; G.paused = true; G.pauseAt = songTime(); A.ctx().suspend(); if (!noModal) $('#mPause').classList.add('on'); }
function resumeGame() { $('#mPause').classList.remove('on'); $('#mOut').classList.remove('on'); const go2 = () => { clock.off = null; updateClock(); G.lastFrame = 0; G.paused = false; G.bgDirty = true; }; A.ctx().resume().then(go2, go2); }
$('#pauseBtn').addEventListener('click', () => pauseGame());
$('#resumeBtn').addEventListener('click', resumeGame);
$('#contBtn').addEventListener('click', () => { G.hearts = Infinity; G.practice = true; G.usedPractice = true; G.hudDirty = true; resumeGame(); });
const stopAudio = () => { (G.srcs || []).forEach(s => { try { s.stop(); s.disconnect(); } catch (e) { } }); G.srcs = []; if (G.duck) try { G.duck.disconnect(); } catch (e) { } if (G.muffle) try { G.muffle.disconnect(); } catch (e) { } A.ctx().resume(); A.inGame = false; };
const restart = () => { $('#mPause').classList.remove('on'); $('#mOut').classList.remove('on'); stopAudio(); G.on = false; $('#game').classList.remove('on'); startGame(G.song, G.diff); };
$('#restartBtn').addEventListener('click', restart); $('#outRetry').addEventListener('click', restart);
$('#quitBtn').addEventListener('click', () => { $('#mPause').classList.remove('on'); stopAudio(); quit(); });
$('#outEnd').addEventListener('click', () => { $('#mOut').classList.remove('on'); A.ctx().resume(); finishGame(); });
function quit() { G.on = false; LOOP++; $('#game').classList.remove('on'); go('songs'); }
document.addEventListener('visibilitychange', () => { if (document.hidden && G.on && !G.paused && !G.ended) pauseGame(); }); window.addEventListener('pagehide', () => { if (G.on && !G.paused && !G.ended) pauseGame(); });

function finishGame() {
  if (!G.on) return; stopAudio(); G.tiles.forEach(t => { if (t.state === 0) { t.state = 2; G.j.miss++; } }); window.__lastItems = G.items.map(i => ({ kind: i.kind, k: i.pu || i.ob, state: i.state, t: i.t, lane: i.lane })); const n = G.tiles.length, j = G.j, acc = n ? (j.perfect + j.great * 0.85 + j.good * 0.6) / n : 0;
  const fc = j.miss === 0 && n > 0; let stars = acc >= 0.88 ? 3 : acc >= 0.7 ? 2 : acc >= 0.3 ? 1 : 0;
  const id = G.song.id, before = totalStars(), crownsBefore = crownsOf(id); S.best[id] = S.best[id] || {}; const prev = S.best[id][G.diff] || { stars: 0, score: 0 };
  const newBest = G.score > (prev.score || 0);
  S.best[id][G.diff] = { stars: Math.max(prev.stars || 0, stars), score: Math.max(prev.score || 0, G.score), fc: prev.fc || (fc && !G.usedPractice) };
  const gainedStars = totalStars() - before, gainedCrowns = crownsOf(id) - crownsBefore;
  const coins = Math.round(G.score / 400) + stars * 5 + (fc ? 10 : 0) + 2; S.coins += coins; S.packs += gainedStars + gainedCrowns; S.plays++; S.maxCombo = Math.max(S.maxCombo || 0, G.maxCombo);
  award('first'); if (stars === 3) award('star3'); if (fc) award('fc'); if (crownsOf(id) > 0) award('crown'); if (S.plays >= 10) award('p10'); if (S.plays >= 50) award('p50');
  if (G.maxCombo >= 50) award('combo50'); if (G.maxCombo >= 100) award('combo100'); if (G.diff === 'hard' && stars > 0) award('hard'); if (totalStars() >= 50) award('allstars');
  S.stats = S.stats || { pu: {}, dodged: 0 }; for (const k in G.stats.pu) S.stats.pu[k] = (S.stats.pu[k] || 0) + G.stats.pu[k]; S.stats.dodged += G.stats.dodged;
  if (Object.keys(S.stats.pu).length) award('pu1'); if (Object.keys(S.stats.pu).length >= 6) award('puall'); if (G.stats.rainbow) award('rainbow'); if (S.stats.dodged >= 25) award('dodge25'); if (G.stats.dodged >= 5 && G.j.miss === 0) award('dodgeperfect');
  save(); A.setFx(S.set.fxOn !== false, S.set.fxVol == null ? 0.5 : S.set.fxVol); A.ctx().resume().then(() => A.fx('fanfare'), () => { });
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
  G.on = false; LOOP++; $('#game').classList.remove('on'); window.__lastResult = { stars, score: G.score, j: { ...j }, n, fc, maxCombo: G.maxCombo, dodged: G.stats.dodged, powerups: G.stats.pu, items: G.items.length };
}
document.addEventListener('click', e => {
  if (e.target.id === 'resAgain') { $('#mRes').classList.remove('on'); startGame(G.song, G.diff); }
  if (e.target.id === 'resSongs') { $('#mRes').classList.remove('on'); go('songs'); }
  if (e.target.id === 'resPack') { $('#mRes').classList.remove('on'); go('album'); openPack(); }
});

// ---------- boot ----------
window.__tiles = { S: () => S, G: () => G, loops: () => LOOPS, stopAll: () => { stopAudio(); G.on = false; LOOP++; }, go, startGame, setLab: l => { LAB = l; }, allSongs, loadCustoms, DB, songTime, judgeAt, finishGame, layout: () => L, laneX, proj, save, openPack, CAL, arrange, rendered, clock, updateClock, prepare, reanalyze };
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
