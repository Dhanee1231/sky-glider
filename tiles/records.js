// ===== Fun Zone records (shared): score history, top-3 podiums, a Records screen and the NEW RECORD party =====
// The same block lives in Sky Glider (index.html + SkyGlider.html), Crystal Cave (crystal-cave/index.html) and Gem Tiles (tiles/records.js).
// Source of truth: dev/records/funrecords.js. After editing it, run dev/records/sync.py so every copy is identical.
// Each app keeps its records under its OWN NEW localStorage key (o.key); the game's existing save is never read or written here.
// Dates and times are shown in America/New_York (ET).
window.FunRecords = function (o) {
  const KEEP_RUNS = 200, CHEERS = ['New record! You\'re amazing!', 'Wow! That\'s your best score ever!', 'Hooray! A brand new high score!',
    'You did it! A new record! Super star!', 'Sparkly! You beat your own record!', 'Incredible! New high score!'];
  const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || (o.calm && o.calm());
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  // ---------- storage (additive, never destroys: an unreadable store is copied to <key>.bad first) ----------
  let D = { v: 1, runs: [], top: {}, best: null };
  try { const raw = localStorage.getItem(o.key); if (raw) { const d = JSON.parse(raw); if (isObj(d)) { D.runs = Array.isArray(d.runs) ? d.runs.filter(isObj) : []; D.top = isObj(d.top) ? d.top : {}; D.best = isObj(d.best) ? d.best : null; for (const k in d) if (!(k in D)) D[k] = d[k]; } } }
  catch (e) { try { const raw = localStorage.getItem(o.key); if (raw != null && localStorage.getItem(o.key + '.bad') == null) localStorage.setItem(o.key + '.bad', raw); } catch (_) { } }
  const persist = () => { try { localStorage.setItem(o.key, JSON.stringify(D)); } catch (e) { } };
  const better = o.better || ((a, b) => a.s > b.s || (a.s === b.s && a.t < b.t));
  const overall = o.overall || (e => e.s);
  // ---------- dates in ET ----------
  let FMT = null; try { FMT = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { }
  const when = t => !t ? 'Before records' : (FMT ? FMT.format(new Date(t)).replace(/, (\d{4}),/, ' $1 ·') + ' ET' : new Date(t).toLocaleString());
  // ---------- recording ----------
  // e = {c: category id, n: category name, g: group (cave / difficulty / world), s: score for ranking, st: stars, x: {extra shown values}}
  function record(e) {
    e = Object.assign({ t: Date.now() }, e); D.runs.push(e); if (D.runs.length > KEEP_RUNS) D.runs.splice(0, D.runs.length - KEEP_RUNS);
    const list = Array.isArray(D.top[e.c]) ? D.top[e.c].slice() : [], prev = list[0] || null;
    let at = list.findIndex(x => better(e, x)); if (at < 0) at = list.length; list.splice(at, 0, e); D.top[e.c] = list.slice(0, 3);
    const rank = at < 3 ? at : -1, prevBest = D.best, newOverall = !prevBest || overall(e) > overall(prevBest); if (newOverall) D.best = e;
    persist();
    return { rank, isNew: rank === 0 && !!prev, newOverall: newOverall && !!prevBest, prev, first: !prev };
  }
  // a past best from before records existed (shown as "Before records"); only fills an empty podium
  function seed(e) { if (Array.isArray(D.top[e.c]) && D.top[e.c].length) return; e = Object.assign({ t: 0 }, e); D.top[e.c] = [e]; if (!D.best || overall(e) > overall(D.best)) D.best = e; persist(); }
  // ---------- styles (injected once) ----------
  if (!document.getElementById('frCss')) { const st = document.createElement('style'); st.id = 'frCss'; st.textContent = `
.frRoot{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;color:#fff;font-family:inherit;overscroll-behavior:contain;
 background:radial-gradient(ellipse 90% 45% at 50% -8%,rgba(255,236,190,.4),transparent 70%),linear-gradient(170deg,#5a1a86,#2a0f58 60%,#1b0a3d);
 padding:max(10px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));animation:frIn .25s ease-out}
@keyframes frIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}
.frTop{display:flex;align-items:center;gap:10px;flex:none;max-width:860px;width:100%;margin:0 auto}
.frTop h1{flex:1;margin:0;font-size:clamp(24px,6vmin,38px);line-height:1;text-align:center;background:linear-gradient(90deg,#fff6c4,#f5c542,#fff,#e8e8f2,#f5c542);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:frShine 5s linear infinite;filter:drop-shadow(0 2px 0 #4a1066)}
@keyframes frShine{to{background-position:300% 0}}
.frX{flex:none;width:52px;height:52px;border-radius:50%;border:3px solid #f0c75e;background:linear-gradient(145deg,#fff,#ffd3ec);font-size:24px;font-weight:900;color:#7a1066;cursor:pointer;box-shadow:0 3px 0 #b8760a;touch-action:manipulation}
.frX:active{transform:translateY(2px)}
.frBody{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;max-width:860px;width:100%;margin:8px auto 0;padding-bottom:16px}
.frBest{position:relative;overflow:hidden;display:flex;align-items:center;gap:12px;border-radius:22px;padding:12px 14px;margin:6px 0 12px;background:linear-gradient(135deg,#fff6c4,#f5c542 55%,#ffb3e0);color:#4a1340;box-shadow:0 0 0 3px #fff,0 6px 18px rgba(0,0,0,.35)}
.frBest::after{content:"";position:absolute;top:-20%;bottom:-20%;width:30%;left:-40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.8),transparent);transform:skewX(-18deg);animation:frGl 4s ease-in-out infinite}
@keyframes frGl{0%,55%{left:-40%}90%,100%{left:120%}}
.frBest .cup{font-size:46px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))}
.frBest b{display:block;font-size:clamp(26px,7vmin,40px);line-height:1}.frBest small{display:block;font-weight:800;font-size:14px;opacity:.85}
.frChips{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 10px}
.frChips button{font:inherit;font-weight:800;font-size:15px;border:2px solid rgba(255,255,255,.55);border-radius:99px;padding:6px 14px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;touch-action:manipulation}
.frChips button.on{background:linear-gradient(180deg,#fff6c4,#f5c542);color:#4a1340;border-color:#fff}
.frH{font-size:20px;font-weight:900;margin:14px 2px 8px;text-shadow:0 2px 0 rgba(0,0,0,.35)}
.frGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.frCard{border-radius:20px;padding:10px 10px 8px;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.06));border:2px solid rgba(255,255,255,.3)}
.frCard h3{margin:0 0 4px;font-size:16px;line-height:1.15;text-align:center}
.frPod{display:grid;grid-template-columns:1fr 1.1fr 1fr;align-items:end;gap:6px}
.frStep{display:flex;flex-direction:column;align-items:center;text-align:center;min-width:0}
.frMed{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:19px;color:#4a1340;border:3px solid #fff;box-shadow:0 0 12px var(--g);background:radial-gradient(circle at 35% 30%,#fff,var(--m) 60%)}
.frStep .sc{font-weight:900;font-size:17px;line-height:1.1;margin-top:3px;word-break:break-word}
.frStep .dt{font-size:11px;opacity:.8;line-height:1.15}
.frStep .st{font-size:13px;letter-spacing:-1px;color:#ffe873;min-height:1em}
.frBlock{width:100%;border-radius:10px 10px 4px 4px;margin-top:4px;background:linear-gradient(180deg,var(--m),var(--d));box-shadow:inset 0 2px 0 rgba(255,255,255,.6)}
.frStep.g{--m:#ffd84a;--d:#c99014;--g:rgba(255,216,74,.9)}.frStep.g .frBlock{height:46px}
.frStep.s{--m:#e9edf6;--d:#9aa6c9;--g:rgba(220,230,255,.8)}.frStep.s .frBlock{height:32px}
.frStep.b{--m:#f0a868;--d:#a65d24;--g:rgba(240,168,104,.8)}.frStep.b .frBlock{height:22px}
.frStep.e{opacity:.35}
.frStep.g .frMed{animation:frBob 2.4s ease-in-out infinite}
@keyframes frBob{50%{transform:translateY(-4px) scale(1.06)}}
.frList{display:flex;flex-direction:column;gap:6px}
.frRow{display:flex;align-items:center;gap:10px;border-radius:14px;padding:7px 10px;background:rgba(255,255,255,.1)}
.frRow .w{flex:none;width:7.5em;font-size:12px;line-height:1.2;opacity:.85}
.frRow .n{flex:1;min-width:0;font-weight:800;font-size:14px;line-height:1.2}
.frRow .v{flex:none;font-weight:900;font-size:16px;text-align:right}.frRow .v i{font-style:normal;color:#ffe873;font-size:12px;display:block;letter-spacing:-1px}
.frEmpty{text-align:center;font-size:18px;font-weight:800;opacity:.9;padding:30px 10px}
.frParty{position:fixed;inset:0;z-index:9500;overflow:hidden;display:grid;place-items:center;cursor:pointer;background:radial-gradient(circle at 50% 45%,rgba(60,12,90,.88),rgba(12,0,30,.95));animation:frIn .2s ease-out}
.frParty canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.frWave{position:absolute;top:-10%;bottom:-10%;width:45%;left:-60%;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,240,200,.15) 30%,rgba(255,255,255,.65) 50%,rgba(255,200,240,.15) 70%,transparent);transform:skewX(-14deg);animation:frWave 1.5s ease-in-out .2s 2 both}
@keyframes frWave{from{left:-60%}to{left:120%}}
.frBan{position:relative;text-align:center;padding:0 16px;animation:frPop .6s cubic-bezier(.2,1.6,.4,1) both}
.frBan::before{content:"";position:absolute;left:50%;top:50%;width:min(130vw,900px);height:min(90vw,560px);transform:translate(-50%,-50%);z-index:-1;pointer-events:none;background:radial-gradient(ellipse,rgba(255,216,74,.4),rgba(255,106,213,.18) 40%,transparent 68%)}
@keyframes frPop{from{transform:scale(.2) rotate(-8deg);opacity:0}to{transform:none;opacity:1}}
.frBan h2{margin:0;font-size:clamp(44px,13vmin,110px);line-height:.95;font-weight:900;letter-spacing:1px;color:#fff6c4;
 text-shadow:0 0 18px #ffd84a,0 0 40px #ff6ad5,0 4px 0 #b8760a,0 7px 0 #7a1066;animation:frGlow 1.1s ease-in-out infinite alternate}
@keyframes frGlow{from{text-shadow:0 0 12px #ffd84a,0 0 28px #ff6ad5,0 4px 0 #b8760a,0 7px 0 #7a1066}to{text-shadow:0 0 26px #fff27a,0 0 60px #ff6ad5,0 4px 0 #b8760a,0 7px 0 #7a1066}}
.frBan .sc{margin-top:12px;font-size:clamp(30px,8vmin,60px);font-weight:900;color:#fff;text-shadow:0 3px 0 #7a1066,0 0 16px rgba(255,255,255,.6)}
.frBan .nm{margin-top:6px;font-size:clamp(17px,4vmin,26px);font-weight:800;color:#ffd1ec;text-shadow:0 2px 0 rgba(0,0,0,.4)}
.frBan .tap{display:inline-block;margin-top:14px;font-size:15px;font-weight:800;padding:5px 14px;border-radius:99px;background:rgba(40,8,70,.7);color:rgba(255,255,255,.9)}
@media (prefers-reduced-motion:reduce){.frRoot,.frParty,.frBan,.frBan h2,.frWave,.frStep.g .frMed,.frBest::after,.frTop h1{animation:none}.frWave{display:none}}`; document.head.appendChild(st); }
  // ---------- Records screen ----------
  let root = null, grp = 'all', onClose = null;
  const starStr = n => n == null ? '' : '★'.repeat(Math.max(0, Math.min(3, n | 0))) + '☆'.repeat(Math.max(0, 3 - (n | 0)));
  function step(e, cls, num) {
    if (!e) return `<div class="frStep ${cls} e"><div class="frMed">${num}</div><div class="sc">–</div><div class="dt">&nbsp;</div><div class="frBlock"></div></div>`;
    return `<div class="frStep ${cls}"><div class="frMed">${num}</div><div class="sc">${o.fmt(e)}</div><div class="st">${starStr(e.st)}</div><div class="dt">${esc(o.sub ? o.sub(e) : '')}</div><div class="dt">${esc(when(e.t))}</div><div class="frBlock"></div></div>`;
  }
  function render() {
    const cats = Object.keys(D.top).filter(c => Array.isArray(D.top[c]) && D.top[c].length), groups = [];
    cats.forEach(c => { const g = D.top[c][0].g; if (g && groups.indexOf(g) < 0) groups.push(g); });
    if (o.groupOrder) groups.sort((a, b) => o.groupOrder(a) - o.groupOrder(b));
    if (grp !== 'all' && groups.indexOf(grp) < 0) grp = 'all';
    const shown = cats.filter(c => grp === 'all' || D.top[c][0].g === grp)
      .sort((a, b) => Math.max(...D.top[b].map(e => e.t)) - Math.max(...D.top[a].map(e => e.t)));
    let h = '';
    if (!cats.length) h = `<div class="frEmpty">🏆<br>${esc(o.empty || 'Play to set your first record!')}</div>`;
    else {
      const B = D.best; if (B) h += `<div class="frBest"><span class="cup">🏆</span><div><small>${esc(o.bestLabel || 'Best ever')}</small><b>${o.fmt(B)}</b><small>${esc(B.n)}${o.sub ? ' · ' + esc(o.sub(B)) : ''} · ${esc(when(B.t))}</small></div></div>`;
      if (groups.length > 1) h += '<div class="frChips">' + ['all'].concat(groups).map(g => `<button data-g="${esc(g)}" class="${g === grp ? 'on' : ''}">${esc(g === 'all' ? (o.allLabel || 'All') : g)}</button>`).join('') + '</div>';
      h += '<div class="frGrid">' + shown.map(c => { const L = D.top[c]; return `<div class="frCard"><h3>${esc(L[0].n)}</h3><div class="frPod">${step(L[1], 's', 2)}${step(L[0], 'g', 1)}${step(L[2], 'b', 3)}</div></div>`; }).join('') + '</div>';
      const recent = D.runs.slice(-25).reverse().filter(e => grp === 'all' || e.g === grp);
      if (recent.length) h += `<div class="frH">${esc(o.recentLabel || 'Recent games')}</div><div class="frList">` + recent.map(e => `<div class="frRow"><span class="w">${esc(when(e.t))}</span><span class="n">${esc(e.n)}${o.sub ? `<br><small style="opacity:.8;font-weight:700">${esc(o.sub(e))}</small>` : ''}</span><span class="v">${o.fmt(e)}<i>${starStr(e.st)}</i></span></div>`).join('') + '</div>';
    }
    root.querySelector('.frBody').innerHTML = h;
  }
  function open(cb) {
    if (root) return; onClose = cb || null; root = document.createElement('div'); root.className = 'frRoot'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', o.title || 'Records');
    root.innerHTML = `<div class="frTop"><button class="frX" aria-label="Close">✕</button><h1>🏆 ${esc(o.title || 'Records')}</h1><span style="width:52px;flex:none"></span></div><div class="frBody"></div>`;
    if (o.font) root.style.fontFamily = o.font; document.body.appendChild(root); render();
    root.querySelector('.frX').addEventListener('click', () => { tap(); close(); });
    root.querySelector('.frBody').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) { grp = b.dataset.g; tap(); render(); } });
  }
  function close() { if (!root) return false; root.remove(); root = null; const f = onClose; onClose = null; if (f) f(); return true; }
  // ---------- sounds: a little tap, and the fanfare (own audio context unless the app shares one) ----------
  let AC = null; const ctx = () => { if (o.ac) { const c = o.ac(); if (c) return c; } if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (C) try { AC = new C(); } catch (e) { } } if (AC && AC.state === 'suspended') AC.resume().catch(() => { }); return AC; };
  const tone = (c, f, at, d, type, v, f2) => { const os = c.createOscillator(), g = c.createGain(); os.type = type; os.frequency.setValueAtTime(f, at); if (f2) os.frequency.exponentialRampToValueAtTime(f2, at + d);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, at + d); os.connect(g); g.connect(c.destination); os.start(at); os.stop(at + d + 0.05); };
  function tap() { if (o.muted && o.muted()) return; const c = ctx(); if (!c) return; const t = c.currentTime; tone(c, 988, t, 0.07, 'triangle', 0.08); tone(c, 1976, t + 0.03, 0.06, 'sine', 0.03); }
  function fanfare() { if (o.muted && o.muted()) return; const c = ctx(); if (!c) return; const t = c.currentTime + 0.05;
    [0, 4, 7, 12].forEach((s, i) => tone(c, 523 * Math.pow(2, s / 12), t + i * 0.1, 0.18, 'triangle', 0.14));
    [12, 16, 19, 24].forEach(s => tone(c, 523 * Math.pow(2, s / 12), t + 0.45, 0.9, 'triangle', 0.06));
    tone(c, 262, t + 0.45, 0.9, 'sine', 0.1); for (let i = 0; i < 10; i++) tone(c, 2200 + Math.random() * 2200, t + 0.5 + i * 0.07, 0.14, 'sine', 0.035); }
  // ---------- the human cheer: Kokoro clips listed in <voiceBase>manifest.json; the phone's voice only if a clip is missing ----------
  const ttsKey = t => { const s = String(t).toLowerCase().replace(/\s+/g, ' ').trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
  let MAN = null; if (o.voiceBase) try { fetch(o.voiceBase + 'manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => { if (j && isObj(j.clips)) MAN = j.clips; }).catch(() => { }); } catch (e) { }
  let lastCheer = '';
  function cheer() {
    if (o.muted && o.muted()) return; const pool = CHEERS.filter(x => x !== lastCheer), line = pool[Math.floor(Math.random() * pool.length)]; lastCheer = line;
    if (o.say) { o.say(line); return; }
    const syn = () => { try { if (window.speechSynthesis) { const u = new SpeechSynthesisUtterance(line); u.rate = 0.95; u.pitch = 1.15; speechSynthesis.cancel(); speechSynthesis.speak(u); } } catch (e) { } };
    if (!MAN || MAN[ttsKey(line)] == null) return syn();
    try { const a = new Audio(o.voiceBase + ttsKey(line) + '.ogg'); a.onerror = syn; const p = a.play(); if (p && p.catch) p.catch(syn); } catch (e) { syn(); }
  }
  // ---------- NEW RECORD party: fireworks, gem confetti, a shimmer wave across the screen, a glowing banner, fanfare and a cheer ----------
  let party = null;
  function celebrate(info) {
    if (party) endParty(); info = info || {}; const calm = RM();
    const el = document.createElement('div'); el.className = 'frParty'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', 'New record');
    el.innerHTML = `<canvas></canvas>${calm ? '' : '<div class="frWave"></div>'}<div class="frBan"><h2>${esc(info.title || 'NEW RECORD!')}</h2>${info.score != null ? `<div class="sc">${info.score}</div>` : ''}${info.name ? `<div class="nm">${esc(info.name)}</div>` : ''}<div class="tap">✨ Tap to keep playing ✨</div></div>`;
    if (o.font) el.style.fontFamily = o.font; document.body.appendChild(el);
    const cv = el.querySelector('canvas'), g = cv.getContext('2d'), DPR = Math.min(window.devicePixelRatio || 1, 1.5); let W = innerWidth, H = innerHeight; cv.width = W * DPR; cv.height = H * DPR;
    const P = [], CAP = calm ? 40 : 260, COLS = ['#fff', '#ffd84a', '#ff6ad5', '#7ff3ff', '#c79bff', '#e9edf6', '#ff9ec7'];
    const gem = (x, y, r, rot, col) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.8, -r * 0.2); g.lineTo(0, r); g.lineTo(-r * 0.8, -r * 0.2); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.8, -r * 0.2); g.lineTo(0, -r * 0.1); g.closePath(); g.fill(); g.restore(); };
    const star = (x, y, r) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.32 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
    const boom = (x, y) => { const c = COLS[(Math.random() * COLS.length) | 0], n = calm ? 0 : 34; for (let i = 0; i < n && P.length < CAP; i++) { const a = i / n * 6.283 + Math.random() * 0.2, s = 120 + Math.random() * 180; P.push({ k: 's', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 1 + Math.random() * 0.5, m: 1.5, r: 2.5 + Math.random() * 2.5, c: Math.random() < 0.3 ? '#fff' : c }); } };
    const rocket = () => P.length < CAP && P.push({ k: 'r', x: W * (0.15 + Math.random() * 0.7), y: H + 10, vx: (Math.random() - 0.5) * 60, vy: -(H * 0.9 + Math.random() * H * 0.4), l: 0.75 + Math.random() * 0.35, m: 1, r: 3, c: '#fff6c4' });
    const confetti = n => { for (let i = 0; i < n && P.length < CAP; i++) P.push({ k: 'g', x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 60, vy: 90 + Math.random() * 140, l: 4, m: 4, r: 6 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, c: COLS[i % COLS.length] }); };
    confetti(calm ? 30 : 70); let rk = 0, lt = performance.now(), t0 = lt, raf = 0;
    function tick(t) { const dt = Math.min(0.05, (t - lt) / 1000); lt = t; const age = (t - t0) / 1000; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
      if (!calm && age < 3.2) { rk -= dt; if (rk <= 0) { rocket(); rk = 0.28 + Math.random() * 0.25; } }
      if (!calm && age < 2.5 && Math.random() < dt * 8) confetti(3);
      for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.l -= dt; if (p.k === 'r' && (p.l <= 0 || p.vy > -40)) { boom(p.x, p.y); P.splice(i, 1); continue; } if (p.l <= 0 || p.y > H + 40) { P.splice(i, 1); continue; }
        if (p.k === 'r') { p.vy += 500 * dt; } else if (p.k === 's') { p.vx *= Math.pow(0.3, dt); p.vy = p.vy * Math.pow(0.3, dt) + 160 * dt; } else { p.rot += p.vr * dt; p.x += Math.sin(age * 3 + i) * 20 * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = p.k === 'g' ? 1 : Math.min(1, p.l / p.m * 2); g.fillStyle = p.c;
        if (p.k === 'g') gem(p.x, p.y, p.r, p.rot, p.c); else if (p.k === 'r') { g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); } else star(p.x, p.y, p.r * 1.6); }
      g.globalAlpha = 1; if (age < 6 && (P.length || age < 3.5)) raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick);
    fanfare(); setTimeout(() => { if (party && party.el === el) cheer(); }, 650);
    const born = performance.now(); el.addEventListener('click', () => { if (performance.now() - born > 700) endParty(); });
    party = { el, stop: () => cancelAnimationFrame(raf), timer: setTimeout(() => endParty(), calm ? 4000 : 5500), done: info.done };
  }
  function endParty() { if (!party) return false; const p = party; party = null; clearTimeout(p.timer); p.stop(); p.el.remove(); if (p.done) p.done(); return true; }
  return { record, seed, open, close, isOpen: () => !!root || !!party, back: () => endParty() || close(), celebrate, endParty, when, data: () => D, CHEERS, ttsKey };
};
// ===== /Fun Zone records =====
