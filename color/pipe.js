// Color Magic pipeline host: runs decode / make in a dedicated Worker (terminated after every job, new job cancels the old one = generation token, P9),
// or on the main thread in <=12 ms slices when the browser has no worker OffscreenCanvas. Also packs / unpacks puzzle records for IndexedDB.
// Nothing is fetched: the worker is a same-origin script and the only input is a File the grown-up/child picked.
(function () {
  'use strict';
  const C = window.CBN;
  const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const canWorker = () => typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && !H.forceMain && !/[?&]nw=1/.test(location.search);
  const cancelErr = () => Object.assign(new Error('cancel'), { code: 'cancel' });
  let gen = 0, wk = null, cur = null;
  const H = { forceMain: false, last: null, WORK: 1280, WORK4K: 3840, PREF: 2560, CAP: 300 * 1024, CAP4K: 1536 * 1024, CAPX: 700 * 1024, CAPEX: Math.floor(1.2 * 1024 * 1024), CAPEX4: Math.floor(1.8 * 1024 * 1024), stat: { maxSlice: 0, slices: 0, maxBand: 0 } };

  function cancel() { gen++; if (wk) { try { wk.terminate(); } catch (e) { } wk = null; } if (cur) { const c = cur; cur = null; c.rej(cancelErr()); } }
  function wjob(msg, tr, onProg) {
    cancel(); const g = gen;
    return new Promise((res, rej) => {
      let w; try { w = new Worker('worker.js'); } catch (e) { rej(Object.assign(new Error('worker'), { code: 'worker' })); return; }
      wk = w; cur = { rej };
      const done = () => { try { w.terminate(); } catch (e) { } if (wk === w) wk = null; cur = null; };
      w.onmessage = e => { const m = e.data; if (m.gen !== g) return; if (m.t === 'prog') { if (onProg) onProg(m.f, m.s); return; } done(); if (m.t === 'err') rej(Object.assign(new Error(m.code), { code: m.code })); else res(m); };
      w.onerror = () => { done(); rej(Object.assign(new Error('worker'), { code: 'worker' })); };
      msg.gen = g; w.postMessage(msg, tr || []);
    });
  }
  // main-thread driver: runs the generator in <= 12 ms slices, yields to the event loop between them
  async function sliced(it, g, budget, tick) {
    let slices = 0;
    for (;;) {
      const t0 = performance.now(); if (tick) tick();
      for (;;) { const r = it.next(); if (r.done) { H.stat.maxSlice = Math.max(H.stat.maxSlice, performance.now() - t0); return r.value; } if (performance.now() - t0 > budget) break; }
      H.stat.maxSlice = Math.max(H.stat.maxSlice, performance.now() - t0); H.stat.slices++; slices++; await new Promise(r => setTimeout(r, 0)); if (g != null && g !== gen) throw cancelErr();
    }
  }

  // ---------- decode: File -> {rgba,w,h} at <= WORK 1280 (1280 covers Master artist) ----------
  // o.big (4K switch on): the result is still the 1280 copy, plus out.big = the same picture at <= WORK4K 3840 for the Super sharp level
  // o.prefMax: also re-encode the decoded EXIF-free bitmap to WebP q0.9 at <= prefMax (the sharp on-device copy). The 2560 buffer stays in the worker.
  async function canvasWebp(src, q, maxSide) {
    const k = Math.min(1, maxSide / Math.max(src.w, src.h)), tw = Math.max(1, Math.round(src.w * k)), th = Math.max(1, Math.round(src.h * k));
    const c = mkc(src.w, src.h); c.getContext('2d').putImageData(new ImageData(src.rgba, src.w, src.h), 0, 0);
    const t = tw === src.w && th === src.h ? c : mkc(tw, th);
    if (t !== c) { const g = t.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, tw, th); }
    const blob = await new Promise(r => t.toBlob(b => r(b), 'image/webp', q));
    c.width = c.height = 1; if (t !== c) t.width = t.height = 1;
    return blob;
  }
  H.decode = async function (file, o) {
    const t0 = performance.now(), big = !!(o && o.big), prefMax = (o && o.prefMax) | 0; let out; H.stat.decStart = t0;
    const shape = (top, lo) => { const r = lo || top, x = { rgba: r.rgba, w: r.w, h: r.h }; if (lo) x.big = { rgba: top.rgba, w: top.w, h: top.h }; return x; };
    const takePref = m => { if (m && m.pref) { out.pref = m.pref; out.prefThumb = m.prefThumb || null; out.prefW = m.prefW || 0; out.prefH = m.prefH || 0; } };
    if (canWorker()) {
      try {
        const work = big ? H.WORK4K : H.WORK, top = Math.max(work, prefMax || 0), lo = (big || prefMax > work) ? H.WORK : 0;
        const m = await wjob({ cmd: 'decode', file, work: top, lo: lo && lo < top ? lo : 0, prefMax, keepBig: big ? 1 : 0 });
        out = shape({ rgba: new Uint8ClampedArray(m.rgba), w: m.w, h: m.h }, m.lo ? { rgba: new Uint8ClampedArray(m.lo.rgba), w: m.lo.w, h: m.lo.h } : null); out.info = m.info; out.where = 'worker'; takePref(m);
      } catch (e) { if (e.code !== 'worker') throw e; }
    }
    if (!out) {
      cancel(); let bandT = 0; const g0 = gen, work = big ? H.WORK4K : H.WORK, top = Math.max(work, prefMax || 0), lo = (big || prefMax > work) ? H.WORK : 0;
      const r = await C.decodeFile(file, top, mkc, async () => { const t = performance.now(); if (bandT) H.stat.maxBand = Math.max(H.stat.maxBand, t - bandT); await new Promise(q => setTimeout(q, 0)); bandT = performance.now(); if (g0 !== gen) throw cancelErr(); }, lo && lo < top ? lo : 0);
      out = (!big && r.lo) ? { rgba: r.lo.rgba, w: r.lo.w, h: r.lo.h } : shape(r, r.lo);
      out.info = { type: r.type, srcW: r.srcW, srcH: r.srcH }; out.where = 'main';
      if (prefMax) {
        const src = { rgba: r.rgba, w: r.w, h: r.h }, k = Math.min(1, prefMax / Math.max(r.w, r.h));
        out.pref = await canvasWebp(src, 0.9, prefMax); out.prefThumb = await canvasWebp(src, 0.85, 512); out.prefW = Math.max(1, Math.round(r.w * k)); out.prefH = Math.max(1, Math.round(r.h * k));
      }
    }
    out.ms = Math.round(performance.now() - t0); H.stat.decEnd = performance.now(); return out;
  };

  // ---------- make: {rgba,w,h} + options -> {pz, thumb:Blob, T, where}. The input is copied, never consumed. ----------
  // copy in 4 MB pieces with a yield between them (CC 8: one slice() of a 3840 picture is a 44 MB copy, a 250 ms task at 4x throttle)
  async function copyOf(a) {
    if (a.length <= 4194304) return a.slice();
    const c = new Uint8ClampedArray(a.length), g = gen;
    for (let o = 0; o < a.length; o += 4194304) { c.set(a.subarray(o, Math.min(a.length, o + 4194304)), o); await new Promise(r => setTimeout(r, 0)); if (g !== gen) throw cancelErr(); }
    return c;
  }
  H.make = async function (img, opt, onProg) {
    const t0 = performance.now(), cfg = C.cfgFor(opt), copy = await copyOf(img.rgba); let out = null;
    if (canWorker()) {
      try { const m = await wjob({ cmd: 'make', rgba: copy.buffer, w: img.w, h: img.h, cfg, thumb: 512 }, [copy.buffer], onProg); out = { pz: m.pz, thumb: m.thumb, where: 'worker' }; }
      catch (e) { if (e.code !== 'worker') throw e; }
    }
    if (!out) {
      cancel(); const g = gen, c2 = await copyOf(img.rgba), cp = onProg ? C.creep(onProg) : null, pz = await sliced(C.run({ rgba: c2, w: img.w, h: img.h }, cfg, { prog: cp ? cp.prog : null }), g, 12, cp && cp.tick);
      const t1 = performance.now(), cv = C.drawThumb(pz, C.inflate(pz, Path2D), 512, mkc), blob = await new Promise(r => cv.toBlob(b => r(b), 'image/webp', 0.85));
      pz.T.thumb = Math.round((performance.now() - t1) * 10) / 10; out = { pz, thumb: blob, where: 'main' };
    }
    out.pz.T.total = Math.round(performance.now() - t0); out.T = out.pz.T; out.cfg = cfg; H.last = { where: out.where, T: out.T, memPeak: out.pz.memPeak, n: out.pz.n, mode: out.pz.mode }; return out;
  };
  // Detail picker: split a pack picture in the worker (Hard = level 2, Expert = level 3). preview uses a 256 px raster.
  H.detail = async function (pic, level, seed, onProg, preview) {
    const t0 = performance.now(), slim = { w: pic.w, h: pic.h, pal: pic.pal, shapes: pic.shapes }, lv = level >= 3 ? 3 : 2;
    let out = null;
    if (canWorker()) {
      try { const m = await wjob({ cmd: 'detail', pic: slim, level: lv, seed, preview: !!preview, thumb: 256 }, [], onProg); out = { pz: m.pz, thumb: m.thumb, where: 'worker' }; }
      catch (e) { if (e.code !== 'worker') throw e; }
    }
    if (!out) {
      cancel(); const g = gen, size = preview ? 256 : (lv >= 3 ? 768 : 512);
      const rast = C.rasterShapes(slim, size, mkc, Path2D), cols = Uint8Array.from(slim.shapes, s => s[0] | 0);
      const cp = onProg ? C.creep(onProg) : null, pz = await sliced(C.detailRun(rast, cols, slim.pal, lv, seed, { prog: cp ? cp.prog : null }), g, 12, cp && cp.tick);
      const cv = C.drawThumb(pz, C.inflate(pz, Path2D), 256, mkc), blob = await new Promise(r => cv.toBlob(b => r(b), 'image/webp', 0.8));
      out = { pz, thumb: blob, where: 'main' };
    }
    out.pz.T.total = Math.round(performance.now() - t0); out.T = out.pz.T; H.last = { where: out.where, T: out.T, memPeak: out.pz.memPeak, n: out.pz.n, mode: out.pz.mode }; return out;
  };
  // Expert / Extreme mosaic. img is a photo {rgba,w,h,k4?} or a cartoon pic {shapes,pal,w,h}.
  H.mosaic = async function (img, tier, seed, onProg) {
    const t0 = performance.now(), cartoon = !!(img && img.shapes && !img.rgba); let out = null;
    if (canWorker()) {
      try {
        const msg = { cmd: 'mosaic', tier, seed, thumb: 256 };
        let tr = [];
        if (cartoon) msg.pic = { w: img.w, h: img.h, pal: img.pal, shapes: img.shapes };
        else { const copy = await copyOf(img.rgba); msg.rgba = copy.buffer; msg.w = img.w; msg.h = img.h; msg.k4 = img.k4 ? 1 : 0; tr = [copy.buffer]; }
        const m = await wjob(msg, tr, onProg); out = { pz: m.pz, thumb: m.thumb, where: 'worker' };
      } catch (e) { if (e.code !== 'worker') throw e; }
    }
    if (!out) {
      cancel(); const g = gen, cp = onProg ? C.creep(onProg) : null;
      let pz;
      if (cartoon) {
        const rast = C.rasterShapes(img, 1024, mkc, Path2D), cols = Uint8Array.from(img.shapes, s => s[0] | 0);
        pz = await sliced(C.mosaicRun({ rast, cols, pal: img.pal, tier, seed, spatial: true }, { prog: cp ? cp.prog : null }), g, 12, cp && cp.tick);
      } else {
        const c2 = await copyOf(img.rgba);
        pz = await sliced(C.mosaicRun({ rgba: c2, w: img.w, h: img.h, tier, seed, k4: img.k4 ? 1 : 0 }, { prog: cp ? cp.prog : null }), g, 12, cp && cp.tick);
      }
      const cv = C.drawMapThumb(pz, 256, mkc), blob = await new Promise(r => cv.toBlob(b => r(b), 'image/webp', 0.8));
      out = { pz, thumb: blob, where: 'main' };
    }
    out.pz.T.total = Math.round(performance.now() - t0); out.T = out.pz.T; H.last = { where: out.where, T: out.T, memPeak: out.pz.memPeak, n: out.pz.n, mode: out.pz.mode }; return out;
  };
  // puzzle -> drawable pieces in <= 12 ms slices (a Super sharp map is 11M pixels). view = simplified outlines for play (cbn-core inflateG)
  H.inflate = (pz, view) => sliced(C.inflateG(pz, Path2D, view), null, 12);
  H.cancel = cancel; H.canWorker = canWorker;

  // ---------- gzip helpers (CompressionStream when the browser has it; raw bytes otherwise) ----------
  // fed in 128 KB pieces with a yield between them: the (de)compressor works on each write in the page's thread (CC 8: a Super sharp record in one write was a 60+ ms task at 4x)
  async function pipeThrough(u8, S) {
    const s = new S('gzip'), w = s.writable.getWriter(), rd = s.readable.getReader(), parts = [], CH = 131072; let n = 0;
    const reading = (async () => { for (;;) { const r = await rd.read(); if (r.done) break; parts.push(r.value); n += r.value.length; } })(); reading.catch(() => { });
    for (let o = 0; o < u8.length; o += CH) { await w.write(u8.subarray(o, Math.min(u8.length, o + CH))); if (u8.length > CH) await new Promise(r => setTimeout(r, 0)); }
    await w.close(); await reading;
    const o = new Uint8Array(n); let p = 0; for (const q of parts) { o.set(q, p); p += q.length; } return o;
  }
  const gz = async u8 => typeof CompressionStream === 'undefined' ? u8 : pipeThrough(u8, CompressionStream);
  const gunzip = async u8 => typeof DecompressionStream === 'undefined' ? u8 : pipeThrough(u8, DecompressionStream);
  H.zOK = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

  // ---------- record <-> puzzle. Kid/Detailed stay <= 300 KB (4K <= 1.5 MB) as raw Int16 + gzip.
  // Expert 700 KB, Extreme 1.2 MB, Extreme 4K 1.8 MB: delta-varint (rv 2) then gzip, and at most one eps x1.5 after that. ----------
  const bytesOf = (...a) => a.reduce((s, x) => s + (x ? (x.byteLength != null ? x.byteLength : x.size || 0) : 0), 0);
  function capFor(pz) {
    const cfg = pz && pz.cfg || {}, tier = cfg.tier | 0;
    if (tier === 4 && cfg.k4) return H.CAPEX4;
    if (tier === 4) return H.CAPEX;
    if (tier === 3) return H.CAPX;
    return cfg.k4 ? H.CAP4K : H.CAP;
  }
  H.capFor = capFor;
  function encVarint(i16) {
    const o = [];
    for (let i = 0; i < i16.length; i++) {
      let n = i16[i] | 0, u = n < 0 ? ((-n) << 1) | 1 : (n << 1);
      while (u >= 128) { o.push((u & 127) | 128); u >>>= 7; }
      o.push(u);
    }
    return Uint8Array.from(o);
  }
  function decVarint(u8) {
    const vals = []; let p = 0;
    while (p < u8.length) {
      let v = 0, s = 0, c; do { if (p >= u8.length || s > 28) throw C.E('bad'); c = u8[p++]; v |= (c & 127) << s; s += 7; } while (c & 128);
      vals.push((v & 1) ? -(v >>> 1) : (v >>> 1));
    }
    return Int16Array.from(vals);
  }
  H.pack = async function (pz, thumb, id, src) {
    const z = H.zOK() ? 1 : 0, d = pz.data, mosaic = !!((pz.cfg && pz.cfg.tier) | 0);
    let rings = d.rings, eps = pz.cfg.eps || 0.7, tries = 0, rec;
    const maxTries = mosaic ? 1 : 6;
    for (;;) {
      let raw = null;
      if (pz.mode === 'shapes') raw = mosaic ? encVarint(rings) : new Uint8Array(rings.buffer, rings.byteOffset, rings.byteLength);
      const rg = raw ? (z ? await gz(raw) : raw) : null;
      const rl = pz.mode === 'shapes' ? (z ? await gz(d.rle) : d.rle) : null;
      rec = { id, v: 1, pv: pz.pv, src, mode: pz.mode, w: pz.w, h: pz.h, W: pz.W, H: pz.H, s: pz.s, n: pz.n, pal: pz.pal, cfg: pz.cfg, z, made: Date.now() };
      if (mosaic) rec.rv = 2;
      if (pz.mode === 'shapes') Object.assign(rec, { col: d.col, bb: d.bb, lab: d.lab, rg, rl }); else rec.cells = d.cells;
      if (d.xlab) rec.xlab = d.xlab;   // additive: up to 2 extra number spots. Old records omit it.
      const bytes = bytesOf(rec.col, rec.bb, rec.lab, rec.xlab, rec.rg, rec.rl, rec.cells, thumb);
      const cap = capFor(pz);
      if (bytes <= cap || pz.mode !== 'shapes' || tries >= maxTries) {
        const meta = { id, v: 1, src, mode: pz.mode, n: pz.n, w: pz.W, h: pz.H, bytes, thumb, made: rec.made, diff: pz.cfg.diff };
        if (pz.cfg && pz.cfg.tier) meta.tier = pz.cfg.tier | 0;
        return { rec, meta, bytes, eps, tries };
      }
      eps *= 1.5; tries++; rings = C.resimplify(rings, pz.n, eps); pz.cfg.eps = eps;
    }
  };
  // R2: the sharp on-device copy as an ImageBitmap. Own short-lived worker (does not cancel a make); main-thread decode is the fallback.
  H.bitmap = async function (blob) {
    if (canWorker()) {
      try {
        return await new Promise((res, rej) => {
          let w; try { w = new Worker('worker.js'); } catch (e) { rej(e); return; }
          const end = () => { try { w.terminate(); } catch (e) { } };
          w.onmessage = e => { end(); e.data.t === 'bitmap' ? res(e.data.bm) : rej(new Error('bitmap')); };
          w.onerror = e => { end(); rej(new Error('bitmap')); };
          w.postMessage({ cmd: 'bitmap', blob, gen: 0 });
        });
      } catch (e) { }
    }
    return createImageBitmap(blob);
  };
  H.unpack = async function (rec) {   // throws {code:'bad'} on anything odd (the caller quarantines the record)
    try {
      if (!rec || rec.v !== 1) throw C.E('bad');
      const pz = { pv: rec.pv, mode: rec.mode, w: rec.w, h: rec.h, W: rec.W, H: rec.H, s: rec.s, n: rec.n, pal: rec.pal, cfg: rec.cfg, data: {} };
      if (rec.mode === 'pixel') pz.data.cells = rec.cells;
      else {
        const rg = rec.z ? await gunzip(rec.rg) : rec.rg, rl = rec.z ? await gunzip(rec.rl) : rec.rl;
        if (!(rg instanceof Uint8Array)) throw C.E('bad');
        const rings = rec.rv === 2 ? decVarint(rg) : (rg.length % 2 ? null : new Int16Array(rg.buffer.slice(rg.byteOffset, rg.byteOffset + rg.byteLength)));
        if (!rings) throw C.E('bad');
        pz.data = { col: rec.col, bb: rec.bb, lab: rec.lab, rings, rle: rl };
        if (rec.xlab) pz.data.xlab = rec.xlab;
      }
      C.check(pz); if (!(pz.W > 0 && pz.H > 0 && pz.s > 0 && pz.w > 0 && pz.h > 0)) throw C.E('bad');
      return pz;
    } catch (e) { throw e.code === 'bad' ? e : C.E('bad'); }
  };
  window.CBNHost = H;
})();
