// Neon Rush menus + HUD extras (Track B, M4). main.js (Track A) calls only these.
// init(ctx): ctx = {ST (save object), save(), Audio, TRACKS:[{id,name,thumbColor}], onPick(trackId), onGarageDone(custom), say}
// showTrackSelect() / showGarage(): full-screen menus (portrait AND landscape layouts). Title "Tap to race" -> showTrackSelect().
// hud(dt,P): per-frame HUD (timer rings for P.boost/P.shield/P.rocket/P.floaty(hop), held icon on #btnItem, glow when ready, dim when empty,
//            on-kart effects + trail, expiry sounds)
// roulette(finalItemId, done): slot-machine spin in the HUD (tick sounds, 'ding' on land), then done(). While it runs the item is not usable (isRolling()).
// burst(): small pop on the item button.   hideMenus(): hide select + garage.   isRolling() / garageOpen(): state for main.js.
import * as THREE from 'three';
import {ICONS,NAMES} from './items.js';
import {getBest,KART_N,getTrackDiff,setTrackDiff,DIFFS,RACERS,OWN_KARTS} from './save.js';
import {isNew,ownsRacer,ownsKart,heartProgress,noteViewed,newBadges,nameClipId} from './unlocks.js';
import {currentRace,listCups,shelfRows,trophyLabel} from './cups.js';
import {EMB_ORDER,MARK_ORDER,EMB_NAMES,MARK_NAMES,FX_NAMES,NEON,NEON_NAMES,hexCss,markCss,svgIcon} from './emblems.js';
import {paintMarker} from './minimap.js';
import {PAINTS,FINISHES,WHEELS,BODIES,TRAILS,DECALS,applyKart,heroFx,heroFxReset,buildPreviewKart,racerLook,HERO_LOOK} from './karts.js';

