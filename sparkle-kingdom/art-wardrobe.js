// Sparkle Kingdom wardrobe + pet art (v5, Phase 1). Everything drawn in code ONCE into offscreen canvases, then stamped
// with drawImage while playing (no per-frame building). Units match Glimmer's: hats sit in her head frame, capes behind her
// first body bead, wings replace her wing sprite, shoes replace her feet. Pets float behind her. Sparkle Kingdom's own art.
(function () {
  const TAU = Math.PI * 2;
  const mk = (wu, hu, fn, ss) => { ss = ss || 3; const c = document.createElement('canvas'); c.width = Math.ceil(wu * ss); c.height = Math.ceil(hu * ss);
    const g = c.getContext('2d'); g.scale(ss, ss); g.translate(wu / 2, hu / 2); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g); c.w = wu; c.h = hu; return c; };
  const circ = (g, x, y, r, f, s, lw) => { g.beginPath(); g.arc(x, y, r, 0, TAU); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.lineWidth = lw || 1.2; g.strokeStyle = s; g.stroke(); } };
  const ell = (g, x, y, rx, ry, rot, f, s, lw) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.lineWidth = lw || 1.2; g.strokeStyle = s; g.stroke(); } };
  const star = (g, x, y, r, ri, f, s, lw) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? ri : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.lineWidth = lw || 1; g.strokeStyle = s; g.stroke(); } };
  const lg = (g, x0, y0, x1, y1, st) => { const r = g.createLinearGradient(x0, y0, x1, y1); st.forEach((c, i) => r.addColorStop(i / (st.length - 1), c)); return r; };
  const path = (g, pts, f, s, lw) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.lineWidth = lw || 1.2; g.strokeStyle = s; g.stroke(); } };
  const shine = (g, x, y, rx, ry) => ell(g, x, y, rx, ry, -0.5, 'rgba(255,255,255,.7)');
  const RB = ['#ff5f7e', '#ffb04a', '#ffe15a', '#5fe08a', '#5fb8ff', '#b07aff'];
  // ---------- hats (head frame: her head ball is centred at 0,0; the top of her head is about y = -13) ----------
  const HAT = {
    party: mk(30, 30, g => { path(g, [[0, -14], [9, 6], [-9, 6]], lg(g, -9, 0, 9, 0, ['#ff8fd0', '#ffd84a', '#5fb8ff']), '#fff', 1.4); circ(g, 0, -14, 3, '#fff', '#ff5fb4', 1); [[-3, -3], [3, 1], [-1, 3]].forEach(p => circ(g, p[0], p[1], 1.4, '#fff')); }),
    flower: mk(34, 20, g => { g.strokeStyle = '#4caf50'; g.lineWidth = 2.4; g.beginPath(); g.arc(0, 12, 15, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      [-11, -5.5, 0, 5.5, 11].forEach((x, i) => { const y = 12 - Math.sqrt(Math.max(0, 225 - x * x)); const c = ['#ff9ed6', '#ffe15a', '#ff5f7e', '#b07aff', '#5fb8ff'][i]; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; circ(g, x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.8, c); } circ(g, x, y, 1.3, '#fff6c4'); }); }),
    wizard: mk(32, 34, g => { path(g, [[2, -16], [10, 9], [-10, 9]], lg(g, 0, -16, 0, 9, ['#8a5cff', '#4a2ab0']), '#2a1670', 1.2); ell(g, 0, 9, 14, 3.2, 0, '#6a3ae0', '#2a1670', 1.1);
      star(g, 0, -1, 3.6, 1.6, '#ffe15a', '#a35f00', .7); star(g, 4, 5, 2, .9, '#fff'); star(g, -4, -7, 1.6, .7, '#fff'); }),
    bunny: mk(30, 30, g => { [-6, 6].forEach((x, i) => { ell(g, x, -4, 4.2, 11, i ? 0.18 : -0.18, '#fff', '#e3c6dc', 1.2); ell(g, x, -3, 2, 7.5, i ? 0.18 : -0.18, '#ffb6dc'); }); g.strokeStyle = '#ff8fd0'; g.lineWidth = 2.6; g.beginPath(); g.arc(0, 14, 11, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }),
    teapot: mk(32, 26, g => { ell(g, 0, 2, 9, 7, 0, '#fff', '#5fb8ff', 1.4); g.strokeStyle = '#5fb8ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(9, 0); g.quadraticCurveTo(15, -3, 14, -7); g.stroke(); g.beginPath(); g.arc(-10, 2, 3.5, Math.PI * .5, Math.PI * 1.5, true); g.stroke();
      ell(g, 0, -5, 5, 2, 0, '#bfe3ff', '#5fb8ff', 1); circ(g, 0, -8, 1.8, '#ff8fd0'); [[-4, 2], [3, 4], [1, -1]].forEach(p => circ(g, p[0], p[1], 1.2, '#ff8fd0')); })
  };
  // where each hat sits in her head frame [x, y, scale]
  const HAT_AT = { party: [1, -18, 1], flower: [1, -15, 1], wizard: [1, -20, 1.05], bunny: [1, -21, 1], teapot: [1, -18, 1] };
  // ---------- capes (drawn behind her first bead, flowing back) ----------
  const cape = (c1, c2, deco) => mk(40, 30, g => { g.beginPath(); g.moveTo(14, -10); g.quadraticCurveTo(-4, -12, -18, -2); g.quadraticCurveTo(-14, 6, -19, 13); g.quadraticCurveTo(-6, 9, 2, 13); g.quadraticCurveTo(8, 2, 14, -4); g.closePath();
    g.fillStyle = lg(g, 14, -10, -18, 12, [c1, c2]); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.3; g.stroke(); circ(g, 13, -7, 3, '#ffd84a', '#a35f00', .8); if (deco) deco(g); });
  const CAPE = {
    royal: cape('#d6339f', '#7a1a8a', g => { [[-8, 1], [-2, 6], [-12, 8]].forEach(p => star(g, p[0], p[1], 2, .9, '#fff6c4')); }),
    star: cape('#5fb8ff', '#3a3ab0', g => { [[-6, 0], [-1, 7], [-13, 7], [3, -3]].forEach(p => star(g, p[0], p[1], 2.4, 1, '#ffe15a')); })
  };
  // ---------- wings (same 44x40 frame as her own wing) ----------
  const wing = fn => mk(44, 40, fn);
  const WING = {
    butterfly: wing(g => { ell(g, -4, -6, 14, 10, -0.5, lg(g, -16, -14, 6, 4, ['#ffb04a', '#ff5f7e']), '#7a1a4a', 1.4); ell(g, -2, 7, 9, 7, 0.4, lg(g, -10, 4, 6, 12, ['#ffe15a', '#ffb04a']), '#7a1a4a', 1.4); circ(g, -8, -8, 3, '#fff'); circ(g, -3, 7, 2, '#fff'); shine(g, -6, -11, 4, 1.6); }),
    fairy: wing(g => { RB.forEach((c, i) => { ell(g, -2 - i * .6, -2, 17 - i * 2.2, 11 - i * 1.4, -0.35, c); }); ell(g, -2, -2, 17, 11, -0.35, null, '#fff', 1.6); shine(g, -8, -8, 5, 2); }),
    star: wing(g => { star(g, -4, -2, 17, 8, lg(g, -18, -18, 10, 14, ['#fff6c4', '#ffd84a', '#f5a623']), '#a35f00', 1.4); star(g, -4, -2, 8, 4, '#fff8dc'); shine(g, -9, -9, 4, 1.6); })
  };
  // ---------- shoes (replace her 8x6 feet) ----------
  const shoe = (c1, c2, extra) => mk(8, 6, g => { ell(g, 0, 0.3, 3.8, 2.6, 0, lg(g, 0, -2.6, 0, 2.6, [c1, c2]), '#fff', .5); ell(g, -1, -1, 1.4, .6, 0, 'rgba(255,255,255,.8)'); if (extra) extra(g); }, 6);
  const SHOE = { gold: shoe('#fff3a0', '#e0a400'), rainbow: shoe('#ff7ab0', '#5fb8ff', g => { g.fillStyle = '#ffe15a'; g.fillRect(-3, 0, 6, .7); }), sneak: shoe('#ffffff', '#ff5fb4', g => { g.fillStyle = '#ff5fb4'; g.fillRect(-3.5, 1.3, 7, .8); }) };
  // ---------- pets (about 26 units, float behind her) ----------
  const eyes = (g, x, y, d) => { circ(g, x - d, y, 1.7, '#3a1a6b'); circ(g, x + d, y, 1.7, '#3a1a6b'); circ(g, x - d + .6, y - .6, .6, '#fff'); circ(g, x + d + .6, y - .6, .6, '#fff'); ell(g, x - d - 2.4, y + 2.4, 1.6, 1, 0, 'rgba(255,120,170,.6)'); ell(g, x + d + 2.4, y + 2.4, 1.6, 1, 0, 'rgba(255,120,170,.6)'); };
  const smile = (g, x, y) => { g.strokeStyle = '#3a1a6b'; g.lineWidth = .9; g.beginPath(); g.arc(x, y, 1.8, .2, Math.PI - .2); g.stroke(); };
  const PET = {
    bunny: mk(30, 30, g => { [[-5, -12, -0.2], [5, -12, 0.2]].forEach(e => { ell(g, e[0], e[1], 3, 7, e[2], '#fff', '#c9d8ff', 1); ell(g, e[0], e[1] + 1, 1.4, 4.6, e[2], '#ffb6dc'); });
      [[-7, 3, 7], [7, 3, 7], [0, 6, 8], [0, -1, 9]].forEach(c => circ(g, c[0], c[1], c[2], '#fff')); ell(g, 0, 2, 12, 9, 0, null, '#c9d8ff', 1); eyes(g, 0, 0, 3.6); smile(g, 0, 2.6); shine(g, -5, -4, 3, 1.4); }),
    kitten: mk(30, 30, g => { path(g, [[-9, -4], [-8, -13], [-2, -7]], '#ffb04a', '#a35f00', 1); path(g, [[9, -4], [8, -13], [2, -7]], '#ffb04a', '#a35f00', 1); circ(g, 0, 1, 10, '#ffc46e', '#a35f00', 1.1);
      star(g, 0, -11, 3.4, 1.5, '#ffe15a', '#fff', .7); eyes(g, 0, 0, 3.8); g.strokeStyle = '#a35f00'; g.lineWidth = .7; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * 5, 3); g.lineTo(s * 11, 2); g.moveTo(s * 5, 4.5); g.lineTo(s * 11, 5); g.stroke(); }); smile(g, 0, 3); shine(g, -5, -4, 3, 1.4); }),
    puppy: mk(30, 30, g => { ell(g, -9, -1, 3.6, 7, 0.3, '#b48aff', '#6a3ae0', 1); ell(g, 9, -1, 3.6, 7, -0.3, '#b48aff', '#6a3ae0', 1); circ(g, 0, 1, 9.5, '#efe6ff', '#8a5cff', 1.1);
      ell(g, 0, 4, 2.2, 1.6, 0, '#3a1a6b'); eyes(g, 0, -1, 3.6); path(g, [[-3, 9], [3, 9], [0, 13]], '#5fd8ff', '#fff', .7); shine(g, -5, -5, 3, 1.4); }),
    bird: mk(30, 30, g => { ell(g, -9, 2, 6, 3.4, -0.5, '#5fb8ff', '#fff', .8); RB.forEach((c, i) => ell(g, -12 - i * .4, 6 + i * .9, 5, 1.2, 0.5, c)); circ(g, 0, 0, 8.5, '#ffe6f4', '#ff5fb4', 1.1);
      path(g, [[7, -1], [12, 1], [7, 3]], '#ffb04a', '#a35f00', .7); eyes(g, 1, -1.5, 3); [-2, 0, 2].forEach(x => ell(g, x, -9.5, .9, 2.6, x * .2, '#ff5fb4')); shine(g, -4, -4, 2.6, 1.2); })
  };
  const ICON = (spr, k) => { const c = document.createElement('canvas'); c.width = c.height = 120; const g = c.getContext('2d'); const s = Math.min(100 / spr.width, 100 / spr.height) * (k || 1); const w = spr.width * s, h = spr.height * s; g.drawImage(spr, 60 - w / 2, 60 - h / 2, w, h); return c.toDataURL(); };
  const icons = {};
  function icon(slot, id) { const k = slot + ':' + id; if (icons[k]) return icons[k]; const spr = (slot === 'hat' ? HAT : slot === 'cape' ? CAPE : slot === 'wings' ? WING : slot === 'shoes' ? SHOE : PET)[id]; return spr ? (icons[k] = ICON(spr, slot === 'shoes' ? 0.8 : 1)) : ''; }
  // blush for happy moments (graphics pass 1), and a pooled-confetti friendly "firework" ring pattern
  const blush = mk(10, 6, g => { ell(g, 0, 0, 4, 2.4, 0, 'rgba(255,110,170,.55)'); });
  window.SKWardrobe = { HAT, HAT_AT, CAPE, WING, SHOE, PET, icon, blush };
})();
