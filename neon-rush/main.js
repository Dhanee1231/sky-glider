// Neon Rush – M4: three tracks (Neon Sky City, Glowtide Harbor, Arcade Skyway) with bridges + tunnels, 7-kart races, power-ups,
// kid-fair obstacles, party lights. Flow: title -> track select (-> garage) -> countdown -> race -> finish. Arcade, spline-relative physics. Original IP only.
import * as THREE from 'three';
import {buildWorld,setTrack,sample,pointAt,wrap,rampAt,heightAt,inTunnel,tunnelCover,L,W,FEAT} from './world.js';
import {load,save,getBest,setBest,getTrackDiff} from './save.js';
import {checkRaceEnd,checkCupEnd,VOICE_IDS} from './unlocks.js';
import {startCup,recordRace,currentRace,snapshotRun,restoreRun,standInTrack,registerTrack,rainbowOpen,VOICE_IDS as CUP_VOICE} from './cups.js';
import * as Audio from './audio.js';
import * as UI from './ui.js';
import {getLaps,VMAX,VBOOST,ACC,BOOST_ACC,STEER_RATE,YAW_MAX,BEND,AIR_G,HOP_G,HOP_VY,TRICK_T,TRICK_BOOST,DRAFT_GAP,DRAFT_MAX,DRAFT_RAMP,setDifficulty,getDiff,DIFF} from './tuning.js';
import {createRain} from './rain.js';
import {newSeed} from './rng.js';
import {createObstacles,EVENTS} from './obstacles.js';
import {createRacers,GRID_PLAYER} from './racers.js';
import {createItems,NAMES,ROWS} from './items.js';
import {createParty} from './b_party.js';
import {createMinimap} from './minimap.js';
import {HERO_LOOK,RIVAL_LOOKS,applyKart} from './karts.js';
import SKY from './tracks/sky.js';import HARBOR from './tracks/harbor.js';import SKYWAY from './tracks/skyway.js';import BEACH from './tracks/beach.js';

const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search);
const ST=load();save(ST);setDifficulty(getTrackDiff(ST,ST.track));
const QSET=Q.get('q')||ST.settings.quality;           // 'auto' | 'high' | 'low'
let HIGH=QSET!=='low';
const TRACKS=[SKY,HARBOR,SKYWAY,BEACH];
for(const t of TRACKS)registerTrack(t.id);   // candy stays unregistered until its module exists; cups.js then stands in Sunny Shores
const trackDef=id=>TRACKS.find(t=>t.id===id)||TRACKS[0];

// ---------- renderer / world (rebuilt per track; the renderer and camera stay) ----------
const R=new THREE.WebGLRenderer({antialias:!HIGH,powerPreference:'high-performance'});
const dprFor=low=>Math.min(Math.max(devicePixelRatio||1,1),low?1.25:1.5);   // M5b: pixel ratio is clamped to 1-1.5 (High) / 1-1.25 (Low)
R.setPixelRatio(dprFor(!HIGH));R.setSize(innerWidth,innerHeight);R.shadowMap.enabled=false;   // no shadow map in any mode (the kart shadow is a blob decal)
R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=.95;R.outputColorSpace=THREE.SRGBColorSpace;R.info.autoReset=false;
$('stage').appendChild(R.domElement);
let S=new THREE.Scene();const cam=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,560);
let mm=null,world,hero,kit,rain,obstacles,racers,items,party,curTrack='';
let lowRuntime=false,raceSeed=1;
// M5b Low mode: no bloom / composer, no mirror, no shadow map, pixel ratio <= 1.25, shorter view distance (far props drop out), no balconies / AC units / wires
function lowTweaks(){if(world.mirror)world.mirror.visible=false;world.composer=null;lowLook();
 S.traverse(o=>{if(o.isMesh&&o.material&&o.material.alphaMap){o.material.alphaMap=null;o.material.transparent=false;o.material.needsUpdate=true;}});world.render=()=>R.render(S,cam);}
function lowLook(){R.setPixelRatio(dprFor(true));R.setSize(innerWidth,innerHeight);cam.far=340;cam.updateProjectionMatrix();S.traverse(o=>{if(o.name==='bal'||o.name==='ac'||o.name==='wires'||o.name==='far')o.visible=false;});}
function dropToLow(){if(lowRuntime||!HIGH)return;lowRuntime=true;lowTweaks();toast('Smooth mode on');say('quality_low');}

// ---------- audio lives in audio.js ----------
const said=[];const say=(k,g)=>{said.push(k);return Audio.say(k,g);},blip=Audio.sfx,engineSet=Audio.engine,applyMute=()=>Audio.applySettings(ST.settings),initAudio=()=>Audio.init(ST.settings);
const RNAMES=['mochi','bolt','kiki','coco','shelly'];   // Track B voice clips (audio/b_*.ogg|mp3, Kokoro af_heart)
Audio.registerVoice(['b_hi','b_got','b_shield','b_rocket','b_hop','b_mystery','b_saved','b_spin','b_crate','b_barrel','b_pass','b_zoom','b_finish','b_rival_win','b_first',...RNAMES.flatMap(n=>['b_pass_'+n,'b_zoom_'+n]),
 't_tunnel','t_bridge','t_goo','t_honk','t_next','t_wheel','t_bonk','t_sky_hi','t_harbor_hi','t_skyway_hi','t_beach_hi','s_beach','b_watch','b_zap','b_splash','b_triple','b_homing','b_comet','b_mega','b_storm',...VOICE_IDS,...CUP_VOICE]);
