// Color Magic worker: decode + pipeline for ONE job, then the page terminates it (memory goes back, P2). No network, no storage.
importScripts('cbn-core.js');
const post = (m, tr) => self.postMessage(m, tr || []);
// Re-encode an EXIF-free bitmap to WebP. The canvas pixels are the decoded copy; the file itself is not stored.
async function refBlobs(rgba, w, h) {
  const c = new OffscreenCanvas(w, h);
  c.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0);
  const pref = await c.convertToBlob({ type: 'image/webp', quality: 0.9 });
  const k = 512 / Math.max(w, h), tw = Math.max(1, Math.round(w * k)), th = Math.max(1, Math.round(h * k));
  const t = new OffscreenCanvas(tw, th), g = t.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(c, 0, 0, tw, th);
  const prefThumb = await t.convertToBlob({ type: 'image/webp', quality: 0.85 });
  c.width = c.height = 1; t.width = t.height = 1;
  return { pref, prefThumb, w, h };
}
self.onmessage = async e => {
  const m = e.data;
  try {
    if (m.cmd === 'decode') {
      const top = m.work, loAt = m.lo | 0, prefMax = m.prefMax | 0;
      const r = await CBN.decodeFile(m.file, top, (w, h) => new OffscreenCanvas(w, h), null, loAt && loAt < top ? loAt : 0);
      let pref = null, prefThumb = null, pw = 0, ph = 0;
      if (prefMax > 0) {
        let rw = r.w, rh = r.h, rgba = r.rgba;
        const cap = prefMax / Math.max(rw, rh);
        if (cap < 0.999) { rw = Math.max(1, Math.round(r.w * cap)); rh = Math.max(1, Math.round(r.h * cap)); rgba = CBN.downscale(rgba, r.w, r.h, rw, rh); }
        const blobs = await refBlobs(rgba, rw, rh);
        pref = blobs.pref; prefThumb = blobs.prefThumb; pw = blobs.w; ph = blobs.h;
      }
      let body, transfers;
      if (!m.keepBig && r.lo) { body = { rgba: r.lo.rgba.buffer, w: r.lo.w, h: r.lo.h, lo: null }; transfers = [r.lo.rgba.buffer]; }
      else {
        const lo = r.lo ? { rgba: r.lo.rgba.buffer, w: r.lo.w, h: r.lo.h } : null;
        body = { rgba: r.rgba.buffer, w: r.w, h: r.h, lo };
        transfers = lo ? [r.rgba.buffer, lo.rgba] : [r.rgba.buffer];
      }
      post(Object.assign({ t: 'decoded', gen: m.gen, pref, prefThumb, prefW: pw, prefH: ph, info: { type: r.type, srcW: r.srcW, srcH: r.srcH } }, body), transfers);
    } else if (m.cmd === 'bitmap') {   // R2: decode the stored sharp copy here, hand back an ImageBitmap (the pixels never sit in the page heap)
      const bm = await createImageBitmap(m.blob);
      post({ t: 'bitmap', gen: m.gen, bm, w: bm.width, h: bm.height }, [bm]);
    } else if (m.cmd === 'export') {   // M4: 2K PNG, rendered here so the 16.8 MB canvas never touches the page heap (P5); canvas-encoded = no EXIF/tEXt
      if (!self.CMR) importScripts('art.js', 'render.js');
      let pic = m.pic; if (m.pz) { const inf = CBN.inflate(m.pz, Path2D), col = m.pz.mode === 'pixel' ? inf.cells : m.pz.data.col; pic = { w: m.pz.W, h: m.pz.H, pal: m.pz.pal, bg: '#fff1ee', shapes: Array.from({ length: m.pz.n }, (_, i) => [col[i]]), line: [], pre: inf, custom: true }; }
      const c = self.CMR.renderArt(pic, m.fc, { long: m.long, sheen: m.sheen, frame: m.frame, make: (w, h) => new OffscreenCanvas(w, h) });
      if (m.bitmap) { const bm = c.transferToImageBitmap(); post({ t: 'bmp', gen: m.gen, bm, w: bm.width, h: bm.height }, [bm]); return; }   // v9 QA P2: the Finished screen's sharp art, painted here instead of in one long page task
      const blob = await c.convertToBlob({ type: 'image/png' });
      post({ t: 'png', gen: m.gen, blob, w: c.width, h: c.height });
    } else if (m.cmd === 'make') {
      const t0 = performance.now(), src = { rgba: new Uint8ClampedArray(m.rgba), w: m.w, h: m.h }; m.rgba = null;   // run() lets go of the pixels mid-way (CC 8)
      const cp = CBN.creep((f, s) => post({ t: 'prog', gen: m.gen, f, s })), pz = CBN.drainTick(CBN.run(src, m.cfg, { prog: cp.prog }), cp.tick);
      const t1 = performance.now(), inf = CBN.inflate(pz, Path2D), c = CBN.drawThumb(pz, inf, m.thumb || 512, (w, h) => new OffscreenCanvas(w, h));
      const blob = await c.convertToBlob({ type: 'image/webp', quality: 0.85 });
      pz.T.thumb = Math.round((performance.now() - t1) * 10) / 10; pz.T.total = Math.round(performance.now() - t0);
      const tr = []; for (const k in pz.data) tr.push(pz.data[k].buffer);
      post({ t: 'done', gen: m.gen, pz, thumb: blob }, tr);
    } else if (m.cmd === 'detail') {
      const t0 = performance.now(), size = m.preview ? 256 : (m.level >= 3 ? 768 : 512);
      const rast = CBN.rasterShapes(m.pic, size, (w, h) => new OffscreenCanvas(w, h), Path2D);
      const cols = new Uint8Array(m.pic.shapes.length); for (let i = 0; i < cols.length; i++) cols[i] = m.pic.shapes[i][0] | 0;
      const cp = CBN.creep((f, s) => post({ t: 'prog', gen: m.gen, f, s })), pz = CBN.drainTick(CBN.detailRun(rast, cols, m.pic.pal, m.level >= 3 ? 3 : 2, m.seed, { prog: cp.prog }), cp.tick);
      const t1 = performance.now(), inf = CBN.inflate(pz, Path2D), c = CBN.drawThumb(pz, inf, m.thumb || 256, (w, h) => new OffscreenCanvas(w, h));
      const blob = await c.convertToBlob({ type: 'image/webp', quality: 0.8 });
      pz.T.thumb = Math.round((performance.now() - t1) * 10) / 10; pz.T.total = Math.round(performance.now() - t0);
      const tr = []; for (const k in pz.data) tr.push(pz.data[k].buffer);
      post({ t: 'done', gen: m.gen, pz, thumb: blob }, tr);
    } else if (m.cmd === 'mosaic') {
      const t0 = performance.now();
      const cp = CBN.creep((f, s) => post({ t: 'prog', gen: m.gen, f, s }));
      let src;
      if (m.pic) {
        const rast = CBN.rasterShapes(m.pic, 1024, (w, h) => new OffscreenCanvas(w, h), Path2D);
        const cols = new Uint8Array(m.pic.shapes.length);
        for (let i = 0; i < cols.length; i++) cols[i] = m.pic.shapes[i][0] | 0;
        src = { rast, cols, pal: m.pic.pal, tier: m.tier, seed: m.seed, spatial: true };
      } else {
        src = { rgba: new Uint8ClampedArray(m.rgba), w: m.w, h: m.h, tier: m.tier, seed: m.seed, k4: m.k4 ? 1 : 0 };
        m.rgba = null;
      }
      const pz = CBN.drainTick(CBN.mosaicRun(src, { prog: cp.prog }), cp.tick);
      const t1 = performance.now(), c = CBN.drawMapThumb(pz, m.thumb || 256, (w, h) => new OffscreenCanvas(w, h));
      const blob = await c.convertToBlob({ type: 'image/webp', quality: 0.8 });
      pz.T.thumb = Math.round((performance.now() - t1) * 10) / 10; pz.T.total = Math.round(performance.now() - t0);
      const tr = []; for (const k in pz.data) tr.push(pz.data[k].buffer);
      post({ t: 'done', gen: m.gen, pz, thumb: blob }, tr);
    }
  } catch (err) { post({ t: 'err', gen: m.gen, code: err && err.code || 'decode' }); }
};
