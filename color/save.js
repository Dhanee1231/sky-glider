// Color Magic save. localStorage `colormagic.v1` (small settings/stats, sanitized on load, unknown fields kept, unreadable value copied once to
// `colormagic.v1.bad`) + IndexedDB `colormagic` (v1: puzzles / progress / gallery; v2 adds `pmeta`, additive only) + IndexedDB `colormagic.pref` (store `pref`, see below).
// Additive only: onupgradeneeded only creates stores. Corrupt records go to an in-memory quarantine and are never deleted. No network.
// v9 Super sharp (all optional, old saves need none): set.sharp (false), last.diff up to 7, last.pal up to 32, puzzle cfg.k4, pmeta.diff.
// v10 mosaic (optional, old saves need none): set.mosaic (false), pmeta.tier 3 or 4. Absent means the level it already was.
// Live v8 reading these: clamps diff to 4 and pal to 24, keeps set.sharp as an unknown field, opens a 32-colour k4 puzzle (labels > 24 not drawn).
// `pref` is the sharp on-device photo (WebP, keyed by puzzle id). It lives in its OWN small database `colormagic.pref`, so `colormagic`
// stays at version 2 and a rollback to v9.1 (which opens it at version 2 and would fail on a higher one) still reads every save.
// It never rides along in a backup or export: nothing here serializes it, and the hub backup's store list does not name it.
// PHOTO_CAP still counts pmeta photo rows only. Deleting a puzzle deletes its copy too.
(function () {
  'use strict';
  const KEY = 'colormagic.v1', DBN = 'colormagic';
  const isO = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v)) ? Math.max(lo, Math.min(hi, Math.round(v))) : d;
  const bool = (v, d) => typeof v === 'boolean' ? v : d;
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
  const DEF = () => ({ v: 1, set: { vol: 100, mus: true, voice: true, nums: true, outl: 1, dragPaint: true, helpers: true, photo: true, bigGrid: false, music: false, allLevels: false, sharp: false, mosaic: false }, last: { pid: '', mode: 'shapes', diff: 1, pal: 0, grid: 0 }, stats: { done: 0, regions: 0, ms: 0 }, frames: { pink: 0, gold: 0, silver: 0, gem: 0 }, seen: {}, stk: {} });
  function sanitize(d) {
    const o = DEF(); if (!isO(d)) return o; const keep = Object.assign({}, d);
    const s = isO(d.set) ? d.set : {};
    o.set = Object.assign({}, isO(d.set) ? d.set : {}, { vol: num(s.vol, 0, 100, 100), mus: bool(s.mus, true), voice: bool(s.voice, true), nums: bool(s.nums, true), outl: num(s.outl, 0, 2, 1), dragPaint: bool(s.dragPaint, true), helpers: bool(s.helpers, true), photo: bool(s.photo, true), bigGrid: bool(s.bigGrid, false), music: bool(s.music, false), allLevels: bool(s.allLevels, false), sharp: bool(s.sharp, false), mosaic: bool(s.mosaic, false) });
    const l = isO(d.last) ? d.last : {}; o.last = Object.assign({}, l, { pid: typeof l.pid === 'string' ? l.pid.slice(0, 60) : '', mode: l.mode === 'pixel' ? 'pixel' : 'shapes', diff: num(l.diff, 1, 7, 1), pal: num(l.pal, 0, 32, 0), grid: num(l.grid, 0, 80, 0), pack: typeof l.pack === 'string' ? l.pack.replace(/[^a-z0-9]/g, '').slice(0, 24) : '', scroll: num(l.scroll, 0, 20000, 0), packX: num(l.packX, 0, 20000, 0) });
    const t = isO(d.stats) ? d.stats : {}; o.stats = Object.assign({}, t, { done: num(t.done, 0, 99999, 0), regions: num(t.regions, 0, 9999999, 0), ms: num(t.ms, 0, 9e12, 0) });
    const f = isO(d.frames) ? d.frames : {}; o.frames = Object.assign({}, f, { pink: num(f.pink, 0, 1, 0), gold: num(f.gold, 0, 1, 0), silver: num(f.silver, 0, 1, 0), gem: num(f.gem, 0, 1, 0) });
    o.seen = isO(d.seen) ? Object.assign({}, d.seen) : {}; o.stk = isO(d.stk) ? Object.assign({}, d.stk) : {};
    for (const k in keep) if (!(k in o)) o[k] = keep[k];
    return o;
  }
  let data = DEF();
  function load() {
    const raw = ls.get(KEY); if (raw == null) { data = DEF(); return data; }
    try { data = sanitize(JSON.parse(raw)); } catch (e) { if (ls.get(KEY + '.bad') == null) ls.set(KEY + '.bad', raw); data = DEF(); }
    return data;
  }
  const write = () => ls.set(KEY, JSON.stringify(data));

  // ---------- IndexedDB (with an in-memory fallback for private mode / failures) ----------
  const STORES = ['puzzles', 'progress', 'gallery', 'pmeta'];
  let db = null, mem = { puzzles: new Map(), progress: new Map(), gallery: new Map(), pmeta: new Map() }, useMem = false, warn = false;
  const quarantine = new Map();
  function open() {
    return new Promise(res => {
      let done = false; const fin = ok => { if (done) return; done = true; if (!ok) { useMem = true; warn = true; } res(ok); };
      try {
        const r = indexedDB.open(DBN, 2);
        r.onupgradeneeded = () => { const d = r.result; for (const s of STORES) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); };
        r.onsuccess = () => { db = r.result; db.onversionchange = () => { try { db.close(); } catch (e) { } }; fin(true); };
        r.onerror = r.onblocked = () => fin(false);
        setTimeout(() => fin(false), 4000);
      } catch (e) { fin(false); }
    });
  }
  const tx = (store, mode, fn) => new Promise(res => {
    if (useMem || !db) { res(fn(null, mem[store], true)); return; }
    try { const t = db.transaction(store, mode), st = t.objectStore(store); let out; t.oncomplete = () => res(out); t.onerror = t.onabort = () => { warn = true; res(undefined); }; out = fn(st, null, false); }
    catch (e) { warn = true; res(undefined); }
  });
  const req = r => new Promise(res => { r.onsuccess = () => res(r.result); r.onerror = () => res(undefined); });
  async function get(store, id) { if (useMem || !db) return mem[store].get(id); try { return await req(db.transaction(store).objectStore(store).get(id)); } catch (e) { return undefined; } }
  async function all(store) { if (useMem || !db) return [...mem[store].values()]; try { return (await req(db.transaction(store).objectStore(store).getAll())) || []; } catch (e) { return []; } }
  async function put(store, rec) {
    mem[store].set(rec.id, rec);
    if (useMem || !db) return true;
    try {
      if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); if (e && e.quota && e.usage && e.quota - e.usage < 8 * 1048576) { warn = true; } }
      return await new Promise(res => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(rec); t.oncomplete = () => res(true); t.onerror = t.onabort = () => { warn = true; res(false); }; });
    } catch (e) { warn = true; return false; }   // QuotaExceededError etc.: the session keeps going from memory
  }
  // ---------- validation ----------
  const u8 = v => v instanceof Uint8Array ? v : (v instanceof ArrayBuffer ? new Uint8Array(v) : null);
  function okProg(r, n) {
    if (!isO(r) || typeof r.id !== 'string') return null;
    const fill = u8(r.fill), ord = r.order instanceof Uint16Array ? r.order : (Array.isArray(r.order) ? Uint16Array.from(r.order) : null);
    if (!fill || !ord || fill.length < Math.ceil(n / 8) || ord.length > n) return null;
    for (let i = 0; i < ord.length; i++) if (ord[i] >= n) return null;
    return { id: r.id, v: 1, fill, order: ord, n: num(r.n, 0, 65535, 0), sel: num(r.sel, 0, 64, 0), cam: isO(r.cam) && isFinite(r.cam.x) && isFinite(r.cam.y) && isFinite(r.cam.z) ? { x: r.cam.x, y: r.cam.y, z: r.cam.z } : null, ms: num(r.ms, 0, 9e12, 0), t: num(r.t, 0, 9e15, 0), free: r.free instanceof Uint8Array ? r.free : null };
  }
  async function getProg(id, n) { const r = await get('progress', id); if (r == null) return null; const o = okProg(r, n); if (!o) { quarantine.set('progress:' + id, r); return null; } return o; }
  async function allProg() { return (await all('progress')).filter(r => isO(r) && typeof r.id === 'string'); }
  async function allGal() {
    const out = []; for (const r of await all('gallery')) { if (isO(r) && typeof r.id === 'string' && typeof r.pid === 'string') out.push(r); else if (r && r.id) quarantine.set('gallery:' + r.id, r); } return out;
  }
  // ---------- photo puzzles (M2): puzzles + pmeta (meta + 256 px thumb) are always written together; delete spans all four stores (S7) ----------
  const MB = 1048576, PHOTO_CAP = 80;
  async function room(bytes) {   // P4: quota - usage >= record + 8 MB; unknown estimate = proceed and rely on try/catch
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); if (e && e.quota && e.usage != null) return e.quota - e.usage >= bytes + 8 * MB; } } catch (e) { }
    return true;
  }
  const errWhy = e => (e && (e.name === 'QuotaExceededError' || (e.target && e.target.error && e.target.error.name === 'QuotaExceededError'))) ? 'quota' : 'io';
  function multi(stores, fn) {   // one transaction over several stores; resolves {ok, why}
    return new Promise(res => {
      if (useMem || !db) { try { fn(n => ({ put: (r) => mem[n].set(r.id, r), delete: (k) => mem[n].delete(k) })); res({ ok: true }); } catch (e) { res({ ok: false, why: 'io' }); } return; }
      let t, why = 'io'; try { t = db.transaction(stores, 'readwrite'); } catch (e) { res({ ok: false, why: errWhy(e) }); return; }
      t.oncomplete = () => res({ ok: true }); t.onabort = () => res({ ok: false, why: errWhy(t.error) || why }); t.onerror = e => { why = errWhy(e.target && e.target.error); };
      try { fn(n => t.objectStore(n)); } catch (e) { why = errWhy(e); try { t.abort(); } catch (e2) { } res({ ok: false, why }); }
    });
  }
  async function putPuzzle(rec, meta) {
    const ms = await all('pmeta'); if (meta.src === 'photo' && ms.length >= PHOTO_CAP && !ms.some(m => m.id === meta.id)) return { ok: false, why: 'cap' };
    if (!(await room(meta.bytes))) return { ok: false, why: 'quota' };
    const r = await multi(['puzzles', 'pmeta'], st => { st('puzzles').put(rec); st('pmeta').put(meta); });
    if (!r.ok) warn = true; return r;
  }
  const getPuzzle = id => get('puzzles', id);
  async function allMeta() { return (await all('pmeta')).filter(m => isO(m) && typeof m.id === 'string'); }
  // ---------- sharp on-device copy: own database, own memory fallback ----------
  const PDBN = 'colormagic.pref', pmem = new Map(); let pdb = null, popen = null;
  function openPref() {
    if (popen) return popen;
    return popen = new Promise(res => {
      let done = false; const fin = d => { if (done) return; done = true; pdb = d; res(d); };
      try {
        const go = v => {
          const r = indexedDB.open(PDBN, v);
          r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('pref')) d.createObjectStore('pref', { keyPath: 'id' }); };
          r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('pref')) { const n = d.version + 1; d.close(); go(n); return; } d.onversionchange = () => { try { d.close(); } catch (e) { } }; fin(d); };   // a bare database without the store: add it
          r.onerror = r.onblocked = () => fin(null);
        };
        go(1);
        setTimeout(() => fin(null), 4000);
      } catch (e) { fin(null); }
    });
  }
  async function putPref(id, blob, info) {   // room() before the write. Not counted toward PHOTO_CAP.
    if (typeof id !== 'string' || !(blob instanceof Blob) || blob.size <= 0) return { ok: false, why: 'io' };
    if (!(await room(blob.size))) return { ok: false, why: 'quota' };
    const rec = { id, v: 1, blob, bytes: blob.size, w: info && info.w | 0, h: info && info.h | 0, made: Date.now() };
    const d = await openPref();
    if (!d) { pmem.set(id, rec); return { ok: true, mem: true }; }
    const ok = await new Promise(res => { try { const t = d.transaction('pref', 'readwrite'); t.objectStore('pref').put(rec); t.oncomplete = () => res({ ok: true }); t.onabort = t.onerror = () => res({ ok: false, why: errWhy(t.error) }); } catch (e) { res({ ok: false, why: errWhy(e) }); } });
    if (!ok.ok) warn = true; return ok;
  }
  async function getPref(id) {
    const d = await openPref(); let r;
    if (!d) r = pmem.get(id); else r = await new Promise(res => { try { const q = d.transaction('pref').objectStore('pref').get(id); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); } catch (e) { res(undefined); } });
    if (r == null) return null;
    if (!isO(r) || typeof r.id !== 'string' || !(r.blob instanceof Blob)) { quarantine.set('pref:' + id, r); return null; }
    return r;
  }
  async function allPref() {   // id -> bytes, without keeping any blob around
    const d = await openPref(); if (!d) return [...pmem.values()].map(r => ({ id: r.id, bytes: r.bytes }));
    return new Promise(res => { try { const q = d.transaction('pref').objectStore('pref').openCursor(), o = []; q.onsuccess = () => { const c = q.result; if (c) { const v = c.value; if (isO(v) && typeof v.id === 'string') o.push({ id: v.id, bytes: v.bytes | 0 }); c.continue(); } else res(o); }; q.onerror = () => res(o); } catch (e) { res([]); } });
  }
  async function delPref(id) {
    pmem.delete(id); const d = await openPref(); if (!d) return true;
    return new Promise(res => { try { const t = d.transaction('pref', 'readwrite'); t.objectStore('pref').delete(id); t.oncomplete = () => res(true); t.onabort = t.onerror = () => res(false); } catch (e) { res(false); } });
  }
  async function delPuzzle(id) {   // gated by the caller (S7): puzzle + meta + progress (+ free paint) + gallery in ONE transaction, then the sharp copy
    if (pend && (pend.id === id || pend.id === id + ':free')) { pend = null; clearTimeout(timer); timer = 0; }
    const r = await multi(STORES, st => { st('puzzles').delete(id); st('pmeta').delete(id); st('progress').delete(id); st('progress').delete(id + ':free'); st('gallery').delete(id); st('gallery').delete(id + ':free'); });
    if (r.ok) { for (const k of STORES) mem[k].delete(id); mem.progress.delete(id + ':free'); mem.gallery.delete(id + ':free'); await delPref(id); } return r;
  }
  async function delEntry(ids) {   // M4 viewer delete (gated by the caller): gallery + progress records for these ids, one transaction; the puzzle itself stays
    if (pend && ids.includes(pend.id)) { pend = null; clearTimeout(timer); timer = 0; }   // a queued write must not bring a deleted record back
    const r = await multi(['gallery', 'progress'], st => { for (const id of ids) { st('gallery').delete(id); st('progress').delete(id); } });
    if (r.ok) for (const id of ids) { mem.gallery.delete(id); mem.progress.delete(id); } return r;
  }
  // debounced progress writer: 1.5 s after a fill, immediately on flush()
  let pend = null, timer = 0;
  function queueProg(rec) { pend = rec; clearTimeout(timer); timer = setTimeout(flush, 1500); }
  function flush() { clearTimeout(timer); timer = 0; if (!pend) return Promise.resolve(); const r = pend; pend = null; return put('progress', r).then(ok => ok || put('progress', r)); }
  addEventListener('pagehide', () => { flush(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.CMSave = {
    load, write, get data() { return data; }, sanitize, open, put, get, all, putPuzzle, getPuzzle, allMeta, putPref, getPref, allPref, delPuzzle, room, PHOTO_CAP, getProg, allProg, allGal, delEntry, valid: okProg, queueProg, flush, quarantine,
    persist() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { } },
    get warn() { return warn; }, get mem() { return useMem; }, KEY
  };
})();