// ---------- game state ----------
const PFRESH=()=>({s:GRID_PLAYER[0],x:GRID_PLAYER[1],yaw:0,v:0,y:0,vy:0,air:0,boost:0,shield:0,rocket:0,hop:0,floaty:0,spin:0,bounce:0,item:null,itemFx:0,immune:0,spunLast:false,obCd:0,drift:0,driftT:0,driftDir:0,wiggle:0,slow:0,emp:0,empF:1,mega:0,storm:0,wallCd:0,trick:0,trickA:0,lapStart:0,finished:false,time:0,place:4});
const P=Object.assign({isPlayer:true,name:'You',bestLap:0},PFRESH());
let F=null,ALL=[P];
let mode='title',raceT=0,countT=0,lastLap=1,shake=0,jumps=0,prevPlace=0,passT=0,inTun=false,onBr=false;
let forceNight=0,cupLive=false,cupSnap=null,lastCup={cup:'star',level:'easy'};
function resetRace(){const spec=cupLive&&ST.cupRun?currentRace(ST):null;
 if(spec){setDifficulty(spec.level);forceNight=spec.night?1:0;}
 else{setDifficulty(getTrackDiff(ST,curTrack));forceNight=0;}
 Object.assign(P,PFRESH());P.bestLap=0;heroSc=1;hero.scale.setScalar(1);
 raceSeed=Q.has('seed')?(+Q.get('seed')|0):newSeed();obstacles.setSeed(raceSeed);items.setSeed(raceSeed);   // M6B: each race has its own seed (?seed=N repeats one)
 racers.reset();obstacles.reset();obstacles.applyDiff();items.reset();raceT=0;lastLap=1;prevPlace=0;passT=0;jumps=0;inTun=false;onBr=false;UI.resetHud();UI.hud(0,P);placeKarts(0);}
// input
const input={l:0,r:0,kl:0,kr:0};
function bindZone(el,key){const ids=new Set();
 el.addEventListener('pointerdown',e=>{if(e.width>70&&e.height>70)return;/* palm */e.preventDefault();ids.add(e.pointerId);try{el.setPointerCapture(e.pointerId);}catch(_){}input[key]=1;el.classList.add('on');});   /* M5a fix: steer presses never start a trick */
 const up=e=>{ids.delete(e.pointerId);if(!ids.size){input[key]=0;el.classList.remove('on');}};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);}
bindZone($('steerL'),'l');bindZone($('steerR'),'r');
addEventListener('keydown',e=>{if(e.repeat)return;if(['ArrowLeft','a','A'].includes(e.key))input.kl=1;if(['ArrowRight','d','D'].includes(e.key))input.kr=1;if(e.key===' '||e.key==='ArrowUp')tapAnywhere();if(e.key==='Escape'||e.key==='p')togglePause();if(e.key==='x'||e.key==='X'||e.key==='Enter')useItem();});
addEventListener('keyup',e=>{if(['ArrowLeft','a','A'].includes(e.key))input.kl=0;if(['ArrowRight','d','D'].includes(e.key))input.kr=0;});
// M5: tap = 360 spin, swipe up/down = flip (race area only; buttons keep their own handlers)
// M5a fix: swipes count only if they start on the race area (tapLayer), never on a .steer pad or button. Main direction decides: flip if |dy|>|dx|*1.2 and >=24 px within .35 s.
function swipeKind(dx,dy,dt){return dt<=.35&&Math.abs(dy)>=24&&Math.abs(dy)>Math.abs(dx)*1.2?'flip':'spin';}
let sw=null;addEventListener('pointerdown',e=>{sw=null;if(e.target&&e.target.id==='tapLayer'&&!(e.target.closest&&e.target.closest('.steer')))sw={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now()};},true);
addEventListener('pointermove',e=>{if(!sw||e.pointerId!==sw.id)return;const dt=(performance.now()-sw.t)/1000;if(dt>.35){sw=null;return;}
 if(mode==='race'&&P.trick==='spin'&&swipeKind(e.clientX-sw.x,e.clientY-sw.y,dt)==='flip'){P.trick='flip';sw=null;}},true);
addEventListener('pointerup',()=>{sw=null;},true);addEventListener('pointercancel',()=>{sw=null;},true);
$('tapLayer').addEventListener('pointerdown',e=>{tapAnywhere();});
$('btnItem').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();useItem();});
const TAU=Math.PI*2;
function tapAnywhere(kind){if(mode==='race'&&P.air>0&&!P.trick){P.trick=kind||'spin';P.trickA=0;$('tapPrompt').classList.remove('show');popup('Trick!');}}

// ---------- physics ----------
const o={},o2={};
const AUTO=Q.has('auto');
// test/sim bot: noise = steering sloppiness (0 = perfect), miss = chance to not dodge a hazard, useAfter = seconds before using an item
const BOT={risk:0,on:false,noise:0,miss:0,useAfter:1.2,wob:0,tgt:0,held:0,avoid:-1,skip:false};
function autoSteer(){sample(P.s+12,o2);let tx=Math.max(-3,Math.min(3,-o2.k*150));
 if(P.rocket<=0){const a=obstacles.ahead(P.s,tx,26,.9);if(a){if(BOT.avoid!==a.id){BOT.avoid=a.id;BOT.skip=Math.random()<BOT.miss;}if(!BOT.skip)tx=a.x;}}
 {const fk=obstacles.forkAt(P.s+8,45,P.s);if(fk)tx=(BOT.risk?fk.risk:-fk.risk)*3.2;}   // M6B forks: the bot takes the safe branch (BOT.risk: the risky one)
 if(BOT.noise>0){BOT.wob+=(Math.random()-.5)*BOT.noise*.6;BOT.wob*=.985;tx+=BOT.wob;}
 const e=(tx-P.x)*.3-P.yaw*2.4;return Math.abs(e)<.12?0:Math.sign(e);}
