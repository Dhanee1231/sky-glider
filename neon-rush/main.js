// Neon Rush – M3: 7-kart race (you + 6 rivals), power-ups, kid-fair obstacles, party lights. Arcade, spline-relative physics. Original IP only.
import * as THREE from 'three';
import {buildWorld,sample,pointAt,wrap,L,W,FEAT} from './world.js';
import {load,save} from './save.js';
import * as Audio from './audio.js';
import {LAPS,VMAX,VBOOST,ACC,BOOST_ACC,STEER_RATE,YAW_MAX,BEND,AIR_G,HOP_G,HOP_VY,DRAFT_GAP,DRAFT_MAX,DRAFT_RAMP} from './tuning.js';
import {createRain} from './rain.js';
import {createObstacles} from './obstacles.js';
import {createRacers,GRID_PLAYER} from './racers.js';
import {createItems,ICONS,NAMES} from './items.js';
import {createParty} from './b_party.js';
import {HERO_LOOK} from './karts.js';

const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search);
const ST=load();
const QSET=Q.get('q')||ST.settings.quality;           // 'auto' | 'high' | 'low'
let HIGH=QSET!=='low';

// ---------- renderer / world ----------
const R=new THREE.WebGLRenderer({antialias:!HIGH,powerPreference:'high-performance'});
R.setPixelRatio(Math.min(devicePixelRatio,1.5));R.setSize(innerWidth,innerHeight);
R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=.95;R.outputColorSpace=THREE.SRGBColorSpace;R.info.autoReset=false;
$('stage').appendChild(R.domElement);
const S=new THREE.Scene();const cam=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,520);
const world=buildWorld(R,S,cam,HIGH);const {hero,kit}=world;world.resize();
const rain=createRain(kit,cam);const obstacles=createObstacles(kit);const racers=createRacers(kit);const items=createItems(kit);const party=createParty(kit);
let lowRuntime=false;
function dropToLow(){if(lowRuntime||!HIGH)return;lowRuntime=true;if(world.mirror)world.mirror.visible=false;world.composer=null;
 S.traverse(o=>{if(o.isMesh&&o.material&&o.material.alphaMap){o.material.alphaMap=null;o.material.transparent=false;o.material.needsUpdate=true;}});
 world.render=()=>R.render(S,cam);toast('Smooth mode on');say('quality_low');}

// ---------- audio lives in audio.js ----------
const say=Audio.say,blip=Audio.sfx,engineSet=Audio.engine,applyMute=()=>Audio.applySettings(ST.settings),initAudio=()=>Audio.init(ST.settings);
const RNAMES=['mochi','bolt','kiki','coco','shelly'];   // Track B voice clips (audio/b_*.ogg|mp3, Kokoro af_heart)
Audio.registerVoice(['b_hi','b_got','b_shield','b_rocket','b_hop','b_mystery','b_saved','b_spin','b_crate','b_barrel','b_pass','b_zoom','b_finish','b_rival_win','b_first',...RNAMES.flatMap(n=>['b_pass_'+n,'b_zoom_'+n])]);
// ---------- game state ----------
const PFRESH=()=>({s:GRID_PLAYER[0],x:GRID_PLAYER[1],yaw:0,v:0,y:0,vy:0,air:0,boost:0,shield:0,rocket:0,hop:0,floaty:0,spin:0,bounce:0,item:null,itemFx:0,immune:0,spunLast:false,obCd:0,drift:0,driftT:0,driftDir:0,wiggle:0,wallCd:0,trick:false,lapStart:0,finished:false,time:0,place:4});
const P=Object.assign({isPlayer:true,name:'You',bestLap:0},PFRESH());
const F=racers.list.find(r=>r.name==='Pip');const ALL=[P,...racers.list];
let mode='title',raceT=0,countT=0,lastLap=1,shake=0,jumps=0,prevPlace=0,passT=0;
function resetRace(){Object.assign(P,PFRESH());P.bestLap=0;
 racers.reset();obstacles.reset();items.reset();raceT=0;lastLap=1;prevPlace=0;passT=0;jumps=0;itemHud();placeKarts(0);}
