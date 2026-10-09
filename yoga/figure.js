// Yoga Coach: cartoon figure drawn from joint angles (forward kinematics) + keyframe animation.
// Angles are absolute directions in degrees: 0 = down, 90 = right, 180 = up, -90 = left.
const D2R = Math.PI / 180;
const dir = a => [Math.sin(a * D2R), Math.cos(a * D2R)];
export const KEYS = ['w', 'face', 'torso', 'arch', 'head', 'lu', 'll', 'ru', 'rl', 'lt', 'ls', 'rt', 'rs', 'lf', 'rf'];
export const FRONT = { w: 1, face: 0, torso: 180, arch: 0, head: 180, lu: -10, ll: -5, ru: 10, rl: 5, lt: -4, ls: -2, rt: 4, rs: 2, lf: -90, rf: 90 };
export const SIDE = { w: 0, face: 1, torso: 180, arch: 0, head: 180, lu: -4, ll: 10, ru: 4, rl: 14, lt: -2, ls: 0, rt: 2, rs: 0, lf: 90, rf: 90 };
export const P = (base, o) => Object.assign({}, base, o);
const L = { torso: 60, neck: 9, headR: 13, ua: 30, la: 28, th: 40, sh: 38, ft: 12, shW: 16, hipW: 10 };

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

export function lerpPose(a, b, t, tDist = t) {
  const o = {};
  for (const k of KEYS) { const x = a[k] ?? 0, y = b[k] ?? 0; const u = DIST.has(k) ? tDist : t; o[k] = x + (y - x) * u; }
  return o;
}
const DIST = new Set(['ll', 'rl', 'ls', 'rs', 'lf', 'rf']); // forearms, shins, feet trail slightly (follow-through)
export const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // ease-in-out cubic
const clamp01 = v => Math.max(0, Math.min(1, v));

function bbox(J) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const k in J) { if (k === 'ctl') continue; const [x, y] = J[k]; const r = k === 'head' ? L.headR + 2 : 7; x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); }
  return { x0, x1, y0, y1 };
}

// Palettes: top (shirt), legs (leggings), skin, hair, room + mat. Light and dark variants of the calm and kid themes.
export const THEMES = {
  calm: { top: '#2f9e92', legs: '#2c3e57', skin: '#e9b48f', hair: '#4a2f22', mat: '#7cc4b8', matEdge: '#5aa79a', face: '#3a2a22', cheek: '#e98f86', wall: ['#f4f8f6', '#e3eeeb'], floor: ['#d9c7ae', '#c8b296'], light: 'rgba(255,248,230,.55)' },
  kids: { top: '#ff6f9f', legs: '#5a4fcf', skin: '#f3c09a', hair: '#6b3e22', mat: '#ffd84d', matEdge: '#f2b800', face: '#3a2a22', cheek: '#ff8fa0', wall: ['#fff6fb', '#ffe9f3'], floor: ['#ffe2a8', '#f7cf86'], light: 'rgba(255,255,240,.6)' },
  calmDark: { top: '#3cbfb0', legs: '#55688a', skin: '#e2ab86', hair: '#2c1a12', mat: '#2f7d72', matEdge: '#3f9d90', face: '#2a1d17', cheek: '#d9827a', wall: ['#1d2a2e', '#16211f'], floor: ['#2a2622', '#211d1a'], light: 'rgba(120,200,190,.10)' },
  kidsDark: { top: '#ff7aa8', legs: '#8d84ff', skin: '#efb994', hair: '#3b2214', mat: '#c9a227', matEdge: '#e2bb38', face: '#2a1d17', cheek: '#ff8fa0', wall: ['#2a1f33', '#211a2a'], floor: ['#33293d', '#2a2133'], light: 'rgba(255,150,200,.10)' }
};
THEMES.calmLight = THEMES.calm; THEMES.kidsLight = THEMES.kids;
const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const shade = (c, k) => { const [r, g, b] = hex(c); const f = v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)); return `rgb(${f(r)},${f(g)},${f(b)})`; };

