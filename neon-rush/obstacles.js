// Neon Rush obstacles (Track B, M3): kid-fair hazards. Every one is telegraphed by a pulsing glow ring that brightens
// ~1.5 s before you reach it, leaves a wide clear lane, and only bumps / wiggles / does a short funny spin (< 1 s).
// createObstacles(kit) -> { reset(), update(dt,time,heroS,heroV), collide(k), ahead(s,x,look,margin), list }
// collide(k) runs for the player AND every rival. Returns 'barrel'|'crate'|'crane'|'fan'|'blocked'|null.
import * as THREE from 'three';
import {palMesh,setSlotM,hideSlot} from './b_pal.js';
import {hitKart} from './items.js';
// layout (s = metres along the lap, x = lateral, + = right). Nothing in the first 130 m (start + boost pads), off the
// ramp (233-275) and the puddle splash zone (400-480), and away from the item-box rows (items.js ROWS).
export const LAYOUT=[
 {kind:'barrel',s:150,x:3.3},{kind:'crate',s:198,x:-3.3},{kind:'crane',s:318,x:3.2},{kind:'fan',s:352,x:-3.4},
 {kind:'barrel',s:498,x:-3.3},{kind:'crate',s:548,x:3.3},{kind:'fan',s:612,x:3.4}];