function stepPlayer(dt){const steer=(AUTO||BOT.on||P.rocket>0)?autoSteer():Math.max(-1,Math.min(1,(input.r||input.kr)-(input.l||input.kl)));
 sample(P.s,o);
 if(P.rocket>0){P.rocket=Math.max(0,P.rocket-dt);P.boost=Math.max(P.boost,.2);}
 if(P.mega>0)P.spin=0;   // M6 Mega Kart: unstoppable   // Rocket Star: auto-drive + speed (items.js sets P.rocket)
 if(P.hop>0&&P.air<=0){P.hop=0;P.air=1;P.vy=HOP_VY;P.floaty=1;P.trick=0;P.trickA=0;}      // Gravity Hop: big floaty jump (items.js sets P.hop=1)
 P.shield=Math.max(0,P.shield-dt);P.bounce=Math.max(0,P.bounce-dt);P.obCd=Math.max(0,P.obCd-dt);
 if(P.spin>0){P.spin=Math.max(0,P.spin-dt);}
 // slipstream: a little extra top speed while chasing (the kart just ahead is DRAFT_GAP+ m away)
 let ahead=1e9;for(const r of racers.list){const d=r.s-P.s;if(d>0&&d<ahead)ahead=d;}const draft=ahead<1e9&&ahead>DRAFT_GAP?Math.min(DRAFT_MAX,(ahead-DRAFT_GAP)*DRAFT_RAMP):0;
 const vmax=(P.rocket>0?VBOOST*1.02:P.boost>0?VBOOST:VMAX*(1+draft))*(P.mega>0?1.1:1)*(P.wiggle>0?.93:1)*(P.spin>0?.55:1)*(P.slow>0?.62:1)*(P.emp>0?P.empF:1);
 P.slow=Math.max(0,P.slow-dt);P.emp=Math.max(0,P.emp-dt);
 P.v+=(P.v<vmax?(P.boost>0?BOOST_ACC:ACC):-9)*dt;if(P.v>vmax+2)P.v=vmax+2;if(P.v<0)P.v=0;
 const ds=P.v*Math.cos(P.yaw)*dt;
 // track bends under the kart; steering assist cancels most of it (kid-friendly, stronger at M3 speed)
 P.yaw+=o.k*ds*BEND;
 if(getDiff().assist&&P.air<=0&&Math.abs(P.x)>W/2-2.4)P.yaw-=Math.sign(P.x)*.9*dt*Math.min(1,(Math.abs(P.x)-(W/2-2.4))/1.2);   // Easy: gentle push back toward the road centre near the edges
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
 if(P.air<=0&&P.boost<1&&obstacles.padAt(P.s,P.x)){P.boost=1.2;blip('whoosh');say('boost',3);}   // M6B: the risky branch of a fork has boost pads
 // ramp + jump
 const r=rampAt(P.s),rs=r?wrap(P.s)-r.s0:-1;
 if(P.air<=0){if(r&&rs>=0&&rs<r.len){P.y=r.h*rs/r.len;}else if(r&&rs>=r.len&&rs<r.len+1.5&&P.y>.3){P.air=1;P.vy=4.6+P.v*.08;P.trick=0;P.trickA=0;jumps++;$('tapPrompt').classList.add('show');say('jump',3);}else P.y=0;}
 if(P.air>0){if(P.trick&&P.trickA<TAU)P.trickA=Math.min(TAU,P.trickA+dt*TAU/TRICK_T);P.y+=P.vy*dt;P.vy-=(P.floaty?HOP_G:AIR_G)*dt;if(P.y<=0){P.y=0;P.air=0;P.floaty=0;$('tapPrompt').classList.remove('show');shake=.18;if(P.trick){if(P.trickA>=TAU||getDiff().assist){P.boost=Math.max(P.boost,TRICK_BOOST);blip('whoosh');say('trick');popup('Nice landing!');}else{P.wiggle=Math.max(P.wiggle,.5);blip('boing');}   // Easy: always a safe landing; Medium/Hard: unfinished = a little wobble, never a crash
   P.trick=0;P.trickA=0;}}}
 // puddles: splash + wiggle (never a spin)
 if(P.air<=0)for(const p of FEAT.puddles){const d=wrap(P.s)-p.s;if(Math.abs(d)<p.r&&Math.abs(P.x-p.x)<p.r*.7&&P.wiggle<=0){P.wiggle=.6;blip('splash');say('splash',8);}}
 const ev=obstacles.collide(P);if(ev)onObstacle(ev);
 // tunnel / bridge callouts (once each per race, kid-paced)
 const tun=inTunnel(P.s);if(tun&&!inTun&&raceT>2){say('t_tunnel',40);blip('whoosh');}inTun=tun;
 const br=o.y>2.5;if(br&&!onBr&&raceT>2)say('t_bridge',40);onBr=br;
 if(BOT.on&&P.item&&(SIM||!UI.isRolling())){BOT.held+=dt;if(BOT.held>BOT.useAfter){BOT.held=0;useItem();}}
}
// obstacle / hit feedback for the player (gentle: sound + a little shake + a friendly voice line)
function onObstacle(ev){const k=EVENTS[ev]||ev;
 if(ev==='blocked'){blip('shield');say('b_saved',6);popup('Shield saved you!');return;}
 if(ev==='smash'){blip('crate');return;}
 if(ev==='wave'){shake=.12;blip('splash');say('b_splash',10);popup('Splash!');return;}
 if(ev==='car'){shake=.25;blip('boing');blip('barrel');say('t_honk',10);popup('Beep beep!');return;}
 if(k==='bonk'){shake=.25;blip('boing');blip('barrel');say(ev==='barrel'?'b_barrel':'t_bonk',10);popup('Bonk!');}
 else if(k==='crash'){shake=.15;blip('crate');say('b_crate',10);popup('Crash!');}
 else if(k==='boing'){shake=.15;blip('boing');popup('Boing!');}
 else if(k==='spin'){blip('fan');say(ev==='wheel'?'t_wheel':'b_spin',8);popup(ev==='wheel'?'Prize wheel spin!':'Whee! Spinny!');}
 else if(k==='goo'){blip('splash');say('t_goo',10);popup('Slippy goo!');}
 else if(ev==='wiggle'){blip('boing');}}
