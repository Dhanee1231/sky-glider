// Neon Rush menus + HUD extras (Track B, M4). main.js (Track A) calls only these.
// init(ctx): ctx = {ST (save object), save(), Audio, TRACKS:[{id,name,thumbColor}], onPick(trackId), onGarageDone(custom), say}
// showTrackSelect() / showGarage(): full-screen menus (portrait AND landscape layouts). Title "Tap to race" -> showTrackSelect().
// hud(dt,P): per-frame HUD (timer rings for P.boost/P.shield/P.rocket/P.floaty(hop), held icon on #btnItem, glow when ready, dim when empty,
//            on-kart effects + trail, expiry sounds)
// roulette(finalItemId, done): slot-machine spin in the HUD (tick sounds, 'ding' on land), then done(). While it runs the item is not usable (isRolling()).
// burst(): small pop on the item button.   hideMenus(): hide select + garage.   isRolling() / garageOpen(): state for main.js.
import * as THREE from 'three';
import {ICONS,NAMES} from './items.js';
import {getBest,KART_N} from './save.js';
import {PAINTS,FINISHES,WHEELS,BODIES,TRAILS,DECALS,applyKart,heroFx,heroFxReset,buildPreviewKart} from './karts.js';

const $=id=>document.getElementById(id);
let C=null,sel='sky',from='select';
const DEF_TRACKS=[{id:'sky',name:'Neon Sky City'},{id:'harbor',name:'Glowtide Harbor'},{id:'skyway',name:'Arcade Skyway'}];
const VOICE={sky:'s_sky',harbor:'s_harbor',skyway:'s_skyway'};
const say=(k,g)=>{try{(C&&C.say?C.say:C&&C.Audio&&C.Audio.say)?.(k,g);}catch(e){}};
const sfx=n=>{try{C&&C.Audio&&C.Audio.sfx&&C.Audio.sfx(n);}catch(e){}};
const show=(id,on)=>$(id).classList.toggle('show',on);
const fmt=s=>{const m=Math.floor(s/60),r=s-m*60;return m+':'+(r<10?'0':'')+r.toFixed(1);};
const svg=(vb,inner,cls='')=>`<svg viewBox="${vb}" class="${cls}" aria-hidden="true">${inner}</svg>`;
const tracks=()=>{const t=C&&C.TRACKS&&C.TRACKS.length?C.TRACKS:DEF_TRACKS;return t.map(x=>Object.assign({},DEF_TRACKS.find(d=>d.id===x.id)||{},x));};

