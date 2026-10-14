// Neon Rush save (localStorage). Versioned, additive, write-then-verify, backup key, corrupt data kept in .bad.
// M4 additive fields: track, unlocked{sky,harbor,skyway}, best.<trackId> (seconds), kart{body,paint,finish,wheels,trail,decal}.
export const KEY='neon-rush.v1',BAK='neon-rush.v1.bak',BAD='neon-rush.v1.bad';
export const TRACK_IDS=['sky','harbor','skyway'];
export const KART_N={body:4,paint:10,finish:3,wheels:4,trail:5,decal:5};   // option counts per garage tab (index 0 = the original look)
export const KART_DEFAULT=()=>({body:0,paint:0,finish:0,wheels:0,trail:0,decal:0});
export const DEFAULTS=()=>({v:1,settings:{sound:true,voice:true,quality:'auto',fps:false,engine:7},best:{lapMs:0,raceMs:0},races:0,wins:0,
 track:'sky',unlocked:{sky:true,harbor:true,skyway:true},kart:KART_DEFAULT()});
// numbers may arrive as numeric strings from old/hand-edited saves: coerce, never throw
const num=v=>typeof v==='number'?v:typeof v==='string'&&v.trim()!==''?Number(v):NaN;
const clampInt=(v,lo,hi,d)=>{const n=num(v);return Number.isFinite(n)?Math.max(lo,Math.min(hi,Math.round(n))):d;};
const bool=(v,d)=>typeof v==='boolean'?v:v==='true'?true:v==='false'?false:d;
export function sane(o){const d=DEFAULTS();if(!o||typeof o!=='object'||Array.isArray(o))return d;const out=Object.assign({},o);out.v=1;
 const s=o.settings&&typeof o.settings==='object'&&!Array.isArray(o.settings)?o.settings:{};
 out.settings=Object.assign({},d.settings,s);
 for(const k of['sound','voice','fps'])out.settings[k]=bool(out.settings[k],d.settings[k]);
 if(!['auto','high','low'].includes(out.settings.quality))out.settings.quality='auto';
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
// best time for a track in seconds (0 = none yet). Sky Glider-era saves only had best.raceMs (the Sky track), so it is the fallback for 'sky'.
export function getBest(st,id){const v=st&&st.best?num(st.best[id]):NaN;if(Number.isFinite(v)&&v>0)return v;
 if(id==='sky'&&st&&st.best&&st.best.raceMs>0)return st.best.raceMs/1000;return 0;}
// record a finish time; returns true when it beats the old best (first finish counts)
export function setBest(st,id,secs){const t=num(secs);if(!st||!(t>0&&t<36000)||!/^[a-z0-9_-]{1,24}$/.test(String(id)))return false;
 st.best=st.best||{};const old=getBest(st,id);if(old>0&&t>=old)return false;st.best[id]=Math.round(t*1000)/1000;return true;}
function read(k){try{const s=localStorage.getItem(k);if(s==null)return null;return {raw:s,obj:JSON.parse(s)};}catch(e){return {raw:(()=>{try{return localStorage.getItem(k)}catch(_){return null}})(),bad:true};}}
export function load(){const a=read(KEY);if(a&&!a.bad&&a.obj&&typeof a.obj==='object')return sane(a.obj);
 if(a&&a.raw!=null){try{localStorage.setItem(BAD,a.raw);}catch(e){}}
 const b=read(BAK);if(b&&!b.bad&&b.obj)return sane(b.obj);return DEFAULTS();}
export function save(state){try{const s=JSON.stringify(sane(state));const prev=localStorage.getItem(KEY);
  localStorage.setItem(KEY,s);if(localStorage.getItem(KEY)!==s)throw new Error('verify');
  if(prev!=null){try{JSON.parse(prev);localStorage.setItem(BAK,prev);}catch(e){}}return true;}catch(e){return false;}}
