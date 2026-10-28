// Color Magic render engine: puzzle prep (bboxes, number spots), camera, split tile cache (fill layer + outline layer), digit atlas, fx overlay.
// Pack pictures are vector (2048 px world). The art canvas only blits cached tiles; a tap paints one region into the tiles that exist (4 ms/frame budget).
(function () {
  'use strict';
  const TS = 256, TB = TS * TS * 4 * 2, WORLD = 2048;
  const LODS = [4, 2.828, 2, 1.414, 1, 0.707, 0.5, 0.354, 0.25];   // world px per tile px; 0.25 = deep-zoom window (P7)
  const PAPER = '#fff1ee', INK = 'rgba(32, 24, 28, 0.7)', HIDE_PX = 11;
  const QS = [{ dpr: 2, cap: 48, minLod: 0.25, maxP: 150 }, { dpr: 2, cap: 28, minLod: 0.25, maxP: 80 }, { dpr: 1.5, cap: 14, minLod: 1, maxP: 30 }];
  const mk = (w, h) => (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const hx = mk(1, 1).getContext('2d');
  const FXD = 1;   // the fx overlay (hatch, glow, sparkles) is soft by design, so it runs at 1x to save fill rate on big screens
  let WW = WORLD, WH = WORLD, art, fx, nums, actx, fctx, nctx, labSnap, sctx, cssW = 0, cssH = 0, dpr = 1, q = 0, fit = 0.2, S = null, curLi = 4, lastCam = 0, artDirty = true, fxDirty = true, frameNo = 0, tileCount = 0, quiet = 0, warmTo = 0;
  const cam = { x: WORLD / 2, y: WORLD / 2, z: 0.2 };
  const GLW = P => Math.max(2.5, P.grid.cs * 0.05);   // pixel-mode grid line width (world px)
  const tiles = new Map(), fxPend = new Map(), pendTiles = new Set(), glow = new Set();
  let artFull = true, dr = null, flight = null, ring = null, hatch = null, hatchPat = null, hatchPaths = null, sprites = null, lastBuild = 0, strokeZ = -1, touchIds = [];
  let coatEl = null, coat = null, coatOn = false, band = null, proxy = null, proxyLive = false, proxyShown = false, proxyStale = false, gestureAt = 0;
  const stats = { builds: 0, applies: 0, maxBuildMs: 0, lastLod: 0, visible: 0 };
  const labelSort = [];
  let frameDt = 0.016, labelBusy = false, labelForce = false, labelDtAcc = 0, labCam = null, labSnapStale = false;
  const SHOW_PX = 11, HIDE_BELOW = 9, MAX_LABELS = 450, FADE_MS = 120;
  // ---------- particles (pooled, screen space) ----------
  const NP = 150, pa = { x: new Float32Array(NP), y: new Float32Array(NP), vx: new Float32Array(NP), vy: new Float32Array(NP), l: new Float32Array(NP), s: new Float32Array(NP), k: new Uint8Array(NP), on: new Uint8Array(NP) };
  let pHead = 0, pLive = 0;

  // ---------- puzzle prep ----------
  function prepPre(pic) {   // photo puzzles: paths, boxes, spots and the label map are already computed (worker + inflate)
    const pre = pic.pre, n = pic.shapes.length, P = { pic, n, path: [], clip: [], col: new Uint8Array(n), bb: [], lab: [], line: [], vis: new Int32Array(n), W: pic.w, H: pic.h };
    if (pre.mode === 'pixel') {
      const cs = pre.cs, gw = pre.gw; P.grid = { gw, gh: pre.gh, cs }; P.col.set(pre.cells);
      for (let i = 0; i < n; i++) { const x = (i % gw) * cs, y = ((i / gw) | 0) * cs, sz = cs * 0.72; P.bb[i] = [x - 2, y - 2, x + cs + 2, y + cs + 2]; P.lab[i] = [x + cs / 2, y + cs / 2, cs / 2, sz, 11 / sz]; P.clip[i] = null; }
    } else {
      P.path = pre.paths; P.col.set(pre.col); P.bb = pre.bb; P.lab = pre.lab; P.extra = pre.extra || null; P.map = pre.map; P.mw = pre.mw; P.mh = pre.mh; P.ms = pre.s; P.disjoint = true;
      for (let i = 0; i < n; i++) P.clip[i] = null;
    }
    if (P.map) { if (!pre.seamPack) pre.seamPack = seamPaths(P); P.seams = pre.seamPack.seams; P.fillPath = pre.seamPack.fillPath; }   // one shared border, cached on the puzzle
    buildIndex(P); indexPuzzle(P); return P;
  }
  // D 6: a thin sliver that packprep found no spot for (lab [2,2,0,0]) still has to be tapped to finish the picture. Find its visible pixels
  // at full size (painter's order, only the shapes over its box) and put the spot on the one deepest inside; the tap snap does the rest.
  function thinSpot(P, i) {
    const b = P.bb[i], w = Math.max(3, Math.ceil(b[2] - b[0])), h = Math.max(3, Math.ceil(b[3] - b[1])), c = mk(w, h), g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#0f0'; g.fillRect(0, 0, w, h); g.translate(-b[0], -b[1]);
    for (let j = i; j < P.n; j++) { const q = P.bb[j]; if (j > i && (q[0] > b[2] || q[2] < b[0] || q[1] > b[3] || q[3] < b[1])) continue; g.fillStyle = j === i ? '#f00' : '#00f'; g.save(); if (P.clip[j]) g.clip(P.clip[j]); g.fill(P.path[j]); g.restore(); }
    const d = g.getImageData(0, 0, w, h).data, on = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) on[p] = d[p * 4] > d[p * 4 + 1] && d[p * 4] > d[p * 4 + 2] ? 1 : 0;
    let best = 0, bp = -1;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {   // depth = steps to the edge along the 4 axes (enough for a sliver)
      const p = y * w + x; if (!on[p]) continue; let k = 1; while (k < 8 && x - k >= 0 && x + k < w && y - k >= 0 && y + k < h && on[p - k] && on[p + k] && on[p - k * w] && on[p + k * w]) k++;
      if (k > best) { best = k; bp = p; }
    }
    if (bp < 0) return null;
    return [b[0] + bp % w + 0.5, b[1] + ((bp / w) | 0) + 0.5, best, Math.min(2 * best, 240)];
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
    if (pic.lab && pic.lab.length === n) { for (let i = 0; i < n; i++) P.lab[i] = withZr(pic.lab[i][2] > 0 ? pic.lab[i] : thinSpot(P, i) || pic.lab[i]); buildIndex(P); indexPuzzle(P); return P; }   // spots precomputed by cbn-packprep
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
    for (let i = 0; i < n; i++) { const dw = best[i] / 3 * k; P.lab[i] = withZr([bx[i] * k + k / 2, by[i] * k + k / 2, dw, Math.min(2 * dw, 240)]); }   // x, y, inradius (world), digit font size (world), reveal zoom
    for (let i = 0; i < n; i++) if (!best[i]) P.lab[i] = withZr(thinSpot(P, i) || P.lab[i]);   // thinner than one 512 pixel
    buildIndex(P); indexPuzzle(P); return P;
  }
  // Uniform grid, 32 world px. Each cell's spots are sorted by reveal zoom so a frame can stop once the rest are too small.
  function buildIndex(P) {
    const W = (P.pic && P.pic.w) || P.W || WORLD, H = (P.pic && P.pic.h) || P.H || WORLD, CELL = 32;
    const gw = Math.max(1, Math.ceil(W / CELL)), gh = Math.max(1, Math.ceil(H / CELL)), ncell = gw * gh, cap = P.n * 3;
    const x = new Float32Array(cap), y = new Float32Array(cap), ss = new Float32Array(cap), zr = new Float32Array(cap), reg = new Int32Array(cap);
    let ns = 0;
    const push = (L, i) => { if (!L || !(L[3] > 0)) return; x[ns] = L[0]; y[ns] = L[1]; ss[ns] = L[3]; zr[ns] = L[4] > 0 ? L[4] : 11 / L[3]; reg[ns] = i; ns++; };
    for (let i = 0; i < P.n; i++) { push(P.lab[i], i); const xs = P.extra && P.extra[i]; if (xs) for (let k = 0; k < xs.length; k++) push(xs[k], i); }
    const cnt = new Int32Array(ncell), cxOf = new Int16Array(ns), cyOf = new Int16Array(ns);
    for (let s = 0; s < ns; s++) {
      let cx = (x[s] / CELL) | 0, cy = (y[s] / CELL) | 0;
      if (cx < 0) cx = 0; else if (cx >= gw) cx = gw - 1;
      if (cy < 0) cy = 0; else if (cy >= gh) cy = gh - 1;
      cxOf[s] = cx; cyOf[s] = cy; cnt[cy * gw + cx]++;
    }
    const off = new Int32Array(ncell + 1);
    for (let i = 0; i < ncell; i++) off[i + 1] = off[i] + cnt[i];
    const cur = off.slice(0), ids = new Int32Array(ns);
    for (let s = 0; s < ns; s++) { const c = cyOf[s] * gw + cxOf[s]; ids[cur[c]++] = s; }
    for (let c = 0; c < ncell; c++) {
      const a = off[c], b = off[c + 1];
      for (let i = a + 1; i < b; i++) { const v = ids[i]; let j = i; while (j > a && zr[ids[j - 1]] > zr[v]) { ids[j] = ids[j - 1]; j--; } ids[j] = v; }
    }
    P.sp = { CELL, gw, gh, off, ids, x, y, ss, zr, reg, ns, on: new Uint8Array(ns), fade: new Float32Array(ns), onList: new Int32Array(ns), nOn: 0, stamp: new Uint32Array(ns), epoch: 1, cand: new Int32Array(ns) };
  }
  function withZr(L) { if (!L) return L; if (L.length >= 5) return L; const sz = L[3] || 0; return [L[0], L[1], L[2], sz, sz > 0 ? 11 / sz : 99]; }

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

  // Open polyline Douglas-Peucker. eps is in the same units as pts (work px). Endpoints stay put.
  function dpOpen(pts, eps) {
    const n = pts.length >> 1; if (n <= 2 || !(eps > 0)) return pts;
    const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1; const st = [0, n - 1];
    while (st.length) {
      const b = st.pop(), a = st.pop(); if (b - a < 2) continue;
      const ax = pts[a * 2], ay = pts[a * 2 + 1], bx = pts[b * 2], by = pts[b * 2 + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      let md = -1, mi = -1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i * 2] - ax) * dy - (pts[i * 2 + 1] - ay) * dx) / L; if (d > md) { md = d; mi = i; } }
      if (md > eps) { keep[mi] = 1; st.push(a, mi, mi, b); }
    }
    const o = []; for (let i = 0; i < n; i++) if (keep[i]) o.push(pts[i * 2], pts[i * 2 + 1]); return o;
  }
  function chaikinOpen(pts, passes) {
    let cur = pts;
    for (let p = 0; p < passes; p++) {
      const n = cur.length >> 1; if (n < 3) return cur; const o = [cur[0], cur[1]];
      for (let i = 0; i < n - 1; i++) {
        const x0 = cur[i * 2], y0 = cur[i * 2 + 1], x1 = cur[i * 2 + 2], y1 = cur[i * 2 + 3];
        o.push(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1, 0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1);
      }
      o.push(cur[cur.length - 2], cur[cur.length - 1]); cur = o;
    }
    return cur;
  }
  function chaikinClosed(pts, passes) {
    let cur = pts;
    for (let p = 0; p < passes; p++) {
      const n = cur.length >> 1; if (n < 3) return cur; const o = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, x0 = cur[i * 2], y0 = cur[i * 2 + 1], x1 = cur[j * 2], y1 = cur[j * 2 + 1];
        o.push(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1, 0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1);
      }
      cur = o;
    }
    return cur;
  }
  // Shared borders of a label map. Each crack is one chain, smoothed once (DP eps 1.15 work px, then
  // two Chaikin passes). Junctions stay put. Fills use those same chains, so neighbours meet with no paper crack.
  // R5: a generator. It yields about every 8 ms of work so an Extreme open never holds the page for more than a slice (warmSeams drives it);
  // seamPaths() drains it in one go (same result) for any caller that is not async.
  function* seamPathsG(P) {
    const map = P.map, w = P.mw, h = P.mh, s = P.ms; if (!map || !w || !h || !s) return null;
    let last = performance.now();
    // R5: the crack graph lives in typed arrays (a grid vertex has at most 4 cracks). Same edges, same order as the old Map of objects: first-touch vertex order, per-vertex insertion order.
    const VW = w + 1, V = VW * (h + 1), deg = new Uint8Array(V), nbTo = new Int32Array(V * 4), nbL = new Int32Array(V * 4), nbR = new Int32Array(V * 4), used = new Uint8Array(V * 4), order = [];
    const addEdge = (x0, y0, x1, y1, left, right) => {
      const a = y0 * VW + x0, b = y1 * VW + x1; if (a === b) return;
      let d = deg[a]; if (!d) order.push(a); nbTo[a * 4 + d] = b; nbL[a * 4 + d] = left; nbR[a * 4 + d] = right; deg[a] = d + 1;
      d = deg[b]; if (!d) order.push(b); nbTo[b * 4 + d] = a; nbL[b * 4 + d] = right; nbR[b * 4 + d] = left; deg[b] = d + 1;
    };
    const lastRow = h - 1, lastCol = w - 1;
    for (let y = 0; y < h; y++) {
      if ((y & 7) === 7 && performance.now() - last > 8) { yield; last = performance.now(); }
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const r = map[row + x], east = x < lastCol ? map[row + x + 1] : -1, south = y < lastRow ? map[row + w + x] : -1;
        if (east !== r) addEdge(x + 1, y, x + 1, y + 1, east, r);   // walking down: left is east
        if (south !== r) addEdge(x, y + 1, x + 1, y + 1, r, south); // walking right: left is north
      }
    }
    for (let x = 0; x < w; x++) addEdge(x, 0, x + 1, 0, -1, map[x]);
    for (let y = 0; y < h; y++) addEdge(0, y, 0, y + 1, map[y * w], -1);
    const slot = (v, to) => { const o = v * 4; for (let k = 0; k < deg[v]; k++) if (nbTo[o + k] === to) return o + k; return -1; };
    const isUsed = (a, b) => { const k = slot(a, b); return k >= 0 && used[k] === 1; };
    const markUsed = (a, b) => { let k = slot(a, b); if (k >= 0) used[k] = 1; k = slot(b, a); if (k >= 0) used[k] = 1; };
    const chains = [];
    const walk = (start, k0) => {
      const keys = [start]; let prev = start, cur = nbTo[k0], left = nbL[k0], right = nbR[k0], guard = 0;
      markUsed(start, cur);
      while (guard++ < V) {
        keys.push(cur); if (cur === start) return { keys, closed: true, left, right };
        if (deg[cur] !== 2) return { keys, closed: false, left, right };
        const o = cur * 4, k = nbTo[o] === prev ? o + 1 : o;
        if (isUsed(cur, nbTo[k])) return { keys, closed: false, left, right };
        if (nbL[k] !== left || nbR[k] !== right) return { keys, closed: false, left, right };
        markUsed(cur, nbTo[k]); prev = cur; cur = nbTo[k];
      }
      return { keys, closed: false, left, right };
    };
    let oi = 0;
    for (const v of order) { if ((++oi & 255) === 0 && performance.now() - last > 8) { yield; last = performance.now(); } if (deg[v] === 2) continue; for (let j = 0; j < deg[v]; j++) { const k = v * 4 + j; if (used[k] !== 1) chains.push(walk(v, k)); } }
    for (const v of order) { if ((++oi & 255) === 0 && performance.now() - last > 8) { yield; last = performance.now(); } for (let j = 0; j < deg[v]; j++) { const k = v * 4 + j; if (used[k] !== 1) chains.push(walk(v, k)); } }
    const seams = [], pieces = Array.from({ length: P.n }, () => []);
    for (const ch of chains) {
      if (performance.now() - last > 8) { yield; last = performance.now(); }
      let keys = ch.keys; if (ch.closed && keys.length > 1 && keys[0] === keys[keys.length - 1]) keys = keys.slice(0, -1);
      if (keys.length < 2) continue;
      let pts = []; for (const k of keys) pts.push(k % VW, (k / VW) | 0);
      if (ch.closed) {
        // Open DP from a point back to itself is a zero-length line and would delete the ring.
        const m = pts.length >> 1;
        if (m >= 4) {
          let md = -1, mi = 1, ax = pts[0], ay = pts[1];
          for (let i = 1; i < m; i++) { const d = Math.hypot(pts[i * 2] - ax, pts[i * 2 + 1] - ay); if (d > md) { md = d; mi = i; } }
          const da = dpOpen(pts.slice(0, (mi + 1) * 2), 1.15);
          const db = dpOpen(pts.slice(mi * 2).concat([pts[0], pts[1]]), 1.15);
          pts = da.concat(db.slice(2, -2));
        }
        if ((pts.length >> 1) >= 3) pts = chaikinClosed(pts, 2);
      } else { pts = dpOpen(pts, 1.15); pts = chaikinOpen(pts, 2); }
      const n = pts.length >> 1; if (n < 2) continue;
      const p = new Path2D(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < n; i++) {
        const x = pts[i * 2] * s, y = pts[i * 2 + 1] * s;
        if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
        if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
      }
      if (ch.closed) p.closePath();
      seams.push({ p, bb: [x0, y0, x1, y1] });
      if (ch.left >= 0 && ch.left < P.n) pieces[ch.left].push({ pts, rev: false, closed: ch.closed });
      if (ch.right >= 0 && ch.right < P.n) pieces[ch.right].push({ pts, rev: true, closed: ch.closed });
    }
    const fillPath = new Array(P.n);
    const revPts = pts => { const o = [], n = pts.length >> 1; for (let i = n - 1; i >= 0; i--) o.push(pts[i * 2], pts[i * 2 + 1]); return o; };
    const ky = (x, y) => x + ',' + y;
    for (let i = 0; i < P.n; i++) {
      if (performance.now() - last > 8) { yield; last = performance.now(); }
      const list = pieces[i]; if (!list.length) continue;
      const open = [], loops = [];
      for (const part of list) { const pts = part.rev ? revPts(part.pts) : part.pts; if (part.closed) loops.push(pts); else open.push({ pts, used: false }); }
      const starts = new Map();
      for (const it of open) { const k = ky(it.pts[0], it.pts[1]); let a = starts.get(k); if (!a) starts.set(k, a = []); a.push(it); }
      let bad = false;
      for (const it of open) {
        if (it.used) continue; it.used = true; const pts = it.pts.slice(); let guard = 0;
        while (guard++ < open.length + 2) {
          const n = pts.length; if (n >= 4 && pts[0] === pts[n - 2] && pts[1] === pts[n - 1]) { pts.pop(); pts.pop(); break; }
          const cand = (starts.get(ky(pts[n - 2], pts[n - 1])) || []).find(c => !c.used);
          if (!cand) { bad = true; break; }
          cand.used = true; for (let k = 2; k < cand.pts.length; k++) pts.push(cand.pts[k]);
        }
        if ((pts.length >> 1) >= 3) loops.push(pts); else bad = true;
      }
      if (bad || !loops.length) continue;
      const p = new Path2D();
      for (const loop of loops) {
        const n = loop.length >> 1; if (n < 3) continue;
        for (let k = 0; k < n; k++) { const x = loop[k * 2] * s, y = loop[k * 2 + 1] * s; if (k === 0) p.moveTo(x, y); else p.lineTo(x, y); }
        p.closePath();
      }
      fillPath[i] = p;
    }
    return { seams, fillPath };
  }
  function seamPaths(P) { const it = seamPathsG(P); for (;;) { const r = it.next(); if (r.done) return r.value; } }
  const nextTick = (() => { if (typeof MessageChannel === 'undefined') return () => new Promise(r => setTimeout(r, 0)); const ch = new MessageChannel(), q = []; ch.port1.onmessage = () => { const f = q.shift(); if (f) f(); }; return () => new Promise(r => { q.push(r); ch.port2.postMessage(0); }); })();
  // Build the shared borders of a mosaic puzzle in slices before prep() needs them (prep then finds them cached on the puzzle).
  async function warmSeams(pic) {
    const pre = pic && pic.pre; if (!pre || !pre.map || pre.mode === 'pixel' || pre.seamPack) return;
    const it = seamPathsG({ n: pic.shapes.length, map: pre.map, mw: pre.mw, mh: pre.mh, ms: pre.s });
    for (;;) { const r = it.next(); if (r.done) { if (r.value && !pre.seamPack) pre.seamPack = r.value; return; } await nextTick(); }
  }

  // ---------- painting primitives (ctx already in world space) ----------
  const colorOf = i => (!S.fc[i] || (S.wantReveal && !S.reveal)) ? PAPER : S.pal[S.fc[i] - 1];
  const shapePath = i => { const P = S.P; return (P.fillPath && P.fillPath[i]) || P.path[i]; };
  function fillShape(c, i) { const P = S.P; if (P.grid) { const G = P.grid, cs = G.cs; c.fillRect((i % G.gw) * cs, ((i / G.gw) | 0) * cs, cs, cs); return; } const path = shapePath(i); if (P.clip[i]) { c.save(); c.clip(P.clip[i]); c.fill(path); c.restore(); } else c.fill(path); }
  function strokeShape(c, i) { const P = S.P; if (P.grid || P.seams) return; if (P.clip[i]) { c.save(); c.clip(P.clip[i]); c.stroke(P.path[i]); c.restore(); c.stroke(P.clip[i]); } else c.stroke(P.path[i]); }
  const ov = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  // Uniform grid of bbox ids. renderTile, the seam stroke and a repaint only walk cells the tile covers.
  function buildBoxIndex(n, boxOf, W, H, cell) {
    const CELL = cell, gw = Math.max(1, Math.ceil(W / CELL)), gh = Math.max(1, Math.ceil(H / CELL)), ncell = gw * gh;
    const cnt = new Int32Array(ncell), span = new Int32Array(n * 4);
    const live = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const b = boxOf(i); if (!b || !(b[2] > b[0]) || !(b[3] > b[1])) continue;
      let x0 = Math.floor(b[0] / CELL), y0 = Math.floor(b[1] / CELL), x1 = Math.floor((b[2] - 1e-4) / CELL), y1 = Math.floor((b[3] - 1e-4) / CELL);
      if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0;
      if (x1 >= gw) x1 = gw - 1; if (y1 >= gh) y1 = gh - 1;
      if (x1 < x0 || y1 < y0) continue;
      const o = i * 4; span[o] = x0; span[o + 1] = y0; span[o + 2] = x1; span[o + 3] = y1; live[i] = 1;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cnt[y * gw + x]++;
    }
    const off = new Int32Array(ncell + 1);
    for (let i = 0; i < ncell; i++) off[i + 1] = off[i] + cnt[i];
    const ids = new Int32Array(Math.max(1, off[ncell])), cur = new Int32Array(off);
    for (let i = 0; i < n; i++) if (live[i]) {
      const o = i * 4, x0 = span[o], y0 = span[o + 1], x1 = span[o + 2], y1 = span[o + 3];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ids[cur[y * gw + x]++] = i;
    }
    return { CELL, gw, gh, off, ids, stamp: new Uint32Array(Math.max(1, n)), epoch: 1, out: new Int32Array(Math.max(1, n)) };
  }
  function queryBox(ix, rect, pad, boxOf) {
    let x0 = Math.floor((rect[0] - pad) / ix.CELL), y0 = Math.floor((rect[1] - pad) / ix.CELL);
    let x1 = Math.floor((rect[2] + pad) / ix.CELL), y1 = Math.floor((rect[3] + pad) / ix.CELL);
    if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0;
    if (x1 >= ix.gw) x1 = ix.gw - 1; if (y1 >= ix.gh) y1 = ix.gh - 1;
    if (x1 < x0 || y1 < y0) return 0;
    const epoch = (ix.epoch = (ix.epoch + 1) >>> 0) || (ix.epoch = 1);
    let n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = y * ix.gw + x, a = ix.off[c], b = ix.off[c + 1];
      for (let k = a; k < b; k++) {
        const i = ix.ids[k]; if (ix.stamp[i] === epoch) continue; ix.stamp[i] = epoch;
        const q = boxOf(i);
        if (!q || q[2] < rect[0] - pad || q[0] > rect[2] + pad || q[3] < rect[1] - pad || q[1] > rect[3] + pad) continue;
        ix.out[n++] = i;
      }
    }
    return n;
  }
  function eachBox(ix, rect, pad, boxOf, fn) {
    const n = queryBox(ix, rect, pad, boxOf);
    for (let k = 0; k < n; k++) fn(ix.out[k]);
  }
  function indexPuzzle(P) {
    const W = (P.pic && P.pic.w) || P.W || WORLD, H = (P.pic && P.pic.h) || P.H || WORLD;
    if (P.bb && P.bb.length) P.ri = buildBoxIndex(P.n, i => P.bb[i], W, H, 64);
    if (P.seams && P.seams.length) P.si = buildBoxIndex(P.seams.length, i => P.seams[i].bb, W, H, 64);
  }
  // Kid/Detailed stay a 2 device-px hairline. Expert is 4 world px, Extreme 3, and neither goes under 1 device px.
  function strokeScale(c, lod) {
    if (lod) return Math.max(cam.z || fit || 0.2, 1e-4) * Math.max(dpr || 1, 1);
    if (c && c.getTransform) { const t = c.getTransform(); return Math.hypot(t.a, t.b) || 1; }
    return 1;
  }
  function lineWorld(scale) {
    const t = S && (S.tier | 0);
    if (t === 4) return Math.max(3, 1 / scale);
    if (t === 3) return Math.max(4, 1 / scale);
    return Math.max(1, 2) / scale;
  }
  function worldLW() { return lineWorld(strokeScale(null, true)); }
  function setStroke(c, lod) {
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = INK;
    c.lineWidth = lineWorld(strokeScale(c, lod));
  }
  function strokeSeams(c, rect) {
    const seams = S.P.seams; if (!seams) return;
    const pad = (c.lineWidth || 1) + 2;
    if (rect && S.P.si) { eachBox(S.P.si, rect, pad, i => seams[i].bb, i => c.stroke(seams[i].p)); return; }
    for (const g of seams) {
      if (rect) { const b = g.bb; if (b[2] < rect[0] - pad || b[0] > rect[2] + pad || b[3] < rect[1] - pad || b[1] > rect[3] + pad) continue; }
      c.stroke(g.p);
    }
  }
  let paintTile = null;
  // One photo slice per tile (OffscreenCanvas). A fill clips that slice instead of resampling the whole picture.
  function tilePhoto(t) {
    const rev = S && S.reveal; if (!rev || !t) return null;
    if (t.photo && t.photoRev === rev) return t.photo;
    const r = tileRect(t), c = mk(TS, TS), g = c.getContext('2d');
    const rw = rev.width, rh = rev.height, w = Math.max(1, r[2] - r[0]), h = Math.max(1, r[3] - r[1]);
    const crisp = (S.tier | 0) >= 3; g.imageSmoothingEnabled = !crisp; if (!crisp) g.imageSmoothingQuality = 'high';
    g.drawImage(rev, r[0] / WW * rw, r[1] / WH * rh, Math.max(1, w / WW * rw), Math.max(1, h / WH * rh), 0, 0, TS, TS);
    t.photo = c; t.photoRev = rev; return c;
  }
  function paintRevealRegion(c, i) {
    const P = S.P, b = P.bb[i], bw = Math.max(1, b[2] - b[0]), bh = Math.max(1, b[3] - b[1]);
    c.save();
    if (P.grid) { const G = P.grid, cs = G.cs; c.beginPath(); c.rect((i % G.gw) * cs, ((i / G.gw) | 0) * cs, cs, cs); c.clip(); }
    else { if (P.clip[i]) c.clip(P.clip[i]); c.clip(shapePath(i)); }
    if (paintTile) {
      const photo = tilePhoto(paintTile);
      c.imageSmoothingEnabled = false; c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(photo, 0, 0);
    } else {
      const crisp = (S.tier | 0) >= 3; c.imageSmoothingEnabled = !crisp; if (!crisp) c.imageSmoothingQuality = 'high';
      const rw = S.reveal.width, rh = S.reveal.height;
      c.drawImage(S.reveal, b[0] / WW * rw, b[1] / WH * rh, bw / WW * rw, bh / WH * rh, b[0], b[1], bw, bh);
    }
    c.restore();
  }
  // repaint region i and every shape above it that overlaps it, clipped to region i (painter's order stays right)
  function paintAround(c, i, withStroke) {
    const P = S.P, b = P.bb[i];
    if (P.grid) { c.fillStyle = colorOf(i); fillShape(c, i); return; }
    if (P.disjoint) {
      if (S.reveal && S.fc[i]) paintRevealRegion(c, i); else { const path = shapePath(i); c.save(); c.clip(path); c.fillStyle = colorOf(i); c.fill(path); c.restore(); }
      if (withStroke) { setStroke(c); strokeShape(c, i); }
      return;
    }
    c.save(); if (P.clip[i]) c.clip(P.clip[i]); c.clip(shapePath(i));
    if (withStroke) setStroke(c);
    const paintK = k => {
      if (S.reveal && S.fc[k]) paintRevealRegion(c, k); else { c.fillStyle = colorOf(k); fillShape(c, k); }
      if (withStroke) strokeShape(c, k);
    };
    if (P.ri) {
      const n = queryBox(P.ri, b, 0, j => P.bb[j]);
      let m = 0;
      for (let t = 0; t < n; t++) { const k = P.ri.out[t]; if (k >= i) touchIds[m++] = k; }
      touchIds.length = m; touchIds.sort((a, d) => a - d); // painter's order; the index is unordered
      if (!m) paintK(i); else for (let t = 0; t < m; t++) paintK(touchIds[t]);
    } else for (let k = i; k < P.n; k++) { if (k > i && !ov(b, P.bb[k])) continue; paintK(k); }
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
    if (P.grid) { for (let i = 0; i < P.n; i++) { c.fillStyle = colorOf(i); fillShape(c, i); } const G = P.grid; c.strokeStyle = INK; c.lineWidth = GLW(P); c.beginPath(); for (let x = 0; x <= G.gw; x++) { c.moveTo(x * G.cs, 0); c.lineTo(x * G.cs, G.gh * G.cs); } for (let y = 0; y <= G.gh; y++) { c.moveTo(0, y * G.cs); c.lineTo(G.gw * G.cs, y * G.cs); } c.stroke(); S = keep; return; }
    const i0 = opts.from > 0 ? opts.from : 0, i1 = opts.to >= 0 && opts.to < P.n ? opts.to : P.n;   // from/to: a slice, so the finished art can be painted a little per frame (v9 QA P2)
    for (let i = i0; i < i1; i++) {
      if (st.reveal && st.fc[i]) paintRevealRegion(c, i); else { c.fillStyle = colorOf(i); fillShape(c, i); }
      if (opts.sheen && st.fc[i] && !st.reveal) sheen(c, i);
      strokeShape(c, i);
    }
    if (i1 >= P.n) { if (P.seams) strokeSeams(c); for (const l of P.line) c.stroke(l); }
    S = keep;
  }
  // v9 QA P2: the whole picture from the pinned base tiles (LOD 4, already painted during play) into c at px x py: a quick
  // stand-in for the finished art while the sharp one is painted in short steps. Pending fills on those tiles are applied first.
  function drawBase(c, px, py) {
    if (!S) return false; const sp = tileSpan(LODS[0], [0, 0, WW, WH]);
    c.setTransform(px / WW, 0, 0, py / WH, 0, 0);
    for (let ty = sp[2]; ty <= sp[3]; ty++) for (let tx = sp[0]; tx <= sp[1]; tx++) {
      const t = getTile(0, tx, ty, true);
      if (t.pend.length) { const f = t.fc.getContext('2d'); tileXf(f, t); paintTile = t; for (const i of t.pend) { paintAround(f, i, false); decPend(i); } paintTile = null; for (const i of t.pend) markW(S.P.bb[i]); t.pend.length = 0; pendTiles.delete(t); }
      const w = TS * t.lod; c.drawImage(t.fc, tx * w, ty * w, w, w); c.drawImage(t.sc, tx * w, ty * w, w, w);
    }
    c.setTransform(1, 0, 0, 1, 0, 0); return true;
  }

  // ---------- tiles ----------
  const tkey = (li, tx, ty) => (li << 20) | (ty << 10) | tx;
  const tileRect = t => { const w = TS * t.lod; return [t.tx * w, t.ty * w, t.tx * w + w, t.ty * w + w]; };
  function tileXf(c, t) { const s = 1 / t.lod; c.setTransform(s, 0, 0, s, -t.tx * TS, -t.ty * TS); }
  let scratch = null;
  function compositeReveal(f, t, r) {
    if (!scratch) scratch = mk(TS, TS);
    const g = scratch.getContext('2d'), P = S.P;
    g.globalCompositeOperation = 'source-over'; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, TS, TS);
    tileXf(g, t); g.fillStyle = '#fff';
    let any = false;
    const maskOne = i => { if (!S.fc[i]) return; fillShape(g, i); any = true; };
    if (P.ri) eachBox(P.ri, r, 0, i => P.bb[i], maskOne);
    else for (let i = 0; i < P.n; i++) { if (!ov(P.bb[i], r)) continue; maskOne(i); }
    if (any) {
      // One mask of the filled union, then the tile's cached photo. destination-in on each shape intersected them away.
      const photo = tilePhoto(t);
      g.globalCompositeOperation = 'source-in'; g.imageSmoothingEnabled = false;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(photo, 0, 0);
      g.globalCompositeOperation = 'source-over';
    }
    f.setTransform(1, 0, 0, 1, 0, 0); f.drawImage(scratch, 0, 0); tileXf(f, t);
  }
  function restroke(t) {
    const P = S.P, r = tileRect(t), s = t.sc.getContext('2d');
    s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, TS, TS); tileXf(s, t);
    if (P.grid) {
      const G = P.grid, cs = G.cs, x0 = Math.max(0, Math.floor(r[0] / cs)), x1 = Math.min(G.gw - 1, Math.ceil(r[2] / cs) - 1), y0 = Math.max(0, Math.floor(r[1] / cs)), y1 = Math.min(G.gh - 1, Math.ceil(r[3] / cs) - 1);
      s.strokeStyle = INK; s.lineWidth = GLW(P); s.beginPath();
      for (let gx = x0; gx <= x1 + 1; gx++) { s.moveTo(gx * cs, y0 * cs); s.lineTo(gx * cs, (y1 + 1) * cs); } for (let gy = y0; gy <= y1 + 1; gy++) { s.moveTo(x0 * cs, gy * cs); s.lineTo((x1 + 1) * cs, gy * cs); } s.stroke();
      t.lw = s.lineWidth; return;
    }
    setStroke(s, t.lod); t.lw = s.lineWidth;
    if (P.seams) { strokeSeams(s, r); return; }
    const strokeOne = i => {
      if (!P.disjoint) { s.globalCompositeOperation = 'destination-out'; fillShape(s, i); s.globalCompositeOperation = 'source-over'; }
      strokeShape(s, i);
    };
    if (P.ri) eachBox(P.ri, r, 0, i => P.bb[i], strokeOne);
    else for (let i = 0; i < P.n; i++) { if (!ov(P.bb[i], r)) continue; strokeOne(i); }
    for (const l of P.line) s.stroke(l);
  }
  function renderTile(t) {
    const P = S.P, r = tileRect(t), f = t.fc.getContext('2d');
    f.setTransform(1, 0, 0, 1, 0, 0); f.fillStyle = PAPER; f.fillRect(0, 0, TS, TS); tileXf(f, t);
    if (P.grid) {
      const G = P.grid, cs = G.cs, x0 = Math.max(0, Math.floor(r[0] / cs)), x1 = Math.min(G.gw - 1, Math.ceil(r[2] / cs) - 1), y0 = Math.max(0, Math.floor(r[1] / cs)), y1 = Math.min(G.gh - 1, Math.ceil(r[3] / cs) - 1);
      for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const i = gy * G.gw + gx; if (S.fc[i]) { f.fillStyle = colorOf(i); f.fillRect(gx * cs, gy * cs, cs, cs); } }
    } else if (S.reveal) compositeReveal(f, t, r);
    else if (P.ri) eachBox(P.ri, r, 0, i => P.bb[i], i => { f.fillStyle = colorOf(i); fillShape(f, i); });
    else for (let i = 0; i < P.n; i++) { if (!ov(P.bb[i], r)) continue; f.fillStyle = colorOf(i); fillShape(f, i); }
    restroke(t);
    t.pend.length = 0;
  }
  // canvas 2D only records draws; the real painting waits for the first drawImage of the tile. Do it now, so the frame budget sees
  // its cost (CC 8: up to ~10 new Super sharp tiles were painted inside one drawArt = a 250 ms task at 4x throttle on a phone).
  let flc = null;
  function settle(t) { if (!flc) flc = mk(1, 1).getContext('2d'); flc.clearRect(0, 0, 1, 1); flc.drawImage(t.fc, 0, 0, 1, 1); flc.drawImage(t.sc, 0, 0, 1, 1); }
  function getTile(li, tx, ty, create) {
    const k = tkey(li, tx, ty); let t = tiles.get(k);
    if (!t && create) {
      const t0 = performance.now(); t = { k, li, lod: LODS[li], tx, ty, fc: mk(TS, TS), sc: mk(TS, TS), last: frameNo, pend: [], pin: li === 0 };
      renderTile(t); settle(t); tiles.set(k, t); stats.builds++; stats.maxBuildMs = Math.max(stats.maxBuildMs, performance.now() - t0);
    }
    return t;
  }
  function dropTile(t) { for (const i of t.pend) decPend(i); pendTiles.delete(t); tiles.delete(t.k); }
  function decPend(i) { const n = (fxPend.get(i) || 0) - 1; if (n <= 0) fxPend.delete(i); else fxPend.set(i, n); }
  function evict() {
    const maxT = Math.floor(QS[q].cap * 1048576 / TB); if (tiles.size <= maxT) return;
    // never drop a tile of the current view: `last` is only stamped when the art is redrawn, and a still picture can go many frames without that
    const sp = tileSpan(LODS[curLi], viewRect()), inView = t => t.li === curLi && t.tx >= sp[0] && t.tx <= sp[1] && t.ty >= sp[2] && t.ty <= sp[3];
    const arr = [...tiles.values()].filter(t => !t.pin && t.last < frameNo - 1 && !inView(t)).sort((a, b) => a.last - b.last);
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
  function deepZoom() { return !!(S && !S.P.grid && fit > 0 && cam.z >= fit * 16 - 1e-4); }
  function drawVector() {
    const P = S.P, v = viewRect(), pad = 16, rect = [v[0] - pad, v[1] - pad, v[2] + pad, v[3] + pad], z = cam.z * dpr;
    actx.setTransform(z, 0, 0, z, (cssW / 2 - cam.x * cam.z) * dpr, (cssH / 2 - cam.y * cam.z) * dpr);
    const paint = i => { if (S.reveal && S.fc[i]) paintRevealRegion(actx, i); else { actx.fillStyle = colorOf(i); fillShape(actx, i); } };
    if (P.ri) eachBox(P.ri, rect, 0, i => P.bb[i], paint); else for (let i = 0; i < P.n; i++) if (ov(P.bb[i], rect)) paint(i);
    setStroke(actx, true);
    if (P.seams) strokeSeams(actx, rect);
    else if (P.ri) eachBox(P.ri, rect, pad, i => P.bb[i], i => strokeShape(actx, i));
    else for (let i = 0; i < P.n; i++) if (ov(P.bb[i], rect)) strokeShape(actx, i);
    for (const l of P.line) actx.stroke(l);
    stats.vector = (stats.vector || 0) + 1;
  }
  function drawArt() {
    const part = !artFull && dr, banding = !!(band && artFull && band.n > 1);
    actx.setTransform(1, 0, 0, 1, 0, 0);
    if (banding) { const y0 = (band.h * band.i / band.n) | 0, y1 = (band.h * (band.i + 1) / band.n) | 0; actx.save(); actx.beginPath(); actx.rect(0, y0, art.width, Math.max(1, y1 - y0)); actx.clip(); }
    else if (part) { actx.save(); actx.beginPath(); const x = Math.floor(dr[0]), y = Math.floor(dr[1]); actx.rect(x, y, Math.ceil(dr[2]) - x, Math.ceil(dr[3]) - y); actx.clip(); }
    actx.fillStyle = PAPER; actx.fillRect(0, 0, art.width, art.height);
    if (!S) { if (part || banding) actx.restore(); if (!banding || band.i + 1 >= band.n) { artFull = false; dr = null; } return; }
    if (deepZoom()) { drawVector(); if (part || banding) actx.restore(); if (!banding || band.i + 1 >= band.n) { artFull = false; dr = null; } return; }
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
    if (part || banding) actx.restore();
    if (!banding || band.i + 1 >= band.n) { artFull = false; dr = null; }
  }
  // A coarser stand-in is a rectangle of the parent photo. The loop must not stop on that picture.
  function viewMissing() {
    if (!S || deepZoom()) return false;
    const sp = tileSpan(LODS[curLi], viewRect());
    for (let ty = sp[2]; ty <= sp[3]; ty++) for (let tx = sp[0]; tx <= sp[1]; tx++) if (!tiles.has(tkey(curLi, tx, ty))) return true;
    return false;
  }
  function peekOn() {
    if (typeof document === 'undefined' || !document.getElementById) return false;
    const p = document.getElementById('peekCv'); return !!(p && !p.hidden);
  }
  function ensureCoat() {
    if (coatEl || !art || !art.style || !art.parentElement || art.parentElement.id !== 'wrap') return;
    const host = art.parentElement;
    coatEl = document.createElement('div');
    coatEl.id = 'view';
    coatEl.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
    host.insertBefore(coatEl, art);
    coatEl.appendChild(art);
    if (nums && nums.parentElement === host) coatEl.appendChild(nums);
    if (fx && fx.parentElement === host) coatEl.appendChild(fx);
  }
  function coatOk() {
    // While a finger is down the baked picture moves in CSS, even across a big zoom.
    // A canvas repaint at this size is a long task; it waits until the gesture ends or the layout changes.
    return !!(coat && coat.w === cssW && coat.h === cssH && coat.dpr === dpr);
  }
  function takeProxy() {
    if (!art || !coatEl) return;
    if (!proxy) {
      proxy = document.createElement('canvas');
      proxy.id = 'proxy';
      proxy.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;will-change:transform;';
      coatEl.appendChild(proxy);
    }
    const w = Math.max(1, art.width >> 2), h = Math.max(1, art.height >> 2);
    if (proxy.width !== w || proxy.height !== h) { proxy.width = w; proxy.height = h; }
    proxy.style.width = cssW + 'px'; proxy.style.height = cssH + 'px';
    if (!proxyShown) proxy.style.visibility = 'hidden';
    const g = proxy.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(art, 0, 0, w, h);
    if (nums && nums.width) g.drawImage(nums, 0, 0, w, h);
    coat = { x: cam.x, y: cam.y, z: cam.z, w: cssW, h: cssH, dpr };
    proxyLive = true; proxyStale = false;
  }
  function showProxy() {
    if (!proxyLive) takeProxy();
    if (!proxy) return;
    proxy.style.visibility = 'visible';
    if (art) art.style.visibility = 'hidden';
    if (nums) nums.style.visibility = 'hidden';
    if (fx) fx.style.visibility = 'hidden';
    proxyShown = true;
  }
  function dropProxy() {
    proxyShown = false;
    if (proxy) proxy.style.visibility = 'hidden';
    if (art) art.style.visibility = '';
    if (nums) nums.style.visibility = '';
    if (fx) fx.style.visibility = '';
    coatOn = false;
  }
  function coatNow() {
    if (!proxy || !coat) return;
    const scale = cam.z / coat.z;
    const tx = cssW / 2 * (1 - scale) + (coat.x - cam.x) * cam.z;
    const ty = cssH / 2 * (1 - scale) + (coat.y - cam.y) * cam.z;
    proxy.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0) scale(' + scale.toFixed(5) + ')';
    coatOn = true;
  }
  function coatClear() { if (proxy) proxy.style.transform = ''; coatOn = false; dropProxy(); }
  function rememberCoat() { proxyStale = true; }
  function beginBake() {
    const n = art && art.height > 1400 ? 8 : art && art.height > 900 ? 6 : 3;
    band = { i: 0, n, h: art ? art.height : 1 };
  }
  // ---------- digit atlas (built once, no fillText during play) ----------
  const BUCKET = [40, 80, 160], NDIG = 64, ACOLS = 32; let atlas = null;
  let atlasPart = [];
  function buildAtlas() {   // one size per call; `atlas` is set once all sizes exist (CC 8: the three at once = 30+ ms of text at 4x)
    atlasPart.push([BUCKET[atlasPart.length]].map(b => {
      const cw = Math.ceil(b * 1.8), ch = Math.ceil(b * 1.1), rows = Math.ceil(NDIG / ACOLS);   // 64 across one row exceeds the canvas width cap
      const c = document.createElement('canvas'); c.width = cw * ACOLS; c.height = ch * rows; const g = c.getContext('2d');
      g.font = '900 ' + b + 'px "Baloo 2","Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = b * 0.2;
      for (let n = 1; n <= NDIG; n++) { const col = (n - 1) % ACOLS, row = ((n - 1) / ACOLS) | 0; g.strokeStyle = '#fff'; g.strokeText(String(n), (col + 0.5) * cw, row * ch + ch / 2 + b * 0.04); g.fillStyle = '#7a1a55'; g.fillText(String(n), (col + 0.5) * cw, row * ch + ch / 2 + b * 0.04); }
      return { c, cw, ch, b };
    })[0]);
    if (!flc) flc = mk(1, 1).getContext('2d'); flc.clearRect(0, 0, 1, 1); flc.drawImage(atlasPart[atlasPart.length - 1].c, 0, 0, 1, 1);   // paint the text now, not in the picture frame
    if (atlasPart.length === BUCKET.length) { atlas = atlasPart; labelForce = true; stats.atlas = { n: NDIG, cols: ACOLS, sizes: atlas.map(a => [a.c.width, a.c.height, a.cw, a.ch, a.b]) }; }
  }
  function drawDigits() {
    labelBusy = false;
    const elapsed = labelDtAcc > 0 ? labelDtAcc : 0.016; labelDtAcc = 0;
    if (!atlas || !nctx || !nums.width) { stats.labelN = 0; stats.labelSeen = 0; return; }
    nctx.setTransform(1, 0, 0, 1, 0, 0); nctx.clearRect(0, 0, nums.width, nums.height);
    const P = S.P; if (!P.sp) buildIndex(P);
    const sp = P.sp, z = cam.z, v = viewRect(), CELL = sp.CELL, pad = 240;
    const x0 = Math.max(0, ((v[0] - pad) / CELL) | 0), y0 = Math.max(0, ((v[1] - pad) / CELL) | 0);
    const x1 = Math.min(sp.gw - 1, ((v[2] + pad) / CELL) | 0), y1 = Math.min(sp.gh - 1, ((v[3] + pad) / CELL) | 0);
    const calm = !!S.calm, step = calm ? 1 : Math.min(1, elapsed / (FADE_MS / 1000));
    let wOn = 0;
    for (let i = 0; i < sp.nOn; i++) {
      const s = sp.onList[i];
      if (sp.ss[s] * z < HIDE_BELOW || S.fc[sp.reg[s]]) { sp.on[s] = 0; sp.fade[s] = 0; continue; }
      sp.onList[wOn++] = s;
    }
    sp.nOn = wOn;
    const zStop = z * (SHOW_PX / HIDE_BELOW), cand = sp.cand; let nc = 0;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const c = cy * sp.gw + cx, a = sp.off[c], b = sp.off[c + 1];
      for (let k = a; k < b; k++) {
        const s = sp.ids[k]; if (sp.zr[s] > zStop) break;
        if (S.fc[sp.reg[s]]) continue;
        const size = sp.ss[s], x = sp.x[s], y = sp.y[s];
        if (x < v[0] - size || x > v[2] + size || y < v[1] - size || y > v[3] + size) continue;
        if (size * z < SHOW_PX && !(sp.on[s] && size * z >= HIDE_BELOW)) continue;
        cand[nc++] = s;
      }
    }
    let drawN = nc;
    if (nc > MAX_LABELS) {
      labelSort.length = nc;
      for (let i = 0; i < nc; i++) labelSort[i] = cand[i];
      labelSort.sort((a, b) => sp.zr[a] - sp.zr[b] || a - b);
      drawN = MAX_LABELS;
    }
    const epoch = (sp.epoch = (sp.epoch + 1) >>> 0) || (sp.epoch = 1);
    let shown = 0, lastA = 1; nctx.globalAlpha = 1;
    for (let i = 0; i < drawN; i++) {
      const s = nc > MAX_LABELS ? labelSort[i] : cand[i];
      sp.stamp[s] = epoch;
      const num = P.col[sp.reg[s]] + 1; if (num < 1 || num > NDIG) continue;
      if (!sp.on[s]) { sp.on[s] = 1; sp.fade[s] = calm ? 1 : 0; sp.onList[sp.nOn++] = s; }
      if (calm) sp.fade[s] = 1; else if (sp.fade[s] < 1) { sp.fade[s] = Math.min(1, sp.fade[s] + step); if (sp.fade[s] < 1) labelBusy = true; }
      const a = sp.fade[s]; if (a < 0.02) continue;
      if (a !== lastA) { nctx.globalAlpha = a; lastA = a; }
      const size = sp.ss[s], d = size * z * dpr; let A = atlas[atlas.length - 1];
      for (const t of atlas) if (t.b >= d) { A = t; break; }
      const k = d / A.b, i0 = num - 1, col = i0 % ACOLS, row = (i0 / ACOLS) | 0; shown++;
      nctx.drawImage(A.c, col * A.cw, row * A.ch, A.cw, A.ch, w2sx(sp.x[s]) - A.cw * k / 2, w2sy(sp.y[s]) - A.ch * k / 2, A.cw * k, A.ch * k);
    }
    if (nc > MAX_LABELS) for (let i = drawN; i < nc; i++) { const s = labelSort[i]; if (sp.on[s]) { sp.on[s] = 0; sp.fade[s] = 0; } }
    if (lastA !== 1) nctx.globalAlpha = 1;
    let w2 = 0; for (let i = 0; i < sp.nOn; i++) if (sp.on[sp.onList[i]]) sp.onList[w2++] = sp.onList[i]; sp.nOn = w2;
    stats.labelN = shown; stats.labelSeen = nc;
  }
  function snapshotLabels() { labCam = { x: cam.x, y: cam.y, z: cam.z, w: nums.width, h: nums.height }; labSnapStale = true; }   // the copy is made only when the labels first have to move (a fill alone never needs it)
  function copyLabels() {
    labSnapStale = false;
    if (labSnap.width !== nums.width || labSnap.height !== nums.height) { labSnap.width = nums.width; labSnap.height = nums.height; }
    sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, labSnap.width, labSnap.height); sctx.drawImage(nums, 0, 0);
  }
  function blitLabels() {
    if (labSnapStale) copyLabels();
    const scale = cam.z / labCam.z, ox = cssW / 2 * dpr, oy = cssH / 2 * dpr;
    const tx = ox * (1 - scale) + (labCam.x - cam.x) * cam.z * dpr, ty = oy * (1 - scale) + (labCam.y - cam.y) * cam.z * dpr;
    nctx.setTransform(1, 0, 0, 1, 0, 0); nctx.clearRect(0, 0, nums.width, nums.height);
    nctx.globalAlpha = 1; nctx.setTransform(scale, 0, 0, scale, tx, ty); nctx.drawImage(labSnap, 0, 0);
    nctx.setTransform(1, 0, 0, 1, 0, 0); stats.labelBlit = 1;
  }
  // During a pinch, reuse the last label bitmap (scaled with the picture). Rebuild on a pause, every 4th frame, a fill, or a size change.
  function syncLabels(now) {
    const t0 = performance.now(); stats.labelBuilt = 0; stats.labelBlit = 0;
    if (!nums || !nctx) { stats.labelMs = 0; return; }
    if (!S || !S.nums) {
      if (labCam || labelForce) { nctx.setTransform(1, 0, 0, 1, 0, 0); nctx.clearRect(0, 0, nums.width, nums.height); labCam = null; labelForce = false; }
      labelBusy = false; stats.labelMs = 0; stats.labelN = 0; stats.labelSeen = 0; return;
    }
    if (!atlas || !nums.width) { stats.labelMs = 0; stats.labelN = 0; return; }
    labelDtAcc += frameDt > 0 ? frameDt : 0.016;
    const gesturing = now - lastCam < 80;
    const sized = !!(labCam && labCam.w === nums.width && labCam.h === nums.height);
    const sameCam = sized && labCam.x === cam.x && labCam.y === cam.y && labCam.z === cam.z;
    const rebuild = labelForce || !sized || (!gesturing && (!sameCam || labelBusy)) || (gesturing && sized && (frameNo & 3) === 0);
    if (!rebuild) {
      if (!sameCam) blitLabels();
      if (!labelBusy) labelDtAcc = 0;
      stats.labelMs = performance.now() - t0; return;
    }
    drawDigits(); snapshotLabels(); labelForce = false; stats.labelBuilt = 1; stats.labelMs = performance.now() - t0;
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
  function ensureHatch(col) {
    if (!hatchPaths) hatchPaths = [];
    const hit = hatchPaths[col]; if (hit) return hit;
    stats.hatchBuilds = (stats.hatchBuilds || 0) + 1;
    const P = S.P, path = new Path2D(), clipped = []; let plain = 0;
    if (P.grid) {
      const G = P.grid, cs = G.cs;
      for (let i = 0; i < P.n; i++) if (!S.fc[i] && P.col[i] === col) { path.rect((i % G.gw) * cs, ((i / G.gw) | 0) * cs, cs, cs); plain++; }
    } else for (let i = 0; i < P.n; i++) if (!S.fc[i] && P.col[i] === col) {
      if (P.clip[i]) clipped.push(i); else { path.addPath(shapePath(i)); plain++; }
    }
    return hatchPaths[col] = { path, clipped, plain };
  }
  function paintHatch(path) {
    if (!hatchPat && hatch) hatchPat = fctx.createPattern(hatch, 'repeat');
    fctx.save(); fctx.clip(path); fctx.setTransform(FXD, 0, 0, FXD, 0, 0);
    fctx.fillStyle = hatchPat || 'rgba(120,90,150,.26)'; fctx.fillRect(0, 0, fx.width / FXD, fx.height / FXD); fctx.restore();
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
      const hp = ensureHatch(S.sel - 1);
      if (hp.plain) paintHatch(hp.path);
      for (let k = 0; k < hp.clipped.length; k++) {
        const i = hp.clipped[k]; fctx.save(); if (P.clip[i]) fctx.clip(P.clip[i]); fctx.clip(shapePath(i));
        fctx.setTransform(FXD, 0, 0, FXD, 0, 0);
        if (!hatchPat && hatch) hatchPat = fctx.createPattern(hatch, 'repeat');
        fctx.fillStyle = hatchPat || 'rgba(120,90,150,.26)'; fctx.fillRect(0, 0, fx.width / FXD, fx.height / FXD); fctx.restore();
      }
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
    cam.z = Math.max(fit * 0.8, Math.min(fit * zHi(), cam.z));
  }
  function moved() { lastCam = performance.now(); artDirty = fxDirty = artFull = true; }
  // Fold-class screens keep art at 2. A canvas-width >= 800 test missed Fold landscape: the play
  // canvas is ~740-790 CSS px, so quality step 2 (dpr 1.5) applied. Phones stay under a 700 CSS
  // short side and under ~3.5e6 device px, and keep the v9 caps.
  function foldArt(dev) {
    const sw = (typeof innerWidth === 'number' && innerWidth) || cssW;
    const sh = (typeof innerHeight === 'number' && innerHeight) || cssH;
    const minSide = Math.min(sw, sh), area = sw * sh * dev * dev;
    return minSide >= 700 || area >= 4.5e6;
  }
  function layout(w, h, ratio) {
    cssW = Math.max(1, w); cssH = Math.max(1, h);
    coatClear(); coat = null; band = null;
    const dev = ratio || 1;
    if (foldArt(dev)) dpr = 2;
    else dpr = Math.min(dev, QS[q].dpr);
    const rel = fit > 0 && cam.z > 0 ? cam.z / fit : 1;
    fit = Math.min(cssW / WW, cssH / WH); cam.z = fit * rel;
    let artCleared = false;
    for (const c of [art, nums, fx]) {
      if (!c) continue;
      const k = c === fx ? FXD : dpr;
      const nw = Math.max(1, Math.round(cssW * k)), nh = Math.max(1, Math.round(cssH * k));
      c.style.width = cssW + 'px'; c.style.height = cssH + 'px';
      if (c.width !== nw || c.height !== nh) { c.width = nw; c.height = nh; if (c === art) artCleared = true; }
    }
    labelForce = true; clampCam(); curLi = pickLod(); moved();
    // alpha:false canvas resets to black. Fill paper, and the tiles we already have, before the browser paints.
    if (artCleared && actx) { band = null; artFull = true; dr = null; drawArt(); artDirty = false; }
  }
  function fitView() { cam.x = WW / 2; cam.y = WH / 2; cam.z = fit; clampCam(); moved(); }
  function panBy(dx, dy) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; flight = null; gestureAt = performance.now(); clampCam(); moved(); }
  function zoomAt(f, sx, sy) {   // sx, sy css px inside the canvas
    const w = s2w(sx, sy), z0 = cam.z; cam.z = Math.max(fit * 0.8, Math.min(fit * zHi(), z0 * f)); cam.x = w[0] - (sx - cssW / 2) / cam.z; cam.y = w[1] - (sy - cssH / 2) / cam.z; flight = null; gestureAt = performance.now(); clampCam(); moved();
  }
  const s2w = (sx, sy) => [cam.x + (sx - cssW / 2) / cam.z, cam.y + (sy - cssH / 2) / cam.z];
  function flyTo(x, y, z, ms, instant) {
    z = Math.max(fit * 0.8, Math.min(fit * zHi(), z));
    if (instant || !ms) { cam.x = x; cam.y = y; cam.z = z; flight = null; clampCam(); moved(); return; }
    flight = { x0: cam.x, y0: cam.y, z0: cam.z, x1: x, y1: y, z1: z, t0: performance.now(), ms };
  }
  function stepFlight(now) {
    if (!flight) return false; const f = flight, u = Math.min(1, (now - f.t0) / f.ms), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    cam.x = f.x0 + (f.x1 - f.x0) * e; cam.y = f.y0 + (f.y1 - f.y0) * e; cam.z = Math.exp(Math.log(f.z0) + (Math.log(f.z1) - Math.log(f.z0)) * e); clampCam(); moved(); if (u >= 1) flight = null; return !!flight;
  }

  function zHi() { const t = S && (S.tier | 0); return t === 4 ? 32 : t === 3 ? 24 : 12; }
  // ---------- state + per-frame ----------
  function setPuzzle(pic, pal, fc, opts) {
    for (const t of tiles.values()) dropTile(t); tiles.clear(); fxPend.clear(); pendTiles.clear(); glow.clear(); ring = null; pa.on.fill(0); pLive = 0;
    WW = pic.w || WORLD; WH = pic.h || WORLD; if (cssW) fit = Math.min(cssW / WW, cssH / WH);
    const P = prep(pic);
    S = { P, pal: pal || pic.pal, fc: fc || new Uint8Array(P.n), sel: 0, hl: true, nums: true, calm: false };
    Object.assign(S, opts || {}); strokeZ = -1; hatchPaths = null; labelForce = true; labCam = null; labelDtAcc = 0; labelBusy = false;
    coatClear(); coat = null; band = null;
    fitView(); curLi = pickLod(); quiet = 1; warmTo = performance.now() + 4000;   // the pinned LOD 4 base (2 MB, always something to show) is built by frame(), first, within the budget (CC 8: 4 at once = 120 ms at 4x)
    artDirty = fxDirty = artFull = true;
    if (actx && art && art.width) { actx.setTransform(1, 0, 0, 1, 0, 0); actx.fillStyle = PAPER; actx.fillRect(0, 0, art.width, art.height); }
    return S;
  }
  function setFill(i, c) {
    S.fc[i] = c; if (hatchPaths) hatchPaths[S.P.col[i]] = null; labelForce = true; const b = S.P.bb[i];
    for (const t of tiles.values()) if (ov(b, tileRect(t))) { if (t.pend.indexOf(i) < 0) { t.pend.push(i); fxPend.set(i, (fxPend.get(i) || 0) + 1); } pendTiles.add(t); }
    markW(b); fxDirty = true;
  }
  function setReveal(bm) {
    if (!S) return;
    S.reveal = bm || null;
    for (const t of tiles.values()) renderTile(t);
    artDirty = fxDirty = artFull = true;
  }
  function rebuildAll() { for (const t of tiles.values()) if (t.li === 0) renderTile(t); else dropTile(t); fxPend.clear(); pendTiles.clear(); artDirty = fxDirty = artFull = true; }
  // returns true while it needs another frame
  function frame(now, dt) {
    frameNo++; frameDt = dt || 0.016; let more = false, T0 = performance.now(), budget = (now - lastCam < 120 ? 4 : 9);
    if (labelBusy) more = true;
    if (quiet) { quiet--; budget = 0; more = true; }   // a new puzzle's first frame shares its task with the screen change: no tile work in it (CC 8)
    if (stepFlight(now)) more = true;
    ensureCoat();
    const gesturing = now - gestureAt < 160 || !!flight;
    // A resize clears the art bitmap to black and marks it dirty. Stopping here would keep that black on screen.
    if (S && proxyStale && !gesturing && !band && !warmTo && !pendTiles.size && !viewMissing() && !artDirty && !artFull) {
      takeProxy();
      stats.ms = performance.now() - T0; stats.labelMs = 0; stats.labelBuilt = 0; stats.labelBlit = 0;
      stats.cnt = (stats.cnt || 0) + 1; stats.artMs = stats.artMs || 0; stats.fxMs = stats.fxMs || 0;
      tileCount = tiles.size;
      return false;
    }
    if (proxyShown && !gesturing) {
      const drifted = coat && (Math.abs(coat.x - cam.x) > 0.5 || Math.abs(coat.y - cam.y) > 0.5 || Math.abs(coat.z - cam.z) > 0.01);
      if (drifted) { artDirty = true; artFull = true; } else dropProxy();
    }
    if (S && gesturing && coatOk() && !pendTiles.size && !peekOn()) {
      band = null;
      if (!proxyShown) showProxy();
      coatNow();
      stats.ms = performance.now() - T0; stats.labelMs = 0; stats.labelBuilt = 0; stats.labelBlit = 0;
      stats.coated = (stats.coated || 0) + 1; stats.cnt = (stats.cnt || 0) + 1; stats.artMs = stats.artMs || 0; stats.fxMs = stats.fxMs || 0;
      tileCount = tiles.size;
      return true;
    }
    if (S) {
      if (now - lastCam >= 120) { const li = pickLod(); if (li !== curLi) { curLi = li; artDirty = artFull = true; } stats.lastLod = LODS[curLi]; }
      for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) if (!tiles.has(tkey(0, tx, ty))) { if (performance.now() - T0 < budget) markW(tileRect(getTile(0, tx, ty, true))); more = true; }
      // apply pending region paints (<= budget)
      for (const t of pendTiles) {
        if (performance.now() - T0 >= budget) { more = true; break; }
        const f = t.fc.getContext('2d'); tileXf(f, t); paintTile = t;
        for (const i of t.pend) { paintAround(f, i, false); decPend(i); stats.applies++; }   // outlines live in the other layer and never change
        paintTile = null;
        for (const i of t.pend) markW(S.P.bb[i]); t.pend.length = 0; pendTiles.delete(t); settle(t);
      }
      if (pendTiles.size) more = true;
      // build missing tiles for the current view, nearest the centre first. Past x16 the viewport is painted as vectors, so those tiles are not built.
      const lod = LODS[curLi], sp = tileSpan(lod, viewRect()), miss = [];
      if (!deepZoom()) {
        for (let ty = sp[2]; ty <= sp[3]; ty++) for (let tx = sp[0]; tx <= sp[1]; tx++) if (!tiles.has(tkey(curLi, tx, ty))) miss.push([tx, ty, Math.abs((tx + 0.5) * TS * lod - cam.x) + Math.abs((ty + 0.5) * TS * lod - cam.y)]);
        miss.sort((a, b) => a[2] - b[2]);
        for (const m of miss) { if (performance.now() - T0 >= budget) break; const nt = getTile(curLi, m[0], m[1], true); markW(tileRect(nt)); }
      }
      if (miss.length) more = true; else if (!deepZoom() && now - lastCam >= 160 && frameNo % 8 === 0) evict();
      if (!S.P.grid && now - lastCam >= 120 && strokeZ !== cam.z) {
        let done = true; const sp2 = tileSpan(LODS[curLi], viewRect());
        for (let ty = sp2[2]; ty <= sp2[3]; ty++) for (let tx = sp2[0]; tx <= sp2[1]; tx++) {
          if (performance.now() - T0 >= budget) { done = false; more = true; break; }
          const t = tiles.get(tkey(curLi, tx, ty)); if (!t || t.lw == null) continue;
          const lw = worldLW(t.lod); if (Math.abs(lw - t.lw) < 1e-3) continue;
          restroke(t); settle(t); markW(tileRect(t));
        }
        if (done) strokeZ = cam.z;
      }
      if (warmTo && !miss.length && !pendTiles.size && tiles.size >= 4 && (atlas || !S.nums)) warmTo = 0;   // first view complete
      if (now - lastCam < 120) more = true;   // wait for the LOD to settle
    }
    if (stepSweep(now)) more = true;
    if (pLive > 0) { stepParticles(dt); fxDirty = true; more = true; }
    if (ring || glow.size) { fxDirty = true; more = more || !S.calm || !!ring; }
    if (S && S.nums && !atlas) { if (performance.now() - T0 < budget) { buildAtlas(); if (atlas) labelForce = true; } more = true; }   // CC 8: the digit text is built in frames of its own, not in the first picture frame
    let tArt = 0, tFx = 0, tt = performance.now();
    // Once the view's own tiles exist, one full paint. Banding a cleared bitmap leaves the strips not yet painted black.
    if (band && !viewMissing()) { band = null; artDirty = true; artFull = true; }
    if (!band && artDirty && artFull && art && art.height > 500 && viewMissing()) beginBake();
    if (band) {
      drawArt(); tArt = performance.now() - tt; tt = performance.now(); band.i++;
      if (band.i < band.n) { artDirty = true; artFull = true; more = true; stats.labelMs = 0; stats.baked = (stats.baked || 0) + 1; }
      else { band = null; artDirty = false; if (fxDirty) { drawFx(now); fxDirty = false; tFx = performance.now() - tt; } rememberCoat(); if (proxyShown) dropProxy(); labelForce = true; more = true; }
    } else {
      if (artDirty) { drawArt(); artDirty = false; tArt = performance.now() - tt; tt = performance.now(); rememberCoat(); }
      if (fxDirty) { drawFx(now); fxDirty = false; tFx = performance.now() - tt; }
      syncLabels(now);
    }
    stats.ms = performance.now() - T0; stats.tot = (stats.tot || 0) + stats.ms; stats.cnt = (stats.cnt || 0) + 1; stats.artMs = (stats.artMs || 0) + tArt; stats.fxMs = (stats.fxMs || 0) + tFx; tileCount = tiles.size;
    if (labelBusy || (proxyStale && !(performance.now() - gestureAt < 160 || flight))) more = true;
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
    const reveal = Object.prototype.hasOwnProperty.call(o, 'reveal') ? o.reveal : (pic.reveal || null);
    drawFlat(g, { P, pal: pic.pal, fc, reveal }, { sheen: !!o.sheen && !reveal });
    g.setTransform(1, 0, 0, 1, 0, 0); if (o.frame && o.frame.a && self.CMArt) self.CMArt.drawFrame(g, cw, ch, o.frame);
    return c;
  }
  function release() {   // drop every cached tile (P5: free the heap before a 2K export); the next setPuzzle rebuilds
    for (const t of tiles.values()) dropTile(t); tiles.clear(); fxPend.clear(); pendTiles.clear(); glow.clear(); ring = null; S = null; pa.on.fill(0); pLive = 0; sw.n = sw.i = 0;
  }
  const revCache = new Map();
  async function loadReveal(url, w, h) {
    const k = url + '@' + w + 'x' + h; if (revCache.has(k)) return revCache.get(k);
    const res = await fetch(url); if (!res.ok) throw Object.assign(new Error('photo'), { code: 'decode' });
    const blob = await res.blob(); let bm;
    try { bm = await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' }); }
    catch (e) { bm = await createImageBitmap(blob); }
    if (bm.width !== w || bm.height !== h) {
      const c = mk(w, h), g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(bm, 0, 0, w, h);
      if (bm.close) bm.close(); bm = c;
    }
    revCache.set(k, bm); return bm;
  }
  self.CMR = {
    TS, LODS, QS, PAPER, seamPaths, warmSeams, prep, sweep, renderArt, release, loadReveal, get world() { return [WW, WH]; }, get zoom() { return cam.z; }, get warming() { return performance.now() < warmTo; }, hit, drawFlat, drawBase, setPuzzle, setFill, setReveal, rebuildAll, frame, layout, fitView, panBy, zoomAt, s2w, flyTo, cam, burst, stats, glow,
    init(a, f) { art = a; fx = f; nums = a.parentElement && a.parentElement.querySelector('#nums');
      if (!nums && a.parentElement) { nums = document.createElement('canvas'); nums.id = 'nums'; nums.style.pointerEvents = 'none'; a.parentElement.insertBefore(nums, f); }
      actx = a.getContext('2d', { alpha: false }); fctx = f.getContext('2d'); if (nums) nctx = nums.getContext('2d');
      labSnap = mk(1, 1); sctx = labSnap.getContext('2d'); ensureCoat();
      const idle = window.requestIdleCallback || (cb => setTimeout(cb, 200)), early = () => idle(() => { if (atlas) return; buildAtlas(); if (atlas) labelForce = true; else early(); }); early();   // digit sizes made one per idle moment, long before a puzzle opens (CC 8)
    },
    get S() { return S; }, get fit() { return fit; }, get q() { return q; }, get dpr() { return dpr; }, get tiles() { return tileCount; }, get size() { return [cssW, cssH]; },
    setQuality(n) { q = Math.max(0, Math.min(2, n)); if (cssW) { layout(cssW, cssH, window.devicePixelRatio || 1); evict(); artDirty = fxDirty = artFull = true; } },   // tiles do not depend on quality: keep them, only trim to the new cap (v9 QA P2: dropping them meant 100-160 ms rebuilds at 4x on the Fold)
    invalidate() { artDirty = fxDirty = artFull = true; },
    invalidateFx() { fxDirty = true; },   // the picked colour only changes the overlay (hatch), not the picture: no full art redraw
    setRing(x, y) { ring = { x, y, t0: performance.now() }; fxDirty = true; },
    pending: () => fxPend.size, camMoving: () => performance.now() - lastCam < 120 || !!flight, particles: () => pLive,
    labelPx: (i, cssMin) => { const L = S.P.lab[i]; return L[3] * cssMin / WORLD; }
  };
})();
