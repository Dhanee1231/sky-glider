// Neon Rush world (M4): track-driven. Each track (tracks/*.js) gives centreline, elevation, features, palette and landmarks;
// this file builds the shared road / bridge / tunnel / city kit around it. setTrack() swaps the live track bindings
// (L, FEAT, TRACK, sample, pointAt ...); buildWorld() builds one scene; dispose() frees it. Original IP only.
import * as THREE from 'three';  // import map -> vendor/three/three.module.min.js
import {Reflector} from './vendor/three/jsm/objects/Reflector.js';
import {RoundedBoxGeometry} from './vendor/three/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries as _mg} from './vendor/three/jsm/utils/BufferGeometryUtils.js';
import {EffectComposer} from './vendor/three/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/three/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/three/jsm/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from './vendor/three/jsm/postprocessing/ShaderPass.js';
import {OutputPass} from './vendor/three/jsm/postprocessing/OutputPass.js';
import {buildHero} from './karts.js';

let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const merge=(gs)=>{const hasCol=gs.every(g=>g.attributes.color);return _mg(gs.map(g=>{const n=g.index?g.toNonIndexed():g;const o=new THREE.BufferGeometry();
 for(const a of['position','normal','uv'])o.setAttribute(a,n.attributes[a]);if(hasCol)o.setAttribute('color',n.attributes.color);return o;}));};
const paintCol=(g,c)=>{g=g.index?g.toNonIndexed():g;const n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;};
const cv=(w,h,f)=>{const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);return c;};
const tex=(c,srgb=true,rep=true)=>{const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;if(rep)t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;};
function normalFrom(hc,str){const w=hc.width,h=hc.height,src=hc.getContext('2d').getImageData(0,0,w,h).data;
 return cv(w,h,(g)=>{const im=g.createImageData(w,h),d=im.data;const H=(x,y)=>src[(((y+h)%h)*w+((x+w)%w))*4]/255;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(H(x+1,y)-H(x-1,y))*str,dy=(H(x,y+1)-H(x,y-1))*str;const l=Math.hypot(dx,dy,1),i=(y*w+x)*4;
   d[i]=(-dx/l*.5+.5)*255;d[i+1]=(dy/l*.5+.5)*255;d[i+2]=(1/l*.5+.5)*255;d[i+3]=255;}g.putImageData(im,0,0);});}
const noise=(g,w,h,n,a,b,sz=2)=>{for(let i=0;i<n;i++){const v=a+rnd()*(b-a)|0;g.fillStyle=`rgb(${v},${v},${v})`;const s=1+rnd()*sz;g.fillRect(rnd()*w,rnd()*h,s,s);}};
// generated canvases survive track switches (their textures are disposed and re-uploaded); key = recipe + palette inputs
const CVC=new Map();const cvk=(key,make)=>{let c=CVC.get(key);if(!c){c=make();CVC.set(key,c);}return c;};
const grad=(stops)=>cv(4,256,(g)=>{const r=g.createLinearGradient(0,0,0,256);for(const [o,c] of stops)r.addColorStop(o,c);g.fillStyle=r;g.fillRect(0,0,4,256);});

// ---------- track: closed loop, metres; sampled every 0.5 m for fast lookups (live bindings, swapped by setTrack) ----------
export const W=12;const CURB=.15;
export let L=1,FEAT=null,TRACK=null;
const STEP=.5;let NS=1,PX,PZ,PY,TX,TZ,KU,GY;
const smooth=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
// elevation: [s0, s1, height, rampIn, rampOut] plateaus with smooth ramps (bridges, spiral ramps)
function elevAt(def,s){let y=0;for(const [s0,s1,h,ri,ro=ri] of def.elev||[])if(s>s0&&s<s1)y+=h*smooth((s-s0)/ri)*smooth((s1-s)/ro);return y;}
export function setTrack(def){TRACK=def;
 const curve=new THREE.CatmullRomCurve3(def.pts.map(([x,z])=>V(x,0,z)),true,'centripetal');curve.arcLengthDivisions=4000;
 L=curve.getLength();NS=Math.ceil(L/STEP);
 PX=new Float32Array(NS+1);PZ=new Float32Array(NS+1);PY=new Float32Array(NS+1);TX=new Float32Array(NS+1);TZ=new Float32Array(NS+1);KU=new Float32Array(NS+1);GY=new Float32Array(NS+1);
 for(let i=0;i<=NS;i++){const t=(i*STEP/L)%1,p=curve.getPointAt(t),tg=curve.getTangentAt(t);PX[i]=p.x;PZ[i]=p.z;TX[i]=tg.x;TZ[i]=tg.z;PY[i]=elevAt(def,(i*STEP)%L);}
 for(let i=0;i<=NS;i++){const a=(i+NS-4)%NS,b=(i+4)%NS;let d=Math.atan2(TX[b],TZ[b])-Math.atan2(TX[a],TZ[a]);while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;KU[i]=d/(8*STEP);
  GY[i]=(PY[(i+2)%NS]-PY[(i+NS-2)%NS])/(4*STEP);}
 seed=def.seed||11;
 FEAT={boost:def.boost.slice(),ramp:Object.assign({},def.ramp),puddles:[],tunnels:(def.tunnels||[]).map(t=>t.slice()),gantry:0};
 const pz=def.puddles;if(pz)for(let i=0;i<pz.n;i++)FEAT.puddles.push({s:pz.s0+i*pz.step+rnd()*4,x:(rnd()-.5)*(W-3),r:1.6+rnd()*1.2});
 return def;}
export const wrap=s=>((s%L)+L)%L;
// sample(s) -> {x,y,z,tx,tz,k,gy}; k = curvature (rad/m), y = road height, gy = grade (dy/ds)
export function sample(s,o){s=wrap(s);const f=s/STEP,i=Math.floor(f),u=f-i,j=Math.min(i+1,NS);
 o.x=PX[i]+(PX[j]-PX[i])*u;o.z=PZ[i]+(PZ[j]-PZ[i])*u;o.y=PY[i]+(PY[j]-PY[i])*u;let tx=TX[i]+(TX[j]-TX[i])*u,tz=TZ[i]+(TZ[j]-TZ[i])*u;const l=Math.hypot(tx,tz)||1;o.tx=tx/l;o.tz=tz/l;
 o.k=KU[i]+(KU[j]-KU[i])*u;o.gy=GY[i]+(GY[j]-GY[i])*u;return o;}
const _s={},_h={};const nAt=(t)=>{sample(t*L,_s);return{p:V(_s.x,_s.y,_s.z),tg:V(_s.tx,0,_s.tz),n:V(-_s.tz,0,_s.tx),ang:Math.atan2(_s.tx,_s.tz)};};
// world point at (s, lateral x); y = road surface
export function pointAt(s,x,out){sample(s,_s);return out.set(_s.x-_s.tz*x,_s.y,_s.z+_s.tx*x);}
export const heightAt=s=>sample(s,_h).y;
// tunnels: inTunnel(s) and a 0..1 "cover" that fades over 8 m at the portals (rain, lighting)
export function inTunnel(s,pad=0){s=wrap(s);for(const t of FEAT.tunnels)if(s>t[0]-pad&&s<t[1]+pad)return true;return false;}
export function tunnelCover(s){s=wrap(s);let c=0;for(const t of FEAT.tunnels)c=Math.max(c,Math.min(1,Math.max(0,(s-t[0]+2)/8),Math.max(0,(t[1]-s+2)/8)));return c;}
// distance from (x,z) to the centreline; skipS: ignore the stretch within +-skipR m of s (for crossings/overpasses)
export function minDistToTrack(x,z,skipS=null,skipR=60){let m=1e9;const si=skipS==null?-1:wrap(skipS)/STEP,sr=skipR/STEP;
 for(let i=0;i<NS;i+=6){if(si>=0){let d=Math.abs(i-si);d=Math.min(d,NS-d);if(d<sr)continue;}const d=(PX[i]-x)**2+(PZ[i]-z)**2;if(d<m)m=d;}return Math.sqrt(m);}