const $=id=>document.getElementById(id);
let C=null,sel='sky',from='select';
const DEF_TRACKS=[{id:'sky',name:'Neon Sky City'},{id:'harbor',name:'Glowtide Harbor'},{id:'skyway',name:'Arcade Skyway'},{id:'beach',name:'Sunny Shores Boardwalk'},{id:'candy',name:'Candy Crystal Peaks'}];
const VOICE={sky:'s_sky',harbor:'s_harbor',skyway:'s_skyway',beach:'s_beach',candy:'s_candy'};
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
  <g fill="#35f2ff"><rect x="60" y="100" width="6" height="6"/><rect x="134" y="98" width="6" height="6"/></g></svg>`,
 beach:`<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="tg5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1c6a"/><stop offset=".5" stop-color="#ff7a8a"/><stop offset="1" stop-color="#ffd0a0"/></linearGradient><linearGradient id="tg6" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2ad0d8"/><stop offset="1" stop-color="#1a7aa8"/></linearGradient></defs><rect width="200" height="120" fill="url(#tg5)"/><circle cx="168" cy="52" r="12" fill="#fff0c0"/><rect y="58" width="200" height="16" fill="url(#tg6)"/>
  <g transform="translate(62 38)"><circle r="22" fill="none" stroke="#fff" stroke-width="3"/><circle r="3" fill="#ffd23a"/><path d="M-22 0h44M0-22v44M-15.5-15.5l31 31M15.5-15.5l-31 31" stroke="#fff" stroke-width="1.5"/><g fill="#ff4fd8"><circle cx="22" r="3.2"/><circle cx="-22" r="3.2"/><circle cy="22" r="3.2"/><circle cy="-22" r="3.2"/></g><g fill="#35f2ff"><circle cx="15.5" cy="15.5" r="3.2"/><circle cx="-15.5" cy="-15.5" r="3.2"/><circle cx="15.5" cy="-15.5" r="3.2"/><circle cx="-15.5" cy="15.5" r="3.2"/></g><path d="M-10 38L0 0l10 38" fill="none" stroke="#fff" stroke-width="2"/></g>
  <g transform="translate(130 56)"><path d="M-16 4a16 11 0 0 1 32 0z" fill="#ff4f7a"/><path d="M-5 4a5 11 0 0 1 10 0z" fill="#fff"/><rect x="-1" y="4" width="2" height="12" fill="#fff"/></g>
  <path d="M0 120L82 78h36l82 42z" fill="#e8c088"/><path d="M82 78L0 120M118 78l82 42" stroke="#ffd23a" stroke-width="3"/><path d="M100 118V80" stroke="#fff" stroke-width="3" stroke-dasharray="7 7"/>
  <circle cx="30" cy="100" r="8" fill="#ff3f6a"/><path d="M30 92a8 8 0 0 1 0 16a4 8 0 0 0 0-16z" fill="#fff"/><path d="M22 100a8 8 0 0 1 8-8v16a8 8 0 0 1-8-8z" fill="#35b8ff"/><g fill="#ffd23a"><circle cx="170" cy="104" r="3"/><circle cx="184" cy="98" r="2.4"/></g></svg>`,
 candy:`<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="tg7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3aa0"/><stop offset=".55" stop-color="#ff8ac8"/><stop offset="1" stop-color="#ffe0c8"/></linearGradient></defs><rect width="200" height="120" fill="url(#tg7)"/>
  <g><path d="M-6 84L34 26l40 58z" fill="#c8a8ff"/><path d="M20 44l14-18 14 18q-7 7-14 2t-14-2z" fill="#fff4fa"/><path d="M120 84l40-62 46 62z" fill="#ffb0d8"/><path d="M146 44l14-22 15 22q-7 8-15 2t-14-2z" fill="#fff4fa"/><path d="M60 84l30-40 30 40z" fill="#a8ffd8"/><path d="M78 56l12-12 12 12q-6 5-12 1t-12-1z" fill="#fff4fa"/></g>
  <g stroke="#fff" stroke-width="2" fill="none"><path d="M60 36a40 40 0 0 1 80 0" stroke="#ff3a5a" stroke-width="3"/><path d="M64 36a36 36 0 0 1 72 0" stroke="#ffe03a" stroke-width="3"/><path d="M68 36a32 32 0 0 1 64 0" stroke="#35b8ff" stroke-width="3"/></g>
  <g><rect x="14" y="76" width="3" height="22" fill="#fff"/><circle cx="15.5" cy="70" r="9" fill="#ff5aa8"/><path d="M15.5 70m-5 0a5 5 0 0 1 10 0" fill="none" stroke="#fff" stroke-width="2"/><rect x="178" y="80" width="3" height="20" fill="#fff"/><circle cx="179.5" cy="74" r="8" fill="#4fd8ff"/><path d="M174 74a5.5 5.5 0 0 1 11 0" fill="none" stroke="#fff" stroke-width="2"/></g>
  <path d="M0 120L82 80h36l82 40z" fill="#c9a2e6"/><path d="M82 80L0 120M118 80l82 40" stroke="#ff2f6a" stroke-width="3"/><path d="M100 118V82" stroke="#fff" stroke-width="3" stroke-dasharray="7 7"/>
  <g fill="#35f2ff"><path d="M40 104l5-8 5 8-5 6z"/></g><g fill="#ffd23a"><path d="M150 102l5-8 5 8-5 6z"/></g></svg>`
};
const TROPHY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="#ffd23a"/><path d="M7 5H3c0 4 2 6 4 6M17 5h4c0 4-2 6-4 6" fill="none" stroke="#ffd23a" stroke-width="2"/><path d="M12 14v4M8 21h8l-1-3H9z" fill="#ffd23a"/></svg>';
// M6B: each track card has its own level chips (1/2/3 stars, flame = Extreme). Chips are real buttons (>= 48 px), so the card itself is a div.
const STAR='<path d="M12 2l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.3l-6.3 3.1 1.5-7.1L1.8 9.4 9 8.6z" fill="#ffd23a"/>',FLAME='<path d="M12 1.5c1 4-3.5 5.7-3.5 10a3.5 3.5 0 0 0 7 0c0-1.3-.5-2.2-1.1-3 3.5 1.5 5.6 4.6 5.6 7.5a8 8 0 0 1-16 0C4 9 10 7 12 1.5z" fill="#ff4a3a" stroke="#ffd23a" stroke-width="1.4" stroke-linejoin="round"/>';
const CHIP_NAME={easy:'Easy',medium:'Medium',hard:'Hard',extreme:'Extreme'};
const chipSvg=d=>{const n=d==='easy'?1:d==='medium'?2:d==='hard'?3:0;if(!n)return `<svg viewBox="0 0 24 24" aria-hidden="true">${FLAME}</svg>`;return Array.from({length:n},()=>`<svg viewBox="0 0 24 24" aria-hidden="true">${STAR}</svg>`).join('');};
function buildSelect(){const row=$('tsRow');row.innerHTML='';
 for(const t of tracks()){const b=document.createElement('div');b.className='tcard';b.dataset.id=t.id;b.setAttribute('role','radio');b.setAttribute('tabindex','0');b.setAttribute('aria-label',t.name);
  b.innerHTML=`<div class="th">${THUMBS[t.id]||''}</div><div class="ti"><b>${t.name}</b><span class="bt">${TROPHY}<span class="bv"></span></span></div><div class="chips" role="radiogroup" aria-label="Level">${DIFFS.map(d=>`<button class="chip" type="button" data-d="${d}" aria-label="${CHIP_NAME[d]}">${chipSvg(d)}</button>`).join('')}</div>`;
  b.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('.chip');if(c){e.stopPropagation();setLevel(t.id,c.dataset.d);return;}pick(t.id,true);});
  b.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target===b){e.preventDefault();pick(t.id,true);}});row.appendChild(b);}}
function setLevel(id,d){if(!setTrackDiff(C.ST,id,d))return;try{C.save&&C.save();}catch(e){}if(sel!==id)pick(id,false);else refreshSelect();}
function refreshSelect(){const ST=C.ST;for(const b of $('tsRow').children){const id=b.dataset.id,best=getBest(ST,id,getTrackDiff(ST,id)==='extreme'?4:3);b.querySelector('.bv').textContent=best>0?fmt(best):'–:––';
  b.setAttribute('aria-pressed',id===sel);b.setAttribute('aria-checked',id===sel);const lv=getTrackDiff(ST,id);for(const c of b.querySelectorAll('.chip')){const on=c.dataset.d===lv;c.setAttribute('aria-pressed',on);c.setAttribute('aria-checked',on);}const had=b.querySelector('.nw');
  if(best<=0&&id!=='sky'&&!had){const n=document.createElement('span');n.className='nw';n.textContent='NEW!';b.appendChild(n);}else if((best>0||id==='sky')&&had)had.remove();}}
function pick(id,voice){if(sel===id&&voice)return;sel=id;refreshSelect();if(voice){say(VOICE[id]);}try{C.Audio&&C.Audio.prepTrack&&C.Audio.prepTrack(id);}catch(e){}}
export function showTrackSelect(){if(!C)return;const t=tracks();sel=t.some(x=>x.id===C.ST.track)?C.ST.track:t[0].id;buildSelect();refreshSelect();hideCupScreens();show('trackSel',true);show('garage',false);markCups();say('s_pick',8);try{C.Audio&&C.Audio.prepTrack&&C.Audio.prepTrack(sel);}catch(e){}}
export function newBest(){say('s_newbest');}
export function showUnlocks(list){const el=$('finUnlock');if(!el)return;el.replaceChildren();
 if(!list||!list.length){el.hidden=true;return;}
 el.hidden=false;const said=new Set();
 for(const u of list){const p=document.createElement('p');p.textContent=(u.pop||'New!')+' '+(u.id||'');el.appendChild(p);
  for(const id of u.voice||[]){if(!id||said.has(id))continue;said.add(id);say(id);}}}
export function hideMenus(){show('trackSel',false);closeGarage(true);hideCupScreens();}

// ---------- garage ----------
const TABS=[
 {k:'racer',n:'Racer',ic:svg('0 0 24 24','<circle cx="12" cy="8" r="4" fill="#fff"/><path d="M4 20c1.2-4 4-6 8-6s6.8 2 8 6" fill="#ff4fd8"/>')},
 {k:'body',n:'Kart',ic:svg('0 0 24 24','<path d="M2 15l2-5a2 2 0 0 1 2-1.4h6.6a2 2 0 0 1 1.7 1l2.2 3.4 2 .6A1.6 1.6 0 0 1 22 15v1.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" fill="#fff"/><circle cx="7" cy="18" r="2.2" fill="#35f2ff"/><circle cx="17" cy="18" r="2.2" fill="#35f2ff"/>')},
 {k:'paint',n:'Paint',ic:svg('0 0 24 24','<path d="M12 2c3 4 7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 4-8 7-12z" fill="#ff4fd8" stroke="#fff" stroke-width="1.6"/><path d="M8.5 14a3.5 3.5 0 0 0 3 3.4" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>')},
 {k:'wheels',n:'Wheels',ic:svg('0 0 24 24','<circle cx="12" cy="12" r="9.5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="#d8d8e4"/><path d="M12 7v10M7 12h10M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#555" stroke-width="1.4"/>')},
 {k:'trail',n:'Trail',ic:svg('0 0 24 24','<path d="M12 2l2.2 6.3L21 9l-5 4 1.6 6.6L12 16l-5.6 3.6L8 13 3 9l6.8-.7z" fill="#ffe14d" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>')},
 {k:'decal',n:'Stickers',ic:svg('0 0 24 24','<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" fill="#ff3fd8" stroke="#fff" stroke-width="1.6"/>')},
 {k:'emblem',n:'Emblem',ic:svgIcon('crown','#ffd23a')},
 {k:'marker',n:'Map marker',ic:svg('0 0 24 24','<path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.800-7 12-7 12z" fill="#35f2ff" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="10" r="2.8" fill="#fff"/>')}];
const hex=h=>'#'+new THREE.Color(h).getHexString();
// option pictures
const OPT={
 body:i=>[svg('0 0 48 32','<rect x="6" y="14" width="36" height="9" rx="4" fill="#ff4fd8"/><rect x="18" y="8" width="12" height="9" rx="4" fill="#fff"/><circle cx="12" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="36" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/>'),
   svg('0 0 48 32','<path d="M3 22l8-7h26l8 7v2H3z" fill="#ff4fd8"/><rect x="32" y="6" width="14" height="3" rx="1" fill="#fff"/><path d="M36 9v8M42 9v8" stroke="#fff" stroke-width="2"/><circle cx="12" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="36" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/>'),
   svg('0 0 48 32','<rect x="6" y="14" width="36" height="9" rx="4" fill="#ff4fd8"/><path d="M16 15v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#fff" stroke-width="2.4"/><ellipse cx="38" cy="22" rx="7" ry="7" fill="#ff4fd8" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="36" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/>'),
   svg('0 0 48 32','<rect x="8" y="14" width="34" height="9" rx="4" fill="#ff4fd8"/><path d="M4 18l8-3v6z" fill="#ffe14d"/><path d="M28 14l8-10v10z" fill="#fff"/><circle cx="12" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="36" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/>'),
   svg('0 0 48 32','<rect x="6" y="14" width="36" height="9" rx="4" fill="#ff7ac8"/><circle cx="16" cy="10" r="3" fill="#fff"/><circle cx="24" cy="8" r="3.4" fill="#ffe14d"/><circle cx="32" cy="10" r="3" fill="#35f2ff"/><circle cx="12" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="36" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/>'),
   svg('0 0 48 32','<rect x="6" y="14" width="36" height="9" rx="4" fill="#ff4f7a"/><path d="M24 4c3 3 6 5 6 8a6 6 0 0 1-12 0c0-3 3-5 6-8z" fill="#ff7ac8"/><circle cx="12" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="36" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/>'),
   svg('0 0 48 32','<path d="M4 20l10-6h20l10 6v3H4z" fill="#35f2ff"/><path d="M24 3l2.4 5 5.4.6-4 3.6.9 5.2L24 15l-4.7 2.4.9-5.2-4-3.6 5.4-.6z" fill="#ffe14d"/><circle cx="12" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="36" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/>'),
   svg('0 0 48 32','<path d="M6 22l12-12h12l12 12v3H6z" fill="#7dff6a"/><path d="M18 10l4-7 4 7" fill="#ff7a1a"/><path d="M30 10l3-5 3 5" fill="#ff7a1a"/><circle cx="12" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="36" cy="25" r="5" fill="#222" stroke="#fff" stroke-width="2"/>')][i],
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
let tab='racer',draft=null,pv=null;
const lim=k=>KART_N[k];
function buildGarage(){const tb=$('gTabs');tb.innerHTML='';for(const t of TABS){const b=document.createElement('button');b.className='gtab';b.setAttribute('role','tab');b.setAttribute('aria-label',t.n);b.dataset.k=t.k;b.innerHTML=t.ic+'<span>'+t.n+'</span>';b.addEventListener('click',()=>{if(tab!==t.k)noteTab(tab);tab=t.k;renderTab();});tb.appendChild(b);}
 const fin=$('gFin');fin.innerHTML='';FINISHES.forEach((f,i)=>{const b=document.createElement('button');b.className='gopt';b.dataset.i=i;b.setAttribute('aria-label',f.n);
  const bg=i===0?'linear-gradient(135deg,#ff8ae0,#e8287a)':i===1?'linear-gradient(135deg,#fff,#9aa4b8 45%,#fff 60%,#7a8498)':'radial-gradient(circle,#fff,#ff4fd8 55%,#ff4fd8)';
  b.innerHTML=`<i style="background:${bg};${i===2?'box-shadow:0 0 10px #ff4fd8':''}"></i>${f.n.replace(' glow','')}`;b.addEventListener('click',()=>choose('finish',i));fin.appendChild(b);});}
// M5: Emblem tab = shape row + colour row; Map marker tab = shape row + colour row (8 neon + rainbow) + effect row. Other tabs = one row.
const SECTIONS={emblem:['emblem','emblemColor'],marker:['marker','markerColor','markerFx']};
const swatch=(c,rb)=>`<span class="sw${rb?' rb7':''}" style="${rb?'':'background:'+hexCss(c)}"></span>`;
const FXI=[svg('0 0 24 24','<circle cx="12" cy="12" r="6" fill="#fff"/>'),svg('0 0 24 24','<circle cx="12" cy="12" r="10" fill="#35f2ff" opacity=".3"/><circle cx="12" cy="12" r="7" fill="#35f2ff" opacity=".5"/><circle cx="12" cy="12" r="4" fill="#fff"/>'),
 svg('0 0 24 24','<path d="M5 18l2-1.2M9 14l1.6-.9" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M16 8l1.1 2.7 2.9.2-2.2 1.9.7 2.8L16 14l-2.5 1.6.7-2.8L12 10.900l2.900-.2z" fill="#ffe97a"/><circle cx="6" cy="9" r="1.4" fill="#ff7ac8"/><circle cx="11" cy="19" r="1.2" fill="#35f2ff"/>')];
const LOCKC='#8b7fb8';
const sil=inner=>inner.replace(/(fill|stroke)="#[0-9a-fA-F]{3,8}"/g,'$1="'+LOCKC+'"');   // locked = flat lavender silhouette of the real picture
function racerIcon(i,locked){const name=RACERS[i]||'?',L=racerLook(name);if(!L)return svg('0 0 48 48','<circle cx="24" cy="24" r="22" fill="#fff"/>');
 return svg('0 0 48 48',`<circle cx="24" cy="24" r="22" fill="${locked?'#2a1a55':L.css}" stroke="${locked?'#6a5aa0':'#fff'}" stroke-width="3"/><g transform="translate(6 6) scale(1.5)">${locked?sil(L.svg):L.svg}</g>`);}
function optOwned(k,i){if(!C||!C.ST)return k!=='racer'||i===0;if(k==='racer')return i===0||ownsRacer(C.ST,RACERS[i]);if(k==='body'&&i>=4)return ownsKart(C.ST,OWN_KARTS[i-4]);return true;}
function optBadge(k,i){if(!C||!C.ST)return '';
 if(k==='racer'&&i>0&&isNew(C.ST,'racer',RACERS[i]))return '<span class="nw">NEW</span>';
 if(k==='body'&&i>=4&&isNew(C.ST,'kart',OWN_KARTS[i-4]))return '<span class="nw">NEW</span>';
 if((k==='racer'||k==='body')&&!optOwned(k,i))return '<span class="lk" aria-hidden="true">'+IC.lock+'</span>';
 return '';}
// icon hints for locked racers / karts (picture first; the short word is a bonus for readers)
const IC={lock:svg('0 0 24 24','<rect x="4" y="10" width="16" height="12" rx="3" fill="#ffd23a" stroke="#fff" stroke-width="1.6"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="16" r="1.8" fill="#7a4a00"/>'),
 flag:svg('0 0 24 24','<path d="M6 2v20" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M6 3h13l-3 4.500 3 4.500H6z" fill="#ffe14d"/>'),
 trophy:c=>svg('0 0 24 24',`<path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="${c}"/><path d="M7 5H3c0 4 2 5 4 5M17 5h4c0 4-2 5-4 5" fill="none" stroke="${c}" stroke-width="1.8"/><rect x="10.500" y="14" width="3" height="4" fill="${c}"/><rect x="7" y="18" width="10" height="3" rx="1" fill="${c}"/>`),
 star:svg('0 0 24 24','<path d="M12 2l2.900 6.300 6.900.8-5.100 4.700 1.400 6.800L12 17.200 5.900 20.600l1.400-6.800L2.200 9.100l6.900-.8z" fill="#ffe97a"/>'),
 heart:svg('0 0 24 24','<path d="M12 20s-8-5-8-10.500A4.300 4.300 0 0 1 12 7a4.300 4.300 0 0 1 8 2.500C20 15 12 20 12 20z" fill="#ff7ac8"/>'),
 rainbow:svg('0 0 24 24','<path d="M3 17a9 9 0 0 1 18 0" fill="none" stroke="#ff3a5a" stroke-width="2.600"/><path d="M5.600 17a6.400 6.400 0 0 1 12.800 0" fill="none" stroke="#ffd23a" stroke-width="2.600"/><path d="M8.200 17a3.800 3.800 0 0 1 7.600 0" fill="none" stroke="#35f2ff" stroke-width="2.600"/>'),
 candy:svg('0 0 24 24','<circle cx="12" cy="12" r="9" fill="#ff5fb0" stroke="#fff" stroke-width="1.6"/><path d="M12 12m-5 0a5 5 0 1 0 5-5" fill="none" stroke="#fff" stroke-width="2"/>'),
 crown:svg('0 0 24 24','<path d="M3 18l-1-11 5 4 5-8 5 8 5-4-1 11z" fill="#ffd23a"/>')};
const dotsHtml=n=>`<span class="dots" aria-label="${n} of 5 wins">${[0,1,2,3,4].map(j=>'<i'+(j<n?' class="on"':'')+'></i>').join('')}</span>`;
const FRIEND_NAMES=['Pip','Mochi','Bolt','Kiki','Coco'];
// {h: hint html, t: sentence for the help bar}
function lockInfo(k,i){const name=k==='racer'?RACERS[i]:OWN_KARTS[i-4],st=(C&&C.ST)||{};
 if(FRIEND_NAMES.includes(name))return {h:IC.flag+'<b>beat</b>',t:`Finish ahead of ${name} in a race to race as ${name}!`};
 if(name==='Shelly')return {h:IC.flag+'<b>beat</b>',t:'Beat all your friends, Shelly last, to race as Shelly!'};
 if(name==='Sprinkle')return {h:IC.trophy('#ffd23a')+IC.star,t:'Win a trophy in the Star Cup to race as Sprinkle!'};
 if(name==='Ember')return {h:IC.trophy('#ffd23a')+IC.heart,t:'Win a trophy in the Heart Cup to race as Ember!'};
 if(name==='Pebble'){const n=Math.min(20,st.races|0);return {h:IC.flag+'<b>'+n+'/20</b>',t:`Race 20 times to race as Pebble. You have ${n}!`};}
 if(name==='Twinkle')return {h:IC.trophy('#ffd23a')+IC.rainbow,t:'Win gold in the Rainbow Cup to race as Twinkle!'};
 if(name==='Candy Cruiser')return {h:IC.flag+IC.candy,t:'Finish a race on Candy Crystal Peaks!'};
 if(name==='Heart Racer'){const h=heartProgress(st);return {h:dotsHtml(h.have)+IC.crown,t:`Heart Racer: win 5 races. You have ${h.have}!`};}
 if(name==='Star Comet')return {h:IC.trophy('#ffd23a')+'<b>any cup</b>',t:'Win a gold trophy in any cup to drive Star Comet!'};
 if(name==='Dragon Jet')return {h:IC.trophy('#ffb070').repeat(3),t:'Win a trophy in all 3 cups to drive Dragon Jet!'};
 return null;}
function cardHtml(k,i,pic){const own=optOwned(k,i),nm=k==='racer'?RACERS[i]:BODIES[i],li=own?null:lockInfo(k,i);
 return `<span class="pic">${pic}</span><b class="nm">${nm}</b>`+(li?`<span class="hint">${li.h}</span>`:'');}
function showHelp(k,i){const h=$('gHelp'),li=optOwned(k,i)?null:lockInfo(k,i);if(!li){h.hidden=true;return;}h.innerHTML=(k==='racer'?racerIcon(i,true):svg('0 0 48 32',sil(OPT.body(i).replace(/^<svg[^>]*>|<\/svg>$/g,''))))+'<p>'+li.t+'</p>';h.hidden=false;}
function noteTab(k){if(!C||!C.ST)return;const kind=k==='racer'?'racer':k==='body'?'kart':'';if(!kind)return;if(noteViewed(C.ST,kind).length)try{C.save&&C.save();}catch(e){}}
function optHtml(k,i){const d=draft||{};
 if(k==='racer')return cardHtml(k,i,racerIcon(i,!optOwned(k,i)));
 if(k==='body')return cardHtml(k,i,optOwned(k,i)?OPT.body(i):sil(OPT.body(i)));
 if(k==='emblem')return i===0?OPT.decal(0):svgIcon(EMB_ORDER[i-1],hexCss(NEON[d.emblemColor|0]));
 if(k==='emblemColor')return swatch(NEON[i]);
 if(k==='marker')return svgIcon(MARK_ORDER[i],markCss(d.markerColor|0,0));
 if(k==='markerColor')return i===8?swatch(0,1):swatch(NEON[i]);
 if(k==='markerFx')return FXI[i];
 if(k==='paint')return `<span class="sw" style="background:${hex(PAINTS[i].hex)}"></span>`;
 return OPT[k](i);}
const optName=(k,i)=>k==='racer'?RACERS[i]:k==='paint'?PAINTS[i].n:k==='emblem'?EMB_NAMES[i]:k==='marker'?MARK_NAMES[i]:k==='emblemColor'?NEON_NAMES[i]:k==='markerColor'?(NEON_NAMES[i]||'Rainbow'):k==='markerFx'?FX_NAMES[i]:({body:BODIES,wheels:WHEELS.map(w=>w.n),trail:TRAILS,decal:DECALS})[k][i];
function renderTab(){for(const b of $('gTabs').children)b.setAttribute('aria-selected',b.dataset.k===tab);$('gFin').hidden=tab!=='paint';
 const g=$('gGrid'),keep=g.scrollTop;g.innerHTML='';g.classList.toggle('sz64',tab==='marker'||tab==='emblem');g.classList.toggle('lbl',tab==='racer'||tab==='body');$('gHelp').hidden=true;tabDots();
 (SECTIONS[tab]||[tab]).forEach((k,si)=>{if(si){const sp=document.createElement('div');sp.className='gsec';g.appendChild(sp);}
  for(let i=0;i<lim(k);i++){const b=document.createElement('button');b.className='gopt';b.dataset.i=i;b.dataset.k=k;b.setAttribute('aria-label',optName(k,i)+(optOwned(k,i)?'':' locked')+(optBadge(k,i).includes('NEW')?' NEW':''));b.innerHTML=optHtml(k,i)+optBadge(k,i);
   if(!optOwned(k,i))b.setAttribute('aria-disabled','true');
   b.addEventListener('click',()=>choose(k,i));g.appendChild(b);}});
 g.scrollTop=keep;syncPressed();$('mkPrev').classList.toggle('show',tab==='marker');if(tab==='marker')mkLoop();}
function syncPressed(){if(!draft)return;for(const b of $('gGrid').children)if(b.dataset.k)b.setAttribute('aria-pressed',+b.dataset.i===draft[b.dataset.k]);for(const b of $('gFin').children)b.setAttribute('aria-pressed',+b.dataset.i===draft.finish);}
function tabDots(){const nb=newBadges(C.ST),has={racer:nb.some(x=>x.kind==='racer'),body:nb.some(x=>x.kind==='kart')};
 for(const b of $('gTabs').children){const on=!!has[b.dataset.k];let d=b.querySelector('.tdot');if(on&&!d){d=document.createElement('i');d.className='tdot';b.appendChild(d);}else if(!on&&d)d.remove();}}
// a tap on a racer / new kart says its name (pre-made clip; silent until the clip exists)
function nameClip(k,i){if(k==='racer')return nameClipId('racer',RACERS[i]);if(k==='body'&&i>=4)return nameClipId('kart',OWN_KARTS[i-4]);return null;}
function choose(k,i){if(!draft)return;if(!optOwned(k,i)){showHelp(k,i);return;}$('gHelp').hidden=true;const id=nameClip(k,i);if(id)say(id);if(draft[k]===i)return;draft[k]=i;if(k==='emblemColor'||k==='markerColor'||k==='racer'||k==='body')renderTab();else{syncPressed();if(k==='emblem')renderTab();}if(pv)pv.kart.userData.restyle(draft);}
// live preview of the map marker: it loops round a little circle so glow / sparkle trail show
let mkRaf=0,mkT=0,mkTrail=[];
function mkLoop(){if(mkRaf)return;const cv=$('mkPrev');cv.width=cv.height=160;const g=cv.getContext('2d');let last=performance.now(),tt=0;
 const f=now=>{if(!garageOpen()||tab!=='marker'||!draft){mkRaf=0;return;}const dt=Math.min(.05,(now-last)/1000);last=now;mkT+=dt;
  if(now-tt>33){tt=now;g.clearRect(0,0,160,160);g.fillStyle='rgba(20,8,44,.78)';g.beginPath();g.roundRect(1,1,158,158,26);g.fill();g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=3;g.stroke();
   g.strokeStyle='#35f2ff';g.lineWidth=7;g.beginPath();g.arc(80,80,42,0,7);g.stroke();
   const a=mkT*2,x=80+Math.cos(a)*42,y=80+Math.sin(a)*42;
   if(draft.markerFx===2){mkTrail.push({x:x+(Math.random()-.5)*6,y:y+(Math.random()-.5)*6,a:1});if(mkTrail.length>9)mkTrail.shift();for(const p of mkTrail)p.a=Math.max(0,p.a-.1);}else mkTrail.length=0;
   paintMarker(g,x,y,18,draft,mkT,mkTrail);}
  mkRaf=requestAnimationFrame(f);};mkRaf=requestAnimationFrame(f);}   // silent: taps make no sound
export function showGarage(){if(!C)return;draft=Object.assign({},C.ST.kart||{});for(const k in KART_N)if(!(draft[k]>=0&&draft[k]<KART_N[k]))draft[k]=0;
 if(!$('gTabs').children.length)buildGarage();renderTab();show('trackSel',false);show('garage',true);startPreview();say('s_garage',8);}
export const garageOpen=()=>$('garage').classList.contains('show');
function closeGarage(silent){if(!garageOpen())return;noteTab(tab);show('garage',false);stopPreview();}
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
const RING={shield:{ic:'shield',c:'#35f2ff'},boost:{ic:'speed',c:'#ffe14d'},rocket:{ic:'rocket',c:'#ffd23a'},mega:{ic:'mega',c:'#ff8a3a'},hop:{ic:'hop',c:'#b07aff'},emp:{ic:'emp',c:'#7dff6a'}};   // M6: Mega Kart ring + a 'slowed' ring (EMP / Wave Ring / Lightning Storm)
const rs={shield:{v:0,max:1},boost:{v:0,max:1},rocket:{v:0,max:1},mega:{v:0,max:1},hop:{v:0,max:1},emp:{v:0,max:1}};let rings=null,lastKey='',lastP=null,hopT=0,rolling=null;
function buildRings(){const box=$('puRings');rings={};for(const k in RING){const d=document.createElement('div');d.className='pu';d.style.setProperty('--c',RING[k].c);
  d.innerHTML=`<svg viewBox="0 0 48 48"><circle class="bg" cx="24" cy="24" r="21"/><circle class="fg" cx="24" cy="24" r="21" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/><g transform="translate(13 13) scale(.92)">${ICONS[RING[k].ic]}</g></svg><b></b>`;
  box.appendChild(d);rings[k]={el:d,fg:d.querySelector('.fg'),b:d.querySelector('b'),on:false,off:100,num:-1,warn:false};}}
function setItemBtn(it){const b=$('btnItem'),k=(it||'')+(rolling?'|r':'');if(k===lastKey)return;lastKey=k;
 b.classList.toggle('rolling',!!rolling);b.classList.toggle('has',!!it&&!rolling);b.setAttribute('aria-label',rolling?'Rolling':it?NAMES[it]:'No power-up yet');$('itemIcon').innerHTML=it&&!rolling?ICONS[it]:ICONS.box;}
export function hud(dt,P){if(!C||!P)return;if(!rings)buildRings();
 setItemBtn(P.item);
 if(rolling){const b=$('btnItem');if(b.classList.contains('has'))b.classList.remove('has');const ic=$('itemIcon');if(ic.dataset.k!=='box'){ic.innerHTML=ICONS.box;ic.dataset.k='box';}}else if($('itemIcon').dataset.k==='box')delete $('itemIcon').dataset.k;
 const cur={shield:P.shield>0?P.shield:0,boost:P.boost>0?P.boost:0,rocket:P.rocket>0?P.rocket:0,mega:P.mega>0?P.mega:0,hop:hopT>0?hopT:0,emp:P.emp>0?P.emp:0};
 if(P.floaty&&!lastP?.floaty)hopT=2.1;else if(!P.floaty)hopT=0;else if(hopT>0)hopT=Math.max(.01,hopT-dt);cur.hop=hopT;
 const shown=[];
 for(const k in RING){const s=rs[k],v=cur[k];
  if(v>s.v+.05||(s.v===0&&v>0))s.max=Math.max(v,k==='shield'?22:k==='rocket'?4.8:k==='mega'?5.5:k==='hop'?2.1:k==='emp'?.2:.9);   // new activation: full ring
  if(v>0&&v>s.max)s.max=v;
  if(s.v>0&&v===0&&s.v<Math.max(.12,dt*3)&&(k!=='boost'||s.max>=.9)){sfx('end_'+k);}   // natural expiry (not consumed by a hit)
  s.v=v;const show=v>0&&(k!=='boost'||s.max>=.9);const r=rings[k];
  if(show){shown.push([k,v,s.max]);}
  if(!show&&r.on){r.el.classList.remove('on','warn');r.on=false;}}
 shown.sort((a,b)=>b[1]/b[2]-a[1]/a[2]);let n=0;
 for(const [k,v,mx] of shown){const r=rings[k];if(n++>=2){if(r.on){r.el.classList.remove('on');r.on=false;}continue;}
  if(!r.on){r.el.classList.add('on');r.on=true;}const off=Math.round((1-Math.max(0,Math.min(1,v/mx)))*100);if(off!==r.off){r.off=off;r.fg.setAttribute('stroke-dashoffset',off);}
  const num=Math.ceil(v);if(num!==r.num){r.num=num;r.b.textContent=num;}const warn=v<2&&k==='shield';if(warn!==r.warn){r.warn=warn;r.el.classList.toggle('warn',warn);}}
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

// ---------- cups (M7) ----------
let cupLevel='easy',cupLevelSet=false,cupPhase='between',shelfPick=null;
const placeWord=n=>{const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);};
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
// #5: 'You' wears her chosen racer's face when she owns it (else the default hero). The row still says "You".
export function youLook(){const st=C&&C.ST,i=st&&st.kart?st.kart.racer|0:0,name=RACERS[i];if(i>0&&name&&ownsRacer(st,name)){const L=racerLook(name);if(L)return {css:L.css,svg:L.svg};}return {css:HERO_LOOK.css,svg:HERO_LOOK.svg};}
function faceOf(name){if(name==='You')return youLook();const L=racerLook(name);return L?{css:L.css,svg:L.svg}:{css:'#c8b6ff',svg:''};}
function trophySvg(n){const fill=n>=3?'#ffd23a':n===2?'#e4e7f2':n===1?'#e3944f':'#fff27a';
 if((n|0)<1)return `<svg viewBox="0 0 24 24" class="trophy-svg" aria-hidden="true"><path d="M12 3l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 15.8 7 18.2l1.2-5.6L4 8.8l5.6-.6z" fill="none" stroke="${fill}" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
 return `<svg viewBox="0 0 24 24" class="trophy-svg" aria-hidden="true"><path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="${fill}"/><path d="M7 5H3.5A4.5 4.5 0 0 0 8 10M17 5h3.5A4.5 4.5 0 0 1 16 10" fill="none" stroke="${fill}" stroke-width="2"/><path d="M12 14v3M8.5 21h7L14 17h-4z" fill="${fill}"/></svg>`;}