// ---------- track select ----------
const THUMBS={
 sky:`<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="tg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b0b3d"/><stop offset=".62" stop-color="#8a2a9a"/><stop offset="1" stop-color="#ff6ac8"/></linearGradient></defs><rect width="200" height="120" fill="url(#tg1)"/><circle cx="150" cy="24" r="11" fill="#fff6d8"/>
  <g fill="#150a30"><rect x="6" y="42" width="26" height="60"/><rect x="36" y="26" width="22" height="76"/><rect x="62" y="52" width="28" height="50"/><rect x="104" y="36" width="20" height="66"/><rect x="128" y="56" width="30" height="46"/><rect x="162" y="30" width="32" height="72"/></g>
  <g fill="#ffd23a"><rect x="12" y="50" width="4" height="4"/><rect x="22" y="62" width="4" height="4"/><rect x="42" y="36" width="4" height="4"/><rect x="48" y="52" width="4" height="4"/><rect x="70" y="62" width="4" height="4"/><rect x="108" y="46" width="4" height="4"/><rect x="136" y="66" width="4" height="4"/><rect x="170" y="44" width="4" height="4"/><rect x="182" y="58" width="4" height="4"/></g>
  <g fill="#35f2ff"><rect x="12" y="70" width="4" height="4"/><rect x="42" y="64" width="4" height="4"/><rect x="76" y="74" width="4" height="4"/><rect x="112" y="60" width="4" height="4"/><rect x="148" y="74" width="4" height="4"/><rect x="176" y="72" width="4" height="4"/></g>
  <path d="M0 120L82 80h36l82 40z" fill="#241048"/><path d="M82 80L0 120M118 80l82 40" stroke="#35f2ff" stroke-width="3"/><path d="M100 118V82" stroke="#fff" stroke-width="3" stroke-dasharray="7 7"/></svg>`,
 harbor:`<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14224a"/><stop offset=".55" stop-color="#d0549a"/><stop offset="1" stop-color="#ffb070"/></linearGradient><linearGradient id="tg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a4a8a"/><stop offset="1" stop-color="#0c1a44"/></linearGradient></defs><rect width="200" height="120" fill="url(#tg2)"/><rect y="58" width="200" height="34" fill="url(#tg3)"/>
  <g transform="translate(60 40)"><circle r="22" fill="none" stroke="#35f2ff" stroke-width="3"/><circle r="3" fill="#fff"/><path d="M-22 0h44M0-22v44M-15.5-15.5l31 31M15.5-15.5l-31 31" stroke="#35f2ff" stroke-width="1.6"/><g fill="#ffd23a"><circle cx="22" r="3"/><circle cx="-22" r="3"/><circle cy="22" r="3"/><circle cy="-22" r="3"/><circle cx="15.5" cy="15.5" r="3"/><circle cx="-15.5" cy="-15.5" r="3"/><circle cx="15.5" cy="-15.5" r="3"/><circle cx="-15.5" cy="15.5" r="3"/></g><path d="M-10 36L0 0l10 36" fill="none" stroke="#35f2ff" stroke-width="2"/></g>
  <g transform="translate(160 22)"><path d="M-7 56l3-38h8l3 38z" fill="#fff"/><path d="M-5.5 30h11v8h-11zM-6.5 46h13v7h-13z" fill="#ff3a5a"/><rect x="-6" y="10" width="12" height="9" rx="2" fill="#ffe97a"/><path d="M6 14l60-10v20z" fill="#fff6b0" opacity=".45"/></g>
  <g><path d="M30 80q10 8 22 0l-3 8h-16z" fill="#ff7ab8"/><circle cx="41" cy="72" r="3.5" fill="#ffe97a"/><path d="M112 84q10 8 22 0l-3 8h-16z" fill="#7affc8"/><circle cx="123" cy="76" r="3.5" fill="#ffe97a"/></g>
  <path d="M0 120L86 92h28l86 28z" fill="#2a1450"/><path d="M86 92L0 120M114 92l86 28" stroke="#ffd23a" stroke-width="3"/><path d="M100 118V94" stroke="#fff" stroke-width="3" stroke-dasharray="7 7"/>
  <g fill="#ffe97a"><circle cx="10" cy="100" r="3"/><circle cx="40" cy="95" r="2.5"/><circle cx="160" cy="95" r="2.5"/><circle cx="190" cy="100" r="3"/></g></svg>`,
 skyway:`<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="tg4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0630"/><stop offset=".7" stop-color="#4a1a8a"/><stop offset="1" stop-color="#ff3fd8"/></linearGradient></defs><rect width="200" height="120" fill="url(#tg4)"/>
  <g fill="#ffd23a" opacity=".9"><rect x="14" y="14" width="5" height="5"/><rect x="40" y="26" width="5" height="5"/><rect x="170" y="12" width="5" height="5"/><rect x="186" y="34" width="5" height="5"/></g>
  <g fill="#1a0a3c"><rect x="4" y="72" width="24" height="30"/><rect x="32" y="62" width="18" height="40"/><rect x="150" y="66" width="20" height="36"/><rect x="174" y="76" width="22" height="26"/></g>
  <g fill="#ff3fd8"><rect x="8" y="78" width="4" height="4"/><rect x="18" y="88" width="4" height="4"/></g><g fill="#35f2ff"><rect x="36" y="70" width="4" height="4"/><rect x="156" y="74" width="4" height="4"/><rect x="180" y="84" width="4" height="4"/></g>
  <g transform="translate(150 20)"><rect x="-4" y="0" width="8" height="34" fill="#2a1060"/><rect x="-14" y="-4" width="28" height="12" rx="3" fill="#ff9a2a"/><path d="M-8 8v14M8 8v14" stroke="#fff" stroke-width="2"/><path d="M-12 24q4 8 8 0M4 24q4 8 8 0" fill="none" stroke="#fff" stroke-width="2.4"/></g>
  <g fill="none" stroke-width="3.6"><ellipse cx="100" cy="64" rx="44" ry="30" stroke="#35f2ff"/><ellipse cx="100" cy="67" rx="28" ry="19" stroke="#ff3fd8"/><ellipse cx="100" cy="70" rx="15" ry="10" stroke="#ffd23a"/></g>
  <path d="M0 120L84 78h32l84 42z" fill="#1c0c42"/><path d="M84 78L0 120M116 78l84 42" stroke="#ff3fd8" stroke-width="3"/><path d="M100 118V80" stroke="#fff" stroke-width="3" stroke-dasharray="7 7"/>
  <g fill="#35f2ff"><rect x="60" y="100" width="6" height="6"/><rect x="134" y="98" width="6" height="6"/></g></svg>`};
