// Node tests for neon-rush/save.js. Old v1-M4 / M5b / M6B cases stay, plus the M7 migration.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {
 KEY,BAK,BAD,BAK_M6,DIFFS,TRACK_IDS,KART_N,FRIENDS,RACERS,OWN_KARTS,
 sane,load,save,isReadOnly,DEFAULTS,getBest,setBest,getTrackDiff,setTrackDiff,keepCup,markBeat
} from './save.js';

const writes=[];
const store=new Map();
function install(){
 writes.length=0;store.clear();
 globalThis.localStorage={
  getItem:k=>store.has(k)?store.get(k):null,
  setItem:(k,v)=>{const s=String(v);writes.push(k);store.set(k,s);},
  removeItem:k=>store.delete(k),
  clear(){store.clear();}
 };
}
install();

const BEAT_OFF={Pip:false,Mochi:false,Bolt:false,Kiki:false,Coco:false,Shelly:false};
const BEAT_ON={Pip:true,Mochi:true,Bolt:true,Kiki:true,Coco:true,Shelly:true};
const SIX=['Pip','Mochi','Bolt','Kiki','Coco','Shelly'];

function v6View(st){
 return {
  best:JSON.parse(JSON.stringify(st.best)),
  emblem:st.kart.emblem,emblemColor:st.kart.emblemColor,
  marker:st.kart.marker,markerColor:st.kart.markerColor,markerFx:st.kart.markerFx,
  trackDifficulty:JSON.parse(JSON.stringify(st.settings.trackDifficulty)),
  races:st.races,wins:st.wins
 };
}

let v6mod=null;
async function v6(){
 if(v6mod)return v6mod;
 const src=execFileSync('git',['show','5b36aaa:neon-rush/save.js'],{encoding:'utf8'});
 assert.match(src,/body:4/);   // real v6 save.js, before KART_N.body became 8
 const dir=mkdtempSync(join(tmpdir(),'nr-v6-'));
 const file=join(dir,'save.js');
 writeFileSync(file,src);
 v6mod=await import(pathToFileURL(file).href);
 return v6mod;
}

// ---------- old save behaviour (these stay green) ----------

test('old fresh: v is 1, races 0, wins 0, track sky',()=>{
 const s=sane(null);
 assert.equal(s.v,1);assert.equal(s.races,0);assert.equal(s.wins,0);assert.equal(s.track,'sky');
});

test('old fresh: settings defaults',()=>{
 const s=sane(undefined).settings;
 assert.equal(s.sound,true);assert.equal(s.voice,true);assert.equal(s.quality,'auto');
 assert.equal(s.fps,false);assert.equal(s.engine,7);assert.equal(s.difficulty,'easy');
 assert.deepEqual(s.trackDifficulty,{});
});

test('old fresh: sky harbor skyway beach are unlocked',()=>{
 const u=sane({}).unlocked;
 for(const id of['sky','harbor','skyway','beach'])assert.equal(u[id],true);
});

test('old fresh: kart body paint finish wheels trail decal emblem marker default 0',()=>{
 const k=sane([]).kart;
 for(const f of['body','paint','finish','wheels','trail','decal','emblem','emblemColor','marker','markerColor','markerFx'])assert.equal(k[f],0);
});

test('old fresh: best lapMs and raceMs are 0',()=>{
 const b=sane(1).best;assert.equal(b.lapMs,0);assert.equal(b.raceMs,0);
});

test('old v1-M4: keeps track, per-track best and kart',()=>{
 const s=sane({v:1,track:'harbor',best:{harbor:88.5,lapMs:1,raceMs:2},kart:{body:2,paint:4,finish:1,wheels:3,trail:2,decal:1},races:3,wins:1});
 assert.equal(s.track,'harbor');assert.equal(s.best.harbor,88.5);assert.equal(s.best.lapMs,1);assert.equal(s.best.raceMs,2);
 assert.equal(s.kart.body,2);assert.equal(s.kart.paint,4);assert.equal(s.kart.finish,1);
 assert.equal(s.races,3);assert.equal(s.wins,1);
});

test('old v1-M4: unknown top-level field is kept',()=>{
 const s=sane({v:1,stickerBook:{n:4},hello:'kid'});
 assert.deepEqual(s.stickerBook,{n:4});assert.equal(s.hello,'kid');
});

