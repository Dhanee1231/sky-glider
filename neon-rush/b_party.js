// Neon Rush atmosphere (M3 Track B; M4 Track A: per-track zones, follows the road height): cheering crowds along the track + disco/party light trusses.
// Cost: 3 draw calls total (crowd = 1 instanced mesh, swinging beams + floor spots = 1 palette mesh, trusses + bulbs = 1 mesh).
import * as THREE from 'three';
import {palMesh,setSlotM} from './b_pal.js';
// crowd stretches [s0,s1,side(+1 right/-1 left/0 both)] and light sites (s) come from the track (TRACK.crowd / TRACK.party)
const ZONES0=[[-46,34,0],[214,268,0],[396,482,1],[556,622,-1]],SITES0=[-14,240,440,590];
export function createParty(kit){const {S,W,L,sample,cv,tex,rnd,HIGH}=kit;const ZONES=kit.track?.crowd||ZONES0,SITES=kit.track?.party||SITES0,CB=.15;const C=(h,m=1)=>new THREE.Color(h).multiplyScalar(m);
 // ---- crowd: cute round fans, arms up, glow sticks + hearts (atlas of 4 poses), camera-facing on Y, bounce more near the hero
 const atl=tex(cv(512,256,(g)=>{const skins=['#ffd8b8','#c88a5a','#8a5a3a','#f0c090'];
  for(let i=0;i<4;i++){const ox=i*128;g.save();g.translate(ox+64,0);
   g.fillStyle='#fff';g.beginPath();g.ellipse(0,190,40,58,0,0,7);g.fill();                                        // body (tinted per instance)
   g.strokeStyle='#fff';g.lineWidth=16;g.lineCap='round';const up=i%2?1:.6;g.beginPath();g.moveTo(-30,160);g.lineTo(-48,160-70*up);g.moveTo(30,160);g.lineTo(48-(i===2?20:0),160-70*up);g.stroke();
   g.fillStyle=skins[i];g.beginPath();g.arc(0,104,32,0,7);g.fill();
   g.fillStyle='#2a1a2a';g.beginPath();g.arc(-11,100,4.5,0,7);g.arc(11,100,4.5,0,7);g.fill();g.strokeStyle='#2a1a2a';g.lineWidth=4;g.beginPath();g.arc(0,110,10,.2,Math.PI-.2);g.stroke();
   g.fillStyle='rgba(255,110,170,.6)';g.beginPath();g.arc(-20,113,6,0,7);g.arc(20,113,6,0,7);g.fill();
   const hair=['#3a2416','#ffcf4a','#1a1a2a','#ff6ab8'][i];g.fillStyle=hair;g.beginPath();g.arc(0,96,33,Math.PI*1.05,Math.PI*1.95);g.fill();
   if(i===0||i===3){g.fillStyle=i?'#35f2ff':'#7dff6a';g.save();g.translate(-48,160-70*up);g.rotate(-.4);g.fillRect(-5,-34,10,38);g.restore();}
   if(i===1||i===2){g.fillStyle='#ff3f8a';const hx=i===1?48:28,hy=160-70*up-14;g.beginPath();g.moveTo(hx,hy+14);g.bezierCurveTo(hx-22,hy-2,hx-10,hy-18,hx,hy-6);g.bezierCurveTo(hx+10,hy-18,hx+22,hy-2,hx,hy+14);g.fill();}
   g.restore();}}),true,false);
 const tints=[0xff4fc8,0x35f2ff,0xffd23a,0x8a5cff,0x7dff6a,0xff8a2a,0xffffff,0xff6a8a];
 const fans=[];const o={};
 for(const [s0,s1,side] of ZONES)for(const sd of side?[side]:[-1,1])for(const row of[0,1])for(let s=s0+(row?.55:0);s<s1;s+=HIGH?1.05:1.6){
  const x=sd*(W/2+1.7+row*1.25+(rnd()-.5)*.3);sample(s,o);fans.push({x:o.x-o.tz*x,y:o.y+CB,z:o.z+o.tx*x,s,ph:rnd()*6.28,sp:2.6+rnd()*2.2,h:(row?1.15:1)*(.85+rnd()*.3),fr:Math.floor(rnd()*4)});}
 const geo=new THREE.PlaneGeometry(.95,.95).translate(0,.475,0);
 // per-instance atlas frame via a tiny vertex patch (uv.x offset = frame/4)
 const fr=new Float32Array(fans.length);fans.forEach((f,i)=>fr[i]=f.fr);geo.setAttribute('fr',new THREE.InstancedBufferAttribute(fr,1));
 const cm=new THREE.MeshBasicMaterial({map:atl,alphaTest:.5,color:C(0xffffff,.85)});
 cm.onBeforeCompile=sh=>{sh.vertexShader='attribute float fr;\n'+sh.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvMapUv.x=(vMapUv.x+fr)*.25;');};cm.customProgramCacheKey=()=>'crowd';
 const crowd=new THREE.InstancedMesh(geo,cm,fans.length);crowd.frustumCulled=false;crowd.layers.set(1);S.add(crowd);
 const col=new THREE.Color();fans.forEach((f,i)=>crowd.setColorAt(i,col.setHex(tints[i%tints.length]).lerp(C(0xffffff),.35)));
 // ---- light trusses: two posts + top beam across the road, bulb garland; beams swing from the top
 const metal=[],bulbs=[],beams=[];const beamSlots=[];
 const tC=C(0x2a2436),bulbCols=[0xff4fc8,0x35f2ff,0xffd23a,0x7dff6a,0x8a5cff];let bi=0;
 SITES.forEach((s,si)=>{sample(s,o);const ang=Math.atan2(o.tx,o.tz),nx=-o.tz,nz=o.tx,H=8.6,span=W+3;
  const Y=o.y;for(const sd of[-1,1]){const px=o.x+nx*sd*(span/2),pz=o.z+nz*sd*(span/2);metal.push(kit.paintCol(new THREE.BoxGeometry(.32,H,.32).rotateY(ang).translate(px,Y+H/2,pz),tC));}
  for(const y of[H,H-.6]){const g=new THREE.BoxGeometry(span,.18,.18);g.rotateY(ang);g.translate(o.x,Y+y,o.z);metal.push(kit.paintCol(g,tC));}
  for(let i=0;i<=20;i++){const t=-span/2+i*span/20,y=H-.9-Math.sin(i/20*Math.PI)*.9;bulbs.push(kit.paintCol(new THREE.SphereGeometry(.09,6,4).translate(o.x+nx*t,Y+y,o.z+nz*t),C(bulbCols[bi++%5],3)));}
  for(let b=0;b<4;b++){const t=(-1.5+b)*(span/4.6);beamSlots.push({x:o.x+nx*t,z:o.z+nz*t,y:Y+H-.7,gy:Y,ang,ph:b*1.6+si,col:bulbCols[(b+si)%5]});}});
 const party=new THREE.Mesh(kit.merge([...metal,...bulbs]),new THREE.MeshBasicMaterial({vertexColors:true}));party.layers.set(1);S.add(party);
 // beam: open cone (apex at origin, pointing down), colour fades toward the floor; floor spot as a second slot
 const NB=beamSlots.length;const parts=[];
 beamSlots.forEach((b,i)=>{const g=new THREE.CylinderGeometry(.08,1.5,7.6,14,4,true).translate(0,-3.8,0);const n=g.attributes.position.count,a=new Float32Array(n*3),c=C(b.col);
  for(let k=0;k<n;k++){const f=Math.max(0,1+g.attributes.position.getY(k)/7.6)*.22+.02;a[k*3]=c.r*f;a[k*3+1]=c.g*f;a[k*3+2]=c.b*f;}g.setAttribute('color',new THREE.BufferAttribute(a,3));
  const uv=g.attributes.uv;for(let k=0;k<uv.count;k++)uv.setXY(k,.25,.75);   // glow centre of the spot texture = flat
  parts.push({g,slot:i});
  const sp=new THREE.PlaneGeometry(3.4,3.4).rotateX(-Math.PI/2);parts.push({g:kit.paintCol(sp,C(b.col,.55)),slot:NB+i});});
 const spotT=tex(cv(128,128,(g)=>{const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.5,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);}),false,false);
 const bm=palMesh(S,parts,new THREE.MeshBasicMaterial({map:spotT,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),NB*2,'rgb');bm.mesh.renderOrder=5;
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(0,0,0,'YXZ'),v=new THREE.Vector3(),one=new THREE.Vector3(1,1,1),sc=new THREE.Vector3(),DN=new THREE.Vector3();let T=0;
 function update(dt,cam,heroS){T+=dt;const hs=((heroS%L)+L)%L;
  // crowd: face the camera (Y only), bounce; extra cheer when the hero is close
  const cx=cam.position.x,cz=cam.position.z;
  for(let i=0;i<fans.length;i++){const f=fans[i];let d=f.s-hs;if(d<-L/2)d+=L;if(d>L/2)d-=L;const near=d>-25&&d<60?1:0;
   const b=Math.abs(Math.sin(T*f.sp*(near?1.5:.8)+f.ph))*(near?.32:.12);v.set(f.x,f.y+b,f.z);
   q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,Math.atan2(cx-f.x,cz-f.z));m.compose(v,q,sc.set(f.h,f.h*1.8,1));crowd.setMatrixAt(i,m);}
  crowd.instanceMatrix.needsUpdate=true;
  // beams: swing in a slow figure-eight, colour pulse to the beat (~160 BPM)
  const beat=.75+.25*Math.max(0,Math.cos(T*Math.PI*2*160/60));
  for(let i=0;i<NB;i++){const b=beamSlots[i];const sw=Math.sin(T*1.3+b.ph)*.55,tw=Math.cos(T*.9+b.ph*1.3)*.4;e.set(tw,b.ang,sw);q.setFromEuler(e);v.set(b.x,b.y,b.z);m.compose(v,q,one);setSlotM(bm.M,i,m,beat);
   // floor spot where the beam axis meets the road
   const dir=DN.set(0,-1,0).applyQuaternion(q);const t=(b.y-b.gy)/Math.max(.2,-dir.y);v.set(b.x+dir.x*t,b.gy+.03,b.z+dir.z*t);m.compose(v,q.identity(),sc.setScalar(1));setSlotM(bm.M,NB+i,m,beat*.9);}}
 return {update,meshes:[crowd,bm.mesh,party],fans:fans.length};}
