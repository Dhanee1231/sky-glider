// Yoga Coach · Coach Sunny. Everything runs on this device; progress lives in localStorage.
import { POSES, POSE, JOURNEY, ROUTINES, MUSCLES, ADVENTURE_INTRO } from './poses.js';
import { drawFigure, timeline, poseAt } from './figure.js';
import { S, save, prof, isKid, today, logPose, logSession, logFlex, stats, muscleTotals, muscleWeeks, neglected, MILESTONES, BADGES, checkBadges, journeyDay, STICKERS, giveSticker, resetAll, resetProfile } from './store.js';
import { say, hush, caption, setCaptionEl, sfx, music, confetti, VOICES, voiceSettings, lastSpoken } from './coach.js';
import { L, CHECK_TARGETS } from './lines.js';
import { MEDIA, NO_REAL, mediaUrl, mediaBlob, LICENSE_TEXT } from './media.js';
import { bodySVG } from './body.js';
import { CHECKABLE } from './rules.js';
const SIDE_VIEW = ['chair', 'lunge', 'downdog', 'child', 'seatedfold', 'cobra', 'bridge', 'forwardfold'];

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const main = $('#main');
setCaptionEl($('#caption'));
let cleanups = [];
const onClean = f => cleanups.push(f);
function clean() { cleanups.forEach(f => { try { f(); } catch (e) { } }); cleanups = []; hush(); music(false); document.body.classList.remove('fullplay'); }
function toast(t, ms = 2400) { const e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('show'), ms); }
function modal(html, onMount) { const m = $('#modal'); m.innerHTML = `<div class="box">${html}</div>`; m.hidden = false; m.onclick = e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); }; onMount && onMount(m); }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
const canCam = id => CHECKABLE.includes(id);
const kidName = () => prof('kid').name || 'Kiddo', dadName = () => prof('dad').name || 'Dad';
const pName = (p, forceKid) => (forceKid ?? isKid()) ? `${p.emoji} ${p.kid}` : p.name;
const stepsSec = steps => steps.reduce((a, s) => a + (s.hold + 9) * (POSE[s.id].side ? 2 : 1), 0);

const COACH_SVG = `<svg viewBox="0 0 100 100" class="face" aria-hidden="true"><g fill="#ffc935">${Array.from({ length: 12 }, (_, i) => `<path transform="rotate(${i * 30} 50 50)" d="M50 2 L56 16 L44 16Z"/>`).join('')}</g><circle cx="50" cy="50" r="31" fill="#ffd84d" stroke="#f0a800" stroke-width="3"/><circle cx="39" cy="46" r="4" fill="#3a2a22"/><circle cx="61" cy="46" r="4" fill="#3a2a22"/><path d="M37 58 Q50 70 63 58" stroke="#3a2a22" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="31" cy="57" r="5" fill="#ff9a9a" opacity=".6"/><circle cx="69" cy="57" r="5" fill="#ff9a9a" opacity=".6"/></svg>`;
const coachSays = t => `<div class="coach">${COACH_SVG}<div class="bubble">${t}</div></div>`;

// ---------- theme / profile ----------
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
const appearance = () => prof().appearance || 'auto';
const isDark = () => appearance() === 'dark' || (appearance() === 'auto' && darkMQ.matches);
darkMQ.addEventListener?.('change', () => { if (appearance() === 'auto') { applyTheme(); route(); } });
function applyTheme() {
  const t = S.settings.theme === 'auto' || !S.settings.theme ? (isKid() ? 'kids' : 'calm') : S.settings.theme;
  document.body.className = document.body.className.replace(/theme-\w+/g, '').trim() + ' theme-' + t;
  document.body.classList.toggle('dark', isDark());
  document.body.classList.toggle('kidmode', isKid());
  $('#profBtn').textContent = (isKid() ? '🧒 ' : '🧔 ') + prof().name;
  $('#muteBtn').textContent = S.settings.voice ? '🔊' : '🔇';
  $('meta[name=theme-color]').content = getComputedStyle(document.body).getPropertyValue('--accbtn').trim() || '#23786f';
  voiceSettings();
}
const figTheme = () => (document.body.classList.contains('theme-kids') ? 'kids' : 'calm') + (document.body.classList.contains('dark') ? 'Dark' : '');
$('#profBtn').onclick = () => modal(`<h2>Who's practicing?</h2><div class="grid">${['dad', 'kid'].map(id => `<button class="tile" data-p="${id}" style="min-height:140px"><div style="font-size:48px">${id === 'kid' ? '🧒' : '🧔'}</div><div class="nm">${esc(prof(id).name)}</div><div class="kn">${stats(id).sessions} sessions</div></button>`).join('')}</div><p class="muted small">Each person has their own progress. Family sessions count for both.</p><button class="btn alt block" data-close>Close</button>`, m => $$('[data-p]', m).forEach(b => b.onclick = () => { S.active = b.dataset.p; save(); applyTheme(); closeModal(); sfx.pop(); route(); }));
$('#muteBtn').onclick = () => { S.settings.voice = !S.settings.voice; save(); applyTheme(); if (!S.settings.voice) hush(); toast(S.settings.voice ? 'Coach voice on' : 'Coach voice off (captions stay on)'); };
$('#fsBtn').onclick = () => { const d = document; if (d.fullscreenElement) d.exitFullscreen?.(); else d.documentElement.requestFullscreen?.().catch(() => toast('Fullscreen is not available here')); };
$('#setBtn').onclick = () => go('settings');
const ROOTS = ['home', 'journey', 'learn', 'family', 'progress'];
$('#homeBtn').onclick = () => { if (ROOTS.includes(cur.name)) return go('home'); if (history.length > 1 && navStack > 0) history.back(); else go(cur.name === 'pose' || cur.name === 'camcheck' ? 'learn' : cur.name === 'freeze' ? 'family' : 'home'); };
let navStack = 0;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
$$('#tabs button').forEach(b => b.onclick = () => { sfx.tap(); go(b.dataset.go); });

// ---------- router ----------
let cur = { name: 'home', arg: null };
function go(name, arg = null) { const h = '#' + name + (arg != null ? '/' + arg : ''); if (location.hash !== h) { history.pushState(null, '', h); navStack++; } route(); }
window.addEventListener('popstate', () => { navStack = Math.max(0, navStack - 1); route(); });
const TITLES = { credits: 'Credits', home: 'Yoga Coach', journey: 'Beginner Journey', learn: 'Pose Library', pose: 'Pose Guide', family: 'Family Mode', progress: 'My Progress', muscles: 'My Muscles', settings: 'Settings', camcheck: 'Form Check', freeze: 'Freeze Game', play: 'Practice' };
function route() {
  clean(); closeModal();
  const [name, arg] = (location.hash.slice(1) || 'home').split('/');
  cur = { name: SCREENS[name] ? name : 'home', arg };
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.go === ({ pose: 'learn', muscles: 'progress', freeze: 'family', camcheck: 'learn' }[cur.name] || cur.name)));
  main.scrollTop = 0;
  SCREENS[cur.name](arg);
  $('#ttl').textContent = TITLES[cur.name] || 'Yoga Coach';
  const root = ROOTS.includes(cur.name); $('#homeBtn').innerHTML = root ? '<span class="sun">🌞</span>' : '<span aria-hidden="true">⬅️</span>'; $('#homeBtn').setAttribute('aria-label', root ? 'Home' : 'Back');
}

// ---------- figure thumbnails ----------
function thumb(pose, frame = 'pose', w = 340, h = 296) {
  const d = Math.min(2, devicePixelRatio || 1), c = document.createElement('canvas'); c.width = w * d; c.height = h * d;
  const x = c.getContext('2d'); const fr = pose.frames[frame] || pose.frames[Object.keys(pose.frames)[1]] || pose.frames.start;
  drawFigure(x, fr, { x: 0, y: 0, w: w * d, h: h * d }, { anchor: pose.anchor, theme: figTheme() }); c.setAttribute('role', 'img'); c.setAttribute('aria-label', pose.name + ' illustration'); return c;
}
function poseTile(p, extra = '') { return `<button class="tile" data-pose="${p.id}"><span class="th" data-th="${p.id}"></span><div class="nm">${isKid() ? p.emoji + ' ' + esc(p.kid) : esc(p.name)}</div><div class="kn">${isKid() ? esc(p.name) : p.emoji + ' ' + esc(p.kid)}</div>${extra}</button>`; }
function fillThumbs(root = main) { $$('[data-th]', root).forEach(s => { if (!s.firstChild) s.appendChild(thumb(POSE[s.dataset.th])); }); }