test('old v1-M4: bad kart index clamps, missing fields default 0',()=>{
 const s=sane({v:1,kart:{body:99,paint:-3,finish:'nope'}});
 assert.equal(s.kart.body,KART_N.body-1);assert.equal(s.kart.paint,0);assert.equal(s.kart.finish,0);assert.equal(s.kart.wheels,0);
});

test('old v1-M5b: beach best is kept and beach stays unlocked',()=>{
 const s=sane({v:1,best:{beach_b:55.25},unlocked:{beach:true}});
 assert.equal(s.best.beach_b,55.25);assert.equal(s.unlocked.beach,true);assert.equal(getBest(s,'beach',3),55.25);
});

test('old v1-M5b: emblem and marker fields clamp',()=>{
 const s=sane({v:1,kart:{emblem:8,emblemColor:7,marker:7,markerColor:8,markerFx:2}});
 assert.equal(s.kart.emblem,8);assert.equal(s.kart.emblemColor,7);
 assert.equal(s.kart.marker,7);assert.equal(s.kart.markerColor,8);assert.equal(s.kart.markerFx,2);
});

test('old v1-M5b: markerColor past the rainbow clamps, bogus emblem drops to 0',()=>{
 const s=sane({v:1,kart:{markerColor:40,emblem:-1,markerFx:'x'}});
 assert.equal(s.kart.markerColor,8);assert.equal(s.kart.emblem,0);assert.equal(s.kart.markerFx,0);
});

test('old v1-M6: extreme is kept, unknown difficulty becomes easy',()=>{
 assert.equal(sane({v:1,settings:{difficulty:'extreme'}}).settings.difficulty,'extreme');
 assert.equal(sane({v:1,settings:{difficulty:'nightmare'}}).settings.difficulty,'easy');
 assert.ok(DIFFS.includes('extreme'));
});

test('old v1-M6B: per-track difficulty is kept',()=>{
 const s=sane({v:1,settings:{difficulty:'easy',trackDifficulty:{sky:'hard',beach:'extreme',harbor:'medium'}}});
 assert.equal(getTrackDiff(s,'sky'),'hard');assert.equal(getTrackDiff(s,'beach'),'extreme');
 assert.equal(getTrackDiff(s,'harbor'),'medium');assert.equal(getTrackDiff(s,'skyway'),'easy');
});

test('old v1-M6B: invalid levels drop, unknown track ids stay',()=>{
 const s=sane({v:1,settings:{trackDifficulty:{sky:'nope',night:'hard','': 'easy',ok:1}}});
 assert.deepEqual(s.settings.trackDifficulty,{night:'hard'});
 assert.equal(setTrackDiff(s,'candy','extreme'),true);assert.equal(s.settings.trackDifficulty.candy,'extreme');
});

test('old v1-M6B: bests use _b and _b4 and leave the legacy key',()=>{
 const s=sane({v:1,best:{sky:10,sky_b:20,sky_b4:30,raceMs:4}});
 assert.equal(setBest(s,'sky',19,3),true);assert.equal(getBest(s,'sky',3),19);
 assert.equal(setBest(s,'sky',25,3),false);assert.equal(s.best.sky,10);assert.equal(s.best.raceMs,4);
 assert.equal(setBest(s,'sky',28,4),true);assert.equal(getBest(s,'sky',4),28);
});

test('old corrupt: unreadable save does not throw, raw is kept in .bad, defaults load',()=>{
 install();localStorage.setItem(KEY,'{not json');
 let s;assert.doesNotThrow(()=>{s=load();});
 assert.equal(localStorage.getItem(BAD),'{not json');
 assert.equal(s.v,1);assert.equal(s.races,0);assert.equal(s.wins,0);assert.equal(isReadOnly(),false);
});

test('old corrupt: falls back to the rolling .bak when the main key is junk',()=>{
 install();
 localStorage.setItem(BAK,JSON.stringify({v:1,races:6,wins:2,best:{lapMs:3,raceMs:8}}));
 localStorage.setItem(KEY,'<<<');
 const s=load();
 assert.equal(s.races,6);assert.equal(s.wins,2);assert.equal(s.best.lapMs,3);assert.equal(localStorage.getItem(BAD),'<<<');
});

