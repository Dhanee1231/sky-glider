// Neon Rush save (localStorage). Versioned, additive, write-then-verify, backup key, corrupt data kept in .bad.
// M5b additive: TRACK_IDS gains 'beach' (track/unlocked/best.beach follow the existing per-track rules).
// M5 additive fields: kart.emblem (0 none,1-8) + kart.emblemColor (0-7), kart.marker (0-7) + kart.markerColor (0-8, 8 = rainbow) + kart.markerFx (0-2); all clampInt, default 0.
// M6: settings.difficulty also accepts 'extreme'.
// M6B additive: settings.trackDifficulty {<trackId>: 'easy'|'medium'|'hard'|'extreme'} (per-track level chips). Missing/invalid entries are dropped, so the track falls back to settings.difficulty.
// M5 additive field: settings.difficulty ('easy'|'medium'|'hard', default 'easy'; unknown -> 'easy').
// M4 additive fields: track, unlocked{sky,harbor,skyway}, best.<trackId> (seconds), kart{body,paint,finish,wheels,trail,decal}.
// M7 additive only: TRACK_IDS 'candy' (best candy_b / candy_b4), cups 0-3 keep-max, cupRun|null, beat (monotonic), trackDone, own, seen, kart.racer 0-10, KART_N.body 8.
//   The untouched pre-M7 save is copied once to neon-rush.v1.bak.m6 before the first M7 write. Unknown values are dropped, never thrown.
export const KEY='neon-rush.v1',BAK='neon-rush.v1.bak',BAD='neon-rush.v1.bad',BAK_M6='neon-rush.v1.bak.m6';
export const DIFFS=['easy','medium','hard','extreme'];   // M6: 'extreme' added (unknown -> 'easy')
export const TRACK_IDS=['sky','harbor','skyway','beach'];   // M5b: 'beach' added (all tracks open)
if(!TRACK_IDS.includes('candy'))TRACK_IDS.push('candy');   // M7: Candy Crystal Peaks. Own line so a parallel track id merges; skipped when already present.
export const FRIENDS=['Pip','Mochi','Bolt','Kiki','Coco','Shelly'];
export const RACERS=['You','Pip','Mochi','Bolt','Kiki','Coco','Shelly','Sprinkle','Ember','Pebble','Twinkle'];   // kart.racer index 0-10
export const OWN_RACERS=['Pip','Mochi','Bolt','Kiki','Coco','Shelly','Sprinkle','Ember','Pebble','Twinkle'];
export const OWN_KARTS=['Candy Cruiser','Heart Racer','Star Comet','Dragon Jet'];
export const CUPS=['star','heart','rainbow'];
const cupBlank=()=>({easy:0,medium:0,hard:0,extreme:0});
const beatBlank=()=>({Pip:false,Mochi:false,Bolt:false,Kiki:false,Coco:false,Shelly:false});
export const KART_N={body:8,paint:10,finish:3,wheels:4,trail:5,decal:5,emblem:9,emblemColor:8,marker:8,markerColor:9,markerFx:3,racer:11};   // M7: body 4->8, racer 0-10 (index, default 0)
export const KART_DEFAULT=()=>({body:0,paint:0,finish:0,wheels:0,trail:0,decal:0,emblem:0,emblemColor:0,marker:0,markerColor:0,markerFx:0,racer:0});
export const DEFAULTS=()=>({v:1,settings:{sound:true,voice:true,quality:'auto',fps:false,engine:7,difficulty:'easy',trackDifficulty:{}},best:{lapMs:0,raceMs:0},races:0,wins:0,
 track:'sky',unlocked:{sky:true,harbor:true,skyway:true,beach:true,candy:true},kart:KART_DEFAULT(),
 cups:{star:cupBlank(),heart:cupBlank(),rainbow:cupBlank()},cupRun:null,beat:beatBlank(),trackDone:{},own:{racers:[],karts:[]},seen:{}});
// numbers may arrive as numeric strings from old/hand-edited saves: coerce, never throw
const num=v=>typeof v==='number'?v:typeof v==='string'&&v.trim()!==''?Number(v):NaN;
const clampInt=(v,lo,hi,d)=>{const n=num(v);return Number.isFinite(n)?Math.max(lo,Math.min(hi,Math.round(n))):d;};
const bool=(v,d)=>typeof v==='boolean'?v:v==='true'?true:v==='false'?false:d;
const asObj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:null;
// A save that already carries the M7 containers is not migrated again (wins must not re-open every friend).
const alreadyM7=o=>!!(asObj(o)&&asObj(o.cups)&&asObj(o.own)&&asObj(o.beat)&&asObj(o.trackDone)&&asObj(o.seen));
function saneCups(v){const out={star:cupBlank(),heart:cupBlank(),rainbow:cupBlank()};const o=asObj(v);if(!o)return out;
 for(const c of CUPS){const s=asObj(o[c]);if(!s)continue;for(const d of DIFFS){const n=num(s[d]);if(Number.isInteger(n))out[c][d]=Math.max(0,Math.min(3,n));}}
 return out;}
