// Color Magic render engine: puzzle prep (bboxes, number spots), camera, split tile cache (fill layer + outline layer), digit atlas, fx overlay.
// Pack pictures are vector (2048 px world). The art canvas only blits cached tiles; a tap paints one region into the tiles that exist (4 ms/frame budget).
(function () {
  'use strict';
  const TS = 256, TB = TS * TS * 4 * 2, WORLD = 2048;
  const LODS = [4, 2.828, 2, 1.414, 1, 0.707, 0.5, 0.354, 0.25];   // world px per tile px; 0.25 = deep-zoom window (P7)
  const PAPER = '#fff1ee', OUT = '#b2346f', LW = 10, HIDE_PX = 11;
  const QS = [{ dpr: 2, cap: 48, minLod: 0.25, maxP: 150 }, { dpr: 2, cap: 28, minLod: 0.25, maxP: 80 }, { dpr: 1.5, cap: 14, minLod: 1, maxP: 30 }];
  const mk = (w, h) => (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const hx = mk(1, 1).getContext('2d');
  const FXD = 1;   // the fx overlay (hatch, glow, sparkles) is soft by design, so it runs at 1x to save fill rate on big screens
  let WW = WORLD, WH = WORLD, art, fx, actx, fctx, cssW = 0, cssH = 0, dpr = 1, q = 0, fit = 0.2, S = null, curLi = 4, lastCam = 0, artDirty = true, fxDirty = true, frameNo = 0, tileCount = 0;
  const cam = { x: WORLD / 2, y: WORLD / 2, z: 0.2 };
  const GLW = P => Math.max(2.5, P.grid.cs * 0.05);   // pixel-mode grid line width (world px)
  const tiles = new Map(), fxPend = new Map(), pendTiles = new Set(), glow = new Set();
  let artFull = true, dr = null, flight = null, ring = null, hatch = null, sprites = null, lastBuild = 0;
  const stats = { builds: 0, applies: 0, maxBuildMs: 0, lastLod: 0, visible: 0 };
  // ---------- particles (pooled, screen space) ----------
  const NP = 150, pa = { x: new Float32Array(NP), y: new Float32Array(NP), vx: new Float32Array(NP), vy: new Float32Array(NP), l: new Float32Array(NP), s: new Float32Array(NP), k: new Uint8Array(NP), on: new Uint8Array(NP) };
  let pHead = 0, pLive = 0;

  // ---------- puzzle prep ----------
  function prepPre(pic) {   // photo puzzles: paths, boxes, spots and the label map are already computed (worker + inflate)
    const pre = pic.pre, n = pic.shapes.length, P = { pic, n, path: [], clip: [], col: new Uint8Array(n), bb: [], lab: [], line: [], vis: new Int32Array(n), W: pic.w, H: pic.h };
    if (pre.mode === 'pixel') {
      const cs = pre.cs, gw = pre.gw; P.grid = { gw, gh: pre.gh, cs }; P.col.set(pre.cells);
      for (let i = 0; i < n; i++) { const x = (i % gw) * cs, y = ((i / gw) | 0) * cs; P.bb[i] = [x - 2, y - 2, x + cs + 2, y + cs + 2]; P.lab[i] = [x + cs / 2, y + cs / 2, cs / 2, cs * 0.72]; P.clip[i] = null; }
    } else {
      P.path = pre.paths; P.col.set(pre.col); P.bb = pre.bb; P.lab = pre.lab; P.map = pre.map; P.mw = pre.mw; P.mh = pre.mh; P.ms = pre.s; P.disjoint = true;
      for (let i = 0; i < n; i++) P.clip[i] = null;
    }
    return P;
  }
  function prep(pic) {
    if (pic.pre) return prepPre(pic);
    const n = pic.shapes.length, P = { pic, n, path: [], clip: [], col: new Uint8Array(n), bb: [], lab: [], line: pic.line.map(d => new Path2D(d)), vis: new Int32Array(n) };
    for (let i = 0; i < n; i++) { const s = pic.shapes[i]; P.path[i] = new Path2D(s[1]); P.clip[i] = s[2] ? new Path2D(s[2]) : null; P.col[i] = s[0]; }
    // bounding boxes: rasterise each shape alone at 1/8
    const c = mk(256, 256), x = c.getContext('2d', { willReadFrequently: true });
    for (let i = 0; i < n; i++) {
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, 256, 256); x.setTransform(1 / 8, 0, 0, 1 / 8, 0, 0); x.fillStyle = '#000';
      x.save(); if (P.clip[i]) x.clip(P.clip[i]); x.fill(P.path[i]); x.restore();
      const d = x.getImageData(0, 0, 256, 256).data; let x0 = 256, y0 = 256, x1 = -1, y1 = -1;
      for (let p = 0; p < 65536; p++) if (d[p * 4 + 3]) { const px = p & 255, py = p >> 8; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
      P.bb[i] = x1 < 0 ? [0, 0, 0, 0] : [Math.max(0, (x0 - 2) * 8), Math.max(0, (y0 - 2) * 8), Math.min(WORLD, (x1 + 3) * 8), Math.min(WORLD, (y1 + 3) * 8)];
    }
    if (pic.lab && pic.lab.length === n) { for (let i = 0; i < n; i++) P.lab[i] = pic.lab[i]; return P; }   // spots precomputed by cbn-packprep
    // number spots: visible-area id map at 512, chamfer distance transform, pole of inaccessibility per shape
    const W = 512, c2 = mk(W, W), g = c2.getContext('2d', { willReadFrequently: true });
    g.setTransform(W / WORLD, 0, 0, W / WORLD, 0, 0);
    for (let i = 0; i < n; i++) { const id = i + 1; g.fillStyle = 'rgb(' + id + ',' + ((id * 37) & 255) + ',' + ((id * 91) & 255) + ')'; g.save(); if (P.clip[i]) g.clip(P.clip[i]); g.fill(P.path[i]); g.restore(); }
    const d = g.getImageData(0, 0, W, W).data, ids = new Int16Array(W * W).fill(-1), dist = new Uint16Array(W * W);
    for (let p = 0; p < W * W; p++) { const r = d[p * 4]; if (d[p * 4 + 3] === 255 && r > 0 && r <= n && d[p * 4 + 1] === ((r * 37) & 255) && d[p * 4 + 2] === ((r * 91) & 255)) ids[p] = r - 1; }
    for (let y = 0; y < W; y++) for (let xx = 0; xx < W; xx++) {
      const p = y * W + xx, id = ids[p];
      dist[p] = (id < 0 || xx === 0 || y === 0 || xx === W - 1 || y === W - 1 || ids[p - 1] !== id || ids[p + 1] !== id || ids[p - W] !== id || ids[p + W] !== id) ? 0 : 30000;
    }
    for (let y = 1; y < W - 1; y++) for (let xx = 1; xx < W - 1; xx++) { const p = y * W + xx; if (!dist[p]) continue; dist[p] = Math.min(dist[p], dist[p - 1] + 3, dist[p - W] + 3, dist[p - W - 1] + 4, dist[p - W + 1] + 4); }
    for (let y = W - 2; y > 0; y--) for (let xx = W - 2; xx > 0; xx--) { const p = y * W + xx; if (!dist[p]) continue; dist[p] = Math.min(dist[p], dist[p + 1] + 3, dist[p + W] + 3, dist[p + W + 1] + 4, dist[p + W - 1] + 4); }
    const best = new Uint16Array(n), bx = new Int16Array(n), by = new Int16Array(n);
    for (let p = 0; p < W * W; p++) { const id = ids[p]; if (id < 0) continue; P.vis[id]++; if (dist[p] > best[id]) { best[id] = dist[p]; bx[id] = p % W; by[id] = (p / W) | 0; } }
    const k = WORLD / W;
    for (let i = 0; i < n; i++) { const dw = best[i] / 3 * k; P.lab[i] = [bx[i] * k + k / 2, by[i] * k + k / 2, dw, Math.min(2 * dw, 240)]; }   // x, y, inradius (world), digit font size (world)
    return P;
  }

  function hit(wx, wy) {
    if (!S) return -1; const P = S.P;
    if (P.grid) { const G = P.grid, gx = Math.floor(wx / G.cs), gy = Math.floor(wy / G.cs); return (gx < 0 || gy < 0 || gx >= G.gw || gy >= G.gh) ? -1 : gy * G.gw + gx; }
    if (P.map) { const x = Math.floor(wx / P.ms), y = Math.floor(wy / P.ms); return (x < 0 || y < 0 || x >= P.mw || y >= P.mh) ? -1 : P.map[y * P.mw + x]; }
    for (let i = P.n - 1; i >= 0; i--) {
      const b = P.bb[i]; if (wx < b[0] || wx > b[2] || wy < b[1] || wy > b[3]) continue;
      if (P.clip[i] && !hx.isPointInPath(P.clip[i], wx, wy)) continue;
      if (hx.isPointInPath(P.path[i], wx, wy)) return i;
    }
    return -1;
  }

  // ---------- painting primitives (ctx already in world space) ----------
  const colorOf = i => S.fc[i] ? S.pal[S.fc[i] - 1] : PAPER;
  function fillShape(c, i) { const P = S.P; if (P.grid) { const G = P.grid, cs = G.cs; c.fillRect((i % G.gw) * cs, ((i / G.gw) | 0) * cs, cs, cs); return; } if (P.clip[i]) { c.save(); c.clip(P.clip[i]); c.fill(P.path[i]); c.restore(); } else c.fill(P.path[i]); }
  function strokeShape(c, i) { const P = S.P; if (P.grid) return; if (P.clip[i]) { c.save(); c.clip(P.clip[i]); c.stroke(P.path[i]); c.restore(); c.stroke(P.clip[i]); } else c.stroke(P.path[i]); }
  const ov = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  function setStroke(c) { c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = LW; c.strokeStyle = OUT; }
  // repaint region i and every shape above it that overlaps it, clipped to region i (painter's order stays right)
  function paintAround(c, i, withStroke) {
    const P = S.P, b = P.bb[i];
    if (P.grid) { c.fillStyle = colorOf(i); fillShape(c, i); return; }
    if (P.disjoint) { c.save(); c.clip(P.path[i]); c.fillStyle = colorOf(i); c.fill(P.path[i]); c.restore(); return; }
    c.save(); if (P.clip[i]) c.clip(P.clip[i]); c.clip(P.path[i]);
    if (withStroke) setStroke(c);
    for (let k = i; k < P.n; k++) { if (k > i && !ov(b, P.bb[k])) continue; c.fillStyle = colorOf(k); fillShape(c, k); if (withStroke) strokeShape(c, k); }
    c.restore();
  }
  // finish look (2048 / completion only): soft glossy highlight from the top-left, a gentle shade toward the lower-right, one tiny glint on roomy regions
  function sheen(c, i) {
    const P = S.P, b = P.bb[i], bw = b[2] - b[0], bh = b[3] - b[1], big = Math.max(bw, bh), hx = b[0] + bw * 0.3, hy = b[1] + bh * 0.26;
    if (big < 12) return;
    let g = c.createRadialGradient(hx, hy, 0, hx, hy, Math.max(60, big * 0.8)); g.addColorStop(0, 'rgba(255,255,255,.62)'); g.addColorStop(0.45, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; fillShape(c, i);
    g = c.createLinearGradient(b[0] + bw * 0.35, b[1] + bh * 0.4, b[2], b[3]); g.addColorStop(0, 'rgba(150,40,130,0)'); g.addColorStop(1, 'rgba(150,40,130,.2)');
    c.fillStyle = g; fillShape(c, i);
    const L = P.lab[i];
    if (L && L[2] >= 70 && !P.grid) {   // glint: a small four-point star near the highlight, kept inside the region's roomiest spot
      const gx = L[0] - L[2] * 0.35, gy = L[1] - L[2] * 0.4, q = Math.min(34, L[2] * 0.3);
      c.save(); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(gx, gy - q); c.quadraticCurveTo(gx, gy, gx + q, gy); c.quadraticCurveTo(gx, gy, gx, gy + q); c.quadraticCurveTo(gx, gy, gx - q, gy); c.quadraticCurveTo(gx, gy, gx, gy - q); c.fill(); c.restore();
    }
  }
  // whole picture, flat, painter's order (thumbnails, finished art, fx). opts: sheen, only (Set of region ids to show filled)
  function drawFlat(c, st, opts) {
    const keep = S; S = st; const P = st.P; opts = opts || {}; setStroke(c);
    if (P.grid) { for (let i = 0; i < P.n; i++) { c.fillStyle = colorOf(i); fillShape(c, i); } const G = P.grid; c.strokeStyle = 'rgba(178,52,111,.5)'; c.lineWidth = GLW(P); c.beginPath(); for (let x = 0; x <= G.gw; x++) { c.moveTo(x * G.cs, 0); c.lineTo(x * G.cs, G.gh * G.cs); } for (let y = 0; y <= G.gh; y++) { c.moveTo(0, y * G.cs); c.lineTo(G.gw * G.cs, y * G.cs); } c.stroke(); S = keep; return; }
    for (let i = 0; i < P.n; i++) {
      c.fillStyle = colorOf(i); fillShape(c, i);
      if (opts.sheen && st.fc[i]) sheen(c, i);
      strokeShape(c, i);
    }
    for (const l of P.line) c.stroke(l);
    S = keep;
  }

  // ---------- tiles ----------
  const tkey = (li, tx, ty) => (li << 20) | (ty << 10) | tx;
  const tileRect = t => { const w = TS * t.lod; return [t.tx * w, t.ty * w, t.tx * w + w, t.ty * w + w]; };
  function tileXf(c, t) { const s = 1 / t.lod; c.setTransform(s, 0, 0, s, -t.tx * TS, -t.ty * TS); }
  function renderTile(t) {
    const P = S.P, r = tileRect(t), f = t.fc.getContext('2d'), s = t.sc.getContext('2d');
    f.setTransform(1, 0, 0, 1, 0, 0); f.fillStyle = PAPER; f.fillRect(0, 0, TS, TS); tileXf(f, t);
    s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, TS, TS); tileXf(s, t); setStroke(s);
    if (P.grid) {
      const G = P.grid, cs = G.cs, x0 = Math.max(0, Math.floor(r[0] / cs)), x1 = Math.min(G.gw - 1, Math.ceil(r[2] / cs) - 1), y0 = Math.max(0, Math.floor(r[1] / cs)), y1 = Math.min(G.gh - 1, Math.ceil(r[3] / cs) - 1);
      for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const i = gy * G.gw + gx; if (S.fc[i]) { f.fillStyle = colorOf(i); f.fillRect(gx * cs, gy * cs, cs, cs); } }
      s.strokeStyle = 'rgba(178,52,111,.55)'; s.lineWidth = GLW(P); s.beginPath();
      for (let gx = x0; gx <= x1 + 1; gx++) { s.moveTo(gx * cs, y0 * cs); s.lineTo(gx * cs, (y1 + 1) * cs); } for (let gy = y0; gy <= y1 + 1; gy++) { s.moveTo(x0 * cs, gy * cs); s.lineTo((x1 + 1) * cs, gy * cs); } s.stroke();
      t.pend.length = 0; return;
    }
    for (let i = 0; i < P.n; i++) {
      if (!ov(P.bb[i], r)) continue;
      f.fillStyle = colorOf(i); fillShape(f, i);
      if (!P.disjoint) { s.globalCompositeOperation = 'destination-out'; fillShape(s, i); s.globalCompositeOperation = 'source-over'; } strokeShape(s, i);
    }
    for (const l of P.line) s.stroke(l);
    t.pend.length = 0;
  }
  function getTile(li, tx, ty, create) {
    const k = tkey(li, tx, ty); let t = tiles.get(k);
    if (!t && create) {
      const t0 = performance.now(); t = { k, li, lod: LODS[li], tx, ty, fc: mk(TS, TS), sc: mk(TS, TS), last: frameNo, pend: [], pin: li === 0 };
      renderTile(t); tiles.set(k, t); stats.builds++; stats.maxBuildMs = Math.max(stats.maxBuildMs, performance.now() - t0);
    }
    return t;
  }
  function dropTile(t) { for (const i of t.pend) decPend(i); pendTiles.delete(t); tiles.delete(t.k); }
  function decPend(i) { const n = (fxPend.get(i) || 0) - 1; if (n <= 0) fxPend.delete(i); else fxPend.set(i, n); }
  function evict() {
    const maxT = Math.floor(QS[q].cap * 1048576 / TB); if (tiles.size <= maxT) return;
    const arr = [...tiles.values()].filter(t => !t.pin && t.last < frameNo - 1).sort((a, b) => a.last - b.last);
    for (const t of arr) { if (tiles.size <= maxT) break; dropTile(t); }
  }
  function viewRect() { const hw = cssW / (2 * cam.z), hh = cssH / (2 * cam.z); return [cam.x - hw, cam.y - hh, cam.x + hw, cam.y + hh]; }
  function tileSpan(lod, v) {
    const w = TS * lod, mx = Math.ceil(WW / w) - 1, my = Math.ceil(WH / w) - 1;
    return [Math.max(0, Math.floor(v[0] / w)), Math.min(mx, Math.floor(v[2] / w)), Math.max(0, Math.floor(v[1] / w)), Math.min(my, Math.floor(v[3] / w))];
  }
  function pickLod() {
    const ppd = 1 / (cam.z * dpr), v = viewRect(); let k = LODS.length - 1;
    for (let i = 0; i < LODS.length; i++) if (LODS[i] <= ppd * 1.25) { k = i; break; }
    while (k > 0 && LODS[k] < QS[q].minLod - 1e-6) k--;
    for (; k > 0; k--) { const s = tileSpan(LODS[k], v); if ((s[1] - s[0] + 1) * (s[3] - s[2] + 1) * TB <= QS[q].cap * 1048576) break; }
    return k;
  }
  function blitTile(t, sx0, sy0, sz, srcX, srcY, srcW, srcH) {
    const x0 = Math.round(sx0), y0 = Math.round(sy0), x1 = Math.round(sx0 + sz), y1 = Math.round(sy0 + sz);
    actx.drawImage(t.fc, srcX, srcY, srcW, srcH, x0, y0, x1 - x0, y1 - y0); actx.drawImage(t.sc, srcX, srcY, srcW, srcH, x0, y0, x1 - x0, y1 - y0);
  }
  const w2sx = x => ((x - cam.x) * cam.z + cssW / 2) * dpr, w2sy = y => ((y - cam.y) * cam.z + cssH / 2) * dpr;
  function markW(b) {   // a fill or a new tile changed this world box: repaint only that part of the art canvas
    const x0 = w2sx(b[0]) - 4, y0 = w2sy(b[1]) - 4, x1 = w2sx(b[2]) + 4, y1 = w2sy(b[3]) + 4;
    if (!dr) dr = [x0, y0, x1, y1]; else { dr[0] = Math.min(dr[0], x0); dr[1] = Math.min(dr[1], y0); dr[2] = Math.max(dr[2], x1); dr[3] = Math.max(dr[3], y1); }
    artDirty = true;
  }
  function drawArt() {
    const part = !artFull && dr; actx.setTransform(1, 0, 0, 1, 0, 0);
    if (part) { actx.save(); actx.beginPath(); const x = Math.floor(dr[0]), y = Math.floor(dr[1]); actx.rect(x, y, Math.ceil(dr[2]) - x, Math.ceil(dr[3]) - y); actx.clip(); }
    actx.fillStyle = PAPER; actx.fillRect(0, 0, art.width, art.height);
    if (!S) { if (part) actx.restore(); artFull = false; dr = null; return; }
    const lod = LODS[curLi], v = viewRect(), sp = tileSpan(lod, v), size = TS * lod * cam.z * dpr; let vis = 0;
    for (let ty = sp[2]; ty <= sp[3]; ty++) for (let tx = sp[0]; tx <= sp[1]; tx++) {
      vis++; const t = tiles.get(tkey(curLi, tx, ty)), wx = tx * TS * lod, wy = ty * TS * lod;
      if (t) { t.last = frameNo; blitTile(t, w2sx(wx), w2sy(wy), size, 0, 0, TS, TS); continue; }
      for (let li = curLi - 1; li >= 0; li--) {   // fall back to a coarser cached tile (always at least LOD 4)
        const L = LODS[li], w = TS * L, ax = Math.floor(wx / w), ay = Math.floor(wy / w), p = tiles.get(tkey(li, ax, ay));
        if (!p) continue; p.last = frameNo; const k = TS * lod / L;
        blitTile(p, w2sx(wx), w2sy(wy), size, (wx - ax * w) / L, (wy - ay * w) / L, k, k); break;
      }
    }
    stats.visible = vis;
    if (S.nums) drawDigits();
    if (part) actx.restore(); artFull = false; dr = null;
  }
  // ---------- digit atlas (built once, no fillText during play) ----------
  const BUCKET = [40, 80, 160], NDIG = 24; let atlas = null;
  function buildAtlas() {
    atlas = BUCKET.map(b => {
      const cw = Math.ceil(b * 1.3), ch = Math.ceil(b * 1.1), c = document.createElement('canvas'); c.width = cw * NDIG; c.height = ch; const g = c.getContext('2d');
      g.font = '900 ' + b + 'px "Baloo 2","Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = b * 0.2;
      for (let n = 1; n <= NDIG; n++) { g.strokeStyle = '#fff'; g.strokeText(String(n), (n - 0.5) * cw, ch / 2 + b * 0.04); g.fillStyle = '#7a1a55'; g.fillText(String(n), (n - 0.5) * cw, ch / 2 + b * 0.04); }
      return { c, cw, ch, b };
    });
  }
  function drawDigits() {
    if (!atlas) buildAtlas(); const P = S.P, v = viewRect(); actx.setTransform(1, 0, 0, 1, 0, 0);
    if (P.grid) {
      const G = P.grid, cs = G.cs, size = cs * 0.72; if (size * cam.z < HIDE_PX) return;
      const x0 = Math.max(0, Math.floor(v[0] / cs)), x1 = Math.min(G.gw - 1, Math.floor(v[2] / cs)), y0 = Math.max(0, Math.floor(v[1] / cs)), y1 = Math.min(G.gh - 1, Math.floor(v[3] / cs));
      const d = size * cam.z * dpr; let a = atlas[atlas.length - 1]; for (const A of atlas) if (A.b >= d) { a = A; break; } const k = d / a.b;
      for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const i = gy * G.gw + gx; if (S.fc[i]) continue; const num = P.col[i] + 1; if (num > NDIG) continue; actx.drawImage(a.c, (num - 1) * a.cw, 0, a.cw, a.ch, w2sx((gx + 0.5) * cs) - a.cw * k / 2, w2sy((gy + 0.5) * cs) - a.ch * k / 2, a.cw * k, a.ch * k); }
      return;
    }
    for (let i = 0; i < P.n; i++) {
      if (S.fc[i]) continue; const L = P.lab[i], size = L[3]; if (size * cam.z < HIDE_PX || L[2] < 20) continue;
      if (L[0] < v[0] - size || L[0] > v[2] + size || L[1] < v[1] - size || L[1] > v[3] + size) continue;
      const num = P.col[i] + 1; if (num > NDIG) continue; const d = size * cam.z * dpr; let a = atlas[atlas.length - 1];
      for (const A of atlas) if (A.b >= d) { a = A; break; }
      const k = d / a.b; actx.drawImage(a.c, (num - 1) * a.cw, 0, a.cw, a.ch, w2sx(L[0]) - a.cw * k / 2, w2sy(L[1]) - a.ch * k / 2, a.cw * k, a.ch * k);
    }
  }

  // ---------- fx overlay ----------
  function buildSprites() {
    sprites = [];
    const mkS = (draw, col) => { const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); g.translate(24, 24); g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 3; draw(g); return c; };
    const star4 = g => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 ? 7 : 21; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); };
    const hrt = g => { g.beginPath(); g.moveTo(0, 16); g.bezierCurveTo(-26, 0, -16, -20, 0, -8); g.bezierCurveTo(16, -20, 26, 0, 0, 16); g.closePath(); g.fill(); g.stroke(); };
    sprites.push(mkS(star4, '#ffd34d'), mkS(star4, '#ff8fcf'), mkS(star4, '#8ff0f4'), mkS(hrt, '#ff5fa2'));
    const hc = document.createElement('canvas'); hc.width = hc.height = 16; const g = hc.getContext('2d'); g.strokeStyle = 'rgba(110,60,140,.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-2, 18); g.lineTo(18, -2); g.moveTo(-2, 10); g.lineTo(10, -2); g.moveTo(6, 18); g.lineTo(18, 6); g.stroke();
    hatch = hc;
  }
  function burst(wx, wy, n, calm) {
    if (!sprites) buildSprites(); n = Math.min(n, QS[q].maxP, calm ? 4 : 99); const sx = w2sx(wx) / dpr, sy = w2sy(wy) / dpr;
    for (let j = 0; j < n; j++) {
      const i = pHead; pHead = (pHead + 1) % NP; if (!pa.on[i]) pLive++; const a = Math.random() * 6.283, sp = 60 + Math.random() * 150;
      pa.on[i] = 1; pa.x[i] = sx; pa.y[i] = sy; pa.vx[i] = Math.cos(a) * sp; pa.vy[i] = Math.sin(a) * sp - 70; pa.l[i] = 0.55 + Math.random() * 0.4; pa.s[i] = 10 + Math.random() * 14; pa.k[i] = (Math.random() * 4) | 0;
    }
    fxDirty = true;
  }
  function stepParticles(dt) {
    for (let i = 0; i < NP; i++) if (pa.on[i]) { pa.l[i] -= dt; if (pa.l[i] <= 0) { pa.on[i] = 0; pLive--; continue; } pa.x[i] += pa.vx[i] * dt; pa.y[i] += pa.vy[i] * dt; pa.vy[i] += 220 * dt; }
  }
  function drawFx(now) {
    fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fx.width, fx.height);
    if (!S) return; if (!sprites) buildSprites();
    const P = S.P, v = viewRect(), T = FXD * cam.z;
    fctx.setTransform(T, 0, 0, T, (cssW / 2 - cam.x * cam.z) * FXD, (cssH / 2 - cam.y * cam.z) * FXD);
    // freshly filled regions (their tiles are still catching up) are painted as vectors so a tap feels instant
    for (const i of fxPend.keys()) if (ov(P.bb[i], v)) paintAround(fctx, i, true);
    // gray hatch on the unfilled spots of the picked number
    if (S.sel > 0 && S.hl) {
      fctx.fillStyle = 'rgba(120,90,150,.26)';
      if (P.grid) { const G = P.grid, cs = G.cs, x0 = Math.max(0, Math.floor(v[0] / cs)), x1 = Math.min(G.gw - 1, Math.floor(v[2] / cs)), y0 = Math.max(0, Math.floor(v[1] / cs)), y1 = Math.min(G.gh - 1, Math.floor(v[3] / cs)); for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const i = gy * G.gw + gx; if (!S.fc[i] && P.col[i] === S.sel - 1) fctx.fillRect(gx * cs, gy * cs, cs, cs); } }
      else for (let i = 0; i < P.n; i++) if (!S.fc[i] && P.col[i] === S.sel - 1 && ov(P.bb[i], v)) fillShape(fctx, i);
    }
    // soft heart glow on the last few spots (and the guided first spot)
    if (glow.size) {
      const a = S.calm ? 0.4 : 0.3 + 0.25 * Math.sin(now / 260);
      for (const i of glow) if (!S.fc[i]) { fctx.fillStyle = 'rgba(255,70,170,' + a.toFixed(3) + ')'; fillShape(fctx, i); }
    }
    fctx.setTransform(FXD, 0, 0, FXD, 0, 0);
    if (glow.size) { const bob = S.calm ? 0 : Math.sin(now / 200) * 3; for (const i of glow) if (!S.fc[i]) { const L = P.lab[i], x = w2sx(L[0]) / dpr, y = w2sy(L[1]) / dpr - Math.max(26, L[3] * cam.z * 0.8) + bob; fctx.drawImage(sprites[3], x - 12, y - 12, 24, 24); } }
    if (ring) {
      const age = (now - ring.t0) / 1000; if (age > 2.2) ring = null; else {
        const x = w2sx(ring.x) / dpr, y = w2sy(ring.y) / dpr; for (let j = 0; j < 2; j++) { const ph = (age * 1.2 + j * 0.5) % 1, r = 20 + ph * 70; fctx.strokeStyle = 'rgba(255,80,170,' + (1 - ph).toFixed(2) + ')'; fctx.lineWidth = 6 * (1 - ph) + 2; fctx.beginPath(); fctx.arc(x, y, r, 0, 6.283); fctx.stroke(); }
      }
    }
    for (let i = 0; i < NP; i++) if (pa.on[i]) { const s = pa.s[i], a = Math.min(1, pa.l[i] * 2.5); fctx.globalAlpha = a; fctx.drawImage(sprites[pa.k[i]], pa.x[i] - s / 2, pa.y[i] - s / 2, s, s); }
    fctx.globalAlpha = 1;
  }

  // ---------- camera ----------
  function clampCam() {
    for (const ax of ['x', 'y']) {
      const view = ax === 'x' ? cssW : cssH, h = view / (2 * cam.z);
      const Wd = ax === 'x' ? WW : WH; cam[ax] = (2 * h >= Wd) ? Wd / 2 : Math.max(h * 0.6, Math.min(Wd - h * 0.6, cam[ax]));
    }
    cam.z = Math.max(fit * 0.8, Math.min(fit * 12, cam.z));
  }
  function moved() { lastCam = performance.now(); artDirty = fxDirty = artFull = true; }
  function layout(w, h, ratio) {
    cssW = Math.max(1, w); cssH = Math.max(1, h); dpr = Math.min(ratio || 1, QS[q].dpr);
    const rel = fit > 0 && cam.z > 0 ? cam.z / fit : 1;
    fit = Math.min(cssW / WW, cssH / WH); cam.z = fit * rel;
    for (const c of [art, fx]) { const k = c === fx ? FXD : dpr; c.width = Math.round(cssW * k); c.height = Math.round(cssH * k); c.style.width = cssW + 'px'; c.style.height = cssH + 'px'; }
    clampCam(); curLi = pickLod(); moved();
  }
  function fitView() { cam.x = WW / 2; cam.y = WH / 2; cam.z = fit; clampCam(); moved(); }
  function panBy(dx, dy) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; flight = null; clampCam(); moved(); }
  function zoomAt(f, sx, sy) {   // sx, sy css px inside the canvas
    const w = s2w(sx, sy), z0 = cam.z; cam.z = Math.max(fit * 0.8, Math.min(fit * 12, z0 * f)); cam.x = w[0] - (sx - cssW / 2) / cam.z; cam.y = w[1] - (sy - cssH / 2) / cam.z; flight = null; clampCam(); moved();
  }
  const s2w = (sx, sy) => [cam.x + (sx - cssW / 2) / cam.z, cam.y + (sy - cssH / 2) / cam.z];
  function flyTo(x, y, z, ms, instant) {
    z = Math.max(fit * 0.8, Math.min(fit * 12, z));
    if (instant || !ms) { cam.x = x; cam.y = y; cam.z = z; flight = null; clampCam(); moved(); return; }
    flight = { x0: cam.x, y0: cam.y, z0: cam.z, x1: x, y1: y, z1: z, t0: performance.now(), ms };
  }
  function stepFlight(now) {
    if (!flight) return false; const f = flight, u = Math.min(1, (now - f.t0) / f.ms), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    cam.x = f.x0 + (f.x1 - f.x0) * e; cam.y = f.y0 + (f.y1 - f.y0) * e; cam.z = Math.exp(Math.log(f.z0) + (Math.log(f.z1) - Math.log(f.z0)) * e); clampCam(); moved(); if (u >= 1) flight = null; return !!flight;
  }

  // ---------- state + per-frame ----------
  function setPuzzle(pic, pal, fc, opts) {
    for (const t of tiles.values()) dropTile(t); tiles.clear(); fxPend.clear(); pendTiles.clear(); glow.clear(); ring = null; pa.on.fill(0); pLive = 0;
    WW = pic.w || WORLD; WH = pic.h || WORLD; if (cssW) fit = Math.min(cssW / WW, cssH / WH);
    const P = prep(pic);
    S = { P, pal: pal || pic.pal, fc: fc || new Uint8Array(P.n), sel: 0, hl: true, nums: true, calm: false };
    Object.assign(S, opts || {});
    fitView(); curLi = pickLod(); for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) getTile(0, tx, ty, true);   // pinned LOD 4 base (2 MB) = always something to show
    artDirty = fxDirty = artFull = true; return S;
  }
  function setFill(i, c) {
    S.fc[i] = c; const b = S.P.bb[i];
    for (const t of tiles.values()) if (ov(b, tileRect(t))) { if (t.pend.indexOf(i) < 0) { t.pend.push(i); fxPend.set(i, (fxPend.get(i) || 0) + 1); } pendTiles.add(t); }
    markW(b); fxDirty = true;
  }
  function rebuildAll() { for (const t of tiles.values()) if (t.li === 0) renderTile(t); else dropTile(t); fxPend.clear(); pendTiles.clear(); artDirty = fxDirty = artFull = true; }
  // returns true while it needs another frame
  function frame(now, dt) {
    frameNo++; let more = false, T0 = performance.now(), budget = (now - lastCam < 120 ? 4 : 9);
    if (stepFlight(now)) more = true;
    if (S) {
      if (now - lastCam >= 120) { const li = pickLod(); if (li !== curLi) { curLi = li; artDirty = artFull = true; } stats.lastLod = LODS[curLi]; }
      // apply pending region paints (<= budget)
      for (const t of pendTiles) {
        if (performance.now() - T0 >= budget) { more = true; break; }
        const f = t.fc.getContext('2d'); tileXf(f, t);
        for (const i of t.pend) { paintAround(f, i, false); decPend(i); stats.applies++; }   // outlines live in the other layer and never change
        for (const i of t.pend) markW(S.P.bb[i]); t.pend.length = 0; pendTiles.delete(t);
      }
      if (pendTiles.size) more = true;
      // build missing tiles for the current view, nearest the centre first
      const lod = LODS[curLi], sp = tileSpan(lod, viewRect()), miss = [];
      for (let ty = sp[2]; ty <= sp[3]; ty++) for (let tx = sp[0]; tx <= sp[1]; tx++) if (!tiles.has(tkey(curLi, tx, ty))) miss.push([tx, ty, Math.abs((tx + 0.5) * TS * lod - cam.x) + Math.abs((ty + 0.5) * TS * lod - cam.y)]);
      miss.sort((a, b) => a[2] - b[2]);
      for (const m of miss) { if (performance.now() - T0 >= budget) break; const nt = getTile(curLi, m[0], m[1], true); markW(tileRect(nt)); }
      if (miss.length) more = true; else if (frameNo % 8 === 0) evict();
      if (now - lastCam < 120) more = true;   // wait for the LOD to settle
    }
    if (stepSweep(now)) more = true;
    if (pLive > 0) { stepParticles(dt); fxDirty = true; more = true; }
    if (ring || glow.size) { fxDirty = true; more = more || !S.calm || !!ring; }
    let tArt = 0, tFx = 0, tt = performance.now();
    if (artDirty) { drawArt(); artDirty = false; tArt = performance.now() - tt; tt = performance.now(); }
    if (fxDirty) { drawFx(now); fxDirty = false; tFx = performance.now() - tt; }
    stats.ms = performance.now() - T0; stats.tot = (stats.tot || 0) + stats.ms; stats.cnt = (stats.cnt || 0) + 1; stats.artMs = (stats.artMs || 0) + tArt; stats.fxMs = (stats.fxMs || 0) + tFx; tileCount = tiles.size;
    return more;
  }

  // ---------- wand sweep trail (pooled schedule of sparkle bursts along a path; no per-frame allocation) ----------
  const NSW = 160, sw = { x: new Float32Array(NSW), y: new Float32Array(NSW), t: new Float32Array(NSW), n: 0, i: 0, t0: 0 };
  function sweep(pts, ms) {   // pts: [[wx, wy], ...] in sweep order; thinned to NSW stops; the bursts fire over `ms`
    const step = Math.max(1, Math.ceil(pts.length / NSW)); sw.n = 0; sw.i = 0; sw.t0 = performance.now();
    for (let k = 0; k < pts.length && sw.n < NSW; k += step) { sw.x[sw.n] = pts[k][0]; sw.y[sw.n] = pts[k][1]; sw.t[sw.n] = 0; sw.n++; }
    for (let k = 0; k < sw.n; k++) sw.t[k] = sw.n > 1 ? ms * k / (sw.n - 1) : 0;
    fxDirty = true;
  }
  function stepSweep(now) {
    if (sw.i >= sw.n) return false;
    while (sw.i < sw.n && now - sw.t0 >= sw.t[sw.i]) { burst(sw.x[sw.i], sw.y[sw.i], S && S.calm ? 1 : 4, S && S.calm); sw.i++; }
    return sw.i < sw.n;
  }
  // ---------- deterministic full render (viewer + 2K export, also runs inside worker.js): no randomness, same inputs = same pixels ----------
  function renderArt(pic, fc, o) {
    o = o || {}; const W = pic.w || WORLD, H = pic.h || WORLD, L = Math.max(16, Math.round(o.long || 2048)), k = L / Math.max(W, H);
    const cw = W >= H ? L : Math.max(1, Math.round(W * k)), ch = H > W ? L : Math.max(1, Math.round(H * k));
    let c = o.into; if (c) { c.width = cw; c.height = ch; } else c = (o.make || mk)(cw, ch);
    const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = PAPER; g.fillRect(0, 0, cw, ch);
    g.setTransform(cw / W, 0, 0, ch / H, 0, 0); const P = o.P || prep(pic);
    drawFlat(g, { P, pal: pic.pal, fc }, { sheen: !!o.sheen });
    g.setTransform(1, 0, 0, 1, 0, 0); if (o.frame && o.frame.a && self.CMArt) self.CMArt.drawFrame(g, cw, ch, o.frame);
    return c;
  }
  function release() {   // drop every cached tile (P5: free the heap before a 2K export); the next setPuzzle rebuilds
    for (const t of tiles.values()) dropTile(t); tiles.clear(); fxPend.clear(); pendTiles.clear(); glow.clear(); ring = null; S = null; pa.on.fill(0); pLive = 0; sw.n = sw.i = 0;
  }
  self.CMR = {
    TS, LODS, QS, PAPER, prep, sweep, renderArt, release, get world() { return [WW, WH]; }, hit, drawFlat, setPuzzle, setFill, rebuildAll, frame, layout, fitView, panBy, zoomAt, s2w, flyTo, cam, burst, stats, glow,
    init(a, f) { art = a; fx = f; actx = a.getContext('2d', { alpha: false }); fctx = f.getContext('2d'); },
    get S() { return S; }, get fit() { return fit; }, get q() { return q; }, get dpr() { return dpr; }, get tiles() { return tileCount; }, get size() { return [cssW, cssH]; },
    setQuality(n) { q = Math.max(0, Math.min(2, n)); if (cssW) { layout(cssW, cssH, window.devicePixelRatio || 1); rebuildAll(); } },
    invalidate() { artDirty = fxDirty = artFull = true; },
    setRing(x, y) { ring = { x, y, t0: performance.now() }; fxDirty = true; },
    pending: () => fxPend.size, camMoving: () => performance.now() - lastCam < 120 || !!flight, particles: () => pLive,
    labelPx: (i, cssMin) => { const L = S.P.lab[i]; return L[3] * cssMin / WORLD; }
  };
})();