// input
const input={l:0,r:0,kl:0,kr:0};
function bindZone(el,key){const ids=new Set();
 el.addEventListener('pointerdown',e=>{if(e.width>70&&e.height>70)return;/* palm */e.preventDefault();ids.add(e.pointerId);try{el.setPointerCapture(e.pointerId);}catch(_){}input[key]=1;el.classList.add('on');tapAnywhere();});
 const up=e=>{ids.delete(e.pointerId);if(!ids.size){input[key]=0;el.classList.remove('on');}};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);}
bindZone($('steerL'),'l');bindZone($('steerR'),'r');
addEventListener('keydown',e=>{if(e.repeat)return;if(['ArrowLeft','a','A'].includes(e.key))input.kl=1;if(['ArrowRight','d','D'].includes(e.key))input.kr=1;if(e.key===' '||e.key==='ArrowUp')tapAnywhere();if(e.key==='Escape'||e.key==='p')togglePause();if(e.key==='x'||e.key==='X'||e.key==='Enter')useItem();});
addEventListener('keyup',e=>{if(['ArrowLeft','a','A'].includes(e.key))input.kl=0;if(['ArrowRight','d','D'].includes(e.key))input.kr=0;});
$('tapLayer').addEventListener('pointerdown',e=>{tapAnywhere();});
$('btnItem').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();useItem();});
function tapAnywhere(){if(mode==='race'&&P.air>0&&!P.trick){P.trick=true;$('tapPrompt').classList.remove('show');popup('Trick!');}}

// ---------- physics ----------
const o={},o2={};
const AUTO=Q.has('auto');
// test/sim bot: noise = steering sloppiness (0 = perfect), miss = chance to not dodge a hazard, useAfter = seconds before using an item
const BOT={on:false,noise:0,miss:0,useAfter:1.2,wob:0,tgt:0,held:0,avoid:-1,skip:false};
function autoSteer(){sample(P.s+12,o2);let tx=Math.max(-3,Math.min(3,-o2.k*150));
 if(P.rocket<=0){const a=obstacles.ahead(P.s,tx,26,.9);if(a){if(BOT.avoid!==a.id){BOT.avoid=a.id;BOT.skip=Math.random()<BOT.miss;}if(!BOT.skip)tx=a.x;}}
 if(BOT.noise>0){BOT.wob+=(Math.random()-.5)*BOT.noise*.6;BOT.wob*=.985;tx+=BOT.wob;}
 const e=(tx-P.x)*.3-P.yaw*2.4;return Math.abs(e)<.12?0:Math.sign(e);}
