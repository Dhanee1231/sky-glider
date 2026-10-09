// WebAudio: live context for playback/menus + offline rendering of full built-in arrangements (Guitar Hero model:
// the song is ONE continuous track; taps never make sounds).
(function () {
  let ctx = null, master, sfxBus;
  const A = { muted: false, vol: 0.9 };
  A.ctx = () => ctx;
  A.init = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain(); master.gain.value = A.muted ? 0 : A.vol; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(master);
    return ctx;
  };
  A.master = () => master;
  A.setMuted = m => { A.muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : A.vol, ctx.currentTime, 0.02); };
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  A.mf = mf;
  A.midi = name => { const r = /^([A-G])(#|b)?(-?\d)$/.exec(name); if (!r) return null; const b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0); return b + 12 * (+r[3] + 1); };
  const noiseBuf = (c, sec, shape) => { const b = c.createBuffer(1, Math.max(1, Math.round(c.sampleRate * sec)), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * shape(i / d.length); return b; };
  // ---- voices (any context, any destination) ----
  const V = {};
  V.piano = (c, dest, m, t, dur, vel, bright = 1) => {
    const f = mf(m), out = c.createGain(), lp = c.createBiquadFilter(), decay = Math.max(0.6, 2.4 - (m - 48) * 0.035), len = Math.max(dur, 0.25) + decay * 0.8;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(16000, f * 9 * (0.6 + vel) * bright), t); lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.5, 400), t + decay);
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(0.3 * vel, t + 0.004); out.gain.exponentialRampToValueAtTime(0.12 * vel, t + 0.25); out.gain.setTargetAtTime(0.0001, t + Math.max(dur, 0.15), Math.min(0.25, decay / 5));
    [[1, 1], [2, 0.45], [3, 0.2], [4, 0.1], [5, 0.05]].forEach(([h, a], i) => { const o = c.createOscillator(), g = c.createGain(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f * h * (1 + 0.0004 * h * h); o.detune.value = i % 2 ? 3 : -3;
      g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(a * 0.02 + 1e-4, t + decay / (1 + h * 0.5)); o.connect(g); g.connect(lp); o.start(t); o.stop(t + len); });
    const ns = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(); ns.buffer = c.__hammer || (c.__hammer = noiseBuf(c, 0.03, x => 1 - x)); nf.type = 'bandpass'; nf.frequency.value = f * 4; ng.gain.value = 0.15 * vel; ns.connect(nf); nf.connect(ng); ng.connect(out); ns.start(t);
    lp.connect(out); out.connect(dest);
  };
  V.bass = (c, dest, m, t, dur, vel = 0.6) => { const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(); o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = mf(m); o2.frequency.value = mf(m) / 2;
    lp.type = 'lowpass'; lp.frequency.value = 700; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35 * vel, t + 0.01); g.gain.exponentialRampToValueAtTime(0.18 * vel, t + 0.2); g.gain.setTargetAtTime(0.0001, t + dur * 0.9, 0.05);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(dest); o.start(t); o2.start(t); o.stop(t + dur + 0.4); o2.stop(t + dur + 0.4); };
  V.pad = (c, dest, ms, t, dur, vel = 0.25) => { const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * vel, t + 0.08); g.gain.setTargetAtTime(0.0001, t + dur * 0.92, 0.08); lp.connect(g); g.connect(dest);
    ms.forEach((m, i) => [-6, 6].forEach(dt => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mf(m); o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + dur + 0.5); })); };
  V.kick = (c, dest, t, v = 0.7) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.32); };
  V.hat = (c, dest, t, v = 0.12) => { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = c.__hat || (c.__hat = noiseBuf(c, 0.05, x => Math.pow(1 - x, 4))); f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = v; s.connect(f); f.connect(g); g.connect(dest); s.start(t); };
  V.clap = (c, dest, t, v = 0.25) => { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = c.__clap || (c.__clap = noiseBuf(c, 0.15, x => Math.exp(-x * 5))); f.type = 'bandpass'; f.frequency.value = 1500; g.gain.value = v; s.connect(f); f.connect(g); g.connect(dest); s.start(t); };
  A.V = V;
  const reverb = (c, dest, amt) => { const v = c.createConvolver(), len = Math.round(c.sampleRate * 1.4), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3) * 0.5; }
    v.buffer = ir; const g = c.createGain(); g.gain.value = amt; v.connect(g); g.connect(dest); return v; };
  // Render one stem. events: {type:'piano'|'bass'|'pad'|'kick'|'hat'|'clap', ...}
  A.renderStem = async (events, dur, rev = 0.2) => {
    const sr = 44100, c = new OfflineAudioContext(2, Math.ceil(sr * dur), sr), comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(c.destination);
    const dry = c.createGain(); dry.connect(comp); const verb = rev ? reverb(c, comp, rev) : null;
    for (const e of events) { const d = e.wet && verb ? [dry, verb] : [dry];
      for (const dest of d) { if (e.type === 'piano') V.piano(c, dest, e.m, e.t, e.d, e.v, e.b); else if (e.type === 'bass') V.bass(c, dest, e.m, e.t, e.d, e.v); else if (e.type === 'pad') V.pad(c, dest, e.ms, e.t, e.d, e.v); else V[e.type](c, dest, e.t, e.v); } }
    return c.startRendering();
  };
  // menu-only sound effects (never used during gameplay)
  A.click = (t, hi) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = hi ? 1760 : 1320; g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.07); };
  A.sfx = (kind) => { if (!ctx || A.inGame) return; const t = ctx.currentTime;
    const seq = { coin: [88, 93], star: [84, 88, 91, 96], miss: [62, 58], tap: [84], unlock: [79, 83, 86, 91, 95], gift: [72, 76, 79, 84, 88, 91] }[kind] || [84];
    seq.forEach((m, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = mf(m); const s = t + i * 0.07;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.16, s + 0.01); g.gain.exponentialRampToValueAtTime(0.001, s + 0.25); o.connect(g); g.connect(sfxBus); o.start(s); o.stop(s + 0.3); }); };
  // gameplay effects (power-ups, poofs, combos, star power, world intro, results): own bus + volume. Never used for tile taps.
  let fxBus = null; A.fxVol = 0.5; A.fxOn = true;
  A.setFx = (on, vol) => { A.fxOn = on; A.fxVol = vol; if (fxBus) fxBus.gain.value = on ? vol * 0.5 : 0; };
  A.fx = kind => { if (!ctx || !A.fxOn || A.fxVol <= 0) return; if (!fxBus) { fxBus = ctx.createGain(); fxBus.gain.value = A.fxVol * 0.5; fxBus.connect(master); }
    const t = ctx.currentTime, tone = (m, s, d, type = 'sine', v = 0.12) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = mf(m); g.gain.setValueAtTime(0, t + s); g.gain.linearRampToValueAtTime(v, t + s + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + s + d); o.connect(g); g.connect(fxBus); o.start(t + s); o.stop(t + s + d + 0.02); };
    const sweep = (f0, f1, d, v = 0.12, type = 'triangle') => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(fxBus); o.start(t); o.stop(t + d + 0.02); };
    if (kind === 'powerup') { sweep(400, 1600, 0.25, 0.08, 'sine'); [84, 88, 91].forEach((m, i) => tone(m, 0.05 + i * 0.05, 0.25, 'sine', 0.07)); }
    else if (kind === 'poof') { sweep(300, 70, 0.3, 0.14, 'square'); tone(55, 0, 0.2, 'sine', 0.12); }
    else if (kind === 'combo') [79, 84, 88].forEach((m, i) => tone(m, i * 0.06, 0.3, 'triangle', 0.07));
    else if (kind === 'starpower') { sweep(200, 2400, 0.6, 0.06, 'sawtooth'); [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => tone(m, i * 0.05, 0.4, 'sine', 0.06)); }
    else if (kind === 'intro') [60, 67, 72, 79].forEach((m, i) => tone(m, i * 0.12, 0.5, 'triangle', 0.07));
    else if (kind === 'fanfare') [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36], [79, 0.5], [84, 0.62], [88, 0.62]].forEach(([m, s]) => tone(m, s, 0.45, 'triangle', 0.09));
    else if (kind === 'dodge') tone(91, 0, 0.12, 'sine', 0.04); };
  window.TAudio = A;
})();
