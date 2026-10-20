// Extra path helpers for Color Magic v9 packs (kit3: Farm, Dino, Seasons; load after kit.js, before farm.js, dino.js, seasons.js).
// Original art drawn in code by Grok 4.7 (paths only) for Dhanee's Playground, Oct 2026, review: Studio Lead.
// New file only: kit.js stays as it is. These speak the same SVG path dialect.
(function () {
  const K = CMK;
  // Five-petal flower. s is the petal reach; s >= 280 keeps every petal and the centre
  // at about 1% of the 2048 canvas or larger.
  function flower(cx, cy, s, pc, cc) {
    const o = [];
    for (let i = 0; i < 5; i++) {
      const deg = -90 + i * 72, a = deg * Math.PI / 180;
      o.push([pc, K.ell(cx + Math.cos(a) * s * 0.82, cy + Math.sin(a) * s * 0.82, s * 0.64, s * 0.5, deg)]);
    }
    o.push([cc, K.circ(cx, cy, Math.max(132, Math.round(s * 0.46)))]);
    return o;
  }
  // Friendly eye. The pupil radius stays 132 so it is a real region; pass R >= 200
  // so the white ring around it stays large too.
  function eye(x, y, R, wc, pc) {
    return [[wc, K.circ(x, y, R)], [pc, K.circ(x, y + Math.round(R * 0.05), 132)]];
  }
  // Thick sun rays. mids are degrees (0 = right, clockwise on screen); sweep is the wedge width.
  function rays(cx, cy, R, mids, sweep, ci) {
    return mids.map(a => [ci, K.wedge(cx, cy, R, a - sweep / 2, a + sweep / 2)]);
  }
  // Closed silhouette through points [x, y, sharp]: smooth curves by default, a sharp corner where sharp is 1
  // (horn tips, claws, tail tips). Used to draw an animal's whole outline as one readable shape.
  function sil(a) {
    const n = a.length, m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], f = p => Math.round(p[0]) + ' ' + Math.round(p[1]);
    let d = 'M' + f(m(a[n - 1], a[0]));
    for (let i = 0; i < n; i++) { const p = a[i], q = m(p, a[(i + 1) % n]); d += p[2] ? 'L' + f(p) + 'L' + f(q) : 'Q' + f(p) + ' ' + f(q); }
    return d + 'Z';
  }
  window.CMK3 = { flower, eye, rays, sil };
})();