function stepPlayer(dt){const steer=(AUTO||BOT.on||P.rocket>0)?autoSteer():Math.max(-1,Math.min(1,(input.r||input.kr)-(input.l||input.kl)));
 sample(P.s,o);
 if(P.rocket>0){P.rocket=Math.max(0,P.rocket-dt);P.boost=Math.max(P.boost,.2);}   // Rocket Star: auto-drive + speed (items.js sets P.rocket)
 if(P.hop>0&&P.air<=0){P.hop=0;P.air=1;P.vy=HOP_VY;P.floaty=1;P.trick=false;}      // Gravity Hop: big floaty jump (items.js sets P.hop=1)
 P.shield=Math.max(0,P.shield-dt);P.bounce=Math.max(0,P.bounce-dt);P.obCd=Math.max(0,P.obCd-dt);
 if(P.spin>0){P.spin=Math.max(0,P.spin-dt);}
 // slipstream: a little extra top speed while chasing (the kart just ahead is DRAFT_GAP+ m away)
 let ahead=1e9;for(const r of racers.list){const d=r.s-P.s;if(d>0&&d<ahead)ahead=d;}const draft=ahead<1e9&&ahead>DRAFT_GAP?Math.min(DRAFT_MAX,(ahead-DRAFT_GAP)*DRAFT_RAMP):0;
 const vmax=(P.rocket>0?VBOOST*1.02:P.boost>0?VBOOST:VMAX*(1+draft))*(P.wiggle>0?.93:1)*(P.spin>0?.55:1);
 P.v+=(P.v<vmax?(P.boost>0?BOOST_ACC:ACC):-9)*dt;if(P.v>vmax+2)P.v=vmax+2;if(P.v<0)P.v=0;
 const ds=P.v*Math.cos(P.yaw)*dt;
 // track bends under the kart; steering assist cancels most of it (kid-friendly, stronger at M3 speed)
 P.yaw+=o.k*ds*BEND;
 const rate=STEER_RATE*(P.air>0?.35:1)*(P.spin>0?0:1);P.yaw+=steer*rate*dt;
 if(!steer)P.yaw*=Math.exp(-dt*2.6);P.yaw=Math.max(-YAW_MAX,Math.min(YAW_MAX,P.yaw));
 P.s+=ds;P.x+=P.v*Math.sin(P.yaw)*dt;
 // soft walls
 const lim=W/2-.8;P.wallCd-=dt;
 if(Math.abs(P.x)>lim){P.x=Math.sign(P.x)*lim;P.yaw*=-.25;if(P.wallCd<=0){P.v*=.88;shake=.25;blip('boing');say('bump',6);P.wallCd=.6;}}
 // auto drift: holding a strong turn on a bend at speed -> sparks blue/orange/pink, boost on release
 const turning=Math.abs(steer)>0&&Math.abs(o.k)>.008&&P.v>18&&P.air<=0;
 if(turning){P.driftT+=dt;P.driftDir=steer;P.drift=P.driftT>2.1?3:P.driftT>1.3?2:P.driftT>.55?1:0;}
 else if(P.driftT>0){if(P.drift>0){P.boost=Math.max(P.boost,[0,.5,.9,1.3][P.drift]);blip('whoosh');if(P.drift>=2)say('boost',4);}P.driftT=0;P.drift=0;}
 P.boost=Math.max(0,P.boost-dt);P.wiggle=Math.max(0,P.wiggle-dt);
 // boost pads
 for(const b of FEAT.boost){const d=wrap(P.s)-b;if(d>-1.5&&d<1.5&&Math.abs(P.x)<1.7&&P.air<=0&&P.boost<1){P.boost=1.2;blip('whoosh');say('boost',3);}}
 // ramp + jump
 const r=FEAT.ramp,rs=wrap(P.s)-r.s0;
 if(P.air<=0){if(rs>=0&&rs<r.len){P.y=r.h*rs/r.len;}else if(rs>=r.len&&rs<r.len+1.5&&P.y>.3){P.air=1;P.vy=4.6+P.v*.08;P.trick=false;jumps++;$('tapPrompt').classList.add('show');say('jump',3);}else P.y=0;}
 if(P.air>0){P.y+=P.vy*dt;P.vy-=(P.floaty?HOP_G:AIR_G)*dt;if(P.y<=0){P.y=0;P.air=0;P.floaty=0;$('tapPrompt').classList.remove('show');shake=.18;if(P.trick){P.boost=Math.max(P.boost,1.1);blip('whoosh');say('trick');}}}
 // puddles: splash + wiggle (never a spin)
 if(P.air<=0)for(const p of FEAT.puddles){const d=wrap(P.s)-p.s;if(Math.abs(d)<p.r&&Math.abs(P.x-p.x)<p.r*.7&&P.wiggle<=0){P.wiggle=.6;blip('splash');say('splash',8);}}
 const ev=obstacles.collide(P);if(ev)onObstacle(ev);
 if(BOT.on&&P.item){BOT.held+=dt;if(BOT.held>BOT.useAfter){BOT.held=0;useItem();}}
}
// obstacle / hit feedback for the player (gentle: sound + a little shake + a friendly voice line)
function onObstacle(ev){if(ev==='barrel'||ev==='crane'){shake=.25;blip('boing');blip('barrel');say('b_barrel',10);popup('Bonk!');}
 else if(ev==='crate'){shake=.15;blip('crate');say('b_crate',10);popup('Crash!');}
 else if(ev==='fan'){blip('fan');say('b_spin',8);popup('Whee! Spinny!');}
 else if(ev==='wiggle'){blip('boing');}
 else if(ev==='blocked'){blip('shield');say('b_saved',6);popup('Shield saved you!');}
 else if(ev==='smash'){blip('crate');}}
