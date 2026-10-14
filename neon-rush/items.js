// Neon Rush power-ups (Track B, M3): glowing item boxes on the track, picked up by the player AND the rivals.
// Items: speed (Speed Boost), shield, box (Mystery Box: rolls one of the others), rocket (Rocket Star, back of the pack
// only: auto-drive + speed, spins karts it touches), hop (Gravity Hop: big floaty jump over trouble).
// createItems(kit) -> { reset(), update(dt,ctx), use(k,ctx), held(k), hit(k,ctx,by), boxAhead(s,look) }
// Kart fields set here: boost, shield, rocket, hop, spin, wiggle, item, itemT, itemFx (player engine surge).
import * as THREE from 'three';
export const ROWS=[112,290,386,526];const LANES=[-4.2,-1.4,1.4,4.2];
export const NAMES={speed:'Speed Boost',shield:'Shield',box:'Mystery Box',rocket:'Rocket Star',hop:'Gravity Hop'};
// HUD icons (viewBox 0 0 24 24)
export const ICONS={
 speed:'<path d="M13 2 4 14h6l-2 8 10-13h-6z" fill="#ffe14d" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>',
 shield:'<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z" fill="#35f2ff" stroke="#fff" stroke-width="1.4"/><path d="M12 15.5c-2.6-1.8-4-3.2-4-4.7a2 2 0 0 1 4-.6 2 2 0 0 1 4 .6c0 1.5-1.4 2.9-4 4.7z" fill="#fff"/>',
 box:'<rect x="3" y="3" width="18" height="18" rx="4" fill="#ff4fc8" stroke="#fff" stroke-width="1.6"/><path d="M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2.9-1.2 1.8M12 16.6v.4" stroke="#fff" stroke-width="2.3" fill="none" stroke-linecap="round"/>',
 rocket:'<path d="M12 1.5l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.3l-6.3 3.6 1.5-7.1L1.8 8.9 9 8.1z" fill="#ffd23a" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/><circle cx="9.7" cy="11" r="1.1" fill="#7a3a00"/><circle cx="14.3" cy="11" r="1.1" fill="#7a3a00"/>',
 hop:'<path d="M12 3c-3 0-5 2.3-5 5 0 3 2.5 4 5 9 2.5-5 5-6 5-9 0-2.7-2-5-5-5z" fill="#b07aff" stroke="#fff" stroke-width="1.3"/><path d="M5 21h14M8 18.5l-1.5 2.5M16 18.5l1.5 2.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'};
// item odds by race place (1 = leading). Rocket Star only for the back of the pack (place >= 4 of 7).
function roll(place,rnd){const t=place<=2?{speed:38,shield:34,box:14,hop:14}:place===3?{speed:34,shield:24,box:16,hop:26}:place<=5?{speed:30,shield:16,box:14,hop:18,rocket:22}:{speed:26,shield:10,box:10,hop:16,rocket:38};
 let sum=0;for(const k in t)sum+=t[k];let r=rnd()*sum;for(const k in t){r-=t[k];if(r<=0)return k;}return 'speed';}
// shared "you got hit" rule (obstacles + Rocket Star): shield blocks one hit; the player is never spun twice in a row.
export function hitKart(k,kind){if(k.rocket>0)return null;if(k.shield>0){k.shield=0;return 'blocked';}
 if(k.isPlayer){if(k.immune>0)return null;if(k.spunLast){k.spunLast=false;k.wiggle=Math.max(k.wiggle,.6);k.v*=.9;k.immune=2;return 'wiggle';}k.spunLast=true;k.immune=4;}
 k.spin=Math.max(k.spin,.85);k.v*=.62;return 'spin';}
