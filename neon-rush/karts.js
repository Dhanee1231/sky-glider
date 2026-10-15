// Neon Rush karts + drivers (owned by Track B in M3). kit comes from world.js.
import * as THREE from 'three';
import {emblemName,threeShapes,NEON,badgeInner} from './emblems.js';
let K;  // kit
function tyreGeo(r,w,seg=18){const ri=r*.62;const prof=[[ri,-w/2],[ri+.01,-w/2-.005],[r*.86,-w/2-.012],[r*.97,-w/2+.01],[r,-w/2+.04],[r,w/2-.04],[r*.97,w/2-.01],[r*.86,w/2+.012],[ri+.01,w/2+.005],[ri,w/2]];
  const g=new THREE.LatheGeometry(prof.map(([x,y])=>new THREE.Vector2(x,y)),seg);g.rotateZ(Math.PI/2);return g;}
function rimGeo(r,w,lod,sp=5){const merge=K.merge;const gs=[new THREE.CylinderGeometry(r*.6,r*.6,w*.8,lod?10:14,1,true).rotateZ(Math.PI/2),new THREE.CylinderGeometry(r*.16,r*.16,w*.85,lod?6:10).rotateZ(Math.PI/2)];
  for(let i=0;i<(lod?3:sp);i++){const s=new THREE.BoxGeometry(.012,r*.48,r*.1);s.translate(0,r*.3,0);s.rotateX(i/(lod?5:sp)*Math.PI*2);s.translate(w*.32,0,0);gs.push(s);}return merge(gs);}
let coneT0=null;const mkCone=()=>coneT0||(coneT0=K.tex(K.cv(64,128,(g)=>{const r=g.createLinearGradient(0,0,0,128);r.addColorStop(0,'rgba(255,255,255,0)');r.addColorStop(1,'rgba(255,255,255,.8)');g.fillStyle=r;g.beginPath();g.moveTo(0,0);g.lineTo(64,0);g.lineTo(38,128);g.lineTo(26,128);g.fill();}),false,false));
// chassis + driver parts as {key:[geometry]} (lod=true: fewer segments, used for the six rivals)
function kartParts(kit,accent,driverFn,lod,o={}){K=kit;const {paintCol,RoundedBoxGeometry}=kit;const parts={};const seg=lod?1:3,s2=lod?1:2;
  const add=(key,g,x=0,y=0,z=0,rx=0,ry=0,rz=0,col)=>{g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);if(col)g=paintCol(g,col);(parts[key]??=[]).push(g);};
  add('dark',new THREE.BoxGeometry(.9,.03,1.5),0,.08,0);
  for(const x of[-.42,.42])add('chrome',new THREE.CylinderGeometry(.018,.018,1.6,6),x,.09,0,Math.PI/2);
  add('paint',new RoundedBoxGeometry(1.05,.16,.42,seg,.07),0,.16,-.92);add('paint',new RoundedBoxGeometry(.62,.32,.42,seg,.12),0,.32,-.62,-.35);
  for(const s of[-1,1]){add('paint',new RoundedBoxGeometry(.2,.2,.72,seg,.08),s*.53,.18,.08);add('lights',new THREE.BoxGeometry(.01,.03,.66),s*.635,.2,.08,0,0,0,new THREE.Color(accent).multiplyScalar(2.4));}
  add('dark',new RoundedBoxGeometry(1.25,.12,.18,s2,.05),0,.16,.98);add('dark',new RoundedBoxGeometry(.42,.12,.42,s2,.05),0,.17,.18);add('dark',new RoundedBoxGeometry(.44,.5,.1,s2,.04),0,.42,.42,-.35);
  add('chrome',new THREE.CylinderGeometry(.015,.015,.5,6),0,.3,-.3,-1.1);add('dark',new THREE.TorusGeometry(.14,.018,6,lod?12:20),0,.5,-.18,-1.0);
  add('dark',new RoundedBoxGeometry(.5,.05,.32,s2,.02),.38,.2,.65);add('chrome',new RoundedBoxGeometry(.2,.22,.24,s2,.04),.38,.33,.66);add('chrome',new THREE.CylinderGeometry(.035,.04,.3,8),.5,.3,.88,Math.PI/2);
  add('paint',new RoundedBoxGeometry(.95,.035,.2,s2,.012),0,.5,1.0,.08);for(const x of[-.38,.38])add('dark',new THREE.BoxGeometry(.03,.3,.08),x,.36,1.0);
  add('lights',new THREE.BoxGeometry(.95,.01,.01),0,.52,.9,0,0,0,new THREE.Color(accent).multiplyScalar(2.6));
  for(const x of[-.3,.3]){add('lights',new RoundedBoxGeometry(.22,.06,.02,s2,.01),x,.2,1.075,0,0,0,new THREE.Color(0xff2040).multiplyScalar(3));add('lights',new THREE.CircleGeometry(.04,10),x*.9,.2,-1.14,0,Math.PI,0,new THREE.Color(0xfff2e0).multiplyScalar(3.5));}
  for(const [x,z,r,w] of[[-.6,-.66,.17,.15],[.6,-.66,.17,.15],[-.62,.66,.2,.22],[.62,.66,.2,.22]]){add('tyre',tyreGeo(r,w,lod?10:18),x,r,z);add('chrome',rimGeo(r,w,lod,o.spokes),x,r,z);}
  if(o.body)bodyExtras(add,o.body,seg,s2);if(o.decal)decalShapes(add,o.decal,o.decalCol);if(o.emblem)emblemShapes(add,o.emblem,o.emblemCol);
  driverFn(add);return parts;}
