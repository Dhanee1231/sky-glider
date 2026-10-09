// Coach Sunny's voice: pre-recorded natural neural-TTS clips (Kokoro-82M, Apache-2.0) played through a queue,
// with captions synced sentence by sentence. Any line without a clip falls back to the browser's best voice.
import { sentences, clipId } from './speechtext.js';
export const VOICES = [{ id: 'af_heart', label: 'Sunny (warm female voice)' }, { id: 'am_michael', label: 'Sam (calm male voice)' }];
const BASE = new URL('./media/voice/', import.meta.url).href;
const manifests = {}, blobs = new Map();
let cfg = { voice: 'af_heart', rate: 1, enabled: true }, gen = 0, audio = null, hooks = { start() { }, end() { }, caption() { } };
export function configure(c) { Object.assign(cfg, c); loadManifest(cfg.voice); }
export function setHooks(h) { Object.assign(hooks, h); }
async function loadManifest(v) {
  if (manifests[v]) return manifests[v];
  manifests[v] = fetch(BASE + v + '/index.json').then(r => r.ok ? r.json() : { ids: [] }).then(j => new Set(j.ids)).catch(() => new Set());
  return manifests[v];
}
async function clipUrl(v, id) {
  const k = v + '/' + id; if (blobs.has(k)) return blobs.get(k);
  const p = fetch(BASE + k + '.ogg').then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(b => URL.createObjectURL(b));
  blobs.set(k, p); p.catch(() => blobs.delete(k));
  if (blobs.size > 120) { const [first] = blobs.keys(); const old = blobs.get(first); blobs.delete(first); old.then(u => URL.revokeObjectURL(u)).catch(() => { }); }
  return p;
}
// --- browser speech fallback: prefer natural / neural / enhanced voices ---
let sysVoice = null;
function pickSystemVoice() {
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); if (!vs.length) return null;
  const male = cfg.voice.startsWith('am');
  const score = v => (/natural|neural|enhanced|premium|online/i.test(v.name) ? 8 : 0) + (/google/i.test(v.name) ? 5 : 0) + (/en[-_]US/i.test(v.lang) ? 2 : /en[-_](GB|AU|CA|IN)/i.test(v.lang) ? 1 : 0)
    + ((male ? /male|guy|david|daniel|alex|fred|mark|google uk english male/i : /female|samantha|aria|jenny|zira|karen|victoria|google us english/i).test(v.name) ? 3 : 0) - (/compact|espeak/i.test(v.name) ? 6 : 0);
  return vs.sort((a, b) => score(b) - score(a))[0];
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) { speechSynthesis.onvoiceschanged = () => { sysVoice = pickSystemVoice(); }; sysVoice = pickSystemVoice(); }
function sysSay(text, my) {
  return new Promise(res => {
    if (!('speechSynthesis' in window)) return setTimeout(res, 300 + text.length * 55);
    try {
      const u = new SpeechSynthesisUtterance(text); sysVoice = sysVoice || pickSystemVoice(); if (sysVoice) u.voice = sysVoice;
      u.lang = 'en-US'; u.rate = cfg.rate * 0.95; u.pitch = 1.02; let done = false; const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin; setTimeout(fin, 1500 + text.length * 120); speechSynthesis.speak(u);
    } catch (e) { res(); }
  });
}
function playUrl(url, my) {
  return new Promise(res => {
    if (my !== gen) return res();
    if (!audio) { audio = new Audio(); audio.preload = 'auto'; }
    let done = false; const fin = ok => { if (!done) { done = true; clearTimeout(to); audio.onended = audio.onerror = null; res(ok); } };
    audio.onended = () => fin(true); audio.onerror = () => fin(false);
    audio.src = url; audio.playbackRate = cfg.rate; audio.preservesPitch = true;
    const to = setTimeout(() => fin(true), 15000);
    audio.play().catch(() => fin(false));
  });
}
export const lastSpoken = [];
// speak(text): split into sentences, play each clip in order (or fall back), call caption hook per sentence.
export async function speak(text, opts = {}) {
  const my = ++gen; stopAudio();
  const parts = sentences(text); if (!parts.length) return;
  const have = await loadManifest(cfg.voice); if (my !== gen) return;
  const items = parts.map(s => ({ s, id: clipId(s) })).map(x => ({ ...x, url: have.has(x.id) ? clipUrl(cfg.voice, x.id) : null }));
  hooks.start();
  try {
    for (const it of items) {
      if (my !== gen) return;
      hooks.caption(it.s);
      lastSpoken.push({ s: it.s, clip: !!it.url, t: Date.now() }); if (lastSpoken.length > 50) lastSpoken.shift();
      let ok = false;
      if (it.url) { try { ok = await playUrl(await it.url, my); } catch (e) { ok = false; } }
      if (!ok && my === gen) { if (it.url) lastSpoken[lastSpoken.length - 1].clip = false; await sysSay(it.s, my); }
    }
  } finally { if (my === gen) hooks.end(); }
}
function stopAudio() { try { if (audio) { audio.pause(); audio.onended = audio.onerror = null; } } catch (e) { } try { speechSynthesis.cancel(); } catch (e) { } }
export function stop() { gen++; stopAudio(); hooks.end(); }
export const speaking = () => !!audio && !audio.paused;
export async function coverage(v = cfg.voice) { return loadManifest(v); }
