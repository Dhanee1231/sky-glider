// Neon Rush rival racers (Track B, M3): six rivals, each with its own look (karts.js) and driving style.
import * as THREE from 'three';
import {sample,wrap,FEAT} from './world.js';
import {VMAX,VBOOST,ACC,LAPS,LEAD_GAP,LEAD_SLOW,LEAD_RAMP,TRAIL_GAP,TRAIL_HELP,AIR_G,HOP_G,HOP_VY} from './tuning.js';
import {RIVAL_LOOKS,buildRivals} from './karts.js';
// driving styles: pace (x VMAX), acc (x ACC), line (racing-line strength), xmax, sway (wide drifter lines), margin (obstacle gap),
//   miss (chance to clip an obstacle), itemDelay [min,max] s, late (final-lap surge), hunt (steers to item boxes), bumpy (leans on others)
export const STYLES={
 Pip:   {pace:.948,acc:1,  line:170,xmax:3.8,sway:0, margin:1.0,miss:.10,itemDelay:[2,5],  hunt:.3},
 Mochi: {pace:.923,acc:.95,line:120,xmax:3.0,sway:0, margin:1.7,miss:0,  itemDelay:[3,6],  hunt:.2, careful:1},
 Bolt:  {pace:.953, acc:1.08,line:230,xmax:4.4,sway:0, margin:.5, miss:.2, itemDelay:[1.5,4],hunt:.2, bumpy:1},
 Kiki:  {pace:.938,acc:1,  line:150,xmax:4.2,sway:1.6,margin:.9, miss:.12,itemDelay:[2,5],  hunt:.3, drifter:1},
 Coco:  {pace:.933,acc:1,  line:150,xmax:3.8,sway:0, margin:1.0,miss:.12,itemDelay:[.5,1.3],hunt:1},
 Shelly:{pace:.918,acc:.9, line:160,xmax:3.6,sway:0, margin:1.1,miss:.08,itemDelay:[2,5],  hunt:.3, late:1.075}};
