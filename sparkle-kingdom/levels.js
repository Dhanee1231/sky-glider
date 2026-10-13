// Sparkle Kingdom level data. World 1: Pink Meadow (4 levels + the Silver Puffball boss level).
// A level is built from short 20-column segments and expanded into compact string rows (one character per 25-unit tile, 12 rows):
//   .  empty        g  gem        G  big gem (5)     H  heart block (pop it from below)
//   b  grumpy dust bunny   j  jelly bean blob   n  bouncing snowball   (all of them "poof" when she dives on them)
//   P  heart-star   R  rainbow trail   K  checkpoint flower arch   E  rainbow gate   B  boss arena starts here
// Ground height per column is a digit 0-4 (in tiles) in the separate `ground` string. Later worlds are just more data.
(function () {
  const W = 20, ROWS = 12;
  const seg = (ground, items) => ({ ground, items });
  const L = (ch, c, r, n, dc, dr) => { const o = []; for (let i = 0; i < n; i++) o.push([ch, c + i * dc, r + i * dr]); return o; };
  const arc = (c0, n, rTop, rBase) => { const o = []; for (let i = 0; i < n; i++) o.push(['g', c0 + i, Math.round(rBase - (rBase - rTop) * Math.sin(Math.PI * (i + .5) / n))]); return o; };
  const flat = '00000000000000000000';
  const SEG = {
    gems_low: seg(flat, [].concat(L('g', 3, 8, 14, 1, 0))),
    arc: seg(flat, arc(3, 14, 3, 8)),
    arc_hi: seg(flat, arc(2, 16, 1, 6)),
    zig: seg(flat, [].concat(L('g', 3, 3, 5, 1, 1), L('g', 9, 7, 5, 1, -1))),
    bunny1: seg(flat, [['b', 10, 6]].concat(arc(4, 5, 2, 5), arc(12, 5, 2, 5))),
    bunny2: seg(flat, [['b', 6, 7], ['b', 14, 4]].concat(L('g', 9, 5, 4, 1, 0))),
    bunny3: seg(flat, [['b', 5, 5], ['b', 10, 8], ['b', 15, 5]].concat(L('g', 3, 2, 14, 1, 0))),
    jelly: seg(flat, [['j', 8, 8], ['j', 15, 8]].concat(arc(3, 14, 2, 5))),
    jelly2: seg(flat, [['j', 5, 7], ['j', 10, 8], ['j', 16, 6]].concat(L('g', 4, 3, 12, 1, 0))),
    snow: seg(flat, [['n', 6, 5], ['n', 12, 5], ['n', 17, 5]].concat(L('g', 3, 1, 14, 1, 0))),
    snow2: seg(flat, [['n', 5, 6], ['n', 9, 5], ['n', 13, 6], ['n', 17, 5]].concat(L('g', 3, 8, 14, 1, 0))),
    blocks: seg(flat, [['H', 6, 4], ['H', 9, 4], ['H', 12, 4]].concat(L('g', 3, 8, 14, 1, 0))),
    blocks2: seg(flat, [['H', 5, 3], ['H', 10, 6], ['H', 15, 3], ['b', 12, 3]].concat(L('g', 3, 9, 14, 1, 0))),
    hill: seg('00011223333221100000', [].concat(L('g', 5, 6, 3, 1, 0), L('g', 9, 4, 4, 1, 0), L('g', 14, 6, 3, 1, 0))),
    hillbunny: seg('00112233333322110000', [['b', 10, 5]].concat(L('g', 4, 6, 3, 1, 0), L('g', 12, 6, 3, 1, 0), [['G', 10, 2]])),
    valley: seg('33222110000001122333', [['j', 10, 8]].concat(arc(4, 12, 1, 6))),
    big: seg(flat, [['G', 6, 4], ['G', 13, 6]].concat(arc(2, 3, 5, 7), arc(15, 3, 5, 7), [['b', 10, 5]])),
    power: seg(flat, [['R', 5, 5], ['b', 11, 5], ['b', 14, 7], ['j', 17, 8]].concat(L('g', 7, 3, 8, 1, 0))),
    heal: seg(flat, [['P', 6, 5], ['H', 13, 4]].concat(arc(8, 4, 3, 6))),
    check: seg(flat, [['K', 10, 9]].concat(arc(3, 5, 4, 7), arc(12, 5, 4, 7))),
    rest: seg(flat, [].concat(arc(3, 14, 2, 7))),
    run: seg('00000000000000000000', L('g', 2, 4, 16, 1, 0)),
    gate: seg(flat, [['E', 9, 0]].concat(arc(1, 6, 3, 7))),
    // boss level: a short run-in, then the arena
    arena: seg(flat, [['B', 4, 0]])
  };
  const LV = [
    { id: 1, name: 'Cloud Meadow', icon: 'cloud', speed: 135, theme: 'meadow',
      segs: ['gems_low', 'arc', 'bunny1', 'blocks', 'arc_hi', 'jelly', 'check', 'hill', 'bunny1', 'blocks', 'zig', 'jelly', 'check', 'hillbunny', 'heal', 'bunny2', 'arc', 'gate'] },
    { id: 2, name: 'Flower Hills', icon: 'flower', speed: 148, theme: 'sunset',
      segs: ['arc', 'hill', 'bunny2', 'blocks', 'snow', 'valley', 'check', 'jelly2', 'hillbunny', 'power', 'zig', 'blocks2', 'check', 'snow', 'valley', 'bunny3', 'heal', 'hill', 'big', 'gate'] },
    { id: 3, name: 'Rainbow Slides', icon: 'rainbow', speed: 158, theme: 'rainbow',
      segs: ['arc_hi', 'valley', 'snow2', 'blocks2', 'hillbunny', 'jelly2', 'check', 'power', 'bunny3', 'valley', 'snow', 'hill', 'check', 'blocks', 'snow2', 'hillbunny', 'heal', 'bunny3', 'valley', 'big', 'zig', 'gate'] },
    { id: 4, name: 'Gem Garden', icon: 'gem', speed: 168, theme: 'dusk',
      segs: ['arc', 'bunny3', 'snow2', 'valley', 'blocks2', 'jelly2', 'check', 'hillbunny', 'power', 'snow2', 'bunny3', 'valley', 'check', 'blocks2', 'jelly2', 'hill', 'snow2', 'heal', 'hillbunny', 'bunny3', 'big', 'zig', 'rest', 'gate'] },
    { id: 5, name: 'Silver Puffball', icon: 'boss', speed: 150, theme: 'silver', boss: true,
      segs: ['arc', 'bunny1', 'blocks', 'check', 'hill', 'jelly', 'heal', 'arena'] }
  ];
  const CHARS = '.gGHbjnPRKEB';
  function build(def) {
    const cols = def.segs.length * W, rows = [], ground = [];
    for (let r = 0; r < ROWS; r++) rows.push(new Array(cols).fill('.'));
    def.segs.forEach((name, si) => {
      const s = SEG[name]; if (!s) throw new Error('unknown segment ' + name);
      for (let c = 0; c < W; c++) ground.push(+s.ground[c]);
      s.items.forEach(it => { const c = si * W + it[1], r = it[2]; if (r >= 0 && r < ROWS && c < cols && rows[r][c] === '.') rows[r][c] = it[0]; });
    });
    return { id: def.id, name: def.name, icon: def.icon, speed: def.speed, theme: def.theme, boss: !!def.boss, cols, ground, rows: rows.map(r => r.join('')) };
  }
  window.SKLevels = { W, ROWS, TILE: 25, CHARS, SEG, DEFS: LV, build };
})();
