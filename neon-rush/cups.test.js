// Node tests for neon-rush/cups.js. Points, tie-break, trophies, Rainbow lock, cupRun resume, candy stub, v6 rollback.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {sane, save, load, KEY, DIFFS, CUPS} from './save.js';
import {
 POINTS, LINES, VOICE_IDS, CUP_DEFS, FIELD,
 pointsForPlace, awardFor, raceCheer, rankStandings, rainbowOpen, startCup, recordRace,
 currentRace, snapshotRun, restoreRun, registerTrack, resetTrackFeatures, candyFeature,
 standInTrack, listCups, shelfRows, trophyLabel
} from './cups.js';

const root=dirname(fileURLToPath(import.meta.url));
const NAMES=['You','Pip','Mochi','Bolt','Kiki','Coco','Shelly'];
function blank(){return sane({v:1,wins:0,races:0});}
function places(youPlace){
 const out=[];let n=1;
 for(const name of NAMES){
  if(name==='You')out.push({name,place:youPlace});
  else{if(n===youPlace)n++;out.push({name,place:n});n++;}
 }
 return out;
}
function runCup(st,cup,level,youPlace){
 const spec=startCup(st,cup,level);
 assert.ok(spec,cup+' '+level);
 let rec=null;
 for(let i=0;i<3;i++)rec=recordRace(st,places(youPlace));
 return rec;
}

test('points table is 10/8/6/5/4/3/2 for places 1 through 7',()=>{
 assert.deepEqual(POINTS,[10,8,6,5,4,3,2]);
 for(let p=1;p<=7;p++)assert.equal(pointsForPlace(p),POINTS[p-1],String(p));
 assert.equal(pointsForPlace(0),0);
 assert.equal(pointsForPlace(8),0);
});

test('standings order follows points, and a tie breaks to the better last race',()=>{
 const distinct=rankStandings([
  {name:'You',points:18,last:4},{name:'Pip',points:30,last:1},{name:'Mochi',points:24,last:2},
  {name:'Bolt',points:6,last:7},{name:'Kiki',points:15,last:3},{name:'Coco',points:12,last:5},{name:'Shelly',points:9,last:6}
 ]);
 assert.deepEqual(distinct.map(r=>r.name),['Pip','Mochi','You','Kiki','Coco','Shelly','Bolt']);
 assert.deepEqual(distinct.map(r=>r.rank),[1,2,3,4,5,6,7]);
 const tied=rankStandings([
  {name:'You',points:20,last:4},{name:'Pip',points:20,last:2},{name:'Mochi',points:14,last:1}
 ]);
 assert.deepEqual(tied.map(r=>r.name),['Pip','You','Mochi']);
 assert.equal(tied[0].rank,1);
 assert.equal(tied[1].rank,2);
});

test('a tied total across two races uses the second race as the last race',()=>{
 const st=blank();
 startCup(st,'star','easy');
 recordRace(st,places(1));                 // You 10, Pip 8
 const mid=recordRace(st,places(2));       // You 8 more = 18, Pip 10 more = 18; Pip won the last race
 assert.equal(mid.done,false);
 assert.equal(mid.table[0].name,'Pip');
 assert.equal(mid.table[1].name,'You');
 assert.equal(mid.table[0].points,18);
 assert.equal(mid.table[1].points,18);
});

test('trophy from final place is gold, silver, bronze, then Cup Racer for 4th through 7th',()=>{
 const expect=[[1,3,'gold',false],[2,2,'silver',false],[3,1,'bronze',false]];
 for(const [place,trophy,kind,ribbon] of expect){
  const o=awardFor(place);
  assert.equal(o.trophy,trophy);
  assert.equal(o.kind,kind);
  assert.equal(o.ribbon,ribbon);
  assert.equal(o.cheer,LINES[o.voice]);
 }
 for(const place of [4,5,6,7]){
  const o=awardFor(place);
  assert.equal(o.trophy,0);
  assert.equal(o.kind,'ribbon');
  assert.equal(o.ribbon,true);
  assert.equal(o.title,'Cup Racer');
  assert.equal(o.cheer,'Cup Racer! Great racing!');
  assert.equal(o.voice,'c_ribbon');
 }
});