// ---------- demo guide: animated figure or real-person video/photo ----------
const demoPref = () => S.settings.demo || 'real';
function makeGuide(holder, pose, opts = {}) {
  const md = MEDIA[pose.id];
  holder.innerHTML = `<div class="stage"><canvas class="fig"></canvas><div class="demo ${md && md.portrait ? 'portrait' : ''}"></div><div class="tag">${pose.emoji} ${esc(isKid() ? pose.kid : pose.name)}</div><div class="side" hidden></div>
   ${md ? `<div class="mode" role="group" aria-label="Demo type"><button data-m="real" aria-label="Real person demo">🎥 Real</button><button data-m="anim" aria-label="Animated demo">🎨 Animated</button></div>` : ''}
   ${md ? `<div class="credit">${md.type === 'video' ? '🎥' : '📷'} ${esc(md.credit.author)} · ${esc(md.credit.license)} · <button data-credits>credits</button></div>` : ''}</div>
  ${opts.controls === false ? '' : `<div class="vctl"><button class="btn" data-a="play" aria-label="Play or pause">⏸ Pause</button><button class="btn alt" data-a="slow">🐢 Slow-mo</button><button class="btn alt" data-a="voice">${opts.voice ? '🔊 Cues on' : '🔈 Cues off'}</button><div class="cap" aria-live="polite"></div></div>`}`;
  const stage = $('.stage', holder), cv = $('canvas', holder), ctx = cv.getContext('2d'), demo = $('.demo', holder);
  const tl = timeline(pose); let t = 0, playing = true, speed = 1, voice = !!opts.voice, lastIdx = -1, last = performance.now(), raf = 0, frozen = null, mode = 'anim', vid = null, dead = false;
  const capEl = $('.cap', holder);
  function size() { const r = cv.getBoundingClientRect(); const d = Math.min(3, devicePixelRatio || 1); const W = Math.max(50, Math.round(r.width * d)), H = Math.max(50, Math.round(r.height * d)); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } }
  function frame(now) {
    raf = requestAnimationFrame(frame); const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing && !frozen) t += dt * speed;
    let p, seg, idx;
    if (frozen) { const f = pose.frames[frozen]; p = { ...f, arch: (f.arch || 0) + Math.sin(now / 900) * 0.8 }; }
    else ({ p, seg, idx } = poseAt(pose, tl, t));
    if (mode === 'anim') { size(); ctx.clearRect(0, 0, cv.width, cv.height); drawFigure(ctx, p, { x: 0, y: 0, w: cv.width, h: cv.height }, { anchor: pose.anchor, theme: figTheme(), breath: 0.5 + 0.5 * Math.sin(now / 1270) }); }
    if (!frozen && idx !== lastIdx) { lastIdx = idx; if (capEl) capEl.textContent = seg.cap; if (voice) say(seg.cap); }
  }
  async function setMode(m, save_) {
    if (!md) m = 'anim'; mode = m; stage.classList.toggle('real', m === 'real');
    $$('.mode button', holder).forEach(b => { b.classList.toggle('on', b.dataset.m === m); b.setAttribute('aria-pressed', b.dataset.m === m); });
    if (save_) { S.settings.demo = m; save(); }
    if (m === 'real' && !demo.firstChild) {
      demo.innerHTML = `<div class="loading">Loading…</div>`;
      try {
        if (md.type === 'video') {
          const poster = mediaUrl(md.poster); const url = await mediaBlob(md.src); if (dead) return;
          demo.innerHTML = `<video muted loop playsinline autoplay preload="auto" poster="${poster}" aria-label="${esc(pose.name)} demonstrated by a real person"></video>`;
          vid = $('video', demo); vid.src = url; vid.playbackRate = speed; if (playing) vid.play().catch(() => { });
        } else {
          const url = await mediaBlob(md.src); if (dead) return;
          demo.innerHTML = `<img class="kb" alt="${esc(pose.name)} shown by a real person" src="${url}">`;
        }
      } catch (e) { demo.innerHTML = ''; setMode('anim'); toast('Real-person demo not available offline yet. Showing the animation.'); }
    }
    if (vid) { if (m === 'real' && playing) vid.play().catch(() => { }); else vid.pause(); }
  }
  $$('.mode button', holder).forEach(b => b.onclick = e => { e.stopPropagation(); sfx.tap(); setMode(b.dataset.m, true); });
  $('[data-credits]', holder)?.addEventListener('click', e => { e.stopPropagation(); go('credits', pose.id); });
  raf = requestAnimationFrame(frame);
  setMode(opts.mode || (md ? demoPref() : 'anim'));
  const api = {
    destroy() { dead = true; cancelAnimationFrame(raf); if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); } },
    play(on) { playing = on; const b = $('[data-a=play]', holder); if (b) b.textContent = on ? '⏸ Pause' : '▶ Play'; if (vid) on && mode === 'real' ? vid.play().catch(() => { }) : vid.pause(); const im = $('img.kb', demo); if (im) im.style.animationPlayState = on ? 'running' : 'paused'; },
    hold(fr) { frozen = fr; }, loop() { frozen = null; },
    side(txt) { const s = $('.side', holder); s.hidden = !txt; s.textContent = txt || ''; },
    restart() { t = 0; lastIdx = -1; },
    mode: () => mode, setMode,
    state: () => ({ t, playing, speed, voice, mode, cap: capEl ? capEl.textContent : '', video: vid ? { paused: vid.paused, time: vid.currentTime, ready: vid.readyState, w: vid.videoWidth } : null, img: !!$('img', demo) })
  };
  $$('[data-a]', holder).forEach(b => b.onclick = () => {
    sfx.tap(); const a = b.dataset.a;
    if (a === 'play') api.play(!playing);
    if (a === 'slow') { speed = speed === 1 ? 0.5 : 1; if (vid) vid.playbackRate = speed; b.textContent = speed === 1 ? '🐢 Slow-mo' : '🐇 Normal speed'; b.classList.toggle('alt', speed === 1); }
    if (a === 'voice') { voice = !voice; b.textContent = voice ? '🔊 Cues on' : '🔈 Cues off'; if (!voice) hush(); else lastIdx = -1; }
  });
  onClean(() => api.destroy());
  return api;
}

