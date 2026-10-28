// Color Magic audio. SFX are synthesised with WebAudio (no files). Voice = pre-generated Kokoro af_heart clips in audio/ (manifest.json + <ttsKey>.ogg).
// S10: no phone text-to-speech anywhere in this app; a line with no clip stays silent. Respects the Settings switches (Sounds / Voice / Music), the volume
// (Settings slider x FunZone.vol), and calm mode (fewer, softer sounds). One shared AudioContext, suspended while hidden or paused. Voice never overlaps itself.
(function () {
  'use strict';
  const FZ = window.FunZone, DIR = 'audio/';
  const LINES = {
    hello: "Hi! Let's make something beautiful!", back: "Welcome back! Let's keep coloring.", packs: 'Pick a picture to color!', photo: "Pick a photo, and I'll make it magic!",
    fall: 'Fall!', winter: 'Winter!', spring: 'Spring!', summer: 'Summer!', holidays: 'Holidays!', flowers: 'Flowers!', peek: 'Peek!', real: 'Ta-da, your real photo!',
    kid: 'Kid!', detailed: 'Detailed!', extreme: 'Extreme!',
    sq: 'Little squares!', sh: 'Big shapes!', d1: 'Tiny sparkle!', d2: 'Pretty picture!', d3: 'Big adventure!', d4: 'Giant quest!', d5: 'Super star!', d6: 'Master artist!', d7: 'Super sharp!', easy: 'Easy!', hard: 'Hard!', expert: 'Expert!', more: 'More colors!', fewer: 'Fewer colors!',
    make: 'Color magic!', making: 'Mixing your magic colors...', ready: 'Your picture is ready!', oops: "Hmm, let's try a different picture.", look: 'Look for this number!',
    half: 'Halfway there! Keep going!', few: 'A few sparkles left!', hint: "Look, here's one!", wand: 'Magic wand, whoosh!', burst: 'Sparkle burst!', pause: 'Paused! Tap play to keep coloring.',
    frame: 'You earned a sparkly frame!', gallery: "Here's your art gallery!", saved: 'Saved in your gallery!', grown: 'Ask a grown-up to help!', full: 'Your gallery is full. Ask a grown-up!',
    export: 'Saving your beautiful picture!', timelapse: 'Watch your picture come to life!'
  };
  const CD = ['You finished a color!', 'All done with that color!', 'Yay, that color is done!', 'Nice, one more color!', 'That color looks great!', 'Hooray, color complete!'];
  const DONE = ['You did it', 'What a masterpiece', "It's so beautiful", 'Look what you made', 'Amazing coloring', "You're a real artist"];
  const PRI = { finish: 9, frame: 8, saved: 8, full: 7, oops: 7, few: 6, half: 5, colordone: 4, look: 3 };
  const CALM_SKIP = new Set(['look', 'half', 'making', 'more', 'fewer', 'sq', 'sh', 'wand', 'burst']);   // calm mode speaks less
  const NOTES = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];   // major pentatonic over two octaves (semitones above the base note)
  const BED = [0, 4, 7, 9, 7, 4, 2, 4, 0, 4, 9, 12, 9, 7, 4, 2];   // music-box loop (semitones above C5)
  let ctx = null, master = null, sfx = true, voiceOn = true, musicOn = false, vol = 1, calm = false, paused = false, hidden = document.hidden, live = 0, noise = null;
  let seen = null, man = null, manP = null, vel = null, cur = null, cand = null, candT = 0, wait = null, lastLook = -1e9, bedOn = false, bedT = 0, bedI = 0;
  const log = [];   // QA spy: the last 200 voice decisions {id, text, key, played}
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  function ac() {
    if (ctx) return ctx; const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    try { ctx = new A(); master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination); } catch (e) { ctx = null; } return ctx;
  }
  const held = () => paused || hidden;
  const sfxOK = () => sfx && vol > 0 && !held();
  function tone(m, t0, dur, type, gain, m1) {   // short-lived oscillator; m = MIDI note, m1 = optional glide target
    const c = ac(); if (!c || live >= 12 || c.state !== 'running') return;   // never queue sound on a suspended clock (it would all fire at once on resume)
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0, a = (gain || 0.2) * (calm ? 0.5 : 1);
    o.type = type || 'sine'; o.frequency.setValueAtTime(midi(m), t); if (m1 != null) o.frequency.exponentialRampToValueAtTime(midi(m1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); live++; let d = 0; const fin = () => { if (d) return; d = 1; live--; o.disconnect(); g.disconnect(); }; o.onended = fin; setTimeout(fin, (t0 + dur) * 1000 + 600); o.start(t); o.stop(t + dur + 0.02);   // the timer is a backstop if 'ended' never arrives
  }
  function whoosh() {
    const c = ac(); if (!c || live >= 12 || c.state !== 'running') return;
    if (!noise) { noise = c.createBuffer(1, Math.round(c.sampleRate * 0.3), c.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }   // built once, reused
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    s.buffer = noise; f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2000, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07 * (calm ? 0.5 : 1), t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    s.connect(f); f.connect(g); g.connect(master); live++; let d = 0; const fin = () => { if (d) return; d = 1; live--; s.disconnect(); f.disconnect(); g.disconnect(); }; s.onended = fin; setTimeout(fin, 900); s.start(t); s.stop(t + 0.3);
  }

  // ---------- voice ----------
  function manifest() {
    if (man) return Promise.resolve(man);
    return manP || (manP = fetch(DIR + 'manifest.json').then(r => r.ok ? r.json() : null).then(j => (man = (j && j.clips) || {})).catch(() => { manP = null; return {}; }));
  }
  const keyOf = t => (FZ && FZ.ttsKey) ? FZ.ttsKey(t) : '';
  const nameLine = base => (FZ && FZ.withName) ? FZ.withName(base) : base + '!';
  function textFor(id) {
    if (id === 'finish') { const n = seen ? (seen.dn | 0) : 0; if (seen) seen.dn = (n + 1) % 6; return nameLine(DONE[n % 6]); }
    if (id === 'colordone') { const n = seen ? (seen.cd | 0) : 0; if (seen) seen.cd = (n + 1) % 6; return CD[n % 6]; }
    return LINES[id] || '';
  }
  function stopVoice() { if (vel) { try { vel.pause(); } catch (e) { } vel.onended = null; } cur = null; }
  async function playText(id, text, pri, then) {
    const k = keyOf(text), m = await manifest(), rec = { id, text, key: k, played: false }; log.push(rec); if (log.length > 200) log.shift();
    if (!k || m[k] == null) { if (then) say(then, { pri: PRI[then] }); return false; }   // no clip = silent (S10)
    if (!voiceOn || vol <= 0 || hidden) return false;
    if (!vel) { vel = new Audio(); vel.preload = 'auto'; }
    stopVoice(); cur = { id, pri }; vel.src = DIR + k + '.ogg'; vel.volume = Math.max(0, Math.min(1, vol * (calm ? 0.75 : 1)));
    vel.onended = () => { cur = null; if (then) say(then, { pri: PRI[then] }); };
    try { await vel.play(); rec.played = true; return true; } catch (e) { cur = null; rec.blocked = true; return false; }   // autoplay not allowed yet: stays silent
  }
  function flush() {
    candT = 0; const c = cand; cand = null; if (!c) return;
    if (cur && cur.pri >= 8 && c.pri < 8 && vel && !vel.ended && !vel.paused) return;   // the cheer is not cut by a small hint
    playText(c.id, c.text, c.pri, c.then).then(ok => { if (!ok && c.defer && log.length && log[log.length - 1].blocked) wait = c; });
  }
  // say(id, {delay ms, pri, then: id queued after this line ends, defer: retry on the first tap if autoplay is blocked})
  function say(id, o) {
    o = o || {}; if (!voiceOn || vol <= 0 || hidden || !FZ) return false;
    if (calm && CALM_SKIP.has(id)) return false;
    if (id === 'look') { const n = performance.now(); if (n - lastLook < 20000) return false; lastLook = n; }
    const text = textFor(id); if (!text) return false;
    const pri = o.pri != null ? o.pri : (PRI[id] || 5); wait = null;
    if (!cand || pri >= cand.pri) cand = { id, text, pri, then: o.then, defer: o.defer };   // the strongest line of this moment wins (newest on a tie)
    if (!candT) candT = setTimeout(flush, o.delay || 0); else if (o.delay) { clearTimeout(candT); candT = setTimeout(flush, o.delay); }
    return true;
  }

  // ---------- music-box bed (only when the Music switch is on, while a picture is being colored) ----------
  function bedStep() {
    bedT = 0; if (!bedOn || !musicOn || vol <= 0 || held()) return;
    tone(72 + BED[bedI++ % BED.length], 0, calm ? 0.7 : 0.55, 'sine', calm ? 0.05 : 0.07);
    bedT = setTimeout(bedStep, calm ? 900 : 620);
  }
  function bedSync() { if (bedOn && musicOn && vol > 0 && !held()) { if (!bedT) { ac(); bedT = setTimeout(bedStep, 200); } } else if (bedT) { clearTimeout(bedT); bedT = 0; } }

  // ---------- suspend / resume ----------
  function sync() {
    if (ctx) { if (held()) { if (ctx.state === 'running') ctx.suspend().catch(() => { }); } else if (ctx.state === 'suspended') ctx.resume().catch(() => { }); }
    bedSync();
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopVoice(); clearTimeout(candT); candT = 0; cand = null; } sync(); });
  document.addEventListener('pointerdown', () => { unlock(); if (wait) { const w = wait; wait = null; setTimeout(() => { if (!cand) say(w.id, { pri: w.pri }); }, 150); } }, true);   // first gesture: unlock audio, then a blocked greeting
  function unlock() { if (held()) return; const c = ac(); if (c && c.state === 'suspended') c.resume().catch(() => { }); }

  const A = {
    set(o) {
      if ('sfx' in o) sfx = !!o.sfx; if ('voice' in o) voiceOn = !!o.voice; if ('music' in o) musicOn = !!o.music; if ('vol' in o) vol = Math.max(0, Math.min(1, o.vol)); if ('calm' in o) calm = !!o.calm;
      if (master) master.gain.value = vol; if (vol <= 0) stopVoice(); if (!voiceOn) stopVoice(); bedSync();
    },
    attach(seenObj) { seen = seenObj; },
    hold(p) { paused = !!p; sync(); },
    bed(on) { bedOn = !!on; bedSync(); },
    unlock, stopVoice, say, log,
    get state() { return ctx ? ctx.state : 'none'; }, get live() { return live; }, get time() { return ctx ? ctx.currentTime : 0; },
    pop(step) { if (!sfxOK()) return; const n = NOTES[Math.abs(step | 0) % NOTES.length]; tone(72 + n, 0, 0.17, 'triangle', 0.2); if (!calm) tone(84 + n, 0.02, 0.09, 'sine', 0.05); },
    boop() { if (sfxOK()) tone(55, 0, 0.16, 'sine', 0.16, 51); },
    tick() { if (sfxOK() && !calm) tone(88, 0, 0.05, 'sine', 0.05); },
    colorDone() { if (!sfxOK()) return; (calm ? [76, 84] : [72, 76, 79, 84]).forEach((m, i) => tone(m, i * 0.09, 0.3, 'triangle', 0.2)); },
    wand() { if (!sfxOK()) return; const n = calm ? 3 : 8; for (let i = 0; i < n; i++) tone(79 + NOTES[i], i * 0.045, 0.2, 'sine', 0.12); },
    burst() { if (!sfxOK()) return; tone(84, 0, 0.14, 'sine', 0.18, 60); if (!calm) { tone(91, 0.05, 0.1, 'triangle', 0.08); tone(96, 0.1, 0.1, 'sine', 0.06); } },
    fanfare() {
      if (!sfxOK()) return; (calm ? [0, 4, 7] : [0, 4, 7, 12, 16, 19]).forEach((s, i) => tone(60 + s, i * 0.12, 0.45, 'triangle', 0.22));
      if (!calm) for (let i = 0; i < 6; i++) tone(84 + NOTES[(i * 3) % 10], 0.75 + i * 0.1, 0.15, 'sine', 0.08);   // twinkles, scheduled up front (no timers)
    },
    whoosh() { if (sfxOK() && !calm) whoosh(); }
  };
  window.CMAudio = A;
})();
