// Neon Rush audio (owned by Track A in M3): Kokoro af_heart voice clips, engine, SFX, music. Taps stay silent.
import {renderLoop,renderFanfare} from './music.js';
import {load,save} from './save.js';
let AC=null,master,sfxBus,voiceBus,musicBus,musicDuck,musicF,musicP,engBus,settings={sound:true,voice:true,engine:7};const clips={};let voiceBusy=0;
export const VOICE=['tap','three','two','one','go','lap2','final','boost','jump','trick','passed','pippass','win','second','paused','resume','rotate','settings','home','again','splash','bump','pip_hi','pip_win','quality_low','quality_high'];
const extra=new Set();export function registerVoice(keys){for(const k of keys)extra.add(k);if(AC)loadClips([...keys]);}   // Track B adds racer/item lines here
const MUSIC_VOL=.42;   // music sits under engine surge, SFX and voice
const engPct=()=>{const e=+settings.engine;return Number.isFinite(e)?Math.max(0,Math.min(100,e)):7;};
export function applySettings(s){settings=s;if(pendingEng!=null){s.engine=pendingEng;pendingEng=null;persistEngine(s.engine);}syncSlider();if(!AC)return;
 sfxBus.gain.value=s.sound?1:0;voiceBus.gain.value=s.voice?1.1:0;musicBus.gain.value=s.sound?MUSIC_VOL:0;}  // music + engine follow the Sound toggle
async function loadClips(keys){const ogg=document.createElement('audio').canPlayType('audio/ogg; codecs=opus')!=='';
 await Promise.all(keys.map(async k=>{if(clips[k])return;for(const ext of ogg?['ogg','mp3']:['mp3']){try{const r=await fetch(`audio/${k}.${ext}`);if(!r.ok)continue;clips[k]=await AC.decodeAudioData(await r.arrayBuffer());return;}catch(e){}}}));}
export async function init(s){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
 master=AC.createGain();master.connect(AC.destination);sfxBus=AC.createGain();sfxBus.connect(master);voiceBus=AC.createGain();voiceBus.connect(master);
 musicBus=AC.createGain();musicBus.connect(master);musicF=AC.createBiquadFilter();musicF.type='lowpass';musicF.frequency.value=20000;musicF.Q.value=.5;musicP=AC.createGain();musicF.connect(musicP);musicP.connect(musicBus);
 musicDuck=AC.createGain();musicDuck.connect(musicF);engBus=AC.createGain();engBus.connect(sfxBus);applySettings(s||settings);
 prepMusic();await loadClips([...VOICE,...extra]);engineStart();if(mState==='none')music('title');}
export function suspend(on){if(!AC)return;on?AC.suspend?.():AC.resume?.();}
const lastSaid={};const PRIO=new Set(['three','two','one','go']);
export function say(k,minGap=0){if(!AC||!clips[k]||!settings.voice)return;const now=AC.currentTime;if(minGap&&lastSaid[k]&&now-lastSaid[k]<minGap)return;if(now<voiceBusy-.05&&!PRIO.has(k))return;
 lastSaid[k]=now;const s=AC.createBufferSource();s.buffer=clips[k];s.connect(voiceBus);s.start();const d=clips[k].duration;voiceBusy=now+d;
 // duck the music a little so the voice is easy to hear
 const g=musicDuck.gain;g.cancelScheduledValues(now);g.setTargetAtTime(.5,now,.04);g.setTargetAtTime(1,now+d,.25);}

// ---------- engine: barely there by default, a SURGE on boost / Rocket Star / power-up ----------
// Engine volume slider (settings.engine 0-100, default 7) scales everything here; 100 = the old M2 level.
let eng=null,noiseBuf=null;
function noise(){if(noiseBuf)return noiseBuf;const n=AC.sampleRate,b=AC.createBuffer(1,n,n),d=b.getChannelData(0);let s=777;for(let i=0;i<n;i++){s=(s*1103515245+12345)>>>0;d[i]=s/2147483648-1;}return noiseBuf=b;}
function engineStart(){const o=AC.createOscillator(),o2=AC.createOscillator(),f=AC.createBiquadFilter(),g=AC.createGain();o.type='sawtooth';o2.type='square';o2.detune.value=-1200;f.type='lowpass';f.frequency.value=600;g.gain.value=0;
 o.connect(f);o2.connect(f);f.connect(g);g.connect(engBus);o.start();o2.start();
 // surge layer: jet-like band-passed noise + a bright whine (Rocket Star)
 const n=AC.createBufferSource();n.buffer=noise();n.loop=true;const nf=AC.createBiquadFilter();nf.type='bandpass';nf.Q.value=1.2;nf.frequency.value=900;const sg=AC.createGain();sg.gain.value=0;
 const w=AC.createOscillator();w.type='triangle';w.frequency.value=700;const wg=AC.createGain();wg.gain.value=0;
 n.connect(nf);nf.connect(sg);sg.connect(engBus);w.connect(wg);wg.connect(engBus);n.start();w.start();
 eng={o,o2,f,g,nf,sg,w,wg,last:-1,k:''};}
