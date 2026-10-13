// Sparkle Kingdom art (v3): everything is drawn in code ONCE into offscreen canvases (sprites, parallax strips) and then
// stamped with drawImage, so nothing is built or measured during play. Sprites are centred on (0,0) and measured in game units.
// One style: glossy pink / gold / silver candy kingdom, soft outlines, round shapes, gems with facets and a shine sweep.
(function () {
  const TAU = Math.PI * 2;
  const mk = (wu, hu, fn, ss) => {
    ss = ss || 3; const c = document.createElement('canvas'); c.width = Math.ceil(wu * ss); c.height = Math.ceil(hu * ss);
    const g = c.getContext('2d'); g.scale(ss, ss); g.translate(wu / 2, hu / 2); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g); c.w = wu; c.h = hu; return c;
  };
  const circ = (g, x, y, r, fill, stroke, lw) => { g.beginPath(); g.arc(x, y, r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw || 1.5; g.strokeStyle = stroke; g.stroke(); } };
  const ell = (g, x, y, rx, ry, rot, fill, stroke, lw) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw || 1.5; g.strokeStyle = stroke; g.stroke(); } };
  const star = (g, x, y, r, ri, n, fill, stroke, lw) => {
    g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? ri : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw || 1.5; g.strokeStyle = stroke; g.stroke(); }
  };
  const heartPath = (g, x, y, s) => { g.beginPath(); g.moveTo(x, y + s * .9); g.bezierCurveTo(x - s * 1.5, y - s * .1, x - s * .9, y - s * 1.1, x, y - s * .35); g.bezierCurveTo(x + s * .9, y - s * 1.1, x + s * 1.5, y - s * .1, x, y + s * .9); g.closePath(); };
  const heart = (g, x, y, s, fill, stroke, lw) => { heartPath(g, x, y, s); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw || 1.5; g.strokeStyle = stroke; g.stroke(); } };
  const rgrad = (g, x, y, r, stops, fx, fy) => { const gr = g.createRadialGradient(x + (fx || 0), y + (fy || 0), r * .08, x, y, r); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };
  const lgrad = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };
  const gloss = (g, x, y, rx, ry, a) => ell(g, x, y, rx, ry, -.5, 'rgba(255,255,255,' + (a || .75) + ')');
  const rrect = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
  const RBOW = ['#ff5f7e', '#ffb04a', '#ffe15a', '#5fe08a', '#5fb8ff', '#b07aff'];

  // ---------- soft glow (used behind crowns, power-ups, big gems) ----------
  const glow = mk(40, 40, g => { circ(g, 0, 0, 20, rgrad(g, 0, 0, 20, ['rgba(255,255,255,.95)', 'rgba(255,214,240,.55)', 'rgba(255,180,230,0)'])); }, 2);
  const glowGold = mk(40, 40, g => { circ(g, 0, 0, 20, rgrad(g, 0, 0, 20, ['rgba(255,250,210,.95)', 'rgba(255,214,90,.45)', 'rgba(255,200,60,0)'])); }, 2);

  // ---------- Glimmer: the green glitter caterpillar from Crystal Cave, now glossy, with heart antennae and rainbow wings ----------
  function glimmer(look) {
    const w = look.wear, lv = look.lv, SS = 4;
    const HL = '#2a8a4c';
    const eyes = (g, kind) => {
      if (kind === 'blink' || kind === 'joy') {
        g.strokeStyle = '#3a1a6b'; g.lineWidth = 1.8;
        g.beginPath(); g.arc(-4.6, -1, 3.8, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(10.4, -1); g.arc(6.6, -1, 3.8, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        return;
      }
      const big = kind === 'oops' ? 1.1 : 1;
      [[-4.6, -1.5], [6.6, -1.5]].forEach(p => {
        ell(g, p[0], p[1], 4.6 * big, 5.6 * big, 0, '#fff', '#3a1a6b', 1.1);
        ell(g, p[0] + 1, p[1] + .6, 3.1, 3.9, 0, rgrad(g, p[0] + 1, p[1] + .6, 4, ['#7a4ae0', '#3a1a6b', '#1e0a3c'], 0, -1.5));
        circ(g, p[0] + 2.1, p[1] - 1.1, 1.5, '#fff'); circ(g, p[0] - .2, p[1] + 2.2, .8, '#fff'); circ(g, p[0] + 1.8, p[1] + 2.4, .5, '#ffb6e6');
        // lashes
        g.strokeStyle = '#3a1a6b'; g.lineWidth = .9; g.beginPath(); g.moveTo(p[0] + 3.8, p[1] - 3.6); g.lineTo(p[0] + 5.6, p[1] - 5.2); g.moveTo(p[0] + 2.4, p[1] - 5); g.lineTo(p[0] + 3.4, p[1] - 7); g.stroke();
      });
      if (kind === 'oops') { g.fillStyle = 'rgba(140,220,255,.9)'; g.beginPath(); g.moveTo(-12, -8); g.quadraticCurveTo(-14, -3, -12, -2); g.quadraticCurveTo(-10, -3, -12, -8); g.fill(); }
    };
    const mouth = (g, kind) => {
      g.strokeStyle = '#3a1a6b'; g.lineWidth = 1.6;
      if (kind === 'joy') { g.beginPath(); g.moveTo(-2.5, 6); g.quadraticCurveTo(1.5, 13, 5.5, 6); g.closePath(); g.fillStyle = '#7a1a4a'; g.fill(); g.stroke(); ell(g, 1.5, 9.4, 2, 1.3, 0, '#ff8fb8'); }
      else if (kind === 'oops') { ell(g, 1.5, 8, 2, 2.4, 0, '#7a1a4a', '#3a1a6b', 1.2); }
      else { g.beginPath(); g.moveTo(-2, 6.5); g.quadraticCurveTo(1.5, 10.5, 5, 6.5); g.stroke(); }
    };
    const headSpr = kind => mk(64, 64, g => {
      if (lv >= 6 && w.glow) circ(g, 0, 0, 30, rgrad(g, 0, 0, 30, ['rgba(255,246,196,.75)', 'rgba(255,158,230,.35)', 'rgba(154,216,255,0)']));
      // antennae with little pink hearts
      g.strokeStyle = HL; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(-5, -12); g.quadraticCurveTo(-9, -22, -14, -24); g.moveTo(6, -12); g.quadraticCurveTo(11, -22, 16, -23); g.stroke();
      heart(g, -14, -24.5, 3.4, '#ff5fb4', '#fff', .9); heart(g, 16, -23.5, 3.4, '#ff5fb4', '#fff', .9);
      // head: glossy mint ball with a rim light
      circ(g, 0, 0, 15.5, rgrad(g, 0, 0, 17, ['#e4ffd8', '#a8f59a', '#5cc96e'], -6, -7), HL, 1.8);
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, 13, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
      gloss(g, -6.5, -8.5, 4.2, 2.4, .8);
      eyes(g, kind); mouth(g, kind);
      ell(g, -10, 5, 3.4, 2.1, 0, 'rgba(255,120,180,.6)'); ell(g, 12, 5, 3.4, 2.1, 0, 'rgba(255,120,180,.6)');
      if (lv >= 3 && w.cheeks) { star(g, -11, 9, 2.6, 1, 4, '#fff'); star(g, 13, 9, 2.6, 1, 4, '#fff'); }
      if (lv >= 2 && w.neck) { g.strokeStyle = '#f5c542'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-9, 12); g.quadraticCurveTo(0, 18, 9, 12); g.stroke(); heart(g, 0, 16, 2.6, '#ff2d8a', '#fff', .8); }
      const crown = lv >= 5 && w.crown, tiara = lv >= 4 && w.tiara && !crown;
      if (crown) { g.beginPath(); g.moveTo(-9, -12); g.lineTo(-10.5, -22); g.lineTo(-5, -16); g.lineTo(0, -25); g.lineTo(5, -16); g.lineTo(10.5, -22); g.lineTo(9, -12); g.closePath(); g.fillStyle = lgrad(g, 0, -25, 0, -12, ['#fff6c4', '#ffd84a', '#e0a020']); g.fill(); g.strokeStyle = '#a35f00'; g.lineWidth = 1.3; g.stroke(); circ(g, 0, -17, 2, '#ff2d55', '#fff', .6); circ(g, -6, -15, 1.2, '#2fd8e8'); circ(g, 6, -15, 1.2, '#8be43c'); }
      else if (tiara) { g.beginPath(); g.moveTo(-9, -12); g.lineTo(-7, -20); g.lineTo(-3, -15); g.lineTo(0, -22); g.lineTo(3, -15); g.lineTo(7, -20); g.lineTo(9, -12); g.closePath(); g.fillStyle = lgrad(g, 0, -22, 0, -12, ['#fff', '#e8e8f5', '#b8b8d0']); g.fill(); g.strokeStyle = '#9a9ab0'; g.lineWidth = 1.1; g.stroke(); circ(g, 0, -15, 1.7, '#7ad8ff', '#fff', .5); }
      else { g.beginPath(); g.moveTo(-6, -13); g.lineTo(-3.5, -19); g.lineTo(0, -14); g.lineTo(3.5, -19); g.lineTo(6, -13); g.closePath(); g.fillStyle = '#ff6fcf'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); }
      if (lv >= 1 && w.bow) { g.save(); g.translate(-12, -10); g.rotate(-.5); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-4, -7, -9, -5, -8, 0); g.bezierCurveTo(-9, 5, -4, 7, 0, 0); g.moveTo(0, 0); g.bezierCurveTo(4, -7, 9, -5, 8, 0); g.bezierCurveTo(9, 5, 4, 7, 0, 0); g.fillStyle = '#ff5fb4'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = .9; g.stroke(); circ(g, 0, 0, 2.1, '#ffd1ec', '#fff', .6); g.restore(); }
    }, SS);
    const seg = (c1, c2, spot) => mk(28, 28, g => {
      circ(g, 0, 0, 10.5, rgrad(g, 0, 0, 12, [c1, c2, '#4fb863'], -4, -5), HL, 1.7);
      if (spot) heart(g, 1, 1.5, 2.6, 'rgba(255,111,207,.85)'); else circ(g, 1, 1.5, 2.2, 'rgba(255,240,140,.9)');
      gloss(g, -3.6, -4.6, 3, 1.7, .75);
    }, SS);
    const foot = mk(8, 6, g => { ell(g, 0, 0, 3.2, 2.2, 0, '#3fa65a', HL, .9); ell(g, .5, .8, 1.8, .9, 0, '#ffb6e6'); }, SS);
    const wing = mk(44, 40, g => {
      const gr = lgrad(g, -20, -18, 16, 14, ['#ffb6e6', '#fff3a8', '#b6f0ff', '#d9b8ff']);
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-4, -24, -28, -24, -24, -6); g.bezierCurveTo(-24, 4, -8, 6, 0, 0); g.closePath();
      g.globalAlpha = .88; g.fillStyle = gr; g.fill(); g.globalAlpha = 1; g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.stroke();
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-12, 4, -16, 14, -9, 15); g.bezierCurveTo(-4, 15, -1, 8, 0, 0); g.closePath(); g.fillStyle = 'rgba(255,182,230,.8)'; g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = .8; g.beginPath(); g.moveTo(-2, -2); g.quadraticCurveTo(-12, -12, -20, -10); g.stroke();
      star(g, -14, -12, 2, .8, 4, '#fff'); circ(g, -9, -6, 1.1, '#fff'); circ(g, -19, -4, 1, '#fff'); circ(g, -8, 10, .9, '#fff');
    }, SS);
    return { head: headSpr('n'), blink: headSpr('blink'), joy: headSpr('joy'), oops: headSpr('oops'), segA: seg('#c9ffbf', '#86ec88', true), segB: seg('#dcffd2', '#98faa2', false), foot, wing };
  }
  const bubble = mk(64, 64, g => {
    circ(g, 0, 0, 29, rgrad(g, 0, 0, 30, ['rgba(255,255,255,0)', 'rgba(200,240,255,.12)', 'rgba(255,182,230,.45)']), 'rgba(255,255,255,.85)', 1.6);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 23, Math.PI * 1.1, Math.PI * 1.4); g.stroke();
    circ(g, 14, -16, 2.2, 'rgba(255,255,255,.9)'); star(g, -16, 14, 3, 1.2, 4, 'rgba(255,255,255,.8)');
  }, 3);
  const shadow = mk(40, 12, g => { ell(g, 0, 0, 17, 4.5, 0, rgrad(g, 0, 0, 17, ['rgba(110,30,100,.35)', 'rgba(110,30,100,0)'])); }, 2);

  // ---------- friends who go "poof": each has 4 faces (grump, eek, dizzy, giggle) ----------
  const face = (g, x, y, k, ink, s) => {
    s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = ink; g.lineWidth = 1.5;
    if (k === 'dizzy') {
      [-6, 6].forEach(ex => { g.beginPath(); for (let t = 0; t < 12; t++) { const a = t * .95, r = .5 + t * .33; g.lineTo(ex + Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); });
      g.beginPath(); g.moveTo(-4, 8); g.quadraticCurveTo(-2, 6, 0, 8); g.quadraticCurveTo(2, 10, 4, 8); g.stroke();
    } else if (k === 'giggle') {
      g.beginPath(); g.arc(-6, 1, 3, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(9, 1); g.arc(6, 1, 3, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.beginPath(); g.moveTo(-4, 6); g.quadraticCurveTo(0, 12, 4, 6); g.closePath(); g.fillStyle = '#7a1a4a'; g.fill(); g.stroke();
      heart(g, 12, -6, 2.4, '#ff5fb4');
    } else if (k === 'eek') {
      [-6, 6].forEach(ex => { circ(g, ex, 0, 4.4, '#fff', ink, 1.1); circ(g, ex - 1, 0, 1.4, '#14143a'); circ(g, ex - .5, -1.4, .6, '#fff'); });
      g.beginPath(); g.moveTo(-9, -7); g.lineTo(-4, -9); g.moveTo(9, -7); g.lineTo(4, -9); g.stroke();
      ell(g, 0, 8, 2.4, 3, 0, '#7a1a4a', ink, 1.1);
      g.fillStyle = 'rgba(140,220,255,.9)'; g.beginPath(); g.moveTo(12, -9); g.quadraticCurveTo(10, -4, 12, -3); g.quadraticCurveTo(14, -4, 12, -9); g.fill();
    } else {
      [-6, 6].forEach(ex => { circ(g, ex, 0, 3.6, '#fff', ink, 1.1); circ(g, ex - 1.2, .6, 1.9, '#14143a'); circ(g, ex - .6, -.4, .7, '#fff'); });
      g.lineWidth = 1.7; g.beginPath(); g.moveTo(-10, -5); g.lineTo(-3, -2.5); g.moveTo(10, -5); g.lineTo(3, -2.5); g.stroke();
      g.beginPath(); g.moveTo(-3, 8); g.quadraticCurveTo(0, 5.5, 3, 8); g.stroke();
    }
    g.restore();
  };
  const FACES = ['grump', 'eek', 'dizzy', 'giggle'];
  const critter = (wu, hu, body, fx, fy, ink, fs) => { const o = {}; FACES.forEach(k => { o[k] = mk(wu, hu, g => { body(g); face(g, fx, fy, k, ink, fs); }); }); return o; };
  const bunny = critter(48, 54, g => {
    [[-8, -17, -.18], [8, -17, .18]].forEach(e => { g.save(); g.translate(e[0], e[1]); g.rotate(e[2]); ell(g, 0, 0, 4.8, 10.5, 0, '#e2d6f8', '#8b78b8', 1.5); ell(g, 0, 1, 2.2, 6.5, 0, '#ffc3e3'); g.restore(); });
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; circ(g, Math.cos(a) * 14.5, 6 + Math.sin(a) * 13.5, 5.6, '#d8cdf0'); }
    circ(g, 0, 6, 16, rgrad(g, 0, 6, 17, ['#fbf8ff', '#e6defa', '#c2b4e6'], -5, -6), '#8b78b8', 1.5);
    gloss(g, -7, -2, 4, 2.2, .7); ell(g, -11, 11, 3, 2, 0, 'rgba(255,150,200,.7)'); ell(g, 11, 11, 3, 2, 0, 'rgba(255,150,200,.7)');
  }, 0, 5, '#5b4b8a');
  const jelly = critter(48, 40, g => {
    g.beginPath(); g.moveTo(-19, 4); g.bezierCurveTo(-19, -17, 19, -17, 19, 4); g.bezierCurveTo(19, 16, -19, 16, -19, 4); g.closePath();
    g.fillStyle = lgrad(g, 0, -14, 0, 15, ['#ffe0a8', '#ffa86a', '#ff7a6a']); g.fill(); g.strokeStyle = '#c4572f'; g.lineWidth = 1.5; g.stroke();
    gloss(g, -8, -7, 6.5, 2.6, .7); circ(g, 9, -9, 1.6, 'rgba(255,255,255,.8)');
    ell(g, -12, 8, 2.8, 1.8, 0, 'rgba(255,90,120,.5)'); ell(g, 12, 8, 2.8, 1.8, 0, 'rgba(255,90,120,.5)');
  }, 0, 1, '#8a3b1f');
  const snow = critter(42, 42, g => {
    circ(g, 0, 0, 16.5, rgrad(g, 0, 0, 18, ['#ffffff', '#e6f3ff', '#a9cdf2'], -6, -7), '#7fb0e8', 1.5);
    gloss(g, -6, -8, 4.5, 2.4, .9); [[9, -9], [-12, 4], [6, 11]].forEach(p => star(g, p[0], p[1], 2, .7, 4, 'rgba(255,255,255,.9)'));
    ell(g, -11, 6, 3, 2, 0, 'rgba(255,150,200,.6)'); ell(g, 11, 6, 3, 2, 0, 'rgba(255,150,200,.6)');
  }, 0, -1, '#3d5f99');
  const flyer = critter(50, 40, g => {
    [[-14, -6, -.6], [14, -6, .6]].forEach(e => { g.save(); g.translate(e[0], e[1]); g.rotate(e[2]); ell(g, 0, 0, 5, 8, 0, 'rgba(255,255,255,.85)', '#c9a4ff', 1.1); g.restore(); });
    [[-8, 4, 8], [8, 4, 8], [0, -2, 11], [0, 6, 9]].forEach(p => circ(g, p[0], p[1], p[2], '#ffd1ec'));
    circ(g, 0, 2, 11.5, rgrad(g, 0, 2, 13, ['#fff', '#ffd1ec', '#ff9ed6'], -4, -5), '#e05aa8', 1.4);
    gloss(g, -5, -4, 3.5, 2, .8);
  }, 0, 2, '#8a1270', .85);

  // ---------- blocks, platforms, flowers ----------
  const block = (top, bot, edge, inner) => mk(32, 32, g => {
    rrect(g, -13, -13, 26, 26, 6); g.fillStyle = lgrad(g, -13, -13, 13, 13, [top, bot]); g.fill(); g.lineWidth = 2.2; g.strokeStyle = edge; g.stroke();
    rrect(g, -10, -10, 20, 20, 4); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.65)'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(-11, -11); g.lineTo(6, -11); g.lineTo(-11, 6); g.closePath(); g.fill();
    inner(g);
  });
  const blockHeart = block('#ffe0f1', '#ff5fb4', '#f5c542', g => { heart(g, 0, 0.5, 6.2, '#fff', '#d6339f', 1.3); star(g, -8, -8, 2.3, .8, 4, '#fff'); });
  const blockGift = block('#fff3c4', '#ffb83a', '#d6339f', g => {
    g.fillStyle = '#ff5fb4'; g.fillRect(-2.5, -13, 5, 26); g.fillRect(-13, -2.5, 26, 5);
    g.fillStyle = '#ff5fb4'; g.strokeStyle = '#fff'; g.lineWidth = .9; g.beginPath(); g.ellipse(-4, -6, 4, 2.6, -.5, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(4, -6, 4, 2.6, .5, 0, TAU); g.fill(); g.stroke();
    circ(g, 0, -5, 1.8, '#ffd1ec'); star(g, 8, 8, 2.2, .8, 4, '#fff');
  });
  const blockUsed = block('#f2f2fa', '#c8c8dc', '#9a9ab0', g => { heart(g, 0, .5, 5, 'rgba(255,255,255,.75)', '#b0b0c8', 1); });
  const platform = (k) => mk(30, 20, g => {
    const cols = k === 1 ? [[-12, 2, 8], [-4, -1, 9], [5, 0, 9], [13, 3, 7]] : k === 0 ? [[-8, 3, 7], [-1, -1, 9], [8, 0, 9], [15, 2, 8]] : [[-15, 2, 8], [-7, -1, 9], [1, 0, 9], [8, 3, 7]];
    cols.forEach(p => circ(g, p[0], p[1] + 1.5, p[2], 'rgba(170,140,220,.35)'));
    cols.forEach(p => circ(g, p[0], p[1], p[2], '#fff'));
    g.fillStyle = 'rgba(255,214,240,.9)'; g.fillRect(-15, 5, 30, 3);
    cols.forEach(p => circ(g, p[0] - 2, p[1] - 3, p[2] * .35, 'rgba(255,255,255,.95)'));
    if (k !== 2) star(g, 0, -2, 1.6, .6, 4, '#ffe15a');
  });
  const platL = platform(0), platM = platform(1), platR = platform(2);
  const flower = sq => mk(34, 40, g => {
    g.translate(0, 8);
    g.strokeStyle = '#4fb863'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 12); g.lineTo(0, sq ? 4 : -2); g.stroke();
    ell(g, -6, 8, 5, 2.2, -.5, '#7ed68a', '#4fb863', .8); ell(g, 6, 8, 5, 2.2, .5, '#7ed68a', '#4fb863', .8);
    const cy = sq ? 0 : -8, k = sq ? .7 : 1;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ell(g, Math.cos(a) * 7.5, cy + Math.sin(a) * 7.5 * k, 5.5, 4 * k, a, '#ff9ed6', '#e0359b', 1); }
    ell(g, 0, cy, 6, 6 * k, 0, rgrad(g, 0, cy, 7, ['#fff6c4', '#ffd84a', '#f5a623'], -2, -2), '#a35f00', 1);
    star(g, -2, cy - 2, 1.6, .6, 4, '#fff');
  });
  const flowerUp = flower(false), flowerDn = flower(true);

  // ---------- gems: faceted, with a 6-frame shine sweep (frames 6.. = no sweep) ----------
  const gemPath = (g, r) => { g.beginPath(); g.moveTo(-r * .55, -r * .7); g.lineTo(r * .55, -r * .7); g.lineTo(r, -r * .15); g.lineTo(0, r); g.lineTo(-r, -r * .15); g.closePath(); };
  const gemFrames = (r, light, mid, dark, edge) => {
    const fr = [];
    for (let f = 0; f < 7; f++) fr.push(mk(r * 2.6, r * 2.6, g => {
      gemPath(g, r); g.fillStyle = mid; g.fill();
      // facets
      g.fillStyle = light; g.beginPath(); g.moveTo(-r * .55, -r * .7); g.lineTo(r * .55, -r * .7); g.lineTo(r * .3, -r * .15); g.lineTo(-r * .3, -r * .15); g.closePath(); g.fill();
      g.fillStyle = dark; g.beginPath(); g.moveTo(r * .3, -r * .15); g.lineTo(r, -r * .15); g.lineTo(0, r); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(-r, -r * .15); g.lineTo(-r * .3, -r * .15); g.lineTo(0, r); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = .7; g.beginPath(); g.moveTo(-r, -r * .15); g.lineTo(r, -r * .15); g.moveTo(-r * .3, -r * .15); g.lineTo(0, r); g.lineTo(r * .3, -r * .15); g.stroke();
      if (f < 6) { g.save(); gemPath(g, r); g.clip(); const x = -r * 1.6 + f * r * .65; g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.moveTo(x, -r); g.lineTo(x + r * .45, -r); g.lineTo(x - r * .25, r); g.lineTo(x - r * .7, r); g.closePath(); g.fill(); g.restore(); }
      gemPath(g, r); g.lineWidth = 1.2; g.strokeStyle = edge; g.stroke();
      star(g, -r * .45, -r * .45, r * .28, r * .1, 4, '#fff');
    }));
    return fr;
  };
  const gems = [gemFrames(6.5, '#ffd6ee', '#ff6fc4', '#c02486', '#8a1270'), gemFrames(6.5, '#d8f6ff', '#5fb8ff', '#2a6ad8', '#1f4fa8'),
    gemFrames(6.5, '#fff8cc', '#ffcf3a', '#e08a10', '#a35f00'), gemFrames(6.5, '#eedcff', '#a87aff', '#6a32c8', '#4a1fa8')];
  const gemBig = gemFrames(12, '#fffbe0', '#ffa8e8', '#d64fb0', '#a35f00');
  // star ring (+5) and the sparkle crown
  const ring = mk(30, 52, g => {
    ell(g, 0, 0, 11, 22, 0, null, 'rgba(160,90,0,.5)', 6); ell(g, 0, 0, 11, 22, 0, null, lgrad(g, 0, -22, 0, 22, ['#fff6c4', '#ffd84a', '#f5a623', '#ffd84a']), 4.2);
    ell(g, -2, 0, 9, 19, 0, null, 'rgba(255,255,255,.7)', 1.2); [[0, -22], [0, 22], [-11, 0], [11, 0]].forEach(p => star(g, p[0], p[1], 3, 1.1, 4, '#fff'));
  });
  const ringDone = mk(30, 52, g => { ell(g, 0, 0, 11, 22, 0, null, 'rgba(255,255,255,.4)', 3); });
  const crown = mk(40, 36, g => {
    g.beginPath(); g.moveTo(-14, 10); g.lineTo(-16, -8); g.lineTo(-7, 0); g.lineTo(0, -13); g.lineTo(7, 0); g.lineTo(16, -8); g.lineTo(14, 10); g.closePath();
    g.fillStyle = lgrad(g, 0, -13, 0, 10, ['#fffbe0', '#ffd84a', '#e8a01a']); g.fill(); g.strokeStyle = '#a35f00'; g.lineWidth = 1.6; g.stroke();
    rrect(g, -14, 6, 28, 5, 2); g.fillStyle = '#f5b82a'; g.fill(); g.stroke();
    circ(g, 0, 2, 3, '#ff2d8a', '#fff', .8); circ(g, -8, 4, 2, '#5fd0ff', '#fff', .6); circ(g, 8, 4, 2, '#a8ff6a', '#fff', .6);
    [[-16, -8], [0, -13], [16, -8]].forEach(p => circ(g, p[0], p[1], 2.2, '#fff6c4', '#a35f00', .8));
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(-12, 7); g.lineTo(-13, -3); g.lineTo(-9, 1); g.closePath(); g.fill();
  });

  // ---------- power-ups ----------
  const orb = (inner) => mk(36, 36, g => { circ(g, 0, 0, 14.5, rgrad(g, 0, 0, 15, ['#ffffff', '#ffe6f6', '#ffb6e0'], -5, -5), '#fff', 2); inner(g); gloss(g, -6, -7, 4, 2, .8); });
  const heartStar = mk(38, 38, g => { star(g, 0, 0, 17, 8.5, 5, lgrad(g, 0, -17, 0, 15, ['#fff6c4', '#ffd84a', '#f5a623']), '#a35f00', 1.8); heart(g, 0, 1.5, 5, '#ff3d9a', '#fff', 1.1); gloss(g, -5, -6, 2.6, 1.4, .8); });
  const rainbowPick = orb(g => { RBOW.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 2.1; g.beginPath(); g.arc(0, 6, 11 - i * 1.8, Math.PI, 0); g.stroke(); }); star(g, 8, -8, 3, 1.2, 4, '#fff'); });
  const magnet = orb(g => { g.lineWidth = 5; g.strokeStyle = '#ff4f8a'; g.beginPath(); g.arc(0, -1, 7, Math.PI, 0, true); g.stroke(); g.fillStyle = '#e8e8f5'; g.fillRect(-9.5, -3, 5, 5); g.fillRect(4.5, -3, 5, 5); [[-12, -9], [12, -9]].forEach(p => star(g, p[0], p[1], 2.4, .9, 4, '#ffd84a')); });
  const shieldPick = orb(g => { circ(g, 0, 0, 8.5, 'rgba(160,220,255,.5)', '#5fb8ff', 1.6); heart(g, 0, .5, 3.5, '#ff5fb4'); circ(g, 3, -4, 1.6, '#fff'); });
  const giantPick = orb(g => { g.fillStyle = '#5fd67a'; g.strokeStyle = '#2a8a4c'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, -10); g.lineTo(8, 0); g.lineTo(3, 0); g.lineTo(3, 9); g.lineTo(-3, 9); g.lineTo(-3, 0); g.lineTo(-8, 0); g.closePath(); g.fill(); g.stroke(); });
  // the secret swirl and the way out
  const swirl = (cols, ring2) => mk(56, 56, g => {
    circ(g, 0, 0, 25, rgrad(g, 0, 0, 26, ['rgba(255,255,255,.95)', 'rgba(255,214,240,.6)', 'rgba(200,160,255,0)']));
    for (let k = 0; k < cols.length; k++) { g.strokeStyle = cols[k]; g.lineWidth = 3; g.beginPath(); for (let t = 0; t < 40; t++) { const a = t * .32 + k * TAU / cols.length, r = 2 + t * .52; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); }
    circ(g, 0, 0, 22, null, ring2, 2.4); star(g, 0, 0, 5, 2, 4, '#fff');
  });
  const portal = swirl(RBOW, '#fff'), portalOut = swirl(['#ffd84a', '#ff9ed6', '#fff6c4'], '#ffd84a');
  const wind = mk(36, 300, g => {
    const gr = g.createLinearGradient(-18, 0, 18, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(-18, -150, 36, 300);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.6; for (let i = 0; i < 9; i++) { const y = 140 - i * 34; g.beginPath(); g.moveTo(-9, y); g.quadraticCurveTo(0, y - 10, 9, y); g.stroke(); }
  }, 2);

  // ---------- checkpoint arch, the rainbow gate and its big star ----------
  const checkpoint = on => mk(56, 74, g => {
    g.translate(0, 6);
    g.strokeStyle = on ? '#f5c542' : '#c9c9dc'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(-19, 31); g.lineTo(-19, -10); g.quadraticCurveTo(0, -36, 19, -10); g.lineTo(19, 31); g.stroke();
    g.strokeStyle = on ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.4)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-20, 30); g.lineTo(-20, -10); g.quadraticCurveTo(0, -37, 18, -11); g.stroke();
    [[-19, -4], [19, -4], [0, -25], [-19, 16], [19, 16]].forEach((p, i) => { const col = on ? ['#ff5fb4', '#ff9ed6', '#fff3a8', '#b48aff', '#7ad8ff'][i] : '#e4e4ee'; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; circ(g, p[0] + Math.cos(a) * 4.6, p[1] + Math.sin(a) * 4.6, 3.4, col); } circ(g, p[0], p[1], 2.8, on ? '#ffe15a' : '#f0f0f6'); });
    if (on) { heart(g, 0, 6, 7, '#ff5fb4', '#fff', 1.2); star(g, -6, 2, 1.6, .6, 4, '#fff'); }
  });
  const gate = mk(70, 300, g => {
    // two candy pillars + rainbow bands between them (crossing anywhere finishes)
    for (let i = 0; i < 6; i++) { g.fillStyle = RBOW[i]; g.globalAlpha = .55; g.fillRect(-18 + i * 6, -150, 6, 300); }
    g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-18, -150, 3, 300);
    [-26, 26].forEach(x => { rrect(g, x - 5, -150, 10, 300, 5); g.fillStyle = lgrad(g, x - 5, 0, x + 5, 0, ['#fff', '#ffd1ec', '#ff9ed6']); g.fill(); g.strokeStyle = '#f5c542'; g.lineWidth = 1.6; g.stroke();
      for (let y = -140; y < 150; y += 16) { g.strokeStyle = 'rgba(255,95,180,.6)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y + 7); g.stroke(); } });
    for (let i = 0; i < 16; i++) star(g, -14 + (i * 37) % 28, -140 + i * 18, 2.6, 1, 4, '#fff');
  }, 2);
  const bigStar = mk(64, 64, g => {
    circ(g, 0, 0, 30, rgrad(g, 0, 0, 30, ['rgba(255,250,210,.9)', 'rgba(255,214,90,.35)', 'rgba(255,200,60,0)']));
    star(g, 0, 0, 22, 10, 5, lgrad(g, 0, -22, 0, 20, ['#fffbe0', '#ffd84a', '#f5a623']), '#a35f00', 2); gloss(g, -6, -8, 4, 2, .85);
    circ(g, -4, 1, 1.8, '#3a1a6b'); circ(g, 4, 1, 1.8, '#3a1a6b'); g.strokeStyle = '#3a1a6b'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-2.5, 5); g.quadraticCurveTo(0, 7.5, 2.5, 5); g.stroke();
    ell(g, -8, 4, 2, 1.3, 0, 'rgba(255,120,180,.7)'); ell(g, 8, 4, 2, 1.3, 0, 'rgba(255,120,180,.7)');
  });

  // ---------- Silver Puffball (silver-white cloud king; its own face) ----------
  const bossFace = kind => mk(124, 124, g => {
    g.translate(0, 4);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; circ(g, Math.cos(a) * 40, Math.sin(a) * 34, 17, rgrad(g, Math.cos(a) * 40, Math.sin(a) * 34, 18, ['#ffffff', '#e4e8f4', '#bcc3da'], -5, -6), '#a9afc8', 1.8); }
    circ(g, 0, 0, 42, rgrad(g, 0, 0, 46, ['#ffffff', '#eef0f8', '#cfd4e6'], -14, -16), '#a9afc8', 2.2);
    gloss(g, -18, -20, 9, 4.5, .8);
    g.beginPath(); g.moveTo(-15, -38); g.lineTo(-11, -53); g.lineTo(-4, -43); g.lineTo(0, -57); g.lineTo(4, -43); g.lineTo(11, -53); g.lineTo(15, -38); g.closePath();
    g.fillStyle = lgrad(g, 0, -57, 0, -38, ['#fffbe0', '#ffd84a', '#e0a020']); g.fill(); g.strokeStyle = '#a35f00'; g.lineWidth = 2; g.stroke(); circ(g, 0, -45, 2.6, '#ff2d8a', '#fff', .8);
    const ink = '#5b4b8a'; g.strokeStyle = ink;
    if (kind === 'dizzy') {
      [-14, 14].forEach(x => { g.lineWidth = 2.4; g.beginPath(); for (let t = 0; t < 14; t++) { const a = t * .9, r = 1 + t * .58; g.lineTo(x + Math.cos(a) * r, -4 + Math.sin(a) * r); } g.stroke(); });
      g.lineWidth = 2.6; g.beginPath(); g.moveTo(-10, 20); g.quadraticCurveTo(-5, 15, 0, 20); g.quadraticCurveTo(5, 25, 10, 20); g.stroke();
    } else if (kind === 'tired') {
      g.lineWidth = 2.6; [-14, 14].forEach(x => { g.beginPath(); g.arc(x, -4, 6, Math.PI * .1, Math.PI * .9); g.stroke(); });
      ell(g, 0, 20, 4, 3, 0, '#7a6ab0'); ell(g, 9, 17, 4.5, 4.5, 0, 'rgba(200,230,255,.8)', '#fff', 1);
    } else if (kind === 'hmph') {
      [-14, 14].forEach(x => { circ(g, x, -4, 6.5, '#fff', ink, 2); circ(g, x + (x > 0 ? -1.5 : 1.5), -2.5, 3, '#2b1257'); });
      g.lineWidth = 3.2; g.beginPath(); g.moveTo(-24, -17); g.lineTo(-7, -9); g.moveTo(24, -17); g.lineTo(7, -9); g.stroke();
      ell(g, -27, 12, 9, 6.5, 0, 'rgba(255,140,190,.75)'); ell(g, 27, 12, 9, 6.5, 0, 'rgba(255,140,190,.75)');
      g.lineWidth = 2.6; g.beginPath(); g.moveTo(-6, 20); g.lineTo(6, 20); g.stroke();
    } else if (kind === 'happy') {
      g.lineWidth = 2.6; [-14, 14].forEach(x => { g.beginPath(); g.arc(x, -2, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); });
      g.beginPath(); g.moveTo(-10, 14); g.quadraticCurveTo(0, 28, 10, 14); g.closePath(); g.fillStyle = '#7a1a4a'; g.fill(); g.stroke(); ell(g, 0, 21, 4, 2.4, 0, '#ff8fb8');
      heart(g, 30, -26, 5, '#ff5fb4', '#fff', 1); heart(g, -32, -22, 4, '#ff9ed6', '#fff', 1);
    } else {
      [-14, 14].forEach(x => { circ(g, x, -4, 7.5, '#fff', ink, 2); circ(g, x + (x > 0 ? -1.5 : 1.5), -3, 3.8, '#2b1257'); circ(g, x + (x > 0 ? -2.5 : .5), -5, 1.4, '#fff'); });
      g.lineWidth = 3; g.beginPath(); g.moveTo(-24, -16); g.lineTo(-7, -10); g.moveTo(24, -16); g.lineTo(7, -10); g.stroke();
      g.lineWidth = 2.6; g.beginPath(); g.moveTo(-9, 22); g.quadraticCurveTo(0, 15, 9, 22); g.stroke();
    }
    if (kind !== 'hmph') { ell(g, -27, 12, 7, 4.5, 0, 'rgba(255,170,215,.65)'); ell(g, 27, 12, 7, 4.5, 0, 'rgba(255,170,215,.65)'); }
    star(g, 31, -30, 4, 1.6, 4, '#fff'); star(g, -33, -26, 3, 1.2, 4, '#fff');
  });
  const puff = critter(30, 26, g => { [[-7, 3, 7], [4, 0, 8], [10, 4, 6], [0, 6, 7]].forEach(p => circ(g, p[0], p[1], p[2], '#fff', '#c5cbe0', 1)); [[-7, 3, 7], [4, 0, 8], [10, 4, 6], [0, 6, 7]].forEach(p => circ(g, p[0], p[1], p[2] - 1, '#fbfcff')); }, 1, 3, '#5b4b8a', .6);

  // ---------- particles ----------
  const P = {
    starW: mk(14, 14, g => star(g, 0, 0, 6, 1.8, 4, '#fff'), 2), starG: mk(14, 14, g => star(g, 0, 0, 6, 2.6, 5, '#ffe15a', '#fff', .6), 2),
    heart: mk(14, 14, g => heart(g, 0, 0, 4.2, '#ff5fb4', '#fff', .7), 2), dot: mk(10, 10, g => circ(g, 0, 0, 3.5, rgrad(g, 0, 0, 4, ['#fff', 'rgba(255,255,255,.6)'])), 2),
    dotP: mk(10, 10, g => circ(g, 0, 0, 3.5, '#ffb6e6'), 2), cloud: mk(20, 16, g => { [[-4, 1, 5], [3, -1, 6], [6, 3, 4]].forEach(p => circ(g, p[0], p[1], p[2], 'rgba(255,255,255,.95)')); }, 2),
    sh: [0, 1, 2, 3].map(i => mk(10, 10, g => { g.rotate(i * .8); g.fillStyle = ['#ff6fc4', '#5fb8ff', '#ffcf3a', '#a87aff'][i]; g.beginPath(); g.moveTo(0, -4); g.lineTo(3, 0); g.lineTo(0, 4); g.lineTo(-3, 0); g.closePath(); g.fill(); }, 2)),
    conf: RBOW.map((c, i) => mk(8, 8, g => { g.rotate(i * .5); g.fillStyle = c; g.fillRect(-3, -1.6, 6, 3.2); }, 2)),
    ring: mk(40, 40, g => circ(g, 0, 0, 17, null, 'rgba(255,255,255,.9)', 2.5), 2),
    zzz: mk(14, 14, g => { g.strokeStyle = '#8a8fc0'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-4, -4); g.lineTo(4, -4); g.lineTo(-4, 4); g.lineTo(4, 4); g.stroke(); }, 2),
    note: mk(14, 16, g => { g.fillStyle = '#ff5fb4'; ell(g, -2, 4, 3.2, 2.4, -.4, '#ff5fb4'); g.fillRect(.6, -6, 1.6, 10); g.beginPath(); g.moveTo(2.2, -6); g.quadraticCurveTo(6, -4, 5, 0); g.lineWidth = 1.6; g.strokeStyle = '#ff5fb4'; g.stroke(); }, 2)
  };
  // pre-rendered number popups (+1 +2 +3 +5 +10, x2..x9): text is drawn ONCE here, never measured during play
  const FONT = '900 20px "Baloo 2","Comic Sans MS","Trebuchet MS",system-ui,sans-serif';
  const label = (txt, fill, edge) => { const c = document.createElement('canvas'), s = 3; c.width = 60 * s; c.height = 28 * s; const g = c.getContext('2d'); g.scale(s, s); g.font = FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = edge; g.strokeText(txt, 30, 14); g.fillStyle = fill; g.fillText(txt, 30, 14); c.w = 60; c.h = 28; return c; };
  const POP = {}; [1, 2, 3, 4, 5, 10].forEach(n => { POP['+' + n] = label('+' + n, '#fff', '#d6339f'); });
  for (let n = 2; n <= 9; n++) POP['x' + n] = label('x' + n + '!', '#fff6c4', '#a35f00');

  // ---------- themes and parallax ----------
  const THEMES = {
    meadow: { sky: ['#6cc8ff', '#b8e6ff', '#ffe3f3'], sun: 'rgba(255,250,220,.9)', far: ['#d8b6ff', '#f4c8f0'], cap: '#fff', castle: ['#ffe0f1', '#ff7ac8', '#ffd84a'], mid: ['#b8f0c8', '#7ed6a0'], midDeco: 'lolli', near: ['#ff9ed6', '#e86ab4'],
      ground: ['#ffc8e6', '#ff8acb', '#e0559f'], edge: '#ffffff', edge2: '#ff6fb8', spr: ['#fff', '#ffe15a', '#7ad8ff', '#b48aff'], deco: 'flower', amb: 'heart', cloud: 'rgba(255,255,255,.9)' },
    sunset: { sky: ['#ff8fa8', '#ffb59a', '#ffe9c4'], sun: 'rgba(255,236,170,.95)', far: ['#c890d8', '#f0a8c0'], cap: '#ffe9f4', castle: ['#ffe6d0', '#ff8a8a', '#ffd84a'], mid: ['#ffc89a', '#f09a7a'], midDeco: 'tree', near: ['#ff9a9a', '#d8708a'],
      ground: ['#ffd2b0', '#ffa07a', '#e86a6a'], edge: '#fff3d8', edge2: '#ff8a6a', spr: ['#fff', '#ff6fb8', '#ffe15a', '#7ed68a'], deco: 'tulip', amb: 'petal', cloud: 'rgba(255,236,226,.9)' },
    rainbow: { sky: ['#7adcff', '#c4d4ff', '#f6d6ff'], sun: 'rgba(255,255,255,.9)', far: ['#c0b0ff', '#e8c4ff'], cap: '#fff', castle: null, rainbow: true, mid: ['#d8f8ff', '#a8d8ff'], midDeco: 'cloud', near: ['#c8a8ff', '#9a7ae8'],
      ground: ['#d8ccff', '#a898ff', '#7a74e8'], edge: '#ffffff', edge2: '#9a8aff', spr: RBOW, deco: 'lolli', amb: 'star', cloud: 'rgba(255,255,255,.62)' },
    dusk: { sky: ['#1e1450', '#5a2f94', '#e07ac0'], sun: 'rgba(255,246,220,.95)', moon: true, far: ['#4a2a88', '#7a48b0'], cap: '#e8d8ff', castle: ['#8a6ac8', '#5a3a98', '#ffe58a'], glowWin: true, mid: ['#6a3aa8', '#4a2280'], midDeco: 'crystal', near: ['#3a1a6a', '#2a1050'],
      ground: ['#a868d8', '#6a32a8', '#40186e'], edge: '#f0d8ff', edge2: '#c89aff', spr: ['#fff', '#7ad8ff', '#ff9ed6', '#ffe15a'], deco: 'mushroom', amb: 'firefly', cloud: 'rgba(255,214,240,.35)' },
    silver: { sky: ['#8ea6dc', '#cdd8f2', '#f4f6fc'], sun: 'rgba(255,255,255,.95)', far: ['#b8c4e4', '#d8def2'], cap: '#fff', castle: ['#f4f6fc', '#a9b4d8', '#ffd84a'], mid: ['#e2e8f6', '#bcc6e4'], midDeco: 'cloud', near: ['#c4cce6', '#a0aad0'],
      ground: ['#e6eaf8', '#bcc4e2', '#8f9cc4'], edge: '#ffffff', edge2: '#a9b4d8', spr: ['#fff', '#ff9ed6', '#7ad8ff', '#ffd84a'], deco: 'crystal', amb: 'snow', cloud: 'rgba(255,255,255,.66)' },
    treasure: { sky: ['#ffd36a', '#ffe9a8', '#ffd0f0'], sun: 'rgba(255,255,240,.95)', far: ['#ffc070', '#ffd8a0'], cap: '#fff6c4', castle: ['#fff6c4', '#ffb83a', '#ff5fb4'], mid: ['#fff0b0', '#ffd070'], midDeco: 'gems', near: ['#ffb84a', '#e8902a'],
      ground: ['#fff0a8', '#ffcf5a', '#e8a020'], edge: '#fffbe0', edge2: '#f5a623', spr: ['#fff', '#ff5fb4', '#5fb8ff', '#b48aff'], deco: 'gem', amb: 'gold', cloud: 'rgba(255,250,230,.92)' }
  };
  const rnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  function castle(g, x, base, s, c, glowWin) {
    const [wall, roof, flag] = c;
    const tower = (tx, w, h) => {
      g.fillStyle = wall; g.fillRect(tx - w / 2, base - h, w, h); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.strokeRect(tx - w / 2, base - h, w, h);
      g.fillStyle = roof; g.beginPath(); g.moveTo(tx - w / 2 - 3 * s, base - h); g.lineTo(tx, base - h - w * 1.3); g.lineTo(tx + w / 2 + 3 * s, base - h); g.closePath(); g.fill();
      g.strokeStyle = flag; g.lineWidth = 1.2; g.beginPath(); g.moveTo(tx, base - h - w * 1.3); g.lineTo(tx, base - h - w * 1.3 - 9 * s); g.stroke();
      heart(g, tx + 3.5 * s, base - h - w * 1.3 - 7 * s, 2.4 * s, flag);
      g.fillStyle = glowWin ? '#ffe58a' : 'rgba(255,255,255,.7)'; rrect(g, tx - 2 * s, base - h * .7, 4 * s, 6 * s, 2 * s); g.fill();
    };
    g.fillStyle = wall; g.fillRect(x - 34 * s, base - 30 * s, 68 * s, 30 * s);
    for (let i = -34; i < 34; i += 8) g.fillRect(x + i * s, base - 34 * s, 5 * s, 4 * s);
    g.fillStyle = roof; rrect(g, x - 7 * s, base - 18 * s, 14 * s, 18 * s, 7 * s); g.fill();
    tower(x - 30 * s, 12 * s, 48 * s); tower(x + 30 * s, 12 * s, 48 * s); tower(x, 16 * s, 70 * s); tower(x - 14 * s, 9 * s, 40 * s); tower(x + 14 * s, 9 * s, 40 * s);
  }
  function hills(g, w, base, amp, f1, f2, ph, fill) {
    g.fillStyle = fill; g.beginPath(); g.moveTo(0, base + 400); for (let x = 0; x <= w; x += 8) g.lineTo(x, base - amp - Math.sin(x / w * TAU * f1 + ph) * amp * .55 - Math.sin(x / w * TAU * f2 + ph * 2) * amp * .25); g.lineTo(w, base + 400); g.closePath(); g.fill();
  }
  const cloudBlob = (g, x, y, s, col) => { g.fillStyle = col; [[0, 0, 18], [18, 4, 14], [-18, 5, 13], [6, -9, 13], [-8, -6, 11]].forEach(p => { g.beginPath(); g.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, TAU); g.fill(); }); };
  // a parallax strip, rendered at the exact device-pixel size it is shown at (so play just blits it, never scales it);
  // the content is drawn 3 times (shifted one strip left/right) so the strip tiles without a seam. pre() draws once (opaque sky).
  function strip(wu, hu, RS, fn, pre) { const c = document.createElement('canvas'); c.width = Math.round(wu * RS); c.height = Math.ceil(hu * RS); const g = c.getContext('2d'); g.scale(c.width / wu, RS); g.lineJoin = 'round'; g.lineCap = 'round'; if (pre) pre(g); [-wu, 0, wu].forEach(o => { g.save(); g.translate(o, 0); fn(g); g.restore(); }); c.wu = wu; c.hu = hu; return c; }
  // far: OPAQUE sky + sun + mountains + the castle, from `top` units above the play band down to y 262; mid: hills + trees (H 150);
  // near: bushes (H 70); clouds (H 160). RS = device pixels per unit.
  function scenery(id, RS, top) {
    const t = THEMES[id] || THEMES.meadow; RS = Math.max(.4, Math.min(4.5, RS || 1)); top = Math.max(0, Math.ceil(top || 0));
    const far = strip(960, 272 + top, RS, g0 => { g0.save(); g0.translate(0, top); farArt(g0); g0.restore(); }, g => {
      g.fillStyle = lgrad(g, 0, 0, 0, 262 + top, [t.sky[0], t.sky[1], t.sky[2]]); g.fillRect(0, 0, 960, 272 + top);
      g.save(); g.translate(0, top); const sp = t.moon ? 'moon' : 'sun';
      circ(g, 700, 50, 60, rgrad(g, 700, 50, 60, t.moon ? ['rgba(255,250,230,.9)', 'rgba(220,200,255,.25)', 'rgba(200,170,255,0)'] : ['rgba(255,255,240,1)', 'rgba(255,240,200,.45)', 'rgba(255,220,240,0)']));
      if (sp === 'moon') { circ(g, 700, 50, 17, rgrad(g, 700, 50, 18, ['#fffdf4', '#fff3d0', '#f0dcff'], -5, -5)); circ(g, 694, 46, 3.2, 'rgba(200,170,230,.45)'); circ(g, 706, 56, 2.4, 'rgba(200,170,230,.4)'); circ(g, 707, 43, 1.6, 'rgba(200,170,230,.35)'); for (let i = 0; i < 40; i++) star(g, (i * 97) % 960, 10 + (i * 53) % 150 - top * ((i % 3) / 3), 1.6, .6, 4, 'rgba(255,255,255,.85)'); } else circ(g, 700, 50, 18, 'rgba(255,255,248,.95)');
      g.restore();
      // tall screens: more sky above the play band -> a pale rainbow, floating cloud islands and twinkles up there
      if (top > 40) { const r = rnd(19);
        RBOW.forEach((col, i) => { g.strokeStyle = col; g.globalAlpha = .22; g.lineWidth = 8; g.beginPath(); g.arc(250, top + 120, Math.min(260, top + 60) - i * 8, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }); g.globalAlpha = 1;
        for (let i = 0; i < 4; i++) { const x = 90 + i * 240 + r() * 40, y = top * (0.25 + r() * 0.45); cloudBlob(g, x, y, .9 + r() * .5, t.cloud); if (i % 2) { g.fillStyle = t.mid[1]; g.beginPath(); g.ellipse(x, y + 8, 26, 6, 0, 0, TAU); g.fill(); heart(g, x, y - 4, 5, 'rgba(255,111,180,.7)'); } }
        for (let i = 0; i < 26; i++) star(g, r() * 960, r() * top, 1.4 + r() * 1.8, .6, 4, 'rgba(255,255,255,' + (.5 + r() * .4).toFixed(2) + ')');
      }
    });
    function farArt(g) {
      const r = rnd(7);
      if (t.rainbow) RBOW.forEach((col, i) => { g.strokeStyle = col; g.globalAlpha = .45; g.lineWidth = 9; g.beginPath(); g.arc(480, 260, 230 - i * 9, Math.PI, 0); g.stroke(); });
      g.globalAlpha = 1;
      for (let i = 0; i < 7; i++) { const x = i * 150 + r() * 60 - 30, h = 90 + r() * 70, w = 110 + r() * 60;
        g.fillStyle = lgrad(g, 0, 260 - h, 0, 260, [t.far[0], t.far[1]]); g.beginPath(); g.moveTo(x - w, 262); g.lineTo(x, 260 - h); g.lineTo(x + w, 262); g.closePath(); g.fill();
        g.fillStyle = t.cap; g.globalAlpha = .85; g.beginPath(); g.moveTo(x - w * .22, 260 - h * .78); g.lineTo(x, 260 - h); g.lineTo(x + w * .22, 260 - h * .78); g.lineTo(x + w * .08, 260 - h * .72); g.lineTo(x - w * .06, 260 - h * .8); g.closePath(); g.fill(); g.globalAlpha = 1; }
      if (t.castle) castle(g, 470, 236, 1.25, t.castle, t.glowWin);
      if (t.rainbow) for (let i = 0; i < 4; i++) { const x = 120 + i * 240, y = 90 + (i % 2) * 50; g.fillStyle = '#b8f0c8'; g.beginPath(); g.ellipse(x, y, 34, 9, 0, 0, TAU); g.fill(); g.fillStyle = '#c0a0e8'; g.beginPath(); g.moveTo(x - 30, y + 2); g.lineTo(x, y + 30); g.lineTo(x + 30, y + 2); g.closePath(); g.fill(); }
      // haze at the bottom so it sits far back
      g.fillStyle = lgrad(g, 0, 170, 0, 262, ['rgba(255,255,255,0)', t.sky[2]]); g.globalAlpha = .7; g.fillRect(0, 170, 960, 92); g.globalAlpha = 1;
    }
    const mid = strip(720, 150, RS, g => {
      const r = rnd(11);
      hills(g, 720, 120, 26, 2, 5, 1, lgrad(g, 0, 60, 0, 150, [t.mid[0], t.mid[1]]));
      for (let i = 0; i < 9; i++) { const x = 30 + i * 80 + r() * 30, b = 118 - Math.sin(x / 720 * TAU * 2 + 1) * 14;
        if (t.midDeco === 'lolli') { g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, b); g.lineTo(x, b - 34); g.stroke(); const c = t.spr[i % t.spr.length] === '#fff' ? '#ff9ed6' : t.spr[i % t.spr.length]; circ(g, x, b - 44, 12, c, '#fff', 2); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(x, b - 44, 6, 0, 4.5); g.stroke(); }
        else if (t.midDeco === 'tree') { g.fillStyle = '#b07a5a'; g.fillRect(x - 2.5, b - 26, 5, 26); cloudBlob(g, x, b - 36, .75, i % 2 ? '#ffb0c8' : '#ffd0a0'); }
        else if (t.midDeco === 'crystal') { [[-6, 26, '#7ad8ff'], [4, 36, '#ff9ed6'], [12, 20, '#c89aff']].forEach(p => { g.fillStyle = p[2]; g.globalAlpha = .85; g.beginPath(); g.moveTo(x + p[0] - 5, b); g.lineTo(x + p[0], b - p[1]); g.lineTo(x + p[0] + 5, b); g.closePath(); g.fill(); g.globalAlpha = 1; }); }
        else if (t.midDeco === 'gems') { const c = ['#ff6fc4', '#5fb8ff', '#a87aff'][i % 3]; g.fillStyle = c; g.beginPath(); g.moveTo(x - 10, b - 20); g.lineTo(x + 10, b - 20); g.lineTo(x + 14, b - 12); g.lineTo(x, b + 4); g.lineTo(x - 14, b - 12); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x - 8, b - 19, 6, 4); }
        else cloudBlob(g, x, b - 14, .9, 'rgba(255,255,255,.55)'); }
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, 720, 150);
    });
    const near = strip(600, 70, RS, g => {
      const r = rnd(5);
      for (let i = 0; i < 8; i++) { const x = 20 + i * 76 + r() * 20, s = .8 + r() * .5; g.fillStyle = lgrad(g, 0, 20, 0, 70, [t.near[0], t.near[1]]);
        [[0, 0, 16], [14, 6, 12], [-14, 6, 12], [6, -10, 11]].forEach(p => { g.beginPath(); g.arc(x + p[0] * s, 52 + p[1] * s, p[2] * s, 0, TAU); g.fill(); });
        heart(g, x + 4 * s, 44 * 1, 3.2 * s, 'rgba(255,255,255,.55)'); circ(g, x - 8 * s, 50, 2 * s, 'rgba(255,255,255,.5)'); }
      g.fillStyle = t.near[1]; g.fillRect(0, 50, 600, 20);
    });
    const clouds = strip(800, 160, RS, g => { for (let i = 0; i < 6; i++) { const x = 60 + i * 130 + (i % 2) * 24, y = 40 + ((i * 53) % 80), s = .8 + (i % 3) * .3; cloudBlob(g, x, y + 3, s, 'rgba(160,130,200,.12)'); cloudBlob(g, x, y, s, t.cloud); } });
    // ground pattern tile (sprinkles, hearts, little gems) in units 50x50, at 2 px/unit
    const pat = document.createElement('canvas'); pat.width = 100; pat.height = 100; { const g = pat.getContext('2d'); g.scale(2, 2); const r = rnd(3);
      for (let i = 0; i < 9; i++) { const x = r() * 50, y = r() * 50, c = t.spr[i % t.spr.length]; g.globalAlpha = .55;
        if (i % 4 === 0) heart(g, x, y, 2.2, c); else if (i % 4 === 1) { g.fillStyle = c; g.beginPath(); g.moveTo(x, y - 2.5); g.lineTo(x + 2, y); g.lineTo(x, y + 2.5); g.lineTo(x - 2, y); g.closePath(); g.fill(); }
        else { g.save(); g.translate(x, y); g.rotate(r() * 3); g.fillStyle = c; rrect(g, -2.5, -.8, 5, 1.6, .8); g.fill(); g.restore(); } } }
    return { t, far, mid, near, clouds, pat };
  }
  // ground decorations (stamped on the ground line), the frosting drip, the bouncy cloud sea
  const deco = {
    flower: [0, 1, 2].map(i => mk(18, 22, g => { const cols = [['#fff', '#ffe15a'], ['#ffd1ec', '#ff5fb4'], ['#e0c4ff', '#ffe15a']][i]; g.strokeStyle = '#4fb863'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 10); g.lineTo(0, -1); g.stroke(); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; circ(g, Math.cos(a) * 4.5, -3 + Math.sin(a) * 4.5, 3.4, cols[0], 'rgba(0,0,0,.08)', .5); } circ(g, 0, -3, 2.6, cols[1]); })),
    tulip: [0, 1, 2].map(i => mk(16, 24, g => { const c = ['#ff5f7e', '#ffb04a', '#ff9ed6'][i]; g.strokeStyle = '#4fb863'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 11); g.lineTo(0, -2); g.stroke(); g.fillStyle = c; g.beginPath(); g.moveTo(-5, -9); g.lineTo(-2.5, -5); g.lineTo(0, -9); g.lineTo(2.5, -5); g.lineTo(5, -9); g.quadraticCurveTo(5, 0, 0, 0); g.quadraticCurveTo(-5, 0, -5, -9); g.fill(); })),
    lolli: [0, 1, 2].map(i => mk(16, 28, g => { const c = ['#ff5fb4', '#5fb8ff', '#b48aff'][i]; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 13); g.lineTo(0, -2); g.stroke(); circ(g, 0, -7, 6.5, c, '#fff', 1.4); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, -7, 3.2, 0, 4.6); g.stroke(); })),
    mushroom: [0, 1, 2].map(i => mk(20, 22, g => { const c = ['#ff6fc4', '#7ad8ff', '#c89aff'][i]; circ(g, 0, -2, 11, 'rgba(255,255,255,.12)'); g.fillStyle = '#f6eaff'; rrect(g, -2.5, -2, 5, 12, 2); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(0, -2, 7, Math.PI, 0); g.closePath(); g.fill(); circ(g, -3, -5, 1.3, '#fff'); circ(g, 2.5, -4, 1, '#fff'); })),
    crystal: [0, 1, 2].map(i => mk(18, 24, g => { const c = ['#9ae8ff', '#ff9ed6', '#e0c4ff'][i]; [[-4, 12], [2, 18], [6, 10]].forEach(p => { g.fillStyle = c; g.beginPath(); g.moveTo(p[0] - 3, 11); g.lineTo(p[0], 11 - p[1]); g.lineTo(p[0] + 3, 11); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(p[0] - 1.5, 10); g.lineTo(p[0], 11 - p[1]); g.lineTo(p[0], 10); g.closePath(); g.fill(); }); })),
    gem: [0, 1, 2].map(i => mk(16, 16, g => { const c = ['#ff6fc4', '#5fb8ff', '#a87aff'][i]; g.translate(0, 3); gemPath(g, 5); g.fillStyle = c; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = .8; g.stroke(); }))
  };
  deco.cloud = deco.lolli; deco.tree = deco.tulip;
  const cloudSea = mk(30, 24, g => { [[-10, 2, 9], [0, -2, 11], [11, 2, 9]].forEach(p => circ(g, p[0], p[1] + 2, p[2], 'rgba(200,170,240,.45)')); [[-10, 2, 9], [0, -2, 11], [11, 2, 9]].forEach(p => circ(g, p[0], p[1], p[2], '#fff')); circ(g, -3, -6, 3, 'rgba(255,255,255,.9)'); heart(g, 4, 3, 2.4, 'rgba(255,150,210,.8)'); });
  // sparkly sun / moon glow, drawn in screen space
  const sun = (moon) => mk(120, 120, g => {
    circ(g, 0, 0, 60, rgrad(g, 0, 0, 60, moon ? ['rgba(255,250,230,.9)', 'rgba(220,200,255,.25)', 'rgba(200,170,255,0)'] : ['rgba(255,255,240,1)', 'rgba(255,240,200,.45)', 'rgba(255,220,240,0)']));
    if (moon) { circ(g, 0, 0, 16, '#fff8e8'); circ(g, 6, -4, 13, 'rgba(90,50,150,.9)'); } else circ(g, 0, 0, 18, 'rgba(255,255,248,.95)');
  }, 2);
  const ambS = {
    heart: P.heart, petal: mk(12, 10, g => ell(g, 0, 0, 4.5, 2.6, .5, '#ffb6c8', '#fff', .5), 2), star: P.starW, firefly: mk(16, 16, g => { circ(g, 0, 0, 8, rgrad(g, 0, 0, 8, ['rgba(255,255,200,1)', 'rgba(255,240,120,.35)', 'rgba(255,240,120,0)'])); }, 2),
    snow: mk(12, 12, g => { g.strokeStyle = '#fff'; g.lineWidth = 1.2; for (let i = 0; i < 3; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-5, 0); g.lineTo(5, 0); g.stroke(); } }, 2), gold: P.starG
  };

  // ---------- inline SVG pictures for the menus ----------
  const crownSVG = (on) => '<svg viewBox="0 0 100 100"><path d="M14 78 L10 30 L32 52 L50 18 L68 52 L90 30 L86 78Z" fill="' + (on ? '#ffd84a' : 'rgba(255,255,255,.25)') + '" stroke="' + (on ? '#a35f00' : 'rgba(255,255,255,.75)') + '" stroke-width="7" stroke-linejoin="round"/>' + (on ? '<circle cx="50" cy="60" r="8" fill="#ff2d8a" stroke="#fff" stroke-width="3"/><path d="M22 70 L20 44 L30 54Z" fill="#fff" opacity=".7"/>' : '') + '</svg>';
  const SVG = {
    heart: '<svg viewBox="0 0 100 100"><path d="M50 88 C10 58 12 22 34 20 C44 19 50 28 50 34 C50 28 56 19 66 20 C88 22 90 58 50 88Z" fill="#ff5fb4" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><ellipse cx="34" cy="34" rx="7" ry="5" fill="#fff" opacity=".75"/></svg>',
    gem: '<svg viewBox="0 0 100 100"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#9ae8ff"/><stop offset="1" stop-color="#3a8aff"/></linearGradient></defs><path d="M30 14 H70 L90 38 L50 92 L10 38Z" fill="url(#gg)" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M10 38 H90 M38 38 L50 92 L62 38" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/></svg>',
    star: '<svg viewBox="0 0 100 100"><path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36Z" fill="#ffe15a" stroke="#a35f00" stroke-width="5" stroke-linejoin="round"/><path d="M40 30 L46 40 L32 44Z" fill="#fff" opacity=".7"/></svg>',
    starOff: '<svg viewBox="0 0 100 100"><path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36Z" fill="rgba(60,0,70,.3)" stroke="rgba(255,255,255,.5)" stroke-width="5" stroke-linejoin="round"/></svg>',
    crown: crownSVG(true), crownOff: crownSVG(false),
    lock: '<svg viewBox="0 0 100 100"><rect x="22" y="44" width="56" height="44" rx="10" fill="#e8e8f5" stroke="#9a9ab0" stroke-width="5"/><path d="M34 44 V32 a16 16 0 0 1 32 0 V44" fill="none" stroke="#9a9ab0" stroke-width="8"/><circle cx="50" cy="66" r="6" fill="#9a9ab0"/></svg>',
    home: '<svg viewBox="0 0 100 100"><path d="M12 48 L50 14 L88 48 V88 H12Z" fill="#fff" stroke="#f5c542" stroke-width="6" stroke-linejoin="round"/><path d="M50 14 L12 48 H88Z" fill="#ff7ac8" stroke="#f5c542" stroke-width="6" stroke-linejoin="round"/><rect x="40" y="58" width="20" height="30" rx="4" fill="#ffb6dc"/></svg>',
    play: '<svg viewBox="0 0 100 100"><path d="M30 14 L86 50 L30 86Z" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 100 100"><rect x="22" y="16" width="20" height="68" rx="6" fill="#fff"/><rect x="58" y="16" width="20" height="68" rx="6" fill="#fff"/></svg>',
    redo: '<svg viewBox="0 0 100 100"><path d="M78 30 A34 34 0 1 0 84 56" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/><path d="M82 8 V34 H56Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/></svg>',
    map: '<svg viewBox="0 0 100 100"><circle cx="24" cy="70" r="12" fill="#fff"/><circle cx="50" cy="32" r="12" fill="#fff"/><circle cx="78" cy="64" r="12" fill="#fff"/><path d="M24 70 Q36 40 50 32 Q70 36 78 64" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="3 10" stroke-linecap="round"/></svg>',
    sound: '<svg viewBox="0 0 100 100"><path d="M14 38 H32 L56 16 V84 L32 62 H14Z" fill="#a35f9c" stroke="#a35f9c" stroke-width="5" stroke-linejoin="round"/><path d="M68 34 Q82 50 68 66 M78 22 Q100 50 78 78" fill="none" stroke="#a35f9c" stroke-width="7" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 100 100"><path d="M14 38 H32 L56 16 V84 L32 62 H14Z" fill="#a35f9c" stroke="#a35f9c" stroke-width="5" stroke-linejoin="round"/><path d="M68 36 L92 64 M92 36 L68 64" fill="none" stroke="#d6339f" stroke-width="8" stroke-linecap="round"/></svg>',
    plane: '<svg viewBox="0 0 120 120"><path d="M14 60 L110 28 L62 98 L54 70Z" fill="#fff" stroke="#c0c0d0" stroke-width="4" stroke-linejoin="round"/><path d="M54 70 L110 28 L44 76Z" fill="#ffb6dd" stroke="#e05aa8" stroke-width="3" stroke-linejoin="round"/></svg>',
    tap: '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="rgba(255,255,255,.35)" stroke="#fff" stroke-width="4"/><path d="M42 74 V38 a8 8 0 0 1 16 0 V54 l10 2 a8 8 0 0 1 6 8 L70 80 H44Z" fill="#fff" stroke="#d6339f" stroke-width="3" stroke-linejoin="round"/></svg>',
    sticker: {
      heart: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#ffe0f1" stroke="#ff5fb4" stroke-width="6"/><path d="M50 74 C24 54 26 32 40 31 C46 31 50 36 50 40 C50 36 54 31 60 31 C74 32 76 54 50 74Z" fill="#ff5fb4" stroke="#fff" stroke-width="3"/></svg>',
      flower: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#e9fbe0" stroke="#7ed68a" stroke-width="6"/><g fill="#ff9ed6" stroke="#fff" stroke-width="2.5"><circle cx="50" cy="29" r="12"/><circle cx="71" cy="45" r="12"/><circle cx="63" cy="70" r="12"/><circle cx="37" cy="70" r="12"/><circle cx="29" cy="45" r="12"/></g><circle cx="50" cy="52" r="10" fill="#ffe15a" stroke="#f5a623" stroke-width="3"/></svg>',
      rainbow: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#e7f6ff" stroke="#5fb8ff" stroke-width="6"/><g fill="none" stroke-width="7" stroke-linecap="round"><path d="M20 66 A30 30 0 0 1 80 66" stroke="#ff5f7e"/><path d="M27 66 A23 23 0 0 1 73 66" stroke="#ffe15a"/><path d="M34 66 A16 16 0 0 1 66 66" stroke="#5fe08a"/><path d="M41 66 A9 9 0 0 1 59 66" stroke="#5fb8ff"/></g></svg>',
      gem: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#ece4ff" stroke="#8a4be0" stroke-width="6"/><path d="M50 22 L70 40 L62 74 L38 74 L30 40Z" fill="#b48aff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M30 40 H70 M50 22 L44 40 L46 74" stroke="#fff" stroke-width="2" fill="none"/></svg>',
      crown: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#fff6d0" stroke="#f5c542" stroke-width="6"/><path d="M24 70 L22 34 L38 50 L50 26 L62 50 L78 34 L76 70Z" fill="#ffd84a" stroke="#a35f00" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="56" r="5" fill="#ff2d55"/><circle cx="34" cy="60" r="3" fill="#2fd8e8"/><circle cx="66" cy="60" r="3" fill="#8be43c"/></svg>'
    },
    level: {
      cloud: '<svg viewBox="0 0 100 100"><g fill="#fff" stroke="#c9d8ff" stroke-width="3"><circle cx="34" cy="58" r="20"/><circle cx="58" cy="48" r="24"/><circle cx="76" cy="62" r="16"/><rect x="20" y="58" width="68" height="20" rx="10" stroke="none"/></g><path d="M44 54 q4 -8 8 0 q4 -8 8 0 q0 8 -8 14 q-8 -6 -8 -14z" fill="#ff5fb4"/></svg>',
      flower: '<svg viewBox="0 0 100 100"><g fill="#ff9ed6" stroke="#fff" stroke-width="3"><circle cx="50" cy="26" r="15"/><circle cx="74" cy="44" r="15"/><circle cx="65" cy="72" r="15"/><circle cx="35" cy="72" r="15"/><circle cx="26" cy="44" r="15"/></g><circle cx="50" cy="52" r="13" fill="#ffe15a" stroke="#f5a623" stroke-width="3"/></svg>',
      rainbow: '<svg viewBox="0 0 100 100"><g fill="none" stroke-width="9" stroke-linecap="round"><path d="M10 78 A40 40 0 0 1 90 78" stroke="#ff5f7e"/><path d="M20 78 A30 30 0 0 1 80 78" stroke="#ffe15a"/><path d="M30 78 A20 20 0 0 1 70 78" stroke="#5fe08a"/><path d="M40 78 A10 10 0 0 1 60 78" stroke="#5fb8ff"/></g></svg>',
      gem: '<svg viewBox="0 0 100 100"><path d="M50 10 L82 38 L68 88 L32 88 L18 38Z" fill="#c9a4ff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M18 38 H82 M50 10 L40 38 L45 88" stroke="#fff" stroke-width="3" fill="none"/><circle cx="38" cy="26" r="4" fill="#fff"/></svg>',
      boss: '<svg viewBox="0 0 100 100"><g fill="#eef0f8" stroke="#a9afc8" stroke-width="3"><circle cx="50" cy="56" r="30"/><circle cx="26" cy="56" r="14"/><circle cx="74" cy="56" r="14"/><circle cx="50" cy="30" r="14"/></g><path d="M36 26 L40 12 L46 22 L50 8 L54 22 L60 12 L64 26Z" fill="#ffd84a" stroke="#a35f00" stroke-width="3" stroke-linejoin="round"/><circle cx="40" cy="54" r="5" fill="#fff" stroke="#5b4b8a" stroke-width="2"/><circle cx="60" cy="54" r="5" fill="#fff" stroke="#5b4b8a" stroke-width="2"/><circle cx="41" cy="55" r="2.4" fill="#2b1257"/><circle cx="59" cy="55" r="2.4" fill="#2b1257"/><path d="M30 44 L46 49 M70 44 L54 49" stroke="#5b4b8a" stroke-width="3" stroke-linecap="round"/><path d="M42 70 Q50 64 58 70" stroke="#5b4b8a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>'
    }
  };
  window.SKArt = {
    glimmer, bubble, shadow, glow, glowGold, bunny, jelly, snow, flyer, puff, blockHeart, blockGift, blockUsed, platL, platM, platR, flowerUp, flowerDn,
    gems, gemBig, ring, ringDone, crown, heartStar, rainbowPick, magnet, shieldPick, giantPick, portal, portalOut, wind,
    checkpointOff: checkpoint(false), checkpointOn: checkpoint(true), gate, bigStar,
    boss: { grump: bossFace('grump'), dizzy: bossFace('dizzy'), tired: bossFace('tired'), hmph: bossFace('hmph'), happy: bossFace('happy') },
    P, POP, THEMES, scenery, deco, cloudSea, sun: sun(false), moon: sun(true), ambS, RBOW, SVG
  };
})();