const TROPHY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="#ffd23a"/><path d="M7 5H3c0 4 2 6 4 6M17 5h4c0 4-2 6-4 6" fill="none" stroke="#ffd23a" stroke-width="2"/><path d="M12 14v4M8 21h8l-1-3H9z" fill="#ffd23a"/></svg>';
function buildSelect(){const row=$('tsRow');row.innerHTML='';
 for(const t of tracks()){const b=document.createElement('button');b.className='tcard';b.dataset.id=t.id;b.setAttribute('role','radio');b.setAttribute('aria-label',t.name);
  b.innerHTML=`<div class="th">${THUMBS[t.id]||''}</div><div class="ti"><b>${t.name}</b><span class="bt">${TROPHY}<span class="bv"></span></span></div>`;
  b.addEventListener('click',()=>pick(t.id,true));row.appendChild(b);}}
function refreshSelect(){const ST=C.ST;for(const b of $('tsRow').children){const id=b.dataset.id,best=getBest(ST,id);b.querySelector('.bv').textContent=best>0?fmt(best):'–:––';
  b.setAttribute('aria-pressed',id===sel);b.setAttribute('aria-checked',id===sel);const had=b.querySelector('.nw');
  if(best<=0&&id!=='sky'&&!had){const n=document.createElement('span');n.className='nw';n.textContent='NEW!';b.appendChild(n);}else if((best>0||id==='sky')&&had)had.remove();}}
function pick(id,voice){if(sel===id&&voice)return;sel=id;refreshSelect();if(voice){say(VOICE[id]);}try{C.Audio&&C.Audio.prepTrack&&C.Audio.prepTrack(id);}catch(e){}}
export function showTrackSelect(){if(!C)return;const t=tracks();sel=t.some(x=>x.id===C.ST.track)?C.ST.track:t[0].id;buildSelect();refreshSelect();show('trackSel',true);show('garage',false);say('s_pick',8);try{C.Audio&&C.Audio.prepTrack&&C.Audio.prepTrack(sel);}catch(e){}}
export function newBest(){say('s_newbest');}
export function hideMenus(){show('trackSel',false);closeGarage(true);}

// ---------- garage ----------
const TABS=[
 {k:'body',n:'Body',ic:svg('0 0 24 24','<path d="M2 15l2-5a2 2 0 0 1 2-1.4h6.6a2 2 0 0 1 1.7 1l2.2 3.4 2 .6A1.6 1.6 0 0 1 22 15v1.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" fill="#fff"/><circle cx="7" cy="18" r="2.2" fill="#35f2ff"/><circle cx="17" cy="18" r="2.2" fill="#35f2ff"/>')},
 {k:'paint',n:'Paint',ic:svg('0 0 24 24','<path d="M12 2c3 4 7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 4-8 7-12z" fill="#ff4fd8" stroke="#fff" stroke-width="1.6"/><path d="M8.5 14a3.5 3.5 0 0 0 3 3.4" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>')},
 {k:'wheels',n:'Wheels',ic:svg('0 0 24 24','<circle cx="12" cy="12" r="9.5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="#d8d8e4"/><path d="M12 7v10M7 12h10M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#555" stroke-width="1.4"/>')},
 {k:'trail',n:'Trail',ic:svg('0 0 24 24','<path d="M12 2l2.2 6.3L21 9l-5 4 1.6 6.6L12 16l-5.6 3.6L8 13 3 9l6.8-.7z" fill="#ffe14d" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>')},
 {k:'decal',n:'Stickers',ic:svg('0 0 24 24','<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" fill="#ff3fd8" stroke="#fff" stroke-width="1.6"/>')}];
