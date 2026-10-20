// Color Magic pack 9: Space Party (7 original pictures, 2048 px world).
// Original art drawn in code by Grok 4.7 (paths only) for Dhanee's Playground, Oct 2026, review: Studio Lead.
// No outside characters, logos, text, or brands. Load kit.js then kit2.js first.
(function () {
  const { circ, ell, heart, poly, rect, rrect, cloud, ring, star, smile, band } = CMK;
  const { wedges, spark } = CMK2;
  // 0 pink, 1 gold, 2 purple, 3 teal, 4 yellow, 5 night, 6 mint, 7 cream, 8 coral, 9 blue, 10 red, 11 lilac, 12 orange, 13 green
  const P = ['#ff5fa2', '#ffd34d', '#b56cff', '#4fd8e0', '#ffe14a', '#3d2d8a', '#7fdc8a', '#fff6ea', '#ff8a5c', '#3aa0ff', '#ff4b6e', '#d7b3ff', '#ff8a2a', '#3ddc6e'];
  const night = [5, rect(0, 0, 2048, 2048)];
  // a chunky rocket: fins, body, nose, round window, one flame. All regions are large.
  const rocket = (cx, cy, body, nose, win, fin, flame) => [
    [fin, poly([cx - 150, cy + 40, cx - 420, cy + 520, cx - 140, cy + 430])],
    [fin, poly([cx + 150, cy + 40, cx + 420, cy + 520, cx + 140, cy + 430])],
    [body, rrect(cx - 150, cy - 220, 300, 780, 48)],
    [nose, poly([cx - 150, cy - 180, cx + 150, cy - 180, cx, cy - 640])],
    [win, circ(cx, cy + 40, 125)],
    [flame, ell(cx, cy + 680, 120, 170)]
  ];

  // sp1: two rockets climbing through a field of planets
  const sp1 = {
    id: 'sp1', name: 'Rocket Parade', stars: 3, w: 2048, h: 2048, bg: '#3d2d8a', pal: P,
    shapes: [night,
      ...rocket(520, 1180, 7, 10, 3, 1, 12), ...rocket(1520, 1120, 9, 0, 4, 8, 1),
      [9, circ(1024, 360, 240)], [11, ell(1024, 360, 200, 80)], [1, ring(1024, 360, 360, 280)],
      [8, circ(240, 720, 180)], [4, circ(1840, 680, 170)],
      [6, circ(220, 1880, 160)], [2, circ(1860, 1720, 170)],
      [7, circ(1024, 860, 150)],
      [12, ell(1024, 1720, 260, 120, -16)], [4, circ(780, 1780, 150)], [0, circ(1280, 1820, 160)],
      [7, cloud(300, 300, 720)], [11, cloud(1760, 240, 700)],
      [6, circ(1024, 620, 180)], [8, ell(1024, 620, 160, 100)],
      [2, circ(1024, 1500, 180)], [13, circ(180, 460, 160)], [4, circ(1024, 1860, 170)], [11, heart(1280, 1560, 170)],
      spark(120, 160, 200, 1), spark(640, 140, 200, 4), spark(1400, 120, 200, 0),
      spark(1940, 160, 200, 3), spark(120, 1040, 200, 4), spark(1940, 980, 200, 1),
      spark(360, 500, 200, 0), spark(1680, 500, 200, 4),
      [0, heart(1024, 980, 170)], [3, heart(760, 1540, 170)]],
    line: []
  };

  // sp2: a beach-ball planet, a ringed planet, and party balloons
  const sp2 = {
    id: 'sp2', name: 'Planet Party', stars: 2, w: 2048, h: 2048, bg: '#3d2d8a', pal: P,
    shapes: [night,
      ...wedges(560, 1040, 340, [10, 1, 9, 13, 0, 2], -90),
      [7, circ(560, 1040, 130)],
      [9, circ(1520, 900, 280)], [11, ell(1520, 860, 230, 90)], [1, ring(1520, 900, 430, 330)],
      [8, circ(1040, 1700, 210)], [4, circ(1140, 1620, 140)],
      [6, circ(280, 520, 170)], [3, circ(1760, 480, 160)],
      [0, circ(360, 1580, 160)], [1, circ(1040, 420, 160)], [2, circ(1720, 1560, 160)],
      [12, circ(280, 1100, 160)], [13, circ(1800, 1120, 170)],
      [4, rrect(720, 160, 600, 180, 46)], [10, rrect(760, 200, 520, 110, 36)],
      spark(140, 240, 200, 1), spark(1900, 240, 200, 4), spark(1280, 360, 200, 3),
      spark(200, 820, 200, 0), spark(1880, 760, 200, 11), spark(1024, 200, 200, 1),
      [7, cloud(1024, 1960, 780)], [11, cloud(360, 260, 680)],
      [0, heart(1520, 900, 170)], [6, heart(1040, 1320, 170)],
      [8, circ(760, 680, 170)], [9, ell(760, 680, 140, 110)],
      [2, circ(1280, 640, 160)], [12, circ(400, 1320, 160)], [13, circ(1680, 1320, 170)],
      spark(640, 1680, 200, 4), spark(1460, 1480, 200, 0), spark(1024, 760, 200, 1),
      [3, heart(280, 1760, 170)], [11, circ(1280, 1100, 160)]],
    line: ['M360 1740V1920', 'M1040 580V720', 'M1720 1720V1900']
  };

  // sp3: two round aliens dancing on a bright floor
  const alien = (cx, arm) => {
    const a = arm || 1;
    return [
      [6, ell(cx, 1360, 250, 300)],
      [13, ell(cx - 300, 1280, 100, 210, a * -36)], [13, ell(cx + 290, 1220, 100, 210, a * 40)],
      [13, ell(cx - 110, 1720, 110, 230)], [13, ell(cx + 120, 1720, 110, 230)],
      [11, circ(cx, 900, 270)],
      [5, circ(cx - 110, 860, 125)], [5, circ(cx + 110, 860, 125)],
      [3, ell(cx - 160, 600, 90, 180)], [4, circ(cx - 160, 400, 125)],
      [3, ell(cx + 160, 620, 90, 180)], [1, circ(cx + 170, 420, 125)],
      [0, heart(cx, 1340, 150)]
    ];
  };
  const sp3 = {
    id: 'sp3', name: 'Alien Dance', stars: 2, w: 2048, h: 2048, bg: '#3d2d8a', pal: P,
    shapes: [night,
      [2, rrect(160, 1560, 860, 420, 60)], [9, rrect(1028, 1560, 860, 420, 60)],
      [0, rrect(220, 1620, 360, 300, 40)], [1, rrect(1468, 1620, 360, 300, 40)],
      ...alien(560, 1), ...alien(1488, -1),
      [7, circ(1024, 460, 230)], [4, ell(980, 400, 160, 110)], [11, ell(1100, 500, 150, 100)],
      [8, rrect(80, 1040, 300, 400, 40)], [4, circ(230, 1220, 130)],
      [8, rrect(1668, 1040, 300, 400, 40)], [4, circ(1818, 1220, 130)],
      spark(160, 200, 200, 1), spark(1880, 200, 200, 4),
      [9, circ(1024, 180, 150)]],
    line: [smile(560, 980, 70, 30), smile(1488, 980, 70, 30)]
  };

  // sp4: a picnic on the moon, with the earth in the sky (easy)
  const sp4 = {
    id: 'sp4', name: 'Moon Picnic', stars: 1, w: 2048, h: 2048, bg: '#3d2d8a',
    pal: ['#fff6ea', '#ffd34d', '#3aa0ff', '#7fdc8a', '#3d2d8a', '#ff5fa2', '#ff8a5c', '#b56cff', '#ffe14a'],
    shapes: [[4, rect(0, 0, 2048, 2048)],
      [2, circ(1560, 420, 260)], [3, ell(1480, 400, 120, 80, -20)], [3, ell(1640, 480, 90, 60, 16)],
      [0, ell(1024, 1960, 1200, 520)],
      [8, circ(520, 1560, 90)], [8, circ(1500, 1620, 80)], [8, circ(1024, 1500, 70)],
      [5, rrect(760, 1500, 560, 340, 36)],
      [6, rrect(980, 1560, 220, 160, 28)], [1, band(1220, 1640, 90, 50, 200, 20)],
      [2, poly([860, 1500, 980, 1280, 1100, 1500])],
      [7, circ(1180, 1420, 36)],
      spark(280, 280, 140, 1), spark(860, 220, 120, 8), spark(400, 640, 110, 5),
      [5, heart(1680, 1100, 90)]],
    line: []
  };

  // sp5: two comets with long tails passing a few planets
  const comet = (cx, cy, deg, c0, c1) => [
    [c0, circ(cx, cy, 150)],
    [c1, ell(cx - 220, cy + 80, 240, 90, deg)],
    [c0, ell(cx - 420, cy + 150, 200, 70, deg)],
    [7, ell(cx - 600, cy + 210, 160, 54, deg)]
  ];
  const sp5 = {
    id: 'sp5', name: 'Comet Friends', stars: 2, w: 2048, h: 2048, bg: '#3d2d8a', pal: P,
    shapes: [night,
      [9, circ(360, 420, 200)], [13, ell(340, 400, 90, 50)],
      [8, circ(1720, 1500, 220)], [1, ring(1720, 1500, 340, 260)],
      [2, circ(1680, 360, 140)],
      ...comet(1500, 780, 18, 4, 12), ...comet(1180, 1280, 12, 3, 9),
      spark(240, 860, 160, 1), spark(700, 280, 150, 4), spark(1100, 180, 140, 0),
      spark(1900, 860, 150, 11), spark(520, 1500, 140, 3), spark(240, 180, 130, 8),
      [7, cloud(1024, 1960, 800)],
      [0, heart(860, 640, 80)]],
    line: []
  };

  // sp6: one giant star used as a balloon (easy)
  const sp6 = {
    id: 'sp6', name: 'Star Balloon', stars: 1, w: 2048, h: 2048, bg: '#3d2d8a',
    pal: ['#ffd34d', '#fff6ea', '#3aa0ff', '#ff5fa2', '#3d2d8a', '#b56cff', '#4fd8e0', '#ff8a5c'],
    shapes: [[4, rect(0, 0, 2048, 2048)],
      [2, circ(360, 360, 180)], [6, ell(320, 340, 80, 46)],
      [5, circ(1720, 420, 150)],
      [0, star(1024, 900, 640, 280, 5, -90)],
      [3, heart(1024, 980, 150)],
      [7, rrect(860, 1580, 328, 240, 40)],
      [1, rrect(980, 1480, 88, 120, 24)],
      [1, cloud(280, 1500, 560)], [1, cloud(1760, 1680, 520)],
      spark(1680, 980, 120, 0), spark(300, 900, 110, 3),
      [5, circ(1500, 1400, 70)]],
    line: ['M860 1560L900 1600', 'M1188 1560L1148 1600']
  };

  // sp7: three cupcakes floating in space
  const cup = (cx, cy, wrap, cake, frost, cherry) => [
    [wrap, poly([cx - 170, cy + 40, cx + 170, cy + 40, cx + 130, cy + 280, cx - 130, cy + 280])],
    [cake, ell(cx, cy + 40, 160, 70)],
    [frost, wavySafe(cx, cy, 170, 10, 28)],
    [cherry, circ(cx, cy - 150, 48)]
  ];
  function wavySafe(cx, cy, R, n, b) { return CMK.wavy(cx, cy, R, n, b); }
  const sp7 = {
    id: 'sp7', name: 'Galaxy Cupcakes', stars: 3, w: 2048, h: 2048, bg: '#3d2d8a', pal: P,
    shapes: [night,
      [9, circ(240, 300, 160)], [1, ring(240, 300, 250, 190)],
      [8, circ(1800, 360, 140)],
      [7, ell(1024, 1960, 900, 220)],
      ...cup(420, 1100, 12, 8, 0, 10), ...cup(1024, 980, 2, 6, 9, 1), ...cup(1640, 1120, 9, 11, 3, 10),
      [4, star(300, 980, 70, 32, 5)], [4, star(560, 860, 54, 24, 4)], [1, star(860, 760, 60, 28, 5)],
      [4, star(1200, 740, 56, 26, 4)], [0, star(1480, 860, 64, 30, 5)], [1, star(1760, 900, 50, 24, 4)],
      spark(1024, 280, 150, 4), spark(640, 360, 130, 0), spark(1400, 240, 140, 3),
      [0, heart(1024, 560, 80)], [6, circ(1024, 400, 50)]],
    line: []
  };

  CM_PACK('space', { name: 'Space Party', order: 9 }, [sp1, sp2, sp3, sp4, sp5, sp6, sp7]);
})();
