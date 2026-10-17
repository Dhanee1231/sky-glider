// Color Magic pack kit: tiny path helpers used to author the pack pictures (original art, drawn in code, 2048 px world).
// A picture is {id,name,stars,w,h,bg,pal:[#hex],shapes:[[colorIdx,'path',clipPath?]],line:['path']}; shapes paint in order (later = on top).
// A shape with a clip path is drawn clipped to it (used for gem facets, stripes). Provenance: Claude (paths only), reviewed by Studio Lead, Oct 16 2026.
(function () {
  const r = n => Math.round(n), RAD = Math.PI / 180;
  const pt = (x, y) => r(x) + ' ' + r(y);
  const K = {
    circ: (cx, cy, R) => 'M' + pt(cx - R, cy) + 'a' + r(R) + ' ' + r(R) + ' 0 1 0 ' + r(2 * R) + ' 0a' + r(R) + ' ' + r(R) + ' 0 1 0 ' + r(-2 * R) + ' 0Z',
    ell(cx, cy, rx, ry, deg) {
      deg = deg || 0; const ux = Math.cos(deg * RAD) * rx, uy = Math.sin(deg * RAD) * rx, a = 'A' + r(rx) + ' ' + r(ry) + ' ' + r(deg) + ' 1 0 ';
      return 'M' + pt(cx + ux, cy + uy) + a + pt(cx - ux, cy - uy) + a + pt(cx + ux, cy + uy) + 'Z';
    },
    heart(cx, cy, s) {
      const p = (x, y) => pt(cx + x * s, cy + y * s);
      return 'M' + p(0, 0.92) + 'C' + p(-1.25, 0.12) + ' ' + p(-1.1, -0.95) + ' ' + p(-0.55, -0.82) + 'C' + p(-0.25, -0.76) + ' ' + p(-0.05, -0.55) + ' ' + p(0, -0.34) +
        'C' + p(0.05, -0.55) + ' ' + p(0.25, -0.76) + ' ' + p(0.55, -0.82) + 'C' + p(1.1, -0.95) + ' ' + p(1.25, 0.12) + ' ' + p(0, 0.92) + 'Z';
    },
    star(cx, cy, R, rr, n, rot) {
      n = n || 5; rot = rot == null ? -90 : rot; let d = '';
      for (let i = 0; i < n * 2; i++) { const a = (rot + i * 180 / n) * RAD, q = i % 2 ? rr : R; d += (i ? 'L' : 'M') + pt(cx + Math.cos(a) * q, cy + Math.sin(a) * q); }
      return d + 'Z';
    },
    poly(a) { let d = ''; for (let i = 0; i < a.length; i += 2) d += (i ? 'L' : 'M') + pt(a[i], a[i + 1]); return d + 'Z'; },
    rect: (x, y, w, h) => K.poly([x, y, x + w, y, x + w, y + h, x, y + h]),
    rrect(x, y, w, h, q) {
      q = Math.min(q, w / 2, h / 2); const A = 'a' + r(q) + ' ' + r(q) + ' 0 0 1 ';
      return 'M' + pt(x + q, y) + 'h' + r(w - 2 * q) + A + pt(q, q) + 'v' + r(h - 2 * q) + A + pt(-q, q) + 'h' + r(2 * q - w) + A + pt(-q, -q) + 'v' + r(2 * q - h) + A + pt(q, -q) + 'Z';
    },
    // ring: outer circle plus a reversed inner circle (nonzero fill leaves a hole)
    ring: (cx, cy, R, q) => K.circ(cx, cy, R) + 'M' + pt(cx - q, cy) + 'a' + r(q) + ' ' + r(q) + ' 0 1 1 ' + r(2 * q) + ' 0a' + r(q) + ' ' + r(q) + ' 0 1 1 ' + r(-2 * q) + ' 0Z',
    // annular sector, degrees clockwise on screen (0 = right)
    band(cx, cy, R1, R2, a0, a1) {
      const p = (R, a) => pt(cx + Math.cos(a * RAD) * R, cy + Math.sin(a * RAD) * R), big = Math.abs(a1 - a0) > 180 ? 1 : 0;
      return 'M' + p(R1, a0) + 'A' + r(R1) + ' ' + r(R1) + ' 0 ' + big + ' 1 ' + p(R1, a1) + 'L' + p(R2, a1) + 'A' + r(R2) + ' ' + r(R2) + ' 0 ' + big + ' 0 ' + p(R2, a0) + 'Z';
    },
    // a fluffy cloud: three bumps on a flat base, centred on (cx,cy), width w
    cloud(cx, cy, w) {
      const x = f => cx + (f - 0.5) * w, y = f => cy + f * w, R = f => r(f * w);
      return 'M' + pt(x(0.1), y(0.16)) + 'A' + R(0.14) + ' ' + R(0.14) + ' 0 0 1 ' + pt(x(0.2), y(-0.1)) + 'A' + R(0.2) + ' ' + R(0.2) + ' 0 0 1 ' + pt(x(0.58), y(-0.14)) +
        'A' + R(0.17) + ' ' + R(0.17) + ' 0 0 1 ' + pt(x(0.9), y(0.16)) + 'Z';
    },
    // quadratic-smoothed closed blob through points
    blob(a) {
      const n = a.length / 2, m = i => [a[(i % n) * 2], a[(i % n) * 2 + 1]]; let d = '';
      for (let i = 0; i < n; i++) { const p = m(i), q = m(i + 1), mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; d += (i ? 'Q' + pt(p[0], p[1]) + ' ' + pt(mx, my) : 'M' + pt(mx, my)); }
      const p = m(0), q = m(1); return d + 'Q' + pt(p[0], p[1]) + ' ' + pt((p[0] + q[0]) / 2, (p[1] + q[1]) / 2) + 'Z';
    },
    // pie wedge from the centre, degrees clockwise on screen (0 = right)
    wedge(cx, cy, R, a0, a1) { const p = a => pt(cx + Math.cos(a * RAD) * R, cy + Math.sin(a * RAD) * R); return 'M' + pt(cx, cy) + 'L' + p(a0) + 'A' + r(R) + ' ' + r(R) + ' 0 ' + (Math.abs(a1 - a0) > 180 ? 1 : 0) + ' 1 ' + p(a1) + 'Z'; },
    // open smile stroke (for the line layer), centred on (cx,cy), half-width w, depth h
    smile: (cx, cy, w, h) => 'M' + pt(cx - w, cy) + 'Q' + pt(cx, cy + 2 * h) + ' ' + pt(cx + w, cy),
    // googly eye: white disc + dark pupil (sc / pc = palette indexes), pupil nudged by (dx, dy)
    eye(x, y, R, sc, pc, dx, dy) { return [[sc, K.circ(x, y, R)], [pc, K.circ(x + (dx || 0), y + (dy == null ? R * 0.1 : dy), R * 0.46)]]; },
    // closed wavy-edged disc (flower / icing / cloud edge): n bumps of height b on radius R, clockwise
    wavy(cx, cy, R, n, b) { let d = ''; const m = n * 8; for (let i = 0; i < m; i++) { const a = i / m * 2 * Math.PI, q = R + b * Math.sin(a * n); d += (i ? 'L' : 'M') + pt(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } return d + 'Z'; },
    // mirror helper: x -> 2048 - x for a flat polygon array
    mir: a => a.map((v, i) => i % 2 ? v : 2048 - v)
  };
  window.CMK = K;
  window.CM_PACKS = window.CM_PACKS || {};
  window.CM_PACK = (name, meta, pics) => { window.CM_PACKS[name] = { id: name, name: meta.name, order: meta.order, pics }; };
  // label spots written by dev/tools/cbn-packprep.mjs: CM_LAB(pack, {picId: [[x, y, inradius, digitSize] per shape]}); ignored unless it covers every shape
  window.CM_LAB = (name, map) => { const p = window.CM_PACKS[name]; if (p) for (const pic of p.pics) { const l = map[pic.id]; if (l && l.length === pic.shapes.length) pic.lab = l; } };
})();
// CM-LAB-BEGIN (generated by dev/tools/cbn-packprep.mjs; do not edit by hand)
// CM-LAB-END