test('old newer-version: read-only, save does not write',async()=>{
 install();
 const raw=JSON.stringify({v:2,races:9,wins:4,best:{lapMs:1.5,raceMs:12,sky_b:33},settings:{difficulty:'hard',trackDifficulty:{beach:'extreme'}}});
 localStorage.setItem(KEY,raw);
 const s=load();
 assert.equal(isReadOnly(),true);
 assert.equal(s.races,9);assert.equal(s.wins,4);assert.equal(s.best.sky_b,33);
 assert.equal(s.settings.difficulty,'hard');assert.equal(s.settings.trackDifficulty.beach,'extreme');
 writes.length=0;
 assert.equal(save(s),false);
 assert.equal(localStorage.getItem(KEY),raw);
 assert.equal(writes.length,0);
 assert.equal(localStorage.getItem(BAK_M6),null);
});

test('old newer-version: progress is still readable in memory',()=>{
 install();
 localStorage.setItem(KEY,JSON.stringify({v:9,races:15,wins:7,kart:{emblem:4,marker:3,markerColor:8,markerFx:1,body:1}}));
 const s=load();
 assert.equal(s.races,15);assert.equal(s.wins,7);assert.equal(s.kart.emblem,4);
 assert.equal(s.kart.marker,3);assert.equal(s.kart.markerColor,8);assert.equal(s.kart.markerFx,1);
 localStorage.setItem(KEY,JSON.stringify({v:1}));load();
});

test('old near-complete: bests emblems markers trackDifficulty races wins stay identical',()=>{
 const before={v:1,races:100,wins:40,track:'skyway',
  best:{lapMs:12.5,raceMs:80,sky_b:70.5,harbor_b:71,skyway_b4:90.25,beach_b:66,night_b:50},
  kart:{body:3,paint:9,finish:2,wheels:3,trail:4,decal:4,emblem:8,emblemColor:7,marker:7,markerColor:8,markerFx:2},
  settings:{sound:false,voice:true,quality:'low',fps:true,engine:'50',difficulty:'extreme',trackDifficulty:{sky:'easy',harbor:'hard',beach:'extreme',skyway:'medium',night:'hard'}},
  unlocked:{sky:true,harbor:true,skyway:true,beach:true},stickerBook:{n:7}};
 const s=sane(before);
 assert.equal(s.races,before.races);assert.equal(s.wins,before.wins);
 assert.equal(s.best.lapMs,12.5);assert.equal(s.best.raceMs,80);
 assert.equal(s.best.sky_b,70.5);assert.equal(s.best.harbor_b,71);assert.equal(s.best.skyway_b4,90.25);
 assert.equal(s.best.beach_b,66);assert.equal(s.best.night_b,50);
 assert.equal(s.kart.emblem,8);assert.equal(s.kart.emblemColor,7);
 assert.equal(s.kart.marker,7);assert.equal(s.kart.markerColor,8);assert.equal(s.kart.markerFx,2);
 assert.deepEqual(s.settings.trackDifficulty,before.settings.trackDifficulty);
 assert.equal(s.settings.engine,50);assert.equal(s.settings.sound,false);assert.equal(s.settings.quality,'low');
 assert.deepEqual(s.stickerBook,{n:7});
});

test('old coercion: numeric strings and bool strings, negatives become 0',()=>{
 const s=sane({v:1,races:'12',wins:'0',settings:{sound:'false',voice:'true',fps:'nope',engine:150,quality:'nope'}});
 assert.equal(s.races,12);assert.equal(s.wins,0);
 assert.equal(s.settings.sound,false);assert.equal(s.settings.voice,true);assert.equal(s.settings.fps,false);
 assert.equal(s.settings.engine,100);assert.equal(s.settings.quality,'auto');
 const z=sane({v:1,races:-4,wins:1.5,best:{lapMs:-2,raceMs:'8'}});
 assert.equal(z.races,0);assert.equal(z.wins,0);assert.equal(z.best.lapMs,0);assert.equal(z.best.raceMs,8);
});

test('old write-then-verify: rolling .bak keeps the previous good save',()=>{
 install();localStorage.setItem(KEY,JSON.stringify({v:1}));load();   // clear a newer-version read-only latch
 const first=sane({v:1,races:2,wins:1});
 assert.equal(save(first),true);
 const prev=localStorage.getItem(KEY);
 const second=sane({v:1,races:3,wins:1});
 assert.equal(save(second),true);
 assert.equal(localStorage.getItem(BAK),prev);
 assert.equal(JSON.parse(localStorage.getItem(KEY)).races,3);
});