// power-ups (the item button + HUD rings + roulette live in ui.js)
function useItem(){if(mode!=='race'||!P.item||P.finished||(!SIM&&UI.isRolling()))return;items.use(P,ictx);UI.hud(0,P);}
let SIM=false;   // headless sims run synchronously: no roulette (it is timer-driven)
let warnT=-9,moveWarnT=-9;
const ictx={all:ALL,onWarn:()=>{if(raceT-warnT<4)return;warnT=raceT;popup('Watch out!');say('b_watch',8);},onPickup:(k,it)=>{if(k.isPlayer){blip('boxhit');blip('pickup');if(!SIM)UI.roulette(it,()=>{});}},
 onItem:(k,got,was)=>{if(k.isPlayer){const line={speed:'boost',shield:'b_shield',rocket:'b_rocket',hop:'b_hop',dart:'b_zap',orb:'b_zap',mine:'b_zap',emp:'b_zap',tdart:'b_triple',mine3:'b_zap',hrocket:'b_homing',comet:'b_comet',mega:'b_mega',storm:'b_storm'}[got];
   if(was==='box'){popup('Surprise! '+NAMES[got]+'!');say('b_mystery');}else{popup(NAMES[got]+'!');say(line);}blip({speed:'whoosh',dart:'whoosh',tdart:'whoosh',hrocket:'rocket',comet:'rocket',mega:'rocket',storm:'splash',mine3:'barrel',orb:'boing',mine:'barrel',emp:'whoosh'}[got]||got);if(got==='speed'||got==='rocket'||got==='mega')shake=.12;}},
 onHit:(k,r,by)=>{if(k.isPlayer){if(r==='spin'){blip('boing');if(curTrack==='beach'&&by&&by!==k){say('b_splash',6);popup('Splash!');}else{say('b_spin',6);popup('Whoa! Spinny!');}}else if(r==='blocked'){blip('shield');say('b_saved',6);popup('Shield saved you!');}else if(r==='wiggle')blip('boing');}}};
const rctx=Object.assign({},ictx,{player:P,raceT:0,obstacles:null,items:null,L:1,onBump:()=>{if(P.wallCd<=0){blip('boing');P.wallCd=.5;}}});
function stepRivals(dt){rctx.raceT=raceT;racers.update(dt,rctx);items.update(dt,rctx);}
const tmpV=new THREE.Vector3();
let heroSc=1;
function placeKarts(dt){
 pointAt(P.s,P.x,hero.position);hero.position.y+=P.y;sample(P.s,o);hero.rotation.y=Math.atan2(-o.tx,-o.tz)-P.yaw-(P.drift>0?P.driftDir*.25:0);hero.rotation.x=Math.atan(o.gy);
 const b=hero.userData.body;b.rotation.z=-(input.r||input.kr?1:input.l||input.kl?-1:0)*.04+(P.wiggle>0?Math.sin(P.wiggle*40)*.06:0);b.rotation.x=P.air>0?-P.vy*.02:(P.y>0?-.15:0);
 hero.scale.setScalar(heroSc+=((P.mega>0?1.6:P.storm>0?.62:1)-heroSc)*.2);hero.userData.shadow.position.y=-P.y+.001;hero.userData.cone.visible=P.air<=0;
 hero.rotation.y+=(P.spin>0?P.spin*12:0)+(P.trick==='spin'?P.trickA:0);if(P.trick==='flip')b.rotation.x-=P.trickA;hero.updateMatrixWorld();racers.place(cam,P,hero,clock);}
