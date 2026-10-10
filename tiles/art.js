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
  // colour helpers (hex #rgb/#rrggbb only; anything else passes through untouched)
  const hex = s => { if (typeof s !== 'string' || s[0] !== '#') return null; let h = s.slice(1); if (h.length === 3) h = h.replace(/./g, m => m + m); if (h.length < 6) return null; const n = parseInt(h.slice(0, 6), 16); return isNaN(n) ? null : [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mixc = (a, b, k, al = 1) => { const A = hex(a), B = hex(b); if (!A || !B) return a; const m = i => Math.round(A[i] + (B[i] - A[i]) * k); return `rgba(${m(0)},${m(1)},${m(2)},${al})`; };
  const rgba = (a, al) => mixc(a, a, 0, al);
  Art.mixc = mixc; Art.rgba = rgba;
  // tile: x,y top-left; hold = progress of hold [0..1] or null.  v3: a bevelled, faceted gem (table + 4 bevels + specular streak + inner rim)
  Art.tile = (c, o) => {
    const { x, y, w, h, skin, glitter, frame, shape, t = 0, seed = 1, hold, held, dim } = o, P = Art.PAL[skin] || Art.PAL.pinkgem, GL = Art.GLITTER[glitter] || Art.GLITTER.pink, F = Art.FRAME[frame];
    const A = dim ? 0.35 : 1, m = Math.min(w, h), R = m * 0.22, b = Math.max(3, Math.min(m * 0.15, 26)), dark = (hex(P[1]) || [0, 0, 0]).reduce((s, v) => s + v, 0) < 200;
    const tx = x + b, ty = y + b, tw = w - 2 * b, th = h - 2 * b, tr = Math.max(2, R - b * 0.8);
    c.save(); c.globalAlpha = A;
    // body + soft coloured drop glow
    rr(c, x, y, w, h, R); c.fillStyle = P[1]; c.shadowColor = P[1]; c.shadowBlur = 14; c.fill(); c.shadowBlur = 0;
    c.save(); rr(c, x, y, w, h, R); c.clip();
    // 4 bevel trapezoids (outer edge -> table edge)
    const bev = (pts, col) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fillStyle = col; c.fill(); };
    const X0 = x - 2, Y0 = y - 2, X1 = x + w + 2, Y1 = y + h + 2;
    bev([X0, Y0, X1, Y0, tx + tw, ty, tx, ty], mixc(P[0], '#ffffff', dark ? 0.25 : 0.55)); // top: lightest
    bev([X0, Y0, tx, ty, tx, ty + th, X0, Y1], mixc(P[0], '#ffffff', dark ? 0.08 : 0.2)); // left: light
    bev([X1, Y0, X1, Y1, tx + tw, ty + th, tx + tw, ty], mixc(P[1], '#000000', dark ? 0 : 0.08)); // right: dark
    bev([X0, Y1, tx, ty + th, tx + tw, ty + th, X1, Y1], mixc(P[1], '#000000', dark ? 0.1 : 0.22)); // bottom: darkest
    // facet seams
    c.globalAlpha = A * 0.55; c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(tx, ty); c.moveTo(x + w, y); c.lineTo(tx + tw, ty); c.moveTo(x, y + h); c.lineTo(tx, ty + th); c.moveTo(x + w, y + h); c.lineTo(tx + tw, ty + th); c.stroke(); c.globalAlpha = A;
    // table (the flat top face)
    const g = c.createLinearGradient(tx, ty, tx + tw * 0.4, ty + th); g.addColorStop(0, mixc(P[0], '#ffffff', dark ? 0.05 : 0.25)); g.addColorStop(0.55, P[0]); g.addColorStop(1, mixc(P[0], P[1], 0.75));
    rr(c, tx, ty, tw, th, tr); c.fillStyle = g; c.fill();
    if (hold != null) { const ph = h * hold, hg = c.createLinearGradient(0, y + h - ph, 0, y + h); hg.addColorStop(0, 'rgba(255,255,255,.2)'); hg.addColorStop(1, 'rgba(255,255,255,.75)'); c.fillStyle = hg; c.fillRect(x, y + h - ph, w, ph); }
    // diagonal specular streak (wide soft band + thin bright line)
    const sl = Math.min(w, h * 1.4) * 0.5; c.globalAlpha = A * (dark ? 0.2 : 0.32); c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(x + w * 0.16, y - 2); c.lineTo(x + w * 0.16 + sl * 0.55, y - 2); c.lineTo(x + w * 0.16 + sl * 0.55 - sl, y + Math.min(h, sl * 1.6)); c.lineTo(x + w * 0.16 - sl, y + Math.min(h, sl * 1.6)); c.fill();
    c.globalAlpha = A * (dark ? 0.35 : 0.5); c.beginPath(); c.moveTo(x + w * 0.16 + sl * 0.7, y - 2); c.lineTo(x + w * 0.16 + sl * 0.8, y - 2); c.lineTo(x + w * 0.16 + sl * 0.8 - sl, y + Math.min(h, sl * 1.6)); c.lineTo(x + w * 0.16 + sl * 0.7 - sl, y + Math.min(h, sl * 1.6)); c.fill();
    // bright inner rim around the table
    c.globalAlpha = A * 0.9; rr(c, tx, ty, tw, th, tr); c.lineWidth = Math.max(1.2, m * 0.018); c.strokeStyle = P[2]; c.stroke();
    c.globalAlpha = A * 0.35; rr(c, tx + 2, ty + 2, tw - 4, th - 4, Math.max(1, tr - 2)); c.lineWidth = 1; c.strokeStyle = '#fff'; c.stroke();
    // glitter specks (t = twinkle phase)
    const n = Math.min(48, Math.round(w * h / 650)); let s = seed * 9301 + 49297;
    for (let i = 0; i < n; i++) { s = (s * 9301 + 49297) % 233280; const px = x + b * 0.5 + (s / 233280) * (w - b); s = (s * 9301 + 49297) % 233280; const py = y + b * 0.5 + (s / 233280) * (h - b);
      const tw2 = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7 + seed), col = GL[i % GL.length];
      if (i % 5 === 0) Art.sparkle(c, px, py, 2 + 3.5 * tw2, i % 10 ? col : '#fff', A * (0.3 + 0.7 * tw2)); else { c.globalAlpha = A * (0.3 + 0.7 * tw2); c.fillStyle = col; c.beginPath(); c.arc(px, py, 0.8 + tw2 * 1.4, 0, TAU); c.fill(); } }
    c.restore(); c.globalAlpha = A;
    // frame (metal) or a crisp white outer edge
    if (F) { const fg = c.createLinearGradient(x, y, x + w, y + h); fg.addColorStop(0, F[0]); fg.addColorStop(0.5, F[1]); fg.addColorStop(1, F[2]); rr(c, x + 1.5, y + 1.5, w - 3, h - 3, R * 0.92); c.lineWidth = 4; c.strokeStyle = fg; c.stroke();
      c.globalAlpha = A * 0.8; rr(c, x + 0.5, y + 0.5, w - 1, h - 1, R); c.lineWidth = 1; c.strokeStyle = '#fff'; c.stroke(); c.globalAlpha = A; }
    else { rr(c, x + 1, y + 1, w - 2, h - 2, R * 0.92); c.lineWidth = 2; c.strokeStyle = dark ? rgba(P[2], 0.85) : 'rgba(255,255,255,.8)'; c.stroke(); }
    // emblem (the shape gem), at the bottom for holds
    const es = Math.min(w * 0.62, h * 0.7, 90), ey = hold != null ? y + h - Math.min(h, w) * 0.5 : y + h / 2;
    Art.gem(c, shape || 'heart', x + w / 2, ey, es * (held ? 1.12 : 1), P[3], P[4], held ? '#fff' : null);
    if (hold != null && h > w * 1.3) { for (let k = 1; k < 4; k++) Art.sparkle(c, x + w / 2, ey - es * 0.4 - k * (h - es) / 4.2, 4 + 2 * Math.sin(t * 5 + k), GL[k % GL.length], A * 0.9); }
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
  const big = new Map(); // large (screen-sized) sprites get their own tiny LRU so fold/unfold resizes can't pile up memory
  // small sprites: LRU capped by count AND total pixels (~12M px ≈ 48 MB RGBA) so twinkle frames x accents x sizes can't blow phone memory
  const SMALL_N = 700, SMALL_PX = 12e6; let smallPx = 0;
  Art.spr = (key, w, h, fn) => { const isBig = w * h > 250000, m = isBig ? big : cache; let s = m.get(key); if (s) { m.delete(key); m.set(key, s); return s; }
    s = mk(w, h); fn(s.getContext('2d'), s.width, s.height); m.set(key, s);
    if (isBig) { if (m.size > 6) m.delete(m.keys().next().value); }
    else { smallPx += s.width * s.height; while (m.size > 1 && (m.size > SMALL_N || smallPx > SMALL_PX)) { const k = m.keys().next().value, o = m.get(k); smallPx -= o.width * o.height; m.delete(k); } }
    return s; };
  Art.cacheSize = () => cache.size + big.size;
  Art.cachePx = () => smallPx;
  Art.clearCache = () => { cache.clear(); big.clear(); smallPx = 0; };
  const slowBg = Art.bg;
  Art.sparkleImg = col => Art.spr('sp|' + col, 32, 32, (c) => { c.shadowColor = col; c.shadowBlur = 4; Art.sparkle(c, 16, 16, 12, col, 1); });
  Art.spark = (c, x, y, s, col, a) => { if (s < 0.5 || a <= 0.02) return; c.globalAlpha = a > 1 ? 1 : a; c.drawImage(Art.sparkleImg(col), x - s * 1.33, y - s * 1.33, s * 2.67, s * 2.67); c.globalAlpha = 1; };
  Art.gemImg = (shape, light, dark, s, glow) => { const b = Math.max(8, Math.round(s / 8) * 8); return Art.spr(`g|${shape}|${light}|${dark}|${b}|${glow || ''}`, b * 1.6, b * 1.6, c => Art.gem(c, shape, b * 0.8, b * 0.8, b, light, dark, glow)); };
  Art.gemFast = (c, shape, x, y, s, light, dark, glow) => { const im = Art.gemImg(shape, light, dark, s, glow), k = s / (im.width / 1.6); c.drawImage(im, x - im.width * k / 2, y - im.height * k / 2, im.width * k, im.height * k); };
  // a full tile (no hold) pre-rendered at a size bucket
  // fr = twinkle frame 0..2 (optional): each is its own cached sprite with a different glitter phase. Sprite = (bw+24)x(bh+24), tile at (12,12)
  Art.tileImg = (skin, glitter, frame, shape, w, h, fr) => { const bw = Math.round(w / 4) * 4, bh = Math.round(h / 4) * 4; fr = ((fr | 0) % 3 + 3) % 3;
    return Art.spr(`t|${skin}|${glitter}|${frame}|${shape}|${bw}|${bh}|${fr}`, bw + 24, bh + 24, c => { c.translate(12, 12); Art.tile(c, { x: 0, y: 0, w: bw, h: bh, skin, glitter, frame, shape, t: 0.3 + fr * 0.35, seed: 7 }); }); };
  Art.glowImg = col => Art.spr('glow|' + col, 128, 128, c => { const g = c.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, col); g.addColorStop(0.35, col + '88'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  const rnd = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  // static layer per theme+size (sky + things that don't move)
  const staticLayer = (theme, W, H) => Art.spr(`bg|${theme}|${W}|${H}`, W, H, c => {
    const T = Art.THEMES[theme] || Art.THEMES.pinkgold, g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, T.sky[0]); g.addColorStop(0.6, T.sky[1]); g.addColorStop(1, T.sky[2]); c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (Art.worldStatic) Art.worldStatic(c, theme, W, H);
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
    if (Art.worldDyn && (Art.THEMES[theme] || {}).world) Art.worldDyn(c, theme, W, H, t, beat, energy, Art.intensity == null ? 1 : Art.intensity);
    const n = Math.round((lite ? 14 : 26) * (Art.intensity == null ? 1 : Art.intensity)); for (let i = 0; i < n; i++) { const x = rnd(i, 7) * W + Math.sin(beat * 0.8 + i) * 8, y = ((rnd(i, 8) * H + beat * (24 + rnd(i, 9) * 30) * (0.6 + energy)) % (H + 20)) - 10; Art.spark(c, x, y, 2 + 3 * rnd(i, 5), GL[i % GL.length], 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 5 + i))); }
  };
  Art.bgSlow = slowBg;
  // mascot sprite (per mood/outfit); animation is just transforms
  Art.mascotFast = (c, x, y, s, mood, outfit, t) => { const b = Math.round(s / 8) * 8 || 8, im = Art.spr(`m|${mood}|${outfit}|${b}`, b * 1.4, b * 1.6, cc => Art.mascot(cc, b * 0.7, b * 0.95, b, mood, outfit, 0)), k = s / b;
    const bob = Math.sin(t * 4) * s * 0.03 + (mood === 'wow' ? -Math.abs(Math.sin(t * 12)) * s * 0.08 : 0), sq = mood === 'oops' ? 1 + 0.05 * Math.sin(t * 20) : 1;
    c.save(); c.translate(x, y + bob); c.scale(sq * k, k / sq); c.drawImage(im, -b * 0.7, -b * 0.95); c.restore(); };
})();
// ================= v2b: track worlds (original art) =================
(function () {
  const Art = window.Art, TAU = Math.PI * 2;
  Object.assign(Art.THEMES, {
    rainbowroad: { name: 'Rainbow Road', sky: ['#020018', '#140a3a', '#3a1466'], glitter: 'rainbow', ui: '#ff6bd6', world: 1, obs: ['spiky', 'bomb'] },
    candyk: { name: 'Candy Kingdom', sky: ['#ffd6f0', '#ffb3e0', '#c9f6ff'], glitter: 'pink', ui: '#ff5fae', world: 1, obs: ['bomb', 'spiky'] },
    neon: { name: 'Neon City Drive', sky: ['#05001a', '#1d0b45', '#ff2fa8'], glitter: 'rainbow', ui: '#3dfcff', world: 1, obs: ['car', 'car', 'bomb'] },
    reef: { name: 'Underwater Reef', sky: ['#012a4a', '#0a6c8f', '#5fe0d0'], glitter: 'aqua', ui: '#1fb6d6', world: 1, obs: ['crab', 'spiky'] },
    volcano: { name: 'Volcano Valley', sky: ['#2a0505', '#7a1a0a', '#ff8a2a'], glitter: 'gold', ui: '#ff6a00', world: 1, obs: ['lava', 'bomb'] },
    ice: { name: 'Snowy Ice Castle', sky: ['#bfe6ff', '#e6f6ff', '#ffffff'], glitter: 'silver', ui: '#5ab0ff', world: 1, obs: ['snowball', 'cloud'] },
    jungle: { name: 'Jungle Temple', sky: ['#0b3d1e', '#1f7a3a', '#bfe86a'], glitter: 'mint', ui: '#22a37f', world: 1, obs: ['spiky', 'bomb'] },
    cloudc: { name: 'Cloud Castle', sky: ['#8fd3ff', '#cdeeff', '#fff4fb'], glitter: 'gold', ui: '#ffb000', world: 1, obs: ['cloud', 'spiky'] }
  });
  const rnd = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  // static scenery for worlds, drawn into the cached scene layer (called by Art.scene via worldStatic)
  Art.worldStatic = (c, w, W, H) => {
    if (w === 'rainbowroad') { for (let i = 0; i < 120; i++) Art.sparkle(c, rnd(i, 1) * W, rnd(i, 2) * H * 0.8, 1 + 2.5 * rnd(i, 3), i % 5 ? '#fff' : ['#ff6b9e', '#ffd43b', '#7dfcff'][i % 3], 0.4 + 0.6 * rnd(i, 4));
      const g = c.createRadialGradient(W * 0.75, H * 0.2, 5, W * 0.75, H * 0.2, W * 0.5); g.addColorStop(0, 'rgba(120,80,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = '#ffd1f4'; c.beginPath(); c.arc(W * 0.15, H * 0.16, 22, 0, TAU); c.fill(); }
    if (w === 'neon') { c.strokeStyle = 'rgba(61,252,255,.25)'; c.lineWidth = 1.5; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(0, H * 0.62 + i * i * 3); c.lineTo(W, H * 0.62 + i * i * 3); c.stroke(); }
      const sg = c.createLinearGradient(0, H * 0.25, 0, H * 0.6); sg.addColorStop(0, '#ffe23d'); sg.addColorStop(1, '#ff2fa8'); c.fillStyle = sg; c.beginPath(); c.arc(W / 2, H * 0.6, Math.min(W, H) * 0.22, Math.PI, TAU); c.fill(); c.fillStyle = '#1d0b45'; for (let i = 0; i < 6; i++) c.fillRect(W / 2 - Math.min(W, H) * 0.22, H * 0.6 - 10 - i * 14, Math.min(W, H) * 0.44, 3 + i * 0.6); }
    if (w === 'reef') { for (let i = 0; i < 9; i++) { const x = rnd(i, 1) * W, h = 40 + rnd(i, 2) * 90; c.strokeStyle = ['#ff7c9c', '#ffb347', '#c27cff'][i % 3]; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, H); c.quadraticCurveTo(x - 20, H - h / 2, x + 10, H - h); c.moveTo(x, H - h * 0.4); c.lineTo(x + 24, H - h * 0.7); c.stroke(); }
      const lg = c.createLinearGradient(0, 0, 0, H * 0.5); lg.addColorStop(0, 'rgba(255,255,255,.25)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = lg; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(W * (0.1 + i * 0.2), 0); c.lineTo(W * (0.05 + i * 0.2), H * 0.5); c.lineTo(W * (0.15 + i * 0.2), H * 0.5); c.fill(); } }
  };
  // animated bits per world (sprite-light)
  Art.worldDyn = (c, w, W, H, t, beat, energy, inten) => { const pulse = Math.pow(1 - (beat % 1 + 1) % 1, 3), n = Math.round(8 * inten);
    if (w === 'rainbowroad') for (let i = 0; i < n * 2; i++) { const z = ((t * 0.3 + rnd(i, 1)) % 1), x = W / 2 + (rnd(i, 2) - 0.5) * W * 2 * z, y = H * 0.1 + (rnd(i, 3)) * H * 0.3 * z; Art.spark(c, x, y, 1 + 4 * z, '#ffffff', z); }
    if (w === 'neon') for (let i = 0; i < n; i++) { const z = ((t * 0.5 + rnd(i, 1)) % 1); c.fillStyle = i % 2 ? '#ff2fa8' : '#3dfcff'; c.globalAlpha = 0.6 * z; c.fillRect(i % 2 ? z * W * 0.4 : W - z * W * 0.4 - 6, H * 0.62 + z * z * H * 0.38, 8 + 20 * z, 3 + 4 * z); c.globalAlpha = 1; }
    if (w === 'reef') for (let i = 0; i < n; i++) { const x = ((t * (20 + i * 3) + rnd(i, 1) * W) % (W + 60)) - 30, y = H * (0.2 + rnd(i, 2) * 0.5) + Math.sin(t * 2 + i) * 10; c.fillStyle = ['#ffb347', '#ff7c9c', '#fff066'][i % 3]; c.beginPath(); c.ellipse(x, y, 12, 7, 0, 0, TAU); c.moveTo(x - 10, y); c.lineTo(x - 20, y - 7); c.lineTo(x - 20, y + 7); c.fill(); }
    if (w === 'volcano') for (let i = 0; i < n; i++) { const z = ((t * 0.6 + rnd(i, 1)) % 1); Art.spark(c, W / 2 + (rnd(i, 2) - 0.5) * 120 * z, H * 0.3 - z * H * 0.25 + z * z * H * 0.2, 3 + 3 * (1 - z), i % 2 ? '#ffd76a' : '#ff6a00', 1 - z); }
    if (w === 'ice' || w === 'cloudc') for (let i = 0; i < n * 2; i++) { const x = (rnd(i, 1) * W + Math.sin(t + i) * 20), y = ((rnd(i, 2) * H + t * (20 + rnd(i, 3) * 25)) % H); Art.spark(c, x, y, 2 + 2 * rnd(i, 4), w === 'ice' ? '#ffffff' : '#ffe066', 0.8); }
    if (w === 'jungle') for (let i = 0; i < n; i++) { const x = rnd(i, 1) * W + Math.sin(t * 1.5 + i) * 30, y = H * (0.3 + rnd(i, 2) * 0.5) + Math.cos(t + i) * 20; Art.spark(c, x, y, 3, '#d9ff6a', 0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i))); }
    if (w === 'candyk') for (let i = 0; i < n; i++) { const x = rnd(i, 1) * W, y = ((rnd(i, 2) * H + t * 30) % H); Art.gemFast(c, ['heart', 'star', 'circle'][i % 3], x, y, 14 + 6 * pulse, '#fff', ['#ff5fae', '#ffd76a', '#8fe3ff'][i % 3]); }
  };
  // highway surface per world
  Art.highwayStyle = w => ({ rainbowroad: 'rainbow', neon: 'neon', ice: 'ice', volcano: 'lava', reef: 'reef', candyk: 'candy', jungle: 'stone', cloudc: 'cloud' }[w] || 'glass');
})();
// ================= v3: landmark detail, parallax strips, world accents on tiles, shard + bloom sprites =================
(function () {
  const Art = window.Art, TAU = Math.PI * 2, rr = Art.rr;
  const rnd = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  const poly = (c, pts) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };
  const lin = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
  const rad = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
  const glowAt = (c, x, y, r, col, a) => { c.save(); c.globalAlpha = a; c.fillStyle = rad(c, x, y, 0, r, [col, Art.rgba(col, 0.35), Art.rgba(col, 0)]); c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); };
  const puff = (c, x, y, s) => { c.beginPath(); c.arc(x, y, s, 0, TAU); c.arc(x + s * 0.95, y + s * 0.25, s * 0.75, 0, TAU); c.arc(x - s * 0.95, y + s * 0.25, s * 0.75, 0, TAU); c.arc(x + s * 0.4, y - s * 0.45, s * 0.6, 0, TAU); c.fill(); };
  const flake = (c, x, y, r) => { c.beginPath(); for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3, ca = Math.cos(a) * r, sa = Math.sin(a) * r; c.moveTo(x - ca, y - sa); c.lineTo(x + ca, y + sa);
      for (const sg of [-1, 1]) { const bx = x + ca * 0.55 * sg, by = y + sa * 0.55 * sg; for (const d of [-0.6, 0.6]) { const aa = a + (sg > 0 ? 0 : Math.PI) + d; c.moveTo(bx, by); c.lineTo(bx + Math.cos(aa) * r * 0.32, by + Math.sin(aa) * r * 0.32); } } } c.stroke(); };
  const swirlPop = (c, x, y, r, col, stick) => { if (stick) { c.fillStyle = '#fff'; c.fillRect(x - r * 0.09, y, r * 0.18, stick); c.fillStyle = 'rgba(255,120,180,.5)'; for (let k = 0; k < stick; k += r * 0.4) c.fillRect(x - r * 0.09, y + k, r * 0.18, r * 0.12); }
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = r * 0.16; c.lineCap = 'round'; c.beginPath();
    for (let a = 0; a < TAU * 2.6; a += 0.2) { const q = r * 0.86 * a / (TAU * 2.6); c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.stroke();
    c.globalAlpha = 0.45; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.15, -0.6, 0, TAU); c.fill(); c.globalAlpha = 1; };
  // ---------- G17: detailed landmarks (rendered once into the cached scene) ----------
  const oldStatic = Art.worldStatic;
  const LAND = {
    jungle(c, W, H) { const u = Math.min(W, H * 0.7), cx = W / 2, gy = H * 0.72;
      // misty far hills
      c.fillStyle = 'rgba(20,90,45,.55)'; c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= W; x += 16) c.lineTo(x, gy - u * 0.16 - Math.sin(x / (u * 0.22)) * u * 0.05 - Math.sin(x / (u * 0.09) + 1) * u * 0.02); c.lineTo(W, gy); c.fill();
      // stepped temple
      const lv = 5, lh = u * 0.085, bw0 = Math.min(W * 0.7, u * 0.9); let top = gy;
      for (let k = 0; k < lv; k++) { const bw = bw0 * (1 - k * 0.15), y0 = gy - (k + 1) * lh; top = y0;
        c.fillStyle = lin(c, 0, y0, 0, y0 + lh, ['#7d9a6a', '#4e6b44']); c.fillRect(cx - bw / 2, y0, bw, lh);
        c.fillStyle = 'rgba(255,255,220,.35)'; c.fillRect(cx - bw / 2, y0, bw, Math.max(2, lh * 0.12));
        c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(cx + bw / 2 - bw * 0.08, y0, bw * 0.08, lh); c.fillRect(cx - bw / 2, y0 + lh * 0.82, bw, lh * 0.18);
        c.strokeStyle = 'rgba(30,50,25,.35)'; c.lineWidth = 1; c.beginPath(); for (let bx = cx - bw / 2 + (k % 2 ? 10 : 0); bx < cx + bw / 2; bx += u * 0.05) { c.moveTo(bx, y0 + lh * 0.15); c.lineTo(bx, y0 + lh * 0.8); } c.moveTo(cx - bw / 2, y0 + lh * 0.5); c.lineTo(cx + bw / 2, y0 + lh * 0.5); c.stroke(); }
      // centre stairway
      const sw0 = bw0 * 0.16, sw1 = bw0 * 0.1; c.fillStyle = '#93ad7c'; poly(c, [cx - sw0 / 2, gy, cx + sw0 / 2, gy, cx + sw1 / 2, top, cx - sw1 / 2, top]); c.fill();
      c.strokeStyle = 'rgba(40,60,30,.45)'; c.beginPath(); for (let y = gy; y > top; y -= lh * 0.25) { const k = (gy - y) / (gy - top), hw = (sw0 + (sw1 - sw0) * k) / 2; c.moveTo(cx - hw, y); c.lineTo(cx + hw, y); } c.stroke();
      // shrine + doorway
      const shw = bw0 * 0.3, shh = lh * 1.3, sy = top - shh; c.fillStyle = lin(c, 0, sy, 0, top, ['#8aa874', '#56734a']); c.fillRect(cx - shw / 2, sy, shw, shh);
      c.fillStyle = '#5c7a4c'; poly(c, [cx - shw * 0.62, sy, cx + shw * 0.62, sy, cx + shw * 0.4, sy - lh * 0.45, cx - shw * 0.4, sy - lh * 0.45]); c.fill();
      c.fillStyle = '#1b2a17'; c.beginPath(); c.moveTo(cx - shw * 0.16, top); c.lineTo(cx - shw * 0.16, sy + shh * 0.4); c.arc(cx, sy + shh * 0.4, shw * 0.16, Math.PI, 0); c.lineTo(cx + shw * 0.16, top); c.fill();
      // glowing gem on top
      const gs = u * 0.1, gyy = sy - lh * 0.45 - gs * 0.42; glowAt(c, cx, gyy, gs * 2.4, '#8affc8', 0.7);
      Art.gem(c, 'gem', cx, gyy, gs, '#e6fff4', '#13b07a', '#7dffc8'); Art.sparkle(c, cx + gs * 0.45, gyy - gs * 0.4, gs * 0.22, '#fff', 0.95);
      // vines on the temple
      c.strokeStyle = '#2f8a3c'; c.lineWidth = 2.5; c.lineCap = 'round'; for (let i = 0; i < 6; i++) { const vx = cx - bw0 * 0.45 + rnd(i, 7) * bw0 * 0.9, vy = gy - lh * (1 + Math.floor(rnd(i, 8) * 3)), len = lh * (0.8 + rnd(i, 9) * 1.4);
        c.beginPath(); c.moveTo(vx, vy); c.quadraticCurveTo(vx + 6, vy + len / 2, vx - 3, vy + len); c.stroke(); c.fillStyle = '#45b34f'; for (let q = 0.3; q < 1; q += 0.3) { c.beginPath(); c.ellipse(vx + 3, vy + len * q, 4, 2.2, 0.6, 0, TAU); c.fill(); } }
      // jungle floor + bushes
      c.fillStyle = '#0f4a22'; c.fillRect(0, gy, W, H - gy); c.fillStyle = '#16602c'; for (let i = 0; i < 14; i++) { const x = rnd(i, 4) * W, r = u * (0.05 + rnd(i, 5) * 0.06); c.beginPath(); c.arc(x, gy + r * 0.3, r, Math.PI, 0); c.fill(); }
      // canopy across the top + hanging vines
      for (let i = 0; i < 16; i++) { const x = (i / 15) * W + (rnd(i, 1) - 0.5) * 40, r = u * (0.1 + rnd(i, 2) * 0.08); c.fillStyle = i % 2 ? '#0e4f22' : '#156b2e'; c.beginPath(); c.ellipse(x, -r * 0.25, r * 1.2, r * 0.75, rnd(i, 3) - 0.5, 0, TAU); c.fill(); }
      c.strokeStyle = '#1d7a35'; c.lineWidth = 2; for (let i = 0; i < 9; i++) { const x = rnd(i, 11) * W, len = H * (0.08 + rnd(i, 12) * 0.16); c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 10, len * 0.4, x - 10, len * 0.7, x + 4, len); c.stroke(); c.fillStyle = '#3fbf5a'; c.beginPath(); c.ellipse(x + 4, len, 5, 3, 0.5, 0, TAU); c.fill(); } },
    ice(c, W, H) { const u = Math.min(W, H * 0.7), cx = W / 2, gy = H * 0.7;
      // distant snowy peaks
      c.fillStyle = 'rgba(160,205,240,.55)'; c.beginPath(); c.moveTo(0, gy); for (let i = 0; i <= 8; i++) { const x = i / 8 * W; c.lineTo(x - W / 16, gy - u * (0.12 + rnd(i, 1) * 0.12)); c.lineTo(x, gy - u * 0.06); } c.lineTo(W, gy); c.fill();
      const wall = (x, y, w, h) => { c.fillStyle = lin(c, x, y, x + w, y + h, ['#ffffff', '#d6efff', '#a9d6fb']); c.fillRect(x, y, w, h); c.strokeStyle = '#8cc4f5'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
        c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(x + 2, y + 2, w * 0.12, h - 4); };
      const cren = (x, y, w, m) => { const n = Math.max(3, Math.round(w / m)), mw = w / (n * 2 - 1); c.fillStyle = '#e8f6ff'; for (let i = 0; i < n; i++) { c.fillRect(x + i * 2 * mw, y - mw * 0.9, mw, mw * 0.9); c.strokeRect(x + i * 2 * mw, y - mw * 0.9, mw, mw * 0.9); }
        c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(x + w / 2, y, w * 0.52, mw * 0.3, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(190,230,255,.95)'; for (let i = 0; i < n * 2; i++) { const ix = x + (i + 0.5) * w / (n * 2); poly(c, [ix - 2.5, y + 1, ix + 2.5, y + 1, ix, y + 6 + (i % 3) * 3]); c.fill(); } };
      const win = (x, y, w, h) => { c.fillStyle = '#4f8fd6'; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w / 2); c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w, y + h); c.fill(); c.fillStyle = 'rgba(200,240,255,.85)'; c.fillRect(x + w * 0.2, y + w * 0.45, w * 0.22, h * 0.45); };
      const tower = (x, w, h, roof) => { const y = gy - h; wall(x - w / 2, y, w, h); win(x - w * 0.18, y + h * 0.18, w * 0.36, w * 0.55); win(x - w * 0.18, y + h * 0.5, w * 0.36, w * 0.55);
        if (roof) { c.fillStyle = lin(c, x - w, 0, x + w, 0, ['#a8d4ff', '#5b9ef0']); poly(c, [x - w * 0.62, y, x + w * 0.62, y, x, y - w * 1.25]); c.fill(); c.fillStyle = 'rgba(255,255,255,.75)'; poly(c, [x - w * 0.62, y, x - w * 0.2, y, x, y - w * 1.25]); c.fill();
          c.strokeStyle = '#d4a017'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y - w * 1.25); c.lineTo(x, y - w * 1.6); c.stroke(); c.fillStyle = '#ff6fb5'; poly(c, [x, y - w * 1.6, x + w * 0.4, y - w * 1.48, x, y - w * 1.36]); c.fill(); Art.sparkle(c, x, y - w * 1.25, 4, '#fff', 0.9); }
        else cren(x - w / 2, y, w, w * 0.25); };
      const kw = u * 0.36, kh = u * 0.27; glowAt(c, cx, gy - kh, u * 0.45, '#ffffff', 0.6);
      tower(cx - kw * 0.95, u * 0.08, u * 0.28, true); tower(cx + kw * 0.95, u * 0.08, u * 0.28, true);
      wall(cx - kw / 2, gy - kh, kw, kh); c.strokeStyle = '#8cc4f5'; cren(cx - kw / 2, gy - kh, kw, u * 0.03);
      for (let i = 0; i < 3; i++) win(cx - kw * 0.36 + i * kw * 0.3, gy - kh * 0.82, kw * 0.12, kw * 0.17);
      c.fillStyle = '#3d74b8'; c.beginPath(); const dw = kw * 0.24; c.moveTo(cx - dw / 2, gy); c.lineTo(cx - dw / 2, gy - kh * 0.32); c.arc(cx, gy - kh * 0.32, dw / 2, Math.PI, 0); c.lineTo(cx + dw / 2, gy); c.fill(); c.strokeStyle = '#d4a017'; c.lineWidth = 2; c.stroke();
      c.strokeStyle = '#8cc4f5'; tower(cx - kw * 0.55, u * 0.11, u * 0.38, true); tower(cx + kw * 0.55, u * 0.11, u * 0.38, true);
      tower(cx, u * 0.1, u * 0.47, true); Art.gem(c, 'diamond', cx, gy - u * 0.47 + u * 0.06, u * 0.05, '#ffffff', '#5ab0ff', '#bfe6ff');
      // snow ground with soft drifts
      c.fillStyle = '#ffffff'; c.fillRect(0, gy, W, H - gy); c.fillStyle = 'rgba(150,200,240,.35)'; for (let i = 0; i < 6; i++) { const x = rnd(i, 3) * W; c.beginPath(); c.ellipse(x, gy + (H - gy) * (0.2 + rnd(i, 4) * 0.6), u * 0.2, u * 0.02, 0, 0, TAU); c.fill(); }
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; for (let i = 0; i < 10; i++) flake(c, rnd(i, 21) * W, rnd(i, 22) * H * 0.4, 4 + rnd(i, 23) * 6); },
    volcano(c, W, H) { const u = Math.min(W, H * 0.7), cx = W / 2, gy = H * 0.7, top = gy - u * 0.5, tw = u * 0.13, bw = Math.min(W * 0.48, u * 0.75);
      glowAt(c, cx, top, u * 0.6, '#ff7a1a', 0.55);
      // smoke plume
      c.fillStyle = 'rgba(60,20,20,.55)'; for (let i = 0; i < 6; i++) puff(c, cx + (i - 2.5) * u * 0.03 + Math.sin(i * 1.7) * u * 0.05, top - u * 0.08 - i * u * 0.06, u * (0.05 + i * 0.012));
      // side ridges
      c.fillStyle = '#2a0808'; poly(c, [0, gy, W * 0.2, gy - u * 0.2, W * 0.32, gy - u * 0.12, cx - bw * 0.5, gy]); c.fill(); poly(c, [W, gy, W * 0.8, gy - u * 0.22, W * 0.68, gy - u * 0.1, cx + bw * 0.5, gy]); c.fill();
      // main cone
      c.fillStyle = lin(c, cx - bw, 0, cx + bw, 0, ['#5a1610', '#3a0d0b', '#200505']); poly(c, [cx - bw, gy, cx - tw, top, cx + tw, top, cx + bw, gy]); c.fill();
      c.fillStyle = 'rgba(255,140,60,.12)'; poly(c, [cx - bw, gy, cx - tw, top, cx - tw * 0.3, top, cx - bw * 0.35, gy]); c.fill();
      // crater
      c.fillStyle = rad(c, cx, top, 2, tw * 1.1, ['#fff6c0', '#ffb000', '#ff4a00']); c.beginPath(); c.ellipse(cx, top, tw, tw * 0.28, 0, 0, TAU); c.fill();
      c.save(); c.shadowColor = '#ff8a00'; c.shadowBlur = 24; c.strokeStyle = '#ffd76a'; c.lineWidth = 2; c.stroke(); c.restore();
      // lava rivers
      c.save(); c.shadowColor = '#ff6a00'; c.shadowBlur = 14; c.lineCap = 'round';
      [[-0.5, -1], [0.35, 1], [-0.05, -0.4]].forEach(([s, d], k) => { c.strokeStyle = k === 2 ? '#ffb347' : '#ff7a1a'; c.lineWidth = u * (0.022 - k * 0.004); c.beginPath(); c.moveTo(cx + tw * s, top + 3);
        c.bezierCurveTo(cx + tw * s + d * bw * 0.15, top + (gy - top) * 0.35, cx + d * bw * 0.25, top + (gy - top) * 0.6, cx + d * bw * 0.45 + s * 10, gy); c.stroke(); });
      c.restore();
      // dark ground with glowing cracks
      c.fillStyle = '#1a0404'; c.fillRect(0, gy, W, H - gy); c.strokeStyle = 'rgba(255,110,20,.7)'; c.lineWidth = 2;
      for (let i = 0; i < 8; i++) { let x = rnd(i, 1) * W, y = gy + (H - gy) * (0.15 + rnd(i, 2) * 0.7); c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += 10 + rnd(i, k + 3) * 22; y += (rnd(i, k + 9) - 0.5) * 14; c.lineTo(x, y); } c.stroke(); }
      for (let i = 0; i < 30; i++) Art.sparkle(c, rnd(i, 31) * W, rnd(i, 32) * gy, 1 + 2 * rnd(i, 33), i % 2 ? '#ffd76a' : '#ff8a2a', 0.3 + 0.6 * rnd(i, 34)); },
    cloudc(c, W, H) { const u = Math.min(W, H * 0.7), cx = W / 2, by = H * 0.5;
      glowAt(c, cx, by - u * 0.2, u * 0.55, '#fff4c0', 0.7);
      // castle
      const wallG = (x, y, w, h) => { c.fillStyle = lin(c, x, y, x + w, y, ['#ffffff', '#ffeef8', '#f7d6ea']); c.fillRect(x, y, w, h); c.fillStyle = '#ffcf4a'; c.fillRect(x, y, w, Math.max(2, h * 0.04)); c.fillRect(x, y + h * 0.5, w, 2); };
      const win = (x, y, w, h) => { c.fillStyle = '#ffd76a'; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w / 2); c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w, y + h); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(x + w * 0.2, y + w * 0.5, w * 0.2, h * 0.4); };
      const dome = (x, y, w, flag) => { c.fillStyle = lin(c, x - w / 2, y - w, x + w / 2, y, ['#fff6c8', '#ffcf4a', '#d4930a']); c.beginPath(); c.moveTo(x - w / 2, y); c.bezierCurveTo(x - w / 2, y - w * 0.7, x - w * 0.1, y - w * 0.75, x, y - w * 1.05); c.bezierCurveTo(x + w * 0.1, y - w * 0.75, x + w / 2, y - w * 0.7, x + w / 2, y); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - w * 0.18, y - w * 0.4, w * 0.08, w * 0.22, 0.2, 0, TAU); c.fill();
        c.strokeStyle = '#b07500'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y - w * 1.05); c.lineTo(x, y - w * 1.5); c.stroke(); if (flag) { c.fillStyle = flag; c.beginPath(); c.moveTo(x, y - w * 1.5); c.quadraticCurveTo(x + w * 0.3, y - w * 1.5, x + w * 0.5, y - w * 1.38); c.quadraticCurveTo(x + w * 0.3, y - w * 1.28, x, y - w * 1.26); c.fill(); }
        Art.sparkle(c, x, y - w * 1.05, w * 0.12, '#fff', 0.95); };
      const tower = (x, w, h, flag) => { const y = by - h; wallG(x - w / 2, y, w, h); win(x - w * 0.17, y + h * 0.2, w * 0.34, w * 0.5); dome(x, y, w * 1.1, flag); };
      const kw = u * 0.42, kh = u * 0.22; tower(cx - kw * 0.62, u * 0.09, u * 0.3, '#ff6fb5'); tower(cx + kw * 0.62, u * 0.09, u * 0.3, '#b98cff');
      wallG(cx - kw / 2, by - kh, kw, kh); for (let i = 0; i < 4; i++) win(cx - kw * 0.4 + i * kw * 0.25, by - kh * 0.8, kw * 0.08, kw * 0.12);
      c.fillStyle = '#ffcf4a'; c.beginPath(); const dw = kw * 0.2; c.moveTo(cx - dw / 2, by); c.lineTo(cx - dw / 2, by - kh * 0.35); c.arc(cx, by - kh * 0.35, dw / 2, Math.PI, 0); c.lineTo(cx + dw / 2, by); c.fill(); c.fillStyle = '#ff9fd0'; c.fillRect(cx - dw * 0.38, by - kh * 0.35, dw * 0.76, kh * 0.35);
      tower(cx - kw * 0.3, u * 0.12, u * 0.36, null); tower(cx + kw * 0.3, u * 0.12, u * 0.36, null); tower(cx, u * 0.15, u * 0.42, '#ff4fa3');
      // the castle sits on a big cloud; more clouds drift around and below
      c.fillStyle = 'rgba(255,255,255,.97)'; for (let i = 0; i < 7; i++) puff(c, cx + (i - 3) * kw * 0.33, by + u * 0.03 + (i % 2) * u * 0.02, u * (0.07 + rnd(i, 5) * 0.03));
      c.fillStyle = 'rgba(214,236,255,.9)'; for (let i = 0; i < 7; i++) puff(c, cx + (i - 3) * kw * 0.33, by + u * 0.1, u * 0.05);
      for (let i = 0; i < 9; i++) { const x = rnd(i, 1) * W, y = H * (0.6 + rnd(i, 2) * 0.35); c.fillStyle = i % 2 ? 'rgba(255,255,255,.95)' : 'rgba(255,240,250,.9)'; puff(c, x, y, u * (0.07 + rnd(i, 3) * 0.05)); }
      for (let i = 0; i < 4; i++) { const x = rnd(i, 7) * W, y = H * (0.08 + rnd(i, 8) * 0.25); c.fillStyle = 'rgba(255,255,255,.75)'; puff(c, x, y, u * 0.04); } },
    candyk(c, W, H) { const u = Math.min(W, H * 0.7), cx = W / 2, gy = H * 0.72;
      // far candy hills
      c.fillStyle = '#ffd0ea'; c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= W; x += 12) c.lineTo(x, gy - u * 0.12 - Math.sin(x / (u * 0.18)) * u * 0.04); c.lineTo(W, gy); c.fill();
      // candy castle
      const kw = u * 0.34, kh = u * 0.2, stripes = (x, y, w, h, a, b) => { c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.fillStyle = a; c.fillRect(x, y, w, h); c.strokeStyle = b; c.lineWidth = w * 0.22; c.beginPath(); for (let k = -w; k < h + w; k += w * 0.6) { c.moveTo(x, y + k); c.lineTo(x + w, y + k - w * 0.5); } c.stroke(); c.restore(); };
      const cone = (x, y, w, col) => { c.fillStyle = col; poly(c, [x - w * 0.62, y, x + w * 0.62, y, x, y - w * 1.3]); c.fill(); c.fillStyle = '#fff'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.arc(x + k * w * 0.35, y, w * 0.2, 0, TAU); c.fill(); } Art.gem(c, 'heart', x, y - w * 1.35, w * 0.4, '#ffe3f3', '#ff4f93'); };
      const tower = (x, w, h, a, b, roof) => { const y = gy - h; stripes(x - w / 2, y, w, h, a, b); c.strokeStyle = 'rgba(200,60,130,.4)'; c.lineWidth = 1.5; c.strokeRect(x - w / 2, y, w, h); cone(x, y, w, roof); };
      tower(cx - kw * 0.62, u * 0.08, u * 0.3, '#fff', '#ff6fa8', '#ffb3d9'); tower(cx + kw * 0.62, u * 0.08, u * 0.3, '#fff', '#7fd8ff', '#b4f0ff');
      c.fillStyle = lin(c, 0, gy - kh, 0, gy, ['#ffc6e3', '#ff9fd0']); c.fillRect(cx - kw / 2, gy - kh, kw, kh);
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(cx - kw / 2, gy - kh); for (let i = 0; i <= 8; i++) { const x = cx - kw / 2 + i * kw / 8; c.lineTo(x, gy - kh + (i % 2 ? u * 0.025 : u * 0.008)); } c.lineTo(cx + kw / 2, gy - kh - 2); c.fill(); // icing drips
      ['#ff5fae', '#ffd166', '#7bed9f', '#70a1ff', '#c08cff'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(cx - kw * 0.4 + i * kw * 0.2, gy - kh * 0.5, u * 0.012, 0, TAU); c.fill(); });
      c.fillStyle = '#b5487a'; c.beginPath(); const dw = kw * 0.22; c.moveTo(cx - dw / 2, gy); c.lineTo(cx - dw / 2, gy - kh * 0.3); c.arc(cx, gy - kh * 0.3, dw / 2, Math.PI, 0); c.lineTo(cx + dw / 2, gy); c.fill();
      tower(cx - kw * 0.28, u * 0.1, u * 0.34, '#fff4b0', '#ffb347', '#ffd166'); tower(cx + kw * 0.28, u * 0.1, u * 0.34, '#e8fff4', '#7bed9f', '#b4f8c8'); tower(cx, u * 0.12, u * 0.42, '#fff', '#ff5fae', '#ff8cc6');
      // swirl lollipops either side (proportional; kept out of the very centre)
      const pops = [[0.08, 0.3], [0.2, 0.22], [0.8, 0.24], [0.92, 0.32], [0.3, 0.12], [0.7, 0.14]], cols = ['#ff8cc6', '#8fe3ff', '#ffe066', '#b4f8c8', '#c08cff', '#ffb347'];
      pops.forEach(([fx, fh], i) => { const x = fx * W, r = u * (0.055 + rnd(i, 2) * 0.02), y = gy - u * fh - r; if (Math.abs(x - cx) < kw * 0.85 + r) return; swirlPop(c, x, y, r, cols[i % cols.length], gy - y); });
      // gumdrops + frosted ground
      c.fillStyle = '#ffc0e3'; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 12) c.lineTo(x, gy + Math.sin(x / (u * 0.12)) * u * 0.02); c.lineTo(W, H); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= W; x += 12) c.lineTo(x, gy + Math.sin(x / (u * 0.12)) * u * 0.02 + (Math.sin(x * 0.21) > 0.6 ? u * 0.03 : u * 0.006)); for (let x = W; x >= 0; x -= 12) c.lineTo(x, gy + Math.sin(x / (u * 0.12)) * u * 0.02 - 2); c.fill();
      for (let i = 0; i < 10; i++) { const x = rnd(i, 13) * W, y = gy + (H - gy) * (0.25 + rnd(i, 14) * 0.6), r = u * (0.02 + rnd(i, 15) * 0.015); c.fillStyle = cols[i % cols.length]; c.beginPath(); c.arc(x, y, r, Math.PI, 0); c.lineTo(x + r, y + r * 0.3); c.lineTo(x - r, y + r * 0.3); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.4, r * 0.18, 0, TAU); c.fill(); } }
  };
  Art.worldStatic = (c, w, W, H) => { if (LAND[w]) { c.save(); LAND[w](c, W, H); c.restore(); } else oldStatic(c, w, W, H); };
  // ---------- G9: parallax silhouette strips (cached; drawn at 2 speeds with a beat nudge) ----------
  const per = (x, sw, ks) => ks.reduce((s, [k, a, p]) => s + a * Math.sin(TAU * k * x / sw + p), 0); // seamless (integer periods over sw)
  const ridge = (c, sw, sh, base, ks, col, step = 6, sharp) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, sh); for (let x = 0; x <= sw; x += step) { let v = per(x, sw, ks); if (sharp) v = -Math.abs(v) * 1.6 + sh * 0.1; c.lineTo(x, base - v); } c.lineTo(sw, sh); c.fill(); };
  const wrap = (sw, x, fn) => { fn(x - sw); fn(x); fn(x + sw); };
  const STRIP = {
    rainbowroad: [(c, sw, sh) => { ridge(c, sw, sh, sh * 0.55, [[3, sh * 0.18, 0], [7, sh * 0.1, 1], [13, sh * 0.06, 2]], 'rgba(70,30,140,.55)', 6, true);
        c.strokeStyle = 'rgba(255,140,240,.5)'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= sw; x += 6) { const v = -Math.abs(per(x, sw, [[3, sh * 0.18, 0], [7, sh * 0.1, 1], [13, sh * 0.06, 2]])) * 1.6 + sh * 0.1; c.lineTo(x, sh * 0.55 - v); } c.stroke(); },
      (c, sw, sh) => { ridge(c, sw, sh, sh * 0.7, [[4, sh * 0.1, 0.5], [9, sh * 0.05, 2]], 'rgba(30,8,70,.75)'); const cols = ['#ff6b9e', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
        cols.forEach((col, k) => { c.strokeStyle = col; c.globalAlpha = 0.6; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= sw; x += 6) c.lineTo(x, sh * 0.7 - per(x, sw, [[4, sh * 0.1, 0.5], [9, sh * 0.05, 2]]) + k * 3); c.stroke(); }); c.globalAlpha = 1;
        for (let i = 0; i < 8; i++) wrap(sw, (i + rnd(i, 1) * 0.6) * sw / 8, x => { const y = sh * (0.2 + rnd(i, 2) * 0.25), r = 6 + rnd(i, 3) * 8; c.fillStyle = 'rgba(255,209,244,.6)'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, r * 1.8, r * 0.45, -0.3, 0, TAU); c.stroke(); }); }],
    candyk: [(c, sw, sh) => { ridge(c, sw, sh, sh * 0.6, [[4, sh * 0.12, 0], [9, sh * 0.06, 1.3]], 'rgba(255,170,215,.55)'); c.fillStyle = 'rgba(255,255,255,.6)';
        for (let x = 0; x <= sw; x += 6) { const y = sh * 0.6 - per(x, sw, [[4, sh * 0.12, 0], [9, sh * 0.06, 1.3]]); c.fillRect(x, y, 6, 3 + (Math.sin(x * 0.15) > 0.7 ? 6 : 0)); } },
      (c, sw, sh) => { ridge(c, sw, sh, sh * 0.82, [[5, sh * 0.05, 0.2], [11, sh * 0.03, 1]], 'rgba(255,130,190,.6)'); const cols = ['#ff8cc6', '#8fe3ff', '#ffe066', '#b4f8c8', '#c08cff'];
        for (let i = 0; i < 10; i++) wrap(sw, (i + 0.5) * sw / 10, x => { const r = sh * (0.09 + rnd(i, 1) * 0.05), y = sh * (0.35 + rnd(i, 2) * 0.2); c.globalAlpha = 0.75; if (i % 3 === 2) { c.strokeStyle = '#fff'; c.lineWidth = r * 0.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, sh); c.lineTo(x, y); c.arc(x + r * 0.7, y, r * 0.7, Math.PI, 0); c.stroke(); c.strokeStyle = '#ff5f8f'; c.setLineDash([r * 0.4, r * 0.4]); c.stroke(); c.setLineDash([]); } else swirlPop(c, x, y, r, cols[i % 5], sh - y); c.globalAlpha = 1; }); }],
    neon: [(c, sw, sh) => { c.fillStyle = 'rgba(40,14,90,.7)'; let x = 0, i = 0; const bld = []; while (x < sw - 20) { const bw = 24 + rnd(i, 1) * 40, bh = sh * (0.3 + rnd(i, 2) * 0.55); bld.push([x, bw, bh]); x += bw + 3; i++; } const k = sw / x;
        bld.forEach(([bx, bw, bh], j) => { bx *= k; bw *= k; c.fillStyle = 'rgba(40,14,90,.7)'; c.fillRect(bx, sh - bh, bw, bh); for (let yy = sh - bh + 6; yy < sh - 4; yy += 9) for (let xx = bx + 4; xx < bx + bw - 4; xx += 7) if (rnd(xx | 0, yy | 0) < 0.25) { c.fillStyle = ['rgba(255,224,102,.55)', 'rgba(255,124,224,.55)', 'rgba(125,252,255,.55)'][(j + (xx | 0)) % 3]; c.fillRect(xx, yy, 3, 4); } }); },
      (c, sw, sh) => { let x = 0, i = 0; const bld = []; while (x < sw - 30) { const bw = 40 + rnd(i, 5) * 60, bh = sh * (0.25 + rnd(i, 6) * 0.45); bld.push([x, bw, bh]); x += bw + 10 + rnd(i, 7) * 30; i++; } const k = sw / x;
        bld.forEach(([bx, bw, bh], j) => { bx *= k; c.fillStyle = 'rgba(16,4,40,.85)'; c.fillRect(bx, sh - bh, bw, bh); c.fillStyle = j % 2 ? '#3dfcff' : '#ff3df2'; c.globalAlpha = 0.85; c.fillRect(bx, sh - bh, bw, 2); c.fillRect(bx + bw * 0.2, sh - bh + 10, bw * 0.6, 2); c.globalAlpha = 1; if (j % 3 === 0) { c.fillRect(bx + bw / 2 - 1, sh - bh - 12, 2, 12); c.beginPath(); c.arc(bx + bw / 2, sh - bh - 13, 2.5, 0, TAU); c.fill(); } }); }],
    reef: [(c, sw, sh) => { ridge(c, sw, sh, sh * 0.62, [[3, sh * 0.12, 0.4], [8, sh * 0.06, 2], [17, sh * 0.03, 1]], 'rgba(8,70,110,.5)'); },
      (c, sw, sh) => { ridge(c, sw, sh, sh * 0.88, [[6, sh * 0.04, 0], [13, sh * 0.02, 1]], 'rgba(10,90,100,.6)'); c.lineCap = 'round';
        for (let i = 0; i < 14; i++) wrap(sw, (i + rnd(i, 1) * 0.5) * sw / 14, x => { const h = sh * (0.35 + rnd(i, 2) * 0.45); if (i % 2) { c.strokeStyle = 'rgba(40,150,110,.6)'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, sh); c.bezierCurveTo(x - 12, sh - h * 0.3, x + 12, sh - h * 0.7, x - 4, sh - h); c.stroke(); }
          else { c.strokeStyle = ['rgba(255,124,156,.6)', 'rgba(255,179,71,.6)', 'rgba(194,124,255,.6)'][i % 3]; c.lineWidth = 5; c.beginPath(); c.moveTo(x, sh); c.lineTo(x, sh - h * 0.6); c.lineTo(x - h * 0.25, sh - h); c.moveTo(x, sh - h * 0.6); c.lineTo(x + h * 0.22, sh - h * 0.95); c.moveTo(x, sh - h * 0.35); c.lineTo(x + h * 0.2, sh - h * 0.55); c.stroke(); } }); }],
    volcano: [(c, sw, sh) => { const ks = [[3, sh * 0.16, 0], [7, sh * 0.09, 1.2], [15, sh * 0.04, 2]]; ridge(c, sw, sh, sh * 0.55, ks, 'rgba(70,14,8,.5)', 6, true);
        c.strokeStyle = 'rgba(255,120,30,.55)'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= sw; x += 6) c.lineTo(x, sh * 0.55 + Math.abs(per(x, sw, ks)) * 1.6 - sh * 0.1); c.stroke(); },
      (c, sw, sh) => { ridge(c, sw, sh, sh * 0.85, [[5, sh * 0.04, 0], [12, sh * 0.02, 1]], 'rgba(30,5,3,.8)');
        for (let i = 0; i < 9; i++) wrap(sw, (i + rnd(i, 1) * 0.6) * sw / 9, x => { const h = sh * (0.3 + rnd(i, 2) * 0.4), w = h * 0.3; c.fillStyle = 'rgba(30,5,3,.85)'; poly(c, [x - w, sh, x - w * 0.2, sh - h, x + w * 0.25, sh - h * 0.85, x + w, sh]); c.fill(); c.fillStyle = 'rgba(255,110,20,.5)'; c.fillRect(x - 1, sh - h * 0.6, 2, h * 0.4); }); }],
    ice: [(c, sw, sh) => { const ks = [[4, sh * 0.15, 0.3], [9, sh * 0.08, 1], [19, sh * 0.03, 2]]; ridge(c, sw, sh, sh * 0.5, ks, 'rgba(150,200,240,.55)', 5, true);
        c.fillStyle = 'rgba(255,255,255,.7)'; for (let x = 0; x <= sw; x += 5) { const y = sh * 0.5 + Math.abs(per(x, sw, ks)) * 1.6 - sh * 0.1; if (y < sh * 0.4) c.fillRect(x, y, 5, sh * 0.06); } },
      (c, sw, sh) => { ridge(c, sw, sh, sh * 0.9, [[5, sh * 0.03, 0]], 'rgba(235,246,255,.85)');
        for (let i = 0; i < 16; i++) wrap(sw, (i + rnd(i, 1) * 0.6) * sw / 16, x => { const h = sh * (0.35 + rnd(i, 2) * 0.4), w = h * 0.32, b = sh * 0.92; c.fillStyle = 'rgba(90,150,200,.6)'; for (let k = 0; k < 3; k++) { const yy = b - h * (0.15 + k * 0.28); poly(c, [x - w * (1 - k * 0.25), yy + h * 0.32, x + w * (1 - k * 0.25), yy + h * 0.32, x, yy - h * 0.15]); c.fill(); }
          c.fillStyle = 'rgba(255,255,255,.8)'; for (let k = 0; k < 3; k++) { const yy = b - h * (0.15 + k * 0.28); poly(c, [x - w * (0.5 - k * 0.12), yy + h * 0.05, x + w * (0.5 - k * 0.12), yy + h * 0.05, x, yy - h * 0.15]); c.fill(); } }); }],
    jungle: [(c, sw, sh) => { ridge(c, sw, sh, sh * 0.6, [[5, sh * 0.08, 0], [11, sh * 0.05, 1]], 'rgba(20,80,40,.4)');
        for (let i = 0; i < 22; i++) wrap(sw, (i + 0.5) * sw / 22, x => { const r = sh * (0.1 + rnd(i, 1) * 0.08), y = sh * 0.55 - per(x, sw, [[5, sh * 0.08, 0], [11, sh * 0.05, 1]]); c.fillStyle = 'rgba(25,95,48,.4)'; c.beginPath(); c.arc(x, y + sh * 0.05, r, 0, TAU); c.fill(); }); },
      (c, sw, sh) => { c.lineCap = 'round'; for (let i = 0; i < 7; i++) wrap(sw, (i + rnd(i, 1) * 0.5) * sw / 7, x => { const h = sh * (0.45 + rnd(i, 2) * 0.3), lean = (rnd(i, 3) - 0.5) * h * 0.3, tx = x + lean, ty = sh - h;
          c.strokeStyle = 'rgba(40,30,15,.5)'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(x, sh); c.quadraticCurveTo(x, sh - h * 0.5, tx, ty); c.stroke(); c.fillStyle = 'rgba(10,60,28,.6)';
          for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55, L = h * 0.38; c.save(); c.translate(tx, ty); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.5, -L * 0.22, L, L * 0.25); c.quadraticCurveTo(L * 0.5, L * 0.1, 0, 0); c.fill(); c.restore(); } }); }],
    cloudc: [(c, sw, sh) => { c.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 14; i++) wrap(sw, (i + 0.5) * sw / 14, x => puff(c, x, sh * (0.55 + rnd(i, 1) * 0.15), sh * (0.12 + rnd(i, 2) * 0.06))); c.fillRect(0, sh * 0.62, sw, sh); },
      (c, sw, sh) => { for (let i = 0; i < 9; i++) wrap(sw, (i + rnd(i, 1) * 0.5) * sw / 9, x => { const y = sh * (0.45 + rnd(i, 2) * 0.3), s = sh * (0.1 + rnd(i, 3) * 0.06); c.fillStyle = 'rgba(255,255,255,.75)'; puff(c, x, y, s); Art.sparkle(c, x + s, y - s * 0.8, 4, '#ffd76a', 0.8); }); }]
  };
  const strip = (theme, layer, W, H) => { const bW = Math.max(32, Math.round(W / 32) * 32), bH = Math.max(32, Math.round(H / 32) * 32), sw = Math.round(bW * 1.6), sh = Math.round(bH * (layer ? 0.24 : 0.3)), sc = layer ? 0.6 : 0.5;
    return { k: W / bW, sw, sh, im: Art.spr(`plx|${theme}|${layer}|${bW}|${bH}`, sw * sc, sh * sc, (c, cw, ch) => { c.scale(cw / sw, ch / sh); STRIP[theme][layer](c, sw, sh);
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-out'; c.fillStyle = lin(c, 0, ch * 0.55, 0, ch, ['rgba(0,0,0,0)', 'rgba(0,0,0,1)']); c.fillRect(0, ch * 0.55, cw, ch * 0.45); }) }; };
  // c: 2D ctx in CSS px; layers: 1 = far only, 2 = far + mid. No-op for non-world themes.
  Art.parallax = (c, theme, W, H, t, beat, layers = 2) => { if (!STRIP[theme] || !(Art.THEMES[theme] || {}).world || !(layers > 0)) return;
    const pulse = Math.pow(1 - ((beat || 0) % 1 + 1) % 1, 3);
    for (let L = 0; L < Math.min(2, layers); L++) { const s = strip(theme, L, W, H), dw = s.sw * s.k, dh = s.sh * s.k, sp = L ? 22 : 8, off = (((t || 0) * sp) % dw + dw) % dw, y = H * (L ? 0.82 : 0.74) - dh - pulse * (L ? 3 : 1.5);
      c.drawImage(s.im, -off, y, dw + 1, dh); if (dw - off < W) c.drawImage(s.im, dw - off, y, dw + 1, dh); } };
  // ---------- G15: world accent overlays (same geometry as Art.tileImg: (bw+24)x(bh+24), tile at 12,12) ----------
  const ACC = {
    ice(c, w, h, R) { c.save(); c.shadowColor = '#bfe6ff'; c.shadowBlur = 6; rr(c, 1.5, 1.5, w - 3, h - 3, R); c.lineWidth = 2.5; c.strokeStyle = 'rgba(225,245,255,.95)'; c.stroke(); c.restore();
      c.save(); rr(c, 0, 0, w, h, R); c.clip(); c.fillStyle = 'rgba(255,255,255,.85)'; const n = Math.max(4, Math.round(w / 12)); for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n; poly(c, [x - w / n * 0.4, 0, x + w / n * 0.4, 0, x, 3 + (i % 3) * 2.5 + 2]); c.fill(); } c.restore();
      const s = Math.max(5, Math.min(w, h) * 0.11); c.strokeStyle = '#ffffff'; c.lineWidth = 1.6; c.lineCap = 'round'; c.save(); c.shadowColor = '#5ab0ff'; c.shadowBlur = 3; flake(c, s * 1.15, s * 1.15 + 3, s); flake(c, w - s * 1.15, h - s * 1.15, s * 0.8); c.restore(); },
    lava(c, w, h, R) { c.save(); rr(c, 0, 0, w, h, R); c.clip(); c.fillStyle = lin(c, 0, h * 0.62, 0, h, ['rgba(255,90,0,0)', 'rgba(255,90,0,.42)']); c.fillRect(0, h * 0.62, w, h * 0.38); c.restore();
      c.save(); c.shadowColor = '#ff6a00'; c.shadowBlur = 10; rr(c, 1.5, 1.5, w - 3, h - 3, R); c.lineWidth = 2.5; c.strokeStyle = lin(c, 0, 0, 0, h, ['rgba(255,200,80,.5)', 'rgba(255,120,20,.95)']); c.stroke(); c.restore();
      for (let i = 0; i < 6; i++) Art.sparkle(c, w * (0.1 + rnd(i, 1) * 0.8), h - 3 - rnd(i, 2) * h * 0.18, 2 + rnd(i, 3) * 2.5, i % 2 ? '#ffd76a' : '#ff8a2a', 0.9); },
    reef(c, w, h, R) { rr(c, 1.5, 1.5, w - 3, h - 3, R); c.lineWidth = 2; c.strokeStyle = 'rgba(160,250,255,.75)'; c.stroke(); const m = Math.min(w, h);
      [[0.1, 0.25, 0.09], [0.16, 0.12, 0.05], [0.88, 0.8, 0.08], [0.82, 0.92, 0.045], [0.93, 0.66, 0.035]].forEach(([fx, fy, fr]) => { const x = w * fx, y = h * fy, r = Math.max(2.5, m * fr); c.fillStyle = 'rgba(200,250,255,.22)'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.3; c.stroke(); c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, TAU); c.fill(); }); },
    neon(c, w, h, R) { c.save(); c.shadowColor = '#3dfcff'; c.shadowBlur = 10; rr(c, 0.5, 0.5, w - 1, h - 1, R); c.lineWidth = 2.5; c.strokeStyle = '#3dfcff'; c.stroke(); c.shadowColor = '#ff3df2'; rr(c, 4, 4, w - 8, h - 8, Math.max(2, R - 3)); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,61,242,.85)'; c.stroke(); c.restore(); },
    candy(c, w, h, R) { const cols = ['#ffffff', '#ff8cc6', '#8fe3ff', '#ffe066', '#b4f8c8']; rr(c, 1.5, 1.5, w - 3, h - 3, R); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.8)'; c.setLineDash([6, 5]); c.stroke(); c.setLineDash([]);
      for (let i = 0; i < 26; i++) { const e = i % 4, u = rnd(i, 1), x = e === 0 ? u * w : e === 1 ? w - 4 - rnd(i, 2) * 5 : e === 2 ? u * w : 4 + rnd(i, 2) * 5, y = e === 0 ? 4 + rnd(i, 2) * 5 : e === 2 ? h - 4 - rnd(i, 2) * 5 : u * h;
        if (i % 6 === 0) Art.sparkle(c, x, y, 3.5, '#fff', 0.95); else { c.fillStyle = cols[i % cols.length]; c.beginPath(); c.arc(x, y, 1.3 + rnd(i, 3) * 1.2, 0, TAU); c.fill(); } } },
    rainbow(c, w, h, R) { rr(c, 1.5, 1.5, w - 3, h - 3, R); c.lineWidth = 2.5; c.strokeStyle = lin(c, 0, 0, w, h, ['#ff6b9e', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa']); c.globalAlpha = 0.95; c.stroke(); c.globalAlpha = 1; Art.sparkle(c, w - 6, 6, 5, '#fff', 0.95); Art.sparkle(c, 6, h - 6, 4, '#fff', 0.8); },
    stone(c, w, h, R) { const m = Math.min(w, h), L = Math.max(8, m * 0.24); c.lineCap = 'round'; c.lineJoin = 'round';
      [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]].forEach(([x, y, sx, sy]) => { const ix = x + sx * 4, iy = y + sy * 4; c.strokeStyle = 'rgba(80,50,0,.5)'; c.lineWidth = 4.5; c.beginPath(); c.moveTo(ix, iy + sy * L); c.lineTo(ix, iy + sy * R * 0.3); c.lineTo(ix + sx * R * 0.3, iy); c.lineTo(ix + sx * L, iy); c.stroke();
        c.strokeStyle = '#ffd76a'; c.lineWidth = 2.5; c.stroke(); c.fillStyle = '#7dffc8'; c.beginPath(); c.arc(ix + sx * 3.5, iy + sy * 3.5, 2.2, 0, TAU); c.fill(); });
      c.fillStyle = 'rgba(70,160,70,.75)'; for (let i = 0; i < 7; i++) { const x = (i < 4 ? 6 + i * 5 : w - 6 - (i - 4) * 6), y = h - 2 - rnd(i, 1) * 3; c.beginPath(); c.ellipse(x, y, 3.5, 2.2, rnd(i, 2), 0, TAU); c.fill(); } },
    cloud(c, w, h, R) { c.save(); c.shadowColor = '#ffffff'; c.shadowBlur = 8; rr(c, 1.5, 1.5, w - 3, h - 3, R); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke(); c.restore();
      c.save(); rr(c, 0, 0, w, h, R); c.clip(); c.fillStyle = 'rgba(255,255,255,.75)'; const n = Math.max(4, Math.round(w / 16)); for (let i = 0; i <= n; i++) { const x = i * w / n, r = w / n * (0.45 + 0.2 * (i % 2)); c.beginPath(); c.arc(x, h + r * 0.35, r, 0, TAU); c.fill(); } c.restore(); Art.sparkle(c, w - 7, 7, 4, '#ffd76a', 0.9); }
  };
  Art.accentImg = (style, w, h) => { const f = ACC[style]; if (!f) return null; const bw = Math.round(w / 4) * 4, bh = Math.round(h / 4) * 4;
    return Art.spr(`acc|${style}|${bw}|${bh}`, bw + 24, bh + 24, c => { c.translate(12, 12); f(c, bw, bh, Math.min(bw, bh) * 0.22); }); };
  // ---------- G3/G4: shard + bloom sprites ----------
  Art.shardImg = col => Art.spr('shard|' + col, 32, 32, c => { const A = [16, 2], B = [30, 27], C = [3, 29], M = [17, 21];
    c.fillStyle = Art.mixc(col, '#ffffff', 0.55); poly(c, [A[0], A[1], M[0], M[1], C[0], C[1]]); c.fill();
    c.fillStyle = col; poly(c, [A[0], A[1], B[0], B[1], M[0], M[1]]); c.fill();
    c.fillStyle = Art.mixc(col, '#000000', 0.25); poly(c, [M[0], M[1], B[0], B[1], C[0], C[1]]); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 1.5; c.lineJoin = 'round'; c.beginPath(); c.moveTo(C[0], C[1]); c.lineTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(M[0], M[1]); c.stroke(); Art.sparkle(c, 14, 10, 3, '#fff', 0.9); });
  Art.bloomImg = col => Art.spr('bloom|' + col, 128, 128, c => { c.fillStyle = rad(c, 64, 64, 0, 64, ['rgba(255,255,255,.18)', 'rgba(255,255,255,.08)', 'rgba(255,255,255,.55)', 'rgba(255,255,255,1)', 'rgba(255,255,255,.4)', 'rgba(255,255,255,0)']); c.fillRect(0, 0, 128, 128);
    c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(0, 0, 128, 128);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, 64, 64, 34, 50, ['rgba(255,255,255,0)', 'rgba(255,255,255,.55)', 'rgba(255,255,255,0)']); c.fillRect(0, 0, 128, 128); });
})();
