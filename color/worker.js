// Color Magic worker: decode + pipeline for ONE job, then the page terminates it (memory goes back, P2). No network, no storage.
importScripts('cbn-core.js');
const post = (m, tr) => self.postMessage(m, tr || []);
self.onmessage = async e => {
  const m = e.data;
  try {
    if (m.cmd === 'decode') {
      const r = await CBN.decodeFile(m.file, m.work, (w, h) => new OffscreenCanvas(w, h));
      post({ t: 'decoded', gen: m.gen, rgba: r.rgba.buffer, w: r.w, h: r.h, info: { type: r.type, srcW: r.srcW, srcH: r.srcH } }, [r.rgba.buffer]);
    } else if (m.cmd === 'export') {   // M4: 2K PNG, rendered here so the 16.8 MB canvas never touches the page heap (P5); canvas-encoded = no EXIF/tEXt
      if (!self.CMR) importScripts('art.js', 'render.js');
      let pic = m.pic; if (m.pz) { const inf = CBN.inflate(m.pz, Path2D), col = m.pz.mode === 'pixel' ? inf.cells : m.pz.data.col; pic = { w: m.pz.W, h: m.pz.H, pal: m.pz.pal, bg: '#fff1ee', shapes: Array.from({ length: m.pz.n }, (_, i) => [col[i]]), line: [], pre: inf, custom: true }; }
      const c = self.CMR.renderArt(pic, m.fc, { long: m.long, sheen: m.sheen, frame: m.frame, make: (w, h) => new OffscreenCanvas(w, h) });
      const blob = await c.convertToBlob({ type: 'image/png' });
      post({ t: 'png', gen: m.gen, blob, w: c.width, h: c.height });
    } else if (m.cmd === 'make') {
      const t0 = performance.now(), src = { rgba: new Uint8ClampedArray(m.rgba), w: m.w, h: m.h };
      const pz = CBN.drain(CBN.run(src, m.cfg, { prog: (f, s) => post({ t: 'prog', gen: m.gen, f, s }) }));
      const t1 = performance.now(), inf = CBN.inflate(pz, Path2D), c = CBN.drawThumb(pz, inf, m.thumb || 256, (w, h) => new OffscreenCanvas(w, h));
      const blob = await c.convertToBlob({ type: 'image/webp', quality: 0.8 });
      pz.T.thumb = Math.round((performance.now() - t1) * 10) / 10; pz.T.total = Math.round(performance.now() - t0);
      const tr = []; for (const k in pz.data) tr.push(pz.data[k].buffer);
      post({ t: 'done', gen: m.gen, pz, thumb: blob }, tr);
    }
  } catch (err) { post({ t: 'err', gen: m.gen, code: err && err.code || 'decode' }); }
};
