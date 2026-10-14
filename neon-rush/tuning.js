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
export const AIR_G=15,HOP_G=6.2,HOP_VY=6.6;  // gravity, Gravity Hop gravity + launch speed (big floaty jump)
