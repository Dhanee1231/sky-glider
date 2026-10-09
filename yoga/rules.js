// Yoga Coach posture rules: joint angles + alignment from 33 MediaPipe pose landmarks.
// Works on one person's landmarks [{x,y,visibility}] (normalized), with aspect = videoWidth/videoHeight.
export const LM = { nose: 0, ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lh: 23, rh: 24, lk: 25, rk: 26, la: 27, ra: 28 };
const D = 180 / Math.PI;
const pt = (L, i, asp) => ({ x: L[i].x * asp, y: L[i].y, v: L[i].visibility ?? 1 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) });
export function angle(a, b, c) { const v1 = [a.x - b.x, a.y - b.y], v2 = [c.x - b.x, c.y - b.y]; const d = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2) || 1); return Math.acos(Math.max(-1, Math.min(1, d))) * D; }
// tilt of segment a->b from vertical (degrees, 0 = vertical)
const tiltV = (a, b) => Math.abs(Math.atan2(b.x - a.x, a.y - b.y) * D);
// angle of segment from horizontal (0..90)
const tiltH = (a, b) => { const t = Math.abs(Math.atan2(a.y - b.y, Math.abs(b.x - a.x)) * D); return t; };

// band scoring: 1 inside [glo,ghi], 0.6 inside [olo,ohi], else 0
function band(v, glo, ghi, olo, ohi) { if (v >= glo && v <= ghi) return 1; if (v >= olo && v <= ohi) return 0.6; return 0; }
const st = s => s >= 0.99 ? 'good' : s > 0 ? 'ok' : 'bad';

export function measures(L, asp = 1) {
  const g = k => pt(L, LM[k], asp);
  const m = { nose: g('nose'), ls: g('ls'), rs: g('rs'), le: g('le'), re: g('re'), lw: g('lw'), rw: g('rw'), lh: g('lh'), rh: g('rh'), lk: g('lk'), rk: g('rk'), la: g('la'), ra: g('ra') };
  m.sh = mid(m.ls, m.rs); m.hip = mid(m.lh, m.rh); m.an = mid(m.la, m.ra);
  m.torso = dist(m.sh, m.hip) || 0.001;
  m.kL = angle(m.lh, m.lk, m.la); m.kR = angle(m.rh, m.rk, m.ra);
  m.eL = angle(m.ls, m.le, m.lw); m.eR = angle(m.rs, m.re, m.rw);
  m.hL = angle(m.ls, m.lh, m.lk); m.hR = angle(m.rs, m.rh, m.rk);
  // best-visible side for side-view poses
  const vis = s => m[s + 'h'].v + m[s + 'k'].v + m[s + 'a'].v + m[s + 's'].v;
  m.side = vis('l') >= vis('r') ? 'l' : 'r';
  const s = m.side; m.S = { sh: m[s + 's'], el: m[s + 'e'], wr: m[s + 'w'], hip: m[s + 'h'], kn: m[s + 'k'], an: m[s + 'a'], k: s === 'l' ? m.kL : m.kR, e: s === 'l' ? m.eL : m.eR, h: s === 'l' ? m.hL : m.hR };
  m.tilt = tiltV(m.hip, m.sh);
  return m;
}

const R = (id, score, joints, fix, extra = {}) => ({ id, score, status: st(score), joints, fix, ...extra });
const J = LM;