test('QA-2 places 4-7 always map to the ribbon cheer and no result says lose or game over',()=>{
 const blobs=[];
 for(let p=1;p<=7;p++){
  const cup=awardFor(p),race=raceCheer(p);
  blobs.push(JSON.stringify(cup),JSON.stringify(race));
  if(p>=4){
   assert.equal(cup.ribbon,true);
   assert.equal(race.ribbon,true);
   assert.equal(race.kind,'ribbon');
   assert.equal(race.cheer,LINES.c_ribbon);
  }
 }
 const src=readFileSync(join(root,'cups.js'),'utf8')+blobs.join('\n')+JSON.stringify(LINES);
 assert.equal(/\b(lose|lost|losing|game over)\b/i.test(src),false);
});

test('best trophy is kept per cup per level and a worse finish does not downgrade it',()=>{
 const st=blank();
 const gold=runCup(st,'star','easy',1);
 assert.equal(gold.done,true);
 assert.equal(gold.place,1);
 assert.equal(gold.outcome.trophy,3);
 assert.equal(st.cupRun,null);
 assert.equal(st.cups.star.easy,3);
 assert.equal(st.cups.star.medium,0);
 const bronze=runCup(st,'star','easy',3);
 assert.equal(bronze.outcome.trophy,1);
 assert.equal(st.cups.star.easy,3);          // gold stays
 const silver=runCup(st,'star','hard',2);
 assert.equal(st.cups.star.hard,2);
 assert.equal(st.cups.star.easy,3);
 const ribbon=runCup(st,'heart','extreme',6);
 assert.equal(ribbon.outcome.kind,'ribbon');
 assert.equal(st.cups.heart.extreme,0);
 assert.equal(trophyLabel(0),'Ready!');
 assert.equal(trophyLabel(st.cups.star.easy),'Gold');
});

test('Rainbow stays locked until Star and Heart each have a trophy, on any level',()=>{
 const st=blank();
 assert.equal(rainbowOpen(st),false);
 assert.equal(startCup(st,'rainbow','easy'),null);
 assert.equal(st.cupRun,null);
 runCup(st,'star','extreme',4);              // ribbon, not a trophy
 assert.equal(rainbowOpen(st),false);
 runCup(st,'star','medium',1);               // gold star only
 assert.equal(rainbowOpen(st),false);
 assert.equal(startCup(st,'rainbow','hard'),null);
 runCup(st,'heart','easy',7);                // ribbon does not count
 assert.equal(rainbowOpen(st),false);
 runCup(st,'heart','hard',3);                // bronze is enough
 assert.equal(rainbowOpen(st),true);
 const go=startCup(st,'rainbow','extreme');
 assert.equal(go.cup,'rainbow');
 assert.equal(go.level,'extreme');
 assert.equal(go.index,0);
});

test('cup defs are Star, Heart, Rainbow with the planned tracks and night flags',()=>{
 assert.deepEqual(CUP_DEFS.star.races.map(r=>r.track+':'+(r.night?1:0)),['sky:0','harbor:0','skyway:0']);
 assert.deepEqual(CUP_DEFS.heart.races.map(r=>r.track+':'+(r.night?1:0)),['beach:0','candy:0','harbor:1']);
 assert.deepEqual(CUP_DEFS.rainbow.races.map(r=>r.track+':'+(r.night?1:0)),['skyway:1','candy:1','beach:1']);
 const st=blank();
 const star=startCup(st,'star','medium');
 assert.equal(star.name,'Neon Sky City');
 assert.equal(star.night,false);
 recordRace(st,places(1));
 assert.equal(currentRace(st).name,'Glowtide Harbor');
 recordRace(st,places(1));
 assert.equal(currentRace(st).name,'Arcade Skyway');
});

