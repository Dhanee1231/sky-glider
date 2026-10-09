// Yoga Coach: cartoon figure drawn from joint angles (forward kinematics) + keyframe animation.
// Angles are absolute directions in degrees: 0 = down, 90 = right, 180 = up, -90 = left.
const D2R = Math.PI / 180;
const dir = a => [Math.sin(a * D2R), Math.cos(a * D2R)];
export const KEYS = ['w', 'face', 'torso', 'arch', 'head', 'lu', 'll', 'ru', 'rl', 'lt', 'ls', 'rt', 'rs', 'lf', 'rf'];
export const FRONT = { w: 1, face: 0, torso: 180, arch: 0, head: 180, lu: -10, ll: -5, ru: 10, rl: 5, lt: -4, ls: -2, rt: 4, rs: 2, lf: -90, rf: 90 };
export const SIDE = { w: 0, face: 1, torso: 180, arch: 0, head: 180, lu: -4, ll: 10, ru: 4, rl: 14, lt: -2, ls: 0, rt: 2, rs: 0, lf: 90, rf: 90 };
export const P = (base, o) => Object.assign({}, base, o);
const L = { torso: 60, neck: 9, headR: 14, ua: 30, la: 28, th: 40, sh: 38, ft: 12, shW: 16, hipW: 10 };

export function solve(p) {
  const T = dir(p.torso), perp = [-T[1], T[0]];
  // perp points to screen-right when standing; flip so "r" is screen-right in front view.
  const side = perp[0] >= 0 ? 1 : -1;
  const pr = [perp[0] * side, perp[1] * side];
  const add = (a, d, k) => [a[0] + d[0] * k, a[1] + d[1] * k];
  const hip = [0, 0], neck = add(hip, T, L.torso);
  const sw = L.shW * p.w, hw = L.hipW * p.w;
  const J = { hip, neck };
  J.lsh = add(neck, pr, -sw); J.rsh = add(neck, pr, sw);
  J.lhip = add(hip, pr, -hw); J.rhip = add(hip, pr, hw);
  J.head = add(neck, dir(p.head), L.neck + L.headR);
  J.lel = add(J.lsh, dir(p.lu), L.ua); J.lwr = add(J.lel, dir(p.ll), L.la);
  J.rel = add(J.rsh, dir(p.ru), L.ua); J.rwr = add(J.rel, dir(p.rl), L.la);
  J.lkn = add(J.lhip, dir(p.lt), L.th); J.lan = add(J.lkn, dir(p.ls), L.sh);
  J.rkn = add(J.rhip, dir(p.rt), L.th); J.ran = add(J.rkn, dir(p.rs), L.sh);
  const fl = L.ft * (1 - 0.45 * p.w);
  J.lto = add(J.lan, dir(p.lf), fl); J.rto = add(J.ran, dir(p.rf), fl);
  // torso arch control point
  const mid = [(hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2];
  J.ctl = add(mid, perp, p.arch || 0);
  return J;
}

export function lerpPose(a, b, t) {
  const o = {};
  for (const k of KEYS) { const x = a[k] ?? 0, y = b[k] ?? 0; o[k] = x + (y - x) * t; }
  return o;
}
export const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function bbox(J) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const k in J) { if (k === 'ctl') continue; const [x, y] = J[k]; const r = k === 'head' ? L.headR : 6; x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); }
  return { x0, x1, y0, y1 };
}

export const THEMES = {
  calm: { body: '#3aa59a', far: '#2a7f77', skin: '#f2c6a0', hair: '#5a3b2a', mat: '#d9ecf2', matEdge: '#b6d7e2', face: '#3a2a22', cheek: '#f39a9a', ground: '#c9e2ea' },
  kids: { body: '#ff7aa8', far: '#d85587', skin: '#ffd2b0', hair: '#7a4a2a', mat: '#fff1a8', matEdge: '#ffd84d', face: '#3a2a22', cheek: '#ff8fa0', ground: '#ffe98a' }
};

