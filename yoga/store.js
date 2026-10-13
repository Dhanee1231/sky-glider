// Yoga Coach on-device storage (localStorage only). Nothing is sent anywhere.
import { POSE, MUSCLES, JOURNEY, KID_JOURNEY } from './poses.js';
const KEY = 'yogaCoach.v1';
export const today = (d = new Date()) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
export const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
const blankProfile = (name, kid) => ({ name, kid, sessions: [], poses: {}, journey: 0, badges: {}, flex: [], stickers: [], stars: 0, muscles: {}, mdays: {}, mbadges: {}, appearance: 'auto' });
function fresh() { return { v: 1, active: 'dad', settings: { voice: true, rate: 1, sounds: true, theme: 'auto', facing: 'user', voiceName: 'af_heart', demo: 'real', warm: true }, profiles: { dad: blankProfile('Dad', false), kid: blankProfile('Kiddo', true) } }; }
const BAK = KEY + '.bak', BAK2 = KEY + '.bak2', UNDO = KEY + '.undo', BAD = KEY + '.bad';
const UNDO_MS = 10000;
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } } };
// a save is usable only if it parses, is schema v:1 and has profiles
function parseSave(raw) { try { const s = JSON.parse(raw); return s && s.v === 1 && s.profiles && typeof s.profiles === 'object' ? s : null; } catch (e) { return null; } }
function normalize(s) { for (const k of ['dad', 'kid']) s.profiles[k] = Object.assign(blankProfile(k === 'dad' ? 'Dad' : 'Kiddo', k === 'kid'), s.profiles[k]); s.settings = Object.assign(fresh().settings, s.settings); return s; }
// main -> .bak (previous save) -> .bak2 (first save of a day). fresh() only if none of them parse.
function load() {
  const raw = ls.get(KEY); const main = raw == null ? null : parseSave(raw);
  if (main) return normalize(main);
  if (raw != null && !ls.get(BAD)) ls.set(BAD, raw);   // keep the unreadable copy for a grown-up to inspect
  let b2 = null; try { b2 = JSON.parse(ls.get(BAK2)).s; } catch (e) { }
  for (const cand of [ls.get(BAK), b2]) { const s = cand == null ? null : parseSave(cand); if (s) return normalize(s); }
  return fresh();
}
export let S = load();
const flag = v => Object.defineProperty(S, 'saveFailed', { value: v, writable: true, configurable: true, enumerable: false });  // never written to storage
flag(false);
let wasFailing = false;
function fail() { flag(true); wasFailing = true; try { window.dispatchEvent(new CustomEvent('yoga:savefail')); } catch (e) { } }
export function save() {
  let json; try { json = JSON.stringify(S); } catch (e) { return fail(); }
  const prev = ls.get(KEY);
  if (prev != null && parseSave(prev)) {   // back up the last good copy before overwriting it
    ls.set(BAK, prev);
    let d2 = null; try { d2 = JSON.parse(ls.get(BAK2)).d; } catch (e) { }
    if (d2 !== today()) ls.set(BAK2, JSON.stringify({ d: today(), s: prev }));
  }
  let ok = ls.set(KEY, json);
  if (!ok) { ls.del(BAK2); ok = ls.set(KEY, json); }   // free disposable copies and retry once; a failed setItem leaves the old data intact
  if (!ok) return fail();
  flag(false); wasFailing = false;
}
export const saveFailing = () => wasFailing;
// ---- reset with undo ----
// Snapshot everything first; undo stays available for UNDO_MS, then the snapshot and old backups are dropped.
function snapshot() { return ls.set(UNDO, JSON.stringify({ t: Date.now(), s: JSON.stringify(S) })); }
export function commitReset() { ls.del(UNDO); ls.del(BAK2); const m = ls.get(KEY); if (m != null && parseSave(m)) ls.set(BAK, m); else ls.del(BAK); }
export function undoReset() {
  let s = null; try { s = parseSave(JSON.parse(ls.get(UNDO)).s); } catch (e) { }
  if (!s) return false;
  S = normalize(s); flag(false); if (!ls.set(KEY, JSON.stringify(S))) { fail(); return true; }   // keep the snapshot if the write failed
  ls.del(UNDO); return true;
}
export const UNDO_WINDOW = UNDO_MS;
// an undo snapshot left over from a closed tab is stale: finish that reset
try { const u = JSON.parse(ls.get(UNDO)); if (u && Date.now() - u.t > UNDO_MS) commitReset(); } catch (e) { if (ls.get(UNDO) != null) ls.del(UNDO); }
// reset functions return false (and change nothing) if the undo snapshot can't be stored
export function resetAll() { if (!snapshot()) return false; S = fresh(); flag(false); save(); return true; }
export const prof = (id = S.active) => S.profiles[id];
export const isKid = (id = S.active) => !!S.profiles[id].kid;