// camera (pulled back a little and wider at M3 speed so the road ahead reads early); follows the road height over bridges
const camVel=new THREE.Vector3(),camPrev=new THREE.Vector3(),camPos=new THREE.Vector3(),camLook=new THREE.Vector3(),fwd=new THREE.Vector3();let fovKick=0,clock=0;
function updateCam(dt,snap){sample(P.s,o);const h=Math.atan2(o.tx,o.tz)-P.yaw*.55;fwd.set(Math.sin(h),0,Math.cos(h));
 const tall=innerHeight/innerWidth>1,sp=Math.min(1,P.v/VMAX),back=(tall?5.6:4.5)+sp*.5,up=(tall?2.6:2.1)+sp*.15;
 let lift=0;for(const r of racers.list){const dS=P.s-r.s;if(dS>0&&dS<back+2&&Math.abs(P.x-r.x)<2)lift=Math.max(lift,1.7*(1-Math.max(0,dS-1)/(back+1)));}
 if(inTunnel(P.s,4))lift=Math.min(lift,.6);   // keep clear of the tunnel roof
 const g0=o.y,gBack=heightAt(P.s-back),gAhead=heightAt(P.s+9);
 tmpV.copy(hero.position).addScaledVector(fwd,-back*(1-lift*.15));tmpV.y=Math.max(g0,gBack)+up+lift+P.y*.6;const k=snap?1:1-Math.exp(-dt*8);camPos.lerp(tmpV,k);
 tmpV.copy(hero.position).addScaledVector(fwd,8+sp*2);tmpV.y=(g0+gAhead)/2+.9+P.y*.5;camLook.lerp(tmpV,snap?1:1-Math.exp(-dt*10));
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
function buildLadder(){ladder.innerHTML='';ptEl.clear();for(const r of[{name:'You',css:HERO_LOOK.css,svg:HERO_LOOK.svg},...racers.list]){const d=document.createElement('div');d.className='pt'+(r.name==='You'?' me':'');d.style.background=r.css;d.style.color=r.css;
 d.innerHTML='<svg viewBox="0 0 24 24">'+r.svg+'</svg>';d.setAttribute('aria-label',r.name);ladder.appendChild(d);ptEl.set(r.name,d);}lastOrderKey='';}
$('titleRivals').innerHTML=RIVAL_LOOKS.filter(r=>r.name!=='You').map(r=>`<div class="pt" style="background:${r.css};color:${r.css}"><svg viewBox="0 0 24 24">${r.svg}</svg></div>`).join('');
let lastOrderKey='';
let lastFork=0;
function hud(){const fk=obstacles.forkAt(P.s,75,P.s);if(fk&&fk.key!==lastFork&&P.s<(Math.floor(P.s/L)*L+fk.a)){lastFork=fk.key;popup(fk.risk<0?'◀ ⚡ Fast lane':'Fast lane ⚡ ▶');}
 const LAPS=getLaps(),lap=Math.min(LAPS,Math.max(1,Math.floor(P.s/L)+1));$('lap').textContent=`LAP ${lap}/${LAPS}`;
 const st=racers.standings(P);P.place=st.place;$('timer').textContent=fmt(raceT*1000);
 let key='';for(const a of st.order)key+=a.name[0]+a.name[1];if(key!==lastOrderKey){lastOrderKey=key;st.order.forEach((a,i)=>{ptEl.get(a.name).style.order=i;});$('place').innerHTML=ord(st.place);
  // passing callouts (kid-paced: one at a time)
  if(prevPlace&&raceT>3&&raceT-passT>2.2&&st.place!==prevPlace){passT=raceT;const nb=st.order[st.place-1+(st.place<prevPlace?1:-1)];const nm=nb&&!nb.me?nb.name:'';
   if(st.place<prevPlace){if(st.place===1){popup("You're in 1st!");say('b_first',12);}else{popup(nm?'You passed '+nm+'!':'Nice pass!');say(nm==='Pip'?'passed':nm?'b_pass_'+nm.toLowerCase():'b_pass',4);}}
   else{popup(nm?nm+' zoomed past!':'Catch them!');say(nm==='Pip'?'pippass':nm?'b_zoom_'+nm.toLowerCase():'b_zoom',8);}}
  prevPlace=st.place;}
 if(lap!==lastLap){const lt=raceT-P.lapStart;P.bestLap=P.bestLap?Math.min(P.bestLap,lt):lt;P.lapStart=raceT;lastLap=lap;if(lap===LAPS){popup('Final lap!');say('final');Audio.music('final',curTrack);}else{popup('Lap '+lap+'!');say('lap2');}}}
// countdown
let cdStep=-1,countWall0=0;
function startCountdown(after){mode='count';countT=0;countWall0=performance.now();cdStep=-1;show('count',true);countAfter=after;checkRotate();}let countAfter='race';
function stepCountdown(dt){countT=(performance.now()-countWall0)/1000;const st=Math.floor(countT/.9);if(st!==cdStep){cdStep=st;const txt=['3','2','1','GO!'][st];if(txt){$('count').textContent=txt;$('count').classList.remove('pulse');void $('count').offsetWidth;$('count').classList.add('pulse');say(['three','two','one','go'][st]);}
  if(st>=3){mode='race';Audio.music(Math.floor(P.s/L)+1>=getLaps()?'final':'race',curTrack);requestWake();setTimeout(()=>show('count',false),600);}}}
// pause / visibility / fold / back
function togglePause(){if(mode==='race'||mode==='count')pause();else if(mode==='paused')resume();}
function pause(why){if(mode!=='race'&&mode!=='count')return;mode='paused';show('count',false);Audio.music('paused',curTrack);show('pauseMenu',true);engineSet(0,false);releaseWake();say('paused',2);}
function resume(){show('pauseMenu',false);show('settings',false);say('resume');startCountdown('race');}
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();Audio.suspend(true);}else Audio.suspend(false);});
history.replaceState({nr:0},'');history.pushState({nr:1},'');
addEventListener('popstate',()=>{history.pushState({nr:1},'');if(mode==='race'||mode==='count')pause();else if($('settings').classList.contains('show'))show('settings',false);});
let lastW=innerWidth,lastH=innerHeight,rzT;
addEventListener('resize',()=>{clearTimeout(rzT);rzT=setTimeout(()=>{const big=Math.abs(innerWidth*innerHeight-lastW*lastH)/(lastW*lastH)>.15||(innerWidth>innerHeight)!==(lastW>lastH);
 lastW=innerWidth;lastH=innerHeight;world.resize();checkRotate();if(big)pause('fold');},150);});
// portrait: menus never ask to rotate; only the race does, and only on phone-shaped screens (a 884x982 Fold inner screen races in portrait)
function checkRotate(){const tall=innerWidth<800&&innerHeight/innerWidth>1.2&&(mode==='race'||mode==='count'||mode==='paused');show('rotate',tall);if(tall){pause();say('rotate',10);}}
// wake lock + fullscreen
let wake=null;async function requestWake(){try{if('wakeLock' in navigator&&!wake)wake=await navigator.wakeLock.request('screen');wake?.addEventListener?.('release',()=>wake=null);}catch(e){}}
function releaseWake(){try{wake?.release();}catch(e){}wake=null;}
async function goFull(){try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen&&!Q.has('nofs'))await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch(e){}}

// ---------- tracks: build / switch (everything of the old track is disposed) ----------
// the new track is built into a fresh scene and compiled BEFORE the old one is disposed, so shared shader programs are reused
function loadTrack(id){const def=trackDef(id);if(def.id===curTrack&&world)return;
 const old=world;S=new THREE.Scene();
 setTrack(def);ROWS.length=0;ROWS.push(...def.items);   // item-box rows are per track (items.js reads ROWS when it builds)
 world=buildWorld(R,S,cam,HIGH&&!lowRuntime,ST.kart);hero=world.hero;kit=world.kit;world.resize();hero.rotation.order='YXZ';
 rain=createRain(kit,cam);obstacles=createObstacles(kit);obstacles.onWarn=()=>{if(mode==='race'&&raceT-moveWarnT>2){moveWarnT=raceT;blip('warn');}};racers=createRacers(kit);items=createItems(kit);party=createParty(kit);
 ALL.length=0;ALL.push(P,...racers.list);F=racers.list.find(r=>r.name==='Pip');Object.assign(rctx,{obstacles,items,L,all:ALL,pace:def.pace||1});ictx.all=ALL;
 if(!HIGH)lowLook();curTrack=def.id;buildLadder();if(!mm)mm=createMinimap($('minimap'),sample,(i,s)=>obstacles.riskOf(i,s));mm.setTrack(L,def.forks||[]);if(HIGH&&lowRuntime)lowTweaks();
 rainG.hero=hero;resetRace();updateCam(0,true);
 if(old){try{R.compile(S,cam);}catch(e){}old.dispose();}}