// Draw pose p onto ctx in a box (x,y,w,h). opts: {theme, anchor:'bbox'|'feet', bg:true, breath:0..1, zoom}
export function drawFigure(ctx, p, box, opts = {}) {
  const th = THEMES[opts.theme || 'calm'] || THEMES.calm;
  const J = solve(p);
  const bb = bbox(J);
  const bh = bb.y1 - bb.y0 + 48, bw = bb.x1 - bb.x0 + 30;
  const s = Math.min(box.h / Math.max(210, bh), box.w / Math.max(250, bw)) * (opts.zoom || 1);
  const groundY = box.y + box.h - 16 * s;
  const ax = opts.anchor === 'feet' ? (J.lan[0] + J.ran[0]) / 2 : (bb.x0 + bb.x1) / 2;
  const ox = box.x + box.w / 2 - ax * s, oy = groundY - bb.y1 * s;
  const tr = q => [ox + q[0] * s, oy + q[1] * s];
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // ---- room: wall, floor, window light, mat with perspective, soft contact shadow ----
  if (opts.bg !== false) {
    const hz = groundY - 34 * s;
    let g = ctx.createLinearGradient(0, box.y, 0, hz); g.addColorStop(0, th.wall[0]); g.addColorStop(1, th.wall[1]);
    ctx.fillStyle = g; ctx.fillRect(box.x, box.y, box.w, hz - box.y);
    g = ctx.createRadialGradient(box.x + box.w * 0.22, box.y + box.h * 0.12, 0, box.x + box.w * 0.22, box.y + box.h * 0.12, box.w * 0.7);
    g.addColorStop(0, th.light); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(box.x, box.y, box.w, hz - box.y);
    g = ctx.createLinearGradient(0, hz, 0, box.y + box.h); g.addColorStop(0, th.floor[0]); g.addColorStop(1, th.floor[1]);
    ctx.fillStyle = g; ctx.fillRect(box.x, hz, box.w, box.y + box.h - hz);
    ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(box.x, hz, box.w, Math.max(1, 2 * s));
    const mw = Math.min(box.w * 0.86, Math.max(bw * s * 1.25, box.w * 0.5)), mx = box.x + (box.w - mw) / 2, mt = groundY - 16 * s, mb = groundY + 9 * s, inset = 18 * s;
    ctx.beginPath(); ctx.moveTo(mx + inset, mt); ctx.lineTo(mx + mw - inset, mt); ctx.lineTo(mx + mw, mb); ctx.lineTo(mx, mb); ctx.closePath();
    g = ctx.createLinearGradient(0, mt, 0, mb); g.addColorStop(0, shade(th.mat, 0.12)); g.addColorStop(1, shade(th.mat, -0.08)); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = th.matEdge; ctx.fillRect(mx, mb, mw, 3 * s);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1 * s; for (let k = 1; k < 4; k++) { const yy = mt + (mb - mt) * k / 4; const ins = inset * (1 - k / 4); ctx.beginPath(); ctx.moveTo(mx + ins, yy); ctx.lineTo(mx + mw - ins, yy); ctx.stroke(); }
  }
  const cx = (tr([bb.x0, 0])[0] + tr([bb.x1, 0])[0]) / 2, sw0 = (bb.x1 - bb.x0) * s * 0.62;
  let g = ctx.createRadialGradient(cx, groundY - 3 * s, 0, cx, groundY - 3 * s, sw0); g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.translate(cx, groundY - 3 * s); ctx.scale(1, 0.16); ctx.translate(-cx, -(groundY - 3 * s)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, groundY - 3 * s, sw0, 0, 7); ctx.fill(); ctx.restore();

  // ---- shaded body parts ----
  const LX = [-0.55, -0.83]; // light comes from upper left
  function limb(a, b, ra, rb, col, far) {
    const A = tr(a), B = tr(b); ra *= s; rb *= s;
    const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
    const base = far ? shade(col, -0.18) : col;
    const lit = nx * LX[0] + ny * LX[1] > 0 ? 1 : -1;
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, r = (ra + rb) / 2;
    const gr = ctx.createLinearGradient(mx + nx * r * lit, my + ny * r * lit, mx - nx * r * lit, my - ny * r * lit);
    gr.addColorStop(0, shade(base, 0.22)); gr.addColorStop(0.45, base); gr.addColorStop(1, shade(base, -0.28));
    ctx.fillStyle = gr; ctx.beginPath();
    const ang = Math.atan2(uy, ux);
    ctx.arc(A[0], A[1], ra, ang + Math.PI / 2, ang - Math.PI / 2);
    ctx.arc(B[0], B[1], rb, ang - Math.PI / 2, ang + Math.PI / 2);
    ctx.closePath(); ctx.fill();
  }
  function hand(w, el, far) { const d = [w[0] - el[0], w[1] - el[1]], n = Math.hypot(d[0], d[1]) || 1; limb(w, [w[0] + d[0] / n * 7, w[1] + d[1] / n * 7], 3.6, 2.6, th.skin, far); }
  function foot(an, to, far) { const d = [to[0] - an[0], to[1] - an[1]]; limb([an[0] - d[0] * 0.18, an[1] - d[1] * 0.18 + 1], to, 4.4, 2.9, th.skin, far); }
  function leg(h, k, a, t, far) { limb(h, k, 8.6, 6.4, th.legs, far); limb(k, a, 6.4, 4.2, th.legs, far); foot(a, t, far); }
  function arm(sh, el, wr, far) { limb(sh, el, 5.4, 4.2, th.skin, far); limb(el, wr, 4.2, 3.1, th.skin, far); hand(wr, el, far); limb(sh, [sh[0] + (el[0] - sh[0]) * 0.3, sh[1] + (el[1] - sh[1]) * 0.3], 6, 5.2, th.top, far); }
  const sideView = p.w < 0.5, wv = Math.max(0, Math.min(1, p.w)), br = opts.breath || 0;
  // far side first
  leg(J.lhip, J.lkn, J.lan, J.lto, sideView);
  if (sideView) arm(J.lsh, J.lel, J.lwr, true);
  // torso: offset curve around the spine (hip -> arch ctl -> neck) with a natural width profile
  const N = 14, Lp = [], Rp = [];
  const q = t => { const u = 1 - t; return [u * u * J.hip[0] + 2 * u * t * J.ctl[0] + t * t * J.neck[0], u * u * J.hip[1] + 2 * u * t * J.ctl[1] + t * t * J.neck[1]]; };
  const prof = t => { const hipW = 11 + 4 * wv, waist = 9 + 2.6 * wv, chest = (11.2 + 6 * wv) * (1 + br * 0.04), sh = 9.5 + 7.5 * wv; return t < 0.42 ? hipW + (waist - hipW) * Math.sin(t / 0.42 * Math.PI / 2) : t < 0.8 ? waist + (chest - waist) * Math.sin((t - 0.42) / 0.38 * Math.PI / 2) : chest + (sh - chest) * ((t - 0.8) / 0.2) ** 2; };
  for (let k = 0; k <= N; k++) { const t = k / N, a = q(Math.max(0, t - 0.01)), b = q(Math.min(1, t + 0.01)), c = q(t); const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; const n = [-dy / d, dx / d], w = prof(t); Lp.push(tr([c[0] + n[0] * w, c[1] + n[1] * w])); Rp.push(tr([c[0] - n[0] * w, c[1] - n[1] * w])); }
  const H = tr(J.hip), Nk = tr(J.neck), tdx = Nk[0] - H[0], tdy = Nk[1] - H[1], tl = Math.hypot(tdx, tdy) || 1, tn = [-tdy / tl, tdx / tl], tw = 16 * s;
  const tlit = tn[0] * LX[0] + tn[1] * LX[1] > 0 ? 1 : -1, tm = [(H[0] + Nk[0]) / 2, (H[1] + Nk[1]) / 2];
  const torsoPath = () => { ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]); for (const pt of Lp) ctx.lineTo(pt[0], pt[1]); for (let k = Rp.length - 1; k >= 0; k--) ctx.lineTo(Rp[k][0], Rp[k][1]); ctx.closePath(); };
  // leggings waistband region (lower 30%) then top
  g = ctx.createLinearGradient(tm[0] + tn[0] * tw * tlit, tm[1] + tn[1] * tw * tlit, tm[0] - tn[0] * tw * tlit, tm[1] - tn[1] * tw * tlit);
  g.addColorStop(0, shade(th.top, 0.2)); g.addColorStop(0.5, th.top); g.addColorStop(1, shade(th.top, -0.3));
  torsoPath(); ctx.fillStyle = g; ctx.fill();
  ctx.save(); torsoPath(); ctx.clip();
  const cut = Math.round(N * 0.3); ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]); for (let k = 0; k <= cut; k++) ctx.lineTo(Lp[k][0], Lp[k][1]); for (let k = cut; k >= 0; k--) ctx.lineTo(Rp[k][0], Rp[k][1]); ctx.closePath();
  const g2 = ctx.createLinearGradient(tm[0] + tn[0] * tw * tlit, tm[1] + tn[1] * tw * tlit, tm[0] - tn[0] * tw * tlit, tm[1] - tn[1] * tw * tlit); g2.addColorStop(0, shade(th.legs, 0.18)); g2.addColorStop(1, shade(th.legs, -0.25));
  ctx.fillStyle = g2; ctx.fill();
  // skin at the midriff in kid theme? keep modest: no. Subtle hem line
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(Lp[cut][0], Lp[cut][1]); ctx.lineTo(Rp[cut][0], Rp[cut][1]); ctx.stroke();
  ctx.restore();
  // near side
  leg(J.rhip, J.rkn, J.ran, J.rto, false);
  if (!sideView) arm(J.lsh, J.lel, J.lwr, false);
  arm(J.rsh, J.rel, J.rwr, false);
  // neck + head
  const hd = dir(p.head);
  limb(J.neck, [J.neck[0] + hd[0] * 9, J.neck[1] + hd[1] * 9], 4.6, 4.2, th.skin, false);
  const hc = tr(J.head), hr = L.headR * s;
  const hang = Math.atan2(hd[1], hd[0]) + Math.PI / 2;
  const f = Math.max(-1, Math.min(1, p.face || 0)), side = Math.abs(f) >= 0.6;
  ctx.save(); ctx.translate(hc[0], hc[1]); ctx.rotate(hang);
  // ponytail behind
  ctx.fillStyle = shade(th.hair, -0.1); ctx.beginPath(); ctx.ellipse(-f * hr * 0.95, -hr * 0.35, hr * 0.32, hr * 0.62, -f * 0.5, 0, 7); ctx.fill();
  const hg = ctx.createRadialGradient(-hr * 0.35, -hr * 0.35, hr * 0.1, 0, 0, hr * 1.1); hg.addColorStop(0, shade(th.skin, 0.15)); hg.addColorStop(1, shade(th.skin, -0.15));
  ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(0, 0, hr * 0.92, hr, 0, 0, 7); ctx.fill();
  if (side) { ctx.beginPath(); ctx.moveTo(f * hr * 0.85, -hr * 0.05); ctx.quadraticCurveTo(f * hr * 1.12, hr * 0.12, f * hr * 0.86, hr * 0.26); ctx.fill(); }
  // hair cap
  ctx.fillStyle = th.hair; ctx.beginPath(); ctx.ellipse(-f * hr * 0.12, -hr * 0.18, hr * 0.98, hr * 0.86, 0, Math.PI * 1.02 + f * 0.3, Math.PI * 1.98 + f * 0.3); ctx.closePath(); ctx.fill();
  if (side) { ctx.beginPath(); ctx.ellipse(-f * hr * 0.45, -hr * 0.05, hr * 0.55, hr * 0.75, 0, 0, 7); ctx.fill(); }
  // face
  ctx.fillStyle = th.face; const ex = hr * 0.34, ey = hr * 0.02, fx = f * hr * 0.5;
  if (!side) { dotC(ctx, fx - ex, ey, hr * 0.09); dotC(ctx, fx + ex, ey, hr * 0.09); }
  else dotC(ctx, fx + f * hr * 0.12, ey, hr * 0.09);
  ctx.strokeStyle = th.face; ctx.lineWidth = Math.max(1, hr * 0.08);
  ctx.beginPath(); ctx.arc(fx + (side ? f * hr * 0.12 : 0), hr * 0.3, hr * 0.2, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  ctx.globalAlpha = 0.35; ctx.fillStyle = th.cheek;
  if (!side) { dotC(ctx, fx - hr * 0.52, hr * 0.3, hr * 0.14); dotC(ctx, fx + hr * 0.52, hr * 0.3, hr * 0.14); } else dotC(ctx, fx - f * hr * 0.05, hr * 0.32, hr * 0.14);
  ctx.globalAlpha = 1; ctx.restore();
  if (opts.glow) for (const gj of opts.glow) if (J[gj]) { const a = tr(J[gj]); ctx.strokeStyle = 'rgba(255,200,0,.9)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(a[0], a[1], 10 * s, 0, 7); ctx.stroke(); }
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
  const raw = sg.move === false ? 1 : clamp01((t - sg.t0) / Math.min(sg.t, sg.mt || 2.4));
  const k = ease(raw), kd = ease(clamp01((raw - 0.1) / 0.9));
  return { p: lerpPose(a, b, k, kd), seg: sg, idx: i };
}
