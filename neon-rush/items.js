// Neon Rush power-ups (Track B, M3): glowing item boxes on the track, picked up by the player AND the rivals.
// Items: speed (Speed Boost), shield, box (Mystery Box: rolls one of the others), rocket (Rocket Star, back of the pack
// only: auto-drive + speed, spins karts it touches), hop (Gravity Hop: big floaty jump over trouble).
// createItems(kit) -> { reset(), update(dt,ctx), use(k,ctx), held(k), hit(k,ctx,by), boxAhead(s,look) }
// Kart fields set here: boost, shield, rocket, hop, spin, wiggle, item, itemT, itemFx (player engine surge).
import * as THREE from 'three';
import {getDiff} from './tuning.js';
export const ROWS=[112,290,386,526];const LANES=[-4.2,-1.4,1.4,4.2];
// M5b: Speed Boost -> Nitro Warp, Shield -> Shield Bubble (reskins, same logic); new Laser Dart / Holo-Mine / Pulse Orb / EMP Ring, with beach variants on Track 4
// (Water Blaster / Sand Trap / Beach-Ball / Wave Ring). NAMES and ICONS are re-skinned per track in createItems().
const NAMES_DEF={speed:'Nitro Warp',shield:'Shield Bubble',box:'Mystery Box',rocket:'Rocket Star',hop:'Gravity Hop',dart:'Laser Dart',mine:'Holo-Mine',orb:'Pulse Orb',emp:'EMP Ring'};
const NAMES_BEACH={dart:'Water Blaster',mine:'Sand Trap',orb:'Beach-Ball',emp:'Wave Ring'};
export const NAMES=Object.assign({},NAMES_DEF);
// HUD icons (viewBox 0 0 24 24)
const ICONS_NEW={
 dart:'<path d="M2.5 12l9.5-5v3.4h9.5v3.2H12V17z" fill="#35f2ff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/><path d="M2 7.5l4.5 4.5L2 16.5" stroke="#ff4fd8" stroke-width="2" fill="none" stroke-linecap="round"/>',
 mine:'<path d="M12 2.5l8 4.3v8.4l-8 4.3-8-4.3V6.8z" fill="#8a6bff" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/><path d="M12 11l8-4.2M12 11L4 6.8M12 11v8.5" stroke="#fff" stroke-width="1.1"/>',
 orb:'<circle cx="12" cy="12" r="7.6" fill="#ff7ad8" stroke="#fff" stroke-width="1.4"/><circle cx="12" cy="12" r="3.2" fill="#fff"/><path d="M12 1.5v3.2M12 19.3v3.2M1.5 12h3.2M19.3 12h3.2" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>',
 emp:'<circle cx="12" cy="12" r="7.6" fill="none" stroke="#7dff6a" stroke-width="3"/><circle cx="12" cy="12" r="2.8" fill="#fff"/><circle cx="12" cy="12" r="10.8" fill="none" stroke="#7dff6a" stroke-width="1.1" opacity=".7"/>'};
const ICONS_BEACH={
 dart:'<path d="M12 2.5c3.2 4.2 6 6.9 6 10.2a6 6 0 0 1-12 0c0-3.3 2.8-6 6-10.2z" fill="#35b8ff" stroke="#fff" stroke-width="1.3"/><path d="M9 13.4a3 3 0 0 0 2.4 2.9" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
 mine:'<path d="M3.5 20.5V10h3.2V6.8h2v3.2h2.6V6.8h2v3.2h2.6V6.8h2v3.2h3.1v10.5z" fill="#ffc060" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/><path d="M10 20.5v-4.6a2 2 0 0 1 4 0v4.6" fill="#a86a30"/>',
 orb:'<circle cx="12" cy="12" r="9" fill="#fff" stroke="#fff" stroke-width="1"/><path d="M12 3a9 9 0 0 1 7.8 4.5L12 12z" fill="#ff2d55"/><path d="M19.8 16.5A9 9 0 0 1 12 21l0-9z" fill="#1e7bff"/><path d="M4.2 16.5A9 9 0 0 1 4.2 7.5L12 12z" fill="#ffd21a"/>',
 emp:'<circle cx="12" cy="12" r="7.6" fill="none" stroke="#6aeaf8" stroke-width="3"/><circle cx="12" cy="12" r="10.6" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="2 2.4"/><circle cx="12" cy="12" r="2.6" fill="#fff"/>'};
