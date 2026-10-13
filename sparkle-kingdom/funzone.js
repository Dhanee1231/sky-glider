// ===== Fun Zone shared (Batch 01): grown-up settings, her sparkle name + praise voice, vibration, screen wake lock, play-time breaks =====
// Source: dev/fx/funzone.js. python3 dev/fx/sync.py copies it into Sky Glider (index.html + SkyGlider.html) and Crystal Cave
// (<script id="funzone">), and into tiles/funzone.js and home/funzone.js. Never edit a copy by hand.
// Own NEW keys only (no game save is touched):
//   funzone.parent.v1 = {v:1, minutes, vol, calm, big, lefty, shapes, vibe, relax}   written only by the hub's grown-ups panel
//   funzone.me.v1     = {v:1, nick}                                           her chosen sparkle name (hub picker)
//   funzone.play.v1   = {v:1, day, ms, plus}                                  today's play time (all apps) and grown-up extra minutes
// Every read survives missing/corrupt data (defaults; an unreadable value is copied to <key>.bad once and never overwritten).
(function () {
  if (window.FunZone) return;
  const PKEY = 'funzone.parent.v1', MKEY = 'funzone.me.v1', TKEY = 'funzone.play.v1';
  const PDEF = { v: 1, minutes: 0, vol: 100, calm: false, big: false, lefty: false, shapes: false, vibe: true, relax: false };
  const MINS = [0, 15, 20, 30, 45, 60, 90];
  const isO = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
  function readJ(k) {
    const raw = ls.get(k); if (raw == null) return null;
    try { const d = JSON.parse(raw); if (isO(d)) return d; } catch (e) { }
    if (ls.get(k + '.bad') == null) ls.set(k + '.bad', raw); return null;
  }
  // ---------- grown-up settings ----------
  function parent() {
    const d = readJ(PKEY) || {}, o = Object.assign({}, PDEF);
    if (MINS.indexOf(d.minutes) >= 0) o.minutes = d.minutes;
    if (typeof d.vol === 'number' && isFinite(d.vol)) o.vol = Math.max(0, Math.min(100, Math.round(d.vol)));
    for (const k of ['calm', 'big', 'lefty', 'shapes', 'vibe', 'relax']) if (typeof d[k] === 'boolean') o[k] = d[k];
    return o;
  }
  // only the hub's grown-ups panel calls this; unknown fields already in the key are kept
  function setParent(patch) { const d = readJ(PKEY) || {}; const o = Object.assign({}, d, parent(), patch || {}, { v: 1 }); ls.set(PKEY, JSON.stringify(o)); apply(); fire(); return parent(); }
  const rm = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const calm = () => parent().calm || rm();
  const vol = () => parent().vol / 100;
  function apply() {
    const p = parent(), c = document.documentElement.classList;
    c.toggle('fz-big', p.big); c.toggle('fz-lefty', p.lefty); c.toggle('fz-shapes', p.shapes); c.toggle('fz-calm', p.calm); c.toggle('fz-relax', p.relax);
  }
  const subs = [];
  const fire = () => { const p = parent(); subs.forEach(f => { try { f(p); } catch (e) { } }); };
  const onChange = f => { if (typeof f === 'function') subs.push(f); };
  // ---------- her sparkle name ----------
  const NICKS = [
    { id: 'dhanee', label: 'Dhanee', icon: '💖' }, { id: 'gemqueen', label: 'Gem Queen', icon: '👑' }, { id: 'sparkle', label: 'Sparkle', icon: '✨' },
    { id: 'princess', label: 'Princess', icon: '👸' }, { id: 'superstar', label: 'Superstar', icon: '⭐' }, { id: 'unicorn', label: 'Unicorn', icon: '🦄' },
    { id: 'butterfly', label: 'Butterfly', icon: '🦋' }, { id: 'rainbow', label: 'Rainbow', icon: '🌈' }, { id: 'cupcake', label: 'Cupcake', icon: '🧁' },
    { id: 'twinkle', label: 'Twinkle', icon: '🌟' }, { id: 'sweetpea', label: 'Sweet Pea', icon: '🌸' }];
  function me() { const d = readJ(MKEY) || {}; return { nick: typeof d.nick === 'string' ? d.nick : '' }; }
  function setNick(id) { const d = readJ(MKEY) || {}; d.v = 1; d.nick = NICKS.some(n => n.id === id) ? id : ''; ls.set(MKEY, JSON.stringify(d)); fire(); }
  // the name the apps say out loud: her picked sparkle name, else the hub name when it is one we have a voice clip for, else none
  function nick() {
    const n = NICKS.find(x => x.id === me().nick); if (n) return n;
    const hub = (ls.get('funzone-name') || '').trim().toLowerCase();
    return NICKS.find(x => x.label.toLowerCase() === hub) || null;
  }
  const spokenName = () => { const n = nick(); return n ? n.label : ''; };
  // ---------- praise pack (12 lines per app; every "<line>, <name>!" and "<line>!" has a Kokoro clip) ----------
  const PRAISE = {
    sg: ['What a flight', 'Super flying', 'You zoomed so fast', 'Wow, look at you go', 'High in the sky', 'Amazing flying', 'You are a star pilot', 'Brilliant race', 'Up, up and away', 'Fantastic flying', 'You did it', 'Sparkly flying'],
    cc: ['Gem-tastic', 'Crystal clear', 'You found the gems', 'Brilliant thinking', 'Super smart', 'Dazzling work', 'You are a gem', 'Shiny work', 'Wow, you got it', 'Amazing mining', 'Sparkling answer', 'Great job'],
    gt: ['You rocked that song', 'Super rhythm', 'What a beat', 'Amazing tapping', 'Dancing fingers', 'You are a music star', 'Gem-credible', 'Fabulous playing', 'Sparkly song', 'Wonderful music', 'You nailed it', 'Beautiful playing'],
    hub: ['Hi', 'Welcome back', 'Hello again', 'Yay, it is you']
  };
  let lastP = -1;
  function praise(app) { const L = PRAISE[app] || PRAISE.cc; let i = Math.floor(Math.random() * L.length); if (i === lastP) i = (i + 1) % L.length; lastP = i; return withName(L[i]); }
  const withName = line => { const n = spokenName(); return n ? line + ', ' + n + '!' : line + '!'; };
  // ---------- voice clips (each app's own audio/ folder + manifest.json; key = FNV-1a of the trimmed lower-cased text) ----------
  const ttsKey = t => { const s = String(t).toLowerCase().replace(/\s+/g, ' ').trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
  const mans = {};
  const manifest = dir => mans[dir] || (mans[dir] = fetch(dir + 'manifest.json').then(r => r.ok ? r.json() : null).then(j => (j && j.clips) || {}).catch(() => ({})));
  let el = null;
  // say(text, {dir:'audio/', muted}) plays the clip, falls back to the phone voice only when the line has no clip
  async function say(text, o) {
    o = o || {}; if (!text || o.muted) return false; const dir = o.dir || 'audio/';
    const m = await manifest(dir), k = ttsKey(text);
    stopSay();
    if (m[k] != null) {
      // a clip that can't start (autoplay not allowed yet) is skipped: the phone voice would be blocked too, and robotic
      try { el = new Audio(dir + k + '.ogg'); el.volume = Math.max(0, Math.min(1, vol() * (o.gain == null ? 1 : o.gain))); await el.play(); return true; } catch (e) { return false; }
    }
    try { if (window.speechSynthesis && vol() > 0) { const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.pitch = 1.15; u.volume = vol(); speechSynthesis.cancel(); speechSynthesis.speak(u); } } catch (e) { }
    return false;
  }
  function stopSay() { if (el) { try { el.pause(); } catch (e) { } el = null; } }
  // ---------- vibration: one grown-up on/off switch and a small budget (never for ordinary gameplay taps) ----------
  let bLast = 0, bWin = 0, bN = 0;
  function buzz(p) {
    if (!parent().vibe || !navigator.vibrate) return false; const now = Date.now();
    if (now - bLast < 220) return false; if (now - bWin > 60000) { bWin = now; bN = 0; } if (bN >= 14) return false;
    bLast = now; bN++; try { return navigator.vibrate(p || 30); } catch (e) { return false; }
  }
  // ---------- screen wake lock (e.g. during a song); re-taken when the page comes back ----------
  let wantWake = false, lock = null;
  async function takeWake() { if (!wantWake || lock || document.hidden || !navigator.wakeLock) return; try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); if (!wantWake) dropWake(); } catch (e) { lock = null; } }
  function dropWake() { const l = lock; lock = null; if (l) try { l.release(); } catch (e) { } }
  function wake(on) { wantWake = !!on; if (wantWake) takeWake(); else dropWake(); }
  // ---------- play time (all apps together, per day) ----------
  const day = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function play() { const d = readJ(TKEY) || {}, t = day(); if (d.day !== t) return { v: 1, day: t, ms: 0, plus: 0 }; return { v: 1, day: t, ms: Math.max(0, +d.ms || 0), plus: Math.max(0, +d.plus || 0) }; }
  let tick0 = 0;
  function count() { const now = Date.now(); if (tick0 && !document.hidden) { const dt = Math.min(30000, now - tick0); if (dt > 0) { const p = play(); p.ms += dt; ls.set(TKEY, JSON.stringify(p)); } } tick0 = document.hidden ? 0 : now; }
  const playMin = () => Math.floor(play().ms / 60000);
  const timeUp = () => { const m = parent().minutes; if (!m) return false; const p = play(); return p.ms >= (m + p.plus) * 60000; };
  function addMinutes(n) { count(); const p = play(); p.plus += n; ls.set(TKEY, JSON.stringify(p)); }
  // ---------- Fact of the Week (read-only): one of her tricky facts from the shared learning record, steady for the whole week ----------
  // fact() -> {key:'mul:7x8', op:'mul'|'add'|'sub'|'div', a, b, ans, text:'7 × 8'} or null. facts() lists every tricky fact of those kinds. Writes nothing.
  const FACT_RE = /^(?:(mul):(\d+)x(\d+)|(add):(\d+)\+(\d+)|(sub):(\d+)-(\d+)|(div):(\d+)÷(\d+))$/;
  function parseFact(key) {
    const m = FACT_RE.exec(key); if (!m) return null; let op, a, b, ans, text;
    if (m[1]) { op = 'mul'; a = +m[2]; b = +m[3]; ans = a * b; text = a + ' × ' + b; }
    else if (m[4]) { op = 'add'; a = +m[5]; b = +m[6]; ans = a + b; text = a + ' + ' + b; }
    else if (m[7]) { op = 'sub'; a = +m[8]; b = +m[9]; ans = a - b; text = a + ' − ' + b; }
    else { op = 'div'; a = +m[11]; b = +m[12]; if (!a || !b) return null; ans = a / b; text = a + ' ÷ ' + b; }
    if (!(ans >= 0) || ans !== Math.floor(ans) || ans > 200 || a > 200 || b > 200) return null;
    return { key, op, a, b, ans, text };
  }
  function facts() {
    try { if (!window.FunLearn) return []; return FunLearn.summary('').tricky.map(parseFact).filter(Boolean).sort((x, y) => x.key < y.key ? -1 : 1); } catch (e) { return []; }
  }
  const weekNo = () => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5 + 3) / 7); };   // weeks start on Monday
  function fact() { const L = facts(); return L.length ? L[weekNo() % L.length] : null; }
  // ---------- grown-up lock (shared by the hub panel and the break card): hold the gear 3 s, then ONE short WRITTEN-WORD question.
  // An adult reads it and taps a word. No speech, no audio, no math, no pictures. First option of each row is the right one (shuffled when shown). ----------
  const GATEQ = [
    ['Which word means the opposite of "temporary"?', 'permanent', 'brief', 'fragile', 'casual'],
    ['What do you call money you owe on a loan, added on top of what you borrowed?', 'interest', 'refund', 'salary', 'deposit'],
    ['Which word means to officially approve a law or plan?', 'ratify', 'dismiss', 'postpone', 'delete'],
    ['Which word describes a person who pays rent to live in a home?', 'tenant', 'landlord', 'neighbour', 'guarantor'],
    ['What is the word for a yearly payment to the government based on your income?', 'tax', 'tip', 'raffle', 'pension'],
    ['Which word means "to make something less severe"?', 'mitigate', 'aggravate', 'fabricate', 'escalate'],
    ['What do you call a document that proves you paid for something?', 'receipt', 'passport', 'invoice request', 'warranty claim'],
    ['Which word means the opposite of "scarce"?', 'plentiful', 'precious', 'ancient', 'hidden'],
    ['What do you call an insurance payment you make regularly?', 'premium', 'dividend', 'mortgage', 'bonus'],
    ['Which word means "careful about spending money"?', 'frugal', 'lavish', 'reckless', 'generous'],
    ['What is a person called who is legally responsible for a child but is not the parent?', 'guardian', 'tenant', 'witness', 'delegate'],
    ['Which word means "happening once every two years"?', 'biennial', 'annual', 'quarterly', 'perpetual'],
    ['Which word means "to put off until later"?', 'procrastinate', 'accelerate', 'negotiate', 'illustrate'],
    ['What do you call the legal right to use an invention exclusively?', 'patent', 'recipe', 'ticket', 'certificate of thanks'],
    ['Which word means a lasting effect left behind by someone or something?', 'legacy', 'rumour', 'souvenir', 'blueprint'],
    ['What is the word for a formal agreement between two parties?', 'contract', 'souvenir', 'nickname', 'sketch']
  ];
  let lastQ = -1;
  function gate(host, done, fail) {
    css(); let qi = Math.floor(Math.random() * GATEQ.length); if (qi === lastQ) qi = (qi + 1) % GATEQ.length; lastQ = qi;
    const q = GATEQ[qi], opts = q.slice(1).map((w, i) => ({ w, ok: i === 0 }));
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = opts[i]; opts[i] = opts[j]; opts[j] = t; }
    const esc = t => t.replace(/[<>&]/g, '');
    const box = document.createElement('div'); box.className = 'fzGate';
    box.innerHTML = '<p>For grown-ups: ' + esc(q[0]) + '</p><div class="fzQ">' + opts.map((o, i) => '<button class="fzB fzW" data-i="' + i + '">' + esc(o.w) + '</button>').join('') + '</div><div><button class="fzB fzNo">Cancel</button></div>';
    host.appendChild(box);
    box.onclick = e => { const b = e.target.closest('button'); if (!b) return; const r = b.classList.contains('fzW') && opts[+b.dataset.i].ok; box.remove(); if (r) done(); else if (fail) fail(); };
    return box;
  }
  function holdButton(btn, then) {
    let t = 0; const end = () => { clearTimeout(t); btn.classList.remove('hold'); };
    btn.addEventListener('pointerdown', e => { e.preventDefault(); btn.classList.add('hold'); t = setTimeout(() => { end(); then(); }, 3000); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => btn.addEventListener(n, end)); btn.addEventListener('contextmenu', e => e.preventDefault());
  }
  // ---------- "time for a break" card: apps call breakCheck() only at calm moments (menus, between songs/races/levels) ----------
  let card = null, shownAt = 0;
  function css() {
    if (document.getElementById('fzCss')) return; const s = document.createElement('style'); s.id = 'fzCss';
    s.textContent = '#fzBreak{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(60,0,60,.72);font-family:system-ui,sans-serif;touch-action:none}' +
      '#fzBreak .c{width:min(92vw,420px);max-height:94vh;overflow:auto;border:4px solid #f5c542;border-radius:26px;padding:18px 16px;text-align:center;color:#8a1270;background:linear-gradient(160deg,#ffe0f1,#fff)}' +
      '#fzBreak h2{font-size:clamp(24px,6vmin,34px);margin:6px 0}#fzBreak .h{font-size:min(22vmin,96px);line-height:1;animation:fzB 1.6s ease-in-out infinite}' +
      '@keyframes fzB{50%{transform:scale(1.12)}}.fz-calm #fzBreak .h{animation:none}' +
      '#fzBreak .row{display:flex;gap:12px;justify-content:center;align-items:center;margin-top:12px;flex-wrap:wrap}' +
      '.fzB{font:inherit;font-size:20px;font-weight:800;min-height:52px;padding:6px 22px;border-radius:99px;border:none;color:#fff;background:linear-gradient(#ff7ac8,#d6339f);cursor:pointer}' +
      '.fzNo{background:#b8b8c8}.fzGear{width:52px;height:52px;border-radius:50%;border:3px solid #e9e9f5;background:linear-gradient(145deg,#fff,#c8c8d8);font-size:24px;position:relative;cursor:pointer;touch-action:none}' +
      '.fzGear i{position:absolute;inset:-5px;border-radius:50%;border:4px solid #f5c542;clip-path:inset(0 100% 0 0);pointer-events:none}.fzGear.hold i{transition:clip-path 3s linear;clip-path:inset(0 0 0 0)}' +
      '.fzGate{margin-top:12px}.fzGate p{font-size:17px;font-weight:700}.fzGate .fzQ{display:flex;flex-direction:column;gap:8px;margin:8px 0}.fzGate .fzW{min-height:48px;font-size:18px;white-space:normal;line-height:1.15}.fzGate .fzNo{margin:4px 0 0;min-height:48px}' +
      '@media (max-height:520px){#fzBreak .c{padding:8px 14px}#fzBreak .h{font-size:44px}#fzBreak h2{font-size:22px;margin:2px 0}#fzBreak p{margin:2px 0}#fzBreak .row{margin-top:6px}.fzGate{margin-top:4px}.fzGate p{font-size:15px;margin:4px 0}.fzGate .fzQ{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:4px 0}.fzGate .fzW{min-height:44px;font-size:16px}.fzGate .fzNo{min-height:44px;margin:0}}';
    document.head.appendChild(s);
  }
  // o: {dir: voice clip folder, muted, onClose}
  function breakCheck(o) {
    o = o || {}; count(); if (card || !timeUp()) return false; if (Date.now() - shownAt < 4 * 60000) return false;
    css(); shownAt = Date.now(); const n = nick();
    card = document.createElement('div'); card.id = 'fzBreak';
    card.innerHTML = '<div class="c"><div class="h">💖</div><h2>Time for a little break' + (n ? ', ' + n.label.replace(/[<>&]/g, '') : '') + '!</h2><p style="font-size:18px">🧸 🥤 🌷</p>' +
      '<div class="row"><button class="fzB fzOk" aria-label="OK">OK 💖</button><button class="fzGear" aria-label="Grown-ups: hold for more time">⚙️<i></i></button></div><div class="g"></div></div>';
    document.body.appendChild(card);
    say(withName('Time for a little break'), { dir: o.dir, muted: o.muted });
    const close = () => { if (!card) return; card.remove(); card = null; stopSay(); if (o.onClose) o.onClose(); };
    card.querySelector('.fzOk').onclick = close;
    holdButton(card.querySelector('.fzGear'), () => gate(card.querySelector('.g'), () => { addMinutes(15); shownAt = 0; close(); }));
    return true;
  }
  const breakOpen = () => !!card;
  // ---------- boot ----------
  try { apply(); } catch (e) { }
  if (!document.documentElement.classList.contains('fz-big') && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  addEventListener('storage', e => { if (e.key === PKEY || e.key === MKEY) { apply(); fire(); } });
  document.addEventListener('visibilitychange', () => { count(); if (!document.hidden) { apply(); fire(); takeWake(); } });
  addEventListener('pageshow', () => { apply(); fire(); });
  addEventListener('pagehide', count);
  tick0 = Date.now(); setInterval(count, 15000);
  window.FunZone = { PKEY, MKEY, TKEY, PDEF, MINS, NICKS, PRAISE, parent, setParent, calm, vol, onChange, me, setNick, nick, spokenName, praise, withName,
    ttsKey, say, stopSay, buzz, wake, play, playMin, timeUp, addMinutes, breakCheck, breakOpen, holdButton, gate, GATEQ, fact, facts, parseFact };
})();
// ===== /Fun Zone shared =====