function saneCupRun(v){if(v==null)return null;const o=asObj(v);if(!o||!CUPS.includes(o.cup)||!DIFFS.includes(o.level))return null;
 const race=num(o.race);if(!Number.isInteger(race)||race<0||race>2)return null;const pts={},p=asObj(o.pts)||{};
 for(const name of Object.keys(p)){if(!/^[A-Za-z][A-Za-z0-9]{0,15}$/.test(name))continue;const n=num(p[name]);if(Number.isInteger(n)&&n>=0&&n<=9999)pts[name]=n;}
 return {cup:o.cup,level:o.level,race,pts};}
function saneBeat(v,forceAll){const out=beatBlank();const o=asObj(v)||{};
 for(const n of FRIENDS)if(o[n]===true||o[n]==='true')out[n]=true;   // monotonic: a stored true stays true; false never overwrites it
 if(forceAll)for(const n of FRIENDS)out[n]=true;
 return out;}
function saneTrackDone(v){const out={},o=asObj(v);if(!o)return out;
 for(const k of Object.keys(o)){if(!/^[a-z0-9_-]{1,24}$/.test(k))continue;const n=num(o[k]);if(Number.isInteger(n)&&n>=0&&n<1e7)out[k]=n;}
 return out;}
function pickList(v,allow){const have=new Set();if(Array.isArray(v))for(const x of v)if(typeof x==='string'&&allow.includes(x))have.add(x);return allow.filter(n=>have.has(n));}
function saneOwn(v,migrate){const o=asObj(v)||{};const racers=pickList(o.racers,OWN_RACERS),karts=pickList(o.karts,OWN_KARTS);
 if(migrate&&migrate.wins>=1)for(const n of FRIENDS)if(!racers.includes(n))racers.push(n);
 if(migrate&&migrate.races>=20&&!racers.includes('Pebble'))racers.push('Pebble');
 if(migrate&&migrate.wins>=5&&!karts.includes('Heart Racer'))karts.push('Heart Racer');
 return {racers:OWN_RACERS.filter(n=>racers.includes(n)),karts:OWN_KARTS.filter(n=>karts.includes(n))};}
function saneSeen(v){const out={},o=asObj(v);if(!o)return out;
 for(const k of Object.keys(o)){if(!/^[a-z]+:[A-Za-z][A-Za-z ]{0,32}$/.test(k))continue;if(o[k]===true)out[k]=true;}
 return out;}
function preM7(raw){try{const o=JSON.parse(raw);return !asObj(o)||!asObj(o.cups);}catch(e){return true;}}
export function sane(o){const d=DEFAULTS();if(!o||typeof o!=='object'||Array.isArray(o))return d;const out=Object.assign({},o);out.v=1;
 const s=o.settings&&typeof o.settings==='object'&&!Array.isArray(o.settings)?o.settings:{};
 out.settings=Object.assign({},d.settings,s);
 for(const k of['sound','voice','fps'])out.settings[k]=bool(out.settings[k],d.settings[k]);
 if(!['auto','high','low'].includes(out.settings.quality))out.settings.quality='auto';
 if(!DIFFS.includes(out.settings.difficulty))out.settings.difficulty='easy';
 {const td=s.trackDifficulty&&typeof s.trackDifficulty==='object'&&!Array.isArray(s.trackDifficulty)?s.trackDifficulty:{},t2={};
  for(const k of Object.keys(td))if(/^[a-z0-9_-]{1,24}$/.test(k)&&DIFFS.includes(td[k]))t2[k]=td[k];out.settings.trackDifficulty=t2;}   // M6B: unknown track ids are kept (a newer build), invalid levels dropped
 {const e=num(out.settings.engine);out.settings.engine=Number.isFinite(e)?Math.max(0,Math.min(100,e)):d.settings.engine;}   // engine volume %, default 7 (M3 fix: "50" -> 50, 150 -> 100)
 const b=o.best&&typeof o.best==='object'&&!Array.isArray(o.best)?o.best:{};out.best=Object.assign({},d.best,b);
 for(const k of['lapMs','raceMs']){const n=num(out.best[k]);out.best[k]=Number.isFinite(n)&&n>=0?n:0;}
 for(const k of Object.keys(out.best)){if(k==='lapMs'||k==='raceMs')continue;const n=num(out.best[k]);   // per-track best, seconds
  if(/^[a-z0-9_-]{1,24}$/.test(k)&&Number.isFinite(n)&&n>0&&n<36000)out.best[k]=n;else delete out.best[k];}
 for(const k of['races','wins']){const n=num(out[k]);out[k]=Number.isInteger(n)&&n>=0?n:0;}
 out.track=TRACK_IDS.includes(out.track)?out.track:d.track;
 out.unlocked=Object.assign({},o.unlocked&&typeof o.unlocked==='object'&&!Array.isArray(o.unlocked)?o.unlocked:{});for(const id of TRACK_IDS)out.unlocked[id]=true;   // all tracks are open
 const k=o.kart&&typeof o.kart==='object'&&!Array.isArray(o.kart)?o.kart:{};out.kart=Object.assign({},k);
 for(const f of Object.keys(KART_N))out.kart[f]=clampInt(k[f],0,KART_N[f]-1,0);
 const mig=alreadyM7(o)?null:{wins:out.wins,races:out.races};   // M7: migrate a pre-M7 save once; never wipe a save that already has the new fields
 out.cups=saneCups(o.cups);out.cupRun=saneCupRun(o.cupRun);out.beat=saneBeat(o.beat,!!(mig&&mig.wins>=1));
 out.trackDone=saneTrackDone(o.trackDone);out.own=saneOwn(o.own,mig);out.seen=saneSeen(o.seen);
 return out;}   // unknown fields are kept untouched
