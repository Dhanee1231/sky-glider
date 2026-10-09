// All art is drawn in code: shapes, tiles, themes (backgrounds), the mascot and its outfits.
(function () {
  const Art = {};
  const TAU = Math.PI * 2;
  Art.PAL = { // tile palettes: [top, bottom, edge, emblem light, emblem dark]
    pinkgem: ['#ffd1ec', '#ff5fae', '#ffffff', '#ffe3f3', '#e0287f'],
    hearts: ['#ffc4dd', '#ff4f93', '#fff', '#ffe1ee', '#d61a6b'],
    stars: ['#fff2c4', '#f5b82e', '#fff', '#fff8dc', '#c98a00'],
    diamonds: ['#e3f6ff', '#8fd3ff', '#fff', '#ffffff', '#3d9be0'],
    bubbles: ['#f0e2ff', '#b98cff', '#fff', '#f6edff', '#7a49d6'],
    crowns: ['#fff0c9', '#e8a93a', '#fff', '#fff4d6', '#b07500'],
    mix: ['#ffd8f0', '#d58cff', '#fff', '#fff', '#a03cd0'],
    neon: ['#3a0b52', '#14002a', '#ff3df2', '#7dfcff', '#ff3df2'],
    candy: ['#c9fff0', '#7ce0c3', '#fff', '#fff', '#22a37f']
  };
  Art.SHAPE_OF = { pinkgem: 'heart', hearts: 'heart', stars: 'star', diamonds: 'diamond', bubbles: 'circle', crowns: 'crown', mix: null, neon: 'star', candy: 'circle' };
  Art.MIX = ['heart', 'star', 'diamond', 'circle', 'crown', 'gem'];
  Art.GLITTER = { pink: ['#ff8ccf', '#ffd6ee', '#ff4fa3'], gold: ['#ffd76a', '#fff3b0', '#e6a800'], silver: ['#ffffff', '#dfe6f0', '#b8c4d6'], rainbow: ['#ff6b9e', '#ffd166', '#7bed9f', '#70a1ff', '#c08cff'], lilac: ['#d9b8ff', '#f3e6ff', '#a66bff'], aqua: ['#8ff3ff', '#e0fdff', '#3ccfe0'], mint: ['#a6ffd8', '#e8fff4', '#36d69a'] };
  Art.FRAME = { none: null, silver: ['#ffffff', '#b9c3d1', '#eef2f7'], gold: ['#fff1b0', '#d4a017', '#fff8d6'], rosegold: ['#ffe0d6', '#d98a7a', '#fff0ea'], pearl: ['#ffffff', '#f2e6ff', '#ffffff'] };
  Art.path = (c, shape, x, y, s) => { // centred at x,y, size s (≈ diameter)
    const r = Math.abs(s) / 2; c.beginPath();
    if (shape === 'heart') { c.moveTo(x, y + r * 0.85); c.bezierCurveTo(x - r * 1.25, y + r * 0.05, x - r * 0.8, y - r * 1.0, x, y - r * 0.38); c.bezierCurveTo(x + r * 0.8, y - r * 1.0, x + r * 1.25, y + r * 0.05, x, y + r * 0.85); }
    else if (shape === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } }
    else if (shape === 'diamond') { c.moveTo(x, y - r); c.lineTo(x + r * 0.75, y); c.lineTo(x, y + r); c.lineTo(x - r * 0.75, y); }
    else if (shape === 'circle') c.arc(x, y, r * 0.8, 0, TAU);
    else if (shape === 'crown') { const w = r * 1.05, h = r * 0.75; c.moveTo(x - w, y + h); c.lineTo(x - w, y - h * 0.5); c.lineTo(x - w * 0.5, y + h * 0.05); c.lineTo(x, y - h); c.lineTo(x + w * 0.5, y + h * 0.05); c.lineTo(x + w, y - h * 0.5); c.lineTo(x + w, y + h); }
    else { /* gem: brilliant cut */ c.moveTo(x - r * 0.55, y - r * 0.6); c.lineTo(x + r * 0.55, y - r * 0.6); c.lineTo(x + r * 0.95, y - r * 0.15); c.lineTo(x, y + r * 0.9); c.lineTo(x - r * 0.95, y - r * 0.15); }
    c.closePath();
  };
  Art.gem = (c, shape, x, y, s, light, dark, glow) => { // a shiny faceted shape
    c.save(); if (glow) { c.shadowColor = glow; c.shadowBlur = s * 0.35; }
    const g = c.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2); g.addColorStop(0, light); g.addColorStop(0.55, dark); g.addColorStop(1, light);
    Art.path(c, shape, x, y, s); c.fillStyle = g; c.fill(); c.shadowBlur = 0;
    c.lineWidth = Math.max(1, s * 0.05); c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke();
    c.clip(); c.globalAlpha = 0.55; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - s * 0.18, y - s * 0.22, s * 0.22, s * 0.11, -0.6, 0, TAU); c.fill(); // highlight
    c.globalAlpha = 0.18; c.beginPath(); c.moveTo(x - s, y + s * 0.1); c.lineTo(x + s, y - s * 0.1); c.lineTo(x + s, y + s); c.lineTo(x - s, y + s); c.fill(); c.restore();
  };
  Art.sparkle = (c, x, y, s, col, a = 1) => { c.save(); c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill(); c.restore(); };
  const rr = (c, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  Art.rr = rr;
  // tile: x,y top-left; hold = progress of hold [0..1] or null
  Art.tile = (c, o) => {
    const { x, y, w, h, skin, glitter, frame, shape, t, seed, hold, held, dim } = o, P = Art.PAL[skin] || Art.PAL.pinkgem, GL = Art.GLITTER[glitter] || Art.GLITTER.pink, F = Art.FRAME[frame];
    c.save(); if (dim) c.globalAlpha = 0.35;
    const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, P[0]); g.addColorStop(1, P[1]);
    rr(c, x, y, w, h, Math.min(w, h) * 0.22); c.fillStyle = g; c.shadowColor = P[1]; c.shadowBlur = 14; c.fill(); c.shadowBlur = 0;
    // glass sheen
    c.save(); c.clip(); c.globalAlpha = 0.35; c.fillStyle = '#fff'; c.fillRect(x + w * 0.08, y + 4, w * 0.18, h - 8); c.globalAlpha = 0.18; c.fillRect(x + w * 0.3, y + 4, w * 0.06, h - 8);
    if (hold != null) { const ph = h * hold; const hg = c.createLinearGradient(0, y + h - ph, 0, y + h); hg.addColorStop(0, 'rgba(255,255,255,.2)'); hg.addColorStop(1, 'rgba(255,255,255,.75)'); c.globalAlpha = 1; c.fillStyle = hg; c.fillRect(x, y + h - ph, w, ph); }
    // glitter specks
    const n = Math.min(40, Math.round(w * h / 900)); let s = seed * 9301 + 49297;
    for (let i = 0; i < n; i++) { s = (s * 9301 + 49297) % 233280; const px = x + (s / 233280) * w; s = (s * 9301 + 49297) % 233280; const py = y + (s / 233280) * h;
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7 + seed); c.globalAlpha = 0.35 + 0.65 * tw; c.fillStyle = GL[i % GL.length];
      if (i % 5 === 0) Art.sparkle(c, px, py, 2 + 3 * tw, GL[i % GL.length], 0.4 + 0.6 * tw); else { c.beginPath(); c.arc(px, py, 1 + tw * 1.2, 0, TAU); c.fill(); } }
    c.restore();
    // frame
    if (F) { const fg = c.createLinearGradient(x, y, x + w, y + h); fg.addColorStop(0, F[0]); fg.addColorStop(0.5, F[1]); fg.addColorStop(1, F[2]); rr(c, x + 1.5, y + 1.5, w - 3, h - 3, Math.min(w, h) * 0.2); c.lineWidth = 4; c.strokeStyle = fg; c.stroke(); }
    else { rr(c, x + 1, y + 1, w - 2, h - 2, Math.min(w, h) * 0.2); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke(); }
    // emblem (the shape gem), at the bottom for holds
    const es = Math.min(w * 0.62, h * 0.7, 90), ey = hold != null ? y + h - Math.min(h, w) * 0.5 : y + h / 2;
    Art.gem(c, shape || 'heart', x + w / 2, ey, es * (held ? 1.12 : 1), P[3], P[4], held ? '#fff' : null);
    if (hold != null && h > w * 1.3) { c.globalAlpha = 0.9; for (let k = 1; k < 4; k++) Art.sparkle(c, x + w / 2, ey - es * 0.4 - k * (h - es) / 4.2, 4 + 2 * Math.sin(t * 5 + k), GL[k % GL.length]); }
    c.restore();
  };
  // ---------- themes ----------
  Art.THEMES = {
    pinkgold: { name: 'Pink & Gold Sparkle', sky: ['#ffd6ec', '#ff9fd0', '#ffcf8a'], glitter: 'gold', ui: '#ff4fa3' },
    moon: { name: 'Moonlight Pastel', sky: ['#2b2d6e', '#6e5aa8', '#f0b8d8'], glitter: 'silver', ui: '#9d86ff' },
    disco: { name: 'Neon Disco Party', sky: ['#14002a', '#3a0b6b', '#ff2fa8'], glitter: 'rainbow', ui: '#ff3df2' },
    festival: { name: 'Bollywood Festival', sky: ['#7a1022', '#d2462a', '#ffb02e'], glitter: 'gold', ui: '#ff8a00' },
    ocean: { name: 'Ocean Dream', sky: ['#043b6e', '#1287b8', '#7ef0e6'], glitter: 'aqua', ui: '#1fb6d6' },
    galaxy: { name: 'Galaxy Glitter', sky: ['#05021a', '#2a0c5c', '#b5379a'], glitter: 'lilac', ui: '#a66bff' },
    candy: { name: 'Candy Land', sky: ['#fff0f8', '#ffc6e5', '#c9f6ff'], glitter: 'rainbow', ui: '#ff6fb5' },
    rainbow: { name: 'Rainbow Sky', sky: ['#9fe2ff', '#d6f3ff', '#fff4fb'], glitter: 'rainbow', ui: '#5bb8ff' }
  };
  // suggest a theme from tempo/energy (custom songs)
  Art.suggestTheme = (bpm, energy) => bpm < 90 ? (energy > 0.55 ? 'ocean' : 'moon') : bpm < 118 ? 'pinkgold' : bpm < 135 && energy < 0.5 ? 'galaxy' : 'disco';
  const rnd = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  // t = seconds, beat = fractional beat count (drives pulses), W,H canvas size
  Art.bg = (c, theme, W, H, t, beat, energy = 0.5) => {
    const T = Art.THEMES[theme] || Art.THEMES.pinkgold, ph = beat % 1, pulse = Math.pow(1 - ph, 3);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, T.sky[0]); g.addColorStop(0.6, T.sky[1]); g.addColorStop(1, T.sky[2]); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const GL = Art.GLITTER[T.glitter];
    if (theme === 'galaxy' || theme === 'moon') {
      for (let i = 0; i < 90; i++) { const x = rnd(i, 1) * W, y = rnd(i, 2) * H, tw = 0.5 + 0.5 * Math.sin(t * 2 + i); Art.sparkle(c, x, y, 1 + 2.5 * tw * rnd(i, 3), i % 7 ? '#fff' : GL[i % GL.length], 0.3 + 0.7 * tw); }
      if (theme === 'moon') { c.save(); c.shadowColor = '#fff6d8'; c.shadowBlur = 40 + 20 * pulse; c.fillStyle = '#fff6e0'; c.beginPath(); c.arc(W * 0.78, H * 0.16, Math.min(W, H) * 0.08, 0, TAU); c.fill(); c.restore();
        for (let i = 0; i < 4; i++) { const x = ((t * 8 * (i + 1) + i * 200) % (W + 300)) - 150, y = H * (0.3 + i * 0.15); c.fillStyle = 'rgba(255,230,250,.18)'; c.beginPath(); c.ellipse(x, y, 110, 26, 0, 0, TAU); c.ellipse(x + 50, y - 14, 60, 24, 0, 0, TAU); c.fill(); } }
      else { const ng = c.createRadialGradient(W * 0.3, H * 0.4, 10, W * 0.3, H * 0.4, W * 0.7); ng.addColorStop(0, 'rgba(255,100,200,' + (0.25 + 0.15 * pulse) + ')'); ng.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = ng; c.fillRect(0, 0, W, H);
        c.fillStyle = '#ffb3e6'; c.beginPath(); c.arc(W * 0.82, H * 0.22, 26, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.beginPath(); c.ellipse(W * 0.82, H * 0.22, 44, 10, -0.3, 0, TAU); c.stroke(); }
    } else if (theme === 'disco') {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const a = Math.sin(t * 0.9 + i * 1.3) * 0.6 + Math.PI / 2, cx = W * (0.1 + i * 0.2); const lg = c.createLinearGradient(cx, 0, cx + Math.cos(a) * H, Math.sin(a) * H);
        const col = ['#ff3df2', '#3dfcff', '#ffe23d', '#7dff6b', '#a66bff'][i]; lg.addColorStop(0, col + 'aa'); lg.addColorStop(1, col + '00'); c.fillStyle = lg; c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx + Math.cos(a - 0.12) * H * 1.2, Math.sin(a - 0.12) * H * 1.2); c.lineTo(cx + Math.cos(a + 0.12) * H * 1.2, Math.sin(a + 0.12) * H * 1.2); c.fill(); }
      c.restore();
      c.strokeStyle = 'rgba(255,61,242,' + (0.25 + 0.5 * pulse) + ')'; c.lineWidth = 2; const hz = H * 0.62; // neon floor grid
      for (let i = -10; i <= 10; i++) { c.beginPath(); c.moveTo(W / 2 + i * 20, hz); c.lineTo(W / 2 + i * 160, H); c.stroke(); }
      for (let k = 0; k < 8; k++) { const y = hz + Math.pow(((k + (beat % 1)) / 8), 2) * (H - hz); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      const bx = W / 2, by = H * 0.1, br = Math.min(W, H) * 0.06; c.fillStyle = '#ccd'; c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill(); // disco ball
      for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + t; Art.sparkle(c, bx + Math.cos(a) * br * 0.7, by + Math.sin(a) * br * 0.7, 3, ['#fff', '#ff3df2', '#3dfcff'][i % 3], 0.5 + 0.5 * Math.sin(t * 8 + i)); }
    } else if (theme === 'festival') {
      // rangoli (rotating, pulsing with the beat)
      c.save(); c.translate(W / 2, H * 0.45); c.rotate(t * 0.15); const R = Math.min(W, H) * (0.32 + 0.02 * pulse); c.globalAlpha = 0.35;
      ['#ffd23f', '#ff5e7e', '#ff9f1c', '#2ec4b6', '#fff'].forEach((col, k) => { c.fillStyle = col; const rk = R * (1 - k * 0.18), petals = 8 + k * 4;
        for (let i = 0; i < petals; i++) { c.save(); c.rotate(i / petals * TAU); c.beginPath(); c.ellipse(rk * 0.6, 0, rk * 0.35, rk * 0.11, 0, 0, TAU); c.fill(); c.restore(); } });
      c.restore();
      // marigold garlands
      for (let gi = 0; gi < 2; gi++) for (let i = 0; i <= 26; i++) { const u = i / 26, x = u * W, y = 18 + gi * 18 + Math.sin(u * Math.PI) * (40 + gi * 20) + Math.sin(t * 2 + i) * 2;
        c.fillStyle = i % 2 ? '#ff9f1c' : '#ffcf33'; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill(); c.fillStyle = 'rgba(200,80,0,.5)'; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); }
      // diyas along the bottom
      const nd = Math.max(4, Math.round(W / 90)); for (let i = 0; i < nd; i++) { const x = (i + 0.5) * W / nd, y = H - 26;
        c.fillStyle = '#b5541c'; c.beginPath(); c.ellipse(x, y, 22, 10, 0, 0, Math.PI); c.fill(); const fl = 1 + 0.15 * Math.sin(t * 13 + i * 2) + 0.2 * pulse;
        const fg = c.createRadialGradient(x, y - 14, 1, x, y - 14, 20 * fl); fg.addColorStop(0, '#fff6c0'); fg.addColorStop(0.4, '#ffb000'); fg.addColorStop(1, 'rgba(255,120,0,0)'); c.fillStyle = fg; c.beginPath(); c.ellipse(x, y - 14, 7 * fl, 16 * fl, 0, 0, TAU); c.fill(); }
    } else if (theme === 'ocean') {
      for (let k = 0; k < 3; k++) { c.fillStyle = `rgba(255,255,255,${0.06 + k * 0.03})`; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 20) c.lineTo(x, H * (0.55 + k * 0.12) + Math.sin(x / 70 + t * (1 + k * 0.3) + beat * 0.5) * 14); c.lineTo(W, H); c.fill(); }
      for (let i = 0; i < 34; i++) { const sp = 20 + rnd(i, 1) * 40, x = rnd(i, 2) * W + Math.sin(t + i) * 10, y = H - ((t * sp + rnd(i, 3) * H) % (H + 40)), r = 3 + rnd(i, 4) * 9;
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, TAU); c.fill(); }
    } else if (theme === 'candy' || theme === 'rainbow') {
      if (theme === 'rainbow') ['#ff6b9e', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'].forEach((col, k) => { c.strokeStyle = col; c.globalAlpha = 0.45; c.lineWidth = 16; c.beginPath(); c.arc(W / 2, H * 0.75, Math.max(4, Math.min(W, H) * 0.55 - k * 16), Math.PI, TAU); c.stroke(); c.globalAlpha = 1; });
      for (let i = 0; i < 14; i++) { const x = rnd(i, 1) * W, y = ((rnd(i, 2) * H + t * (15 + rnd(i, 3) * 20)) % (H + 80)) - 40, s = 22 + rnd(i, 4) * 22;
        c.save(); c.translate(x, y); c.rotate(t * 0.5 + i); if (theme === 'candy') { c.fillStyle = ['#ff8cc6', '#8fe3ff', '#ffe066', '#b4f8c8'][i % 4]; c.beginPath(); c.arc(0, 0, s / 2, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, s / 3.2, 0, 4); c.stroke(); }
        else { c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(0, 0, s / 2, 0, TAU); c.arc(s / 2, 4, s / 2.6, 0, TAU); c.arc(-s / 2, 4, s / 2.6, 0, TAU); c.fill(); } c.restore(); }
    } else { // pinkgold: floating heart gems + falling gold glitter
      for (let i = 0; i < 10; i++) { const x = rnd(i, 1) * W, y = H - ((t * (12 + rnd(i, 2) * 18) + rnd(i, 3) * H) % (H + 80)) + 40, s = 18 + rnd(i, 4) * 26;
        Art.gem(c, i % 3 ? 'heart' : 'diamond', x + Math.sin(t + i) * 12, y, s * (1 + 0.08 * pulse), '#ffe3f3', i % 2 ? '#ff5fae' : '#f0b84a'); }
    }
    // shared glitter rain, speed tied to tempo via beat
    for (let i = 0; i < 46; i++) { const x = rnd(i, 7) * W + Math.sin(beat * 0.8 + i) * 8, y = ((rnd(i, 8) * H + beat * (24 + rnd(i, 9) * 30) * (0.6 + energy)) % (H + 20)) - 10;
      Art.sparkle(c, x, y, 1.5 + 2.5 * rnd(i, 5), GL[i % GL.length], 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 5 + i))); }
    if (pulse > 0.01 && theme !== 'candy' && theme !== 'rainbow') { c.fillStyle = `rgba(255,255,255,${0.05 * pulse})`; c.fillRect(0, 0, W, H); }
  };
  // ---------- mascot: Gigi the gem kitty ----------
  Art.mascot = (c, x, y, s, mood, outfit, t) => {
    const bob = Math.sin(t * 4) * s * 0.03 + (mood === 'wow' ? -Math.abs(Math.sin(t * 12)) * s * 0.08 : 0); y += bob;
    c.save(); c.translate(x, y); const sq = mood === 'oops' ? 1 + 0.05 * Math.sin(t * 20) : 1; c.scale(sq, 1 / sq);
    const body = c.createRadialGradient(-s * 0.15, -s * 0.2, s * 0.05, 0, 0, s * 0.55); body.addColorStop(0, '#fff0f8'); body.addColorStop(1, '#ff8cc6');
    c.fillStyle = '#ff8cc6'; [[-1], [1]].forEach(([k]) => { c.beginPath(); c.moveTo(k * s * 0.38, -s * 0.18); c.lineTo(k * s * 0.32, -s * 0.58); c.lineTo(k * s * 0.08, -s * 0.38); c.fill(); });
    c.fillStyle = body; c.beginPath(); c.ellipse(0, 0, s * 0.48, s * 0.42, 0, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = s * 0.03; c.stroke();
    // eyes
    const ey = -s * 0.05; c.fillStyle = '#4a1942';
    if (mood === 'happy') { c.lineWidth = s * 0.04; c.strokeStyle = '#4a1942'; [-1, 1].forEach(k => { c.beginPath(); c.arc(k * s * 0.17, ey + s * 0.03, s * 0.07, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }); }
    else if (mood === 'wow') [-1, 1].forEach(k => Art.gem(c, 'star', k * s * 0.17, ey, s * 0.2, '#fff8c0', '#f5b82e'));
    else [-1, 1].forEach(k => { c.fillStyle = '#4a1942'; c.beginPath(); c.ellipse(k * s * 0.17, ey, s * 0.07, s * 0.09, 0, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(k * s * 0.17 - s * 0.02, ey - s * 0.03, s * 0.025, 0, TAU); c.fill(); });
    c.fillStyle = 'rgba(255,90,150,.45)'; [-1, 1].forEach(k => { c.beginPath(); c.ellipse(k * s * 0.3, s * 0.1, s * 0.07, s * 0.04, 0, 0, TAU); c.fill(); });
    c.strokeStyle = '#4a1942'; c.lineWidth = s * 0.03; c.beginPath();
    if (mood === 'oops') { c.arc(0, s * 0.15, s * 0.05, 0, TAU); } else { c.arc(-s * 0.04, s * 0.1, s * 0.04, 0, Math.PI); c.arc(s * 0.04, s * 0.1, s * 0.04, 0, Math.PI); } c.stroke();
    Art.gem(c, 'heart', 0, s * 0.3, s * 0.16, '#ffe3f3', '#e0287f'); // heart gem collar
    // outfits
    if (outfit === 'tiara') { Art.gem(c, 'crown', 0, -s * 0.45, s * 0.34, '#ffffff', '#b9c3d1'); Art.gem(c, 'heart', 0, -s * 0.47, s * 0.1, '#ffe3f3', '#ff4fa3'); }
    if (outfit === 'crown') Art.gem(c, 'crown', 0, -s * 0.5, s * 0.46, '#fff4d6', '#d4a017', '#ffd76a');
    if (outfit === 'bow') { c.fillStyle = '#ff2f8e'; c.beginPath(); c.ellipse(s * 0.22, -s * 0.38, s * 0.12, s * 0.07, 0.5, 0, TAU); c.ellipse(s * 0.38, -s * 0.3, s * 0.12, s * 0.07, 0.5, 0, TAU); c.fill(); c.fillStyle = '#ffd76a'; c.beginPath(); c.arc(s * 0.3, -s * 0.34, s * 0.04, 0, TAU); c.fill(); }
    if (outfit === 'glasses') [-1, 1].forEach(k => Art.gem(c, 'star', k * s * 0.17, ey, s * 0.25, '#fff', '#ff4fa3'));
    if (outfit === 'garland') for (let i = 0; i < 11; i++) { const a = Math.PI * 0.15 + i / 10 * Math.PI * 0.7; c.fillStyle = i % 2 ? '#ff9f1c' : '#ffcf33'; c.beginPath(); c.arc(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.25 + s * 0.12, s * 0.05, 0, TAU); c.fill(); }
    if (outfit === 'headphones') { c.strokeStyle = '#7a49d6'; c.lineWidth = s * 0.06; c.beginPath(); c.arc(0, -s * 0.05, s * 0.48, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); [-1, 1].forEach(k => { c.fillStyle = '#b98cff'; c.beginPath(); c.ellipse(k * s * 0.47, -s * 0.02, s * 0.08, s * 0.13, 0, 0, TAU); c.fill(); }); }
    if (outfit === 'wizard') { c.fillStyle = '#5b3cc4'; c.beginPath(); c.moveTo(-s * 0.3, -s * 0.33); c.lineTo(s * 0.05, -s * 0.95); c.lineTo(s * 0.3, -s * 0.33); c.fill(); for (let i = 0; i < 3; i++) Art.sparkle(c, -s * 0.05 + i * s * 0.08, -s * 0.5 - i * s * 0.12, s * 0.05, '#ffd76a'); }
    if (outfit === 'bindi') Art.gem(c, 'diamond', 0, -s * 0.2, s * 0.08, '#ffb3c6', '#d6005b');
    c.restore();
  };
  window.Art = Art;
})();
// ================= v2: sprite caches + fast backgrounds (no per-frame gradients / shadowBlur) =================
(function () {
  const Art = window.Art, TAU = Math.PI * 2, cache = new Map();
  const mk = (w, h) => { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h)); return cv; };
  Art.spr = (key, w, h, fn) => { let s = cache.get(key); if (!s) { s = mk(w, h); fn(s.getContext('2d'), s.width, s.height); cache.set(key, s); if (cache.size > 400) cache.delete(cache.keys().next().value); } return s; };
  Art.clearCache = () => cache.clear();
  const slowBg = Art.bg;
  Art.sparkleImg = col => Art.spr('sp|' + col, 32, 32, (c) => { c.shadowColor = col; c.shadowBlur = 4; Art.sparkle(c, 16, 16, 12, col, 1); });
  Art.spark = (c, x, y, s, col, a) => { if (s < 0.5 || a <= 0.02) return; c.globalAlpha = a > 1 ? 1 : a; c.drawImage(Art.sparkleImg(col), x - s * 1.33, y - s * 1.33, s * 2.67, s * 2.67); c.globalAlpha = 1; };
  Art.gemImg = (shape, light, dark, s, glow) => { const b = Math.max(8, Math.round(s / 8) * 8); return Art.spr(`g|${shape}|${light}|${dark}|${b}|${glow || ''}`, b * 1.6, b * 1.6, c => Art.gem(c, shape, b * 0.8, b * 0.8, b, light, dark, glow)); };
  Art.gemFast = (c, shape, x, y, s, light, dark, glow) => { const im = Art.gemImg(shape, light, dark, s, glow), k = s / (im.width / 1.6); c.drawImage(im, x - im.width * k / 2, y - im.height * k / 2, im.width * k, im.height * k); };
  // a full tile (no hold) pre-rendered at a size bucket
  Art.tileImg = (skin, glitter, frame, shape, w, h) => { const bw = Math.round(w / 4) * 4, bh = Math.round(h / 4) * 4;
    return Art.spr(`t|${skin}|${glitter}|${frame}|${shape}|${bw}|${bh}`, bw + 24, bh + 24, c => { c.translate(12, 12); Art.tile(c, { x: 0, y: 0, w: bw, h: bh, skin, glitter, frame, shape, t: 0.3, seed: 7 }); }); };
  Art.glowImg = col => Art.spr('glow|' + col, 128, 128, c => { const g = c.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, col); g.addColorStop(0.35, col + '88'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  const rnd = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  // static layer per theme+size (sky + things that don't move)
  const staticLayer = (theme, W, H) => Art.spr(`bg|${theme}|${W}|${H}`, W, H, c => {
    const T = Art.THEMES[theme] || Art.THEMES.pinkgold, g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, T.sky[0]); g.addColorStop(0.6, T.sky[1]); g.addColorStop(1, T.sky[2]); c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (theme === 'galaxy' || theme === 'moon') for (let i = 0; i < 70; i++) Art.sparkle(c, rnd(i, 1) * W, rnd(i, 2) * H, 1 + 2 * rnd(i, 3), '#fff', 0.5 + 0.5 * rnd(i, 4));
    if (theme === 'galaxy') { const ng = c.createRadialGradient(W * 0.3, H * 0.4, 10, W * 0.3, H * 0.4, W * 0.7); ng.addColorStop(0, 'rgba(255,100,200,.3)'); ng.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = ng; c.fillRect(0, 0, W, H);
      c.fillStyle = '#ffb3e6'; c.beginPath(); c.arc(W * 0.82, H * 0.22, 26, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.beginPath(); c.ellipse(W * 0.82, H * 0.22, 44, 10, -0.3, 0, TAU); c.stroke(); }
    if (theme === 'moon') { c.shadowColor = '#fff6d8'; c.shadowBlur = 50; c.fillStyle = '#fff6e0'; c.beginPath(); c.arc(W * 0.78, H * 0.16, Math.min(W, H) * 0.08, 0, TAU); c.fill(); c.shadowBlur = 0; }
    if (theme === 'rainbow') ['#ff6b9e', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'].forEach((col, k) => { c.strokeStyle = col; c.globalAlpha = 0.45; c.lineWidth = 16; c.beginPath(); c.arc(W / 2, H * 0.75, Math.max(4, Math.min(W, H) * 0.55 - k * 16), Math.PI, TAU); c.stroke(); c.globalAlpha = 1; });
    if (theme === 'disco') { c.strokeStyle = 'rgba(255,61,242,.35)'; c.lineWidth = 2; const hz = H * 0.62; for (let i = -10; i <= 10; i++) { c.beginPath(); c.moveTo(W / 2 + i * 20, hz); c.lineTo(W / 2 + i * 160, H); c.stroke(); } }
    if (theme === 'festival') { for (let gi = 0; gi < 2; gi++) for (let i = 0; i <= 26; i++) { const u = i / 26, x = u * W, y = 18 + gi * 18 + Math.sin(u * Math.PI) * (40 + gi * 20); c.fillStyle = i % 2 ? '#ff9f1c' : '#ffcf33'; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill(); c.fillStyle = 'rgba(200,80,0,.5)'; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); }
      const nd = Math.max(4, Math.round(W / 90)); for (let i = 0; i < nd; i++) { const x = (i + 0.5) * W / nd, y = H - 26; c.fillStyle = '#b5541c'; c.beginPath(); c.ellipse(x, y, 22, 10, 0, 0, Math.PI); c.fill(); } }
  });
  const rangoli = R => Art.spr('rangoli|' + Math.round(R), R * 2, R * 2, c => { c.translate(R, R); c.globalAlpha = 0.35;
    ['#ffd23f', '#ff5e7e', '#ff9f1c', '#2ec4b6', '#fff'].forEach((col, k) => { c.fillStyle = col; const rk = R * (1 - k * 0.18), petals = 8 + k * 4; for (let i = 0; i < petals; i++) { c.save(); c.rotate(i / petals * TAU); c.beginPath(); c.ellipse(rk * 0.6, 0, rk * 0.35, rk * 0.11, 0, 0, TAU); c.fill(); c.restore(); } }); });
  const flame = () => Art.spr('flame', 40, 60, c => { const fg = c.createRadialGradient(20, 34, 1, 20, 34, 26); fg.addColorStop(0, '#fff6c0'); fg.addColorStop(0.4, '#ffb000'); fg.addColorStop(1, 'rgba(255,120,0,0)'); c.fillStyle = fg; c.beginPath(); c.ellipse(20, 32, 10, 24, 0, 0, TAU); c.fill(); });
  const beam = col => Art.spr('beam|' + col, 120, 600, c => { const lg = c.createLinearGradient(0, 0, 0, 600); lg.addColorStop(0, col + 'aa'); lg.addColorStop(1, col + '00'); c.fillStyle = lg; c.beginPath(); c.moveTo(60, 0); c.lineTo(0, 600); c.lineTo(120, 600); c.fill(); });
  const bubble = () => Art.spr('bubble', 40, 40, c => { c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(20, 20, 17, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(14, 14, 4, 0, TAU); c.fill(); });
  const candy = i => Art.spr('candy|' + i, 48, 48, c => { c.fillStyle = ['#ff8cc6', '#8fe3ff', '#ffe066', '#b4f8c8'][i]; c.beginPath(); c.arc(24, 24, 22, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(24, 24, 14, 0, 4); c.stroke(); });
  const cloud = () => Art.spr('cloud', 120, 60, c => { c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(60, 32, 24, 0, TAU); c.arc(84, 38, 18, 0, TAU); c.arc(36, 38, 18, 0, TAU); c.fill(); });
  // one device-resolution layer = sky + static decor (+ rangoli) + caller's extra (the highway): a single full-screen blit per frame
  Art.scene = (theme, W, H, dpr, key, extra) => Art.spr(`scene|${theme}|${W}|${H}|${dpr.toFixed(2)}|${key}`, W * dpr, H * dpr, (c) => { c.scale(dpr, dpr); c.drawImage(staticLayer(theme, Math.round(W), Math.round(H)), 0, 0, W, H);
    if (theme === 'festival') { const R = Math.round(Math.min(W, H) * 0.34); c.drawImage(rangoli(R), W / 2 - R, H * 0.45 - R); } if (extra) extra(c); });
  Art.bg = (c, theme, W, H, t, beat, energy = 0.5, lite) => {
    W = Math.round(W); H = Math.round(H); const T = Art.THEMES[theme] || Art.THEMES.pinkgold, GL = Art.GLITTER[T.glitter], pulse = Math.pow(1 - (beat % 1 + 1) % 1, 3);
    if (!lite) c.drawImage(staticLayer(theme, W, H), 0, 0, W, H);
    if (theme === 'galaxy' || theme === 'moon') { for (let i = 0; i < 16; i++) Art.spark(c, rnd(i, 11) * W, rnd(i, 12) * H, 2 + 3 * rnd(i, 13), i % 3 ? '#ffffff' : GL[i % GL.length], 0.5 + 0.5 * Math.sin(t * 2.5 + i)); }
    else if (theme === 'disco') { for (let i = 0; i < (lite ? 2 : 4); i++) { const a = Math.sin(t * 0.9 + i * 1.3) * 0.6, cx = W * (0.15 + i * 0.23); c.save(); c.translate(cx, 0); c.rotate(a); c.globalAlpha = 0.5 + 0.3 * pulse; c.drawImage(beam(['#ff3df2', '#3dfcff', '#ffe23d', '#a66bff'][i]), -H * 0.12, 0, H * 0.24, H * 1.1); c.restore(); } c.globalAlpha = 1;
      c.strokeStyle = 'rgba(255,61,242,' + (0.25 + 0.5 * pulse).toFixed(2) + ')'; c.lineWidth = 2; const hz = H * 0.62; c.beginPath(); for (let k = 0; k < 8; k++) { const y = hz + Math.pow((k + (beat % 1)) / 8, 2) * (H - hz); c.moveTo(0, y); c.lineTo(W, y); } c.stroke(); }
    else if (theme === 'festival') { if (!lite) { const R = Math.round(Math.min(W, H) * 0.34), im = rangoli(R), sc = 1 + 0.04 * pulse; c.save(); c.translate(W / 2, H * 0.45); c.rotate(t * 0.15); c.scale(sc, sc); c.drawImage(im, -R, -R); c.restore(); }
      const nd = Math.max(4, Math.round(W / 90)), fl = flame(); for (let i = 0; i < nd; i++) { const k = 1 + 0.15 * Math.sin(t * 13 + i * 2) + 0.2 * pulse, x = (i + 0.5) * W / nd; c.drawImage(fl, x - 20 * k, H - 26 - 50 * k, 40 * k, 60 * k); } }
    else if (theme === 'ocean') { c.fillStyle = 'rgba(255,255,255,.08)'; for (let k = 0; k < 2; k++) { c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 32) c.lineTo(x, H * (0.6 + k * 0.14) + Math.sin(x / 70 + t * (1 + k * 0.3) + beat * 0.5) * 14); c.lineTo(W, H); c.fill(); }
      const b = bubble(); for (let i = 0; i < 18; i++) { const sp = 20 + rnd(i, 1) * 40, r = 6 + rnd(i, 4) * 16, x = rnd(i, 2) * W + Math.sin(t + i) * 10, y = H - ((t * sp + rnd(i, 3) * H) % (H + 40)); c.drawImage(b, x - r, y - r, r * 2, r * 2); } }
    else if (theme === 'candy' || theme === 'rainbow') { for (let i = 0; i < 9; i++) { const x = rnd(i, 1) * W, y = ((rnd(i, 2) * H + t * (15 + rnd(i, 3) * 20)) % (H + 80)) - 40, s = 26 + rnd(i, 4) * 22;
        if (theme === 'candy') { c.save(); c.translate(x, y); c.rotate(t * 0.5 + i); c.drawImage(candy(i % 4), -s / 2, -s / 2, s, s); c.restore(); } else c.drawImage(cloud(), x - s, y - s / 2, s * 2, s); } }
    else { for (let i = 0; i < 8; i++) { const x = rnd(i, 1) * W, y = H - ((t * (12 + rnd(i, 2) * 18) + rnd(i, 3) * H) % (H + 80)) + 40, s = 18 + rnd(i, 4) * 26; Art.gemFast(c, i % 3 ? 'heart' : 'diamond', x + Math.sin(t + i) * 12, y, s * (1 + 0.08 * pulse), '#ffe3f3', i % 2 ? '#ff5fae' : '#f0b84a'); } }
    const n = lite ? 14 : 26; for (let i = 0; i < n; i++) { const x = rnd(i, 7) * W + Math.sin(beat * 0.8 + i) * 8, y = ((rnd(i, 8) * H + beat * (24 + rnd(i, 9) * 30) * (0.6 + energy)) % (H + 20)) - 10; Art.spark(c, x, y, 2 + 3 * rnd(i, 5), GL[i % GL.length], 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 5 + i))); }
  };
  Art.bgSlow = slowBg;
  // mascot sprite (per mood/outfit); animation is just transforms
  Art.mascotFast = (c, x, y, s, mood, outfit, t) => { const b = Math.round(s / 8) * 8 || 8, im = Art.spr(`m|${mood}|${outfit}|${b}`, b * 1.4, b * 1.6, cc => Art.mascot(cc, b * 0.7, b * 0.95, b, mood, outfit, 0)), k = s / b;
    const bob = Math.sin(t * 4) * s * 0.03 + (mood === 'wow' ? -Math.abs(Math.sin(t * 12)) * s * 0.08 : 0), sq = mood === 'oops' ? 1 + 0.05 * Math.sin(t * 20) : 1;
    c.save(); c.translate(x, y + bob); c.scale(sq * k, k / sq); c.drawImage(im, -b * 0.7, -b * 0.95); c.restore(); };
})();
