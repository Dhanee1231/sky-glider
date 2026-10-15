// Neon Rush obstacles (M4, Track A): kid-fair hazards. Every group is telegraphed by a pulsing glow ring that brightens
// ~1.5 s before you reach it, leaves a clear lane >= 5.5 m, and only bumps / wiggles / does a short funny spin (< 1 s).
// The layout comes from the track (TRACK.obstacles). All pieces = ONE palette draw call, all telegraph rings = one more.
// createObstacles(kit) -> { reset(), update(dt,time,heroS,heroV), collide(k), ahead(s,x,look,margin), groups, pieces }
// collide(k) runs for the player AND every rival. Returns an event name (see EVENTS) or null.
import * as THREE from 'three';
import {palMesh,setSlotM,hideSlot} from './b_pal.js';
import {hitKart} from './items.js';
import {getDiff} from './tuning.js';
import {hash} from './rng.js';
// event -> what main.js plays: 'bonk' (bump + shake), 'crash' (crate smash), 'spin' (fan), 'wiggle', 'goo', 'boing'
export const EVENTS={barrel:'bonk',crate:'crash',trap:'crash',cones:'crash',crane:'bonk',sign:'bonk',net:'bonk',car:'bonk',bollards:'bonk',sweeper:'bonk',pixel:'bonk',gate:'bonk',buoy:'boing',goo:'goo',fan:'spin',wheel:'spin',barrier:'bonk',container:'bonk',bumper:'bonk',rollbot:'bonk',dockcart:'bonk',paddle:'bonk',ball:'boing',castle:'crash',board:'bonk',umbrella:'bonk',wave:'goo',slidebar:'bonk',drone:'bonk',crab:'bonk',rollball:'boing',rotor:'bonk',swing:'bonk',swinggate:'bonk'};
// half-width of the band each group can block (AI dodges the whole band; the lane beside it stays clear)
const HW={barrel:1.6,crate:1.5,trap:1.5,crane:2.9,fan:2.2,cones:1.8,sign:3.3,net:3.3,car:1.3,goo:1.8,bollards:1.7,sweeper:3,buoy:1.6,pixel:1.8,gate:2.8,wheel:2,barrier:2.6,container:1.9,bumper:1.9,rollbot:2.7,dockcart:2.7,paddle:2.8,ball:1.6,castle:1.6,board:2.6,umbrella:1.7,wave:3.1,slidebar:3.35,drone:3.35,fsign:0,fpad:0,crab:3.25,rollball:3.25,rotor:2.8,swinggate:2.4};   // M6 movers: hw = the whole patrol zone (the AI dodges it all; the other side keeps a >= 5 m lane)
const GCOL={barrel:0xffa020,crate:0xff4fc8,trap:0xff7a3a,crane:0xffd23a,fan:0x35f2ff,cones:0xff8a2a,sign:0xff4fd8,net:0x35f2ff,car:0x7aa8ff,goo:0x9aff4a,bollards:0xff3a5a,sweeper:0xffd23a,buoy:0xff4a4a,pixel:0x7dff6a,gate:0xff3a3a,wheel:0xffd23a,barrier:0xff8a1a,container:0xff8a1a,bumper:0xff8a1a,rollbot:0xff8a1a,dockcart:0xff8a1a,paddle:0xff8a1a,ball:0xff4f7a,castle:0xffc060,board:0x35f2ff,umbrella:0xff4fd8,wave:0x35f2ff,slidebar:0xff8a1a,drone:0xff8a1a,crab:0xff8a1a,rollball:0xff8a1a,rotor:0xff8a1a,swinggate:0xff8a1a};
export function createObstacles(kit){const {S,W,L,sample,cv,tex}=kit;const BASE=(kit.track&&kit.track.obstacles)||[],FORKS=(kit.track&&kit.track.forks)||[];
 // M6B forks: per fork and branch (side -1/+1): a marker (orange 'risk' / green 'safe'), 3 boost pads + hazards that are only on while this branch is the risky one (sides swap per lap and per race)
 const FKL=[];FORKS.forEach(([a,b],i)=>{for(const sg of[-1,1]){const fk={i,side:sg};FKL.push({kind:'fsign',tone:'risk',s:a+3,x:sg*3.4,fk,role:'risk',dec:1},{kind:'fsign',tone:'safe',s:a+3,x:sg*3.4,fk,role:'safe',dec:1},{kind:'fpad',s:a+28,x:sg*3.4,fk,role:'risk',dec:1},
  {kind:'cones',s:a+68,x:sg*3.3,fk,role:'risk',lv:1},{kind:'crate',s:a+106,x:sg*3.6,fk,role:'risk',lv:2},{kind:'barrel',s:a+130,x:sg*3.4,fk,role:'risk',lv:3});}});
 const LAYOUT=BASE.concat(FKL);const C=(h,m=1)=>new THREE.Color(h).multiplyScalar(m);
 const pc=(g,c)=>kit.paintCol(g,c);
 const NEWK=['barrier','container','bumper','rollbot','dockcart','paddle','wave','umbrella','board','slidebar','drone','crab','rollball','rotor','swinggate'];
 const MOVERS=['slidebar','drone','crab','rollball','rotor','swinggate'];   // M6 moving hazards (telegraphed: chevron pad + glow ring + a soft double beep)
 const NOMIR=['sign','net','gate','swinggate','crane','car'];   // side-specific geometry / long-travel hazards keep their side and place
 const pieces=[],groups=[];const opParts=[],glowParts=[];const o={};
 const frameAt=(s,x,out)=>{sample(s,o);(out.p||(out.p=new THREE.Vector3())).set(o.x-o.tz*x,o.y,o.z+o.tx*x);out.ang=Math.atan2(o.tx,o.tz);return out;};
 // ---------- piece geometry (local frame: +z along the track backwards, +x = left, y up) ----------
 const barrelGeo=()=>{const gs=[];gs.push(pc(new THREE.CylinderGeometry(.48,.48,1.15,14).translate(0,.575,0),C(0xff6a1a)));
  for(const y of[.35,.78])gs.push(pc(new THREE.CylinderGeometry(.49,.49,.15,14).translate(0,y,0),C(0xffffff,1.8)));
  gs.push(pc(new THREE.CylinderGeometry(.34,.34,.04,12).translate(0,1.17,0),C(0x2a1a10)));gs.push(pc(new THREE.SphereGeometry(.12,8,6).translate(0,1.27,0),C(0xffc02a,3)));return gs;};
 const crateGeo=()=>{const gs=[];gs.push(pc(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),C(0xc8803a)));
  for(const sx of[-1,1])for(const sz of[-1,1])gs.push(pc(new THREE.BoxGeometry(.12,1.02,.12).translate(sx*.46,.5,sz*.46),C(0x7a4a20)));
  for(const f of[-1,1]){gs.push(pc(new THREE.BoxGeometry(1.02,.1,.06).rotateZ(.78).translate(0,.5,f*.5),C(0x8a5426)));gs.push(pc(new THREE.BoxGeometry(.06,.1,1.02).rotateX(.78).translate(f*.5,.5,0),C(0x8a5426)));}
  gs.push(pc(new THREE.CircleGeometry(.22,5).translate(0,.55,.52),C(0xff4fc8,2.2)));gs.push(pc(new THREE.CircleGeometry(.22,5).rotateY(Math.PI).translate(0,.55,-.52),C(0xff4fc8,2.2)));return gs;};
 const trapGeo=()=>{const gs=[],fr=C(0x2a8a9a),mesh=C(0x9ae8f0,.9);   // crab-trap cage: frame + mesh bars + a glowing crab badge
  for(const sx of[-1,1])for(const sz of[-1,1]){gs.push(pc(new THREE.BoxGeometry(.08,.9,.08).translate(sx*.48,.45,sz*.48),fr));}
  for(const y of[.04,.86])for(const f of[-1,1]){gs.push(pc(new THREE.BoxGeometry(1,.08,.08).translate(0,y,f*.48),fr));gs.push(pc(new THREE.BoxGeometry(.08,.08,1).translate(f*.48,y,0),fr));}
  for(let i=-2;i<=2;i++)for(const f of[-1,1]){gs.push(pc(new THREE.BoxGeometry(.025,.82,.025).translate(i*.19,.45,f*.48),mesh));gs.push(pc(new THREE.BoxGeometry(.025,.82,.025).translate(f*.48,.45,i*.19),mesh));}
  gs.push(pc(new THREE.BoxGeometry(.96,.04,.96).translate(0,.86,0),C(0x1a4a5a)));
  gs.push(pc(new THREE.SphereGeometry(.2,10,6).scale(1,.55,.8).translate(0,.3,0),C(0xff5a2a,1.6)));for(const s of[-1,1])gs.push(pc(new THREE.SphereGeometry(.07,6,4).translate(s*.22,.36,-.12),C(0xff5a2a,1.6)));
  gs.push(pc(new THREE.CircleGeometry(.16,12).translate(0,.5,.5),C(0xffd23a,2.6)));gs.push(pc(new THREE.CircleGeometry(.16,12).rotateY(Math.PI).translate(0,.5,-.5),C(0xffd23a,2.6)));return gs;};
 const buoyGeo=()=>{const gs=[];gs.push(pc(new THREE.SphereGeometry(.55,14,10).scale(1,.85,1).translate(0,.5,0),C(0xff3a2a)));gs.push(pc(new THREE.CylinderGeometry(.56,.56,.18,14).translate(0,.5,0),C(0xffffff,1.6)));
  gs.push(pc(new THREE.CylinderGeometry(.05,.05,.7,6).translate(0,1.2,0),C(0x303040)));gs.push(pc(new THREE.SphereGeometry(.13,8,6).translate(0,1.58,0),C(0xfff27a,3.2)));return gs;};
 const coneGeo=()=>{const gs=[];gs.push(pc(new THREE.BoxGeometry(.62,.06,.62).translate(0,.03,0),C(0x2a2030)));gs.push(pc(new THREE.ConeGeometry(.27,.78,12).translate(0,.45,0),C(0xff7a1a,1.15)));
  gs.push(pc(new THREE.CylinderGeometry(.165,.205,.12,12,1,true).translate(0,.5,0),C(0xffffff,2)));gs.push(pc(new THREE.SphereGeometry(.06,6,4).translate(0,.86,0),C(0xffd23a,3)));return gs;};
 const craneGeo=(len)=>{const gs=[];const yel=C(0xffc02a),dk=C(0x2a2430);
  for(const [y,z] of[[.15,-.35],[.15,.35],[.85,0]])gs.push(pc(new THREE.BoxGeometry(len,.12,.12).translate(0,y,z),yel));
  for(let i=0;i<=len/.7;i++){const x=-len/2+i*.7;gs.push(pc(new THREE.BoxGeometry(.07,.9,.07).rotateX(.42).translate(x,.5,-.17),i%2?yel:dk));gs.push(pc(new THREE.BoxGeometry(.07,.9,.07).rotateX(-.42).translate(x+.35,.5,.17),i%2?dk:yel));}
  gs.push(pc(new THREE.BoxGeometry(.9,1.2,1.1).translate(len/2+.3,.6,0),yel));gs.push(pc(new THREE.CylinderGeometry(.15,.15,.25,10).rotateZ(Math.PI/2).translate(-len/2-.2,.3,0),dk));
  for(const x of[-len/2+.4,0,len/2-.3])gs.push(pc(new THREE.SphereGeometry(.12,8,6).translate(x,1.0,0),C(0xffa020,3.2)));return gs;};
 const fanBase=()=>[pc(new THREE.CylinderGeometry(.35,.55,.55,12).translate(0,.27,0),C(0x40485a)),pc(new THREE.CylinderGeometry(.2,.2,.3,10).translate(0,.65,0),C(0x8a96b0)),pc(new THREE.SphereGeometry(.14,8,6).translate(0,.85,0),C(0x35f2ff,2.4))];
 const fanRotor=(r)=>{const gs=[];for(let i=0;i<3;i++){const b=new THREE.BoxGeometry(r,.16,.5);b.rotateX(.35);b.translate(r/2,0,0);b.rotateY(i/3*Math.PI*2);gs.push(pc(b,C(i%2?0xff4fc8:0x8a5cff)));
   const tip=new THREE.SphereGeometry(.18,8,6);tip.translate(r,0,0);tip.rotateY(i/3*Math.PI*2);gs.push(pc(tip,C(0xfff27a,2.4)));}
  gs.push(pc(new THREE.CylinderGeometry(.22,.22,.12,12),C(0xd8d8e8)));return gs.map(g=>g.translate(0,.62,0));};
 const wheelGeo=()=>{const gs=[],cols=[0xff4fd8,0xffd23a,0x35f2ff,0x7dff6a,0xff7a3a,0x8a6bff];   // prize wheel: 6 glowing wedges + rim + pointer hub
  for(let i=0;i<6;i++){const g=new THREE.CylinderGeometry(1.8,1.8,.08,8,1,false,i/6*Math.PI*2,Math.PI*2/6).translate(0,.06,0);gs.push(pc(g,C(cols[i],1.6)));}
  gs.push(pc(new THREE.TorusGeometry(1.82,.07,6,36).rotateX(Math.PI/2).translate(0,.1,0),C(0xffffff,2.4)));gs.push(pc(new THREE.CylinderGeometry(.3,.36,.25,12).translate(0,.18,0),C(0xffffff,2)));
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;gs.push(pc(new THREE.SphereGeometry(.07,6,4).translate(Math.cos(a)*1.66,.14,Math.sin(a)*1.66),C(0xfff27a,3)));}return gs;};
 const gooGeo=()=>{const gs=[];const blob=new THREE.CircleGeometry(1.6,24);const p=blob.attributes.position;for(let i=1;i<p.count;i++){const a=Math.atan2(p.getY(i),p.getX(i)),r=1+.16*Math.sin(a*5)+.08*Math.sin(a*3+1);p.setXY(i,p.getX(i)*r,p.getY(i)*r);}
  gs.push(pc(blob.rotateX(-Math.PI/2).scale(1,1,1.05).translate(0,.02,0),C(0x6aff3a,.9)));gs.push(pc(new THREE.CircleGeometry(1.1,20).rotateX(-Math.PI/2).translate(.2,.03,.1),C(0xb4ff7a,1.4)));
  for(let i=0;i<7;i++){const a=i*2.1,r=.3+(i%3)*.4;gs.push(pc(new THREE.SphereGeometry(.12+(i%2)*.06,8,6).translate(Math.cos(a)*r,.06,Math.sin(a)*r),C(0xd8ffb0,2)));}return gs;};
 const carGeo=()=>{const gs=[];const RB=kit.RoundedBoxGeometry;   // friendly hover car: rounded body, bubble cabin, glowing under-pads, headlights
  gs.push(pc(new RB(1.7,.55,3.1,2,.22).translate(0,.75,0),C(0x5a8aff)));gs.push(pc(new RB(1.3,.5,1.5,2,.22).translate(0,1.22,.15),C(0xbfe8ff,1.3)));
  gs.push(pc(new THREE.BoxGeometry(1.74,.08,3.14).translate(0,.62,0),C(0xffffff,2)));
  for(const [x,z] of[[-.6,-1.05],[.6,-1.05],[-.6,1.05],[.6,1.05]])gs.push(pc(new THREE.CylinderGeometry(.34,.4,.1,12).translate(x,.38,z),C(0x35f2ff,3)));
  for(const x of[-.55,.55]){gs.push(pc(new THREE.CircleGeometry(.14,10).rotateY(Math.PI).translate(x,.78,-1.56),C(0xfff6d0,3.4)));gs.push(pc(new THREE.BoxGeometry(.4,.1,.02).translate(x,.8,1.56),C(0xff3a5a,3)));}
  gs.push(pc(new THREE.BoxGeometry(.5,.06,.4).translate(0,1.5,.15),C(0xffd23a,2.6)));return gs;};
 const signPost=(side,gx)=>{const gs=[],dk=C(0x2a2436);const ex=-side*(W/2+.5),px=-gx;   // post at the road edge (local x = -lateral) + arm out to the pivot over the band
  gs.push(pc(new THREE.BoxGeometry(.3,6,.3).translate(ex,3,0),dk));gs.push(pc(new THREE.BoxGeometry(Math.abs(ex-px)+.4,.25,.25).translate((ex+px)/2,5.9,0),dk));
  gs.push(pc(new THREE.SphereGeometry(.14,8,6).translate(px,5.75,0),C(0xffd23a,3)));return gs;};
 const signPanel=(col,len)=>{const gs=[];for(const x of[-.7,.7])gs.push(pc(new THREE.BoxGeometry(.03,len-.6,.03).translate(x,-(len-.6)/2,0),C(0xc8c8d8)));
  gs.push(pc(new THREE.BoxGeometry(2.3,1.05,.14).translate(0,-len,0),C(0x1a1028)));gs.push(pc(new THREE.BoxGeometry(2.4,.09,.16).translate(0,-len+.55,0),C(col,3)));gs.push(pc(new THREE.BoxGeometry(2.4,.09,.16).translate(0,-len-.55,0),C(col,3)));
  for(const x of[-1.2,1.2])gs.push(pc(new THREE.BoxGeometry(.09,1.15,.16).translate(x,-len,0),C(col,3)));
  for(const f of[-1,1]){gs.push(pc(new THREE.BoxGeometry(1.5,.32,.02).translate(-.1,-len+.08,f*.08),C(0xffffff,2.2)));gs.push(pc(new THREE.CircleGeometry(.18,5).translate(.8,-len+.05,f*.09),C(0xffd23a,3)));}return gs;};
 const craneTower=(side,h,gx)=>{const gs=[],yel=C(0xffb02a),ex=-side*(W/2+1.2),px=-gx;   // dock crane: lattice tower at the edge + jib over the band
  for(const sx of[-1,1])for(const sz of[-1,1])gs.push(pc(new THREE.BoxGeometry(.16,h,.16).translate(ex+sx*.45,h/2,sz*.45),yel));
  for(let y=1;y<h;y+=1.4)for(const sz of[-1,1])gs.push(pc(new THREE.BoxGeometry(.06,1.6,.06).rotateZ(.6).translate(ex,y+.7,sz*.45),yel));
  gs.push(pc(new THREE.BoxGeometry(Math.abs(ex-px)+1.5,.45,.5).translate((ex+px)/2,h+.2,0),yel));gs.push(pc(new THREE.BoxGeometry(1.2,1,1.4).translate(ex,h+.8,0),C(0x2a3a5a)));
  gs.push(pc(new THREE.SphereGeometry(.18,8,6).translate(px,h,0),C(0xff3a3a,3)));return gs;};
 const netGeo=(len)=>{const gs=[];gs.push(pc(new THREE.CylinderGeometry(.03,.03,len-1,4).translate(0,-(len-1)/2,0),C(0xcfcfdf)));
  const ball=new THREE.SphereGeometry(1.05,10,8);gs.push(pc(ball.translate(0,-len,0),C(0x2ad0c0,1.2)));
  for(let i=0;i<4;i++)gs.push(pc(new THREE.TorusGeometry(1.07,.05,4,20).rotateY(i/4*Math.PI).translate(0,-len,0),C(0x8affee,2)));
  for(let i=0;i<5;i++)gs.push(pc(new THREE.BoxGeometry(.5,.5,.5).rotateY(i).translate(Math.cos(i*1.3)*.45,-len-.2+(i%2)*.4,Math.sin(i*1.3)*.45),C([0xff4fd8,0xffd23a,0x35f2ff][i%3],1.3)));return gs;};
 const bollardGeo=()=>[pc(new THREE.CylinderGeometry(.24,.28,1.1,12).translate(0,.55,0),C(0xffd23a)),pc(new THREE.CylinderGeometry(.25,.25,.16,12).translate(0,.75,0),C(0x1a1a24)),pc(new THREE.CylinderGeometry(.25,.25,.16,12).translate(0,.35,0),C(0x1a1a24)),
  pc(new THREE.SphereGeometry(.2,10,6,0,Math.PI*2,0,Math.PI/2).translate(0,1.1,0),C(0xff3a5a,3))];
 const sweeperGeo=()=>{const gs=[];const RB=kit.RoundedBoxGeometry;gs.push(pc(new RB(1.4,.9,1.2,2,.25).translate(0,.62,0),C(0xffc83a)));gs.push(pc(new RB(.9,.5,.7,2,.2).translate(0,1.25,.1),C(0xf0f0ff)));
  for(const x of[-.22,.22])gs.push(pc(new THREE.SphereGeometry(.1,8,6).translate(x,1.3,-.26),C(0x35f2ff,3)));gs.push(pc(new THREE.BoxGeometry(.32,.05,.02).translate(0,1.12,-.27),C(0x35f2ff,2.4)));
  gs.push(pc(new THREE.CylinderGeometry(.04,.04,.5,6).translate(0,1.7,.1),C(0x606070)));gs.push(pc(new THREE.SphereGeometry(.12,8,6).translate(0,1.98,.1),C(0xff7a2a,3)));
  for(const x of[-.75,.75])for(const z of[-.45,.45]){gs.push(pc(new THREE.CylinderGeometry(.38,.38,.1,12).translate(x,.08,z),C(0xff4fd8,1.3)));gs.push(pc(new THREE.CylinderGeometry(.05,.05,.3,6).translate(x,.25,z),C(0x404050)));}return gs;};
 const pixelGeo=(col)=>{const gs=[];gs.push(pc(new THREE.BoxGeometry(.95,.95,.95).translate(0,.48,0),C(col,1.25)));
  for(const f of[-1,1]){gs.push(pc(new THREE.PlaneGeometry(.3,.3).translate(-.18,.6,f*.48+f*.005).rotateY(f>0?0:Math.PI),C(0xffffff,2.6)));gs.push(pc(new THREE.PlaneGeometry(.3,.3).translate(.18,.6,f*.48+f*.005).rotateY(f>0?0:Math.PI),C(0xffffff,2.6)));}
  gs.push(pc(new THREE.BoxGeometry(1,.06,1).translate(0,.97,0),C(0xffffff,2)));return gs;};
 const gatePost=(side)=>{const ex=-side*(W/2-.35);return [pc(new THREE.BoxGeometry(.7,1.5,.7).translate(ex,.75,0),C(0x303040)),pc(new THREE.BoxGeometry(.75,.12,.75).translate(ex,1.5,0),C(0xffd23a,2.4)),pc(new THREE.SphereGeometry(.16,8,6).translate(ex,1.72,0),C(0xff3a3a,3.2))];};
 const gateArm=(side,len)=>{const gs=[];for(let i=0;i<Math.round(len/.8);i++)gs.push(pc(new THREE.BoxGeometry(.8,.24,.18).translate(side*(.4+i*.8),0,0),C(i%2?0xffffff:0xff3a3a,i%2?1.6:2.2)));
  gs.push(pc(new THREE.SphereGeometry(.13,8,6).translate(side*len,0,0),C(0xffd23a,3)));return gs;};

 // ---------- M5 hazards: one warm orange (0xff6a1a) + white stripes + amber beacon = "stay away"; big, chunky, low-poly ----------
 const HZ=0xff6a1a,HZD=0x2a1a10;
 const warnPad=(hw)=>{const gs=[];const n=Math.round(hw*2/.9);for(let i=0;i<n;i++){const x=-hw+(i+.5)*(hw*2/n);gs.push(pc(new THREE.BoxGeometry(hw*2/n*.62,.03,2.2).rotateY(i%2?.5:-.5).translate(x,.045,0),C(i%2?HZ:0xfff0d0,i%2?2:1.7)));}return gs;};   // flat chevron strip on the road, ~9 m before the hazard
 const barrierGeo=()=>{const gs=[];gs.push(pc(new THREE.BoxGeometry(4.4,.9,.6).translate(0,.62,0),C(HZ)));
  for(let i=0;i<8;i++)gs.push(pc(new THREE.BoxGeometry(.5,.92,.62).translate(-1.93+i*.55,.62,0),C(i%2?HZD:0xfff0d0,i%2?1:1.7)));
  gs.push(pc(new THREE.BoxGeometry(4.6,.2,.75).translate(0,1.17,0),C(0xfff0d0,1.8)));
  for(const x of[-1.9,1.9]){gs.push(pc(new THREE.BoxGeometry(.28,.5,.5).translate(x,.25,0),C(HZD)));gs.push(pc(new THREE.SphereGeometry(.22,8,6).translate(x,1.45,0),C(0xffd23a,3.2)));}
  gs.push(pc(new THREE.SphereGeometry(.2,8,6).translate(0,1.43,0),C(0xffd23a,3.2)));return gs;};
 const containerGeo=()=>{const gs=[];gs.push(pc(new THREE.BoxGeometry(2.5,1.5,3.2).translate(0,.78,0),C(HZ)));
  for(const f of[-1,1])for(let z=-1.4;z<=1.41;z+=.35)gs.push(pc(new THREE.BoxGeometry(.1,1.3,.1).translate(f*1.27,.78,z),C(0xc84a10)));
  gs.push(pc(new THREE.BoxGeometry(2.56,.2,3.26).translate(0,1.0,0),C(0xfff0d0,1.8)));gs.push(pc(new THREE.BoxGeometry(2.6,.12,3.3).translate(0,1.56,0),C(HZD)));
  for(const f of[-1,1])gs.push(pc(new THREE.CircleGeometry(.42,12).rotateY(f*Math.PI/2).translate(f*1.285,.62,0),C(0x35f2ff,2.4)));
  gs.push(pc(new THREE.SphereGeometry(.24,8,6).translate(0,1.8,0),C(0xffd23a,3.2)));return gs;};
 const bumperGeo=()=>{const gs=[];gs.push(pc(new THREE.CylinderGeometry(.62,.72,.8,14).translate(0,.4,0),C(HZ)));gs.push(pc(new THREE.CylinderGeometry(.74,.74,.16,14).translate(0,.45,0),C(0xfff0d0,1.8)));
  gs.push(pc(new THREE.SphereGeometry(.5,12,8,0,Math.PI*2,0,Math.PI/2).translate(0,.8,0),C(0xffd23a,2.6)));gs.push(pc(new THREE.TorusGeometry(.66,.07,6,18).rotateX(Math.PI/2).translate(0,.88,0),C(0xff4fd8,2.6)));return gs;};
 const rollbotGeo=()=>{const gs=[];const RB=kit.RoundedBoxGeometry;gs.push(pc(new RB(1.5,.95,1.5,2,.25).translate(0,.7,0),C(HZ)));gs.push(pc(new THREE.BoxGeometry(1.54,.18,1.54).translate(0,.55,0),C(0xfff0d0,1.8)));
  gs.push(pc(new THREE.SphereGeometry(.42,10,8,0,Math.PI*2,0,Math.PI/2).translate(0,1.15,0),C(0x35f2ff,2.2)));for(const x of[-.7,.7])for(const z of[-.55,.55])gs.push(pc(new THREE.CylinderGeometry(.24,.24,.18,10).rotateZ(Math.PI/2).translate(x,.24,z),C(HZD)));
  gs.push(pc(new THREE.SphereGeometry(.2,8,6).translate(0,1.7,0),C(0xffd23a,3.2)));gs.push(pc(new THREE.CylinderGeometry(.04,.04,.35,6).translate(0,1.5,0),C(0x606070)));return gs;};
 const dockcartGeo=()=>{const gs=[];gs.push(pc(new THREE.BoxGeometry(2.1,.3,1.6).translate(0,.45,0),C(HZ)));for(const x of[-.8,.8])for(const z of[-.6,.6])gs.push(pc(new THREE.CylinderGeometry(.28,.28,.2,10).rotateZ(Math.PI/2).translate(x,.28,z),C(HZD)));
  gs.push(pc(new THREE.BoxGeometry(1.2,1.0,1.2).translate(-.3,1.1,0),C(0xe8a040)));gs.push(pc(new THREE.BoxGeometry(1.24,.18,1.24).translate(-.3,1.25,0),C(0xfff0d0,1.8)));
  gs.push(pc(new THREE.BoxGeometry(.18,1.3,.18).translate(.85,1.05,0),C(HZD)));gs.push(pc(new THREE.SphereGeometry(.2,8,6).translate(.85,1.8,0),C(0xffd23a,3.2)));return gs;};
 const paddleGeo=()=>{const gs=[];const RB=kit.RoundedBoxGeometry;gs.push(pc(new RB(2.3,.7,.85,2,.25).translate(0,.62,0),C(HZ)));gs.push(pc(new THREE.BoxGeometry(2.34,.14,.89).translate(0,.62,0),C(0xfff0d0,1.8)));
  for(const x of[-1.15,1.15])gs.push(pc(new THREE.SphereGeometry(.36,10,8).translate(x,.62,0),C(0xff4fd8,2.6)));gs.push(pc(new THREE.BoxGeometry(.5,.14,.5).translate(0,1.05,0),C(0x7dff6a,2.6)));
  gs.push(pc(new THREE.CylinderGeometry(.3,.4,.3,10).translate(0,.15,0),C(HZD)));return gs;};
 // M5b beach pieces (Track 4): beach balls, sandcastle, surfboards, umbrella, foam wave
 const tri=(g,f)=>{g=g.toNonIndexed();const p=g.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i+=3){const k=f((p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3,(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3,i/3);for(let j=0;j<3;j++){c[(i+j)*3]=k.r;c[(i+j)*3+1]=k.g;c[(i+j)*3+2]=k.b;}}g.setAttribute('color',new THREE.BufferAttribute(c,3));return g;};   // per-triangle colour
 const ballGeo=(r,ph)=>{const cols=[0xff2d55,0xffffff,0x1e7bff,0xffd21a,0xffffff,0x22c56e].map(h=>C(h,1.15));return [tri(new THREE.SphereGeometry(r,14,10).translate(0,r,0),(x,y,z)=>Math.abs(y-r)>r*.86?C(0xffffff,1.4):cols[Math.floor((Math.atan2(z,x)+Math.PI+ph)/(Math.PI/3))%6])];};
 const castleGeo=()=>{const gs=[],sd=C(0xe8c27a),dk=C(0xb98a4c);gs.push(pc(new THREE.CylinderGeometry(.85,1.0,.5,12).translate(0,.25,0),sd));
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,x=Math.cos(a)*.62,z=Math.sin(a)*.62;gs.push(pc(new THREE.CylinderGeometry(.2,.26,.95,8).translate(x,.85,z),sd));gs.push(pc(new THREE.ConeGeometry(.27,.4,8).translate(x,1.5,z),C(0xff5a7a,1.3)));}
  gs.push(pc(new THREE.CylinderGeometry(.34,.42,1.3,10).translate(0,1.1,0),sd));gs.push(pc(new THREE.ConeGeometry(.42,.6,10).translate(0,2.05,0),C(0xff3f6a,1.3)));gs.push(pc(new THREE.BoxGeometry(.04,.5,.04).translate(0,2.6,0),C(0xffffff,1.5)));gs.push(pc(new THREE.BoxGeometry(.34,.22,.03).translate(.17,2.74,0),C(0xffd23a,2.4)));
  gs.push(pc(new THREE.BoxGeometry(.3,.45,.1).translate(0,.5,.98),dk));return gs;};
 const boardGeo=(c1,c2,tilt)=>{const gs=[],b=new THREE.SphereGeometry(1,14,8);b.scale(.4,1.5,.08);gs.push(pc(b,C(c1,1.3)));const st=new THREE.SphereGeometry(1,10,6);st.scale(.1,1.48,.09);gs.push(pc(st,C(c2,1.4)));gs.push(pc(new THREE.BoxGeometry(.05,.3,.2).translate(0,-1.3,-.12),C(0x202030)));return gs.map(g=>g.rotateZ(tilt).translate(0,1.45,0));};
 const umbrellaGeo=()=>{const gs=[pc(new THREE.CylinderGeometry(.05,.05,3.2,6).translate(0,1.6,0),C(0xf4f4f4))];
  gs.push(tri(new THREE.ConeGeometry(1.9,.8,16,1,true).translate(0,3.4,0),(x,y,z)=>C(Math.floor((Math.atan2(z,x)+Math.PI)/(Math.PI/8))%2?0xff4f9a:0xffffff,1.3)));gs.push(pc(new THREE.SphereGeometry(.12,8,6).translate(0,3.85,0),C(0xffd23a,2.4)));gs.push(pc(new THREE.CylinderGeometry(.5,.6,.1,10).translate(0,.05,0),C(0xe8c27a)));return gs;};
 const waveGeo=()=>{const gs=[];gs.push(pc(new THREE.BoxGeometry(3.7,.55,1.0).translate(0,.28,0),C(0x2ad0e8,1.2)));
  gs.push(pc(new THREE.CylinderGeometry(.5,.5,3.7,10,1,false,0,Math.PI).rotateZ(Math.PI/2).translate(0,.62,.15),C(0x6aeaf8,1.4)));
  gs.push(pc(new THREE.BoxGeometry(3.8,.14,.5).translate(0,1.12,-.25),C(0xffffff,2)));for(let i=0;i<6;i++)gs.push(pc(new THREE.SphereGeometry(.2+(i%3)*.05,8,6).translate(-1.6+i*.64,1.15+(i%2)*.12,-.2),C(0xffffff,2.2)));return gs;};
