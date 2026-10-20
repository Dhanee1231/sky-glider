// Color Magic pack: Seasons & Weather (9 original pictures, 2048 px world).
// Original art drawn in code by Grok 4.7 (paths only) for Dhanee's Playground, Oct 2026, review: Studio Lead.
// Includes Rainbow After Rain and Snowy Rainbow. No people, no letters, no logos.
(function () {
  const { circ, ell, star, poly, rect, rrect, cloud, smile, band, ring, wedge } = CMK;
  const { flower, eye, rays, sil } = CMK3;
  const BG = c => [c, rect(0, 0, 2048, 2048)];
  const pic = (id, name, stars, bg, pal, shapes, line) => ({ id, name, stars, w: 2048, h: 2048, bg, pal, shapes, line: line || [] });

  // Nested rainbow bands, outer radius first. Angles run the upper semicircle.
  const bow = (cx, cy, pairs, colors) => pairs.map((r, i) => [colors[i], band(cx, cy, r[0], r[1], 180, 360)]);
  const pairs = [[980, 840], [840, 700], [700, 560], [560, 420], [420, 280], [280, 140]];

  // Three-tier pine plus a trunk. s >= 320 keeps every triangle and the trunk large.
  function pine(x, y, s, dark, light, trunk) {
    return [
      [dark, poly([x - s, y, x + s, y, x, y - s * 1.3])],
      [light, poly([x - s * 0.85, y - s * 0.7, x + s * 0.85, y - s * 0.7, x, y - s * 1.9])],
      [dark, poly([x - s * 0.65, y - s * 1.35, x + s * 0.65, y - s * 1.35, x, y - s * 2.45])],
      [trunk, rrect(x - s * 0.28, y - s * 0.05, s * 0.56, s * 1.15, 12)]
    ];
  }

  // 0 sky 1 glow 2 sun 3 white 4 hill 5 grass 6 trunk 7 blossom 8 blossom pale 9 leaf 10 petal 11 cloud shade
  const springPal = ['#9fd4ff', '#fff6dc', '#ffd34d', '#ffffff', '#c6f5ae', '#2fbe5a', '#c47a32', '#ff5fa2', '#ffb3d1', '#3cba5a', '#ff8ec4', '#e8f7ff'];
  const blooms = [
    [1040, 520], [780, 680], [1040, 640], [1300, 680],
    [640, 860], [900, 820], [1160, 820], [1420, 860],
    [760, 1040], [1040, 1000], [1320, 1040],
    [900, 1200], [1200, 1180]
  ];
  const sw1 = pic('sw1', 'Blossom Tree', 2, '#9fd4ff', springPal, [
    BG(0),
    [1, circ(300, 300, 220)], [2, circ(300, 300, 150)],
    [3, cloud(1600, 260, 800)], [11, cloud(1180, 180, 720)],
    [4, ell(500, 1560, 900, 340)], [5, ell(1300, 1980, 1400, 420)],
    [6, rrect(940, 1100, 220, 720, 24)],
    [9, ell(560, 980, 180, 125, 30)],
    [9, ell(1540, 960, 180, 125, -28)],
    [9, ell(680, 760, 170, 120, 16)],
    [9, ell(1460, 740, 170, 120, -18)],
    [9, ell(500, 1180, 175, 120, 40)],
    [9, ell(1600, 1160, 175, 120, -36)],
    ...blooms.map((p, i) => [[7, 8, 3, 7][i % 4], circ(p[0], p[1], 165)]),
    [10, ell(280, 640, 180, 125, 20)],
    [10, ell(480, 480, 175, 120, -16)],
    [8, ell(1700, 560, 180, 120, 24)],
    [7, ell(1820, 760, 170, 115, -20)],
    ...flower(360, 1680, 280, 7, 2),
    [4, ell(1760, 1780, 220, 145)],
    [5, ell(700, 1880, 200, 130)],
    [8, circ(1760, 1500, 155)]
  ], []);

  // Pointed sun ray: base chord at R0 (hidden under the sun), tip at R1, half-width h degrees.
  const ray = (cx, cy, a, h, R0, R1) => { const p = (r, d) => [cx + Math.cos(d * Math.PI / 180) * r, cy + Math.sin(d * Math.PI / 180) * r]; return poly([...p(R0, a - h), ...p(R1, a), ...p(R0, a + h)]); };
  // 0 sky 1 sand 2 sun 3 sea 4 deep 5 cheek 6 ray 7 sail 8 eye 9 mouth 10 pink 11 white
  const sunPal = ['#8fd4ff', '#ffe7a8', '#ffd34d', '#2ec8c0', '#1496c8', '#ff8fb8', '#ff8a3d', '#7a3cff', '#5c3318', '#e23d4a', '#ff5fa2', '#ffffff'];
  const sw2 = pic('sw2', 'Summer Sun', 1, '#8fd4ff', sunPal, [
    BG(0),
    [11, cloud(300, 220, 480)], [11, cloud(1750, 220, 480)],
    ...[-157.5, -112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5].map(a => [6, ray(1024, 760, a, 21, 450, 800)]),
    [2, circ(1024, 760, 470)],
    [8, ell(870, 660, 104, 146)], [8, ell(1178, 660, 104, 146)],
    [5, circ(712, 880, 122)], [5, circ(1336, 880, 122)],
    [9, 'M854 870A170 170 0 0 0 1194 870Z'],
    [3, rect(0, 1500, 2048, 548)],
    [4, rect(0, 1500, 2048, 90)],
    [1, ell(1024, 2100, 1250, 400)],
    [10, poly([180, 1580, 620, 1580, 540, 1710, 260, 1710])],
    [7, poly([410, 1560, 410, 1160, 650, 1560])],
    [11, poly([395, 1560, 395, 1160, 170, 1560])],
    [10, wedge(1580, 1800, 240, -90, 0)], [11, wedge(1580, 1800, 240, 0, 90)],
    [4, wedge(1580, 1800, 240, 90, 180)], [11, wedge(1580, 1800, 240, 180, 270)],
    [6, star(760, 1880, 200, 95, 5)]
  ], ['M402 1570V1130', 'M1600 1300Q1640 1260 1680 1300Q1720 1260 1760 1300', 'M1800 1180Q1830 1150 1860 1180Q1890 1150 1920 1180',
    'M860 1660Q920 1630 980 1660Q1040 1630 1100 1660', 'M1700 1540Q1760 1510 1820 1540']);

  // 0 sky 1 sun 2 white 3 hill 4 grass 5 trunk 6 red 7 orange 8 gold 9 pumpkin 10 stem 11 shade
  const fallPal = ['#ffd9a8', '#ffd34d', '#ffffff', '#f7c98a', '#e09a4a', '#a86b3c', '#ff4d4a', '#ff8a3d', '#ffe566', '#ff7a1a', '#2e9a45', '#fff3d6'];
  const leaves = [
    [1040, 520, 10], [800, 660, -20], [1040, 640, 16], [1280, 660, -12],
    [660, 840, 24], [880, 800, -18], [1120, 800, 14], [1360, 840, -22],
    [760, 1000, 30], [1000, 980, -8], [1240, 1000, 18], [1480, 960, -28],
    [860, 1160, 12], [1100, 1140, -16], [1320, 1160, 20],
    [600, 700, 40], [1500, 720, -36], [520, 980, 18]
  ];
  const groundLeaves = [[420, 1760, 20], [620, 1840, -14], [860, 1780, 28], [1280, 1820, -20], [1500, 1760, 12], [1720, 1840, -24], [1080, 1880, 8]];
  const sw3 = pic('sw3', 'Leaf Fall', 2, '#ffd9a8', fallPal, [
    BG(0),
    [11, circ(1680, 280, 210)], [1, circ(1680, 280, 145)],
    [2, cloud(480, 240, 760)],
    [3, ell(600, 1560, 1000, 320)], [4, ell(1200, 1980, 1450, 400)],
    [5, rrect(960, 1120, 210, 680, 22)],
    ...leaves.map((p, i) => [[6, 7, 8][i % 3], ell(p[0], p[1], 175, 125, p[2])]),
    ...groundLeaves.map((p, i) => [[7, 6, 8][i % 3], ell(p[0], p[1], 175, 120, p[2])]),
    [9, circ(620, 1680, 200)],
    [10, rrect(560, 1420, 180, 300, 18)],
    [9, circ(980, 1720, 185)],
    [10, rrect(920, 1480, 170, 280, 16)],
    [9, circ(1320, 1660, 175)],
    [10, rrect(1260, 1440, 170, 270, 16)],
    [6, ell(240, 1620, 180, 125, 24)],
    [8, ell(1860, 1600, 175, 120, -18)]
  ], []);

  // Shade crescent on a snowball: the ball plus a reversed copy shifted by (dx, dy), clipped to the ball,
  // leaves the far side as one shadow region (nonzero fill).
  const crescent = (cx, cy, R, dx, dy) => { const x = Math.round(cx + dx - R), y = Math.round(cy + dy), d = 2 * R;
    return [2, circ(cx, cy, R) + 'M' + x + ' ' + y + 'a' + R + ' ' + R + ' 0 1 1 ' + d + ' 0a' + R + ' ' + R + ' 0 1 1 ' + -d + ' 0Z', circ(cx, cy, R)]; };
  // 0 sky 1 snow 2 shade 3 glow 4 door 5 wood 6 chimney 7 window 8 carrot 9 coal 10 scarf 11 red 12 light wood
  const snowPal = ['#c5ecff', '#ffffff', '#cfe6f7', '#fff3b0', '#2fba6a', '#f0a04a', '#c45c32', '#ffd34d', '#ff8a3d', '#4a3428', '#ff5fa2', '#e23d4a', '#ffc27a'];
  const sw4 = pic('sw4', 'Snow Cottage', 3, '#c5ecff', snowPal, [
    BG(0),
    [3, circ(1240, 250, 220)], [7, circ(1240, 250, 150)],
    [1, star(170, 260, 196, 82, 6)], [2, star(850, 250, 196, 82, 6)], [1, star(1060, 640, 196, 82, 6)], [2, star(1880, 190, 196, 82, 6)],
    [2, circ(1590, 360, 122)], [2, circ(1800, 500, 120)],
    [2, ell(1024, 1780, 1300, 280)],
    [6, rect(1690, 630, 170, 450)],
    [11, poly([1100, 1190, 2000, 1190, 1550, 700])],
    [1, sil([[1550, 688, 1], [1800, 968, 1], [1740, 1010], [1680, 965], [1620, 1012], [1560, 965], [1500, 1012], [1440, 965], [1380, 1010], [1300, 968, 1]])],
    ...[0, 1, 2, 3, 4].map(i => [i % 2 ? 12 : 5, rect(1170, 1190 + i * 124, 780, 124)]),
    [7, rrect(1210, 1290, 210, 225, 18)], [7, rrect(1710, 1290, 210, 225, 18)],
    [4, rrect(1460, 1470, 220, 340, 100)],
    [4, circ(1020, 1690, 130)],
    [1, ell(1024, 2140, 1500, 380)],
    [2, ell(1080, 1880, 180, 100)], [2, ell(1900, 1950, 170, 100)],
    [11, rrect(1300, 1900, 460, 110, 40)],
    [1, circ(520, 1690, 350)], crescent(520, 1690, 350, 70, -70), [9, circ(520, 1620, 120)],
    [1, circ(520, 1180, 280)], crescent(520, 1180, 280, 70, -70), [9, circ(520, 1180, 120)],
    [10, rrect(650, 950, 130, 400, 40)],
    [1, circ(520, 650, 270)],
    [9, ell(408, 640, 100, 145)], [9, ell(632, 640, 100, 145)],
    [10, rrect(250, 880, 540, 120, 55)],
    [8, poly([490, 780, 990, 875, 490, 970])],
    [9, rect(370, 40, 300, 330)], [11, rect(370, 200, 300, 160)], [9, rrect(290, 360, 460, 110, 30)]
  ], [
    'M270 1090L70 880M140 960L70 990M120 935L120 860', 'M770 1110L1010 1020M940 1045L990 1100M910 1060L940 990',
    'M1315 1290V1515M1210 1402H1420', 'M1815 1290V1515M1710 1402H1920', 'M1612 1640a16 16 0 1 0 32 0a16 16 0 1 0 -32 0',
    'M1280 2000Q1300 2030 1340 2030H1760Q1800 2030 1800 1990'
  ]);

  // 0 sky 1 cloud 2 cloud dark 3 pink 4 gold 5 teal 6 purple 7 handle 8 boot 9 puddle 10 white 11 grass 12 drop
  const rainPal = ['#b7e6ff', '#7a8cff', '#3a45c4', '#ff5fa2', '#ffd34d', '#2ec8c0', '#b56cff', '#8a4424', '#ff8a3d', '#5ec8ff', '#ffffff', '#3cba5a', '#9fd4ff'];
  const canopy = ell(1024, 980, 660, 360);
  const sw5 = pic('sw5', 'Rainy Walk', 2, '#b7e6ff', rainPal, [
    BG(0),
    [10, circ(1760, 320, 240)], [4, circ(1760, 320, 155)],
    [1, circ(420, 360, 280)],
    [2, circ(680, 300, 250)],
    [1, circ(560, 480, 230)],
    [2, circ(300, 460, 210)],
    [12, ell(260, 780, 140, 220)],
    [12, ell(420, 920, 135, 215)],
    [12, ell(600, 760, 140, 220)],
    [12, ell(760, 980, 130, 210)],
    [12, ell(340, 1120, 135, 215)],
    [12, ell(560, 1180, 140, 220)],
    [12, ell(180, 1040, 130, 210)],
    [3, rect(364, 700, 330, 560), canopy],
    [4, rect(694, 700, 330, 560), canopy],
    [5, rect(1024, 700, 330, 560), canopy],
    [6, rect(1354, 700, 330, 560), canopy],
    [7, rrect(960, 1120, 150, 500, 36)],
    [8, rrect(780, 1560, 240, 300, 40)],
    [7, ell(860, 1840, 200, 115)],
    [8, rrect(1140, 1560, 240, 300, 40)],
    [7, ell(1220, 1840, 200, 115)],
    [9, ell(1080, 1900, 720, 180)],
    [10, ell(900, 1840, 260, 80)],
    [11, ell(240, 1760, 220, 150)],
    [11, ell(1800, 1760, 230, 150)],
    ...flower(520, 1500, 280, 3, 4)
  ], []);

  // 0 sky 1 sun 2 white 3 cloud 4 cloud dark 5 hill 6 grass 7 puddle 8 drop 9 petal 10 leaf 11 glow
  const afterPal = ['#c5ecff', '#ffd34d', '#ffffff', '#7a8cff', '#3e49c8', '#8ee87a', '#2fbe5a', '#3ec8e0', '#bfe9ff', '#ff5fa2', '#b56cff', '#ff8a3d'];
  const bowColors = [9, 11, 1, 6, 7, 10];
  const sw6 = pic('sw6', 'Rainbow After Rain', 2, '#c5ecff', afterPal, [
    BG(0),
    ...bow(1024, 1680, pairs, bowColors),
    [2, circ(1760, 340, 250)], [1, circ(1760, 340, 165)],
    [2, cloud(1200, 240, 740)], [2, cloud(520, 180, 700)],
    [3, circ(340, 460, 270)],
    [4, circ(560, 400, 240)],
    [3, circ(460, 600, 220)],
    [4, circ(260, 620, 200)],
    [8, ell(300, 900, 140, 220)],
    [8, ell(460, 1040, 135, 215)],
    [8, ell(240, 1120, 140, 220)],
    [8, ell(520, 860, 130, 210)],
    [8, ell(380, 1240, 135, 210)],
    [5, ell(620, 1560, 720, 300)],
    [5, ell(1500, 1580, 760, 300)],
    [6, ell(1024, 1960, 1500, 380)],
    [7, ell(780, 1860, 280, 110)],
    [7, ell(1360, 1880, 300, 115)],
    [2, ell(760, 1820, 260, 120)],
    ...flower(520, 1500, 280, 9, 1),
    ...flower(1520, 1520, 280, 10, 1),
    [5, circ(1024, 1880, 155)],
    [6, ell(1024, 1880, 200, 130)]
  ], []);

  // 0 sky 1 snow 2 shade 3 sun 4 pine 5 pine dark 6 red 7 orange 8 gold 9 green 10 blue 11 purple 12 ice 13 trunk
  const snowBow = ['#d4f0ff', '#ffffff', '#e7f4fb', '#fff6c8', '#2fba6a', '#1f8e4e', '#ff4b6e', '#ff8a3d', '#ffd34d', '#3dcc6a', '#3ec8e0', '#b56cff', '#c5e8ff', '#8a5a32'];
  const sw7 = pic('sw7', 'Snowy Rainbow', 3, '#d4f0ff', snowBow, [
    BG(0),
    [3, circ(1024, 200, 170)], [1, circ(1600, 180, 220)],
    ...bow(1040, 1700, pairs, [6, 7, 8, 9, 10, 11]),
    [2, ell(520, 1560, 700, 260)],
    [1, ell(1500, 1580, 760, 260)],
    [1, ell(1024, 1980, 1500, 360)],
    ...pine(360, 1760, 340, 5, 4, 13),
    ...pine(1700, 1780, 330, 5, 4, 13),
    [1, star(280, 360, 230, 95, 6)],
    [2, star(620, 240, 210, 90, 6)],
    [1, star(1460, 340, 230, 95, 6)],
    [2, star(1760, 520, 210, 90, 6)],
    [1, star(980, 460, 220, 90, 6)],
    [2, star(1240, 240, 210, 90, 6)],
    [12, ell(1040, 1920, 520, 160)],
    [1, ell(920, 1860, 240, 70)],
    [1, circ(260, 1860, 165)],
    [2, circ(720, 1840, 170)],
    [1, circ(1400, 1860, 160)],
    [2, circ(1800, 1800, 155)],
    [1, circ(1040, 1760, 155)],
    [1, cloud(760, 280, 720)],
    [2, cloud(1320, 500, 700)],
    [1, circ(480, 1680, 160)],
    [2, circ(1600, 1680, 155)],
    [1, circ(200, 1480, 150)],
    [2, circ(1880, 1460, 150)],
    [1, star(400, 560, 220, 90, 6)]
  ], []);

  // 0 sky 1 glow 2 sun 3 cloud 4 pink 5 yellow 6 teal 7 purple 8 grass 9 hill 10 bow
  const kitePal = ['#8fd4ff', '#fff6dc', '#ffd34d', '#ffffff', '#ff5fa2', '#ffe566', '#2ec8c0', '#b56cff', '#2fbe5a', '#c6f5ae', '#ff8a5c'];
  function kite(cx, cy, w, h, a, b, c, d) {
    return [
      [a, poly([cx, cy - h, cx - w, cy, cx, cy])],
      [b, poly([cx, cy - h, cx + w, cy, cx, cy])],
      [c, poly([cx, cy + h, cx + w, cy, cx, cy])],
      [d, poly([cx, cy + h, cx - w, cy, cx, cy])]
    ];
  }
  const sw8 = pic('sw8', 'Kite Breeze', 1, '#8fd4ff', kitePal, [
    BG(0),
    [1, circ(1680, 280, 220)], [2, circ(1680, 280, 150)],
    [3, cloud(480, 360, 780)], [3, cloud(1100, 180, 700)],
    [9, ell(600, 1600, 900, 300)], [8, ell(1400, 1980, 1300, 380)],
    ...kite(620, 860, 400, 520, 4, 5, 6, 7),
    ...kite(1500, 980, 360, 460, 7, 6, 5, 4),
    [10, circ(560, 1520, 150)],
    [4, circ(680, 1680, 145)],
    [5, circ(600, 1860, 150)],
    [10, circ(1560, 1560, 150)],
    [6, circ(1440, 1720, 145)],
    [4, circ(1560, 1880, 145)],
    [9, ell(240, 1800, 200, 135)],
    [2, star(240, 220, 210, 105, 4)],
    [10, star(1780, 640, 210, 105, 4)]
  ], [
    'M620 340V1380', 'M220 860H1020',
    'M620 1380Q560 1520 680 1680', 'M680 1680Q600 1860 640 1960',
    'M1500 520V1440', 'M1140 980H1860',
    'M1500 1440Q1560 1560 1440 1720', 'M1440 1720Q1560 1880 1500 1980',
    'M620 1500L620 2040', 'M1500 1600L1500 2040'
  ]);

  // 0 sky 1 puff 2 puff deep 3 puff pale 4 ink 5 bolt 6 drop 7 hill 8 house 9 roof 10 window 11 grass
  const stormPal = ['#8fd4ff', '#7b5cff', '#4a2ec4', '#c4b6ff', '#2a1d66', '#ffe14a', '#7ecbff', '#3cba5a', '#ff8a5c', '#c45a28', '#ffd34d', '#8ee87a'];
  const sw9 = pic('sw9', 'Thunder Boom', 2, '#8fd4ff', stormPal, [
    BG(0),
    [5, circ(1880, 220, 180)],
    [11, ell(500, 1500, 800, 280)],
    [7, ell(1400, 1680, 1100, 320)],
    [1, circ(780, 520, 340)],
    [2, circ(1080, 420, 320)],
    [3, circ(1360, 520, 300)],
    [2, circ(900, 700, 280)],
    [1, circ(1220, 680, 300)],
    [4, circ(620, 700, 240)],
    [3, circ(1500, 700, 230)],
    [2, circ(1040, 860, 260)],
    [5, poly([900, 640, 1180, 620, 1020, 1040, 1280, 1000, 820, 1680, 1100, 1160, 900, 1180, 1040, 760])],
    [5, poly([1280, 1000, 1540, 960, 1360, 1280, 1500, 1260, 1180, 1560, 1320, 1240])],
    [6, ell(640, 1100, 140, 220)],
    [6, ell(820, 1240, 135, 215)],
    [6, ell(480, 1280, 140, 220)],
    [6, ell(700, 1420, 130, 210)],
    [6, ell(1500, 1180, 135, 215)],
    [6, ell(1680, 1360, 140, 220)],
    [8, rrect(300, 1480, 460, 360, 20)],
    [9, poly([250, 1520, 810, 1520, 530, 1180])],
    [10, rrect(400, 1580, 240, 220, 18)],
    [4, rrect(250, 1280, 160, 280, 14)],
    [3, cloud(300, 1160, 720)],
    [11, ell(1680, 1860, 220, 140)],
    [7, ell(200, 1860, 200, 140)]
  ], []);

  CM_PACK('seasons', { name: 'Seasons & Weather', order: 12 }, [sw1, sw2, sw3, sw4, sw5, sw6, sw7, sw8, sw9]);
})();
