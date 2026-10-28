// Color Magic app: screens, input, game state, finish, gallery, settings, fold handling. Pack pictures (Shapes) and custom puzzles (photo / Squares, see photo.js).
(function () {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const R = CMR, A = CMArt, SV = CMSave, AU = CMAudio, FZ = window.FunZone;
  const sd = () => SV.data;
  const PACKS = Object.values(CM_PACKS).sort((a, b) => a.order - b.order);
  const HOOK = {}, API = {};   // photo.js registers screen hooks here (show + leave) and the back-gesture handler
  let scr = 'start', prev = 'start', G = null, paused = false, panMode = false, lockQ = false, lastFill = 0, wandOn = false, burstArmed = false, selPack = 0, packReady = false, noWorker = false;
  let raf = 0, last = 0, slow = 0, fastT = 0, fpsN = 0, fpsT = 0, fps = 60, lastVP = [innerWidth, innerHeight], relayT = 0, galMap = new Map(), progMap = new Map(), galFree = new Map(), thumbs = new Map();
  const dpr = () => window.devicePixelRatio || 1;
  const calm = () => !!(FZ && FZ.calm());
  R.init($('#art'), $('#fx'));
  const nav = f => { try { return f(); } catch (e) { } };

  // ---------- icons into buttons ----------
  const IC = { hHome: 'home', hSet: 'gear', pBack: 'back', bUndo: 'undo', bPause: 'pause', bHint: 'hint', bWand: 'wand', bHand: 'hand', pPlay: 'play', pPacks: 'packs', pGal: 'gallery', pWand: 'wand', fNext: 'next', fReplay: 'replay', fGal: 'gallery', fShow: 'eye', fPaint: 'brush', gBack: 'back', sBack: 'back', bBurst: 'burst', bPeek: 'eye', vBack: 'back', vPlay: 'play', vVer: 'eye', vFrame: 'frame', vPaint: 'brush', vSave: 'save', vDel: 'trash' };
  for (const id in IC) { const e = document.getElementById(id); if (e) e.innerHTML = A.icon(IC[id]); }
  $$('[data-i]').forEach(e => e.innerHTML = A.icon(e.dataset.i)); $$('[data-set]').forEach(e => e.innerHTML = A.icon('gear'));
  $('#chev').innerHTML = A.icon('next');
  $('#tPacks').innerHTML = A.icon('packs') + '<span>Pictures</span>'; $('#tPhoto').innerHTML = A.icon('photo') + '<span>My Photo</span>'; $('#tGal').innerHTML = A.icon('gallery') + '<span>Gallery</span>';
  $$('.tabs button').forEach(b => { b.innerHTML = A.icon(b.dataset.tab === 'packs' ? 'packs' : b.dataset.tab === 'photo' ? 'photo' : 'gallery'); b.onclick = () => { if (b.dataset.tab !== scr) go(b.dataset.tab); }; });
  $('#logo').innerHTML = '<svg viewBox="0 0 100 100"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9bd2"/><stop offset="1" stop-color="#b56cff"/></linearGradient></defs><path d="M50 90C12 62 6 44 6 32a22 22 0 0 1 44-5 22 22 0 0 1 44 5c0 12-6 30-44 58z" fill="url(#lg)" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M50 30 68 44 50 70 32 44z" fill="#ffe27a" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M32 44h36M50 30v40" stroke="#fff" stroke-opacity=".7" stroke-width="2"/></svg>';

  // ---------- screens + history guard ----------
  function go(s, opt) {
    if (s === scr && !(opt && opt.force)) return; const from = scr; if (HOOK.leave) HOOK.leave(from, s); prev = scr; scr = s;
    $$('.screen').forEach(e => e.classList.toggle('on', e.id === 'sc-' + s));
    if (from === 'play' && G && G.free) saveFreeGal();
    if (s !== 'play') { stopLoop(); FZ && FZ.wake(false); } else FZ && FZ.wake(true);
    if (s !== 'fin' && s !== 'view') stopCelebration();
    if (s === 'start') showStart(); else if (s === 'packs') showPacks(); else if (s === 'gal') showGal(); else if (s === 'set') showSettings(); else if (s === 'fin') showFin(); else if (s === 'view') showView(); else if (HOOK[s]) HOOK[s](from);
    if (s !== 'play' && s !== 'fin' && FZ && FZ.breakCheck) FZ.breakCheck({ muted: true });
    AU.whoosh(); AU.bed(s === 'play' && !paused);
    if (from !== s) { const v = SCR_SAY[s]; if (v) AU.say(v); }
    syncTabs();
  }
  function syncTabs() {
    const photo = !!(sd().set && sd().set.photo);
    $$('.tabs [data-tab=photo]').forEach(b => { b.hidden = !photo; });
    $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === scr));
  }
  const SCR_SAY = { packs: 'packs', gal: 'gallery', photo: 'photo' };
  nav(() => { history.replaceState({ cm: 1 }, ''); history.pushState({ cm: 2 }, ''); });
  addEventListener('popstate', () => {
    nav(() => history.pushState({ cm: 2 }, ''));
    if (HOOK.back && HOOK.back()) return;
    if (scr === 'play') { paused ? go('packs') : pause(); return; }
    if (scr === 'fin') { go(G && G.custom ? 'photo' : 'packs'); return; }
    if (scr === 'view') { go('gal'); return; }
    if (scr === 'set') { go(prev === 'set' ? 'start' : prev); return; }
    if (scr !== 'start') go('start');
  });

  // ---------- settings apply ----------
  function applySettings() {
    const s = sd().set; AU.set({ sfx: s.mus, voice: s.voice, music: s.music, vol: s.vol / 100 * (FZ ? FZ.vol() : 1), calm: calm() }); AU.attach(sd().seen); AU.bed(scr === 'play' && !paused);
    if (R.S) { R.S.nums = s.nums; R.S.hl = true; R.S.calm = calm(); R.invalidate(); }
    $('#bHint').hidden = !s.helpers; if (!s.helpers) burstArmed = false; syncWand();
    $('#tPhoto').hidden = !s.photo; syncTabs();
  }
  if (FZ && FZ.onChange) FZ.onChange(applySettings);

  // ---------- thumbs ----------
  // E: thumbnails only need the shapes, not the boxes and number spots R.prep measures with one raster pass per shape (that made every pack tap freeze ~1-2 s at 4x CPU)
  const liteMap = new WeakMap();
  function liteP(pic) {
    if (pic.pre) return R.prep(pic); let P = liteMap.get(pic); if (P) return P;
    const n = pic.shapes.length; P = { pic, n, path: [], clip: [], col: new Uint8Array(n), bb: [], lab: [], line: pic.line.map(d => new Path2D(d)) };
    for (let i = 0; i < n; i++) { const s = pic.shapes[i]; P.path[i] = new Path2D(s[1]); P.clip[i] = s[2] ? new Path2D(s[2]) : null; P.col[i] = s[0]; }
    liteMap.set(pic, P); return P;
  }
  // Display thumbs keep their CSS box and paint the backing store at size * min(DPR, 2.5). Saved blobs pass scale 1.
  const pxScale = () => Math.min(dpr(), 2.5);
  function thumb(pic, fc, size, scale) {
    const W = pic.w || 2048, H = pic.h || 2048, k = size / Math.max(W, H), sc = scale > 0 ? scale : 1, c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(W * k * sc - 1e-6)); c.height = Math.max(1, Math.ceil(H * k * sc - 1e-6));
    const g = c.getContext('2d'); g.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
    const P = liteP(pic); const f = new Uint8Array(P.n); if (fc) f.set(fc.subarray ? fc.subarray(0, P.n) : fc); R.drawFlat(g, { P, pal: pic.pal, fc: f, reveal: pic.reveal || null }, {}); return c;
  }
  function mountThumb(parent, pic, fc, size) {
    const s = pxScale(); let c = thumb(pic, fc, size, s); parent.appendChild(c);
    const r = c.getBoundingClientRect();
    if (r.width >= 2 && r.height >= 2 && (c.width < Math.ceil(r.width * s - 1e-4) || c.height < Math.ceil(r.height * s - 1e-4))) {
      const n = thumb(pic, fc, Math.max(r.width, r.height), s); parent.replaceChild(n, c); c = n;
    }
    return c;
  }
  const picBy = (pk, id) => { const p = CM_PACKS[pk]; return p && p.pics.find(x => x.id === id); };
  const pidOf = (pk, id) => 'pk:' + pk + '.' + id;
  // Detail variants are pk:<pack>.<pic>d2 / d3. The base picture must exist and the full id must not itself be a real picture.
  function isDetail(id) {
    const m = /^pk:([a-z0-9]+)\.([a-z0-9]+)d([23])$/.exec(id);
    if (!m) return null;
    if (picBy(m[1], m[2] + 'd' + m[3])) return null;
    if (!picBy(m[1], m[2])) return null;
    return { pk: m[1], id: m[2], level: m[3] === '3' ? 3 : 2 };
  }
  // Photo packs: pk:<pack>.<pic>:L2 (Easy, photo level 2) and :L4 (Hard, photo level 4). Additive ids; cartoon ids are unchanged.
  function isPhotoPz(id) {
    const m = /^pk:([a-z0-9]+)\.([a-z0-9]+):L([24])$/.exec(id);
    if (!m) return null;
    const pic = picBy(m[1], m[2]);
    if (!pic || !pic.photo) return null;
    return { pk: m[1], id: m[2], level: m[3] === '4' ? 4 : 2 };
  }
  const photoId = (pk, id, level) => 'pk:' + pk + '.' + id + ':L' + level;
  function photoRec(pk, pic) {
    let best = null;
    for (const n of [2, 4]) { const r = progMap.get(photoId(pk, pic.id, n)); if (r && (!best || (r.t || 0) >= (best.t || 0))) best = r; }
    return best;
  }
  // Mosaic ids are new: cartoon pk:<pack>.<pic>t3/t4, photo pk:<pack>.<pic>:T3/:T4. Personal photos keep ph: and may set pmeta.tier.
  function isMosaic(id) {
    const c = /^pk:([a-z0-9]+)\.([a-z0-9]+)t([34])$/.exec(id);
    if (c && picBy(c[1], c[2]) && !picBy(c[1], c[2] + 't' + c[3]) && !picBy(c[1], c[2]).photo) return { pk: c[1], id: c[2], tier: c[3] === '4' ? 4 : 3, kind: 'cartoon' };
    const p = /^pk:([a-z0-9]+)\.([a-z0-9]+):T([34])$/.exec(id);
    if (p) { const pic = picBy(p[1], p[2]); if (pic && pic.photo) return { pk: p[1], id: p[2], tier: p[3] === '4' ? 4 : 3, kind: 'photo' }; }
    return null;
  }
  const mosaicId = (pk, id, tier, photo) => photo ? ('pk:' + pk + '.' + id + ':T' + tier) : (pidOf(pk, id) + 't' + tier);
  const mosaicHidden = id => !sd().set.mosaic && !!isMosaic(id);
  const isCustom = id => typeof id === 'string' && (/^ph:[a-z0-9]+$/.test(id) || /^pk:[a-z0-9]+\.[a-z0-9]+:px\d+p\d+s?$/.test(id) || !!isDetail(id) || !!isPhotoPz(id) || !!isMosaic(id));
  async function loadMaps() {
    progMap.clear(); galMap.clear(); galFree.clear();
    for (const r of await SV.allProg()) {
      const m = /^pk:([a-z0-9]+)\.([a-z0-9]+)$/.exec(r.id), pic = m && !isDetail(r.id) && picBy(m[1], m[2]), v = pic ? SV.valid(r, pic.shapes.length) : (isCustom(r.id) && r.n > 0 ? SV.valid(r, r.n) : null);
      if (v) progMap.set(r.id, v); else if (!/:free$/.test(r.id)) SV.quarantine.set('progress:' + r.id, r);   // bad records are hidden, never deleted
    }
    for (const r of await SV.allGal()) { const m = /^pk:([a-z0-9]+)\.([a-z0-9]+)$/.exec(r.pid); if ((m && !isDetail(r.pid) && picBy(m[1], m[2])) || isCustom(r.pid)) (r.free ? galFree : galMap).set(r.pid, r); else SV.quarantine.set('gallery:' + r.id, r); }
  }
  const fracOf = (pk, pic) => {
    if (pic.photo) { const r = photoRec(pk, pic); return r && r.n ? Math.min(1, r.order.length / r.n) : 0; }
    const r = progMap.get(pidOf(pk, pic.id)); return r && r.order ? Math.min(1, r.order.length / pic.shapes.length) : 0;
  };
  const fracRec = r => r && r.order && r.n ? Math.min(1, r.order.length / r.n) : 0;

  // ---------- start ----------
  async function showStart() {
    await loadMaps(); const k = $('#keep'); let best = null;
    for (const p of PACKS) for (const pic of p.pics) {
      if (pic.photo) { const r = photoRec(p.id, pic); if (r && r.order.length && r.order.length < r.n && (!best || r.t > best.r.t)) best = { p, pic, r, cid: r.id }; continue; }
      const r = progMap.get(pidOf(p.id, pic.id)); if (r && r.order.length && r.order.length < pic.shapes.length && (!best || r.t > best.r.t)) best = { p, pic, r };
    }
    for (const [id, r] of progMap) if (isCustom(id) && !mosaicHidden(id) && r.order.length && r.order.length < r.n && (!best || r.t > best.r.t)) best = { cid: id, r };
    k.hidden = !best; if (best) {
      const c = k.querySelector('canvas'), s = pxScale(), rect = c.getBoundingClientRect(), cssW = rect.width >= 2 ? rect.width : 96, cssH = rect.height >= 2 ? rect.height : cssW;
      c.width = Math.max(1, Math.ceil(cssW * s - 1e-4)); c.height = Math.max(1, Math.ceil(cssH * s - 1e-4));
      const cx = c.getContext('2d'); cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, c.width, c.height); k.querySelector('span').innerHTML = A.icon('play');
      if (best.cid) {
        k.onclick = () => API.openByPid(best.cid);
        (async () => {
          let drew = false;
          try {
            const pic = API.loadPic ? await API.loadPic(best.cid) : null;
            if (pic && !k.hidden && pic.shapes && pic.shapes.length) {
              const P = R.prep(pic), fc = new Uint8Array(pic.shapes.length);
              for (const i of best.r.order) if (i < fc.length) fc[i] = P.col[i] + 1;
              const t = thumb(pic, fc, Math.max(cssW, cssH), s);
              cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, c.width, c.height); cx.drawImage(t, 0, 0, c.width, c.height); drew = true;
            }
          } catch (e) { /* the stored preview still shows the picture */ }
          if (!drew && API.thumbOf) { const im = await API.thumbOf(best.cid); if (im && !k.hidden) { cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, c.width, c.height); const q = Math.min(c.width / im.width, c.height / im.height); cx.imageSmoothingQuality = 'high'; cx.drawImage(im, 0, 0, im.width * q, im.height * q); } }
        })();
      }
      else { const t = thumb(best.pic, fcFromOrder(best.pic, best.r.order), Math.max(cssW, cssH), s); cx.drawImage(t, 0, 0, c.width, c.height); k.onclick = () => openPic(best.p.id, best.pic.id); }
    }
    applySettings();
    const day = ymd(); if (sd().seen.hd !== day && sd().seen.first) { sd().seen.hd = day; SV.write(); AU.say('hello', { defer: true }); }
  }
  function fcFromOrder(pic, order) { const f = new Uint8Array(pic.shapes.length); for (const i of order) f[i] = pic.shapes[i][0] + 1; return f; }
  $('#tPacks').onclick = () => go('packs'); $('#tGal').onclick = () => go('gal');
  $('#tPhoto').onclick = () => go('photo');
  $$('[data-set]').forEach(b => b.onclick = () => { if (scr === 'play' && !paused) pause(); go('set'); }); $('#hSet').onclick = () => go('set');
  $('#pBack').onclick = () => go('start'); $('#gBack').onclick = () => go('start'); $('#sBack').onclick = () => go(prev && prev !== 'set' ? prev : 'start');

  // ---------- packs ----------
  const covers = new Map();   // pack id -> finished cover canvas (never changes)
  function notePack(pk) {
    const i = PACKS.findIndex(p => p.id === pk); if (i < 0) return;
    selPack = i; packReady = true; if (sd().last.pack !== pk) { sd().last.pack = pk; SV.write(); }
  }
  function rememberNav() {
    const p = PACKS[selPack]; if (!p || scr !== 'packs') return;
    sd().last.pack = p.id; sd().last.scroll = $('#picGrid').scrollTop | 0; sd().last.packX = $('#packRow').scrollLeft | 0; SV.write();
  }
  let navT = 0;
  for (const id of ['picGrid', 'packRow']) document.getElementById(id).addEventListener('scroll', () => { clearTimeout(navT); navT = setTimeout(rememberNav, 180); }, { passive: true });
  // R6: a fold changes the scroller's box. Keep the place she was, and do not rebuild the grid.
  function keepScroll(el) {
    let x = el.scrollLeft, y = el.scrollTop, w = el.clientWidth, h = el.clientHeight, lock = 0;
    el.addEventListener('scroll', () => { if (lock) return; x = el.scrollLeft; y = el.scrollTop; }, { passive: true });
    if (!window.ResizeObserver) return;
    new ResizeObserver(() => {
      const nw = el.clientWidth, nh = el.clientHeight; if (nw === w && nh === h) return;
      const sx = x, sy = y; w = nw; h = nh; lock++;
      const put = () => { el.scrollLeft = sx; el.scrollTop = sy; };
      requestAnimationFrame(() => { put(); requestAnimationFrame(() => { put(); setTimeout(() => { lock = Math.max(0, lock - 1); }, 0); }); });
    }).observe(el);
  }
  for (const id of ['picGrid', 'galGrid', 'phGrid', 'packRow']) keepScroll(document.getElementById(id));
  async function showPacks() {
    await loadMaps();
    if (!packReady) { const i = PACKS.findIndex(p => p.id === sd().last.pack); if (i >= 0) selPack = i; packReady = true; }
    const row = $('#packRow'); row.innerHTML = '';
    PACKS.forEach((p, i) => {
      const b = document.createElement('button'); b.className = 'pcov' + (i === selPack ? ' sel' : ''); const done = p.pics.filter(x => fracOf(p.id, x) >= 1).length;
      row.appendChild(b);
      if (p.photo) { const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = 320; im.height = 240; im.src = p.pics[0].thumb; b.appendChild(im); }
      else { let cv = covers.get(p.id); if (!cv) { cv = thumb(p.pics[0], fcFromOrder(p.pics[0], p.pics[0].shapes.map((s, k) => k)), 200, Math.min(pxScale(), 1.15)); covers.set(p.id, cv); } b.appendChild(cv); }
      const t = document.createElement('div'); t.textContent = p.name + ' ' + done + '/' + p.pics.length; b.appendChild(t);
      b.onclick = () => { if (selPack === i) return; selPack = i; $$('#packRow .pcov').forEach((e, k) => e.classList.toggle('sel', k === i)); showGrid(); rememberNav(); const said = { fall: 'fall', winter: 'winter', spring: 'spring', summer: 'summer', holidays: 'holidays', flowers: 'flowers' }[p.id]; if (said) AU.say(said); AU.tick(); };
    });
    $('#chev').hidden = PACKS.length < 2;
    const x = sd().last.pack === PACKS[selPack].id ? (sd().last.packX | 0) : 0;
    showGrid();
    if (x) requestAnimationFrame(() => { const r = $('#packRow'); if (r) r.scrollLeft = x; });
  }
  // R6: picture thumbs are drawn when they scroll near the grid, one at a time during idle, and kept as an ImageBitmap per picture.
  const bitCache = new WeakMap();
  let gridGen = 0, gridIO = null, thumbBusy = false;
  const thumbQ = [];
  function fillSig(fc) {
    if (!fc) return 'e';
    let h = 2166136261, n = 0;
    for (let i = 0; i < fc.length; i++) if (fc[i]) { n++; h ^= i + 1; h = Math.imul(h, 16777619); }
    return n + ':' + (h >>> 0).toString(16);
  }
  function bitOf(pic, sig) { const m = bitCache.get(pic); return m ? m.get(sig) : null; }
  function bitPut(pic, sig, bm) {
    let m = bitCache.get(pic); if (!m) { m = new Map(); bitCache.set(pic, m); }
    const prev = m.get(sig); if (prev && prev !== bm && prev.close) prev.close();
    m.set(sig, bm);
    while (m.size > 2) { const k = m.keys().next().value, b = m.get(k); m.delete(k); if (b && b !== bm && b.close) b.close(); }
  }
  function blitBit(c, bm) {
    const s = pxScale(), r = c.getBoundingClientRect();
    const tw = Math.min(256, Math.max(1, Math.ceil((r.width >= 2 ? r.width : 160) * s - 1e-4))), th = Math.min(256, Math.max(1, Math.ceil((r.height >= 2 ? r.height : 160) * s - 1e-4)));
    if (c.width !== tw) c.width = tw; if (c.height !== th) c.height = th;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.clearRect(0, 0, tw, th); g.drawImage(bm, 0, 0, tw, th);
  }
  function pumpThumbs() {
    if (thumbBusy) return;
    const job = thumbQ.shift(); if (!job) return;
    const run = () => {
      if (job.gen !== gridGen || !job.el.isConnected) { pumpThumbs(); return; }
      const sig = fillSig(job.fc), hit = bitOf(job.pic, sig);
      let c = job.el.querySelector('canvas');
      if (!c) { c = document.createElement('canvas'); job.el.insertBefore(c, job.el.firstChild); }
      if (hit) { blitBit(c, hit); setTimeout(pumpThumbs, 0); return; }
      thumbBusy = true;
      const src = thumb(job.pic, job.fc, 220, pxScale());
      const fin = bm => {
        bitPut(job.pic, sig, bm); src.width = src.height = 0; thumbBusy = false;
        if (job.gen === gridGen && job.el.isConnected) blitBit(c, bm);
        pumpThumbs();
      };
      if (typeof createImageBitmap === 'function') createImageBitmap(src).then(fin, () => { thumbBusy = false; if (job.gen === gridGen && job.el.isConnected) c.replaceWith(src); else src.width = src.height = 0; pumpThumbs(); });
      else { thumbBusy = false; c.replaceWith(src); pumpThumbs(); }
    };
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 320 }); else setTimeout(run, 0);
  }
  function watchThumb(el, pic, fc, gen) {
    const job = { el, pic, fc, gen }; el._tj = job;
    if (!window.IntersectionObserver) { thumbQ.push(job); pumpThumbs(); return; }
    const io = gridIO || (gridIO = new IntersectionObserver(ents => {
      for (const en of ents) {
        if (!en.isIntersecting) continue;
        gridIO.unobserve(en.target);
        const j = en.target._tj; if (!j || j.gen !== gridGen) continue;
        thumbQ.push(j); pumpThumbs();
      }
    }, { root: $('#picGrid'), rootMargin: '180px 0px' }));
    io.observe(el);
  }
  function showGrid() {
    const grid = $('#picGrid'); grid.innerHTML = ''; const p = PACKS[selPack]; const gen = ++gridGen; thumbQ.length = 0;
    const y = sd().last.pack === p.id ? (sd().last.scroll | 0) : 0;
    for (const pic of p.pics) {
      const b = document.createElement('button'); b.className = 'pic'; const f = fracOf(p.id, pic), r = progMap.get(pidOf(p.id, pic.id));
      grid.appendChild(b);
      const st = document.createElement('div'); st.className = 'st'; st.innerHTML = A.hearts(pic.stars); b.appendChild(st);
      const ring = document.createElement('div'); if (f >= 1) { ring.className = 'crown'; ring.innerHTML = A.icon('gem'); } else if (f > 0) { ring.className = 'ring'; ring.innerHTML = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="none" stroke="#ffd0ea" stroke-width="6"/><circle cx="20" cy="20" r="14" fill="none" stroke="#d6339f" stroke-width="6" stroke-dasharray="' + (88 * f).toFixed(1) + ' 88" transform="rotate(-90 20 20)" stroke-linecap="round"/></svg>'; }
      if (ring.className) b.appendChild(ring);
      b.onclick = () => { if (pic.photo) { openPic(p.id, pic.id); return; } if (API.pickPack && !r && !galMap.has(pidOf(p.id, pic.id))) API.pickPack(p.id, pic.id); else openPic(p.id, pic.id); };
      if (pic.photo) { const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = 160; im.height = 160; im.src = pic.thumb; b.insertBefore(im, b.firstChild); }
      else watchThumb(b, pic, r ? fcFromOrder(pic, r.order) : null, gen);
    }
    const pin = () => { if (grid.isConnected && scr === 'packs') grid.scrollTop = y; };
    pin(); requestAnimationFrame(pin);
  }

  // ---------- opening a picture ----------
  async function openPic(pk, id, o) {
    const pic = picBy(pk, id); if (!pic) return; notePack(pk);
    o = o || {};
    if (pic.photo) {
      const rec = photoRec(pk, pic);
      if (o.free) { if (rec) return API.openByPid(rec.id, o); return; }
      if (rec && !o.pick) return API.openByPid(rec.id, o);
      return API.pickPack(pk, id);
    }
    return openGame(pk, pic, pidOf(pk, id), o);
  }
  async function openGame(pk, pic, pid, o) {
    o = o || {}; await loadMaps();
    const free = !!o.free;
    go('play', { force: true }); layoutNow(true); pickQ();
    const n = pic.shapes.length; let rec = await SV.getProg(free ? pid + ':free' : pid, n);
    const done = !free && galMap.has(pid) && rec && rec.order.length >= n;
    if (done && !o.restart) { G = null; buildGame(pk, pic, pid, rec, free); finishView(true); return; }
    buildGame(pk, pic, pid, rec, free);
    if (!free && rec && rec.order.length) AU.say('back'); else if (!sd().seen.first && pk === 'gems' && pic.id === 'hg1') AU.say('hello', { defer: true });
    if (!sd().seen.first) { sd().seen.first = 1; SV.write(); }
    sd().last.pid = pid; SV.write(); setPaused(false); startLoop(); toast(null);
  }
  function buildGame(pk, pic, pid, rec, free) {
    const n = pic.shapes.length, fc = new Uint8Array(n), order = [];
    if (rec) { if (free && rec.free) { for (let i = 0; i < n; i++) fc[i] = rec.free[i] || 0; } else if (!free) for (const i of rec.order) { fc[i] = pic.shapes[i][0] + 1; order.push(i); } }
    const S = R.setPuzzle(pic, pic.pal, fc, { nums: !free && sd().set.nums, calm: calm(), reveal: free ? null : pic.reveal || null, wantReveal: !free && (!!pic.photo || !!pic.reveal), tier: pic.tier | 0 });
    // D 6: a pack shape that later shapes cover completely has no spot at all (lab [.., 0]) and could never be tapped: count it as coloured
    if (!free && !pic.pre) for (let i = 0; i < n; i++) if (!fc[i] && S.P.lab[i][2] <= 0) { fc[i] = S.P.col[i] + 1; order.push(i); }
    G = { pk, pic, pid, free, n, custom: !!pic.custom, fc, order, ops: [], rem: [], tot: [], sel: 0, t0: performance.now(), ms: rec ? rec.ms : 0, step: 0, P: S.P, done: false, guide: -1 };
    const used = new Set(); for (let i = 0; i < n; i++) used.add(S.P.col[i]); G.used = [...used].sort((a, b) => a - b);
    for (const c of G.used) { G.rem[c] = 0; G.tot[c] = 0; }
    for (let i = 0; i < n; i++) { G.tot[S.P.col[i]]++; if (!fc[i]) G.rem[S.P.col[i]]++; }
    G.left = fc.reduce((a, v, i) => a + (v ? 0 : 1), 0); G.halfSaid = !free && G.left <= n / 2;
    buildPalette();
    const first = G.used.find(c => G.rem[c] > 0); G.sel = free ? (rec && rec.sel || G.used[0] + 1) : (rec && rec.sel && G.rem[rec.sel - 1] > 0 ? rec.sel : (first == null ? 0 : first + 1));
    selectSwatch(G.sel, true); updateMeter(); updateGlow(); R.S.hl = !free;
    lastFill = performance.now(); wandOn = false; syncWand();
    if (!free && !sd().seen.first && pk === 'gems' && pic.id === 'hg1') guide();
    $('#bUndo').style.visibility = 'visible'; R.invalidate(); syncPeek();
    if (!free && pic.photo && !pic.reveal && R.loadReveal) {
      const mine = pic;
      R.loadReveal(pic.photo, pic.w || 2048, pic.h || 1536).then(bm => {
        if (!bm || !G || G.pic !== mine) return;
        mine.reveal = bm; R.setReveal(bm); kick(); syncPeek();
      }).catch(() => {});
    }
  }
  function guide() { // first launch: swatch 1 bounces and one big region pulses
    const sw = $('.sw[data-c="' + G.sel + '"]'); if (sw) sw.classList.add('bounce');
    let best = -1, bd = 0; for (let i = 0; i < G.n; i++) if (!G.fc[i] && G.P.col[i] === G.sel - 1 && G.P.lab[i][2] > bd) { bd = G.P.lab[i][2]; best = i; }
    if (best >= 0) { G.guide = best; R.glow.add(best); }
  }

  // ---------- palette ----------
  const lum = h => { const v = parseInt(h.slice(1), 16); return ((v >> 16) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11) / 255; };
  function buildPalette() {
    const pal = $('#pal'); pal.innerHTML = '';
    for (const c of G.used) {
      const b = document.createElement('button'); b.className = 'sw'; b.dataset.c = c + 1; b.setAttribute('aria-label', 'Color ' + (c + 1));
      b.innerHTML = '<span class="face"><span>' + (c + 1) + '</span></span><svg class="pr" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18.5" stroke-dasharray="116.2" stroke-dashoffset="116.2"/></svg>';
      const face = b.firstChild; face.style.background = G.pic.pal[c]; face.style.color = lum(G.pic.pal[c]) > 0.62 ? '#5a1040' : '#fff';
      b.onclick = () => { selectSwatch(c + 1); AU.tick(); }; pal.appendChild(b);
    }
    ringQ.clear(); refreshRings(); requestAnimationFrame(palSync);
  }
  const ringQ = new Set();   // colours whose ring changed since the last refresh (empty = all)
  function refreshRings() { const list = ringQ.size ? [...ringQ] : G.used; ringQ.clear(); for (const c of list) { const b = $('.sw[data-c="' + (c + 1) + '"]'); if (!b) continue; const f = G.free ? 0 : 1 - G.rem[c] / G.tot[c]; b.querySelector('circle').style.strokeDashoffset = (116.2 * (1 - f)).toFixed(1); b.classList.toggle('done', !G.free && G.rem[c] === 0); } palSync(); }
  function selectSwatch(num, quiet) {
    G.sel = num; R.S.sel = num; $$('.sw').forEach(b => { b.classList.toggle('sel', +b.dataset.c === num); b.classList.remove('bounce'); });
    const b = $('.sw[data-c="' + num + '"]'); if (b && b.scrollIntoView) nav(() => b.scrollIntoView({ block: 'center', inline: 'center' })); R.invalidateFx(); kick(); palSync();
  }
  function palSync() {
    const pal = $('#pal'), prev = $('#palPrev'), next = $('#palNext'); if (!pal || !prev || !next) return;
    if (!G || scr !== 'play') { prev.hidden = next.hidden = true; pal.classList.remove('fadeS', 'fadeE'); return; }
    const land = matchMedia('(orientation: landscape)').matches, box = pal.getBoundingClientRect();
    const offS = el => { const r = el.getBoundingClientRect(); return land ? r.top < box.top - 1 : r.left < box.left - 1; };
    const offE = el => { const r = el.getBoundingClientRect(); return land ? r.bottom > box.bottom + 1 : r.right > box.right + 1; };
    const used = G.used, i0 = Math.max(0, used.indexOf((G.sel | 0) - 1));
    const open = k => !G.free && G.rem[k] > 0;
    let prevU = null, nextU = null;
    for (let k = 1; k < used.length; k++) { const c = used[(i0 - k + used.length) % used.length]; if (open(c)) { prevU = c + 1; break; } }
    for (let k = 1; k < used.length; k++) { const c = used[(i0 + k) % used.length]; if (open(c)) { nextU = c + 1; break; } }
    const moreS = land ? pal.scrollTop > 4 : pal.scrollLeft > 4;
    const moreE = land ? pal.scrollTop + pal.clientHeight < pal.scrollHeight - 4 : pal.scrollLeft + pal.clientWidth < pal.scrollWidth - 4;
    const setBtn = (btn, num, off, more, dir) => {
      const el = num ? $('.sw[data-c="' + num + '"]') : null;
      if (el && off(el)) { btn.hidden = false; btn.classList.add('gold'); btn.dataset.act = 'jump'; btn.dataset.c = String(num); btn.setAttribute('aria-label', 'Next colour'); }
      else if (more) { btn.hidden = false; btn.classList.remove('gold'); btn.dataset.act = 'page'; btn.dataset.dir = String(dir); btn.setAttribute('aria-label', dir < 0 ? 'Previous colours' : 'More colours'); }
      else btn.hidden = true;
    };
    setBtn(prev, prevU, offS, moreS, -1); setBtn(next, nextU, offE, moreE, 1);
    const gapS = $('#palGapS'), gapE = $('#palGapE'); if (gapS) gapS.hidden = prev.hidden; if (gapE) gapE.hidden = next.hidden;
    pal.classList.toggle('fadeS', moreS); pal.classList.toggle('fadeE', moreE);
  }
  function palNavClick(e) {
    const b = e.currentTarget, pal = $('#pal'); if (!pal || b.hidden) return;
    if (b.dataset.act === 'jump') selectSwatch(+b.dataset.c);
    else {
      const land = matchMedia('(orientation: landscape)').matches, dir = +b.dataset.dir || 1, d = dir * (land ? pal.clientHeight : pal.clientWidth) * 0.75;
      pal.scrollBy(land ? { top: d, behavior: calm() ? 'auto' : 'smooth' } : { left: d, behavior: calm() ? 'auto' : 'smooth' });
    }
    AU.tick();
  }
  $('#palPrev').onclick = palNavClick; $('#palNext').onclick = palNavClick;
  $('#pal').addEventListener('scroll', palSync, { passive: true });
  function updateMeter() { const f = G.free ? 0 : 1 - G.left / G.n; $('#meter i').style.width = (f * 100).toFixed(1) + '%'; $('#meter').style.visibility = G.free ? 'hidden' : 'visible'; }
  function updateGlow() {
    R.glow.clear(); if (G.free) return;
    if (G.left > 0 && G.left <= 5) { for (let i = 0; i < G.n; i++) if (!G.fc[i]) R.glow.add(i); if (!G.fewSaid) { G.fewSaid = 1; toast('sparkle'); AU.say('few'); } }
    else if (G.guide >= 0 && !G.fc[G.guide]) R.glow.add(G.guide);
  }
  function toast(ic) { const t = $('#toast'); clearTimeout(toast.t); if (!ic) { t.classList.remove('on'); return; } t.innerHTML = A.icon(ic) + A.icon(ic) + A.icon(ic); t.classList.add('on'); toast.t = setTimeout(() => t.classList.remove('on'), 2400); }

  // ---------- fill / undo / helpers ----------
  function fillRegion(i, o) {
    o = o || {}; const col = G.free ? G.sel : G.P.col[i] + 1, prevC = G.fc[i]; G.fc[i] = col; R.setFill(i, col);
    if (!G.free) { ringQ.add(G.P.col[i]); G.order.push(i); G.rem[G.P.col[i]]--; G.left--; }
    const L = G.P.lab[i]; if (!o.quiet) R.burst(L[0], L[1], 7, calm());
    return prevC;
  }
  function afterFill(quiet, c) {
    updateMeter(); updateGlow(); refreshRings(); saveProg(); lastFill = performance.now(); if (wandOn || burstArmed) { wandOn = false; burstArmed = false; syncWand(); }
    if (G.guide >= 0 && G.fc[G.guide]) G.guide = -1;
    if (!G.free && G.left === 0) { setTimeout(() => finishGame(), quiet ? 0 : 650); return; }
    if (!G.free && !G.halfSaid && G.left <= G.n / 2 && G.left > 0) { G.halfSaid = 1; if (!quiet) AU.say('half'); }
    if (!G.free && c != null && G.rem[c] === 0 && !quiet) {
      AU.colorDone(); AU.say('colordone'); const nx = G.used.find(k => G.rem[k] > 0); if (nx != null) selectSwatch(nx + 1);
    }
    kick();
  }
  const pushOp = op => { G.ops.push(op); if (G.ops.length > 200) G.ops.shift(); };   // §5: at most 200 undo ops; a wand or burst is one op
  // Tiny spots (D 6): a tap that does not land on a right-colour spot snaps to the nearest unfilled spot of the picked colour that is
  // smaller than a fingertip on screen (inradius < SNAP_R) and within SNAP_D css px of the finger. Big spots never steal a tap.
  const SNAP_R = 12, SNAP_D = 24;
  function snapTap(w, i) {
    if (G.free || G.sel < 1 || G.P.grid) return i;
    const c = G.sel - 1; if (i >= 0 && !G.fc[i] && G.P.col[i] === c) return i;
    const z = R.zoom, lab = G.P.lab; let best = i, bd = (SNAP_D / z) ** 2;
    for (let j = 0; j < G.n; j++) { if (G.fc[j] || G.P.col[j] !== c || lab[j][2] * z >= SNAP_R) continue; const d = (lab[j][0] - w[0]) ** 2 + (lab[j][1] - w[1]) ** 2; if (d < bd) { bd = d; best = j; } }
    return best;
  }
  function tapAt(sx, sy) {
    if (!G || paused) return; const w = R.s2w(sx, sy), i = snapTap(w, R.hit(w[0], w[1])); if (i < 0) return; AU.unlock();
    if (G.free) { if (G.fc[i] === G.sel) return; const p = G.fc[i]; pushOp([[i, p]]); fillRegion(i); AU.pop(G.step++); afterFill(false); return; }
    if (burstArmed) { burstArmed = false; if (burstAt(i)) return; syncWand(); }
    if (G.fc[i]) { AU.tick(); return; }
    const c = G.P.col[i];
    if (c + 1 !== G.sel) { AU.boop(); AU.say('look'); const b = $('.sw[data-c="' + (c + 1) + '"]'); if (b) { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); nav(() => b.scrollIntoView({ block: 'center', inline: 'center', behavior: calm() ? 'auto' : 'smooth' })); setTimeout(() => b.classList.remove('nudge'), 1900); } return; }
    pushOp([[i, 0]]); fillRegion(i); AU.pop(G.tot[c] - G.rem[c] - 1); afterFill(false, c);
  }
  function undo() {
    if (!G || paused || !G.ops.length) return; const op = G.ops.pop();
    for (const [i, p] of op) { G.fc[i] = p; R.setFill(i, p); if (!G.free) { ringQ.add(G.P.col[i]); G.order.pop(); G.rem[G.P.col[i]]++; G.left++; } }
    if (!G.free) { const c = G.P.col[op[0][0]]; selectSwatch(c + 1); } AU.tick(); G.fewSaid = 0; afterFill(true); G.done = false;
  }
  function hint() {
    if (!G || paused || G.free) return; let best = -1, bd = 1e18; const cx = R.cam.x, cy = R.cam.y;
    // passes: picked colour (roomy spot), any colour (roomy), then (E) small spots too: when only small spots were left the hint did nothing (25 of 92 pictures)
    for (const pass of [3, 2, 1, 0]) { for (let i = 0; i < G.n; i++) { if (G.fc[i] || ((pass & 1) && G.P.col[i] !== G.sel - 1)) continue; const L = G.P.lab[i]; if (pass > 1 && L[2] < 20) continue; const d = (L[0] - cx) ** 2 + (L[1] - cy) ** 2; if (d < bd) { bd = d; best = i; } } if (best >= 0) break; }
    if (best < 0) return; selectSwatch(G.P.col[best] + 1); const L = G.P.lab[best];
    R.flyTo(L[0], L[1], Math.max(R.cam.z, 32 / L[3]), calm() ? 0 : 400, calm()); R.setRing(L[0], L[1]); AU.say('hint'); AU.tick(); kick();
  }
  // Magic wand: after 20 s without a fill (or from Pause) it fills every remaining region of the picked number with a sparkle sweep. One undo op.
  function wand(force) {
    if (!G || paused || G.free || !sd().set.helpers || !(force === true || wandOn)) return;
    const ids = []; for (let i = 0; i < G.n; i++) if (!G.fc[i] && G.P.col[i] === G.sel - 1) ids.push(i);
    if (!ids.length) return; const c = G.sel - 1; pushOp(ids.map(i => [i, 0]));
    const pts = ids.map(i => [G.P.lab[i][0], G.P.lab[i][1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);   // trail sweeps left to right
    for (const i of ids) fillRegion(i, { quiet: true });
    R.sweep(pts, calm() ? 250 : 700); AU.wand(); AU.say('wand'); afterFill(false, c);
  }
  // Burst (Squares only): the next tap fills every unfilled cell within 3 cells of it with its own correct color. One undo op.
  function burstAt(i) {
    if (!G || paused || G.free || !G.P.grid || !sd().set.helpers) return false;
    const gw = G.P.grid.gw, gh = G.P.grid.gh, cx = i % gw, cy = (i / gw) | 0, ids = [];
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = cx + dx, y = cy + dy; if (dx * dx + dy * dy > 9 || x < 0 || y < 0 || x >= gw || y >= gh) continue; const j = y * gw + x; if (!G.fc[j]) ids.push(j); }
    if (!ids.length) return false; pushOp(ids.map(j => [j, 0]));
    const pts = ids.map(j => [G.P.lab[j][0], G.P.lab[j][1], (j % gw - cx) ** 2 + ((j / gw | 0) - cy) ** 2]).sort((a, b) => a[2] - b[2]);   // ripples outward from the tap
    const cols = new Set(); for (const j of ids) { cols.add(G.P.col[j]); fillRegion(j, { quiet: true }); }
    R.sweep(pts, calm() ? 150 : 450); AU.burst(); AU.say('burst');
    let c = null; for (const k of cols) if (G.rem[k] === 0 && (c == null || k === G.sel - 1)) c = k;
    afterFill(false, c); return true;
  }
  function syncWand() {
    const h = !!(sd().set.helpers && G && !G.free), grid = !!(G && G.P && G.P.grid);
    $('#bWand').hidden = !(wandOn && h); $('#pWand').hidden = !((wandOn || paused) && h);
    $('#bBurst').hidden = !(h && grid && (wandOn || burstArmed)); $('#bBurst').classList.toggle('on', burstArmed);
  }
  setInterval(() => { if (G && scr === 'play' && !paused && !G.free && !wandOn && performance.now() - lastFill > 20000) { wandOn = true; syncWand(); } }, 1000);
  $('#bUndo').onclick = undo; $('#bHint').onclick = hint; $('#bWand').onclick = () => wand(); $('#pWand').onclick = () => { setPaused(false); wand(true); };
  $('#bBurst').onclick = () => { burstArmed = !burstArmed; syncWand(); AU.tick(); toast(burstArmed ? 'burst' : null); };
  $('#bHand').onclick = () => { panMode = !panMode; $('#bHand').classList.toggle('on', panMode); };
  // R2 Peek: hold the eye to see the whole photo over the canvas (same camera), release to go back. Only when the picture has a photo to show.
  let peeking = 0;
  const syncPeek = () => { const b = $('#bPeek'); if (b) b.hidden = !(G && !G.free && G.pic && G.pic.reveal); if (b && b.hidden) peekOff(); };
  function peekOn() {
    if (peeking || !G || G.free || !G.pic.reveal || scr !== 'play' || paused) return; const cv = $('#peekCv'), art = $('#art'), bm = G.pic.reveal, [WW, WH] = R.world, z = R.zoom, cam = R.cam, d = R.dpr, [cw, ch] = R.size;
    cv.width = art.width; cv.height = art.height; const g = cv.getContext('2d'); g.fillStyle = '#fff1ee'; g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(z * d, 0, 0, z * d, (cw / 2 - cam.x * z) * d, (ch / 2 - cam.y * z) * d); g.imageSmoothingQuality = 'high'; g.drawImage(bm, 0, 0, bm.width, bm.height, 0, 0, WW, WH);
    cv.hidden = false; peeking = 1; $('#bPeek').classList.add('on'); AU.say('peek');
  }
  function peekOff() { if (!peeking) return; peeking = 0; const cv = $('#peekCv'); cv.hidden = true; cv.width = cv.height = 1; $('#bPeek').classList.remove('on'); }
  { const b = $('#bPeek'); b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { } peekOn(); }); for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, peekOff); b.addEventListener('contextmenu', e => e.preventDefault()); }
  document.addEventListener('visibilitychange', peekOff); addEventListener('resize', peekOff);


  // ---------- progress save ----------
  function saveProg() {
    if (!G) return; const fill = new Uint8Array(Math.ceil(G.n / 8)); for (let i = 0; i < G.n; i++) if (G.fc[i]) fill[i >> 3] |= 1 << (i & 7);
    const rec = { id: G.free ? G.pid + ':free' : G.pid, v: 1, n: G.n, fill, order: Uint16Array.from(G.order), sel: G.sel, cam: { x: R.cam.x, y: R.cam.y, z: R.cam.z / R.fit }, ms: Math.round(G.ms + (performance.now() - G.t0)), t: Date.now() };
    if (G.free) rec.free = Uint8Array.from(G.fc);
    SV.queueProg(rec);
    if (G.free) { clearTimeout(fgT); fgT = setTimeout(saveFreeGal, 2500); }
  }
  // free paint (Decision 7) keeps its own gallery entry `<pid>:free` next to the finished picture's entry
  let fgT = 0;
  async function saveFreeGal() {
    clearTimeout(fgT); const g = G; if (!g || !g.free || !g.fc.some(v => v)) return;
    const t = thumb(g.pic, g.fc, 256), blob = await new Promise(r => t.toBlob(b => r(b), 'image/webp', 0.8)); t.width = 0; if (!blob) return;
    const o = galMap.get(g.pid), rec = { id: g.pid + ':free', v: 1, pid: g.pid, free: 1, done: Date.now(), ms: Math.round(g.ms), frame: o ? o.frame : 'none', thumb: blob };
    galFree.set(g.pid, rec); await SV.put('gallery', rec);
  }

  // ---------- pause / fold ----------
  function setPaused(p) { paused = p; if (p) peekOff(); AU.hold(p); AU.bed(scr === 'play' && !p); $('#pauseOv').classList.toggle('on', p); if (p) { $('#pTitle').innerHTML = A.icon('pause'); syncWand(); saveProg(); SV.flush(); saveFreeGal(); stopLoop(); if (G) G.ms += performance.now() - G.t0; } else { if (G) G.t0 = performance.now(); lastFill = performance.now(); startLoop(); } syncWand(); }
  function pause() { if (scr === 'play' && !paused && G) { endPaint(); pointers.clear(); setPaused(true); AU.say('pause'); } }
  $('#bPause').onclick = pause; $('#pPlay').onclick = () => setPaused(false); $('#pPacks').onclick = () => { go('packs'); }; $('#pGal').onclick = () => go('gal');
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); stopLoop(); } else if (scr === 'play') kick(); });
  addEventListener('pagehide', () => { saveProg(); SV.flush(); });
  function layoutNow(first) {
    const w = $('#wrap'); const r = w.getBoundingClientRect(); if (r.width < 2) return; R.layout(Math.round(r.width), Math.round(r.height), dpr()); lastVP = [innerWidth, innerHeight]; kick();
  }
  function relayout() {
    if (scr !== 'play') { lastVP = [innerWidth, innerHeight]; return; }
    const a0 = lastVP[0] * lastVP[1], a1 = innerWidth * innerHeight, flip = (lastVP[0] > lastVP[1]) !== (innerWidth > innerHeight);
    if (Math.abs(a1 - a0) / a0 > 0.25 || flip) pause();
    endPaint(); pointers.clear(); layoutNow(false); nav(palSync);
  }
  addEventListener('resize', () => { clearTimeout(relayT); relayT = setTimeout(relayout, 250); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (scr === 'play') { clearTimeout(relayT); relayT = setTimeout(relayout, 250); } }).observe($('#wrap'));

  // ---------- input ----------
  // tap = fill; Squares: a drag that starts on a cell drag-paints (K10); two fingers pan/zoom; the hand toggle turns one-finger drag into pan
  const pointers = new Map(); let tapOk = false, startXY = [0, 0], pinch = null, paint = null, lastPop = 0;
  const wrap = $('#wrap'); const rel = e => { const r = wrap.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const cellAtXY = p => { const w = R.s2w(p[0], p[1]); return R.hit(w[0], w[1]); };
  function paintCell(i) {
    if (G.free) { if (G.fc[i] === G.sel) return false; paint.op.push([i, G.fc[i]]); } else { if (G.fc[i] || G.P.col[i] + 1 !== G.sel) return false; paint.op.push([i, 0]); }
    fillRegion(i, { quiet: true }); if ((++paint.k & 3) === 0) R.burst(G.P.lab[i][0], G.P.lab[i][1], 3, calm()); return true;
  }
  function paintTo(p) {
    const i = cellAtXY(p); if (i < 0) return; let did = false; const gw = G.P.grid.gw;
    if (!paint.on) { paint.on = true; const s0 = cellAtXY(startXY); paint.cell = s0 >= 0 ? s0 : i; if (s0 >= 0 && paintCell(s0)) did = true; }
    let x0 = paint.cell % gw, y0 = (paint.cell / gw) | 0; const x1 = i % gw, y1 = (i / gw) | 0, dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, c0 = paint.cell; let er = dx + dy;
    for (;;) { if (y0 * gw + x0 !== c0 && paintCell(y0 * gw + x0)) did = true; if (x0 === x1 && y0 === y1) break; const e2 = 2 * er; if (e2 >= dy) { er += dy; x0 += sx; } if (e2 <= dx) { er += dx; y0 += sy; } }
    paint.cell = i;
    if (did) { const t = performance.now(); if (t - lastPop > 70) { lastPop = t; AU.unlock(); AU.pop(G.free ? G.step++ : G.tot[G.sel - 1] - G.rem[G.sel - 1]); } afterFill(false, G.free ? null : G.sel - 1); }
  }
  function endPaint() { if (paint && paint.on && paint.op.length && G) { G.ops.push(paint.op); if (G.ops.length > 200) G.ops.shift(); } paint = null; }
  wrap.addEventListener('pointerdown', e => {
    if (e.target.closest('#rail,#toast,#peekBox')) return; if (paused) return; pointers.set(e.pointerId, rel(e)); nav(() => wrap.setPointerCapture(e.pointerId));
    if (pointers.size === 1) { tapOk = true; startXY = rel(e); paint = (G && G.pic.pre && G.pic.pre.mode === 'pixel' && !panMode && !burstArmed && sd().set.dragPaint) ? { on: false, op: [], cell: -1, k: 0 } : null; } else { tapOk = false; pinch = null; endPaint(); }
  });
  wrap.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return; const p = rel(e), o = pointers.get(e.pointerId); pointers.set(e.pointerId, p);
    if (pointers.size === 1) { if (panMode) { R.panBy(p[0] - o[0], p[1] - o[1]); kick(); } if (Math.hypot(p[0] - startXY[0], p[1] - startXY[1]) > 10) tapOk = false; if (paint && !panMode && G && !paused && (paint.on || !tapOk)) paintTo(p); }
    else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (pinch) { R.panBy(c[0] - pinch.c[0], c[1] - pinch.c[1]); if (pinch.d > 10) R.zoomAt(d / pinch.d, c[0], c[1]); kick(); } pinch = { d, c };
    }
  });
  const up = e => { const had = pointers.has(e.pointerId), single = pointers.size === 1; const p = pointers.get(e.pointerId); pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; const painted = paint && paint.on; endPaint(); if (had && single && tapOk && !painted && e.type === 'pointerup') tapAt(p[0], p[1]); if (!pointers.size) tapOk = false; };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', e => { endPaint(); pointers.clear(); pinch = null; tapOk = false; });
  wrap.addEventListener('wheel', e => { e.preventDefault(); const p = rel(e); R.zoomAt(Math.exp(-e.deltaY * 0.0015), p[0], p[1]); kick(); }, { passive: false });
  wrap.addEventListener('dblclick', e => e.preventDefault()); wrap.addEventListener('contextmenu', e => e.preventDefault());

  // ---------- loop + auto quality ----------
  function startLoop() { kick(); }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
  function kick() { if (!raf && scr === 'play' && !paused && !document.hidden) raf = requestAnimationFrame(tick); }
  function tick(t) {
    raf = 0; const ms = last ? t - last : 16.7; last = t; const dt = Math.min(0.05, ms / 1000);
    if (G) { const more = R.frame(t, dt); watchQ(ms, more); fpsN++; if (t - fpsT > 1000) { fps = Math.round(fpsN * 1000 / (t - fpsT)); fpsN = 0; fpsT = t; } if (more) raf = requestAnimationFrame(tick); else last = 0; }
  }
  function watchQ(ms, busy) {
    if (lockQ || ms > 250 || ms < 1 || R.warming) return;   // frames that build a new puzzle's first view say nothing about the phone's speed (CC 8)
    if (ms > 20) { if (++slow >= 3 && R.q < 2) { slow = 0; fastT = 0; if (qUp) { qUp = false; qNoUp = true; } R.setQuality(R.q + 1); layoutNow(); } } else { slow = 0; if (ms < 12) { fastT += ms; if (fastT > 10000 && R.q > 0 && !qNoUp) { fastT = 0; qUp = true; R.setQuality(R.q - 1); layoutNow(); } } else fastT = 0; }
  }
  // v9 QA P2: a big canvas (Fold inner screen, tablets: over 2.2M device px at the 2x cap) starts at the lowest tile step
  // (cap / LOD / sparkles) instead of stepping down during the first fills. Fold-class screens (short side or device-px
  // area, render.js) keep the art layer at 2x. Phones keep the v9 dpr caps, including the 1.5 step at the lowest quality.
  // qUp: it did step up; a later step down then stops further step-ups for this visit (no back and forth).
  let qUp = false, qNoUp = false;
  function pickQ() { if (lockQ || qUp || R.q >= 2) return; const s = R.size, k = Math.min(dpr(), 2); if (s[0] * s[1] * k * k > 2.2e6) R.setQuality(2); }
  {
    const lowMem = (navigator.deviceMemory && navigator.deviceMemory <= 4); if (lowMem) R.setQuality(2);
  }

  // ---------- finish: pooled celebration, 3 s time-lapse, gallery viewer ----------
  const FC = { size: 0, anim: 0, t0: 0, specks: [], fin: null, finKey: null, spk: null, sg: null };
  // Pooled particles on the overlay canvases (#fconf / #vconf): confetti + sparkle stars share one pool, capped 150 / 80 / 30 by quality (calm: 14). No allocation per frame.
  const NPC = 150, PC = { x: new Float32Array(NPC), y: new Float32Array(NPC), vx: new Float32Array(NPC), vy: new Float32Array(NPC), r: new Float32Array(NPC), vr: new Float32Array(NPC), s: new Float32Array(NPC), l: new Float32Array(NPC), k: new Uint8Array(NPC), g: new Uint8Array(NPC), on: new Uint8Array(NPC) };
  let pcLive = 0, pcHead = 0, pcSpr = null;
  const pcCap = () => calm() ? 14 : [150, 80, 30][Math.min(2, R.q)];
  function pcBuild() {
    pcSpr = []; const cols = ['#ff5fa2', '#4fd8e0', '#ffd34d', '#b56cff'];
    const mkS = (col, heart) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.translate(32, 32); g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath();
      if (heart) { g.moveTo(0, 22); g.bezierCurveTo(-30, 2, -22, -26, 0, -12); g.bezierCurveTo(22, -26, 30, 2, 0, 22); } else { g.moveTo(0, -26); g.lineTo(16, 0); g.lineTo(0, 26); g.lineTo(-16, 0); } g.closePath(); g.fill(); g.stroke(); return c; };
    for (const c of cols) { pcSpr.push(mkS(c, false)); pcSpr.push(mkS(c, true)); }   // 0..7 confetti
    const star = col => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.translate(32, 32); g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 ? 9 : 28; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); return c; };
    pcSpr.push(star('#ffd34d'), star('#ff8fcf'), star('#8ff0f4'));   // 8..10 sparkles
  }
  function pcClear() { PC.on.fill(0); pcLive = 0; }
  function pcSpawn(g, x, y, vx, vy, s, k, l) {
    if (pcLive >= pcCap()) return; for (let n = 0; n < NPC; n++) { const i = pcHead; pcHead = (pcHead + 1) % NPC; if (PC.on[i]) continue;
      PC.on[i] = 1; PC.g[i] = g; PC.x[i] = x; PC.y[i] = y; PC.vx[i] = vx; PC.vy[i] = vy; PC.r[i] = Math.random() * 6.28; PC.vr[i] = (Math.random() - 0.5) * 6; PC.s[i] = s; PC.k[i] = k; PC.l[i] = l; pcLive++; return; }
  }
  function pcStars(x, y, n, d) { for (let j = 0; j < n; j++) { const a = Math.random() * 6.283, sp = (40 + Math.random() * 120) * d; pcSpawn(1, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 30 * d, (14 + Math.random() * 16) * d, 8 + (Math.random() * 3 | 0), 0.45 + Math.random() * 0.35); } }
  function pcStep(dt) {
    for (let i = 0; i < NPC; i++) if (PC.on[i]) { PC.l[i] -= dt; if (PC.l[i] <= 0 || PC.y[i] > 6000) { PC.on[i] = 0; pcLive--; continue; } PC.x[i] += PC.vx[i] * dt; PC.y[i] += PC.vy[i] * dt; PC.r[i] += PC.vr[i] * dt; if (PC.g[i]) PC.vy[i] += 160 * dt; }
  }
  function pcDraw(cv, under) {
    const g = cv.getContext('2d'), z = cv._s || 1; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); if (!pcSpr) pcBuild(); if (under) { g.setTransform(z, 0, 0, z, 0, 0); under(g); }   // drawn in CSS px; z < 1 on big boxes (overlay capped at 0.4 M px)
    for (let i = 0; i < NPC; i++) if (PC.on[i]) {
      const sc = PC.s[i] / 64, c = Math.cos(PC.r[i]) * sc, sn = Math.sin(PC.r[i]) * sc; g.setTransform(c * z, sn * z, -sn * z, c * z, PC.x[i] * z, PC.y[i] * z); g.globalAlpha = PC.g[i] ? Math.min(1, PC.l[i] * 3) : 1; g.drawImage(pcSpr[PC.k[i]], -32, -32);
    }
    g.globalAlpha = 1; g.setTransform(1, 0, 0, 1, 0, 0);
  }
  function stopCelebration() { cancelAnimationFrame(FC.anim); FC.anim = 0; pcClear(); for (const id of ['fconf', 'vconf']) { const k = document.getElementById(id); if (k) k.getContext('2d').clearRect(0, 0, k.width, k.height); } }
  async function finishGame() {
    if (!G || G.done) return; G.done = true; G.ms += performance.now() - G.t0; saveProg(); await SV.flush();
    const first = !galMap.has(G.pid); let fr = A.frameFor(sd().stats.done + (first ? 1 : 0)), earned = false;
    if (first) {
      const st = sd().stats; st.done++; st.regions += G.n; st.ms += G.ms; const f = A.FRAMES.find(x => x.n === st.done); if (f) { sd().frames[f.id] = 1; earned = true; }
      fr = A.frameFor(st.done); sd().stk[G.pid] = Object.keys(sd().stk).length % 4;
      await new Promise(r => setTimeout(r, 0));   // v9 QA P2 round 2: the thumb gets a task of its own (not the last fill's)
      const t = finThumb(512), blob = await new Promise(r => t.toBlob(b => r(b), 'image/webp', 0.85));
      const rec = { id: G.pid, v: 1, pid: G.pid, done: Date.now(), ms: Math.round(G.ms), frame: fr.id, thumb: blob }; galMap.set(G.pid, rec); SV.put('gallery', rec); SV.write();
    }
    FC.earned = earned; FC.then = earned ? 'frame' : (first ? 'saved' : null); AU.fanfare(); setTimeout(() => finishView(false), 100);
  }
  // v9 QA P2: the gallery thumb of a just-finished picture comes from the base tiles of play (4 blits) instead of painting every
  // region again (86 ms at 4x on an Expert picture); same flat look. Falls back to the full paint when there are no tiles.
  function finThumb(size) {
    const pic = G.pic, W = pic.w || 2048, H = pic.h || 2048, k = size / Math.max(W, H);
    if (!R.S || R.S.P !== G.P) return thumb(pic, G.fc, size);
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k)); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    return R.drawBase(g, c.width, c.height) ? c : thumb(pic, G.fc, size);
  }
  function finishView(fromGallery) { FC.fromGal = fromGallery; go('fin', { force: true }); }
  function fitCanvas(boxEl, canvas, conf, WW, WH) {   // shared by the Finished screen and the viewer: art canvas fitted to its box at DPR <= 2, overlay canvas = whole box
    const r = boxEl.getBoundingClientRect(), d = Math.min(dpr(), 2);
    let cw = Math.floor(Math.min(r.width - 8, (r.height - 8) * WW / WH)), ch = Math.floor(cw * WH / WW); if (ch > r.height - 8) { ch = Math.floor(r.height - 8); cw = Math.floor(ch * WW / WH); } cw = Math.max(120, cw); ch = Math.max(Math.round(120 * WH / WW), ch);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'; canvas.width = Math.round(cw * d); canvas.height = Math.round(ch * d); const cs = Math.min(1, Math.sqrt(4e5 / Math.max(1, r.width * r.height))); conf.width = Math.max(1, Math.round(r.width * cs)); conf.height = Math.max(1, Math.round(r.height * cs)); conf._s = conf.width / Math.max(1, r.width);   // the sparkle overlay runs at <= 1x, capped at 0.4 M px (soft by design; v9 QA P2 round 2: saves fill rate on the Fold)
    return { d, r };
  }
  function finLayout() {
    const WW = G.pic.w || 2048, WH = G.pic.h || 2048, f = fitCanvas($('#finArt'), $('#fc'), $('#fconf'), WW, WH); FC.d = 1; FC.r = f.r; FC.px = $('#fc').width; FC.py = $('#fc').height; FC.WW = WW; FC.WH = WH;
    if (FC.fin && FC.fin.close) FC.fin.close(); FC.fin = null; FC.job = null; FC.tl = false; FC.specks = []; for (let i = 0; i < (calm() ? 30 : [90, 60, 30][Math.min(2, R.q)]); i++) FC.specks.push([Math.random() * WW, Math.random() * WH, 18 + Math.random() * 40, Math.random() * 6.28]);
    drawFin(0); FC.map = mapOf($('#fc'), $('#fconf'), 1, WW, WH); const k = $('#fconf'); pcClear(); pcDraw(k, g => glitter(g, 0));
  }
  function stFor(m) { const f = new Uint8Array(G.n); for (let j = 0; j < m; j++) { const i = G.order[j]; f[i] = G.P.col[i] + 1; } return { P: G.P, pal: G.pic.pal, fc: f, reveal: G.free ? null : G.pic.reveal || null }; }
  function mkSpk() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.translate(32, 32); g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 6 : 30; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); return c;
  }
  // finished art (flat colors + sheen + frame) is painted once per layout; each frame is one blit + sprite specks + the sweep (t = ms since the glitter started)
  // v9 QA P2: the sharp finished art took one 500-780 ms page task on the Fold at 4x (Expert). It is now painted in the worker (same
  // renderArt as the 2K export) while the base tiles from play stand in, then swaps in. Without a worker: a few regions per frame.
  function drawFin(t) {
    const px = FC.px, py = FC.py, o = $('#fc').getContext('2d');
    const fr = G.free ? null : A.frameFor(sd().stats.done), fra = galMap.has(G.pid) ? A.FRAMES.find(f => f.id === galMap.get(G.pid).frame) : fr, key = fra && fra.id;
    if (!FC.sg) { const sg = o.createLinearGradient(0, 0, 500, 500); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); FC.sg = sg; }
    const c = $('#fc'); if (FC.fin && FC.finKey === key) { finSize(c, px, py); o.setTransform(1, 0, 0, 1, 0, 0); o.drawImage(FC.fin, 0, 0, px, py); return; }
    if (!(FC.job && FC.job.key === key && FC.job.px === px && FC.job.py === py)) finBuild(key, fra);
    // v9 QA P2 round 2: the stand-in is painted at <= 640 px (the base tiles are 512 px) and the browser scales it up (CSS size is fixed);
    // painting it into the full 2x canvas was a 100-170 ms raster at 4x on the Fold. The sharp art brings the full size back.
    const k = Math.min(1, 640 / Math.max(px, py)), sw = Math.max(1, Math.round(px * k)), sh = Math.max(1, Math.round(py * k)); finSize(c, sw, sh);
    o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, sw, sh); R.drawBase(o, sw, sh); if (fra && fra.a) A.drawFrame(o, sw, sh, fra);   // stand-in with its frame: only the gloss arrives later
  }
  function finSize(c, w, h) { if (c.width !== w) c.width = w; if (c.height !== h) c.height = h; }
  function finShow(f, px, py) {   // swap the finished art in over the stand-in (a fade cost two more full-canvas blends per frame)
    const c = $('#fc'); if (FC.tl || FC.px !== px || FC.py !== py) return;   // the time-lapse owns the canvas; its done() draws the finished art
    // v9 QA P2 round 2: painted in a task of its own (the 1 px read makes the canvas paint now), so the next frame only hands it over
    setTimeout(() => { if (FC.fin !== f || FC.tl || scr !== 'fin' || FC.px !== px || FC.py !== py) return; finSize(c, px, py); const o = c.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.drawImage(f, 0, 0, px, py); finFlush(c); }, 0);
  }
  let flc = null;
  function finFlush(c) { if (!flc) { flc = document.createElement('canvas'); flc.width = flc.height = 1; } flc.getContext('2d').drawImage(c, 0, 0, 1, 1, 0, 0, 1, 1); }
  function finBuild(key, fra) {
    const px = FC.px, py = FC.py, job = FC.job = { key, px, py, i: 0 }, g0 = G, pic = G.pic;
    if (pic.reveal && !G.free) {
      const f = document.createElement('canvas');
      R.renderArt(pic, stFor(G.order.length).fc, { into: f, sheen: false, long: Math.max(px, py), frame: fra && fra.a ? fra : null, P: G.P, reveal: pic.reveal });
      if (FC.job !== job || G !== g0) return;
      FC.fin = f; FC.finKey = key; FC.job = null; finShow(f, px, py); return;
    }
    if (noWorker || !window.Worker || typeof OffscreenCanvas === 'undefined' || typeof ImageBitmap === 'undefined') { finSlices(job, fra); return; }
    (async () => {
      const m = { cmd: 'export', gen: 1, fc: stFor(G.order.length).fc, frame: fra && fra.a ? { id: fra.id, a: fra.a, b: fra.b } : null, long: Math.max(px, py), sheen: true, bitmap: true };
      if (pic.custom) { m.pz = await API.loadPz(G.pid); if (!m.pz) throw new Error('nopz'); } else m.pic = { w: pic.w, h: pic.h, pal: pic.pal, bg: pic.bg, shapes: pic.shapes, line: pic.line, lab: pic.lab };
      if (FC.job !== job) return null;
      return await new Promise((res, rej) => {
        const w = new Worker('worker.js'), to = setTimeout(() => { w.terminate(); rej(new Error('timeout')); }, 40000);
        w.onmessage = e => { clearTimeout(to); w.terminate(); e.data.t === 'bmp' ? res(e.data.bm) : rej(new Error('worker')); }; w.onerror = () => { clearTimeout(to); w.terminate(); rej(new Error('worker')); }; w.postMessage(m);
      });
    })().then(bm => {
      if (!bm) return; if (FC.job !== job || G !== g0) { bm.close(); return; }
      FC.fin = bm; FC.finKey = key; FC.job = null; finShow(bm, px, py);
    }, () => { if (FC.job === job && G === g0 && scr === 'fin') finSlices(job, fra); });
  }
  function finSlices(job, fra) {
    const px = FC.px, py = FC.py, f = document.createElement('canvas'); f.width = px; f.height = py; const fg = f.getContext('2d'); fg.setTransform(px / FC.WW, 0, 0, py / FC.WH, 0, 0);
    const st = stFor(G.order.length), n = G.P.n, all = !!G.P.grid, g0 = G, key = job.key, per = Math.max(3, Math.ceil(n / 30));   // ~30 frames; canvas paints later than the call, so count, not time
    const step = () => {
      if (FC.job !== job) return; if (G !== g0 || scr !== 'fin') { FC.job = null; return; }   // left the screen: the next Finished screen starts again
      const to = all ? n : Math.min(n, job.i + per); R.drawFlat(fg, st, { sheen: !st.reveal, from: job.i, to }); job.i = to;
      if (job.i < n) { requestAnimationFrame(step); return; }
      fg.setTransform(1, 0, 0, 1, 0, 0); if (fra && fra.a) A.drawFrame(fg, px, py, fra);
      FC.fin = f; FC.finKey = key; FC.job = null; finShow(f, px, py);
    };
    requestAnimationFrame(step);
  }
  // glitter specks + the shine sweep live on the 1x overlay (world coordinates mapped through FC.map), so the sharp art canvas is only painted once
  function glitter(g, t) {
    if (!FC.spk) FC.spk = mkSpk(); const m = FC.map, k = m[2];
    for (const s of FC.specks) { g.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(t / 500 + s[3])); const r = s[2] * k; g.drawImage(FC.spk, m[0] + s[0] * k - r, m[1] + s[1] * k - r, r * 2, r * 2); } g.globalAlpha = 1;
    if (t > 0 && t < 5200 && !calm()) { const WW = FC.WW, WH = FC.WH, x = -600 + ((t % 2600) / 2600) * (WW + 1200); g.save(); g.beginPath(); g.rect(m[0], m[1], WW * k, WH * m[3]); g.clip(); g.transform(k, 0, 0, m[3], m[0] + x * k, m[1]); g.fillStyle = FC.sg; g.beginPath(); g.moveTo(0, 0); g.lineTo(1000, 0); g.lineTo(1000 - WH, WH); g.lineTo(-WH, WH); g.closePath(); g.fill(); g.restore(); }   // only the shine band (the gradient is clear outside it): same pixels, ~half the fill
  }
  function showFin() {
    if (!G) { go('start'); return; } stopLoop(); setTimeout(() => {
      if (scr !== 'fin' || !G) return; finLayout(); const rec = galMap.get(G.pid); $('#finStk').innerHTML = sd().stk[G.pid] != null ? A.sticker(G.pid, sd().stk[G.pid]) : '';
      $('#finFrs').innerHTML = A.FRAMES.filter(f => f.a).map(f => '<i class="' + (sd().frames[f.id] ? 'on' : '') + '" style="background:linear-gradient(135deg,' + f.a + ',' + f.b + ')"></i>').join('');
      $('#fPaint').hidden = !galMap.has(G.pid) || G.free; $('#fNext').hidden = G.free;
      if (!FC.fromGal) celebrate();
      { const c = $('#fc'); c.classList.remove('rvin'); if (G.pic.reveal && !G.free && !FC.fromGal) { void c.offsetWidth; c.classList.add('rvin'); } }   // R2: the finished picture fades in to the full photo
    }, 30);
  }
  // finish celebration: pooled confetti + sparkles over the glittering art; the sweep and specks run for ~5 s, then it rests (loop stops)
  function celebrate() {
    if (!FC.map) return; cancelAnimationFrame(FC.anim); const k = $('#fconf'), t0 = performance.now(), d = 1, W = k.width / (k._s || 1), H = k.height / (k._s || 1); pcClear(); if (!pcSpr) pcBuild(); AU.say((G.custom && G.pic && G.pic.reveal) ? 'real' : 'finish', { delay: 650, then: FC.then }); FC.then = null;
    if (!calm()) for (let i = 0, n = pcCap(); i < n; i++) pcSpawn(0, Math.random() * W, -Math.random() * H * 0.6, (Math.random() - 0.5) * 60, 60 + Math.random() * 140, 22 + Math.random() * 26, (Math.random() * 8) | 0, 5);
    const m = FC.map; let lastT = t0, acc = 0, tt = 0; const under = g => glitter(g, tt);
    const step = t => {
      tt = t - t0; const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
      if (tt < 2400 && !calm()) { acc += dt; while (acc > 0.06) { acc -= 0.06; pcStars(m[0] + Math.random() * FC.WW * m[2], m[1] + Math.random() * FC.WH * m[3], 1, d); } }
      pcStep(dt); pcDraw(k, under);
      if (tt < (calm() ? 800 : 5400) && scr === 'fin' && !document.hidden) FC.anim = requestAnimationFrame(step); else { tt = 0; pcClear(); pcDraw(k, under); FC.anim = 0; }
    }; FC.anim = requestAnimationFrame(step);
  }
  // Time-lapse (~3 s): replays the recorded fill order with sparkles. The pictures redraw at <= 640 px and are blitted up (the sharp finish returns at the end).
  // T = { P, pic, order, can, conf, W, H, d, map: [ox, oy, sx, sy], done }
  function timelapse(T) {
    cancelAnimationFrame(FC.anim); pcClear(); const N = T.order.length; if (!N || !T.map) { T.done(); return; }
    const lk = Math.min(1, 640 / Math.max(T.can.width, T.can.height)), lw = Math.max(1, Math.round(T.can.width * lk)), lh = Math.max(1, Math.round(T.can.height * lk));
    T.can.width = lw; T.can.height = lh;   // CSS size is fixed, so the browser scales the small canvas; done() re-fits the sharp one
    const lg = T.can.getContext('2d'); lg.setTransform(lw / T.W, 0, 0, lh / T.H, 0, 0);
    const fc = new Uint8Array(T.P.n), st = { P: T.P, pal: T.pic.pal, fc, reveal: T.pic.reveal || null }, dur = calm() ? 1200 : 3000, t0 = performance.now(); let shown = 0, drawnAt = -1e9, lastT = t0; AU.say('timelapse');
    const step = t => {
      const u = Math.min(1, (t - t0) / dur), m = Math.round(N * u), dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
      if (m > shown) {
        for (let j = shown; j < m; j++) fc[T.order[j]] = T.P.col[T.order[j]] + 1;
        if (!calm()) for (let j = Math.max(shown, m - 3); j < m; j++) { const L = T.P.lab[T.order[j]]; pcStars(T.map[0] + L[0] * T.map[2], T.map[1] + L[1] * T.map[3], 2, 1); }
        shown = m;
      }
      if (shown && (t - drawnAt >= 60 || u >= 1)) { drawnAt = t; lg.clearRect(0, 0, T.W, T.H); R.drawFlat(lg, st, {}); if (!calm()) AU.pop(shown); }
      pcStep(dt); pcDraw(T.conf);
      if (u < 1 && (scr === 'fin' || scr === 'view') && !document.hidden) FC.anim = requestAnimationFrame(step); else { pcClear(); pcDraw(T.conf); FC.anim = 0; if (scr === 'fin' || scr === 'view') T.done(); }
    }; lg.clearRect(0, 0, T.W, T.H); FC.anim = requestAnimationFrame(step);
  }
  function mapOf(canvas, conf, d, W, H) { const a = canvas.getBoundingClientRect(), b = conf.getBoundingClientRect(); return [(a.left - b.left) * d, (a.top - b.top) * d, a.width * d / W, a.height * d / H]; }
  function replay() {
    if (!G || scr !== 'fin') return;
    FC.tl = true; timelapse({ P: G.P, pic: G.pic, order: G.order, can: $('#fc'), conf: $('#fconf'), W: FC.WW, H: FC.WH, map: FC.map, done: () => { FC.tl = false; const c = $('#fc'); c.width = FC.px; c.height = FC.py; drawFin(0); celebrate(); } });
  }
  $('#fReplay').onclick = replay; $('#fc').onclick = replay;
  $('#fGal').onclick = () => go('gal');
  $('#fShow').onclick = () => { const o = $('#showOv'), c = $('#showC'); o.classList.add('on'); c.width = innerWidth * Math.min(dpr(), 2); c.height = innerHeight * Math.min(dpr(), 2); const g = c.getContext('2d'), fcv = $('#fc'), sc = Math.min(c.width / fcv.width, c.height / fcv.height); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.drawImage(fcv, (c.width - fcv.width * sc) / 2, (c.height - fcv.height * sc) / 2, fcv.width * sc, fcv.height * sc); o.onclick = () => o.classList.remove('on'); };
  $('#fNext').onclick = () => { if (G.custom && !CM_PACKS[G.pk]) { go('photo'); return; } notePack(G.pk); const p = CM_PACKS[G.pk], idx = p.pics.findIndex(x => x.id === (G.pic.base || G.pic.id)); let nx = null; for (let k = 1; k <= p.pics.length; k++) { const c = p.pics[(idx + k) % p.pics.length]; const done = c.photo ? [2, 4].some(n => galMap.has(photoId(G.pk, c.id, n))) : galMap.has(pidOf(G.pk, c.id)); if (!done) { nx = c; break; } } if (!nx) { go('packs'); return; } openPic(G.pk, nx.id); };
  $('#fPaint').onclick = () => { if (G.custom) API.openByPid(G.pid, { free: true }); else openPic(G.pk, G.pic.id, { free: true }); };

  // ---------- gallery ----------
  async function showGal() {
    await loadMaps(); thumbs.forEach(u => URL.revokeObjectURL(u)); thumbs.clear(); const grid = $('#galGrid'); grid.innerHTML = '';
    const list = [...galMap.values(), ...galFree.values()].filter(r => !mosaicHidden(r.pid)).sort((a, b) => b.done - a.done);
    let jar = 0; for (const r of galMap.values()) if (!mosaicHidden(r.pid)) jar++;
    $('#jarBox').innerHTML = A.hearts(Math.min(14, jar), '#ff5fa2'); $('#jarN').textContent = jar;
    if (!list.length) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1">' + A.icon('heart') + A.icon('gallery') + '</div>'; return; }
    for (const r of list) {
      const b = document.createElement('button'); b.className = 'gi ' + (r.frame || ''); b.setAttribute('aria-label', r.free ? 'My colors' : 'Picture'); const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = 160; im.height = 160;
      if (r.thumb) { const u = URL.createObjectURL(r.thumb); thumbs.set(r.id, u); im.src = u; } b.appendChild(im);
      if (r.free) { const f = document.createElement('i'); f.className = 'fr'; f.innerHTML = A.icon('brush'); b.appendChild(f); }
      b.onclick = () => openView(r.pid, r.free ? 'free' : 'orig'); grid.appendChild(b);
    }
  }

  // ---------- viewer: re-renders the picture on demand from puzzle + fills (deterministic, no 2K blobs stored); time-lapse, frame, free paint, gated save/delete ----------
  let V = null;
  async function picOfPid(pid) { if (isDetail(pid) || isCustom(pid)) return API.loadPic ? API.loadPic(pid) : null; const m = /^pk:([a-z0-9]+)\.([a-z0-9]+)$/.exec(pid); if (m) return picBy(m[1], m[2]); return API.loadPic ? API.loadPic(pid) : null; }
  async function openView(pid, which) {
    const pic = await picOfPid(pid); if (!pic) { return; }   // unreadable puzzle: stay in the gallery (the record is kept)
    const n = pic.shapes.length, ro = await SV.getProg(pid, n), rf = await SV.getProg(pid + ':free', n), hasF = !!(rf && rf.free && galFree.has(pid)), hasO = galMap.has(pid);
    if (!hasO && !hasF) return;   // nothing to show (never finished, never painted)
    V = { pid, pic, n, ro, rf, hasF, hasO, which: (which === 'free' && hasF) || !hasO ? 'free' : 'orig', frameOn: true, P: R.prep(pic), busy: false };
    go('view', { force: true });
  }
  function viewFc() {
    const f = new Uint8Array(V.n), P = V.P;
    if (V.which === 'free') { if (V.rf && V.rf.free) for (let i = 0; i < V.n; i++) f[i] = V.rf.free[i] || 0; }
    else if (V.ro && V.ro.order.length) for (const i of V.ro.order) f[i] = P.col[i] + 1;
    else for (let i = 0; i < V.n; i++) f[i] = P.col[i] + 1;   // gallery entry but no readable progress: show it finished
    return f;
  }
  const frameOfView = () => { const r = galMap.get(V.pid) || galFree.get(V.pid), id = r && r.frame; return id ? A.FRAMES.find(f => f.id === id && f.a) || null : null; };
  function viewDraw() {
    const W = V.pic.w || 2048, H = V.pic.h || 2048, c = $('#vc'), f = fitCanvas($('#viewArt'), c, $('#vconf'), W, H); V.d = f.d;
    const reveal = V.which === 'free' ? null : (V.pic.reveal || null);
    R.renderArt(V.pic, viewFc(), { long: Math.max(c.width, c.height), sheen: !reveal, frame: V.frameOn ? frameOfView() : null, into: c, P: V.P, reveal });
    c.style.width = Math.round(c.width / f.d) + 'px'; c.style.height = Math.round(c.height / f.d) + 'px'; V.map = mapOf(c, $('#vconf'), 1, V.pic.w || 2048, V.pic.h || 2048);
  }
  function showView() {
    if (!V) { go('gal'); return; } R.release(); setTimeout(() => {
      if (scr !== 'view' || !V) return; viewDraw(); const fr = frameOfView();
      $('#vVer').hidden = !(V.hasO && V.hasF); $('#vFrame').hidden = !fr; $('#vFrame').classList.toggle('on', V.frameOn); $('#vPlay').hidden = V.which !== 'orig' || !(V.ro && V.ro.order.length > 1);
      $('#vPaint').hidden = !V.hasO; $('#vSave').classList.remove('busy');
    }, 30);
  }
  $('#vBack').onclick = () => go('gal');
  $('#vPlay').onclick = () => {
    if (!V || scr !== 'view' || V.which !== 'orig') return; const c = $('#vc'), k = $('#vconf');
    timelapse({ P: V.P, pic: V.pic, order: V.ro.order, can: c, conf: k, W: V.pic.w || 2048, H: V.pic.h || 2048, map: V.map, done: () => { if (V && scr === 'view') viewDraw(); } });
  };
  $('#vVer').onclick = () => { if (!V) return; stopCelebration(); V.which = V.which === 'orig' ? 'free' : 'orig'; AU.tick(); showView(); };
  $('#vFrame').onclick = () => { if (!V) return; V.frameOn = !V.frameOn; AU.tick(); showView(); };
  $('#vPaint').onclick = () => { if (!V) return; const pid = V.pid; if (API.isCustom(pid)) API.openByPid(pid, { free: true }); else { const m = /^pk:([a-z0-9]+)\.([a-z0-9]+)$/.exec(pid); openPic(m[1], m[2], { free: true }); } };
  // grown-up gate in front of every export / share / delete (S5, S7): the gate must pass BEFORE anything is rendered, shared or removed
  function askGate(note, ok) {
    const ov = $('#gateOv'), host = $('#gateHost'); if (!FZ || !FZ.gate) return;   // no gate available = no action
    AU.say('grown'); host.innerHTML = ''; $('#gateT').innerHTML = A.icon('lock'); if (note) { const p = document.createElement('p'); p.textContent = note; host.appendChild(p); } ov.classList.add('on');
    const close = () => { ov.classList.remove('on'); host.innerHTML = ''; };
    FZ.gate(host, () => { close(); ok(); }, close);
  }
  const ymd = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };
  async function renderPng(long) {   // worker first (P5: the 2048 canvas stays out of the page heap), main thread as the fallback
    const fc = viewFc(), frame = V.frameOn ? frameOfView() : null, pic = V.pic, reveal = V.which === 'free' ? null : (pic.reveal || null);
    if (!reveal && !noWorker && window.Worker && typeof OffscreenCanvas !== 'undefined') {
      try {
        const job = { cmd: 'export', gen: 1, fc, frame: frame ? { id: frame.id, a: frame.a, b: frame.b } : null, long, sheen: true };
        if (pic.custom) job.pz = await API.loadPz(V.pid); else job.pic = { w: pic.w, h: pic.h, pal: pic.pal, bg: pic.bg, shapes: pic.shapes, line: pic.line, lab: pic.lab };
        if (pic.custom && !job.pz) throw new Error('nopz');
        const r = await new Promise((res, rej) => {
          const w = new Worker('worker.js'), to = setTimeout(() => { w.terminate(); rej(new Error('timeout')); }, long > 2048 ? 90000 : 40000);
          w.onmessage = e => { clearTimeout(to); w.terminate(); e.data.t === 'png' ? res(e.data) : rej(new Error('worker')); }; w.onerror = () => { clearTimeout(to); w.terminate(); rej(new Error('worker')); }; w.postMessage(job);
        });
        return { blob: r.blob, w: r.w, h: r.h, via: 'worker' };
      } catch (e) { /* fall through to the main thread */ }
    }
    const c = R.renderArt(pic, fc, { long, sheen: !reveal, frame, P: V.P, reveal, make: (w, h) => { const k = document.createElement('canvas'); k.width = w; k.height = h; return k; } });
    const blob = await new Promise(r => c.toBlob(b => r(b), 'image/png')); const out = { blob, w: c.width, h: c.height, via: 'main' }; c.width = 0; return out;
  }
  async function deliver(blob) {   // share sheet when the browser can share a file, else a plain download (S5). No url / text / title is ever shared.
    const name = 'color-magic-' + ymd() + '.png';
    try {
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return 'shared'; }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 20000); return 'download';
  }
  $('#vSave').onclick = () => {
    if (!V || V.busy) return;
    askGate('Saved pictures may copy to the cloud if phone backup is on.', async () => {
      if (!V) return; V.busy = true; $('#vSave').classList.add('busy'); AU.say('export');
      // 4K puzzle + Super sharp switch on: 3840 px PNG (2K if that fails); everything else stays 2048
      try { const big = V.pic.k4 && SV.data.set.sharp; let r = null; if (big) r = await renderPng(3840).catch(() => null); const small = !!big && (!r || !r.blob); if (!r || !r.blob) r = await renderPng(2048); if (r && r.blob) { await deliver(r.blob); if (small) toast('sparkle'); } } catch (e) { toast('sparkle'); }
      finally { if (V) V.busy = false; $('#vSave').classList.remove('busy'); }
    });
  };
  $('#vDel').onclick = () => {
    if (!V) return;
    askGate(null, async () => {
      if (!V) return; const pid = V.pid, which = V.which; await SV.flush();
      if (which === 'free') await SV.delEntry([pid + ':free']);
      else if (/^ph:/.test(pid)) await SV.delPuzzle(pid);
      else await SV.delEntry([pid, pid + ':free']);
      if (G && G.pid === pid) G = null; V = null; await loadMaps(); go('gal', { force: true });
    });
  };

  // ---------- settings ----------
  function tg(id, label, icon, on) { return '<div class="set"><label for="' + id + '">' + A.icon(icon) + '<span>' + label + '</span></label><button class="tg' + (on ? ' on' : '') + '" id="' + id + '" aria-label="' + label + '"><i></i></button></div>'; }
  function showSettings() {
    const s = sd().set, box = $('#setBox');
    box.innerHTML = '<div class="set"><label for="sVol">' + A.icon('sparkle') + '<span>Volume</span></label><input type="range" id="sVol" min="0" max="100" value="' + s.vol + '"></div>' +
      tg('sMus', 'Sounds', 'sparkle', s.mus) + tg('sVoice', 'Voice', 'heart', s.voice) + tg('sMusic', 'Music', 'play', s.music) + tg('sNums', 'Numbers', 'gem', s.nums) +
      '<div class="set"><label>' + A.icon('packs') + '<span>Lines</span></label><div class="seg" id="sOut">' + [0, 1, 2].map(n => '<button data-n="' + n + '"' + (s.outl === n ? ' class="on"' : '') + '>' + (n + 1) + '</button>').join('') + '</div></div>' +
      '<div id="gu"><button class="rb si" id="sLock" aria-label="Grown-ups">' + A.icon('lock') + '</button><div id="guHost"></div></div>';
    $('#sVol').oninput = e => { s.vol = +e.target.value; SV.write(); applySettings(); };
    const bind = (id, k) => $('#' + id).onclick = e => { s[k] = !s[k]; e.currentTarget.classList.toggle('on', s[k]); SV.write(); applySettings(); };
    bind('sMus', 'mus'); bind('sVoice', 'voice'); bind('sMusic', 'music'); bind('sNums', 'nums');
    $$('#sOut button').forEach(b => b.onclick = () => { s.outl = +b.dataset.n; $$('#sOut button').forEach(x => x.classList.toggle('on', x === b)); SV.write(); });
    $('#sLock').onclick = () => { const h = $('#guHost'); if (h.firstChild) return; AU.say('grown'); if (FZ && FZ.gate) FZ.gate(h, () => { h.innerHTML = tg('gHelp', 'Helpers', 'hint', s.helpers) + tg('gPhoto', 'My Photo', 'photo', s.photo) + tg('gGrid', 'Big grids', 'squares', s.bigGrid) + tg('gAll', 'All levels', 'gem', s.allLevels) + tg('gSharp', '4K Super sharp', 'photo', s.sharp) + tg('gMosaic', 'Mosaic levels', 'gem', s.mosaic) + '<div class="set"><label><span id="gSt"></span></label></div><div id="gPh"></div>'; bind('gHelp', 'helpers'); bind('gPhoto', 'photo'); bind('gGrid', 'bigGrid'); bind('gAll', 'allLevels'); bind('gSharp', 'sharp'); bind('gMosaic', 'mosaic'); stor(); if (API.storagePage) API.storagePage($('#gPh')); }, () => { }); };
  }
  async function stor() { let t = 'Saved here'; try { const e = await navigator.storage.estimate(); t = Math.round((e.usage || 0) / 1048576 * 10) / 10 + ' MB'; } catch (e) { } if (SV.quarantine.size) t += ' - ' + SV.quarantine.size + ' unreadable'; if (SV.warn) t += ' - not saving!'; const e = $('#gSt'); if (e) e.textContent = t; }

  // ---------- service worker (guarded reload, only from a menu) ----------
  nav(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => { });
      navigator.serviceWorker.addEventListener('controllerchange', () => { const k = 'cm.swr', n = Date.now(), p = +sessionStorage.getItem(k) || 0; if (n - p < 30000 || scr === 'play') return; sessionStorage.setItem(k, n); location.reload(); });
    }
  });

  // ---------- hooks for photo.js ----------
  Object.assign(API, { galFree, go, nav, A, R, SV, AU, FZ, sd, toast, loadMaps, galMap, progMap, openGame, openPic, picBy, pidOf, isCustom, isDetail, isPhotoPz, isMosaic, mosaicId, photoId, thumb, calm, applySettings, fracRec, stor });
  Object.defineProperties(API, { scr: { get: () => scr }, prev: { get: () => prev }, G: { get: () => G } });   // live views (Object.assign would copy the current value only)
  window.CMApp = { API, HOOK };

  // ---------- boot ----------
  SV.load(); SV.persist(); applySettings();
  SV.open().then(async () => {
    await loadMaps();
    if (!sd().seen.first) openPic('gems', 'hg1'); else go('start', { force: true });
  });

})();