let HERO=null,MK=null;   // the main-scene hero kart + the main kit (set by buildHero)
// ---------- M4 garage options (index 0 of every list = the original look). Counts must match save.js KART_N. ----------
export const PAINTS=[{n:'Pink',hex:0xe8287a},{n:'Red',hex:0xe8204a},{n:'Orange',hex:0xff7a1a},{n:'Gold',hex:0xe8b020},{n:'Lime',hex:0x7aff3a},{n:'Teal',hex:0x20c0a0},{n:'Sky',hex:0x35c8ff},{n:'Blue',hex:0x2a5bff},{n:'Purple',hex:0x8a3aff},{n:'Silver',hex:0xc8d0e0}];
export const FINISHES=[{n:'Gloss',metal:.55,rough:.38,coat:1,env:1.5,glow:0},{n:'Metallic',metal:1,rough:.16,coat:.7,env:2.3,glow:0},{n:'Neon glow',metal:.12,rough:.45,coat:.6,env:1,glow:.9}];
export const WHEELS=[{n:'Chrome',col:0xd8d8e4,metal:1,rough:.15,glow:0,spokes:5},{n:'Gold',col:0xffc83a,metal:1,rough:.22,glow:0,spokes:5},{n:'Pink glow',col:0x3a1030,metal:.4,rough:.4,glow:0xff3fd8,spokes:8},{n:'Cyan glow',col:0x0a2a34,metal:.4,rough:.4,glow:0x35f2ff,spokes:6}];
export const BODIES=['Classic','Racer','Buggy','Rocket'],TRAILS=['None','Sparkles','Hearts','Rainbow','Flames'],DECALS=['None','Star','Heart','Bolt','Stripes'];
const lum=h=>{const c=new THREE.Color(h);return .2126*c.r+.7152*c.g+.0722*c.b;};
const normCustom=c=>{const o={body:0,paint:0,finish:0,wheels:0,trail:0,decal:0,emblem:0,emblemColor:0},lim={body:BODIES.length,paint:PAINTS.length,finish:FINISHES.length,wheels:WHEELS.length,trail:TRAILS.length,decal:DECALS.length,emblem:9,emblemColor:8};
  for(const k in o){const n=Math.round(+(c&&c[k]));o[k]=Number.isFinite(n)&&n>=0&&n<lim[k]?n:0;}return o;};
// extra bodywork per style (paint parts, so no extra draw calls). The camera sees the kart from behind: the rear reads most.
function bodyExtras(add,style,seg,s2){const RB=kitRB||K.RoundedBoxGeometry;
  if(style===1){   // Racer: low nose wedge + big wide rear wing on endplates
    add('paint',new RB(.78,.07,.5,seg,.03),0,.27,-1.05,.12);
    add('paint',new RB(1.5,.05,.3,s2,.02),0,.8,1.08,.05);for(const x of[-.74,.74])add('paint',new RB(.05,.44,.34,s2,.02),x,.6,1.08);
    for(const x of[-.28,.28])add('dark',new THREE.BoxGeometry(.04,.34,.06),x,.58,1.02);}
  else if(style===2){   // Buggy: puffy rear fenders + roll hoop
    for(const s of[-1,1]){const g=new THREE.SphereGeometry(.3,12,8,0,Math.PI*2,0,Math.PI/2);g.scale(.8,1.1,1.5);add('paint',g,s*.66,.3,.66);
      const f=new THREE.SphereGeometry(.22,10,6,0,Math.PI*2,0,Math.PI/2);f.scale(.8,1,1.4);add('paint',f,s*.66,.24,-.66);}
    add('dark',new THREE.TorusGeometry(.4,.022,6,seg>1?20:12,Math.PI),0,.42,.46,0,0,0);add('paint',new THREE.SphereGeometry(.05,8,6),0,.84,.46);}
  else if(style===3){   // Rocket: dorsal fin, twin tail fins, nose cone
    add('paint',new RB(.06,.5,.55,s2,.025),0,.78,.78,.2);
    for(const s of[-1,1])add('paint',new RB(.05,.3,.4,s2,.02),s*.5,.42,.98,0,0,s*.35);
    add('paint',new THREE.ConeGeometry(.16,.5,10).rotateX(-Math.PI/2),0,.2,-1.38);add('lights',new THREE.SphereGeometry(.05,8,6),0,.2,-1.66,0,0,0,new THREE.Color(0xfff2a0).multiplyScalar(3));}}
// flat decals (star/heart/bolt/stripes), drawn on the nose plate and the rear wing top so they read from behind
function shape(kind){const sh=new THREE.Shape();
  if(kind===1){for(let i=0;i<10;i++){const a=i/10*Math.PI*2-Math.PI/2,r=i%2?.45:1;(i?sh.lineTo:sh.moveTo).call(sh,Math.cos(a)*r,Math.sin(a)*r);}sh.closePath();}
  else if(kind===2){sh.moveTo(0,-.9);sh.bezierCurveTo(-1.3,-.1,-.9,.9,0,.45);sh.bezierCurveTo(.9,.9,1.3,-.1,0,-.9);}
  else if(kind===3){const p=[[.2,1],[-.55,-.1],[-.05,-.1],[-.25,-1],[.6,.2],[.1,.2]];p.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));sh.closePath();}
  return new THREE.ShapeGeometry(sh);}
function decalShapes(add,kind,col){if(kind===4){   // two racing stripes
    for(const x of[-.09,.09]){add('paint',new THREE.PlaneGeometry(.07,.38).rotateX(-Math.PI/2),x,.248,-.92,0,0,0,col);add('paint',new THREE.PlaneGeometry(.04,.17).rotateX(-Math.PI/2),x*1.8,.523,1.0,.08,0,0,col);}return;}
  const g1=shape(kind).rotateX(-Math.PI/2).scale(.13,1,.13),g2=shape(kind).rotateX(-Math.PI/2).scale(.065,1,.065);
  add('paint',g1,0,.248,-.92,0,0,0,col);add('paint',g2,0,.523,1.0,.08,0,0,col);}
// M5 emblem: neon plate on the hood + an upright one on the tail between the wing end plates (glowing, so it reads from behind)
function emblemShapes(add,name,col){const mk=()=>{const gs=threeShapes(THREE,name).map(s=>new THREE.ShapeGeometry(s));return gs;};
  for(const g of mk())add('lights',g.scale(.21,.21,1).rotateX(-Math.PI/2),0,.252,-.42,0,0,0,col);
  for(const g of mk())add('lights',g.scale(.17,.17,1),0,.37,1.075,0,0,0,col);}
