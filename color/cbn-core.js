// Color Magic photo pipeline core (pv:1). Pure, deterministic functions (seeded PRNG), shared by worker.js and the main-thread fallback.
// Heavy steps are generators that yield often, so the fallback can slice them into <=12 ms chunks; the worker just drains them.
// Original IP only. No network. Nothing here stores or returns the original file: only WORK-size pixels go in, a derived puzzle comes out.
(function (g) {
  'use strict';
  const PV = 1, WORLD = 2048, MAXB = 40 * 1048576, MPX = 12.5e6;
  const E = (code, msg) => { const e = new Error(msg || code); e.code = code; return e; };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- presets (levels 1-4 unchanged; 5-6 are the v9 harder levels; palette stays inside the 4-24 clamp, 4-32 for the 4K preset only) ----------
  const PRE = [null,
    { id: 1, name: 'Tiny sparkle', work: 512, pal: 6, minArea: 900, maxReg: 45, grid: 20, gpal: 6 },
    { id: 2, name: 'Pretty picture', work: 512, pal: 10, minArea: 350, maxReg: 110, grid: 32, gpal: 8 },
    { id: 3, name: 'Big adventure', work: 768, pal: 14, minArea: 220, maxReg: 220, grid: 48, gpal: 12 },
    { id: 4, name: 'Giant quest', work: 1024, pal: 20, minArea: 140, maxReg: 400, grid: 48, gpal: 16 },
    { id: 5, name: 'Super star', work: 1024, pal: 22, minArea: 90, maxReg: 650, grid: 64, gpal: 20 },
    { id: 6, name: 'Master artist', work: 1280, pal: 24, minArea: 60, maxReg: 900, grid: 80, gpal: 24 },
    // 7 = opt-in "Super sharp" (4K) for uploaded photos only, shown when the grown-up switch is on. Not part of the unlock ladder.
    // Work 3840 = 9x the pixels of level 6, so minArea 540 keeps level 6's smallest tap size; up to 32 colours, more regions.
    { id: 7, name: 'Super sharp', work: 3840, pal: 32, minArea: 540, maxReg: 1400, grid: 80, gpal: 24, k4: true }];
  function cfgFor(o) {
    const p = PRE[o.diff | 0] || PRE[1], mode = o.mode === 'pixel' ? 'pixel' : 'shapes';
    const c = { mode, diff: p.id, seed: (o.seed >>> 0) || 1, sparkle: !!o.sparkle, preview: !!o.preview, eps: o.eps || 0.7 };
    if (mode === 'pixel') { c.grid = clamp(o.grid | 0 || p.grid, 8, 80); c.pal = clamp(o.pal | 0 || p.gpal, 4, 24); c.work = 512; }
    else { c.work = p.work; c.pal = clamp(o.pal | 0 || p.pal, 4, p.k4 ? 32 : 24); c.minArea = p.minArea; c.maxReg = p.maxReg; if (p.k4) c.k4 = 1; }
    if (c.preview) { const pv = 512, k = pv / c.work; c.work = pv; if (c.minArea) c.minArea = Math.max(12, Math.round(c.minArea * k * k)); }
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
  // lo (optional): also return a second copy at <= lo px (the 4K switch keeps a 1280 copy for levels 1-6 and previews)
  async function decodeFile(file, work, mk, yieldFn, lo) {
    if (!file || file.size > MAXB) throw E('big');
    const s = sniff(new Uint8Array(await file.slice(0, 1 << 20).arrayBuffer()));
    const sw = s.orient >= 5 ? s.h : s.w, sh = s.orient >= 5 ? s.w : s.h;   // oriented size
    if (Math.min(sw, sh) < 8) throw E('small');
    const k = Math.min(1, work / Math.max(sw, sh)), tw = Math.max(1, Math.round(sw * k)), th = Math.max(1, Math.round(sh * k));
    let bm = null;
    try {
      try { bm = await createImageBitmap(file, { imageOrientation: 'from-image', resizeWidth: tw, resizeHeight: th, resizeQuality: 'high' }); }
      catch (e) { if (s.type === 'heic' || sw * sh > 50e6) throw E('decode'); bm = null; }
      if (!bm) {   // resize options refused: full-size decode only for pictures up to 12.5 MP (4000x3000 phone photos), then halved below (P1)
        if (sw * sh > MPX) throw E('resize');
        try { bm = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bm = await createImageBitmap(file); }
      }
      if (Math.max(bm.width, bm.height) > work * 1.02 && bm.width * bm.height > MPX) throw E('resize');   // resize options ignored on a huge picture
      const BAND = 60000;   // main thread: draw in row bands of ~60k px with a yield between them so no task runs long
      const bands = async (x, src, w, h, srcH) => { if (!yieldFn) { x.drawImage(src, 0, 0, w, h); return; } const band = Math.max(8, Math.floor(BAND / w)), ky = srcH / h; for (let y = 0; y < h; y += band) { const hh = Math.min(band, h - y); x.drawImage(src, 0, y * ky, src.width, hh * ky, 0, y, w, hh); await yieldFn(); } };
      const draw = async long => {
        const sc = Math.min(1, long / Math.max(bm.width, bm.height)), cw = Math.max(1, Math.round(bm.width * sc)), ch = Math.max(1, Math.round(bm.height * sc));
        let src = bm;   // more than 2x too big (no resize-on-decode): halve in steps first, so the last step is a clean <= 2x downscale
        while (src.width > cw * 2 && src.height > ch * 2) {
          const hw = Math.ceil(src.width / 2), hh = Math.ceil(src.height / 2), hc = mk(hw, hh), hx = hc.getContext('2d'); hx.imageSmoothingQuality = 'high';
          await bands(hx, src, hw, hh, src.height); if (src !== bm) src.width = src.height = 1; src = hc;
        }
        const c = mk(cw, ch), x = c.getContext('2d', { willReadFrequently: true });
        x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch); x.imageSmoothingQuality = 'high';
        if (!yieldFn) { x.drawImage(src, 0, 0, cw, ch); if (src !== bm) src.width = src.height = 1; const id = x.getImageData(0, 0, cw, ch); c.width = c.height = 1; return { rgba: id.data, w: cw, h: ch }; }
        const out = new Uint8ClampedArray(cw * ch * 4), band = Math.max(8, Math.floor(BAND / cw)), ky = src.height / ch;
        for (let y = 0; y < ch; y += band) { const hh = Math.min(band, ch - y); x.drawImage(src, 0, y * ky, src.width, hh * ky, 0, y, cw, hh); out.set(x.getImageData(0, y, cw, hh).data, y * cw * 4); await yieldFn(); }
        if (src !== bm) src.width = src.height = 1; c.width = c.height = 1; return { rgba: out, w: cw, h: ch };
      };
      const r = await draw(work); Object.assign(r, { type: s.type, srcW: sw, srcH: sh });
      if (lo && lo < work && Math.max(r.w, r.h) > lo) r.lo = await draw(lo);
      return r;
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
    return { C, cnt, k, asg };
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
  // own: the caller is done with ids, so its buffer is reused for the second pass (CC 8)
  function* modeFilter(ids, w, h, passes, protect, own) {
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
      const t = src; src = dst; dst = (t === ids && !own) ? new Uint8Array(w * h) : t;
    }
    return src;
  }

  // ---------- components (4-connected scanline fill) ----------
  function* labelRegions(ids, w, h) {
    const reg = new Uint16Array(w * h); let stack = new Int32Array(4096), sp = 0, n = 0, steps = 0;
    const push = (x, y) => { if (sp + 2 > stack.length) { const s2 = new Int32Array(stack.length * 2); s2.set(stack); stack = s2; } stack[sp++] = x; stack[sp++] = y; };
    for (let y0 = 0; y0 < h; y0++) {
      for (let x0 = 0; x0 < w; x0++) {
        if (reg[y0 * w + x0]) continue; if (n >= 65534) return null; n++; const c = ids[y0 * w + x0]; push(x0, y0);
        while (sp) {
          if ((++steps & 255) === 0) yield;
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
  // keep (faces, levels 5-6): extra regions allowed over maxReg, but only outside the skin mask (inner marks regions
  // mostly inside it). Those are still squeezed as if the cap were maxReg, so the face stays as calm as before.
  function* mergeRegions(reg, n, w, h, ids, tgt, minArea, maxReg, minOf, skinOf, byFloor, keep, inner) {
    const need = i => minOf ? minOf[i] : minArea;
    const area = new Int32Array(n + 1), col = new Uint8Array(n + 1), par = new Int32Array(n + 1), adj = new Array(n + 1);
    for (let i = 1; i <= n; i++) { par[i] = i; adj[i] = new Map(); }
    for (let p = 0; p < w * h; p++) { const r = reg[p]; area[r]++; col[r] = ids[p]; if ((p & 262143) === 262143) yield; }
    const edge = (a, b) => { if (a === b) return; adj[a].set(b, (adj[a].get(b) || 0) + 1); adj[b].set(a, (adj[b].get(a) || 0) + 1); };
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) { const p = y * w + x, r = reg[p]; if (x < w - 1) edge(r, reg[p + 1]); if (y < h - 1) edge(r, reg[p + w]); } if ((y & 1) === 1) yield; }
    const K = 131072, heap = []; const hpush = v => { let i = heap.length; heap.push(v); while (i > 0) { const q = (i - 1) >> 1; if (heap[q] <= heap[i]) break; const t = heap[q]; heap[q] = heap[i]; heap[i] = t; i = q; } };
    const hpop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l] < heap[m]) m = l; if (r < heap.length && heap[r] < heap[m]) m = r; if (m === i) break; const t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m; } } return top; };
    // byFloor (faces, level 4+): the heap orders by area over the region's own floor, so the maxReg squeeze takes
    // plain specks before a nostril or a lash line; otherwise it is plain area, as before
    const pri = byFloor && minOf ? i => Math.floor(area[i] * 1024 / Math.max(1, minOf[i])) : i => area[i];
    const dead = new Uint8Array(n + 1); let live = n; for (let i = 1; i <= n; i++) hpush(pri(i) * K + i);
    const fuse = (a, b) => {   // a dies into b
      for (const [c, wgt] of adj[a]) { if (c === b) continue; adj[c].delete(a); adj[c].set(b, (adj[c].get(b) || 0) + wgt); adj[b].set(c, (adj[b].get(c) || 0) + wgt); }
      adj[b].delete(a); adj[a] = null; area[b] += area[a]; dead[a] = 1; par[a] = b; live--; hpush(pri(b) * K + b);
    };
    const colD = (a, b) => (tgt[a * 3] - tgt[b * 3]) ** 2 + (tgt[a * 3 + 1] - tgt[b * 3 + 1]) ** 2 + (tgt[a * 3 + 2] - tgt[b * 3 + 2]) ** 2;
    let under = 0; for (let i = 1; i <= n; i++) if (area[i] < need(i)) under++;
    const absorb = (a, b) => {   // a dies into b; keep the count of regions still under their own floor
      const aU = area[a] < need(a), bU = area[b] < need(b); fuse(a, b); if (aU) under--; if (bU && area[b] >= need(b)) under--;
    };
    if (skinOf) {   // adjacent skin whose OKLab dE is under about 6 becomes one region, whatever its size
      const lim = 0.06; let guard = 0, changed = true;
      while (changed && guard++ < 8) {
        changed = false;
        for (let a = 1; a <= n; a++) {
          if (dead[a] || !skinOf[a] || !adj[a]) continue;
          for (const c of [...adj[a].keys()]) {
            if (!skinOf[c] || dead[c]) continue;
            const ia = col[a] * 3, ib = col[c] * 3;
            if (Math.hypot(tgt[ia] - tgt[ib], tgt[ia + 1] - tgt[ib + 1], tgt[ia + 2] - tgt[ib + 2]) < lim) { absorb(a, c); changed = true; break; }
          }
        }
        yield;
      }
    }
    let cycles = 0; const cap = maxReg + (inner && keep > 0 ? keep : 0); let kept = 0;
    while (heap.length) {
      const top = hpop(), a = top % K; if (dead[a] || pri(a) !== Math.floor(top / K)) continue; const ar = area[a];
      if (under === 0 && live <= cap) {
        if (cap === maxReg || live - kept <= maxReg) break;
        if (!inner[a] && ar >= minArea) { kept++; continue; }   // the old cap would have merged this one; keep it
      }
      if (!adj[a].size) continue;   // nothing to merge into
      if (ar >= need(a) && live <= cap && under > 0) continue;   // this one is already big enough; a neighbour may still be under its own floor
      let bn = -1, bw = -1, bdist = 1e9;
      for (const [c, wgt] of adj[a]) { const d = colD(col[a], col[c]); if (wgt > bw || (wgt === bw && (d < bdist || (d === bdist && c < bn)))) { bw = wgt; bn = c; bdist = d; } }
      absorb(a, bn);
      for (let again = true; again;) { again = false; for (const c of [...adj[bn].keys()]) if (col[c] === col[bn]) { absorb(c, bn); again = true; break; } }
      if ((++cycles & 15) === 0) yield;
    }
    const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const nid = new Int32Array(n + 1).fill(-1); let m = 0; const colOut = [];
    for (let p = 0; p < w * h; p++) { const r = find(reg[p]); if (nid[r] < 0) { nid[r] = m++; colOut.push(col[r]); } reg[p] = nid[r]; if ((p & 65535) === 65535) yield; }
    return { n: m, col: Uint8Array.from(colOut) };
  }

  // ---------- number spots: two-pass chamfer (3-4) distance over the region map, pole of inaccessibility per region + bbox ----------
  // wantExtra: long regions also keep up to 2 local maxima at least 3r from the main spot and from each other.
  function* labelSpots(reg, n, w, h, wantExtra) {
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
    // safety net (v9 QA P1): a region with no inner pixel kept bx/by = 0, so its number sat in the picture's top-left corner.
    // foldSpotless() merges those first; anything left still gets one of its own pixels (the one nearest its box centre).
    let flat = 0; for (let r = 0; r < n; r++) if (!best[r] && x1[r] >= 0) flat++;
    if (flat) {
      const bd = new Float64Array(n).fill(1e18);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) { const r = reg[y * w + x]; if (best[r]) continue; const d = (x - (x0[r] + x1[r]) / 2) ** 2 + (y - (y0[r] + y1[r]) / 2) ** 2; if (d < bd[r]) { bd[r] = d; bx[r] = x; by[r] = y; } }
        if ((y & 7) === 7) yield;
      }
    }
    let ex = null, ey = null, ed = null;
    if (wantExtra) {
      ex = new Int16Array(n * 2).fill(-1); ey = new Int16Array(n * 2).fill(-1); ed = new Uint16Array(n * 2);
      const long = new Uint8Array(n);
      for (let r = 0; r < n; r++) {
        if (!best[r]) continue;
        const rad = best[r] / 3; if (rad < 1.5) continue;
        if (Math.max(x1[r] - x0[r], y1[r] - y0[r]) >= rad * 6) long[r] = 1;
      }
      const put = (r, x, y, d) => {
        const sep = best[r] + 1.5, sep2 = sep * sep;   // 3r plus a pixel, so rounding into world space stays at least 3r apart
        const dx0 = x - bx[r], dy0 = y - by[r]; if (dx0 * dx0 + dy0 * dy0 < sep2) return;
        let slot = -1, worst = 65535;
        for (let k = 0; k < 2; k++) {
          const ox = ex[r * 2 + k];
          if (ox < 0) { slot = k; break; }
          const dx = x - ox, dy = y - ey[r * 2 + k];
          if (dx * dx + dy * dy < sep2) { if (d > ed[r * 2 + k]) { ex[r * 2 + k] = x; ey[r * 2 + k] = y; ed[r * 2 + k] = d; } return; }
          if (ed[r * 2 + k] < worst) { worst = ed[r * 2 + k]; slot = k; }
        }
        if (slot < 0 || (ex[r * 2 + slot] >= 0 && d <= ed[r * 2 + slot])) return;
        ex[r * 2 + slot] = x; ey[r * 2 + slot] = y; ed[r * 2 + slot] = d;
      };
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x, d = dist[p]; if (d < 9) continue;
          const r = reg[p]; if (!long[r]) continue;
          if (d < dist[p - 1] || d < dist[p + 1] || d < dist[p - w] || d < dist[p + w] || d < dist[p - w - 1] || d < dist[p - w + 1] || d < dist[p + w - 1] || d < dist[p + w + 1]) continue;
          put(r, x, y, d);
        }
        if ((y & 7) === 7) yield;
      }
    }
    return { best, bx, by, x0, y0, x1, y1, ex, ey, ed };
  }
  function zoomDeep(cfg) { const t = cfg && (cfg.tier | 0); return t === 4 ? 32 : t === 3 ? 24 : 12; }
  function spotSize(r, loose) { return Math.round(clamp(1.6 * Math.max(0, r), loose ? 8 : 16, 240)); }
  function writeMain(labs, i, x, y, r, loose) {
    labs[i * 4] = Math.round(x); labs[i * 4 + 1] = Math.round(y);
    labs[i * 4 + 2] = Math.round(loose ? Math.max(0, r) : Math.max(20, r));
    labs[i * 4 + 3] = spotSize(r, loose);
  }
  // Reveal zoom zr = 11 css px / digit size, so a spot appears once it is readable. Extras whose own r would stay under 11 css px even at the tier's deepest zoom are dropped.
  function extraLabs(sp, n, s, loose, zDeep) {
    if (!sp.ex) return null;
    const minR = 11 / (1.6 * (zDeep || 12)), xlab = new Int16Array(n * 8);
    for (let i = 0; i < xlab.length; i++) xlab[i] = -1;
    let any = 0;
    for (let i = 0; i < n; i++) {
      if (sp.best[i] / 3 * s < minR) continue;
      for (let k = 0; k < 2; k++) {
        const ex = sp.ex[i * 2 + k]; if (ex < 0) continue;
        const r = sp.ed[i * 2 + k] / 3 * s; if (r < minR) continue;
        const o = i * 8 + k * 4;
        xlab[o] = Math.round((ex + 0.5) * s); xlab[o + 1] = Math.round((sp.ey[i * 2 + k] + 0.5) * s);
        xlab[o + 2] = Math.round(loose ? Math.max(0, r) : Math.max(20, r)); xlab[o + 3] = spotSize(r, loose); any++;
      }
    }
    return any ? xlab : null;
  }
  function spotRec(x, y, r, size) { const sz = size | 0; return [x | 0, y | 0, r | 0, sz, sz > 0 ? 11 / sz : 99]; }
  // v9 QA P1: a region with no inner pixel (every pixel touches another region or the picture edge, the same test labelSpots
  // uses) can never get a number spot: anti-aliased fringe pixels of the Expert splits (54% of Expert regions) and thin slivers
  // left after a photo merge. Each such pixel joins the neighbouring region that has an inner pixel (4-neighbours count
  // double), a few passes until none is left; then ids are made compact again. Regions with a spot keep every pixel they had.
  function* foldSpotless(reg, n, w, h, col) {
    const N = w * h, good = new Uint8Array(n), area = new Int32Array(n);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x, r = reg[p]; area[r]++;
        if (!good[r] && x > 0 && y > 0 && x < w - 1 && y < h - 1 && reg[p - 1] === r && reg[p + 1] === r && reg[p - w] === r && reg[p + w] === r) good[r] = 1;
      }
      if ((y & 15) === 15) yield;
    }
    let bad = 0; for (let r = 0; r < n; r++) if (area[r] && !good[r]) bad++;
    if (!bad) return { n, col, folded: 0 };
    let cnt = 0; for (let p = 0; p < N; p++) if (!good[reg[p]]) cnt++;
    let list = new Int32Array(cnt); cnt = 0; for (let p = 0; p < N; p++) if (!good[reg[p]]) list[cnt++] = p;
    yield;
    const tp = new Int32Array(list.length), tr = new Int32Array(list.length), cand = new Int32Array(8), wt = new Int32Array(8);
    for (let pass = 0; pass < 64 && list.length; pass++) {
      let k = 0;
      for (let i = 0; i < list.length; i++) {
        const p = list[i], x = p % w, y = (p / w) | 0; let m = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx; if ((!dx && !dy) || xx < 0 || xx >= w) continue;
            const q = reg[yy * w + xx]; if (!good[q]) continue;
            const g2 = dx && dy ? 1 : 2; let j = 0; while (j < m && cand[j] !== q) j++;
            if (j === m) { cand[m] = q; wt[m] = 0; m++; } wt[j] += g2;
          }
        }
        if (!m) continue;
        let b = 0; for (let j = 1; j < m; j++) if (wt[j] > wt[b] || (wt[j] === wt[b] && cand[j] < cand[b])) b = j;
        tp[k] = p; tr[k] = cand[b]; k++;
      }
      if (!k) break;
      for (let i = 0; i < k; i++) reg[tp[i]] = tr[i];   // applied after the pass, so the scan order does not pull pixels one way
      let j = 0; for (let i = 0; i < list.length; i++) if (!good[reg[list[i]]]) list[j++] = list[i];
      list = list.subarray(0, j); yield;
    }
    area.fill(0); for (let p = 0; p < N; p++) area[reg[p]]++;
    const nid = new Int32Array(n).fill(-1), colOut = []; let m = 0;
    for (let r = 0; r < n; r++) if (area[r]) { nid[r] = m++; colOut.push(col[r]); }
    if (m !== n) for (let p = 0; p < N; p++) { reg[p] = nid[reg[p]]; if ((p & 262143) === 262143) yield; }
    return { n: m, col: Uint8Array.from(colOut), folded: n - m };
  }

  // ---------- crack-following trace: interior always on the right; one ring per boundary loop, corners only ----------
  function* trace(reg, n, w, h, eps) {
    const vis = new Uint8Array(w * h), DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; let steps = 0;
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
            if ((++steps & 32767) === 0) yield;
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
  function* rleEncG(reg) {
    const o = []; const vi = v => { while (v >= 128) { o.push((v & 127) | 128); v >>>= 7; } o.push(v); };
    let i = 0, N = reg.length, mark = 262144; while (i < N) { const v = reg[i]; let j = i + 1; while (j < N && reg[j] === v) j++; vi(v); vi(j - i); i = j; if (i >= mark) { mark = i + 262144; yield; } }
    return Uint8Array.from(o);
  }
  const rleEnc = reg => drain(rleEncG(reg));
  function* rleDecG(b, N) {   // yields about every 256K pixels (CC 8: a 4K map is 11M pixels)
    const out = new Uint16Array(N); let p = 0, q = 0, mark = 262144; const vi = () => { let v = 0, s = 0, c; do { c = b[p++]; v |= (c & 127) << s; s += 7; } while (c & 128); return v; };
    while (p < b.length && q < N) { const v = vi(), n = vi(); out.fill(v, q, q + n); q += n; if (q >= mark) { mark = q + 262144; yield; } } return out;
  }
  const rleDec = (b, N) => drain(rleDecG(b, N));

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
    for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) { const a = y - r < 0 ? 0 : y - r, b = y + r >= h ? h - 1 : y + r; let v = 0; for (let k = a; k <= b; k++) if (t[k * w + x]) { v = 1; break; } o[y * w + x] = v; } if ((x & 7) === 7) yield; }
    return o;
  }
  function* erodeMask(m, w, h, r) {
    const t = new Uint8Array(m.length), o = new Uint8Array(m.length);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) { const a = x - r < 0 ? 0 : x - r, b = x + r >= w ? w - 1 : x + r; let v = 1; for (let k = a; k <= b; k++) if (!m[row + k]) { v = 0; break; } t[row + x] = v; }
      if ((y & 7) === 7) yield;
    }
    for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) { const a = y - r < 0 ? 0 : y - r, b = y + r >= h ? h - 1 : y + r; let v = 1; for (let k = a; k <= b; k++) if (!t[k * w + x]) { v = 0; break; } o[y * w + x] = v; } if ((x & 7) === 7) yield; }
    return o;
  }
  // keeps only the largest 4-connected component of mask (in place). CC 8: a 1-byte seen map + the seed of the biggest
  // component, refilled from that seed (was a 4-byte label per pixel: 44 MB at 4K). Same result, first-largest wins as before.
  function* largestMask(mask, w, h) {
    const seen = new Uint8Array(mask.length); let stack = new Int32Array(8192), sp = 0, steps = 0, bn = 0, seed = -1;
    const push = p => { if (sp >= stack.length) { const s2 = new Int32Array(stack.length * 2); s2.set(stack); stack = s2; } stack[sp++] = p; };
    const fill = function* (p0) {
      let sz = 0; seen[p0] = 1; push(p0);
      while (sp) {
        const p = stack[--sp]; sz++; const px = p % w, py = (p / w) | 0;
        if (px > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; push(p - 1); }
        if (px + 1 < w && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; push(p + 1); }
        if (py > 0 && mask[p - w] && !seen[p - w]) { seen[p - w] = 1; push(p - w); }
        if (py + 1 < h && mask[p + w] && !seen[p + w]) { seen[p + w] = 1; push(p + w); }
        if ((++steps & 32767) === 0) yield;
      }
      return sz;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p0 = y * w + x; if (!mask[p0] || seen[p0]) continue;
        const sz = yield* fill(p0); if (sz > bn) { bn = sz; seed = p0; }
      }
      if ((y & 15) === 15) yield;
    }
    if (!bn) return 0;
    seen.fill(0); yield* fill(seed); mask.set(seen);
    return bn;
  }
  // bb = [x0, y0, x1, y1] of the mask: only mask pixels are read or written, so the copy covers that box only (CC 8: was a full-size copy)
  function* bilateral(rgba, w, h, mask, protect, rad, sigma, passes, bb) {
    const ker = [];
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy > rad * rad) continue;
      ker.push(dx, dy, Math.exp(-(dx * dx + dy * dy) / (rad * rad)));
    }
    const [bx0, by0, bx1, by1] = bb, bw = bx1 - bx0 + 1, lim = sigma * sigma, src = new Uint8ClampedArray(bw * (by1 - by0 + 1) * 4), kn = ker.length / 3;
    for (let pass = 0; pass < passes; pass++) {
      for (let y = by0; y <= by1; y++) src.set(rgba.subarray((y * w + bx0) * 4, (y * w + bx1 + 1) * 4), (y - by0) * bw * 4);
      for (let y = by0; y <= by1; y++) {
        for (let x = bx0; x <= bx1; x++) {
          const p = y * w + x; if (!mask[p] || (protect && protect[p])) continue;
          const o = p * 4, so = ((y - by0) * bw + x - bx0) * 4, r0 = src[so], g0 = src[so + 1], b0 = src[so + 2]; let rs = 0, gs = 0, bs = 0, ws = 0;
          for (let k = 0; k < kn; k++) {
            const xx = x + ker[k * 3], yy = y + ker[k * 3 + 1]; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const q = yy * w + xx; if (!mask[q]) continue;
            const qo = ((yy - by0) * bw + xx - bx0) * 4, dr = src[qo] - r0, dg = src[qo + 1] - g0, db = src[qo + 2] - b0;
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
    // CC 8: lightness lives in a 3-row ring (was a full-size Float32 copy, 44 MB at 4K); Float32 rows keep the exact old values
    const edge = new Float32Array(N), protect = new Uint8Array(N), lr = new Float32Array(w * 3), lumOf = p => (0.299 * rgba[p * 4] + 0.587 * rgba[p * 4 + 1] + 0.114 * rgba[p * 4 + 2]) / 255;
    const row = y => { const o = (y % 3) * w; for (let x = 0; x < w; x++) lr[o + x] = lumOf(y * w + x); };
    row(0); if (h > 1) row(1);
    for (let y = 1; y < h - 1; y++) {
      row(y + 1); const a = ((y - 1) % 3) * w, c = (y % 3) * w, b = ((y + 1) % 3) * w;
      for (let x = 1; x < w - 1; x++) { const gx = lr[c + x + 1] - lr[c + x - 1], gy = lr[b + x] - lr[a + x]; edge[y * w + x] = Math.abs(gx) + Math.abs(gy); }
      if ((y & 7) === 7) yield;
    }
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let p = 0; p < N; p++) { if (closed[p]) { const x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } if ((p & 262143) === 262143) yield; }
    const bb = [x0, y0, x1, y1], padX = Math.round((x1 - x0) * 0.08), padY = Math.round((y1 - y0) * 0.08);
    x0 = Math.max(0, x0 - padX); y0 = Math.max(0, y0 - padY); x1 = Math.min(w - 1, x1 + padX); y1 = Math.min(h - 1, y1 + padY);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const p = y * w + x;
        if (closed[p]) { if (edge[p] > 0.20) protect[p] = 1; }
        else if (edge[p] > 0.12 || Math.fround(lumOf(p)) < 0.34) protect[p] = 1;
      }
      if ((y & 31) === 31) yield;
    }
    yield* bilateral(rgba, w, h, closed, protect, 2, diff >= 5 ? 42 : 24, diff >= 5 ? 2 : 1, bb);
    return { mask: closed, protect, edge, frac };
  }
  function* limitSkin(ids, w, h, mask, protect, td) {
    const m = td.m, N = w * h, tgt = td.tgt, skin = [];
    for (let k = 0; k < m; k++) if (skinLab(tgt[k * 3], tgt[k * 3 + 1], tgt[k * 3 + 2])) skin.push(k);
    const dead = new Uint8Array(m); let live = skin.length;
    const near = 0.06 * 0.06;   // OKLab dE about 6: keep a third tone only when it is actually different
    while (live > 2) {
      let bi = -1, bj = -1, bd = 1e9;
      for (let a = 0; a < skin.length; a++) {
        const i = skin[a]; if (dead[i]) continue;
        for (let b = a + 1; b < skin.length; b++) {
          const j = skin[b]; if (dead[j]) continue;
          const d = (tgt[i * 3] - tgt[j * 3]) ** 2 + (tgt[i * 3 + 1] - tgt[j * 3 + 1]) ** 2 + (tgt[i * 3 + 2] - tgt[j * 3 + 2]) ** 2;
          if (d < bd) { bd = d; bi = i; bj = j; }
        }
      }
      if (bi < 0) break;
      if (live <= 3 && bd >= near) break;
      dead[bj] = 1; live--; yield;
    }
    const liveSkin = []; for (const k of skin) if (!dead[k]) liveSkin.push(k);
    const map = new Uint8Array(m); for (let k = 0; k < m; k++) map[k] = k;
    for (const j of skin) if (dead[j]) {
      let bd = 1e9, bk = liveSkin[0] || j;
      for (const i of liveSkin) { const d = (tgt[i * 3] - tgt[j * 3]) ** 2 + (tgt[i * 3 + 1] - tgt[j * 3 + 1]) ** 2 + (tgt[i * 3 + 2] - tgt[j * 3 + 2]) ** 2; if (d < bd) { bd = d; bk = i; } }
      map[j] = bk;
    }
    const skinSet = new Uint8Array(m); for (const k of liveSkin) skinSet[k] = 1;
    const out = ids;   // CC 8: in place (each pixel reads only its own old id first)
    for (let p = 0; p < N; p++) {
      const orig = ids[p];
      if (protect && protect[p]) { out[p] = dead[orig] ? map[orig] : orig; continue; }
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
  // Wide local-plane fit of skin lightness (masked box window, least squares
  // L = a + b*dx + c*dy, value at the pixel). Inside the face it equals the
  // window mean; at the jaw, hairline and cheek edges the window is one-sided
  // and a plain mean is biased by the forehead-to-chin ramp (that bias was the
  // dark "beard" crescent on the chin). The plane follows the ramp instead, so
  // the residual keeps only cheek / nose / socket shading.
  // CC 8: L, the result and ok are face-box arrays (index (y - y0) * bw + x - x0, bb = [x0, y0, x1, y1] of the mask), and the
  // horizontal sums sit in a ring of 2R + 2 rows that the vertical pass walks down (was 9 box-size arrays + 2 full-size ones).
  // Every column still adds and subtracts the same rows in the same order, so the numbers are the same as before.
  function* blurSkinL(src, mask, w, h, R, bb) {
    const [x0, y0, x1, y1] = bb, bw = x1 - x0 + 1, bh = y1 - y0 + 1, BN = bw * bh, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const out = new Float32Array(BN), ok = new Uint8Array(BN), need = Math.max(12, Math.round(R * R * 0.25)), RS = Math.min(bh, 2 * R + 2);
    // 9 moments per pixel, coordinates in units of R around the box centre: n, x, y, xx, xy, yy, L, xL, yL
    const M = []; for (let k = 0; k < 9; k++) M.push(new Float32Array(RS * bw));
    const hacc = new Float64Array(9), acc = new Float64Array(9 * bw), v = new Float64Array(9), mom = (x, y, L, o) => { const X = (x - cx) / R, Y = (y - cy) / R; o[0] = 1; o[1] = X; o[2] = Y; o[3] = X * X; o[4] = X * Y; o[5] = Y * Y; o[6] = L; o[7] = X * L; o[8] = Y * L; };
    const hrow = y => {   // horizontal running window sums of row y into its ring slot
      hacc.fill(0); const row = y * w, lr = (y - y0) * bw - x0, br = ((y - y0) % RS) * bw - x0;
      for (let x = x0; x <= Math.min(x1, x0 + R - 1); x++) if (mask[row + x]) { mom(x, y, src[lr + x], v); for (let k = 0; k < 9; k++) hacc[k] += v[k]; }
      for (let x = x0; x <= x1; x++) {
        const xa = x + R, xr = x - R - 1;
        if (xa <= x1 && mask[row + xa]) { mom(xa, y, src[lr + xa], v); for (let k = 0; k < 9; k++) hacc[k] += v[k]; }
        if (xr >= x0 && mask[row + xr]) { mom(xr, y, src[lr + xr], v); for (let k = 0; k < 9; k++) hacc[k] -= v[k]; }
        for (let k = 0; k < 9; k++) M[k][br + x] = hacc[k];
      }
    };
    const vadd = y => { const br = ((y - y0) % RS) * bw; for (let k = 0; k < 9; k++) { const Mk = M[k]; for (let i = 0; i < bw; i++) acc[i * 9 + k] += Mk[br + i]; } };
    const vsub = y => { const br = ((y - y0) % RS) * bw; for (let k = 0; k < 9; k++) { const Mk = M[k]; for (let i = 0; i < bw; i++) acc[i * 9 + k] -= Mk[br + i]; } };
    for (let y = y0; y <= Math.min(y1, y0 + R - 1); y++) { hrow(y); vadd(y); }
    for (let y = y0; y <= y1; y++) {   // vertical running sums, then solve the 3x3 normal equations at each skin pixel
      const ya = y + R, yr = y - R - 1;
      if (ya <= y1) { hrow(ya); vadd(ya); }
      if (yr >= y0) vsub(yr);
      const Y = (y - cy) / R, lr = (y - y0) * bw;
      for (let x = x0; x <= x1; x++) {
        const p = y * w + x; if (!mask[p]) continue;
        const i = x - x0, q = lr + i, A = i * 9, X = (x - cx) / R;
        const n = acc[A]; if (n < need) { out[q] = src[q]; continue; }
        // moments about this pixel (dx = X' - X, dy = Y' - Y)
        const sx = acc[A + 1] - n * X, sy = acc[A + 2] - n * Y;
        const sxx = acc[A + 3] - 2 * X * acc[A + 1] + n * X * X, sxy = acc[A + 4] - X * acc[A + 2] - Y * acc[A + 1] + n * X * Y, syy = acc[A + 5] - 2 * Y * acc[A + 2] + n * Y * Y;
        const sl = acc[A + 6], sxl = acc[A + 7] - X * sl, syl = acc[A + 8] - Y * sl;
        // solve [[n,sx,sy],[sx,sxx,sxy],[sy,sxy,syy]] [a,b,c] = [sl,sxl,syl] for a (Cramer)
        const det = n * (sxx * syy - sxy * sxy) - sx * (sx * syy - sxy * sy) + sy * (sx * sxy - sxx * sy);
        let a = sl / n;
        if (det > n * n * n * 1e-4) {   // a full window gives about n^3 / 9; slivers along one line are near 0
          a = (sl * (sxx * syy - sxy * sxy) - sx * (sxl * syy - sxy * syl) + sy * (sxl * sxy - sxx * syl)) / det;
          const lo = Math.min(sl / n - 0.25, src[q] - 0.25), hi = Math.max(sl / n + 0.25, src[q] + 0.25); if (!(a > lo && a < hi)) a = sl / n;   // ill-conditioned slivers fall back to the mean
        }
        out[q] = a; ok[q] = 1;
      }
      if ((y & 3) === 3) yield;
    }
    return { blur: out, ok };
  }
  // Reassign unprotected skin by the residual of that blur. A threshold on the
  // residual is a contour of the cheek or the nose, not a line of constant y.
  function* contourSkin(rgba, ids, w, h, mask, protect, edge, td) {
    const N = w * h, tgt = td.tgt, m = td.m, used = new Uint8Array(m);
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let p = 0; p < N; p++) {
      if (!mask[p]) continue;
      const x = p % w, y = (p / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (!(protect && protect[p])) used[ids[p]] = 1;
      if ((p & 65535) === 65535) yield;
    }
    const skin = [];
    for (let k = 0; k < m; k++) if (used[k] && skinLab(tgt[k * 3], tgt[k * 3 + 1], tgt[k * 3 + 2])) skin.push(k);
    if (skin.length < 2) return ids;
    skin.sort((a, b) => tgt[a * 3] - tgt[b * 3] || a - b);
    const face = Math.max(1, Math.min(x1 - x0, y1 - y0));
    const R = Math.max(10, Math.min(64, Math.round(face * 0.16)));
    const bw = x1 - x0 + 1, L = new Float32Array(bw * (y1 - y0 + 1)), lab = new Float32Array(3);   // CC 8: face-box size (was full size)
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) { const p = y * w + x; if (!mask[p]) continue; const o = p * 4; toLab(rgba[o], rgba[o + 1], rgba[o + 2], lab, 0); L[(y - y0) * bw + x - x0] = lab[0]; }
      if ((y & 7) === 7) yield;
    }
    const blurred = yield* blurSkinL(L, mask, w, h, R, [x0, y0, x1, y1]), blur = blurred.blur, ok = blurred.ok;
    const SH = 0.03;
    let dark = 0, lite = 0, nOk = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const q = (y - y0) * bw + x - x0; if (!ok[q] || (protect && protect[y * w + x])) continue;
      const r = L[q] - blur[q]; nOk++;
      if (r < -SH) dark++; else if (r > SH) lite++;
    }
    let tones = 1;
    if (nOk && dark > nOk * 0.025 && lite > nOk * 0.025) tones = 3;
    else if (nOk && (dark > nOk * 0.02 || lite > nOk * 0.02)) tones = 2;
    tones = Math.min(tones, skin.length);
    const chosen = tones <= 1 ? [skin[(skin.length - 1) >> 1]] : tones === 2 ? [skin[0], skin[skin.length - 1]] : [skin[0], skin[(skin.length / 2) | 0], skin[skin.length - 1]];
    const preferDark = dark >= lite, out = ids, isSk = new Uint8Array(m); for (const k of skin) isSk[k] = 1;   // CC 8: in place (each pixel reads only its own old id first)
    // Pixels far off the local plane (nostrils, lash lines, eye-white corners) take the nearest non-skin colour when that
    // is closer than any chosen tone, and join the edge-strength exemption so the merge keeps them as features.
    const other = []; for (let k = 0; k < m; k++) if (!skinLab(tgt[k * 3], tgt[k * 3 + 1], tgt[k * 3 + 2])) other.push(k);
    const DEEP = 0.16, d2 = (k, l) => (tgt[k * 3] - l[0]) ** 2 + (tgt[k * 3 + 1] - l[1]) ** 2 + (tgt[k * 3 + 2] - l[2]) ** 2;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const p = y * w + x, q = (y - y0) * bw + x - x0;
        if (!mask[p] || (protect && protect[p]) || !isSk[ids[p]]) continue;   // only skin pixels change tone; nostrils, lashes, freckles keep their colour
        if (ok[q] && other.length && Math.abs(L[q] - blur[q]) > DEEP) {
          const o = p * 4; toLab(rgba[o], rgba[o + 1], rgba[o + 2], lab, 0);
          let bo = -1, bd = 1e9, sd = 1e9; for (const k of other) { const d = d2(k, lab); if (d < bd) { bd = d; bo = k; } } for (const k of chosen) sd = Math.min(sd, d2(k, lab));
          if (bd < sd) { out[p] = bo; if (protect) protect[p] = 1; if (edge) edge[p] = Math.max(edge[p], 0.2); continue; }
        }
        if (tones < 2) continue;
        if (!ok[q]) { out[p] = chosen[tones === 3 ? 1 : (preferDark ? 1 : 0)]; continue; }
        const r = L[q] - blur[q];
        if (tones === 2) out[p] = chosen[(preferDark ? r < -SH : r > SH) ? (preferDark ? 0 : 1) : (preferDark ? 1 : 0)];
        else out[p] = chosen[r < -SH ? 0 : r > SH ? 2 : 1];
      }
      if ((y & 7) === 7) yield;
    }
    return out;
  }
  // 3x3 median of skin-tone rank, inside the mask only. Jagged tone edges
  // close up; eyes, brows, lips and everything outside the mask stay put.
  function* skinMedian(ids, w, h, mask, protect, td) {
    const tgt = td.tgt, m = td.m, used = new Uint8Array(m);
    for (let p = 0; p < ids.length; p++) { if (mask[p]) used[ids[p]] = 1; if ((p & 262143) === 262143) yield; }
    const chosen = [];
    for (let k = 0; k < m; k++) if (used[k] && skinLab(tgt[k * 3], tgt[k * 3 + 1], tgt[k * 3 + 2])) chosen.push(k);
    chosen.sort((a, b) => tgt[a * 3] - tgt[b * 3] || a - b);
    if (chosen.length < 2) return ids;
    const rank = new Int16Array(256).fill(-1);
    for (let i = 0; i < chosen.length; i++) rank[chosen[i]] = i;
    let src = ids, dst = new Uint8Array(ids.length); const win = new Uint8Array(9);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x;
          if (!mask[p] || (protect && protect[p]) || rank[src[p]] < 0) { dst[p] = src[p]; continue; }   // non-skin pixels (nostrils, lashes) stay
          let n = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const yy = y + dy; if (yy < 0 || yy >= h) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx; if (xx < 0 || xx >= w) continue;
              const r = rank[src[yy * w + xx]]; if (r >= 0 && mask[yy * w + xx]) win[n++] = r;
            }
          }
          if (n < 3) { dst[p] = src[p]; continue; }
          for (let i = 1; i < n; i++) { const v = win[i]; let j = i; while (j > 0 && win[j - 1] > v) { win[j] = win[j - 1]; j--; } win[j] = v; }
          dst[p] = chosen[win[n >> 1]];
        }
        if ((y & 3) === 3) yield;
      }
      const t = src; src = dst; dst = (t === ids) ? new Uint8Array(ids.length) : t;
    }
    return src;
  }
  function* regionMins(reg, n, w, h, mask, near, edge, baseMin, skinMin, featureMin, ids, tgt, diff) {   // near = mask grown by a few px
    const minOf = new Uint32Array(n + 1), area = new Int32Array(n + 1), sk = new Int32Array(n + 1), es = new Float64Array(n + 1), N = w * h;
    const col = new Uint8Array(n + 1), bd = new Int32Array(n + 1), bm = new Int32Array(n + 1); let sL = 0, sN = 0;
    const side = (p, q) => { const a = reg[p], b = reg[q]; if (a === b) return; bd[a]++; bd[b]++; if (near[q]) bm[a]++; if (near[p]) bm[b]++; };
    for (let p = 0; p < N; p++) {
      const r = reg[p], c = ids[p]; area[r]++; col[r] = c; es[r] += edge[p];
      if (mask[p]) { sk[r]++; if (skinLab(tgt[c * 3], tgt[c * 3 + 1], tgt[c * 3 + 2])) { sL += tgt[c * 3]; sN++; } }
      if ((p % w) < w - 1) side(p, p + 1); if (p + w < N) side(p, p + w);
      if ((p & 65535) === 65535) yield;
    }
    const darkL = sN && diff >= 4 ? sL / sN - 0.2 : -1, spotMin = Math.max(20, Math.round(featureMin * 0.5));
    for (let r = 1; r <= n; r++) {
      const a = area[r] || 1, em = es[r] / a, sf = sk[r] / a;
      // a dark spot ringed by skin (nostril, mole) is a feature even when the downscale left it only a few pixels
      if (sf < 0.4 && bd[r] && bm[r] >= bd[r] * 0.6 && tgt[col[r] * 3] < darkL) minOf[r] = Math.min(featureMin, spotMin);
      else if (em > 0.11 || (sf < 0.4 && em > 0.06)) minOf[r] = featureMin;
      else if (sf >= 0.5) minOf[r] = skinMin;
      else minOf[r] = baseMin;
    }
    return minOf;
  }
  function* faceStats(reg, n, col, pal, mask, N, maskFrac, baseMin, skinMin, featureMin) {
    const area = new Int32Array(n), sk = new Int32Array(n); let minArea = N;
    for (let p = 0; p < N; p++) { const r = reg[p]; area[r]++; if (mask[p]) sk[r]++; if ((p & 262143) === 262143) yield; }
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
      const thresh = Math.max(18, Math.round(area[s] * 0.025)); let guard = 0, again = true;
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
    const cut = level >= 3 ? 0.002 : 0.003;
    for (let i = 0; i < shapesN; i++) if (area[i] >= N * cut) order.push(i);
    if (order.length < 4) { order.length = 0; for (let i = 0; i < shapesN; i++) if (area[i] >= Math.max(48, N * 0.0008)) order.push(i); }
    order.sort((a, b) => area[b] - area[a] || a - b);
    let maxK = level >= 3 ? 8 : 4;
    const maxCap = level >= 3 ? 16 : 6;
    let guard = 0;
    while (extra > 0 && guard++ < shapesN * 24) {
      let moved = false;
      for (const i of order) { if (splits[i] >= maxK) continue; splits[i]++; extra--; moved = true; if (!extra) break; }
      if (moved) continue;
      if (maxK < maxCap && order.length) { maxK++; continue; }
      break;
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
    const fs = yield* foldSpotless(reg, nReg, w, h, col);   // v9 QA P1-a: no region without a number spot
    if (fs.folded) {   // a tint used only by folded regions would leave an empty colour button: drop it, renumber
      const usedC = new Uint8Array(pal.length); for (const c of fs.col) usedC[c] = 1; const rm = new Int16Array(pal.length), pal2 = [];
      for (let i = 0; i < pal.length; i++) if (usedC[i]) { rm[i] = pal2.length; pal2.push(pal[i]); }
      if (pal2.length < pal.length) { for (let i = 0; i < fs.col.length; i++) fs.col[i] = rm[fs.col[i]]; pal.length = 0; pal.push(...pal2); cfg.pal = pal.length; }
    }
    const spz = yield* packShapePuzzle(reg, fs.col, pal, w, h, fs.n, cfg, ctx); spz.detail = { level: cfg.detail, regions: fs.n, pal: pal.length, native: shapesN, folded: fs.folded }; return spz;
  }
  function* packShapePuzzle(reg, col, pal, w, h, n, cfg, ctx) {
    const N = w * h;
    ctx.begin('spots', 0.62); ctx.alloc('dist', N * 2); const sp = yield* labelSpots(reg, n, w, h, true); ctx.free('dist');
    ctx.begin('trace', 0.75); ctx.alloc('vis', N); const per = yield* trace(reg, n, w, h, cfg.eps || 0.7); ctx.free('vis');
    ctx.begin('pack', 0.92);
    const loose = !!cfg.mosaic, s = WORLD / Math.max(w, h), bb = new Int16Array(n * 4), labs = new Int16Array(n * 4);
    for (let i = 0; i < n; i++) {
      bb[i * 4] = Math.max(0, Math.floor(sp.x0[i] * s - 6)); bb[i * 4 + 1] = Math.max(0, Math.floor(sp.y0[i] * s - 6)); bb[i * 4 + 2] = Math.ceil((sp.x1[i] + 1) * s + 6); bb[i * 4 + 3] = Math.ceil((sp.y1[i] + 1) * s + 6);
      writeMain(labs, i, (sp.bx[i] + 0.5) * s, (sp.by[i] + 0.5) * s, sp.best[i] / 3 * s, loose);
    }
    const xlab = extraLabs(sp, n, s, loose, zoomDeep(cfg));
    const rings = encodeRings(per), rle = rleEnc(reg); ctx.end();
    const stored = { diff: cfg.diff, pal: cfg.pal, seed: cfg.seed, sparkle: !!cfg.sparkle, eps: cfg.eps || 0.7 };
    if (cfg.detail) stored.detail = cfg.detail;
    if (cfg.tier) stored.tier = cfg.tier | 0;
    if (cfg.mosaic) stored.mosaic = 1;
    if (cfg.k4) stored.k4 = 1;
    const data = { col, bb, lab: labs, rings, rle }; if (xlab) data.xlab = xlab;
    return { pv: PV, mode: 'shapes', w, h, W: Math.round(w * s), H: Math.round(h * s), s, pal, n, cfg: stored, data, T: ctx.T, memPeak: ctx.peak };
  }

  // input src {rgba (Uint8ClampedArray), w, h}. Returns a puzzle object with typed arrays (transferable). Throws E(code).
  function* run(src, cfgIn, hooks) {
    const cfg = cfgIn.work ? cfgIn : cfgFor(cfgIn), ctx = newCtx(hooks), rnd = rng(cfg.seed);
    let { rgba, w, h } = src; if (!w || !h || rgba.length < w * h * 4) throw E('decode');
    src.rgba = null;   // CC 8: the caller hands the pixels over, so they can go once the colours are mapped (44 MB at 4K)
    ctx.alloc('rgba', rgba.length);
    if (cfg.mode === 'pixel') return yield* runPixel(rgba, w, h, cfg, ctx, rnd);
    ctx.begin('resize', 0.02);
    const k = Math.min(1, cfg.work / Math.max(w, h)); if (k < 1) { const tw = Math.max(1, Math.round(w * k)), th = Math.max(1, Math.round(h * k)); const o = yield* downscaleG(rgba, w, h, tw, th); rgba = o; w = tw; h = th; ctx.alloc('rgba', rgba.length); }
    const N = w * h; yield;
    // 4K preset on a photo smaller than 3840: shrink the area floor with the picture (never under level 6's 60 px)
    let minArea = cfg.minArea; if (cfg.k4 && !cfg.preview && Math.max(w, h) < cfg.work) minArea = Math.max(60, Math.round(cfg.minArea * (Math.max(w, h) / cfg.work) ** 2));
    ctx.begin('filter', 0.08); yield* smooth(rgba, w, h);
    let mask = null, protect = null, edge = null, maskFrac = 0;
    if ((cfg.diff | 0) >= 3) { ctx.begin('face', 0.12); const faceIn = yield* prepFace(rgba, w, h, cfg.diff | 0); if (faceIn) { mask = faceIn.mask; protect = faceIn.protect; edge = faceIn.edge; maskFrac = faceIn.frac; } }
    ctx.begin('kmeans', 0.2); const sm = yield* sampleLab(rgba, N, rnd); ctx.alloc('sample', sm.out.length * 4);
    const km = yield* kmeans(sm.out, sm.S, cfg.pal, rnd), td = tidy(km.C, km.cnt, km.k, cfg); ctx.free('sample');
    ctx.begin('map', 0.32); let ids = yield* mapAll(rgba, N, td.tgt, td.m); ctx.alloc('ids', N);
    if (mask) { ctx.begin('skin', 0.36); ids = yield* limitSkin(ids, w, h, mask, protect, td); ids = yield* contourSkin(rgba, ids, w, h, mask, protect, edge, td); }
    rgba = null; ctx.free('rgba');
    ctx.begin('mode', 0.4); ids = yield* modeFilter(ids, w, h, 2, protect, true);
    if (mask) ids = yield* skinMedian(ids, w, h, mask, protect, td);
    ctx.begin('regions', 0.5); let lab = null, reg = null, nn = 0, extra = 0;
    for (;;) {
      lab = yield* labelRegions(ids, w, h); if (lab) break;
      ids = yield* modeFilter(ids, w, h, 2, protect, true); if (++extra > 3) throw E('busy');
    }
    reg = lab.reg; nn = lab.n; ctx.alloc('reg', reg.length * 2);
    const diff = cfg.diff | 0, tapF = [0, 0, 0, 0.00020, 0.00016, 0.00014, 0.00012][diff] || 0;
    // Levels 1-4 keep the old floor (preset minArea, or a fraction of this picture).
    // Levels 5-6 stay on the preset minArea. The old fraction times the level-6
    // work image (1280) raised that floor above level 5, so a harder level
    // came out with fewer regions.
    const baseMin = diff >= 5 ? minArea : Math.max(minArea, Math.round(tapF * N)), skinMin = Math.round(baseMin * 2.5), featureMin = Math.max(16, Math.round(baseMin * 0.34));
    const near = mask ? yield* dilateMask(mask, w, h, 3) : null, minOf = mask ? yield* regionMins(reg, nn, w, h, mask, near, edge, baseMin, skinMin, featureMin, ids, td.tgt, diff) : null;
    let skinOf = null, inner = null;
    if (mask) {
      skinOf = new Uint8Array(nn + 1); inner = new Uint8Array(nn + 1); const area = new Int32Array(nn + 1), sk = new Int32Array(nn + 1), seen = new Uint8Array(nn + 1), colr = new Uint8Array(nn + 1);
      const nr = new Int32Array(nn + 1);
      for (let p = 0; p < N; p++) { const r = reg[p]; area[r]++; if (mask[p]) sk[r]++; if (near[p]) nr[r]++; if (!seen[r]) { seen[r] = 1; colr[r] = ids[p]; } if ((p & 262143) === 262143) yield; }
      for (let r = 1; r <= nn; r++) { if (nr[r] * 2 >= area[r]) inner[r] = 1; if (area[r] && sk[r] * 2 >= area[r] && skinLab(td.tgt[colr[r] * 3], td.tgt[colr[r] * 3 + 1], td.tgt[colr[r] * 3 + 2])) skinOf[r] = 1; }
    }
    // Face photos at levels 5-6 sit at the region cap, so the cap (not the floors) held back hair, clothes and
    // background. They may keep 20% more regions there; skin is squeezed to the old cap as before.
    const keep = mask && diff >= 5 ? Math.round(cfg.maxReg * 0.2) : 0;
    const mg = yield* mergeRegions(reg, nn, w, h, ids, td.tgt, baseMin, cfg.maxReg, minOf, skinOf, diff >= 4, keep, inner); ids = null; ctx.free('ids'); edge = null; protect = null;
    // drop unused palette colours, renumber
    // v9 QA P1-b: slivers with no inner pixel (no number spot) join a neighbour before the palette is renumbered
    const fsp = yield* foldSpotless(reg, mg.n, w, h, mg.col);
    const used = new Uint8Array(td.m); for (const c of fsp.col) used[c] = 1; const remap = new Int16Array(td.m), pal = []; let q = 0;
    for (let i = 0; i < td.m; i++) if (used[i]) { remap[i] = q++; pal.push(td.pal[i]); }
    const col = Uint8Array.from(fsp.col, c => remap[c]), n = fsp.n;
    const face = mask ? yield* faceStats(reg, n, col, pal, mask, N, maskFrac, baseMin, skinMin, featureMin) : null; mask = null;
    ctx.begin('spots', 0.62); ctx.alloc('dist', N * 2); const sp = yield* labelSpots(reg, n, w, h, true); ctx.free('dist');
    ctx.begin('trace', 0.75); ctx.alloc('vis', N); let eps = cfg.eps; let per = yield* trace(reg, n, w, h, eps); ctx.free('vis');
    ctx.begin('pack', 0.92);
    const s = WORLD / Math.max(w, h), bb = new Int16Array(n * 4), labs = new Int16Array(n * 4);
    for (let i = 0; i < n; i++) {
      bb[i * 4] = Math.max(0, Math.floor(sp.x0[i] * s - 6)); bb[i * 4 + 1] = Math.max(0, Math.floor(sp.y0[i] * s - 6)); bb[i * 4 + 2] = Math.ceil((sp.x1[i] + 1) * s + 6); bb[i * 4 + 3] = Math.ceil((sp.y1[i] + 1) * s + 6);
      writeMain(labs, i, (sp.bx[i] + 0.5) * s, (sp.by[i] + 0.5) * s, sp.best[i] / 3 * s, false);
    }
    const xlab = extraLabs(sp, n, s, false, zoomDeep(cfg));
    const rings = encodeRings(per), rle = yield* rleEncG(reg); ctx.end();
    const data = { col, bb, lab: labs, rings, rle }; if (xlab) data.xlab = xlab;
    const out = { pv: PV, mode: 'shapes', w, h, W: Math.round(w * s), H: Math.round(h * s), s, pal, n, cfg: { diff: cfg.diff, pal: cfg.pal, seed: cfg.seed, sparkle: cfg.sparkle, eps }, data, T: ctx.T, memPeak: ctx.peak };
    if (cfg.k4) out.cfg.k4 = 1;   // additive: older code ignores it
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
  // in-stage progress (CC 7): stage marks come from ctx.begin; tick() between yields adds a gentle creep toward the next mark (~150 ms apart) so the bar never stalls
  const STAGEF = [0.02, 0.05, 0.08, 0.12, 0.2, 0.3, 0.32, 0.36, 0.4, 0.5, 0.6, 0.62, 0.75, 0.92, 1];
  function creep(out) {
    let f0 = 0, s = '', ts = 0, tp = 0;
    return { prog(f, st) { f0 = f; s = st; ts = tp = performance.now(); out(f, st); },
      tick() { const t = performance.now(); if (!ts || t - tp < 150) return; tp = t; const f1 = STAGEF.find(x => x > f0 + 1e-6) || 1; out(f0 + (f1 - f0) * 0.9 * (1 - Math.exp(-(t - ts) / 2500)), s); } };
  }
  function drainTick(gen, tick) { for (;;) { const r = gen.next(); if (r.done) return r.value; tick(); } }

  // ---------- inflate a puzzle record into drawable pieces (Path2D needs a browser) ----------
  const CUT = 3.5;   // corner rounding radius in WORK px
  function ringPath(P2D, rs, s) {
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
    return p;
  }
  function ringsToPath(P2D, per, s) { return per.map(rs => ringPath(P2D, rs, s)); }
  // CC 8: view = paths for play. A Super sharp outline is traced at 3840 (3x level 6's points), more than a 2048 world can show, so play
  // re-simplifies it to level 6's on-screen accuracy (VIEW_ERR world px). The 3840 export, the thumb and the stored record keep every point.
  const VIEW_ERR = 1.12;
  // generator, so the page can run it in short slices (pipe.js H.inflate); inflate() below is the same thing in one go
  function* inflateG(pz, P2D, view) {
    const d = pz.data; if (pz.mode === 'pixel') return { mode: 'pixel', gw: pz.w, gh: pz.h, cs: pz.s, cells: d.cells, s: pz.s };
    const n = pz.n, per = decodeRings(d.rings, n), veps = view ? VIEW_ERR / pz.s : 0, simp = veps > ((pz.cfg && pz.cfg.eps) || 0.7) * 1.01, paths = [], bb = [], lab = []; yield;
    for (let i = 0; i < n; i++) {
      const rs = per[i]; if (simp) for (let k = 0; k < rs.length; k++) rs[k] = dpRing(Array.from(rs[k]), veps);
      paths.push(ringPath(P2D, rs, pz.s)); per[i] = null; if ((i & 7) === 7) yield;
    }
    const extra = new Array(n);
    for (let i = 0; i < n; i++) {
      bb.push([d.bb[i * 4], d.bb[i * 4 + 1], d.bb[i * 4 + 2], d.bb[i * 4 + 3]]);
      lab.push(spotRec(d.lab[i * 4], d.lab[i * 4 + 1], d.lab[i * 4 + 2], d.lab[i * 4 + 3]));
      if (!d.xlab || d.xlab.length !== n * 8) continue;
      const xs = [];
      for (let k = 0; k < 2; k++) { const o = i * 8 + k * 4; if (d.xlab[o] < 0) continue; xs.push(spotRec(d.xlab[o], d.xlab[o + 1], d.xlab[o + 2], d.xlab[o + 3])); }
      if (xs.length) extra[i] = xs;
    }
    const map = yield* rleDecG(d.rle, pz.w * pz.h);
    for (let i = 0; i < map.length; i++) { if (map[i] >= n) throw E('bad'); if ((i & 262143) === 262143) yield; }
    return { mode: 'shapes', paths, bb, lab, extra, col: d.col, map, mw: pz.w, mh: pz.h, s: pz.s };
  }
  const inflate = (pz, P2D, view) => drain(inflateG(pz, P2D, view));
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
  // small flat-colour thumb from the label map. Mosaic outlines are too heavy to stroke into a preview.
  function drawMapThumb(pz, size, mk) {
    const map = rleDec(pz.data.rle, pz.w * pz.h), k = size / Math.max(pz.w, pz.h);
    const cw = Math.max(1, Math.round(pz.w * k)), ch = Math.max(1, Math.round(pz.h * k)), c = mk(cw, ch), x = c.getContext('2d');
    const id = x.createImageData(cw, ch), rgb = new Uint8Array(pz.pal.length * 3), d = id.data, col = pz.data.col;
    for (let i = 0; i < pz.pal.length; i++) { const v = parseInt(pz.pal[i].slice(1), 16); rgb[i * 3] = (v >> 16) & 255; rgb[i * 3 + 1] = (v >> 8) & 255; rgb[i * 3 + 2] = v & 255; }
    for (let y = 0; y < ch; y++) {
      const sy = Math.min(pz.h - 1, (y * pz.h / ch) | 0), row = sy * pz.w;
      for (let x0 = 0; x0 < cw; x0++) {
        const ci = col[map[row + Math.min(pz.w - 1, (x0 * pz.w / cw) | 0)]] * 3, o = (y * cw + x0) * 4;
        d[o] = rgb[ci]; d[o + 1] = rgb[ci + 1]; d[o + 2] = rgb[ci + 2]; d[o + 3] = 255;
      }
    }
    x.putImageData(id, 0, 0); return c;
  }
  // sanity check of a stored puzzle (throws on anything odd, so the caller can quarantine the record)
  function check(pz) {
    if (!pz || pz.pv !== PV || !Array.isArray(pz.pal) || !pz.pal.length || pz.pal.length > 48 || !(pz.n > 0) || pz.n > 65000 || !pz.data) throw E('bad');
    for (const c of pz.pal) if (typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)) throw E('bad');
    const d = pz.data;
    if (pz.mode === 'pixel') { if (!(d.cells instanceof Uint8Array) || d.cells.length !== pz.w * pz.h || pz.w * pz.h !== pz.n) throw E('bad'); for (let i = 0; i < d.cells.length; i++) if (d.cells[i] >= pz.pal.length) throw E('bad'); return true; }
    if (pz.mode !== 'shapes' || !(d.col instanceof Uint8Array) || d.col.length !== pz.n || !(d.rings instanceof Int16Array) || !(d.bb instanceof Int16Array) || d.bb.length !== pz.n * 4 || !(d.lab instanceof Int16Array) || d.lab.length !== pz.n * 4 || !(d.rle instanceof Uint8Array)) throw E('bad');
    if (d.xlab && (!(d.xlab instanceof Int16Array) || d.xlab.length !== pz.n * 8)) throw E('bad');
    for (let i = 0; i < d.col.length; i++) if (d.col[i] >= pz.pal.length) throw E('bad');
    const st = d.rings; let p = 0;   // walk the delta stream: every count must stay inside the array and end exactly at its length
    for (let i = 0; i < pz.n; i++) { if (p >= st.length) throw E('bad'); const nr = st[p++]; if (nr < 0 || nr > 5000) throw E('bad'); for (let k = 0; k < nr; k++) { if (p >= st.length) throw E('bad'); const m = st[p++]; if (m < 3 || p + 2 * m > st.length) throw E('bad'); p += 2 * m; } }
    if (p !== st.length) throw E('bad');
    return true;
  }

  // ---------- Expert / Extreme mosaic (seeded SLIC in CIE Lab). Kid and Detailed never call this. ----------
  const MOSAIC_TIER = {
    3: { tier: 3, pieces: 690, pal: 28, minD: 12, nseg: 760 },
    4: { tier: 4, pieces: 1650, pal: 44, minD: 8, nseg: 1780 }
  };
  function mosaicCfg(tier, seed, opt) {
    const t = MOSAIC_TIER[tier === 4 ? 4 : 3]; opt = opt || {};
    const c = { mode: 'shapes', tier: t.tier, pieces: t.pieces, pal: t.pal, minD: t.minD, nseg: t.nseg, seed: (seed >>> 0) || 1, sparkle: false, eps: 0.7, diff: 6, mosaic: 1, spatial: !!opt.spatial };
    if (opt.k4) c.k4 = 1;
    return c;
  }
  function cieHex(L, a, b) {
    let y = (L + 16) / 116, x = a / 500 + y, z = y - b / 200;
    const f = t => { const t3 = t * t * t; return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787037; };
    const X = 0.95047 * f(x), Y = f(y), Z = 1.08883 * f(z);
    return hex([enc(3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z), enc(-0.969266 * X + 1.8760108 * Y + 0.041556 * Z), enc(0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z)]);
  }
  function pushApart(C, k) {
    for (let it = 0; it < 40; it++) {
      let bi = -1, bj = -1, bd = 7.4;
      for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
        const d = Math.hypot(C[i * 3] - C[j * 3], C[i * 3 + 1] - C[j * 3 + 1], C[i * 3 + 2] - C[j * 3 + 2]);
        if (d < bd) { bd = d; bi = i; bj = j; }
      }
      if (bi < 0) return;
      let dL = C[bi * 3] - C[bj * 3], dA = C[bi * 3 + 1] - C[bj * 3 + 1], dB = C[bi * 3 + 2] - C[bj * 3 + 2], d = Math.hypot(dL, dA, dB);
      if (d < 0.25) { dL = 6; dA = (it & 1) ? 2 : -2; dB = 0; d = Math.hypot(dL, dA, dB); }
      const sc = (7.6 - d) / 2 / d;
      C[bi * 3] = clamp(C[bi * 3] + dL * sc, 4, 96); C[bj * 3] = clamp(C[bj * 3] - dL * sc, 4, 96);
      C[bi * 3 + 1] += dA * sc; C[bj * 3 + 1] -= dA * sc; C[bi * 3 + 2] += dB * sc; C[bj * 3 + 2] -= dB * sc;
    }
  }
  function sortPalette(C, k, asg, nAsg) {
    const ord = [];
    for (let i = 0; i < k; i++) {
      const L = C[i * 3], a = C[i * 3 + 1], b = C[i * 3 + 2], ch = Math.hypot(a, b);
      ord.push({ i, neu: ch < 8 ? 0 : 1, hue: Math.atan2(b, a), L });
    }
    ord.sort((x, y) => x.neu - y.neu || (x.neu ? x.hue - y.hue : 0) || x.L - y.L || x.i - y.i);
    const map = new Uint8Array(k), C2 = new Float32Array(k * 3);
    for (let j = 0; j < k; j++) { map[ord[j].i] = j; C2.set(C.subarray(ord[j].i * 3, ord[j].i * 3 + 3), j * 3); }
    C.set(C2); for (let i = 0; i < nAsg; i++) asg[i] = map[asg[i]];
  }
  function palFromCie(C, k) {
    const pal = [], seen = new Set();
    for (let i = 0; i < k; i++) {
      let L = C[i * 3], a = C[i * 3 + 1], b = C[i * 3 + 2], h = cieHex(L, a, b), g = 0;
      while (seen.has(h) && g++ < 12) { b += 2.5; a += (g & 1) ? 1.5 : -1.5; if (g > 6) L = clamp(L + 1.2, 4, 96); h = cieHex(L, a, b); }
      seen.add(h); pal.push(h); C[i * 3] = L; C[i * 3 + 1] = a; C[i * 3 + 2] = b;
    }
    return pal;
  }
  function* ciePlanes(rgba, w, h) {
    const N = w * h, L = new Float32Array(N), A = new Float32Array(N), B = new Float32Array(N);
    const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787037 * t + 16 / 116;
    for (let p = 0, o = 0; p < N; p++, o += 4) {
      const R = LIN[rgba[o]], G = LIN[rgba[o + 1]], Bl = LIN[rgba[o + 2]];
      const X = 0.4124564 * R + 0.3575761 * G + 0.1804375 * Bl, Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * Bl, Z = 0.0193339 * R + 0.119192 * G + 0.9503041 * Bl;
      const fx = f(X / 0.95047), fy = f(Y), fz = f(Z / 1.08883);
      L[p] = 116 * fy - 16; A[p] = 500 * (fx - fy); B[p] = 200 * (fy - fz);
      if ((p & 8191) === 8191) yield;
    }
    return { L, A, B };
  }
  function* slic(L, A, B, w, h, nseg, mask) {
    const N = w * h, S = Math.max(4, Math.sqrt(N / Math.max(1, nseg))), m2 = (12 / S) * (12 / S), rad = S * 2;
    const gw = Math.max(1, Math.round(w / S)), gh = Math.max(1, Math.round(h / S)), nc = gw * gh;
    const CX = new Float32Array(nc), CY = new Float32Array(nc), CL = new Float32Array(nc), CA = new Float32Array(nc), CB = new Float32Array(nc), CS = mask ? new Int32Array(nc) : null;
    const stepX = w / gw, stepY = h / gh; let c = 0;
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      let x = Math.min(w - 2, Math.max(1, Math.round((gx + 0.5) * stepX))), y = Math.min(h - 2, Math.max(1, Math.round((gy + 0.5) * stepY)));
      let bg = 1e18, bx = x, by = y;
      for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
        const p = yy * w + xx, g = (L[p + 1] - L[p - 1]) ** 2 + (A[p + 1] - A[p - 1]) ** 2 + (B[p + 1] - B[p - 1]) ** 2 + (L[p + w] - L[p - w]) ** 2 + (A[p + w] - A[p - w]) ** 2 + (B[p + w] - B[p - w]) ** 2;
        if (g < bg) { bg = g; bx = xx; by = yy; }
      }
      const p = by * w + bx; CX[c] = bx; CY[c] = by; CL[c] = L[p]; CA[c] = A[p]; CB[c] = B[p]; if (CS) CS[c] = mask[p]; c++;
      if ((c & 63) === 0) yield;
    }
    const dist = new Float32Array(N), lab = new Int32Array(N);
    for (let it = 0; it < 4; it++) {
      dist.fill(1e15); lab.fill(-1);
      for (let ci = 0; ci < nc; ci++) {
        const cx = CX[ci], cy = CY[ci], cL = CL[ci], cA = CA[ci], cB = CB[ci], sid = CS ? CS[ci] : 0;
        const x0 = Math.max(0, (cx - rad) | 0), x1 = Math.min(w - 1, (cx + rad) | 0), y0 = Math.max(0, (cy - rad) | 0), y1 = Math.min(h - 1, (cy + rad) | 0);
        for (let y = y0; y <= y1; y++) {
          const dy = y - cy, row = y * w;
          for (let x = x0; x <= x1; x++) {
            const p = row + x; if (mask && mask[p] !== sid) continue;
            const dL = L[p] - cL, dA = A[p] - cA, dB = B[p] - cB, dx = x - cx, d = dL * dL + dA * dA + dB * dB + m2 * (dx * dx + dy * dy);
            if (d < dist[p]) { dist[p] = d; lab[p] = ci; }
          }
        }
        if ((ci & 7) === 7) yield;
      }
      if (it === 3) break;
      const sL = new Float64Array(nc), sA = new Float64Array(nc), sB = new Float64Array(nc), sX = new Float64Array(nc), sY = new Float64Array(nc), cnt = new Int32Array(nc);
      for (let p = 0; p < N; p++) { const ci = lab[p]; if (ci < 0) continue; sL[ci] += L[p]; sA[ci] += A[p]; sB[ci] += B[p]; sX[ci] += p % w; sY[ci] += (p / w) | 0; cnt[ci]++; if ((p & 65535) === 65535) yield; }
      for (let ci = 0; ci < nc; ci++) if (cnt[ci]) { CL[ci] = sL[ci] / cnt[ci]; CA[ci] = sA[ci] / cnt[ci]; CB[ci] = sB[ci] / cnt[ci]; CX[ci] = sX[ci] / cnt[ci]; CY[ci] = sY[ci] / cnt[ci]; }
    }
    return { lab, nc, S };
  }
  function* fillHoles(lab, w, h, mask) {
    const N = w * h;
    for (let pass = 0; pass < 6; pass++) {
      let left = 0;
      for (let p = 0; p < N; p++) if (lab[p] < 0) {
        const x = p % w, y = (p / w) | 0, sid = mask ? mask[p] : 0; let b = -1;
        const take = q => { if (b < 0 && lab[q] >= 0 && (!mask || mask[q] === sid)) b = lab[q]; };
        if (x > 0) take(p - 1); if (b < 0 && y > 0) take(p - w); if (b < 0 && x + 1 < w) take(p + 1); if (b < 0 && y + 1 < h) take(p + w);
        if (b >= 0) lab[p] = b; else left++;
      }
      yield; if (!left) break;
    }
  }
  function* enforceConn(lab, w, h, minsize) {
    const N = w * h, comp = new Int32Array(N).fill(-1), stack = new Int32Array(N), areas = new Int32Array(N); let nc = 0;
    for (let p0 = 0; p0 < N; p0++) {
      if (comp[p0] >= 0) continue;
      const id = lab[p0]; let sp = 0, area = 0; stack[sp++] = p0; comp[p0] = nc;
      while (sp) {
        const p = stack[--sp]; area++; const x = p % w, y = (p / w) | 0;
        if (x > 0 && comp[p - 1] < 0 && lab[p - 1] === id) { comp[p - 1] = nc; stack[sp++] = p - 1; }
        if (x + 1 < w && comp[p + 1] < 0 && lab[p + 1] === id) { comp[p + 1] = nc; stack[sp++] = p + 1; }
        if (y > 0 && comp[p - w] < 0 && lab[p - w] === id) { comp[p - w] = nc; stack[sp++] = p - w; }
        if (y + 1 < h && comp[p + w] < 0 && lab[p + w] === id) { comp[p + w] = nc; stack[sp++] = p + w; }
      }
      areas[nc++] = area; if ((p0 & 65535) === 65535) yield;
    }
    const parent = new Int32Array(nc); for (let i = 0; i < nc; i++) parent[i] = i;
    for (let p = 0; p < N; p++) {
      const a = comp[p]; if (areas[a] >= minsize || parent[a] !== a) continue;
      const x = p % w, y = (p / w) | 0; let b = -1;
      if (x > 0 && comp[p - 1] !== a) b = comp[p - 1];
      else if (x + 1 < w && comp[p + 1] !== a) b = comp[p + 1];
      else if (y > 0 && comp[p - w] !== a) b = comp[p - w];
      else if (y + 1 < h && comp[p + w] !== a) b = comp[p + w];
      if (b >= 0 && (areas[b] >= minsize || b < a)) parent[a] = b;
      if ((p & 65535) === 65535) yield;
    }
    const map = new Int32Array(nc).fill(-1), out = new Int32Array(N); let nid = 0;
    for (let p = 0; p < N; p++) {
      let a = comp[p], g = 0; while (parent[a] !== a && g++ < 16) a = parent[a];
      if (map[a] < 0) map[a] = nid++; out[p] = map[a];
    }
    return { lab: out, nc: nid };
  }
  function* spatialCol(cnt, sumL, sumA, sumB, sx, sy, nc, K, rnd) {
    const base = new Int32Array(nc).fill(-1), bL = [], bA = [], bB = [], bW = [];
    for (let i = 0; i < nc; i++) {
      if (!cnt[i]) continue;
      const L = sumL[i] / cnt[i], a = sumA[i] / cnt[i], b = sumB[i] / cnt[i]; let bi = -1, bd = 36;
      for (let j = 0; j < bL.length; j++) { const d = (L - bL[j]) ** 2 + (a - bA[j]) ** 2 + (b - bB[j]) ** 2; if (d < bd) { bd = d; bi = j; } }
      if (bi < 0) { bi = bL.length; bL.push(L); bA.push(a); bB.push(b); bW.push(0); }
      base[i] = bi; bW[bi] += cnt[i];
      if ((i & 255) === 255) yield;
    }
    if (!bL.length) { bL.push(70); bA.push(10); bB.push(0); bW.push(1); }
    while (bL.length > K) {
      let bi = 0, bj = 1, bd = 1e18;
      for (let i = 0; i < bL.length; i++) for (let j = i + 1; j < bL.length; j++) { const d = (bL[i] - bL[j]) ** 2 + (bA[i] - bA[j]) ** 2 + (bB[i] - bB[j]) ** 2; if (d < bd) { bd = d; bi = i; bj = j; } }
      const w = bW[bi] + bW[bj]; bL[bi] = (bL[bi] * bW[bi] + bL[bj] * bW[bj]) / w; bA[bi] = (bA[bi] * bW[bi] + bA[bj] * bW[bj]) / w; bB[bi] = (bB[bi] * bW[bi] + bB[bj] * bW[bj]) / w; bW[bi] = w;
      bL.splice(bj, 1); bA.splice(bj, 1); bB.splice(bj, 1); bW.splice(bj, 1);
      for (let i = 0; i < nc; i++) { if (base[i] === bj) base[i] = bi; else if (base[i] > bj) base[i]--; }
    }
    const B = bL.length, slots = new Int32Array(B).fill(1); let left = K - B, p = 0;
    const order = []; for (let i = 0; i < B; i++) order.push(i); order.sort((i, j) => bW[j] - bW[i] || i - j);
    while (left > 0) { slots[order[p % B]]++; left--; p++; }
    const off = new Int32Array(B); for (let i = 1; i < B; i++) off[i] = off[i - 1] + slots[i - 1];
    const C = new Float32Array(K * 3), asg = new Uint8Array(nc), phase = (rnd() * 1024) | 0;
    for (let i = 0; i < B; i++) {
      const s = slots[i];
      for (let sl = 0; sl < s; sl++) {
        const o = (off[i] + sl) * 3, t = s === 1 ? 0 : sl - (s - 1) / 2;
        C[o] = clamp(bL[i] + t * (7.2 / Math.max(1, (s - 1) / 2)), 4, 96); C[o + 1] = bA[i] + t * 1.5; C[o + 2] = bB[i] + ((sl & 1) ? 1 : -1);
      }
    }
    for (let i = 0; i < nc; i++) {
      if (base[i] < 0) { asg[i] = 0; continue; }
      const s = slots[base[i]], cell = (((sx[i] / 26) | 0) * 3 + ((sy[i] / 26) | 0) + phase);
      asg[i] = off[base[i]] + ((cell % s) + s) % s;
    }
    return { C, asg, k: K };
  }
  function* fitPieces(reg, n, w, h, col, target, minBest) {
    const lo = Math.ceil(target * 0.9 - 1e-9), hi = Math.floor(target * 1.1 + 1e-9);
    const sp = yield* labelSpots(reg, n, w, h); let smallN = 0;
    for (let i = 0; i < n; i++) if (sp.best[i] < minBest) smallN++;
    if (!smallN && n >= lo && n <= hi) return { n, col, short: false };
    const N = w * h, area = new Int32Array(n), adj = new Array(n);
    for (let i = 0; i < n; i++) adj[i] = new Map();
    for (let p = 0; p < N; p++) { area[reg[p]]++; if ((p & 262143) === 262143) yield; }
    const edge = (a, b) => { if (a === b) return; adj[a].set(b, (adj[a].get(b) || 0) + 1); adj[b].set(a, (adj[b].get(a) || 0) + 1); };
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) { const p = y * w + x, r = reg[p]; if (x + 1 < w) edge(r, reg[p + 1]); if (y + 1 < h) edge(r, reg[p + w]); } if ((y & 3) === 3) yield; }
    const par = new Int32Array(n), dead = new Uint8Array(n); for (let i = 0; i < n; i++) par[i] = i; let live = n;
    const fuse = (a, b) => {
      if (a === b || dead[a] || dead[b] || !adj[a]) return;
      for (const [c, wgt] of adj[a]) { if (c === b) continue; adj[c].delete(a); adj[c].set(b, (adj[c].get(b) || 0) + wgt); adj[b].set(c, (adj[b].get(c) || 0) + wgt); }
      adj[b].delete(a); adj[a] = null; area[b] += area[a]; if (sp.best[a] > sp.best[b]) sp.best[b] = sp.best[a]; dead[a] = 1; par[a] = b; live--;
    };
    const pick = a => {
      if (!adj[a]) return -1; let bn = -1, bw = -1, same = -1, sw = -1;
      for (const [c, wgt] of adj[a]) { if (dead[c]) continue; if (wgt > bw || (wgt === bw && (bn < 0 || c < bn))) { bw = wgt; bn = c; } if (col[c] === col[a] && (wgt > sw || (wgt === sw && (same < 0 || c < same)))) { sw = wgt; same = c; } }
      return same >= 0 ? same : bn;
    };
    if (smallN) {
      const small = []; for (let i = 0; i < n; i++) if (area[i] && sp.best[i] < minBest) small.push(i);
      small.sort((a, b) => area[a] - area[b] || a - b);
      for (let i = 0; i < small.length; i++) { const a = small[i]; if (dead[a] || sp.best[a] >= minBest) continue; const b = pick(a); if (b >= 0) fuse(a, b); if ((i & 15) === 15) yield; }
    }
    let guard = 0;
    while (live > hi && guard++ < n) {
      let a = -1, ba = 1e15; for (let i = 0; i < n; i++) if (!dead[i] && area[i] < ba) { ba = area[i]; a = i; }
      if (a < 0) break; const b = pick(a); if (b < 0) break; fuse(a, b); if ((guard & 15) === 0) yield;
    }
    const nid = new Int32Array(n).fill(-1), colOut = []; let m = 0;
    for (let i = 0; i < n; i++) if (!dead[i]) { nid[i] = m++; colOut.push(col[i]); }
    for (let i = 0; i < n; i++) if (dead[i]) { let a = i, g = 0; while (dead[a] && g++ < 32) a = par[a]; nid[i] = nid[a]; }
    for (let p = 0; p < N; p++) { reg[p] = nid[reg[p]]; if ((p & 65535) === 65535) yield; }
    return { n: m, col: Uint8Array.from(colOut), short: m < lo };
  }
  function* mosaicOnce(planes, w, h, mask, nseg, K, target, minBest, spatial, rnd) {
    const N = w * h, raw = yield* slic(planes.L, planes.A, planes.B, w, h, nseg, mask);
    yield* fillHoles(raw.lab, w, h, mask);
    const conn = yield* enforceConn(raw.lab, w, h, Math.max(8, raw.S * raw.S * 0.25));
    const nc = conn.nc, lab = conn.lab, cnt = new Int32Array(nc), sumL = new Float64Array(nc), sumA = new Float64Array(nc), sumB = new Float64Array(nc), sx = new Float64Array(nc), sy = new Float64Array(nc);
    for (let p = 0; p < N; p++) { const c = lab[p]; cnt[c]++; sumL[c] += planes.L[p]; sumA[c] += planes.A[p]; sumB[c] += planes.B[p]; sx[c] += p % w; sy[c] += (p / w) | 0; if ((p & 65535) === 65535) yield; }
    for (let i = 0; i < nc; i++) if (cnt[i]) { sx[i] /= cnt[i]; sy[i] /= cnt[i]; }
    let C, asg, k;
    if (spatial) { const sc = yield* spatialCol(cnt, sumL, sumA, sumB, sx, sy, nc, K, rnd); C = sc.C; asg = sc.asg; k = sc.k; }
    else {
      const map = new Int32Array(nc).fill(-1); let m = 0; const means = new Float32Array(nc * 3);
      for (let i = 0; i < nc; i++) if (cnt[i]) { map[i] = m; means[m * 3] = sumL[i] / cnt[i]; means[m * 3 + 1] = sumA[i] / cnt[i]; means[m * 3 + 2] = sumB[i] / cnt[i]; m++; }
      const km = yield* kmeans(means, m, Math.min(K, m), rnd);
      C = new Float32Array(K * 3); C.set(km.C.subarray(0, km.k * 3)); k = km.k;
      while (k < K) { const o = k * 3, f = (k % Math.max(1, km.k)) * 3; C[o] = clamp(C[f] + 7, 4, 96); C[o + 1] = C[f + 1] + 4; C[o + 2] = C[f + 2] - 3; k++; }
      asg = new Uint8Array(nc); for (let i = 0; i < nc; i++) asg[i] = map[i] < 0 ? 0 : km.asg[map[i]];
    }
    pushApart(C, k); sortPalette(C, k, asg, nc); const pal = palFromCie(C, k);
    // A piece is a superpixel. Same-colour neighbours stay separate unless they are under the tier's min size (fitPieces).
    const reg = new Uint16Array(N), col = new Uint8Array(nc);
    for (let i = 0; i < nc; i++) col[i] = asg[i];
    for (let p = 0; p < N; p++) { reg[p] = lab[p]; if ((p & 65535) === 65535) yield; }
    const fit = yield* fitPieces(reg, nc, w, h, col, target, minBest);
    const fs = yield* foldSpotless(reg, fit.n, w, h, fit.col);
    return { reg, col: fs.col, n: fs.n, pal, short: fs.n < Math.ceil(target * 0.9 - 1e-9) || fit.short };
  }
  function* paintRast(rast, cols, pal) {
    const w = rast.w, h = rast.h, rgba = new Uint8ClampedArray(w * h * 4), rgb = [];
    for (let i = 0; i < pal.length; i++) { const v = parseInt(pal[i].slice(1), 16); rgb.push([(v >> 16) & 255, (v >> 8) & 255, v & 255]); }
    for (let p = 0; p < rast.ids.length; p++) {
      const s = rast.ids[p], ci = cols && s < cols.length ? cols[s] : 0, c = rgb[ci] || rgb[0] || [255, 241, 238];
      rgba[p * 4] = c[0]; rgba[p * 4 + 1] = c[1]; rgba[p * 4 + 2] = c[2]; rgba[p * 4 + 3] = 255;
      if ((p & 65535) === 65535) yield;
    }
    return rgba;
  }
  function* mosaicRun(src, hooks) {
    const cfg = src.tier && src.pieces ? src : mosaicCfg(src.tier, src.seed, { k4: src.k4, spatial: !!(src.spatial || src.rast) });
    const ctx = newCtx(hooks); let rgba, w, h, mask = null;
    ctx.begin('prep', 0.02);
    if (src.rast) { rgba = yield* paintRast(src.rast, src.cols, src.pal || []); w = src.rast.w; h = src.rast.h; mask = src.rast.ids; cfg.spatial = true; }
    else {
      rgba = src.rgba; w = src.w | 0; h = src.h | 0; if (!w || !h || !rgba || rgba.length < w * h * 4) throw E('decode');
      const cap = cfg.k4 ? 1920 : 1280, k = Math.min(1, cap / Math.max(w, h));
      if (k < 1) { const tw = Math.max(1, Math.round(w * k)), th = Math.max(1, Math.round(h * k)); rgba = yield* downscaleG(rgba, w, h, tw, th); w = tw; h = th; }
    }
    ctx.begin('cie', 0.08); const planes = yield* ciePlanes(rgba, w, h); rgba = null;
    const target = cfg.pieces, K = cfg.pal, s = WORLD / Math.max(w, h), minBest = cfg.minD * 1.5 / s;
    let nseg = cfg.nseg, best = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      ctx.begin(attempt ? 'slic2' : 'slic', 0.18);
      const rnd = rng(cfg.seed);
      const got = yield* mosaicOnce(planes, w, h, mask, nseg, K, target, minBest, !!cfg.spatial, rnd);
      if (!best || Math.abs(got.n - target) < Math.abs(best.n - target)) best = got;
      if (!got.short && got.n <= Math.floor(target * 1.1 + 1e-9)) break;
      const next = clamp(Math.round(nseg * target / Math.max(1, got.n)), Math.round(target * 0.6), Math.round(target * 8));
      if (next === nseg) break; nseg = next;
    }
    cfg.pal = best.pal.length;
    const pz = yield* packShapePuzzle(best.reg, best.col, best.pal, w, h, best.n, cfg, ctx);
    pz.mosaic = { tier: cfg.tier, regions: best.n, pal: best.pal.length };
    return pz;
  }

  g.CBN = { PV, WORLD, PRE, cfgFor, rng, sniff, decodeFile, downscale, smooth, kmeans, tidy, modeFilter, labelRegions, mergeRegions, labelSpots, foldSpotless, trace, dpRing, encodeRings, decodeRings, resimplify, rleEnc, rleDec, run, drain, creep, drainTick, inflate, inflateG, ringsToPath, drawThumb, drawMapThumb, check, toLab, fromLab, E, MAXB, MPX, skinLab, isSkinHex, prepFace, rasterShapes, detailRun, mosaicCfg, mosaicRun };
})(typeof self !== 'undefined' ? self : this);