// ---------- M7 ----------

test('M7 fresh save has the new fields and candy once',()=>{
 const s=sane(DEFAULTS());
 assert.equal(s.v,1);
 assert.ok(TRACK_IDS.includes('candy'));
 assert.equal(TRACK_IDS.filter(id=>id==='candy').length,1);
 assert.equal(s.unlocked.candy,true);
 assert.equal(KART_N.body,8);assert.equal(s.kart.racer,0);assert.equal(RACERS.length,11);
 assert.deepEqual(s.cups,{star:{easy:0,medium:0,hard:0,extreme:0},heart:{easy:0,medium:0,hard:0,extreme:0},rainbow:{easy:0,medium:0,hard:0,extreme:0}});
 assert.equal(s.cupRun,null);assert.deepEqual(s.beat,BEAT_OFF);
 assert.deepEqual(s.trackDone,{});assert.deepEqual(s.own,{racers:[],karts:[]});assert.deepEqual(s.seen,{});
 assert.deepEqual(s.own.karts,[]);
 assert.ok(OWN_KARTS.includes('Heart Racer'));
});

test('M7 candy best keys are candy_b and candy_b4',()=>{
 const s=sane({v:1});
 assert.equal(setBest(s,'candy',42.5,3),true);assert.equal(s.best.candy_b,42.5);assert.equal(getBest(s,'candy',3),42.5);
 assert.equal(setBest(s,'candy',50,4),true);assert.equal(s.best.candy_b4,50);assert.equal(getBest(s,'candy',4),50);
});

test('M7 migration wins>=1 beats Pip through Shelly and opens only those friends',()=>{
 const s=sane({v:1,wins:1,races:0});
 assert.deepEqual(s.beat,BEAT_ON);
 assert.deepEqual(s.own.racers,SIX);
 assert.deepEqual(s.own.karts,[]);
});

test('M7 migration races 19 does not open Pebble, races 20 opens only Pebble',()=>{
 const a=sane({v:1,wins:0,races:19});
 assert.deepEqual(a.own.racers,[]);assert.deepEqual(a.beat,BEAT_OFF);
 const b=sane({v:1,wins:0,races:20});
 assert.deepEqual(b.own.racers,['Pebble']);assert.deepEqual(b.own.karts,[]);assert.deepEqual(b.beat,BEAT_OFF);
});

test('M7 migration wins 4 does not open Heart Racer, wins 5 opens only Heart Racer',()=>{
 const a=sane({v:1,wins:4,races:0});
 assert.deepEqual(a.own.karts,[]);assert.deepEqual(a.own.racers,SIX);
 const b=sane({v:1,wins:5,races:0});
 assert.deepEqual(b.own.karts,['Heart Racer']);
 assert.deepEqual(b.own.racers,SIX);
});

test('M7 migration wins 0 races 0 unlocks nothing extra',()=>{
 const s=sane({v:1,wins:0,races:0,best:{sky_b:10},kart:{emblem:2,marker:1}});
 assert.deepEqual(s.beat,BEAT_OFF);assert.deepEqual(s.own,{racers:[],karts:[]});
 assert.equal(s.best.sky_b,10);assert.equal(s.kart.emblem,2);assert.equal(s.kart.marker,1);
});

test('M7 migration wins 5 races 20 opens the six friends, Pebble and Heart Racer only',()=>{
 const s=sane({v:1,wins:5,races:20});
 assert.deepEqual(s.own.racers,[...SIX,'Pebble']);
 assert.deepEqual(s.own.karts,['Heart Racer']);
 assert.deepEqual(s.beat,BEAT_ON);
});

test('M7 migration does not run again on an already-M7 save',()=>{
 const once=sane({v:1,wins:5,races:20});
 once.wins=0;once.races=0;
 const twice=sane(once);
 assert.deepEqual(twice.own.racers,[...SIX,'Pebble']);
 assert.deepEqual(twice.own.karts,['Heart Racer']);
 assert.deepEqual(twice.beat,BEAT_ON);   // stored trues stay on
 assert.equal(twice.wins,0);assert.equal(twice.races,0);
});