const hex=h=>'#'+new THREE.Color(h).getHexString();
// option pictures
const OPT={
 body:i=>[svg('0 0 48 32','<rect x="6" y="14" width="36" height="9" rx="4" fill="#ff4fd8"/><rect x="18" y="8" width="12" height="9" rx="4" fill="#fff"/><circle cx="12" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="36" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/>'),
   svg('0 0 48 32','<path d="M3 22l8-7h26l8 7v2H3z" fill="#ff4fd8"/><rect x="32" y="6" width="14" height="3" rx="1" fill="#fff"/><path d="M36 9v8M42 9v8" stroke="#fff" stroke-width="2"/><circle cx="12" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="36" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/>'),
   svg('0 0 48 32','<rect x="6" y="14" width="36" height="9" rx="4" fill="#ff4fd8"/><path d="M16 15v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#fff" stroke-width="2.4"/><ellipse cx="38" cy="22" rx="7" ry="7" fill="#ff4fd8" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="36" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/>'),
   svg('0 0 48 32','<rect x="8" y="14" width="34" height="9" rx="4" fill="#ff4fd8"/><path d="M4 18l8-3v6z" fill="#ffe14d"/><path d="M28 14l8-10v10z" fill="#fff"/><circle cx="12" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="36" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/>')][i],
 wheels:i=>{const w=WHEELS[i],c=hex(w.glow||w.col),n=w.spokes;let sp='';for(let k=0;k<n;k++){const a=k/n*Math.PI*2;sp+=`<path d="M12 12L${(12+Math.sin(a)*6.5).toFixed(1)} ${(12-Math.cos(a)*6.5).toFixed(1)}" stroke="${c}" stroke-width="1.6"/>`;}
   return svg('0 0 24 24',`<circle cx="12" cy="12" r="10.5" fill="#1a191c" stroke="#fff" stroke-width="1.4"/><circle cx="12" cy="12" r="7" fill="none" stroke="${c}" stroke-width="2"/>${sp}<circle cx="12" cy="12" r="1.8" fill="${c}"/>`);},
 trail:i=>[svg('0 0 24 24','<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M6.5 17.5l11-11" stroke="#fff" stroke-width="2.4"/>'),
   svg('0 0 24 24','<path d="M12 2l1.8 5.6L19 9l-4.6 3.2L16 18l-4-3.4L8 18l1.6-5.8L5 9l5.2-1.4z" fill="#ffe97a"/><circle cx="19" cy="18" r="2" fill="#fff"/><circle cx="5" cy="19" r="1.5" fill="#fff"/>'),
   svg('0 0 24 24','<path d="M12 20s-8-5-8-10.5A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.5C20 15 12 20 12 20z" fill="#ff7ac8"/>'),
   svg('0 0 24 24','<path d="M3 17a9 9 0 0 1 18 0" fill="none" stroke="#ff3a5a" stroke-width="2.6"/><path d="M5.6 17a6.4 6.4 0 0 1 12.8 0" fill="none" stroke="#ffd23a" stroke-width="2.6"/><path d="M8.2 17a3.8 3.8 0 0 1 7.6 0" fill="none" stroke="#35f2ff" stroke-width="2.6"/>'),
   svg('0 0 24 24','<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 2 4-5z" fill="#ff7a1a"/><path d="M12 11c.8 2.5 3 3 3 6a3 3 0 0 1-6 0c0-2 2-3 3-6z" fill="#ffe97a"/>')][i],
 decal:i=>[svg('0 0 24 24','<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M6.5 17.5l11-11" stroke="#fff" stroke-width="2.4"/>'),
   svg('0 0 24 24','<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="#ffe97a"/>'),
   svg('0 0 24 24','<path d="M12 20s-8-5-8-10.5A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.5C20 15 12 20 12 20z" fill="#ff7ac8"/>'),
   svg('0 0 24 24','<path d="M13 2L5 13h6l-2 9 10-12h-6z" fill="#ffe14d"/>'),
   svg('0 0 24 24','<rect x="7" y="2" width="4" height="20" fill="#fff"/><rect x="13" y="2" width="4" height="20" fill="#fff"/>')][i]};
