// Color Magic photo pipeline core (pv:1). Pure, deterministic functions (seeded PRNG), shared by worker.js and the main-thread fallback.
// Heavy steps are generators that yield often, so the fallback can slice them into <=12 ms chunks; the worker just drains them.
// Original IP only. No network. Nothing here stores or returns the original file: only WORK-size pixels go in, a derived puzzle comes out.
(function (g) {
  'use strict';
  const PV = 1, WORLD = 2048, MAXB = 40 * 1048576;
  const E = (code, msg) => { const e = new Error(msg || code); e.code = code; return e; };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- presets (levels 1-4 unchanged; 5-6 are the v9 harder levels; palette stays inside the 4-24 clamp) ----------
  const PRE = [null,
    { id: 1, name: 'Tiny sparkle', work: 512, pal: 6, minArea: 900, maxReg: 45, grid: 20, gpal: 6 },
    { id: 2, name: 'Pretty picture', work: 512, pal: 10, minArea: 350, maxReg: 110, grid: 32, gpal: 8 },
    { id: 3, name: 'Big adventure', work: 768, pal: 14, minArea: 220, maxReg: 220, grid: 48, gpal: 12 },
    { id: 4, name: 'Giant quest', work: 1024, pal: 20, minArea: 140, maxReg: 400, grid: 48, gpal: 16 },
    { id: 5, name: 'Super star', work: 1024, pal: 22, minArea: 90, maxReg: 650, grid: 64, gpal: 20 },
    { id: 6, name: 'Master artist', work: 1280, pal: 24, minArea: 60, maxReg: 900, grid: 80, gpal: 24 }];
  function cfgFor(o) {
    const p = PRE[o.diff | 0] || PRE[1], mode = o.mode === 'pixel' ? 'pixel' : 'shapes';
    const c = { mode, diff: p.id, seed: (o.seed >>> 0) || 1, sparkle: !!o.sparkle, preview: !!o.preview, eps: o.eps || 0.7 };
    if (mode === 'pixel') { c.grid = clamp(o.grid | 0 || p.grid, 8, 80); c.pal = clamp(o.pal | 0 || p.gpal, 4, 24); c.work = 512; }
    else { c.work = p.work; c.pal = clamp(o.pal | 0 || p.pal, 4, 24); c.minArea = p.minArea; c.maxReg = p.maxReg; }
    if (c.preview) { const k = 256 / c.work; c.work = 256; if (c.minArea) c.minArea = Math.max(12, Math.round(c.minArea * k * k)); }
    return c;
  }

  // ---------- magic-byte sniff + header size (P1, S3) ----------
  const u32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const ascii = (b, i, s) => { for (let k = 0; k < s.length; k++) if (b[i + k] !== s.charCodeAt(k)) return false; return true; };
  function sniff(b) {   // b: Uint8Array of the first <=1 MB. Returns {type,w,h,orient} or throws E(code)
    if (b.length < 12) throw E('type');
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) {
      let i = 2, orient = 1;
      while (i + 4 < b.length) {
        if (b[i] !== 0xFF) { i++; continue; }
        const m = b[i + 1]; if (m === 0xFF) { i++; continue; }
        if (m === 0xD8 || (m >= 0xD0 && m <= 0xD7) || m === 0x01) { i += 2; continue; }
        const len = (b[i + 2] << 8) | b[i + 3];
        if (m === 0xE1 && ascii(b, i + 4, 'Exif\0\0')) orient = exifOrient(b, i + 10, i + 2 + len) || 1;
        if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) { const h = (b[i + 5] << 8) | b[i + 6], w = (b[i + 7] << 8) | b[i + 8]; if (!w || !h) throw E('type'); return { type: 'jpeg', w, h, orient }; }
        if (m === 0xDA) break;
        i += 2 + len;
      }
      throw E('type');
    }
    if (b[0] === 0x89 && ascii(b, 1, 'PNG\r\n\x1a\n')) { const w = u32(b, 16), h = u32(b, 20); if (!w || !h) throw E('type'); return { type: 'png', w, h, orient: 1 }; }
    if (ascii(b, 0, 'RIFF') && ascii(b, 8, 'WEBP')) {
      let w = 0, h = 0;
      if (ascii(b, 12, 'VP8X')) { w = 1 + (b[24] | (b[25] << 8) | (b[26] << 16)); h = 1 + (b[27] | (b[28] << 8) | (b[29] << 16)); }
      else if (ascii(b, 12, 'VP8L')) { const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); w = 1 + (v & 0x3FFF); h = 1 + ((v >> 14) & 0x3FFF); }
      else if (ascii(b, 12, 'VP8 ')) { w = (b[26] | (b[27] << 8)) & 0x3FFF; h = (b[28] | (b[29] << 8)) & 0x3FFF; }
      if (!w || !h) throw E('type'); return { type: 'webp', w, h, orient: 1 };
    }
    if (ascii(b, 4, 'ftyp')) {   // HEIC/HEIF: decoded only if the browser can; the size comes from the biggest ispe box
      let w = 0, h = 0;
      for (let i = 8; i + 20 < b.length; i++) if (b[i] === 0x69 && b[i + 1] === 0x73 && b[i + 2] === 0x70 && b[i + 3] === 0x65) { const ww = u32(b, i + 8), hh = u32(b, i + 12); if (ww * hh > w * h && ww < 65536 && hh < 65536) { w = ww; h = hh; } }
      if (!w || !h) throw E('type'); return { type: 'heic', w, h, orient: 1 };
    }
    let t = ''; for (let i = 0; i < Math.min(b.length, 400); i++) t += String.fromCharCode(b[i]); t = t.toLowerCase();
    if (/<svg|<\?xml|<!doctype svg/.test(t)) throw E('svg');
    throw E('type');
  }
  function exifOrient(b, t0, end) {
    if (t0 + 8 > b.length) return 0; const le = b[t0] === 0x49;
    const r16 = i => le ? b[i] | (b[i + 1] << 8) : (b[i] << 8) | b[i + 1], r32 = i => le ? (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0 : u32(b, i);
    let p = t0 + r32(t0 + 4); if (p + 2 > b.length || p + 2 > end) return 0; const n = r16(p); p += 2;
    for (let k = 0; k < n && p + 12 <= b.length; k++, p += 12) if (r16(p) === 0x0112) return r16(p + 8);
    return 0;
  }

  // ---------- decode (P1): header first, always resize, never a full-size bitmap. mk(w,h) makes a canvas ----------
  async function decodeFile(file, work, mk, yieldFn) {
    if (!file || file.size > MAXB) throw E('big');
    const s = sniff(new Uint8Array(await file.slice(0, 1 << 20).arrayBuffer()));
    const sw = s.orient >= 5 ? s.h : s.w, sh = s.orient >= 5 ? s.w : s.h;   // oriented size
    if (Math.min(sw, sh) < 8) throw E('small');
    const k = Math.min(1, work / Math.max(sw, sh)), tw = Math.max(1, Math.round(sw * k)), th = Math.max(1, Math.round(sh * k));
    let bm = null;
    try {
      try { bm = await createImageBitmap(file, { imageOrientation: 'from-image', resizeWidth: tw, resizeHeight: th, resizeQuality: 'high' }); }
      catch (e) { if (s.type === 'heic' || sw * sh > 50e6) throw E('decode'); bm = null; }
      if (!bm) {   // resize options refused: only allowed for pictures up to 8 MP (P1)
        if (sw * sh > 8e6) throw E('resize');
        bm = await createImageBitmap(file, { imageOrientation: 'from-image' });
      }
      if (Math.max(bm.width, bm.height) > work * 1.02 && bm.width * bm.height > 8e6) throw E('resize');
      const sc = Math.min(1, work / Math.max(bm.width, bm.height)), cw = Math.max(1, Math.round(bm.width * sc)), ch = Math.max(1, Math.round(bm.height * sc));
      const c = mk(cw, ch), x = c.getContext('2d', { willReadFrequently: true });
      x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch); x.imageSmoothingQuality = 'high';
      if (!yieldFn) { x.drawImage(bm, 0, 0, cw, ch); const id = x.getImageData(0, 0, cw, ch); return { rgba: id.data, w: cw, h: ch, type: s.type, srcW: sw, srcH: sh }; }
      const out = new Uint8ClampedArray(cw * ch * 4), band = Math.max(8, Math.floor(60000 / cw)), ky = bm.height / ch;   // main thread: draw + read back in bands so no task runs long
      for (let y = 0; y < ch; y += band) { const hh = Math.min(band, ch - y); x.drawImage(bm, 0, y * ky, bm.width, hh * ky, 0, y, cw, hh); out.set(x.getImageData(0, y, cw, hh).data, y * cw * 4); await yieldFn(); }
      return { rgba: out, w: cw, h: ch, type: s.type, srcW: sw, srcH: sh };
    } catch (e) { throw e.code ? e : E('decode', e && e.message); }
    finally { if (bm && bm.close) bm.close(); }
  }

  // ---------- colour (OKLab) ----------
  const LIN = new Float32Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function toLab(r, gg, b, o, i) {
    const lr = LIN[r], lg = LIN[gg], lb = LIN[b];
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb), m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb), s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    o[i] = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s; o[i + 1] = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s; o[i + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  }
  const enc = v => { v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return clamp(Math.round(v * 255), 0, 255); };
  function fromLab(L, a, b) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.2914855480 * b, l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return [enc(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), enc(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), enc(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)];
  }
  const hex = c => '#' + ((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1);
  const SPARKLE = ['#ff5fa2', '#ff8fcf', '#ffc2e4', '#d6339f', '#a8206f', '#b56cff', '#d9b8ff', '#7d4bd8', '#4fd8e0', '#8ff0f4', '#1fa7b3', '#ffd34d', '#ffe27a', '#e0a000', '#ff9a5c', '#ff6f6f', '#8ff0c0', '#2fb877', '#ffffff', '#fff1ee', '#f5c542', '#ff7ab8', '#c24cff', '#5b8cff', '#a6c8ff', '#6b2a5a', '#3a1a4a', '#9aa0c8', '#ffb3b3', '#baf5d6', '#ffe9a8', '#e6d4ff'];
  let SPLAB = null;
  const spLab = () => { if (!SPLAB) { SPLAB = SPARKLE.map(h => { const v = parseInt(h.slice(1), 16), o = new Float32Array(3); toLab(v >> 16, (v >> 8) & 255, v & 255, o, 0); return o; }); } return SPLAB; };

  // ---------- resize (area average) ----------
  function* downscaleG(src, w, h, tw, th) {
    if (tw === w && th === h) return src;
    const out = new Uint8ClampedArray(tw * th * 4);
    for (let ty = 0; ty < th; ty++) {
      const y0 = Math.floor(ty * h / th), y1 = Math.max(y0 + 1, Math.floor((ty + 1) * h / th));
      for (let tx = 0; tx < tw; tx++) {
        const x0 = Math.floor(tx * w / tw), x1 = Math.max(x0 + 1, Math.floor((tx + 1) * w / tw)); let r = 0, gg = 0, b = 0, n = 0;
        for (let y = y0; y < y1; y++) for (let x = x0, p = (y * w + x0) * 4; x < x1; x++, p += 4) { r += src[p]; gg += src[p + 1]; b += src[p + 2]; n++; }
        const o = (ty * tw + tx) * 4; out[o] = Math.round(r / n); out[o + 1] = Math.round(gg / n); out[o + 2] = Math.round(b / n); out[o + 3] = 255;
      }
      if ((ty & 7) === 7) yield;
    }
    return out;
  }
  const downscale = (src, w, h, tw, th) => drain(downscaleG(src, w, h, tw, th));

  // ---------- pre-filter: 5-wide box means (centre, shifted left, shifted right) -> median per channel, H then V, two passes ----------
  function* smooth(rgba, w, h) {
    const mx = Math.max(w, h), line = new Uint8ClampedArray(mx * 4), pre = new Int32Array((mx + 1) * 4);
    const run = n => {   // line[0..n*4) -> in place
      for (let c = 0; c < 4; c++) { pre[c] = 0; for (let i = 0; i < n; i++) pre[(i + 1) * 4 + c] = pre[i * 4 + c] + line[i * 4 + c]; }
      const e = n - 1;
      for (let i = 0; i < n; i++) {
        const a0 = i < 2 ? 0 : i - 2, a1 = i + 2 > e ? e : i + 2, b0 = i < 4 ? 0 : i - 4, d1 = i + 4 > e ? e : i + 4, na = a1 - a0 + 1, nb = i - b0 + 1, nd = d1 - i + 1;
        for (let c = 0; c < 3; c++) {
          const a = (pre[(a1 + 1) * 4 + c] - pre[a0 * 4 + c]) / na, b = (pre[(i + 1) * 4 + c] - pre[b0 * 4 + c]) / nb, d = (pre[(d1 + 1) * 4 + c] - pre[i * 4 + c]) / nd;
          const mn = a < b ? a : b, mxv = a < b ? b : a;
          line[i * 4 + c] = (d < mn ? mn : d > mxv ? mxv : d) + 0.5;
        }
      }
    };
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) { const o = y * w * 4; line.set(rgba.subarray(o, o + w * 4)); run(w); rgba.set(line.subarray(0, w * 4), o); if ((y & 7) === 7) yield; }
      for (let x = 0; x < w; x++) {
        for (let y = 0, p = x * 4; y < h; y++, p += w * 4) { line[y * 4] = rgba[p]; line[y * 4 + 1] = rgba[p + 1]; line[y * 4 + 2] = rgba[p + 2]; line[y * 4 + 3] = 255; }
        run(h); for (let y = 0, p = x * 4; y < h; y++, p += w * 4) { rgba[p] = line[y * 4]; rgba[p + 1] = line[y * 4 + 1]; rgba[p + 2] = line[y * 4 + 2]; }
        if ((x & 15) === 15) yield;
      }
    }
  }

  // ---------- k-means in OKLab (seeded k-means++, <=10 iterations) on a stratified sample ----------
  function* kmeans(S, n, k, rnd) {
    k = Math.min(k, n); const C = new Float32Array(3 * k), d2 = new Float32Array(n), asg = new Uint8Array(n);
    const dist = (i, c) => { const a = S[i * 3] - C[c * 3], b = S[i * 3 + 1] - C[c * 3 + 1], d = S[i * 3 + 2] - C[c * 3 + 2]; return a * a + b * b + d * d; };
    let i0 = Math.floor(rnd() * n); C.set(S.subarray(i0 * 3, i0 * 3 + 3), 0); for (let i = 0; i < n; i++) d2[i] = dist(i, 0);
    for (let c = 1; c < k; c++) {
      let sum = 0; for (let i = 0; i < n; i++) sum += d2[i]; let pick;
      if (sum < 1e-12) pick = Math.floor(rnd() * n); else { let r = rnd() * sum; pick = n - 1; for (let i = 0; i < n; i++) { r -= d2[i]; if (r <= 0) { pick = i; break; } } }
      C.set(S.subarray(pick * 3, pick * 3 + 3), c * 3); for (let i = 0; i < n; i++) { const d = dist(i, c); if (d < d2[i]) d2[i] = d; } yield;
    }
    const sum = new Float64Array(3 * k), cnt = new Int32Array(k);
    for (let it = 0; it < 10; it++) {
      sum.fill(0); cnt.fill(0);
      for (let i = 0; i < n; i++) {
        let best = 0, bd = 1e9; for (let c = 0; c < k; c++) { const d = dist(i, c); if (d < bd) { bd = d; best = c; } }
        asg[i] = best; d2[i] = bd; cnt[best]++; sum[best * 3] += S[i * 3]; sum[best * 3 + 1] += S[i * 3 + 1]; sum[best * 3 + 2] += S[i * 3 + 2];
        if ((i & 2047) === 2047) yield;
      }
      let moved = 0;
      for (let c = 0; c < k; c++) {
        if (!cnt[c]) { let far = 0, fd = -1; for (let i = 0; i < n; i++) if (d2[i] > fd) { fd = d2[i]; far = i; } C.set(S.subarray(far * 3, far * 3 + 3), c * 3); d2[far] = 0; moved += 1; continue; }
        for (let j = 0; j < 3; j++) { const v = sum[c * 3 + j] / cnt[c]; moved += Math.abs(v - C[c * 3 + j]); C[c * 3 + j] = v; }
      }
      if (moved < 1e-5) break; yield;
    }
    return { C, cnt, k };
  }

  // merge close centres, vividness boost, optional Sparkle snap, sort by hue/lightness. Returns {tgt: Float32Array(3m) (for mapping), pal: [hex], m}
  function tidy(C, cnt, k, cfg) {
    let L = []; for (let c = 0; c < k; c++) if (cnt[c] > 0) L.push({ l: C[c * 3], a: C[c * 3 + 1], b: C[c * 3 + 2], n: cnt[c] });
    if (!L.length) L.push({ l: 0.8, a: 0, b: 0, n: 1 });
    for (;;) {
      let bi = -1, bj = -1, bd = 0.04 * 0.04; if (L.length <= 2) break;
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const d = (L[i].l - L[j].l) ** 2 + (L[i].a - L[j].a) ** 2 + (L[i].b - L[j].b) ** 2; if (d < bd) { bd = d; bi = i; bj = j; } }
      if (bi < 0) break; const A = L[bi], B = L[bj], t = A.n + B.n; A.l = (A.l * A.n + B.l * B.n) / t; A.a = (A.a * A.n + B.a * B.n) / t; A.b = (A.b * A.n + B.b * B.n) / t; A.n = t; L.splice(bj, 1);
    }
    const sp = cfg.sparkle ? spLab() : null;
    for (const o of L) {
      o.C0 = Math.hypot(o.a, o.b); o.h0 = Math.atan2(o.b, o.a);   // sort key from the true colour
      if (sp) { let bd = 1e9, bk = 0; for (let s = 0; s < sp.length; s++) { const d = (o.l - sp[s][0]) ** 2 + (o.a - sp[s][1]) ** 2 + (o.b - sp[s][2]) ** 2; if (d < bd) { bd = d; bk = s; } } o.sk = bk; o.tl = sp[bk][0]; o.ta = sp[bk][1]; o.tb = sp[bk][2]; }
      else { o.tl = o.l; o.ta = o.a; o.tb = o.b; }
    }
    if (sp) { const seen = new Map(), out = []; for (const o of L) { const q = seen.get(o.sk); if (q) q.n += o.n; else { seen.set(o.sk, o); out.push(o); } } L = out; }
    const key = o => o.C0 < 0.04 ? o.l : 10 + Math.floor(((o.h0 + Math.PI) / (2 * Math.PI)) * 12) * 2 + (1 - o.l) * 0.9;
    L.forEach((o, i) => { o.i = i; o.key = key(o); }); L.sort((x, y) => x.key - y.key || x.i - y.i);
    const tgt = new Float32Array(L.length * 3), pal = [];
    L.forEach((o, i) => {
      tgt[i * 3] = o.tl; tgt[i * 3 + 1] = o.ta; tgt[i * 3 + 2] = o.tb;
      let a = o.ta, b = o.tb; if (!sp) { const C0 = Math.hypot(a, b); if (C0 > 0.01) { const C1 = Math.min(0.32, C0 * 1.15); a *= C1 / C0; b *= C1 / C0; } }
      pal.push(hex(fromLab(o.tl, a, b)));
    });
    return { tgt, pal, m: L.length };
  }

  // 3x3 majority filter on a label map (ties keep the centre, then the lowest id). protect[] pixels (eyes, brows, lips) stay put.
  function* modeFilter(ids, w, h, passes, protect) {
    let src = ids, dst = new Uint8Array(w * h); const cnt = new Uint8Array(256), v = new Uint8Array(9);
    for (let ps = 0; ps < passes; ps++) {
      for (let y = 0; y < h; y++) {
        const ya = y > 0 ? y - 1 : 0, yb = y < h - 1 ? y + 1 : h - 1;
        for (let x = 0; x < w; x++) {
          const xa = x > 0 ? x - 1 : 0, xb = x < w - 1 ? x + 1 : w - 1, c = src[y * w + x];
          if (protect && protect[y * w + x]) { dst[y * w + x] = c; continue; }
          v[0] = src[ya * w + xa]; v[1] = src[ya * w + x]; v[2] = src[ya * w + xb]; v[3] = src[y * w + xa]; v[4] = c; v[5] = src[y * w + xb]; v[6] = src[yb * w + xa]; v[7] = src[yb * w + x]; v[8] = src[yb * w + xb];
          for (let i = 0; i < 9; i++) cnt[v[i]]++;
          let best = c, bc = cnt[c]; for (let i = 0; i < 9; i++) { const q = v[i]; if (cnt[q] > bc || (cnt[q] === bc && q < best && q !== c)) { bc = cnt[q]; best = q; } }
          for (let i = 0; i < 9; i++) cnt[v[i]] = 0; dst[y * w + x] = best;
        }
        if ((y & 3) === 3) yield;
      }
      const t = src; src = dst; dst = (t === ids) ? new Uint8Array(w * h) : t;
    }
    return src;
  }

  // ---------- components (4-connected scanline fill) ----------
  function* labelRegions(ids, w, h) {
    const reg = new Uint16Array(w * h); let stack = new Int32Array(4096), sp = 0, n = 0;
    const push = (x, y) => { if (sp + 2 > stack.length) { const s2 = new Int32Array(stack.length * 2); s2.set(stack); stack = s2; } stack[sp++] = x; stack[sp++] = y; };
    for (let y0 = 0; y0 < h; y0++) {
      for (let x0 = 0; x0 < w; x0++) {
        if (reg[y0 * w + x0]) continue; if (n >= 65534) return null; n++; const c = ids[y0 * w + x0]; push(x0, y0);
        while (sp) {
          const y = stack[--sp], x = stack[--sp]; let p = y * w + x; if (reg[p] || ids[p] !== c) continue;
          let l = x, r = x; while (l > 0 && !reg[p - (x - l) - 1] && ids[p - (x - l) - 1] === c) l--; while (r < w - 1 && !reg[p + (r - x) + 1] && ids[p + (r - x) + 1] === c) r++;
          for (let i = l; i <= r; i++) reg[y * w + i] = n;
          for (const yy of [y - 1, y + 1]) { if (yy < 0 || yy >= h) continue; let inRun = false; for (let i = l; i <= r; i++) { const q = yy * w + i, ok = !reg[q] && ids[q] === c; if (ok && !inRun) push(i, yy); inRun = ok; } }
        }
      }
      if ((y0 & 3) === 3) yield;
    }
    return { reg, n };
  }

  // merge small regions into the neighbour with the longest border (ties: closest colour); same-colour neighbours fuse. Returns compact reg (ids 0..m-1), col per region.
  // minOf (optional, length n+1, 1-based) is a per-region area floor. Without it every region uses minArea, same as before.
  function* mergeRegions(reg, n, w, h, ids, tgt, minArea, maxReg, minOf) {
    const need = i => minOf ? minOf[i] : minArea;
    const area = new Int32Array(n + 1), col = new Uint8Array(n + 1), par = new Int32Array(n + 1), adj = new Array(n + 1);
    for (let i = 1; i <= n; i++) { par[i] = i; adj[i] = new Map(); }
    for (let p = 0; p < w * h; p++) { const r = reg[p]; area[r]++; col[r] = ids[p]; }
    const edge = (a, b) => { if (a === b) return; adj[a].set(b, (adj[a].get(b) || 0) + 1); adj[b].set(a, (adj[b].get(a) || 0) + 1); };
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) { const p = y * w + x, r = reg[p]; if (x < w - 1) edge(r, reg[p + 1]); if (y < h - 1) edge(r, reg[p + w]); } if ((y & 7) === 7) yield; }
    const K = 131072, heap = []; const hpush = v => { let i = heap.length; heap.push(v); while (i > 0) { const q = (i - 1) >> 1; if (heap[q] <= heap[i]) break; const t = heap[q]; heap[q] = heap[i]; heap[i] = t; i = q; } };
    const hpop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l] < heap[m]) m = l; if (r < heap.length && heap[r] < heap[m]) m = r; if (m === i) break; const t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m; } } return top; };
    const dead = new Uint8Array(n + 1); let live = n; for (let i = 1; i <= n; i++) hpush(area[i] * K + i);
    const fuse = (a, b) => {   // a dies into b
      for (const [c, wgt] of adj[a]) { if (c === b) continue; adj[c].delete(a); adj[c].set(b, (adj[c].get(b) || 0) + wgt); adj[b].set(c, (adj[b].get(c) || 0) + wgt); }
      adj[b].delete(a); adj[a] = null; area[b] += area[a]; dead[a] = 1; par[a] = b; live--; hpush(area[b] * K + b);
    };
    const colD = (a, b) => (tgt[a * 3] - tgt[b * 3]) ** 2 + (tgt[a * 3 + 1] - tgt[b * 3 + 1]) ** 2 + (tgt[a * 3 + 2] - tgt[b * 3 + 2]) ** 2;
    let under = 0; for (let i = 1; i <= n; i++) if (area[i] < need(i)) under++;
    const absorb = (a, b) => {   // a dies into b; keep the count of regions still under their own floor
      const aU = area[a] < need(a), bU = area[b] < need(b); fuse(a, b); if (aU) under--; if (bU && area[b] >= need(b)) under--;
    };
    let cycles = 0;
    while (heap.length) {
      const top = hpop(), a = top % K, ar = Math.floor(top / K); if (dead[a] || area[a] !== ar) continue;
      if (under === 0 && live <= maxReg) break;
      if (!adj[a].size) continue;   // nothing to merge into
      if (ar >= need(a) && live <= maxReg) continue;   // this one is already big enough; a neighbour may still be under its own floor
      let bn = -1, bw = -1, bdist = 1e9;
      for (const [c, wgt] of adj[a]) { const d = colD(col[a], col[c]); if (wgt > bw || (wgt === bw && (d < bdist || (d === bdist && c < bn)))) { bw = wgt; bn = c; bdist = d; } }
      absorb(a, bn);
      for (let again = true; again;) { again = false; for (const c of [...adj[bn].keys()]) if (col[c] === col[bn]) { absorb(c, bn); again = true; break; } }
      if ((++cycles & 63) === 0) yield;
    }
    const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const nid = new Int32Array(n + 1).fill(-1); let m = 0; const colOut = [];
    for (let p = 0; p < w * h; p++) { const r = find(reg[p]); if (nid[r] < 0) { nid[r] = m++; colOut.push(col[r]); } reg[p] = nid[r]; if ((p & 65535) === 65535) yield; }
    return { n: m, col: Uint8Array.from(colOut) };
  }

  // ---------- number spots: two-pass chamfer (3-4) distance over the region map, pole of inaccessibility per region + bbox ----------
  function* labelSpots(reg, n, w, h) {
    const dist = new Uint16Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) { const p = y * w + x, r = reg[p]; dist[p] = (x === 0 || y === 0 || x === w - 1 || y === h - 1 || reg[p - 1] !== r || reg[p + 1] !== r || reg[p - w] !== r || reg[p + w] !== r) ? 0 : 30000; }
      if ((y & 7) === 7) yield;
    }
    for (let y = 1; y < h - 1; y++) { for (let x = 1; x < w - 1; x++) { const p = y * w + x; if (!dist[p]) continue; dist[p] = Math.min(dist[p], dist[p - 1] + 3, dist[p - w] + 3, dist[p - w - 1] + 4, dist[p - w + 1] + 4); } if ((y & 7) === 7) yield; }
    for (let y = h - 2; y > 0; y--) { for (let x = w - 2; x > 0; x--) { const p = y * w + x; if (!dist[p]) continue; dist[p] = Math.min(dist[p], dist[p + 1] + 3, dist[p + w] + 3, dist[p + w + 1] + 4, dist[p + w - 1] + 4); } if ((y & 7) === 7) yield; }
    const best = new Uint16Array(n), bx = new Int16Array(n), by = new Int16Array(n), x0 = new Int16Array(n).fill(32000), y0 = new Int16Array(n).fill(32000), x1 = new Int16Array(n).fill(-1), y1 = new Int16Array(n).fill(-1);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) { const p = y * w + x, r = reg[p], d = dist[p]; if (d > best[r]) { best[r] = d; bx[r] = x; by[r] = y; } if (x < x0[r]) x0[r] = x; if (x > x1[r]) x1[r] = x; if (y < y0[r]) y0[r] = y; if (y > y1[r]) y1[r] = y; }
      if ((y & 7) === 7) yield;
    }
    return { best, bx, by, x0, y0, x1, y1 };
  }

  // ---------- crack-following trace: interior always on the right; one ring per boundary loop, corners only ----------
  function* trace(reg, n, w, h, eps) {
    const vis = new Uint8Array(w * h), DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
    const per = new Array(n); for (let i = 0; i < n; i++) per[i] = [];
    const at = (x, y, r) => x >= 0 && y >= 0 && x < w && y < h && reg[y * w + x] === r;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const r = reg[y * w + x];
        for (let sd = 0; sd < 4; sd++) {
          if (vis[y * w + x] & (1 << sd)) continue;
          if (sd === 0 ? at(x, y - 1, r) : sd === 1 ? at(x + 1, y, r) : sd === 2 ? at(x, y + 1, r) : at(x - 1, y, r)) continue;
          // walk the loop
          const pts = []; let px = x, py = y, d = sd;
          for (;;) {
            vis[py * w + px] |= 1 << d;
            const vx = d === 0 ? px + 1 : d === 1 ? px + 1 : d === 2 ? px : px, vy = d === 0 ? py : d === 1 ? py + 1 : d === 2 ? py + 1 : py;   // end vertex of this edge
            const fx = DX[d], fy = DY[d], rx = -fy, ry = fx;
            const arx = vx + (fx + rx > 0 ? 0 : -1), ary = vy + (fy + ry > 0 ? 0 : -1), alx = vx + (fx - rx > 0 ? 0 : -1), aly = vy + (fy - ry > 0 ? 0 : -1);
            let nd, nx, ny;
            if (!at(arx, ary, r)) { nd = (d + 1) & 3; nx = vx + (rx - fx > 0 ? 0 : -1); ny = vy + (ry - fy > 0 ? 0 : -1); }
            else if (at(alx, aly, r)) { nd = (d + 3) & 3; nx = alx; ny = aly; }
            else { nd = d; nx = arx; ny = ary; }
            if (nd !== d) pts.push(vx, vy);
            px = nx; py = ny; d = nd;
            if (px === x && py === y && d === sd) break;
          }
          if (pts.length >= 6) per[r].push(dpRing(pts, eps));
        }
      }
      if ((y & 3) === 3) yield;
    }
    return per;
  }
  // closed-ring Douglas-Peucker: split at vertex 0 and the vertex farthest from it
  function dpRing(pts, eps) {
    const n = pts.length >> 1; if (n <= 6 || eps <= 0) return Int32Array.from(pts);
    let far = 0, fd = -1; for (let i = 1; i < n; i++) { const d = (pts[i * 2] - pts[0]) ** 2 + (pts[i * 2 + 1] - pts[1]) ** 2; if (d > fd) { fd = d; far = i; } }
    const keep = new Uint8Array(n); keep[0] = keep[far] = 1;
    const run = (i0, i1) => {   // indices i0..i1 along the ring (i1 may wrap past n)
      const st = [i0, i1];
      while (st.length) {
        const b = st.pop(), a = st.pop(); if (b - a < 2) continue;
        const ax = pts[(a % n) * 2], ay = pts[(a % n) * 2 + 1], bx = pts[(b % n) * 2], by = pts[(b % n) * 2 + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
        let md = -1, mi = -1; for (let i = a + 1; i < b; i++) { const px = pts[(i % n) * 2], py = pts[(i % n) * 2 + 1], d = Math.abs((px - ax) * dy - (py - ay) * dx) / L; if (d > md) { md = d; mi = i; } }
        if (md > eps) { keep[mi % n] = 1; st.push(a, mi, mi, b); }
      }
    };
    run(0, far); run(far, n); const out = []; for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i * 2], pts[i * 2 + 1]);
    return out.length >= 6 ? Int32Array.from(out) : Int32Array.from(pts);
  }
  // rings -> one Int16 stream, delta coded: per region [nRings, (nPts, x0, y0, dx, dy, ...)*]
  function encodeRings(per) {
    const out = []; for (const rs of per) { out.push(rs.length); for (const r of rs) { const m = r.length >> 1; out.push(m, r[0], r[1]); for (let i = 1; i < m; i++) out.push(r[i * 2] - r[(i - 1) * 2], r[i * 2 + 1] - r[(i - 1) * 2 + 1]); } }
    return Int16Array.from(out);
  }
  function decodeRings(st, n) {
    const per = []; let p = 0;
    for (let i = 0; i < n; i++) {
      const nr = st[p++], rs = [];
      for (let k = 0; k < nr; k++) { const m = st[p++], r = new Int32Array(m * 2); r[0] = st[p++]; r[1] = st[p++]; for (let j = 1; j < m; j++) { r[j * 2] = r[j * 2 - 2] + st[p++]; r[j * 2 + 1] = r[j * 2 - 1] + st[p++]; } rs.push(r); }
      per.push(rs);
    }
    return per;
  }
  // raise epsilon and re-simplify stored rings (used when a record is over its size cap)
  function resimplify(st, n, eps) { const per = decodeRings(st, n); for (const rs of per) for (let k = 0; k < rs.length; k++) rs[k] = dpRing(Array.from(rs[k]), eps); return encodeRings(per); }

  // ---------- label map RLE (varint value, varint run) ----------
  function rleEnc(reg) {
    const o = []; const vi = v => { while (v >= 128) { o.push((v & 127) | 128); v >>>= 7; } o.push(v); };
    let i = 0, N = reg.length; while (i < N) { const v = reg[i]; let j = i + 1; while (j < N && reg[j] === v) j++; vi(v); vi(j - i); i = j; }
    return Uint8Array.from(o);
  }
  function rleDec(b, N) {
    const out = new Uint16Array(N); let p = 0, q = 0; const vi = () => { let v = 0, s = 0, c; do { c = b[p++]; v |= (c & 127) << s; s += 7; } while (c & 128); return v; };
    while (p < b.length && q < N) { const v = vi(), n = vi(); out.fill(v, q, q + n); q += n; } return out;
  }

  // ---------- the pipelines. ctx: {t(name), prog(frac), mem} ----------
  function newCtx(hooks) {
    const c = { T: {}, live: {}, peak: 0, cur: 0, stage: '', t0: 0, hooks: hooks || {} };
    c.alloc = (k, bytes) => { c.live[k] = bytes; c.cur = 0; for (const q in c.live) c.cur += c.live[q]; if (c.cur > c.peak) c.peak = c.cur; };
    c.free = k => { delete c.live[k]; c.cur = 0; for (const q in c.live) c.cur += c.live[q]; };
    c.begin = (name, frac) => { c.end(); c.stage = name; c.t0 = performance.now(); if (c.hooks.prog) c.hooks.prog(frac, name); };
    c.end = () => { if (c.stage) { c.T[c.stage] = Math.round((performance.now() - c.t0) * 10) / 10; c.stage = ''; } };
    return c;
  }
  function* sampleLab(rgba, N, rnd) {
    const S = Math.min(16384, N), out = new Float32Array(S * 3);
    for (let i = 0; i < S; i++) { const p = Math.min(N - 1, Math.floor((i + rnd()) * N / S)) * 4; toLab(rgba[p], rgba[p + 1], rgba[p + 2], out, i * 3); if ((i & 4095) === 4095) yield; }
    return { out, S };
  }
  function* mapAll(rgba, N, tgt, m) {   // RGB555 lookup of nearest target colour
    const tab = new Uint8Array(32768), lab = new Float32Array(3);
    for (let i = 0; i < 32768; i++) {
      const r = (i >> 10) & 31, gg = (i >> 5) & 31, b = i & 31; toLab((r << 3) | (r >> 2), (gg << 3) | (gg >> 2), (b << 3) | (b >> 2), lab, 0);
      let bd = 1e9, bk = 0; for (let k = 0; k < m; k++) { const d = (lab[0] - tgt[k * 3]) ** 2 + (lab[1] - tgt[k * 3 + 1]) ** 2 + (lab[2] - tgt[k * 3 + 2]) ** 2; if (d < bd) { bd = d; bk = k; } } tab[i] = bk;
      if ((i & 2047) === 2047) yield;
    }
    const ids = new Uint8Array(N);
    for (let p = 0; p < N; p++) { const o = p * 4; ids[p] = tab[((rgba[o] >> 3) << 10) | ((rgba[o + 1] >> 3) << 5) | (rgba[o + 2] >> 3)]; if ((p & 65535) === 65535) yield; }
    return ids;
  }

  // ---------- portrait (levels 3-6): skin mask in OKLab, edge-preserving smooth inside it, fewer skin tones, keep eyes / brows / lips ----------
  function skinLab(L, a, b) {
    if (L < 0.50 || L > 0.955) return false;
    if (a < 0.015 || a > 0.125) return false;
    const C = Math.hypot(a, b); if (C < 0.032 || C > 0.145) return false;
    const h = Math.atan2(b, a); return h >= 0.40 && h <= 1.25;
  }
  function isSkinHex(h) {
    if (typeof h !== 'string' || h.length < 7) return false;
    const v = parseInt(h.slice(1), 16); if (!isFinite(v)) return false;
    const o = new Float32Array(3); toLab((v >> 16) & 255, (v >> 8) & 255, v & 255, o, 0); return skinLab(o[0], o[1], o[2]);
  }
  function* dilateMask(m, w, h, r) {
    const t = new Uint8Array(m.length), o = new Uint8Array(m.length);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) { const a = x - r < 0 ? 0 : x - r, b = x + r >= w ? w - 1 : x + r; let v = 0; for (let k = a; k <= b; k++) if (m[row + k]) { v = 1; break; } t[row + x] = v; }
      if ((y & 7) === 7) yield;
    }
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { const a = y - r < 0 ? 0 : y - r, b = y + r >= h ? h - 1 : y + r; let v = 0; for (let k = a; k <= b; k++) if (t[k * w + x]) { v = 1; break; } o[y * w + x] = v; }
    return o;
  }
  function* erodeMask(m, w, h, r) {
    const t = new Uint8Array(m.length), o = new Uint8Array(m.length);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) { const a = x - r < 0 ? 0 : x - r, b = x + r >= w ? w - 1 : x + r; let v = 1; for (let k = a; k <= b; k++) if (!m[row + k]) { v = 0; break; } t[row + x] = v; }
      if ((y & 7) === 7) yield;
    }
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { const a = y - r < 0 ? 0 : y - r, b = y + r >= h ? h - 1 : y + r; let v = 1; for (let k = a; k <= b; k++) if (!t[k * w + x]) { v = 0; break; } o[y * w + x] = v; }
    return o;
  }
  function* largestMask(mask, w, h) {
    const lab = new Int32Array(mask.length); let stack = new Int32Array(8192), sp = 0, comps = 0, steps = 0; const sizes = [0];
    const push = p => { if (sp >= stack.length) { const s2 = new Int32Array(stack.length * 2); s2.set(stack); stack = s2; } stack[sp++] = p; };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p0 = y * w + x; if (!mask[p0] || lab[p0]) continue;
        const id = ++comps; let sz = 0; lab[p0] = id; push(p0);
        while (sp) {
          const p = stack[--sp]; sz++; const px = p % w, py = (p / w) | 0;
          if (px > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = id; push(p - 1); }
          if (px + 1 < w && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = id; push(p + 1); }
          if (py > 0 && mask[p - w] && !lab[p - w]) { lab[p - w] = id; push(p - w); }
          if (py + 1 < h && mask[p + w] && !lab[p + w]) { lab[p + w] = id; push(p + w); }
          if ((++steps & 32767) === 0) yield;
        }
        sizes[id] = sz;
      }
      if ((y & 15) === 15) yield;
    }
    let best = 0, bn = 0; for (let i = 1; i <= comps; i++) if (sizes[i] > bn) { bn = sizes[i]; best = i; }
    if (!bn) return 0;
    for (let p = 0; p < mask.length; p++) mask[p] = lab[p] === best ? 1 : 0;
    return bn;
  }
  function* bilateral(rgba, w, h, mask, protect, rad, sigma, passes) {
    const ker = [];
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy > rad * rad) continue;
      ker.push(dx, dy, Math.exp(-(dx * dx + dy * dy) / (rad * rad)));
    }
    const lim = sigma * sigma, src = new Uint8ClampedArray(rgba.length), kn = ker.length / 3;
    for (let pass = 0; pass < passes; pass++) {
      src.set(rgba);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x; if (!mask[p] || (protect && protect[p])) continue;
          const o = p * 4, r0 = src[o], g0 = src[o + 1], b0 = src[o + 2]; let rs = 0, gs = 0, bs = 0, ws = 0;
          for (let k = 0; k < kn; k++) {
            const xx = x + ker[k * 3], yy = y + ker[k * 3 + 1]; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const q = yy * w + xx; if (!mask[q]) continue;
            const qo = q * 4, dr = src[qo] - r0, dg = src[qo + 1] - g0, db = src[qo + 2] - b0;
            if (dr * dr + dg * dg + db * db > lim) continue;
            const wgt = ker[k * 3 + 2]; rs += src[qo] * wgt; gs += src[qo + 1] * wgt; bs += src[qo + 2] * wgt; ws += wgt;
          }
          if (ws > 0) { rgba[o] = rs / ws + 0.5; rgba[o + 1] = gs / ws + 0.5; rgba[o + 2] = bs / ws + 0.5; }
        }
        if ((y & 3) === 3) yield;
      }
    }
  }
  // Returns {mask, protect, edge, frac} when the picture has one face-sized skin region, else null. Smooths rgba in place.
  function* prepFace(rgba, w, h, diff) {
    const N = w * h, mask = new Uint8Array(N), lab = new Float32Array(3);
    for (let p = 0; p < N; p++) {
      const o = p * 4; toLab(rgba[o], rgba[o + 1], rgba[o + 2], lab, 0);
      if (skinLab(lab[0], lab[1], lab[2])) mask[p] = 1;
      if ((p & 16383) === 16383) yield;
    }
    const rad = diff >= 5 ? 3 : 2;
    let closed = yield* dilateMask(mask, w, h, rad); closed = yield* erodeMask(closed, w, h, rad);
    const bn = yield* largestMask(closed, w, h), frac = bn / N;
    if (bn < 0.055 * N || bn > 0.80 * N) return null;
    const edge = new Float32Array(N), lum = new Float32Array(N), protect = new Uint8Array(N);
    for (let p = 0; p < N; p++) { const o = p * 4; lum[p] = (0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2]) / 255; if ((p & 16383) === 16383) yield; }
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) { const p = y * w + x, gx = lum[p + 1] - lum[p - 1], gy = lum[p + w] - lum[p - w]; edge[p] = Math.abs(gx) + Math.abs(gy); }
      if ((y & 7) === 7) yield;
    }
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let p = 0; p < N; p++) if (closed[p]) { const x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const padX = Math.round((x1 - x0) * 0.08), padY = Math.round((y1 - y0) * 0.08);
    x0 = Math.max(0, x0 - padX); y0 = Math.max(0, y0 - padY); x1 = Math.min(w - 1, x1 + padX); y1 = Math.min(h - 1, y1 + padY);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = y * w + x;
      if (closed[p]) { if (edge[p] > 0.20) protect[p] = 1; }
      else if (edge[p] > 0.12 || lum[p] < 0.34) protect[p] = 1;
    }
    yield* bilateral(rgba, w, h, closed, protect, 2, diff >= 5 ? 42 : 24, diff >= 5 ? 2 : 1);
    return { mask: closed, protect, edge, frac };
  }
  function* limitSkin(ids, w, h, mask, protect, td) {
    const m = td.m, N = w * h, tgt = td.tgt, skin = [];
    for (let k = 0; k < m; k++) if (skinLab(tgt[k * 3], tgt[k * 3 + 1], tgt[k * 3 + 2])) skin.push(k);
    const dead = new Uint8Array(m); let live = skin.length;
    while (live > 4) {
      let bi = -1, bj = -1, bd = 1e9;
      for (let a = 0; a < skin.length; a++) {
        const i = skin[a]; if (dead[i]) continue;
        for (let b = a + 1; b < skin.length; b++) {
          const j = skin[b]; if (dead[j]) continue;
          const d = (tgt[i * 3] - tgt[j * 3]) ** 2 + (tgt[i * 3 + 1] - tgt[j * 3 + 1]) ** 2 + (tgt[i * 3 + 2] - tgt[j * 3 + 2]) ** 2;
          if (d < bd) { bd = d; bi = i; bj = j; }
        }
      }
      if (bi < 0) break; dead[bj] = 1; live--; yield;
    }
    const liveSkin = []; for (const k of skin) if (!dead[k]) liveSkin.push(k);
    const map = new Uint8Array(m); for (let k = 0; k < m; k++) map[k] = k;
    for (const j of skin) if (dead[j]) {
      let bd = 1e9, bk = liveSkin[0] || j;
      for (const i of liveSkin) { const d = (tgt[i * 3] - tgt[j * 3]) ** 2 + (tgt[i * 3 + 1] - tgt[j * 3 + 1]) ** 2 + (tgt[i * 3 + 2] - tgt[j * 3 + 2]) ** 2; if (d < bd) { bd = d; bk = i; } }
      map[j] = bk;
    }
    const skinSet = new Uint8Array(m); for (const k of liveSkin) skinSet[k] = 1;
    const out = new Uint8Array(N);
    for (let p = 0; p < N; p++) {
      const orig = ids[p];
      if (protect && protect[p]) { out[p] = orig; continue; }
      let c = map[orig];
      if (mask[p] && liveSkin.length && !skinSet[c]) {
        let bd = 1e9, bk = c;
        for (const i of liveSkin) { const d = (tgt[i * 3] - tgt[c * 3]) ** 2 + (tgt[i * 3 + 1] - tgt[c * 3 + 1]) ** 2 + (tgt[i * 3 + 2] - tgt[c * 3 + 2]) ** 2; if (d < bd) { bd = d; bk = i; } }
        if (bd < 0.02) c = bk;
      }
      out[p] = c;
      if ((p & 65535) === 65535) yield;
    }
    return out;
  }
  function regionMins(reg, n, w, h, mask, edge, baseMin, skinMin, featureMin) {
    const minOf = new Uint32Array(n + 1), area = new Int32Array(n + 1), sk = new Int32Array(n + 1), es = new Float64Array(n + 1), N = w * h;
    for (let p = 0; p < N; p++) { const r = reg[p]; area[r]++; if (mask[p]) sk[r]++; es[r] += edge[p]; }
    for (let r = 1; r <= n; r++) {
      const a = area[r] || 1, em = es[r] / a, sf = sk[r] / a;
      if (em > 0.11 || (sf < 0.4 && em > 0.06)) minOf[r] = featureMin;
      else if (sf >= 0.5) minOf[r] = skinMin;
      else minOf[r] = baseMin;
    }
    return minOf;
  }
  function faceStats(reg, n, col, pal, mask, N, maskFrac, baseMin, skinMin, featureMin) {
    const area = new Int32Array(n), sk = new Int32Array(n); let minArea = N;
    for (let p = 0; p < N; p++) { const r = reg[p]; area[r]++; if (mask[p]) sk[r]++; }
    const tones = new Set(); let skinRegions = 0;
    for (let r = 0; r < n; r++) {
      if (area[r] && area[r] < minArea) minArea = area[r];
      if (area[r] && sk[r] * 2 >= area[r]) { skinRegions++; if (isSkinHex(pal[col[r]])) tones.add(col[r]); }
    }
    return { tones: tones.size, skinRegions, minArea: minArea === N ? 0 : minArea, regions: n, pal: pal.length, maskFrac: Math.round(maskFrac * 1000) / 1000, baseMin, skinMin, featureMin };
  }

  // ---------- Detail picker: deterministic clip-pattern splits of a pack picture (Hard d2 ~2-3x, Expert d3 ~4-6x), tint palette <= 24 ----------
  function rasterShapes(pic, size, mk, P2D) {
    const c = mk(size, size), g = c.getContext('2d', { willReadFrequently: true }), sw = pic.w || 2048, sh = pic.h || 2048;
    g.setTransform(size / sw, 0, 0, size / sh, 0, 0);
    const shapes = pic.shapes;
    for (let i = 0; i < shapes.length; i++) {
      const s = shapes[i], v = i + 1;
      g.fillStyle = 'rgb(' + (v & 255) + ',' + ((v >> 8) & 255) + ',0)';
      if (s[2]) { g.save(); g.clip(new P2D(s[2])); g.fill(new P2D(s[1])); g.restore(); }
      else g.fill(new P2D(s[1]));
    }
    const d = g.getImageData(0, 0, size, size).data, ids = new Uint16Array(size * size);
    for (let p = 0, o = 0; p < ids.length; p++, o += 4) { const v = d[o] | (d[o + 1] << 8); ids[p] = v ? v - 1 : 0; }
    return { ids, w: size, h: size };
  }
  function tintHex(h, dL) {
    if (!dL) return h;
    const v = parseInt(h.slice(1), 16), o = new Float32Array(3);
    toLab((v >> 16) & 255, (v >> 8) & 255, v & 255, o, 0);
    return hex(fromLab(clamp(o[0] + dL, 0.15, 0.97), o[1], o[2]));
  }
  function patternAt(kind, k, bb, rnd) {
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
    if (kind === 'facets') {
      const rot = rnd() * Math.PI * 2;
      return (x, y) => { let a = Math.atan2(y - cy, x - cx) + Math.PI + rot; a %= Math.PI * 2; if (a < 0) a += Math.PI * 2; return Math.min(k - 1, (a / (Math.PI * 2) * k) | 0); };
    }
    if (kind === 'stripes') {
      const ang = rnd() * Math.PI, dx = Math.cos(ang), dy = Math.sin(ang), cs = [[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x0, bb.y1], [bb.x1, bb.y1]];
      let mn = 1e9, mx = -1e9; for (const q of cs) { const t = q[0] * dx + q[1] * dy; if (t < mn) mn = t; if (t > mx) mx = t; }
      const span = Math.max(1e-3, mx - mn);
      return (x, y) => Math.min(k - 1, Math.max(0, (((x * dx + y * dy) - mn) / span * k) | 0));
    }
    if (kind === 'petals') {
      const rot = rnd() * Math.PI * 2;
      return (x, y) => { const a = Math.atan2(y - cy, x - cx) + rot, wob = 0.45 * Math.sin(a * k); let t = (a + Math.PI + wob) / (Math.PI * 2); t -= Math.floor(t); return Math.min(k - 1, (t * k) | 0); };
    }
    if (kind === 'scales') {
      const s = Math.max(4, Math.sqrt((bb.w * bb.h) / Math.max(1, k)) * 0.92);
      return (x, y) => { const row = Math.floor((y - bb.y0) / s), ox = (row & 1) ? s * 0.5 : 0, col = Math.floor((x - bb.x0 + ox) / s); return Math.abs((col * 3 + row * 5) % k); };
    }
    const sites = []; for (let i = 0; i < k; i++) sites.push(bb.x0 + rnd() * bb.w, bb.y0 + rnd() * bb.h);
    return (x, y) => { let bi = 0, bd = 1e18; for (let i = 0; i < k; i++) { const dx = x - sites[i * 2], dy = y - sites[i * 2 + 1], d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } } return bi; };
  }
  function* foldTiny(ids, cell, splits, w, h, area) {
    const shapesN = splits.length, ca = new Int32Array(shapesN * 16), remap = new Uint8Array(shapesN * 16);
    for (let s = 0; s < shapesN; s++) for (let c = 0; c < 16; c++) remap[s * 16 + c] = c;
    for (let p = 0; p < ids.length; p++) if (splits[ids[p]] > 1) ca[ids[p] * 16 + cell[p]]++;
    const adj = new Array(shapesN * 16);
    const touch = (s, a, b) => { if (a === b) return; const ia = s * 16 + a, ib = s * 16 + b; if (!adj[ia]) adj[ia] = new Map(); if (!adj[ib]) adj[ib] = new Map(); adj[ia].set(b, (adj[ia].get(b) || 0) + 1); adj[ib].set(a, (adj[ib].get(a) || 0) + 1); };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x, s = ids[p]; if (splits[s] <= 1) continue;
        if (x + 1 < w && ids[p + 1] === s) touch(s, cell[p], cell[p + 1]);
        if (y + 1 < h && ids[p + w] === s) touch(s, cell[p], cell[p + w]);
      }
      if ((y & 7) === 7) yield;
    }
    for (let s = 0; s < shapesN; s++) {
      if (splits[s] <= 1) continue;
      const thresh = Math.max(28, Math.round(area[s] * 0.05)); let guard = 0, again = true;
      while (again && guard++ < 8) {
        again = false;
        for (let c = 0; c < splits[s]; c++) {
          if (!ca[s * 16 + c] || ca[s * 16 + c] >= thresh) continue;
          const nb = adj[s * 16 + c]; if (!nb || !nb.size) continue;
          let best = -1, bw = -1; for (const [nc, wgt] of nb) if (wgt > bw && ca[s * 16 + nc]) { bw = wgt; best = nc; }
          if (best < 0) for (const [nc, wgt] of nb) if (wgt > bw) { bw = wgt; best = nc; }
          if (best < 0 || best === c) continue;
          ca[s * 16 + best] += ca[s * 16 + c]; ca[s * 16 + c] = 0; remap[s * 16 + c] = best; again = true;
        }
      }
    }
    const find = (s, c) => { let g = 0; while (remap[s * 16 + c] !== c && g++ < 16) c = remap[s * 16 + c]; return c; };
    for (let p = 0; p < ids.length; p++) { const s = ids[p]; if (splits[s] > 1) cell[p] = find(s, cell[p]); }
  }
  function* detailRun(rast, shapeCols, palIn, level, seed, hooks) {
    const ctx = newCtx(hooks), ids = rast.ids, w = rast.w, h = rast.h, N = w * h, shapesN = shapeCols.length, rndRoot = (seed >>> 0) || 1;
    if (!w || !h || !shapesN || !palIn || !palIn.length) throw E('bad');
    ctx.begin('split', 0.08);
    const area = new Int32Array(shapesN), x0 = new Int32Array(shapesN).fill(1e9), y0 = new Int32Array(shapesN).fill(1e9), x1 = new Int32Array(shapesN).fill(-1), y1 = new Int32Array(shapesN).fill(-1);
    for (let p = 0; p < N; p++) {
      const s = ids[p]; if (s >= shapesN) continue; area[s]++;
      const x = p % w, y = (p / w) | 0;
      if (x < x0[s]) x0[s] = x; if (x > x1[s]) x1[s] = x; if (y < y0[s]) y0[s] = y; if (y > y1[s]) y1[s] = y;
      if ((p & 65535) === 65535) yield;
    }
    const lo = level >= 3 ? 4 : 2, hi = level >= 3 ? 6 : 3, mul = level >= 3 ? 5 : 2.5;
    const target = Math.max(shapesN * lo, Math.min(shapesN * hi, Math.round(shapesN * mul)));
    let extra = Math.max(0, target - shapesN);
    const splits = new Uint8Array(shapesN).fill(1), order = [];
    for (let i = 0; i < shapesN; i++) if (area[i] >= N * 0.005) order.push(i);
    order.sort((a, b) => area[b] - area[a] || a - b);
    const maxK = level >= 3 ? 8 : 4; let guard = 0;
    while (extra > 0 && guard++ < shapesN * 12) {
      let moved = false;
      for (const i of order) { if (splits[i] >= maxK) continue; splits[i]++; extra--; moved = true; if (!extra) break; }
      if (!moved) break;
    }
    const KINDS = ['facets', 'stripes', 'petals', 'scales', 'voronoi'], cell = new Uint8Array(N);
    for (let s = 0; s < shapesN; s++) {
      const k = splits[s]; if (k <= 1 || !area[s]) continue;
      const sub = rng((rndRoot + Math.imul(s + 1, 997)) >>> 0), kind = KINDS[(sub() * KINDS.length) | 0];
      const bb = { x0: x0[s], y0: y0[s], x1: x1[s], y1: y1[s], w: Math.max(1, x1[s] - x0[s] + 1), h: Math.max(1, y1[s] - y0[s] + 1) }, at = patternAt(kind, k, bb, sub);
      for (let y = y0[s]; y <= y1[s]; y++) for (let x = x0[s]; x <= x1[s]; x++) { const p = y * w + x; if (ids[p] === s) cell[p] = at(x, y); }
      yield;
    }
    yield* foldTiny(ids, cell, splits, w, h, area);
    ctx.begin('regions', 0.4);
    const keyOf = new Map(), reg = new Uint16Array(N), shapeOf = [], cellOf = []; let nReg = 0;
    for (let p = 0; p < N; p++) {
      const s = ids[p] < shapesN ? ids[p] : 0, c = splits[s] > 1 ? cell[p] : 0, key = s * 16 + c;
      let id = keyOf.get(key);
      if (id == null) { id = nReg++; if (nReg > 65000) throw E('busy'); keyOf.set(key, id); shapeOf.push(s); cellOf.push(c); }
      reg[p] = id;
      if ((p & 65535) === 65535) yield;
    }
    const STEP = level >= 3 ? [-0.09, 0, 0.10, 0.04] : [-0.08, 0.08], pal = [], used = new Map(), col = new Uint8Array(nReg);
    const colorFor = (base, step) => {
      const kk = base + ':' + (step || 0); if (used.has(kk)) return used.get(kk);
      if (step && pal.length >= 24) return colorFor(base, 0);
      if (pal.length >= 24) { for (const [key, idx] of used) if (key.startsWith(base + ':')) return idx; return 0; }
      used.set(kk, pal.length); pal.push(step ? tintHex(palIn[base], step) : palIn[base]); return pal.length - 1;
    };
    for (let i = 0; i < nReg; i++) {
      const s = shapeOf[i], base = Math.max(0, Math.min(palIn.length - 1, shapeCols[s] | 0));
      col[i] = colorFor(base, splits[s] > 1 ? STEP[cellOf[i] % STEP.length] : 0);
    }
    const cfg = { diff: level >= 3 ? 6 : 5, pal: pal.length, seed: rndRoot, sparkle: false, eps: 0.85, detail: level >= 3 ? 3 : 2 };
    const spz = yield* packShapePuzzle(reg, col, pal, w, h, nReg, cfg, ctx); spz.detail = { level: cfg.detail, regions: nReg, pal: pal.length, native: shapesN }; return spz;
  }
  function* packShapePuzzle(reg, col, pal, w, h, n, cfg, ctx) {
    const N = w * h;
    ctx.begin('spots', 0.62); ctx.alloc('dist', N * 2); const sp = yield* labelSpots(reg, n, w, h); ctx.free('dist');
    ctx.begin('trace', 0.75); ctx.alloc('vis', N); const per = yield* trace(reg, n, w, h, cfg.eps || 0.7); ctx.free('vis');
    ctx.begin('pack', 0.92);
    const s = WORLD / Math.max(w, h), bb = new Int16Array(n * 4), labs = new Int16Array(n * 4);
    for (let i = 0; i < n; i++) {
      bb[i * 4] = Math.max(0, Math.floor(sp.x0[i] * s - 6)); bb[i * 4 + 1] = Math.max(0, Math.floor(sp.y0[i] * s - 6)); bb[i * 4 + 2] = Math.ceil((sp.x1[i] + 1) * s + 6); bb[i * 4 + 3] = Math.ceil((sp.y1[i] + 1) * s + 6);
      const r = sp.best[i] / 3 * s; labs[i * 4] = Math.round((sp.bx[i] + 0.5) * s); labs[i * 4 + 1] = Math.round((sp.by[i] + 0.5) * s); labs[i * 4 + 2] = Math.round(Math.max(20, r)); labs[i * 4 + 3] = Math.round(clamp(1.6 * r, 16, 240));
    }
    const rings = encodeRings(per), rle = rleEnc(reg); ctx.end();
    const stored = { diff: cfg.diff, pal: cfg.pal, seed: cfg.seed, sparkle: !!cfg.sparkle, eps: cfg.eps || 0.7 };
    if (cfg.detail) stored.detail = cfg.detail;
    return { pv: PV, mode: 'shapes', w, h, W: Math.round(w * s), H: Math.round(h * s), s, pal, n, cfg: stored, data: { col, bb, lab: labs, rings, rle }, T: ctx.T, memPeak: ctx.peak };
  }

  // input src {rgba (Uint8ClampedArray), w, h}. Returns a puzzle object with typed arrays (transferable). Throws E(code).
  function* run(src, cfgIn, hooks) {
    const cfg = cfgIn.work ? cfgIn : cfgFor(cfgIn), ctx = newCtx(hooks), rnd = rng(cfg.seed);
    let { rgba, w, h } = src; if (!w || !h || rgba.length < w * h * 4) throw E('decode');
    ctx.alloc('rgba', rgba.length);
    if (cfg.mode === 'pixel') return yield* runPixel(rgba, w, h, cfg, ctx, rnd);
    ctx.begin('resize', 0.02);
    const k = Math.min(1, cfg.work / Math.max(w, h)); if (k < 1) { const tw = Math.max(1, Math.round(w * k)), th = Math.max(1, Math.round(h * k)); const o = yield* downscaleG(rgba, w, h, tw, th); rgba = o; w = tw; h = th; ctx.alloc('rgba', rgba.length); }
    const N = w * h; yield;
    ctx.begin('filter', 0.08); yield* smooth(rgba, w, h);
    let mask = null, protect = null, edge = null, maskFrac = 0;
    if ((cfg.diff | 0) >= 3) { ctx.begin('face', 0.12); const faceIn = yield* prepFace(rgba, w, h, cfg.diff | 0); if (faceIn) { mask = faceIn.mask; protect = faceIn.protect; edge = faceIn.edge; maskFrac = faceIn.frac; } }
    ctx.begin('kmeans', 0.2); const sm = yield* sampleLab(rgba, N, rnd); ctx.alloc('sample', sm.out.length * 4);
    const km = yield* kmeans(sm.out, sm.S, cfg.pal, rnd), td = tidy(km.C, km.cnt, km.k, cfg); ctx.free('sample');
    ctx.begin('map', 0.32); let ids = yield* mapAll(rgba, N, td.tgt, td.m); ctx.alloc('ids', N);
    if (mask) { ctx.begin('skin', 0.36); ids = yield* limitSkin(ids, w, h, mask, protect, td); }
    rgba = null; ctx.free('rgba');
    ctx.begin('mode', 0.4); ids = yield* modeFilter(ids, w, h, 2, protect);
    ctx.begin('regions', 0.5); let lab = null, reg = null, nn = 0, extra = 0;
    for (;;) {
      lab = yield* labelRegions(ids, w, h); if (lab) break;
      ids = yield* modeFilter(ids, w, h, 2, protect); if (++extra > 3) throw E('busy');
    }
    reg = lab.reg; nn = lab.n; ctx.alloc('reg', reg.length * 2);
    const tapF = [0, 0, 0, 0.00020, 0.00016, 0.00014, 0.00012][cfg.diff | 0] || 0;
    const baseMin = Math.max(cfg.minArea, Math.round(tapF * N)), skinMin = Math.round(baseMin * 2.5), featureMin = Math.max(16, Math.round(baseMin * 0.34));
    const minOf = mask ? regionMins(reg, nn, w, h, mask, edge, baseMin, skinMin, featureMin) : null;
    const mg = yield* mergeRegions(reg, nn, w, h, ids, td.tgt, baseMin, cfg.maxReg, minOf); ids = null; ctx.free('ids'); edge = null; protect = null;
    // drop unused palette colours, renumber
    const used = new Uint8Array(td.m); for (const c of mg.col) used[c] = 1; const remap = new Int16Array(td.m), pal = []; let q = 0;
    for (let i = 0; i < td.m; i++) if (used[i]) { remap[i] = q++; pal.push(td.pal[i]); }
    const col = Uint8Array.from(mg.col, c => remap[c]), n = mg.n;
    const face = mask ? faceStats(reg, n, col, pal, mask, N, maskFrac, baseMin, skinMin, featureMin) : null; mask = null;
    ctx.begin('spots', 0.62); ctx.alloc('dist', N * 2); const sp = yield* labelSpots(reg, n, w, h); ctx.free('dist');
    ctx.begin('trace', 0.75); ctx.alloc('vis', N); let eps = cfg.eps; let per = yield* trace(reg, n, w, h, eps); ctx.free('vis');
    ctx.begin('pack', 0.92);
    const s = WORLD / Math.max(w, h), bb = new Int16Array(n * 4), labs = new Int16Array(n * 4);
    for (let i = 0; i < n; i++) {
      bb[i * 4] = Math.max(0, Math.floor(sp.x0[i] * s - 6)); bb[i * 4 + 1] = Math.max(0, Math.floor(sp.y0[i] * s - 6)); bb[i * 4 + 2] = Math.ceil((sp.x1[i] + 1) * s + 6); bb[i * 4 + 3] = Math.ceil((sp.y1[i] + 1) * s + 6);
      const r = sp.best[i] / 3 * s; labs[i * 4] = Math.round((sp.bx[i] + 0.5) * s); labs[i * 4 + 1] = Math.round((sp.by[i] + 0.5) * s); labs[i * 4 + 2] = Math.round(Math.max(20, r)); labs[i * 4 + 3] = Math.round(clamp(1.6 * r, 16, 240));
    }
    const rings = encodeRings(per), rle = rleEnc(reg); ctx.end();
    const out = { pv: PV, mode: 'shapes', w, h, W: Math.round(w * s), H: Math.round(h * s), s, pal, n, cfg: { diff: cfg.diff, pal: cfg.pal, seed: cfg.seed, sparkle: cfg.sparkle, eps }, data: { col, bb, lab: labs, rings, rle }, T: ctx.T, memPeak: ctx.peak };
    if (face) out.face = face;
    return out;
  }

  function* runPixel(rgba, w, h, cfg, ctx, rnd) {
    ctx.begin('resize', 0.05);
    const long = Math.min(cfg.grid, Math.max(w, h)), gw = w >= h ? long : Math.max(1, Math.round(long * w / h)), gh = h > w ? long : Math.max(1, Math.round(long * h / w));
    const cells = yield* downscaleG(rgba, w, h, gw, gh), N = gw * gh; yield; rgba = null; ctx.free('rgba'); ctx.alloc('cells', cells.length);
    ctx.begin('kmeans', 0.3); const lab = new Float32Array(N * 3); for (let i = 0; i < N; i++) toLab(cells[i * 4], cells[i * 4 + 1], cells[i * 4 + 2], lab, i * 3);
    const km = yield* kmeans(lab, N, cfg.pal, rnd), td = tidy(km.C, km.cnt, km.k, cfg);
    ctx.begin('map', 0.6); let ids = new Uint8Array(N);
    for (let i = 0; i < N; i++) { let bd = 1e9, bk = 0; for (let k = 0; k < td.m; k++) { const d = (lab[i * 3] - td.tgt[k * 3]) ** 2 + (lab[i * 3 + 1] - td.tgt[k * 3 + 1]) ** 2 + (lab[i * 3 + 2] - td.tgt[k * 3 + 2]) ** 2; if (d < bd) { bd = d; bk = k; } } ids[i] = bk; if ((i & 1023) === 1023) yield; }
    if (cfg.grid >= 48) ids = yield* modeFilter(ids, gw, gh, 1);
    const used = new Uint8Array(td.m); for (let i = 0; i < N; i++) used[ids[i]] = 1; const remap = new Int16Array(td.m), pal = []; let q = 0;
    for (let i = 0; i < td.m; i++) if (used[i]) { remap[i] = q++; pal.push(td.pal[i]); }
    const out = new Uint8Array(N); for (let i = 0; i < N; i++) out[i] = remap[ids[i]]; ctx.end();
    const cs = WORLD / Math.max(gw, gh);
    return { pv: PV, mode: 'pixel', w: gw, h: gh, W: gw * cs, H: gh * cs, s: cs, pal, n: N, cfg: { diff: cfg.diff, pal: cfg.pal, seed: cfg.seed, sparkle: cfg.sparkle, grid: cfg.grid }, data: { cells: out }, T: ctx.T, memPeak: ctx.peak };
  }
  function drain(gen) { for (;;) { const r = gen.next(); if (r.done) return r.value; } }

  // ---------- inflate a puzzle record into drawable pieces (Path2D needs a browser) ----------
  const CUT = 3.5;   // corner rounding radius in WORK px
  function ringsToPath(P2D, per, s) {
    const out = [];
    for (const rs of per) {
      const p = new P2D();
      for (const r of rs) {
        const m = r.length >> 1; if (m < 3) continue; const X = i => r[((i + m) % m) * 2] * s, Y = i => r[((i + m) % m) * 2 + 1] * s, cut = CUT * s;
        for (let i = 0; i < m; i++) {
          const x = X(i), y = Y(i), ax = X(i - 1), ay = Y(i - 1), bx = X(i + 1), by = Y(i + 1), la = Math.hypot(ax - x, ay - y) || 1, lb = Math.hypot(bx - x, by - y) || 1, ta = Math.min(0.25, cut / la), tb = Math.min(0.25, cut / lb);
          const sx = x + (ax - x) * ta, sy = y + (ay - y) * ta, ex = x + (bx - x) * tb, ey = y + (by - y) * tb;
          if (i === 0) p.moveTo(sx, sy); else p.lineTo(sx, sy); p.quadraticCurveTo(x, y, ex, ey);
        }
        p.closePath();
      }
      out.push(p);
    }
    return out;
  }
  function inflate(pz, P2D) {
    const d = pz.data; if (pz.mode === 'pixel') return { mode: 'pixel', gw: pz.w, gh: pz.h, cs: pz.s, cells: d.cells, s: pz.s };
    const n = pz.n, paths = ringsToPath(P2D, decodeRings(d.rings, n), pz.s), bb = [], lab = [];
    for (let i = 0; i < n; i++) { bb.push([d.bb[i * 4], d.bb[i * 4 + 1], d.bb[i * 4 + 2], d.bb[i * 4 + 3]]); lab.push([d.lab[i * 4], d.lab[i * 4 + 1], d.lab[i * 4 + 2], d.lab[i * 4 + 3]]); }
    const map = rleDec(d.rle, pz.w * pz.h); for (let i = 0; i < map.length; i++) if (map[i] >= n) throw E('bad');
    return { mode: 'shapes', paths, bb, lab, col: d.col, map, mw: pz.w, mh: pz.h, s: pz.s };
  }
  // finished-look thumbnail, long side `size`, drawn straight from the paths (P5: no big framebuffer). mk(w,h) makes a canvas
  function drawThumb(pz, inf, size, mk) {
    const k = size / Math.max(pz.W, pz.H), cw = Math.max(1, Math.round(pz.W * k)), ch = Math.max(1, Math.round(pz.H * k)), c = mk(cw, ch), x = c.getContext('2d');
    x.fillStyle = '#fff1ee'; x.fillRect(0, 0, cw, ch); x.setTransform(k, 0, 0, k, 0, 0);
    if (inf.mode === 'pixel') {
      for (let i = 0; i < pz.n; i++) { x.fillStyle = pz.pal[inf.cells[i]]; x.fillRect((i % inf.gw) * inf.cs, ((i / inf.gw) | 0) * inf.cs, inf.cs + 0.6, inf.cs + 0.6); }
    } else {
      x.lineJoin = 'round'; x.lineWidth = 8; x.strokeStyle = '#b2346f';
      for (let i = 0; i < pz.n; i++) { x.fillStyle = pz.pal[inf.col[i]]; x.fill(inf.paths[i]); x.stroke(inf.paths[i]); }
    }
    return c;
  }
  // sanity check of a stored puzzle (throws on anything odd, so the caller can quarantine the record)
  function check(pz) {
    if (!pz || pz.pv !== PV || !Array.isArray(pz.pal) || !pz.pal.length || pz.pal.length > 32 || !(pz.n > 0) || pz.n > 65000 || !pz.data) throw E('bad');
    for (const c of pz.pal) if (typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)) throw E('bad');
    const d = pz.data;
    if (pz.mode === 'pixel') { if (!(d.cells instanceof Uint8Array) || d.cells.length !== pz.w * pz.h || pz.w * pz.h !== pz.n) throw E('bad'); for (let i = 0; i < d.cells.length; i++) if (d.cells[i] >= pz.pal.length) throw E('bad'); return true; }
    if (pz.mode !== 'shapes' || !(d.col instanceof Uint8Array) || d.col.length !== pz.n || !(d.rings instanceof Int16Array) || !(d.bb instanceof Int16Array) || d.bb.length !== pz.n * 4 || !(d.lab instanceof Int16Array) || d.lab.length !== pz.n * 4 || !(d.rle instanceof Uint8Array)) throw E('bad');
    for (let i = 0; i < d.col.length; i++) if (d.col[i] >= pz.pal.length) throw E('bad');
    const st = d.rings; let p = 0;   // walk the delta stream: every count must stay inside the array and end exactly at its length
    for (let i = 0; i < pz.n; i++) { if (p >= st.length) throw E('bad'); const nr = st[p++]; if (nr < 0 || nr > 5000) throw E('bad'); for (let k = 0; k < nr; k++) { if (p >= st.length) throw E('bad'); const m = st[p++]; if (m < 3 || p + 2 * m > st.length) throw E('bad'); p += 2 * m; } }
    if (p !== st.length) throw E('bad');
    return true;
  }

  g.CBN = { PV, WORLD, PRE, cfgFor, rng, sniff, decodeFile, downscale, smooth, kmeans, tidy, modeFilter, labelRegions, mergeRegions, labelSpots, trace, dpRing, encodeRings, decodeRings, resimplify, rleEnc, rleDec, run, drain, inflate, ringsToPath, drawThumb, check, toLab, fromLab, E, MAXB, skinLab, isSkinHex, prepFace, rasterShapes, detailRun };
})(typeof self !== 'undefined' ? self : this);