function ribbonSvg(){return `<svg viewBox="0 0 88 72" class="ribbon-svg" aria-hidden="true"><path d="M10 12h68v30H10z" fill="#ff4fd8" stroke="#fff" stroke-width="3"/><path d="M10 12h68v8H10z" fill="#ffd23a"/><path d="M44 42l-12 24 12-7 12 7z" fill="#ffd23a" stroke="#fff" stroke-width="2"/><path d="M44 20l3.2 7.2h7.6l-6 4.6 2.2 7.4L44 35l-7 4.2 2.2-7.4-6-4.6h7.6z" fill="#fff"/></svg>`;}
function cupIcon(id){
 if(id==='heart')return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" fill="#ff4fd8"/></svg>`;
 if(id==='rainbow')return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17a9 9 0 0 1 18 0" fill="none" stroke="#ff4a6a" stroke-width="2.2"/><path d="M6.5 17a5.5 5.5 0 0 1 11 0" fill="none" stroke="#ffd23a" stroke-width="2.2"/><path d="M10 17a2 2 0 0 1 4 0" fill="none" stroke="#35f2ff" stroke-width="2.2"/></svg>`;
 return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.6 6.2L21 9l-4.8 4.2L17.5 20 12 16.8 6.5 20l1.3-6.8L3 9l6.4-.8z" fill="#ffd23a"/></svg>`;}
function awardVoice(n){return n>=3?'c_gold':n===2?'c_silver':n===1?'c_bronze':null;}
function hideCupScreens(){show('cupSel',false);show('cupEnd',false);show('cupShelf',false);}
function markCups(){const b=$('btnCups');if(!b||!C)return;const on=!!(C.ST&&C.ST.cupRun);b.classList.toggle('has-run',on);b.setAttribute('aria-label',on?'Cups, a cup is waiting':'Cups');}
function ensureLevel(){if(cupLevelSet)return;const d=C&&C.ST&&C.ST.settings&&C.ST.settings.difficulty;if(DIFFS.includes(d))cupLevel=d;cupLevelSet=true;}
function faceNode(name,big){const f=faceOf(name),pv=el('span','cf'+(big?' cf-big':''));pv.style.background=f.css;pv.style.color=f.css;pv.innerHTML=`<svg viewBox="0 0 24 24">${f.svg}</svg>`;return pv;}
function standingsCard(table){const box=el('section','cup-stand');box.dataset.part='standings';box.appendChild(el('h3','cup-h3','Standings'));
 for(const row of (Array.isArray(table)?table:[])){const line=el('div','cup-line'+(row.name==='You'?' me':''));
  line.append(faceNode(row.name,false),el('span','rk',placeWord(row.rank)),el('span','nm',row.name),el('b','pts',String(row.points|0)));box.appendChild(line);}
 return box;}
function podiumRow(table){const row=el('div','cup-pod');
 for(const r of (table||[]).filter(x=>x.rank<=3)){const slot=el('div','slot'+(r.name==='You'?' me':''));slot.style.order=String(r.rank===1?2:r.rank===2?1:3);
  slot.append(faceNode(r.name,true),el('b',null,placeWord(r.rank)),el('span',null,r.name));row.appendChild(slot);}
 return row;}
function mountUnlocks(parent,list){if(!list||!list.length)return;const box=el('div','fin-unlock');
 for(const u of list)box.appendChild(el('p',null,(u.pop||'New!')+' '+(u.id||'')));
 parent.appendChild(box);}
function sayUnlocks(list){const said=new Set();for(const u of list||[])for(const id of u.voice||[]){if(!id||said.has(id))continue;said.add(id);say(id);}}
function speakResult(view,kind){const o=view&&view.outcome;if(kind==='between'){if(o&&o.voice)say(o.voice);else if(view.racePlace===1)say('win');else if((view.racePlace|0)<=3)say('second');}
 else if(o&&o.voice)say(o.voice);if(view&&view.newBest)say('s_newbest');}
function fillBetween(view){const body=$('cupEndBody');body.replaceChildren();const fin=el('section','cup-part');fin.dataset.part='finish';
 fin.append(el('h2',null,view.outcome?view.outcome.title:'Cup Racer'),el('p','sub',view.outcome?view.outcome.cheer:'Cup Racer! Great racing!'),el('p','cup-meta',`Race ${view.raceNo||1} of 3 · ${view.trackName||''}`));
 if(view.outcome&&view.outcome.ribbon){const art=el('div','trophy-art');art.innerHTML=ribbonSvg();fin.appendChild(art);}
 fin.appendChild(el('p','cup-meta',`${placeWord(view.place||1)} in the ${view.cupName||'cup'}`));
 body.append(fin,standingsCard(view.table));
 if(view.nextName)body.appendChild(el('p','cup-meta','Next up: '+view.nextName));
 if(view.time)body.appendChild(el('p','cup-meta',`Time ${view.time} · Fastest lap ${view.best||''}`));
 if(view.newBest)body.appendChild(el('p','cup-best','New best time!'));
 mountUnlocks(body,view.unlocks);}
function fillPodium(view){const body=$('cupEndBody');body.replaceChildren();
 const title=view.outcome&&view.outcome.title?view.outcome.title:'Gold trophy!';
 let cheer=view.outcome&&view.outcome.cheer?view.outcome.cheer:'';
 if(!cheer||cheer===title){const cup=view.cupName||'the cup';cheer=(view.place|0)===1?`You won the ${cup}!`:`Great racing in the ${cup}!`;}
 body.append(el('h2',null,title),el('p','sub',cheer));
 const art=el('div','trophy-art');art.innerHTML=trophySvg(view.outcome?view.outcome.trophy:3);body.appendChild(art);
 body.append(podiumRow(view.table),el('p','cup-meta',`${placeWord(view.place||1)} in the ${view.cupName||'cup'}`),standingsCard(view.table));
 if(view.newBest)body.appendChild(el('p','cup-best','New best time!'));
 mountUnlocks(body,view.unlocks);}
function fillRibbon(view){const body=$('cupEndBody');body.replaceChildren();const art=el('div','trophy-art');art.innerHTML=ribbonSvg();
 body.append(art,el('h2',null,'Cup Racer'),el('p','sub',view.outcome?view.outcome.cheer:'Cup Racer! Great racing!'),el('p','cup-meta',`${placeWord(view.place||4)} in the ${view.cupName||'cup'}`),standingsCard(view.table));
 if(view.newBest)body.appendChild(el('p','cup-best','New best time!'));
 mountUnlocks(body,view.unlocks);}
function openCupEnd(kind,view){cupPhase=kind;view=view||{};if(kind==='between')fillBetween(view);else if(kind==='ribbon')fillRibbon(view);else fillPodium(view);
 const next=$('btnCupNext');if(next){next.textContent=kind==='between'?'Next race':'Next';next.setAttribute('aria-label',kind==='between'?'Next race':'Back to cups');}
 const panel=$('cupEnd');if(panel)panel.dataset.screen=kind;
 show('trackSel',false);show('garage',false);show('cupSel',false);show('cupShelf',false);show('finish',false);show('title',false);show('pauseMenu',false);show('cupEnd',true);
 speakResult(view,kind);const unlocks=view.unlocks;if(unlocks&&unlocks.length)setTimeout(()=>sayUnlocks(unlocks),1600);}
export function showCupBetween(v){openCupEnd('between',v);}
export function showCupPodium(v){openCupEnd('podium',v);}
export function showCupRibbon(v){openCupEnd('ribbon',v);}
function renderLevels(){const box=$('cupLevels');if(!box)return;box.replaceChildren();
 for(const d of DIFFS){const b=document.createElement('button');b.type='button';b.className='chip';b.dataset.d=d;b.setAttribute('aria-label',CHIP_NAME[d]);b.setAttribute('aria-pressed',d===cupLevel?'true':'false');b.innerHTML=chipSvg(d);
  b.addEventListener('click',()=>{cupLevel=d;cupLevelSet=true;renderLevels();renderCupCards();});box.appendChild(b);}}
function renderCupCards(){const row=$('cupRow'),cont=$('cupCont');if(!row||!C)return;row.replaceChildren();if(cont)cont.replaceChildren();
 const run=currentRace(C.ST);
 if(run&&cont){const b=document.createElement('button');b.type='button';b.className='big cup-cont';b.textContent=`Keep going · ${run.cupName} · race ${run.index+1} of 3`;
  b.addEventListener('click',()=>{say(run.voice);try{C.onCupContinue&&C.onCupContinue();}catch(e){console.error(e);}});cont.appendChild(b);}
 for(const c of listCups(C.ST,cupLevel)){const b=document.createElement('button');b.type='button';b.className='cup-card'+(c.open?'':' locked');
  b.innerHTML=`<span class="cup-ic">${cupIcon(c.id)}</span><span class="nm"></span><span class="tr"></span><span class="tb"></span>`;
  b.querySelector('.nm').textContent=c.name;b.querySelector('.tr').textContent=c.races.map(r=>r.name).join(' · ');
  const tb=b.querySelector('.tb');
  if(!c.open){tb.innerHTML=IC.lock;b.setAttribute('aria-disabled','true');b.appendChild(el('span','cup-hint',c.lockLine));}
  else{tb.innerHTML=trophySvg(c.trophy);tb.appendChild(el('span',null,trophyLabel(c.trophy)));}
  b.setAttribute('aria-label',c.open?`${c.name}, ${trophyLabel(c.trophy)}`:`${c.name}. ${c.lockLine}`);
  b.addEventListener('click',()=>{if(!c.open){say(c.lockVoice||'c_rainbow_lock');return;}say(c.voice);try{C.onCupStart&&C.onCupStart(c.id,cupLevel);}catch(e){console.error(e);}});
  row.appendChild(b);}}
export function showCupSelect(){if(!C)return;ensureLevel();renderLevels();renderCupCards();show('cupEnd',false);show('cupShelf',false);show('trackSel',false);show('garage',false);show('finish',false);show('title',false);show('pauseMenu',false);show('cupSel',true);}
function renderShelf(){const body=$('cupShelfBody');if(!body||!C)return;body.replaceChildren();shelfPick=null;
 for(const row of shelfRows(C.ST)){const sec=el('section','shelf-cup');sec.appendChild(el('h3','cup-h3',row.name));
  if(!row.open&&row.lockLine)sec.appendChild(el('p','cup-hint',row.lockLine));
  const grid=el('div','shelf-grid');
  for(const lv of row.levels){const b=document.createElement('button');b.type='button';b.className='shelf-cell'+(row.open?'':' locked');b.dataset.cup=row.id;b.dataset.level=lv.level;
   if(!row.open){b.innerHTML=`${IC.lock}<span>${CHIP_NAME[lv.level]}</span>`;b.setAttribute('aria-label',`${row.name} ${CHIP_NAME[lv.level]} locked`);}
   else{b.innerHTML=`${trophySvg(lv.trophy)}<span>${CHIP_NAME[lv.level]}</span><span>${lv.label}</span>`;b.setAttribute('aria-label',`${row.name} ${CHIP_NAME[lv.level]} ${lv.label}`);}
   b.addEventListener('click',()=>{shelfPick={cup:row.id,level:lv.level,open:row.open,lockVoice:row.lockVoice||'c_rainbow_lock'};
    for(const q of body.querySelectorAll('.shelf-cell'))q.setAttribute('aria-pressed',q===b?'true':'false');
    const v=awardVoice(lv.trophy);if(v)say(v);else if(!row.open)say(row.lockVoice);});
   grid.appendChild(b);}
  sec.appendChild(grid);body.appendChild(sec);
  if(!shelfPick&&row.open)shelfPick={cup:row.id,level:cupLevel,open:true,lockVoice:''};}
 if(!shelfPick)shelfPick={cup:'star',level:cupLevel,open:true,lockVoice:''};}
export function showCupShelf(){if(!C)return;renderShelf();show('cupSel',false);show('cupEnd',false);show('trackSel',false);show('finish',false);show('title',false);show('pauseMenu',false);show('cupShelf',true);}
function wireEnd(again,next,set,phaseFn){const a=$(again),n=$(next),s=$(set);
 if(a)a.addEventListener('click',()=>{const phase=phaseFn();try{C.onCupAgain&&C.onCupAgain(phase,phase==='shelf'?shelfPick:null);}catch(e){console.error(e);}});
 if(n)n.addEventListener('click',()=>{const phase=phaseFn();try{C.onCupNext&&C.onCupNext(phase);}catch(e){console.error(e);}});
 if(s)s.addEventListener('click',()=>{$('btnSetTitle').click();});}

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
 const cupBack=$('btnCupBack');if(cupBack)cupBack.addEventListener('click',()=>showTrackSelect());
 const cupSet=$('btnSetCup');if(cupSet)cupSet.addEventListener('click',()=>$('btnSetTitle').click());
 const shelfBtn=$('btnShelf');if(shelfBtn)shelfBtn.addEventListener('click',()=>showCupShelf());
 const cupsBtn=$('btnCups');if(cupsBtn)cupsBtn.addEventListener('click',()=>{show('trackSel',false);showCupSelect();});
 wireEnd('btnCupAgain','btnCupNext','btnSetCupEnd',()=>cupPhase);
 wireEnd('btnShelfAgain','btnShelfNext','btnSetShelf',()=>'shelf');
 buildSelect();}
