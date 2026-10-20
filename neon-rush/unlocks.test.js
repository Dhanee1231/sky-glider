// Unit tests for every M7 unlock rule, plus the never-relock and NEW-badge checks.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sane, FRIENDS, CUPS, DIFFS} from './save.js';
import {applyUnlocks, checkRaceEnd, checkCupEnd, heartProgress, newBadges, noteViewed, isNew, VOICE_IDS, VOICE} from './unlocks.js';

const SIX=['Pip','Mochi','Bolt','Kiki','Coco','Shelly'];
const EARLY=['Pip','Mochi','Bolt','Kiki','Coco'];
function blank(extra){return sane(Object.assign({v:1,wins:0,races:0},extra));}
function names(list){return list.map(u=>u.kind+':'+u.id);}
function voicesOf(list){return list.flatMap(u=>u.voice);}

test('Pip through Coco: finish ahead once, and not when you finish behind',()=>{
 for(const level of['easy','medium','hard','extreme']){
  for(const name of EARLY){
   const no=blank();
   assert.deepEqual(names(checkRaceEnd(no,{trackId:'sky',level,place:4,ahead:EARLY.filter(n=>n!==name)})).filter(s=>s==='racer:'+name),[]);
   assert.equal(no.own.racers.includes(name),false);
   const yes=blank();
   const got=checkRaceEnd(yes,{trackId:'harbor',level,place:2,ahead:[name]});
   assert.ok(names(got).includes('racer:'+name));
   assert.equal(yes.own.racers.includes(name),true);
   assert.equal(yes.beat[name],true);
  }
 }
});

test('Shelly is last: ahead of her alone does not open her, the other five do not either',()=>{
 const only=blank();
 assert.equal(names(checkRaceEnd(only,{trackId:'sky',level:'hard',ahead:['Shelly']})).includes('racer:Shelly'),false);
 assert.equal(only.beat.Shelly,true);assert.equal(only.own.racers.includes('Shelly'),false);
 const five=blank();
 checkRaceEnd(five,{trackId:'sky',level:'easy',ahead:EARLY});
 assert.deepEqual(five.own.racers,EARLY);
 assert.equal(five.own.racers.includes('Shelly'),false);
});

test('Shelly opens once she has been beaten and the other five are beaten',()=>{
 const st=blank();
 checkRaceEnd(st,{trackId:'sky',level:'extreme',ahead:['Shelly']});
 assert.equal(st.own.racers.includes('Shelly'),false);
 const got=checkRaceEnd(st,{trackId:'beach',level:'medium',ahead:EARLY});
 assert.ok(names(got).includes('racer:Shelly'));
 assert.equal(st.own.racers.includes('Shelly'),true);
 const same=blank();
 const all=checkRaceEnd(same,{trackId:'skyway',level:'hard',ahead:[...EARLY,'Shelly']});
 assert.ok(names(all).includes('racer:Shelly'));
 assert.deepEqual(same.own.racers,SIX);
});

test('Sprinkle: any Star trophy, including a 0 vs 1 boundary, and not a Heart trophy',()=>{
 const no=blank();
 checkCupEnd(no,{cup:'star',level:'easy',trophy:0});
 assert.equal(no.own.racers.includes('Sprinkle'),false);
 const heart=blank();
 checkCupEnd(heart,{cup:'heart',level:'extreme',place:1});
 assert.equal(heart.own.racers.includes('Sprinkle'),false);
 for(const level of DIFFS){
  const yes=blank();
  const got=checkCupEnd(yes,{cup:'star',level,place:3});   // bronze is a trophy
  assert.ok(names(got).includes('racer:Sprinkle'),level);
  assert.equal(yes.cups.star[level]>=1,true);
 }
});

test('Ember: any Heart trophy, and a Star trophy does not open her',()=>{
 const no=blank();
 checkCupEnd(no,{cup:'heart',level:'medium',trophy:0});
 assert.equal(no.own.racers.includes('Ember'),false);
 const star=blank();
 checkCupEnd(star,{cup:'star',level:'easy',trophy:3});
 assert.equal(star.own.racers.includes('Ember'),false);
 const yes=blank();
 assert.ok(names(checkCupEnd(yes,{cup:'heart',level:'hard',place:2})).includes('racer:Ember'));
});

