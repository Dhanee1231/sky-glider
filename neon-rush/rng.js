// Neon Rush seeded randomness (M6B): every race gets a seed; layouts (mirror / jitter / subsets / item rows / fork sides) are pure functions of (seed, ids, lap),
// so a lap looks the same for everybody in that race, different laps and different races look different.
export const hash=(...a)=>{let h=0x9e3779b9;for(const v of a){h^=(v|0)+0x7f4a7c15+(h<<6)+(h>>>2);h=Math.imul(h^(h>>>15),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);h^=h>>>16;}return (h>>>0)/4294967296;};
export const newSeed=()=>(Math.random()*2147483647)|0;