// a spinning-wheel overlay while a new track builds (~0.5-1.5 s on a phone; no words needed)
function loadingCover(on){let el=$('nrLoad');if(!el){el=document.createElement('div');el.id='nrLoad';el.className='loading';el.setAttribute('aria-label','Loading');
  el.innerHTML='<svg viewBox="0 0 48 48" width="96" height="96"><circle cx="24" cy="24" r="20" fill="none" stroke="#ff4fd8" stroke-width="5"/><g stroke="#35f2ff" stroke-width="4"><path d="M24 6v36M6 24h36M11 11l26 26M37 11L11 37"/></g><circle cx="24" cy="24" r="5" fill="#ffd23a"/></svg>';
  document.body.appendChild(el);el.firstChild.animate([{transform:'rotate(0)'},{transform:'rotate(360deg)'}],{duration:900,iterations:Infinity});}el.style.display=on?'':'none';}
function startTrack(id){UI.hideMenus();show('title',false);show('finish',false);show('pauseMenu',false);
 const was=curTrack;if(trackDef(id).id!==curTrack){loadingCover(true);mode='menu';setTimeout(()=>{loadTrack(id);loadingCover(false);startTrack2(was);},60);return;}startTrack2(was);}
function startTrack2(was){const spec=cupLive&&ST.cupRun?currentRace(ST):null;if(!spec)ST.track=curTrack;save(ST);
 if(spec&&spec.stub)toast('Candy Crystal Peaks is on its way. Racing Sunny Shores this time!');
 else if(curTrack!==was)say('t_'+curTrack+'_hi');
 resetRace();updateCam(0,true);fovKick=innerHeight>innerWidth?70:58;Audio.music('title',curTrack);setTimeout(()=>{if(mode==='menu'||mode==='finish'||mode==='title')startCountdown('race');},curTrack!==was?900:300);mode='menu';}
function openSelect(){mode='menu';show('title',false);show('finish',false);show('pauseMenu',false);UI.showTrackSelect();}
// buttons
const on=(id,f)=>$(id).addEventListener('click',e=>{e.preventDefault();f(e);});
on('btnStart',async()=>{show('title',false);await goFull();await initAudio();say('b_hi');openSelect();});
on('btnPause',()=>pause());on('btnResume',()=>resume());
on('btnRestart',()=>{show('pauseMenu',false);resetRace();updateCam(0,true);startCountdown('race');});
on('btnAgain',()=>{cupLive=false;forceNight=0;say('again');show('finish',false);resetRace();updateCam(0,true);startCountdown('race');});
on('btnNext',()=>{cupLive=false;forceNight=0;say('t_next');const i=TRACKS.findIndex(t=>t.id===curTrack);startTrack(TRACKS[(i+1)%TRACKS.length].id);});
for(const id of['btnSetTitle','btnSetPause','btnSetFinish'])on(id,()=>{say('settings');openSettings();});
on('btnSetClose',()=>show('settings',false));
function openSettings(){show('settings',true);syncSettings();}
function syncSettings(){$('tSound').setAttribute('aria-pressed',ST.settings.sound);$('tVoice').setAttribute('aria-pressed',ST.settings.voice);$('tFps').setAttribute('aria-pressed',ST.settings.fps);
 for(const q of['auto','high','low'])$('q_'+q).setAttribute('aria-pressed',ST.settings.quality===q);
 for(const d of['easy','medium','hard','extreme'])for(const pre of['d_']){const b=$(pre+d);b.setAttribute('aria-pressed',ST.settings.difficulty===d);b.setAttribute('aria-checked',ST.settings.difficulty===d);}$('fps').classList.toggle('show',ST.settings.fps||Q.has('fps'));}
on('tSound',()=>{ST.settings.sound=!ST.settings.sound;save(ST);applyMute();syncSettings();});
on('tVoice',()=>{ST.settings.voice=!ST.settings.voice;save(ST);applyMute();syncSettings();});
on('tFps',()=>{ST.settings.fps=!ST.settings.fps;save(ST);syncSettings();});
for(const d of['easy','medium','hard','extreme'])for(const pre of['d_'])on(pre+d,()=>{if(ST.settings.difficulty===d&&!Object.keys(ST.settings.trackDifficulty||{}).length)return;ST.settings.difficulty=d;ST.settings.trackDifficulty={};setDifficulty(cupLive&&ST.cupRun&&ST.cupRun.level?ST.cupRun.level:getTrackDiff(ST,curTrack));   // Settings level = the level for every track (clears the per-track chips). A cup keeps its own level.
  save(ST);syncSettings();obstacles.applyDiff();});   // picker: Level (settings + track select); obstacles re-spread now, the rest reads it live
for(const q of['auto','high','low'])on('q_'+q,()=>{if(ST.settings.quality===q)return;ST.settings.quality=q;save(ST);syncSettings();
 const u=new URL(location.href);u.searchParams.delete('q');setTimeout(()=>location.replace(u.toString()),250);});   // rebuilds the scene at the new quality
for(const id of['btnHomePause','btnHomeFinish','btnHomeTitle','btnHomeSel','btnHomeCup','btnHomeCupEnd','btnHomeShelf'])$(id)?.addEventListener('click',()=>{releaseWake();});
function launchCupRace(){const spec=currentRace(ST);if(!spec){cupLive=false;mode='menu';UI.showCupSelect();return;}
 cupLive=true;cupSnap=snapshotRun(ST);lastCup={cup:spec.cup,level:spec.level};forceNight=spec.night?1:0;
 UI.hideMenus();show('cupEnd',false);show('cupShelf',false);show('finish',false);show('title',false);show('pauseMenu',false);show('settings',false);
 startTrack(standInTrack(spec.track));}