export function createItems(kit){const {S,sample,cv,tex,L}=kit;let rnd=Math.random;
 const boxes=[];for(const s of ROWS)for(const x of LANES)boxes.push({s,x,t:0,on:1});
 // M4 look: spinning, bobbing GLASS neon cube with a pulsing "?", rainbow sheen (hue per box, drifting), neon frame, shatter + sparkle burst, pop-in respawn.
 // 4 draw calls in total: glass cubes, frames, ground glow, sparkles (the sparkle pool also serves every burst).
 const face=tex(cv(128,128,(g)=>{g.fillStyle='#160830';g.fillRect(0,0,128,128);const r=g.createLinearGradient(0,0,128,128);r.addColorStop(0,'rgba(255,255,255,.28)');r.addColorStop(.45,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
  g.font='900 88px Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.shadowColor='#fff';g.shadowBlur=14;g.fillStyle='#fff';g.fillText('?',64,70);}),true,false);
 const bm=new THREE.InstancedMesh(new kit.RoundedBoxGeometry(.82,.82,.82,2,.1),new THREE.MeshStandardMaterial({map:face,emissiveMap:face,emissive:0xffffff,emissiveIntensity:1.3,roughness:.08,metalness:.2,transparent:true,opacity:.9}),boxes.length);
 const fg=[];for(const [x,y,z] of [[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]]){fg.push(new THREE.BoxGeometry(1,.07,.07).translate(0,y*.47,z*.47));fg.push(new THREE.BoxGeometry(.07,.07,1).translate(y*.47,z*.47,0));fg.push(new THREE.BoxGeometry(.07,1,.07).translate(y*.47,0,z*.47));}
 const fm=new THREE.InstancedMesh(kit.merge(fg),new THREE.MeshBasicMaterial({color:new THREE.Color(2.4,2.4,2.4)}),boxes.length);fm.frustumCulled=false;fm.layers.set(1);S.add(fm);const hc=new THREE.Color();
 const SP=40,spk=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.09,0),new THREE.MeshBasicMaterial({color:new THREE.Color(2.5,2.5,2.5)}),SP);spk.frustumCulled=false;spk.layers.set(1);S.add(spk);
 bm.frustumCulled=false;bm.layers.set(1);S.add(bm);
 const gm=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.8,1.8).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:kit.glowT,color:0xff8ae0,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}),boxes.length);
 gm.frustumCulled=false;gm.layers.set(1);gm.renderOrder=3;S.add(gm);
 const o={},m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),sc=new THREE.Vector3();
 // sparkle pool: position, velocity, life
 const sp=[];for(let i=0;i<SP;i++)sp.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,l:0,h:0});let spN=0;
 const SHAT=.3;
 function burst(b){sample(b.s,o);const cx=o.x-o.tz*b.x,cz=o.z+o.tx*b.x;for(let i=0;i<10;i++){const p=sp[spN++%SP],a=Math.random()*6.283,u=1.2+Math.random()*2.6;p.x=cx;p.y=.95;p.z=cz;p.vx=Math.cos(a)*u;p.vz=Math.sin(a)*u;p.vy=1.5+Math.random()*2.8;p.l=.55+Math.random()*.35;p.h=Math.random();}}
 let T=0;
 const back=x=>{const c=1.70158,d=x-1;return 1+(c+1)*d*d*d+c*d*d;};   // easeOutBack: pop-in with a little overshoot
 function draw(dt){for(let i=0;i<boxes.length;i++){const b=boxes[i];sample(b.s,o);v.set(o.x-o.tz*b.x,0,o.z+o.tx*b.x);
   let grow=b.on?Math.max(0,back(Math.min(1,b.grow))):0;if(!b.on&&b.shat>0)grow=(1+(SHAT-b.shat)*3.5)*(b.shat/SHAT);   // shatter: puffs out and vanishes
   v.y=.95+Math.sin(T*2.4+i)*.12;e.set(.5,T*1.6+i+(b.on?0:T*8),.3);q.setFromEuler(e);m.compose(v,q,sc.setScalar(grow));bm.setMatrixAt(i,m);fm.setMatrixAt(i,m);hc.setHSL((T*.25+i*.13)%1,1,.6);fm.setColorAt(i,hc);bm.setColorAt(i,hc);
   v.y=.025;m.compose(v,q.identity(),sc.setScalar(Math.min(grow,1.2)*(1+.12*Math.sin(T*5+i))));gm.setMatrixAt(i,m);}
  bm.instanceMatrix.needsUpdate=true;fm.instanceMatrix.needsUpdate=true;if(fm.instanceColor)fm.instanceColor.needsUpdate=true;if(bm.instanceColor)bm.instanceColor.needsUpdate=true;bm.material.emissiveIntensity=1.1+.5*Math.sin(T*6);gm.instanceMatrix.needsUpdate=true;
  for(let i=0;i<SP;i++){const p=sp[i];if(p.l>0){p.l-=dt;p.vy-=7*dt;p.x+=p.vx*dt;p.y=Math.max(.05,p.y+p.vy*dt);p.z+=p.vz*dt;}
   m.compose(v.set(p.x,p.y,p.z),q.identity(),sc.setScalar(p.l>0?Math.min(1,p.l*3):0));spk.setMatrixAt(i,m);hc.setHSL((p.h+T*.5)%1,.9,.7);spk.setColorAt(i,hc);}
  spk.instanceMatrix.needsUpdate=true;if(spk.instanceColor)spk.instanceColor.needsUpdate=true;}
 function reset(){for(const b of boxes){b.on=1;b.grow=1;b.t=0;b.shat=0;}for(const p of sp)p.l=0;T=0;draw(0);}
 function give(k,place){const it=roll(place||4,rnd);k.item=it;const st=k.st;k.itemT=it==='rocket'?.35:st?st.itemDelay[0]+rnd()*(st.itemDelay[1]-st.itemDelay[0]):0;return it;}
 function apply(k,it,ctx){
  if(it==='speed')k.boost=Math.max(k.boost,k.isPlayer?1.8:1.3);
  else if(it==='shield')k.shield=10;
  else if(it==='rocket'){k.rocket=3.2;k.boost=Math.max(k.boost,.3);k.spin=0;k.wiggle=0;}
  else if(it==='hop')k.hop=1;
  if(k.isPlayer)k.itemFx=1.2;}
 function use(k,ctx){const it=k.item;if(!it)return null;k.item=null;let got=it;
  if(it==='box'){const place=k.isPlayer?k.place:(k.place||4);const pool=place>=4?['speed','shield','hop','rocket']:['speed','shield','hop'];got=pool[Math.floor(rnd()*pool.length)];}
  apply(k,got,ctx);ctx&&ctx.onItem&&ctx.onItem(k,got,it);return got;}
 function hit(k,ctx,by){if(k.obCd>0&&!k.isPlayer)return null;const r=hitKart(k,'rocket');k.obCd=.6;ctx&&ctx.onHit&&ctx.onHit(k,r,by);return r;}
 function update(dt,ctx){T+=dt;const all=ctx.all;
  for(const b of boxes){if(!b.on){b.t+=dt;if(b.shat>0)b.shat=Math.max(0,b.shat-dt);if(b.t>2.6){b.on=1;b.grow=0;b.t=0;}continue;}if(b.grow<1)b.grow=Math.min(1,b.grow+dt*3);
   for(const k of all){if(k.item!=null||k.finished)continue;let ds=((k.s%L)+L)%L-b.s;if(ds>L/2)ds-=L;if(ds<-1.3||ds>1.3)continue;if(Math.abs(k.x-b.x)>1.15||k.air>0&&k.y>1.6)continue;
    b.on=0;b.t=0;b.shat=SHAT;burst(b);const it=give(k,k.place);ctx.onPickup&&ctx.onPickup(k,it);break;}}
  for(const k of all){if(k.itemFx>0)k.itemFx=Math.max(0,k.itemFx-dt);if(k.immune>0)k.immune=Math.max(0,k.immune-dt);}
  draw(dt);}
 // AI: best active box ahead within `look` m (near in s, close to lateral x) -> {x}
 function boxAhead(s,look,x=0){const ks=((s%L)+L)%L;let best=null,bd=1e9;for(const b of boxes){if(!b.on)continue;let d=b.s-ks;if(d<-L/2)d+=L;if(d<3||d>look)continue;const c=d+Math.abs(b.x-x)*3;if(c<bd){bd=c;best=b;}}return best;}
 reset();
 return {reset,update,use,hit,boxAhead,held:k=>k.item||null,boxes,setRandom(f){rnd=f;},meshes:[bm,fm,gm,spk]};}
