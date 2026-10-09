// Coach voice (Web Speech API), captions, synthesized sounds, confetti.
import { S } from './store.js';
let capEl = null, capTimer = 0, voice = null;
export function setCaptionEl(el) { capEl = el; }
function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices(); if (!vs.length) return null;
  return vs.find(v => /en[-_]US/i.test(v.lang) && /female|samantha|google us/i.test(v.name)) || vs.find(v => /en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); }; voice = pickVoice(); }
export function caption(text, ms = 0) { if (!capEl) return; capEl.textContent = text; capEl.classList.toggle('show', !!text); clearTimeout(capTimer); if (ms) capTimer = setTimeout(() => capEl.classList.remove('show'), ms); }
// say: shows caption always; speaks if voice on. opts.interrupt cancels queued speech.
export function say(text, opts = {}) {
  caption(text, opts.capMs || Math.max(2500, text.length * 70));
  if (!S.settings.voice || !('speechSynthesis' in window)) return;
  try {
    if (opts.interrupt !== false) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[🦒🦩🦁🐻🐶🐄🐍🐭🦋🦫🐢🦉🐨🐘⭐🐒🐸🐼🦔]/gu, ''));
    if (!voice) voice = pickVoice(); if (voice) u.voice = voice;
    u.lang = 'en-US'; u.rate = (S.settings.rate || 1) * (opts.rate || 0.95); u.pitch = opts.kid ? 1.25 : 1.05;
    speechSynthesis.speak(u);
  } catch (e) { }
}
export function hush() { try { speechSynthesis.cancel(); } catch (e) { } }

// ---- sounds ----
let ac = null;
function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume().catch(() => { }); return ac; }
function tone(f0, f1, dur, type = 'sine', vol = 0.18, when = 0) {
  const a = ctx(); if (!a || !S.settings.sounds) return;
  const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
export const sfx = {
  tap: () => tone(660, 880, 0.08, 'sine', 0.08),
  boing: () => { tone(180, 520, 0.18, 'triangle', 0.2); tone(520, 160, 0.25, 'triangle', 0.15, 0.18); },
  pop: () => tone(900, 300, 0.09, 'square', 0.08),
  chime: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.35, 'sine', 0.14, i * 0.09)); },
  whistle: () => { tone(500, 1400, 0.4, 'sine', 0.14); tone(1400, 600, 0.35, 'sine', 0.12, 0.4); },
  tick: () => tone(1200, 1200, 0.05, 'square', 0.05),
  fart: () => { tone(110, 60, 0.35, 'sawtooth', 0.12); },
  bell: () => { tone(528, 528, 1.6, 'sine', 0.12); tone(1056, 1056, 1.2, 'sine', 0.04); },
  yay: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.01, 0.22, 'triangle', 0.15, i * 0.12)); }
};
// simple looping music for the Freeze game
let musicTimer = 0;
export function music(on) {
  clearInterval(musicTimer); if (!on) return;
  const notes = [523, 659, 784, 659, 587, 698, 880, 698]; let i = 0;
  musicTimer = setInterval(() => { tone(notes[i % notes.length], notes[i % notes.length], 0.18, 'triangle', 0.1); if (i % 2 === 0) tone(130, 120, 0.12, 'sine', 0.15); i++; }, 220);
}
// ---- confetti ----
export function confetti(n = 140) {
  const c = document.createElement('canvas'); c.className = 'confetti'; document.body.appendChild(c);
  const dpr = Math.min(2, devicePixelRatio || 1); c.width = innerWidth * dpr; c.height = innerHeight * dpr; const x = c.getContext('2d'); x.scale(dpr, dpr);
  const cols = ['#ff7aa8', '#ffd84d', '#5ad1c4', '#7aa8ff', '#b77aff', '#7ee07e'];
  const P = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * 0.35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 4, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, s: Math.random() < .25 }));
  let t0 = performance.now();
  (function f(t) { const dt = Math.min(40, t - t0) / 16; t0 = t; x.clearRect(0, 0, innerWidth, innerHeight); let alive = 0;
    for (const p of P) { p.vy += 0.35 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.99; p.a += 0.2 * dt; if (p.y < innerHeight + 20) alive++; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; if (p.s) { x.font = p.r * 3 + 'px sans-serif'; x.fillText('⭐', 0, 0); } else x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); }
    if (alive) requestAnimationFrame(f); else c.remove(); })(t0);
}