function onCupStart(cup,level){const spec=startCup(ST,cup,level);if(!spec)return;save(ST);launchCupRace();}
function onCupContinue(){if(!currentRace(ST)){UI.showCupSelect();return;}launchCupRace();}
function onCupAgain(phase,pick){if(phase==='between'&&cupSnap){restoreRun(ST,cupSnap);save(ST);launchCupRace();return;}
 if(pick&&pick.open===false){say(pick.lockVoice||'c_rainbow_lock');return;}
 const cup=(pick&&pick.cup)||lastCup.cup,level=(pick&&pick.level)||lastCup.level;
 if(cup==='rainbow'&&!rainbowOpen(ST)){say('c_rainbow_lock');return;}
 if(!startCup(ST,cup,level)){say('c_rainbow_lock');return;}save(ST);launchCupRace();}
function onCupNext(phase){if(phase==='between'){launchCupRace();return;}
 cupLive=false;mode='menu';show('finish',false);show('pauseMenu',false);show('cupEnd',false);show('settings',false);UI.showCupSelect();}
function cupView(spec,rec,unlocks,newBest,ms){const next=currentRace(ST);
 return {cup:rec.cup,level:rec.level,cupName:spec.cupName,raceNo:(spec.index|0)+1,trackName:spec.name,nextName:next?next.name:'',place:rec.place,racePlace:rec.racePlace,outcome:rec.outcome,table:rec.table,unlocks,newBest,time:fmt(ms),best:fmt(Math.round((P.bestLap||0)*1000))};}
UI.init({ST,save:()=>save(ST),Audio,say,TRACKS:TRACKS.map(t=>({id:t.id,name:t.name})),onPick:id=>{cupLive=false;forceNight=0;startTrack(id);},
 onCupStart,onCupContinue,onCupAgain,onCupNext,
 onGarageDone:c=>{try{applyKart(hero,c);}catch(e){}try{world.setEmblem(c.emblem,c.emblemColor);}catch(e){}buildLadder();}});
// finish
function finishRace(){mode='finish';$('pop').classList.remove('show');popT=0;Audio.music('finish',curTrack);show('count',false);$('tapPrompt').classList.remove('show');P.finished=true;P.time=raceT;engineSet(0,false);releaseWake();const fst=racers.standings(P);const won=fst.place===1;
 const ms=Math.round(raceT*1000),lt=raceT-P.lapStart;P.bestLap=P.bestLap?Math.min(P.bestLap,lt):lt;ST.races++;if(won)ST.wins++;
 const at=fst.order.findIndex(a=>a.me),ahead=fst.order.slice(at<0?fst.order.length:at+1).map(a=>a.name).filter(Boolean);
 const cupSpec=cupLive&&ST.cupRun?currentRace(ST):null;
 const level=cupSpec?cupSpec.level:getTrackDiff(ST,curTrack);
 const unlocked=checkRaceEnd(ST,{trackId:curTrack,level,place:fst.place,ahead,won});
 const newBest=raceT>20&&setBest(ST,curTrack,raceT,getLaps());
 if(cupSpec){const rec=recordRace(ST,fst.order.map((a,i)=>({name:a.name,place:i+1})));
  let fresh=[];if(rec&&rec.done)fresh=checkCupEnd(ST,{cup:rec.cup,level:rec.level,place:rec.place,trophy:rec.outcome.trophy});
  save(ST);P.item=null;UI.resetHud();
  if(rec){lastCup={cup:rec.cup,level:rec.level};cupLive=false;const view=cupView(cupSpec,rec,unlocked.concat(fresh),newBest,ms);
   show('finish',false);if(rec.done&&rec.outcome.ribbon)UI.showCupRibbon(view);else if(rec.done)UI.showCupPodium(view);else UI.showCupBetween(view);return;}}
 save(ST);
 const winner=fst.order[0];$('finTitle').innerHTML=ord(fst.place)+' place!';const cheer=getDiff().cheer;$('finSub').textContent=won?'You won the race!':cheer?'You did it! Great racing!':fst.place<=3?`Great racing! ${winner.name} won this time.`:`Great racing! ${winner.name} won. Try again!`;
 $('finPod').innerHTML=fst.order.slice(0,3).map((a,i)=>`<div class="pt${a.me?' me':''}" style="background:${a.me?HERO_LOOK.css:a.css};color:${a.me?HERO_LOOK.css:a.css}"><svg viewBox="0 0 24 24">${a.me?HERO_LOOK.svg:a.svg}</svg><b>${i+1}</b></div>`).join('');
 $('finTime').textContent=fmt(ms);$('finBest').textContent=fmt(Math.round(P.bestLap*1000));P.item=null;UI.resetHud();show('finish',true);say(won?'win':fst.place<=3?'second':'b_finish');UI.showUnlocks(unlocked);
 if(newBest)setTimeout(()=>{if(mode==='finish'){popup('New best time!');UI.newBest();}},2400);
 else if(!won&&!cheer)setTimeout(()=>{if(mode==='finish')say(winner.name==='Pip'?'pip_win':'b_rival_win');},2600);}

