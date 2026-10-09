// WebAudio piano (additive harmonics + hammer + filter envelope + small room reverb), backing beat and sfx.
(function () {
  let ctx = null, master, dry, verb, musicBus, sfxBus;
  const A = { muted: false, vol: 0.9 };
  A.ctx = () => ctx;
  A.init = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain(); master.gain.value = A.muted ? 0 : A.vol;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp); comp.connect(ctx.destination);
    dry = ctx.createGain(); dry.connect(master);
    verb = ctx.createConvolver(); const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3) * 0.5; }
    verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.22; verb.connect(vg); vg.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(master); sfxBus = ctx.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(dry);
    return ctx;
  };
  A.setMuted = m => { A.muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : A.vol, ctx.currentTime, 0.02); };
  A.musicBus = () => musicBus;
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  A.midi = name => { const r = /^([A-G])(#|b)?(-?\d)$/.exec(name); if (!r) return null; const b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0); return b + 12 * (+r[3] + 1); };
  // piano-like voice
  A.piano = (m, t = 0, dur = 0.5, vel = 0.8) => {
    if (!ctx) return; const now = Math.max(ctx.currentTime, t || ctx.currentTime), f = mf(m), out = ctx.createGain(), lp = ctx.createBiquadFilter();
    const decay = Math.max(0.6, 2.6 - (m - 48) * 0.035), len = Math.max(dur, 0.25) + decay;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(16000, f * 9 * (0.6 + vel)), now); lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.5, 400), now + decay);
    out.gain.setValueAtTime(0, now); out.gain.linearRampToValueAtTime(0.32 * vel, now + 0.004); out.gain.exponentialRampToValueAtTime(0.12 * vel, now + 0.25);
    out.gain.setTargetAtTime(0.0001, now + Math.max(dur, 0.2), decay / 4);
    [[1, 1], [2, 0.45], [3, 0.22], [4, 0.12], [5, 0.06], [6, 0.035]].forEach(([h, a], i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f * h * (1 + 0.0004 * h * h); o.detune.value = (i % 2 ? 3 : -3);
      g.gain.setValueAtTime(a, now); g.gain.exponentialRampToValueAtTime(a * 0.02 + 1e-4, now + decay / (1 + h * 0.5)); o.connect(g); g.connect(lp); o.start(now); o.stop(now + len); });
    // hammer
    const nb = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
    const ns = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain(); ns.buffer = nb; nf.type = 'bandpass'; nf.frequency.value = f * 4; ng.gain.value = 0.15 * vel; ns.connect(nf); nf.connect(ng); ng.connect(out); ns.start(now);
    lp.connect(out); out.connect(dry); out.connect(verb);
  };
  A.kick = (t, v = 0.7) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.32); };
  A.hat = (t, v = 0.12) => { const b = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = v; s.connect(f); f.connect(g); g.connect(musicBus); s.start(t); };
  A.clap = (t, v = 0.25) => { const b = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = 1500; g.gain.value = v; s.connect(f); f.connect(g); g.connect(musicBus); s.start(t); };
  A.click = (t, hi) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = hi ? 1760 : 1320; g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06); o.connect(g); g.connect(dry); o.start(t); o.stop(t + 0.07); };
  A.sfx = (kind) => { if (!ctx) return; const t = ctx.currentTime;
    const seq = { coin: [88, 93], star: [84, 88, 91, 96], miss: [62, 58], tap: [84], unlock: [79, 83, 86, 91, 95], gift: [72, 76, 79, 84, 88, 91] }[kind] || [84];
    seq.forEach((m, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = kind === 'miss' ? 'triangle' : 'sine'; o.frequency.value = mf(m); const s = t + i * 0.07;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(kind === 'miss' ? 0.12 : 0.18, s + 0.01); g.gain.exponentialRampToValueAtTime(0.001, s + 0.25); o.connect(g); g.connect(sfxBus); o.start(s); o.stop(s + 0.3); }); };
  window.TAudio = A;
})();