test('M7 a real v6 save keeps bests emblems markers trackDifficulty races wins',async()=>{
 install();
 const old=await v6();
 const src={v:1,races:20,wins:5,track:'beach',
  best:{lapMs:11,raceMs:70,sky_b:60.5,harbor_b:61.25,skyway_b:62,beach_b:63.5,skyway_b4:88,beach:40},
  kart:{body:2,paint:6,finish:1,wheels:2,trail:3,decal:2,emblem:5,emblemColor:3,marker:4,markerColor:8,markerFx:1},
  settings:{sound:true,voice:false,quality:'high',fps:false,engine:7,difficulty:'hard',trackDifficulty:{sky:'easy',beach:'extreme',harbor:'medium',skyway:'hard'}}};
 assert.equal(old.save(src),true);
 const raw=localStorage.getItem(KEY);
 assert.equal(raw.includes('"cups"'),false);
 const before=JSON.parse(raw);
 const st=load();
 const after=v6View(st);
 assert.equal(after.races,before.races);assert.equal(after.wins,before.wins);
 assert.equal(after.best.lapMs,before.best.lapMs);assert.equal(after.best.raceMs,before.best.raceMs);
 assert.equal(after.best.sky_b,before.best.sky_b);assert.equal(after.best.harbor_b,before.best.harbor_b);
 assert.equal(after.best.skyway_b,before.best.skyway_b);assert.equal(after.best.beach_b,before.best.beach_b);
 assert.equal(after.best.skyway_b4,before.best.skyway_b4);assert.equal(after.best.beach,before.best.beach);
 assert.equal(after.emblem,before.kart.emblem);assert.equal(after.emblemColor,before.kart.emblemColor);
 assert.equal(after.marker,before.kart.marker);assert.equal(after.markerColor,before.kart.markerColor);assert.equal(after.markerFx,before.kart.markerFx);
 assert.deepEqual(after.trackDifficulty,before.settings.trackDifficulty);
 assert.equal(st.kart.body,2);assert.equal(st.kart.paint,6);assert.equal(st.settings.difficulty,'hard');assert.equal(st.settings.voice,false);
 assert.deepEqual(st.own.racers,[...SIX,'Pebble']);assert.deepEqual(st.own.karts,['Heart Racer']);
});

test('M7 bak.m6 equals the pre-M7 bytes and is written before the first M7 write',async()=>{
 install();
 const old=await v6();
 assert.equal(old.save({v:1,races:8,wins:2,best:{lapMs:4,raceMs:20,beach_b:33.5},kart:{emblem:2,marker:1,markerColor:8,markerFx:2,body:1},settings:{trackDifficulty:{harbor:'extreme'},difficulty:'medium'}}),true);
 const raw=localStorage.getItem(KEY);
 assert.equal(localStorage.getItem(BAK_M6),null);
 const st=load();
 writes.length=0;
 assert.equal(save(st),true);
 assert.equal(localStorage.getItem(BAK_M6),raw);
 const iBak=writes.indexOf(BAK_M6),iKey=writes.indexOf(KEY);
 assert.ok(iBak>=0&&iKey>=0&&iBak<iKey);
 writes.length=0;
 st.races=9;
 assert.equal(save(st),true);
 assert.equal(localStorage.getItem(BAK_M6),raw);   // one-time
 assert.equal(writes.includes(BAK_M6),false);
 const again=load();
 assert.equal(again.races,9);assert.equal(again.wins,2);assert.equal(again.best.beach_b,33.5);
 assert.equal(again.kart.emblem,2);assert.equal(again.kart.markerColor,8);assert.equal(again.settings.trackDifficulty.harbor,'extreme');
});

test('M7 spaced pre-M7 bytes are backed up exactly, not re-serialized',()=>{
 install();
 const raw='{"v":1, "wins": 1, "races": 3, "best": {"lapMs": 1.25, "beach_b": 40.5}, "kart": {"emblem": 3, "marker": 2, "markerColor": 8, "markerFx": 2, "body": 2}, "settings": {"difficulty": "hard", "trackDifficulty": {"harbor": "extreme"}}}';
 localStorage.setItem(KEY,raw);
 const st=load();
 assert.equal(st.wins,1);assert.equal(st.races,3);assert.equal(st.best.beach_b,40.5);assert.equal(st.best.lapMs,1.25);
 assert.equal(st.kart.emblem,3);assert.equal(st.kart.marker,2);assert.equal(st.kart.markerColor,8);assert.equal(st.kart.markerFx,2);
 assert.equal(st.settings.trackDifficulty.harbor,'extreme');assert.equal(st.settings.difficulty,'hard');
 assert.deepEqual(st.beat,BEAT_ON);
 writes.length=0;
 assert.equal(save(st),true);
 assert.equal(localStorage.getItem(BAK_M6),raw);
 assert.ok(writes.indexOf(BAK_M6)<writes.indexOf(KEY));
});

