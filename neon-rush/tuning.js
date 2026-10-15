// Neon Rush tuning (Track B in M3). Racers/items/obstacles read these.
export const LAPS=3;
export const VMAX=29;        // player top speed m/s (M2 was 20: +45%)
export const VBOOST=38;      // boost / Rocket Star top speed (M2 28)
export const ACC=9.5;        // acceleration m/s^2 (M2 6.5)
export const BOOST_ACC=30;
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
export const DIFF={
 easy:  {pace:.9,rubber:1,line:.7,wide:.8,aiItem:0,density:.4,moveSpd:.7,slow:0,assist:1,goodItems:1,cheer:1,spinT:.6,orbHome:.4,mineLife:8,empF:.9,empT:.6},
 medium:{pace:.94,rubber:1,  line:1,  wide:0, aiItem:[20,25],density:.7,moveSpd:1,slow:.5,assist:0,goodItems:0,cheer:0,spinT:.9,orbHome:.7,mineLife:15,empF:.8,empT:.8},
 hard:  {pace:.95,rubber:.9,line:1.35,wide:-.3,aiItem:[10,15],density:1,moveSpd:1.3,slow:1,assist:0,goodItems:0,cheer:0,fewBoost:1,spinT:1.2,orbHome:1,mineLife:20,empF:.75,empT:1}};
let curDiff='easy';
export const setDifficulty=d=>{curDiff=DIFF[d]?d:'easy';};
export const getDiff=()=>DIFF[curDiff];