// M6 moving hazards: all hazard orange (0xff6a1a) + white stripes + amber beacon like the M5 ones
 const slideGeo=()=>{const gs=[];gs.push(pc(new THREE.BoxGeometry(2.8,.9,.6).translate(0,.62,0),C(HZ)));
  for(let i=0;i<5;i++)gs.push(pc(new THREE.BoxGeometry(.5,.92,.62).translate(-1.12+i*.56,.62,0),C(i%2?HZD:0xfff0d0,i%2?1:1.7)));
  gs.push(pc(new THREE.BoxGeometry(3,.2,.75).translate(0,1.17,0),C(0xfff0d0,1.8)));for(const x of[-1.3,1.3]){gs.push(pc(new THREE.BoxGeometry(.28,.5,.5).translate(x,.25,0),C(HZD)));gs.push(pc(new THREE.SphereGeometry(.22,8,6).translate(x,1.45,0),C(0xffd23a,3.2)));}return gs;};
 const droneGeo=()=>{const gs=[];const RB=kit.RoundedBoxGeometry;gs.push(pc(new THREE.CylinderGeometry(.5,.62,.4,14).translate(0,0,0),C(HZ)));gs.push(pc(new THREE.CylinderGeometry(.64,.64,.1,14).translate(0,.02,0),C(0xfff0d0,1.8)));
  gs.push(pc(new THREE.SphereGeometry(.3,10,8,0,Math.PI*2,0,Math.PI/2).translate(0,.2,0),C(0x35f2ff,2.4)));gs.push(pc(new THREE.SphereGeometry(.14,8,6).translate(0,.62,0),C(0xffd23a,3.2)));gs.push(pc(new THREE.CylinderGeometry(.03,.03,.3,5).translate(0,.4,0),C(0x606070)));
  for(const [x,z] of[[-.78,-.78],[.78,-.78],[-.78,.78],[.78,.78]]){gs.push(pc(new THREE.BoxGeometry(Math.abs(x)+.1,.07,.1).rotateY(Math.atan2(-z,x)).translate(x/2,0,z/2),C(HZD)));gs.push(pc(new THREE.CylinderGeometry(.34,.34,.05,12).translate(x,.1,z),C(0xff4fd8,1.4)));}return gs;};
 const crabGeo=()=>{const gs=[];gs.push(pc(new THREE.SphereGeometry(.6,12,8).scale(1,.58,.8).translate(0,.5,0),C(HZ)));gs.push(pc(new THREE.SphereGeometry(.45,10,6,0,Math.PI*2,0,Math.PI/2).scale(1,.5,.8).translate(0,.62,0),C(0xfff0d0,1.7)));
  for(const x of[-1,1]){gs.push(pc(new THREE.SphereGeometry(.3,8,6).scale(1,.7,1.2).translate(x*.78,.55,-.5),C(HZ,1.1)));gs.push(pc(new THREE.BoxGeometry(.5,.08,.2).translate(x*.78,.66,-.78),C(0xfff0d0,1.8)));
   gs.push(pc(new THREE.CylinderGeometry(.03,.03,.3,5).translate(x*.2,.9,-.4),C(0x303040)));gs.push(pc(new THREE.SphereGeometry(.09,8,6).translate(x*.2,1.08,-.4),C(0x35f2ff,3)));
   for(let i=0;i<3;i++)gs.push(pc(new THREE.BoxGeometry(.5,.06,.07).rotateY(x*(.5-i*.5)).translate(x*.78,.3,.1+i*.28),C(HZD)));}
  gs.push(pc(new THREE.SphereGeometry(.12,8,6).translate(0,.9,.1),C(0xffd23a,3.2)));return gs;};
 const rotorGeo=(R)=>{const gs=[];gs.push(pc(new THREE.CylinderGeometry(.42,.5,.7,12).translate(0,.35,0),C(HZD)));gs.push(pc(new THREE.SphereGeometry(.26,8,6).translate(0,.85,0),C(0xffd23a,3.2)));
  const n=Math.round(R*2/.5);for(let i=0;i<n;i++){const x=-R+(i+.5)*(R*2/n);gs.push(pc(new THREE.BoxGeometry(R*2/n*.98,.26,.34).translate(x,.55,0),C(i%2?HZ:0xfff0d0,i%2?2:1.7)));}
  for(const x of[-R,R])gs.push(pc(new THREE.SphereGeometry(.22,8,6).translate(x,.55,0),C(0xffd23a,3.2)));return gs;};
 const swingPost=(side)=>{const ex=-side*(W/2-.35);return [pc(new THREE.CylinderGeometry(.34,.4,1.5,10).translate(ex,.75,0),C(0x303040)),pc(new THREE.CylinderGeometry(.38,.38,.14,10).translate(ex,1.5,0),C(0xffd23a,2.4)),pc(new THREE.SphereGeometry(.17,8,6).translate(ex,1.72,0),C(0xff3a3a,3.2))];};
 const swingArm=(side,len)=>{const gs=[];const n=Math.round(len/.8);for(let i=0;i<n;i++)gs.push(pc(new THREE.BoxGeometry(len/n,.26,.2).translate(side*(len/n/2+i*len/n),0,0),C(i%2?0xfff0d0:HZ,i%2?1.7:2.2)));
  gs.push(pc(new THREE.SphereGeometry(.15,8,6).translate(side*len,0,0),C(0xffd23a,3)));return gs;};
 const fsignGeo=(tone)=>{const col=tone==='risk'?0xff8a1a:0x4aff8a,gs=[];gs.push(pc(new THREE.BoxGeometry(5,.03,.9).translate(0,.03,0),C(col,2)));for(const x of[-2.5,2.5]){gs.push(pc(new THREE.CylinderGeometry(.1,.12,2.6,8).translate(x,1.3,0),C(0x303040)));gs.push(pc(new THREE.SphereGeometry(.24,10,8).translate(x,2.75,0),C(col,3.4)));}
  for(const x of[-1.1,0,1.1])gs.push(pc(new THREE.ConeGeometry(.42,.8,3).rotateX(-Math.PI/2).rotateZ(Math.PI).translate(x,.06,0).scale(1,.12,1),C(0xffffff,tone==='risk'?2.4:1.8)));return gs;};
 const fpadGeo=()=>{const gs=[];gs.push(pc(new THREE.BoxGeometry(2.8,.03,2.6).translate(0,.03,0),C(0xff7a1a,1.9)));for(const z of[-.55,.45])for(const sx of[-1,1])gs.push(pc(new THREE.BoxGeometry(1.5,.04,.3).rotateY(sx*.7).translate(sx*.62,.06,z),C(0xfff0d0,2.6)));return gs;};
 let slot=0;const add=(gs,obj)=>{const id=slot++;for(const g of gs)opParts.push({g,slot:id});obj.slot=id;return obj;};
 const P0=(G,kind,o)=>{const P=add(o.geo,Object.assign({kind,g:G,s:G.s,x:G.x,y:0,r:.5,alive:1,t:0,vx:0,vy:0,vz:0,rot:0,yaw:0,roll:0,pitch:0,sc:1},o));delete P.geo;pieces.push(P);G.pieces.push(P);return P;};
 for(const [gi,d] of LAYOUT.entries()){const G={...d,gi,hw:HW[d.kind]||2,pieces:[],ph:gi*1.37,on:1,pri:(gi*0.6180339887)%1,bs:d.s,bx:d.x,nomir:NOMIR.includes(d.kind)};groups.push(G);const f={};const side=d.x>=0?1:-1;
  if(d.kind==='barrel'||d.kind==='crate'||d.kind==='trap'||d.kind==='buoy'){const spots=d.kind==='crate'||d.kind==='trap'?[[-.55,0],[.55,0],[0,.05,1]]:[[-.55,.6],[.55,.6],[0,-.5]];
   for(const [dx,ds,up] of spots)P0(G,d.kind,{geo:d.kind==='barrel'?barrelGeo():d.kind==='buoy'?buoyGeo():d.kind==='trap'?trapGeo():crateGeo(),s:d.s+ds,x:d.x+dx,y:up?(d.kind==='trap'?.9:1):0,y0:up?(d.kind==='trap'?.9:1):0,r:d.kind==='crate'||d.kind==='trap'?.55:.5,knock:1,yaw:(gi*1.7+dx)%1,ph:dx*3});}
  else if(d.kind==='cones'){for(const dx of[-1.35,-.45,.45,1.35])P0(G,'cones',{geo:coneGeo(),x:d.x+dx,s:d.s+Math.abs(dx)*.5,r:.35,knock:1,ph:dx*4});}
  else if(d.kind==='crane'){const len=6.2;P0(G,'crane',{geo:craneGeo(len),r:.5,len,yaw:.5,stat:1});}
  else if(d.kind==='fan'){P0(G,'fanbase',{geo:fanBase(),r:.6,stat:1});P0(G,'fan',{geo:fanRotor(1.9),r:2.0,rot:gi});}
  else if(d.kind==='wheel'){P0(G,'wheel',{geo:wheelGeo(),r:1.8,rot:gi});}
  else if(d.kind==='goo'){P0(G,'goo',{geo:gooGeo(),r:1.7});}
  else if(d.kind==='car'){P0(G,'car',{geo:carGeo(),r:1.2,len:d.len||80,v:9});}
  else if(d.kind==='sign'){P0(G,'post',{geo:signPost(side,d.x),x:0,stat:1,deco:1});P0(G,'sign',{geo:signPanel(GCOL.sign,4.2),y:5.8,len:4.2,amp:.55,w:1.2,r:1.2});}
  else if(d.kind==='net'){P0(G,'post',{geo:craneTower(side,9.6,d.x),x:0,stat:1,deco:1});P0(G,'net',{geo:netGeo(7.4),y:9.6,len:7.4,amp:.3,w:.95,r:1.1});}
  else if(d.kind==='bollards'){for(const dx of[-1.2,0,1.2])P0(G,'bollards',{geo:bollardGeo(),x:d.x+dx,r:.3,h:0});}
  else if(d.kind==='sweeper'){P0(G,'sweeper',{geo:sweeperGeo(),r:.95,x0:d.x});}
  else if(d.kind==='pixel'){[[-1.15,0xffd23a],[0,0xff4fd8],[1.15,0x7dff6a]].forEach(([dx,c],i)=>P0(G,'pixel',{geo:pixelGeo(c),x:d.x+dx,r:.55,ph:i*1.05}));}
  else if(d.kind==='gate'){P0(G,'post',{geo:gatePost(side),x:0,stat:1,deco:1});P0(G,'gate',{geo:gateArm(side,5.6),x:side*(W/2-.35),y:1.35,side,a:0});G.x=side*(W/2-.35-2.8);}
  else if(d.kind==='fsign'){P0(G,'fsign',{geo:fsignGeo(d.tone),stat:1,deco:1});}
  else if(d.kind==='fpad'){for(const ds of[0,13,26])P0(G,'fpad',{geo:fpadGeo(),s:d.s+ds,stat:1,deco:1});}
  else if(d.kind==='barrier'){P0(G,'barrier',{geo:barrierGeo(),r:.5,stat:1,yaw:0});}
  else if(d.kind==='container'){P0(G,'container',{geo:containerGeo(),r:1.3,stat:1});}
  else if(d.kind==='bumper'){[[-1.2,0],[0,.9],[1.2,0]].forEach(([dx,ds],i)=>P0(G,'bumper',{geo:bumperGeo(),x:d.x+dx,s:d.s+ds,r:.62,stat:1}));}
  else if(d.kind==='rollbot'||d.kind==='dockcart'||d.kind==='paddle'){P0(G,d.kind,{geo:d.kind==='rollbot'?rollbotGeo():d.kind==='dockcart'?dockcartGeo():paddleGeo(),r:d.kind==='paddle'?1.1:.95,x0:d.x,amp:1.7});}
  else if(d.kind==='ball'){for(const [dx,ds,ph] of[[-.7,.6,0],[.7,.6,1],[0,-.5,2]])P0(G,'ball',{geo:ballGeo(.55,ph),s:d.s+ds,x:d.x+dx,r:.55,knock:1,y0:0,yaw:(gi*1.7+dx)%1,ph:dx*3});}
  else if(d.kind==='castle'){for(const [dx,ds] of[[-.6,0],[.6,0]])P0(G,'castle',{geo:castleGeo(),s:d.s+ds,x:d.x+dx,r:.9,knock:1,y0:0,yaw:dx,ph:dx*3});}
  else if(d.kind==='board'){[[-1.1,0x35f2ff,0xffd23a,.12],[0,0xff4f7a,0xffffff,-.1],[1.1,0x7dff6a,0xff4fd8,.08]].forEach(([dx,c1,c2,t])=>P0(G,'board',{geo:boardGeo(c1,c2,t),x:d.x+dx,r:.55,stat:1,yaw:0}));}
  else if(d.kind==='umbrella'){P0(G,'umbrella',{geo:umbrellaGeo(),r:.8,stat:1,yaw:gi});}
  else if(d.kind==='wave'){P0(G,'wave',{geo:waveGeo(),r:1.8,x0:d.x,amp:1.3});}
  else if(d.kind==='slidebar'){P0(G,'slidebar',{geo:slideGeo(),r:.5,x0:d.x,amp:1.95});}
  else if(d.kind==='drone'){P0(G,'drone',{geo:droneGeo(),r:.95,x0:d.x,amp:2.4,s0:d.s});}
  else if(d.kind==='crab'){P0(G,'crab',{geo:crabGeo(),r:.85,x0:d.x,amp:2.4});}
  else if(d.kind==='rollball'){P0(G,'rollball',{geo:ballGeo(.95,G.gi),r:.95,x0:d.x,amp:2.3});}
  else if(d.kind==='rotor'){P0(G,'rotor',{geo:rotorGeo(2.5),r:2.5,R:2.5,hx:d.x});}
  else if(d.kind==='swinggate'){const sd=d.x>=0?1:-1;P0(G,'post',{geo:swingPost(sd),x:0,stat:1,deco:1});P0(G,'swing',{geo:swingArm(sd,4.6),x:sd*(W/2-.35),y:1.2,side:sd,len:4.6,r:.5,a:0});G.x=sd*(W/2-.35-2.3);}
  if(NEWK.includes(d.kind))P0(G,'pad',{geo:warnPad(G.hw),s:d.s-9,x:d.x,stat:1,deco:1});
  frameAt(G.s,G.x,f);G.p=f.p;G.ang=f.ang;}
 // debris planks for breaking crates / traps (shared pool)
 const debris=[];for(let i=0;i<4;i++){const P=add([pc(new THREE.BoxGeometry(.7,.08,.2),C(0xc8803a))],{kind:'debris',t:9,p:new THREE.Vector3(),v:new THREE.Vector3(),rot:0});debris.push(P);}
 const NSL=Math.max(1,slot);
 const ringT=tex(cv(128,128,(g)=>{const r=g.createRadialGradient(64,64,20,64,64,62);r.addColorStop(0,'rgba(255,255,255,0)');r.addColorStop(.7,'rgba(255,255,255,.25)');r.addColorStop(.9,'rgba(255,255,255,1)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
  g.fillStyle='rgba(255,255,255,.55)';for(let i=0;i<8;i++){g.save();g.translate(64,64);g.rotate(i/8*Math.PI*2);g.beginPath();g.moveTo(-8,-40);g.lineTo(0,-30);g.lineTo(8,-40);g.lineTo(8,-34);g.lineTo(0,-24);g.lineTo(-8,-34);g.fill();g.restore();}}),false,false);
 for(const G of groups){if(G.dec)continue;const rx=Math.max(2.2,G.hw+.6),rz=G.kind==='crane'?3.2:G.kind==='car'?3:2.3;const g=new THREE.PlaneGeometry(rx*2,rz*2).rotateX(-Math.PI/2).translate(0,.03,0);glowParts.push({g:kit.paintCol(g,C(GCOL[G.kind]||0xffffff,1)),slot:G.gi});}
 if(!glowParts.length)glowParts.push({g:kit.paintCol(new THREE.PlaneGeometry(.01,.01),C(0)),slot:0});
 const op=palMesh(S,opParts.length?opParts:[{g:pc(new THREE.BoxGeometry(.01,.01,.01),C(0)),slot:0}],new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.15,envMapIntensity:1}),NSL);
 const gl=palMesh(S,glowParts,new THREE.MeshBasicMaterial({map:ringT,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),Math.max(1,groups.length),'rgb');gl.mesh.renderOrder=3;
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(0,0,0,'YXZ'),one=new THREE.Vector3(1,1,1),v=new THREE.Vector3(),sc=new THREE.Vector3();
 const fr={};
 function pieceMatrix(P){if(!P.g.on){hideSlot(op.M,P.slot);return;}frameAt(P.s,P.x,fr);v.copy(fr.p);let yaw=fr.ang+P.yaw,pitch=P.pitch,roll=P.roll,s=P.sc;
  if(P.knock){if(P.alive<1){const k=P.t;   // knocked: fly + tumble, then gone; pop back later
    if(k<.9){const c=Math.cos(fr.ang),sn=Math.sin(fr.ang);v.x+=P.vx*k*c+P.vz*k*sn;v.z+=-P.vx*k*sn+P.vz*k*c;v.y=fr.p.y+Math.max(0,P.y0+P.vy*k-5*k*k);roll=P.rot*k*6;pitch=k*3;s=P.kind==='crate'||P.kind==='trap'||P.kind==='castle'?Math.max(0,1-k*1.4):1;}
    else if(P.t<P.back){hideSlot(op.M,P.slot);return;}
    else{s=Math.min(1,(P.t-P.back)*3);v.y+=P.y;}}   // grow back in
   else v.y+=P.y;}
  else v.y+=P.y;
  e.set(pitch,yaw,roll);q.setFromEuler(e);m.compose(v,q,sc.setScalar(s));setSlotM(op.M,P.slot,m);}
 function reset(){T=0;TM=0;for(const P of pieces){P.alive=1;P.t=0;if(P.kind==='car')P.s=P.g.s;}for(const D of debris){D.t=9;hideSlot(op.M,D.slot);}animate(0);}
 let T=0,TM=0;   // TM = hazard clock (T x the difficulty's mover speed): movers use it, so Easy ones are slower and Hard ones faster
 // per-kind motion (deterministic in T so every racer sees the same thing)
 function animate(dt){const D=getDiff();TM+=dt*D.moveSpd*surge;const mdt=dt*D.moveSpd*surge;for(const P of pieces){const G=P.g;switch(P.kind){
   case 'fan':P.rot+=mdt*4.2;P.yaw=P.rot;break;
   case 'wheel':P.rot+=mdt*2.6;P.yaw=P.rot;break;
   case 'buoy':if(P.alive>=1){P.y=.06*Math.sin(T*2.2+P.ph);P.roll=.12*Math.sin(T*1.7+P.ph);}break;
   case 'cones':if(P.alive>=1)P.roll=.05*Math.sin(T*3+P.ph);break;
   case 'goo':P.sc=1+.04*Math.sin(T*3+G.ph);break;
   case 'sign':case 'net':{const th=P.amp*Math.sin(TM*(P.kind==='net'?1.7:2.4)+G.ph);P.roll=-th;P.cx=P.x+P.len*Math.sin(th);break;}   // pendulum across its band
   case 'car':{P.s+=P.v*mdt;let d=P.s-G.s;if(d>P.len){P.s=G.s;d=0;}P.sc=Math.min(1,d/3,(P.len-d)/3+.001);P.y=.15+.08*Math.sin(T*3+G.ph);P.roll=.04*Math.sin(T*2);G.cs=P.s;break;}
   case 'bollards':{const c=(TM+G.ph)%4.8;P.h=c<2.2?0:c<2.6?(c-2.2)/.4:c<4.4?1:1-(c-4.4)/.4;P.y=-1.2*(1-P.h)+.02;break;}   // caps stay peeking out (glowing) while down
   case 'sweeper':P.x=P.x0+2*Math.sin(TM*.55+G.ph);P.yaw=Math.cos(TM*.55+G.ph)>0?-.4:.4;P.y=.03*Math.abs(Math.sin(T*9));break;
   case 'pixel':{const u=Math.abs(Math.sin(TM*1.7+P.ph+G.ph));P.y=u*2.1;P.yaw=TM*.8+P.ph;break;}
   case 'rollbot':case 'dockcart':case 'paddle':{const w=TM*1.4+G.ph;P.x=P.x0+P.amp*Math.sin(w);P.yaw=Math.cos(w)>0?-.5:.5;P.roll=P.kind==='paddle'?.12*Math.cos(w):0;P.y=P.kind==='rollbot'?.03*Math.abs(Math.sin(TM*9)):0;break;}
   case 'wave':{const w=TM*.9+G.ph;P.x=P.x0+P.amp*Math.sin(w);P.sc=1+.1*Math.sin(TM*3);P.y=.04*Math.sin(TM*4);break;}
   case 'slidebar':P.x=P.x0+P.amp*Math.sin(TM*1.5+G.ph);break;
   case 'drone':{const w=TM*1.3+G.ph;P.x=P.x0+P.amp*Math.sin(w);P.s=P.s0+2.2*Math.sin(2*w);P.y=.45+.08*Math.sin(T*5+G.ph);P.yaw=Math.cos(w)>0?-.4:.4;P.roll=.1*Math.cos(w);break;}
   case 'crab':{const w=TM*1.6+G.ph;P.x=P.x0+P.amp*Math.sin(w);P.roll=.07*Math.sin(TM*14);P.y=.03*Math.abs(Math.sin(TM*11));P.yaw=.25*Math.sin(TM*7);break;}
   case 'rollball':{const w=TM*1.2+G.ph;P.x=P.x0+P.amp*Math.sin(w);P.roll=-(P.x-P.x0)/P.r;break;}
   case 'rotor':P.yaw=TM*2.4*((G.gi+(G.vlap|0))%2?1:-1)+G.ph;P.a=P.yaw;P.x=P.hx;break;
   case 'swing':{P.a=(.5+.5*Math.sin(TM*1.1+G.ph))*1.35;P.yaw=P.side*P.a;break;}
   case 'gate':{const c=(TM+G.ph)%5;const up=c<2.2?0:c<2.7?(c-2.2)/.5:c<4.5?1:1-(c-4.5)/.5;P.a=up*1.25;P.roll=P.side*P.a;break;}}
  if(P.kind==='debris')continue;if(P.alive<1&&P.knock){P.t+=dt;if(P.t>=P.back+.35){P.alive=1;P.t=0;}}
  if(dt===0||!P.stat||P.alive<1)pieceMatrix(P);}}
 // ---------- M6B layout variation: per race seed + lap number. A group is re-laid when the hero has just passed it (so nothing pops in view) ----------
 let seed=1,surge=1;const smooth01=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
 const riskSide=(i,k)=>hash(seed,i,k,11)<.5?-1:1;   // which branch of fork i is the risky one on lap k
 const regs=groups.filter(G=>!G.dec&&!G.fk&&G.kind!=='car').sort((a,b)=>a.bs-b.bs);
 const fixed=groups.filter(G=>!G.dec&&!G.fk&&G.nomir);
 regs.forEach((G,i)=>{G.nearFixed=!G.nomir&&fixed.some(F=>{let d=Math.abs(F.bs-G.bs);d=Math.min(d,L-d);return d<70;});const p=regs[(i+regs.length-1)%regs.length],n=regs[(i+1)%regs.length];let gp=G.bs-p.bs,gn=n.bs-G.bs;if(gp<=0)gp+=L;if(gn<=0)gn+=L;const gap=Math.min(gp,gn);
  G.iso=gap>=60;let room=Math.min(12,Math.max(0,(gap-30)/2));for(const [a,b] of FORKS)room=Math.min(room,Math.max(0,Math.min(Math.abs(G.bs-(a-45)),Math.abs(G.bs-(b+12)))-2));G.jit=room;});
 function shiftGroup(G,ds,dx){if(!ds&&!dx)return;for(const P of G.pieces){P.s+=ds;P.x+=dx;if(P.s0!==undefined)P.s0+=ds;if(P.x0!==undefined)P.x0+=dx;if(P.hx!==undefined)P.hx+=dx;}G.s+=ds;G.x+=dx;frameAt(G.s,G.x,G);}
 function applyLap(G,k){const D=getDiff();G.vlap=k;
  if(G.fk){const isRisk=G.fk.side===riskSide(G.fk.i,k);G.on=G.role==='risk'?(isRisk&&(G.lv===undefined||D.lv>=G.lv)?1:0):(isRisk?0:1);}
  else{const mir=G.nomir||G.nearFixed?false:(G.iso?hash(seed,G.gi,k,7):hash(seed,k,99))<.5;   // neighbours that are close together flip together, so the clear lane stays on one side
   shiftGroup(G,G.nomir&&G.kind==='car'?0:G.bs+(hash(seed,G.gi,k,21)*2-1)*G.jit-G.s,G.bx*(mir?-1:1)-G.x);
   G.on=G.lv!==undefined?(D.lv+(k>=2?1:0)>=G.lv?1:0):(((G.pri+hash(seed,k,5))%1)<D.density||D.density>=1?1:0);   // movers: lap 2 adds the next level's movers; other sets: a different subset each lap
   G.ph=hash(seed,G.gi,k,3)*6.283;}   // movers start at a new phase every lap
  for(const P of G.pieces){P.alive=1;P.t=0;pieceMatrix(P);}}
 function applyDiff(){for(const G of groups)applyLap(G,1);animate(0);}
 const MW=.75;let fkR={i:0,risk:1,a:0,b:0,key:0};
 // fork i whose window (minus lead m before its nose) holds lap position s (abs = distance driven, to know the lap); null when none
 function forkAt(sAbs,lead=0,ref=sAbs){const ks=((sAbs%L)+L)%L;for(let i=0;i<FORKS.length;i++){const [a,b]=FORKS[i];if(ks>=a-lead&&ks<=b){const lap=Math.max(1,Math.floor(ref/L)+1);fkR.i=i;fkR.risk=riskSide(i,lap);fkR.a=a;fkR.b=b;fkR.key=lap*100+i;return fkR;}}return null;}
 // boost pads of the risky branch: true when (s,x) is on one of the active pads
 function padAt(s,x){const ks=((s%L)+L)%L;for(const G of groups){if(G.kind!=='fpad'||!G.on)continue;for(const P of G.pieces){let d=ks-P.s;if(d>L/2)d-=L;if(d<-L/2)d+=L;if(d>-1.8&&d<1.8&&Math.abs(x-G.x)<2.2)return true;}}return false;}
 // the median island: karts cannot drive over it (they stay on the branch they entered); airborne karts hop over
 function median(k){if(!FORKS.length)return;const ks=((k.s%L)+L)%L;let fi=-1;for(let i=0;i<FORKS.length;i++)if(ks>=FORKS[i][0]&&ks<=FORKS[i][1]){fi=i;break;}
  if(fi<0){k.fkI=-1;return;}if(k.air>0&&k.y>.7)return;const [a,b]=FORKS[fi],lim=(MW+.62)*smooth01(Math.min((ks-a)/12,(b-ks)/12));
  if(k.fkI!==fi){k.fkI=fi;k.fkSide=k.x>=0?1:-1;}
  if(k.x*k.fkSide<lim){k.x=k.fkSide*lim;if(k.isPlayer)k.yaw*=.6;else k.xs=k.x;}}
 let onWarn=null;
 function update(dt,time,heroS=0,heroV=20){T+=dt;surge=heroS>=2*L?1.12:1;   // last lap(s): hazard surge, movers run 12% faster
  for(const G of groups){const k=Math.min(9,Math.max(1,Math.floor((heroS-G.bs+20)/L)+1));if(k!==G.vlap)applyLap(G,k);}
  animate(dt);
  for(const D of debris){if(D.t>1.2){hideSlot(op.M,D.slot);continue;}D.t+=dt;D.v.y-=12*dt;D.p.addScaledVector(D.v,dt);if(D.p.y<D.y0+.04){D.p.y=D.y0+.04;D.v.multiplyScalar(.5);D.v.y=Math.abs(D.v.y)*.3;}D.rot+=dt*8;
   e.set(D.rot,D.rot*.7,0);q.setFromEuler(e);m.compose(D.p,q,sc.setScalar(Math.max(0,1-Math.max(0,D.t-.8)*2.5)));setSlotM(op.M,D.slot,m);}
  // telegraph: brightens as the hero gets within ~1.5 s, pulses faster when close (bollards/gates also blink while closed/rising)
  const hs=((heroS%L)+L)%L,lead=Math.max(12,heroV*1.5);
  for(const G of groups){if(G.dec)continue;if(!G.on){setSlotM(gl.M,G.gi,m.makeScale(0,0,0),0);continue;}
   if(MOVERS.includes(G.kind)){let w=G.s-hs;if(w<-L/2)w+=L;if(w>L/2)w-=L;if(w>0&&w<Math.max(60,heroV*2)&&!G.warned){G.warned=1;onWarn&&onWarn(G);}else if(w<-15)G.warned=0;}   // heads-up beep once per approach
   const gs=G.kind==='car'?(G.cs??G.s):G.s;let d=gs-hs;if(d<-L/2)d+=L;if(d>L/2)d-=L;const near=d>-3&&d<lead*1.6?Math.max(0,1-Math.max(0,d-lead)/(lead*.6)):0;
   let a=.55+near*(1.1+.7*Math.sin(T*(6+near*8)));if(G.kind==='car')a*=G.pieces[0].sc;
   if(G.kind==='car'){frameAt(gs,G.x,fr);v.copy(fr.p);e.set(0,fr.ang,0);}else{v.copy(G.p);e.set(0,G.ang+(G.kind==='crane'?.5:0),0);}q.setFromEuler(e);m.compose(v,q,one);setSlotM(gl.M,G.gi,m,a);}}
 const segD=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l>0?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l)):0;return Math.hypot(px-ax-t*dx,py-ay-t*dy);};   // point-to-segment distance
 function knock(P,k){if(P.alive<1||!P.knock)return;P.alive=0;P.t=0;P.back=7;const side=Math.sign(P.x-k.x)||1;P.vx=side*(2.5+Math.random()*1.5);P.vz=-(k.v||10)*.35;P.vy=3+Math.random()*1.5;P.rot=side;
  if(P.kind==='crate'||P.kind==='trap'){frameAt(P.s,P.x,fr);let n=0;for(const D of debris){if(D.t<1.2||n>=2)continue;n++;D.t=0;D.y0=fr.p.y;D.p.copy(fr.p);D.p.y+=.6;D.v.set((Math.random()-.5)*6,3+Math.random()*3,(Math.random()-.5)*6);D.rot=Math.random()*3;}}}
 const sideOf=(k,x)=>Math.sign(k.x-x)||(k.x>0?-1:1);
 const nudge=(k,dx)=>{k.x+=dx;if(!k.isPlayer)k.xs=k.x;};
 // k: kart state (see racers.js / main.js). Effects are gentle; per-kart cooldown so one hazard = one bump.
 function collide(k){median(k);if(k.obCd>0)return null;const ks=((k.s%L)+L)%L;
  for(const P of pieces){if(!P.alive||P.deco||P.kind==='debris'||!P.g.on)continue;let ds=ks-P.s;if(ds>L/2)ds-=L;if(ds<-L/2)ds+=L;if(ds>6||ds<-6)continue;
   const dx=k.x-P.x;let hit=false,hx=P.x;
   switch(P.kind){
    case 'barrier':if(Math.abs(ds)<.95&&Math.abs(dx)<2.75)hit=true;break;
    case 'slidebar':if(Math.abs(ds)<.95&&Math.abs(dx)<1.95)hit=true;break;
    case 'rotor':{const cx=Math.cos(P.a),sx=Math.sin(P.a);const ex=-cx*P.R,es=sx*P.R;hit=segD(dx,ds,-ex,-es,ex,es)<.95;hx=P.x;break;}   // spinning bar through the hub
    case 'swing':{const ex=-P.side*P.len*Math.cos(P.a),es=P.len*Math.sin(P.a);hit=segD(k.x-P.x,ds,0,0,ex,es)<.95;hx=P.x-P.side*P.len*.5;break;}
    case 'container':if(Math.abs(ds)<2.0&&Math.abs(dx)<1.85)hit=true;break;
    case 'crane':if(Math.abs(ds)<3&&Math.abs(dx)<=P.len/2*.88+.7&&Math.abs(ds-dx*.545)<=1.0)hit=true;break;
    case 'sign':case 'net':hx=P.cx??P.x;if(Math.abs(ds)<.95&&Math.abs(k.x-hx)<P.w+.55)hit=true;break;
    case 'car':if(Math.abs(ds)<1.9&&Math.abs(dx)<1.25&&P.sc>.5)hit=true;break;
    case 'goo':if(Math.abs(ds)<1.6&&Math.abs(dx)<1.7)hit=true;break;
    case 'wave':if(Math.abs(ds)<1.2&&Math.abs(dx)<2.2)hit=true;break;
    case 'bollards':if(P.h>.45&&dx*dx+ds*ds<(P.r+.6)**2)hit=true;break;
    case 'pixel':if(P.y<.85&&dx*dx+ds*ds<(P.r+.6)**2)hit=true;break;
    case 'gate':{const lo=Math.min(P.x,P.x-P.side*5.6),hi=Math.max(P.x,P.x-P.side*5.6);if(P.a<.5&&Math.abs(ds)<.8&&k.x>lo-.5&&k.x<hi+.5){hit=true;hx=P.x-P.side*2.8;}break;}
    default:{const R=P.r+.65;if(dx*dx+ds*ds<R*R)hit=true;}}
   if(!hit)continue;
   if(k.air>0&&k.y>(P.kind==='fan'||P.kind==='goo'||P.kind==='wheel'?.4:P.kind==='car'||P.kind==='sign'||P.kind==='net'?1.6:.8))continue;   // hopped over it
   k.obCd=.9;
   const kind=P.kind==='fanbase'?'fan':P.kind;
   if(k.rocket>0){knock(P,k);return 'smash';}
   const D=getDiff(),pen=f=>{if(D.slow>0)k.slow=Math.max(k.slow||0,D.slow);};   // M5 hit penalty: wobble always; Medium +0.5 s slow, Hard +1 s, Easy none
   if(kind==='wave'){k.wiggle=Math.max(k.wiggle,.7);k.v*=.95;pen();return 'wave';}   // foam wave: splash + wobble, never a spin, never uses the shield
   if(kind==='goo'){k.wiggle=Math.max(k.wiggle,.7);k.v*=.96;return 'goo';}   // goo never spins and never uses up the shield
   if(k.shield>0){k.shield=0;knock(P,k);return 'blocked';}
   const side=sideOf(k,hx);
   if(kind==='fan'||kind==='wheel'){let r;if(D.cheer&&k.shield<=0&&k.rocket<=0){k.wiggle=Math.max(k.wiggle,.6);r='wiggle';}else r=hitKart(k,'fan');nudge(k,side*.4);return r==='spin'?kind:'wiggle';}
   if(P.knock){knock(P,k);if(kind==='crate'||kind==='trap'||kind==='castle'){pen();k.wiggle=Math.max(k.wiggle,.45);return kind;}
    if(kind==='cones'){pen();k.wiggle=Math.max(k.wiggle,.35);return 'cones';}
    if(kind==='buoy'||kind==='ball'){pen();k.bounce=.3;k.wiggle=Math.max(k.wiggle,.4);nudge(k,side*.5);return 'buoy';}
    pen();k.bounce=.35;k.wiggle=Math.max(k.wiggle,.5);nudge(k,side*.5);return 'barrel';}
   pen();k.bounce=.35;k.wiggle=Math.max(k.wiggle,.5);nudge(k,side*.7);return kind;}
  return null;}
 // AI helper: next hazard within `look` m ahead of s whose band covers x (+margin) -> {id, x: a free target}
 function ahead(s,x,look,margin){const ks=((s%L)+L)%L;for(const G of groups){if(!G.on||G.dec)continue;let d=(G.kind==='car'?(G.cs??G.s):G.s)-ks;if(d<-L/2)d+=L;if(d<-1||d>look)continue;
   if(G.kind==='car'&&G.pieces[0].sc<.3)continue;
   const lo=G.x-G.hw-margin-.7,hi=G.x+G.hw+margin+.7;if(x<lo||x>hi)continue;
   const lim=W/2-1;const tx=(lo+lim>lim-hi)?Math.max(-lim,lo-.2):Math.min(lim,hi+.2);return {id:G.gi,x:tx};}
  return null;}
 // blocked lateral intervals of a group right now (used by the safe-lane checks): [[lo,hi],...]
 function bands(G){const out=[];for(const P of G.pieces){if(P.deco||!P.alive)continue;
   switch(P.kind){case 'slidebar':out.push([P.x-1.4,P.x+1.4]);break;case 'drone':case 'crab':case 'rollball':out.push([P.x-P.r,P.x+P.r]);break;
    case 'rotor':{const e=Math.abs(Math.cos(P.a))*P.R+.3;out.push([P.x-e,P.x+e]);break;}
    case 'swing':{const t=P.x-P.side*P.len*Math.cos(P.a);out.push([Math.min(P.x,t)-.2,Math.max(P.x,t)+.2]);break;}
    default:out.push([P.x-Math.max(P.r,.4)-.2,P.x+Math.max(P.r,.4)+.2]);}}
  return out.length?out:[[G.x-G.hw,G.x+G.hw]];}
 reset();for(const P of pieces)pieceMatrix(P);
 return {reset,update,collide,ahead,applyDiff,groups,pieces,bands,forkAt,padAt,forks:FORKS,riskOf:(i,sAbs)=>riskSide(i,Math.max(1,Math.floor(sAbs/L)+1)),setSeed(v){seed=v|0;},setTM(v){TM=v;animate(0);},set onWarn(f){onWarn=f;},meshes:[op.mesh,gl.mesh],slots:NSL};}
