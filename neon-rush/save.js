// Neon Rush save (localStorage). Versioned, additive, write-then-verify, backup key, corrupt data kept in .bad.
// M5b additive: TRACK_IDS gains 'beach' (track/unlocked/best.beach follow the existing per-track rules).
// M5 additive fields: kart.emblem (0 none,1-8) + kart.emblemColor (0-7), kart.marker (0-7) + kart.markerColor (0-8, 8 = rainbow) + kart.markerFx (0-2); all clampInt, default 0.
// M6: settings.difficulty also accepts 'extreme'.
// M6B additive: settings.trackDifficulty {<trackId>: 'easy'|'medium'|'hard'|'extreme'} (per-track level chips). Missing/invalid entries are dropped, so the track falls back to settings.difficulty.
// M5 additive field: settings.difficulty ('easy'|'medium'|'hard', default 'easy'; unknown -> 'easy').
// M4 additive fields: track, unlocked{sky,harbor,skyway}, best.<trackId> (seconds), kart{body,paint,finish,wheels,trail,decal}.
export const KEY='neon-rush.v1',BAK='neon-rush.v1.bak',BAD='neon-rush.v1.bad';
export const DIFFS=['easy','medium','hard','extreme'];   // M6: 'extreme' added (unknown -> 'easy')
export const TRACK_IDS=['sky','harbor','skyway','beach'];   // M5b: 'beach' added (all tracks open)
export const KART_N={body:4,paint:10,finish:3,wheels:4,trail:5,decal:5,emblem:9,emblemColor:8,marker:8,markerColor:9,markerFx:3};   // option counts per garage tab (index 0 = the original look)
export const KART_DEFAULT=()=>({body:0,paint:0,finish:0,wheels:0,trail:0,decal:0,emblem:0,emblemColor:0,marker:0,markerColor:0,markerFx:0});
export const DEFAULTS=()=>({v:1,settings:{sound:true,voice:true,quality:'auto',fps:false,engine:7,difficulty:'easy',trackDifficulty:{}},best:{lapMs:0,raceMs:0},races:0,wins:0,
 track:'sky',unlocked:{sky:true,harbor:true,skyway:true,beach:true},kart:KART_DEFAULT()});
// numbers may arrive as numeric strings from old/hand-edited saves: coerce, never throw
const num=v=>typeof v==='number'?v:typeof v==='string'&&v.trim()!==''?Number(v):NaN;
const clampInt=(v,lo,hi,d)=>{const n=num(v);return Number.isFinite(n)?Math.max(lo,Math.min(hi,Math.round(n))):d;};
const bool=(v,d)=>typeof v==='boolean'?v:v==='true'?true:v==='false'?false:d;
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
 return out;}   // unknown fields are kept untouched
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
 const b=read(BAK);if(b&&!b.bad&&b.obj)return sane(b.obj);return DEFAULTS();}
export function save(state){if(RO)return false;try{const s=JSON.stringify(sane(state));const prev=localStorage.getItem(KEY);
  localStorage.setItem(KEY,s);if(localStorage.getItem(KEY)!==s)throw new Error('verify');
  if(prev!=null){try{JSON.parse(prev);localStorage.setItem(BAK,prev);}catch(e){}}return true;}catch(e){return false;}}