export const ICONS={
 speed:'<path d="M13 2 4 14h6l-2 8 10-13h-6z" fill="#ffe14d" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>',
 shield:'<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z" fill="#35f2ff" stroke="#fff" stroke-width="1.4"/><path d="M12 15.5c-2.6-1.8-4-3.2-4-4.7a2 2 0 0 1 4-.6 2 2 0 0 1 4 .6c0 1.5-1.4 2.9-4 4.7z" fill="#fff"/>',
 box:'<rect x="3" y="3" width="18" height="18" rx="4" fill="#ff4fc8" stroke="#fff" stroke-width="1.6"/><path d="M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2.9-1.2 1.8M12 16.6v.4" stroke="#fff" stroke-width="2.3" fill="none" stroke-linecap="round"/>',
 rocket:'<path d="M12 1.5l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.3l-6.3 3.6 1.5-7.1L1.8 8.9 9 8.1z" fill="#ffd23a" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/><circle cx="9.7" cy="11" r="1.1" fill="#7a3a00"/><circle cx="14.3" cy="11" r="1.1" fill="#7a3a00"/>',
 hop:'<path d="M12 3c-3 0-5 2.3-5 5 0 3 2.5 4 5 9 2.5-5 5-6 5-9 0-2.7-2-5-5-5z" fill="#b07aff" stroke="#fff" stroke-width="1.3"/><path d="M5 21h14M8 18.5l-1.5 2.5M16 18.5l1.5 2.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'};
// item odds by race place (1 = leading). Rocket Star only for the back of the pack (place >= 4 of 7).
function roll(place,rnd,D){let t=D&&D.goodItems?(place<=3?{speed:38,shield:32,box:10,hop:20,dart:10,mine:6}:{speed:34,shield:36,box:8,hop:8,rocket:14,dart:8,orb:6}):D&&D.fewBoost&&place<=2?{speed:17,shield:24,dart:16,mine:20,hop:15,box:8}:null;
 // M5b odds by place (dev/tasks): Nitro, Bubble, Dart, Mine, Hop, Box, Orb, EMP, Rocket Star (back of the pack only)
 if(!t)t=place<=2?{speed:22,shield:24,dart:16,mine:20,hop:10,box:8}:place===3?{speed:20,shield:16,dart:14,mine:14,hop:14,box:10,orb:8,emp:4}:place<=5?{speed:18,shield:10,dart:12,mine:8,hop:10,box:10,orb:14,emp:8,rocket:10}:{speed:16,shield:6,dart:8,mine:4,hop:8,box:8,orb:16,emp:10,rocket:24};
 let sum=0;for(const k in t)sum+=t[k];let r=rnd()*sum;for(const k in t){r-=t[k];if(r<=0)return k;}return 'speed';}
