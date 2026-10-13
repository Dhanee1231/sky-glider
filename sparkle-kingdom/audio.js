// Sparkle Kingdom sound (v3): small WebAudio jingles composed here (pentatonic bells, marimba plucks, soft whooshes), a quiet
// music-box tune per world (scheduled ahead on the audio clock from the game loop, never from timers), and the human voice clips.
// Voice = Kokoro af_heart clips in audio/ via FunZone.say (the phone's own voice is only the fallback for a line with no clip).
// Plain jump / flap taps make NO sound on purpose; sounds reward what happens (gems, pops, blocks, power-ups).
(function () {
  let ctx = null, master = null, sfxBus = null, musBus = null, noiseBuf = null, muted = false, lastT = 0;
  const PENTA = [0, 2, 4, 7, 9];
  const freq = (n) => 261.63 * Math.pow(2, n / 12);
  const note = (i) => PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);
  // v4 Settings panel (SKSave.settings): her volume x the grown-ups' volume; music and voice can be switched off separately
  function set() { try { return (window.SKSave && SKSave.settings()) || {}; } catch (e) { return {}; } }
  function myVol() { const v = set().vol; return typeof v === 'number' ? Math.max(0, Math.min(100, v)) / 100 : 1; }
  function vol() { let p = 1; try { p = window.FunZone ? FunZone.vol() : 1; } catch (e) { } return p * myVol(); }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => { }); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.connect(master); musBus = ctx.createGain(); musBus.gain.value = 0.32; musBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      setGain();
    } catch (e) { ctx = null; }
  }
  function setGain() { if (master) master.gain.value = muted ? 0 : 0.5 * vol(); if (musBus) musBus.gain.value = set().mus === false ? 0 : 0.32; }
  function tone(f, t0, dur, g, type, bus) {
    if (!ctx || muted) return; const t = ctx.currentTime + t0;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), a = ctx.createGain(), a2 = ctx.createGain();
    o.type = type || 'sine'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2; a2.gain.value = 0.25;
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.012); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a); o2.connect(a2); a2.connect(a); a.connect(bus || sfxBus); o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function toneAt(f, t, dur, g, type) {   // absolute time (music)
    if (!ctx || muted) return; const o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type || 'triangle'; o.frequency.value = f; a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.01); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a); a.connect(musBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function glide(f0, f1, t0, dur, g, type) {
    if (!ctx || muted) return; const t = ctx.currentTime + t0, o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.02); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a); a.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function whoosh(t0, dur, g, f0, f1) {
    if (!ctx || muted || !noiseBuf) return; const t = ctx.currentTime + t0, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), a = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + dur * 0.3); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(a); a.connect(sfxBus); s.start(t); s.stop(t + dur + 0.05);
  }
  // ---------- music box: 2 bars of melody over a soft bass, per world ----------
  const SONGS = {
    meadow: { bpm: 112, mel: [7, 9, 10, 9, 7, -1, 5, -1, 6, 7, 9, 7, 5, -1, 4, -1], bass: [0, 0, 3, 3] },
    sunset: { bpm: 104, mel: [5, 7, 9, -1, 7, 5, 4, -1, 5, 4, 2, -1, 4, 5, 7, -1], bass: [0, 3, 1, 4] },
    rainbow: { bpm: 120, mel: [10, 9, 7, 9, 10, 12, 10, -1, 9, 7, 5, 7, 9, -1, 7, -1], bass: [0, 2, 3, 4] },
    dusk: { bpm: 96, mel: [5, -1, 7, 9, 7, -1, 5, 4, 2, -1, 4, 5, 4, -1, 2, -1], bass: [0, 1, 3, 2] },
    silver: { bpm: 126, mel: [7, 7, 9, 10, 9, 7, 5, -1, 7, 9, 10, 12, 10, 9, 7, -1], bass: [0, 3, 0, 4] },
    treasure: { bpm: 132, mel: [10, 12, 14, 12, 10, 12, 14, 15, 14, 12, 10, 9, 10, -1, 12, -1], bass: [0, 2, 0, 3] },
    candy: { bpm: 124, mel: [9, 10, 12, 10, 9, 7, 9, -1, 10, 12, 14, 12, 10, -1, 9, -1], bass: [0, 3, 2, 4] },
    moon: { bpm: 88, mel: [7, -1, 9, -1, 10, 9, 7, -1, 5, -1, 7, 9, 7, -1, -1, -1], bass: [0, 2, 3, 1] },
    lagoon: { bpm: 100, mel: [5, 7, 9, 7, 5, -1, 9, 10, 9, 7, 5, -1, 4, 5, -1, -1], bass: [0, 3, 1, 3] },
    party: { bpm: 140, mel: [10, 10, 12, 14, 12, 10, 9, 10, 12, 12, 14, 15, 14, 12, 10, -1], bass: [0, 3, 0, 4] },
    map: { bpm: 92, mel: [7, -1, 9, 7, 5, -1, 4, -1, 5, 7, 9, -1, 7, -1, -1, -1], bass: [0, 3, 1, 2] }
  };
  let song = null, step = 0, nextT = 0, musOn = false, musFast = 1;
  function music(id) { song = SONGS[id] || null; step = 0; nextT = 0; musOn = !!song; }
  function tick() {   // called once per frame by the game loop
    if (!ctx || !musOn || !song || muted || ctx.state !== 'running') return;
    const spb = 60 / song.bpm / 2 / musFast; if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.25) {
      const m = song.mel[step % 16]; if (m >= 0) toneAt(freq(note(m)), nextT, spb * 2.2, 0.09, 'triangle');
      if (step % 4 === 0) toneAt(freq(note(song.bass[(step >> 2) % 4]) - 24), nextT, spb * 3.5, 0.11, 'sine');
      nextT += spb; step++;
    }
  }
  const SK = {
    init, setMuted(m) { muted = !!m; setGain(); }, refresh: setGain, tick, music, stopMusic() { musOn = false; }, fast(k) { musFast = k || 1; },
    // gems: the pitch climbs while she keeps collecting (chain)
    gem(chain) { const now = performance.now(); if (now - lastT < 40) return; lastT = now; tone(freq(note(7 + (chain % 10))), 0, 0.3, 0.2); },
    bigGem() { [0, 2, 4, 7].forEach((s, i) => tone(freq(note(9 + s)), i * 0.05, 0.45, 0.18)); },
    pop(chain) { const n = note(2 + Math.min(chain, 10)); glide(freq(n - 7), freq(n + 5), 0, 0.14, 0.32); tone(freq(n + 12), 0.07, 0.35, 0.2); },
    squeak() { glide(freq(14), freq(22), 0, 0.09, 0.1, 'triangle'); glide(freq(22), freq(12), 0.09, 0.1, 0.08, 'triangle'); },
    combo(n) { for (let i = 0; i < Math.min(n, 6); i++) tone(freq(note(10 + i)), i * 0.045, 0.3, 0.14); },
    block() { tone(freq(note(5)), 0, 0.25, 0.25, 'triangle'); tone(freq(note(8)), 0.06, 0.4, 0.2); },
    gift() { whoosh(0, 0.25, 0.25, 600, 3000); [0, 2, 4, 7, 9].forEach((s, i) => tone(freq(note(s + 7)), 0.1 + i * 0.06, 0.5, 0.18)); },
    heart() { [0, 2, 4, 7].forEach((s, i) => tone(freq(note(s + 5)), i * 0.07, 0.5, 0.22)); },
    power() { glide(freq(0), freq(24), 0, 0.35, 0.18, 'triangle'); [0, 1, 2, 3, 4, 5, 6].forEach((s, i) => tone(freq(note(s + 6)), 0.1 + i * 0.045, 0.4, 0.15)); },
    giant() { glide(freq(-12), freq(-24), 0, 0.5, 0.35, 'triangle'); tone(freq(note(0) - 12), 0.1, 0.6, 0.2); },
    thud() { glide(freq(-18), freq(-30), 0, 0.22, 0.32); },
    // v6 silly moments
    sneeze() { glide(freq(17), freq(21), 0, 0.18, 0.06, 'triangle'); whoosh(0.2, 0.22, 0.22, 3000, 900); },
    burp() { glide(freq(-5), freq(-9), 0, 0.28, 0.16, 'sawtooth'); glide(freq(2), freq(-2), 0.02, 0.24, 0.08, 'sine'); },
    shieldPop() { glide(freq(12), freq(24), 0, 0.08, 0.25); whoosh(0, 0.18, 0.2, 2000, 5000); },
    ring() { [0, 4, 7, 9].forEach((s, i) => tone(freq(note(s + 8)), i * 0.04, 0.5, 0.16)); },
    crown() { [0, 2, 4, 5, 7, 9, 10].forEach((s, i) => tone(freq(note(s + 7)), i * 0.06, 0.6, 0.2)); tone(freq(note(19)), 0.5, 1, 0.22); },
    portal() { whoosh(0, 0.7, 0.3, 300, 4000); for (let i = 0; i < 10; i++) tone(freq(note(5 + i)), i * 0.05, 0.35, 0.12); },
    hurt() { glide(freq(-5), freq(-15), 0, 0.26, 0.24); },
    bubble() { glide(freq(5), freq(17), 0, 0.3, 0.2); glide(freq(9), freq(21), 0.12, 0.3, 0.15); },
    bonk() { glide(freq(-3), freq(-12), 0, 0.18, 0.24); },
    check() { tone(freq(note(7)), 0, 0.5, 0.25); tone(freq(note(9)), 0.12, 0.6, 0.25); tone(freq(note(12)), 0.24, 0.7, 0.2); },
    start() { [0, 2, 4].forEach((s, i) => tone(freq(note(s + 5)), i * 0.09, 0.4, 0.2)); },
    boing() { glide(freq(-4), freq(14), 0, 0.18, 0.26, 'triangle'); },
    splash() { whoosh(0, 0.3, 0.22, 900, 300); glide(freq(-2), freq(12), 0.05, 0.25, 0.2, 'triangle'); },
    fanfare() { [0, 2, 4, 5, 7, 9, 10, 12].forEach((s, i) => tone(freq(note(s)), i * 0.11, 0.7, 0.24)); tone(freq(note(14)), 0.95, 1.2, 0.26); },
    bigStar() { [0, 4, 7, 12].forEach((s, i) => tone(freq(note(s + 7)), i * 0.07, 0.8, 0.22)); },
    star(i) { tone(freq(note(7 + i * 2)), 0, 0.7, 0.28); },
    tap() { tone(freq(note(12)), 0, 0.18, 0.12); },
    bossLaugh() { [0, 1, 2].forEach(i => glide(freq(2 - i), freq(-3 - i), i * 0.12, 0.1, 0.18, 'triangle')); },
    say(line, o) {
      if (!line || set().voice === false) return; try { if (window.FunZone) FunZone.say(line, Object.assign({ dir: 'audio/', muted, gain: myVol() }, o || {})); } catch (e) { }
    },
    stopSay() { try { if (window.FunZone) FunZone.stopSay(); } catch (e) { } }
  };
  window.SKAudio = SK;
})();