test('candy is track id candy behind a feature check, and a stub drives Sunny Shores',()=>{
 resetTrackFeatures();
 assert.equal(candyFeature(),false);
 const st=blank();
 startCup(st,'heart','easy');
 recordRace(st,places(2));
 const candy=currentRace(st);
 assert.equal(candy.track,'candy');
 assert.equal(candy.stub,true);
 assert.equal(candy.name,'Candy Crystal Peaks');
 assert.equal(standInTrack('candy'),'beach');
 assert.equal(standInTrack('sky'),'sky');
 registerTrack('candy');
 assert.equal(candyFeature(),true);
 const live=currentRace(st);
 assert.equal(live.track,'candy');
 assert.equal(live.stub,false);
 assert.equal(standInTrack('candy'),'candy');
 const night=startCup(blank(),'heart','easy');
 assert.equal(night.stub,false);
 resetTrackFeatures();
 const again=currentRace(st);
 assert.equal(again.stub,true);
 assert.equal(again.track,'candy');
 resetTrackFeatures();
});

test('resume: cupRun saved after race 1 and race 2 reloads the same race and points, then null at the podium',()=>{
 const store=new Map();
 globalThis.localStorage={
  getItem:k=>store.has(k)?store.get(k):null,
  setItem:(k,v)=>{store.set(k,String(v));},
  removeItem:k=>store.delete(k)
 };
 const st=blank();
 st.races=12;st.wins=3;st.best.sky_b=40.5;st.kart.emblem=4;
 startCup(st,'star','hard');
 const snap0=snapshotRun(st);
 recordRace(st,places(1));
 assert.equal(st.cupRun.race,1);
 assert.equal(st.cupRun.pts.You,10);
 assert.equal(st.cupRun.pts.Pip,8);
 assert.equal(save(st),true);
 const mid=load();
 assert.equal(mid.cupRun.cup,'star');
 assert.equal(mid.cupRun.level,'hard');
 assert.equal(mid.cupRun.race,1);
 assert.equal(mid.cupRun.pts.You,10);
 assert.equal(mid.cupRun.pts.Pip,8);
 assert.equal(mid.races,12);
 assert.equal(mid.wins,3);
 assert.equal(mid.best.sky_b,40.5);
 assert.equal(mid.kart.emblem,4);
 recordRace(mid,places(3));
 assert.equal(mid.cupRun.race,2);
 assert.equal(mid.cupRun.pts.You,10+6);
 assert.equal(save(mid),true);
 const mid2=load();
 assert.equal(mid2.cupRun.race,2);
 assert.deepEqual(mid2.cupRun.pts,mid.cupRun.pts);
 assert.equal(mid2.races,12);
 const end=recordRace(mid2,places(1));
 assert.equal(end.done,true);
 assert.equal(mid2.cupRun,null);
 assert.equal(save(mid2),true);
 const done=load();
 assert.equal(done.cupRun,null);
 assert.equal(done.cups.star.hard>=1,true);
 assert.equal(done.races,12);
 assert.equal(done.wins,3);
 assert.equal(done.best.sky_b,40.5);
 assert.equal(restoreRun(done,snap0),true);
 assert.equal(done.cupRun.race,0);
 assert.deepEqual(done.cupRun.pts,{});
 assert.equal(done.cups.star.hard>=1,true);   // restoring a run does not wipe the trophy
});

