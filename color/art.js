// Color Magic art: icons (inline SVG drawn in code), frames, stickers, heart jar. No emoji, no images.
(function () {
  'use strict';
  const S = (b, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + b + '</svg>';
  const F = b => '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">' + b + '</svg>';
  const ICON = {
    home: F('<path d="M3 12 12 4l9 8h-2.5v8h-4.5v-5h-4v5H5.5v-8z"/>'),
    gear: S('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>'),
    pause: F('<rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/>'),
    play: F('<path d="M7 4.5v15l12-7.5z"/>'),
    undo: S('<path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h8a6 6 0 0 1 0 12" transform="translate(0 -4)"/>'),
    hint: S('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l6 6"/>'),
    wand: S('<path d="M4 20 15 9"/><path d="M17 3v4M15 5h4M20 10v3M18.5 11.5h3"/>'),
    hand: S('<path d="M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 6-5.5 6S7 18 6 15l-1.5-3a1.5 1.5 0 0 1 2.6-1.4L8 12"/>'),
    packs: F('<rect x="3.5" y="4.5" width="17" height="15" rx="3" fill="none" stroke-width="2.4"/><circle cx="9" cy="10" r="1.8"/><path d="M5 18l5-5 3 3 2-2 4 4z"/>'),
    photo: S('<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    gallery: F('<path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2 6.3 20.3l1.2-6.4L2.8 9.5l6.4-.8z"/>'),
    next: F('<path d="M5 5v14l8-7zM12 5v14l8-7z"/>'),
    replay: S('<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4.5h4.5"/>'),
    eye: S('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    close: S('<path d="M6 6l12 12M18 6 6 18"/>'),
    brush: S('<path d="M20 4c-6 1-10 5-11 9l3 3c4-1 8-5 8-12z"/><path d="M9 13c-3 0-5 2-5 6 4 0 6-2 6-5"/>'),
    heart: F('<path d="M12 20.5C4 14.5 2.5 10.5 2.5 8A4.8 4.8 0 0 1 12 6.5 4.8 4.8 0 0 1 21.5 8c0 2.5-1.5 6.5-9.5 12.5z"/>'),
    gem: F('<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3 7 9l5 12 5-12-2-6" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/>'),
    check: S('<path d="M4 12.5l5 5L20 6.5"/>'),
    lock: F('<rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke-width="2.4"/>'),
    sparkle: F('<path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/>'),
    back: S('<path d="M15 5 8 12l7 7"/>'),
    squares: F('<rect x="3" y="3" width="8" height="8" rx="1.6"/><rect x="13" y="3" width="8" height="8" rx="1.6" fill-opacity=".55"/><rect x="3" y="13" width="8" height="8" rx="1.6" fill-opacity=".55"/><rect x="13" y="13" width="8" height="8" rx="1.6"/>'),
    shapes: F('<path d="M12 2.5 21 9l-3.4 12H6.4L3 9z" fill-opacity=".9"/><circle cx="12" cy="12.5" r="3.6" fill="#fff" stroke="none" fill-opacity=".85"/>'),
    minus: S('<path d="M5 12h14"/>'),
    plus: S('<path d="M5 12h14M12 5v14"/>'),
    burst: F('<path d="M12 1.8l2.3 5.6 5.4-2.9-2.1 5.8 6.2.9-5.2 3.5 3.7 4.9-6-1.2-.7 6.3L12 17.8 8.4 22.7l-.7-6.3-6 1.2 3.7-4.9L.2 9.3l6.2-.9L4.3 2.6l5.4 2.9z" transform="translate(0 -.4) scale(.98)"/>'),
    save: S('<path d="M12 3.5v11.5M7 10.5l5 5 5-5M4.5 20.5h15"/>'),
    frame: S('<rect x="3" y="3" width="18" height="18" rx="3"/><rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/>'),
    trash: S('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>')
  };
  const icon = n => ICON[n] || '';
  const hearts = (n, c) => { let s = ''; for (let i = 0; i < n; i++) s += '<i class="hs" style="color:' + (c || '#ff5fa2') + '">' + ICON.heart + '</i>'; return s; };
  // frames: pink (1st picture), gold (3rd), silver (5th), gem (10th)
  const FRAMES = [{ id: 'none', n: 0 }, { id: 'pink', n: 1, a: '#ff8fcf', b: '#d6339f' }, { id: 'gold', n: 3, a: '#fff0a0', b: '#d99a00' }, { id: 'silver', n: 5, a: '#ffffff', b: '#8f93b8' }, { id: 'gem', n: 10, a: '#8ff0f4', b: '#9b5cff' }];
  const frameFor = done => { let f = FRAMES[0]; for (const x of FRAMES) if (done >= x.n) f = x; return f; };
  function drawFrame(c, w, h, fr, bw) {
    if (!fr || !fr.a) return; bw = bw || Math.max(8, Math.round(Math.min(w, h) * 0.035));
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, fr.a); g.addColorStop(0.5, fr.b); g.addColorStop(1, fr.a);
    c.save(); c.fillStyle = g; c.beginPath(); c.rect(0, 0, w, h); c.rect(bw, bw, w - 2 * bw, h - 2 * bw); c.fill('evenodd');
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = Math.max(1, bw * 0.12); c.strokeRect(bw, bw, w - 2 * bw, h - 2 * bw);
    if (fr.id === 'gem') { c.fillStyle = '#fff'; for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h], [w / 2, 0], [w / 2, h], [0, h / 2], [w, h / 2]]) { c.beginPath(); c.arc(x, y, bw * 0.75, 0, 6.283); c.fill(); c.fillStyle = '#ff5fa2'; c.beginPath(); c.arc(x, y, bw * 0.45, 0, 6.283); c.fill(); c.fillStyle = '#fff'; } }
    c.restore();
  }
  const STK = ['#ff5fa2', '#b56cff', '#4fd8e0', '#ffd34d'];
  // sticker for a picture id: a round badge with a heart or gem
  const sticker = (id, k) => { const col = STK[k % 4]; return '<span class="stk" style="background:' + col + '">' + (k % 2 ? ICON.gem : ICON.heart) + '</span>'; };
  self.CMArt = { icon, hearts, FRAMES, frameFor, drawFrame, sticker };
})();