// power-ups
function itemHud(){const it=P.item,b=$('btnItem');b.classList.toggle('has',!!it);b.setAttribute('aria-label',it?NAMES[it]:'No power-up yet');$('itemIcon').innerHTML=it?ICONS[it]:ICONS.box;}
function useItem(){if(mode!=='race'||!P.item||P.finished)return;items.use(P,ictx);itemHud();}
const ictx={all:ALL,onPickup:(k,it)=>{if(k.isPlayer){itemHud();blip('pickup');say('b_got',25);$('btnItem').classList.remove('pop');void $('btnItem').offsetWidth;$('btnItem').classList.add('pop');}},
 onItem:(k,got,was)=>{if(k.isPlayer){const line={speed:'boost',shield:'b_shield',rocket:'b_rocket',hop:'b_hop'}[got];
   if(was==='box'){popup('Surprise! '+NAMES[got]+'!');say('b_mystery');}else{popup(NAMES[got]+'!');say(line);}blip(got==='speed'?'whoosh':got);if(got==='speed'||got==='rocket')shake=.12;}},
 onHit:(k,r,by)=>{if(k.isPlayer){if(r==='spin'){blip('boing');say('b_spin',6);popup('Whoa! Spinny!');}else if(r==='blocked'){blip('shield');say('b_saved',6);popup('Shield saved you!');}else if(r==='wiggle')blip('boing');}}};
const rctx=Object.assign({},ictx,{player:P,raceT:0,obstacles,items,L,onBump:()=>{if(P.wallCd<=0){blip('boing');P.wallCd=.5;}}});
function stepRivals(dt){rctx.raceT=raceT;racers.update(dt,rctx);items.update(dt,rctx);}
const tmpV=new THREE.Vector3();
function placeKarts(dt){
 pointAt(P.s,P.x,hero.position);hero.position.y=P.y;sample(P.s,o);hero.rotation.y=Math.atan2(-o.tx,-o.tz)-P.yaw-(P.drift>0?P.driftDir*.25:0);
 const b=hero.userData.body;b.rotation.z=-(input.r||input.kr?1:input.l||input.kl?-1:0)*.04+(P.wiggle>0?Math.sin(P.wiggle*40)*.06:0);b.rotation.x=P.air>0?-P.vy*.02:(P.y>0?-.15:0);
 hero.userData.shadow.position.y=-P.y+.001;hero.userData.cone.visible=P.air<=0;
 hero.rotation.y+=P.spin>0?P.spin*12:0;hero.updateMatrixWorld();racers.place(cam,P,hero,clock);}
