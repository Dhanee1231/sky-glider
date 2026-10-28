// Color Magic M2: My Photo flow (file picker only), Options, Making, Error card, Squares for pack pictures, photo puzzle storage + gated storage page.
// The picked file is decoded once to a <=1280 px pixel buffer (worker, or main-thread slices); the original is never kept, named or stored (S4).
(function () {
  'use strict';
  const CA = window.CMApp, API = CA.API, HOOK = CA.HOOK, C = window.CBN, H = window.CBNHost;
  const $ = s => document.querySelector(s), A = API.A, SV = API.SV, go = API.go;
  const ST = { sparkle: false, src: 'photo', img: null, pack: null, mode: 'shapes', diff: 1, detail: 1, pal: 0, grid: 0, seed: 1, more: false, from: 'photo', prevT: 0, prevN: 0, busy: false, made: null };
  const GRIDS = [16, 20, 24, 32, 40, 48], BIG = [64, 80];
  let thumbUrls = [], decoding = false, prevBitmap = null;
  const ICONS = { phBack: 'back', opBack: 'back', mkCancel: 'close', palMinus: 'minus', palPlus: 'plus', grMinus: 'minus', grPlus: 'plus', opMoreBtn: 'gem', errTry: 'photo' };
  for (const id in ICONS) { const e = document.getElementById(id); if (e) e.innerHTML = A.icon(ICONS[id]); }
  $('#phPick').innerHTML = A.icon('photo') + '<span>Pick</span>';
  $('#opMake').innerHTML = A.icon('sparkle') + '<span>Make</span>';
  $('#opMagic').innerHTML = A.icon('sparkle'); $('#opBusy').innerHTML = A.icon('sparkle'); $('#mkGem').innerHTML = A.icon('gem'); $('#grIc').innerHTML = '<span style="display:inline-block;width:26px;height:26px;color:#d6339f">' + A.icon('squares') + '</span>';
  $('#mkSp').innerHTML = A.icon('sparkle') + A.icon('heart') + A.icon('sparkle'); $('#mkBar i').innerHTML = '<b>' + A.icon('sparkle') + '</b>';
  $('#errIc').innerHTML = A.icon('sparkle');
  $('#opSpark').innerHTML = A.icon('sparkle');
  $('#opMode [data-m=pixel]').innerHTML = A.icon('squares'); $('#opMode [data-m=shapes]').innerHTML = A.icon('shapes');
  const nav = f => { try { return f(); } catch (e) { } };
  const sd = () => SV.data;
  const rid = () => Date.now().toString(36) + Math.floor(Math.random() * 1679616).toString(36).padStart(4, '0');
  const revokeThumbs = () => { thumbUrls.forEach(u => URL.revokeObjectURL(u)); thumbUrls = []; };
  const dropImg = () => { ST.img = null; ST.big = null; ST.noBig = false; ST.pref = null; ST.made = null; if (prevBitmap && prevBitmap.close) prevBitmap.close(); prevBitmap = null; };

  // ---------- errors ----------
  const MSG = { type: 'Another picture?', svg: 'Pictures only!', big: 'Too big!', small: 'Too tiny!', resize: 'Too big!', decode: 'Another picture?', busy: 'Another picture?', worker: 'Another picture?', quota: 'Ask a grown-up!', cap: 'Gallery full! Ask a grown-up!', gone: 'Another picture?', bad: 'Another picture?', io: 'Ask a grown-up!' };
  let errCode = '';
  function fail(code) { errCode = code || 'decode'; go('err', { force: true }); }
  HOOK.err = () => { $('#errMsg').textContent = MSG[errCode] || MSG.decode; AU(errCode === 'quota' || errCode === 'cap' ? 'full' : 'oops'); };
  $('#errTry').onclick = () => go(ST.src === 'pack' ? 'packs' : 'photo');
  const AU = k => { try { API.AU.say(k); } catch (e) { } };

  // ---------- my photo screen ----------
  $('#phBack').onclick = () => go('start');
  $('#phPick').onclick = () => { const i = $('#fileIn'); if (i) i.click(); };
  HOOK.photo = async function () {
    if (!sd().set.photo) { go('start'); return; }
    await API.loadMaps(); revokeThumbs(); const grid = $('#phGrid'); grid.innerHTML = '';
    const metas = (await SV.allMeta()).filter(m => m.src === 'photo').sort((a, b) => b.made - a.made);
    for (const m of metas) {
      const b = document.createElement('button'); b.className = 'pic'; const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = 160; im.height = 160; im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
      if (m.thumb) { const u = URL.createObjectURL(m.thumb); thumbUrls.push(u); im.src = u; } b.appendChild(im);
      const r = API.progMap.get(m.id), f = API.fracRec(r), ring = document.createElement('div');
      if (API.galMap.has(m.id)) { ring.className = 'crown'; ring.innerHTML = A.icon('gem'); } else if (f > 0) { ring.className = 'ring'; ring.innerHTML = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="none" stroke="#ffd0ea" stroke-width="6"/><circle cx="20" cy="20" r="14" fill="none" stroke="#d6339f" stroke-width="6" stroke-dasharray="' + (88 * f).toFixed(1) + ' 88" transform="rotate(-90 20 20)" stroke-linecap="round"/></svg>'; }
      if (ring.className) b.appendChild(ring);
      b.onclick = () => openByPid(m.id); grid.appendChild(b);
    }
  };
  $('#fileIn').onchange = async e => {
    const inp = e.target, f = inp.files && inp.files[0]; inp.value = ''; if (!f || decoding) return;   // S4: the input never keeps the file
    decoding = true; ST.src = 'photo'; ST.pack = null; dropImg();
    go('make', { force: true }); setProg(0.05);
    try {
      let r;
      try { r = await H.decode(f, { big: !!sd().set.sharp, prefMax: sd().set.sharp ? H.WORK4K : H.PREF }); }
      catch (err) {   // R5: the 4K decode ran out of memory (canvas/bitmap refused): keep the photo, decode it at the normal size with a 2560 sharp copy, no Super sharp level for this pick
        if (!sd().set.sharp || (err.code !== 'resize' && err.code !== 'decode')) throw err;
        r = await H.decode(f, { big: false, prefMax: H.PREF }); ST.noBig = true; API.toast('sparkle');
      }
      ST.big = r.big || null; delete r.big; ST.pref = r.pref ? { blob: r.pref, thumb: r.prefThumb, w: r.prefW, h: r.prefH } : null; delete r.pref; delete r.prefThumb; ST.img = r; ST.seed = (Math.random() * 4294967295) >>> 0 || 1; ST.pal = 0; ST.grid = 0; ST.sparkle = false; startOpt();
    } catch (err) { if (err.code === 'cancel') go('photo'); else fail(err.code); }
    finally { decoding = false; }
  };

  // ---------- options ----------
  const effPal = () => ST.pal || (ST.mode === 'pixel' ? C.PRE[ST.diff].gpal : C.PRE[ST.diff].pal);
  const effGrid = () => ST.grid || C.PRE[ST.diff].grid;
  const gridList = () => (sd().set.bigGrid || ST.diff >= 5) ? GRIDS.concat(BIG) : GRIDS.slice();
  function maxDiff() {
    if (sd().set.allLevels) return 6;
    const n = sd().stats.done | 0;
    if (n >= 10) return 6; if (n >= 6) return 5; if (n >= 3) return 4; return 3;
  }
  // level 7 "Super sharp" (4K): uploaded photos in Shapes mode only, and only while the grown-up switch is on
  const sharpOK = () => !!sd().set.sharp && !ST.noBig && ST.src === 'photo' && ST.mode === 'shapes';
  const topDiff = () => sharpOK() ? 7 : maxDiff();
  function startOpt() {
    const l = sd().last; ST.mode = l.mode === 'pixel' ? 'pixel' : 'shapes'; ST.diff = Math.max(1, Math.min(l.diff || 1, topDiff())); ST.more = false;
    go('opt', { force: true });
  }
  function drawSrc() {
    const c = $('#opSrc'), g = c.getContext('2d');
    if (ST.src === 'pack' && ST.pack.pic.photo) {
      const im = new Image(); im.onload = () => { if (!(ST.pack && ST.pack.pic.photo)) return; c.width = im.naturalWidth; c.height = im.naturalHeight; g.drawImage(im, 0, 0); };
      im.src = ST.pack.pic.thumb; return;
    }
    if (ST.src === 'pack') { const t = API.thumb(ST.pack.pic, new Uint8Array(ST.pack.pic.shapes.map(s => s[0] + 1)), 400); c.width = t.width; c.height = t.height; g.drawImage(t, 0, 0); return; }
    const im = ST.img, k = 420 / Math.max(im.w, im.h), t = document.createElement('canvas'); t.width = im.w; t.height = im.h; t.getContext('2d').putImageData(new ImageData(im.rgba, im.w, im.h), 0, 0);
    c.width = Math.max(1, Math.round(im.w * k)); c.height = Math.max(1, Math.round(im.h * k)); g.imageSmoothingQuality = 'high'; g.drawImage(t, 0, 0, c.width, c.height); t.width = 0;
  }
  function diffIcon(n, d) {
    const cs = 30 / n; let sv = '<svg class="dv" viewBox="0 0 30 30" aria-hidden="true">';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) sv += '<rect x="' + (x * cs + 0.4).toFixed(1) + '" y="' + (y * cs + 0.4).toFixed(1) + '" width="' + (cs - 0.8).toFixed(1) + '" height="' + (cs - 0.8).toFixed(1) + '" fill="' + ((x + y * 2 + d) % 3 ? '#fff' : '#ffe27a') + '"/>';
    return sv + '</svg>';
  }
  const mosaicOn = () => !!sd().set.mosaic;
  function buildDiff() {
    const box = $('#opDiff'); box.innerHTML = '';
    const photo = ST.src === 'pack' && ST.pack && ST.pack.pic.photo;
    const detail = ST.src === 'pack' && ST.mode === 'shapes';
    if (photo || detail) {
      const on = mosaicOn();
      if (!on && ST.detail > 2) ST.detail = 2;
      const names = on ? ['Kid', 'Detailed', 'Expert', 'Extreme'] : ['Easy', 'Hard'];
      const say = on ? ['kid', 'detailed', 'expert', 'extreme'] : ['easy', 'hard'];
      box.classList.toggle('mosaic', on);
      for (let d = 1; d <= names.length; d++) {
        const b = document.createElement('button'); b.className = 'dfb'; b.dataset.d = d; b.dataset.kind = 'detail'; b.setAttribute('aria-label', names[d - 1]);
        b.innerHTML = diffIcon([3, 6, 9, 12][d - 1], d) + '<span class="gm">' + A.icon('gem').repeat(d) + '</span><span class="nm">' + names[d - 1] + '</span>';
        b.onclick = () => { ST.detail = d; API.AU.tick(); AU(say[d - 1]); refreshOpt(); schedulePreview(150); }; box.appendChild(b);
      }
      return;
    }
    box.classList.remove('mosaic');
    const cap = maxDiff();
    for (let d = 1; d <= cap; d++) {
      const b = document.createElement('button'); b.className = 'dfb'; b.dataset.d = d; b.dataset.kind = 'level'; b.setAttribute('aria-label', C.PRE[d].name);
      b.innerHTML = diffIcon([3, 5, 7, 9, 11, 13][d - 1], d) + '<span class="gm">' + A.icon('gem').repeat(d) + '</span><span class="nm">' + C.PRE[d].name + '</span>';
      b.onclick = () => { ST.diff = d; ST.pal = 0; ST.grid = 0; API.AU.tick(); AU('d' + d); refreshOpt(); schedulePreview(150); }; box.appendChild(b);
    }
    if (sharpOK()) {
      const b = document.createElement('button'); b.className = 'dfb k4'; b.dataset.d = 7; b.dataset.kind = 'level'; b.setAttribute('aria-label', C.PRE[7].name);
      b.innerHTML = diffIcon(15, 7) + '<span class="gm">' + A.icon('sparkle').repeat(3) + '</span><span class="nm">' + C.PRE[7].name + '</span>';
      b.onclick = () => { ST.diff = 7; ST.pal = 0; ST.grid = 0; API.AU.tick(); AU('d7'); refreshOpt(); schedulePreview(150); }; box.appendChild(b);
    }
  }
  function refreshOpt() {
    const pk = ST.src === 'pack', photo = !!(pk && ST.pack && ST.pack.pic.photo), native = pk && ST.mode === 'shapes' && !photo;
    $('#opMore').hidden = !ST.more; $('#opMoreBtn').classList.toggle('on', ST.more);
    $$('#opMode button[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === ST.mode)); $('#opMode').hidden = photo;
    $('#opSpark').hidden = native || photo; $('#opSpark').classList.toggle('on', ST.sparkle);
    $('#opDiff').hidden = false; $('#opPalRow').hidden = native || photo; $('#opGridRow').hidden = native || photo || ST.mode !== 'pixel';
    buildDiff();
    $$('#opDiff .dfb').forEach(b => b.classList.toggle('on', (native || photo) ? +b.dataset.d === ST.detail : +b.dataset.d === ST.diff));
    if (ST.pal > 24 && !(ST.diff === 7 && ST.mode === 'shapes')) ST.pal = 24;
    if (!photo && !native && ST.diff > topDiff()) { ST.diff = maxDiff(); $$('#opDiff .dfb').forEach(b => b.classList.toggle('on', +b.dataset.d === ST.diff)); }
    $('#palN').textContent = effPal(); $('#grN').textContent = effGrid();
  }
  const $$ = s => [...document.querySelectorAll(s)];
  HOOK.opt = function (from) {
    if (!ST.img && !(ST.src === 'pack' && ST.pack)) { go('photo'); return; }
    drawSrc(); refreshOpt(); $('#palDots').innerHTML = ''; clearPrev(); schedulePreview(0);
  };
  function clearPrev() { const c = $('#opPrev'); c.style.width = ''; c.style.height = ''; const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); }
  // The preview keeps the CSS box the bitmap lays out in, and the backing store is that box times min(DPR, 2.5).
  function paintPrev(src) {
    const c = $('#opPrev'); c.style.width = ''; c.style.height = '';
    c.width = src.width; c.height = src.height;
    const r = c.getBoundingClientRect(), s = Math.min(window.devicePixelRatio || 1, 2.5);
    if (r.width >= 2 && r.height >= 2) {
      c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
      c.width = Math.max(1, Math.ceil(r.width * s - 1e-4)); c.height = Math.max(1, Math.ceil(r.height * s - 1e-4));
    }
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
  }
  $('#opBack').onclick = () => go(ST.src === 'pack' ? 'packs' : 'photo');
  $('#opMoreBtn').onclick = () => { ST.more = !ST.more; API.AU.tick(); refreshOpt(); };
  $$('#opMode button[data-m]').forEach(b => b.onclick = () => { ST.mode = b.dataset.m; API.AU.tick(); AU(ST.mode === 'pixel' ? 'sq' : 'sh'); refreshOpt(); schedulePreview(0); });
  $('#opSpark').onclick = () => { ST.sparkle = !ST.sparkle; API.AU.tick(); refreshOpt(); schedulePreview(0); };
  $('#palMinus').onclick = () => { ST.pal = Math.max(4, effPal() - 1); API.AU.tick(); AU('fewer'); refreshOpt(); schedulePreview(250); };
  $('#palPlus').onclick = () => { ST.pal = Math.min(ST.diff === 7 && ST.mode === 'shapes' ? 32 : 24, effPal() + 1); API.AU.tick(); AU('more'); refreshOpt(); schedulePreview(250); };
  function stepGrid(dir) { const L = gridList(), cur = effGrid(); let i = 0; for (let k = 0; k < L.length; k++) if (L[k] <= cur) i = k; ST.grid = L[Math.max(0, Math.min(L.length - 1, i + dir))]; API.AU.tick(); refreshOpt(); schedulePreview(250); }
  $('#grMinus').onclick = () => stepGrid(-1); $('#grPlus').onclick = () => stepGrid(1);

  // live sparkle preview: one generation at a time, the old worker is terminated by the new job (P9)
  function schedulePreview(delay) {
    clearTimeout(ST.prevT); const n = ++ST.prevN; $('#opBusy').classList.add('on');
    ST.prevT = setTimeout(() => runPreview(n), delay);
  }
  async function runPreview(n) {
    try {
      if (ST.src === 'pack' && ST.pack && ST.pack.pic.photo) {
        const im = new Image();
        im.onload = () => { if (n !== ST.prevN) return; paintPrev(im); $('#palDots').innerHTML = ''; $('#opBusy').classList.remove('on'); };
        im.onerror = () => { if (n === ST.prevN) $('#opBusy').classList.remove('on'); };
        im.src = ST.pack.pic.file; return;
      }
      if (ST.src === 'pack' && ST.mode === 'shapes' && (ST.detail <= 1 || (mosaicOn() && ST.detail >= 3))) { paintPrev(API.thumb(ST.pack.pic, null, 256)); $('#palDots').innerHTML = ''; $('#opBusy').classList.remove('on'); return; }
      const r = (ST.src === 'pack' && ST.mode === 'shapes')
        ? await H.detail(ST.pack.pic, ST.detail, hash(ST.pack.pic.id), null, true)
        : await H.make(ST.img, { mode: ST.mode, diff: ST.diff, pal: ST.pal, grid: ST.grid, sparkle: ST.sparkle, seed: ST.seed, preview: true });
      if (n !== ST.prevN) return;
      const bm = await createImageBitmap(r.thumb); if (n !== ST.prevN) { bm.close(); return; }
      paintPrev(bm); bm.close();
      $('#palDots').innerHTML = r.pz.pal.map(h => '<i style="background:' + h + '"></i>').join(''); $('#opBusy').classList.remove('on');
    } catch (e) { if (e.code !== 'cancel' && n === ST.prevN) { $('#opBusy').classList.remove('on'); if (scrIs('opt')) fail(e.code); } }
  }
  const scrIs = s => API.scr === s;

  // ---------- making ----------
  let pf = 0; const setProg = (f, reset) => { pf = reset ? f : Math.max(pf, f); $('#mkBar i').style.width = Math.max(6, Math.round(pf * 100)) + '%'; };   // never runs backwards
  HOOK.make = () => { setProg(0.05, true); clearTimeout(mkT); mkT = setTimeout(() => { if (API.scr === 'make') AU('making'); }, 1000); };
  let mkT = 0;
  $('#mkCancel').onclick = cancelMaking;
  function cancelMaking() { H.cancel(); }
  HOOK.back = function () {
    const s = API.scr;
    if (s === 'make') { cancelMaking(); return true; }
    if (s === 'opt') { go(ST.src === 'pack' ? 'packs' : 'photo'); return true; }
    if (s === 'photo' || s === 'err') { go(s === 'err' && ST.src === 'pack' ? 'packs' : 'start'); return true; }
    return false;
  };
  HOOK.leave = function (from, to) {
    if (from === 'opt' && to !== 'make') { clearTimeout(ST.prevT); ST.prevN++; if (to !== 'set') H.cancel(); }
    if (['start', 'packs', 'photo', 'gal', 'play'].includes(to)) { if (to !== 'photo' || from !== 'make') dropImg(); }
    if (from === 'photo') revokeThumbs();
  };
  async function makePhotoPack() {
    const pic = ST.pack.pic, pk = ST.pack.pk, mosaic = mosaicOn() && ST.detail >= 3, tier = ST.detail >= 4 ? 4 : 3, level = ST.detail <= 1 ? 2 : 4;
    const id = mosaic ? API.mosaicId(pk, pic.id, tier, true) : ('pk:' + pk + '.' + pic.id + ':L' + level), seed = hash(pk + '.' + pic.id);
    clearTimeout(ST.prevT); ST.prevN++; go('make', { force: true }); setProg(0.04);
    try {
      let rec = await SV.getPuzzle(id), pz = null;
      if (rec) { try { pz = await H.unpack(rec); } catch (e) { SV.quarantine.set('puzzle:' + id, rec); pz = null; rec = null; } }
      if (!pz) {
        const resp = await fetch(pic.file); if (!resp.ok) { fail('decode'); return; }
        const blob = await resp.blob(), img = await H.decode(new File([blob], 'p.webp', { type: 'image/webp' }));
        const r = mosaic ? await H.mosaic(img, tier, seed, f => setProg(f)) : await H.make(img, { mode: 'shapes', diff: level, pal: 0, grid: 0, sparkle: false, seed }, f => setProg(f));
        const packed = await H.pack(r.pz, r.thumb, id, 'pack'), res = await SV.putPuzzle(packed.rec, packed.meta);
        if (!res.ok) { fail(res.why === 'cap' ? 'cap' : res.why === 'quota' ? 'quota' : 'io'); return; }
        pz = r.pz; ST.made = { id, bytes: packed.bytes, T: r.T, where: r.where, n: r.pz.n }; setProg(1);
      } else ST.made = { id, cached: true, n: pz.n };
      Object.assign(sd().last, { mode: 'shapes', diff: level, pal: 0, grid: 0 }); SV.write();
      await openPuzzle(id, pz); AU('ready');
    } catch (e) { if (e.code === 'cancel') go('opt', { force: true }); else fail(e.code || 'decode'); }
  }
  async function doMake() {
    const pk = ST.src === 'pack'; AU('make');
    if (pk && ST.pack && ST.pack.pic.photo) return makePhotoPack();
    if (pk && ST.mode === 'shapes' && ST.detail <= 1) { API.openPic(ST.pack.pk, ST.pack.pic.id); return; }
    clearTimeout(ST.prevT); ST.prevN++; go('make', { force: true }); setProg(0.04);
    try {
      const palN = effPal(), gridN = effGrid();
      const detail = pk && ST.mode === 'shapes';
      const mosaic = detail && mosaicOn() && ST.detail >= 3, tier = ST.detail >= 4 ? 4 : 3;
      const id = mosaic ? API.mosaicId(ST.pack.pk, ST.pack.pic.id, tier, false) : detail ? API.pidOf(ST.pack.pk, ST.pack.pic.id) + (ST.detail >= 3 ? 'd3' : 'd2') : pk ? API.pidOf(ST.pack.pk, ST.pack.pic.id) + ':px' + gridN + 'p' + palN + (ST.sparkle ? 's' : '') : 'ph:' + rid();
      const k4 = !pk && ST.diff === 7 && ST.mode === 'shapes' && !!ST.big;
      if (k4 && !(await SV.room(H.CAP4K))) { fail('quota'); return; }   // space low: say so before the long 4K build, never delete anything
      let rec = pk ? await SV.getPuzzle(id) : null, pz = null;
      if (rec) { try { pz = await H.unpack(rec); } catch (e) { SV.quarantine.set('puzzle:' + id, rec); pz = null; rec = null; } }
      if (!pz) {
        const seed = pk ? hash(detail ? ST.pack.pic.id : id) : ST.seed;
        const r = mosaic ? await H.mosaic(ST.pack.pic, tier, seed, f => setProg(f)) : detail ? await H.detail(ST.pack.pic, ST.detail, seed, f => setProg(f), false) : await H.make(k4 ? ST.big : ST.img, { mode: ST.mode, diff: ST.diff, pal: ST.pal, grid: ST.grid, sparkle: ST.sparkle, seed }, f => setProg(f));
        const packed = await H.pack(r.pz, r.thumb, id, pk ? 'pack' : 'photo');
        if (!pk && ST.pref && ST.pref.thumb) packed.meta.thumb = ST.pref.thumb;   // 512 px thumb of the real photo, from the sharp copy
        const res = await SV.putPuzzle(packed.rec, packed.meta);
        if (!res.ok) { fail(res.why === 'cap' ? 'cap' : res.why === 'quota' ? 'quota' : 'io'); return; }
        if (!pk && ST.pref) { const pr = await SV.putPref(id, ST.pref.blob, ST.pref); ST.prefBytes = pr.ok ? ST.pref.blob.size : 0; }   // sharp on-device copy; a failed write leaves the palette puzzle as before
        pz = r.pz; ST.made = { id, bytes: packed.bytes, T: r.T, where: r.where }; setProg(1);
      }
      Object.assign(sd().last, { mode: ST.mode, diff: ST.diff, pal: ST.pal, grid: ST.grid }); SV.write();
      await openPuzzle(id, pz); AU('ready');
    } catch (e) { if (e.code === 'cancel') go('opt', { force: true }); else fail(e.code); }
  }
  $('#opMake').onclick = doMake;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) || 1; };

  // ---------- opening puzzles ----------
  function picFromPz(id, pz, inf, base) {
    const col = pz.mode === 'pixel' ? inf.cells : pz.data.col;
    const pic = { id, name: '', stars: 0, w: pz.W, h: pz.H, bg: '#fff1ee', pal: pz.pal, shapes: Array.from({ length: pz.n }, (_, i) => [col[i]]), line: [], pre: inf, custom: true, base, k4: !!(pz.cfg && pz.cfg.k4), tier: pz.cfg && pz.cfg.tier | 0 };
    const ph = /^pk:([a-z0-9]+)\.([a-z0-9]+):(?:L[24]|T[34])$/.exec(id);
    if (ph) { const src = API.picBy(ph[1], ph[2]); if (src && src.photo) { pic.photo = src.file; pic.thumbFile = src.thumb; pic.name = src.name; if (!pic.base) pic.base = src.id; } }
    return pic;
  }
  // R2: a personal photo puzzle with a stored sharp copy reveals that copy; without one it keeps its palette colours (v9/v9.1 puzzles)
  async function personalReveal(pic, id) {
    if (!/^ph:/.test(id)) return;
    try { const r = await SV.getPref(id); if (r) { pic.reveal = await H.bitmap(r.blob); pic.photo = 'pref'; pic.hasPref = true; } } catch (e) { }
  }
  async function cartoonReveal(pic, id) {
    const m = API.isMosaic && API.isMosaic(id);
    if (!m || m.kind !== 'cartoon' || pic.reveal) return;
    const src = API.picBy(m.pk, m.id); if (!src || !src.shapes) return;
    const sw = src.w || 2048, sh = src.h || 2048;
    const c = document.createElement('canvas'); c.width = c.height = 1024;
    const g = c.getContext('2d'); g.fillStyle = src.bg || '#fff1ee'; g.fillRect(0, 0, 1024, 1024); g.setTransform(1024 / sw, 0, 0, 1024 / sh, 0, 0);
    for (const s of src.shapes) { g.fillStyle = src.pal[s[0]] || '#fff'; if (s[2]) { g.save(); g.clip(new Path2D(s[2])); g.fill(new Path2D(s[1])); g.restore(); } else g.fill(new Path2D(s[1])); }
    pic.reveal = await createImageBitmap(c); pic.tier = m.tier; c.width = c.height = 0;
  }
  async function openPuzzle(id, pz, o, inf) {
    inf = inf || await H.inflate(pz, true); const d = API.isDetail && API.isDetail(id), m = !d && /^pk:([a-z0-9]+)\.([a-z0-9]+):px/.exec(id), ph = !d && /^pk:([a-z0-9]+)\.([a-z0-9]+):(?:L[24]|T[34])$/.exec(id);
    const mz = !d && API.isMosaic && API.isMosaic(id);
    const pic = picFromPz(id, pz, inf, d ? d.id : m ? m[2] : ph ? ph[2] : mz ? mz.id : null);
    if (API.R.warmSeams) await API.R.warmSeams(pic);   // R5: the shared borders are built in slices, never as one long task
    if (pic.photo && API.R.loadReveal) pic.reveal = await API.R.loadReveal(pic.photo, pic.w, pic.h); else { await personalReveal(pic, id); await cartoonReveal(pic, id); }
    await API.openGame(d ? d.pk : m ? m[1] : ph ? ph[1] : mz ? mz.pk : 'ph', pic, id, o);
    dropImg();
  }
  async function openByPid(pid, o) {
    if (/^pk:[a-z0-9]+\.[a-z0-9]+$/.test(pid) && !(API.isDetail && API.isDetail(pid)) && !(API.isMosaic && API.isMosaic(pid))) { const [pk, id] = pid.slice(3).split('.'); return API.openPic(pk, id, o); }
    const rec = await SV.getPuzzle(pid); if (!rec) { fail('gone'); return; }
    let pz, inf; try { pz = await H.unpack(rec); inf = await H.inflate(pz, true); } catch (e) { SV.quarantine.set('puzzle:' + pid, rec); fail('bad'); return; }   // bad records are hidden, never deleted
    return openPuzzle(pid, pz, o, inf);
  }
  function packRGBA(pic, size) {
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = pic.bg || '#fff'; g.fillRect(0, 0, size, size); g.scale(size / 2048, size / 2048);
    for (const sh of pic.shapes) { g.fillStyle = pic.pal[sh[0]]; if (sh[2]) { g.save(); g.clip(new Path2D(sh[2])); g.fill(new Path2D(sh[1])); g.restore(); } else g.fill(new Path2D(sh[1])); }
    const d = g.getImageData(0, 0, size, size); c.width = 0; return { rgba: d.data, w: size, h: size };
  }
  API.pickPack = function (pk, id) {   // a fresh pack picture opens Options (Shapes = the native vector regions, Squares = through the pipeline)
    const pic = API.picBy(pk, id); if (!pic) return;
    dropImg(); ST.src = 'pack'; ST.pack = { pk, pic }; ST.pal = 0; ST.grid = 0; ST.sparkle = false; ST.mode = 'shapes'; ST.diff = 1; ST.detail = 1; ST.more = false;
    if (pic.photo) { ST.img = null; ST.seed = hash(pk + '.' + id); go('opt', { force: true }); return; }
    ST.img = packRGBA(pic, 512); ST.seed = hash(pk + id);
    go('opt', { force: true });
  };
  async function loadPz(pid) {   // raw packed puzzle for the viewer / 2K export worker (null when missing or unreadable; bad records are quarantined, never deleted)
    const rec = await SV.getPuzzle(pid); if (!rec) return null; try { return await H.unpack(rec); } catch (e) { SV.quarantine.set('puzzle:' + pid, rec); return null; }
  }
  API.loadPz = loadPz;
  API.loadPic = async pid => { const pz = await loadPz(pid); if (!pz) return null; try { const inf = await H.inflate(pz, false), d = API.isDetail && API.isDetail(pid), m = !d && /^pk:([a-z0-9]+)\.([a-z0-9]+):px/.exec(pid), ph = !d && /^pk:([a-z0-9]+)\.([a-z0-9]+):(?:L[24]|T[34])$/.exec(pid), mz = !d && API.isMosaic && API.isMosaic(pid); const pic = picFromPz(pid, pz, inf, d ? d.id : m ? m[2] : ph ? ph[2] : mz ? mz.id : null); if (pic && API.R.warmSeams) await API.R.warmSeams(pic); if (pic && pic.photo && API.R.loadReveal) pic.reveal = await API.R.loadReveal(pic.photo, pic.w, pic.h); else if (pic) { await personalReveal(pic, pid); await cartoonReveal(pic, pid); } return pic; } catch (e) { return null; } };
  API.openByPid = openByPid;
  API.thumbOf = async pid => { try { const m = await SV.get('pmeta', pid); return m && m.thumb ? await createImageBitmap(m.thumb) : null; } catch (e) { return null; } };

  // ---------- gated storage page (called from Settings after the grown-up gate) ----------
  API.storagePage = async function (host) {
    if (!host) return; const metas = (await SV.allMeta()).sort((a, b) => b.made - a.made); host.innerHTML = '';
    const head = document.createElement('div'); head.className = 'set'; head.innerHTML = '<label><span>Photos ' + metas.filter(m => m.src === 'photo').length + '/' + SV.PHOTO_CAP + '</span></label>'; host.appendChild(head);
    const urls = [], prefs = new Map(); try { for (const r of await SV.allPref()) prefs.set(r.id, r.bytes); } catch (e) { }
    for (const m of metas) {
      const row = document.createElement('div'); row.className = 'hs2'; const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = 44; im.height = 44; if (m.thumb) { const u = URL.createObjectURL(m.thumb); urls.push(u); im.src = u; }
      const sp = document.createElement('span'); sp.textContent = (m.src === 'photo' ? 'Photo ' : m.mode === 'shapes' ? 'Detail ' : 'Squares ') + Math.round(((m.bytes || 0) + (prefs.get(m.id) || 0)) / 1024) + ' KB' + (m.src === 'photo' && !prefs.has(m.id) ? ' · Pick the photo again for a sharp picture' : '');
      const del = document.createElement('button'); del.className = 'rb sm warn'; del.setAttribute('aria-label', 'Delete'); del.innerHTML = A.icon('trash'); let armed = 0;
      del.onclick = async () => { if (!armed) { armed = 1; del.classList.add('on'); setTimeout(() => { armed = 0; del.classList.remove('on'); }, 3000); return; } const r = await SV.delPuzzle(m.id); if (r.ok) { await API.loadMaps(); urls.forEach(u => URL.revokeObjectURL(u)); API.storagePage(host); API.stor && API.stor(); } };
      row.append(im, sp, del); host.appendChild(row);
    }
    if (SV.quarantine.size) { const q = document.createElement('div'); q.className = 'set'; q.innerHTML = '<label><span>' + SV.quarantine.size + ' unreadable (kept)</span></label>'; host.appendChild(q); }
  };

})();