// Draw pose p onto ctx in a box (x,y,w,h). opts: {theme, anchor:'bbox'|'feet', glow:[joint names], scale}
export function drawFigure(ctx, p, box, opts = {}) {
  const th = THEMES[opts.theme || 'calm'];
  const J = solve(p);
  const bb = bbox(J);
  const bh = bb.y1 - bb.y0 + 44, bw = bb.x1 - bb.x0 + 24;
  const s = Math.min(box.h / Math.max(205, bh), box.w / Math.max(240, bw)) * (opts.zoom || 1);
  const groundY = box.y + box.h - 14 * s;
  let ax;
  if (opts.anchor === 'feet') ax = (J.lan[0] + J.ran[0]) / 2; else ax = (bb.x0 + bb.x1) / 2;
  const ox = box.x + box.w / 2 - ax * s, oy = groundY - bb.y1 * s;
  const tr = q => [ox + q[0] * s, oy + q[1] * s];
  // mat
  ctx.save();
  ctx.fillStyle = th.mat; ctx.strokeStyle = th.matEdge; ctx.lineWidth = 2 * s;
  const mw = box.w * 0.78, mx = box.x + (box.w - mw) / 2;
  roundRect(ctx, mx, groundY - 1 * s, mw, 9 * s, 4 * s); ctx.fill(); ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const seg = (pts, col, wdt) => { ctx.strokeStyle = col; ctx.lineWidth = wdt * s; ctx.beginPath(); const a = tr(pts[0]); ctx.moveTo(a[0], a[1]); for (let i = 1; i < pts.length; i++) { const b = tr(pts[i]); ctx.lineTo(b[0], b[1]); } ctx.stroke(); };
  const dot = (q, r, col) => { const a = tr(q); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(a[0], a[1], r * s, 0, 7); ctx.fill(); };
  const sideView = p.w < 0.5;
  const far = sideView ? th.far : th.body;
  // far limbs (left) first
  seg([J.lhip, J.lkn, J.lan], far, 11); seg([J.lan, J.lto], far, 8);
  if (sideView) { seg([J.lsh, J.lel, J.lwr], far, 9); dot(J.lwr, 5, th.skin); }
  // torso: curved capsule
  ctx.strokeStyle = th.body; ctx.lineWidth = (14 + 16 * p.w) * s; ctx.beginPath();
  const h0 = tr(J.hip), n0 = tr(J.neck), c0 = tr(J.ctl);
  ctx.moveTo(h0[0], h0[1]); ctx.quadraticCurveTo(c0[0], c0[1], n0[0], n0[1]); ctx.stroke();
  if (p.w > 0.3) { seg([J.lhip, J.rhip], th.body, 14); seg([J.lsh, J.rsh], th.body, 12); }
  // near limbs
  seg([J.rhip, J.rkn, J.ran], th.body, 11); seg([J.ran, J.rto], th.body, 8);
  if (!sideView) { seg([J.lsh, J.lel, J.lwr], th.body, 9); dot(J.lwr, 5, th.skin); }
  seg([J.rsh, J.rel, J.rwr], th.body, 9); dot(J.rwr, 5, th.skin);
  // neck + head
  seg([J.neck, [J.neck[0] + (J.head[0] - J.neck[0]) * 0.4, J.neck[1] + (J.head[1] - J.neck[1]) * 0.4]], th.skin, 7);
  const hc = tr(J.head), hr = L.headR * s;
  const hd = dir(p.head), hang = Math.atan2(hd[1], hd[0]) + Math.PI / 2; // rotation so "up" of head follows head dir
  ctx.save(); ctx.translate(hc[0], hc[1]); ctx.rotate(hang);
  // hair bun on back of head
  const f = Math.max(-1, Math.min(1, p.face || 0));
  ctx.fillStyle = th.hair; ctx.beginPath(); ctx.arc(-f * hr * 0.75, -hr * 0.75, hr * 0.42, 0, 7); ctx.fill();
  ctx.fillStyle = th.skin; ctx.beginPath(); ctx.arc(0, 0, hr, 0, 7); ctx.fill();
  ctx.fillStyle = th.hair; ctx.beginPath(); ctx.arc(0, 0, hr, Math.PI * 1.05 + f * 0.35, Math.PI * 1.95 + f * 0.35); ctx.closePath(); ctx.fill();
  // face
  ctx.fillStyle = th.face; const ex = hr * 0.36, ey = -hr * 0.02;
  const fx = f * hr * 0.45;
  if (Math.abs(f) < 0.6) { dotC(ctx, fx - ex, ey, hr * 0.11); dotC(ctx, fx + ex, ey, hr * 0.11); }
  else dotC(ctx, fx + f * hr * 0.15, ey, hr * 0.11);
  ctx.strokeStyle = th.face; ctx.lineWidth = Math.max(1, hr * 0.1); ctx.beginPath(); ctx.arc(fx + (Math.abs(f) < 0.6 ? 0 : f * hr * 0.2), hr * 0.25, hr * 0.25, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.globalAlpha = 0.5; ctx.fillStyle = th.cheek;
  if (Math.abs(f) < 0.6) { dotC(ctx, fx - hr * 0.55, hr * 0.3, hr * 0.15); dotC(ctx, fx + hr * 0.55, hr * 0.3, hr * 0.15); } else dotC(ctx, fx, hr * 0.32, hr * 0.15);
  ctx.globalAlpha = 1; ctx.restore();
  // glow joints (e.g. highlight)
  if (opts.glow) for (const g of opts.glow) if (J[g]) { const a = tr(J[g]); ctx.strokeStyle = 'rgba(255,200,0,.9)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(a[0], a[1], 10 * s, 0, 7); ctx.stroke(); }
  ctx.restore();
}
function dotC(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
export function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// Build a timeline from a pose's anim steps: [{f:frameName, t:seconds, cap:'caption', say:true}]
export function timeline(pose) {
  const steps = pose.anim; let tot = 0; const segs = [];
  for (const st of steps) { segs.push({ ...st, t0: tot }); tot += st.t; }
  return { segs, total: tot };
}
// pose at time t (seconds, wraps)
export function poseAt(pose, tl, t) {
  t = ((t % tl.total) + tl.total) % tl.total;
  let i = 0; while (i < tl.segs.length - 1 && t >= tl.segs[i + 1].t0) i++;
  const sg = tl.segs[i];
  const prev = tl.segs[(i - 1 + tl.segs.length) % tl.segs.length];
  const a = pose.frames[prev.f], b = pose.frames[sg.f];
  const k = sg.move === false ? 1 : ease(Math.min(1, (t - sg.t0) / Math.min(sg.t, sg.mt || 2.2)));
  return { p: lerpPose(a, b, k), seg: sg, idx: i };
}
