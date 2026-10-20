// Neon Rush music (Track A, M3). ORIGINAL composition "Neon Sprint", synthesized in code: no files, no network.
// Each loop is rendered once in an OfflineAudioContext (off the main thread), then played as a seamless looping buffer.
// 160 BPM bright synth/chiptune-pop in C major: 4-on-the-floor kick, clap, hats, octave bass, square arp, pulse lead.
export const BPM=160;
const SPB=60/BPM,BAR=SPB*4,S16=SPB/4,SR=32000;   // the sky loop's timing; harbor / skyway pass their own (see VARIANTS)
const timing=bpm=>({SPB:60/bpm,BAR:60/bpm*4,S16:60/bpm/4});

// chords: bass root (MIDI) + pad triad
const CH={E:[40,[64,68,71]],F:[41,[65,69,72]],G:[43,[67,71,74]],Em:[40,[64,67,71]],Am:[45,[64,69,72]],C:[36,[64,67,72]],Dm:[38,[62,65,69]]};
const PROG=['F','G','Em','Am','F','G','C','C', 'Am','F','C','G','Am','F','G','G', 'F','G','Em','Am','F','G','C','C', 'Dm','G','C','Am','Dm','G','C','G'];
// lead melody: 8 eighth-notes per bar; number = MIDI note, '-' = hold, 0 = rest
const _='-';
const MEL=[
 [81,_,79,77,_,72,77,79],[83,_,81,79,_,74,79,81],[83,_,84,83,_,79,76,79],[81,_,_,76,79,81,84,_],
 [81,_,79,77,_,72,77,79],[83,_,81,79,_,86,_,84],[84,_,79,76,79,84,_,86],[88,_,_,_,84,_,0,0],
 [76,76,0,81,_,79,76,_],[77,77,0,81,_,84,81,_],[79,79,0,84,_,83,84,_],[86,_,83,_,79,_,74,_],
 [76,76,0,81,_,79,76,_],[77,77,0,81,_,84,86,_],[88,_,86,_,84,_,83,_],[86,_,_,_,79,81,83,86],
 [81,_,79,77,_,72,77,79],[83,_,81,79,_,74,79,81],[83,_,84,83,_,79,76,79],[81,_,_,76,79,81,84,_],
 [81,_,79,77,_,72,77,79],[83,_,81,79,_,86,_,84],[84,_,79,76,79,84,_,86],[88,_,_,_,91,_,0,0],
 [77,_,74,77,81,_,77,_],[79,_,83,_,86,_,83,79],[84,_,79,_,76,_,79,84],[81,_,_,_,0,76,79,81],
 [77,_,74,77,81,_,84,_],[83,_,86,_,83,79,74,79],[84,_,_,_,88,_,84,_],[86,_,83,_,79,_,74,0]];
const hz=m=>440*Math.pow(2,(m-69)/12);

// ---- per-track variants (M4): same engine, own tempo / chords / lead. Melodies are generated deterministically from the chord tones. ----
const SCALES={candy:[67,69,72,74,76,79,81,84,86,88],harbor:[60,62,64,67,69,72,74,76,79,81,84],skyway:[57,60,62,64,67,69,72,74,76,79,81,84],beach:[64,67,69,72,74,76,79,81,84,86]};   // C major pentatonic / A minor pentatonic
function genMel(prog,scale,pat,seed){let x=seed;const rnd=()=>((x=(x*1664525+1013904223)>>>0)/4294967296);let i=Math.floor(scale.length*.55);
 return prog.map((c,b)=>{const tri=CH[c][1];return pat.map((p,e)=>{if(p===0)return 0;if(p===2)return _;
  if(e===0||p===3){let best=0,bd=99;scale.forEach((m,k)=>{const d=Math.min(...tri.map(t=>Math.abs(((m-t)%12+12)%12)));const dd=d*3+Math.abs(k-i);if(dd<bd){bd=dd;best=k;}});i=best;}
  else{i=Math.max(0,Math.min(scale.length-1,i+(rnd()<.5?-1:1)*(rnd()<.35?2:1)));if(b%8===7&&e>5)i=Math.min(scale.length-1,i+1);}
  return scale[i];});});}