let tab='paint',draft=null,pv=null;
const lim=k=>KART_N[k];
function buildGarage(){const tb=$('gTabs');tb.innerHTML='';for(const t of TABS){const b=document.createElement('button');b.className='gtab';b.setAttribute('role','tab');b.setAttribute('aria-label',t.n);b.dataset.k=t.k;b.innerHTML=t.ic+'<span>'+t.n+'</span>';b.addEventListener('click',()=>{tab=t.k;renderTab();});tb.appendChild(b);}
 const fin=$('gFin');fin.innerHTML='';FINISHES.forEach((f,i)=>{const b=document.createElement('button');b.className='gopt';b.dataset.i=i;b.setAttribute('aria-label',f.n);
  const bg=i===0?'linear-gradient(135deg,#ff8ae0,#e8287a)':i===1?'linear-gradient(135deg,#fff,#9aa4b8 45%,#fff 60%,#7a8498)':'radial-gradient(circle,#fff,#ff4fd8 55%,#ff4fd8)';
  b.innerHTML=`<i style="background:${bg};${i===2?'box-shadow:0 0 10px #ff4fd8':''}"></i>${f.n.replace(' glow','')}`;b.addEventListener('click',()=>choose('finish',i));fin.appendChild(b);});}
function renderTab(){for(const b of $('gTabs').children)b.setAttribute('aria-selected',b.dataset.k===tab);$('gFin').hidden=tab!=='paint';
 const g=$('gGrid');g.innerHTML='';for(let i=0;i<lim(tab);i++){const b=document.createElement('button');b.className='gopt';b.dataset.i=i;
  if(tab==='paint'){b.setAttribute('aria-label',PAINTS[i].n);b.innerHTML=`<span class="sw" style="background:${hex(PAINTS[i].hex)}"></span>`;}
  else{b.setAttribute('aria-label',({body:BODIES,wheels:WHEELS.map(w=>w.n),trail:TRAILS,decal:DECALS})[tab][i]);b.innerHTML=OPT[tab](i);}
  b.addEventListener('click',()=>choose(tab,i));g.appendChild(b);}
 syncPressed();}
function syncPressed(){if(!draft)return;for(const b of $('gGrid').children)b.setAttribute('aria-pressed',+b.dataset.i===draft[tab]);for(const b of $('gFin').children)b.setAttribute('aria-pressed',+b.dataset.i===draft.finish);}
function choose(k,i){if(!draft||draft[k]===i)return;draft[k]=i;syncPressed();if(pv)pv.kart.userData.restyle(draft);}   // silent: taps make no sound
export function showGarage(){if(!C)return;draft=Object.assign({},C.ST.kart||{});for(const k in KART_N)if(!(draft[k]>=0&&draft[k]<KART_N[k]))draft[k]=0;
 if(!$('gTabs').children.length)buildGarage();renderTab();show('trackSel',false);show('garage',true);startPreview();say('s_garage',8);}
export const garageOpen=()=>$('garage').classList.contains('show');
function closeGarage(silent){if(!garageOpen())return;show('garage',false);stopPreview();}
function garageBack(){closeGarage();show('trackSel',true);refreshSelect();}
function garageDone(){const c=Object.assign({},C.ST.kart||{},draft);C.ST.kart=c;try{C.save&&C.save();}catch(e){}applyKart(null,c);try{C.onGarageDone&&C.onGarageDone(c);}catch(e){}garageBack();}