test('QA-1 a v6 save.js still loads a v7 save that has cups and cupRun',async()=>{
 const src=execFileSync('git',['show','5b36aaa:neon-rush/save.js'],{encoding:'utf8'});
 assert.match(src,/body:4/);
 const dir=mkdtempSync(join(tmpdir(),'nr-v6-cups-'));
 const file=join(dir,'save.js');
 writeFileSync(file,src);
 const old=await import(pathToFileURL(file).href);
 const store=new Map();
 globalThis.localStorage={
  getItem:k=>store.has(k)?store.get(k):null,
  setItem:(k,v)=>{store.set(k,String(v));},
  removeItem:k=>store.delete(k)
 };
 const pre={v:1,races:9,wins:2,track:'harbor',
  best:{lapMs:6,raceMs:40,sky_b:21,harbor_b:22.5,beach_b:23},
  kart:{body:1,paint:3,emblem:6,emblemColor:2,marker:5,markerColor:8,markerFx:2},
  settings:{difficulty:'extreme',trackDifficulty:{beach:'hard',sky:'medium'},sound:true,voice:true,quality:'auto',engine:7}};
 assert.equal(old.save(pre),true);
 const upgraded=load();
 assert.equal(upgraded.races,9);
 assert.equal(upgraded.wins,2);
 assert.equal(upgraded.best.sky_b,21);
 assert.equal(upgraded.best.harbor_b,22.5);
 assert.equal(upgraded.best.beach_b,23);
 assert.equal(upgraded.kart.emblem,6);
 assert.equal(upgraded.settings.trackDifficulty.beach,'hard');
 assert.equal(upgraded.cups.star.easy,0);
 assert.equal(upgraded.cupRun,null);
 runCup(upgraded,'star','easy',2);
 startCup(upgraded,'heart','medium');
 recordRace(upgraded,places(4));
 assert.equal(save(upgraded),true);
 const written=JSON.parse(localStorage.getItem(KEY));
 assert.equal(written.races,9);
 assert.equal(written.wins,2);
 assert.ok(written.cups);
 assert.equal(written.cups.star.easy,2);
 assert.ok(written.cupRun);
 assert.equal(written.cupRun.cup,'heart');
 assert.equal(written.cupRun.race,1);
 const back=old.sane(written);
 assert.equal(back.v,1);
 assert.equal(back.races,9);
 assert.equal(back.wins,2);
 assert.equal(back.best.sky_b,21);
 assert.equal(back.best.harbor_b,22.5);
 assert.equal(back.best.beach_b,23);
 assert.equal(back.best.lapMs,6);
 assert.equal(back.best.raceMs,40);
 assert.equal(back.kart.emblem,6);
 assert.equal(back.kart.emblemColor,2);
 assert.equal(back.kart.marker,5);
 assert.equal(back.kart.markerColor,8);
 assert.equal(back.kart.markerFx,2);
 assert.equal(back.settings.difficulty,'extreme');
 assert.equal(back.settings.trackDifficulty.beach,'hard');
 assert.equal(back.settings.trackDifficulty.sky,'medium');
 assert.equal(back.cups.star.easy,2);       // unknown to v6, left in place
 assert.equal(back.cupRun.cup,'heart');
 assert.equal(back.cupRun.race,1);
 assert.equal(back.cupRun.pts.You,5);
 const live=old.load();
 assert.equal(live.races,9);
 assert.equal(live.wins,2);
 assert.equal(live.best.beach_b,23);
 assert.equal(live.cups.star.easy,2);
});

test('list and shelf read the kept trophy and the service worker still caches neon-rush-v6 plus cups.js',()=>{
 const st=blank();
 runCup(st,'star','easy',1);
 const cards=listCups(st,'easy');
 assert.deepEqual(cards.map(c=>c.id),CUPS);
 assert.equal(cards[0].trophy,3);
 assert.equal(cards[0].open,true);
 assert.equal(cards[2].open,false);
 assert.equal(cards[2].lockLine,LINES.c_rainbow_lock);
 const shelf=shelfRows(st);
 assert.equal(shelf[0].levels.find(l=>l.level==='easy').label,'Gold');
 assert.equal(shelf[0].levels.find(l=>l.level==='hard').label,'Ready!');
 const sw=readFileSync(join(root,'sw.js'),'utf8');
 assert.match(sw,/const CACHE='neon-rush-v6'/);
 assert.match(sw,/SHELL\.push\("cups\.js"\)/);
 assert.equal(sw.includes('neon-rush-v7'),false);
});

test('every new cup line is a clip id and the field roster stays the seven racers',()=>{
 assert.equal(new Set(VOICE_IDS).size,VOICE_IDS.length);
 for(const id of VOICE_IDS)assert.equal(typeof LINES[id],'string');
 assert.equal(LINES.c_gold,'Gold trophy!');
 assert.equal(LINES.c_silver,'Silver trophy!');
 assert.equal(LINES.c_bronze,'Bronze trophy!');
 assert.equal(LINES.c_ribbon,'Cup Racer! Great racing!');
 assert.deepEqual(FIELD,NAMES);
 for(const d of DIFFS)assert.equal(startCup(blank(),'nope',d),null);
 assert.equal(recordRace(blank(),places(1)),null);
});