const ATK={dart:1,mine:1,orb:1,emp:1};   // attack items: rivals never use them on Easy (they turn into a Nitro)
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

 // ---------- M5b attack items. Kid rules: a hit is a sparkly spin-out (Easy: only a wobble, no spin), a Shield blocks it, never twice in a row. ----------
 const BEACH=!!(kit.track&&kit.track.id==='beach');Object.assign(NAMES,NAMES_DEF,BEACH?NAMES_BEACH:null);Object.assign(ICONS,ICONS_NEW,BEACH?ICONS_BEACH:null);
 const PJ=[],MN=[],RG=[],NPJ=10,NMN=8,NRG=4,Yv=new THREE.Vector3(0,1,0);
 const dsOf=(k,s)=>{let d=(((k.s%L)+L)%L)-s;if(d>L/2)d-=L;if(d<-L/2)d+=L;return d;};   // > 0: kart is ahead of s
 // 3 extra draw calls, only while something is active: projectiles, mines, rings (one InstancedMesh each)
 const pjM=new THREE.InstancedMesh(new THREE.SphereGeometry(.3,8,6),new THREE.MeshBasicMaterial({color:0xffffff,fog:false}),NPJ);
 const mnG=BEACH?kit.merge([new THREE.CylinderGeometry(.6,.7,.3,10).translate(0,.15,0),new THREE.CylinderGeometry(.3,.38,.7,8).translate(0,.65,0),new THREE.ConeGeometry(.4,.45,8).translate(0,1.2,0),new THREE.CylinderGeometry(.2,.24,.5,6).translate(.45,.5,.2),new THREE.CylinderGeometry(.2,.24,.5,6).translate(-.4,.5,-.25)]):new THREE.OctahedronGeometry(.62,0);
 const mnM=new THREE.InstancedMesh(mnG,new THREE.MeshBasicMaterial({color:0xffffff}),NMN);
 const rgM=new THREE.InstancedMesh(new THREE.RingGeometry(.9,1,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}),NRG);
 for(const mm of[pjM,mnM,rgM]){mm.frustumCulled=false;mm.layers.set(1);mm.visible=false;mm.count=0;S.add(mm);}rgM.renderOrder=4;
 function strike(k,by,ctx){if(k.finished||k.rocket>0)return null;if(!k.isPlayer&&k.obCd>0)return null;const D=getDiff();let r;
  if(k.shield>0){k.shield=0;r='blocked';}
  else if(k.isPlayer&&D.cheer){if(k.immune>0)return null;k.wiggle=Math.max(k.wiggle,.6);k.v*=.9;k.immune=2;r='wiggle';}   // Easy: sparkly wobble, no spin
  else{r=hitKart(k,'item');if(r==='spin'&&k.isPlayer)k.spin=D.spinT;}
  k.obCd=.6;ctx&&ctx.onHit&&ctx.onHit(k,r,by);return r;}
 function warnPlayer(ctx,all,p){if(p.warned)return;const pl=all.find(k=>k.isPlayer);if(!pl||pl===p.owner)return;const dd=dsOf(pl,p.s);
  if(dd>0&&dd<(p.t==='orb'?38:36)&&(p.t==='orb'?p.target===pl:Math.abs(pl.x-p.x)<2.2)){p.warned=1;ctx.onWarn&&ctx.onWarn(p.t);}}
 function hazards(dt,ctx){const all=ctx.all,D=getDiff();
  for(let i=PJ.length-1;i>=0;i--){const p=PJ[i];let done=false;
   if(p.t==='dart'){const d=p.sp*dt;p.s+=d;p.left-=d;}
   else{let tg=p.target;if(tg&&tg.finished)tg=p.target=null;const hm=D.orbHome;p.s+=(tg?Math.max(tg.v,18)+4+4*hm:24)*dt;p.left-=dt;if(tg)p.x+=Math.max(-1,Math.min(1,tg.x-p.x))*7*hm*dt;}
   warnPlayer(ctx,all,p);
   for(const k of all){if(k===p.owner||k.finished)continue;const dd=dsOf(k,p.s);if(Math.abs(dd)>1.5||Math.abs(k.x-p.x)>1.15)continue;if(k.air>0&&k.y>.9)continue;
    burst({s:p.s,x:p.x});strike(k,p.owner,ctx);done=true;break;}
   if(p.left<=0)done=true;if(done)PJ.splice(i,1);}
  for(let i=MN.length-1;i>=0;i--){const m=MN[i];m.age+=dt;let pop=m.age>m.life;
   if(!pop)for(const k of all){if(k.finished||(k===m.owner&&m.age<1.2))continue;const dd=dsOf(k,m.s);if(Math.abs(dd)>1.5||Math.abs(k.x-m.x)>1.25)continue;if(k.air>0&&k.y>.9)continue;
    pop=true;burst({s:m.s,x:m.x});if(k.boost<=0&&k.rocket<=0)strike(k,m.owner,ctx);break;}   // a Nitro / Rocket kart just pops it
   if(pop)MN.splice(i,1);}
  for(let i=RG.length-1;i>=0;i--){const r=RG[i];r.t+=dt;if(!r.fired){r.s=((r.owner.s%L)+L)%L;r.x=r.owner.x;}
   if(!r.fired&&r.t>=.5){r.fired=1;for(const k of all){if(k===r.owner||k.finished||k.rocket>0)continue;if(Math.abs(dsOf(k,r.s))>10||Math.abs(k.x-r.x)>10)continue;
     if(k.shield>0){k.shield=0;ctx.onHit&&ctx.onHit(k,'blocked',r.owner);}else if(!(k.isPlayer&&k.immune>0)){k.emp=D.empT;k.empF=D.empF;ctx.onHit&&ctx.onHit(k,'wiggle',r.owner);}}}   // EMP / Wave Ring: a short slow, never a spin
   if(r.t>1.15)RG.splice(i,1);}}
 const hcol=new THREE.Color(),HZ=(a,b)=>BEACH?b:a;
 function drawHaz(){let n=0;
  for(const p of PJ){sample(p.s,o);q.setFromAxisAngle(Yv,Math.atan2(o.tx,o.tz));if(p.t==='dart')sc.set(.45,.45,2.4);else sc.setScalar(1+.12*Math.sin(T*14));
   m.compose(v.set(o.x-o.tz*p.x,o.y+.65+(p.t==='orb'?.12*Math.sin(T*9):0),o.z+o.tx*p.x),q,sc);pjM.setMatrixAt(n,m);pjM.setColorAt(n,hcol.setHex(p.t==='dart'?HZ(0x35f2ff,0x6ad0ff):HZ(0xff7ad8,0xff5a7a)).multiplyScalar(2.2));n++;}
  pjM.count=n;pjM.visible=n>0;if(n){pjM.instanceMatrix.needsUpdate=true;if(pjM.instanceColor)pjM.instanceColor.needsUpdate=true;}
  n=0;for(const mi of MN){sample(mi.s,o);q.setFromAxisAngle(Yv,T*2+mi.s);const g=Math.min(1,mi.age*4)*(mi.life-mi.age<1.2?.5+.5*Math.sin(T*24):1);
   m.compose(v.set(o.x-o.tz*mi.x,o.y+(BEACH?0:.75+.1*Math.sin(T*3+mi.s)),o.z+o.tx*mi.x),q,sc.setScalar(g*(BEACH?1.1:1)));mnM.setMatrixAt(n,m);mnM.setColorAt(n,hcol.setHex(HZ(0x8a6bff,0xffd890)).multiplyScalar(BEACH?1.1:2));n++;}
  mnM.count=n;mnM.visible=n>0;if(n){mnM.instanceMatrix.needsUpdate=true;if(mnM.instanceColor)mnM.instanceColor.needsUpdate=true;}
  n=0;for(const r of RG){sample(r.s,o);const u=r.fired?Math.min(1,(r.t-.5)/.65):0,rad=r.fired?1.6+u*8.6:1.5+.25*Math.sin(T*30),a=r.fired?1-u:.9;
   m.compose(v.set(o.x-o.tz*r.x,o.y+.1,o.z+o.tx*r.x),q.identity(),sc.set(rad,1,rad));rgM.setMatrixAt(n,m);rgM.setColorAt(n,hcol.setHex(HZ(0x7dff6a,0x6aeaf8)).multiplyScalar(1.8*a));n++;}
  rgM.count=n;rgM.visible=n>0;if(n){rgM.instanceMatrix.needsUpdate=true;if(rgM.instanceColor)rgM.instanceColor.needsUpdate=true;}}
 function reset(){PJ.length=MN.length=RG.length=0;for(const b of boxes){b.on=1;b.grow=1;b.t=0;b.shat=0;}for(const p of sp)p.l=0;T=0;draw(0);drawHaz();}
 function give(k,place){const it=roll(place||4,rnd,k.isPlayer?getDiff():null);k.item=it;const st=k.st;k.itemT=it==='rocket'?.35:st?st.itemDelay[0]+rnd()*(st.itemDelay[1]-st.itemDelay[0]):0;return it;}
 function apply(k,it,ctx){
  if(it==='speed')k.boost=Math.max(k.boost,k.isPlayer?1.8:1.3);
  else if(it==='shield')k.shield=10;
  else if(it==='rocket'){k.rocket=3.2;k.boost=Math.max(k.boost,.3);k.spin=0;k.wiggle=0;}
  else if(it==='hop')k.hop=1;
  else if(it==='dart'){if(PJ.length>=NPJ)PJ.shift();PJ.push({t:'dart',s:((k.s%L)+L)%L+2,x:k.x,sp:70,left:42,owner:k,warned:0});}
  else if(it==='orb'){let tg=null,bd=100;for(const c of ctx.all){if(c===k||c.finished)continue;const d=dsOf(c,((k.s%L)+L)%L);if(d>0&&d<bd){bd=d;tg=c;}}if(PJ.length>=NPJ)PJ.shift();PJ.push({t:'orb',s:((k.s%L)+L)%L+2,x:k.x,target:tg,left:9,owner:k,warned:0});}
  else if(it==='mine'){for(let i=MN.length-1;i>=0;i--)if(MN[i].owner===k)MN.splice(i,1);if(MN.length>=NMN)MN.shift();MN.push({s:((k.s%L)+L)%L-3.5,x:k.x,owner:k,age:0,life:getDiff().mineLife});}
  else if(it==='emp'){if(RG.length>=NRG)RG.shift();RG.push({s:((k.s%L)+L)%L,x:k.x,owner:k,t:0,fired:0});}
  if(k.isPlayer)k.itemFx=1.2;}
 function use(k,ctx){const it=k.item;if(!it)return null;k.item=null;let got=it;
  if(it==='box'){const place=k.isPlayer?k.place:(k.place||4);const pool=place>=4?['speed','shield','hop','rocket','dart','mine','orb']:k.isPlayer&&getDiff().fewBoost&&place<=2?['shield','hop','dart']:['speed','shield','hop','dart','mine'];got=pool[Math.floor(rnd()*pool.length)];}
  if(ATK[got]&&!k.isPlayer&&getDiff().aiItem===0)got='speed';   // Easy: rivals never use attack items on anyone
  apply(k,got,ctx);ctx&&ctx.onItem&&ctx.onItem(k,got,it);return got;}
 function hit(k,ctx,by){if(k.obCd>0&&!k.isPlayer)return null;const r=hitKart(k,'rocket');k.obCd=.6;ctx&&ctx.onHit&&ctx.onHit(k,r,by);return r;}
 function update(dt,ctx){T+=dt;const all=ctx.all;
  for(const b of boxes){if(!b.on){b.t+=dt;if(b.shat>0)b.shat=Math.max(0,b.shat-dt);if(b.t>2.6){b.on=1;b.grow=0;b.t=0;}continue;}if(b.grow<1)b.grow=Math.min(1,b.grow+dt*3);
   for(const k of all){if(k.item!=null||k.finished)continue;let ds=((k.s%L)+L)%L-b.s;if(ds>L/2)ds-=L;if(ds<-1.3||ds>1.3)continue;if(Math.abs(k.x-b.x)>1.15||k.air>0&&k.y>1.6)continue;
    b.on=0;b.t=0;b.shat=SHAT;burst(b);const it=give(k,k.place);ctx.onPickup&&ctx.onPickup(k,it);break;}}
  for(const k of all){if(k.itemFx>0)k.itemFx=Math.max(0,k.itemFx-dt);if(k.immune>0)k.immune=Math.max(0,k.immune-dt);}
  hazards(dt,ctx);draw(dt);drawHaz();}
 // AI: best active box ahead within `look` m (near in s, close to lateral x) -> {x}
 function boxAhead(s,look,x=0){const ks=((s%L)+L)%L;let best=null,bd=1e9;for(const b of boxes){if(!b.on)continue;let d=b.s-ks;if(d<-L/2)d+=L;if(d<3||d>look)continue;const c=d+Math.abs(b.x-x)*3;if(c<bd){bd=c;best=b;}}return best;}
 reset();
 return {reset,update,use,hit,boxAhead,held:k=>k.item||null,boxes,setRandom(f){rnd=f;},meshes:[bm,fm,gm,spk,pjM,mnM,rgM]};}