// ---- logging ----
export function logPose(pid, poseId, seconds, opts = {}) {
  const P = prof(pid), d = today();
  const ps = P.poses[poseId] || (P.poses[poseId] = { n: 0, sec: 0, best: 0, scores: [], fullHolds: 0 });
  ps.n++; ps.sec += seconds; ps.best = Math.max(ps.best, opts.hold || seconds);
  if (opts.full) ps.fullHolds++;
  if (opts.score != null) { ps.scores.push([Date.now(), Math.round(opts.score)]); if (ps.scores.length > 60) ps.scores.shift(); }
  const best = ps.scores.reduce((a, s) => Math.max(a, s[1]), 0);
  ps.mastered = ps.n >= 6 || (ps.n >= 2 && best >= 85) || ps.fullHolds >= 5;
  // muscles
  const pose = POSE[poseId]; if (!pose) return;
  const md = P.mdays[d] || (P.mdays[d] = {});
  for (const [list, k] of [[pose.stretch, 0], [pose.strong, 1]]) for (const m of list) {
    const mm = P.muscles[m] || (P.muscles[m] = { st: 0, sg: 0, last: null });
    if (k === 0) mm.st += seconds; else mm.sg += seconds; mm.last = d;
    const x = md[m] || (md[m] = [0, 0]); x[k] += seconds;
  }
}
export function logSession(pid, info) {
  const P = prof(pid);
  P.sessions.push({ d: today(), t: Date.now(), min: Math.round(info.sec / 6) / 10, kind: info.kind, title: info.title, poses: info.poses, score: info.score ?? null, family: !!info.family });
  if (info.kind === 'journey') { if (P.kid) { if (info.journeyIndex === (P.kidJourney | 0)) P.kidJourney = (P.kidJourney | 0) + 1; } else if (info.journeyIndex === P.journey) P.journey++; }
}
export function logFlex(pid, e) { prof(pid).flex.push({ d: today(), ...e }); }

