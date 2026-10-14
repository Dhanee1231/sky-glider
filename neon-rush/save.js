// Neon Rush save (localStorage). Versioned, additive, write-then-verify, backup key, corrupt data kept in .bad.
export const KEY='neon-rush.v1',BAK='neon-rush.v1.bak',BAD='neon-rush.v1.bad';
export const DEFAULTS=()=>({v:1,settings:{sound:true,voice:true,quality:'auto',fps:false,engine:7},best:{lapMs:0,raceMs:0},races:0,wins:0});
function sane(o){const d=DEFAULTS();if(!o||typeof o!=='object')return d;const out=Object.assign({},o);out.v=1;
 out.settings=Object.assign({},d.settings,o.settings&&typeof o.settings==='object'?o.settings:{});
 for(const k of['sound','voice','fps'])if(typeof out.settings[k]!=='boolean')out.settings[k]=d.settings[k];
 if(!['auto','high','low'].includes(out.settings.quality))out.settings.quality='auto';
 if(!(Number.isFinite(out.settings.engine)&&out.settings.engine>=0&&out.settings.engine<=100))out.settings.engine=d.settings.engine;   // M3: engine volume %, default 7
 out.best=Object.assign({},d.best,o.best&&typeof o.best==='object'?o.best:{});for(const k of['lapMs','raceMs'])if(!(Number.isFinite(out.best[k])&&out.best[k]>=0))out.best[k]=0;
 for(const k of['races','wins'])if(!(Number.isInteger(out[k])&&out[k]>=0))out[k]=0;
 return out;}   // unknown fields are kept untouched
function read(k){try{const s=localStorage.getItem(k);if(s==null)return null;return {raw:s,obj:JSON.parse(s)};}catch(e){return {raw:(()=>{try{return localStorage.getItem(k)}catch(_){return null}})(),bad:true};}}
export function load(){const a=read(KEY);if(a&&!a.bad&&a.obj&&typeof a.obj==='object')return sane(a.obj);
 if(a&&a.raw!=null){try{localStorage.setItem(BAD,a.raw);}catch(e){}}
 const b=read(BAK);if(b&&!b.bad&&b.obj)return sane(b.obj);return DEFAULTS();}
export function save(state){try{const s=JSON.stringify(sane(state));const prev=localStorage.getItem(KEY);
  localStorage.setItem(KEY,s);if(localStorage.getItem(KEY)!==s)throw new Error('verify');
  if(prev!=null){try{JSON.parse(prev);localStorage.setItem(BAK,prev);}catch(e){}}return true;}catch(e){return false;}}
