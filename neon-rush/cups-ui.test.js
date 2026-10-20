// Static checks for the M7-4 cup screens. The browser fit run covers pixels; this locks the wiring.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LINES, VOICE_IDS} from './cups.js';

const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('./main.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('./ui.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('./sw.js',import.meta.url),'utf8');
const slice=(src,id)=>{const i=src.indexOf('id="'+id+'"');assert.ok(i>0,id);return src.slice(i,src.indexOf('</div></div>',i)+12);};

test('cup end, ribbon path, and trophy shelf keep Home, Settings, Race again, and Next',()=>{
 const end=slice(html,'cupEnd'),shelf=slice(html,'cupShelf');
 for(const block of[end,shelf]){
  assert.match(block,/Race again/);
  assert.match(block,/>Next</);
  assert.match(block,/>Home</);
  assert.match(block,/>Settings</);
  assert.match(block,/aria-label="Settings"/);
 }
 assert.match(html,/id="btnCups"/);
 assert.match(html,/>Cups</);
 assert.match(html,/id="btnHomeCup"/);
 assert.match(html,/id="btnSetCup"/);
 assert.match(html,/body:has\([^)]*#cupSel\.show[^)]*#cupEnd\.show[^)]*#cupShelf\.show\)/);
 assert.match(html,/min-height:48px/);
 assert.match(html,/#cupEnd\{[^}]*rgba\(16,6,34,\.72\)/);
 assert.doesNotMatch(end+shelf,/\b(lose|lost|losing|game over)\b/i);
 assert.doesNotMatch(ui,/\b(lose|lost|losing|game over)\b/i);
});

test('cup races score through cups.js and a missing candy track stands in for Sunny Shores',()=>{
 assert.match(main,/from '\.\/cups\.js'/);
 assert.match(main,/recordRace\(/);
 assert.match(main,/standInTrack\(/);
 assert.match(main,/registerTrack\(t\.id\)/);
 assert.match(main,/\.\.\.CUP_VOICE/);
 assert.match(main,/showCupBetween/);
 assert.match(main,/showCupPodium/);
 assert.match(main,/showCupRibbon/);
 assert.match(main,/Candy Crystal Peaks is on its way\. Racing Sunny Shores this time!/);
 assert.match(main,/forceNight&&\(mode==='race'\|\|mode==='count'\|\|mode==='paused'\|\|mode==='finish'\)/);
 assert.doesNotMatch(main,/tracks\/candy\.js/);
 assert.doesNotMatch(main,/cupRun\.race=Math\.min/);
 assert.match(ui,/btnCups/);
 assert.match(ui,/showCupSelect/);
 assert.match(ui,/c_cup_star/);
 assert.deepEqual(VOICE_IDS,['c_gold','c_silver','c_bronze','c_ribbon','c_cup_star','c_cup_heart','c_cup_rainbow','c_rainbow_lock']);
 assert.equal(LINES.c_gold,'Gold trophy!');
 assert.equal(LINES.c_ribbon,'Cup Racer! Great racing!');
 assert.equal(LINES.c_rainbow_lock,'Win a trophy in Star Cup and Heart Cup!');
});

test('service worker still caches neon-rush-v6 and lists cups.js',()=>{
 assert.match(sw,/const CACHE='neon-rush-v6'/);
 assert.match(sw,/SHELL\.push\("cups\.js"\)/);
 assert.doesNotMatch(sw,/neon-rush-v7/);
});