// camera (pulled back a little and wider at M3 speed so the road ahead reads early)
const camVel=new THREE.Vector3(),camPrev=new THREE.Vector3(),camPos=new THREE.Vector3(),camLook=new THREE.Vector3(),fwd=new THREE.Vector3();let fovKick=0,clock=0;
function updateCam(dt,snap){sample(P.s,o);const h=Math.atan2(o.tx,o.tz)-P.yaw*.55;fwd.set(Math.sin(h),0,Math.cos(h));
 const tall=innerHeight/innerWidth>1,sp=Math.min(1,P.v/VMAX),back=(tall?5.6:4.5)+sp*.5,up=(tall?2.6:2.1)+sp*.15;
 let lift=0;for(const r of racers.list){const dS=P.s-r.s;if(dS>0&&dS<back+2&&Math.abs(P.x-r.x)<2)lift=Math.max(lift,1.7*(1-Math.max(0,dS-1)/(back+1)));}
 tmpV.copy(hero.position).addScaledVector(fwd,-back*(1-lift*.15));tmpV.y=up+lift+P.y*.6;const k=snap?1:1-Math.exp(-dt*8);camPos.lerp(tmpV,k);
 tmpV.copy(hero.position).addScaledVector(fwd,8+sp*2);tmpV.y=.9+P.y*.5;camLook.lerp(tmpV,snap?1:1-Math.exp(-dt*10));
 cam.position.copy(camPos);if(dt>0&&!snap)camVel.copy(camPos).sub(camPrev).multiplyScalar(1/dt);else camVel.set(0,0,0);camPrev.copy(camPos);if(shake>0&&!ST.settings.calm){cam.position.x+=(Math.random()-.5)*shake*.4;cam.position.y+=(Math.random()-.5)*shake*.3;}shake=Math.max(0,shake-dt);
 cam.lookAt(camLook);const tf=(tall?70:58)+(P.boost>0||P.rocket>0?8:0)+sp*6;fovKick+=(tf-fovKick)*Math.min(1,dt*4);cam.fov=fovKick;cam.updateProjectionMatrix();}

// ---------- HUD / screens ----------
const fmt=ms=>{const s=ms/1000;return `${Math.floor(s/60)}:${(s%60).toFixed(1).padStart(4,'0')}`;};
const ord=n=>n+'<sup>'+(['st','nd','rd'][n-1]||'th')+'</sup>';
function show(id,on){$(id).classList.toggle('show',on);}
let toastT=0;function toast(t){$('toast').textContent=t;$('toast').classList.add('show');toastT=2.2;}
let popT=0;function popup(t){$('pop').textContent=t;$('pop').classList.add('show');popT=1.6;}
// standings ladder: 7 portraits, re-ordered (CSS order) only when the order changes
const ladder=$('ladder');const ptEl=new Map();
for(const r of[{name:'You',css:HERO_LOOK.css,svg:HERO_LOOK.svg},...racers.list]){const d=document.createElement('div');d.className='pt'+(r.name==='You'?' me':'');d.style.background=r.css;d.style.color=r.css;
 d.innerHTML='<svg viewBox="0 0 24 24">'+r.svg+'</svg>';d.setAttribute('aria-label',r.name);ladder.appendChild(d);ptEl.set(r.name,d);}
$('titleRivals').innerHTML=racers.list.map(r=>`<div class="pt" style="background:${r.css};color:${r.css}"><svg viewBox="0 0 24 24">${r.svg}</svg></div>`).join('');
let lastOrderKey='';
function hud(){const lap=Math.min(LAPS,Math.max(1,Math.floor(P.s/L)+1));$('lap').textContent=`LAP ${lap}/${LAPS}`;
 const st=racers.standings(P);P.place=st.place;$('timer').textContent=fmt(raceT*1000);
 let key='';for(const a of st.order)key+=a.name[0]+a.name[1];if(key!==lastOrderKey){lastOrderKey=key;st.order.forEach((a,i)=>{ptEl.get(a.name).style.order=i;});$('place').innerHTML=ord(st.place);
  // passing callouts (kid-paced: one at a time)
  if(prevPlace&&raceT>3&&raceT-passT>2.2&&st.place!==prevPlace){passT=raceT;const nb=st.order[st.place-1+(st.place<prevPlace?1:-1)];const nm=nb&&!nb.me?nb.name:'';
   if(st.place<prevPlace){if(st.place===1){popup("You're in 1st!");say('b_first',12);}else{popup(nm?'You passed '+nm+'!':'Nice pass!');say(nm==='Pip'?'passed':nm?'b_pass_'+nm.toLowerCase():'b_pass',4);}}
   else{popup(nm?nm+' zoomed past!':'Catch them!');say(nm==='Pip'?'pippass':nm?'b_zoom_'+nm.toLowerCase():'b_zoom',8);}}
  prevPlace=st.place;}
 if(lap!==lastLap){const lt=raceT-P.lapStart;P.bestLap=P.bestLap?Math.min(P.bestLap,lt):lt;P.lapStart=raceT;lastLap=lap;if(lap===LAPS){popup('Final lap!');say('final');Audio.music('final');}else{popup('Lap '+lap+'!');say('lap2');}}}