// speed in m/s; on=false fades out; fx: {boost,rocket,item}
export function engine(sp,on,fx){
 if(!eng)return;const t=AC.currentTime;const rocket=!!(fx&&fx.rocket),boost=!!(fx&&fx.boost),item=!!(fx&&fx.item);
 const surge=on?(rocket?1.2:boost?1:item?.6:0):0,key=(on?1:0)+''+surge;
 // called every frame: only touch the audio params when something changed or every ~60 ms
 if(key===eng.k&&t-eng.last<.06)return;eng.k=key;eng.last=t;
 const e=engPct()/100,base=on?.035*e:0,sAmt=surge*Math.sqrt(e),pitch=1+surge*.22,f0=(55+sp*7)*pitch;
 eng.o.frequency.setTargetAtTime(f0,t,.08);eng.o2.frequency.setTargetAtTime(f0,t,.08);eng.f.frequency.setTargetAtTime(400+sp*40+surge*1400,t,.1);
 const up=surge>0?.05:.35;   // fast attack, gentle release
 eng.g.gain.setTargetAtTime(base+sAmt*.05,t,surge>0?.05:.15);
 eng.sg.gain.setTargetAtTime(sAmt*.11,t,up);eng.nf.frequency.setTargetAtTime(700+sp*28+(rocket?900:0),t,.1);
 eng.wg.gain.setTargetAtTime(rocket?sAmt*.025:0,t,up);eng.w.frequency.setTargetAtTime(500+sp*14,t,.1);}

// ---------- SFX (synth). Names: boing splash whoosh pickup shield rocket hop crate barrel fan bump spin ----------
function nz(t,dur,type,f0,f1,vol,q=1){const n=AC.createBufferSource();n.buffer=noise();const f=AC.createBiquadFilter(),g=AC.createGain();f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);if(f1!==f0)f.frequency.exponentialRampToValueAtTime(f1,t+dur);
 g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);n.connect(f);f.connect(g);g.connect(sfxBus);n.start(t,Math.random()*.15);n.stop(t+dur+.02);}
function tn(t,dur,type,f0,f1,vol,a=.005){const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+dur+.02);}
const SFX={
 boing:t=>tn(t,.3,'sine',380,120,.25),
 splash:t=>nz(t,.35,'bandpass',1800,1800,.3),
 whoosh:t=>nz(t,.5,'bandpass',400,3000,.18),
 pickup:t=>{[784,988,1319,1568].forEach((f,i)=>tn(t+i*.05,.18,'square',f,f,.07));},              // sparkly arpeggio
 shield:t=>{tn(t,.5,'sine',330,990,.14,.02);tn(t,.5,'triangle',495,1485,.08,.02);nz(t,.4,'highpass',5000,5000,.05);},
 rocket:t=>{nz(t,.8,'bandpass',300,4000,.22,.8);tn(t,.8,'sawtooth',110,660,.06,.05);},
 hop:t=>{tn(t,.45,'square',220,880,.08,.01);tn(t+.05,.4,'sine',440,1320,.1,.01);},
 crate:t=>{nz(t,.18,'lowpass',2500,400,.35);tn(t,.12,'square',180,90,.12);nz(t+.06,.12,'bandpass',1200,800,.15,2);},
 barrel:t=>{tn(t,.35,'sine',140,70,.3);tn(t,.25,'triangle',420,300,.08);nz(t,.1,'lowpass',1500,300,.15);},   // hollow "bonk"
 fan:t=>{for(let i=0;i<5;i++)nz(t+i*.07,.08,'bandpass',900,600,.09,1.5);},
 bump:t=>{tn(t,.2,'sine',200,90,.25);nz(t,.1,'lowpass',1200,300,.12);},
 spin:t=>{tn(t,.6,'triangle',900,250,.1,.01);tn(t,.6,'sine',1200,330,.06,.01);},                  // silly cartoon spin
};
export const SFX_NAMES=Object.keys(SFX);
export function sfx(type){if(!AC||!settings.sound)return;(SFX[type]||SFX.whoosh)(AC.currentTime);}