function startPreview(){if(pv)return;const cv=$('garCanvas');let r;try{r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){return;}
 r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=.95;r.outputColorSpace=THREE.SRGBColorSpace;
 const sc=new THREE.Scene();
 // tiny studio environment (pink + cyan strip lights) so gloss / metallic paint has something to reflect
 const es=new THREE.Scene();es.background=new THREE.Color(0x120830);const em=(c,x,y,z,w,h,ry)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(3),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry||0;es.add(m);};
 em(0xff3fd8,-6,3,0,3,8,Math.PI/2);em(0x35f2ff,6,3,0,3,8,Math.PI/2);em(0xffffff,0,8,0,10,2,0);em(0xffd27a,0,2,-7,8,3,0);em(0xffffff,0,2,7,8,2,0);
 const pm=new THREE.PMREMGenerator(r);const envRT=pm.fromScene(es,.02);sc.environment=envRT.texture;
 sc.add(new THREE.HemisphereLight(0xffd8f0,0x2a1060,.7));const dl=new THREE.DirectionalLight(0xffffff,2.2);dl.position.set(3,5,4);sc.add(dl);
 const rim=new THREE.PointLight(0x35f2ff,12,12);rim.position.set(-3,2,-2);sc.add(rim);const pk=new THREE.PointLight(0xff3fd8,10,12);pk.position.set(3,1.5,-2);sc.add(pk);
 const disc=new THREE.Mesh(new THREE.CircleGeometry(1.9,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x2a1160}));disc.position.y=-.01;sc.add(disc);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.9,.04,8,64).rotateX(Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(2.5,.6,2)}));sc.add(ring);
 const kart=buildPreviewKart(sc,draft);kart.userData.cone.visible=false;kart.layers.enableAll();kart.traverse(o=>o.layers.enableAll());
 const cam=new THREE.PerspectiveCamera(32,1,.1,60);cam.layers.enableAll();
 const st={r,sc,cam,kart,pm,envRT,ang:.55,vel:.55,drag:false,lx:0,raf:0,ro:null,last:performance.now(),w:0,h:0};pv=st;
 function size(){const w=cv.clientWidth,h=cv.clientHeight;if(!w||!h||(w===st.w&&h===st.h))return;st.w=w;st.h=h;r.setSize(w,h,false);cam.aspect=w/h;
  const vf=cam.fov*Math.PI/180,hf=2*Math.atan(Math.tan(vf/2)*cam.aspect),f=Math.min(vf,hf),d=2.35/Math.sin(f/2);   // fit the whole kart (radius ~2.1 m incl. wing) at any angle
  cam.position.set(0,d*.3,d*.95);cam.lookAt(0,.45,0);cam.updateProjectionMatrix();}
 size();st.ro=new ResizeObserver(size);st.ro.observe(cv);
 const down=e=>{st.drag=true;st.lx=e.clientX;try{cv.setPointerCapture(e.pointerId);}catch(_){}};const move=e=>{if(!st.drag)return;const dx=e.clientX-st.lx;st.lx=e.clientX;st.ang+=dx*.012;st.vel=dx*.012*60;};
 const up=()=>{st.drag=false;};cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);st.off=()=>{cv.removeEventListener('pointerdown',down);cv.removeEventListener('pointermove',move);cv.removeEventListener('pointerup',up);cv.removeEventListener('pointercancel',up);};
 const loop=now=>{st.raf=requestAnimationFrame(loop);if(document.hidden)return;const dt=Math.min(.05,(now-st.last)/1000);st.last=now;
  if(!st.drag){st.vel+=(.55-st.vel)*Math.min(1,dt*1.5);st.ang+=st.vel*dt;}kart.rotation.y=st.ang;kart.position.y=Math.sin(now/700)*.015;size();r.render(sc,cam);};
 st.raf=requestAnimationFrame(loop);}
function stopPreview(){if(!pv)return;const st=pv;pv=null;cancelAnimationFrame(st.raf);st.ro&&st.ro.disconnect();st.off&&st.off();
 st.sc.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)m.dispose();}});
 st.envRT.dispose();st.pm.dispose();st.r.dispose();try{st.r.forceContextLoss();}catch(e){}}

