// Sparkle Kingdom art: everything is drawn in code, once, into small offscreen canvases (sprites) and then stamped with drawImage.
// Sprites are centred on (0,0), measured in game units (SS pixels per unit). Pink, silver and gold, glitter and gems.
(function () {
  const SS = 3, TAU = Math.PI * 2;
  const mk = (wu, hu, fn) => {
    const c = document.createElement('canvas'); c.width = Math.ceil(wu * SS); c.height = Math.ceil(hu * SS);
    const g = c.getContext('2d'); g.scale(SS, SS); g.translate(wu / 2, hu / 2); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g); c.w = wu; c.h = hu; return c;
  };
  const circ = (g, x, y, r, fill, stroke, lw) => { g.beginPath(); g.arc(x, y, r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw || 1.5; g.strokeStyle = stroke; g.stroke(); } };
  const star = (g, x, y, r, ri, n, fill, stroke, lw) => {
    g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? ri : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw || 1.5; g.strokeStyle = stroke; g.stroke(); }
  };
  const heart = (g, x, y, s, fill, stroke, lw) => {
    g.beginPath(); g.moveTo(x, y + s * .9); g.bezierCurveTo(x - s * 1.5, y - s * .1, x - s * .9, y - s * 1.1, x, y - s * .35);
    g.bezierCurveTo(x + s * .9, y - s * 1.1, x + s * 1.5, y - s * .1, x, y + s * .9); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw || 1.5; g.strokeStyle = stroke; g.stroke(); }
  };
  const gemPath = (g, r) => { g.beginPath(); g.moveTo(0, -r); g.lineTo(r * .8, -r * .25); g.lineTo(r * .55, r * .8); g.lineTo(-r * .55, r * .8); g.lineTo(-r * .8, -r * .25); g.closePath(); };
  const gemSprite = (r, c1, c2, edge) => mk(r * 2.4, r * 2.4, g => {
    const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, c1); gr.addColorStop(1, c2);
    gemPath(g, r); g.fillStyle = gr; g.fill(); g.lineWidth = 1.3; g.strokeStyle = edge; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = .9; g.beginPath(); g.moveTo(-r * .8, -r * .25); g.lineTo(r * .8, -r * .25); g.moveTo(0, -r); g.lineTo(-r * .3, -r * .25); g.lineTo(-r * .2, r * .8); g.stroke();
    circ(g, -r * .3, -r * .5, r * .16, '#fff');
  });

  // ---------- Glimmer: the green glitter caterpillar from Crystal Cave, now with little rainbow wings ----------
  function glimmer(look) {
    const w = look.wear, lv = look.lv;
    const head = mk(56, 60, g => {
      if (lv >= 6 && w.glow) { const rg = g.createRadialGradient(0, 0, 4, 0, 0, 28); rg.addColorStop(0, 'rgba(255,246,196,.7)'); rg.addColorStop(.6, 'rgba(255,158,230,.35)'); rg.addColorStop(1, 'rgba(154,216,255,0)'); circ(g, 0, 0, 28, rg); }
      g.strokeStyle = '#2f9a55'; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(-5, -11); g.quadraticCurveTo(-9, -21, -13, -22); g.moveTo(5, -11); g.quadraticCurveTo(10, -21, 14, -21); g.stroke();
      circ(g, -13, -22, 2.8, '#ffe95a'); circ(g, 14, -21, 2.8, '#ffe95a');
      circ(g, 0, 0, 14, '#a8ff9e', '#2f9a55', 1.8);
      circ(g, -5, -2, 4.6, '#fff', '#2f9a55', 1.2); circ(g, 5.5, -2, 4.6, '#fff', '#2f9a55', 1.2);
      circ(g, -4.2, -1.4, 2.6, '#2b1257'); circ(g, 6.3, -1.4, 2.6, '#2b1257'); circ(g, -3.6, -2.4, .9, '#fff'); circ(g, 6.9, -2.4, .9, '#fff');
      g.fillStyle = 'rgba(255,143,184,.85)'; g.beginPath(); g.ellipse(-9, 5, 3, 2, 0, 0, TAU); g.ellipse(10, 5, 3, 2, 0, 0, TAU); g.fill();
      g.strokeStyle = '#2b1257'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-3, 6); g.quadraticCurveTo(0.5, 10, 4, 6); g.stroke();
      if (lv >= 3 && w.cheeks) { g.fillStyle = '#fff'; [[-11, 8], [12, 8]].forEach(p => star(g, p[0], p[1], 2.8, 1, 4, '#fff')); }
      if (lv >= 2 && w.neck) { g.strokeStyle = '#f5c542'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-9, 11); g.quadraticCurveTo(0, 17, 9, 11); g.stroke(); heart(g, 0, 15, 2.4, '#ff2d8a', '#fff', .8); }
      const crown = lv >= 5 && w.crown, tiara = lv >= 4 && w.tiara && !crown;
      if (crown) { g.beginPath(); g.moveTo(-9, -11); g.lineTo(-10, -20); g.lineTo(-5, -15); g.lineTo(0, -23); g.lineTo(5, -15); g.lineTo(10, -20); g.lineTo(9, -11); g.closePath(); g.fillStyle = '#ffd84a'; g.fill(); g.strokeStyle = '#a35f00'; g.lineWidth = 1.4; g.stroke(); circ(g, 0, -16, 1.9, '#ff2d55'); }
      else if (tiara) { g.beginPath(); g.moveTo(-9, -11); g.lineTo(-7, -19); g.lineTo(-3, -14); g.lineTo(0, -21); g.lineTo(3, -14); g.lineTo(7, -19); g.lineTo(9, -11); g.closePath(); g.fillStyle = '#e8e8f5'; g.fill(); g.strokeStyle = '#9a9ab0'; g.lineWidth = 1.2; g.stroke(); circ(g, 0, -14, 1.6, '#7ad8ff'); }
      else { g.beginPath(); g.moveTo(-6, -12); g.lineTo(-3, -17); g.lineTo(0, -12); g.lineTo(3, -17); g.lineTo(6, -12); g.closePath(); g.fillStyle = '#ff6fcf'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); }
      if (lv >= 1 && w.bow) { g.save(); g.translate(-12, -9); g.rotate(-.5); g.beginPath(); g.moveTo(0, 0); g.lineTo(-7, -4.5); g.lineTo(-7, 4.5); g.closePath(); g.moveTo(0, 0); g.lineTo(7, -4.5); g.lineTo(7, 4.5); g.closePath(); g.fillStyle = '#ff5fb4'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = .9; g.stroke(); circ(g, 0, 0, 2, '#ffd1ec', '#fff', .6); g.restore(); }
    });
    const seg = (c1) => mk(28, 28, g => { circ(g, 0, 0, 10, c1, '#2f9a55', 1.7); circ(g, -3, -3.5, 2.4, 'rgba(255,255,255,.7)'); });
    const wing = mk(40, 36, g => {
      const gr = g.createLinearGradient(-18, -16, 18, 16); ['#ffb6e6', '#fff3a8', '#b6f0ff', '#d9b8ff'].forEach((c, i) => gr.addColorStop(i / 3, c));
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-6, -22, -26, -22, -22, -4); g.bezierCurveTo(-22, 6, -8, 8, 0, 0); g.closePath();
      g.fillStyle = gr; g.globalAlpha = .85; g.fill(); g.globalAlpha = 1; g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.stroke();
      circ(g, -13, -9, 1.2, '#fff'); circ(g, -8, -5, 1, '#fff'); circ(g, -17, -3, 1, '#fff');
    });
    return { head, segA: seg('#7df08a'), segB: seg('#98faa2'), wing };
  }

  // ---------- friends who go "poof" ----------
  const bunny = mk(46, 52, g => {
    g.fillStyle = '#d8cdf0'; g.strokeStyle = '#8b78b8'; g.lineWidth = 1.6;
    [[-8, -17, -.15], [8, -17, .15]].forEach(e => { g.save(); g.translate(e[0], e[1]); g.rotate(e[2]); g.beginPath(); g.ellipse(0, 0, 4.5, 10, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#ffc3e3'; g.beginPath(); g.ellipse(0, 1, 2, 6, 0, 0, TAU); g.fill(); g.fillStyle = '#d8cdf0'; g.restore(); });
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; circ(g, Math.cos(a) * 14, 6 + Math.sin(a) * 13, 5.5, '#d8cdf0'); }
    circ(g, 0, 6, 16, '#e6defa', '#8b78b8', 1.6);
    circ(g, -6, 3, 3.6, '#fff', '#5b4b8a', 1); circ(g, 6, 3, 3.6, '#fff', '#5b4b8a', 1); circ(g, -5.4, 3.6, 1.9, '#2b1257'); circ(g, 6.6, 3.6, 1.9, '#2b1257');
    g.strokeStyle = '#5b4b8a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-10, -2); g.lineTo(-3, .5); g.moveTo(10, -2); g.lineTo(3, .5); g.stroke();
    g.beginPath(); g.moveTo(-3, 12); g.quadraticCurveTo(0, 9, 3, 12); g.stroke();
    g.fillStyle = 'rgba(255,150,200,.7)'; g.beginPath(); g.ellipse(-11, 9, 3, 2, 0, 0, TAU); g.ellipse(11, 9, 3, 2, 0, 0, TAU); g.fill();
  });
  const jelly = mk(46, 36, g => {
    const gr = g.createLinearGradient(0, -13, 0, 14); gr.addColorStop(0, '#ffd08a'); gr.addColorStop(1, '#ff8a5c');
    g.beginPath(); g.moveTo(-18, 2); g.bezierCurveTo(-18, -16, 18, -16, 18, 2); g.bezierCurveTo(18, 15, -18, 15, -18, 2); g.closePath(); g.fillStyle = gr; g.fill(); g.strokeStyle = '#c4572f'; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-8, -6, 6, 2.6, -.3, 0, TAU); g.fill();
    circ(g, -6, 1, 3.4, '#fff', '#8a3b1f', 1); circ(g, 6, 1, 3.4, '#fff', '#8a3b1f', 1); circ(g, -5.4, 1.6, 1.8, '#3a1210'); circ(g, 6.6, 1.6, 1.8, '#3a1210');
    g.strokeStyle = '#8a3b1f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-10, -4); g.lineTo(-3, -2); g.moveTo(10, -4); g.lineTo(3, -2); g.moveTo(-3, 8); g.quadraticCurveTo(0, 6, 3, 8); g.stroke();
  });
  const snow = mk(40, 40, g => {
    const gr = g.createRadialGradient(-5, -6, 2, 0, 0, 18); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#cfe6ff');
    circ(g, 0, 0, 16, gr, '#7fb0e8', 1.6);
    circ(g, -6, -1, 3.2, '#fff', '#3d5f99', 1); circ(g, 6, -1, 3.2, '#fff', '#3d5f99', 1); circ(g, -5.5, -.5, 1.7, '#14234d'); circ(g, 6.5, -.5, 1.7, '#14234d');
    g.strokeStyle = '#3d5f99'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-10, -6); g.lineTo(-3, -4); g.moveTo(10, -6); g.lineTo(3, -4); g.moveTo(-3, 7); g.quadraticCurveTo(0, 5, 3, 7); g.stroke();
    g.fillStyle = 'rgba(255,150,200,.6)'; g.beginPath(); g.ellipse(-11, 4, 3, 2, 0, 0, TAU); g.ellipse(11, 4, 3, 2, 0, 0, TAU); g.fill();
  });

  // ---------- blocks, pickups, checkpoint, gate ----------
  const blockHeart = mk(32, 32, g => {
    const gr = g.createLinearGradient(-13, -13, 13, 13); gr.addColorStop(0, '#ffd1ec'); gr.addColorStop(1, '#ff5fb4');
    g.beginPath(); g.roundRect ? g.roundRect(-13, -13, 26, 26, 6) : g.rect(-13, -13, 26, 26); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = '#f5c542'; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.strokeRect(-9, -9, 18, 18);
    heart(g, 0, 0, 6, '#fff', '#d6339f', 1.3); star(g, -9, -9, 2.2, .8, 4, '#fff');
  });
  const blockUsed = mk(32, 32, g => {
    g.beginPath(); g.roundRect ? g.roundRect(-13, -13, 26, 26, 6) : g.rect(-13, -13, 26, 26); g.fillStyle = '#d9d9e8'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#9a9ab0'; g.stroke();
    heart(g, 0, 0, 5, 'rgba(255,255,255,.7)', '#b0b0c8', 1);
  });
  const gems = [gemSprite(6, '#ff9ed6', '#e0359b', '#8a1270'), gemSprite(6, '#9ae8ff', '#3a8aff', '#1f4fa8'), gemSprite(6, '#fff3a8', '#f5a623', '#a35f00'), gemSprite(6, '#e0c4ff', '#8a4be0', '#4a1fa8')];
  const gemBig = gemSprite(12, '#fff6c4', '#ff9ee6', '#a35f00');
  const heartStar = mk(36, 36, g => {
    star(g, 0, 0, 16, 8, 5, '#ffe15a', '#a35f00', 1.8); heart(g, 0, 1, 4.6, '#ff3d9a', '#fff', 1); circ(g, -5, -6, 1.4, '#fff');
  });
  const rainbowPick = mk(36, 36, g => {
    circ(g, 0, 0, 15, 'rgba(255,255,255,.55)', '#fff', 1.5);
    ['#ff5f7e', '#ffb04a', '#ffe15a', '#5fe08a', '#5fb8ff', '#b07aff'].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 2.2; g.beginPath(); g.arc(0, 6, 12 - i * 1.9, Math.PI, 0); g.stroke(); });
    star(g, 9, -9, 3, 1.2, 4, '#fff');
  });
  const checkpoint = on => mk(54, 72, g => {
    g.translate(0, 6);
    g.strokeStyle = on ? '#f5c542' : '#c9c9dc'; g.lineWidth = 4; g.beginPath(); g.moveTo(-18, 30); g.lineTo(-18, -10); g.quadraticCurveTo(0, -34, 18, -10); g.lineTo(18, 30); g.stroke();
    [[-18, -4], [18, -4], [0, -24]].forEach((p, i) => { const col = on ? ['#ff5fb4', '#ff9ed6', '#fff3a8'][i] : '#e4e4ee'; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; circ(g, p[0] + Math.cos(a) * 5, p[1] + Math.sin(a) * 5, 3.6, col); } circ(g, p[0], p[1], 3, on ? '#ffe15a' : '#f0f0f6'); });
    if (on) star(g, 0, 8, 6, 2.5, 5, '#fff3a8', '#f5c542', 1);
  });
  // the rainbow gate: seven soft bands, drawn once tall enough for any screen
  const gate = mk(52, 420, g => {
    const cols = ['#ff5f7e', '#ffb04a', '#ffe15a', '#5fe08a', '#5fb8ff', '#8a7aff', '#d37aff'];
    cols.forEach((c, i) => { g.fillStyle = c; g.globalAlpha = .9; g.fillRect(-21 + i * 6, -210, 6, 420); });
    g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-21, -210, 4, 420);
    for (let i = 0; i < 14; i++) star(g, -18 + (i * 37) % 36, -200 + i * 29, 3, 1.2, 4, '#fff');
  });
  const puff = mk(24, 20, g => { [[-5, 2, 6], [3, 0, 7], [8, 3, 5], [0, 5, 6]].forEach(p => circ(g, p[0], p[1], p[2], '#fff', '#c5cbe0', 1)); });

  // ---------- Silver Puffball: big, silver-white, rosy-silver cheeks, its own face (not round pink) ----------
  const bossFace = dizzy => mk(120, 110, g => {
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; circ(g, Math.cos(a) * 40, Math.sin(a) * 34, 17, '#eef0f8', '#a9afc8', 2); }
    const gr = g.createRadialGradient(-12, -14, 6, 0, 0, 46); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#d6dae8');
    circ(g, 0, 0, 42, gr, '#a9afc8', 2.2);
    // little gold crown-tuft so it reads as the king of the clouds
    g.beginPath(); g.moveTo(-14, -38); g.lineTo(-10, -52); g.lineTo(-3, -42); g.lineTo(0, -55); g.lineTo(3, -42); g.lineTo(10, -52); g.lineTo(14, -38); g.closePath(); g.fillStyle = '#ffd84a'; g.fill(); g.strokeStyle = '#a35f00'; g.lineWidth = 2; g.stroke();
    if (dizzy) {
      [-13, 13].forEach(x => { g.strokeStyle = '#5b4b8a'; g.lineWidth = 2.4; g.beginPath(); for (let t = 0; t < 14; t++) { const a = t * .9, r = 1 + t * .55; g.lineTo(x + Math.cos(a) * r, -4 + Math.sin(a) * r); } g.stroke(); });
      g.strokeStyle = '#5b4b8a'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-8, 20); g.quadraticCurveTo(0, 14, 8, 20); g.stroke();
    } else {
      [-13, 13].forEach(x => { circ(g, x, -4, 7, '#fff', '#5b4b8a', 2); circ(g, x + (x > 0 ? -1 : 1), -3, 3.6, '#2b1257'); circ(g, x + (x > 0 ? -2 : 0), -5, 1.3, '#fff'); });
      g.strokeStyle = '#5b4b8a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-22, -15); g.lineTo(-7, -10); g.moveTo(22, -15); g.lineTo(7, -10); g.stroke();
      g.lineWidth = 2.6; g.beginPath(); g.moveTo(-8, 21); g.quadraticCurveTo(0, 14, 8, 21); g.stroke();
    }
    g.fillStyle = 'rgba(255,170,215,.65)'; g.beginPath(); g.ellipse(-26, 12, 7, 4.5, 0, 0, TAU); g.ellipse(26, 12, 7, 4.5, 0, 0, TAU); g.fill();
    star(g, 30, -28, 4, 1.6, 4, '#fff'); star(g, -32, -24, 3, 1.2, 4, '#fff');
  });

  // ---------- tiny particles ----------
  const P = {
    starW: mk(14, 14, g => star(g, 0, 0, 6, 2.2, 4, '#fff')), starG: mk(14, 14, g => star(g, 0, 0, 6, 2.4, 5, '#ffe15a')),
    heart: mk(14, 14, g => heart(g, 0, 0, 4, '#ff5fb4')), dot: mk(10, 10, g => circ(g, 0, 0, 3.5, '#fff')), dotP: mk(10, 10, g => circ(g, 0, 0, 3.5, '#ffb6e6')),
    shadow: mk(40, 12, g => { g.fillStyle = 'rgba(120,60,120,.28)'; g.beginPath(); g.ellipse(0, 0, 16, 4, 0, 0, TAU); g.fill(); })
  };

  // ---------- scenery: each theme has a sky gradient + a far layer + a cloud layer, repeated every STRIP units ----------
  const STRIP = 640;
  const THEMES = {
    meadow: { sky: ['#9fdcff', '#ffe3f3'], far: ['#e9b6ff', '#ffc4e6'], hill: ['#ffd1ec', '#ff9ed6'], ground: ['#ffb6dc', '#ff7ac8'], edge: '#fff', cloud: 'rgba(255,255,255,.85)' },
    sunset: { sky: ['#ffb199', '#ffe9c4'], far: ['#ff9ec0', '#ffc6a8'], hill: ['#ffd3a8', '#ffa8c4'], ground: ['#ffb08a', '#ff7aa0'], edge: '#fff3d8', cloud: 'rgba(255,240,230,.85)' },
    rainbow: { sky: ['#8ae6ff', '#e7d3ff'], far: ['#b6a8ff', '#ffa8ee'], hill: ['#c9f5e6', '#8ae0ff'], ground: ['#b5a8ff', '#7a8cff'], edge: '#fff', cloud: 'rgba(255,255,255,.85)' },
    dusk: { sky: ['#5a3a9a', '#ff9ed0'], far: ['#7a4ab8', '#b86ad0'], hill: ['#c88ae8', '#9a5ac8'], ground: ['#a75ad6', '#6a2fa0'], edge: '#f0d8ff', cloud: 'rgba(255,214,240,.5)' },
    silver: { sky: ['#8fa8d8', '#e8ecf8'], far: ['#b8c4e0', '#d8def0'], hill: ['#e0e6f4', '#b8c4e0'], ground: ['#c6cee6', '#8f9cc4'], edge: '#fff', cloud: 'rgba(255,255,255,.8)' }
  };
  function farStrip(t, id) {
    const c = document.createElement('canvas'), SC = 1; c.width = STRIP * SC; c.height = 200 * SC; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, t.far[0]); gr.addColorStop(1, t.far[1]);
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 200); for (let x = 0; x <= STRIP; x += 16) g.lineTo(x, 120 + Math.sin(x / STRIP * TAU * 2) * 22 + Math.sin(x / STRIP * TAU * 5) * 9); g.lineTo(STRIP, 200); g.closePath(); g.fill();
    if (id === 'rainbow') { ['#ff5f7e', '#ffb04a', '#ffe15a', '#5fe08a', '#5fb8ff', '#b07aff'].forEach((col, i) => { g.strokeStyle = col; g.globalAlpha = .55; g.lineWidth = 7; g.beginPath(); g.arc(320, 200, 150 - i * 7, Math.PI, 0); g.stroke(); }); g.globalAlpha = 1; }
    if (id === 'dusk') { for (let i = 0; i < 9; i++) { const x = 40 + i * 70, h = 40 + (i * 37) % 50; g.fillStyle = 'rgba(255,235,255,.35)'; g.beginPath(); g.moveTo(x, 150); g.lineTo(x + 10, 150 - h); g.lineTo(x + 20, 150); g.closePath(); g.fill(); } }
    if (id === 'meadow' || id === 'sunset') { for (let i = 0; i < 7; i++) { const x = 30 + i * 95, y = 125 + Math.sin(i * 1.9) * 12; g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); g.beginPath(); g.arc(x, y - 9, 4, 0, TAU); g.fill(); } }
    if (id === 'silver') { for (let i = 0; i < 16; i++) { const x = (i * 83) % STRIP, y = 20 + (i * 47) % 90; g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(x, y, 1.6 + (i % 3) * .6, 0, TAU); g.fill(); } }
    return c;
  }
  function cloudStrip(t) {
    const c = document.createElement('canvas'); c.width = STRIP; c.height = 160; const g = c.getContext('2d');
    for (let i = 0; i < 6; i++) {
      const x = 50 + i * 105 + (i % 2) * 20, y = 40 + ((i * 53) % 90), s = .8 + (i % 3) * .3; g.fillStyle = t.cloud;
      [[0, 0, 18], [18, 4, 14], [-18, 5, 13], [6, -8, 12]].forEach(p => { g.beginPath(); g.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, TAU); g.fill(); });
    }
    return c;
  }
  function scenery(id) {
    const t = THEMES[id] || THEMES.meadow; return { t, far: farStrip(t, id), cloud: cloudStrip(t) };
  }
  const flowers = [0, 1, 2].map(i => mk(18, 20, g => {
    const cols = [['#fff', '#ffe15a'], ['#ffd1ec', '#ff5fb4'], ['#e0c4ff', '#ffe15a']][i];
    g.strokeStyle = '#7ed68a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 9); g.lineTo(0, -1); g.stroke();
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; circ(g, Math.cos(a) * 4.5, -3 + Math.sin(a) * 4.5, 3.4, cols[0]); } circ(g, 0, -3, 2.6, cols[1]);
  }));

  // ---------- inline SVG pictures for the menus (stickers, level icons, hearts) ----------
  const SVG = {
    heart: '<svg viewBox="0 0 100 100"><path d="M50 88 C10 58 12 22 34 20 C44 19 50 28 50 34 C50 28 56 19 66 20 C88 22 90 58 50 88Z" fill="#ff5fb4" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><ellipse cx="34" cy="34" rx="7" ry="5" fill="#fff" opacity=".75"/></svg>',
    heartOff: '<svg viewBox="0 0 100 100"><path d="M50 88 C10 58 12 22 34 20 C44 19 50 28 50 34 C50 28 56 19 66 20 C88 22 90 58 50 88Z" fill="rgba(255,255,255,.25)" stroke="rgba(255,255,255,.7)" stroke-width="5" stroke-linejoin="round"/></svg>',
    gem: '<svg viewBox="0 0 100 100"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#9ae8ff"/><stop offset="1" stop-color="#3a8aff"/></linearGradient></defs><path d="M50 8 L84 36 L70 90 L30 90 L16 36Z" fill="url(#gg)" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M16 36 H84 M50 8 L40 36 L44 90" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/></svg>',
    star: '<svg viewBox="0 0 100 100"><path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36Z" fill="#ffe15a" stroke="#a35f00" stroke-width="5" stroke-linejoin="round"/></svg>',
    starOff: '<svg viewBox="0 0 100 100"><path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36Z" fill="rgba(60,0,70,.3)" stroke="rgba(255,255,255,.5)" stroke-width="5" stroke-linejoin="round"/></svg>',
    lock: '<svg viewBox="0 0 100 100"><rect x="22" y="44" width="56" height="44" rx="10" fill="#e8e8f5" stroke="#9a9ab0" stroke-width="5"/><path d="M34 44 V32 a16 16 0 0 1 32 0 V44" fill="none" stroke="#9a9ab0" stroke-width="8"/><circle cx="50" cy="66" r="6" fill="#9a9ab0"/></svg>',
    home: '<svg viewBox="0 0 100 100"><path d="M12 48 L50 14 L88 48 V88 H12Z" fill="#fff" stroke="#f5c542" stroke-width="6" stroke-linejoin="round"/><path d="M50 14 L12 48 H88Z" fill="#ff7ac8" stroke="#f5c542" stroke-width="6" stroke-linejoin="round"/><rect x="40" y="58" width="20" height="30" rx="4" fill="#ffb6dc"/></svg>',
    play: '<svg viewBox="0 0 100 100"><path d="M30 14 L86 50 L30 86Z" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 100 100"><rect x="22" y="16" width="20" height="68" rx="6" fill="#fff"/><rect x="58" y="16" width="20" height="68" rx="6" fill="#fff"/></svg>',
    redo: '<svg viewBox="0 0 100 100"><path d="M78 30 A34 34 0 1 0 84 56" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/><path d="M82 8 V34 H56Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/></svg>',
    map: '<svg viewBox="0 0 100 100"><circle cx="24" cy="70" r="12" fill="#fff"/><circle cx="50" cy="32" r="12" fill="#fff"/><circle cx="78" cy="64" r="12" fill="#fff"/><path d="M24 70 Q36 40 50 32 Q70 36 78 64" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="3 10" stroke-linecap="round"/></svg>',
    sound: '<svg viewBox="0 0 100 100"><path d="M14 38 H32 L56 16 V84 L32 62 H14Z" fill="#a35f9c" stroke="#a35f9c" stroke-width="5" stroke-linejoin="round"/><path d="M68 34 Q82 50 68 66 M78 22 Q100 50 78 78" fill="none" stroke="#a35f9c" stroke-width="7" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 100 100"><path d="M14 38 H32 L56 16 V84 L32 62 H14Z" fill="#a35f9c" stroke="#a35f9c" stroke-width="5" stroke-linejoin="round"/><path d="M68 36 L92 64 M92 36 L68 64" fill="none" stroke="#d6339f" stroke-width="8" stroke-linecap="round"/></svg>',
    plane: '<svg viewBox="0 0 120 120"><path d="M14 60 L110 28 L62 98 L54 70Z" fill="#fff" stroke="#c0c0d0" stroke-width="4" stroke-linejoin="round"/><path d="M54 70 L110 28 L44 76Z" fill="#ffb6dd" stroke="#e05aa8" stroke-width="3" stroke-linejoin="round"/></svg>',
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
  window.SKArt = { SS, STRIP, glimmer, bunny, jelly, snow, blockHeart, blockUsed, gems, gemBig, heartStar, rainbowPick, checkpointOff: checkpoint(false), checkpointOn: checkpoint(true), gate, puff,
    bossOk: bossFace(false), bossDizzy: bossFace(true), P, scenery, THEMES, flowers, SVG };
})();