// grid slots (s, x); the player starts at GRID_PLAYER
export const GRID=[[-5,2.4],[-5,-2.4],[-9,2.4],[-13,2.4],[-13,-2.4],[-17,0]];export const GRID_PLAYER=[-9,-2.4];
const ORDER=['Pip','Bolt','Kiki','Mochi','Coco','Shelly'];   // grid order (front to back)
const fresh=()=>({v:0,y:0,vy:0,air:0,boost:0,shield:0,rocket:0,hop:0,floaty:0,spin:0,wiggle:0,bounce:0,item:null,itemT:0,finished:false,time:0,obCd:0,drT:0,bumpCd:0,place:0,avoid:null,avoidX:0,huntX:null});
export function createRacers(kit){
 const looks=ORDER.map(n=>RIVAL_LOOKS.find(l=>l.name===n));const RV=buildRivals(kit,looks);
 const list=looks.map((lk,i)=>Object.assign({name:lk.name,css:lk.css,svg:lk.svg,idx:i,st:STYLES[lk.name],s:GRID[i][0],x:GRID[i][1],xs:GRID[i][1],mesh:new THREE.Object3D()},fresh()));
 let rnd=Math.random;
 function reset(){list.forEach((F,i)=>Object.assign(F,fresh(),{s:GRID[i][0],x:GRID[i][1],xs:GRID[i][1]}));}
 const o={},o2={};
 function update(dt,ctx){const P=ctx.player,L=ctx.L,obs=ctx.obstacles,items=ctx.items;
  for(const F of list){if(F.finished&&F.s>LAPS*L+60){F.v=Math.max(0,F.v-10*dt);F.s+=F.v*dt;continue;}
   const st=F.st;sample(F.s,o2);const gap=F.s-P.s;const lap=Math.floor(F.s/L);
   let vmax=VMAX*st.pace*(1+Math.sin(ctx.raceT*.37+F.idx*1.7)*.012);
   if(st.late)vmax*=lap>=LAPS-1?st.late:.985;
   if(!P.finished){if(gap>LEAD_GAP)vmax*=1-Math.min(LEAD_SLOW,(gap-LEAD_GAP)*LEAD_RAMP);else if(gap<-TRAIL_GAP)vmax*=1+Math.min(TRAIL_HELP,(-gap-TRAIL_GAP)*.002);}
   if(F.wiggle>0)vmax*=.93;if(F.spin>0)vmax*=.45;
   if(F.boost>0)vmax=Math.max(vmax,VBOOST*.95);if(F.rocket>0){vmax=VBOOST*1.02;F.rocket=Math.max(0,F.rocket-dt);F.boost=Math.max(F.boost,.2);}
   F.v+=(F.v<vmax?(F.boost>0?ACC*2.6:ACC*st.acc):-9)*dt;F.v=Math.max(0,F.v);F.s+=F.v*dt;
   // steering target: racing line (+ wide drifter sway), then dodge hazards, then maybe hunt an item box
   sample(F.s+16,o);let want=Math.max(-st.xmax,Math.min(st.xmax,-o.k*st.line));
   if(st.drifter)want=Math.max(-4.4,Math.min(4.4,want+Math.sign(-o.k||1)*Math.min(1,Math.abs(o.k)*60)*st.sway));
   if(F.huntX!=null&&F.rocket<=0)want=F.huntX;
   if(obs&&F.rocket<=0&&F.air<=0){const a=obs.ahead(F.s,want,28,st.margin);   // {id, x} free x for the next hazard, or null
    if(a){if(F.avoid!==a.id){F.avoid=a.id;F.avoidMiss=rnd()<st.miss;}if(!F.avoidMiss)want=a.x;}}
   if(items&&st.hunt&&F.item==null&&F.rocket<=0){const b=items.boxAhead(F.s,40,F.x);F.huntX=b&&rnd()<st.hunt*dt*6?b.x:(b?F.huntX:null);}else F.huntX=null;
   const rate=F.rocket>0?3:st.careful?1.4:2.1;F.xs+=(want-F.xs)*Math.min(1,dt*rate);F.x=F.xs;
   // drifter: long bends charge a mini boost
   if(st.drifter){if(Math.abs(o2.k)>.012&&F.air<=0){F.drT+=dt;}else{if(F.drT>1.2)F.boost=Math.max(F.boost,.7);F.drT=0;}}
   for(const b of FEAT.boost){const d=wrap(F.s)-b;if(d>-1.5&&d<1.5&&F.boost<.5)F.boost=1.2;}F.boost=Math.max(0,F.boost-dt);
   F.shield=Math.max(0,F.shield-dt);F.spin=Math.max(0,F.spin-dt);F.wiggle=Math.max(0,F.wiggle-dt);F.bounce=Math.max(0,F.bounce-dt);F.obCd=Math.max(0,F.obCd-dt);F.bumpCd=Math.max(0,F.bumpCd-dt);
   // ramp, Gravity Hop, air
   const r=FEAT.ramp,rs=wrap(F.s)-r.s0;
   if(F.hop>0&&F.air<=0){F.hop=0;F.air=1;F.vy=HOP_VY;F.floaty=1;}
   if(F.air<=0){if(rs>=0&&rs<r.len)F.y=r.h*rs/r.len;else if(rs>=r.len&&rs<r.len+1.5&&F.y>.3){F.air=1;F.vy=4.6+F.v*.1;}else F.y=0;}
   if(F.air>0){F.y+=F.vy*dt;F.vy-=(F.floaty?HOP_G:AIR_G)*dt;if(F.y<=0){F.y=0;F.air=0;F.floaty=0;}}
   // items: hold for a style-dependent moment, then use
   if(F.item!=null&&items){F.itemT-=dt;if(F.itemT<=0)items.use(F,ctx);}
   obs&&obs.collide(F);
   if(F.s>=LAPS*L&&!F.finished){F.finished=true;F.time=ctx.raceT;}}
  // kart-to-kart nudges (player included); a Rocket Star racer spins others (shield blocks, player rule in items.hit)
  const all=ctx.all;for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const A=all[i],B=all[j];const dS=A.s-B.s;if(dS>2||dS<-2)continue;const dX=A.x-B.x;
   if(Math.abs(dX)>1.35||A.air>0&&A.y>.5||B.air>0&&B.y>.5)continue;
   if(A.rocket>0&&B.rocket<=0){items&&items.hit(B,ctx,A);continue;}if(B.rocket>0&&A.rocket<=0){items&&items.hit(A,ctx,B);continue;}
   const push=(1.35-Math.abs(dX))*.5*(dX>=0?1:-1)*(A.st&&A.st.bumpy||B.st&&B.st.bumpy?1.2:1);
   if(A.isPlayer)A.x+=push;else A.xs+=push;if(B.isPlayer)B.x-=push;else B.xs-=push;
   if((A.isPlayer||B.isPlayer)&&ctx.onBump)ctx.onBump();}}
 // matrices for the palette meshes; hero gets its shield bubble / rocket star from the same draw call
 const e=new THREE.Euler(0,0,0,'YXZ'),q=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1),m=new THREE.Matrix4(),gm=new THREE.Matrix4(),v=new THREE.Vector3();
 function place(cam,P,hero,t){for(const F of list){sample(F.s,o2);kit.pointAt(F.s,F.x,v);v.y=F.y;F.mesh.position.copy(v);
   const yaw=Math.atan2(-o2.tx,-o2.tz)+(F.spin>0?F.spin*12:0)+(F.drT>.4?Math.sign(-o2.k)*.18:0);
   const pitch=F.air>0?-F.vy*.02:(F.y>0?-.15:0),roll=F.wiggle>0?Math.sin(F.wiggle*40)*.06:0;
   e.set(pitch,yaw,roll);q.setFromEuler(e);F.mesh.quaternion.copy(q);
   if(cam.position.distanceTo(v)<2.6){RV.setKart(F.idx,null);}
   else{m.compose(v,q,one);e.set(0,yaw,0);q.setFromEuler(e);v.y=.001;gm.compose(v,q,one);RV.setKart(F.idx,m,gm);}
   v.copy(F.mesh.position);v.y+=.62;RV.setShield(F.idx,v,F.shield>0?.75+.25*Math.sin(t*9+F.idx):0,cam.quaternion);
   v.y+=.35;RV.setStar(F.idx,v,F.rocket>0?1:0,cam.quaternion,t+F.idx);}
  const N=RV.N;v.copy(hero.position);v.y+=.62;RV.setShield(N,v,P.shield>0?(P.shield<1.5?.5+.5*Math.sin(t*20):.8+.2*Math.sin(t*9)):0,cam.quaternion);
  v.y+=.35;RV.setStar(N,v,P.rocket>0?1:0,cam.quaternion,t);}
 // standings: everyone sorted by distance (finished karts by finish time)
 const bySDesc=(a,b)=>b.s-a.s;const rows=list.map(r=>({name:r.name,css:r.css,svg:r.svg,s:0,me:false,r})),meRow={name:'You',s:0,me:true,r:null},all=[meRow,...rows],res={place:1,total:rows.length+1,order:all};
 function standings(P){meRow.s=P.finished?1e9-P.time:P.s;for(const w of rows)w.s=w.r.finished?1e9-w.r.time:w.r.s;
  all.sort(bySDesc);let place=1;for(let i=0;i<all.length;i++){if(all[i].me)place=i+1;else all[i].r.place=i+1;}res.place=place;return res;}
 return {list,RV,reset,update,place,standings,setRandom(f){rnd=f;}};}