// countdown
let cdStep=-1;
function startCountdown(after){mode='count';countT=0;cdStep=-1;show('count',true);countAfter=after;}let countAfter='race';
function stepCountdown(dt){countT+=dt;const st=Math.floor(countT/.9);if(st!==cdStep){cdStep=st;const txt=['3','2','1','GO!'][st];if(txt){$('count').textContent=txt;$('count').classList.remove('pulse');void $('count').offsetWidth;$('count').classList.add('pulse');say(['three','two','one','go'][st]);}
  if(st>=3){mode='race';Audio.music(Math.floor(P.s/L)+1>=LAPS?'final':'race');requestWake();setTimeout(()=>show('count',false),600);}}}
// pause / visibility / fold / back
function togglePause(){if(mode==='race'||mode==='count')pause();else if(mode==='paused')resume();}
function pause(why){if(mode!=='race'&&mode!=='count')return;mode='paused';show('count',false);Audio.music('paused');show('pauseMenu',true);engineSet(0,false);releaseWake();say('paused',2);}
function resume(){show('pauseMenu',false);show('settings',false);say('resume');startCountdown('race');}
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();Audio.suspend(true);}else Audio.suspend(false);});
history.replaceState({nr:0},'');history.pushState({nr:1},'');
addEventListener('popstate',()=>{history.pushState({nr:1},'');if(mode==='race'||mode==='count')pause();else if($('settings').classList.contains('show'))show('settings',false);});
let lastW=innerWidth,lastH=innerHeight,rzT;
addEventListener('resize',()=>{clearTimeout(rzT);rzT=setTimeout(()=>{const big=Math.abs(innerWidth*innerHeight-lastW*lastH)/(lastW*lastH)>.15||(innerWidth>innerHeight)!==(lastW>lastH);
 lastW=innerWidth;lastH=innerHeight;world.resize();checkRotate();if(big)pause('fold');},150);});
function checkRotate(){const tall=innerHeight/innerWidth>1.2;show('rotate',tall);if(tall){pause();say('rotate',10);}}
// wake lock + fullscreen
let wake=null;async function requestWake(){try{if('wakeLock' in navigator&&!wake)wake=await navigator.wakeLock.request('screen');wake?.addEventListener?.('release',()=>wake=null);}catch(e){}}
function releaseWake(){try{wake?.release();}catch(e){}wake=null;}
async function goFull(){try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen&&!Q.has('nofs'))await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch(e){}try{await screen.orientation?.lock?.('landscape');}catch(e){}}
// buttons
const on=(id,f)=>$(id).addEventListener('click',e=>{e.preventDefault();f(e);});
on('btnStart',async()=>{show('title',false);await goFull();await initAudio();say('b_hi');resetRace();setTimeout(()=>startCountdown('race'),900);});
on('btnPause',()=>pause());on('btnResume',()=>resume());
on('btnRestart',()=>{show('pauseMenu',false);resetRace();startCountdown('race');});
on('btnAgain',()=>{say('again');show('finish',false);resetRace();startCountdown('race');});
for(const id of['btnSetTitle','btnSetPause','btnSetFinish'])on(id,()=>{say('settings');openSettings();});
on('btnSetClose',()=>show('settings',false));
function openSettings(){show('settings',true);syncSettings();}
function syncSettings(){$('tSound').setAttribute('aria-pressed',ST.settings.sound);$('tVoice').setAttribute('aria-pressed',ST.settings.voice);$('tFps').setAttribute('aria-pressed',ST.settings.fps);
 for(const q of['auto','high','low'])$('q_'+q).setAttribute('aria-pressed',ST.settings.quality===q);$('fps').classList.toggle('show',ST.settings.fps||Q.has('fps'));}