// ---------- screens ----------
const SCREENS = {};
function suggestPose(m) { return POSES.find(p => p.stretch.includes(m) && p.level <= 2) || POSES.find(p => p.stretch.includes(m) || p.strong.includes(m)); }
SCREENS.home = () => {
  const P = prof(), st = stats(), kid = isKid();
  const jd = journeyDay(P.journey);
  const neg = neglected()[0];
  const tips = kid ? ['Yoga is like being an animal for a little while. Which animal will you be today?', 'Breathe in like smelling a flower, breathe out like blowing out a candle!', 'Wobbling is part of the fun. Even flamingos wobble!']
    : ['Never push into pain. A gentle stretch should feel good, not sharp.', 'Breathe slowly through your nose. Your breath is your guide.', 'Little and often beats long and rare. Five minutes counts!', 'Bent knees are always allowed. Comfort first, shapes second.'];
  const tip = tips[new Date().getDate() % tips.length];
  const sp = neg ? suggestPose(neg.m) : null;
  main.innerHTML = `<div class="wrap">
  ${coachSays(`<b>Hi ${esc(P.name)}! I'm Coach Sunny.</b><br>${tip}`)}
  <div class="stats" style="margin-top:12px"><div class="card"><div class="stat">${st.streak}🔥</div>day streak</div><div class="card"><div class="stat">${st.minutes}</div>minutes</div><div class="card"><div class="stat">${st.sessions}</div>sessions</div><div class="card"><div class="stat">${st.mastered}/${POSES.length}</div>mastered</div></div>
  <h2>${jd ? 'Continue your Journey' : 'Journey complete! 🎓'}</h2>
  ${jd ? `<div class="card"><div class="row" style="justify-content:space-between"><div><div class="muted small">${esc(jd.week.title)} · Day ${jd.d + 1} of 4</div><div style="font-size:22px;font-weight:900">${esc(jd.day.name)}</div><div class="muted">${Math.round(stepsSec(jd.day.steps) / 60)} min · ${jd.day.steps.length} poses</div></div><button class="btn" id="contJ">▶ Start</button></div></div>` : `<div class="card">You finished all 16 sessions. Repeat any day or try a routine.</div>`}
  <h2>Quick routines</h2>
  <div class="grid wide">${ROUTINES.map(r => `<button class="card tile" data-r="${r.id}" style="min-height:96px;flex-direction:row;justify-content:flex-start;gap:14px;text-align:left;margin:0"><span style="font-size:40px">${r.emoji}</span><span><b>${esc(r.name)}</b><br><span class="muted small">${Math.round(stepsSec(r.steps) / 60)} min · ${esc((r.desc.split('·')[1] || '').trim())}</span></span></button>`).join('')}</div>
  ${sp ? `<div class="card" style="margin-top:12px">${coachSays(`💡 Your <b>${esc(MUSCLES[neg.m].name.toLowerCase())}</b> ${neg.days == null ? "haven't been worked yet" : `haven't been worked in ${neg.days} days`}. Try <b>${esc(sp.name)}</b>.`)}<div class="row" style="margin-top:8px"><button class="btn alt" data-pose="${sp.id}">Show me</button></div></div>` : ''}
  <div class="row" style="margin-top:14px"><button class="btn blue" id="camGo">📷 Check my form</button><button class="btn warm" id="famGo">👨‍👧 Family fun</button><button class="btn alt" id="musGo">💪 My muscles</button></div>
  <p class="privacy" style="margin-top:14px">🔒 Private by design: your camera video is processed only on this phone and is never uploaded or saved. Progress is stored only on this device.</p></div>`;
  $('#contJ')?.addEventListener('click', () => startJourney(P.journey));
  $$('[data-r]').forEach(b => b.onclick = () => { const r = ROUTINES.find(x => x.id === b.dataset.r); previewSteps(r.name, r.steps, () => startRoutine(r.id)); });
  $$('[data-pose]').forEach(b => b.onclick = () => go('pose', b.dataset.pose));
  $('#camGo').onclick = () => go('camcheck'); $('#famGo').onclick = () => go('family'); $('#musGo').onclick = () => go('progress', 'muscles');
};

SCREENS.journey = () => {
  const P = prof();
  main.innerHTML = `<div class="wrap">${coachSays('Four weeks of short sessions that slowly grow from about 5 to 15 minutes. Finish one to unlock the next. Repeat any day you like!')}
  ${JOURNEY.map((w, wi) => `<h2>${esc(w.title)}</h2><div class="grid">${w.days.map((d, di) => { const i = wi * 4 + di; const cls = i < P.journey ? 'done' : i === P.journey ? 'next' : 'locked'; return `<button class="tile ${cls}" data-j="${i}" ${cls === 'locked' ? 'aria-disabled="true"' : ''}><div style="font-size:30px">${cls === 'done' ? '✅' : cls === 'next' ? '▶️' : '🔒'}</div><div class="nm">Day ${i + 1}: ${esc(d.name)}</div><div class="kn">${Math.round(stepsSec(d.steps) / 60)} min · ${d.steps.length} poses</div></button>`; }).join('')}</div>`).join('')}</div>`;
  $$('[data-j]').forEach(b => b.onclick = () => { const i = +b.dataset.j; if (i > P.journey) { sfx.boing(); toast('Finish Day ' + (P.journey + 1) + ' to unlock this one'); return; } const jd = journeyDay(i); previewSteps(jd.day.name, jd.day.steps, () => startJourney(i)); });
};
function previewSteps(title, steps, start) {
  modal(`<h2>${esc(title)}</h2><p class="muted">${Math.round(stepsSec(steps) / 60)} minutes · ${steps.length} poses</p><ol class="list">${steps.map(s => `<li>${POSE[s.id].emoji} ${esc(pName(POSE[s.id]))} · ${s.hold}s${POSE[s.id].side ? ' each side' : ''}</li>`).join('')}</ol><div class="row"><button class="btn" id="mStart">▶ Start</button><button class="btn alt" data-close>Not now</button></div>`, m => $('#mStart', m).onclick = () => { closeModal(); start(); });
}
function startJourney(i) { const jd = journeyDay(i); if (!jd) return; startSession({ title: jd.day.name, steps: jd.day.steps, kind: 'journey', journeyIndex: i }); }
function startRoutine(id) { const r = ROUTINES.find(x => x.id === id); startSession({ title: r.name, steps: r.steps, kind: 'routine', family: !!r.family, story: !!r.family, together: true }); }

SCREENS.learn = () => {
  main.innerHTML = `<div class="wrap">${coachSays(isKid() ? 'Tap an animal to learn its shape!' : 'Tap any pose for a moving demo, step-by-step cues, muscles at work and a form check.')}
  <div class="seg" style="margin:12px 0" id="flt"><button class="on" data-f="all">All</button><button data-f="stand">Standing</button><button data-f="floor">Floor</button><button data-f="cam">📷 Camera check</button><button data-f="real">🎥 Real person</button></div>
  <div class="grid" id="pg"></div></div>`;
  const STAND = ['mountain', 'tree', 'warrior2', 'chair', 'forwardfold', 'star', 'sidebend', 'neck', 'shoulder'];
  const show = f => { $('#pg').innerHTML = POSES.filter(p => f === 'all' || (f === 'stand' && STAND.includes(p.id)) || (f === 'floor' && !STAND.includes(p.id)) || (f === 'cam' && canCam(p.id)) || (f === 'real' && MEDIA[p.id])).map(p => poseTile(p, prof().poses[p.id]?.mastered ? '<div class="kn">⭐ mastered</div>' : '<div class="kn">' + [MEDIA[p.id] ? (MEDIA[p.id].type === 'video' ? '🎥 video' : '🖼️ photo') : '', canCam(p.id) ? '📷 check' : ''].filter(Boolean).join(' · ') + '</div>')).join(''); fillThumbs(); $$('#pg [data-pose]').forEach(b => b.onclick = () => go('pose', b.dataset.pose)); };
  $$('#flt button').forEach(b => b.onclick = () => { $$('#flt button').forEach(x => x.classList.toggle('on', x === b)); show(b.dataset.f); });
  show('all');
};

function muscleCard(p) {
  const col = m => p.stretch.includes(m) && p.strong.includes(m) ? '#a05cff' : p.stretch.includes(m) ? '#3d8bfd' : p.strong.includes(m) ? '#ff8a3d' : null;
  const names = l => l.length ? l.map(m => esc(MUSCLES[m].name)).join(', ') : 'none';
  return `<div class="card" id="mcard"><h3>💪 Muscles at work</h3>${bodySVG(col)}
  <div class="legend" style="justify-content:center;margin:6px 0"><span><i style="background:#3d8bfd"></i>Stretched</span><span><i style="background:#ff8a3d"></i>Strengthened</span><span><i style="background:#a05cff"></i>Both</span></div>
  <p><b style="color:var(--stretch)">Stretches:</b> ${esc(p.muscleText.stretch)} <span class="muted small">(${names(p.stretch)})</span></p>
  <p><b style="color:var(--strong)">Strengthens:</b> ${esc(p.muscleText.strong)} <span class="muted small">(${names(p.strong)})</span></p>
  <p>✨ <b>Benefit:</b> ${esc(p.benefit)}</p></div>`;
}
SCREENS.pose = id => {
  const p = POSE[id] || POSES[0]; const ps = prof().poses[p.id];
  const yt = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(p.name + ' yoga pose for beginners');
  main.innerHTML = `<div class="wrap"><h1>${p.emoji} ${esc(isKid() ? p.kid : p.name)} <span class="muted" style="font-size:17px">${esc(isKid() ? p.name : p.kid)}</span></h1>
  <div class="two"><div><h3 style="margin-top:0">🎬 Watch the demo</h3><div id="guide"></div>
   <div class="row" style="margin-top:10px"><button class="btn" id="prac">▶ Practice${p.side ? ' (both sides)' : ''}</button>${canCam(p.id) ? '<button class="btn blue" id="chk">📷 Check my form</button>' : ''}
   ${isKid() || (MEDIA[p.id] && MEDIA[p.id].type === 'video') ? '' : `<a class="btn alt hide-kid" id="yt" href="${yt}" target="_blank" rel="noopener noreferrer">▶️ Watch a real video</a>`}</div>
   ${ps ? `<p class="muted small">Practiced ${ps.n}× · best hold ${Math.round(ps.best)}s${ps.scores.length ? ' · best form ' + Math.max(...ps.scores.map(s => s[1])) + '%' : ''}${ps.mastered ? ' · ⭐ mastered' : ''}</p>` : ''}
   <div class="card" style="margin-top:10px">📖 <i>${esc(p.story)}</i> <button class="btn alt" id="story" style="min-height:44px;padding:6px 12px">🔊 Read it</button></div></div>
  <div><div class="card"><h3>How to do it</h3><ol class="list">${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
   <div class="card"><h3>⚠️ Common mistakes</h3><ul class="list">${p.mistakes.map(s => `<li>${esc(s)}</li>`).join('')}</ul><h3>🪄 Make it easier</h3><ul class="list">${p.mods.map(s => `<li>${esc(s)}</li>`).join('')}</ul><p class="small muted">🛟 Never push into pain. Ease off if anything feels sharp or pinchy.</p></div>
   ${muscleCard(p)}</div></div></div>`;
  window.__yoga.guide = makeGuide($('#guide'), p, { voice: false });
  $('#prac').onclick = () => startSession({ title: p.name, steps: [{ id: p.id, hold: isKid() ? 15 : 30 }], kind: 'pose' });
  $('#chk')?.addEventListener('click', () => go('camcheck', p.id));
  $('#story').onclick = () => { sfx.boing(); say(p.story); };
  if (NO_REAL.includes(p.id)) $('#guide').insertAdjacentHTML('beforeend', '<p class="muted small" style="margin:6px 0 0">🎨 Animated demo (no openly-licensed real-person video for this one yet).</p>');
};

// ---------- session player ----------
let SESSION = null;
function startSession(cfg) { SESSION = cfg; go('play'); }
function combine(evals) { const vis = evals.filter(e => e && e.visible); if (!vis.length) return evals[0]; return { ...vis[0], score: vis.reduce((a, e) => a + e.score, 0) / vis.length, good: vis.length === evals.length && vis.every(e => e.good) }; }
const RULE_LABEL = { legs: 'Legs', tall: 'Tall posture', level: 'Shoulders level', feet: 'Feet placed', arms: 'Arms', standleg: 'Standing leg strong', lift: 'Foot lifted', kneeout: 'Knee open', hands: 'Hands', frontknee: 'Front knee bent', backleg: 'Back leg straight', armslevel: 'Arms level', armslong: 'Arms long', stance: 'Wide stance', knees: 'Knees', chest: 'Chest', even: 'Feet', hips: 'Hips', shape: 'Nice shape', armsup: 'Arms up', wide: 'Wide legs', fold: 'Folding', head: 'Head relaxed', kneesout: 'Knees open', seated: 'Seated', height: 'Not too high', lying: 'Hips down', line: 'Long line', lean: 'Side lean', front: 'Front knee' };
const ruleLabel = id => RULE_LABEL[id] || id;
function camErr(e) { const n = e && e.name; return n === 'NotAllowedError' ? 'Camera permission was blocked. Allow the camera in Chrome site settings to use form check (everything else works without it).' : n === 'NotFoundError' ? 'No camera found on this device.' : 'Camera could not start: ' + (e && e.message || e); }
function camTipsModal(ok) {
  modal(`<h2>📷 Set up your form check</h2><ol class="list"><li>Prop your phone up at about hip height, <b>about 2 meters (6–7 ft) away</b>.</li><li>Make sure your <b>whole body, head to feet</b>, fits on screen. Landscape works great for wide poses.</li><li>Good light in front of you helps. Avoid a bright window behind you.</li><li>For floor poses, turn sideways to the camera.</li><li>Dots turn <b style="color:#1e9e55">green</b> when aligned, <b style="color:#b89400">yellow</b> when close, <b style="color:#e03333">red</b> when they need a fix.</li></ol><p class="privacy">🔒 All pose tracking happens on this phone. Video is never uploaded, recorded, or saved.</p><div class="row"><button class="btn" id="tipOk">Got it, start camera</button><button class="btn alt" data-close>Not now</button></div>`, m => $('#tipOk', m).onclick = () => { localStorage.setItem('yogaCoach.camTips', '1'); closeModal(); ok(); });
}
const withTips = f => localStorage.getItem('yogaCoach.camTips') ? f() : camTipsModal(f);
function scoreBg(ev) { return ev.good ? 'rgba(30,170,90,.9)' : ev.score > 0.5 ? 'rgba(200,150,0,.9)' : 'rgba(220,60,60,.9)'; }
function chipsHTML(ev) { return ev.rules.map(r => `<span class="chip ${r.status}">${r.status === 'good' ? '✔ ' + esc(ruleLabel(r.id)) : (r.status === 'ok' ? '~ ' : '✖ ') + esc(r.fix)}</span>`).join(''); }

let wakeLock = null;
async function keepAwake(on) { try { if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener?.('release', () => { wakeLock = null; }); } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; } } catch (e) { wakeLock = null; } }
SCREENS.play = () => {
  if (!SESSION) return go('home');
  const cfg = SESSION, kid = isKid() && !cfg.family, kidVoice = isKid() || !!cfg.family;
  const steps = [];
  const warm = S.settings.warm !== false && ['journey', 'routine', 'family'].includes(cfg.kind) && cfg.steps.length >= 3;
  if (warm) steps.push({ p: POSE[cfg.steps[0].id === 'easyseat' ? 'mountain' : 'easyseat'], hold: isKid() || cfg.family ? 12 : 20, warm: 'warm' });
  for (const s of cfg.steps) { const p = POSE[s.id]; const hold = Math.max(10, Math.round(s.hold * (isKid() ? 0.6 : 1))); if (p.side) { steps.push({ p, hold, side: 'Right side' }); steps.push({ p, hold, side: 'Left side', again: true }); } else steps.push({ p, hold }); }
  if (warm) steps.push({ p: POSE[cfg.steps[cfg.steps.length - 1].id === 'child' ? 'easyseat' : 'child'], hold: isKid() || cfg.family ? 15 : 25, warm: 'cool' });
  const camPossible = steps.some(s => canCam(s.p.id));
  const nm = p => kidVoice ? p.kid : p.name;
  document.body.classList.add('fullplay'); keepAwake(true); onClean(() => keepAwake(false));
  main.innerHTML = `<div class="wrap player"><div><div id="pguide"></div><div class="cam" id="pcam" hidden><video playsinline muted></video><canvas></canvas><div class="frame"></div><div class="msg"></div><div class="fixbar" id="pfix"></div><div class="score" hidden></div><div class="hold" id="phold"></div></div></div>
  <div><div class="card"><div class="muted small" id="pstep"></div><div style="font-size:24px;font-weight:900" id="pname"></div><div class="prog" style="margin:8px 0"><i id="pbar"></i></div>
   <div class="row" style="justify-content:center;gap:18px"><div class="ring" id="pring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" stroke="var(--line)" stroke-width="12" fill="none"/><circle id="parc" cx="60" cy="60" r="52" stroke="var(--acc)" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="327" stroke-dashoffset="327"/></svg><div class="num"><div><span id="pnum">…</span><small id="plbl">get ready</small></div></div></div>
   <div><div class="breath" id="pbreath"></div><div class="small muted" style="text-align:center" id="pbtxt">breathe</div></div></div>
   <div id="pcue" class="bubble" style="margin:8px 0;min-height:56px;font-weight:700" aria-live="polite"></div><div id="pnext2"></div><div id="pchips"></div></div>
   <div class="pctl"><button class="btn alt" id="pprev" aria-label="Previous pose">⏮</button><button class="btn" id="ppause">⏸ Pause</button><button class="btn alt" id="pnext" aria-label="Skip">⏭</button>${camPossible ? '<button class="btn blue" id="pcamb">📷 Form check</button>' : ''}<button class="btn alt" id="pexit">✖ End</button></div>
   ${cfg.family ? `<p class="muted small" style="text-align:center">Family session: counts for ${esc(dadName())} and ${esc(kidName())}.</p>` : ''}</div></div>`;
  let guide = null;
  let i = -1, phase = '', pt = 0, pdur = 0, paused = false, held = 0, elapsed = 0, raf = 0, last = performance.now(), restedInto = false, advDone = false;
  let lastSpeak = 0, breathT = 0, breathIn = false, said = {}, cam = null, camEval = null, scoreSum = 0, scoreN = 0, stepScores = [];
  const R = 327;
  function setGuide(p, side) { guide?.destroy(); guide = makeGuide($('#pguide'), p, { controls: false }); guide.side(side); }
  function setStep(k) {
    i = k; if (i >= steps.length) return finish();
    const s = steps[i]; setGuide(s.p, s.warm ? (s.warm === 'warm' ? 'Warm-up' : 'Cool-down') : s.side);
    if (cam) cam.poseId = canCam(s.p.id) && !s.warm ? s.p.id : null;
    $('#pstep').textContent = `Step ${i + 1} of ${steps.length}` + (cfg.title ? ' · ' + cfg.title : '');
    $('#pname').textContent = s.warm ? (s.warm === 'warm' ? '🌬️ Warm-up' : '🌙 Cool-down') : (kidVoice ? s.p.emoji + ' ' + s.p.kid : s.p.name) + (s.side ? ' · ' + s.side : '');
    $('#pbar').style.width = (i / steps.length * 100) + '%';
    held = 0; scoreSum = 0; scoreN = 0; said = {}; $('#pchips').innerHTML = ''; $('#pnext2').innerHTML = '';
    enter('intro');
  }
  function enter(ph) {
    phase = ph; pt = 0;
    const s = steps[i], p = s.p;
    if (ph === 'intro') {
      let txt, spoken;
      if (s.warm) txt = s.warm === 'warm' ? (kidVoice ? L.warmKid : L.warmAdult) : (kidVoice ? L.coolKid : L.coolAdult);
      else if (s.again) txt = `${L.otherSide} ${p.steps[1]}`;
      else if (cfg.story) { const lead = cfg.family && cfg.together === false ? (i % 2 ? L.kidLead : L.grownLead) : ''; txt = `${!advDone ? ADVENTURE_INTRO + ' ' : ''}${p.story}${lead ? ' ' + lead.replace('Little yogi', kidName()).replace('Grown-up', dadName()) : ''}`; spoken = `${!advDone ? ADVENTURE_INTRO + ' ' : ''}${p.story}${lead ? ' ' + lead : ''}`; advDone = true; }
      else txt = `${restedInto ? nm(p) + '.' : i === 0 ? L.begin + ' ' + nm(p) + '.' : L.next(nm(p))} ${p.steps[0]} ${p.steps[1]}`;
      restedInto = false;
      pdur = s.again ? 6 : s.warm ? 7 : Math.min(16, Math.max(8, txt.split(' ').length / 2.4));
      guide.loop(); guide.restart(); say(txt, { speak: spoken }); $('#pcue').textContent = txt; $('#plbl').textContent = 'get ready'; $('#pnum').textContent = '…'; $('#parc').setAttribute('stroke-dashoffset', R);
      if (cfg.family) sfx.boing();
    } else if (ph === 'hold') {
      pdur = s.hold; const dyn = s.warm || ['catcow', 'butterfly', 'neck', 'easyseat'].includes(p.id);
      if (!dyn) guide.hold('pose'); else guide.loop();
      const txt = s.warm ? L.breatheIn : s.again ? L.hold : `${p.steps[2] || ''} ${p.steps[3] || ''}`.trim();
      say(txt); $('#pcue').textContent = txt; $('#plbl').textContent = cam && cam.poseId ? 'good-form secs' : 'seconds'; sfx.bell(); lastSpeak = performance.now();
    } else if (ph === 'out') {
      pdur = 2.6; guide.loop(); const txt = L.release + ' ' + L.enc[i % L.enc.length]; say(txt); $('#pcue').textContent = txt;
      stepScores.push({ id: s.p.id, held, score: scoreN > 1 ? scoreSum / scoreN * 100 : null, target: s.hold });
    } else if (ph === 'rest') {
      const n = steps[i + 1]; pdur = kidVoice ? 4 : 5; restedInto = true;
      setGuide(n.p, 'Up next'); guide.loop();
      const txt = `${L.upNext(n.warm ? (kidVoice ? 'Cool-down' : 'Cool-down') : nm(n.p))} ${kidVoice ? L.restKid : L.restAdult}`;
      say(txt); $('#pcue').textContent = txt; $('#plbl').textContent = 'rest'; $('#parc').setAttribute('stroke-dashoffset', R);
      $('#pnext2').innerHTML = `<div class="upnext card" style="margin:0 0 8px"><span class="th" data-th="${n.p.id}"></span><div><div class="muted small">Up next${n.side ? ' · ' + n.side : ''}</div><b style="font-size:20px">${n.p.emoji} ${esc(nm(n.p))}</b><div class="muted small">${n.hold}s hold · tap ⏭ to start now</div></div></div>`;
      fillThumbs($('#pnext2'));
    }
  }
  function tick(now) {
    raf = requestAnimationFrame(tick); const dt = Math.min(0.2, (now - last) / 1000) * (window.__yoga.fast || 1); last = now; if (paused || i < 0 || i >= steps.length) return;
    pt += dt; elapsed += dt; const s = steps[i];
    if (phase === 'intro') { if (pt >= pdur) enter('hold'); }
    else if (phase === 'hold') {
      const camActive = !!(cam && cam.poseId && cam.running);
      if (!camActive || (camEval && camEval.good)) held += dt;
      if (camActive && camEval && camEval.visible) { scoreSum += camEval.score * dt; scoreN += dt; }
      const left = Math.max(0, s.hold - held);
      $('#pnum').textContent = Math.ceil(left); $('#parc').setAttribute('stroke-dashoffset', R * (1 - Math.min(1, held / s.hold)));
      if (camActive) $('#phold').textContent = Math.ceil(left) + 's';
      breathT += dt; if (breathT > 4) { breathT = 0; breathIn = !breathIn; $('#pbreath').classList.toggle('in', breathIn); $('#pbtxt').textContent = breathIn ? 'breathe in' : 'breathe out';
        if (!camActive && now - lastSpeak > 10000 && left > 7) { lastSpeak = now; say(breathIn ? L.breatheIn : L.breatheOut, { capMs: 3500 }); } else caption(breathIn ? 'Breathe in… 🌬️' : 'Breathe out… 🍃', 3500); }
      if (!said.half && held > s.hold / 2 && s.hold >= 20 && !s.warm) { said.half = 1; const e = kidVoice ? L.halfKid : L.halfAdult; say(e[i % e.length]); lastSpeak = now; }
      if (!said.five && left <= 5.2 && left > 4 && s.hold >= 15) { said.five = 1; say(L.fiveMore); lastSpeak = now; }
      if (left <= 3 && left > 0 && !said['c' + Math.ceil(left)]) { said['c' + Math.ceil(left)] = 1; sfx.tick(); }
      if (held >= s.hold || (camActive && pt > s.hold * 3)) { if (camActive && held < s.hold) say(L.effort); enter('out'); }
    } else if (phase === 'out') { if (pt >= pdur) { const n = steps[i + 1]; if (n && !n.again) enter('rest'); else setStep(i + 1); } }
    else if (phase === 'rest') { $('#pnum').textContent = Math.ceil(Math.max(0, pdur - pt)); $('#parc').setAttribute('stroke-dashoffset', R * (1 - Math.min(1, pt / pdur))); if (pt >= pdur) setStep(i + 1); }
  }
  const setPaused = v => { paused = v; $('#ppause').textContent = paused ? '▶ Resume' : '⏸ Pause'; guide.play(!paused); if (paused) { hush(); caption('Paused', 1500); } };
  $('#ppause').onclick = () => setPaused(!paused);
  $('#pnext').onclick = () => { sfx.tap(); if (phase === 'hold') enter('out'); else if (phase === 'intro') enter('hold'); else setStep(i + 1); };
  $('#pprev').onclick = () => { sfx.tap(); restedInto = false; setStep(Math.max(0, phase === 'intro' ? i - 1 : i)); };
  const endNow = () => { if (elapsed > 45) finish(true); else { SESSION = null; go('home'); } };
  $('#pexit').onclick = () => { if (elapsed < 20) return endNow(); const was = paused; setPaused(true); modal(`<h2>End this session?</h2><p>${elapsed > 45 ? 'Your practice so far will be saved.' : 'Less than a minute so far, so nothing will be saved yet.'}</p><div class="row"><button class="btn" id="mEnd">✖ End session</button><button class="btn alt" id="mKeep">▶ Keep going</button></div>`, m => { $('#mEnd', m).onclick = () => { closeModal(); endNow(); }; $('#mKeep', m).onclick = () => { closeModal(); setPaused(was); }; }); };
  const onVis = () => { if (document.hidden && !paused) setPaused(true); };
  document.addEventListener('visibilitychange', onVis); onClean(() => document.removeEventListener('visibilitychange', onVis));
  const onKey = e => { if (e.key === ' ' && e.target === document.body) { e.preventDefault(); setPaused(!paused); } else if (e.key === 'ArrowRight') $('#pnext').click(); };
  document.addEventListener('keydown', onKey); onClean(() => document.removeEventListener('keydown', onKey));
  const toggleCam = async () => {
    const btn = $('#pcamb');
    if (cam) { cam.stop(); cam = null; camEval = null; $('#pcam').hidden = true; $('#pguide').hidden = false; $('#pchips').innerHTML = ''; btn.textContent = '📷 Form check'; return; }
    const box = $('#pcam'); box.hidden = false; $('#pguide').hidden = true; btn.textContent = '🎬 Show demo';
    const { PoseCam } = await import('./camera.js');
    cam = new PoseCam($('video', box), $('canvas', box), { poseId: canCam(steps[i]?.p.id) && !steps[i]?.warm ? steps[i].p.id : null, facing: S.settings.facing, numPoses: cfg.family ? 2 : 1, onFrame: r => { camEval = r.evals.length ? (r.evals.length > 1 ? combine(r.evals) : r.evals[0]) : null; liveFeedback(box, camEval, cam && cam.poseId, phase === 'hold'); } });
    window.__yoga.cam = cam;
    try { await cam.start(m => { $('.msg', box).textContent = m; }); } catch (e) { $('.msg', box).textContent = camErr(e); }
  };
  $('#pcamb')?.addEventListener('click', () => cam ? toggleCam() : withTips(toggleCam));
  onClean(() => { if (cam) cam.stop(); });
  const fb = makeFeedback(kidVoice);
  function liveFeedback(box, ev, poseId, holding) {
    const msg = $('.msg', box), sc = $('.score', box);
    if (!poseId) { msg.textContent = 'No camera check for this one. Follow the demo!'; sc.hidden = true; $('#pfix').textContent = ''; $('#pchips').innerHTML = ''; box.classList.remove('lost'); return; }
    fb(box, ev, poseId, holding, msg, sc, $('#pfix'), $('#pchips'));
  }
  function finish(early) {
    cancelAnimationFrame(raf); if (cam) { cam.stop(); cam = null; }
    if (phase === 'hold' && held > 5) stepScores.push({ id: steps[i].p.id, held, score: scoreN > 1 ? scoreSum / scoreN * 100 : null, target: steps[i].hold });
    const pids = cfg.family ? ['dad', 'kid'] : [S.active];
    const scored = stepScores.filter(s => s.score != null); const avg = scored.length ? scored.reduce((a, s) => a + s.score, 0) / scored.length : null;
    const earned = [], stickers = [];
    for (const pid of pids) {
      for (const s of stepScores) if (s.held > 3) logPose(pid, s.id, s.held, { hold: s.held, full: s.held >= s.target - 0.5, score: s.score });
      logSession(pid, { sec: elapsed, kind: cfg.kind, title: cfg.title, poses: stepScores.length, score: avg, family: cfg.family, journeyIndex: early ? -1 : cfg.journeyIndex });
      prof(pid).stars += Math.max(1, Math.round(stepScores.length / 2));
      if (prof(pid).kid || cfg.family) stickers.push([pid, giveSticker(pid)]);
      earned.push(...checkBadges(pid).map(b => [pid, b]));
    }
    save(); SESSION = null; document.body.classList.remove('fullplay'); keepAwake(false);
    showCelebration({ title: early ? 'Nice practice!' : 'Session complete!', min: elapsed / 60, poses: stepScores.length, avg, earned, stickers, family: cfg.family });
  }
  window.__yoga.player = { state: () => ({ i, phase, held, elapsed, n: steps.length, cam: !!cam, warm: steps[i]?.warm || null, pose: steps[i]?.p.id, mode: guide?.mode() }) };
  setStep(0); raf = requestAnimationFrame(tick);
  onClean(() => cancelAnimationFrame(raf));
};

// Shared live camera coaching: one clear fix at a time, praise while steady, framing help.
function makeFeedback(kidVoice) {
  let lastFix = 0, wasGood = false, lostSince = 0, lowSince = 0, lastPraise = 0, hinted = false, curFix = '', fixSince = 0;
  return function (box, ev, poseId, holding, msg, sc, fixEl, chipsEl) {
    const now = performance.now();
    if (!ev || !ev.visible) {
      lostSince = lostSince || now; box.classList.toggle('lost', now - lostSince > 800);
      msg.textContent = ev ? ev.msg : L.noOne; sc.hidden = true; fixEl.textContent = '';
      if (holding && now - lastFix > 6500) { lastFix = now; say(ev ? ev.msg : L.noOne); }
      if (!hinted && SIDE_VIEW.includes(poseId) && now - lostSince > 8000) { hinted = true; say(L.sideHint); toast('Tip: turn sideways to the camera for this pose'); }
      return;
    }
    lostSince = 0; box.classList.remove('lost'); msg.textContent = '';
    sc.hidden = false; sc.textContent = Math.round(ev.score * 100) + '%'; sc.style.background = scoreBg(ev);
    if (chipsEl) chipsEl.innerHTML = chipsHTML(ev);
    // show only the single most important fix, and keep it on screen at least 2 s so it can be read
    const worst = !ev.good && ev.worst ? ev.worst.fix : '';
    if (worst !== curFix && (now - fixSince > 2000 || !curFix)) { curFix = worst; fixSince = now; }
    fixEl.className = 'fixbar ' + (ev.good ? 'good' : curFix && ev.worst && ev.worst.status === 'ok' ? 'ok' : '');
    fixEl.textContent = ev.good ? (kidVoice ? '✅ Super! Hold still' : '✅ Great form. Hold it') : curFix ? '👉 ' + curFix : '';
    if (!ev.good && ev.score < 0.45) { lowSince = lowSince || now; if (!hinted && SIDE_VIEW.includes(poseId) && now - lowSince > 12000) { hinted = true; say(L.sideHint); } } else lowSince = 0;
    if (!holding) { wasGood = false; return; }
    if (ev.good && !wasGood && now - lastFix > 2500) { lastFix = now; lastPraise = now; sfx.pop(); say(kidVoice ? L.goodKid : L.goodAdult); }
    else if (ev.good && now - lastPraise > 9000 && now - lastFix > 4000) { lastPraise = now; const a = kidVoice ? L.praiseKid : L.praiseAdult; say(a[Math.floor(now / 1000) % a.length]); }
    else if (!ev.good && curFix && now - lastFix > 5000) { lastFix = now; say(curFix); }
    wasGood = ev.good;
  };
}

function showCelebration(r) {
  sfx.yay(); confetti();
  const bName = id => { if (id.startsWith('m:')) { const [m, lim] = id.slice(2).split(':'); const ms = MILESTONES.find(x => x[0] == lim); return `${ms[2]} ${MUSCLES[m].name}: ${lim} min`; } const b = BADGES.find(x => x[0] === id); return b ? `${b[1]} ${b[2]}` : id; };
  const fam = isKid() || r.family;
  main.innerHTML = `<div class="wrap" style="max-width:640px;text-align:center" id="celebrate"><div class="big">🎉 ${esc(r.title)}</div>
  ${coachSays(fam ? 'You were AMAZING! Give each other a high five! ✋' : 'Wonderful work. Notice how your body feels right now.')}
  <div class="stats" style="margin:14px 0"><div class="card"><div class="stat">${r.min.toFixed(1)}</div>minutes</div><div class="card"><div class="stat">${r.poses}</div>poses</div>${r.avg != null ? `<div class="card"><div class="stat">${Math.round(r.avg)}%</div>form score</div>` : ''}</div>
  ${r.stickers.length ? `<div class="card"><h3>New stickers!</h3>${r.stickers.map(([pid, s]) => `<div>${esc(prof(pid).name)}: <span class="stk">${s}</span></div>`).join('')}</div>` : ''}
  ${r.earned.length ? `<div class="card"><h3>🏆 New badges</h3>${r.earned.map(([pid, b]) => `<div class="chip good">${esc(prof(pid).name)}: ${esc(bName(b))}</div>`).join('')}</div>` : ''}
  <div class="row" style="justify-content:center"><button class="btn" id="cHome">🏠 Home</button><button class="btn alt" id="cProg">📈 See progress</button><button class="btn alt" id="cMus">💪 My muscles</button></div></div>`;
  say(fam ? L.doneFam : L.doneAdult); $('#ttl').textContent = 'Well done!';
  $('#cHome').onclick = () => go('home'); $('#cProg').onclick = () => go('progress'); $('#cMus').onclick = () => go('progress', 'muscles');
}

// ---------- camera form check (standalone) ----------
SCREENS.camcheck = id => {
  const pid = canCam(id) ? id : 'mountain'; let poseId = pid, target = isKid() ? 10 : 20, people = 1;
  main.innerHTML = `<div class="wrap"><div class="two"><div>
   <div class="cam" id="cbox"><video playsinline muted></video><canvas></canvas><div class="frame"></div><div class="msg">Camera is off. Everything else works without it.</div><div class="fixbar" id="cfix"></div><div class="count" id="ccount"></div><div class="score" hidden></div><div class="hold" id="chold">${target}s</div><div class="ppl" id="cppl"></div></div>
   <div class="row" style="margin-top:10px"><button class="btn" id="cstart">📷 Start camera</button><button class="btn alt" id="cflip">🔄 Flip camera</button><button class="btn alt" id="cppl2">👤 One person</button></div>
   <p class="privacy" style="margin-top:10px">🔒 Pose tracking runs entirely on this phone. Your video is never uploaded, recorded, or saved.</p></div>
  <div><div class="card"><label class="fld">Pose to check<select id="cpose">${CHECKABLE.map(k => `<option value="${k}" ${k === pid ? 'selected' : ''}>${POSE[k].emoji} ${esc(POSE[k].name)} · ${esc(POSE[k].kid)}</option>`).join('')}</select></label>
   <div class="muted small">Hold target (timer only counts while your form is good)</div><div class="seg" id="ctgt">${CHECK_TARGETS.map(s => `<button data-s="${s}" class="${s === target ? 'on' : ''}">${s}s</button>`).join('')}</div>
   <div id="cfig" style="margin-top:10px"></div></div>
   <div class="card"><div id="cchips" class="muted">📍 Prop the phone up about 2 m (6–7 ft) away so your whole body, head to feet, is visible.</div></div>
   <div id="cres"></div></div></div></div>`;
  let guide = makeGuide($('#cfig'), POSE[poseId], { controls: false });
  let cam = null, held = 0, sum = 0, n = 0, last = 0, lastSay = 0, done = false, issues = {}, ready = false, counting = false, fb = makeFeedback(isKid()), cdTimers = [];
  const box = $('#cbox');
  const reset = () => { held = 0; sum = 0; n = 0; done = false; issues = {}; last = 0; ready = false; counting = false; cdTimers.forEach(clearTimeout); $('#ccount').textContent = ''; fb = makeFeedback(isKid()); $('#chold').textContent = target + 's'; $('#cres').innerHTML = ''; };
  onClean(() => cdTimers.forEach(clearTimeout));
  const countdown = () => { counting = true; const seq = [['3', L.count[2]], ['2', L.count[1]], ['1', L.count[0]], ['Go!', L.go]]; seq.forEach(([t, w], k) => cdTimers.push(setTimeout(() => { $('#ccount').textContent = t; say(w); sfx.tick(); if (k === 3) cdTimers.push(setTimeout(() => { $('#ccount').textContent = ''; ready = true; counting = false; }, 700)); }, 600 + k * 1000))); };
  $('#cpose').onchange = e => { poseId = e.target.value; guide.destroy(); guide = makeGuide($('#cfig'), POSE[poseId], { controls: false }); if (cam) cam.poseId = poseId; reset(); };
  $$('#ctgt button').forEach(b => b.onclick = () => { target = +b.dataset.s; $$('#ctgt button').forEach(x => x.classList.toggle('on', x === b)); reset(); });
  $('#cppl2').onclick = async () => { people = people === 1 ? 2 : 1; $('#cppl2').textContent = people === 2 ? '👥 Two people' : '👤 One person'; if (cam) await cam.setPeople(people); };
  $('#cflip').onclick = async () => { if (!cam) { S.settings.facing = S.settings.facing === 'user' ? 'environment' : 'user'; save(); toast(S.settings.facing === 'user' ? 'Front camera selected' : 'Back camera selected'); return; } try { S.settings.facing = await cam.flip(); save(); } catch (e) { $('.msg', box).textContent = camErr(e); } };
  const startCam = async () => {
    if (cam) { cam.stop(); cam = null; reset(); $('#cfix').textContent = ''; $('#cstart').textContent = '📷 Start camera'; $('.msg', box).textContent = 'Camera is off'; return; }
    const { PoseCam } = await import('./camera.js');
    cam = new PoseCam($('video', box), $('canvas', box), { poseId, facing: S.settings.facing, numPoses: people, onFrame });
    window.__yoga.cam = cam;
    $('#cstart').textContent = '⏹ Stop camera';
    try { await cam.start(m => { $('.msg', box).textContent = m; }); reset(); say(L.camStart(POSE[poseId].name) + ' ' + L.stepBack); }
    catch (e) { $('.msg', box).textContent = camErr(e); cam = null; $('#cstart').textContent = '📷 Start camera'; }
  };
  $('#cstart').onclick = () => cam ? startCam() : withTips(startCam);
  onClean(() => { cam && cam.stop(); });
  function onFrame(r) {
    const now = performance.now(), dt = last ? Math.min(0.2, (now - last) / 1000) : 0; last = now;
    const msg = $('.msg', box), sc = $('.score', box);
    $('#cppl').innerHTML = r.evals.length > 1 ? r.evals.map((e, k) => `<span>${k === 0 ? '⬅️' : '➡️'} ${e && e.visible ? Math.round(e.score * 100) + '%' : '…'}</span>`).join('') : '';
    const ev = r.evals.length > 1 ? combine(r.evals) : r.evals[0];
    window.__yoga.lastEval = ev; window.__yoga.lastPeople = r.people.length;
    fb(box, ev, poseId, ready && !done, msg, sc, $('#cfix'), null);
    if (ev && ev.visible) { $('#cchips').innerHTML = chipsHTML(ev); if (people === 2 && r.evals.length < 2) msg.textContent = L.oneOfTwo; }
    if (!ev || !ev.visible || done) return;
    if (!ready) { if (!counting) countdown(); return; }
    sum += ev.score * dt; n += dt; for (const x of ev.rules) if (x.status !== 'good') issues[x.fix] = (issues[x.fix] || 0) + dt;
    if (ev.good) held += dt;
    $('#chold').textContent = Math.max(0, Math.ceil(target - held)) + 's';
    if (held >= target) {
      done = true; const score = Math.round(sum / Math.max(0.001, n) * 100);
      logPose(S.active, poseId, held, { hold: target, full: true, score }); logSession(S.active, { sec: n, kind: 'camera', title: POSE[poseId].name + ' form check', poses: 1, score });
      const got = checkBadges(); save(); sfx.chime(); confetti(80);
      const top = Object.entries(issues).sort((a, b) => b[1] - a[1]).slice(0, 2).filter(x => x[1] > 1);
      say(L.heldFor(POSE[poseId].name, target) + ' ' + L.formScore(score));
      $('#cres').innerHTML = `<div class="card" id="cresult"><div class="big">${score}%</div><p style="text-align:center">Held ${target}s with good form ✅</p>${top.length ? `<p><b>Work on next time:</b></p><ul>${top.map(t => `<li>${esc(t[0])}</li>`).join('')}</ul>` : '<p>Beautiful alignment the whole way!</p>'}${got.length ? '<p>🏆 New badge earned!</p>' : ''}<button class="btn block" id="cagain">🔁 Try again</button></div>`;
      $('#cagain').onclick = reset;
    }
  }
};

// ---------- family ----------
SCREENS.family = () => {
  main.innerHTML = `<div class="wrap">${coachSays(`Welcome, ${esc(dadName())} and ${esc(kidName())}! Let's move like animals, play games and earn stickers together. 🦁🦋🐢`)}
  <div class="grid wide" style="margin-top:12px">
   <button class="card tile" id="fAdv" style="min-height:150px;margin:0"><div style="font-size:46px">🗺️</div><b>Animal Story Adventure</b><span class="muted small">Do it together while Coach Sunny tells a story</span></button>
   <button class="card tile" id="fTurn" style="min-height:150px;margin:0"><div style="font-size:46px">🔁</div><b>Take Turns Leading</b><span class="muted small">One leads, the other copies. Switch each animal!</span></button>
   <button class="card tile" id="fFreeze" style="min-height:150px;margin:0"><div style="font-size:46px">🧊</div><b>Freeze Like a Statue!</b><span class="muted small">Dance, then freeze into an animal. The camera can judge!</span></button>
   <button class="card tile" id="fSil" style="min-height:150px;margin:0"><div style="font-size:46px">🤪</div><b>Silly Sound Board</b><span class="muted small">Boing! Pop! Toot!</span></button></div>
  <h2>Sticker books</h2><div class="two">${['dad', 'kid'].map(pid => `<div class="card"><b>${pid === 'kid' ? '🧒' : '🧔'} ${esc(prof(pid).name)}</b> · ⭐ ${prof(pid).stars}<div>${prof(pid).stickers.map(s => `<span class="stk">${s}</span>`).join('') || '<span class="muted">No stickers yet. Finish a family session!</span>'}</div></div>`).join('')}</div>
  <h2>Animal poses</h2><div class="grid">${POSES.map(p => poseTile(p)).join('')}</div></div>`;
  fillThumbs();
  const fam = ROUTINES.find(r => r.id === 'family');
  $('#fAdv').onclick = () => startSession({ title: 'Animal Story Adventure', steps: fam.steps, kind: 'family', family: true, story: true, together: true });
  $('#fTurn').onclick = () => startSession({ title: 'Take Turns Leading', steps: fam.steps, kind: 'family', family: true, story: true, together: false });
  $('#fFreeze').onclick = () => go('freeze');
  const SND = { boing: '🦘 Boing', pop: '🫧 Pop', chime: '🔔 Chime', whistle: '🎺 Whistle', fart: '💨 Toot', bell: '🛎️ Bell', yay: '🎉 Yay' };
  $('#fSil').onclick = () => modal(`<h2>🤪 Silly sounds</h2><div class="grid">${Object.keys(SND).map(k => `<button class="btn warm" data-s="${k}">${SND[k]}</button>`).join('')}</div><button class="btn alt block" style="margin-top:12px" data-close>Close</button>`, m => $$('[data-s]', m).forEach(b => b.onclick = () => sfx[b.dataset.s]()));
  $$('[data-pose]').forEach(b => b.onclick = () => go('pose', b.dataset.pose));
};

SCREENS.freeze = () => {
  const POOL = ['tree', 'star', 'warrior2', 'chair', 'mountain', 'sidebend'];
  let useCam = false, round = 0, rounds = 5, phase = 'idle', pt = 0, pdur = 0, raf = 0, last = 0, cam = null, poseId = null, stars = [0, 0], acc = [[0, 0, 0], [0, 0, 0]], wob = 0, seen = 0;
  main.innerHTML = `<div class="wrap freeze"><div class="two"><div><div id="fz"></div><div class="cam" id="fbox" hidden><video playsinline muted></video><canvas></canvas><div class="msg"></div><div class="ppl" id="fppl"></div></div></div>
  <div><div class="card"><div class="muted" id="fround">5 rounds · ${esc(dadName())} & ${esc(kidName())}</div><div class="call" id="fcall">Ready to play?</div><div class="stars" id="fstars"></div>
   <p class="muted" id="fhelp">When the music plays, wiggle and dance! When it stops, FREEZE like the animal Coach Sunny calls out.</p>
   <label class="toggle">📷 Let the camera judge (both players in view)<input type="checkbox" id="fcam"></label>
   <div class="row" style="justify-content:center;margin-top:10px"><button class="btn warm" id="fgo">▶ Start game</button><button class="btn alt" id="fquit">✖ Quit</button></div></div></div></div></div>`;
  let guide = makeGuide($('#fz'), POSE.star, { controls: false });
  const upd = () => { $('#fstars').innerHTML = `<div>${esc(dadName())}: ${'⭐'.repeat(stars[0]) || '–'}</div><div>${esc(kidName())}: ${'⭐'.repeat(stars[1]) || '–'}</div>`; };
  upd();
  $('#fcam').onchange = e => { useCam = e.target.checked; };
  $('#fquit').onclick = () => go('family');
  const begin = async () => {
    $('#fgo').disabled = true; document.body.classList.add('fullplay');
    if (useCam && !cam) {
      const { PoseCam } = await import('./camera.js'); const box = $('#fbox'); box.hidden = false;
      cam = new PoseCam($('video', box), $('canvas', box), { poseId: null, facing: S.settings.facing, numPoses: 2, onFrame });
      window.__yoga.cam = cam;
      try { await cam.start(m => { $('.msg', box).textContent = m; }); } catch (e) { $('.msg', box).textContent = camErr(e); cam = null; }
    }
    round = 0; stars = [0, 0]; upd(); $('#fhelp').textContent = 'Wiggle when the music plays, freeze when it stops!'; next();
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  };
  $('#fgo').onclick = () => useCam ? withTips(begin) : begin();
  function onFrame(r) {
    $('#fppl').innerHTML = r.evals.map((e, k) => `<span>${k === 0 ? '⬅️ ' + esc(dadName()) : '➡️ ' + esc(kidName())} ${e && e.visible ? Math.round(e.score * 100) + '%' : '…'}</span>`).join('');
    if (phase !== 'freeze' || pt < 1.2) return;
    seen = Math.max(seen, r.evals.length);
    r.evals.forEach((e, k) => { if (k > 1) return; const a = acc[k]; a[2] += 1; if (e && e.visible) a[0] += e.score; a[1] += r.still[k] || 0; if ((r.still[k] || 0) > 0.03 && performance.now() - wob > 1500) { wob = performance.now(); sfx.boing(); caption('Wobble! 🌀', 1200); } });
  }
  function next() {
    round++; if (round > rounds) return end();
    phase = 'dance'; pt = 0; pdur = 3.5 + Math.random() * 3; music(true);
    $('#fround').textContent = `Round ${round} of ${rounds}`; $('#fcall').textContent = '💃 Wiggle and dance! 🕺'; caption(L.dance, 2000);
    guide.destroy(); guide = makeGuide($('#fz'), POSE.butterfly, { controls: false });
  }
  function freezeNow() {
    music(false); phase = 'freeze'; pt = 0; pdur = 7; acc = [[0, 0, 0], [0, 0, 0]];
    poseId = POOL[Math.floor(Math.random() * POOL.length)]; const p = POSE[poseId]; if (cam) cam.poseId = poseId;
    sfx.whistle(); $('#fcall').textContent = `🧊 FREEZE like a ${p.emoji} ${p.kid}!`; say(L.freezeCall(p.kid));
    guide.destroy(); guide = makeGuide($('#fz'), p, { controls: false }); guide.hold('pose');
  }
  function judge() {
    const res = cam ? acc.map(a => a[2] > 5 && a[0] / a[2] >= 0.55 && a[1] / a[2] < 0.02) : [true, true];
    window.__yoga.freezeJudge = { acc: acc.map(a => a.slice()), res };
    res.forEach((ok, k) => { if (ok) stars[k]++; }); upd();
    const [msg, spk] = cam ? (res[0] && res[1] ? [L.bothFroze + ' ⭐⭐', L.bothFroze] : res[0] || res[1] ? [`Great freeze, ${res[0] ? dadName() : kidName()}! ⭐`, res[0] ? L.grownFroze : L.kidFroze] : [L.wobbly + ' 😂', L.wobbly]) : [L.statues + ' ⭐', L.statues];
    $('#fcall').textContent = msg; say(msg, { speak: spk }); res.some(Boolean) ? sfx.chime() : sfx.fart();
    phase = 'result'; pt = 0; pdur = 3;
  }
  function end() {
    phase = 'end'; music(false); cancelAnimationFrame(raf); if (cam) { cam.stop(); cam = null; $('#fbox').hidden = true; } document.body.classList.remove('fullplay');
    const winners = stars[0] === stars[1] ? ['dad', 'kid'] : [stars[0] > stars[1] ? 'dad' : 'kid'];
    const stk = [];
    for (const pid of ['dad', 'kid']) { const k = pid === 'dad' ? 0 : 1; prof(pid).stars += stars[k]; stk.push([pid, giveSticker(pid)]); logSession(pid, { sec: rounds * 12, kind: 'game', title: 'Freeze Game', poses: rounds, family: true }); if (winners.includes(pid) && !prof(pid).badges.freeze) prof(pid).badges.freeze = Date.now(); checkBadges(pid); }
    save(); confetti(); sfx.yay();
    const txt = winners.length === 2 ? L.tie : `${prof(winners[0]).name} is the Freeze Champion!`;
    say(txt + ' ' + L.stickers, { speak: (winners.length === 2 ? L.tie : winners[0] === 'dad' ? L.grownWins : L.kidWins) + ' ' + L.stickers });
    $('#fcall').textContent = '🏆 ' + txt; $('#fhelp').innerHTML = 'New stickers: ' + stk.map(([p, s]) => `${esc(prof(p).name)} <span class="stk">${s}</span>`).join(' ');
    $('#fgo').disabled = false; $('#fgo').textContent = '🔁 Play again';
  }
  function tick(now) {
    raf = requestAnimationFrame(tick); const dt = Math.min(0.2, (now - last) / 1000); last = now; pt += dt * (window.__yoga.fast || 1);
    if (phase === 'dance' && pt >= pdur) freezeNow();
    else if (phase === 'freeze') { $('#fround').textContent = `Round ${round} of ${rounds} · hold ${Math.max(0, Math.ceil(pdur - pt))}s`; if (pt >= pdur) judge(); }
    else if (phase === 'result' && pt >= pdur) next();
  }
  onClean(() => { cancelAnimationFrame(raf); music(false); if (cam) cam.stop(); });
};

// ---------- progress ----------
SCREENS.progress = tab => {
  tab = PTABS[tab] ? tab : 'overview';
  main.innerHTML = `<div class="wrap"><div class="row" style="justify-content:space-between"><div class="seg" id="ptabs" style="margin-bottom:12px">${[['overview', '📊 Overview'], ['muscles', '💪 My Muscles'], ['badges', '🏆 Badges'], ['flex', '📏 Flexibility']].map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div><span class="muted small">${isKid() ? '🧒' : '🧔'} ${esc(prof().name)}'s progress</span></div><div id="pbody"></div></div>`;
  $$('#ptabs button').forEach(b => b.onclick = () => { $$('#ptabs button').forEach(x => x.classList.toggle('on', x === b)); history.replaceState(null, '', '#progress/' + b.dataset.t); PTABS[b.dataset.t](); });
  PTABS[tab]();
};
SCREENS.muscles = () => SCREENS.progress('muscles');
const PTABS = {};
function cssVar(n) { return getComputedStyle(document.body).getPropertyValue(n).trim(); }
PTABS.overview = () => {
  const P = prof(), st = stats();
  const days = []; const start = new Date(); start.setDate(start.getDate() - 34); while (start.getDay() !== 1) start.setDate(start.getDate() - 1);
  for (let d = new Date(start); today(d) <= today(); d.setDate(d.getDate() + 1)) days.push(today(d));
  const rows = POSES.filter(p => P.poses[p.id]).map(p => { const s = P.poses[p.id]; const best = s.scores.length ? Math.max(...s.scores.map(x => x[1])) : null; return `<tr><td>${p.emoji} ${esc(p.name)}</td><td>${s.n}</td><td>${Math.round(s.best)}s</td><td>${best != null ? best + '%' : '–'}</td><td>${s.mastered ? '⭐' : ''}</td></tr>`; }).join('');
  $('#pbody').innerHTML = `<div class="stats"><div class="card"><div class="stat">${st.sessions}</div>sessions</div><div class="card"><div class="stat">${st.minutes}</div>minutes</div><div class="card"><div class="stat">${st.streak}🔥</div>day streak</div><div class="card"><div class="stat">${st.bestStreak}</div>best streak</div><div class="card"><div class="stat">${st.learned}</div>poses learned</div><div class="card"><div class="stat">${st.mastered}</div>mastered</div></div>
  <div class="two" style="margin-top:12px"><div class="card"><h3>📅 Practice calendar</h3><div class="cal">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<div style="background:none;font-weight:800">${d}</div>`).join('')}${days.map(d => `<div class="${st.days.has(d) ? 'on' : ''} ${d === today() ? 'today' : ''}" title="${d}">${+d.slice(8)}</div>`).join('')}</div></div>
  <div class="card"><h3>🎯 Form accuracy over time</h3><canvas class="chart" id="accChart"></canvas><p class="muted small" id="accNote"></p></div></div>
  <div class="card"><h3>🧘 Poses learned & mastered</h3>${rows ? `<table style="width:100%;border-collapse:collapse" class="small"><tr style="text-align:left"><th>Pose</th><th>Times</th><th>Best hold</th><th>Best form</th><th>⭐</th></tr>${rows}</table>` : '<p class="muted">Finish a session to see your poses here.</p>'}</div>
  <div class="card"><h3>🕒 Recent sessions</h3>${P.sessions.slice(-8).reverse().map(s => `<div class="row small" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0"><span>${s.d} · ${esc(s.title || s.kind)}${s.family ? ' 👨‍👧' : ''}</span><span>${s.min} min${s.score != null ? ' · ' + Math.round(s.score) + '%' : ''}</span></div>`).join('') || '<p class="muted">No sessions yet.</p>'}</div>`;
  const pts = []; for (const id in P.poses) for (const [ts, sc] of P.poses[id].scores) pts.push([ts, sc]); pts.sort((a, b) => a[0] - b[0]);
  lineChart($('#accChart'), pts.slice(-30).map(p => p[1]), { min: 0, max: 100, unit: '%' });
  $('#accNote').textContent = pts.length ? `${pts.length} camera-checked holds · latest ${pts[pts.length - 1][1]}%` : 'Use 📷 form check to start tracking accuracy.';
};
function lineChart(cv, vals, o = {}) {
  const d = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth || 300, H = cv.clientHeight || 200; cv.width = W * d; cv.height = H * d; const x = cv.getContext('2d'); x.scale(d, d);
  const acc = cssVar('--acc') || '#3aa59a', line = cssVar('--line'), soft = cssVar('--soft');
  const L = 38, B = 20, T = 10, R = 10; x.font = '12px system-ui'; x.fillStyle = soft; x.strokeStyle = line; x.lineWidth = 1;
  const mn = o.min ?? 0, mx = o.max ?? Math.max(1, ...vals);
  for (let k = 0; k <= 4; k++) { const y = T + (H - T - B) * k / 4; x.beginPath(); x.moveTo(L, y); x.lineTo(W - R, y); x.stroke(); x.fillText((o.labels ? o.labels[4 - k] : Math.round(mx - (mx - mn) * k / 4) + (o.unit || '')), 2, y + 4); }
  if (!vals.length) { x.fillText('No data yet', W / 2 - 30, H / 2); return; }
  const X = i => L + (W - L - R) * (vals.length === 1 ? 0.5 : i / (vals.length - 1)), Y = v => T + (H - T - B) * (1 - (v - mn) / (mx - mn || 1));
  x.strokeStyle = acc; x.lineWidth = 3; x.beginPath(); vals.forEach((v, i) => i ? x.lineTo(X(i), Y(v)) : x.moveTo(X(i), Y(v))); x.stroke();
  x.fillStyle = acc; vals.forEach((v, i) => { x.beginPath(); x.arc(X(i), Y(v), 4, 0, 7); x.fill(); });
}
function barChart(cv, weeks) {
  const d = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth || 300, H = cv.clientHeight || 200; cv.width = W * d; cv.height = H * d; const x = cv.getContext('2d'); x.scale(d, d);
  const st = cssVar('--stretch'), sg = cssVar('--strong'), soft = cssVar('--soft'), line = cssVar('--line');
  const L = 34, B = 22, T = 10, R = 8; const mx = Math.max(1, ...weeks.map(w => w[0] + w[1]));
  x.font = '12px system-ui'; x.fillStyle = soft; x.strokeStyle = line;
  for (let k = 0; k <= 4; k++) { const y = T + (H - T - B) * k / 4; x.beginPath(); x.moveTo(L, y); x.lineTo(W - R, y); x.stroke(); x.fillText((mx * (1 - k / 4)).toFixed(mx < 4 ? 1 : 0), 2, y + 4); }
  const bw = (W - L - R) / weeks.length;
  weeks.forEach((w, i) => { const h0 = (H - T - B) * w[0] / mx, h1 = (H - T - B) * w[1] / mx; const bx = L + i * bw + bw * 0.18, ww = bw * 0.64; x.fillStyle = st; x.fillRect(bx, H - B - h0, ww, h0); x.fillStyle = sg; x.fillRect(bx, H - B - h0 - h1, ww, h1); x.fillStyle = soft; x.fillText(i === weeks.length - 1 ? 'now' : '-' + (weeks.length - 1 - i) + 'w', bx, H - 6); });
}
PTABS.muscles = () => {
  const P = prof(); let period = 'week', mode = 'both', sel = '';
  $('#pbody').innerHTML = `<div class="two"><div class="card"><h3>💪 Muscle heat map</h3>
   <div class="row"><div class="seg" id="mper"><button data-v="week" class="on">This week</button><button data-v="all">All time</button></div><div class="seg" id="mmode"><button data-v="both" class="on">Both</button><button data-v="st">Stretched</button><button data-v="sg">Strengthened</button></div></div>
   <div id="mheat" style="margin-top:10px"></div><div class="legend" style="justify-content:center"><span><i style="background:#eef3f5;border:1px solid #ccd"></i>none</span><span><i style="background:#ffe08a"></i>a little</span><span><i style="background:#ffc04d"></i>some</span><span><i style="background:#ff9a3d"></i>more</span><span><i style="background:#e8384f"></i>lots</span></div></div>
   <div class="card"><h3>⏱️ Minutes per muscle group <span class="muted small" id="mperlbl">(this week)</span></h3><div class="legend"><span><i style="background:var(--stretch)"></i>stretched</span><span><i style="background:var(--strong)"></i>strengthened</span></div><div id="mlist"></div></div></div>
  <div class="two"><div class="card"><h3>📈 Weekly trend</h3><label class="fld">Muscle group<select id="msel"><option value="">All muscles</option>${Object.keys(MUSCLES).map(m => `<option value="${m}">${esc(MUSCLES[m].name)}</option>`).join('')}</select></label><canvas class="chart" id="mchart"></canvas><p class="muted small">Minutes per week (last 8 weeks). Blue = stretched, orange = strengthened.</p></div>
   <div class="card"><h3>🔎 Needs some love</h3><div id="mneg"></div></div></div>
  <div class="card"><h3>🏅 Muscle milestones</h3><p class="muted small">Bronze 5 min · Silver 15 · Gold 30 · Diamond 60 (stretch + strength time per muscle group)</p><div class="grid" id="mmile"></div></div>`;
  const draw = () => {
    const tot = muscleTotals(S.active, period === 'week' ? 7 : Infinity);
    const val = m => mode === 'st' ? tot[m][0] : mode === 'sg' ? tot[m][1] : tot[m][0] + tot[m][1];
    const mx = Math.max(60, ...Object.keys(MUSCLES).map(val));
    const heat = v => { if (v <= 0) return null; const k = v / mx; return k < 0.2 ? '#ffe08a' : k < 0.5 ? '#ffc04d' : k < 0.8 ? '#ff9a3d' : '#e8384f'; };
    $('#mheat').innerHTML = bodySVG(m => heat(val(m)));
    $('#mperlbl').textContent = period === 'week' ? '(last 7 days)' : '(all time)';
    const allMx = Math.max(1, ...Object.keys(MUSCLES).map(m => tot[m][0] + tot[m][1]));
    $('#mlist').innerHTML = Object.keys(MUSCLES).sort((a, b) => (tot[b][0] + tot[b][1]) - (tot[a][0] + tot[a][1])).map(m => `<div class="mrow" data-m="${m}"><span>${esc(MUSCLES[m].name)}</span><div class="mbar"><i style="width:${tot[m][0] / allMx * 100}%;background:var(--stretch)"></i><i style="width:${tot[m][1] / allMx * 100}%;background:var(--strong)"></i></div><b>${((tot[m][0] + tot[m][1]) / 60).toFixed(1)}m</b></div>`).join('');
    barChart($('#mchart'), muscleWeeks(S.active, sel || null));
  };
  $$('#mper button').forEach(b => b.onclick = () => { period = b.dataset.v; $$('#mper button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $$('#mmode button').forEach(b => b.onclick = () => { mode = b.dataset.v; $$('#mmode button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#msel').onchange = e => { sel = e.target.value; draw(); };
  const neg = neglected();
  $('#mneg').innerHTML = !P.sessions.length ? '<p class="muted">Do a session and I\'ll suggest what to work on next.</p>' : neg.length ? neg.slice(0, 4).map(n => { const p = suggestPose(n.m); return `<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0"><span style="flex:1">Your <b>${esc(MUSCLES[n.m].name.toLowerCase())}</b> ${n.days == null ? "haven't been worked yet" : `haven't been worked in ${n.days} days`}. Try <b>${esc(p.name)}</b>.</span><button class="btn alt" data-pose="${p.id}" style="min-height:48px">${p.emoji} Go</button></div>`; }).join('') : '<p>🎉 Every muscle group has been worked in the last 4 days. Great balance!</p>';
  $$('#mneg [data-pose]').forEach(b => b.onclick = () => go('pose', b.dataset.pose));
  const all = muscleTotals(S.active);
  $('#mmile').innerHTML = Object.keys(MUSCLES).map(m => { const min = (all[m][0] + all[m][1]) / 60; const got = MILESTONES.filter(x => min >= x[0]); const nxt = MILESTONES.find(x => min < x[0]); return `<div class="badge ${got.length ? '' : 'no'}"><div class="ic">${got.length ? got[got.length - 1][2] : '🔒'}</div><b>${esc(MUSCLES[m].name)}</b><span>${min.toFixed(1)} min${nxt ? ` · ${nxt[1]} at ${nxt[0]}` : ' · maxed!'}</span></div>`; }).join('');
  draw();
};
PTABS.badges = () => {
  const P = prof();
  $('#pbody').innerHTML = `<div class="card"><h3>🏆 Badges</h3><div class="grid">${BADGES.map(([id, ic, nm, d]) => `<div class="badge ${P.badges[id] ? '' : 'no'}"><div class="ic">${ic}</div><b>${esc(nm)}</b><span class="muted">${esc(d)}</span></div>`).join('')}</div></div>
  <div class="card"><h3>🌟 Stars & stickers</h3><p>⭐ ${P.stars} stars</p><div>${P.stickers.map(s => `<span class="stk">${s}</span>`).join('') || '<span class="muted">Earn stickers in family sessions, kid sessions and the Freeze game.</span>'}</div><p class="muted small">${P.stickers.length} of ${STICKERS.length} stickers collected</p></div>`;
};
PTABS.flex = () => {
  const P = prof();
  const LV = ['Knees', 'Mid-shin', 'Ankles', 'Toes', 'Past toes'];
  $('#pbody').innerHTML = `<div class="two"><div class="card"><h3>📏 Sit & reach self-check</h3><p class="muted small">Warm up first. Sit with legs straight, breathe out and reach forward gently (no bouncing). Where do your fingertips reach?</p>
  <div class="seg" id="flv">${LV.map((l, i) => `<button data-v="${i}">${l}</button>`).join('')}</div>
  <label class="fld">Optional: cm past (+) or short of (−) your toes<input id="fcm" type="number" inputmode="decimal" step="1" placeholder="e.g. -10"></label>
  <label class="fld">How did it feel? (optional)<input id="fnote" maxlength="80" placeholder="e.g. tight left hamstring"></label>
  <button class="btn block" id="fsave">Save check</button></div>
  <div class="card"><h3>Your flexibility trend</h3><canvas class="chart" id="fchart"></canvas><div id="flog"></div></div></div>`;
  let lv = null; $$('#flv button').forEach(b => b.onclick = () => { lv = +b.dataset.v; $$('#flv button').forEach(x => x.classList.toggle('on', x === b)); });
  const drawLog = () => { lineChart($('#fchart'), P.flex.map(f => f.level), { min: 0, max: 4, labels: ['Knee', 'Shin', 'Ankle', 'Toes', 'Past'] }); $('#flog').innerHTML = P.flex.slice(-6).reverse().map(f => `<div class="small" style="border-bottom:1px solid var(--line);padding:6px 0">${f.d} · <b>${LV[f.level]}</b>${f.cm != null ? ` (${f.cm} cm)` : ''}${f.note ? ' · ' + esc(f.note) : ''}</div>`).join('') || '<p class="muted">No checks yet. Try one every week!</p>'; };
  $('#fsave').onclick = () => { if (lv == null) { toast('Pick how far you reached'); return; } const cm = $('#fcm').value; logFlex(S.active, { level: lv, cm: cm === '' ? null : +cm, note: $('#fnote').value.trim() }); checkBadges(); save(); sfx.chime(); toast('Saved! 📏'); drawLog(); };
  drawLog();
};