const HP='C G Am F C G F F Am F C G Am F G G C G Am F C G F C Dm G C Am F G C C'.split(' ');
const SP='Am F C G Am F G E Am F C G Dm Am G E Am F C G Am F G E F G Am Am F G E Am'.split(' ');
const BP='C F G C Am F G G C F G Am Dm G C C F G Em Am F C Dm G C F G Am F G C C'.split(' ');
const CP='F C Dm Am F C G G Dm Am F C Em Am F G F C Dm Am F G C C Am Em F C Dm G C C'.split(' ');   // M7 candy: sweet music-box loop, bright pentatonic bells
const VARIANTS={
 sky:{t:timing(BPM),prog:PROG,mel:MEL,style:'sky',duty:.25},
 harbor:{t:timing(156),prog:HP,mel:genMel(HP,SCALES.harbor,[3,2,1,0,1,1,3,1],7),style:'beach',duty:.5},   // beachy: lighter kick, shaker hats, soft triangle lead with vibrato
 beach:{t:timing(144),prog:BP,mel:genMel(BP,SCALES.beach,[3,1,2,1,3,1,1,0],5),style:'beach',duty:.5},   // M5b Sunny Shores: relaxed boardwalk shuffle, brighter high-register pentatonic lead
 candy:{t:timing(150),prog:CP,mel:genMel(CP,SCALES.candy,[3,1,2,1,3,2,1,1],33),style:'sky',duty:.25},   // M7 Candy Crystal Peaks remix: bouncy sky groove, high bell-like lead
 skyway:{t:timing(168),prog:SP,mel:genMel(SP,SCALES.skyway,[3,1,1,1,3,1,1,1],21),style:'arcade',duty:.125},   // arcade: thin pulse lead, 16th bass
};
export const TRACKS=Object.keys(VARIANTS);

// tiny deterministic drum samples (seeded noise), shared by every render
let DR=null;
function drums(){if(DR)return DR;let seed=12345;const rnd=()=>((seed=(seed*1103515245+12345)>>>0)/4294967296)*2-1;
 const mk=(sec,fn)=>{const n=Math.round(SR*sec),a=new Float32Array(n);for(let i=0;i<n;i++)a[i]=fn(i/SR,i);return a;};
 let ph=0;const kick=mk(.32,t=>{const f=52+190*Math.exp(-t*30);ph+=2*Math.PI*f/SR;return Math.sin(ph)*Math.exp(-t*9)*(t<.003?t/.003:1)+rnd()*.15*Math.exp(-t*120);});
 let lp=0;const clap=mk(.24,t=>{const env=t<.03?(Math.exp(-((t%.01))*300)):Math.exp(-(t-.03)*22);const x=rnd();lp+=(x-lp)*.55;return (x-lp)*env*.9+Math.sin(t*2*Math.PI*190)*Math.exp(-t*40)*.3;});
 let hp=0,hx=0;const hat=mk(.06,t=>{const x=rnd();hp=.6*(hp+x-hx);hx=x;return hp*Math.exp(-t*70)*.6;});
 let cp=0,cx=0;const crash=mk(1.4,t=>{const x=rnd();cp=.7*(cp+x-cx);cx=x;return cp*Math.exp(-t*3.2)*.35;});
 return DR={kick,clap,hat,crash};}

