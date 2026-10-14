// Neon Rush world: approved M1 "scene3" look, rebuilt around a closed race loop. Original IP only.
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

// ---------- track: closed loop, metres; sampled every 0.5 m for fast lookups ----------
export const W=12;const WALK=4.5,CURB=.15;
const curve=new THREE.CatmullRomCurve3([[0,0,70],[0,0,-30],[-8,0,-82],[-46,0,-112],[-104,0,-104],[-136,0,-58],[-128,0,0],[-98,0,34],[-108,0,86],[-74,0,128],[-28,0,128]].map(p=>V(...p)),true,'centripetal');
export const L=curve.getLength();const STEP=.5,NS=Math.ceil(L/STEP);
const TX=new Float32Array(NS+1),TZ=new Float32Array(NS+1),PX=new Float32Array(NS+1),PZ=new Float32Array(NS+1),KU=new Float32Array(NS+1);
for(let i=0;i<=NS;i++){const t=(i*STEP/L)%1,p=curve.getPointAt(t),tg=curve.getTangentAt(t);PX[i]=p.x;PZ[i]=p.z;TX[i]=tg.x;TZ[i]=tg.z;}
for(let i=0;i<=NS;i++){const a=(i+NS-4)%NS,b=(i+4)%NS;let d=Math.atan2(TX[b],TZ[b])-Math.atan2(TX[a],TZ[a]);while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;KU[i]=d/(8*STEP);}
export const wrap=s=>((s%L)+L)%L;
// sample(s) -> {x,z,tx,tz,k}; k = curvature (rad/m, + = turning left from driver's view? sign used consistently)
export function sample(s,o){s=wrap(s);const f=s/STEP,i=Math.floor(f),u=f-i,j=Math.min(i+1,NS);
 o.x=PX[i]+(PX[j]-PX[i])*u;o.z=PZ[i]+(PZ[j]-PZ[i])*u;let tx=TX[i]+(TX[j]-TX[i])*u,tz=TZ[i]+(TZ[j]-TZ[i])*u;const l=Math.hypot(tx,tz)||1;o.tx=tx/l;o.tz=tz/l;o.k=KU[i]+(KU[j]-KU[i])*u;return o;}
const _s={};const nAt=(t)=>{sample(t*L,_s);return{p:V(_s.x,0,_s.z),tg:V(_s.tx,0,_s.tz),n:V(-_s.tz,0,_s.tx),ang:Math.atan2(_s.tx,_s.tz)};};
// world point at (s, lateral x)
export function pointAt(s,x,out){sample(s,_s);return out.set(_s.x-_s.tz*x,0,_s.z+_s.tx*x);}
function minDistToTrack(x,z){let m=1e9;for(let i=0;i<NS;i+=6){const d=(PX[i]-x)**2+(PZ[i]-z)**2;if(d<m)m=d;}return Math.sqrt(m);}

// track features (distance along track, metres)
export const FEAT={boost:[L*.08,L*.087,L*.094],ramp:{s0:L*.36,len:7,h:1.1},puddles:[],gantry:0};
for(let i=0;i<9;i++)FEAT.puddles.push({s:L*.62+i*9+rnd()*4,x:(rnd()-.5)*(W-3),r:1.6+rnd()*1.2});

