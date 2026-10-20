// Neon Rush M7 unlocks. Race end and cup end only ever add; nothing locks again.
// Spoken lines are Kokoro af_heart clip ids. The u_* files are placeholders until M7-7 renders them. No live voice synthesis.
import {FRIENDS,CUPS,DIFFS,OWN_RACERS,OWN_KARTS,keepCup,markBeat} from './save.js';

export const VOICE={
 newRacer:'u_new_racer',
 newKart:'u_new_kart',
 racer:{Pip:'u_name_pip',Mochi:'u_name_mochi',Bolt:'u_name_bolt',Kiki:'u_name_kiki',Coco:'u_name_coco',Shelly:'u_name_shelly',Sprinkle:'u_name_sprinkle',Ember:'u_name_ember',Pebble:'u_name_pebble',Twinkle:'u_name_twinkle'},
 kart:{'Candy Cruiser':'u_kart_candy','Heart Racer':'u_kart_heart','Star Comet':'u_kart_comet','Dragon Jet':'u_kart_dragon'}
};
export const VOICE_IDS=[VOICE.newRacer,VOICE.newKart,...Object.values(VOICE.racer),...Object.values(VOICE.kart)];
const EARLY=['Pip','Mochi','Bolt','Kiki','Coco'];   // Shelly is last: she opens only once these five are beaten too

export function ownsRacer(st,name){return name==='You'||!!(st&&st.own&&Array.isArray(st.own.racers)&&st.own.racers.includes(name));}
export function ownsKart(st,name){return !!(st&&st.own&&Array.isArray(st.own.karts)&&st.own.karts.includes(name));}
const hasTrophy=slot=>!!(slot&&DIFFS.some(d=>(slot[d]|0)>=1));
const hasGold=slot=>!!(slot&&DIFFS.some(d=>(slot[d]|0)>=3));
function addR(st,name){if(!OWN_RACERS.includes(name)||st.own.racers.includes(name))return;st.own.racers.push(name);}
function addK(st,name){if(!OWN_KARTS.includes(name)||st.own.karts.includes(name))return;st.own.karts.push(name);}
function order(st){st.own.racers=OWN_RACERS.filter(n=>st.own.racers.includes(n));st.own.karts=OWN_KARTS.filter(n=>st.own.karts.includes(n));}
export function heartProgress(st){const n=st&&Number.isInteger(st.wins)&&st.wins>0?st.wins:0;return {have:Math.min(5,n),need:5,done:n>=5};}
function line(kind,id){
 if(kind==='racer')return {kind,id,pop:'New racer!',voice:[VOICE.newRacer,VOICE.racer[id]]};
 return {kind,id,pop:'New kart!',voice:[VOICE.newKart,VOICE.kart[id]]};
}
// Rules (any level): friends finish-ahead once; Shelly last; Sprinkle any Star trophy; Ember any Heart trophy;
// Pebble 20 races; Twinkle Rainbow gold; Candy Cruiser a candy finish; Heart Racer 5 wins; Star Comet gold in any cup; Dragon Jet a trophy in all 3 cups.
export function applyUnlocks(st){
 if(!st||!st.own||!Array.isArray(st.own.racers)||!Array.isArray(st.own.karts)||!st.beat||!st.cups)return [];
 const hadR=new Set(st.own.racers),hadK=new Set(st.own.karts);
 for(const n of EARLY)if(st.beat[n]===true)addR(st,n);
 if(st.beat.Shelly===true&&EARLY.every(n=>st.beat[n]===true))addR(st,'Shelly');
 if(hasTrophy(st.cups.star))addR(st,'Sprinkle');
 if(hasTrophy(st.cups.heart))addR(st,'Ember');
 if((st.races|0)>=20)addR(st,'Pebble');
 if(hasGold(st.cups.rainbow))addR(st,'Twinkle');
 if(((st.trackDone&&st.trackDone.candy)|0)>=1)addK(st,'Candy Cruiser');
 if((st.wins|0)>=5)addK(st,'Heart Racer');
 if(CUPS.some(c=>hasGold(st.cups[c])))addK(st,'Star Comet');
 if(CUPS.every(c=>hasTrophy(st.cups[c])))addK(st,'Dragon Jet');
 order(st);
 const fresh=[];
 for(const id of st.own.racers)if(!hadR.has(id))fresh.push(line('racer',id));
 for(const id of st.own.karts)if(!hadK.has(id))fresh.push(line('kart',id));
 return fresh;
}
const trackOk=id=>typeof id==='string'&&/^[a-z0-9_-]{1,24}$/.test(id);
export function checkRaceEnd(st,ev){
 ev=ev||{};
 if(Array.isArray(ev.ahead))for(const n of ev.ahead)if(FRIENDS.includes(n))markBeat(st,n);
 if(trackOk(ev.trackId)){st.trackDone=st.trackDone||{};st.trackDone[ev.trackId]=(st.trackDone[ev.trackId]|0)+1;}
 return applyUnlocks(st);   // ev.level is recorded by the caller and is not a gate
}
export function checkCupEnd(st,ev){
 ev=ev||{};
 let t=Number.isInteger(ev.trophy)?ev.trophy:ev.place===1?3:ev.place===2?2:ev.place===3?1:0;
 if(!Number.isInteger(t))t=0;
 t=Math.max(0,Math.min(3,t));
 if(CUPS.includes(ev.cup)&&DIFFS.includes(ev.level))keepCup(st,ev.cup,ev.level,t);
 const fresh=applyUnlocks(st);
 st.cupRun=null;
 return fresh;
}
export function badgeKey(kind,id){return kind+':'+id;}
export function isNew(st,kind,id){
 const owned=kind==='racer'?ownsRacer(st,id)&&id!=='You':ownsKart(st,id);
 return !!(owned&&!(st&&st.seen&&st.seen[badgeKey(kind,id)]===true));
}
export function markSeen(st,kind,id){if(!st)return;st.seen=st.seen||{};st.seen[badgeKey(kind,id)]=true;}
export function newBadges(st){
 const out=[];
 for(const id of OWN_RACERS)if(isNew(st,'racer',id))out.push({kind:'racer',id});
 for(const id of OWN_KARTS)if(isNew(st,'kart',id))out.push({kind:'kart',id});
 return out;
}
// The garage calls this for the tab the player just looked at. Badges for that tab clear; the others stay.
export function noteViewed(st,kind){
 const ids=kind==='racer'?OWN_RACERS:kind==='kart'?OWN_KARTS:[];
 const seen=[];
 for(const id of ids)if(isNew(st,kind,id)){markSeen(st,kind,id);seen.push(id);}
 return seen;
}
