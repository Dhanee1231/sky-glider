// Sparkle Kingdom sound: small WebAudio jingles composed here (pentatonic, soft marimba/bell tones) + the human voice clips.
// Voice = Kokoro af_heart clips in audio/ via FunZone.say (the phone's own voice is only the fallback for a line with no clip).
(function () {
  let ctx = null, master = null, muted = false, lastT = 0;
  const PENTA = [0, 2, 4, 7, 9];                       // major pentatonic steps
  const freq = (n) => 261.63 * Math.pow(2, n / 12);    // C4 + semitones
  const note = (i) => PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);
  function vol() { try { return window.FunZone ? FunZone.vol() : 1; } catch (e) { return 1; } }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => { }); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); setGain();
    } catch (e) { ctx = null; }
  }
  function setGain() { if (master) master.gain.value = muted ? 0 : 0.5 * vol(); }
  // one soft bell/marimba pluck: sine + quiet octave partial, quick decay
  function tone(f, t0, dur, g, type) {
    if (!ctx || muted) return; const t = ctx.currentTime + t0;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), a = ctx.createGain();
    o.type = type || 'sine'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2;
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.012); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const a2 = ctx.createGain(); a2.gain.value = 0.25; o.connect(a); o2.connect(a2); a2.connect(a); a.connect(master);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function glide(f0, f1, t0, dur, g) {
    if (!ctx || muted) return; const t = ctx.currentTime + t0, o = ctx.createOscillator(), a = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.02); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a); a.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  const SK = {
    init, setMuted(m) { muted = !!m; setGain(); }, refresh: setGain,
    gem(chain) { const now = performance.now(); if (now - lastT < 45) return; lastT = now; tone(freq(note(7 + (chain % 8))), 0, 0.28, 0.22); },
    pop(chain) { const n = note(2 + Math.min(chain, 9)); glide(freq(n - 7), freq(n + 5), 0, 0.16, 0.3); tone(freq(n + 12), 0.08, 0.35, 0.2); },
    block() { tone(freq(note(5)), 0, 0.3, 0.25); tone(freq(note(8)), 0.07, 0.4, 0.22); },
    heart() { [0, 2, 4, 7].forEach((s, i) => tone(freq(note(s + 5)), i * 0.07, 0.5, 0.22)); },
    rainbow() { [0, 1, 2, 3, 4, 5, 6].forEach((s, i) => tone(freq(note(s + 4)), i * 0.05, 0.4, 0.18)); },
    hurt() { glide(freq(-5), freq(-17), 0, 0.28, 0.28); },
    bonk() { glide(freq(-3), freq(-12), 0, 0.2, 0.25); },
    check() { tone(freq(note(7)), 0, 0.5, 0.25); tone(freq(note(9)), 0.12, 0.6, 0.25); },
    start() { [0, 2, 4].forEach((s, i) => tone(freq(note(s + 5)), i * 0.09, 0.4, 0.2)); },
    boing() { glide(freq(-2), freq(10), 0, 0.14, 0.2); },
    fanfare() { [0, 2, 4, 5, 7, 9, 10, 12].forEach((s, i) => tone(freq(note(s)), i * 0.11, 0.7, 0.24)); tone(freq(note(14)), 0.95, 1.2, 0.26); },
    star(i) { tone(freq(note(7 + i * 2)), 0, 0.7, 0.28); },
    say(line, o) {
      if (!line) return; try { if (window.FunZone) FunZone.say(line, Object.assign({ dir: 'audio/', muted }, o || {})); } catch (e) { }
    },
    stopSay() { try { if (window.FunZone) FunZone.stopSay(); } catch (e) { } }
  };
  window.SKAudio = SK;
})();
