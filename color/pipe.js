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
  const H = { forceMain: false, last: null, WORK: 1024, CAP: 180 * 1024, stat: { maxSlice: 0, slices: 0, maxBand: 0 } };

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
  async function sliced(it, g, budget) {
    let slices = 0;
    for (;;) {
      const t0 = performance.now();
      for (;;) { const r = it.next(); if (r.done) { H.stat.maxSlice = Math.max(H.stat.maxSlice, performance.now() - t0); return r.value; } if (performance.now() - t0 > budget) break; }
      H.stat.maxSlice = Math.max(H.stat.maxSlice, performance.now() - t0); H.stat.slices++; slices++; await new Promise(r => setTimeout(r, 0)); if (g !== gen) throw cancelErr();
    }
  }

  // ---------- decode: File -> {rgba,w,h} at <= WORK 1024 (the original is never kept) ----------
  H.decode = async function (file) {
    const t0 = performance.now(); let out; H.stat.decStart = t0;
    if (canWorker()) {
      try { const m = await wjob({ cmd: 'decode', file, work: H.WORK }); out = { rgba: new Uint8ClampedArray(m.rgba), w: m.w, h: m.h, info: m.info, where: 'worker' }; }
      catch (e) { if (e.code !== 'worker') throw e; }
    }
    if (!out) { cancel(); let bandT = 0; const g0 = gen, r = await C.decodeFile(file, H.WORK, mkc, async () => { const t = performance.now(); if (bandT) H.stat.maxBand = Math.max(H.stat.maxBand, t - bandT); await new Promise(q => setTimeout(q, 0)); bandT = performance.now(); if (g0 !== gen) throw cancelErr(); }); out = { rgba: r.rgba, w: r.w, h: r.h, info: { type: r.type, srcW: r.srcW, srcH: r.srcH }, where: 'main' }; }
    out.ms = Math.round(performance.now() - t0); H.stat.decEnd = performance.now(); return out;
  };

  // ---------- make: {rgba,w,h} + options -> {pz, thumb:Blob, T, where}. The input is copied, never consumed. ----------
  H.make = async function (img, opt, onProg) {
    const t0 = performance.now(), cfg = C.cfgFor(opt), copy = img.rgba.slice(); let out = null;
    if (canWorker()) {
      try { const m = await wjob({ cmd: 'make', rgba: copy.buffer, w: img.w, h: img.h, cfg, thumb: 256 }, [copy.buffer], onProg); out = { pz: m.pz, thumb: m.thumb, where: 'worker' }; }
      catch (e) { if (e.code !== 'worker') throw e; }
    }
    if (!out) {
      cancel(); const g = gen, c2 = img.rgba.slice(), pz = await sliced(C.run({ rgba: c2, w: img.w, h: img.h }, cfg, { prog: onProg }), g, 12);
      const t1 = performance.now(), cv = C.drawThumb(pz, C.inflate(pz, Path2D), 256, mkc), blob = await new Promise(r => cv.toBlob(b => r(b), 'image/webp', 0.8));
      pz.T.thumb = Math.round((performance.now() - t1) * 10) / 10; out = { pz, thumb: blob, where: 'main' };
    }
    out.pz.T.total = Math.round(performance.now() - t0); out.T = out.pz.T; out.cfg = cfg; H.last = { where: out.where, T: out.T, memPeak: out.pz.memPeak, n: out.pz.n, mode: out.pz.mode }; return out;
  };
  H.cancel = cancel; H.canWorker = canWorker;

  // ---------- gzip helpers (CompressionStream when the browser has it; raw bytes otherwise) ----------
  async function pipeThrough(u8, S) {
    const s = new S('gzip'), w = s.writable.getWriter(); w.write(u8); w.close(); const rd = s.readable.getReader(), parts = []; let n = 0;
    for (;;) { const r = await rd.read(); if (r.done) break; parts.push(r.value); n += r.value.length; }
    const o = new Uint8Array(n); let p = 0; for (const q of parts) { o.set(q, p); p += q.length; } return o;
  }
  const gz = async u8 => typeof CompressionStream === 'undefined' ? u8 : pipeThrough(u8, CompressionStream);
  const gunzip = async u8 => typeof DecompressionStream === 'undefined' ? u8 : pipeThrough(u8, DecompressionStream);
  H.zOK = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

  // ---------- record <-> puzzle (P3: record <= 180 KB incl. the thumb; raise the Douglas-Peucker epsilon and rebuild when over) ----------
  const bytesOf = (...a) => a.reduce((s, x) => s + (x ? (x.byteLength != null ? x.byteLength : x.size || 0) : 0), 0);
  H.pack = async function (pz, thumb, id, src) {
    const z = H.zOK() ? 1 : 0, d = pz.data; let rings = d.rings, eps = pz.cfg.eps || 0.7, tries = 0, rec;
    for (;;) {
      const rg = pz.mode === 'shapes' ? (z ? await gz(new Uint8Array(rings.buffer, rings.byteOffset, rings.byteLength)) : new Uint8Array(rings.buffer.slice(rings.byteOffset, rings.byteOffset + rings.byteLength))) : null;
      const rl = pz.mode === 'shapes' ? (z ? await gz(d.rle) : d.rle) : null;
      rec = { id, v: 1, pv: pz.pv, src, mode: pz.mode, w: pz.w, h: pz.h, W: pz.W, H: pz.H, s: pz.s, n: pz.n, pal: pz.pal, cfg: pz.cfg, z, made: Date.now() };
      if (pz.mode === 'shapes') Object.assign(rec, { col: d.col, bb: d.bb, lab: d.lab, rg, rl }); else rec.cells = d.cells;
      const bytes = bytesOf(rec.col, rec.bb, rec.lab, rec.rg, rec.rl, rec.cells, thumb);
      if (bytes <= H.CAP || pz.mode !== 'shapes' || tries >= 6) { const meta = { id, v: 1, src, mode: pz.mode, n: pz.n, w: pz.W, h: pz.H, bytes, thumb, made: rec.made, diff: pz.cfg.diff }; return { rec, meta, bytes, eps, tries }; }
      eps *= 1.5; tries++; rings = C.resimplify(rings, pz.n, eps); pz.cfg.eps = eps;
    }
  };
  H.unpack = async function (rec) {   // throws {code:'bad'} on anything odd (the caller quarantines the record)
    try {
      if (!rec || rec.v !== 1) throw C.E('bad');
      const pz = { pv: rec.pv, mode: rec.mode, w: rec.w, h: rec.h, W: rec.W, H: rec.H, s: rec.s, n: rec.n, pal: rec.pal, cfg: rec.cfg, data: {} };
      if (rec.mode === 'pixel') pz.data.cells = rec.cells;
      else {
        const rg = rec.z ? await gunzip(rec.rg) : rec.rg, rl = rec.z ? await gunzip(rec.rl) : rec.rl;
        if (!(rg instanceof Uint8Array) || rg.length % 2) throw C.E('bad');
        pz.data = { col: rec.col, bb: rec.bb, lab: rec.lab, rings: new Int16Array(rg.buffer.slice(rg.byteOffset, rg.byteOffset + rg.byteLength)), rle: rl };
      }
      C.check(pz); if (!(pz.W > 0 && pz.H > 0 && pz.s > 0 && pz.w > 0 && pz.h > 0)) throw C.E('bad');
      return pz;
    } catch (e) { throw e.code === 'bad' ? e : C.E('bad'); }
  };
  window.CBNHost = H;
})();