// Rendered in 2-bar chunks (each its own small OfflineAudioContext): render cost grows with nodes x length, so chunks are ~8x faster.
const CHUNK=2,TAIL=1;
async function renderChunk(OC,b0,b1,title,V){
 const {SPB,BAR,S16}=V.t,sty=V.style;const PROG=V.prog,MEL=V.mel;
 const ac=new OC(2,Math.ceil((b1-b0+TAIL)*BAR*SR),SR),d=drums();
 const buf=a=>{const b=ac.createBuffer(1,a.length,SR);b.copyToChannel?b.copyToChannel(a,0):b.getChannelData(0).set(a);return b;};
 const B={kick:buf(d.kick),clap:buf(d.clap),hat:buf(d.hat),crash:buf(d.crash)};
 const mix=ac.createGain();mix.gain.value=.8;mix.connect(ac.destination);
 const pan=(v)=>{const p=ac.createStereoPanner?ac.createStereoPanner():null;if(p){p.pan.value=v;p.connect(mix);return p;}return mix;};
 const drumBus=ac.createGain();drumBus.gain.value=title?.55:1;drumBus.connect(mix);
 const hatBus=ac.createGain();hatBus.gain.value=title?.6:.9;hatBus.connect(pan(.25));
 // sidechain-style pump on pad/bass (ducks on every kick) - the "energetic" bounce
 const pumpBus=ac.createGain();pumpBus.gain.value=0;pumpBus.connect(mix);
 {const n=Math.round(SPB*SR),a=new Float32Array(n);for(let i=0;i<n;i++)a[i]=1-.65*Math.exp(-i/SR/.07)*(i<SR*.01?i/(SR*.01):1);   // one-beat duck curve, looped as an audio-rate gain signal
  const pb=ac.createBufferSource();pb.buffer=buf(a);pb.loop=true;pb.connect(pumpBus.gain);pb.start(0);}
 const padBus=ac.createGain();padBus.gain.value=title?.18:.14;const padF=ac.createBiquadFilter();padF.type='lowpass';padF.frequency.value=title?1800:2600;padBus.connect(padF);padF.connect(pumpBus);
 const bassBus=ac.createGain();bassBus.gain.value=title?.18:.26;bassBus.connect(pumpBus);
 const arpBus=ac.createGain();arpBus.gain.value=title?.08:.09;
 const arpL=pan(-.35),arpR=pan(.35);
 // lead with a dotted-eighth echo
 const leadBus=ac.createGain();leadBus.gain.value=.3;leadBus.connect(pan(0));
 const dly=ac.createDelay(1);dly.delayTime.value=SPB*.75;const fb=ac.createGain();fb.gain.value=.28;const wet=ac.createGain();wet.gain.value=.3;
 leadBus.connect(dly);dly.connect(fb);fb.connect(dly);dly.connect(wet);wet.connect(pan(-.2));
 // pulse wave (25%) for the chiptune lead
 const N=24,re=new Float32Array(N),im=new Float32Array(N);for(let k=1;k<N;k++)im[k]=2/(k*Math.PI)*Math.sin(k*Math.PI*(V.duty||.25));const pulse=ac.createPeriodicWave(re,im);
 const hit=(b,t,g,bus)=>{const s=ac.createBufferSource();s.buffer=b;if(g!==1){const gg=ac.createGain();gg.gain.value=g;s.connect(gg);gg.connect(bus);}else s.connect(bus);s.start(t);};
 const tone=(type,f,t,dur,vol,bus,a=.005,rel=.05,det=0)=>{const o=ac.createOscillator(),g=ac.createGain();if(type==='pulse')o.setPeriodicWave(pulse);else o.type=type;o.frequency.value=f;if(det)o.detune.value=det;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.setTargetAtTime(vol*.6,t+a,dur*.5);g.gain.setValueAtTime(vol*.6,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+rel);
  o.connect(g);g.connect(bus);o.start(t);o.stop(t+dur+rel+.01);return o;};
 for(let b=b0;b<b1;b++){
  const t0=(b-b0)*BAR,[root,tri]=CH[PROG[b]],sec=Math.floor(b/8),last=b%8===7;
  // drums
  if(b%8===0&&!title)hit(B.crash,t0,1,drumBus);
  for(let q=0;q<4;q++){const t=t0+q*SPB;if(sty==='beach'&&!title){if(q%2===0)hit(B.kick,t,.4,drumBus);if(q===1)hit(B.kick,t+SPB*.5,.3,drumBus);}else if(!title||q%2===0)hit(B.kick,t,.42,drumBus);if(q%2===1&&!(title&&q===1))hit(B.clap,t,.8,drumBus);}
  for(let s=0;s<16;s++){const t=t0+s*S16;const off=s%4===2,busy=!title&&(sec===1||sec===3);if(off)hit(B.hat,t,1,hatBus);else if(s%2===0)hit(B.hat,t,.45,hatBus);else if(busy)hit(B.hat,t,.3,hatBus);}
  if(last&&!title){for(let s=8;s<16;s++)hit(B.clap,t0+s*S16,.25+.06*(s-8),drumBus);}   // build-up fill
  // octave bass: 8ths, root / root+12
  if(sty==='arcade'&&!title){for(let e=0;e<16;e++){const t=t0+e*S16,m=root+12+(e%4===2?12:0)+(e%8===6?7:0);tone('square',hz(m),t,S16*.7,.42,bassBus,.002,.02);}}
  else for(let e=0;e<8;e++){const t=t0+e*SPB/2,m=root+12+(e%2?12:0);tone('sawtooth',hz(m),t,SPB/2*.7,.5,bassBus,.004,.03);tone('square',hz(m),t,SPB/2*.6,.18,bassBus,.004,.03,-5);}
  // pad: two detuned saws per chord note, whole bar
  for(const m of tri){tone('sawtooth',hz(m),t0,BAR*.92,.33,padBus,.03,.12,-7);tone('sawtooth',hz(m),t0,BAR*.92,.33,padBus,.03,.12,7);}
  // arp: 16ths, up-down through the chord (+octave)
  const ar=[tri[0]+12,tri[1]+12,tri[2]+12,tri[1]+12+12,tri[2]+12,tri[1]+12,tri[0]+12,tri[1]+12];
  for(let s=0;s<16;s++){if(title&&s%2)continue;tone('square',hz(ar[s%8]),t0+s*S16,S16*.55,.6,arpBus,.002,.02);}
  // lead
  if(!title){const mel=MEL[b];for(let e=0;e<8;e++){const m=mel[e];if(!m||m===_)continue;let n=1;while(e+n<8&&mel[e+n]===_)n++;
   const t=t0+e*SPB/2,dur=n*SPB/2*.9,o=tone(sty==='beach'?'triangle':'pulse',hz(m),t,dur,sty==='beach'?.8:.55,leadBus,.006,.06);
   if(n>=3){const lfo=ac.createOscillator(),lg=ac.createGain();lfo.frequency.value=6;lg.gain.value=0;lg.gain.setValueAtTime(0,t+.15);lg.gain.linearRampToValueAtTime(9,t+dur);lfo.connect(lg);lg.connect(o.detune);lfo.start(t);lfo.stop(t+dur+.1);}
   if(sec>=2)tone('square',hz(m-12),t,dur,.25,leadBus,.006,.06);}}   // 2nd half: octave double = more energy
 }
 arpBus.connect(arpL);const arp2=ac.createDelay(.5);arp2.delayTime.value=S16*.5;arpBus.connect(arp2);arp2.connect(arpR);
 return ac.startRendering();}
