// Color Magic pack 7: Rainbow Skies (10 original pictures, 2048 px world).
// Original art drawn in code by Grok 4.7 (paths only) for Dhanee's Playground, Oct 2026, review: Studio Lead.
// No outside characters, logos, text, or brands. Load kit.js then kit2.js first.
(function () {
  const { circ, ell, heart, poly, rect, rrect, cloud, smile, wavy } = CMK;
  const { flower, rbands, wedges, spark, bush } = CMK2;
  // 0 red, 1 orange, 2 yellow, 3 green, 4 blue, 5 purple, 6 sky, 7 cream, 8 grass, 9 deep grass, 10 gold, 11 pink, 12 light pink, 13 teal
  const P = ['#ff4b6e', '#ff8a2a', '#ffe14a', '#3ddc6e', '#3aa0ff', '#b56cff', '#bfe6ff', '#fff6ea', '#8ee88a', '#34c46a', '#ffd34d', '#ff5fa2', '#ffc2e2', '#4fd8e0'];
  const RB = [0, 1, 2, 3, 4, 5];
  const sky = [6, rect(0, 0, 2048, 2048)];
  const arch = (cx, cy, R, t, a0, a1) => rbands(cx, cy, R, t, RB, a0 == null ? 180 : a0, a1 == null ? 360 : a1);

  // rh1: a wide rainbow resting on three hills, with big flowers along the front slope
  const rh1 = {
    id: 'rh1', name: 'Rainbow Over Hills', stars: 2, w: 2048, h: 2048, bg: '#bfe6ff', pal: P,
    shapes: [sky, [10, circ(340, 300, 190)],
      [7, cloud(980, 240, 700)], [7, cloud(1560, 380, 760)],
      ...arch(1024, 1560, 1080, 100),
      [8, ell(400, 1760, 640, 360)], [8, ell(1680, 1720, 600, 320)], [9, ell(1024, 2080, 1400, 500)],
      [7, cloud(260, 1960, 720)],
      ...flower(430, 1680, 250, 11, 10), ...flower(860, 1760, 250, 5, 2), ...flower(1240, 1700, 250, 1, 10),
      ...flower(1560, 1780, 250, 11, 2), ...flower(1760, 1660, 240, 0, 10),
      spark(1880, 180, 200, 2), spark(640, 140, 190, 11), [11, heart(1024, 1240, 170)]],
    line: []
  };

  // rh2: a chunky storybook unicorn standing in front of a rainbow
  const rh2 = {
    id: 'rh2', name: 'Unicorn with Rainbow', stars: 3, w: 2048, h: 2048, bg: '#bfe6ff', pal: P,
    shapes: [sky, [10, circ(1760, 280, 170)],
      [7, cloud(280, 360, 680)], [7, cloud(1680, 180, 640)],
      ...arch(1040, 1500, 980, 90, 196, 344),
      [8, ell(520, 1960, 760, 420)], [9, ell(1500, 2000, 900, 460)],
      [10, rrect(620, 1500, 170, 420, 50)], [10, rrect(860, 1540, 170, 400, 50)],
      [10, rrect(1120, 1540, 170, 400, 50)], [10, rrect(1340, 1480, 160, 440, 50)],
      [11, ell(400, 1260, 180, 250, 36)], [12, ell(340, 1420, 160, 190, 20)], [5, ell(470, 1120, 140, 180, 48)],
      [7, ell(900, 1360, 520, 300)], [12, ell(920, 1460, 300, 160)],
      [7, ell(1280, 1120, 200, 290, 26)], [7, ell(1520, 900, 280, 200, -16)],
      [7, ell(1740, 990, 190, 130)],
      [12, ell(1340, 680, 110, 190, -16)], [11, ell(1480, 650, 100, 180, 14)],
      [10, poly([1400, 760, 1560, 260, 1640, 800])],
      [11, ell(1100, 1000, 140, 200, 18)], [5, ell(1160, 1180, 150, 190, 8)],
      [11, ell(1060, 1300, 160, 170, -12)], [5, ell(1320, 840, 130, 180, 24)],
      [0, circ(800, 1280, 140)], [1, circ(1060, 1400, 130)],
      [11, heart(960, 1360, 160)],
      ...flower(560, 1680, 250, 5, 10), ...flower(1500, 1680, 250, 11, 2),
      spark(240, 180, 200, 2), spark(1960, 720, 190, 10)],
    line: ['M1640 930Q1660 980 1720 970', 'M1580 860Q1640 900 1700 860']
  };

  // rh3: an easy poster — one rainbow and a sky full of clouds
  const rh3 = {
    id: 'rh3', name: 'Rainbow with Clouds', stars: 1, w: 2048, h: 2048, bg: '#bfe6ff',
    pal: ['#ff4b6e', '#ff8a2a', '#ffe14a', '#3ddc6e', '#3aa0ff', '#b56cff', '#bfe6ff', '#fff6ea', '#8ee88a', '#ffd34d'],
    shapes: [sky, [9, circ(360, 300, 180)],
      ...arch(1024, 1500, 1000, 110),
      [8, ell(1024, 2050, 1300, 420)],
      [7, cloud(300, 1480, 640)], [7, cloud(1760, 1500, 680)],
      [7, cloud(520, 340, 620)], [7, cloud(1100, 200, 700)], [7, cloud(1680, 420, 640)], [7, cloud(240, 700, 560)],
      [5, heart(1024, 1180, 180)]],
    line: []
  };

  // rh4: a front-facing castle on an island, with a rainbow for a bridge
  const door = 'M1160 1500V1180Q1160 1040 1280 1040Q1400 1040 1400 1180V1500Z';
  const rh4 = {
    id: 'rh4', name: 'Rainbow Bridge Castle', stars: 3, w: 2048, h: 2048, bg: '#bfe6ff', pal: P,
    shapes: [sky, [10, circ(330, 280, 180)],
      [7, cloud(560, 220, 680)], [7, cloud(1700, 300, 720)],
      [4, ell(1024, 2140, 1500, 520)],
      [8, ell(360, 1760, 520, 300)], [9, ell(1680, 1780, 560, 320)],
      ...arch(1024, 1460, 1160, 85, 196, 344),
      [7, rrect(430, 1680, 1188, 150, 60)],
      [12, rrect(620, 860, 360, 820, 40)], [12, rrect(1060, 980, 560, 700, 36)], [12, rrect(1560, 860, 360, 820, 40)],
      [11, poly([580, 900, 1020, 900, 800, 480])], [5, poly([1000, 1020, 1680, 1020, 1340, 500])], [11, poly([1520, 900, 1960, 900, 1740, 480])],
      [0, door], [10, circ(800, 1180, 130)], [10, circ(1740, 1180, 130)],
      [1, poly([760, 520, 760, 220, 1120, 390])], [4, poly([1700, 520, 1700, 240, 2040, 400])],
      [11, heart(1340, 780, 170)],
      ...flower(520, 1600, 250, 11, 10), ...flower(1520, 1600, 250, 0, 2),
      [9, bush(220, 1760, 180)], [9, bush(1860, 1780, 180)],
      spark(1900, 150, 200, 2), spark(140, 620, 200, 11)],
    line: []
  };

  // rh5: cliffs, a bright waterfall, and a rainbow in the mist
  const rh5 = {
    id: 'rh5', name: 'Rainbow Waterfall', stars: 2, w: 2048, h: 2048, bg: '#bfe6ff', pal: P,
    shapes: [sky, [10, circ(300, 260, 170)],
      [7, cloud(620, 200, 640)], [7, cloud(1680, 240, 700)],
      [9, poly([0, 2048, 0, 360, 560, 420, 760, 860, 700, 2048])],
      [9, poly([2048, 2048, 2048, 300, 1560, 380, 1340, 820, 1420, 2048])],
      ...arch(1024, 1320, 640, 70, 188, 352),
      [4, rect(800, 760, 160, 820)], [13, rect(950, 720, 160, 880)], [7, rect(1100, 760, 150, 820)], [6, rect(1240, 800, 150, 760)],
      [4, ell(1024, 1760, 760, 300)], [13, ell(1024, 1860, 520, 180)],
      [8, ell(180, 1960, 420, 240)], [8, ell(1880, 1980, 440, 250)],
      [9, ell(620, 1680, 200, 140)], [9, ell(1460, 1660, 210, 150)], [8, ell(430, 1840, 180, 120)], [8, ell(1660, 1820, 190, 130)],
      [7, cloud(860, 1560, 700)], [7, cloud(1280, 1600, 680)],
      ...flower(400, 1500, 250, 11, 10), ...flower(1680, 1460, 250, 0, 2), ...flower(1024, 1820, 250, 5, 10),
      spark(980, 140, 200, 2), [11, heart(1024, 1040, 170)]],
    line: []
  };

  // rh6: one rainbow balloon and a basket (easy)
  const rh6 = {
    id: 'rh6', name: 'Rainbow Balloon', stars: 1, w: 2048, h: 2048, bg: '#bfe6ff',
    pal: ['#ff4b6e', '#ff8a2a', '#ffe14a', '#3ddc6e', '#3aa0ff', '#b56cff', '#bfe6ff', '#fff6ea', '#8ee88a', '#ffd34d', '#c98a5b'],
    shapes: [[6, rect(0, 0, 2048, 2048)], [9, circ(1700, 280, 160)],
      [8, ell(1024, 2040, 1200, 360)],
      [7, cloud(280, 1560, 640)], [7, cloud(1760, 1480, 600)], [7, cloud(360, 360, 560)],
      ...wedges(1024, 860, 520, [0, 1, 2, 3, 4, 5], -90),
      [7, ell(860, 640, 180, 120, -30)],
      [10, rrect(860, 1460, 328, 250, 46)], [7, rrect(960, 1360, 128, 120, 30)],
      [5, heart(1024, 860, 120)],
      spark(240, 860, 140, 9), spark(1840, 900, 130, 1)],
    line: ['M900 1380L900 1480', 'M1148 1380L1148 1480']
  };

  // rh7: two diamond kites over a flower hill
  const kite = (cx, cy, w, h, c0, c1, c2, c3) => [
    [c0, poly([cx, cy, cx, cy - h, cx + w, cy])],
    [c1, poly([cx, cy, cx + w, cy, cx, cy + h])],
    [c2, poly([cx, cy, cx, cy + h, cx - w, cy])],
    [c3, poly([cx, cy, cx - w, cy, cx, cy - h])]
  ];
  const rh7 = {
    id: 'rh7', name: 'Rainbow Kite Day', stars: 2, w: 2048, h: 2048, bg: '#bfe6ff', pal: P,
    shapes: [sky, [10, circ(250, 260, 160)],
      [7, cloud(1500, 280, 680)], [7, cloud(1850, 560, 520)],
      [8, ell(1024, 2040, 1300, 460)],
      ...kite(760, 820, 340, 420, 0, 1, 2, 4),
      [5, poly([760, 400, 820, 250, 700, 250])],
      ...kite(1560, 640, 220, 280, 5, 11, 3, 1),
      [11, heart(760, 1320, 90)], [2, heart(820, 1460, 80)], [4, heart(740, 1600, 80)],
      [0, heart(860, 1720, 70)], [5, heart(780, 1840, 70)],
      [3, heart(1560, 980, 70)], [10, heart(1620, 1100, 64)], [4, heart(1520, 1200, 60)],
      ...flower(420, 1860, 180, 11, 10), ...flower(1180, 1900, 170, 5, 2),
      spark(1960, 180, 150, 2)],
    line: ['M760 1240Q900 1500 1180 1860', 'M1560 920Q1680 1200 1760 1500', 'M760 400L760 300']
  };

  // rh8: a rainbow and its reflection across a lake
  const rh8 = {
    id: 'rh8', name: 'Double Rainbow Lake', stars: 2, w: 2048, h: 2048, bg: '#bfe6ff', pal: P,
    shapes: [sky, [10, circ(300, 280, 170)],
      [7, cloud(700, 220, 680)], [7, cloud(1600, 300, 720)],
      [9, poly([0, 1280, 0, 760, 420, 520, 860, 1240])],
      [8, poly([2048, 1260, 2048, 700, 1620, 460, 1180, 1220])],
      [9, ell(1024, 2140, 1400, 360)],
      ...arch(1024, 1240, 900, 72),
      [4, ell(1024, 1620, 1100, 500)],
      ...rbands(1024, 1240, 760, 62, RB, 0, 180).map(s => [s[0], s[1], ell(1024, 1620, 1100, 500)]),
      [3, ell(420, 1680, 190, 110)], [3, ell(720, 1860, 210, 120)], [3, ell(1500, 1760, 200, 110)], [8, ell(1280, 1920, 180, 100)],
      [1, ell(420, 1840, 230, 140)], [10, poly([80, 1680, 40, 2040, 460, 1960])],
      [11, ell(1700, 1560, 230, 130)], [5, poly([1860, 1440, 2040, 1760, 1560, 1660])],
      ...flower(460, 1620, 250, 12, 10), ...flower(1600, 1620, 250, 11, 2),
      spark(1880, 150, 200, 2), spark(160, 160, 200, 11),
      [0, heart(1024, 960, 170)]],
    line: []
  };

  // rh9: a butterfly whose wings are rainbow bands (easy, symmetric)
  const wing = (sx) => {
    const x = v => sx < 0 ? 2048 - v : v;
    const d = sx < 0 ? -1 : 1;
    return [
      [0, ell(x(640), 820, 400, 260, d * -26)],
      [1, ell(x(760), 1040, 340, 200, d * -8)],
      [2, ell(x(700), 1240, 280, 170, d * 16)],
      [3, ell(x(720), 1460, 320, 200, d * 22)],
      [4, ell(x(600), 1620, 240, 160, d * 34)],
      [5, ell(x(860), 1500, 180, 140, d * 8)]
    ];
  };
  const rh9 = {
    id: 'rh9', name: 'Rainbow Butterfly', stars: 1, w: 2048, h: 2048, bg: '#bfe6ff',
    pal: ['#ff4b6e', '#ff8a2a', '#ffe14a', '#3ddc6e', '#3aa0ff', '#b56cff', '#bfe6ff', '#fff6ea', '#ffd34d', '#5b2a86'],
    shapes: [[6, rect(0, 0, 2048, 2048)],
      [7, cloud(300, 360, 560)], [7, cloud(1760, 300, 600)],
      ...wing(1), ...wing(-1),
      [9, ell(1024, 1240, 90, 340)], [8, circ(1024, 820, 120)],
      [7, circ(980, 800, 36)], [7, circ(1068, 800, 36)],
      [9, circ(988, 808, 16)], [9, circ(1076, 808, 16)],
      [8, circ(900, 620, 40)], [8, circ(1148, 620, 40)],
      spark(240, 1100, 130, 8), spark(1820, 1080, 120, 1)],
    line: [smile(1024, 860, 36, 16), 'M980 740Q900 640 900 620', 'M1068 740Q1148 640 1148 620']
  };

  // rh10: a layer cake in rainbow order, on a round plate
  const rh10 = {
    id: 'rh10', name: 'Rainbow Cake', stars: 2, w: 2048, h: 2048, bg: '#fff0f6',
    pal: ['#ff4b6e', '#ff8a2a', '#ffe14a', '#3ddc6e', '#3aa0ff', '#b56cff', '#fff0f6', '#fff6ea', '#ffd34d', '#ff5fa2', '#c98a5b', '#7fdc8a'],
    shapes: [[6, rect(0, 0, 2048, 2048)],
      [7, cloud(300, 280, 520)], [7, cloud(1760, 240, 560)],
      [8, circ(250, 520, 120)],
      [11, ell(1024, 1980, 1100, 280)],
      [7, ell(1024, 1560, 680, 150)],
      [10, rrect(860, 1280, 328, 220, 30)],
      [0, rrect(500, 1240, 1048, 170, 36)], [1, rrect(560, 1100, 928, 160, 34)],
      [2, rrect(620, 980, 808, 150, 32)], [3, rrect(680, 870, 688, 140, 30)],
      [4, rrect(740, 770, 568, 130, 28)], [5, rrect(810, 680, 428, 120, 28)],
      [9, wavy(1024, 660, 280, 12, 36)],
      [0, circ(900, 560, 54)], [0, circ(1024, 500, 60)], [0, circ(1160, 560, 54)],
      [7, rrect(900, 430, 40, 150, 16)], [7, rrect(1024, 380, 40, 150, 16)], [7, rrect(1148, 430, 40, 150, 16)],
      [8, ell(920, 400, 36, 52)], [8, ell(1044, 350, 36, 52)], [8, ell(1168, 400, 36, 52)],
      [9, heart(280, 1100, 140)], [9, heart(1760, 1100, 140)],
      spark(1760, 560, 120, 8), spark(360, 860, 110, 4)],
    line: []
  };

  CM_PACK('rainbow', { name: 'Rainbow Skies', order: 7 }, [rh1, rh2, rh3, rh4, rh5, rh6, rh7, rh8, rh9, rh10]);
})();