const HW={barrel:1.6,crate:1.5,crane:2.9,fan:2.2};   // half-width of the blocked band (lane stays >= 5.5 m clear)
export function createObstacles(kit){const {S,W,L,sample,wrap,cv,tex}=kit;const C=(h,m=1)=>new THREE.Color(h).multiplyScalar(m);
 const pc=(g,c)=>kit.paintCol(g,c);
 // pieces: each is one palette slot (moves on its own), circles in track space for collisions
 const pieces=[],groups=[];const opParts=[],glowParts=[];const o={};
 const frameAt=(s,x,out)=>{sample(s,o);(out.p||(out.p=new THREE.Vector3())).set(o.x-o.tz*x,0,o.z+o.tx*x);out.ang=Math.atan2(o.tx,o.tz);return out;};
 const barrelGeo=()=>{const gs=[];const body=new THREE.CylinderGeometry(.48,.48,1.15,14);gs.push(pc(body.translate(0,.575,0),C(0xff6a1a)));
  for(const y of[.35,.78])gs.push(pc(new THREE.CylinderGeometry(.49,.49,.15,14).translate(0,y,0),C(0xffffff,1.8)));
  gs.push(pc(new THREE.CylinderGeometry(.34,.34,.04,12).translate(0,1.17,0),C(0x2a1a10)));gs.push(pc(new THREE.SphereGeometry(.12,8,6).translate(0,1.27,0),C(0xffc02a,3)));return gs;};
 const crateGeo=()=>{const gs=[];gs.push(pc(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),C(0xc8803a)));
  for(const sx of[-1,1])for(const sz of[-1,1])gs.push(pc(new THREE.BoxGeometry(.12,1.02,.12).translate(sx*.46,.5,sz*.46),C(0x7a4a20)));
  for(const f of[-1,1]){gs.push(pc(new THREE.BoxGeometry(1.02,.1,.06).rotateZ(.78).translate(0,.5,f*.5),C(0x8a5426)));gs.push(pc(new THREE.BoxGeometry(.06,.1,1.02).rotateX(.78).translate(f*.5,.5,0),C(0x8a5426)));}
  gs.push(pc(new THREE.CircleGeometry(.22,5).translate(0,.55,.52),C(0xff4fc8,2.2)));gs.push(pc(new THREE.CircleGeometry(.22,5).rotateY(Math.PI).translate(0,.55,-.52),C(0xff4fc8,2.2)));return gs;};
 const craneGeo=(len)=>{const gs=[];const yel=C(0xffc02a),dk=C(0x2a2430);
  for(const [y,z] of[[.15,-.35],[.15,.35],[.85,0]])gs.push(pc(new THREE.BoxGeometry(len,.12,.12).translate(0,y,z),yel));
  for(let i=0;i<=len/.7;i++){const x=-len/2+i*.7;gs.push(pc(new THREE.BoxGeometry(.07,.9,.07).rotateX(.42).translate(x,.5,-.17),i%2?yel:dk));gs.push(pc(new THREE.BoxGeometry(.07,.9,.07).rotateX(-.42).translate(x+.35,.5,.17),i%2?dk:yel));}
  gs.push(pc(new THREE.BoxGeometry(.9,1.2,1.1).translate(len/2+.3,.6,0),yel));gs.push(pc(new THREE.CylinderGeometry(.15,.15,.25,10).rotateZ(Math.PI/2).translate(-len/2-.2,.3,0),dk));
  for(const x of[-len/2+.4,0,len/2-.3])gs.push(pc(new THREE.SphereGeometry(.12,8,6).translate(x,1.0,0),C(0xffa020,3.2)));return gs;};
 const fanBase=()=>[pc(new THREE.CylinderGeometry(.35,.55,.55,12).translate(0,.27,0),C(0x40485a)),pc(new THREE.CylinderGeometry(.2,.2,.3,10).translate(0,.65,0),C(0x8a96b0)),pc(new THREE.SphereGeometry(.14,8,6).translate(0,.85,0),C(0x35f2ff,2.4))];
 const fanRotor=(r)=>{const gs=[];for(let i=0;i<3;i++){const b=new THREE.BoxGeometry(r,.16,.5);b.rotateX(.35);b.translate(r/2,0,0);b.rotateY(i/3*Math.PI*2);gs.push(pc(b,C(i%2?0xff4fc8:0x8a5cff)));
   const tip=new THREE.SphereGeometry(.18,8,6);tip.translate(r,0,0);tip.rotateY(i/3*Math.PI*2);gs.push(pc(tip,C(0xfff27a,2.4)));}
  gs.push(pc(new THREE.CylinderGeometry(.22,.22,.12,12),C(0xd8d8e8)));return gs.map(g=>g.translate(0,.62,0));};
 let slot=0;const add=(gs,obj)=>{const id=slot++;for(const g of gs)opParts.push({g,slot:id});obj.slot=id;return obj;};
 for(const [gi,d] of LAYOUT.entries()){const G={...d,gi,hw:HW[d.kind],pieces:[]};groups.push(G);const f={};
  if(d.kind==='barrel'||d.kind==='crate'){const spots=d.kind==='barrel'?[[-.55,.6],[.55,.6],[0,-.5]]:[[-.55,0],[.55,0],[0,.05,1]];
   for(const [dx,ds,up] of spots){const P=add(d.kind==='barrel'?barrelGeo():crateGeo(),{kind:d.kind,g:G,s:d.s+ds,x:d.x+dx,y:up?1:0,r:d.kind==='barrel'?.5:.55,alive:1,t:0,vx:0,vy:0,rot:0,yaw:(gi*1.7+dx)%1});pieces.push(P);G.pieces.push(P);}}
  else if(d.kind==='crane'){const len=6.2;const P=add(craneGeo(len),{kind:'crane',g:G,s:d.s,x:d.x,r:.5,alive:1,len,yaw:.5,static:1});pieces.push(P);G.pieces.push(P);}
  else{const P=add(fanBase(),{kind:'fanbase',g:G,s:d.s,x:d.x,r:.6,alive:1,static:1});pieces.push(P);G.pieces.push(P);
   const R=add(fanRotor(1.9),{kind:'fan',g:G,s:d.s,x:d.x,r:2.0,alive:1,rot:gi});pieces.push(R);G.pieces.push(R);}
  // telegraph: glow ring on the road + hazard chevrons (additive, faded per group)
  frameAt(d.s,d.x,f);G.p=f.p;G.ang=f.ang;}
 // debris planks for breaking crates (shared pool)
 const debris=[];for(let i=0;i<6;i++){const P=add([pc(new THREE.BoxGeometry(.7,.08,.2),C(0xc8803a))],{kind:'debris',t:0,p:new THREE.Vector3(),v:new THREE.Vector3(),rot:0});debris.push(P);}
 const NS=slot;
 const ringT=tex(cv(128,128,(g)=>{const r=g.createRadialGradient(64,64,20,64,64,62);r.addColorStop(0,'rgba(255,255,255,0)');r.addColorStop(.7,'rgba(255,255,255,.25)');r.addColorStop(.9,'rgba(255,255,255,1)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
  g.fillStyle='rgba(255,255,255,.55)';for(let i=0;i<8;i++){g.save();g.translate(64,64);g.rotate(i/8*Math.PI*2);g.beginPath();g.moveTo(-8,-40);g.lineTo(0,-30);g.lineTo(8,-40);g.lineTo(8,-34);g.lineTo(0,-24);g.lineTo(-8,-34);g.fill();g.restore();}}),false,false);
 const gcol={barrel:0xffa020,crate:0xff4fc8,crane:0xffd23a,fan:0x35f2ff};
 for(const G of groups){const rr=G.kind==='crane'?3.8:G.kind==='fan'?2.8:2.3;const g=new THREE.PlaneGeometry(rr*2,(G.kind==='crane'?1.7:1)*rr*2).rotateX(-Math.PI/2).translate(0,.03,0);
  glowParts.push({g:kit.paintCol(g,C(gcol[G.kind],1)),slot:G.gi});}
 const op=palMesh(S,opParts,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.15,envMapIntensity:1}),NS);
 const gl=palMesh(S,glowParts,new THREE.MeshBasicMaterial({map:ringT,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),groups.length,'rgb');gl.mesh.renderOrder=3;
 // static group matrices (track frame at the group centre)
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(0,0,0,'YXZ'),one=new THREE.Vector3(1,1,1),v=new THREE.Vector3(),sc=new THREE.Vector3();
 const fr={};
 function pieceMatrix(P,t){frameAt(P.s,P.x,fr);v.copy(fr.p);let yaw=fr.ang,pitch=0,roll=0,s=1;
  if(P.kind==='barrel'||P.kind==='crate'){yaw+=P.yaw;let fly=false;if(P.alive<1){const k=P.t;fly=k<.9;   // knocked: fly + tumble, then gone; pop back later
     if(k<.9){v.x+=P.vx*k*Math.cos(fr.ang)+P.vz*k*Math.sin(fr.ang);v.z+=-P.vx*k*Math.sin(fr.ang)+P.vz*k*Math.cos(fr.ang);v.y=Math.max(0,P.vy*k-5*k*k);roll=P.rot*k*6;pitch=k*3;s=P.kind==='crate'?Math.max(0,1-k*1.4):1;}
     else if(P.t<P.back){hideSlot(op.M,P.slot);return;}
     else s=Math.min(1,(P.t-P.back)*3);}   // grow back in
   if(!fly)v.y+=P.y||0;}
  else if(P.kind==='crane'){yaw+=P.yaw;}
  else if(P.kind==='fan'){yaw+=P.rot;}
  e.set(pitch,yaw,roll);q.setFromEuler(e);m.compose(v,q,sc.setScalar(s));setSlotM(op.M,P.slot,m);}
 function reset(){for(const P of pieces){P.alive=1;P.t=0;}for(const D of debris){D.t=9;hideSlot(op.M,D.slot);}for(const P of pieces)pieceMatrix(P,0);}
 let T=0;const dv=new THREE.Vector3();
 function update(dt,time,heroS=0,heroV=20){T+=dt;
  for(const P of pieces){if(P.kind==='fan'){P.rot+=dt*4.2;pieceMatrix(P,T);}else if(P.alive<1){P.t+=dt;if(P.t>=P.back+.35){P.alive=1;P.t=0;}pieceMatrix(P,T);}}
  for(const D of debris){if(D.t>1.2){hideSlot(op.M,D.slot);continue;}D.t+=dt;D.v.y-=12*dt;D.p.addScaledVector(D.v,dt);if(D.p.y<.04){D.p.y=.04;D.v.multiplyScalar(.5);D.v.y=Math.abs(D.v.y)*.3;}D.rot+=dt*8;
   e.set(D.rot,D.rot*.7,0);q.setFromEuler(e);m.compose(D.p,q,sc.setScalar(Math.max(0,1-Math.max(0,D.t-.8)*2.5)));setSlotM(op.M,D.slot,m);}
  // telegraph: brightens as the hero gets within ~1.5 s, pulses faster when close
  const hs=((heroS%L)+L)%L,lead=Math.max(12,heroV*1.5);
  for(const G of groups){let d=G.s-hs;if(d<-L/2)d+=L;if(d>L/2)d-=L;const near=d>-3&&d<lead*1.6?Math.max(0,1-Math.max(0,d-lead)/(lead*.6)):0;
   const a=.55+near*(1.1+.7*Math.sin(T*(6+near*8)));e.set(0,G.ang+(G.kind==='crane'?.5:0),0);q.setFromEuler(e);v.copy(G.p);m.compose(v,q,one);setSlotM(gl.M,G.gi,m,a);}}
 function knock(P,k){if(P.alive<1||P.static)return;P.alive=0;P.t=0;P.back=7;const side=Math.sign(P.x-k.x)||1;P.vx=side*(2.5+Math.random()*1.5);P.vz=-(k.v||10)*.35;P.vy=3+Math.random()*1.5;P.rot=side;
  if(P.kind==='crate'){frameAt(P.s,P.x,fr);let n=0;for(const D of debris){if(D.t<1.2||n>=3)continue;n++;D.t=0;D.p.copy(fr.p).setY(.6);D.v.set((Math.random()-.5)*6,3+Math.random()*3,(Math.random()-.5)*6);D.rot=Math.random()*3;}}}
 // k: kart state (see racers.js / main.js). Effects are gentle; per-kart cooldown so one hazard = one bump.
 function collide(k){if(k.obCd>0)return null;const ks=((k.s%L)+L)%L;
  for(const P of pieces){if(!P.alive||P.kind==='debris')continue;let ds=ks-P.s;if(ds>L/2)ds-=L;if(ds<-L/2)ds+=L;
   if(P.kind==='crane'){if(Math.abs(ds)>3)continue;const dx=k.x-P.x;if(Math.abs(dx)>P.len/2*.88+.7||Math.abs(ds-dx*.545)>1.0)continue;}   // diagonal arm (yaw .5)
   else{const R=P.r+.65;if(ds>R||ds<-R)continue;const dx=k.x-P.x;if(dx*dx+ds*ds>R*R)continue;}
   if(k.air>0&&k.y>(P.kind==='fan'?.5:.8))continue;   // hopped over it
   k.obCd=.9;
   if(k.rocket>0){knock(P,k);return 'smash';}
   if(k.shield>0){k.shield=0;knock(P,k);return 'blocked';}
   const side=Math.sign(k.x-P.x)||(k.x>0?-1:1);
   if(P.kind==='fan'||P.kind==='fanbase'){const r=hitKart(k,'fan');k.x+=side*.4;if(!k.isPlayer)k.xs=k.x;return r==='spin'?'fan':'wiggle';}
   if(P.kind==='crate'){k.v*=.86;k.wiggle=Math.max(k.wiggle,.45);knock(P,k);return 'crate';}
   if(P.kind==='barrel'){k.v*=.8;k.bounce=.35;k.wiggle=Math.max(k.wiggle,.5);knock(P,k);k.x+=side*.5;if(!k.isPlayer)k.xs=k.x;return 'barrel';}
   k.v*=.75;k.bounce=.4;k.wiggle=Math.max(k.wiggle,.5);k.x+=side*.8;if(!k.isPlayer)k.xs=k.x;return 'crane';}
  return null;}
 // AI helper: next hazard within `look` m ahead of s whose band covers x (+margin) -> {id, x: a free target}
 function ahead(s,x,look,margin){const ks=((s%L)+L)%L;for(const G of groups){let d=G.s-ks;if(d<-L/2)d+=L;if(d<-1||d>look)continue;
   const lo=G.x-G.hw-margin-.7,hi=G.x+G.hw+margin+.7;if(x<lo||x>hi)continue;
   const lim=W/2-1;const left=lo,right=hi;const tx=(left+lim>lim-right)?Math.max(-lim,left-.2):Math.min(lim,right+.2);return {id:G.gi,x:tx};}
  return null;}
 reset();
 return {reset,update,collide,ahead,groups,pieces,meshes:[op.mesh,gl.mesh]};}