// ---------- in-race HUD ----------
const RING={shield:{ic:'shield',c:'#35f2ff'},boost:{ic:'speed',c:'#ffe14d'},rocket:{ic:'rocket',c:'#ffd23a'},hop:{ic:'hop',c:'#b07aff'}};
const rs={shield:{v:0,max:1},boost:{v:0,max:1},rocket:{v:0,max:1},hop:{v:0,max:1}};let rings=null,lastKey='',lastP=null,hopT=0,rolling=null;
function buildRings(){const box=$('puRings');rings={};for(const k in RING){const d=document.createElement('div');d.className='pu';d.style.setProperty('--c',RING[k].c);
  d.innerHTML=`<svg viewBox="0 0 48 48"><circle class="bg" cx="24" cy="24" r="21"/><circle class="fg" cx="24" cy="24" r="21" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/><g transform="translate(13 13) scale(.92)">${ICONS[RING[k].ic]}</g></svg><b></b>`;
  box.appendChild(d);rings[k]={el:d,fg:d.querySelector('.fg'),b:d.querySelector('b'),on:false,off:100,num:-1,warn:false};}}
function setItemBtn(it){const b=$('btnItem'),k=(it||'')+(rolling?'|r':'');if(k===lastKey)return;lastKey=k;
 b.classList.toggle('rolling',!!rolling);b.classList.toggle('has',!!it&&!rolling);b.setAttribute('aria-label',rolling?'Rolling':it?NAMES[it]:'No power-up yet');$('itemIcon').innerHTML=it&&!rolling?ICONS[it]:ICONS.box;}
export function hud(dt,P){if(!C||!P)return;if(!rings)buildRings();
 setItemBtn(P.item);
 if(rolling){const b=$('btnItem');if(b.classList.contains('has'))b.classList.remove('has');const ic=$('itemIcon');if(ic.dataset.k!=='box'){ic.innerHTML=ICONS.box;ic.dataset.k='box';}}else if($('itemIcon').dataset.k==='box')delete $('itemIcon').dataset.k;
 const cur={shield:P.shield>0?P.shield:0,boost:P.boost>0?P.boost:0,rocket:P.rocket>0?P.rocket:0,hop:hopT>0?hopT:0};
 if(P.floaty&&!lastP?.floaty)hopT=2.1;else if(!P.floaty)hopT=0;else if(hopT>0)hopT=Math.max(.01,hopT-dt);cur.hop=hopT;
 const shown=[];
 for(const k in RING){const s=rs[k],v=cur[k];
  if(v>s.v+.05||(s.v===0&&v>0))s.max=Math.max(v,k==='shield'?10:k==='rocket'?3.2:k==='hop'?2.1:.9);   // new activation: full ring
  if(v>0&&v>s.max)s.max=v;
  if(s.v>0&&v===0&&s.v<Math.max(.12,dt*3)&&(k!=='boost'||s.max>=.9)){sfx('end_'+k);}   // natural expiry (not consumed by a hit)
  s.v=v;const show=v>0&&(k!=='boost'||s.max>=.9);const r=rings[k];
  if(show){shown.push([k,v,s.max]);}
  if(!show&&r.on){r.el.classList.remove('on','warn');r.on=false;}}
 shown.sort((a,b)=>b[1]/b[2]-a[1]/a[2]);let n=0;
 for(const [k,v,mx] of shown){const r=rings[k];if(n++>=2){if(r.on){r.el.classList.remove('on');r.on=false;}continue;}
  if(!r.on){r.el.classList.add('on');r.on=true;}const off=Math.round((1-Math.max(0,Math.min(1,v/mx)))*100);if(off!==r.off){r.off=off;r.fg.setAttribute('stroke-dashoffset',off);}
  const num=Math.ceil(v);if(num!==r.num){r.num=num;r.b.textContent=num;}const warn=v<1.5&&k==='shield';if(warn!==r.warn){r.warn=warn;r.el.classList.toggle('warn',warn);}}
 lastP={floaty:P.floaty};heroFx(P,dt);}