// ---------- settings ----------
SCREENS.settings = () => {
  const st = S.settings, P = prof();
  main.innerHTML = `<div class="wrap" style="max-width:760px"><div class="card"><h3>🎨 Appearance <span class="muted small">(saved for ${esc(P.name)})</span></h3>
   <div class="seg" id="sApp" role="group" aria-label="Light or dark mode">${[['light', '☀️ Light'], ['dark', '🌙 Dark'], ['auto', '🌓 Auto (system)']].map(([v, l]) => `<button data-v="${v}" class="${(P.appearance || 'auto') === v ? 'on' : ''}" aria-pressed="${(P.appearance || 'auto') === v}">${l}</button>`).join('')}</div>
   <h3 style="margin-top:14px">Color style</h3><div class="seg" id="sTheme">${[['auto', 'Auto (kid colors for child)'], ['calm', 'Calm'], ['kids', 'Kid-friendly bright']].map(([v, l]) => `<button data-v="${v}" class="${(st.theme || 'auto') === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
  <div class="card"><h3>🔊 Coach voice</h3><div class="vpick" id="sVoices">${VOICES.map(v => `<button data-v="${v.id}" class="${(st.voiceName || 'af_heart') === v.id ? 'on' : ''}">${v.id.startsWith('af') ? '👩' : '👨'} ${esc(v.label)}<br><span class="muted small">▶ tap to hear</span></button>`).join('')}</div>
   <label class="toggle">Spoken coaching (captions always on)<input type="checkbox" id="sVoice" ${st.voice ? 'checked' : ''}></label><label class="toggle">Sound effects (softened while the coach talks)<input type="checkbox" id="sSnd" ${st.sounds ? 'checked' : ''}></label>
   <label class="fld">Voice speed<select id="sRate">${[[0.85, 'Slow'], [1, 'Normal'], [1.15, 'Quick']].map(([v, l]) => `<option value="${v}" ${Math.abs(+st.rate - v) < 0.06 ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
   <p class="small muted">The coach uses natural recorded voices that work offline. Anything without a recording uses your phone's best built-in voice.</p></div>
  <div class="card"><h3>🧘 Practice</h3><label class="toggle">Add a short warm-up and cool-down to routines<input type="checkbox" id="sWarm" ${st.warm !== false ? 'checked' : ''}></label>
   <label class="fld">Default demo<select id="sDemo"><option value="real" ${(st.demo || 'real') === 'real' ? 'selected' : ''}>🎥 Real person (when available)</option><option value="anim" ${st.demo === 'anim' ? 'selected' : ''}>🎨 Animated coach</option></select></label></div>
  <div class="card"><h3>👤 Profiles</h3><label class="fld">Grown-up name<input id="sDad" value="${esc(prof('dad').name)}" maxlength="20"></label><label class="fld">Child's name (optional)<input id="sKid" value="${esc(prof('kid').name)}" maxlength="20"></label></div>
  <div class="card"><h3>📷 Camera</h3><label class="fld">Default camera<select id="sFace"><option value="user" ${st.facing === 'user' ? 'selected' : ''}>Front (selfie)</option><option value="environment" ${st.facing === 'environment' ? 'selected' : ''}>Back</option></select></label>
   <p class="privacy">🔒 The camera form check uses an on-device AI model (MediaPipe Pose Landmarker). Video frames are analyzed in memory on this phone and immediately discarded. Nothing is uploaded, recorded, or saved, and the app works fully without the camera.</p><p class="small muted" id="sOff">Checking offline status…</p></div>
  <div class="card"><h3>🛟 Safety</h3><p class="small">Yoga Coach offers general beginner movement guidance, not medical advice. Move slowly, never push into pain, and skip any pose that doesn't feel right. Check with a doctor if you're pregnant, injured, or have a health condition. Kids should practice with a grown-up nearby.</p></div>
  <div class="card"><h3>📜 Credits</h3><p class="small">Real-person videos and photos, voices and the pose model are used under their open licenses.</p><button class="btn alt" id="sCred">See credits & licenses</button></div>
  <div class="card"><h3>🗑️ Reset</h3><div class="row"><button class="btn alt" id="sResetMe">Reset ${esc(prof().name)}'s progress</button><button class="btn alt" id="sResetAll">Reset everything</button></div></div>
  <p class="muted small" style="text-align:center">Yoga Coach v2 · works offline · no ads · no accounts · no purchases</p></div>`;
  const nm = (id, el) => el.onchange = () => { prof(id).name = el.value.trim() || (id === 'kid' ? 'Kiddo' : 'Dad'); save(); applyTheme(); };
  nm('dad', $('#sDad')); nm('kid', $('#sKid'));
  $('#sVoice').onchange = e => { st.voice = e.target.checked; save(); applyTheme(); };
  $('#sSnd').onchange = e => { st.sounds = e.target.checked; save(); };
  $('#sRate').onchange = e => { st.rate = +e.target.value; save(); voiceSettings(); say(L.test); };
  $$('#sVoices button').forEach(b => b.onclick = () => { st.voiceName = b.dataset.v; save(); $$('#sVoices button').forEach(x => x.classList.toggle('on', x === b)); voiceSettings(); if (!st.voice) toast('Turn on spoken coaching to hear the coach'); say(L.test); });
  $('#sWarm').onchange = e => { st.warm = e.target.checked; save(); };
  $('#sDemo').onchange = e => { st.demo = e.target.value; save(); };
  $('#sFace').onchange = e => { st.facing = e.target.value; save(); };
  $$('#sApp button').forEach(b => b.onclick = () => { P.appearance = b.dataset.v; save(); $$('#sApp button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); applyTheme(); });
  $$('#sTheme button').forEach(b => b.onclick = () => { st.theme = b.dataset.v; save(); $$('#sTheme button').forEach(x => x.classList.toggle('on', x === b)); applyTheme(); });
  $('#sCred').onclick = () => go('credits');
  $('#sResetMe').onclick = () => { if (confirm('Erase all progress for ' + prof().name + '?')) { resetProfile(S.active); toast('Progress reset'); } };
  $('#sResetAll').onclick = () => { if (confirm('Erase everything for both profiles?')) { resetAll(); location.reload(); } };
  (async () => { try { const c = await caches.open('yoga-coach-v2'); const ok = await c.match(new URL('./vendor/pose_landmarker_lite.task', location.href).href); $('#sOff').textContent = ok ? '✅ Saved for offline use, including the camera coach. Real-person demos and voice clips are saved as you use them.' : 'The camera coach will be saved for offline use after it finishes downloading.'; } catch (e) { $('#sOff').textContent = ''; } })();
};

SCREENS.credits = focus => {
  const lic = l => `${esc(l)}${LICENSE_TEXT[l] ? ` <span class="muted">(${esc(LICENSE_TEXT[l])})</span>` : ''}`;
  main.innerHTML = `<div class="wrap" style="max-width:860px"><h1>📜 Credits & licenses</h1>
  <div class="card"><h3>🎥 Real-person demos</h3><p class="small muted">Clips were trimmed, cropped (to remove on-screen text), muted and re-encoded. Photos are shown with a slow zoom. Thank you to these creators!</p><ul class="list credits">${POSES.filter(p => MEDIA[p.id]).map(p => { const c = MEDIA[p.id].credit; return `<li id="cr-${p.id}" ${focus === p.id ? 'style="background:var(--line);border-radius:10px;padding:6px"' : ''}><b>${p.emoji} ${esc(p.name)}</b> (${MEDIA[p.id].type}): “${esc(c.title)}”${c.part ? ', ' + esc(c.part) : ''} by ${esc(c.author)}, ${esc(c.site)}. License: ${lic(c.license)}.<br><span class="muted small">${esc(c.url)}</span></li>`; }).join('')}</ul>
  <p class="small">Animated demo only (no suitable openly-licensed footage yet): ${NO_REAL.map(id => esc(POSE[id].name)).join(', ')}.</p></div>
  <div class="card"><h3>🗣️ Coach voices</h3><p class="small">Natural voices generated on our own computer with <b>Kokoro-82M</b> (voices “af_heart” and “am_michael”) by hexgrad, licensed ${lic('Apache-2.0')}. Played back offline from small audio files.</p></div>
  <div class="card"><h3>📷 Pose tracking</h3><p class="small"><b>MediaPipe Tasks Vision</b> and the <b>Pose Landmarker (lite)</b> model by Google, ${lic('Apache-2.0')}. Runs entirely on this device.</p></div>
  <button class="btn alt" id="crBack">⬅️ Back</button></div>`;
  $('#crBack').onclick = () => $('#homeBtn').click();
  if (focus) $('#cr-' + focus)?.scrollIntoView({ block: 'center' });
};

// ---------- boot ----------
window.__yoga = { S: () => S, POSES, go, save, stats, muscleTotals, neglected, startSession, prof, lastSpoken: () => lastSpoken.slice() };
applyTheme(); route();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadSW = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(r => r.update()).catch(() => { });
}