// stretches [a,b] of the loop where pred(s) holds (1.5 m resolution)
export function ranges(pred){const out=[];let a=-1;const n=Math.ceil(L/1.5);for(let i=0;i<=n;i++){const s=Math.min(L,i*1.5),ok=i<n&&pred(s);if(ok&&a<0)a=s;if(!ok&&a>=0){out.push([a,s]);a=-1;}}return out;}

export function buildWorld(R,S,cam,HIGH,custom){
 const T=TRACK,PAL=T.pal,WALK=T.walk??4.5;seed=(T.seed||11)+7;
 const DPR=R.getPixelRatio();const C=(h,m=1)=>new THREE.Color(h).multiplyScalar(m);
 S.fog=new THREE.FogExp2(new THREE.Color(PAL.fog),PAL.fogD??.0105);let envRT=null;   // PMREM target: dispose the render target, not just its texture
 {const env=new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.MeshBasicMaterial({map:tex(grad(PAL.env),true,false),side:THREE.BackSide})));
  const em=(c,i,w,h,x,y,z,ry)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry;env.add(m);return m;};
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;em(PAL.neon[i%PAL.neon.length],6,6+rnd()*6,2+rnd()*3,Math.cos(a)*40,6+rnd()*10,Math.sin(a)*40,-a+Math.PI/2);}
  em(PAL.top??0xffd0a0,8,30,4,0,30,0,0).rotation.x=Math.PI/2;
  const pm=R.userData?.pmrem||((R.userData=R.userData||{}).pmrem=new THREE.PMREMGenerator(R));envRT=pm.fromScene(env,0.03);S.environment=envRT.texture;S.environmentIntensity=0.8;   // generator kept: its shaders stay compiled
  env.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});}
 S.background=tex(grad(PAL.bg),true,false);
 const hemi=new THREE.HemisphereLight(PAL.hemi[0],PAL.hemi[1],PAL.hemi[2]);S.add(hemi);
 const key=new THREE.DirectionalLight(PAL.key[0],PAL.key[1]);key.position.set(...PAL.key[2]);S.add(key);
 const rimL=new THREE.DirectionalLight(PAL.rim[0],PAL.rim[1]);rimL.position.set(30,15,40);S.add(rimL);
 const LB={hemi:hemi.intensity,key:key.intensity,rim:rimL.intensity,rimC:rimL.color.clone(),tunC:C(PAL.tunnelLight??0xff4fd8)};

 // maps
 const asphH=cvk('asphH',()=>cv(512,512,(g,w,h)=>{g.fillStyle='#808080';g.fillRect(0,0,w,h);noise(g,w,h,60000,70,190,1);g.filter='blur(1.2px)';g.drawImage(g.canvas,0,0);g.filter='none';}));
 const puddle=cvk('puddle',()=>cv(512,512,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);for(let i=0;i<9;i++){const x=rnd()*w,y=rnd()*h,r=14+rnd()*34;
  for(let k=0;k<4;k++){const gr=g.createRadialGradient(x+(rnd()-.5)*r,y+(rnd()-.5)*r*.5,0,x,y,r);gr.addColorStop(0,'rgba(0,0,0,.9)');gr.addColorStop(.6,'rgba(0,0,0,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r*1.5,y-r*1.5,r*3,r*3);}}}));
 const roadAlb=cvk('roadAlb'+PAL.asphalt+PAL.edgeLine,()=>cv(512,512,(g,w,h)=>{g.drawImage(asphH,0,0);g.globalCompositeOperation='multiply';g.fillStyle=PAL.asphalt??'#3a3640';g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';
  g.globalAlpha=.55;g.globalCompositeOperation='multiply';g.drawImage(puddle,0,0);g.globalCompositeOperation='source-over';g.globalAlpha=1;
  g.fillStyle='rgba(235,230,215,.9)';for(const u of[1/3,2/3])g.fillRect(u*w-4,20,8,200);g.fillStyle=PAL.edgeLine??'rgba(235,230,215,.9)';g.fillRect(14,0,10,h);g.fillRect(w-24,0,10,h);}));
 const roadRough=cvk('roadRough',()=>cv(512,512,(g,w,h)=>{g.drawImage(asphH,0,0);g.globalCompositeOperation='multiply';g.fillStyle='#b0b0b0';g.fillRect(0,0,w,h);g.drawImage(puddle,0,0);g.globalCompositeOperation='lighten';g.fillStyle='#141414';g.fillRect(0,0,w,h);}));
 const roadAlpha=cvk('roadAlpha',()=>cv(512,512,(g,w,h)=>{g.drawImage(puddle,0,0);g.globalCompositeOperation='lighten';g.fillStyle='#707070';g.fillRect(0,0,w,h);}));
 const concH=cvk('concH',()=>cv(256,256,(g,w,h)=>{g.fillStyle='#909090';g.fillRect(0,0,w,h);noise(g,w,h,9000,100,170,1.5);g.fillStyle='#303030';g.fillRect(0,0,w,3);g.fillRect(0,0,3,h);g.fillRect(0,h/2,w,2);}));
 const concAlb=cvk('concAlb'+PAL.conc,()=>cv(256,256,(g,w,h)=>{g.drawImage(concH,0,0);g.globalCompositeOperation='multiply';g.fillStyle=PAL.conc??'#8a8090';g.fillRect(0,0,w,h);}));
 const metalH=cvk('metalH',()=>cv(256,256,(g,w,h)=>{g.fillStyle='#808080';g.fillRect(0,0,w,h);for(let i=0;i<900;i++){const v=90+rnd()*80|0;g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(0,rnd()*h,w,1);}}));
 const flakeH=cvk('flakeH',()=>cv(128,128,(g,w,h)=>{g.fillStyle='#808080';g.fillRect(0,0,w,h);noise(g,w,h,6000,0,255,1);}));
 const treadH=cvk('treadH',()=>cv(64,256,(g,w,h)=>{g.fillStyle='#c0c0c0';g.fillRect(0,0,w,h);g.fillStyle='#202020';for(let y=0;y<h;y+=12){g.fillRect(20,y,4,7);g.fillRect(40,y+6,4,7);}g.fillRect(31,0,2,h);}));
 const furH=cvk('furH',()=>cv(128,128,(g,w,h)=>{g.fillStyle='#808080';g.fillRect(0,0,w,h);for(let i=0;i<1800;i++){const v=40+rnd()*180|0,x=rnd()*w,y=rnd()*h;g.strokeStyle=`rgb(${v},${v},${v})`;g.beginPath();g.moveTo(x,y);g.lineTo(x+(rnd()-.5)*3,y+4+rnd()*6);g.stroke();}}));
 const nrm=(k,c,st)=>tex(cvk('N'+k,()=>normalFrom(c,st)));
 const N_asph=nrm('asph',asphH,1.5),N_conc=nrm('conc',concH,2),N_metal=nrm('metal',metalH,1.5),N_flake=nrm('flake',flakeH,6),N_tread=nrm('tread',treadH,4),N_fur=nrm('fur',furH,3);
 const glowT=tex(cvk('glow',()=>cv(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.2,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);})),false,false);
 const shadowT=tex(cvk('shadow',()=>cv(64,64,(g)=>{const r=g.createRadialGradient(32,32,2,32,32,32);r.addColorStop(0,'rgba(0,0,0,.95)');r.addColorStop(.5,'rgba(0,0,0,.6)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);})),false,false);
 seed=(T.seed||11)*31+5;   // layout randomness below does not depend on whether the maps came from the cache

 // ---------- geometry helpers along the track (s range a..b), one segment per RES m ----------
 const RES=2.5;
 function ribbon(w,dy,vlen,off=0,a=0,b=L){const n=Math.max(1,Math.ceil((b-a)/RES)),g=new THREE.BufferGeometry(),pos=[],uv=[],idx=[];
  for(let i=0;i<=n;i++){const s=a+(b-a)*i/n;sample(s,_s);for(const k of[-1,1]){const o=off+k*w/2;pos.push(_s.x-_s.tz*o,_s.y+dy,_s.z+_s.tx*o);uv.push((k+1)/2,s/vlen);}
   if(i<n){const q=i*2;idx.push(q,q+2,q+1,q+1,q+2,q+3);}}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  if(g.attributes.normal.getY(0)<0){for(let i=0;i<idx.length;i+=3){const t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t;}g.setIndex(idx);g.computeVertexNormals();}return g;}
 // vertical strip at lateral offset off; y0/y1 relative to the road, or functions (y_road) -> absolute y
 function wall(off,y0,y1,vlen,a=0,b=L,res=RES){const n=Math.max(1,Math.ceil((b-a)/res)),g=new THREE.BufferGeometry(),pos=[],uv=[],idx=[];
  for(let i=0;i<=n;i++){const s=a+(b-a)*i/n;sample(s,_s);const ya=typeof y0==='function'?y0(_s.y,s):_s.y+y0,yb=typeof y1==='function'?y1(_s.y,s):_s.y+y1;
   for(const y of[ya,yb]){pos.push(_s.x-_s.tz*off,y,_s.z+_s.tx*off);uv.push(s/vlen,y===ya?0:(yb-ya)/2);}
   if(i<n){const q=i*2;idx.push(q,q+2,q+1,q+1,q+2,q+3);}}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
 const yAt=s=>sample(s,_s).y,tunAt=s=>inTunnel(s);
 const GROUND=T.ground??0;   // ground level under the track (Skyway: the city far below)
 const flatR=ranges(s=>yAt(s)<.05),elevR=ranges(s=>yAt(s)>=.05),openR=ranges(s=>!tunAt(s));
 const walkR=T.deck?openR:ranges(s=>yAt(s)<.05&&!tunAt(s));
 const bb=[1e9,-1e9,1e9,-1e9];for(let i=0;i<NS;i+=4){bb[0]=Math.min(bb[0],PX[i]);bb[1]=Math.max(bb[1],PX[i]);bb[2]=Math.min(bb[2],PZ[i]);bb[3]=Math.max(bb[3],PZ[i]);}
 const CX=(bb[0]+bb[1])/2,CZ=(bb[2]+bb[3])/2,SX=bb[1]-bb[0],SZ=bb[3]-bb[2],RAD=Math.hypot(SX,SZ)/2;

 // ---------- road ----------
 const useMirror=HIGH&&T.mirror!==false;
 const roadMat=new THREE.MeshStandardMaterial({map:tex(roadAlb),normalMap:N_asph,normalScale:new THREE.Vector2(.3,.3),roughnessMap:tex(roadRough,false),roughness:1,metalness:0,envMapIntensity:1.2});
 if(useMirror){const op=roadMat.clone();roadMat.alphaMap=tex(roadAlpha,false);roadMat.transparent=true;
  const rf=new THREE.Mesh(merge(flatR.map(([a,b])=>ribbon(W,0,12,0,a,b))),roadMat);rf.renderOrder=1;S.add(rf);
  if(elevR.length){S.add(new THREE.Mesh(merge(elevR.map(([a,b])=>ribbon(W,0,12,0,a,b))),op));}}   // raised road: opaque (no mirror below it)
 else{S.add(new THREE.Mesh(ribbon(W,0,12),roadMat));}
 let mirror=null;
 if(useMirror){mirror=new Reflector(new THREE.PlaneGeometry(SX+340,SZ+340),{textureWidth:Math.round(innerWidth*DPR/2),textureHeight:Math.round(innerHeight*DPR/2),color:PAL.mirror??0xa098b8,clipBias:0.003});
  mirror.rotation.x=-Math.PI/2;mirror.position.set(CX,(T.mirrorY??0)-.01,CZ);S.add(mirror);}
 else{const gnd=new THREE.Mesh(new THREE.PlaneGeometry(SX+600,SZ+600),new THREE.MeshStandardMaterial({color:PAL.ground??0x14101a,roughness:PAL.groundRough??.3}));gnd.rotation.x=-Math.PI/2;gnd.position.set(CX,(T.deck?GROUND:(T.mirrorY??0))-.02,CZ);S.add(gnd);}
 const concMat=new THREE.MeshStandardMaterial({map:tex(concAlb),normalMap:N_conc,roughness:.55,metalness:0,side:THREE.DoubleSide,envMapIntensity:.8});
 const conc=[],metal=[],emit=[];
 for(const s of[-1,1]){conc.push(wall(s*W/2,0,CURB,1.2));conc.push(ribbon(.35,CURB,1.2,s*(W/2+.175)));
  for(const [a,b] of walkR)conc.push(ribbon(WALK,CURB,2,s*(W/2+.35+WALK/2),a,b));}
 conc.push(...(T.extraConc||[]));
 // neon edge strips (track accent)
 {const m=new THREE.Mesh(merge([wall(-W/2+.01,.05,.09,1),wall(W/2-.01,.05,.09,1)]),new THREE.MeshBasicMaterial({color:C(PAL.edge??0x35f2ff,2.2),side:THREE.DoubleSide}));S.add(m);}
 // ---------- bridges: raised road (fascia + underside + piers + neon strip) ----------
 const DECKD=T.deck?1.6:1.3;
 if(T.deck){const off=W/2+.35+WALK;
  for(const s of[-1,1]){conc.push(wall(s*off,-DECKD,CURB,3));emit.push(paintCol(wall(s*(off+.02),-.5,-.38,3),C(PAL.edge2??0xff4fd8,2.4)));}
  conc.push(ribbon(2*off,-DECKD,4));
  for(let d=10;d<L;d+=30){if(tunAt(d))continue;sample(d,_s);if(minDistToTrack(_s.x,_s.z,d,40)<W)continue;const h=_s.y-DECKD-GROUND;
   const g=new THREE.CylinderGeometry(1.3,1.7,h,10);g.translate(_s.x,GROUND+h/2,_s.z);conc.push(g);
   emit.push(paintCol(new THREE.CylinderGeometry(1.35,1.35,.25,10,1,true).translate(_s.x,_s.y-DECKD-2.2,_s.z),C(PAL.edge??0x35f2ff,2)));}}
 else for(const [a,b] of elevR){
  for(const s of[-1,1]){conc.push(wall(s*(W/2+.35),y=>Math.max(GROUND,y-DECKD),y=>y+CURB,3,a,b));
   emit.push(paintCol(wall(s*(W/2+.37),y=>Math.max(GROUND+.02,y-.55),y=>Math.max(GROUND+.06,y-.42),3,a,b),C(PAL.edge2??0xff4fd8,2.4)));}
  conc.push(ribbon(W+.7,-DECKD,4,0,a,b));
  for(let d=a+8;d<b-4;d+=16){sample(d,_s);if(_s.y<2.4)continue;for(const k of[-1,1]){const x=_s.x-_s.tz*k*(W/2-1.4),z=_s.z+_s.tx*k*(W/2-1.4),h=_s.y-DECKD-GROUND+.4;
   const g=new THREE.BoxGeometry(1.1,h,1.1);g.rotateY(Math.atan2(_s.tx,_s.tz));g.translate(x,GROUND-.4+h/2,z);conc.push(g);}}}
 // ---------- tunnels: walls, roof, neon ribs, portals (rain hidden + own lighting inside, see updateFx) ----------
 const TH=T.tunnelH??7.2,TOFF=W/2+1.1;
 for(const [a,b,style] of FEAT.tunnels){
  for(const s of[-1,1]){conc.push(wall(s*TOFF,-.1,TH,3,a,b));
   for(const e of[a,b]){sample(e,_s);const ang=Math.atan2(_s.tx,_s.tz),o=s*(TOFF+(WALK+.6)/2),y=_s.y+(TH+1.2)/2-.1;   // portal: pillar + face over the walkway
    metal.push(new THREE.BoxGeometry(.8,TH+1.2,1).rotateY(ang).translate(_s.x-_s.tz*s*(TOFF+.3),y,_s.z+_s.tx*s*(TOFF+.3)));
    conc.push(new THREE.BoxGeometry(WALK+.9,TH+1.2,.6).rotateY(ang).translate(_s.x-_s.tz*o,y,_s.z+_s.tx*o));}}
  conc.push(ribbon(2*TOFF+.4,TH,4,0,a,b));
  for(const e of[a,b]){sample(e,_s);const ang=Math.atan2(_s.tx,_s.tz),span=2*TOFF+2*WALK;const g=new THREE.BoxGeometry(span,1.4,1.2);g.rotateY(ang);g.translate(_s.x,_s.y+TH+.5,_s.z);metal.push(g);
   const lit=new THREE.BoxGeometry(2*TOFF,.16,.1);lit.rotateY(ang);lit.translate(_s.x-_s.tx*(e===a?.62:-.62),_s.y+TH-.1,_s.z-_s.tz*(e===a?.62:-.62));emit.push(paintCol(lit,C(PAL.neon[0],3)));}
  const cols=PAL.tunnel??[0xff4fd8,0x35f2ff];let k=0;
  for(let d=a+2;d<b-1;d+=4,k++){sample(d,_s);const ang=Math.atan2(_s.tx,_s.tz),c=C(cols[k%cols.length],style==='arcade'?3.2:2.6);
   for(const s of[-1,1]){const g=new THREE.BoxGeometry(.12,TH-.6,.18);g.rotateY(ang);g.translate(_s.x-_s.tz*s*(TOFF-.08),_s.y+TH/2+.1,_s.z+_s.tx*s*(TOFF-.08));emit.push(paintCol(g,c));}
   const top=new THREE.BoxGeometry(2*TOFF-.2,.12,.18);top.rotateY(ang);top.translate(_s.x,_s.y+TH-.08,_s.z);emit.push(paintCol(top,c));}}
 // ---------- rails, lamps, signals ----------
 const metalMat=new THREE.MeshStandardMaterial({color:PAL.metal??0x50505c,metalness:.85,roughness:.38,normalMap:N_metal,normalScale:new THREE.Vector2(.4,.4),side:THREE.DoubleSide});
 const box=(w,h,d,x,y,z,ang,out)=>{const g=new THREE.BoxGeometry(w,h,d);g.rotateY(ang);g.translate(x,y,z);out.push(g);return g;};
 const cyl=(r,h,x,y,z,out)=>{const g=new THREE.CylinderGeometry(r,r,h,5);g.translate(x,y,z);out.push(g);return g;};
 for(const s of[-1,1]){const off=s*(W/2+.45);for(const [a,b] of openR){metal.push(wall(off,.9+CURB,.95+CURB,1,a,b,RES*2),wall(off,.5+CURB,.53+CURB,1,a,b,RES*2));for(let d=Math.ceil(a/8)*8;d<b;d+=8){pointAt(d,off,_v);metal.push(new THREE.CylinderGeometry(.03,.03,.95,4,1,true).translate(_v.x,_v.y+CURB+.47,_v.z));}}}
 const lampPos=[];const LS=T.lampSides??[-1,1];
 for(let d=6;d<L;d+=20){for(const s of LS){const dd=d+(s>0?10:0);if(dd>L||inTunnel(dd,3))continue;const {p,n,ang}=nAt(dd/L);const off=s*(W/2+.9),x=p.x+n.x*off,z=p.z+n.z*off,y0=p.y+CURB;
  metal.push(new THREE.CylinderGeometry(.07,.07,7,5,1,true).translate(x,y0+3.5,z));const hx=x-n.x*s*1.8,hz=z-n.z*s*1.8;
  const arm=new THREE.CylinderGeometry(.04,.04,1.9,5);arm.rotateZ(Math.PI/2);arm.rotateY(Math.atan2(-n.z,n.x)+Math.PI);arm.translate((x+hx)/2,y0+7.05,(z+hz)/2);metal.push(arm);
  box(.7,.12,.32,hx,y0+7,hz,ang,metal);emit.push(paintCol(new THREE.BoxGeometry(.55,.03,.24).rotateY(ang).translate(hx,y0+6.93,hz),C(PAL.lamp??0xffe2b8,2.2)));
  lampPos.push(V(hx,p.y+6.9,hz));}}
 for(const tt of T.signals||[]){const {p,n,ang,tg}=nAt(tt);const off=W/2+.6,x=p.x+n.x*off,z=p.z+n.z*off;cyl(.11,6,x,p.y+3+CURB,z,metal);
  const arm=new THREE.CylinderGeometry(.06,.06,5,6);arm.rotateZ(Math.PI/2);arm.rotateY(Math.atan2(-n.z,n.x));arm.translate(x-n.x*2.5,p.y+5.8,z-n.z*2.5);metal.push(arm);
  for(const k of[2.2,4.4]){const bx=x-n.x*k,bz=z-n.z*k;box(.38,1.1,.3,bx,p.y+5.2,bz,ang,metal);
   const cols=[0xff2a20,0xffa020,0x30ff80],lit=[.15,.15,3.2];cols.forEach((c,i)=>{const g=new THREE.CircleGeometry(.11,10);g.rotateY(ang+Math.PI);g.translate(bx-tg.x*.16,p.y+5.55-i*.34,bz-tg.z*.16);emit.push(paintCol(g,C(c,lit[i]+.25)));});}}
 // ---------- decals: boost chevrons, start grid; puddles; ramp ----------
 {const c=cv(256,128,(g)=>{g.fillStyle='#ffd23a';for(const y of[10,64]){g.beginPath();g.moveTo(14,y+46);g.lineTo(64,y);g.lineTo(114,y+46);g.lineTo(92,y+46);g.lineTo(64,y+20);g.lineTo(36,y+46);g.fill();}
   g.fillStyle='#fff';for(let i=0;i<8;i++)for(let j=0;j<2;j++)if((i+j)%2)g.fillRect(128+i*16,j*16+40,16,16);});
  const m=new THREE.MeshBasicMaterial({map:tex(c,true,false),transparent:true,color:new THREE.Color(1.6,1.6,1.6),depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  const gs=[];const quad=(s,x,w,h,u0,u1,v0,v1)=>{sample(s,_s);const g=new THREE.PlaneGeometry(w,h);const uv=g.attributes.uv;for(let i=0;i<4;i++)uv.setXY(i,u0+(u1-u0)*uv.getX(i),v0+(v1-v0)*uv.getY(i));
   g.rotateX(-Math.PI/2);g.rotateY(Math.atan2(_s.tx,_s.tz)+Math.PI);g.translate(_s.x-_s.tz*x,_s.y+.012,_s.z+_s.tx*x);gs.push(g);};
  for(const s of FEAT.boost)quad(s,0,3,3,0,.5,0,1);
  for(let x=-W/2+.75;x<W/2;x+=1.5)quad(2,x,1.5,.6,.5,1,.3,.6);
  const mm=new THREE.Mesh(merge(gs),m);mm.renderOrder=2;mm.layers.set(1);S.add(mm);}
 if(FEAT.puddles.length){const gs=[];for(const p of FEAT.puddles){sample(p.s,_s);const g=new THREE.CircleGeometry(p.r,20);g.scale(1,.6,1);g.rotateX(-Math.PI/2);g.rotateY(Math.atan2(_s.tx,_s.tz));g.translate(_s.x-_s.tz*p.x,_s.y+.008,_s.z+_s.tx*p.x);gs.push(g);}
  const m=new THREE.Mesh(merge(gs),new THREE.MeshStandardMaterial({color:PAL.puddle??0x1a2040,roughness:.02,metalness:.6,transparent:true,opacity:.85,envMapIntensity:2,polygonOffset:true,polygonOffsetFactor:-2}));m.renderOrder=2;S.add(m);}
 const R0=FEAT.ramp;{const gs=[];const steps=8;for(let i=0;i<steps;i++){const s0=R0.s0+i*R0.len/steps,s1=s0+R0.len/steps,h0=R0.h*i/steps,h1=R0.h*(i+1)/steps;
   const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),d=new THREE.Vector3();pointAt(s0,-W/2,a);pointAt(s0,W/2,b);pointAt(s1,-W/2,c);pointAt(s1,W/2,d);
   const g=new THREE.BufferGeometry();const P=[a.x,a.y+h0,a.z,b.x,b.y+h0,b.z,c.x,c.y+h1,c.z,d.x,d.y+h1,d.z];g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,i/steps,1,i/steps,0,(i+1)/steps,1,(i+1)/steps],2));g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();
   if(g.attributes.normal.getY(0)<0){g.setIndex([0,1,2,1,3,2]);g.computeVertexNormals();}gs.push(g);}
  {const a=new THREE.Vector3(),b=new THREE.Vector3();pointAt(R0.s0+R0.len,-W/2,a);pointAt(R0.s0+R0.len,W/2,b);const g=new THREE.BufferGeometry();
   g.setAttribute('position',new THREE.Float32BufferAttribute([a.x,a.y,a.z,b.x,b.y,b.z,a.x,a.y+R0.h,a.z,b.x,b.y+R0.h,b.z],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,.02,1,.02],2));g.setIndex([0,1,2,1,3,2]);g.computeVertexNormals();gs.push(g);}
  const rc=cv(64,256,(g)=>{const cols=['#ff3f6a','#ff9a2a','#ffe14d','#4dff8a','#35c8ff','#8a6bff'];for(let i=0;i<32;i++){g.fillStyle=cols[i%6];g.fillRect(0,i*8,64,8);}});
  const m=new THREE.Mesh(merge(gs),new THREE.MeshStandardMaterial({map:tex(rc,true,false),emissiveMap:tex(rc,true,false),emissive:0xffffff,emissiveIntensity:.6,roughness:.3,metalness:.2,side:THREE.DoubleSide}));S.add(m);}

 // finish gantry at s=0
 {const {p,n,ang,tg}=nAt(0);for(const s of[-1,1]){const x=p.x+n.x*s*(W/2+.8),z=p.z+n.z*s*(W/2+.8);box(.5,8,.5,x,p.y+4,z,ang,metal);}
  const span=W+2.2;for(const y of[7.2,8.4]){const g=new THREE.BoxGeometry(span,.18,.18);g.rotateY(ang);g.translate(p.x,p.y+y,p.z);metal.push(g);}
  for(let i=0;i<=12;i++){const o=-span/2+i*span/12,g=new THREE.BoxGeometry(.08,1.4,.08);g.rotateZ(i%2?.6:-.6);g.rotateY(ang);g.translate(p.x+n.x*o,p.y+7.8,p.z+n.z*o);metal.push(g);}
  for(const y of[7.05,8.55]){const g=new THREE.CylinderGeometry(.04,.04,span,6);g.rotateZ(Math.PI/2);g.rotateY(Math.atan2(-n.z,n.x));g.translate(p.x-tg.x*.15,p.y+y,p.z-tg.z*.15);emit.push(paintCol(g,C(PAL.neon[0],3)));}
  const scr=cv(1024,96,(g)=>{g.fillStyle='#06020c';g.fillRect(0,0,1024,96);g.font='bold 64px Arial';g.textAlign='center';g.fillStyle=PAL.gantryText??'#35f2ff';g.fillText('NEON RUSH  •  '+T.name.toUpperCase(),512,72,1000);g.fillStyle='rgba(0,0,0,.35)';for(let x=0;x<1024;x+=4)g.fillRect(x,0,1,96);});
  const gs=new THREE.Mesh(new THREE.PlaneGeometry(W-1,1.0),new THREE.MeshBasicMaterial({map:tex(scr,true,false),color:new THREE.Color(1.8,1.8,1.8),side:THREE.DoubleSide}));gs.position.set(p.x-tg.x*.12,p.y+7.8,p.z-tg.z*.12);gs.rotation.y=ang+Math.PI;S.add(gs);}

 // ---------- city: lit facades (one material, 8 chunks for culling), balconies, AC units, shop signs, wires ----------
 const CELL=128,FA=1024;
 const facadeAlb=cvk('facadeAlb'+PAL.facade,()=>cv(FA,FA,(g)=>{g.fillStyle='#5a5262';g.fillRect(0,0,FA,FA);noise(g,FA,FA,30000,70,120,2);g.globalCompositeOperation='multiply';g.fillStyle=PAL.facade??'#8a7c96';g.fillRect(0,0,FA,FA);g.globalCompositeOperation='source-over';
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const x=c*CELL,y=r*CELL;g.fillStyle='#3e3646';g.fillRect(x,y+CELL-14,CELL,14);g.fillStyle='#2a2430';g.fillRect(x+22,y+22,CELL-44,CELL-48);
   g.fillStyle='#14101a';g.fillRect(x+26,y+26,CELL-52,CELL-56);g.fillStyle='#4a4252';g.fillRect(x+CELL/2-2,y+26,4,CELL-56);g.fillRect(x+26,y+56,CELL-52,3);g.fillStyle='#6a6070';g.fillRect(x+18,y+CELL-28,CELL-36,5);}}));
 const facadeEm=cvk('facadeEm',()=>cv(FA,FA,(g)=>{g.fillStyle='#000';g.fillRect(0,0,FA,FA);
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const x=c*CELL+26,y=r*CELL+26,w=CELL-52,h=CELL-56,k=rnd();if(k<.32)continue;
   const pal=k<.7?['#ffcf8a','#a86a3a']:k<.82?['#8ad8ff','#2a4a7a']:k<.92?['#ff9ad8','#7a2a6a']:['#fff0d8','#b09070'];
   const gr=g.createLinearGradient(x,y,x,y+h);gr.addColorStop(0,pal[1]);gr.addColorStop(.6,pal[0]);gr.addColorStop(1,pal[1]);g.fillStyle=gr;g.fillRect(x,y,w,h);
   const lg=g.createRadialGradient(x+w*(.3+rnd()*.4),y+h*.35,2,x+w*.5,y+h*.4,w*.5);lg.addColorStop(0,'rgba(255,255,240,.8)');lg.addColorStop(1,'rgba(255,255,240,0)');g.fillStyle=lg;g.fillRect(x,y,w,h);
   g.fillStyle='rgba(0,0,0,.55)';g.fillRect(x,y,w,6);g.fillRect(x,y+h-12,w,12);
   g.fillStyle='rgba(10,6,14,.85)';const f=rnd();if(f<.4){g.fillRect(x+6+rnd()*20,y+h-28,26,16);g.fillRect(x+8,y+h-36,6,24);}else if(f<.7){g.beginPath();g.arc(x+w*.7,y+h-22,10,0,7);g.fill();g.fillRect(x+w*.7-2,y+h-14,4,14);}else{g.fillRect(x+w-30,y+12,22,h-24);}
   if(rnd()<.5){g.fillStyle='rgba(0,0,0,.45)';g.fillRect(x,y,w*(.15+rnd()*.25),h);}g.fillStyle='#000';g.fillRect(x+w/2-2,y,4,h);g.fillRect(x,y+30,w,3);}}));
 const facadeRough=cvk('facadeRough',()=>cv(256,256,(g,w,h)=>{g.fillStyle='#d0d0d0';g.fillRect(0,0,w,h);for(let r=0;r<8;r++)for(let c=0;c<8;c++){g.fillStyle='#181818';g.fillRect(c*32+6,r*32+6,20,18);}}));
 const facadeN=cvk('facadeN',()=>normalFrom(cv(512,512,(g)=>{g.fillStyle='#909090';g.fillRect(0,0,512,512);noise(g,512,512,8000,110,150,1);for(let r=0;r<8;r++)for(let c=0;c<8;c++){g.fillStyle='#303030';g.fillRect(c*64+10,r*64+10,44,40);g.fillStyle='#e0e0e0';g.fillRect(c*64+8,r*64+50,48,3);}}),3));
 seed=(T.seed||11)*57+3;
 const bMat=new THREE.MeshStandardMaterial({map:tex(facadeAlb),emissiveMap:tex(facadeEm),emissive:0xffffff,emissiveIntensity:1.5,roughnessMap:tex(facadeRough,false),roughness:1,metalness:.1,normalMap:tex(facadeN,false),vertexColors:true,envMapIntensity:1});
 const CH=8;const bG=[...Array(CH)].map(()=>[]);const acM=[],balM=[],signs=[],wires=[];const tints=PAL.tints??[[1,.92,1],[.85,.88,1],[1,.85,.85],[.9,.85,.95],[1,1,.95],[.8,.78,.85]];
 // a facade block: centre (x,z), yaw ang, w along / dp across, height h from y0
 function addBuilding(x,z,ang,w,dp,h,y0=0,tint){const g=new THREE.BoxGeometry(dp,h,w),uv=g.attributes.uv;for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;const su=f<2?w/24:dp/24,sv=f===2||f===3?w/24:h/25.6;uv.setXY(i,uv.getX(i)*su+(f*.37%1),uv.getY(i)*sv);}
  g.rotateY(ang);g.translate(x,y0+h/2,z);const ch=Math.floor(((Math.atan2(z-CZ,x-CX)/(2*Math.PI))+1)*CH)%CH;bG[ch].push(paintCol(g,new THREE.Color(...(tint||tints[Math.floor(rnd()*tints.length)]))));}
 const busy=new Uint8Array(Math.ceil(L/1.5)+2);{const sk=T.city&&T.city.skip;for(let i=0;i<busy.length;i++){const s=i*1.5;busy[i]=(yAt(s)>.05||inTunnel(s,6)||(sk&&sk(s)))?1:0;}}
 const busyAt=(a,b)=>{for(let s=a-6;s<=b+6;s+=1.5)if(busy[Math.floor(wrap(s)/1.5)])return true;return false;};
 const placed=[];
 if(T.city)for(const s of T.city.sides){let d=0;const cy=T.city;while(d<L-6){const w=3*(3+Math.floor(rnd()*3)),dp=cy.dp0+rnd()*cy.dpR,h=3.2*(cy.f0+Math.floor(rnd()*(cy.f1-cy.f0)))+.6;const tt=((d+w/2)%L)/L;
  if(busyAt(d,d+w)){d+=w+.2;continue;}
  const {p,n,ang}=nAt(tt),set=W/2+.35+WALK+(cy.gap||0),c=p.clone().addScaledVector(n,s*(set+dp/2));
  const rad=Math.hypot(w,dp)/2;let ok=minDistToTrack(c.x,c.z)>set+Math.min(dp,w)/2-1&&minDistToTrack(c.x+n.x*s*dp/2+Math.sin(ang)*w/2,c.z+n.z*s*dp/2+Math.cos(ang)*w/2)>set&&minDistToTrack(c.x-Math.sin(ang)*w/2,c.z-Math.cos(ang)*w/2)>set-.5&&minDistToTrack(c.x+Math.sin(ang)*w/2,c.z+Math.cos(ang)*w/2)>set-.5;
  for(const q of placed)if(ok&&Math.hypot(q.x-c.x,q.z-c.z)<(q.r+rad)*.8)ok=false;
  if(ok){placed.push({x:c.x,z:c.z,r:rad});addBuilding(c.x,c.z,ang,w,dp,h,GROUND);
   const fx=p.x+n.x*s*set,fz=p.z+n.z*s*set,out=-s,rot=ang+(s>0?0:Math.PI);
   for(let cI=0;cI<w/3;cI++)for(let fl=1;fl<Math.min(5,Math.floor(h/3.2));fl++){const along=-w/2+1.5+cI*3,rr=rnd();const base=V(fx,0,fz).addScaledVector(V(Math.sin(ang),0,Math.cos(ang)),along);
    if(rr<.1){const m=new THREE.Matrix4().makeRotationY(rot);m.setPosition(base.x+n.x*out*.55,fl*3.2+.05,base.z+n.z*out*.55);balM.push(m);}
    else if(rr<.2){const m=new THREE.Matrix4().makeRotationY(rot);m.setPosition(base.x+n.x*out*.25,fl*3.2+.55,base.z+n.z*out*.25);m.multiply(new THREE.Matrix4().makeTranslation(0,0,.7));acM.push(m);}}
   if(rnd()<.7)signs.push({x:fx,z:fz,n,out,ang,y:3.6+rnd()*Math.min(6,h-8),along:-w/2+.6});
   if(rnd()<.4)wires.push(V(fx,7+rnd()*4,fz));}
  d+=w+.2+(rnd()<.2?3:0);}}
  // ---------- track landmarks (tracks/*.js) push into the shared merged buckets or add their own few meshes ----------
 const ctx={THREE,S,cam,HIGH,rnd,V,C,merge,paintCol,cv,tex,glowT,normalFrom,noise,metal,emit,conc,signs,wires,metalMat,concMat,bMat,addBuilding,ribbon,wall,ranges,sample,pointAt,wrap,inTunnel,minDistToTrack,
  L,W,WALK,CURB,GROUND,TH,TOFF,bb,CX,CZ,RAD,lampPos,useMirror,N:{metal:N_metal,conc:N_conc,asph:N_asph},nAt,busyAt,yAt};
 const land=T.build?T.build(ctx)||{}:{};
 const nm=(m,n)=>{m.name=n;return m;};
 for(const arr of bG)if(arr.length)S.add(nm(new THREE.Mesh(merge(arr),bMat),'bld'));
 if(balM.length||acM.length){const gs=[new THREE.BoxGeometry(1.1,.12,2.2)];gs.push(new THREE.BoxGeometry(.04,.95,2.2).translate(.53,.5,0));for(let i=-1;i<=1;i+=2)gs.push(new THREE.BoxGeometry(1.1,.95,.04).translate(0,.5,i*1.08));
  const bal=new THREE.InstancedMesh(merge(gs),metalMat,Math.max(1,balM.length));bal.count=balM.length;balM.forEach((m,i)=>bal.setMatrixAt(i,m.clone().multiply(new THREE.Matrix4().makeRotationY(-Math.PI/2))));bal.layers.set(1);S.add(bal);
  const ac=new THREE.InstancedMesh(merge([new THREE.BoxGeometry(.85,.6,.45),new THREE.CylinderGeometry(.2,.2,.02,8).rotateX(Math.PI/2).translate(.15,0,.23)]),new THREE.MeshStandardMaterial({color:0xbab4c0,roughness:.5,metalness:.3,normalMap:N_metal}),Math.max(1,acM.length));
  ac.count=acM.length;acM.forEach((m,i)=>ac.setMatrixAt(i,m.clone().multiply(new THREE.Matrix4().makeRotationY(-Math.PI/2))));ac.layers.set(1);S.add(ac);}
 if(signs.length){const words=PAL.words??[['NOODLES','#ff4fc8'],['ARCADE','#35f2ff'],['ROBO FIX','#ffd23a'],['BOBA TEA','#7dff6a'],['DONUTS','#ff8a2a'],['PIZZA','#ff4f6a'],['KARAOKE','#b07aff'],['HOTEL','#35f2ff']];
  const signC=cv(1024,512,(g)=>{g.fillStyle='#0a0612';g.fillRect(0,0,1024,512);g.textAlign='center';g.textBaseline='middle';
   words.forEach(([w,c],i)=>{const x=(i%2)*512+256,y=(i>>1)*128+64;g.fillStyle='#120a1c';g.fillRect(x-246,y-58,492,116);g.strokeStyle=c;g.lineWidth=7;g.shadowColor=c;g.shadowBlur=16;g.strokeRect(x-238,y-50,476,100);
    g.font='900 70px "Arial Black",Arial,sans-serif';g.fillStyle='#fff';g.shadowBlur=22;g.fillText(w,x,y+4,450);g.shadowBlur=0;g.globalAlpha=.45;g.fillStyle=c;g.fillText(w,x,y+4,450);g.globalAlpha=1;});});
  const sg=[];signs.forEach((s,i)=>{const k=s.k??i%8,g=new THREE.PlaneGeometry(s.w||3.4,(s.w||3.4)/4),uv=g.attributes.uv;for(let j=0;j<4;j++)uv.setXY(j,((k%2)+uv.getX(j))/2,1-((k>>1)+1-uv.getY(j))/4);
   if(s.raw){g.rotateY(s.ang);g.translate(s.x,s.y,s.z);sg.push(g);return;}
   g.rotateY(s.ang+Math.PI);const ox=s.x+s.n.x*s.out*2.0,oz=s.z+s.n.z*s.out*2.0,tg=V(Math.sin(s.ang),0,Math.cos(s.ang));const sx=ox+tg.x*s.along,sz=oz+tg.z*s.along;g.translate(sx-tg.x*.04,s.y,sz-tg.z*.04);sg.push(g);
   box(3.6,1.05,.06,sx,s.y,sz,s.ang+Math.PI,metal);const arm=new THREE.BoxGeometry(.06,.06,.6);arm.rotateY(s.ang+Math.PI/2);arm.translate(s.x+s.n.x*s.out*.3+tg.x*s.along,s.y+.55,s.z+s.n.z*s.out*.3+tg.z*s.along);metal.push(arm);});
  S.add(new THREE.Mesh(merge(sg),new THREE.MeshBasicMaterial({map:tex(signC,true,false),color:new THREE.Color(1.7,1.7,1.7),side:THREE.DoubleSide})));}
 if(wires.length>1){const pts=[];for(let i=0;i<wires.length-1;i++){const a=wires[i],b=wires[(i*7+3)%wires.length];if(a.distanceTo(b)>40)continue;
   for(let k=0;k<12;k++){for(const t of[k/12,(k+1)/12]){const sag=Math.sin(t*Math.PI)*1.4;pts.push(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t-sag,a.z+(b.z-a.z)*t);}}}
  if(pts.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x140e18}));l.layers.set(1);S.add(l);}}
 // far skyline ring + moon
 {const fr=T.far??{n:80,h0:30,h1:110};const gs=[];for(let i=0;i<fr.n;i++){const a=i/fr.n*Math.PI*2,w=12+rnd()*16,h=fr.h0+rnd()*(fr.h1-fr.h0),g=new THREE.BoxGeometry(w,h,12);
   const uv=g.attributes.uv;for(let k=0;k<uv.count;k++)uv.setXY(k,uv.getX(k)*w/24,uv.getY(k)*h/25.6);g.rotateY(-a+Math.PI/2);g.translate(CX+Math.cos(a)*(RAD+130),(fr.y0??GROUND)+h/2,CZ+Math.sin(a)*(RAD+130));gs.push(g);}
  const m=new THREE.Mesh(merge(gs),new THREE.MeshBasicMaterial({map:bMat.emissiveMap,color:PAL.farTint??0x8060a0}));m.layers.set(1);S.add(m);}
 {const mp=PAL.moon??[0,75,-330];const m=new THREE.Mesh(new THREE.CircleGeometry(10,40),new THREE.MeshBasicMaterial({color:C(0xfff0d0,1.3),fog:false}));m.position.set(CX+mp[0],mp[1],CZ+mp[2]-RAD*.4);m.lookAt(CX,0,CZ);S.add(m);}
 {const pool=[],glow=[];for(const lp of lampPos){const g=new THREE.PlaneGeometry(7,7);g.rotateX(-Math.PI/2);g.translate(lp.x,lp.y-6.9+.02,lp.z);pool.push(g);const h=new THREE.PlaneGeometry(1.1,1.1).rotateY(rnd()*3);h.translate(lp.x,lp.y-.15,lp.z);glow.push(h);}
  if(pool.length){const pm=new THREE.Mesh(merge(pool),new THREE.MeshBasicMaterial({map:glowT,color:PAL.pool??0xffa860,transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3}));pm.renderOrder=3;pm.layers.set(1);S.add(pm);
   const gm=new THREE.Mesh(merge(glow),new THREE.MeshBasicMaterial({map:glowT,color:0xffd0a0,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));gm.renderOrder=4;gm.layers.set(1);S.add(gm);}}
 const lay1=m=>{m.layers.set(1);S.add(m);return m;};
 if(conc.length)lay1(nm(new THREE.Mesh(merge(conc),concMat),'conc'));   // layer 1 = not in the mirror pass (saves a full copy)
 lay1(nm(new THREE.Mesh(merge(metal),metalMat),'metal'));
 S.add(nm(new THREE.Mesh(merge(emit),new THREE.MeshBasicMaterial({vertexColors:true})),'emit'));

 // kit shared with karts.js / rain.js / obstacles.js / items.js (read-only helpers)
 const kit={THREE,S,cam,HIGH,merge,paintCol,cv,tex,rnd,RoundedBoxGeometry,glowT,shadowT,N:{flake:N_flake,tread:N_tread,fur:N_fur,metal:N_metal,conc:N_conc,asph:N_asph},metalMat,lampPos,W,L,sample,pointAt,wrap,track:T,inTunnel,tunnelCover,heightAt};
 const hero=buildHero(kit,custom);   // rivals are built by racers.js (palette meshes)
 // particles
 const SP=36,sparks=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.035,0),new THREE.MeshBasicMaterial({color:0xffffff}),SP);sparks.frustumCulled=false;sparks.layers.set(1);S.add(sparks);
 const sv=new Float32Array(SP);for(let i=0;i<SP;i++)sv[i]=rnd();const sparkCol=new THREE.Color();
 const SPR=HIGH?28:12,spray=new THREE.InstancedMesh(new THREE.PlaneGeometry(.5,.5),new THREE.MeshBasicMaterial({map:glowT,color:0x9088a8,transparent:true,opacity:.1,depthWrite:false}),SPR);spray.frustumCulled=false;spray.layers.set(1);S.add(spray);
 const spv=new Float32Array(SPR);for(let i=0;i<SPR;i++)spv[i]=rnd();
 const SLN=26,sl=new THREE.InstancedMesh(new THREE.PlaneGeometry(.012,3),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false}),SLN);sl.frustumCulled=false;sl.layers.set(1);S.add(sl);
 const slp=new Float32Array(SLN*3);for(let i=0;i<SLN;i++){const a=rnd()*6.28,r=1.6+rnd()*2.5;slp[i*3]=Math.cos(a)*r;slp[i*3+1]=1+Math.sin(a)*r*.6;slp[i*3+2]=rnd()*20;}
 cam.layers.enable(1);

 let composer=null,bloom=null,mb=null;
 if(HIGH){composer=new EffectComposer(R);composer.addPass(new RenderPass(S,cam));bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth*DPR/2,innerHeight*DPR/2),PAL.bloom??0.38,0.35,0.9);composer.addPass(bloom);
  mb=new ShaderPass({uniforms:{tDiffuse:{value:null},center:{value:new THREE.Vector2(.5,.56)},strength:{value:.0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 center;uniform float strength;varying vec2 vUv;void main(){vec2 d=vUv-center;float m=smoothstep(.32,.85,length(d*vec2(1.3,1.)));vec4 c=vec4(0.);for(int i=0;i<6;i++){c+=texture2D(tDiffuse,vUv-d*strength*m*float(i)/5.);}gl_FragColor=c/6.;}`});
  composer.addPass(mb);composer.addPass(new OutputPass());}
 function resize(){const w=innerWidth,h=innerHeight;R.setSize(w,h);cam.aspect=w/h;cam.fov=w<h?70:58;cam.updateProjectionMatrix();
  if(composer){composer.setSize(w,h);bloom.resolution.set(w*DPR/2,h*DPR/2);}if(mirror)mirror.getRenderTarget().setSize(Math.round(w*DPR/2),Math.round(h*DPR/2));}

 const M4=new THREE.Matrix4(),v=new THREE.Vector3(),q2=new THREE.Quaternion(),qq=new THREE.Quaternion(),sc=new THREE.Vector3(),one=new THREE.Vector3(1,1,1),Yax=V(0,1,0),qx90=new THREE.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2),o2={};
 let cover=0,T0=0;const BLOOM0=PAL.bloom??.38;
 // fx state from game: speed 0..1, drift level 0..3, boosting, heroS
 function updateFx(dt,g){T0+=dt;sample(g.heroS,o2);
  qq.setFromAxisAngle(Yax,Math.atan2(cam.position.x-hero.position.x,cam.position.z-hero.position.z));
  const dl=g.drift;sparkCol.setHex(dl>=3?0xff3fd8:dl>=2?0xff9a2a:0x35f2ff).multiplyScalar(3);
  for(let i=0;i<SP;i++){let a=sv[i]+dt*2.2;if(a>1)a-=1;sv[i]=a;const s=i%2?1:-1;const on=dl>0&&g.air<=0;hero.localToWorld(v.set(s*(.62+a*.4),.08+a*.45-a*a*.55,.75+a*1.1));sc.setScalar(on?1.4*(1-a):0);M4.compose(v,q2.identity(),sc);sparks.setMatrixAt(i,M4);sparks.setColorAt(i,sparkCol);}
  sparks.instanceMatrix.needsUpdate=true;sparks.instanceColor.needsUpdate=true;
  for(let i=0;i<SPR;i++){let a=spv[i]+dt*1.6;if(a>1)a-=1;spv[i]=a;const s=i%2?1:-1;hero.localToWorld(v.set(s*(.62+a*.3),.15+a*.4,.85+a*1.6));sc.setScalar((.3+a*.9)*g.speed01*(1-cover));M4.compose(v,cam.quaternion,sc);spray.setMatrixAt(i,M4);}spray.instanceMatrix.needsUpdate=true;
  const showSL=(!HIGH||g.boost>0)&&g.speed01>.5;sl.visible=showSL;
  if(showSL){for(let i=0;i<SLN;i++){let z=slp[i*3+2]-dt*50;if(z<0)z+=20;slp[i*3+2]=z;cam.localToWorld(v.set(slp[i*3],slp[i*3+1]-1,-z-2));q2.copy(cam.quaternion).multiply(qx90);M4.compose(v,q2,one);sl.setMatrixAt(i,M4);}sl.instanceMatrix.needsUpdate=true;}
  if(mb)mb.uniforms.strength.value=.012+.03*g.speed01+(g.boost>0?.02:0);
  // tunnel lighting: sky light fades, the tunnel's own neon colour takes over the rim light, a touch more bloom
  const want=g.cover??tunnelCover(g.heroS);cover+=(want-cover)*Math.min(1,dt*5);
  hemi.intensity=LB.hemi*(1-.55*cover);key.intensity=LB.key*(1-.85*cover);rimL.intensity=LB.rim+1.3*cover;rimL.color.copy(LB.rimC).lerp(LB.tunC,cover);S.environmentIntensity=.8*(1-.45*cover);
  if(bloom)bloom.strength=BLOOM0+.22*cover;
  land.update&&land.update(dt,T0,g);}
 function render(){if(composer)composer.render();else R.render(S,cam);}
 // free every GPU resource of this scene (track switch)
 function dispose(){const texs=new Set(),mats=new Set(),geos=new Set();
  S.traverse(o=>{if(o.geometry)geos.add(o.geometry);const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms){mats.add(m);for(const k in m){const v=m[k];if(v&&v.isTexture)texs.add(v);}if(m.uniforms)for(const k in m.uniforms){const v=m.uniforms[k].value;if(v&&v.isTexture)texs.add(v);}}});
  if(mirror)mirror.dispose();for(const g of geos)g.dispose();for(const m of mats)m.dispose();for(const t of texs)t.dispose();
  envRT&&envRT.dispose();if(S.background&&S.background.isTexture)S.background.dispose();for(const t of[bMat.emissiveMap])t&&t.dispose();
  if(composer){for(const p of composer.passes)p.dispose&&p.dispose();composer.dispose();}
  S.clear();S.environment=null;S.background=null;S.fog=null;}
 return {hero,kit,resize,render,updateFx,mirror,composer,lampPos,dispose,land,get cover(){return cover;}};
}
const _v=new THREE.Vector3();