// trophy 0-3, keep the higher one already stored (a worse finish never downgrades)
export function keepCup(st,cup,level,score){if(!st||!st.cups||!CUPS.includes(cup)||!DIFFS.includes(level))return false;const n=num(score);if(!Number.isInteger(n))return false;
 const t=Math.max(0,Math.min(3,n));if(t>(st.cups[cup][level]||0))st.cups[cup][level]=t;return true;}
// beat flags only ever turn on
export function markBeat(st,name){if(!st||!st.beat||!FRIENDS.includes(name))return false;st.beat[name]=true;return true;}
// level for a track: its own chip if set, else the default level from Settings
export function getTrackDiff(st,id){const td=st&&st.settings&&st.settings.trackDifficulty;const d=td&&typeof td==='object'?td[id]:null;return DIFFS.includes(d)?d:(st&&st.settings&&DIFFS.includes(st.settings.difficulty)?st.settings.difficulty:'easy');}
export function setTrackDiff(st,id,d){if(!st||!st.settings||!DIFFS.includes(d)||!/^[a-z0-9_-]{1,24}$/.test(String(id)))return false;
 const td=st.settings.trackDifficulty&&typeof st.settings.trackDifficulty==='object'?st.settings.trackDifficulty:(st.settings.trackDifficulty={});td[id]=d;return true;}
// best time for a track in seconds (0 = none yet). M6B: tracks are ~45% longer, so bests live under new keys (<id>_b = 3 laps, <id>_b4 = Extreme 4 laps);
// the old per-track keys (and Sky Glider-era best.raceMs) are left untouched in the save, they just are not compared with the longer races.
const bkey=(id,laps)=>String(id)+(laps===4?'_b4':'_b');
export function getBest(st,id,laps=3){const v=st&&st.best?num(st.best[bkey(id,laps)]):NaN;return Number.isFinite(v)&&v>0?v:0;}
// record a finish time; returns true when it beats the old best (first finish counts)
export function setBest(st,id,secs,laps=3){const t=num(secs);if(!st||!(t>0&&t<36000)||!/^[a-z0-9_-]{1,21}$/.test(String(id)))return false;
 st.best=st.best||{};const old=getBest(st,id,laps);if(old>0&&t>=old)return false;st.best[bkey(id,laps)]=Math.round(t*1000)/1000;return true;}
function read(k){try{const s=localStorage.getItem(k);if(s==null)return null;return {raw:s,obj:JSON.parse(s)};}catch(e){return {raw:(()=>{try{return localStorage.getItem(k)}catch(_){return null}})(),bad:true};}}
// M5a fix: a save from a newer version (v>1) is loaded into memory but this session never writes, trims or backs it up.
let RO=false;export const isReadOnly=()=>RO;
export function load(){RO=false;const a=read(KEY);if(a&&!a.bad&&a.obj&&typeof a.obj==='object'&&!Array.isArray(a.obj)){const v=num(a.obj.v);if(Number.isFinite(v)&&v>1)RO=true;return sane(a.obj);}
 if(a&&a.raw!=null){try{localStorage.setItem(BAD,a.raw);}catch(e){}}
 const b=read(BAK);if(b&&!b.bad&&b.obj)return sane(b.obj);return sane(DEFAULTS());}
export function save(state){if(RO)return false;try{const s=JSON.stringify(sane(state));const prev=localStorage.getItem(KEY);
  if(prev!=null&&localStorage.getItem(BAK_M6)==null&&preM7(prev)){localStorage.setItem(BAK_M6,prev);if(localStorage.getItem(BAK_M6)!==prev)throw new Error('bak-m6');}   // untouched pre-M7 bytes, before the M7 write, once
  localStorage.setItem(KEY,s);if(localStorage.getItem(KEY)!==s)throw new Error('verify');
  if(prev!=null){try{JSON.parse(prev);localStorage.setItem(BAK,prev);}catch(e){}}return true;}catch(e){return false;}}