let kitRB;
const decalCol=hex=>new THREE.Color(lum(hex)>.55?0x241046:0xfff6b0);
// the hero kart. custom = {body,paint,finish,wheels,trail,decal} (garage); restyle(custom) rebuilds it in place (no new draw calls).
export function kart(kit,paint,accent,driverFn,custom){K=kit;kitRB=kit.RoundedBoxGeometry;const {S,merge,glowT,shadowT}=kit;const N_flake=kit.N.flake,N_tread=kit.N.tread,N_fur=kit.N.fur,coneT=mkCone();const k=new THREE.Group();const body=new THREE.Group();k.add(body);
  const flake=N_flake.clone();flake.repeat.set(24,24);flake.needsUpdate=true;
  const mats={paint:new THREE.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,metalness:.55,roughness:.38,normalMap:flake,normalScale:new THREE.Vector2(.07,.07),clearcoat:1,clearcoatRoughness:.04,envMapIntensity:1.5}),
   dark:new THREE.MeshStandardMaterial({color:0x1a1820,metalness:.3,roughness:.5}),chrome:new THREE.MeshStandardMaterial({color:0xd8d8e4,metalness:1,roughness:.15,envMapIntensity:1.6}),
   tyre:new THREE.MeshStandardMaterial({color:0x1a191c,roughness:.88,normalMap:N_tread}),lights:new THREE.MeshBasicMaterial({vertexColors:true}),
   suit:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,normalMap:N_fur,normalScale:new THREE.Vector2(.15,.15)}),
   helmet:new THREE.MeshPhysicalMaterial({vertexColors:true,metalness:.2,roughness:.25,clearcoat:1,clearcoatRoughness:.05}),
   visor:new THREE.MeshPhysicalMaterial({color:0x101828,metalness:.95,roughness:.04,clearcoat:1,envMapIntensity:2.2}),
   fur:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,normalMap:N_fur,normalScale:new THREE.Vector2(.6,.6)})};
  const sg=[new THREE.PlaneGeometry(1.6,2.4).rotateX(-Math.PI/2).translate(0,.012,0)];for(const [x,z] of[[-.6,-.66],[.6,-.66],[-.62,.66],[.62,.66]])sg.push(new THREE.PlaneGeometry(.5,.55).rotateX(-Math.PI/2).translate(x,.013,z));
  const sh=new THREE.Mesh(merge(sg),new THREE.MeshBasicMaterial({map:shadowT,transparent:true,depthWrite:false,opacity:.9}));sh.renderOrder=3;sh.layers.set(1);k.add(sh);
  const fxm=new THREE.Mesh(merge([new THREE.PlaneGeometry(.45,.3).translate(-.3,.2,1.1),new THREE.PlaneGeometry(.45,.3).translate(.3,.2,1.1)]),new THREE.MeshBasicMaterial({map:glowT,color:0xff3048,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  const cone=new THREE.Mesh(new THREE.PlaneGeometry(3.2,7).rotateX(-Math.PI/2).translate(0,.02,-4.6),new THREE.MeshBasicMaterial({map:coneT,color:0xfff0d0,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));
  const ug=new THREE.Mesh(new THREE.PlaneGeometry(1.8,2.6).rotateX(-Math.PI/2).translate(0,.02,0),new THREE.MeshBasicMaterial({map:glowT,color:accent,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false}));
  for(const m of[fxm,cone,ug]){m.renderOrder=6;m.layers.set(1);k.add(m);}
  const meshes=[];
  function restyle(c){c=normCustom(c);const pc=PAINTS[c.paint].hex,fin=FINISHES[c.finish],wh=WHEELS[c.wheels];
    for(const m of meshes){body.remove(m);m.geometry.dispose();}meshes.length=0;
    const parts=kartParts(kit,accent,driverFn,false,{body:c.body,spokes:wh.spokes,decal:c.decal,decalCol:c.decal?decalCol(pc):null,emblem:emblemName(c.emblem),emblemCol:new THREE.Color(NEON[c.emblemColor]).multiplyScalar(2.2)});
    for(const key in parts){let gs=parts[key];if(key==='paint'){const col=new THREE.Color(pc);gs=gs.map(g=>g.attributes.color?g:kit.paintCol(g,col));}
      const m=new THREE.Mesh(merge(gs),mats[key]);if(!['paint','lights'].includes(key))m.layers.set(1);body.add(m);meshes.push(m);}   // small detail skipped in puddle reflections
    const P=mats.paint;P.metalness=fin.metal;P.roughness=fin.rough;P.clearcoat=fin.coat;P.envMapIntensity=fin.env;P.emissive.set(fin.glow?pc:0x000000);P.emissiveIntensity=fin.glow;
    const ch=mats.chrome;ch.color.set(wh.col);ch.metalness=wh.metal;ch.roughness=wh.rough;ch.emissive.set(wh.glow||0x000000);ch.emissiveIntensity=wh.glow?1.5:0;
    ug.material.color.set(fin.glow?pc:accent);
    k.userData.custom=c;return k;}
  k.userData={body,shadow:sh,cone,ug,fxm,restyle,mats,accent,baseUg:ug.material.color.clone()};
  restyle(custom||{});S.add(k);return k;}
const C=(h,m=1)=>new THREE.Color(h).multiplyScalar(m);
const heroDriver=add=>{const suit=C(0x7a3cff),white=C(0xf2eef8),glove=C(0x222028),hair=C(0x4a2a1a);
  add('suit',new THREE.CapsuleGeometry(.17,.3,4,12),0,.48,.3,-.3,0,0,suit);add('suit',new THREE.BoxGeometry(.36,.04,.2),0,.6,.33,-.3,0,0,white);add('suit',new THREE.CapsuleGeometry(.1,.08,4,10),0,.72,.22,0,0,0,white);
  for(const s of[-1,1]){add('suit',new THREE.CapsuleGeometry(.055,.22,4,8),s*.2,.56,.12,-1.0,0,s*.35,suit);add('suit',new THREE.CapsuleGeometry(.05,.2,4,8),s*.14,.5,-.08,-1.35,0,s*.15,suit);
   add('suit',new THREE.SphereGeometry(.05,8,6),s*.12,.5,-.2,0,0,0,glove);add('suit',new THREE.CapsuleGeometry(.07,.32,4,8),s*.11,.2,-.25,-1.45,0,0,suit);}
  add('helmet',new THREE.SphereGeometry(.165,20,14),0,.92,.2,0,0,0,white);add('helmet',new THREE.TorusGeometry(.163,.014,6,32),0,.92,.2,0,Math.PI/2,0,C(0xe8287a,1.2));
  add('helmet',new THREE.BoxGeometry(.035,.02,.24),0,1.08,.22,0,0,0,C(0xe8287a,1.2));add('visor',new THREE.SphereGeometry(.168,18,8,Math.PI*1.12,Math.PI*.76,Math.PI*.36,Math.PI*.24),0,.92,.2);
  add('suit',new THREE.CapsuleGeometry(.045,.16,4,8),0,.86,.4,.9,0,0,hair);add('suit',new THREE.SphereGeometry(.035,8,6),0,.9,.36,0,0,0,C(0xff4fb8));};
export const buildHero=(kit,custom)=>{MK=kit;HERO=kart(kit,0xe8287a,0x35f2ff,heroDriver,custom);if(custom)setHeroLook(custom);return HERO;};
const pipDriver=add=>{const fur=C(0xd8641e),cream=C(0xf4ead8),blk=C(0x1a1214),jacket=C(0x2a7a5a);
  add('fur',new THREE.CapsuleGeometry(.16,.26,3,8),0,.48,.3,-.3,0,0,jacket);add('fur',new THREE.SphereGeometry(.12,9,6),0,.62,.18,0,0,0,cream);
  for(const s of[-1,1]){add('fur',new THREE.CapsuleGeometry(.05,.22,3,6),s*.19,.55,.1,-1.05,0,s*.35,jacket);add('fur',new THREE.CapsuleGeometry(.045,.18,3,6),s*.13,.5,-.08,-1.35,0,s*.15,fur);
   add('fur',new THREE.SphereGeometry(.05,8,6),s*.12,.5,-.2,0,0,0,blk);add('fur',new THREE.CapsuleGeometry(.065,.3,3,6),s*.11,.2,-.25,-1.45,0,0,fur);}
  const head=new THREE.SphereGeometry(.15,12,9);head.scale(1,.92,1.1);add('fur',head,0,.86,.2,0,0,0,fur);
  const cheek=new THREE.SphereGeometry(.1,10,7);cheek.scale(1.3,.7,1);add('fur',cheek,0,.8,.1,0,0,0,cream);
  add('fur',new THREE.ConeGeometry(.075,.2,8).rotateX(-Math.PI/2),0,.82,-.02,0,0,0,fur);add('fur',new THREE.ConeGeometry(.05,.12,6).rotateX(-Math.PI/2),0,.8,-.02,0,0,0,cream);
  add('visor',new THREE.SphereGeometry(.024,8,6),0,.835,-.11);
  for(const s of[-1,1]){add('fur',new THREE.ConeGeometry(.065,.17,4).scale(1,1,.5),s*.08,1.03,.22,0,0,-s*.25,fur);add('fur',new THREE.ConeGeometry(.03,.06,4).scale(1,1,.5),s*.1,1.11,.22,0,0,-s*.25,blk);
   add('visor',new THREE.SphereGeometry(.022,8,6),s*.065,.9,.08);add('visor',new THREE.TorusGeometry(.04,.013,4,10),s*.06,.95,.07);}
  add('helmet',new THREE.TorusGeometry(.15,.015,5,16),0,.92,.2,Math.PI/2,0,0,C(0x7dff6a,.9));
  const tail=new THREE.LatheGeometry([0,.05,.09,.11,.11,.09,.05,0].map((r,i)=>new THREE.Vector2(r,i*.07)),8);tail.rotateX(-1.0);add('fur',tail,0,.4,.55,0,0,0,fur);
  add('fur',new THREE.SphereGeometry(.07,8,6),0,.72,.85,0,0,0,cream);};

// ---------- M3: six rivals, each with its own look; ALL of them drawn in 4 draw calls (palette meshes, b_pal.js) ----------
import {palMesh,setSlotM,hideSlot} from './b_pal.js';
// shared little driver body (torso, arms, gloves, legs); head is per character
const bodyD=(add,suit,glove,leg)=>{add('fur',new THREE.CapsuleGeometry(.16,.26,3,8),0,.48,.3,-.3,0,0,suit);
  for(const s of[-1,1]){add('fur',new THREE.CapsuleGeometry(.05,.22,3,6),s*.19,.55,.1,-1.05,0,s*.35,suit);add('fur',new THREE.CapsuleGeometry(.045,.18,3,6),s*.13,.5,-.08,-1.35,0,s*.15,suit);
   add('fur',new THREE.SphereGeometry(.05,6,5),s*.12,.5,-.2,0,0,0,glove);add('fur',new THREE.CapsuleGeometry(.065,.3,3,6),s*.11,.2,-.25,-1.45,0,0,leg);}};
const eyes=(add,y,z,dx=.06,r=.026)=>{for(const s of[-1,1]){add('visor',new THREE.SphereGeometry(r,8,6),s*dx,y,z);add('fur',new THREE.SphereGeometry(r*.38,5,4),s*dx-.008,y+.012,z-r*.85,0,0,0,C(0xffffff,1.4));}};
const bunnyD=add=>{const w=C(0xf8f0f6),pink=C(0xff8fc8),lav=C(0xb89aff);bodyD(add,lav,w,lav);
  const head=new THREE.SphereGeometry(.15,14,10);head.scale(1,.95,1.05);add('fur',head,0,.86,.2,0,0,0,w);eyes(add,.89,.07);
  add('fur',new THREE.SphereGeometry(.03,6,5),0,.83,.05,0,0,0,pink);for(const s of[-1,1]){add('fur',new THREE.SphereGeometry(.04,6,5).scale(1,.7,.5),s*.09,.81,.09,0,0,0,C(0xffb0d8));
   const ear=new THREE.CapsuleGeometry(.045,.26,3,8);ear.scale(1,1,.55);add('fur',ear,s*.07,1.12,.24,-.15,0,-s*.18,w);const inner=new THREE.CapsuleGeometry(.025,.2,3,6);inner.scale(1,1,.4);add('fur',inner,s*.07,1.12,.215,-.15,0,-s*.18,pink);}
  add('helmet',new THREE.TorusGeometry(.15,.015,5,18),0,.92,.2,Math.PI/2,0,0,C(0xfff27a,.9));add('fur',new THREE.SphereGeometry(.06,8,6),0,.6,.62,0,0,0,w);};
const robotD=add=>{const sil=C(0xc8d0e0),dk=C(0x404858),cy=C(0x35f2ff,2.6);bodyD(add,C(0x5a6a88),dk,C(0x5a6a88));
  add('helmet',new kitRB(.3,.26,.28,2,.06),0,.9,.2,0,0,0,sil);add('lights',new THREE.BoxGeometry(.24,.05,.02),0,.92,.055,0,0,0,cy);
  add('chrome',new THREE.CylinderGeometry(.012,.012,.18,5),0,1.11,.2);add('lights',new THREE.SphereGeometry(.035,8,6),0,1.21,.2,0,0,0,C(0xff3fd8,2.8));
  for(const s of[-1,1])add('helmet',new THREE.CylinderGeometry(.05,.05,.04,10).rotateZ(Math.PI/2),s*.165,.9,.2,0,0,0,dk);
  add('lights',new THREE.BoxGeometry(.1,.015,.02),0,.84,.055,0,0,0,C(0xffffff,2));};
const catD=add=>{const fur=C(0xb8a0e0),cream=C(0xf4ecff),pink=C(0xff6ab8),blk=C(0x241a30);bodyD(add,C(0x3a2a6a),cream,C(0x3a2a6a));
  const head=new THREE.SphereGeometry(.15,14,10);head.scale(1.08,.92,1);add('fur',head,0,.87,.2,0,0,0,fur);eyes(add,.9,.075,.065,.03);
  add('fur',new THREE.SphereGeometry(.07,8,6).scale(1.3,.7,.8),0,.82,.1,0,0,0,cream);add('fur',new THREE.SphereGeometry(.022,6,5),0,.85,.05,0,0,0,pink);
  for(const s of[-1,1]){add('fur',new THREE.ConeGeometry(.07,.15,4).scale(1,1,.5),s*.09,1.04,.21,0,0,-s*.3,fur);add('fur',new THREE.ConeGeometry(.035,.08,4).scale(1,1,.4),s*.095,1.03,.19,0,0,-s*.3,pink);
   for(const d of[-1,1])add('fur',new THREE.BoxGeometry(.14,.006,.006),s*.15,.83+d*.015,.07,0,0,s*d*.15,blk);}
  const tail=new THREE.CapsuleGeometry(.03,.4,3,6);add('fur',tail,.15,.55,.75,.6,0,-.4,fur);add('helmet',new THREE.TorusGeometry(.15,.015,5,18),0,.94,.2,Math.PI/2,0,0,C(0xff3fd8,1.1));};
const pandaD=add=>{const w=C(0xf6f6f2),b=C(0x22202a),mint=C(0x3fe0b0);bodyD(add,b,b,b);add('fur',new THREE.SphereGeometry(.12,10,8),0,.62,.18,0,0,0,w);
  const head=new THREE.SphereGeometry(.16,14,10);head.scale(1.05,.95,1);add('fur',head,0,.87,.2,0,0,0,w);
  for(const s of[-1,1]){add('fur',new THREE.SphereGeometry(.06,8,6),s*.12,1.01,.22,0,0,0,b);add('fur',new THREE.SphereGeometry(.045,8,6).scale(1,1.3,.6),s*.06,.89,.07,0,0,-s*.5,b);}
  eyes(add,.9,.045,.06,.02);add('fur',new THREE.SphereGeometry(.03,6,5).scale(1.3,1,1),0,.83,.05,0,0,0,b);add('helmet',new THREE.TorusGeometry(.16,.016,5,18),0,.92,.2,Math.PI/2,0,0,C(0xffe14d,1.1));
  add('fur',new THREE.ConeGeometry(.05,.09,8),0,1.07,.2,0,0,0,mint);};
const turtleD=add=>{const g=C(0x6ad86a),dg=C(0x2a7a4a),gold=C(0xffc02a),cream=C(0xf4f0c8);bodyD(add,g,g,g);
  const head=new THREE.SphereGeometry(.14,14,10);head.scale(1,.9,1.15);add('fur',head,0,.84,.17,0,0,0,g);eyes(add,.88,.05,.06,.028);
  add('fur',new THREE.TorusGeometry(.05,.01,4,10,Math.PI),0,.8,.035,Math.PI,0,0,dg);
  const shell=new THREE.SphereGeometry(.26,14,8,0,Math.PI*2,0,Math.PI/2);shell.scale(1,.8,1.1);add('helmet',shell,0,.45,.5,-1.3,0,0,dg);
  add('helmet',new THREE.TorusGeometry(.25,.03,5,18),0,.45,.5,-1.3+Math.PI/2,0,0,cream);for(const [x,y] of[[0,0],[-.1,.09],[.1,.09],[-.1,-.09],[.1,-.09]])add('helmet',new THREE.CircleGeometry(.05,6),x,.47+y*.3,.73+y*.15,-.3,0,0,C(0x8ad86a));
  const cap=new THREE.SphereGeometry(.15,14,8,0,Math.PI*2,0,Math.PI/2.2);add('helmet',cap,0,.88,.18,0,0,0,gold);add('helmet',new THREE.BoxGeometry(.18,.02,.1),0,.89,.03,0,0,0,gold);};
  // RoundedBoxGeometry class (set from kit)
// look of each racer (style lives in racers.js). portrait = inner SVG (viewBox 0 0 24 24) for the HUD.
export const RIVAL_LOOKS=[
 {name:'Pip',paint:0xff7a1a,accent:0x7dff6a,css:'#ff7a1a',drv:pipDriver,svg:'<path d="M4 3l5 6h6l5-6-1 10-7 8-7-8z" fill="#fff"/><circle cx="9.5" cy="12" r="1.3" fill="#1a1214"/><circle cx="14.5" cy="12" r="1.3" fill="#1a1214"/>'},
 {name:'Mochi',paint:0xff8fc8,accent:0xfff27a,css:'#ff8fc8',drv:bunnyD,svg:'<ellipse cx="8.5" cy="6" rx="2" ry="5" fill="#fff"/><ellipse cx="15.5" cy="6" rx="2" ry="5" fill="#fff"/><circle cx="12" cy="14" r="6.5" fill="#fff"/><circle cx="9.7" cy="13.5" r="1.1" fill="#1a1214"/><circle cx="14.3" cy="13.5" r="1.1" fill="#1a1214"/><circle cx="12" cy="16" r="1" fill="#ff6ab8"/>'},
 {name:'Bolt',paint:0x7f9cc8,accent:0x35f2ff,css:'#7f9cc8',drv:robotD,svg:'<rect x="5" y="7" width="14" height="12" rx="3" fill="#e8eef8"/><rect x="7" y="10.5" width="10" height="3" rx="1.5" fill="#35f2ff"/><path d="M12 7V3.5" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="3" r="1.6" fill="#ff3fd8"/>'},
 {name:'Kiki',paint:0x8a4dff,accent:0xff3fd8,css:'#8a4dff',drv:catD,svg:'<path d="M5 4l4 5h6l4-5v10a7 7 0 0 1-14 0z" fill="#e8dcff"/><circle cx="9.5" cy="13" r="1.3" fill="#241a30"/><circle cx="14.5" cy="13" r="1.3" fill="#241a30"/><path d="M11 16h2l-1 1z" fill="#ff6ab8"/>'},
 {name:'Coco',paint:0x2fd0a0,accent:0xffe14d,css:'#2fd0a0',drv:pandaD,svg:'<circle cx="6.5" cy="7" r="3" fill="#22202a"/><circle cx="17.5" cy="7" r="3" fill="#22202a"/><circle cx="12" cy="13" r="7.5" fill="#fff"/><ellipse cx="9" cy="12.5" rx="2" ry="2.6" fill="#22202a"/><ellipse cx="15" cy="12.5" rx="2" ry="2.6" fill="#22202a"/><circle cx="12" cy="16" r="1.2" fill="#22202a"/>'},
 {name:'Shelly',paint:0xffc02a,accent:0x7dff6a,css:'#e0a010',drv:turtleD,svg:'<circle cx="12" cy="13" r="7" fill="#6ad86a"/><path d="M5 11a7 7 0 0 1 14 0z" fill="#ffc02a"/><circle cx="9.5" cy="14" r="1.2" fill="#1a1214"/><circle cx="14.5" cy="14" r="1.2" fill="#1a1214"/><path d="M10 17q2 1.5 4 0" stroke="#2a7a4a" stroke-width="1.2" fill="none"/>'}];
const HERO_SVG='<circle cx="12" cy="11" r="8" fill="#fff"/><rect x="5" y="9" width="14" height="5" rx="2.5" fill="#101828"/>';
export const HERO_LOOK={name:'You',css:'#e8287a',svg:HERO_SVG};
// fx atlas: [glow | bubble] / [star | spark]
let fxAtlas=null;
function atlas(kit){if(fxAtlas)return fxAtlas;fxAtlas=kit.tex(kit.cv(256,256,(g)=>{
  let r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
  r=g.createRadialGradient(192,64,30,192,64,62);r.addColorStop(0,'rgba(255,255,255,.05)');r.addColorStop(.8,'rgba(255,255,255,.35)');r.addColorStop(.93,'rgba(255,255,255,1)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(128,0,128,128);
  g.fillStyle='rgba(255,255,255,.9)';for(const [x,y,s] of[[168,40,7],[214,82,5],[176,92,4]]){g.beginPath();g.moveTo(x,y+s*.9);g.bezierCurveTo(x-s*1.6,y-s*.2,x-s*.6,y-s*1.4,x,y-s*.4);g.bezierCurveTo(x+s*.6,y-s*1.4,x+s*1.6,y-s*.2,x,y+s*.9);g.fill();}
  r=g.createRadialGradient(64,192,0,64,192,64);r.addColorStop(0,'rgba(255,255,255,.9)');r.addColorStop(.4,'rgba(255,255,255,.25)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,128,128,128);
  g.fillStyle='#fff';g.beginPath();for(let i=0;i<10;i++){const a=i/10*Math.PI*2-Math.PI/2,rr=i%2?18:44;g.lineTo(64+Math.cos(a)*rr,192+Math.sin(a)*rr);}g.fill();
  r=g.createRadialGradient(192,192,0,192,192,60);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.15,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(128,128,128,128);
  g.fillRect(190,136,4,112);g.fillRect(136,190,112,4);}),false,false);return fxAtlas;}
const quadUV=(g,qx,qy)=>{const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(qx+uv.getX(i))/2,1-(qy+1-uv.getY(i))/2);return g;};   // qx,qy: atlas cell (0/1)
const tint=(g,c,m=1)=>K.paintCol(g,new THREE.Color(c).multiplyScalar(m));
// N rivals + the hero: rivals in 4 draw calls; fx slots (shield bubble, rocket star) also cover the hero (index N).
export function buildRivals(kit,looks){K=kit;kitRB=kit.RoundedBoxGeometry;const N=looks.length,{S}=kit;
  const base={dark:0x1a1820,chrome:0xc8c8d4,tyre:0x1a191c,visor:0x141c2c};const op=[],li=[],sh=[],fx=[];
  looks.forEach((lk,i)=>{const parts=kartParts(kit,lk.accent,lk.drv,true);
   for(const key in parts)for(let g of parts[key]){if(key==='lights'){li.push({g,slot:i});continue;}
    if(!g.attributes.color)g=K.paintCol(g,new THREE.Color(key==='paint'?lk.paint:base[key]??0x808080));op.push({g,slot:i});}
   const sg=new THREE.PlaneGeometry(1.6,2.4).rotateX(-Math.PI/2).translate(0,.012,0);sh.push({g:sg,slot:i});
   fx.push({g:tint(quadUV(new THREE.PlaneGeometry(1.8,2.6),0,0).rotateX(-Math.PI/2).translate(0,.02,0),lk.accent,.5),slot:i});});
  for(let i=0;i<=looks.length;i++){const b3=3*looks.length+2+3*i;   // M6B: slowed-rival timer ring (bubble cell, shrinks as the slow runs out) + 2 blue fizz sparks
   fx.push({g:tint(quadUV(new THREE.PlaneGeometry(2.4,2.4),1,0),0x5ac8ff,1.5),slot:b3});
   fx.push({g:tint(quadUV(new THREE.PlaneGeometry(.9,.9),1,1),0x9ae8ff,1.6),slot:b3+1});fx.push({g:tint(quadUV(new THREE.PlaneGeometry(.7,.7),1,1),0xffffff,1.4),slot:b3+2});}
  const shieldCol=[0x9af6ff,0xff8ae0];
  for(let i=0;i<=N;i++){fx.push({g:tint(quadUV(new THREE.PlaneGeometry(2.9,2.9),1,0),shieldCol[i%2],.9),slot:N+i});
   fx.push({g:tint(quadUV(new THREE.PlaneGeometry(2.6,2.6),0,1),0xffd23a,1.2),slot:2*N+1+i});}
  const opM=palMesh(S,op,new THREE.MeshStandardMaterial({vertexColors:true,metalness:.35,roughness:.42,envMapIntensity:1.3}),N);
  const liM=palMesh(S,li,new THREE.MeshBasicMaterial({vertexColors:true}),N);
  const shM=palMesh(S,sh,new THREE.MeshBasicMaterial({map:kit.shadowT,transparent:true,depthWrite:false,opacity:.9}),N);shM.mesh.renderOrder=3;
  const fxM=palMesh(S,fx,new THREE.MeshBasicMaterial({map:atlas(kit),vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),6*N+5,'rgb');fxM.mesh.renderOrder=6;
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),qz=new THREE.Quaternion(),Z=new THREE.Vector3(0,0,1),one=new THREE.Vector3(1,1,1),v=new THREE.Vector3(),v2=new THREE.Vector3();
  return {N,meshes:[opM.mesh,liM.mesh,shM.mesh,fxM.mesh],
   // kart body matrix (m) and ground shadow matrix (gm); null hides
   setKart(i,m,gm){if(!m){for(const P of[opM,liM,shM])hideSlot(P.M,i);hideSlot(fxM.M,i);return;}setSlotM(opM.M,i,m);setSlotM(liM.M,i,m);setSlotM(fxM.M,i,gm,1);setSlotM(shM.M,i,gm);},
   // camera-facing bubble / spinning star; who = 0..N (N = hero); pos = world point, a = brightness (0 hides)
   setShield(who,pos,a,camQ){if(!(a>0)){hideSlot(fxM.M,N+who);return;}m4.compose(pos,camQ,one);setSlotM(fxM.M,N+who,m4,a);},
   setSlow(who,pos,frac,camQ,t){const b3=3*N+2+3*who;if(!(frac>0)){for(let j=0;j<3;j++)hideSlot(fxM.M,b3+j);return;}
    const k=.55+.45*frac;m4.compose(pos,camQ,v.setScalar(k*(1+.05*Math.sin(t*16))));setSlotM(fxM.M,b3,m4,.55+.45*frac);   // ring: shrinks and dims as the slow runs out
    for(let j=1;j<3;j++){const a=t*(j===1?5.2:-6.7)+j*2.1,r=.85*k,y=Math.sin(t*(7+j*2)+j)*.25;v2.set(Math.cos(a)*r,y+.1,Math.sin(a)*.2).applyQuaternion(camQ).add(pos);   // fizz: sparks orbiting the kart
     m4.compose(v2,camQ,v.setScalar(.6+.5*Math.abs(Math.sin(t*13+j*3))));setSlotM(fxM.M,b3+j,m4,1.3);}},
   setStar(who,pos,a,camQ,t){if(!(a>0)){hideSlot(fxM.M,2*N+1+who);return;}q.copy(camQ).multiply(qz.setFromAxisAngle(Z,t*3));m4.compose(pos,q,v.setScalar(.9+.15*Math.sin(t*14)));setSlotM(fxM.M,2*N+1+who,m4,a);}};}

// ---------- M4: customization glue ----------
export function setHeroLook(c){c=normCustom(c);HERO_LOOK.css='#'+new THREE.Color(PAINTS[c.paint].hex).getHexString();HERO_LOOK.svg=HERO_SVG+badgeInner(c.emblem,c.emblemColor);}   // ladder / podium portrait colour follows the paint
export function applyKart(hero,c){const h=hero||HERO;if(h)h.userData.restyle(c);setHeroLook(c);}
export const heroKart=()=>HERO;
// a second kart for the garage preview (own scene; shares the kit's textures/geometry helpers, not its scene)
export function buildPreviewKart(scene,custom){const kit=Object.assign({},MK,{S:scene});return kart(kit,0xe8287a,0x35f2ff,heroDriver,custom);}
// ---------- M4: on-kart power-up effects + trail (hero only). 2 extra draw calls at most, and only while something is showing. ----------
let FX=null;
function heart(g){g.fillStyle='#fff';g.beginPath();g.moveTo(32,56);g.bezierCurveTo(-6,30,10,2,32,20);g.bezierCurveTo(54,2,70,30,32,56);g.fill();}
function star(g){g.fillStyle='#fff';g.beginPath();for(let i=0;i<10;i++){const a=i/10*Math.PI*2-Math.PI/2,r=i%2?12:30;g.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r);}g.fill();g.fillRect(31,2,2,60);g.fillRect(2,31,60,2);}
function makeFx(kit){const {S,cam,tex,cv,glowT}=kit,TR=40;
  const T={glow:glowT,heart:tex(cv(64,64,heart),false,false),star:tex(cv(64,64,star),false,false)};
  const flameT=tex(cv(32,128,g=>{const r=g.createLinearGradient(0,0,0,128);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,220,120,.9)');r.addColorStop(.6,'rgba(255,110,30,.5)');r.addColorStop(1,'rgba(255,60,0,0)');g.fillStyle=r;g.beginPath();g.moveTo(16,0);g.bezierCurveTo(40,10,26,70,16,128);g.bezierCurveTo(6,70,-8,10,16,0);g.fill();}),false,false);
  const tm=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:T.glow,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),TR);
  tm.frustumCulled=false;tm.layers.set(1);tm.renderOrder=7;tm.visible=false;S.add(tm);
  const fg=[];for(const x of[-.28,.28])for(const yaw of[0,.3,-.3]){const p=new THREE.PlaneGeometry(.26,1.3).rotateX(-Math.PI/2).rotateY(yaw).translate(x,.3,1.75);fg.push(p);}
  const flames=new THREE.Mesh(kit.merge(fg),new THREE.MeshBasicMaterial({map:flameT,color:new THREE.Color(2,1.2,.5),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  flames.renderOrder=7;flames.layers.set(1);flames.visible=false;
  const pt=[];for(let i=0;i<TR;i++)pt.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,l:0,m:1,h:0,s:1});
  return {tm,flames,pt,T,n:0,acc:0,t:0,mapKey:'glow',cam,TR,m:new THREE.Matrix4(),q:new THREE.Quaternion(),v:new THREE.Vector3(),sc:new THREE.Vector3(),c:new THREE.Color(),hop:0,ugBase:null};}
const TRAIL_KIND=['','star','heart','glow','glow'];   // sprite per trail option
export function heroFx(P,dt){const hero=HERO;if(!hero||!K||dt<=0)return;if(!FX){FX=makeFx(K);hero.add(FX.flames);}
  const f=FX,c=hero.userData.custom||{trail:0},ud=hero.userData;f.t+=dt;if(f.flames.parent!==hero)hero.add(f.flames);
  const boost=P.boost>0,rocket=P.rocket>0;f.flames.visible=boost||rocket;
  if(f.flames.visible){const k=(rocket?1.5:1)*(.8+.35*Math.sin(f.t*40)+.15*Math.sin(f.t*67));f.flames.scale.set(1+.2*Math.sin(f.t*31),1,k);f.flames.material.color.setRGB(rocket?2.2:2,rocket?1.6:1.1,rocket?.5:.35);}
  // Gravity Hop: the glow under the kart turns violet and swells
  const hop=!!P.floaty;f.hop+=((hop?1:0)-f.hop)*Math.min(1,dt*10);const ug=ud.ug;
  if(f.hop>.02){ug.material.color.setRGB(.7,.5,1).multiplyScalar(1+.4*Math.sin(f.t*14));ug.material.opacity=.45+.4*f.hop;ug.scale.setScalar(1+.7*f.hop);f.ugOn=true;}
  else if(f.ugOn){f.ugOn=false;ug.scale.setScalar(1);ug.material.opacity=.45;const fin=FINISHES[c.finish||0];ug.material.color.set(fin.glow?PAINTS[c.paint||0].hex:ud.accent);}
  // trail + Rocket Star sparkles share one instanced mesh
  const kind=TRAIL_KIND[c.trail|0],want=(c.trail|0)>0||rocket,mov=P.v>3&&!P.finished;
  let any=false;for(const p of f.pt)if(p.l>0){any=true;break;}
  if(want&&mov||any){const key=rocket&&!(c.trail|0)?'star':kind||'star';if(key!==f.mapKey){f.mapKey=key;f.tm.material.map=f.T[key];f.tm.material.needsUpdate=true;}
   if(want&&mov){f.acc+=dt*(rocket?46:c.trail===4?42:30);while(f.acc>=1){f.acc-=1;const p=f.pt[f.n++%f.TR],r=Math.random;hero.localToWorld(f.v.set((r()-.5)*.7,.18+r()*.2,1.35));p.x=f.v.x;p.y=f.v.y;p.z=f.v.z;
     p.vx=(r()-.5)*.8;p.vz=(r()-.5)*.8;p.vy=c.trail===4?1+r():c.trail===2?.5+r()*.6:.2+r()*.5;p.l=p.m=c.trail===4?.45:.8;p.h=r();p.s=c.trail===3?.4:c.trail===4?.55:.34;if(rocket&&!(c.trail|0)){p.s=.36;p.h=.14;}}}
   const mt=f.tm,cam=f.cam;mt.visible=true;let live=0;
   for(let i=0;i<f.TR;i++){const p=f.pt[i];if(p.l>0){p.l-=dt;live++;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}const a=p.l>0?p.l/p.m:0;
    const sz=p.s*(c.trail===4?a*1.3+.2:.4+a*.8)*(p.l>0?1:0);f.m.compose(f.v.set(p.x,p.y,p.z),cam.quaternion,f.sc.setScalar(sz));mt.setMatrixAt(i,f.m);
    const tk=(c.trail|0);if(tk===3)f.c.setHSL((p.h+f.t*.6)%1,1,.6);else if(tk===4)f.c.setHSL(.02+.1*(1-a),1,.55);else if(tk===2)f.c.setHSL(.9+.05*p.h,.9,.7);else f.c.setHSL(.12+.1*p.h,.9,.78);
    f.c.multiplyScalar(1.5*a+.3);mt.setColorAt(i,f.c);}
   mt.instanceMatrix.needsUpdate=true;if(mt.instanceColor)mt.instanceColor.needsUpdate=true;if(!live&&!(want&&mov))mt.visible=false;}
  else if(f.tm.visible)f.tm.visible=false;}
export function heroFxReset(){if(FX){FX.tm.visible=false;FX.flames.visible=false;for(const p of FX.pt)p.l=0;if(FX.ugOn){HERO.userData.ug.scale.setScalar(1);HERO.userData.ug.material.opacity=.45;FX.ugOn=false;}}}