test('Pebble: 19 races stays locked, 20 opens her, on every level',()=>{
 const no=blank();no.races=19;
 assert.equal(names(checkRaceEnd(no,{trackId:'beach',level:'extreme',ahead:[]})).includes('racer:Pebble'),false);
 const yes=blank();yes.races=20;
 assert.ok(names(checkRaceEnd(yes,{trackId:'sky',level:'easy',ahead:[]})).includes('racer:Pebble'));
 const mid=blank();mid.races=20;
 assert.ok(names(checkRaceEnd(mid,{trackId:'harbor',level:'hard',ahead:[]})).includes('racer:Pebble'));
});

test('Twinkle: Rainbow silver stays locked, Rainbow gold on any level opens her',()=>{
 const no=blank();
 checkCupEnd(no,{cup:'rainbow',level:'extreme',trophy:2});
 assert.equal(no.own.racers.includes('Twinkle'),false);
 const other=blank();
 checkCupEnd(other,{cup:'star',level:'easy',trophy:3});
 assert.equal(other.own.racers.includes('Twinkle'),false);
 for(const level of DIFFS){
  const yes=blank();
  assert.ok(names(checkCupEnd(yes,{cup:'rainbow',level,place:1})).includes('racer:Twinkle'),level);
 }
});

test('Candy Cruiser: a beach finish does not open it, the first candy finish does',()=>{
 const no=blank();
 assert.equal(names(checkRaceEnd(no,{trackId:'beach',level:'hard',ahead:[]})).includes('kart:Candy Cruiser'),false);
 assert.equal(no.trackDone.beach,1);assert.equal(no.trackDone.candy||0,0);
 const yes=blank();
 assert.ok(names(checkRaceEnd(yes,{trackId:'candy',level:'extreme',ahead:[],place:5})).includes('kart:Candy Cruiser'));
 assert.equal(yes.trackDone.candy,1);
});

test('Heart Racer: 4 wins stays locked with 4 dots, 5 wins opens it',()=>{
 const no=blank();no.wins=4;
 assert.deepEqual(heartProgress(no),{have:4,need:5,done:false});
 assert.equal(names(checkRaceEnd(no,{trackId:'sky',level:'medium',ahead:[]})).includes('kart:Heart Racer'),false);
 const yes=blank();yes.wins=5;
 assert.deepEqual(heartProgress(yes),{have:5,need:5,done:true});
 assert.ok(names(checkRaceEnd(yes,{trackId:'skyway',level:'easy',ahead:[]})).includes('kart:Heart Racer'));
});

test('Star Comet: silver in every cup stays locked, gold in any one cup opens it',()=>{
 const no=blank();
 checkCupEnd(no,{cup:'star',level:'easy',trophy:2});
 const no2=blank();no2.cups.star.easy=2;no2.cups.heart.hard=2;no2.cups.rainbow.extreme=2;
 assert.equal(names(applyUnlocks(no2)).includes('kart:Star Comet'),false);
 for(const cup of CUPS){
  const yes=blank();
  assert.ok(names(checkCupEnd(yes,{cup,level:'extreme',place:1})).includes('kart:Star Comet'),cup);
 }
});

test('Dragon Jet: a trophy in two cups stays locked, a trophy in all three opens it',()=>{
 const no=blank();
 checkCupEnd(no,{cup:'star',level:'easy',place:3});
 checkCupEnd(Object.assign(no,{cupRun:{cup:'heart',level:'easy',race:0}}),{cup:'heart',level:'hard',trophy:1});
 assert.equal(no.own.karts.includes('Dragon Jet'),false);
 assert.equal(no.own.karts.includes('Star Comet'),false);   // bronze is not gold
 const yes=blank();
 checkCupEnd(yes,{cup:'star',level:'extreme',place:2});
 checkCupEnd(yes,{cup:'heart',level:'easy',trophy:1});
 const got=checkCupEnd(yes,{cup:'rainbow',level:'medium',place:3});
 assert.ok(names(got).includes('kart:Dragon Jet'));
});

