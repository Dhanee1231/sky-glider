// Neon Rush M7 cups. 3 cups x 3 races, one level for the whole cup.
// Points 10/8/6/5/4/3/2. Ties break to the better (lower) place in the last race.
// Trophy: 1st gold, 2nd silver, 3rd bronze. 4th-7th get a Cup Racer star ribbon and a cheer.
// Best trophy is kept per cup per level (0 none, 1 bronze, 2 silver, 3 gold). A ribbon stores 0 and never downgrades a trophy.
// cupRun is {cup, level, race 0-2, pts} — the race index still to drive. Saved after every finished race. Cleared at the podium.
// Candy Crystal Peaks (track id 'candy') is built on another branch. Until registerTrack('candy'), that race stays id 'candy' and is a stub.
// Spoken lines are Kokoro af_heart clip ids in LINES. Missing clip files stay silent. No live voice synthesis.
import {CUPS, DIFFS, keepCup} from './save.js';

export const POINTS=[10,8,6,5,4,3,2];
export const FIELD=['You','Pip','Mochi','Bolt','Kiki','Coco','Shelly'];
export const LINES={
 c_gold:'Gold trophy!',
 c_silver:'Silver trophy!',
 c_bronze:'Bronze trophy!',
 c_ribbon:'Cup Racer! Great racing!',
 c_cup_star:'Star Cup',
 c_cup_heart:'Heart Cup',
 c_cup_rainbow:'Rainbow Cup',
 c_rainbow_lock:'Win a trophy in Star Cup and Heart Cup!'
};
export const VOICE_IDS=Object.keys(LINES);
const TRACK_NAME={sky:'Neon Sky City',harbor:'Glowtide Harbor',skyway:'Arcade Skyway',beach:'Sunny Shores',candy:'Candy Crystal Peaks'};
export const CUP_DEFS={
 star:{id:'star',name:'Star Cup',voice:'c_cup_star',races:[{track:'sky',night:false},{track:'harbor',night:false},{track:'skyway',night:false}]},
 heart:{id:'heart',name:'Heart Cup',voice:'c_cup_heart',races:[{track:'beach',night:false},{track:'candy',night:false},{track:'harbor',night:true}]},
 rainbow:{id:'rainbow',name:'Rainbow Cup',voice:'c_cup_rainbow',lockVoice:'c_rainbow_lock',lockLine:LINES.c_rainbow_lock,races:[{track:'skyway',night:true},{track:'candy',night:true},{track:'beach',night:true}]}
};
const BASE=['sky','harbor','skyway','beach'];
const LIVE=new Set(BASE);
const nameOk=n=>typeof n==='string'&&/^[A-Za-z][A-Za-z0-9]{0,15}$/.test(n);
export function registerTrack(id){if(typeof id==='string'&&/^[a-z0-9_-]{1,24}$/.test(id))LIVE.add(id);}
export function resetTrackFeatures(){LIVE.clear();for(const id of BASE)LIVE.add(id);}
export function candyFeature(){return LIVE.has('candy');}
export function trackReady(id){return LIVE.has(id);}
export function trackName(id){return TRACK_NAME[id]||'';}
export function pointsForPlace(place){const i=(place|0)-1;return i>=0&&i<POINTS.length?POINTS[i]:0;}
function clampPlace(place){const n=place|0;return n>=1&&n<=7?n:7;}
function slotHasTrophy(slot){return !!(slot&&DIFFS.some(d=>(slot[d]|0)>=1));}
export function rainbowOpen(st){const c=st&&st.cups;return !!(c&&slotHasTrophy(c.star)&&slotHasTrophy(c.heart));}
export function trophyRank(n){const t=Math.max(0,Math.min(3,n|0));return t;}
// Shelf / select label. Stored 0 means no trophy yet (a ribbon is not kept). Locked slots hide this label.
export function trophyLabel(n){return ['No trophy yet','Bronze','Silver','Gold'][trophyRank(n)];}
export function awardFor(place){
 const p=clampPlace(place);
 if(p===1)return {place:p,trophy:3,kind:'gold',ribbon:false,title:'Gold trophy!',cheer:LINES.c_gold,voice:'c_gold'};
 if(p===2)return {place:p,trophy:2,kind:'silver',ribbon:false,title:'Silver trophy!',cheer:LINES.c_silver,voice:'c_silver'};
 if(p===3)return {place:p,trophy:1,kind:'bronze',ribbon:false,title:'Bronze trophy!',cheer:LINES.c_bronze,voice:'c_bronze'};
 return {place:p,trophy:0,kind:'ribbon',ribbon:true,title:'Cup Racer',cheer:LINES.c_ribbon,voice:'c_ribbon'};
}
// A single race inside the cup. Places 4-7 use the same ribbon cheer. Places 1-3 are a happy place call, not a trophy yet.
export function raceCheer(place){
 const p=clampPlace(place);
 if(p>=4)return awardFor(p);
 const title=['','1st place!','2nd place!','3rd place!'][p];
 const cheer=p===1?'You won the race!':'Great racing!';
 return {place:p,trophy:0,kind:'race',ribbon:false,title,cheer,voice:null};
}
export function rankStandings(rows){
 const list=(rows||[]).map(r=>({name:String(r.name),points:r.points|0,last:Number.isInteger(r.last)?r.last:99}));
 list.sort((a,b)=>(b.points-a.points)||(a.last-b.last)||(a.name<b.name?-1:a.name>b.name?1:0));
 return list.map((r,i)=>({name:r.name,points:r.points,last:r.last===99?null:r.last,rank:i+1}));
}
function asPlaces(places){
 const out=[];if(Array.isArray(places)){for(const row of places){if(row&&nameOk(row.name))out.push({name:row.name,place:row.place|0});}}
 else if(places&&typeof places==='object'){for(const name of Object.keys(places))if(nameOk(name))out.push({name,place:places[name]|0});}
 return out;
}
export function raceAt(cup,index,level){
 const def=CUP_DEFS[cup];if(!def)return null;const race=def.races[index];if(!race)return null;
 const stub=race.track==='candy'&&!candyFeature();
 const base=trackName(race.track);
 return {cup,level:DIFFS.includes(level)?level:'easy',index,track:race.track,night:!!race.night,stub,name:race.night?base+' at night':base,cupName:def.name,voice:def.voice};
}
// Renderer id. A missing candy module stays cup-id 'candy' (see raceAt) and drives Sunny Shores so the cup still starts.
export function standInTrack(trackId){if(trackId==='candy'&&!candyFeature())return 'beach';if(LIVE.has(trackId))return trackId;return 'sky';}
export function currentRace(st){const run=st&&st.cupRun;if(!run||!CUP_DEFS[run.cup])return null;const i=run.race|0;if(i<0||i>2)return null;return raceAt(run.cup,i,run.level);}
export function canEnter(st,cup,level){if(!CUPS.includes(cup)||!CUP_DEFS[cup]||!DIFFS.includes(level))return false;if(cup==='rainbow'&&!rainbowOpen(st))return false;return true;}
export function startCup(st,cup,level){if(!st||!canEnter(st,cup,level))return null;st.cupRun={cup,level,race:0,pts:{}};return currentRace(st);}
export function snapshotRun(st){const run=st&&st.cupRun;if(!run)return null;return {cup:run.cup,level:run.level,race:run.race,pts:Object.assign({},run.pts)};}
export function restoreRun(st,snap){
 if(!st||!snap||!CUPS.includes(snap.cup)||!DIFFS.includes(snap.level))return false;
 const race=snap.race|0;if(race<0||race>2)return false;const pts={};const src=snap.pts||{};
 for(const name of Object.keys(src)){if(!nameOk(name))continue;const n=src[name]|0;if(n>=0&&n<=9999)pts[name]=n;}
 st.cupRun={cup:snap.cup,level:snap.level,race,pts};return true;
}
function tableFor(pts,last){
 const rows=FIELD.map(name=>({name,points:pts[name]|0,last:Number.isInteger(last[name])?last[name]:99}));
 for(const name of Object.keys(pts))if(!FIELD.includes(name))rows.push({name,points:pts[name]|0,last:Number.isInteger(last[name])?last[name]:99});
 return rankStandings(rows);
}
// Add this race's points. Race index 0 and 1 advance cupRun to the next race. Race index 2 awards the trophy and clears cupRun.
export function recordRace(st,places){
 const run=st&&st.cupRun;if(!run||!CUP_DEFS[run.cup])return null;
 const pts=Object.assign({},run.pts);const last={};
 for(const row of asPlaces(places)){if(row.place<1||row.place>7)continue;pts[row.name]=(pts[row.name]|0)+pointsForPlace(row.place);last[row.name]=row.place;}
 const table=tableFor(pts,last);
 const you=table.find(r=>r.name==='You');
 const place=you?you.rank:7;                         // cup rank from points, tie-broken by the last race
 const racePlace=Number.isInteger(last.You)?last.You:7;
 const finished=run.race|0;
 if(finished>=2){
  const outcome=awardFor(place);
  keepCup(st,run.cup,run.level,outcome.trophy);
  const result={done:true,cup:run.cup,level:run.level,race:finished,next:null,place,racePlace,table,outcome,pts};
  st.cupRun=null;                                    // cleared at the podium
  return result;
 }
 st.cupRun={cup:run.cup,level:run.level,race:finished+1,pts};
 return {done:false,cup:run.cup,level:run.level,race:finished,next:finished+1,place,racePlace,table,outcome:raceCheer(racePlace),pts:st.cupRun.pts};
}
export function listCups(st,level){
 const lv=DIFFS.includes(level)?level:'easy';
 return CUPS.map(id=>{
  const def=CUP_DEFS[id];
  const open=id==='rainbow'?rainbowOpen(st):true;
  const slot=st&&st.cups&&st.cups[id];
  const trophy=slot?(slot[lv]|0):0;
  return {id,name:def.name,voice:def.voice,open,lockLine:def.lockLine||'',lockVoice:def.lockVoice||'',trophy,level:lv,races:def.races.map((_,i)=>raceAt(id,i,lv))};
 });
}
export function shelfRows(st){
 return CUPS.map(id=>{
  const def=CUP_DEFS[id];
  const slot=st&&st.cups&&st.cups[id]||{};
  return {id,name:def.name,voice:def.voice,open:id==='rainbow'?rainbowOpen(st):true,lockLine:def.lockLine||'',lockVoice:def.lockVoice||'',levels:DIFFS.map(d=>({level:d,trophy:slot[d]|0,label:trophyLabel(slot[d]|0)}))};
 });
}
