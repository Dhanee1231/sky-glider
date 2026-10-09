// Yoga Coach on-device storage (localStorage only). Nothing is sent anywhere.
import { POSE, MUSCLES, JOURNEY } from './poses.js';
const KEY = 'yogaCoach.v1';
export const today = (d = new Date()) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
export const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
const blankProfile = (name, kid) => ({ name, kid, sessions: [], poses: {}, journey: 0, badges: {}, flex: [], stickers: [], stars: 0, muscles: {}, mdays: {}, mbadges: {}, appearance: 'auto' });
function fresh() { return { v: 1, active: 'dad', settings: { voice: true, rate: 1, sounds: true, theme: 'auto', facing: 'user', voiceName: 'af_heart', demo: 'real', warm: true }, profiles: { dad: blankProfile('Dad', false), kid: blankProfile('Kiddo', true) } }; }
export let S = load();
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1 && s.profiles) { for (const k of ['dad', 'kid']) s.profiles[k] = Object.assign(blankProfile(k === 'dad' ? 'Dad' : 'Kiddo', k === 'kid'), s.profiles[k]); s.settings = Object.assign(fresh().settings, s.settings); return s; } } catch (e) { }
  return fresh();
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
export function resetAll() { S = fresh(); save(); }
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
  if (info.kind === 'journey' && info.journeyIndex === P.journey) P.journey++;
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
// returns list of newly earned badge ids (also muscle milestones)
export function checkBadges(pid = S.active) {
  const P = prof(pid), st = stats(pid), got = [];
  const give = id => { if (!P.badges[id]) { P.badges[id] = Date.now(); got.push(id); } };
  if (st.sessions >= 1) give('first'); if (st.bestStreak >= 3) give('streak3'); if (st.bestStreak >= 7) give('streak7');
  if (st.sessions >= 10) give('ten'); if (st.minutes >= 60) give('hour'); if (P.journey >= 4) give('week1'); if (P.journey >= 16) give('grad');
  if (Object.values(P.poses).some(p => p.scores.some(s => s[1] >= 80))) give('camera');
  if ((P.poses.tree?.best || 0) >= 30) give('balance'); if (P.sessions.some(s => s.family)) give('family');
  if (st.learned >= 10) give('learner'); if (P.flex.length) give('flex');
  if (Object.keys(MUSCLES).every(m => P.muscles[m] && (P.muscles[m].st + P.muscles[m].sg) > 0)) give('muscles');
  for (const m in P.muscles) { const min = (P.muscles[m].st + P.muscles[m].sg) / 60; for (const [lim, name, ic] of MILESTONES) { const id = m + ':' + lim; if (min >= lim && !P.mbadges[id]) { P.mbadges[id] = Date.now(); got.push('m:' + id); } } }
  return got;
}
export const journeyDay = i => { const w = Math.floor(i / 4), d = i % 4; return JOURNEY[w] ? { w, d, week: JOURNEY[w], day: JOURNEY[w].days[d] } : null; };
export const STICKERS = ['🦄', '🐬', '🦋', '🐢', '🦊', '🐼', '🐨', '🦁', '🐸', '🦩', '🐙', '🦒', '🐝', '🐞', '🦉', '🐳', '🌈', '⭐', '🌸', '🍉', '🚀', '🎈', '🧁', '🐧'];
export function giveSticker(pid) { const P = prof(pid); const left = STICKERS.filter(s => !P.stickers.includes(s)); const s = (left.length ? left : STICKERS)[Math.floor(Math.random() * (left.length || STICKERS.length))]; P.stickers.push(s); return s; }
export function resetProfile(id) { const P = S.profiles[id]; S.profiles[id] = blankProfile(P.name, P.kid); save(); }