test('never relocks a racer or a kart after the condition is gone',()=>{
 const st=blank();
 st.races=20;st.wins=5;
 for(const n of FRIENDS)st.beat[n]=true;
 st.cups.star.easy=1;st.cups.heart.hard=1;st.cups.rainbow.extreme=3;
 const first=checkRaceEnd(st,{trackId:'candy',level:'hard',ahead:[]});
 assert.ok(first.length>=4);
 const racers=st.own.racers.slice(),karts=st.own.karts.slice();
 assert.ok(racers.includes('Pebble')&&racers.includes('Sprinkle')&&racers.includes('Ember')&&racers.includes('Twinkle')&&racers.includes('Shelly'));
 assert.ok(karts.includes('Heart Racer')&&karts.includes('Candy Cruiser')&&karts.includes('Star Comet')&&karts.includes('Dragon Jet'));
 st.races=0;st.wins=0;
 for(const n of FRIENDS)st.beat[n]=false;
 for(const c of CUPS)for(const d of DIFFS)st.cups[c][d]=0;
 st.trackDone={};
 const again=checkRaceEnd(st,{trackId:'beach',level:'easy',ahead:[]});
 assert.deepEqual(again,[]);
 assert.deepEqual(st.own.racers,racers);
 assert.deepEqual(st.own.karts,karts);
 assert.equal(applyUnlocks(st).length,0);
 assert.deepEqual(st.own.racers,racers);
 assert.deepEqual(st.own.karts,karts);
});

test('a v6 save with wins>=5 and races>=20 badges the six friends, Pebble and Heart Racer once',()=>{
 const st=sane({v:1,wins:5,races:20});
 assert.deepEqual(st.own.racers,[...SIX,'Pebble']);
 assert.deepEqual(st.own.karts,['Heart Racer']);
 const shown=newBadges(st).map(b=>b.kind+':'+b.id);
 for(const name of [...SIX,'Pebble'])assert.ok(shown.includes('racer:'+name),name);
 assert.ok(shown.includes('kart:Heart Racer'));
 assert.equal(shown.includes('racer:Sprinkle'),false);
 assert.equal(shown.includes('kart:Candy Cruiser'),false);
 const viewedR=noteViewed(st,'racer');
 assert.deepEqual(viewedR,[...SIX,'Pebble']);
 assert.equal(isNew(st,'racer','Pip'),false);
 assert.equal(isNew(st,'kart','Heart Racer'),true);   // the kart tab was not viewed
 const viewedK=noteViewed(st,'kart');
 assert.deepEqual(viewedK,['Heart Racer']);
 assert.deepEqual(newBadges(st),[]);
});

test('cup gold is kept when a later cup finish is worse',()=>{
 const st=blank();
 checkCupEnd(st,{cup:'star',level:'easy',place:1});
 checkCupEnd(st,{cup:'star',level:'easy',place:3});
 assert.equal(st.cups.star.easy,3);
 assert.equal(st.own.karts.includes('Star Comet'),true);
});

test('every unlock voice id is a listed Kokoro af_heart clip id',()=>{
 const st=blank();
 st.races=20;st.wins=5;
 for(const n of FRIENDS)st.beat[n]=true;
 st.cups.star.easy=1;st.cups.heart.easy=1;st.cups.rainbow.easy=3;
 const got=checkRaceEnd(st,{trackId:'candy',level:'extreme',ahead:[]});
 const used=new Set(voicesOf(got));
 assert.ok(used.size>=8);
 for(const id of used){
  assert.ok(VOICE_IDS.includes(id),id);
  assert.match(id,/^u_/);
 }
 assert.equal(VOICE.newRacer,'u_new_racer');
 assert.equal(VOICE.newKart,'u_new_kart');
 assert.equal(new Set(VOICE_IDS).size,VOICE_IDS.length);
});

test('no live voice synthesis API anywhere in neon-rush',()=>{
 const root=dirname(fileURLToPath(import.meta.url));
 const banned=['speech','Synthesis'].join('');
 const files=[];
 (function walk(dir){
  for(const name of readdirSync(dir)){
   if(name==='vendor'||name==='audio')continue;
   const p=join(dir,name);
   if(statSync(p).isDirectory())walk(p);
   else if(/\.(js|html|css)$/.test(name))files.push(p);
  }
 })(root);
 assert.ok(files.length>10);
 for(const p of files)assert.equal(readFileSync(p,'utf8').includes(banned),false,p);
});