export function buildWorld(R,S,cam,HIGH){
 const DPR=R.getPixelRatio();
 const FOGC=new THREE.Color(0x6a3a78);S.fog=new THREE.FogExp2(FOGC,0.0105);
 {const env=new THREE.Scene();
  const sky=cv(4,256,(g)=>{const r=g.createLinearGradient(0,0,0,256);r.addColorStop(0,'#1a0c34');r.addColorStop(.42,'#5a2a80');r.addColorStop(.5,'#ff8a7a');r.addColorStop(.56,'#3a2040');r.addColorStop(1,'#120a18');g.fillStyle=r;g.fillRect(0,0,4,256);});
  env.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.MeshBasicMaterial({map:tex(sky,true,false),side:THREE.BackSide})));
  const em=(c,i,w,h,x,y,z,ry)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry;env.add(m);return m;};
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;em([0xff3fd8,0x35f2ff,0xffb060,0x8a6bff][i%4],6,6+rnd()*6,2+rnd()*3,Math.cos(a)*40,6+rnd()*10,Math.sin(a)*40,-a+Math.PI/2);}
  em(0xffd0a0,8,30,4,0,30,0,0).rotation.x=Math.PI/2;
  const pm=new THREE.PMREMGenerator(R);S.environment=pm.fromScene(env,0.03).texture;S.environmentIntensity=0.8;pm.dispose();}
 S.background=tex(cv(4,256,(g)=>{const r=g.createLinearGradient(0,0,0,256);r.addColorStop(0,'#140a2c');r.addColorStop(.38,'#3c1a66');r.addColorStop(.6,'#a8407e');r.addColorStop(.75,'#e8787a');r.addColorStop(1,'#f0a888');g.fillStyle=r;g.fillRect(0,0,4,256);}),true,false);
 S.add(new THREE.HemisphereLight(0x9a80d0,0x281830,0.6));
 const key=new THREE.DirectionalLight(0xffa080,1.2);key.position.set(-40,25,-90);S.add(key);
 const rimL=new THREE.DirectionalLight(0x70d8ff,0.7);rimL.position.set(30,15,40);S.add(rimL);

 // maps
 const asphH=cv(512,512,(g,w,h)=>{g.fillStyle='#808080';g.fillRect(0,0,w,h);noise(g,w,h,60000,70,190,1);g.filter='blur(1.2px)';g.drawImage(g.canvas,0,0);g.filter='none';});
 const puddle=cv(512,512,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);for(let i=0;i<9;i++){const x=rnd()*w,y=rnd()*h,r=14+rnd()*34;
  for(let k=0;k<4;k++){const gr=g.createRadialGradient(x+(rnd()-.5)*r,y+(rnd()-.5)*r*.5,0,x,y,r);gr.addColorStop(0,'rgba(0,0,0,.9)');gr.addColorStop(.6,'rgba(0,0,0,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r*1.5,y-r*1.5,r*3,r*3);}}});
 const roadAlb=cv(512,512,(g,w,h)=>{g.drawImage(asphH,0,0);g.globalCompositeOperation='multiply';g.fillStyle='#3a3640';g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';
  g.globalAlpha=.55;g.globalCompositeOperation='multiply';g.drawImage(puddle,0,0);g.globalCompositeOperation='source-over';g.globalAlpha=1;
  g.fillStyle='rgba(235,230,215,.9)';for(const u of[1/3,2/3])g.fillRect(u*w-4,20,8,200);g.fillRect(14,0,10,h);g.fillRect(w-24,0,10,h);});
 const roadRough=cv(512,512,(g,w,h)=>{g.drawImage(asphH,0,0);g.globalCompositeOperation='multiply';g.fillStyle='#b0b0b0';g.fillRect(0,0,w,h);g.drawImage(puddle,0,0);g.globalCompositeOperation='lighten';g.fillStyle='#141414';g.fillRect(0,0,w,h);});
 const roadAlpha=cv(512,512,(g,w,h)=>{g.drawImage(puddle,0,0);g.globalCompositeOperation='lighten';g.fillStyle='#707070';g.fillRect(0,0,w,h);});
 const concH=cv(256,256,(g,w,h)=>{g.fillStyle='#909090';g.fillRect(0,0,w,h);noise(g,w,h,9000,100,170,1.5);g.fillStyle='#303030';g.fillRect(0,0,w,3);g.fillRect(0,0,3,h);g.fillRect(0,h/2,w,2);});
 const concAlb=cv(256,256,(g,w,h)=>{g.drawImage(concH,0,0);g.globalCompositeOperation='multiply';g.fillStyle='#8a8090';g.fillRect(0,0,w,h);});
 const metalH=cv(256,256,(g,w,h)=>{g.fillStyle='#808080';g.fillRect(0,0,w,h);for(let i=0;i<900;i++){const v=90+rnd()*80|0;g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(0,rnd()*h,w,1);}});
 const flakeH=cv(128,128,(g,w,h)=>{g.fillStyle='#808080';g.fillRect(0,0,w,h);noise(g,w,h,6000,0,255,1);});
 const treadH=cv(64,256,(g,w,h)=>{g.fillStyle='#c0c0c0';g.fillRect(0,0,w,h);g.fillStyle='#202020';for(let y=0;y<h;y+=12){g.fillRect(20,y,4,7);g.fillRect(40,y+6,4,7);}g.fillRect(31,0,2,h);});
 const furH=cv(128,128,(g,w,h)=>{g.fillStyle='#808080';g.fillRect(0,0,w,h);for(let i=0;i<1800;i++){const v=40+rnd()*180|0,x=rnd()*w,y=rnd()*h;g.strokeStyle=`rgb(${v},${v},${v})`;g.beginPath();g.moveTo(x,y);g.lineTo(x+(rnd()-.5)*3,y+4+rnd()*6);g.stroke();}});
 const N_asph=tex(normalFrom(asphH,1.5)),N_conc=tex(normalFrom(concH,2)),N_metal=tex(normalFrom(metalH,1.5)),N_flake=tex(normalFrom(flakeH,6)),N_tread=tex(normalFrom(treadH,4)),N_fur=tex(normalFrom(furH,3));
 const glowT=tex(cv(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.2,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);}),false,false);
 const shadowT=tex(cv(64,64,(g)=>{const r=g.createRadialGradient(32,32,2,32,32,32);r.addColorStop(0,'rgba(0,0,0,.95)');r.addColorStop(.5,'rgba(0,0,0,.6)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);}),false,false);

 const N=Math.ceil(L/1.5);
 function ribbon(w,y,vlen,off=0){const g=new THREE.BufferGeometry(),pos=[],uv=[],idx=[];
  for(let i=0;i<=N;i++){sample(i/N*L,_s);for(const s of[-1,1]){const o=off+s*w/2;pos.push(_s.x-_s.tz*o,y,_s.z+_s.tx*o);uv.push((s+1)/2,i/N*L/vlen);}
   if(i<N){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  if(g.attributes.normal.getY(0)<0){for(let i=0;i<idx.length;i+=3){const t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t;}g.setIndex(idx);g.computeVertexNormals();}return g;}
 function wall(off,y0,y1,vlen){const g=new THREE.BufferGeometry(),pos=[],uv=[],idx=[];
  for(let i=0;i<=N;i++){sample(i/N*L,_s);for(const y of[y0,y1]){pos.push(_s.x-_s.tz*off,y,_s.z+_s.tx*off);uv.push(i/N*L/vlen,(y-y0)/(y1-y0));}
   if(i<N){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
 const roadMat=new THREE.MeshStandardMaterial({map:tex(roadAlb),normalMap:N_asph,normalScale:new THREE.Vector2(.3,.3),roughnessMap:tex(roadRough,false),roughness:1,metalness:0,envMapIntensity:1.2});
 if(HIGH){roadMat.alphaMap=tex(roadAlpha,false);roadMat.transparent=true;}
 const road=new THREE.Mesh(ribbon(W,0,12),roadMat);road.renderOrder=1;S.add(road);
 let mirror=null;
 if(HIGH){mirror=new Reflector(new THREE.PlaneGeometry(700,700),{textureWidth:Math.round(innerWidth*DPR/2),textureHeight:Math.round(innerHeight*DPR/2),color:0xa098b8,clipBias:0.003});
  mirror.rotation.x=-Math.PI/2;mirror.position.set(-60,-0.01,10);S.add(mirror);}
 else{const gnd=new THREE.Mesh(new THREE.PlaneGeometry(700,700),new THREE.MeshStandardMaterial({color:0x14101a,roughness:.3}));gnd.rotation.x=-Math.PI/2;gnd.position.set(-60,-.02,10);S.add(gnd);}
 const concMat=new THREE.MeshStandardMaterial({map:tex(concAlb),normalMap:N_conc,roughness:.55,metalness:0,side:THREE.DoubleSide,envMapIntensity:.8});
 {const gs=[];for(const s of[-1,1]){gs.push(wall(s*W/2,0,CURB,1.2));gs.push(ribbon(.35,CURB,1.2,s*(W/2+.175)));gs.push(ribbon(WALK,CURB,2,s*(W/2+.35+WALK/2)));}S.add(new THREE.Mesh(merge(gs),concMat));}
 {const m=new THREE.Mesh(merge([wall(-W/2+.01,.05,.09,1),wall(W/2-.01,.05,.09,1)]),new THREE.MeshBasicMaterial({color:new THREE.Color(0x35f2ff).multiplyScalar(2.2),side:THREE.DoubleSide}));S.add(m);}
 // decals: boost chevrons (shape + colour), start grid line, puddle zone
 {const c=cv(256,128,(g)=>{g.fillStyle='#ffd23a';for(const y of[10,64]){g.beginPath();g.moveTo(14,y+46);g.lineTo(64,y);g.lineTo(114,y+46);g.lineTo(92,y+46);g.lineTo(64,y+20);g.lineTo(36,y+46);g.fill();}
   g.fillStyle='#fff';for(let i=0;i<8;i++)for(let j=0;j<2;j++)if((i+j)%2)g.fillRect(128+i*16,j*16+40,16,16);});
  const m=new THREE.MeshBasicMaterial({map:tex(c,true,false),transparent:true,color:new THREE.Color(1.6,1.6,1.6),depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  const gs=[];const quad=(s,x,w,h,u0,u1,v0,v1)=>{sample(s,_s);const g=new THREE.PlaneGeometry(w,h);const uv=g.attributes.uv;for(let i=0;i<4;i++)uv.setXY(i,u0+(u1-u0)*uv.getX(i),v0+(v1-v0)*uv.getY(i));
   g.rotateX(-Math.PI/2);g.rotateY(Math.atan2(_s.tx,_s.tz)+Math.PI);g.translate(_s.x-_s.tz*x,.012,_s.z+_s.tx*x);gs.push(g);};
  for(const s of FEAT.boost)quad(s,0,3,3,0,.5,0,1);
  for(let x=-W/2+.75;x<W/2;x+=1.5)quad(2,x,1.5,.6,.5,1,.3,.6);
  const mm=new THREE.Mesh(merge(gs),m);mm.renderOrder=2;mm.layers.set(1);S.add(mm);}
 {const gs=[];for(const p of FEAT.puddles){sample(p.s,_s);const g=new THREE.CircleGeometry(p.r,20);g.scale(1,.6,1);g.rotateX(-Math.PI/2);g.rotateY(Math.atan2(_s.tx,_s.tz));g.translate(_s.x-_s.tz*p.x,.008,_s.z+_s.tx*p.x);gs.push(g);}
  const m=new THREE.Mesh(merge(gs),new THREE.MeshStandardMaterial({color:0x1a2040,roughness:.02,metalness:.6,transparent:true,opacity:.85,envMapIntensity:2,polygonOffset:true,polygonOffsetFactor:-2}));m.renderOrder=2;S.add(m);}
 // ramp (Rainbow Ramp): wedge across the road, rainbow stripes
 const R0=FEAT.ramp;{const gs=[];const steps=8;for(let i=0;i<steps;i++){const s0=R0.s0+i*R0.len/steps,s1=s0+R0.len/steps,h0=R0.h*i/steps,h1=R0.h*(i+1)/steps;
   const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),d=new THREE.Vector3();pointAt(s0,-W/2,a);pointAt(s0,W/2,b);pointAt(s1,-W/2,c);pointAt(s1,W/2,d);
   const g=new THREE.BufferGeometry();const P=[a.x,h0,a.z,b.x,h0,b.z,c.x,h1,c.z,d.x,h1,d.z];g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,i/steps,1,i/steps,0,(i+1)/steps,1,(i+1)/steps],2));g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();
   if(g.attributes.normal.getY(0)<0){g.setIndex([0,1,2,1,3,2]);g.computeVertexNormals();}gs.push(g);}
  {const a=new THREE.Vector3(),b=new THREE.Vector3();pointAt(R0.s0+R0.len,-W/2,a);pointAt(R0.s0+R0.len,W/2,b);const g=new THREE.BufferGeometry();
   g.setAttribute('position',new THREE.Float32BufferAttribute([a.x,0,a.z,b.x,0,b.z,a.x,R0.h,a.z,b.x,R0.h,b.z],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,.02,1,.02],2));g.setIndex([0,1,2,1,3,2]);g.computeVertexNormals();gs.push(g);}
  const rc=cv(64,256,(g)=>{const cols=['#ff3f6a','#ff9a2a','#ffe14d','#4dff8a','#35c8ff','#8a6bff'];for(let i=0;i<32;i++){g.fillStyle=cols[i%6];g.fillRect(0,i*8,64,8);}});
  const m=new THREE.Mesh(merge(gs),new THREE.MeshStandardMaterial({map:tex(rc,true,false),emissiveMap:tex(rc,true,false),emissive:0xffffff,emissiveIntensity:.6,roughness:.3,metalness:.2,side:THREE.DoubleSide}));S.add(m);}

 // shared metal + emitters
 const metal=[],emit=[];
 const metalMat=new THREE.MeshStandardMaterial({color:0x50505c,metalness:.85,roughness:.38,normalMap:N_metal,normalScale:new THREE.Vector2(.4,.4),side:THREE.DoubleSide});
 const box=(w,h,d,x,y,z,ang,out)=>{const g=new THREE.BoxGeometry(w,h,d);g.rotateY(ang);g.translate(x,y,z);out.push(g);return g;};
 const cyl=(r,h,x,y,z,out)=>{const g=new THREE.CylinderGeometry(r,r,h,5);g.translate(x,y,z);out.push(g);return g;};
 for(const s of[-1,1]){const off=s*(W/2+.45);metal.push(wall(off,.9+CURB,.95+CURB,1),wall(off,.5+CURB,.53+CURB,1));for(let d=0;d<L;d+=3){pointAt(d,off,_v);cyl(.025,.95,_v.x,CURB+.47,_v.z,metal);}}
 const lampPos=[];
 for(let d=6;d<L;d+=20){for(const s of[-1,1]){const dd=d+(s>0?10:0);if(dd>L)continue;const {p,n,ang}=nAt(dd/L);const off=s*(W/2+.9),x=p.x+n.x*off,z=p.z+n.z*off;
  cyl(.07,7,x,CURB+3.5,z,metal);const hx=x-n.x*s*1.8,hz=z-n.z*s*1.8;
  const arm=new THREE.CylinderGeometry(.04,.04,1.9,5);arm.rotateZ(Math.PI/2);arm.rotateY(Math.atan2(-n.z,n.x)+Math.PI);arm.translate((x+hx)/2,7.05+CURB,(z+hz)/2);metal.push(arm);
  box(.7,.12,.32,hx,7+CURB,hz,ang+Math.PI/2,metal);emit.push(paintCol(new THREE.BoxGeometry(.55,.03,.24).rotateY(ang+Math.PI/2).translate(hx,6.93+CURB,hz),new THREE.Color(0xffe2b8).multiplyScalar(2.2)));
  lampPos.push(V(hx,6.9,hz));}}
 for(const tt of[.2,.5,.8]){const {p,n,ang,tg}=nAt(tt);const off=W/2+.6,x=p.x+n.x*off,z=p.z+n.z*off;cyl(.11,6,x,3+CURB,z,metal);
  const arm=new THREE.CylinderGeometry(.06,.06,5,6);arm.rotateZ(Math.PI/2);arm.rotateY(Math.atan2(-n.z,n.x));arm.translate(x-n.x*2.5,5.8,z-n.z*2.5);metal.push(arm);
  for(const k of[2.2,4.4]){const bx=x-n.x*k,bz=z-n.z*k;box(.38,1.1,.3,bx,5.2,bz,ang,metal);
   const cols=[0xff2a20,0xffa020,0x30ff80],lit=[.15,.15,3.2];cols.forEach((c,i)=>{const g=new THREE.CircleGeometry(.11,10);g.rotateY(ang+Math.PI);g.translate(bx-tg.x*.16,5.55-i*.34,bz-tg.z*.16);emit.push(paintCol(g,new THREE.Color(c).multiplyScalar(lit[i]+.25)));});}}
 // finish gantry at s=0
 let gantryScreen;
 {const {p,n,ang,tg}=nAt(0);for(const s of[-1,1]){const x=p.x+n.x*s*(W/2+.8),z=p.z+n.z*s*(W/2+.8);box(.5,8,.5,x,4,z,ang,metal);}
  const span=W+2.2;for(const y of[7.2,8.4]){const g=new THREE.BoxGeometry(span,.18,.18);g.rotateY(ang+Math.PI/2);g.translate(p.x,y,p.z);metal.push(g);}
  for(let i=0;i<=12;i++){const o=-span/2+i*span/12,g=new THREE.BoxGeometry(.08,1.4,.08);g.rotateZ(i%2?.6:-.6);g.rotateY(ang+Math.PI/2);g.translate(p.x+n.x*o,7.8,p.z+n.z*o);metal.push(g);}
  for(const y of[7.05,8.55]){const g=new THREE.CylinderGeometry(.04,.04,span,6);g.rotateZ(Math.PI/2);g.rotateY(Math.atan2(-n.z,n.x));g.translate(p.x-tg.x*.15,y,p.z-tg.z*.15);emit.push(paintCol(g,new THREE.Color(0xff3fd8).multiplyScalar(3)));}
  const scr=cv(1024,96,(g)=>{g.fillStyle='#06020c';g.fillRect(0,0,1024,96);g.font='bold 64px Arial';g.textAlign='center';g.fillStyle='#35f2ff';g.fillText('NEON RUSH  •  NEON SKY CITY',512,72);g.fillStyle='rgba(0,0,0,.35)';for(let x=0;x<1024;x+=4)g.fillRect(x,0,1,96);});
  const sm=new THREE.MeshBasicMaterial({map:tex(scr,true,false),color:new THREE.Color(1.8,1.8,1.8),side:THREE.DoubleSide});gantryScreen=new THREE.Mesh(new THREE.PlaneGeometry(W-1,1.0),sm);gantryScreen.position.set(p.x-tg.x*.12,7.8,p.z-tg.z*.12);gantryScreen.rotation.y=ang+Math.PI;S.add(gantryScreen);}

 // city
 const CELL=128,FA=1024;
 const facadeAlb=cv(FA,FA,(g)=>{g.fillStyle='#5a5262';g.fillRect(0,0,FA,FA);noise(g,FA,FA,30000,70,120,2);g.globalCompositeOperation='multiply';g.fillStyle='#8a7c96';g.fillRect(0,0,FA,FA);g.globalCompositeOperation='source-over';
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const x=c*CELL,y=r*CELL;g.fillStyle='#3e3646';g.fillRect(x,y+CELL-14,CELL,14);g.fillStyle='#2a2430';g.fillRect(x+22,y+22,CELL-44,CELL-48);
   g.fillStyle='#14101a';g.fillRect(x+26,y+26,CELL-52,CELL-56);g.fillStyle='#4a4252';g.fillRect(x+CELL/2-2,y+26,4,CELL-56);g.fillRect(x+26,y+56,CELL-52,3);g.fillStyle='#6a6070';g.fillRect(x+18,y+CELL-28,CELL-36,5);}});
 const facadeEm=cv(FA,FA,(g)=>{g.fillStyle='#000';g.fillRect(0,0,FA,FA);
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const x=c*CELL+26,y=r*CELL+26,w=CELL-52,h=CELL-56,k=rnd();if(k<.32)continue;
   const pal=k<.7?['#ffcf8a','#a86a3a']:k<.82?['#8ad8ff','#2a4a7a']:k<.92?['#ff9ad8','#7a2a6a']:['#fff0d8','#b09070'];
   const gr=g.createLinearGradient(x,y,x,y+h);gr.addColorStop(0,pal[1]);gr.addColorStop(.6,pal[0]);gr.addColorStop(1,pal[1]);g.fillStyle=gr;g.fillRect(x,y,w,h);
   const lg=g.createRadialGradient(x+w*(.3+rnd()*.4),y+h*.35,2,x+w*.5,y+h*.4,w*.5);lg.addColorStop(0,'rgba(255,255,240,.8)');lg.addColorStop(1,'rgba(255,255,240,0)');g.fillStyle=lg;g.fillRect(x,y,w,h);
   g.fillStyle='rgba(0,0,0,.55)';g.fillRect(x,y,w,6);g.fillRect(x,y+h-12,w,12);
   g.fillStyle='rgba(10,6,14,.85)';const f=rnd();if(f<.4){g.fillRect(x+6+rnd()*20,y+h-28,26,16);g.fillRect(x+8,y+h-36,6,24);}else if(f<.7){g.beginPath();g.arc(x+w*.7,y+h-22,10,0,7);g.fill();g.fillRect(x+w*.7-2,y+h-14,4,14);}else{g.fillRect(x+w-30,y+12,22,h-24);}
   if(rnd()<.5){g.fillStyle='rgba(0,0,0,.45)';g.fillRect(x,y,w*(.15+rnd()*.25),h);}g.fillStyle='#000';g.fillRect(x+w/2-2,y,4,h);g.fillRect(x,y+30,w,3);}});
 const facadeRough=cv(256,256,(g,w,h)=>{g.fillStyle='#d0d0d0';g.fillRect(0,0,w,h);for(let r=0;r<8;r++)for(let c=0;c<8;c++){g.fillStyle='#181818';g.fillRect(c*32+6,r*32+6,20,18);}});
 const facadeN=normalFrom(cv(512,512,(g)=>{g.fillStyle='#909090';g.fillRect(0,0,512,512);noise(g,512,512,8000,110,150,1);for(let r=0;r<8;r++)for(let c=0;c<8;c++){g.fillStyle='#303030';g.fillRect(c*64+10,r*64+10,44,40);g.fillStyle='#e0e0e0';g.fillRect(c*64+8,r*64+50,48,3);}}),3);
 const bMat=new THREE.MeshStandardMaterial({map:tex(facadeAlb),emissiveMap:tex(facadeEm),emissive:0xffffff,emissiveIntensity:1.5,roughnessMap:tex(facadeRough,false),roughness:1,metalness:.1,normalMap:tex(facadeN,false),vertexColors:true,envMapIntensity:1});
 const CH=8;const bG=[...Array(CH)].map(()=>[]);const acM=[],balM=[],signs=[],wires=[];const tints=[[1,.92,1],[.85,.88,1],[1,.85,.85],[.9,.85,.95],[1,1,.95],[.8,.78,.85]];
 const placed=[];
 for(const s of[-1,1]){let d=0;while(d<L-6){const w=3*(3+Math.floor(rnd()*3)),dp=10+rnd()*6,h=3.2*(4+Math.floor(rnd()*10))+.6;const tt=((d+w/2)%L)/L;
  const {p,n,ang}=nAt(tt),set=W/2+.35+WALK,c=p.clone().addScaledVector(n,s*(set+dp/2));
  const rad=Math.hypot(w,dp)/2;let ok=minDistToTrack(c.x,c.z)>set+Math.min(dp,w)/2-1&&minDistToTrack(c.x+n.x*s*dp/2+Math.sin(ang)*w/2,c.z+n.z*s*dp/2+Math.cos(ang)*w/2)>set&&minDistToTrack(c.x-Math.sin(ang)*w/2,c.z-Math.cos(ang)*w/2)>set-.5&&minDistToTrack(c.x+Math.sin(ang)*w/2,c.z+Math.cos(ang)*w/2)>set-.5;
  for(const q of placed)if(ok&&Math.hypot(q.x-c.x,q.z-c.z)<(q.r+rad)*.8)ok=false;
  if(ok){placed.push({x:c.x,z:c.z,r:rad});
   const g=new THREE.BoxGeometry(dp,h,w),uv=g.attributes.uv;for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;const su=f<2?w/24:dp/24,sv=f===2||f===3?w/24:h/25.6;uv.setXY(i,uv.getX(i)*su+(f*.37%1),uv.getY(i)*sv);}
   g.rotateY(ang);g.translate(c.x,h/2,c.z);bG[Math.floor(tt*CH)%CH].push(paintCol(g,new THREE.Color(...tints[Math.floor(rnd()*6)])));
   const fx=p.x+n.x*s*set,fz=p.z+n.z*s*set,out=-s,rot=ang+(s>0?0:Math.PI);
   for(let cI=0;cI<w/3;cI++)for(let fl=1;fl<Math.min(5,Math.floor(h/3.2));fl++){const along=-w/2+1.5+cI*3,rr=rnd();const base=V(fx,0,fz).addScaledVector(V(Math.sin(ang),0,Math.cos(ang)),along);
    if(rr<.1){const m=new THREE.Matrix4().makeRotationY(rot);m.setPosition(base.x+n.x*out*.55,fl*3.2+.05,base.z+n.z*out*.55);balM.push(m);}
    else if(rr<.2){const m=new THREE.Matrix4().makeRotationY(rot);m.setPosition(base.x+n.x*out*.25,fl*3.2+.55,base.z+n.z*out*.25);m.multiply(new THREE.Matrix4().makeTranslation(0,0,.7));acM.push(m);}}
   if(rnd()<.7)signs.push({x:fx,z:fz,n,out,ang,y:3.6+rnd()*Math.min(6,h-8),along:-w/2+.6,ch:Math.floor(tt*CH)%CH});
   if(rnd()<.4)wires.push(V(fx,7+rnd()*4,fz));}
  d+=w+.2+(rnd()<.2?3:0);}}
 for(const arr of bG)if(arr.length)S.add(new THREE.Mesh(merge(arr),bMat));
 {const gs=[new THREE.BoxGeometry(1.1,.12,2.2)];gs.push(new THREE.BoxGeometry(.04,.95,2.2).translate(.53,.5,0));for(let i=-1;i<=1;i+=2)gs.push(new THREE.BoxGeometry(1.1,.95,.04).translate(0,.5,i*1.08));

  const bal=new THREE.InstancedMesh(merge(gs),metalMat,balM.length);balM.forEach((m,i)=>bal.setMatrixAt(i,m.clone().multiply(new THREE.Matrix4().makeRotationY(-Math.PI/2))));bal.layers.set(1);S.add(bal);
  const ac=new THREE.InstancedMesh(merge([new THREE.BoxGeometry(.85,.6,.45),new THREE.CylinderGeometry(.2,.2,.02,8).rotateX(Math.PI/2).translate(.15,0,.23)]),new THREE.MeshStandardMaterial({color:0xbab4c0,roughness:.5,metalness:.3,normalMap:N_metal}),acM.length);
  acM.forEach((m,i)=>ac.setMatrixAt(i,m.clone().multiply(new THREE.Matrix4().makeRotationY(-Math.PI/2))));ac.layers.set(1);S.add(ac);}
 const words=[['NOODLES','#ff4fc8'],['ARCADE','#35f2ff'],['ROBO FIX','#ffd23a'],['BOBA TEA','#7dff6a'],['DONUTS','#ff8a2a'],['PIZZA','#ff4f6a'],['KARAOKE','#b07aff'],['HOTEL','#35f2ff']];
 const signC=cv(1024,512,(g)=>{g.fillStyle='#0a0612';g.fillRect(0,0,1024,512);g.textAlign='center';g.textBaseline='middle';
  words.forEach(([w,c],i)=>{const x=(i%2)*512+256,y=(i>>1)*128+64;g.fillStyle='#120a1c';g.fillRect(x-246,y-58,492,116);g.strokeStyle=c;g.lineWidth=7;g.shadowColor=c;g.shadowBlur=16;g.strokeRect(x-238,y-50,476,100);
   g.font='900 70px "Arial Black",Arial,sans-serif';g.fillStyle='#fff';g.shadowBlur=22;g.fillText(w,x,y+4);g.shadowBlur=0;g.globalAlpha=.45;g.fillStyle=c;g.fillText(w,x,y+4);g.globalAlpha=1;});});
 {const sg=[];signs.forEach((s,i)=>{const k=i%8,g=new THREE.PlaneGeometry(3.4,.85),uv=g.attributes.uv;for(let j=0;j<4;j++)uv.setXY(j,((k%2)+uv.getX(j))/2,1-((k>>1)+1-uv.getY(j))/4);
   g.rotateY(s.ang+Math.PI);const ox=s.x+s.n.x*s.out*2.0,oz=s.z+s.n.z*s.out*2.0,tg=V(Math.sin(s.ang),0,Math.cos(s.ang));const sx=ox+tg.x*s.along,sz=oz+tg.z*s.along;g.translate(sx-tg.x*.04,s.y,sz-tg.z*.04);sg.push(g);
   box(3.6,1.05,.06,sx,s.y,sz,s.ang+Math.PI,metal);const arm=new THREE.BoxGeometry(.06,.06,.6);arm.rotateY(s.ang+Math.PI/2);arm.translate(s.x+s.n.x*s.out*.3+tg.x*s.along,s.y+.55,s.z+s.n.z*s.out*.3+tg.z*s.along);metal.push(arm);});
  S.add(new THREE.Mesh(merge(sg),new THREE.MeshBasicMaterial({map:tex(signC,true,false),color:new THREE.Color(1.7,1.7,1.7)})));}
 {const pts=[];for(let i=0;i<wires.length-1;i++){const a=wires[i],b=wires[(i*7+3)%wires.length];if(a.distanceTo(b)>40)continue;
   for(let k=0;k<12;k++){for(const t of[k/12,(k+1)/12]){const sag=Math.sin(t*Math.PI)*1.4;pts.push(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t-sag,a.z+(b.z-a.z)*t);}}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x140e18}));l.layers.set(1);S.add(l);}
 {const gs=[];for(let i=0;i<80;i++){const a=i/80*Math.PI*2,w=12+rnd()*16,h=30+rnd()*80,g=new THREE.BoxGeometry(w,h,12);
   const uv=g.attributes.uv;for(let k=0;k<uv.count;k++)uv.setXY(k,uv.getX(k)*w/24,uv.getY(k)*h/25.6);g.rotateY(-a+Math.PI/2);g.translate(Math.cos(a)*260-60,h/2,Math.sin(a)*260+10);gs.push(g);}
  const m=new THREE.Mesh(merge(gs),new THREE.MeshBasicMaterial({map:bMat.emissiveMap,color:0x8060a0}));m.layers.set(1);S.add(m);}
 {const m=new THREE.Mesh(new THREE.CircleGeometry(10,40),new THREE.MeshBasicMaterial({color:new THREE.Color(0xfff0d0).multiplyScalar(1.3),fog:false}));m.position.set(-60,75,-330);S.add(m);}
 {const pool=[],glow=[];for(const lp of lampPos){const g=new THREE.PlaneGeometry(7,7);g.rotateX(-Math.PI/2);g.translate(lp.x,.02,lp.z);pool.push(g);const h=new THREE.PlaneGeometry(1.1,1.1).rotateY(rnd()*3);h.translate(lp.x,lp.y-.15,lp.z);glow.push(h);}
  const pm=new THREE.Mesh(merge(pool),new THREE.MeshBasicMaterial({map:glowT,color:0xffa860,transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3}));pm.renderOrder=3;pm.layers.set(1);S.add(pm);
  const gm=new THREE.Mesh(merge(glow),new THREE.MeshBasicMaterial({map:glowT,color:0xffd0a0,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));gm.renderOrder=4;gm.layers.set(1);S.add(gm);}
 const holo=tex(cv(256,256,(g)=>{g.scale(2,2);g.strokeStyle='#5ff4ff';g.fillStyle='rgba(95,244,255,.25)';g.lineWidth=4;g.beginPath();g.arc(64,70,34,0,7);g.fill();g.stroke();
  g.beginPath();g.moveTo(36,52);g.lineTo(40,18);g.lineTo(58,40);g.moveTo(92,52);g.lineTo(88,18);g.lineTo(70,40);g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(52,66,5,0,7);g.arc(76,66,5,0,7);g.fill();
  g.beginPath();g.arc(64,80,8,.2,Math.PI-.2);g.stroke();g.beginPath();g.moveTo(98,80);g.quadraticCurveTo(118,60,112,36);g.stroke();for(let y=0;y<128;y+=4){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(0,y,128,1.5);}}),true,false);
 const cat=new THREE.Sprite(new THREE.SpriteMaterial({map:holo,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(1.4,1.4,1.4)}));cat.scale.set(7,7,1);
 {const {p,n}=nAt(.12);cat.position.set(p.x-n.x*4,11,p.z-n.z*4);cat.layers.set(1);S.add(cat);}
 S.add(new THREE.Mesh(merge(metal),metalMat)).layers.set(1);
 S.add(new THREE.Mesh(merge(emit),new THREE.MeshBasicMaterial({vertexColors:true})));

 // kit shared with karts.js / rain.js / obstacles.js / items.js (read-only helpers)
 const kit={THREE,S,cam,HIGH,merge,paintCol,cv,tex,rnd,RoundedBoxGeometry,glowT,shadowT,N:{flake:N_flake,tread:N_tread,fur:N_fur,metal:N_metal,conc:N_conc,asph:N_asph},metalMat,lampPos,W,L,sample,pointAt,wrap};
 const hero=buildHero(kit);   // M3: rivals are built by racers.js (palette meshes)
 // particles
 const SP=36,sparks=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.035,0),new THREE.MeshBasicMaterial({color:0xffffff}),SP);sparks.frustumCulled=false;sparks.layers.set(1);S.add(sparks);
 const sv=new Float32Array(SP);for(let i=0;i<SP;i++)sv[i]=rnd();const sparkCol=new THREE.Color();
 const SPR=HIGH?28:12,spray=new THREE.InstancedMesh(new THREE.PlaneGeometry(.5,.5),new THREE.MeshBasicMaterial({map:glowT,color:0x9088a8,transparent:true,opacity:.1,depthWrite:false}),SPR);spray.frustumCulled=false;spray.layers.set(1);S.add(spray);
 const spv=new Float32Array(SPR);for(let i=0;i<SPR;i++)spv[i]=rnd();
 const SLN=26,sl=new THREE.InstancedMesh(new THREE.PlaneGeometry(.012,3),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false}),SLN);sl.frustumCulled=false;sl.layers.set(1);S.add(sl);
 const slp=new Float32Array(SLN*3);for(let i=0;i<SLN;i++){const a=rnd()*6.28,r=1.6+rnd()*2.5;slp[i*3]=Math.cos(a)*r;slp[i*3+1]=1+Math.sin(a)*r*.6;slp[i*3+2]=rnd()*20;}
 cam.layers.enable(1);

 let composer=null,bloom=null,mb=null;
 if(HIGH){composer=new EffectComposer(R);composer.addPass(new RenderPass(S,cam));bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth*DPR/2,innerHeight*DPR/2),0.38,0.35,0.9);composer.addPass(bloom);
  mb=new ShaderPass({uniforms:{tDiffuse:{value:null},center:{value:new THREE.Vector2(.5,.56)},strength:{value:.0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 center;uniform float strength;varying vec2 vUv;void main(){vec2 d=vUv-center;float m=smoothstep(.32,.85,length(d*vec2(1.3,1.)));vec4 c=vec4(0.);for(int i=0;i<6;i++){c+=texture2D(tDiffuse,vUv-d*strength*m*float(i)/5.);}gl_FragColor=c/6.;}`});
  composer.addPass(mb);composer.addPass(new OutputPass());}
 function resize(){const w=innerWidth,h=innerHeight;R.setSize(w,h);cam.aspect=w/h;cam.fov=w<h?70:58;cam.updateProjectionMatrix();
  if(composer){composer.setSize(w,h);bloom.resolution.set(w*DPR/2,h*DPR/2);}if(mirror)mirror.getRenderTarget().setSize(Math.round(w*DPR/2),Math.round(h*DPR/2));}

 const M4=new THREE.Matrix4(),v=new THREE.Vector3(),q2=new THREE.Quaternion(),qq=new THREE.Quaternion(),sc=new THREE.Vector3(),one=new THREE.Vector3(1,1,1),Yax=V(0,1,0),qx90=new THREE.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2),o2={};
 // fx state from game: speed 0..1, drift level 0..3, boosting, heroS
 function updateFx(dt,g){const cx=cam.position.x,cz=cam.position.z;sample(g.heroS,o2);const T={x:o2.tx,z:o2.tz};
  qq.setFromAxisAngle(Yax,Math.atan2(cam.position.x-hero.position.x,cam.position.z-hero.position.z));
  const dl=g.drift;sparkCol.setHex(dl>=3?0xff3fd8:dl>=2?0xff9a2a:0x35f2ff).multiplyScalar(3);
  for(let i=0;i<SP;i++){let a=sv[i]+dt*2.2;if(a>1)a-=1;sv[i]=a;const s=i%2?1:-1;const on=dl>0&&g.air<=0;hero.localToWorld(v.set(s*(.62+a*.4),.08+a*.45-a*a*.55,.75+a*1.1));sc.setScalar(on?1.4*(1-a):0);M4.compose(v,q2.identity(),sc);sparks.setMatrixAt(i,M4);sparks.setColorAt(i,sparkCol);}
  sparks.instanceMatrix.needsUpdate=true;sparks.instanceColor.needsUpdate=true;
  for(let i=0;i<SPR;i++){let a=spv[i]+dt*1.6;if(a>1)a-=1;spv[i]=a;const s=i%2?1:-1;hero.localToWorld(v.set(s*(.62+a*.3),.15+a*.4,.85+a*1.6));sc.setScalar((.3+a*.9)*g.speed01);M4.compose(v,cam.quaternion,sc);spray.setMatrixAt(i,M4);}spray.instanceMatrix.needsUpdate=true;
  const showSL=(!HIGH||g.boost>0)&&g.speed01>.5;sl.visible=showSL;
  if(showSL){for(let i=0;i<SLN;i++){let z=slp[i*3+2]-dt*50;if(z<0)z+=20;slp[i*3+2]=z;cam.localToWorld(v.set(slp[i*3],slp[i*3+1]-1,-z-2));q2.copy(cam.quaternion).multiply(qx90);M4.compose(v,q2,one);sl.setMatrixAt(i,M4);}sl.instanceMatrix.needsUpdate=true;}
  if(mb)mb.uniforms.strength.value=.012+.03*g.speed01+(g.boost>0?.02:0);}
 function render(){if(composer)composer.render();else R.render(S,cam);}
 return {hero,kit,resize,render,updateFx,mirror,composer,lampPos};
}
const _v=new THREE.Vector3();
