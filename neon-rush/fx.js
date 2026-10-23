// Neon Rush new look (v8 N). One instanced mesh for speed streaks, shared later with sparks.
// Layer 1 keeps the mesh out of the wet-road mirror.
import * as THREE from 'three';

const PAL=[0x35f2ff,0xff3fd8,0xffd23a,0xa070ff].map(c=>new THREE.Color(c));
const WHITE=new THREE.Color(1,1,1);
const sm=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const V=()=>new THREE.Vector3();

function streakTex(){const c=document.createElement('canvas');c.width=32;c.height=128;const g=c.getContext('2d');const im=g.createImageData(32,128);
 for(let y=0;y<128;y++)for(let x=0;x<32;x++){const u=(x+.5)/32*2-1,v=1-(y+.5)/128;
  const across=Math.exp(-u*u*14),core=Math.exp(-u*u*90),along=Math.pow(v,1.6)*sm(1,.86,v)+(v>.86?sm(1,.86,v):0);
  const a=Math.min(1,(across*.55+core)*Math.min(1,along)),i=(y*32+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=255;im.data[i+3]=Math.round(255*a);}
 g.putImageData(im,0,0);return new THREE.CanvasTexture(c);}
function groundTex(){const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');
 let r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
 r=g.createRadialGradient(192,64,0,192,64,64);r.addColorStop(0,'rgba(255,255,255,0)');r.addColorStop(.72,'rgba(255,255,255,0)');r.addColorStop(.86,'rgba(255,255,255,1)');r.addColorStop(.93,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(128,0,128,128);
 return new THREE.CanvasTexture(c);}

const CSS=`
.nlvig{position:fixed;inset:0;z-index:1;pointer-events:none;background:radial-gradient(ellipse 72% 68% at 50% 56%,rgba(26,6,56,0) 58%,rgba(26,6,56,.85) 100%);opacity:0}
.nlpop{position:fixed;z-index:3;pointer-events:none;white-space:nowrap;transform:translate(0,-50%) rotate(-7deg) scale(.3);opacity:0;line-height:1;font-weight:900;text-align:left}
.nlpop.show{animation:nlPop .42s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes nlPop{0%{opacity:0;transform:translate(0,-50%) rotate(-12deg) scale(.3)}55%{opacity:1;transform:translate(0,-50%) rotate(-5deg) scale(1.18)}100%{opacity:1;transform:translate(0,-50%) rotate(-7deg) scale(1)}}
.nlpop b,.nlpop i{position:relative;display:block;font-style:normal}
.nlpop b{font-size:clamp(34px,calc(min(1vw,1vh)*8.6),58px);letter-spacing:1px}
.nlpop i{font-size:clamp(26px,calc(min(1vw,1vh)*6.4),42px);margin:2px 0 0 10px}
.nlpop b::before,.nlpop i::before{content:attr(data-t);position:absolute;left:0;top:0;-webkit-text-stroke:9px #2a0a4e;color:#2a0a4e;z-index:-1;filter:drop-shadow(0 0 10px rgba(255,63,216,.85)) drop-shadow(0 4px 0 #170530)}
.nlpop b{background:linear-gradient(180deg,#fff 0%,#ffe6fb 35%,#ff7fe6 62%,#c04dff 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.nlpop i::before{filter:drop-shadow(0 0 10px rgba(255,170,0,.85)) drop-shadow(0 3px 0 #3a1a00)}
.nlpop i{background:linear-gradient(180deg,#fffbe0,#ffe14d 50%,#ff9a1a);-webkit-background-clip:text;background-clip:text;color:transparent}
.nlcombo{position:fixed;z-index:3;pointer-events:none;white-space:nowrap;font-weight:900;padding:4px 16px 6px;border-radius:20px;color:#fff;background:linear-gradient(180deg,rgba(60,20,120,.92),rgba(24,6,56,.92));border:3px solid #35f2ff;box-shadow:0 0 14px rgba(53,242,255,.75),inset 0 0 10px rgba(53,242,255,.35);transform:translate(0,-50%) rotate(4deg) scale(.4);opacity:0}
.nlcombo.show{animation:nlCombo .4s .12s cubic-bezier(.2,1.6,.4,1) forwards}
@keyframes nlCombo{0%{opacity:0;transform:translate(0,-50%) rotate(8deg) scale(.4)}60%{opacity:1;transform:translate(0,-50%) rotate(2deg) scale(1.12)}100%{opacity:1;transform:translate(0,-50%) rotate(4deg) scale(1)}}
.nlcombo span{font-size:clamp(18px,calc(min(1vw,1vh)*4.4),28px);letter-spacing:1px;text-shadow:0 0 8px #35f2ff}
.nlcombo em{font-style:normal;font-size:clamp(24px,calc(min(1vw,1vh)*6),38px);color:#ffe14d;text-shadow:0 0 8px #ff9a00,0 2px 0 #5a2a00}
.nlrank{display:flex;align-items:center;gap:clamp(14px,calc(min(1vw,1vh)*3.4),30px)}
.nlbw{position:relative;width:clamp(96px,calc(min(1vw,1vh)*24),150px);height:clamp(96px,calc(min(1vw,1vh)*24),150px);flex:none}
.nlhalo{position:absolute;inset:-22%;border-radius:50%;background:conic-gradient(from 0deg,rgba(255,210,58,0),rgba(255,210,58,.55),rgba(255,63,216,0),rgba(53,242,255,.5),rgba(255,210,58,0));filter:blur(10px);animation:nlSpin 9s linear infinite;opacity:.85}
@keyframes nlSpin{to{transform:rotate(360deg)}}
.nlbadge{position:absolute;inset:0;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 35%,#5a24a0,#22084a 62%,#14042e);border:5px solid #ffd23a;box-shadow:0 0 22px #ffb300,0 0 4px #fff,inset 0 0 22px rgba(255,210,58,.55),inset 0 -8px 18px rgba(0,0,0,.4)}
.nlbadge span{font-size:clamp(66px,calc(min(1vw,1vh)*17),110px);font-weight:900;line-height:1;background:linear-gradient(180deg,#fff 0%,#fff6c8 40%,#ffd23a 70%,#ff9a1a 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 10px rgba(255,190,40,.9)) drop-shadow(0 4px 0 #6a3a00)}
.nlbadge::after{content:"";position:absolute;inset:-30%;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.55) 48%,rgba(255,255,255,.1) 54%,transparent 60%);transform:translateX(-60%);animation:nlShine 3.2s ease-in-out infinite}
@keyframes nlShine{0%,35%{transform:translateX(-60%)}75%,100%{transform:translateX(60%)}}
.nlsp{position:absolute;width:calc(26px*var(--k,1) + 8px);height:calc(26px*var(--k,1) + 8px);margin:-13px 0 0 -13px;pointer-events:none;animation:nlTw 1.8s ease-in-out infinite;opacity:.4}
.nlsp svg{width:100%;height:100%;fill:#fff6c8;filter:drop-shadow(0 0 6px #ffd23a)}
.nltw .nlsp:nth-child(3n) svg{fill:#c9fbff;filter:drop-shadow(0 0 6px #35f2ff)}
.nltw .nlsp:nth-child(3n+1) svg{fill:#ffd0f4;filter:drop-shadow(0 0 6px #ff3fd8)}
@keyframes nlTw{0%,100%{opacity:.35;transform:scale(.6) rotate(0)}50%{opacity:1;transform:scale(1) rotate(20deg)}}
.nltw{position:absolute;inset:0;pointer-events:none;z-index:0}
#finish.nl .card{position:relative;z-index:1}
@media (prefers-reduced-motion:reduce){.nlsp,.nlhalo,.nlbadge::after{animation:none}}
.nlranktxt{text-align:left}.nlranktxt .sub{display:block;font-size:clamp(16px,calc(min(1vw,1vh)*4),24px);font-weight:700;opacity:.92}
.nlranktxt h2{font-size:clamp(30px,calc(min(1vw,1vh)*8),52px)}
.nlranktxt .nlbest{display:inline-block;margin-top:4px;padding:2px 10px;border-radius:999px;border:2px solid #fff;background:rgba(90,20,80,.92);color:#ffe14d;font-size:clamp(13px,calc(min(1vw,1vh)*3.2),18px);font-weight:900;line-height:1.2;white-space:nowrap}
body:has(#finish.show) #pop{opacity:0!important;visibility:hidden!important}
.nlstats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(8px,calc(min(1vw,1vh)*2),16px);width:min(560px,92vw)}
.nlstat{background:linear-gradient(180deg,rgba(50,16,100,.8),rgba(24,6,56,.8));border:3px solid #35f2ff;border-radius:18px;padding:8px 6px;box-shadow:0 0 12px rgba(53,242,255,.5)}
.nlstat span{display:block;font-size:clamp(15px,calc(min(1vw,1vh)*3.6),22px);font-weight:700;opacity:.92}
.nlstat b{display:block;font-size:clamp(22px,calc(min(1vw,1vh)*6.2),40px);font-weight:900;color:#ffe14d;text-shadow:0 0 8px #ff9a00;white-space:nowrap}
.nlstat:nth-child(2){border-color:#ff3fd8;box-shadow:0 0 12px rgba(255,63,216,.5)}
.nlstat:nth-child(3){border-color:#a070ff;box-shadow:0 0 12px rgba(160,112,255,.5)}
#finish.nl{background:rgba(12,4,30,.78)}#finish.nl h2{letter-spacing:2px}
#finish.nl .stats,#finish.nl #finSub{display:none}
#finish.nl .big{min-height:88px}
#finish.nl .lbtn .rb{width:88px;height:88px}
@media (max-width:520px){#finish.nl .big{min-height:64px;font-size:clamp(18px,5vw,28px)}#finish.nl .lbtn .rb{width:64px;height:64px}}
@media (max-height:500px){.nlstats{width:min(640px,70vw)}#finish.nl .podium{display:none}#finish.nl .big{min-height:48px;font-size:16px;padding:4px 12px}#finish.nl .lbtn .rb{width:48px;height:48px}#finish.nl .nlbw{width:84px;height:84px}#finish.nl .nlbadge span{font-size:58px}#finish.nl .nlbest{font-size:13px;margin-top:2px;padding:1px 8px}}
@media (max-width:430px){#finish.nl .card{gap:8px}#finish.nl .nlbw{width:92px;height:92px}}
`;

function star(){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');
 const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d','M12 0c.8 6.4 4.8 10.6 12 12-7.2 1.4-11.2 5.6-12 12-.8-6.4-4.8-10.6-12-12C7.2 10.6 11.2 6.4 12 0z');svg.appendChild(p);return svg;}
function sparkle(x,y,k,delay){const i=document.createElement('i');i.className='nlsp';i.style.left=x+'%';i.style.top=y+'%';i.style.setProperty('--k',String(k));i.style.animationDelay=delay+'s';i.appendChild(star());return i;}
export function rankOf(s){const pts=(s.place===1?3:s.place<=3?2:1)+(s.perfect>=3?1:0)+(s.bestCombo>=3?1:0);return pts>=5?'S':pts>=4?'A':pts>=3?'B':'C';}

export function createLook(){
 const stats={top:0,air:0,perfect:0,bestCombo:0,clock:0,lastLand:-9};
 let cssDone=false,popEl,comboEl,vigEl,popB,popI,comboEm,sized=false,popW=180,popH=90,comboW=140,comboH=40;
 let fx,ground,sky,gAttr,gCol,cam,hero,world,low,capS=220,capT=56,glowDone=false;
 const sp=[],st=[];
 const v1=V(),v2=V(),v3=V(),X=V(),Y=V(),Z=V(),kv=V(),tc=new THREE.Color();
 const M=new THREE.Matrix4(),Ml=new THREE.Matrix4();
 let prevAir=0,lastVy=0,airT=0,airF=0,dipY=0,dipV=0,landT=9,popT=0,comboT=0,comboN=0,fovAdd=0,turnAcc=0,hsS=0,popVal=0,popShown=0,slowT=0,dropFlash=false,lastMs=0,calmHold=false;

 function ensureCss(){if(cssDone||typeof document==='undefined')return;cssDone=true;
  const css=document.createElement('style');css.textContent=CSS;document.head.appendChild(css);
  let rzF=0;addEventListener('resize',()=>{clearTimeout(rzF);rzF=setTimeout(()=>requestAnimationFrame(()=>{const f=document.getElementById('finish');if(f&&f.classList.contains('nl')){settleFinish(f);setTimeout(()=>settleFinish(f),450);setTimeout(()=>settleFinish(f),1100);}}),200);});   // after main.js's 150 ms resize settle, so twinkles use the final layout
  popEl=document.createElement('div');popEl.className='nlpop';popB=document.createElement('b');popI=document.createElement('i');popEl.append(popB,popI);document.body.appendChild(popEl);
  comboEl=document.createElement('div');comboEl.className='nlcombo';const csp=document.createElement('span');csp.textContent='COMBO';comboEm=document.createElement('em');comboEl.append(csp,document.createTextNode(' '),comboEm);document.body.appendChild(comboEl);
  vigEl=document.createElement('div');vigEl.className='nlvig';const stage=document.getElementById('stage');if(stage)stage.after(vigEl);else document.body.appendChild(vigEl);}
 function measureOnce(){if(sized||!popEl)return;
  popB.textContent='PERFECT!';popB.dataset.t='PERFECT!';popI.textContent='+450';popI.dataset.t='+450';
  comboEm.textContent='×8';
  const w=popEl.offsetWidth,h=popEl.offsetHeight;if(w<8||h<8)return;
  popW=w;popH=h;comboW=comboEl.offsetWidth||comboW;comboH=comboEl.offsetHeight||comboH;sized=true;
  popB.textContent='';popB.dataset.t='';popI.textContent='';popI.dataset.t='';comboEm.textContent='';}

 function newStreak(first){const corner=Math.random()<.65,k=(Math.random()*4)|0,base=[.72,2.42,3.86,5.56][k];
  return {th:corner?base+(Math.random()-.5)*.7:Math.random()*6.283,rho:first?.55+Math.random()*.7:.5+Math.random()*.25,sp:.7+Math.random()*.6,c:Math.random()<.35?4:(Math.random()*3)|0,w:.6+Math.random()*.8};}
 function emit(pos,vel,life,ci,w=1){let s=null;for(const q of sp)if(q.life<=0){s=q;break;}if(!s)return;s.p.copy(pos);s.v.copy(vel);s.life=s.max=life;s.c=ci;s.w=w;}
 function buildSky(isLow,bands){const Rs=isLow?320:520,pos=[],col=[],idx=[];
  const band=(r,rows,seg,isDome)=>{const base=pos.length/3;for(let j=0;j<rows.length;j++){const [y,c,a]=rows[j];for(let i=0;i<=seg;i++){const t=i/seg*Math.PI*2;
    const rr=isDome?r*Math.cos(Math.asin(Math.max(-.999,Math.min(.999,y/r)))):r;pos.push(Math.cos(t)*rr,y,Math.sin(t)*rr);const k=new THREE.Color(c);col.push(k.r,k.g,k.b,a);}}
   for(let j=0;j<rows.length-1;j++)for(let i=0;i<seg;i++){const a=base+j*(seg+1)+i,b=a+seg+1;idx.push(a,b,a+1,a+1,b,b+1);}};
  const s=Rs/520,seg=isLow?32:48,bseg=isLow?24:40;
  band(Rs*.999,[[-Rs*.5,0x1a0636,1],[-20*s,0x3a1066,1],[10*s,0x2a0b52,1],[60*s,0x140534,1],[160*s,0x0a0322,1],[Rs*.9,0x04010e,1]],seg,true);
  if(bands){band(440*s,[[-30*s,0x7a2cff,.0],[-8*s,0x7a2cff,.75],[22*s,0x5a1ed0,.55],[70*s,0x3a1090,.0]],bseg,false);
   band(300*s,[[-20*s,0x20e0ff,.0],[0,0x20e0ff,.35],[10*s,0x20c8ff,.22],[30*s,0x2080ff,.0]],bseg,false);
   band(190*s,[[-20*s,0xff3fc8,.0],[-4*s,0xff3fc8,.5],[12*s,0xff50d0,.3],[38*s,0xa02cff,.0]],bseg,false);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,4));g.setIndex(idx);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,fog:false,side:THREE.DoubleSide}));
  m.frustumCulled=false;m.renderOrder=-10;m.name='nlsky';return m;}
 function boostGlow(){if(!world)return;const S=world.kit&&world.kit.S;if(!S)return;
  S.traverse(o=>{const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms){
   if(m.userData&&m.userData.nl)continue;
   if(m.isMeshBasicMaterial&&!m.map&&m.color&&Math.max(m.color.r,m.color.g,m.color.b)>1.5){m.color.multiplyScalar(1.6);m.userData.nl=1;}}});
  const rm=world.fx&&world.fx.roadMat;if(!rm||!rm.map)return;
  const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,512,512);
  g.fillStyle='#fff';for(const u of[1/3,2/3])g.fillRect(u*512-4,20,8,200);g.fillStyle='#9ff';g.fillRect(14,0,10,512);g.fillRect(488,0,10,512);
  const t=new THREE.CanvasTexture(c);t.wrapS=rm.map.wrapS;t.wrapT=rm.map.wrapT;t.repeat.copy(rm.map.repeat);t.offset.copy(rm.map.offset);t.colorSpace=THREE.SRGBColorSpace;
  S.traverse(o=>{const m=o.material;if(m&&m.map&&m.map.image===rm.map.image&&m.isMeshStandardMaterial&&!m.userData.nlRoad){m.emissiveMap=t;m.emissive=new THREE.Color(.75,.9,1);m.emissiveIntensity=1.15;m.userData.nlRoad=1;m.needsUpdate=true;}});}

 function bind(ctx){ensureCss();cam=ctx.cam;world=ctx.world;hero=world.hero;low=!!ctx.low;glowDone=false;
  capS=low?80:220;capT=low?20:56;sp.length=0;st.length=0;
  for(let i=0;i<capS;i++)sp.push({p:V(),v:V(),life:0,max:1,c:0,w:1});
  for(let i=0;i<capT;i++)st.push(newStreak(true));
  const S=ctx.S;
  fx=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:streakTex(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,side:THREE.DoubleSide}),capS+capT);
  fx.frustumCulled=false;fx.layers.set(1);fx.count=0;fx.visible=false;fx.renderOrder=5;fx.name='nlfx';fx.material.userData.nl=1;fx.setColorAt(0,WHITE);S.add(fx);
  const gg=new THREE.BufferGeometry();const pos=new Float32Array(24),uv=new Float32Array([0,0,.5,0,.5,1,0,1, .5,0,1,0,1,1,.5,1]);gCol=new Float32Array(32);
  gg.setAttribute('position',new THREE.BufferAttribute(pos,3));gg.setAttribute('uv',new THREE.BufferAttribute(uv,2));gg.setAttribute('color',new THREE.BufferAttribute(gCol,4));gg.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);
  ground=new THREE.Mesh(gg,new THREE.MeshBasicMaterial({map:groundTex(),vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4}));
  ground.frustumCulled=false;ground.renderOrder=4;ground.layers.set(1);ground.visible=false;ground.name='nlground';ground.material.userData.nl=1;gAttr=gg.attributes;S.add(ground);
  sky=buildSky(low,!low);sky.layers.set(1);sky.material.userData.nl=1;S.add(sky);
  // the sky dome covers the whole view, so the scene background would be a wasted draw call: drop it in the main pass, keep it for the wet-road mirror pass
  if(S.background&&!S.userData.nlbg){const bg=S.background;S.userData.nlbg=bg;S.background=null;const mr=world.mirror;
   if(mr&&!mr.userData.nlbg){mr.userData.nlbg=1;const ob=mr.onBeforeRender;mr.onBeforeRender=function(...a){S.background=bg;try{ob.apply(this,a);}finally{S.background=null;}};}}}

 function land(impact,P){stats.lastLand=stats.clock;landT=0;const big=impact>7;
  if(!calmHold)dipV-=Math.min(big?4.5:2.2,impact*.4);
  const n=low?(big?40:22):(big?140:70);kv.set(0,0,-1).applyQuaternion(hero.quaternion).multiplyScalar(P.v);
  for(let i=0;i<n;i++){const side=i%2?1:-1,fwd=big&&i%5===0;
   hero.localToWorld(v1.set(side*(.55+Math.random()*.2),.06,fwd?-.6:.65));
   v2.set(side*(1+Math.random()*(big?6:4)),1.2+Math.random()*(big?5:3.5),fwd?-(2+Math.random()*5):(1+Math.random()*5)).applyQuaternion(hero.quaternion).add(kv);
   emit(v1,v2,.35+Math.random()*(big?.65:.45),Math.random()<.5?0:Math.random()<.6?1:2,1);}
  if(airT>.35){stats.perfect++;comboN=comboT>0?comboN+1:1;comboT=4;stats.bestCombo=Math.max(stats.bestCombo,comboN);popVal=150*comboN;popShown=0;showPop();}}
 function showPop(){measureOnce();const t0='PERFECT!';popB.textContent=t0;popB.dataset.t=t0;popI.textContent='+0';popI.dataset.t='+0';
  popEl.classList.remove('show');void popEl.offsetWidth;popEl.classList.add('show');popT=1.6;
  const pop=document.getElementById('pop');if(pop)pop.style.visibility='hidden';
  if(comboN>1){comboEm.textContent='×'+comboN;comboEl.classList.remove('show');void comboEl.offsetWidth;comboEl.classList.add('show');}}
 function clearPops(){popT=0;comboT=0;if(popEl)popEl.classList.remove('show');if(comboEl)comboEl.classList.remove('show');
  const pop=document.getElementById('pop');if(pop)pop.style.visibility='';}
 function placePops(){if(!hero||!cam||popT<=0&&comboT<=0)return;
  hero.getWorldPosition(v1);let x0=1e9,x1=-1e9,y0=1e9;
  for(const [ox,oy] of [[-1.1,1.4],[1.1,1.4],[-1.1,0],[1.1,0]]){v2.set(ox,oy,0).applyQuaternion(cam.quaternion).add(v1).project(cam);
   const sx=(v2.x*.5+.5)*innerWidth,sy=(-v2.y*.5+.5)*innerHeight;x0=Math.min(x0,sx);x1=Math.max(x1,sx);y0=Math.min(y0,sy);}
  const W=innerWidth,H=innerHeight,m=Math.min(W,H);let px=x1+m*.03;if(px+popW>W-m*.16)px=Math.max(m*.12,x0-m*.03-popW);
  const py=Math.max(H*.18+popH/2,Math.min(H*.62,y0-m*.02));
  popEl.style.left=px+'px';popEl.style.top=py+'px';
  comboEl.style.left=(px+m*.02)+'px';comboEl.style.top=(py+popH*.5+comboH*.5+12)+'px';}
 function reset(){prevAir=0;lastVy=0;airT=0;airF=0;dipY=0;dipV=0;landT=9;turnAcc=0;fovAdd=0;hsS=0;popVal=0;popShown=0;comboN=0;stats.top=0;stats.air=0;stats.perfect=0;stats.bestCombo=0;stats.clock=0;stats.lastLand=-9;
  for(const s of sp)s.life=0;clearPops();const f=document.getElementById('finish');if(f)clearFinish(f);
  if(hero)hero.scale.set(hero.scale.x,hero.scale.x,hero.scale.x);}
 function clearFinish(f){if(!f)return;f.classList.remove('nl');
  for(const n of f.querySelectorAll('.nlrank,.nlstats,.nltw'))n.remove();
  const sub=f.querySelector('#finSub');if(sub)sub.hidden=false;
  const old=f.querySelector('.stats');if(old)old.hidden=false;}
 function stat(label,value){const d=document.createElement('div');d.className='nlstat';const s=document.createElement('span');s.textContent=label;const b=document.createElement('b');b.textContent=value;d.append(s,b);return d;}
 function placeHead(n){const h=document.createElement('h2');h.append(String(n));const sup=document.createElement('sup');sup.textContent=(['st','nd','rd'][n-1]||'th');h.append(sup,document.createTextNode(' place!'));return h;}
 function onFinish(f,place,newBest){if(!f)return;clearFinish(f);f.classList.add('nl');
  const h2=f.querySelector('#finTitle');if(h2)h2.textContent='RUN COMPLETE';
  const placeN=place||1,rank=rankOf({place:placeN,perfect:stats.perfect,bestCombo:stats.bestCombo});
  const row=document.createElement('div');row.className='nlrank';
  const bw=document.createElement('div');bw.className='nlbw';
  const halo=document.createElement('div');halo.className='nlhalo';
  const badge=document.createElement('div');badge.className='nlbadge';badge.setAttribute('aria-label','Rank '+rank);
  const rs=document.createElement('span');rs.textContent=rank;badge.appendChild(rs);bw.append(halo,badge);
  [[-4,2,.7],[90,0,.55],[-2,78,.55],[84,74,.5],[46,-6,.45],[96,40,.45],[-8,40,.5],[48,86,.4]].forEach(([x,y,k],i)=>bw.appendChild(sparkle(x,y,k,(i*.37)%1.8)));
  const txt=document.createElement('div');txt.className='nlranktxt';txt.appendChild(placeHead(placeN));
  const sub=document.createElement('span');sub.className='sub';sub.textContent=stats.perfect+' perfect landings';txt.appendChild(sub);
  if(newBest){const chip=document.createElement('span');chip.className='nlbest';chip.textContent='New best time!';txt.appendChild(chip);}
  row.append(bw,txt);if(h2)h2.after(row);
  const finSub=f.querySelector('#finSub');if(finSub)finSub.hidden=true;
  const old=f.querySelector('.stats');if(old)old.hidden=true;
  const timeEl=f.querySelector('#finTime');
  const g=document.createElement('div');g.className='nlstats';
  g.append(stat('Top speed',Math.round(stats.top*3.6)+' km/h'),stat('Air time',stats.air.toFixed(1)+' s'),stat('Time',timeEl?timeEl.textContent:'0:00.0'));
  if(old)old.after(g);else if(h2)h2.after(g);
  const tw=document.createElement('div');tw.className='nltw';
  [[2,3,.5],[10,2,.4],[90,2,.45],[97,4,.4],[1,16,.35],[2,78,.4],[98,20,.4],[97,74,.35],[4,96,.4],[18,97,.35],[82,97,.4],[96,96,.45],[1,46,.3],[99,50,.3]].forEach(([x,y,k],i)=>tw.appendChild(sparkle(x,y,k,(i*.29)%1.8)));
  f.prepend(tw);
  requestAnimationFrame(()=>settleFinish(f));}
 function settleFinish(f){if(!f)return;
  const boxes=[...f.querySelectorAll('#finTitle,.nlranktxt,.nlbadge span,#finUnlock p,.nlstat,.big,.lbtn,.nlbest')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>1&&r.height>1);
  for(const sp of f.querySelectorAll('.nlsp')){const r=sp.getBoundingClientRect();
   const over=boxes.some(b=>r.left<b.right+6&&r.right>b.left-6&&r.top<b.bottom+6&&r.bottom>b.top-6);
   sp.style.visibility=over?'hidden':'';}}

 function post(dt,ctx){const t0=performance.now();
  if(!fx||!ctx||!ctx.P){lastMs=0;return;}
  if(!glowDone){boostGlow();glowDone=true;}
  cam=ctx.cam||cam;world=ctx.world||world;hero=world&&world.hero||hero;if(ctx.low!=null)low=!!ctx.low;
  const P=ctx.P,mode=ctx.mode,calm=!!ctx.calm;calmHold=calm;
  const simDt=mode==='race'?dt:0,visDt=(mode==='race'||mode==='paused'||mode==='count'||mode==='finish')?dt:0;
  stats.clock+=simDt;
  if(ctx.raw>0.028)slowT+=ctx.raw;else slowT=Math.max(0,slowT-(ctx.raw||0));dropFlash=!!low&&slowT>3;
  if(mode==='race'||mode==='paused')stats.top=Math.max(stats.top,P.v);
  if(simDt>0){if(P.air>0){airT+=simDt;stats.air+=simDt;lastVy=P.vy;}if(prevAir<=0&&P.air>0)airT=0;if(prevAir>0&&P.air<=0)land(Math.abs(lastVy)+P.v*.08,P);prevAir=P.air;landT+=simDt;}
  airF+=((P.air>0?1:0)-airF)*Math.min(1,(visDt||simDt)*5);
  const fast=Math.max(0,Math.min(1,(P.v-24)/(45-24))),hs=sm(.55,1,fast);hsS+=(hs-hsS)*Math.min(1,visDt*4);
  fovAdd+=(hsS*4-fovAdd)*Math.min(1,(visDt||0.016)*3);cam.fov+=fovAdd;cam.updateProjectionMatrix();
  const mb=world.fx&&world.fx.mb,useCss=low||!mb;
  if(mb){if(!useCss)mb.uniforms.strength.value+=.03*hsS;mb.uniforms.vig.value=useCss?0:.6*hsS;}
  if(vigEl)vigEl.style.opacity=useCss?(0.85*hsS).toFixed(3):'0';
  if(world.fx&&world.fx.sl)world.fx.sl.visible=false;
  if(low&&world.fx&&world.fx.spray)world.fx.spray.visible=false;   // Low: the faint wet-road spray goes (one draw call)
  if(!calm){dipV+=(-dipY*38-dipV*10.5)*simDt;dipY+=dipV*simDt;const dy=Math.max(-.57,dipY);cam.position.y+=Math.max(-.2,dy*.35);cam.rotateX(dy*.07+airF*.06);}
  else{dipY=0;dipV=0;if(airF>0)cam.rotateX(airF*.06);}
  if(hero){let s=0;if(landT<.6)s=-.42*(1-sm(.06,.4,landT))+.06*Math.sin(Math.min(1,Math.max(0,(landT-.3)/.3))*Math.PI);
   if(P.air>0)s=Math.max(s,(P.vy>0?.24*Math.min(1,P.vy/5):.08));const k=hero.scale.x;hero.scale.set(k*(1-s*.55),k*(1+s),k*(1-s*.55));}
  let n=0;kv.set(0,0,-1).applyQuaternion(hero.quaternion).multiplyScalar(P.v);
  const drift=P.drift||0;
  if(simDt>0&&drift>0&&P.air<=0){turnAcc+=simDt*(low?30:110);const side=-(P.driftDir||1);
   while(turnAcc>=1&&turnAcc<8){turnAcc--;hero.localToWorld(v1.set(side*.72,.06,.5+Math.random()*.3));v2.set(side*(3+Math.random()*5),1+Math.random()*2.5,.5+Math.random()*3).applyQuaternion(hero.quaternion).add(kv);emit(v1,v2,.3+Math.random()*.3,drift>=3?1:drift>=2?2:0,1.2);}}
  const gy=hero.position.y-P.y+.04;cam.getWorldPosition(v3);
  for(const s of sp){if(s.life<=0)continue;if(simDt>0){s.life-=simDt;s.v.y-=14*simDt;s.v.x*=1-1.2*simDt;s.v.z*=1-1.2*simDt;s.p.addScaledVector(s.v,simDt);
    if(s.p.y<gy){s.p.y=gy;s.v.y=Math.abs(s.v.y)*.45;}}
   const k=Math.max(0,s.life/s.max);if(k<=0)continue;
   Y.copy(s.v).sub(kv);let L=Math.min(.9,Math.max(.14,Y.length()*.06));if(Y.lengthSq()<1e-6)Y.set(0,1,0);Y.normalize().multiplyScalar(L);
   v1.copy(s.p).sub(v3);X.crossVectors(Y,v1);if(X.lengthSq()<1e-8)X.set(1,0,0);X.normalize().multiplyScalar(.055*s.w*(.5+.5*k));Z.crossVectors(X,Y).normalize();
   v2.copy(s.p).addScaledVector(Y,-.5);M.makeBasis(X,Y,Z).setPosition(v2);fx.setMatrixAt(n,M);
   tc.copy(PAL[s.c]||PAL[0]).lerp(WHITE,sm(.55,1,k)*.8).multiplyScalar(2.4*k+.3);fx.setColorAt(n,tc);n++;}
  const act=fast>.05?Math.round((low?20:capT)*Math.min(1,.15+fast*.85)):0;
  if(act>0){const d=2,hh=d*Math.tan(cam.fov*Math.PI/360),hw=hh*cam.aspect,vy=.12*hh;
   for(let i=0;i<act&&i<st.length;i++){const q=st[i];if(visDt>0){q.rho+=visDt*q.rho*(1.1+2.2*fast)*q.sp;if(q.rho>1.35)Object.assign(q,newStreak(false));}
    const cx=Math.cos(q.th),cy=Math.sin(q.th),ex=cx*hw,ey=cy*hh,len=Math.hypot(ex,ey)||1,Ls=(.06+.3*fast)*q.rho*len;
    const fade=sm(.5,.75,q.rho)*(1-sm(1.15,1.35,q.rho));
    v1.set(ex/len,ey/len,0);v2.set(-v1.y,v1.x,0).multiplyScalar(.006*d*q.w*(.6+fast));
    Ml.makeBasis(v2,v1.clone().multiplyScalar(Ls),Z.set(0,0,1)).setPosition(ex*q.rho,vy+ey*q.rho,-d);M.multiplyMatrices(cam.matrixWorld,Ml);
    fx.setMatrixAt(n,M);tc.copy(q.c===4?WHITE:PAL[q.c]).multiplyScalar(1.7*fade*(.35+.65*fast));fx.setColorAt(n,tc);n++;}}
  fx.count=n;fx.visible=n>0;if(n>0){fx.instanceMatrix.needsUpdate=true;if(fx.instanceColor)fx.instanceColor.needsUpdate=true;}
  if(ground&&gAttr){const p=gAttr.position.array;const showFl=!dropFlash,fl=showFl&&landT<.3?Math.pow(1-landT/.3,2):0,rg=landT<.45?1-landT/.45:0;
   const fr=2.6,rr=.7+3.8*(1-Math.pow(1-Math.min(1,landT/.45),3));const q=[[-1,-1],[1,-1],[1,1],[-1,1]];
   for(let i=0;i<4;i++){p.set([q[i][0]*fr,0,q[i][1]*fr*1.3],i*3);p.set([q[i][0]*rr,0,q[i][1]*rr],12+i*3);
    gCol.set([1,.62,1,.5*fl],i*4);gCol.set([.3,1,1,.95*rg],16+i*4);}
   gAttr.position.needsUpdate=true;gAttr.color.needsUpdate=true;ground.visible=fl>0||rg>0;
   hero.getWorldPosition(v1);ground.position.set(v1.x,hero.position.y-P.y+.03,v1.z);ground.rotation.y=hero.rotation.y;}
  if(sky){sky.visible=true;sky.position.copy(cam.position);if(world.kit&&world.kit.S&&world.kit.S.fog)world.kit.S.fog.color.set(0x2a0c4c);
   if(!low&&world.fx&&world.fx.bloom){world.fx.bloom.strength+=.14;world.fx.bloom.radius=.45;}}
  if(simDt>0){if(popT>0&&(popT-=simDt)<=0){popEl.classList.remove('show');const pop=document.getElementById('pop');if(pop)pop.style.visibility='';}
   if(comboT>0&&(comboT-=simDt)<=0)comboEl.classList.remove('show');
   if(popT>0&&popShown<popVal){popShown=Math.min(popVal,popShown+popVal*simDt/.1);const t='+'+Math.round(popShown/10)*10;popI.textContent=t;popI.dataset.t=t;}}
  if(popT>0||comboT>0)placePops();
  lastMs=performance.now()-t0;}

 return {bind,reset,post,onFinish,settleFinish,stats,rankOf,get ms(){return lastMs;},get dropFlash(){return dropFlash;}};
}
