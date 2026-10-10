// On-device music analysis: spectral-flux onsets, tempo estimate, DP beat tracking, chart generation.
// Nothing leaves the device. Works on a mono Float32Array at SR (22050).
(function (G) {
  const SR = 22050, N = 1024, HOP = 256, FPS = SR / HOP;
  // twiddles & bit-reversal swaps cached per size; twiddles use the exact same recurrence as the per-block loop did (bit-identical)
  const FT = {};
  function fftTables(n) {
    if (FT[n]) return FT[n]; const sw = [], tr = new Float64Array(n), ti = new Float64Array(n);
    for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) sw.push(i, j); }
    for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) { tr[len / 2 + k] = cr; ti[len / 2 + k] = ci; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
    return (FT[n] = { sw: Int32Array.from(sw), tr, ti });
  }
  function fft(re, im) {
    const n = re.length, { sw, tr: TR, ti: TI } = fftTables(n);
    for (let s = 0; s < sw.length; s += 2) { const i = sw[s], j = sw[s + 1]; let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    for (let len = 2; len <= n; len <<= 1) { const h = len >> 1;
      for (let i = 0; i < n; i += len)
        for (let k = 0; k < h; k++) { const p = i + k, q = p + h, cr = TR[h + k], ci = TI[h + k], tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
          re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; } }
  }
  // features per frame: flux (onset strength), band fluxes, centroid, rms
  function features(x, onProgress) {
    const nF = Math.max(1, Math.floor((x.length - N) / HOP) + 1), half = N / 2;
    const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    const flux = new Float32Array(nF), low = new Float32Array(nF), mid = new Float32Array(nF), high = new Float32Array(nF), cen = new Float32Array(nF), rms = new Float32Array(nF);
    let prev = new Float32Array(half), cur = new Float32Array(half); const re = new Float32Array(N), im = new Float32Array(N);
    const bLow = Math.round(200 / SR * N), bMid = Math.round(2000 / SR * N);
    for (let f = 0; f < nF; f++) {
      const o = f * HOP; let e = 0;
      for (let i = 0; i < N; i++) { const v = x[o + i] || 0; e += v * v; re[i] = v * win[i]; im[i] = 0; }
      rms[f] = Math.sqrt(e / N); fft(re, im);
      let fl = 0, l = 0, m = 0, h = 0, cs = 0, ms = 0;
      for (let k = 1; k < half; k++) { const mag = Math.log1p(100 * Math.sqrt(re[k] * re[k] + im[k] * im[k])); cur[k] = mag; const d = mag - prev[k];
        if (d > 0) { fl += d; if (k < bLow) l += d; else if (k < bMid) m += d; else h += d; } cs += k * mag; ms += mag; }
      flux[f] = fl; low[f] = l; mid[f] = m; high[f] = h; cen[f] = ms ? cs / ms : 0; const t = prev; prev = cur; cur = t;
      if (onProgress && f % 2000 === 0) onProgress(f / nF);
    }
    // flux at frame f compares windows centred at (f-1) and f -> onset ≈ centre of frame f minus half a hop
    return { flux, low, mid, high, cen, rms, nF };
  }
  const T0 = 0.033; // calibrated: flux at frame f peaks when an attack sits ~33 ms past the frame start
  const ft = f => f / FPS + T0;
  function normalize(a) { let m = 0; for (const v of a) m = Math.max(m, v); const o = new Float32Array(a.length); if (m > 0) for (let i = 0; i < a.length; i++) o[i] = a[i] / m; return o; }
  function onsetEnvelope(F) {
    // subtract a local mean so sustained loudness doesn't count; smooth lightly
    // each band is de-trended and normalised separately so kick drums count as much as hi-hats
    const n = F.nF, w = 8, env = new Float32Array(n);
    const band = (a, g) => { const o = new Float32Array(n); for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++) { s += a[j]; c++; } o[i] = Math.max(0, a[i] - s / c); } const z = normalize(o); for (let i = 0; i < n; i++) env[i] += g * z[i]; };
    band(F.low, 1.2); band(F.mid, 1); band(F.high, 0.5);
    return normalize(env);
  }
  function pickPeaks(env, delta) {
    const n = env.length, out = [], W = 3, M = Math.round(0.1 * FPS), minGap = Math.round(0.06 * FPS); let last = -1e9;
    for (let i = 1; i < n - 1; i++) {
      let isMax = true; for (let j = Math.max(0, i - W); j <= Math.min(n - 1, i + W); j++) if (env[j] > env[i]) { isMax = false; break; }
      if (!isMax) continue;
      let s = 0, c = 0; for (let j = Math.max(0, i - M); j <= Math.min(n - 1, i + M); j++) { s += env[j]; c++; }
      if (env[i] >= s / c + delta && i - last >= minGap) { out.push(i); last = i; }
    }
    return out;
  }
  function tempo(env, a = 0, b = env.length, prior = 120) {
    const minL = Math.round(FPS * 60 / 200), maxL = Math.round(FPS * 60 / 60); let best = 0, bestL = minL; const sc = [];
    for (let L = minL; L <= maxL; L++) { let s = 0; for (let i = Math.max(L, a); i < b; i++) s += env[i] * env[i - L];
      const bpm = 60 * FPS / L, w = Math.exp(-0.5 * Math.pow(Math.log2(bpm / prior) / (prior === 120 ? 0.9 : 0.35), 2)); sc[L] = s * w; }
    for (let L = minL; L <= maxL; L++) if (sc[L] > best) { best = sc[L]; bestL = L; }
    // parabolic refinement
    let L = bestL; if (sc[L - 1] != null && sc[L + 1] != null) { const a = sc[L - 1], b = sc[L], c = sc[L + 1], d = a - 2 * b + c; if (d) L = L + 0.5 * (a - c) / d; }
    return 60 * FPS / L;
  }
  // local tempo: 12 s windows every 4 s, biased toward the global tempo (handles tempo shifts / dholak speed-ups)
  function tempoMap(env, bpm) {
    const n = env.length, W = Math.round(12 * FPS), H = Math.round(4 * FPS), pts = [];
    for (let a = 0; a < n; a += H) { const b = Math.min(n, a + W); let e = 0; for (let i = a; i < b; i++) e += env[i];
      let lb = e / (b - a) > 0.02 && b - a > 4 * FPS ? tempo(env, a, b, bpm) : bpm;
      while (lb > bpm * 1.4) lb /= 2; while (lb < bpm / 1.4) lb *= 2; pts.push([(a + b) / 2, lb]); }
    const P = new Float32Array(n); let k = 0;
    for (let t = 0; t < n; t++) { while (k < pts.length - 2 && pts[k + 1][0] < t) k++;
      const [x0, y0] = pts[k], [x1, y1] = pts[Math.min(k + 1, pts.length - 1)], f = x1 > x0 ? Math.min(1, Math.max(0, (t - x0) / (x1 - x0))) : 0; P[t] = FPS * 60 / (y0 + (y1 - y0) * f); }
    return P;
  }
  function beatTrack(env, bpm) {
    const Pm = tempoMap(env, bpm), n = env.length, score = new Float32Array(n), back = new Int32Array(n).fill(-1), alpha = 100;
    // transition penalty depends only on (t-p, P): tabulate it while the local period stays constant (same expression -> identical)
    let mP = 0; for (const v of Pm) if (v > mP) mP = v; const pen = new Float64Array(Math.ceil(2 * mP) + 3); let tabP = NaN, lastP = NaN;
    for (let t = 0; t < n; t++) { const P = Pm[t], lo = Math.max(0, Math.round(t - 2 * P)), hi = t - Math.round(P / 2); let bs = 0, bp = -1;
      if (P !== tabP && P === lastP) { tabP = P; for (let d = Math.round(P / 2), e = Math.ceil(2 * P) + 2; d <= e; d++) { const l = Math.log(d / P); pen[d] = alpha * (l * l); } }
      if (P === tabP) { for (let p = lo; p <= hi; p++) { const v = score[p] - pen[t - p]; if (bp < 0 || v > bs) { bs = v; bp = p; } } }
      else for (let p = lo; p <= hi; p++) { const l = Math.log((t - p) / P), v = score[p] - alpha * (l * l); if (bp < 0 || v > bs) { bs = v; bp = p; } }
      lastP = P;
      score[t] = env[t] + (bp >= 0 ? Math.max(0, bs) : 0); back[t] = bs > 0 ? bp : -1; }
    let t = 0; for (let i = Math.max(0, n - Math.round(Pm[n - 1])); i < n; i++) if (score[i] > score[t]) t = i;
    const beats = []; while (t >= 0) { beats.push(t); t = back[t]; } beats.reverse();
    // refine each beat to the nearest envelope peak within ±2 frames
    return beats.map(b => { let m = b; for (let j = Math.max(0, b - 2); j <= Math.min(n - 1, b + 2); j++) if (env[j] > env[m]) m = j; return m; });
  }
  async function decodeToMono(arrayBuf) {
    const AC = window.AudioContext || window.webkitAudioContext, tmp = new AC();
    const buf = await tmp.decodeAudioData(arrayBuf.slice(0)); tmp.close && tmp.close();
    const len = Math.ceil(buf.duration * SR), off = new OfflineAudioContext(1, len, SR), s = off.createBufferSource(); s.buffer = buf; s.connect(off.destination); s.start();
    const r = await off.startRendering(); return { mono: r.getChannelData(0), duration: buf.duration };
  }
  function analyzeMono(mono, onProgress) {
    const F = features(mono, onProgress), env = onsetEnvelope(F); let bpmRaw = tempo(env);
    // octave check: prefer 80-160 BPM; double if the half-beat positions carry real hits, halve if too fast
    const gridMeans = bpm => { const P = FPS * 60 / bpm; let best = [0, 0];
      for (let ph = 0; ph < P; ph += 1) { let on = 0, off = 0, n = 0; for (let x = ph; x + P / 2 < env.length; x += P) { on += env[Math.round(x)]; off += env[Math.round(x + P / 2)]; n++; } if (n && on / n > best[0]) best = [on / n, off / n]; }
      return best; };
    while (bpmRaw < 80) bpmRaw *= 2; while (bpmRaw > 160) bpmRaw /= 2;
    { const [on, off] = gridMeans(bpmRaw); if (bpmRaw * 2 <= 160 && off >= 0.6 * on) bpmRaw *= 2; else if (bpmRaw / 2 >= 80 && bpmRaw > 135) { const [on2, off2] = gridMeans(bpmRaw / 2); if (off2 < 0.35 * on2) bpmRaw /= 2; } }
    const beatsF = beatTrack(env, bpmRaw); const peaks = pickPeaks(env, 0.06), softPeaks = pickPeaks(env, 0.012);
    // estimate the "loudness gate" so silent intros/outros get no tiles
    const sortedR = Array.from(F.rms).sort((a, b) => a - b), gate = sortedR[Math.floor(sortedR.length * 0.5)] * 0.25;
    // sharpen each onset in the time domain: largest jump in 3 ms log-energy within ±60 ms of the spectral peak
    const refine = t => { const B = Math.round(0.003 * SR), c = Math.round(t * SR), a = c - Math.round(0.07 * SR), le = [];
      for (let i = 0; i < 46; i++) { let e = 1e-9; for (let k = 0; k < B; k++) { const v = mono[a + i * B + k] || 0; e += v * v; } le.push(Math.log(e)); }
      let bi = -1, bv = 0; for (let i = 4; i < 46; i++) { const d = le[i] - (le[i - 1] + le[i - 2] + le[i - 3] + le[i - 4]) / 4; if (d > bv) { bv = d; bi = i; } }
      return bi < 0 || bv < 0.7 ? t : (a + bi * B) / SR; };
    // drop weak 'echo' peaks (drum ring / pitch glide) shortly after a strong hit, and peaks in the fading tail
    const keep = []; for (const f of peaks) { const p = keep[keep.length - 1]; if (p != null && (f - p) / FPS < 0.17 && env[f] < env[p] * 0.45) continue; keep.push(f); }
    const lastLoud = (() => { for (let f = F.nF - 1; f >= 0; f--) if (F.rms[f] > 0.25 * (F.rms.reduce((a, b) => Math.max(a, b), 0))) return f; return F.nF; })();
    peaks.length = 0; keep.filter(f => f <= lastLoud + Math.round(0.05 * FPS)).forEach(f => peaks.push(f));
    const onsets = peaks.map(f => ({ t: +refine(ft(f)).toFixed(4), s: env[f], c: F.cen[f], lo: F.low[f], hi: F.high[f] + F.mid[f] }));
    // keep only beats that land on a real attack: snap to the nearest onset within 80 ms (fixes drift across tempo
    // changes); beats with no attack nearby (alaap, rubato, quiet intros) are dropped and the chart falls back to melody onsets
    const beats = []; let lastB = -1;
    for (const f of beatsF) { const t = ft(f); let best = null;
      for (const o of onsets) { const d = Math.abs(o.t - t); if (d <= 0.08 && (!best || d < Math.abs(best.t - t))) best = o; }
      if (!best || F.rms[f] <= gate || best.s < 0.12 || best.t - lastB < 0.15) continue; beats.push(best); lastB = best.t; }
    // sustain map at ~20 fps for hold detection
    const soft = softPeaks.map(f => ({ t: +refine(ft(f)).toFixed(4), s: env[f], c: F.cen[f], lo: F.low[f], hi: F.high[f] + F.mid[f] }));
    const sus = []; for (let f = 0; f < F.nF; f += 4) sus.push(+(F.rms[f]).toFixed(4));
    return { bpm: +bpmRaw.toFixed(2), beats, onsets, soft, sus, susFps: FPS / 4, gate };
  }
  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  // difficulty: 'easy' | 'normal' | 'hard'. Returns [{t, lane, dur, lane2?}]
  function makeChart(A, diff, seed = 1) {
    const R = rng(seed), beatGap = 60 / A.bpm; let ev;
    const strongCut = (() => { const s = A.onsets.map(o => o.s).sort((a, b) => a - b); return s[Math.floor(s.length * (diff === 'hard' ? 0.25 : 0.6))] || 0; })();
    const step = diff === 'easy' && A.bpm > 135 ? 2 : 1;
    ev = A.beats.filter((b, i) => i % step === 0).map(b => ({ ...b, beat: 1 }));
    // fallback: in stretches with no beats (alaap, rubato, quiet intros) follow melodic/vocal onsets instead
    const fb = [], bt = [-1e9, ...A.beats.map(b => b.t), 1e9], minFb = diff === 'easy' ? 0.6 : diff === 'normal' ? 0.4 : 0.28;
    for (let i = 0; i < bt.length - 1; i++) if (bt[i + 1] - bt[i] > beatGap * 2.5) { let last = -9;
      const reg = (A.soft || A.onsets).filter(o => o.t > bt[i] + beatGap * 0.6 && o.t < bt[i + 1] - beatGap * 0.6);
      // max strength within ±3 s of each onset: the window is contiguous in t-order, so slide it with a monotonic deque
      const ix = reg.map((_, j) => j).sort((a, b) => reg[a].t - reg[b].t), mx = [], dq = []; let lo = 0, hi = 0, h0 = 0;
      for (const j of ix) { const t = reg[j].t;
        while (hi < ix.length && Math.abs(reg[ix[hi]].t - t) < 3) { const v = reg[ix[hi]].s; while (dq.length > h0 && reg[ix[dq[dq.length - 1]]].s <= v) dq.pop(); dq.push(hi++); }
        while (lo < hi && !(Math.abs(reg[ix[lo]].t - t) < 3)) lo++; while (dq[h0] < lo) h0++; mx[j] = reg[ix[dq[h0]]].s; }
      for (let j = 0; j < reg.length; j++) { const o = reg[j]; if (o.s > 0.3 * mx[j] && o.t - last >= minFb) { fb.push({ ...o, beat: 0 }); last = o.t; } } }
    ev = ev.concat(fb).sort((a, b) => a.t - b.t);
    if (diff !== 'easy') {
      const minD = diff === 'hard' ? 0.1 : 0.14;
      // "no event within minD": binary-search a sorted copy of ev times (pushed onsets inserted in place), exact test on the neighbourhood
      const st = ev.map(e => e.t), lb = x => { let a = 0, b = st.length; while (a < b) { const m = (a + b) >> 1; if (st[m] < x) a = m + 1; else b = m; } return a; };
      for (const o of A.onsets) if (o.s >= strongCut) { let ok = true;
        for (let i = lb(o.t - minD - 1e-6); i < st.length && st[i] <= o.t + minD + 1e-6; i++) if (!(Math.abs(st[i] - o.t) > minD)) { ok = false; break; }
        if (ok) { ev.push({ ...o, beat: 0 }); st.splice(lb(o.t), 0, o.t); } }
      ev.sort((a, b) => a.t - b.t);
      const minGap = diff === 'hard' ? 0.12 : 0.2; const out = []; for (const e of ev) { if (out.length && e.t - out[out.length - 1].t < minGap) continue; out.push(e); } ev = out;
    }
    // lanes by brightness (spectral centroid) percentile, with musical anti-repeat
    const cs = ev.map(e => e.c).sort((a, b) => a - b), q = p => cs[Math.floor(p * (cs.length - 1))] || 0, q1 = q(.25), q2 = q(.5), q3 = q(.75);
    let prevLane = -1, prevT = -9; const notes = [];
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i]; let lane = e.c < q1 ? 0 : e.c < q2 ? 1 : e.c < q3 ? 2 : 3;
      if (seed > 1) lane = (lane + seed) % 4; // regenerate -> fresh layout
      if (lane === prevLane && e.t - prevT < 0.45) lane = (lane + (R() < 0.5 ? 1 : 3)) % 4;
      const n = { t: +e.t.toFixed(3), lane, dur: 0 };
      // holds: sustained loud section until the next event
      const next = ev[i + 1] ? ev[i + 1].t : e.t + beatGap * 2, gap = next - e.t;
      const holdMin = diff === 'easy' ? beatGap * 1.9 : diff === 'normal' ? beatGap * 1.4 : beatGap * 0.95;
      if (gap >= holdMin && gap > 0.45) {
        let ok = true; const a = Math.floor((e.t + 0.1) * A.susFps), b = Math.floor((next - 0.1) * A.susFps);
        for (let k = a; k <= b; k++) if ((A.sus[k] || 0) < A.gate * 2) { ok = false; break; }
        if (ok) n.dur = +(gap - Math.min(0.25, beatGap * 0.4)).toFixed(3);
      }
      // doubles: a strong downbeat with both bass and treble energy
      if (diff !== 'easy' && e.beat && !n.dur && e.s > (diff === 'hard' ? 0.55 : 0.75) && e.lo > 0 && e.hi > 0 && R() < (diff === 'hard' ? 0.5 : 0.3) && (!ev[i + 1] || ev[i + 1].t - e.t > 0.3)) {
        n.lane2 = (lane + 2) % 4;
      }
      notes.push(n); prevLane = lane; prevT = e.t;
    }
    return notes;
  }
  G.TileAnalyze = { VERSION: 3, decodeToMono, analyzeMono, makeChart, SR };
})(typeof window !== 'undefined' ? window : globalThis);