on('tSound',()=>{ST.settings.sound=!ST.settings.sound;save(ST);applyMute();syncSettings();});
on('tVoice',()=>{ST.settings.voice=!ST.settings.voice;save(ST);applyMute();syncSettings();});
on('tFps',()=>{ST.settings.fps=!ST.settings.fps;save(ST);syncSettings();});
for(const q of['auto','high','low'])on('q_'+q,()=>{if(ST.settings.quality===q)return;ST.settings.quality=q;save(ST);syncSettings();
 const u=new URL(location.href);u.searchParams.delete('q');setTimeout(()=>location.replace(u.toString()),250);});   // rebuilds the scene at the new quality
for(const id of['btnHomePause','btnHomeFinish'])$(id).addEventListener('click',()=>{releaseWake();});
// finish
function finishRace(){mode='finish';$('pop').classList.remove('show');popT=0;Audio.music('finish');show('count',false);$('tapPrompt').classList.remove('show');P.finished=true;P.time=raceT;engineSet(0,false);releaseWake();const fst=racers.standings(P);const won=fst.place===1;
 const ms=Math.round(raceT*1000),lap=Math.round(P.bestLap*1000);ST.races++;if(won)ST.wins++;if(!ST.best.raceMs||ms<ST.best.raceMs)ST.best.raceMs=ms;if(lap&&(!ST.best.lapMs||lap<ST.best.lapMs))ST.best.lapMs=lap;save(ST);
 const winner=fst.order[0];$('finTitle').innerHTML=ord(fst.place)+' place!';$('finSub').textContent=won?'You won the race!':fst.place<=3?`Great racing! ${winner.name} won this time.`:`Great racing! ${winner.name} won. Try again!`;
 $('finPod').innerHTML=fst.order.slice(0,3).map((a,i)=>`<div class="pt${a.me?' me':''}" style="background:${a.me?HERO_LOOK.css:a.css};color:${a.me?HERO_LOOK.css:a.css}"><svg viewBox="0 0 24 24">${a.me?HERO_LOOK.svg:a.svg}</svg><b>${i+1}</b></div>`).join('');
 $('finTime').textContent=fmt(ms);$('finBest').textContent=fmt(ST.best.lapMs||lap);P.item=null;itemHud();show('finish',true);say(won?'win':fst.place<=3?'second':'b_finish');if(!won)setTimeout(()=>{if(mode==='finish')say(winner.name==='Pip'?'pip_win':'b_rival_win');},2600);}

// ---------- fps meter + auto quality ----------
const ft=new Float32Array(120);let fi=0,fpsAcc=0,fpsN=0,fpsShow=0,worst=0,lowFor=0,warm=0;
function meter(dt,raw){ft[fi++%120]=raw;fpsAcc+=raw;fpsN++;worst=Math.max(worst,raw);
 if(fpsAcc>=.5){const fps=fpsN/fpsAcc;if($('fps').classList.contains('show')){$('fps').textContent=`${fps.toFixed(0)} fps · ${(fpsAcc/fpsN*1000).toFixed(1)} ms avg · worst ${(worst*1000).toFixed(0)} ms\n${R.info.render.calls} calls · ${(R.info.render.triangles/1000).toFixed(0)}k tris · ${lowRuntime||!HIGH?'Low':'High'} · DPR ${R.getPixelRatio().toFixed(2)} · ${innerWidth}×${innerHeight}`;}
  if(mode==='race'&&QSET==='auto'&&HIGH&&!lowRuntime){warm+=fpsAcc;if(warm>4){if(fps<50)lowFor+=fpsAcc;else lowFor=Math.max(0,lowFor-fpsAcc);if(lowFor>5)dropToLow();}}
  fpsAcc=0;fpsN=0;worst=0;}}