// ---------- fps meter + auto quality ----------
const ft=new Float32Array(120);let fi=0,fpsAcc=0,fpsN=0,fpsShow=0,worst=0,lowFor=0,warm=0;
function meter(dt,raw){ft[fi++%120]=raw;fpsAcc+=raw;fpsN++;worst=Math.max(worst,raw);
 if(fpsAcc>=.5){const fps=fpsN/fpsAcc;if($('fps').classList.contains('show')){$('fps').textContent=`${fps.toFixed(0)} fps · ${(fpsAcc/fpsN*1000).toFixed(1)} ms avg · worst ${(worst*1000).toFixed(0)} ms\n${R.info.render.calls} calls · ${(R.info.render.triangles/1000).toFixed(0)}k tris · ${lowRuntime||!HIGH?'Low':'High'} · DPR ${R.getPixelRatio().toFixed(2)} · ${innerWidth}×${innerHeight}`;}
  if(mode==='race'&&QSET==='auto'&&HIGH&&!lowRuntime){warm+=fpsAcc;if(warm>4){if(fps<50)lowFor+=fpsAcc;else lowFor=Math.max(0,lowFor-fpsAcc);if(lowFor>5)dropToLow();}}
  fpsAcc=0;fpsN=0;worst=0;}}

// ---------- main loop (delta time) ----------
const rainG={heroS:0,hero:null,camVel,cover:0,inTunnel};
let last=performance.now();
function frame(now){const raw=Math.max(0,Math.min(.25,(now-last)/1000)),dt=Math.min(.05,raw);last=now;   // rAF time can be older than boot time: never negative
 clock+=dt;
 if(mode==='race'){raceT+=dt;stepPlayer(dt);stepRivals(dt);obstacles.update(dt,raceT,P.s,P.v);hud();UI.hud(dt,P);if(P.s>=getLaps()*L)finishRace();Audio.engine(P.v,true,{boost:P.boost>0,rocket:P.rocket>0,item:P.itemFx>0});}
 else if(mode==='count')stepCountdown(dt);
 else if(mode==='title'||mode==='menu'){P.s+=dt*2;for(const r of racers.list)r.s+=dt*2;obstacles.update(dt,0,P.s,0);}
 if(toastT>0&&(toastT-=dt)<=0)$('toast').classList.remove('show');if(popT>0&&(popT-=dt)<=0)$('pop').classList.remove('show');
 if(mode==='race'||mode==='count'||mode==='paused')mm.update(dt,clock,P,racers.list,ST.kart);
 placeKarts(dt);updateCam(dt,false);
 rainG.heroS=P.s;rainG.cover=Math.max(tunnelCover(P.s),tunnelCover(P.s-3));rain.update(mode==='paused'?dt*.25:dt,rainG);party.update(mode==='paused'?0:dt,cam,P.s);
 world.updateFx(dt,{lap:lastLap,heroS:P.s,speed01:Math.min(1,P.v/VMAX),drift:P.drift,boost:P.boost,air:P.air,cover:rainG.cover,night:(forceNight&&(mode==='race'||mode==='count'||mode==='paused'||mode==='finish')||(mode==='race'&&P.s>=2*L))?1:0,mode});
 R.info.reset();world.render();meter(dt,raw);
 requestAnimationFrame(frame);}
loadTrack(Q.get('track')||ST.track||'sky');fovKick=innerHeight>innerWidth?70:58;
syncSettings();checkRotate();requestAnimationFrame(frame);
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
function sim(sec,bot){show('count',false);SIM=true;if(bot)Object.assign(BOT,{on:true,noise:0,miss:0,useAfter:1.2,wob:0,avoid:-1,risk:0},bot);const log={walls:0,boosts:0,jumps:0,maxAbsX:0,minV:99,hits:{},items:{},rivalItems:0,spins:0};let t=0;const dt=1/60;
 const cnt=(o,k)=>o[k]=(o[k]||0)+1;const oo=onObstacle;const pi=ictx.onItem;
 onObstacle=ev=>{cnt(log.hits,ev);oo(ev);};ictx.onItem=rctx.onItem=(k,got,was)=>{if(k.isPlayer)cnt(log.items,got);else log.rivalItems++;pi(k,got,was);};
 while(t<sec&&mode==='race'){raceT+=dt;const pw=P.wallCd,ps=P.spin;stepPlayer(dt);if(P.wallCd>pw)log.walls++;if(P.spin>ps+.1)log.spins++;stepRivals(dt);obstacles.update(dt,raceT,P.s,P.v);hud();log.maxAbsX=Math.max(log.maxAbsX,Math.abs(P.x));if(raceT>3)log.minV=Math.min(log.minV,P.v);if(P.s>=getLaps()*L){finishRace();break;}t+=dt;}
 onObstacle=oo;ictx.onItem=rctx.onItem=pi;BOT.on=false;SIM=false;
 placeKarts(0);updateCam(0,true);log.jumps=jumps;log.raceT=+raceT.toFixed(1);log.mode=mode;log.place=P.place;log.pipFinished=F.finished;log.gap=(P.s-F.s).toFixed(1);
 log.order=racers.standings(P).order.map(a=>a.name).join(',');return log;}
window.__nr={DIFF,get _dbg(){return {world,R,S,cam};},get racers(){return racers;},get items(){return items;},get obstacles(){return obstacles;},get party(){return party;},sim,BOT,ALL,resetRace,ui:UI,said,get ST(){return ST;},
 startRace:(id)=>{cupLive=false;forceNight=0;if(id)loadTrack(id);UI.hideMenus();show('title',false);show('finish',false);show('pauseMenu',false);resetRace();mode='race';show('count',false);},
 loadTrack,startTrack,get track(){return curTrack;},TRACKS:TRACKS.map(t=>t.id),
 snap:()=>{placeKarts(0);updateCam(0,true);},dbg:()=>({cam:cam.position.toArray(),hero:hero.position.toArray(),fov:cam.fov,look:camLook.toArray()}),P,get F(){return F;},get mode(){return mode},set mode(m){mode=m},get L(){return L;},input,finishRace,useItem,giveItem:it=>{P.item=it;UI.hud(0,P);},
 finishCup:(ev)=>{const fresh=checkCupEnd(ST,ev||{});save(ST);try{UI.showUnlocks(fresh);}catch(e){}return fresh;},
 stats:()=>({calls:R.info.render.calls,tris:R.info.render.triangles,high:HIGH&&!lowRuntime,mem:{...R.info.memory},programs:R.info.programs?.length})};