export function resetHud(){lastKey='';hopT=0;for(const k in rs)rs[k].v=0;if(rings)for(const k in rings){rings[k].el.classList.remove('on','warn');rings[k].on=false;}heroFxReset();if(rolling)finishRoll(true);}
export function burst(){const b=$('btnItem');b.classList.remove('ipop');void b.offsetWidth;b.classList.add('ipop');}
export const isRolling=()=>!!rolling;

// ---------- roulette ----------
function finishRoll(quiet){const r=rolling;if(!r)return;rolling=null;clearTimeout(r.to);cancelAnimationFrame(r.raf);$('roul').classList.remove('show','land');lastKey='';
 const b=$('btnItem');b.classList.remove('rolling');if(!quiet){burst();say('s_ready',6);}try{r.done&&r.done();}catch(e){}}
export function roulette(id,done){if(rolling)finishRoll(true);if(!C||!ICONS[id]){done&&done();return;}
 const keys=Object.keys(ICONS),N=26,F=N-3,seq=[];let last='';for(let i=0;i<N;i++){let k;do{k=keys[Math.floor(Math.random()*keys.length)];}while(k===last);seq.push(k);last=k;}seq[F]=id;if(seq[F-1]===id)seq[F-1]=keys.find(k=>k!==id);
 const strip=$('roulStrip');strip.innerHTML=seq.map(k=>`<div class="cell">${svg('0 0 24 24',ICONS[k])}</div>`).join('');const cells=strip.children;
 rolling={done};lastKey='';const box=$('roul');box.classList.remove('land');box.classList.add('show');$('btnItem').classList.add('rolling');setItemBtn(null);
 const T=1.2,t0=performance.now();let lastIdx=-1;const cw=()=>cells[0].offsetWidth||60;
 const fin=()=>{const pos=F-1;strip.style.transform=`translate3d(${-pos*cw()}px,0,0)`;for(const c of cells)c.classList.remove('mid');cells[F].classList.add('mid');box.classList.add('land');sfx('ding');};
 const step=now=>{if(!rolling)return;const u=Math.min(1,(now-t0)/1000/T),e=1-Math.pow(1-u,3),pos=(F-1)*e;strip.style.transform=`translate3d(${-pos*cw()}px,0,0)`;
  const idx=Math.floor(pos+.5);if(idx!==lastIdx){if(lastIdx>=0&&u<1)sfx('tick');lastIdx=idx;for(const c of cells)c.classList.remove('mid');if(cells[idx+1])cells[idx+1].classList.add('mid');}
  if(u<1)rolling.raf=requestAnimationFrame(step);else{fin();rolling.to=setTimeout(()=>finishRoll(),420);}};
 rolling.raf=requestAnimationFrame(step);rolling.to=setTimeout(()=>{if(rolling&&rolling.done===done)finishRoll();},2600);   // never leave the item locked (background tab etc.)
}

// ---------- init ----------
export function init(ctx){C=ctx;if(!C.ST.kart)C.ST.kart={};
 try{applyKart(null,C.ST.kart);}catch(e){}   // the saved garage look on the hero (no-op until the hero exists)
 $('btnGo').addEventListener('click',()=>{C.ST.track=sel;try{C.save&&C.save();}catch(e){}show('trackSel',false);try{C.onPick&&C.onPick(sel);}catch(e){console.error(e);}});
 $('btnGarage').addEventListener('click',()=>showGarage());
 $('btnGarBack').addEventListener('click',garageBack);$('btnGarDone').addEventListener('click',garageDone);
 for(const id of['btnSetSel','btnSetGar'])$(id).addEventListener('click',()=>{say('settings');$('btnSetTitle').click();});
 // while the roulette spins the item is locked: stop the tap before main.js sees it
 $('btnItem').addEventListener('pointerdown',e=>{if(rolling){e.preventDefault();e.stopImmediatePropagation();}},true);
 addEventListener('keydown',e=>{if(rolling&&(e.key==='x'||e.key==='X'||e.key==='Enter')){e.stopImmediatePropagation();}},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&rolling)finishRoll();});
 buildSelect();}