test('M7 rollback: v6 save.js loads the M7 save and clamps body 5-7 to 3',async()=>{
 install();
 const old=await v6();
 const base={v:1,races:11,wins:4,track:'harbor',
  best:{lapMs:6,raceMs:40,sky_b:21,harbor_b:22.5,beach_b:23,skyway_b4:30},
  kart:{body:1,paint:3,finish:2,wheels:1,trail:2,decal:3,emblem:6,emblemColor:2,marker:5,markerColor:8,markerFx:2},
  settings:{difficulty:'extreme',trackDifficulty:{beach:'hard',sky:'medium'},sound:true,voice:true,quality:'auto',engine:7}};
 assert.equal(old.save(base),true);
 const pre=localStorage.getItem(KEY);
 const st=load();
 assert.equal(save(st),true);
 assert.equal(localStorage.getItem(BAK_M6),pre);
 for(const body of[5,6,7]){
  const written=JSON.parse(localStorage.getItem(KEY));
  written.kart.body=body;written.kart.racer=9;
  const back=old.sane(written);
  assert.equal(back.kart.body,3);
  assert.equal(back.races,11);assert.equal(back.wins,4);
  assert.equal(back.best.sky_b,21);assert.equal(back.best.harbor_b,22.5);assert.equal(back.best.beach_b,23);assert.equal(back.best.skyway_b4,30);
  assert.equal(back.best.lapMs,6);assert.equal(back.best.raceMs,40);
  assert.equal(back.kart.emblem,6);assert.equal(back.kart.emblemColor,2);
  assert.equal(back.kart.marker,5);assert.equal(back.kart.markerColor,8);assert.equal(back.kart.markerFx,2);
  assert.equal(back.kart.paint,3);assert.equal(back.settings.difficulty,'extreme');
  assert.equal(back.settings.trackDifficulty.beach,'hard');assert.equal(back.settings.trackDifficulty.sky,'medium');
  assert.equal(back.kart.racer,9);   // unknown to v6, left in place
  assert.equal(back.v,1);
 }
 const live=old.load();
 assert.equal(live.races,11);assert.equal(live.wins,4);assert.equal(live.best.beach_b,23);
});

test('M7 cups drop junk and clamp to 0-3, keepCup never downgrades',()=>{
 const s=sane({v:1,cups:{star:{easy:2,medium:'3',hard:9,extreme:-1,nope:2},heart:null,rainbow:{easy:1.5},banana:{easy:3},star2:1}});
 assert.equal(s.cups.star.easy,2);assert.equal(s.cups.star.medium,3);assert.equal(s.cups.star.hard,3);assert.equal(s.cups.star.extreme,0);
 assert.equal(s.cups.heart.easy,0);assert.equal(s.cups.rainbow.easy,0);assert.equal(s.cups.banana,undefined);
 assert.equal(keepCup(s,'star','easy',1),true);assert.equal(s.cups.star.easy,2);
 assert.equal(keepCup(s,'star','easy',3),true);assert.equal(s.cups.star.easy,3);
 assert.equal(keepCup(s,'nope','easy',3),false);
 const junk=sane({v:1,cups:'nope'});
 assert.equal(junk.cups.star.easy,0);
});

test('M7 cupRun keeps a valid run and drops garbage without throwing',()=>{
 const ok=sane({v:1,cupRun:{cup:'heart',level:'hard',race:'2',pts:{Pip:8,You:10,'no way':4,Mochi:-1}}});
 assert.deepEqual(ok.cupRun,{cup:'heart',level:'hard',race:2,pts:{Pip:8,You:10}});
 for(const bad of[3,'x',{cup:'star'},{cup:'nope',level:'easy',race:0},{cup:'star',level:'easy',race:3},{cup:'rainbow',level:'nope',race:1}]){
  assert.equal(sane({v:1,cupRun:bad}).cupRun,null);
 }
 assert.equal(sane({v:1,cupRun:null}).cupRun,null);
});

