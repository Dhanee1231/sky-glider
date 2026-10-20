// Color Magic pack 8: Magic Garden (8 original pictures, 2048 px world).
// Original art drawn in code by Grok 4.7 (paths only) for Dhanee's Playground, Oct 2026, review: Studio Lead.
// No outside characters, logos, text, or brands. Load kit.js then kit2.js first.
(function () {
  const { circ, ell, heart, poly, rect, rrect, cloud, band, smile } = CMK;
  const { flower, bloom, spark, bush } = CMK2;
  // 0 pink, 1 light pink, 2 purple, 3 teal, 4 gold, 5 sky, 6 grass, 7 cream, 8 coral, 9 deep grass, 10 tan, 11 light grass, 12 red, 13 blue
  const P = ['#ff5fa2', '#ffc2e2', '#b56cff', '#4fd8e0', '#ffd34d', '#bfe6ff', '#7fdc8a', '#fff6ea', '#ff8a5c', '#34c46a', '#e0a36a', '#b6f0a4', '#ff4b6e', '#3aa0ff'];
  const sky = [5, rect(0, 0, 2048, 2048)];
  // chunky tulip: thick stem, two leaves, three-part cup. Every part is a large region.
  const tulip = (cx, cy, bc, sc, lc) => [
    [sc, rrect(cx - 70, cy + 30, 140, 480, 50)],
    [lc, ell(cx - 170, cy + 300, 190, 85, -32)],
    [lc, ell(cx + 175, cy + 320, 190, 85, 32)],
    [bc, ell(cx, cy, 160, 200)],
    [bc, ell(cx - 75, cy + 16, 115, 165, -16)],
    [bc, ell(cx + 75, cy + 16, 115, 165, 16)]
  ];
  const shroom = (cx, cy, cap, stem, spot) => [
    [stem, rrect(cx - 130, cy + 20, 260, 560, 70)],
    [cap, ell(cx, cy, 400, 270)],
    [spot, circ(cx - 150, cy - 40, 130)],
    [spot, circ(cx + 140, cy + 50, 125)]
  ];

  // gd1: a garden gate with a round arch and flowers at the posts
  const gd1 = {
    id: 'gd1', name: 'Flower Gate', stars: 2, w: 2048, h: 2048, bg: '#bfe6ff', pal: P,
    shapes: [sky, [4, circ(340, 280, 180)],
      [7, cloud(980, 220, 700)], [7, cloud(1680, 360, 720)],
      [6, ell(1024, 2060, 1400, 480)],
      [10, poly([900, 2048, 1148, 2048, 1100, 1520, 948, 1520])],
      [11, rrect(600, 1120, 210, 820, 46)], [11, rrect(1238, 1120, 210, 820, 46)],
      [0, band(1024, 1460, 520, 360, 206, 334)],
      [7, rrect(620, 1280, 808, 150, 40)],
      [4, circ(705, 1080, 140)], [4, circ(1343, 1080, 140)],
      [2, heart(1024, 1040, 170)],
      ...flower(460, 1680, 250, 0, 4), ...flower(1600, 1700, 250, 2, 4),
      ...flower(700, 1640, 250, 8, 4), ...flower(1360, 1640, 250, 12, 4),
      ...flower(1024, 1560, 250, 1, 8),
      [9, bush(180, 1860, 190)], [9, bush(1880, 1880, 190)],
      spark(1880, 180, 200, 4), spark(160, 640, 200, 0)],
    line: []
  };

  // gd2: a round fountain with four big tulips in front
  const gd2 = {
    id: 'gd2', name: 'Tulip Fountain', stars: 3, w: 2048, h: 2048, bg: '#bfe6ff', pal: P,
    shapes: [sky, [4, circ(1680, 280, 180)],
      [7, cloud(360, 300, 700)], [7, cloud(1100, 180, 680)],
      [6, ell(1024, 2060, 1400, 500)],
      [10, rrect(900, 1160, 248, 420, 50)],
      [3, ell(1024, 1120, 340, 150)], [13, ell(1024, 1100, 230, 90)],
      [7, ell(1024, 1540, 680, 250)], [3, ell(1024, 1500, 520, 160)],
      [13, ell(860, 900, 100, 170)], [3, ell(1024, 780, 110, 190)], [13, ell(1200, 900, 100, 170)],
      ...tulip(460, 1460, 12, 9, 6), ...tulip(780, 1580, 0, 9, 6),
      ...tulip(1280, 1580, 2, 9, 6), ...tulip(1600, 1460, 8, 9, 6),
      [10, ell(480, 1960, 180, 110)], [10, ell(1024, 1980, 200, 120)], [10, ell(1600, 1960, 180, 110)],
      [0, heart(1024, 1480, 160)],
      ...bloom(1024, 420, 270, 1, 4),
      spark(240, 180, 200, 4), spark(1900, 640, 200, 8)],
    line: []
  };

  // gd3: three friendly mushrooms on a garden path
  const gd3 = {
    id: 'gd3', name: 'Mushroom Parade', stars: 2, w: 2048, h: 2048, bg: '#bfe6ff', pal: P,
    shapes: [sky, [4, circ(1024, 240, 170)],
      [7, cloud(300, 360, 680)], [7, cloud(1760, 300, 700)],
      [6, ell(1024, 2080, 1400, 460)],
      [10, ell(1024, 1980, 360, 700)],
      ...shroom(460, 1120, 0, 7, 4), ...shroom(1024, 1040, 12, 7, 1), ...shroom(1580, 1140, 8, 7, 4),
      ...flower(460, 1700, 250, 0, 4), ...flower(820, 1720, 250, 2, 4),
      ...flower(1260, 1720, 250, 12, 4), ...flower(1600, 1700, 250, 1, 8),
      [10, ell(360, 1980, 170, 100)], [10, ell(1024, 1960, 180, 100)], [10, ell(1700, 1980, 170, 100)],
      [9, bush(160, 1600, 180)], [6, bush(1900, 1620, 180)],
      spark(180, 180, 200, 4), spark(1880, 160, 200, 8),
      [2, heart(1024, 1280, 160)]],
    line: []
  };

  // gd4: two smiling sunflowers (easy)
  const petals = (cx, cy, s, pc) => {
    const o = [];
    for (let i = 0; i < 8; i++) {
      const a = (-90 + i * 45) * Math.PI / 180;
      o.push([pc, ell(cx + Math.cos(a) * s * 0.9, cy + Math.sin(a) * s * 0.9, s * 0.55, s * 0.32, -90 + i * 45)]);
    }
    return o;
  };
  const gd4 = {
    id: 'gd4', name: 'Sunflower Friends', stars: 1, w: 2048, h: 2048, bg: '#bfe6ff',
    pal: ['#ffd34d', '#ffe14a', '#7fdc8a', '#34c46a', '#bfe6ff', '#fff6ea', '#5b2a86', '#ff8a5c', '#c98a5b'],
    shapes: [[4, rect(0, 0, 2048, 2048)], [1, circ(1700, 280, 170)],
      [2, ell(1024, 2060, 1300, 420)],
      [8, rrect(560, 1180, 90, 760, 40)], [8, rrect(1400, 1120, 90, 820, 40)],
      [3, ell(430, 1500, 180, 70, -30)], [3, ell(760, 1460, 170, 64, 24)],
      [3, ell(1280, 1420, 170, 64, -24)], [3, ell(1640, 1500, 180, 70, 30)],
      ...petals(620, 860, 280, 0), [6, circ(620, 860, 150)],
      ...petals(1440, 820, 300, 1), [6, circ(1440, 820, 160)],
      [5, circ(560, 820, 36)], [5, circ(680, 820, 36)], [5, circ(1370, 780, 40)], [5, circ(1510, 780, 40)],
      [7, circ(568, 828, 16)], [7, circ(688, 828, 16)], [7, circ(1380, 788, 18)], [7, circ(1520, 788, 18)],
      [8, circ(560, 940, 34)], [8, circ(690, 930, 30)], [8, circ(1360, 900, 36)], [8, circ(1520, 890, 32)]],
    line: [smile(620, 900, 40, 18), smile(1440, 860, 46, 20)]
  };

  // gd5: an arch of roses over a path
  const rose = (cx, cy, c0, c1, c2) => [[c0, circ(cx, cy, 130)], [c1, circ(cx, cy, 84)], [c2, circ(cx, cy, 42)]];
  const gd5 = {
    id: 'gd5', name: 'Rose Arch', stars: 2, w: 2048, h: 2048, bg: '#bfe6ff', pal: P,
    shapes: [sky, [4, circ(300, 260, 150)],
      [7, cloud(1600, 240, 640)],
      [6, ell(1024, 2060, 1300, 440)],
      [10, poly([860, 2048, 1188, 2048, 1120, 1500, 928, 1500])],
      [9, rrect(520, 1080, 160, 860, 40)], [9, rrect(1368, 1080, 160, 860, 40)],
      [9, band(1024, 1320, 560, 430, 200, 340)],
      ...rose(620, 980, 12, 0, 4), ...rose(860, 760, 0, 1, 4), ...rose(1188, 700, 2, 0, 4), ...rose(1460, 980, 8, 12, 4),
      [6, ell(460, 1240, 150, 70, -40)], [6, ell(760, 900, 140, 60, 30)],
      [6, ell(1280, 880, 140, 60, -28)], [6, ell(1620, 1240, 150, 70, 40)],
      [6, ell(700, 1120, 130, 56, 50)], [6, ell(1360, 1140, 130, 56, -50)],
      [0, heart(1024, 1180, 90)], [1, heart(300, 1700, 110)], [2, heart(1760, 1680, 110)],
      spark(1880, 480, 140, 4)],
    line: []
  };

  // gd6: a round pond, lily pads, and a dragonfly
  const gd6 = {
    id: 'gd6', name: 'Lily Pond', stars: 2, w: 2048, h: 2048, bg: '#bfe6ff', pal: P,
    shapes: [sky, [4, circ(1580, 260, 160)],
      [7, cloud(360, 280, 600)],
      [6, ell(1024, 2060, 1400, 460)],
      [9, ell(1024, 1500, 820, 460)], [3, ell(1024, 1500, 700, 380)],
      [11, ell(760, 1400, 180, 90)], [6, ell(1100, 1320, 200, 100)], [11, ell(1360, 1560, 190, 95)], [6, ell(860, 1680, 170, 85)],
      [12, circ(760, 1360, 36)], [4, circ(1120, 1280, 40)], [0, circ(1380, 1520, 34)], [2, circ(860, 1640, 32)],
      [8, ell(1500, 980, 200, 80, -24)], [8, ell(1680, 1120, 170, 70, 20)],
      [1, ell(1500, 860, 150, 60, -24)], [2, ell(1700, 1240, 140, 56, 24)],
      [9, ell(1590, 1080, 36, 160)], [7, circ(1590, 900, 48)],
      [4, circ(1572, 888, 14)], [4, circ(1610, 888, 14)],
      [10, ell(420, 1760, 160, 90)], [10, ell(1680, 1800, 170, 90)],
      [9, ell(300, 1500, 70, 220, 8)], [9, ell(1740, 1460, 70, 210, -8)],
      ...flower(360, 1180, 160, 0, 4), ...flower(1760, 700, 150, 2, 4),
      spark(240, 420, 130, 4)],
    line: [smile(1590, 916, 16, 8), 'M1560 820Q1520 760 1560 740', 'M1620 820Q1660 760 1640 730']
  };

  // gd7: one big watering can (easy)
  const gd7 = {
    id: 'gd7', name: 'Watering Day', stars: 1, w: 2048, h: 2048, bg: '#bfe6ff',
    pal: ['#3aa0ff', '#4fd8e0', '#ffd34d', '#bfe6ff', '#7fdc8a', '#fff6ea', '#ff5fa2', '#e0a36a', '#ff8a5c'],
    shapes: [[3, rect(0, 0, 2048, 2048)], [2, circ(360, 300, 160)],
      [5, cloud(1600, 280, 640)],
      [4, ell(1024, 2040, 1200, 380)],
      [0, ell(980, 1180, 460, 340)], [5, ell(980, 980, 360, 120)],
      [7, poly([1380, 1080, 1760, 860, 1820, 980, 1460, 1220])],
      [5, ell(1760, 900, 90, 150, 20)],
      [1, band(620, 1180, 280, 180, 200, 340)],
      [6, heart(900, 1160, 110)],
      [1, ell(1500, 740, 36, 70)], [1, ell(1620, 680, 30, 60)], [1, ell(1700, 780, 28, 54)],
      ...flower(520, 1760, 180, 6, 2), ...flower(1500, 1800, 160, 8, 2),
      spark(1880, 560, 130, 2)],
    line: []
  };

  // gd8: a night path hung with four glowing lanterns
  const lantern = (cx, cy, body, glow, cap) => [
    [body, rrect(cx - 130, cy, 260, 400, 48)],
    [cap, ell(cx, cy + 10, 170, 90)],
    [glow, ell(cx, cy + 200, 100, 150)]
  ];
  const gd8 = {
    id: 'gd8', name: 'Lantern Garden', stars: 3, w: 2048, h: 2048, bg: '#3d2d8a',
    pal: ['#ff5fa2', '#ffd34d', '#b56cff', '#4fd8e0', '#ffe14a', '#3d2d8a', '#7fdc8a', '#fff6ea', '#ff8a5c', '#34c46a', '#ff4b6e', '#9ad8ff', '#ffc2e2', '#6c4dff'],
    shapes: [[5, rect(0, 0, 2048, 2048)],
      [11, circ(1580, 320, 200)], [5, circ(1680, 280, 150)],
      [13, cloud(360, 240, 700)], [13, cloud(1100, 160, 640)],
      [9, ell(1024, 2100, 1400, 460)],
      [7, poly([860, 2048, 1188, 2048, 1100, 1280, 948, 1280])],
      ...lantern(420, 860, 8, 1, 10), ...lantern(820, 720, 0, 4, 8),
      ...lantern(1228, 720, 2, 1, 0), ...lantern(1628, 860, 10, 4, 2),
      ...flower(460, 1680, 250, 0, 1), ...flower(800, 1720, 250, 12, 4),
      ...flower(1280, 1720, 250, 2, 1), ...flower(1600, 1680, 250, 10, 4),
      [6, bush(160, 1600, 180)], [6, bush(1900, 1620, 180)],
      spark(260, 480, 200, 1), spark(960, 400, 200, 4), spark(1860, 560, 200, 11), spark(1240, 220, 200, 7),
      [0, heart(1024, 1500, 160)]],
    line: ['M420 860V640', 'M820 720V520', 'M1228 720V520', 'M1628 860V640']
  };

  CM_PACK('garden', { name: 'Magic Garden', order: 8 }, [gd1, gd2, gd3, gd4, gd5, gd6, gd7, gd8]);
})();