export const RULES = {
  mountain: m => [
    R('legs', band(Math.min(m.kL, m.kR), 165, 181, 150, 181), [J.lk, J.rk], 'Gently straighten your legs, keep knees soft.'),
    R('tall', band(m.tilt, 0, 10, 0, 20), [J.ls, J.rs, J.lh, J.rh], 'Stand up tall. Stack your shoulders over your hips.'),
    R('level', band(Math.abs(m.ls.y - m.rs.y) / m.torso, 0, 0.08, 0, 0.15), [J.ls, J.rs], 'Level your shoulders and let them relax down.'),
    R('feet', band(dist(m.la, m.ra) / m.torso, 0, 0.75, 0, 1.1), [J.la, J.ra], 'Bring your feet about hip-width apart.'),
    R('arms', m.lw.y > m.sh.y + 0.4 * m.torso && m.rw.y > m.sh.y + 0.4 * m.torso ? 1 : 0.6, [J.lw, J.rw], 'Let your arms rest by your sides.')
  ],
  tree: m => {
    const leftStand = m.la.y >= m.ra.y; const sk = leftStand ? m.kL : m.kR, lk = leftStand ? m.kR : m.kL;
    const stA = leftStand ? m.la : m.ra, upA = leftStand ? m.ra : m.la;
    const lift = (stA.y - upA.y) / m.torso;
    const handsUp = m.lw.y < m.nose.y && m.rw.y < m.nose.y;
    const handsHeart = dist(m.lw, m.rw) < 0.45 * m.torso && m.lw.y > m.sh.y - 0.2 * m.torso && m.lw.y < m.hip.y;
    return [
      R('standleg', band(sk, 160, 181, 145, 181), [leftStand ? J.lk : J.rk], 'Straighten your standing leg.'),
      R('lift', band(lift, 0.12, 9, 0.05, 9), [leftStand ? J.ra : J.la], 'Lift one foot to your ankle, calf or inner thigh.'),
      R('kneeout', band(lk, 0, 125, 0, 150), [leftStand ? J.rk : J.lk], 'Bend the lifted knee and let it open to the side.'),
      R('hands', handsUp || handsHeart ? 1 : 0.6, [J.lw, J.rw], 'Bring your hands to your heart, or up overhead like branches.'),
      R('tall', band(m.tilt, 0, 10, 0, 20), [J.ls, J.rs], 'Stand tall through your standing leg.')
    ];
  },
  warrior2: m => {
    const leftFront = m.kL <= m.kR; const fk = leftFront ? m.kL : m.kR, bk = leftFront ? m.kR : m.kL;
    const fixFront = fk > 110 ? 'Bend your front knee a little more.' : 'Ease up a little. Keep your front knee over your ankle.';
    const armY = Math.max(Math.abs(m.lw.y - m.ls.y), Math.abs(m.rw.y - m.rs.y)) / m.torso;
    return [
      R('frontknee', band(fk, 80, 112, 68, 140), [leftFront ? J.lk : J.rk], fixFront, { value: Math.round(fk) }),
      R('backleg', band(bk, 155, 181, 140, 181), [leftFront ? J.rk : J.lk], 'Straighten your back leg.'),
      R('armslevel', band(armY, 0, 0.18, 0, 0.32), [J.lw, J.rw, J.le, J.re], 'Lift your arms to shoulder height.'),
      R('armslong', band(Math.min(m.eL, m.eR), 150, 181, 130, 181), [J.le, J.re], 'Reach long through your fingertips.'),
      R('stance', band(dist(m.la, m.ra) / m.torso, 1.3, 9, 1.0, 9), [J.la, J.ra], 'Step your feet wider apart.'),
      R('tall', band(m.tilt, 0, 12, 0, 22), [J.ls, J.rs, J.lh, J.rh], 'Keep your body upright, stacked over your hips.')
    ];
  },
  chair: m => {
    const k = m.S.k;
    return [
      R('knees', band(k, 75, 145, 60, 160), [J.lk, J.rk], k > 145 ? 'Sit a little lower. Bend your knees more.' : 'Come up a little higher.', { value: Math.round(k) }),
      R('arms', m.lw.y < m.sh.y && m.rw.y < m.sh.y ? 1 : (m.lw.y < m.hip.y ? 0.6 : 0), [J.lw, J.rw], 'Reach your arms up by your ears.'),
      R('even', band(dist(m.la, m.ra) / m.torso, 0, 0.8, 0, 1.1), [J.la, J.ra], 'Bring your feet hip-width apart.'),
      R('chest', band(m.tilt, 5, 45, 0, 58), [J.ls, J.rs], m.tilt > 45 ? 'Lift your chest up a little.' : 'Sit your hips back like there is a chair behind you.')
    ];
  },
  downdog: m => {
    const S = m.S; const hipHigh = (Math.min(S.sh.y, S.an.y) - S.hip.y) / m.torso;
    return [
      R('hips', band(hipHigh, 0.35, 9, 0.12, 9), [J.lh, J.rh], 'Lift your hips up high toward the sky.'),
      R('arms', band(S.e, 150, 181, 130, 181), [J.le, J.re], 'Straighten your arms and push the floor away.'),
      R('legs', band(S.k, 145, 181, 105, 181), [J.lk, J.rk], 'Try straightening your legs a little. Bent knees are OK.'),
      R('shape', band(S.h, 45, 105, 35, 130), [J.lh, J.rh], S.h > 105 ? 'Push your hips up and back.' : 'Walk your feet back a little.')
    ];
  },
  star: m => [
    R('armsup', m.lw.y < m.sh.y && m.rw.y < m.sh.y && dist(m.lw, m.rw) > 1.2 * m.torso ? 1 : (m.lw.y < m.hip.y && m.rw.y < m.hip.y ? 0.6 : 0), [J.lw, J.rw], 'Reach your arms up and out like a star.'),
    R('wide', band(dist(m.la, m.ra) / m.torso, 0.9, 9, 0.65, 9), [J.la, J.ra], 'Step your feet wider apart.'),
    R('legs', band(Math.min(m.kL, m.kR), 158, 181, 140, 181), [J.lk, J.rk], 'Straighten your legs.'),
    R('armslong', band(Math.min(m.eL, m.eR), 145, 181, 120, 181), [J.le, J.re], 'Stretch your arms long.')
  ],
  child: m => {
    const S = m.S;
    return [
      R('knees', band(S.k, 0, 65, 0, 90), [J.lk, J.rk], 'Sit your hips back toward your heels.'),
      R('fold', band(S.h, 0, 65, 0, 95), [J.lh, J.rh], 'Fold forward and let your chest rest down.'),
      R('head', m.nose.y > S.sh.y - 0.05 * m.torso ? 1 : 0.6, [J.nose], 'Let your forehead rest down.')
    ];
  },
  butterfly: m => [
    R('kneesout', band(dist(m.lk, m.rk) / m.torso, 0.75, 9, 0.5, 9), [J.lk, J.rk], 'Let your knees fall open to the sides.'),
    R('feet', band(dist(m.la, m.ra) / m.torso, 0, 0.45, 0, 0.7), [J.la, J.ra], 'Bring the soles of your feet together.'),
    R('tall', band(m.tilt, 0, 15, 0, 28), [J.ls, J.rs], 'Sit up tall through your spine.'),
    R('seated', band(Math.abs(m.hip.y - m.an.y) / m.torso, 0, 0.4, 0, 0.6), [J.lh, J.rh], 'Sit down on the floor.')
  ],
  seatedfold: m => {
    const S = m.S;
    return [
      R('legs', band(S.k, 150, 181, 115, 181), [J.lk, J.rk], 'Lengthen your legs. A small bend is fine.'),
      R('seated', band(Math.abs(S.hip.y - S.an.y) / m.torso, 0, 0.4, 0, 0.6), [J.lh, J.rh], 'Sit on the floor with legs long in front.'),
      R('fold', band(S.h, 0, 80, 0, 105), [J.lh, J.rh], 'Hinge forward from your hips.')
    ];
  },
  cobra: m => {
    const S = m.S; const lift = (S.hip.y - S.sh.y) / m.torso; const ang = tiltH(S.hip, S.sh);
    return [
      R('lift', band(lift, 0.3, 9, 0.12, 9), [J.ls, J.rs], 'Press gently and lift your chest.'),
      R('height', band(ang, 0, 58, 0, 72), [J.le, J.re], 'Lower a little and keep your elbows soft.'),
      R('legs', band(S.k, 150, 181, 125, 181), [J.lk, J.rk], 'Keep your legs long behind you.'),
      R('lying', band(Math.abs(S.hip.y - S.an.y) / m.torso, 0, 0.35, 0, 0.55), [J.lh, J.rh], 'Keep your hips and legs on the floor.')
    ];
  },
  bridge: m => {
    const S = m.S; const lift = (S.sh.y - S.hip.y) / m.torso;
    return [
      R('hips', band(lift, 0.22, 9, 0.08, 9), [J.lh, J.rh], 'Press into your feet and lift your hips higher.'),
      R('knees', band(S.k, 65, 112, 50, 135), [J.lk, J.rk], S.k > 112 ? 'Walk your feet a little closer to your hips.' : 'Step your feet a little further away.'),
      R('line', band(S.h, 145, 181, 125, 181), [J.lh, J.rh], 'Make a long ramp from shoulders to knees.')
    ];
  },
  forwardfold: m => {
    const S = m.S; const fold = (S.sh.y - S.hip.y) / m.torso;
    return [
      R('fold', band(fold, 0.45, 9, 0.15, 9) * band(S.h, 0, 75, 0, 95), [J.ls, J.rs, J.lh, J.rh], 'Fold forward from your hips and let your head hang.'),
      R('knees', band(S.k, 125, 181, 95, 181), [J.lk, J.rk], 'Keep a soft bend in your knees.'),
      R('head', m.nose.y > S.sh.y ? 1 : 0.6, [J.nose], 'Relax your neck and let your head hang heavy.')
    ];
  },
  sidebend: m => [
    R('arms', m.lw.y < m.nose.y && m.rw.y < m.nose.y ? 1 : 0.6, [J.lw, J.rw], 'Reach your arms up overhead.'),
    R('lean', band(m.tilt, 8, 35, 4, 45), [J.ls, J.rs], m.tilt < 8 ? 'Lean a little further to the side.' : 'Come up a little. Lean gently.', { value: Math.round(m.tilt) }),
    R('legs', band(Math.min(m.kL, m.kR), 160, 181, 145, 181), [J.lk, J.rk], 'Keep both legs straight and feet grounded.')
  ],
  lunge: m => {
    const leftBack = m.lk.y >= m.rk.y; const fk = leftBack ? m.kR : m.kL; const bh = leftBack ? m.hL : m.hR;
    return [
      R('front', band(fk, 75, 115, 60, 135), [leftBack ? J.rk : J.lk], fk > 115 ? 'Bend your front knee a bit more.' : 'Keep your front knee over your ankle.'),
      R('hips', band(bh, 145, 181, 125, 181), [J.lh, J.rh], 'Slide your hips gently forward.'),
      R('tall', band(m.tilt, 0, 15, 0, 28), [J.ls, J.rs], 'Lift your chest and stay tall.')
    ];
  }
};
export const CHECKABLE = Object.keys(RULES);

