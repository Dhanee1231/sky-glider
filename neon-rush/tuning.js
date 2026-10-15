// Neon Rush tuning (Track B in M3). Racers/items/obstacles read these.
export const LAPS=3;
export const VMAX=32;        // player top speed m/s (M2 20, M5 29; M6 +10%)
export const VBOOST=45;      // boost / Rocket Star top speed (M2 28, M5 38, M6 42, M6B 45: player boosts hit harder)
export const VBOOST_AI=42;   // rival boost / Rocket Star top speed (unchanged by M6B)
export const ACC=10.5;       // acceleration m/s^2 (M2 6.5, M5 9.5)
export const BOOST_ACC=40;   // player boost acceleration (M6 32)
// M6: power-up durations are ~1.5x the M5 values (seconds)
export const DUR={boost:2.7,boostAI:2.0,shield:22,shieldAI:15,rocket:4.8,mega:5.5,storm:3};   // M6B: player shield 22 s (rivals 15)
// M6B: what the PLAYER's attacks do to rivals (rival items on the player follow DIFF): EMP / Wave Ring / Lightning Storm slow 45% for 2.6 s,
// Laser / Rocket / Holo-Mine / Mega bump = longer spin-out + a slow afterwards
export const PFX={empF:.55,empT:2.6,stormF:.55,stormT:2.8,spin:1.6,slowT:2.2};
export const STEER_RATE=1.3; // yaw rad/s (M2 1.55; lower because lateral speed grows with speed)
export const YAW_MAX=.42;    // max heading vs track (M2 .6)
export const BEND=.2;        // share of the bend the kid must steer herself (M2 .32; the rest is assist)
// catch-up (mostly slows leaders): rivals ahead of the player by more than LEAD_GAP m lose up to LEAD_SLOW of top speed
export const LEAD_GAP=4,LEAD_SLOW=.22,LEAD_RAMP=.01;
export const DRAFT_GAP=6,DRAFT_MAX=.05,DRAFT_RAMP=.003;   // player slipstream: behind the kart ahead by > DRAFT_GAP m -> up to +5% top speed
export const TRAIL_GAP=6,TRAIL_HELP=.08,TRAIL_RAMP=.005;   // rivals behind the player by > TRAIL_GAP m get up to +8% (M4: longer laps need a firmer pull to keep the pack close)
export const TRICK_T=.55,TRICK_BOOST=.6;   // M5: a spin/flip takes TRICK_T s; a landed trick gives TRICK_BOOST s of boost
export const AIR_G=15,HOP_G=6.2,HOP_VY=6.6;  // gravity, Gravity Hop gravity + launch speed (big floaty jump)
// M5 difficulty (settings.difficulty). Racers, items and obstacles read DIFF[ST.settings.difficulty] via getDiff().
// pace: rival top speed x (on top of the style pace); rubber: scales LEAD_SLOW/TRAIL_HELP; line: racing-line strength x; wide: extra margin when dodging
// aiItem: [min,max] s between rival items aimed at the player (0 = never); density: share of obstacle sets that are active (per-set hash, so it is stable);
// M5b item rules: spinT = spin-out length (s), orbHome = Pulse Orb homing strength, mineLife = Holo-Mine lifetime (s), empF/empT = EMP slow factor / seconds
// moveSpd: speed of moving hazards x; slow: seconds of slowdown after a hit (wobble always); assist: edge auto-steer (m/s of nudge); odds: item odds tweak
// M6: harder everywhere + 'extreme'. New fields: itemRate (x rival item hold time: lower = items used sooner), aiAtk (chance a rival keeps an attack item instead of
// turning it into a Nitro; Easy rivals attack rarely), lv (index 0-3: M6 extra moving hazards with lv<=this are on), stormT/stormF (Lightning Storm slow seconds / factor on this level)
export const DIFF={
 easy:  {riskK:.5,pace:.97,rubber:.55,line:.8,wide:.6,aiItem:0,aiAtk:0,itemRate:1.3,density:.55,lv:0,moveSpd:.85,slow:0,assist:1,goodItems:1,cheer:1,spinT:.6,orbHome:.5,mineLife:10,empF:.88,empT:.9,stormF:.85,stormT:2},
 medium:{riskK:.8,pace:.966,rubber:.45,line:1.05,wide:0,aiItem:[16,20],aiAtk:1,itemRate:1,density:.85,lv:1,moveSpd:1.1,slow:.5,assist:0,goodItems:0,cheer:0,spinT:.9,orbHome:.8,mineLife:18,empF:.78,empT:1.2,stormF:.8,stormT:3},
 hard:  {riskK:1,pace:.981,rubber:.3,line:1.4,wide:-.3,aiItem:[8,12],aiAtk:1,itemRate:.8,density:1,lv:2,moveSpd:1.4,slow:1,assist:0,goodItems:0,cheer:0,fewBoost:1,spinT:1.2,orbHome:1.1,mineLife:24,empF:.72,empT:1.5,stormF:.75,stormT:3.5},
 extreme:{riskK:1,laps:4,pace:.996,rubber:.12,line:1.6,wide:-.5,aiItem:[4,7],aiAtk:1,itemRate:.5,density:1,lv:3,moveSpd:1.75,slow:1.2,assist:0,goodItems:0,cheer:0,fewBoost:1,xtra:1,spinT:1.3,orbHome:1.3,mineLife:30,empF:.68,empT:1.8,stormF:.7,stormT:4}};
let curDiff='easy';
export const setDifficulty=d=>{curDiff=DIFF[d]?d:'easy';};
export const getDiff=()=>DIFF[curDiff];
export const getLaps=()=>getDiff().laps||LAPS;   // M6B: Extreme races 4 laps (tracks are ~45% longer, a race is 2.5-4 min)
