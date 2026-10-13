// Sparkle Kingdom level data (v3: Glimmer runs by herself; tap = jump, tap in the air = wing flap, hold = float).
// A level is a list of 20-column segments. Each segment = a ground string (one char per column: '0'-'4' = height in tiles,
// '_' = a bouncy cloud gap) + a few rows of item art (row 0 = top of the sky, row 11 = the ground line; tile = 25 units).
//   g gem   G big gem (5)   Q star ring (+5)   C sparkle crown (3 per level)   H heart block   M surprise gift block
//   = cloud platform (land on it from above)   F bounce flower   W wind column (hold to ride it up)
//   b dust bunny (walks)   j jelly (hops)   n snowball (bounces)   y flutter puff (flies)   -> jump on them and they go "poof"
//   P heart-star   R rainbow power   U gem magnet   S bubble shield   Z giant Glimmer
//   A hidden friend (v7, one per level: find it for a sticker)
//   O secret swirl (goes to the level's secret room)   X way out of the secret room   K checkpoint   E rainbow gate   B boss arena
// Ground things (b j n F K) sit on the ground whatever row they are drawn in. Reach: run = row 10, jump = rows 6-9,
// jump + flap = rows 4-5, bounce flower = rows 1-3. Platforms: from the ground row 8; from row 8 up to row 5.
(function () {
  const W = 20, ROWS = 12, F0 = '00000000000000000000';
  const SEG = {
    // ---------- calm openers / rests ----------
    start: { g: F0, a: { 10: '.....ggggggggggggg..' } },
    rest: { g: F0, a: { 9: '....g...g...g...g...', 10: '..g...g...g...g...g.' } },
    arc: { g: F0, a: { 7: '.....ggg.......ggg..', 8: '....g...g.....g...g.', 10: '.gg.........gg......' } },
    // ---------- jumping on friends ----------
    hop: { g: F0, a: { 7: '..........ggg.......', 8: '.........g...g......', 10: '..gggg..........b...' } },
    hop2: { g: F0, a: { 7: '......ggg.......ggg.', 10: '..........b.......b.' } },
    trio: { g: F0, a: { 6: '.......g....g....g..', 10: '..gg.....b....b....b' } },   // bounce from one to the next = combo
    jelly: { g: F0, a: { 6: '........ggggg.......', 10: '..ggg.....j......j..' } },
    snow: { g: F0, a: { 5: '......g.....g.....g.', 10: '.gg.....n.....n.....' } },
    flyers: { g: F0, a: { 4: '.....gg....gg....gg.', 6: '.......y.....y......', 7: '..y..........y......' } },
    flyers2: { g: F0, a: { 5: '...y.....y.....y....', 8: '.g.g.g.g.g.g.g.g.g..', 10: '..........b.........' } },
    // ---------- blocks and gifts ----------
    blocks: { g: F0, a: { 7: '.....H.....M.....H..', 10: '..gg..gg..gg..gg..gg' } },
    blocks2: { g: F0, a: { 7: '...H...H...H........', 10: '..........gggg..b...' } },
    gift: { g: F0, a: { 4: '..........ggg.......', 7: '....M......=====....', 10: '..gg...gg...........' } },
    // ---------- platforms ----------
    steps: { g: F0, a: { 4: '..........gggg......', 5: '..........=====.....', 7: '.....ggg............', 8: '....=====.......g...', 10: 'gg..............gg..' } },
    steps2: { g: F0, a: { 2: '..............ggg...', 3: '.............=====..', 4: '.......ggg..........', 5: '......=====.........', 7: '.ggg................', 8: '=====...............' } },
    cloudhop: { g: F0, a: { 5: '...ggg.....ggg......', 6: '..=====...=====.....', 8: '.......===......===.', 7: '........g........g..' } },
    // ---------- gaps (bouncy clouds catch her, never a fall) ----------
    gap: { g: '0000000___0000000000', a: { 6: '.......ggg..........', 10: 'gggg..........gggg..' } },
    gap2: { g: '00000__0000___000000', a: { 7: '.....gg.....ggg.....', 10: 'ggg.......g.......gg' } },
    gapcloud: { g: '0000______0000000000', a: { 6: '.....g..g...........', 8: '.....====...........', 7: '......gg............', 10: 'gg..........ggg.....' } },
    // ---------- bounce flowers ----------
    spring: { g: F0, a: { 2: '........gggg........', 3: '......g.....g.......', 10: '..gg.F........gg....' } },
    spring2: { g: F0, a: { 1: '.........Q..........', 3: '.......g...g........', 10: '.....F.........F....' } },
    // ---------- hills ----------
    hill: { g: '00011223333221100000', a: { 6: '.....ggg....ggg.....', 9: '..g..............g..' } },
    hillbun: { g: '00112233333322110000', a: { 4: '.........G..........', 6: '....ggg.....ggg.....', 10: '.........b..........' } },
    valley: { g: '22211100000000111222', a: { 7: '....g..........g....', 8: '.....gg.......gg....', 10: '........j...........' } },
    // ---------- rings and wind ----------
    rings: { g: F0, a: { 6: '.....Q......Q.......', 10: '..gg...gg......gg...' } },
    rings2: { g: F0, a: { 4: '.........Q..........', 7: '....Q.........Q.....', 10: '.gg.................' } },
    wind: { g: F0, a: { 1: '.......ggg..........', 3: '.......ggg..........', 5: '.......ggg..........', 8: '........W...........', 10: '..gg..........gg....' } },
    wind2: { g: F0, a: { 2: '....ggg.......ggg...', 4: '..............g.....', 8: '.....W........W.....', 10: '.g..........n.......' } },
    // ---------- treasure moments ----------
    big: { g: F0, a: { 5: '.....G........G.....', 7: '....g.g......g.g....', 10: '.........b..........' } },
    heal: { g: F0, a: { 6: '......P.............', 7: '.............H......', 10: '..gggg......gggg....' } },
    check: { g: F0, a: { 7: '..ggg.........ggg...', 10: '..........K.........' } },
    gate: { g: F0, a: { 9: '.g..g...............', 10: '..g..g..............', 11: '..........E.........' } },
    arena: { g: F0, a: { 10: '.gggg...............', 11: '.....B..............' } },
    // ---------- per-level specials (crowns, power-ups, secret swirls) ----------
    m_crownHi: { g: F0, a: { 3: '..........C.........', 4: '.........g.g........', 8: '......=====.........', 10: '..gg................' } },
    m_secret: { g: F0, a: { 2: '..........O.........', 3: '.........===........', 4: '......g.............', 10: '..gg.F..............' } },
    m_power: { g: F0, a: { 6: '.....U..............', 7: '...........M........', 10: '..........gggggggg..' } },
    f_crown: { g: F0, a: { 1: '..........C.........', 3: '........g...g.......', 10: '..gg..F.............' } },
    f_secret: { g: '00000000___000000000', a: { 2: '.........O..........', 4: '.......g...g........', 10: '..gg..F.............' } },
    f_shield: { g: F0, a: { 5: '............A.......', 6: '....S...............', 10: '.........j....j.....' } },
    r_crown: { g: '0000________00000000', a: { 4: '.......C............', 6: '....===....===......', 8: '..==..........==....' } },
    r_secret: { g: F0, a: { 1: '..............O.....', 2: '.............===....', 4: '.........=====......', 6: '....=====...........', 8: '.===................' } },
    r_rainbow: { g: F0, a: { 5: '..............A.....', 6: '...R................', 10: '.......b...b...b..b.' } },
    d_crown: { g: F0, a: { 0: '.......C............', 2: '.......g............', 4: '.......g............', 8: '.......W............', 10: '..gg................' } },
    d_secret: { g: F0, a: { 1: '..........O.........', 3: '..........g.........', 8: '..........W.........', 10: '.....n..............' } },
    d_giant: { g: F0, a: { 5: '.......A............', 6: '..Z.................', 10: '......b..j..b..n..b.' } },
    s_power: { g: F0, a: { 3: '..............C.....', 4: '..A..........g.g....', 6: '.....S.....P........', 8: '............=====...', 10: '..ggg...............' } },
    m_crown2: { g: '0000000___0000000000', a: { 4: '........C...........', 5: '...............A....', 6: '.......g.g..........', 10: 'ggg...........ggg...' } },
    f_crown2: { g: F0, a: { 5: '..........C.........', 7: '.........g.g........', 10: '..gg.....j..........' } },
    r_crown2: { g: F0, a: { 3: '.............C......', 5: '.....y...y..........', 8: '..g.g.g.g.g.........' } },
    d_crown2: { g: F0, a: { 4: '.........C..........', 6: '........g.g.........', 10: '..gg....n...........' } },
    // ---------- v7: Candy Clouds ----------
    c_lolli: { g: F0, a: { 6: '..ggg..ggg..ggg.....', 10: '....b.....b.....b...' } },
    c_crown: { g: F0, a: { 2: '.........C..........', 3: '........g.g.........', 10: '..gg..F.............' } },
    c_crown2: { g: '000000___00000000000', a: { 4: '.......C............', 6: '......g.g...........', 10: 'gg..........ggg.....' } },
    c_friend: { g: F0, a: { 4: '............A.......', 5: '...........g.g......', 8: '..........=====.....', 10: '..gg..j.............' } },
    c_secret: { g: F0, a: { 2: '..........O.........', 3: '.........===........', 4: '......g.............', 10: '..gg.F..............' } },
    // ---------- v7: Moonlight Bridge (long cloud bridges over the bouncy gaps) ----------
    mb_bridge: { g: '000______________000', a: { 7: '....g..g..g..g..g...', 8: '...==============...', 10: 'gg................gg' } },
    mb_crown: { g: '0000__________000000', a: { 3: '........C...........', 4: '.......g.g..........', 6: '.....=======........' } },
    mb_crown2: { g: F0, a: { 1: '.........C..........', 3: '.......g...g........', 7: '.............y......', 10: '..gg.F..............' } },
    mb_friend: { g: '00000000____00000000', a: { 4: '.........A..........', 6: '........g.g.........', 10: '.ggg..........n.....' } },
    mb_secret: { g: F0, a: { 2: '.........O..........', 3: '........===.........', 5: '.....=====..........', 8: '..=====.............' } },
    // ---------- v7: Bubble Lagoon (swim-float: soft gravity, every tap is a swim stroke) ----------
    bl_float: { g: F0, a: { 3: '...ggg.....ggg......', 5: '......ggg.....ggg...', 10: 'gg..................' } },
    bl_crown: { g: '0000____________0000', a: { 2: '.........C..........', 4: '.......g...g........', 6: '.....g.......g......' } },
    bl_crown2: { g: '000000_______0000000', a: { 3: '.........C..........', 5: '........g.g.........', 8: '......y.....y.......' } },
    bl_friend: { g: F0, a: { 2: '.............A......', 4: '...........g.g......', 7: '.....y..............', 10: '..gg................' } },
    bl_secret: { g: F0, a: { 1: '..........O.........', 2: '.........===........', 4: '......g.............', 10: '..gg..j.............' } },
    // ---------- secret rooms (golden treasure clouds) ----------
    t_in: { g: F0, a: { 6: '..g.g.g.g.g.g.g.g.g.', 8: '.g.g.g.g.g.g.g.g.g.g', 10: 'gggggggggggggggggggg' } },
    t_gifts: { g: F0, a: { 4: '....ggg....ggg......', 7: '...M....M....M......', 10: 'gg..gg..gg..gg..gg..' } },
    t_crown: { g: F0, a: { 2: '.........C..........', 3: '........G.G.........', 10: '...gg.F.....gg..gg..' } },
    t_rings: { g: F0, a: { 5: '...Q....Q....Q......', 9: '.G........G.........' } },
    t_out: { g: F0, a: { 8: '..g.g.g.............', 10: 'gggg......X.........' } }
  };
  const LV = [
    { id: 1, name: 'Cloud Meadow', icon: 'cloud', speed: 118, theme: 'meadow',
      segs: ['start', 'hop', 'arc', 'blocks', 'hop2', 'steps', 'gap', 'heal', 'check', 'gift', 'm_crownHi', 'm_crown2', 'trio', 'spring', 'm_secret', 'blocks2', 'hill', 'm_power', 'hop', 'gate'],
      bonus: ['t_in', 't_gifts', 't_crown', 't_out'] },
    { id: 2, name: 'Flower Hills', icon: 'flower', speed: 126, theme: 'sunset',
      segs: ['start', 'hill', 'jelly', 'spring', 'blocks', 'valley', 'f_shield', 'spring2', 'check', 'hillbun', 'gap', 'f_crown', 'rings', 'f_crown2', 'f_secret', 'hill', 'trio', 'big', 'spring', 'gate'],
      bonus: ['t_in', 't_rings', 't_crown', 't_out'] },
    { id: 3, name: 'Rainbow Slides', icon: 'rainbow', speed: 132, theme: 'rainbow',
      segs: ['start', 'cloudhop', 'flyers', 'gap2', 'r_rainbow', 'steps2', 'rings2', 'check', 'gapcloud', 'r_crown', 'flyers2', 'r_crown2', 'heal', 'r_secret', 'rest', 'cloudhop', 'gift', 'trio', 'rings', 'gate'],
      bonus: ['t_in', 't_gifts', 't_crown', 't_out'] },
    { id: 4, name: 'Gem Garden', icon: 'gem', speed: 138, theme: 'dusk',
      segs: ['start', 'snow', 'wind', 'blocks2', 'd_giant', 'valley', 'check', 'd_crown', 'gap2', 'flyers2', 'wind2', 'd_crown2', 'heal', 'd_secret', 'snow', 'm_power', 'trio', 'big', 'rings2', 'gate'],
      bonus: ['t_in', 't_rings', 't_crown', 't_out'] },
    { id: 5, name: 'Silver Puffball', icon: 'boss', speed: 122, theme: 'silver', boss: true,
      segs: ['start', 'hop', 's_power', 'm_crownHi', 'check', 'blocks', 'arc', 'arena'] },
    // v7: three new levels after the boss (added AFTER the old ones, so saved progress indexes never shift) + the rematch
    { id: 6, name: 'Candy Clouds', icon: 'candy', speed: 140, theme: 'candy',
      segs: ['start', 'c_lolli', 'hop', 'spring', 'blocks', 'gap', 'c_crown', 'trio', 'check', 'cloudhop', 'c_friend', 'rings', 'c_crown2', 'heal', 'c_secret', 'steps', 'hop2', 'big', 'spring2', 'gate'],
      bonus: ['t_in', 't_gifts', 't_crown', 't_out'] },
    { id: 7, name: 'Moonlight Bridge', icon: 'moon', speed: 144, theme: 'moon',
      segs: ['start', 'hop', 'mb_bridge', 'flyers', 'blocks2', 'mb_crown', 'wind2', 'check', 'mb_friend', 'snow', 'mb_bridge', 'mb_crown2', 'heal', 'mb_secret', 'rings2', 'hillbun', 'trio', 'big', 'gate'],
      bonus: ['t_in', 't_rings', 't_crown', 't_out'] },
    { id: 8, name: 'Bubble Lagoon', icon: 'bubble', speed: 128, theme: 'lagoon', swim: true,
      segs: ['start', 'bl_float', 'jelly', 'bl_crown', 'flyers', 'gap2', 'bl_float', 'check', 'bl_friend', 'rings', 'flyers2', 'bl_crown2', 'heal', 'bl_secret', 'gapcloud', 'bl_float', 'trio', 'big', 'gate'],
      bonus: ['t_in', 't_gifts', 't_crown', 't_out'] },
    { id: 9, name: 'Puffball Party', icon: 'party', speed: 128, theme: 'candy', boss: true, party: true,
      segs: ['start', 'hop', 's_power', 'm_crownHi', 'check', 'c_lolli', 'blocks', 'arc', 'arena'] }
  ];
  const CHARS = '.gGQCHM=FWbjnyPRUSZOXKEBA';
  function cells(seg) {   // [[ch, col, row], ...]
    const o = []; for (const r in seg.a) { const s = seg.a[r]; for (let c = 0; c < s.length && c < W; c++) if (s[c] !== '.') o.push([s[c], c, +r]); } return o;
  }
  function build(def, list) {
    const segs = list || def.segs, cols = segs.length * W, rows = [], ground = [];
    for (let r = 0; r < ROWS; r++) rows.push(new Array(cols).fill('.'));
    segs.forEach((name, si) => {
      const s = SEG[name]; if (!s) throw new Error('unknown segment ' + name);
      for (let c = 0; c < W; c++) { const ch = s.g[c] || '0'; ground.push(ch === '_' ? -1 : +ch); }
      cells(s).forEach(it => { const c = si * W + it[1], r = it[2]; if (r >= 0 && r < ROWS && c < cols && rows[r][c] === '.') rows[r][c] = it[0]; });
    });
    return { id: def.id, name: def.name, icon: def.icon, speed: def.speed, swim: !list && !!def.swim, party: !list && !!def.party, theme: list ? 'treasure' : def.theme, boss: !list && !!def.boss, cols, ground, rows: rows.map(r => r.join('')) };
  }
  window.SKLevels = { W, ROWS, TILE: 25, CHARS, SEG, DEFS: LV, build };
})();