// render one loop. opts.title = lighter version (no lead, softer drums), opts.bars = number of bars of PROG to use
export async function renderLoop(opts={}){
 const OC=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!OC)return null;
 const V=VARIANTS[opts.track]||VARIANTS.sky,{BAR}=V.t,bars=opts.bars||V.prog.length,title=!!opts.title,L=Math.round(bars*BAR*SR),out=new OC(2,1,SR).createBuffer(2,L,SR),o=[out.getChannelData(0),out.getChannelData(1)];
 for(let b0=0;b0<bars;b0+=CHUNK){const r=await renderChunk(OC,b0,Math.min(bars,b0+CHUNK),title,V),off=Math.round(b0*BAR*SR);
  // sum into the loop; anything past the loop end (echo, releases) wraps to the start -> perfectly seamless loop
  for(let c=0;c<2;c++){const src=r.getChannelData(c),dst=o[c];for(let i=0,n=src.length;i<n;i++)dst[(off+i)%L]+=src[i];}}
 let pk=0;for(const ch of o)for(let i=0;i<L;i++){const a=Math.abs(ch[i]);if(a>pk)pk=a;}
 if(pk>0){const g=Math.min(1.8,.88/pk);for(const ch of o)for(let i=0;i<L;i++)ch[i]*=g;}   // same loudness for every loop
 return out;}

// short winner fanfare (rendered, 2 s)
export async function renderFanfare(){
 const OC=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!OC)return null;
 const ac=new OC(2,Math.ceil(2.4*SR),SR),g=ac.createGain();g.gain.value=.22;g.connect(ac.destination);
 const n=(m,t,d,v=1)=>{for(const [type,det] of [['square',0],['sawtooth',8]]){const o=ac.createOscillator(),e=ac.createGain();o.type=type;o.detune.value=det;o.frequency.value=hz(m);
  e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(.5*v,t+.01);e.gain.setTargetAtTime(.25*v,t+.02,d*.4);e.gain.setTargetAtTime(0,t+d,.08);o.connect(e);e.connect(g);o.start(t);o.stop(t+d+.5);}};
 const s=SPB/2;[72,76,79,84].forEach((m,i)=>n(m,i*s*.5,s*.5));n(81,4*s*.5,s*.5);n(84,5*s*.5,s);[72,76,79,84,88].forEach(m=>n(m,7*s*.5,1.2,.55));n(48,7*s*.5,1.2,.7);
 return ac.startRendering();}
