// Extra path helpers for Color Magic v9 packs. Load after kit.js and before rainbow.js, garden.js, space.js.
// Original art drawn in code by Grok 4.7 (paths only) for Dhanee's Playground, Oct 2026, review: Studio Lead.
// Helpers only: no pictures here, and kit.js is not modified.
(function () {
  const { circ, ell, star, band, wedge } = CMK;
  const rad = Math.PI / 180;
  // five-petal flower, same construction as the meadow pack, sized by s (use s >= 240 when every region must be large)
  function flower(cx, cy, s, pc, cc) {
    const o = [];
    for (let i = 0; i < 5; i++) {
      const a = (-90 + i * 72) * rad;
      o.push([pc, ell(cx + Math.cos(a) * s * 0.85, cy + Math.sin(a) * s * 0.85, s * 0.62, s * 0.46, -90 + i * 72)]);
    }
    o.push([cc, circ(cx, cy, s * 0.5)]);
    return o;
  }
  // six-petal bloom (use s >= 270 when every region must be large)
  function bloom(cx, cy, s, pc, cc) {
    const o = [];
    for (let i = 0; i < 6; i++) {
      const a = (-90 + i * 60) * rad, deg = -90 + i * 60;
      o.push([pc, ell(cx + Math.cos(a) * s * 0.78, cy + Math.sin(a) * s * 0.78, s * 0.56, s * 0.4, deg)]);
    }
    o.push([cc, circ(cx, cy, s * 0.48)]);
    return o;
  }
  // rainbow bands, outer radius R, thickness t, cols[0] is the outer band. Angles match CMK.band (0 = right, clockwise).
  function rbands(cx, cy, R, t, cols, a0, a1) {
    return cols.map((c, i) => [c, band(cx, cy, R - i * t, R - (i + 1) * t, a0, a1)]);
  }
  // pie slices of a disc, cols in order from a0
  function wedges(cx, cy, R, cols, a0) {
    const step = 360 / cols.length;
    return cols.map((c, i) => [c, wedge(cx, cy, R, a0 + i * step, a0 + (i + 1) * step)]);
  }
  function spark(x, y, R, ci) { return [ci, star(x, y, R, Math.round(R * 0.48), 4)]; }
  // one fluffy bush: three discs in a single region
  function bush(cx, cy, r) {
    return circ(cx, cy - r * 0.15, r) + circ(cx - r * 0.72, cy + r * 0.28, r * 0.78) + circ(cx + r * 0.74, cy + r * 0.22, r * 0.74);
  }
  window.CMK2 = { flower, bloom, rbands, wedges, spark, bush };
})();