const REQ = [J.ls, J.rs, J.lh, J.rh, J.lk, J.rk, J.la, J.ra];
export function visibility(L, sideView) {
  const inF = i => L[i].x > -0.03 && L[i].x < 1.03 && L[i].y > -0.03 && L[i].y < 1.03;
  const ok = (i, t = 0.5) => (L[i].visibility ?? 1) > t && inF(i);
  let missing;
  if (sideView) {
    const l = [J.ls, J.lh, J.lk, J.la], r = [J.rs, J.rh, J.rk, J.ra];
    const req = l.filter(i => ok(i)).length >= r.filter(i => ok(i)).length ? l : r;
    missing = req.filter(i => !ok(i));
  } else {
    missing = [J.ls, J.rs, J.lh, J.rh].filter(i => !ok(i));
    const legs = [J.lk, J.rk, J.la, J.ra];
    const good = legs.filter(i => ok(i)).length;
    // a lifted / tucked foot is often half-hidden: allow one low-confidence leg point if it is still in frame
    if (good < 3 || legs.some(i => !ok(i, 0.15))) missing = missing.concat(legs.filter(i => !ok(i)));
  }
  if (!missing.length) return { visible: true };
  const feet = missing.some(i => i === J.la || i === J.ra || i === J.lk || i === J.rk);
  const top = missing.some(i => i === J.ls || i === J.rs);
  return { visible: false, missing, msg: feet && top ? 'Step back so I can see your whole body.' : feet ? "I can't see your feet. Step back or tilt the phone down." : top ? "I can't see your shoulders. Step back a little." : 'Move to the middle so your whole body is in view.' };
}
const SIDE_VIEW = new Set(['chair', 'lunge', 'downdog', 'child', 'seatedfold', 'cobra', 'bridge', 'forwardfold']);
export function evaluate(poseId, L, asp = 1) {
  const fn = RULES[poseId]; if (!fn) return null;
  const vis = visibility(L, SIDE_VIEW.has(poseId));
  if (!vis.visible) return { visible: false, msg: vis.msg, missing: vis.missing, rules: [], score: 0 };
  const m = measures(L, asp); const rules = fn(m);
  const score = rules.reduce((a, r) => a + r.score, 0) / rules.length;
  const bad = rules.filter(r => r.status === 'bad'), ok = rules.filter(r => r.status === 'ok');
  const worst = bad[0] || ok[0] || null;
  return { visible: true, rules, score, good: score >= 0.75 && !bad.length, worst, measures: { kL: Math.round(m.kL), kR: Math.round(m.kR), tilt: Math.round(m.tilt) } };
}