test('M7 beat is monotonic, trackDone and seen drop junk, racer clamps 0-10',()=>{
 const s=sane({v:1,wins:0,beat:{Pip:true,Mochi:'true',Bolt:false,Ghost:true},trackDone:{candy:2,beach:'4','Bad Key':3,sky:-1},seen:{'racer:Pip':true,'kart:Heart Racer':true,nope:true,'racer:Nope':1},kart:{racer:'10'}});
 assert.equal(s.beat.Pip,true);assert.equal(s.beat.Mochi,true);assert.equal(s.beat.Bolt,false);assert.equal(s.beat.Ghost,undefined);
 assert.equal(markBeat(s,'Coco'),true);assert.equal(s.beat.Coco,true);
 assert.equal(markBeat(s,'Ghost'),false);
 const kept=sane(s);assert.equal(kept.beat.Pip,true);assert.equal(kept.beat.Coco,true);
 assert.deepEqual(s.trackDone,{candy:2,beach:4});
 assert.deepEqual(s.seen,{'racer:Pip':true,'kart:Heart Racer':true});
 assert.equal(s.kart.racer,10);
 assert.equal(sane({v:1,kart:{racer:40}}).kart.racer,10);
 assert.equal(sane({v:1,kart:{racer:-2}}).kart.racer,0);
 assert.equal(sane({v:1,kart:{racer:'nope'}}).kart.racer,0);
});

test('M7 garbage fields never throw',()=>{
 assert.doesNotThrow(()=>{
  const s=sane({v:1,cups:1,cupRun:false,beat:[],trackDone:null,own:'x',seen:4,kart:null,wins:'5',races:'20'});
  assert.deepEqual(s.own.racers,[...SIX,'Pebble']);
  assert.deepEqual(s.own.karts,['Heart Racer']);
 });
});

test('M7 an owned racer stays owned when the pre-M7 rule would not add them',()=>{
 const s=sane({v:1,cups:{star:cupZero(),heart:cupZero(),rainbow:cupZero()},cupRun:null,beat:BEAT_OFF,trackDone:{},own:{racers:['Sprinkle'],karts:['Star Comet']},seen:{},wins:0,races:0});
 assert.deepEqual(s.own.racers,['Sprinkle']);assert.deepEqual(s.own.karts,['Star Comet']);
});

test('M7 fresh boot writes no bak.m6 when there was no previous save',()=>{
 install();
 const st=load();
 writes.length=0;
 assert.equal(save(st),true);
 assert.equal(localStorage.getItem(BAK_M6),null);
 assert.equal(writes.includes(BAK_M6),false);
});

test('M7 corrupt raw is parked in .bad and also backed up before the first good write',()=>{
 install();localStorage.setItem(KEY,'{{');
 const st=load();
 assert.equal(localStorage.getItem(BAD),'{{');
 writes.length=0;
 assert.equal(save(st),true);
 assert.equal(localStorage.getItem(BAK_M6),'{{');
 assert.ok(writes.indexOf(BAK_M6)<writes.indexOf(KEY));
});

function cupZero(){return {easy:0,medium:0,hard:0,extreme:0};}

test('old near-complete load round-trip through storage keeps v6 progress',()=>{
 install();
 const src={v:1,races:21,wins:6,track:'sky',
  best:{lapMs:9,raceMs:50,sky_b:41,harbor_b:42,skyway_b:43,beach_b:44,beach_b4:55},
  kart:{body:3,paint:1,finish:0,wheels:0,trail:1,decal:1,emblem:7,emblemColor:4,marker:6,markerColor:8,markerFx:2},
  settings:{difficulty:'medium',trackDifficulty:{skyway:'extreme',beach:'easy'},sound:true,voice:true,quality:'auto',engine:7,fps:false}};
 localStorage.setItem(KEY,JSON.stringify(src));
 const a=load();
 assert.deepEqual(v6View(a),{
  best:src.best,emblem:7,emblemColor:4,marker:6,markerColor:8,markerFx:2,
  trackDifficulty:src.settings.trackDifficulty,races:21,wins:6
 });
 assert.equal(save(a),true);
 const b=load();
 assert.deepEqual(v6View(b),v6View(a));
 assert.equal(b.kart.body,3);
});