// ---------- main loop (delta time) ----------
const rainG={heroS:0,hero,camVel};
let last=performance.now(),running=true;function rainHero(){rainG.heroS=P.s;}
function frame(now){const raw=Math.max(0,Math.min(.25,(now-last)/1000)),dt=Math.min(.05,raw);last=now;   // rAF time can be older than boot time: never negative
 clock+=dt;
 if(mode==='race'){raceT+=dt;stepPlayer(dt);stepRivals(dt);obstacles.update(dt,raceT,P.s,P.v);hud();if(P.s>=LAPS*L)finishRace();Audio.engine(P.v,true,{boost:P.boost>0,rocket:P.rocket>0,item:P.itemFx>0});}
 else if(mode==='count')stepCountdown(dt);
 else if(mode==='title'){P.s+=dt*2;for(const r of racers.list)r.s+=dt*2;obstacles.update(dt,0,P.s,0);}
 if(toastT>0&&(toastT-=dt)<=0)$('toast').classList.remove('show');if(popT>0&&(popT-=dt)<=0)$('pop').classList.remove('show');
 placeKarts(dt);updateCam(dt,false);
 rainHero();rain.update(mode==='paused'?dt*.25:dt,rainG);party.update(mode==='paused'?0:dt,cam,P.s);
 world.updateFx(dt,{heroS:P.s,speed01:Math.min(1,P.v/VMAX),drift:P.drift,boost:P.boost,air:P.air});
 R.info.reset();world.render();meter(dt,raw);
 requestAnimationFrame(frame);}
resetRace();updateCam(0,true);fovKick=innerHeight>innerWidth?70:58;
syncSettings();checkRotate();requestAnimationFrame(frame);
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
function sim(sec,bot){show('count',false);if(bot)Object.assign(BOT,{on:true,noise:0,miss:0,useAfter:1.2,wob:0,avoid:-1},bot);const log={walls:0,boosts:0,jumps:0,maxAbsX:0,minV:99,hits:{},items:{},rivalItems:0,spins:0};let t=0;const dt=1/60;
 const cnt=(o,k)=>o[k]=(o[k]||0)+1;const oo=onObstacle;const pi=ictx.onItem;
 onObstacle=ev=>{cnt(log.hits,ev);oo(ev);};ictx.onItem=rctx.onItem=(k,got,was)=>{if(k.isPlayer)cnt(log.items,got);else log.rivalItems++;pi(k,got,was);};
 while(t<sec&&mode==='race'){raceT+=dt;const pw=P.wallCd,ps=P.spin;stepPlayer(dt);if(P.wallCd>pw)log.walls++;if(P.spin>ps+.1)log.spins++;stepRivals(dt);obstacles.update(dt,raceT,P.s,P.v);hud();log.maxAbsX=Math.max(log.maxAbsX,Math.abs(P.x));if(raceT>3)log.minV=Math.min(log.minV,P.v);if(P.s>=LAPS*L){finishRace();break;}t+=dt;}
 onObstacle=oo;ictx.onItem=rctx.onItem=pi;BOT.on=false;
 placeKarts(0);updateCam(0,true);log.jumps=jumps;log.raceT=+raceT.toFixed(1);log.mode=mode;log.place=P.place;log.pipFinished=F.finished;log.gap=(P.s-F.s).toFixed(1);
 log.order=racers.standings(P).order.map(a=>a.name).join(',');return log;}
window.__nr={_dbg:{world,R,S,cam},racers,items,obstacles,party,sim,BOT,ALL,resetRace,startRace:()=>{show('title',false);show('finish',false);show('pauseMenu',false);resetRace();mode='race';show('count',false);},
 snap:()=>{placeKarts(0);updateCam(0,true);},dbg:()=>({cam:cam.position.toArray(),hero:hero.position.toArray(),fov:cam.fov,look:camLook.toArray()}),P,F,get mode(){return mode},set mode(m){mode=m},L,input,finishRace,useItem,giveItem:it=>{P.item=it;itemHud();},
 stats:()=>({calls:R.info.render.calls,tris:R.info.render.triangles,high:HIGH&&!lowRuntime})};