// ---- derived stats ----
export function stats(pid = S.active) {
  const P = prof(pid); const days = new Set(P.sessions.map(s => s.d));
  let streak = 0; let d = today(); if (!days.has(d)) { const y = new Date(); y.setDate(y.getDate() - 1); d = today(y); }
  const cur = new Date(d + 'T12:00'); while (days.has(today(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  let best = 0, run = 0, prev = null; for (const x of [...days].sort()) { run = prev && dayDiff(prev, x) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = x; }
  const minutes = Math.round(P.sessions.reduce((a, s) => a + s.min, 0));
  const learned = Object.keys(P.poses).length, mastered = Object.values(P.poses).filter(p => p.mastered).length;
  return { sessions: P.sessions.length, minutes, streak, bestStreak: best, days, learned, mastered };
}
// muscle seconds within the last n days (n = Infinity => all time). returns {m:[st,sg]}
export function muscleTotals(pid = S.active, n = Infinity) {
  const P = prof(pid), out = {}; const t = today();
  for (const m in MUSCLES) out[m] = [0, 0];
  if (n === Infinity) { for (const m in P.muscles) out[m] = [P.muscles[m].st, P.muscles[m].sg]; return out; }
  for (const d in P.mdays) if (dayDiff(d, t) < n) for (const m in P.mdays[d]) { out[m][0] += P.mdays[d][m][0]; out[m][1] += P.mdays[d][m][1]; }
  return out;
}
// weekly minutes for last 8 weeks (index 7 = this week) for a muscle or all
export function muscleWeeks(pid = S.active, muscle = null) {
  const P = prof(pid), w = Array.from({ length: 8 }, () => [0, 0]); const t = today();
  for (const d in P.mdays) { const k = 7 - Math.floor(dayDiff(d, t) / 7); if (k < 0 || k > 7) continue; for (const m in P.mdays[d]) if (!muscle || m === muscle) { w[k][0] += P.mdays[d][m][0] / 60; w[k][1] += P.mdays[d][m][1] / 60; } }
  return w;
}
export function neglected(pid = S.active) {
  const P = prof(pid), t = today(), out = [];
  if (!P.sessions.length) return out;
  for (const m in MUSCLES) { const mm = P.muscles[m]; const days = mm && mm.last ? dayDiff(mm.last, t) : null; if (days === null || days >= 4) out.push({ m, days }); }
  return out.sort((a, b) => (b.days ?? 99) - (a.days ?? 99));
}
export const MILESTONES = [[5, 'Bronze', '🥉'], [15, 'Silver', '🥈'], [30, 'Gold', '🥇'], [60, 'Diamond', '💎']];

export const BADGES = [
  ['first', '🌱', 'First Session', 'Finish your first session'],
  ['streak3', '🔥', '3-Day Streak', 'Practice 3 days in a row'],
  ['streak7', '🌟', '7-Day Streak', 'Practice 7 days in a row'],
  ['ten', '🏅', '10 Sessions', 'Complete 10 sessions'],
  ['hour', '⏱️', 'One Hour', '60 total minutes'],
  ['week1', '🗺️', 'Week 1 Explorer', 'Finish Journey Week 1'],
  ['grad', '🎓', 'Journey Graduate', 'Finish the 4-week Journey'],
  ['camera', '📸', 'Form Star', 'Score 80+ in a camera check'],
  ['balance', '🦩', 'Balance Master', 'Hold Tree for 30 seconds'],
  ['family', '👨‍👧', 'Family Fun', 'Do a family session or game'],
  ['freeze', '🧊', 'Freeze Champ', 'Win a Freeze game'],
  ['learner', '📚', 'Pose Collector', 'Try 10 different poses'],
  ['flex', '📏', 'Flex Tracker', 'Log a flexibility check'],
  ['muscles', '💪', 'Whole Body', 'Work every muscle group']
];
// kid-only badges (additive; shown and earned only on kid profiles, so adult badges are unchanged)
export const KID_BADGES = [
  ['kid3', '🌟', '3 Sessions', 'Do 3 yoga sessions'],
  ['animals5', '🐾', 'Animal Friend', 'Try 5 different animals'],
  ['breaths20', '🎈', 'Breath Hero', 'Finish 20 breath-holds']
];
export const addBreathHold = pid => { const P = prof(pid); P.breathHolds = (P.breathHolds | 0) + 1; };   // absent = 0, no migration
// returns list of newly earned badge ids (also muscle milestones)
export function checkBadges(pid = S.active) {
  const P = prof(pid), st = stats(pid), got = [];
  const give = id => { if (!P.badges[id]) { P.badges[id] = Date.now(); got.push(id); } };
  if (st.sessions >= 1) give('first'); if (st.bestStreak >= 3) give('streak3'); if (st.bestStreak >= 7) give('streak7');
  if (st.sessions >= 10) give('ten'); if (st.minutes >= 60) give('hour'); const jn = Math.max(P.journey, P.kidJourney | 0); if (jn >= 4) give('week1'); if (jn >= 16) give('grad');
  if (Object.values(P.poses).some(p => p.scores.some(s => s[1] >= 80))) give('camera');
  if ((P.poses.tree?.best || 0) >= 30) give('balance'); if (P.sessions.some(s => s.family)) give('family');
  if (st.learned >= 10) give('learner'); if (P.flex.length) give('flex');
  if (Object.keys(MUSCLES).every(m => P.muscles[m] && (P.muscles[m].st + P.muscles[m].sg) > 0)) give('muscles');
  if (P.kid) { if (st.sessions >= 3) give('kid3'); if (st.learned >= 5) give('animals5'); if ((P.breathHolds | 0) >= 20) give('breaths20'); }
  for (const m in P.muscles) { const min = (P.muscles[m].st + P.muscles[m].sg) / 60; for (const [lim, name, ic] of MILESTONES) { const id = m + ':' + lim; if (min >= lim && !P.mbadges[id]) { P.mbadges[id] = Date.now(); got.push('m:' + id); } } }
  return got;
}
export const journeyDay = (i, kid = false) => { const J = kid ? KID_JOURNEY : JOURNEY; const w = Math.floor(i / 4), d = i % 4; return J[w] ? { w, d, week: J[w], day: J[w].days[d] } : null; };
export const STICKERS = ['🦄', '🐬', '🦋', '🐢', '🦊', '🐼', '🐨', '🦁', '🐸', '🦩', '🐙', '🦒', '🐝', '🐞', '🦉', '🐳', '🌈', '⭐', '🌸', '🍉', '🚀', '🎈', '🧁', '🐧'];
export const stickerCount = pid => new Set(prof(pid).stickers).size;   // unique stickers (giveSticker repeats once the book is full)
export function giveSticker(pid) { const P = prof(pid); const left = STICKERS.filter(s => !P.stickers.includes(s)); const s = (left.length ? left : STICKERS)[Math.floor(Math.random() * (left.length || STICKERS.length))]; P.stickers.push(s); return s; }
export function resetProfile(id) { if (!snapshot()) return false; const P = S.profiles[id]; S.profiles[id] = blankProfile(P.name, P.kid); save(); return true; }
try { navigator.storage?.persist?.(); } catch (e) { }   // ask the browser not to evict saves