// ---------- music: 'title' | 'race' | 'final' | 'paused' | 'finish' | 'stop' ----------
let mState='none',loops={},cur=null,curName='',fanfare=null,pendingState=null,titleTimer=0;
async function prepMusic(){try{loops.title=await renderLoop({title:true,bars:8});if(pendingState)music(pendingState);
  loops.race=await renderLoop();fanfare=await renderFanfare();if(pendingState)music(pendingState);}catch(e){}}
function play(name,rate=1){if(!loops[name])return false;if(cur&&curName===name){cur.playbackRate.setTargetAtTime(rate,AC.currentTime,.4);return true;}
 stopCur(.25);const s=AC.createBufferSource(),g=AC.createGain();s.buffer=loops[name];s.loop=true;s.playbackRate.value=rate;g.gain.setValueAtTime(0,AC.currentTime);g.gain.linearRampToValueAtTime(1,AC.currentTime+.15);
 s.connect(g);g.connect(musicDuck);s.start();cur=s;cur._g=g;curName=name;return true;}
function stopCur(fade=.3){if(!cur)return;const t=AC.currentTime,s=cur;s._g.gain.cancelScheduledValues(t);s._g.gain.setValueAtTime(s._g.gain.value,t);s._g.gain.linearRampToValueAtTime(0,t+fade);try{s.stop(t+fade+.05);}catch(e){}cur=null;curName='';}
function tone(open){const t=AC.currentTime;musicF.frequency.cancelScheduledValues(t);musicF.frequency.setTargetAtTime(open?20000:700,t,.15);musicP.gain.setTargetAtTime(open?1:.5,t,.15);}
export function music(state){mState=state;if(!AC)return;clearTimeout(titleTimer);pendingState=null;
 if(state==='race'||state==='final'){tone(true);if(!play('race',state==='final'?1.06:1)){pendingState=state;play('title');}}   // final lap: a touch faster + brighter
 else if(state==='title'){tone(true);if(!play('title'))pendingState=state;}
 else if(state==='paused'){tone(false);}   // keep the loop, muffled and quieter
 else if(state==='finish'){stopCur(.4);tone(true);if(fanfare&&settings.sound){const s=AC.createBufferSource();s.buffer=fanfare;s.connect(musicDuck);s.start(AC.currentTime+.1);}
  titleTimer=setTimeout(()=>{if(mState==='finish')play('title');},2600);}
 else if(state==='stop')stopCur(.5);}
export const __music=()=>({state:mState,playing:curName,rate:cur?cur.playbackRate.value:0,ready:Object.keys(loops),fanfare:!!fanfare});

// ---------- Engine volume slider (index.html A:settings block) ----------
let pendingEng=null;
function persistEngine(v){try{const st=load();st.settings.engine=v;save(st);}catch(e){}}   // load-modify-save: only the engine field changes
const slider=document.getElementById('engVol'),pct=document.getElementById('engPct');
function syncSlider(){if(!slider)return;slider.value=engPct();slider.style.setProperty('--p',engPct()+'%');if(pct)pct.textContent=Math.round(engPct())+'%';}
if(slider){try{const e=load().settings.engine;if(Number.isFinite(e))settings.engine=e;}catch(_){}syncSlider();
 const set=()=>{const v=Math.round(+slider.value);settings.engine=v;if(!AC)pendingEng=v;syncSlider();if(eng)eng.k='';};
 slider.addEventListener('input',set);
 slider.addEventListener('change',()=>{set();persistEngine(settings.engine);if(AC&&eng&&settings.sound&&settings.engine>0)previewSurge();});
 for(const ev of['pointerdown','touchstart','keydown'])slider.addEventListener(ev,e=>e.stopPropagation(),{passive:true});}
// let the parent hear the new level: a short engine surge when the slider is released
let prevT=0;function previewSurge(){const t=AC.currentTime;if(t-prevT<.6)return;prevT=t;const e=engPct()/100,g=AC.createGain();g.gain.value=0;g.connect(engBus);
 const n=AC.createBufferSource();n.buffer=noise();const f=AC.createBiquadFilter();f.type='bandpass';f.Q.value=1.2;f.frequency.setValueAtTime(600,t);f.frequency.exponentialRampToValueAtTime(2200,t+.5);
 const o=AC.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(260,t+.5);const of=AC.createBiquadFilter();of.type='lowpass';of.frequency.value=1600;
 n.connect(f);f.connect(g);o.connect(of);of.connect(g);g.gain.linearRampToValueAtTime(Math.sqrt(e)*.1,t+.08);g.gain.setTargetAtTime(0,t+.45,.12);n.start(t);n.stop(t+1);o.start(t);o.stop(t+1);}
