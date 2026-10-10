// Gem Tiles: main app (screens, rewards, game engine, custom songs).
(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const A = window.TAudio, Art = window.Art, AN = window.TileAnalyze;
const KEY = 'gemtiles-v1';
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

// ---------- catalog of rewards ----------
const SHOP = {
  skin: [['pinkgem', 'Pink Heart Gem', 0], ['hearts', 'Ruby Hearts', 60], ['stars', 'Gold Stars', 60], ['diamonds', 'Diamonds', 90], ['bubbles', 'Lilac Pearls', 90], ['crowns', 'Royal Crowns', 140], ['mix', 'Gem Mix', 160], ['candy', 'Mint Candy', 110], ['neon', 'Neon Glow', 180]],
  glitter: [['pink', 'Pink', 0], ['gold', 'Gold', 0], ['silver', 'Silver', 30], ['lilac', 'Lilac', 40], ['aqua', 'Aqua', 40], ['mint', 'Mint', 40], ['rainbow', 'Rainbow', 90]],
  frame: [['none', 'No frame', 0], ['silver', 'Silver frame', 0], ['gold', 'Gold frame', 70], ['rosegold', 'Rose-gold frame', 90], ['pearl', 'Pearl frame', 110]],
  theme: [['pinkgold', 'Pink & Gold', 0], ['moon', 'Moonlight', 0], ['ocean', 'Ocean', 0], ['candy', 'Candy', 0], ['galaxy', 'Galaxy', 60], ['rainbow', 'Rainbow', 60], ['festival', 'Bollywood Festival', 100], ['disco', 'Neon Disco', 120], ['rainbowroad', '🌈 Rainbow Road', 150], ['candyk', '🍭 Candy Kingdom', 80], ['neon', '🌃 Neon City Drive', 120], ['reef', '🐠 Underwater Reef', 90], ['volcano', '🌋 Volcano Valley', 110], ['ice', '❄️ Ice Castle', 90], ['jungle', '🌴 Jungle Temple', 100], ['cloudc', '☁️ Cloud Castle', 100]],
  outfit: [['none', 'Just Gigi', 0], ['bow', 'Pink bow', 0], ['tiara', 'Silver tiara', 50], ['glasses', 'Star glasses', 60], ['headphones', 'Headphones', 70], ['garland', 'Marigold garland', 80], ['bindi', 'Sparkle bindi', 40], ['wizard', 'Wizard hat', 100], ['crown', 'Golden crown', 200]]
};
const STICKERS = [['🦄', 'c'], ['🌈', 'c'], ['🍭', 'c'], ['🧁', 'c'], ['🐱', 'c'], ['🐰', 'c'], ['🦋', 'c'], ['🌸', 'c'], ['🍓', 'c'], ['🎀', 'c'], ['🐬', 'c'], ['🌟', 'c'], ['🍩', 'c'], ['🐼', 'c'], ['🌻', 'c'], ['🎈', 'c'], ['🐞', 'c'], ['🍉', 'c'], ['🐧', 'c'], ['🌙', 'c'],
  ['💎', 'r'], ['👸', 'r'], ['🧚', 'r'], ['🪷', 'r'], ['🪔', 'r'], ['🦚', 'r'], ['🎠', 'r'], ['🏰', 'r'], ['🫧', 'r'], ['🪩', 'r'],
  ['👑', 'g'], ['💖', 'g'], ['🏆', 'g'], ['🌠', 'g'], ['🐉', 'g'], ['🪄', 'g']];
const BADGES = [['first', '🎵', 'First song'], ['star3', '🌟', 'First 3 stars'], ['fc', '💯', 'First full combo'], ['crown', '👑', 'First crown'], ['p10', '🔟', '10 songs played'], ['p50', '🎶', '50 songs played'],
  ['combo50', '🔥', '50 combo'], ['combo100', '🚀', '100 combo'], ['hard', '💪', 'Clear a Hard song'], ['custom', '📀', 'Add your own song'], ['streak3', '📅', '3-day gift streak'], ['streak7', '🗓️', '7-day gift streak'],
  ['stick10', '📒', '10 stickers'], ['pu1', '🧲', 'First power-up'], ['puall', '🌟', 'All 6 power-ups'], ['rainbow', '🌈', 'Rainbow Blast!'], ['dodge25', '💨', 'Dodge 25 obstacles'], ['dodgeperfect', '🏎️', 'Dodge 5 + no misses'], ['golden', '✨', 'Golden sticker'], ['shop', '🛍️', 'First shop buy'], ['allstars', '🌌', '50 stars']];
// Hindi names (shop items by kind|id, badges by id, worlds by theme id)
const NAME_HI = { 'skin|pinkgem': 'गुलाबी दिल हीरा', 'skin|hearts': 'माणिक दिल', 'skin|stars': 'सुनहरे तारे', 'skin|diamonds': 'हीरे', 'skin|bubbles': 'बैंगनी मोती', 'skin|crowns': 'शाही मुकुट', 'skin|mix': 'हीरों का मेल', 'skin|candy': 'पुदीना कैंडी', 'skin|neon': 'नियॉन चमक',
  'glitter|pink': 'गुलाबी', 'glitter|gold': 'सुनहरी', 'glitter|silver': 'चाँदी', 'glitter|lilac': 'बैंगनी', 'glitter|aqua': 'आसमानी', 'glitter|mint': 'पुदीना', 'glitter|rainbow': 'इंद्रधनुष',
  'frame|none': 'कोई फ़्रेम नहीं', 'frame|silver': 'चाँदी का फ़्रेम', 'frame|gold': 'सोने का फ़्रेम', 'frame|rosegold': 'रोज़-गोल्ड फ़्रेम', 'frame|pearl': 'मोती का फ़्रेम',
  'outfit|none': 'बस गीगी', 'outfit|bow': 'गुलाबी रिबन', 'outfit|tiara': 'चाँदी का ताज', 'outfit|glasses': 'तारों वाला चश्मा', 'outfit|headphones': 'हेडफ़ोन', 'outfit|garland': 'गेंदे की माला', 'outfit|bindi': 'चमकीली बिंदी', 'outfit|wizard': 'जादूगर टोपी', 'outfit|crown': 'सोने का मुकुट',
  pinkgold: 'गुलाबी और सुनहरा', moon: 'चाँदनी', ocean: 'समुद्र', candy: 'कैंडी', galaxy: 'आकाशगंगा', rainbow: 'इंद्रधनुष आसमान', festival: 'बॉलीवुड त्योहार', disco: 'नियॉन डिस्को', rainbowroad: '🌈 इंद्रधनुष सड़क', candyk: '🍭 कैंडी राज्य', neon: '🌃 नियॉन शहर',
  reef: '🐠 समुद्र के नीचे', volcano: '🌋 ज्वालामुखी घाटी', ice: '❄️ बर्फ़ का महल', jungle: '🌴 जंगल मंदिर', cloudc: '☁️ बादलों का महल',
  'b|first': 'पहला गाना', 'b|star3': 'पहले 3 सितारे', 'b|fc': 'पहला फ़ुल कॉम्बो', 'b|crown': 'पहला मुकुट', 'b|p10': '10 गाने खेले', 'b|p50': '50 गाने खेले', 'b|combo50': '50 कॉम्बो', 'b|combo100': '100 कॉम्बो', 'b|hard': 'कठिन गाना जीता', 'b|custom': 'अपना गाना जोड़ा',
  'b|streak3': '3 दिन लगातार तोहफ़ा', 'b|streak7': '7 दिन लगातार तोहफ़ा', 'b|stick10': '10 स्टिकर', 'b|pu1': 'पहला पावर-अप', 'b|puall': 'सारे 6 पावर-अप', 'b|rainbow': 'इंद्रधनुष धमाका!', 'b|dodge25': '25 रुकावटों से बचे', 'b|dodgeperfect': '5 बचाव + कोई चूक नहीं', 'b|golden': 'सुनहरा स्टिकर', 'b|shop': 'पहली ख़रीदारी', 'b|allstars': '50 सितारे' };
const nm = (key, en) => (S.set.lang === 'hi' && NAME_HI[key]) || en;
const themeName = k => nm(k, (Art.THEMES[k] || {}).name || k);

// ---------- state ----------
const def = () => ({ v: 2, coins: 30, best: {}, plays: 0, owned: { skin: ['pinkgem'], glitter: ['pink', 'gold'], frame: ['none', 'silver'], theme: ['pinkgold', 'moon', 'ocean', 'candy'], outfit: ['none', 'bow'] },
  eq: { skin: 'pinkgem', glitter: 'pink', frame: 'silver', outfit: 'bow' }, songTheme: {}, stickers: {}, packs: 1, daily: { last: '', streak: 0 }, badges: {}, maxCombo: 0,
  set: { sound: true, beat: true, missFx: true, vis: 0, calibrated: false, offset: 0, lang: 'en', practice: false, diff: 'easy' } });
// v3: deep-merge nested objects so an old save can never wipe newer defaults (missing diff/lang used to crash/garble)
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
let S; try { const raw = JSON.parse(localStorage.getItem(KEY) || '{}'); S = isObj(raw) ? raw : {}; } catch (e) { S = {}; }
const hadV = S.v; S = Object.assign(def(), S); S.v = hadV || 1; { const D0 = def(); for (const k of ['set', 'owned', 'eq', 'daily']) S[k] = Object.assign(D0[k], isObj(S[k]) ? S[k] : {}); for (const k of ['best', 'songTheme', 'stickers', 'badges']) if (!isObj(S[k])) S[k] = {}; }
for (const k in def().owned) if (!Array.isArray(S.owned[k])) S.owned[k] = def().owned[k];
for (const k of Object.keys(Art.THEMES)) if (!S.owned.theme.includes(k)) S.owned.theme.push(k); // all worlds unlocked
if (S.v < 2) { S.v = 2; S.set = Object.assign({ missFx: true, vis: 0, calibrated: false }, S.set); } // migrations run oldest first
if (S.v < 3) { S.v = 3; S.set.speed = S.set.speed || 'slow'; }
if (S.v < 4) { S.v = 4; if (S.tut == null) S.tut = S.plays > 0 ? 1 : 0; if (S.set.calm == null) S.set.calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } // v4 (additive): tutorial flag, calm mode
if (!['easy', 'normal', 'hard'].includes(S.set.diff)) S.set.diff = 'easy'; if (!['en', 'hi'].includes(S.set.lang)) S.set.lang = 'en'; if (!Number.isFinite(+S.set.offset)) S.set.offset = 0;
// Sync model (v3b): judge time = heard song time - offset (sound test: audio-path lag + touch lag); tiles are drawn at judge time + vis
// (screen test: display lag + touch lag). So a tile crosses the strike line on screen exactly when a tap there is judged Perfect.
// Defaults until she runs the tap tests: Android ~30 ms tap / ~45 ms screen (touch + compositor), other devices ~20 ms screen.
{ const android = /Android/i.test(navigator.userAgent); if (!S.set.calibrated && android) S.set.offset = 30;
  if (!S.set.visCal && (!S.set.vis || S.set.vis === 10)) S.set.vis = android ? 45 : 20; } // 0/10 were the old uncalibrated defaults
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
A.muted = !S.set.sound;

// ---------- i18n (English / Hindi labels) ----------
const HI = { title: 'जेम टाइल्स', tag: 'संगीत के साथ चमकीली टाइलें टैप करो!', play: 'खेलो', gift: 'रोज़ का तोहफ़ा', addSong: 'मेरा गाना जोड़ो', shop: 'दुकान', album: 'स्टिकर', albumT: 'स्टिकर एल्बम', badges: 'बैज', closet: 'गीगी की अलमारी',
  easy: 'आसान', normal: 'सामान्य', hard: 'कठिन', practice: 'अभ्यास', settings: 'सेटिंग्स', sound: 'आवाज़', beat: 'मिस इफ़ेक्ट (चूक पर गाना थोड़ा धीमा)', sync: 'सिंक (टैप टाइमिंग)', calib: 'टैप टेस्ट से सिंक करो', calibT: 'टैप टेस्ट', start: 'शुरू', choose: 'गाना चुनो', mySong: 'मेरा गाना', name: 'नाम', pic: 'तस्वीर', color: 'रंग', theme: 'थीम',
  songSync: 'गाना सिंक', save: 'सेव', regen: 'नई टाइलें', del: 'हटाओ', paused: 'रुका हुआ', resume: 'खेलते रहो', restart: 'फिर से', quit: 'गाना रोको', outHearts: 'दिल ख़त्म!', outMsg: 'तुम बहुत अच्छा कर रही हो। जारी रखें?', cont: 'जारी रखो (अभ्यास)', finish: 'खत्म',
  addHow: 'इस फ़ोन से गाने की फ़ाइल चुनो। गाना फ़ोन से बाहर नहीं जाता।', calibHow: 'आवाज़ टेस्ट: हर क्लिक पर बड़े हीरे को टैप करो। स्क्रीन टेस्ट: जब गिरता दिल लाइन पर पहुँचे, तब टैप करो।', syncNote: 'अगर टाइलें जल्दी या देर से लगें तो टैप टेस्ट करो।',
  worlds: 'दुनिया', openPack: 'जादुई पैक खोलो', buyPack: '40 → 1 पैक', speedL: 'रफ़्तार', slow: 'धीमी', normalSp: 'सामान्य', fast: 'तेज़', obsL: 'रुकावटें', obsPL: 'अभ्यास में रुकावटें', puL: 'पावर-अप', shakeL: 'स्क्रीन हिलना',
  intL: 'पीछे की चमक', low: 'कम', med: 'मध्यम', high: 'ज़्यादा', fxL: 'इफ़ेक्ट आवाज़ें (टाइल टैप पर कभी नहीं)', fxVolL: 'इफ़ेक्ट की आवाज़', labBtn: 'टेस्ट लैब', on: 'चालू', off: 'बंद', visL: 'स्क्रीन ऑफ़सेट', calmL: 'शांत मोड (कम चमक-दमक)', howTo: 'कैसे खेलें',
  privacy: 'जेम टाइल्स में कोई विज्ञापन, लिंक या ख़रीदारी नहीं है। तुम्हारे गाने इसी फ़ोन पर रहते हैं।', calStart: 'आवाज़ टेस्ट', calVis: 'स्क्रीन टेस्ट', getReady: 'तैयार हो जाओ!', lab: 'टेस्ट लैब', legendTap: 'इन्हें टैप करो', legendDont: 'इन्हें मत छूना', skip: 'छोड़ो' };
const EN = {}; $$('[data-t]').forEach(e => { e.dataset.en = e.textContent; if (!(e.dataset.t in EN)) EN[e.dataset.t] = e.textContent; });
const tr = k => (S.set.lang === 'hi' && HI[k]) || EN[k] || k;
const applyLang = () => { document.documentElement.lang = S.set.lang; $$('[data-t]').forEach(e => e.textContent = (S.set.lang === 'hi' && HI[e.dataset.t]) || e.dataset.en); };
// strings made in JS: [English, Hindi]; a function value takes arguments
const TX = {
  practiceOn: ['💗 Practice: no hearts lost!', '💗 अभ्यास: कोई दिल नहीं जाएगा!'], practiceOff: ['Practice off', 'अभ्यास बंद'], earnMore: [n => `🔒 Earn ${n} more ⭐ to unlock!`, n => `🔒 खोलने के लिए ${n} और ⭐ जीतो!`],
  giftTomorrow: ['🎁 Come back tomorrow for another gift!', '🎁 कल फिर आना, एक और तोहफ़ा मिलेगा!'], giftTitle: ['Daily gift!', 'रोज़ का तोहफ़ा!'], giftPack: ['+ 1 mystery sticker pack 🎴', '+ 1 जादुई स्टिकर पैक 🎴'],
  giftDay: [n => `Day ${n} in a row 🔥 — come back tomorrow for more!`, n => `लगातार ${n} दिन 🔥 — कल और मिलेगा!`], yay: ['Yay!', 'वाह!'], needCoins: [n => `Need ${n} more 🪙 — play songs to earn coins!`, n => `${n} 🪙 और चाहिए — गाने खेलकर सिक्के जीतो!`],
  yours: [n => `✨ ${n} is yours!`, n => `✨ ${n} अब तुम्हारा है!`], themeHint: ['Pick it for any song with the 🎨 button on the song list, or it shows up automatically!', 'गानों की सूची में 🎨 बटन से इसे किसी भी गाने के लिए चुनो!'],
  packsHow: ['Earn packs with new ⭐ and 👑, or buy one with 🪙', 'नए ⭐ और 👑 से पैक जीतो, या 🪙 से ख़रीदो'], need40: ['Need 40 🪙', '40 🪙 चाहिए'], packTitle: ['Mystery pack!', 'जादुई पैक!'], golden: ['✨ GOLDEN sticker! ✨', '✨ सुनहरा स्टिकर! ✨'],
  rare: ['💜 A rare one!', '💜 एक दुर्लभ स्टिकर!'], cute: ['So cute!', 'कितना प्यारा!'], addAlbum: ['Add to album', 'एल्बम में लगाओ'], newBadge: [n => `New badge: ${n}!`, n => `नया बैज: ${n}!`], themeFor: ['Theme for this song', 'इस गाने की थीम'], done: ['Done', 'हो गया'],
  lockedTheme: ['🔒 Unlock this theme in the Shop', '🔒 यह थीम दुकान में खोलो'], couldNotLoad: ['Could not load that song', 'यह गाना नहीं खुल पाया'], saved: ['💾 Saved!', '💾 सेव हो गया!'], fresh: ['🔀 Fresh tiles made!', '🔀 नई टाइलें बन गईं!'], deleted: ['Deleted', 'हटा दिया'],
  delQ: ['Delete this song?', 'यह गाना हटाएँ?'], delYes: ['🗑️ Delete', '🗑️ हटाओ'], keepIt: ['Keep it', 'रहने दो'], loading: ['Loading…', 'लोड हो रहा है…'], warm: ['🎹 Warming up the band…', '🎹 बैंड तैयार हो रहा है…'], ready: ['Ready!', 'तैयार!'],
  remaking: ['Re-making tiles with the new beat finder…', 'नई बीट से टाइलें फिर बन रही हैं…'], gettingReady: ['Getting your song ready…', 'तुम्हारा गाना तैयार हो रहा है…'], updating: [n => `✨ Updating ${n} of your songs with the new beat finder…`, n => `✨ तुम्हारे ${n} गाने नई बीट से अपडेट हो रहे हैं…`],
  listen: ['Listen… tap on every click!', 'सुनो… हर क्लिक पर टैप करो!'], watch: ['Watch… tap when the gem lands on the line!', 'देखो… जब हीरा लाइन पर आए तब टैप करो!'], notEnough: ['Not enough taps — try again!', 'टैप कम हुए — फिर से करो!'],
  soundSynced: [n => `Sound synced! Tap offset ${n} ms ✨`, n => `आवाज़ सिंक हो गई! ${n} ms ✨`], screenSynced: [n => `Screen synced! Visual offset ${n} ms ✨`, n => `स्क्रीन सिंक हो गई! ${n} ms ✨`],
  tooBig: ['That file is too big (over 60 MB). Try a shorter song.', 'यह फ़ाइल बहुत बड़ी है (60 MB से ज़्यादा)। छोटा गाना चुनो।'], opening: ['🎧 Opening your song…', '🎧 तुम्हारा गाना खुल रहा है…'], listening: ['🎶 Listening to the music…', '🎶 संगीत सुना जा रहा है…'],
  finding: ['🥁 Finding the beat…', '🥁 बीट ढूँढ रहे हैं…'], making: ['💎 Making sparkly tiles…', '💎 चमकीली टाइलें बन रही हैं…'], doneAdd: ['Done!', 'हो गया!'], tooShort: ['That song is too short. Pick one longer than 8 seconds.', 'यह गाना बहुत छोटा है। 8 सेकंड से लंबा गाना चुनो।'],
  tooLong: ['That song is over 10 minutes. Pick a shorter one.', 'यह गाना 10 मिनट से लंबा है। छोटा गाना चुनो।'], cantPlay: ["Hmm, that file couldn't be played on this phone. Try an mp3 or m4a file.", 'यह फ़ाइल इस फ़ोन पर नहीं चल पाई। mp3 या m4a फ़ाइल आज़माओ।'],
  msg0: ['Keep practicing, you can do it! 💪', 'अभ्यास करते रहो, तुम कर सकती हो! 💪'], msg1: ['Nice playing! 🌸', 'बहुत अच्छा खेला! 🌸'], msg2: ['Wonderful! 💖', 'कमाल कर दिया! 💖'], msg3: ['SUPERSTAR! 👑', 'सुपरस्टार! 👑'],
  score: ['Score', 'स्कोर'], sPerfect: ['💖 Perfect', '💖 शानदार'], sGreat: ['✨ Great', '✨ बहुत बढ़िया'], sGood: ['👍 Good', '👍 अच्छा'], sMissed: ['🌧️ Missed', '🌧️ छूटे'], bestCombo: ['🔥 Best combo', '🔥 सबसे बड़ा कॉम्बो'],
  fullCombo: ['FULL COMBO!', 'फ़ुल कॉम्बो!'], newBest: ['NEW BEST!', 'नया रिकॉर्ड!'], openPackBtn: ['Open sticker pack', 'स्टिकर पैक खोलो'],
  packsWon: [n => `+${n} sticker pack${n > 1 ? 's' : ''} 🎴`, n => `+${n} स्टिकर पैक 🎴`], labRun: ['Lab run — not saved', 'लैब रन — सेव नहीं हुआ'],
  practiceStar: ['💗 Practice star!', '💗 अभ्यास का सितारा!'], firstClear: [e => `🎁 First clear! New sticker ${e}`, e => `🎁 पहली जीत! नया स्टिकर ${e}`],
  perfect: ['Perfect!', 'शानदार!'], great: ['Great!', 'बहुत बढ़िया!'], good: ['Good', 'अच्छा'], miss: ['Miss', 'चूक'], combo: [n => `${n} combo!`, n => `${n} कॉम्बो!`], comboWord: ['combo', 'कॉम्बो'], heartPlus: ['💗 +1', '💗 +1'],
  savedPop: ['🛡️ Saved!', '🛡️ बच गए!'], blocked: ['🛡️ Blocked!', '🛡️ रोक लिया!'], poof: ['Poof! 💨', 'पूफ़! 💨'], dodged: ['Dodged! +50', 'बच निकले! +50'], starPower: ['⭐ STAR POWER ⭐', '⭐ स्टार पावर ⭐'], go: ['Go!', 'चलो!'],
  slowHelp: ['🐢 Slow-mo help!', '🐢 धीमी मदद!'], mySong: ['📀 My song', '📀 मेरा गाना'], nextUnlock: [(h, n, s) => `⭐ ${h} / ${n} → ${s}`, (h, n, s) => `⭐ ${h} / ${n} → ${s}`], allUnlocked: ['🌟 All songs unlocked!', '🌟 सारे गाने खुल गए!'],
  wearing: ['✅ Wearing', '✅ पहना है'], yoursT: ['✅ Yours', '✅ तुम्हारा'], tapToUse: ['Tap to use', 'टैप करके लगाओ'], suggested: [(t, b) => `(suggested: ${t} for ${b} BPM)`, (t, b) => `(सुझाव: ${b} BPM के लिए ${t})`],
  edInfo: [(b, d, e, n, h) => `${b} BPM · ${d} · tiles: ${e} easy / ${n} normal / ${h} hard`, (b, d, e, n, h) => `${b} BPM · ${d} · टाइलें: ${e} आसान / ${n} सामान्य / ${h} कठिन`], nameIt: [' · Give it a name and a picture!', ' · इसे नाम और तस्वीर दो!'],
  labWorld: ['World', 'दुनिया'], labObs: ['Obstacle', 'रुकावट'], labPu: ['Power-up', 'पावर-अप'], labFx: ['Effects', 'इफ़ेक्ट'], labSong: ['Song', 'गाना'], labDiff: ['Difficulty', 'मुश्किल'], labDens: ['Spawn density', 'कितने आएँ'],
  labOwn: ["world's own", 'दुनिया वाले'], labMix: ['mix', 'मिला-जुला'], labGo: ['Preview', 'देखो'], sparse: ['few', 'कम'], normalD: ['normal', 'सामान्य'], dense: ['lots', 'ज़्यादा'], tapIt: ['tap it ✨', 'टैप करो ✨'], dontTap: ["don't tap", 'मत छूना'], tutDone: ['🎉 You know how to play!', '🎉 तुम्हें खेलना आ गया!'],
  legendTap: ['Tap these', 'इन्हें टैप करो'], legendDont: ["Don't touch these", 'इन्हें मत छूना'],
  nextSong: ['Next song', 'अगला गाना'], replay: ['Replay', 'फिर से'], songList: ['Songs', 'गाने'], homeBtn: ['Home', 'होम'], labBack: ['Lab', 'लैब'], stopped: ['Stopped early — not saved', 'बीच में रोका — सेव नहीं हुआ'],
  msgQuit: ['See you next time! 🌸', 'फिर मिलेंगे! 🌸'], combo2: ['Best combo', 'सबसे बड़ा कॉम्बो'], perfect2: ['Perfect', 'शानदार'], great2: ['Great', 'बढ़िया'], good2: ['Good', 'अच्छा'], missed2: ['Missed', 'छूटे'], accuracy: ['Accuracy', 'सटीकता'],
  locked: ['locked', 'बंद'], tabSkin: ['Tiles', 'टाइलें'], tabGlitter: ['Glitter', 'चमक'], tabFrame: ['Frames', 'फ़्रेम'], tabTheme: ['Themes', 'थीम'], tabOutfit: ['Gigi', 'गीगी']
};
const tx = (k, ...a) => { const v = TX[k] ? TX[k][S.set.lang === 'hi' ? 1 : 0] : k; return typeof v === 'function' ? v(...a) : v; };

// ---------- helpers ----------
const toast = (html, ms = 1800) => { const box = $('#toasts') || document.body, d = document.createElement('div'); d.className = 'toast'; d.innerHTML = html; box.appendChild(d); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => d.remove(), ms); };
const ic = (n, cls) => window.Icons ? Icons.svg(n, cls) : '';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const totalStars = () => { let n = 0; for (const id in S.best) for (const d in S.best[id]) n += S.best[id][d].stars || 0; return n; };
const crownsOf = id => { const b = S.best[id] || {}; return (b.normal && b.normal.stars === 3 ? 1 : 0) + (b.hard && b.hard.stars === 3 ? 1 : 0) + (b.hard && b.hard.fc ? 1 : 0); };
const award = id => { if (S.badges[id]) return; S.badges[id] = Date.now(); const b = BADGES.find(x => x[0] === id); if (b) setTimeout(() => { toast(`<div style="font-size:40px">${b[1]}</div>${esc(tx('newBadge', nm('b|' + id, b[2])))}`, 2400); A.sfx('unlock'); }, 600); save(); };
let customs = []; // loaded from IndexedDB (metadata only)

// ---------- IndexedDB for custom songs ----------
const DB = { db: null,
  open() { return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => { const r = indexedDB.open('gemtiles', 1); r.onupgradeneeded = () => r.result.createObjectStore('songs', { keyPath: 'id' }); r.onsuccess = () => res(this.db = r.result); r.onerror = () => rej(r.error); }); },
  async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('songs', mode), st = t.objectStore('songs'), r = fn(st); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); },
  all() { return this.tx('readonly', s => s.getAll()); }, put(o) { return this.tx('readwrite', s => s.put(o)); }, del(id) { return this.tx('readwrite', s => s.delete(id)); }, get(id) { return this.tx('readonly', s => s.get(id)); }
};
// v3: metadata-only read: walk a cursor and keep just the small fields (no blob / analysis / charts held for the whole list)
DB.meta = async function () { const db = await this.open(); return new Promise((res, rej) => { const out = [], t = db.transaction('songs', 'readonly'), r = t.objectStore('songs').openCursor();
  r.onsuccess = () => { const cu = r.result; if (!cu) return; const { blob, an, charts, ...m } = cu.value; m.nt = charts ? { easy: (charts.easy || []).length, normal: (charts.normal || []).length, hard: (charts.hard || []).length } : { easy: 0, normal: 0, hard: 0 }; out.push(m); cu.continue(); };
  t.oncomplete = () => res(out); t.onerror = () => rej(t.error); }); };
const loadCustoms = async () => { try { customs = (await DB.meta()).sort((a, b) => a.created - b.created); } catch (e) { customs = []; } };

// ---------- background canvas (menus) ----------
const bg = $('#bg'), bgc = bg.getContext('2d'); let menuTheme = 'pinkgold', DPR = Math.min(2, window.devicePixelRatio || 1);
// v3: element sizes come from a ResizeObserver (no per-frame clientWidth reads / forced layouts)
const SZ = new WeakMap(), szOf = el => { let s = SZ.get(el); if (!s) { s = [el.clientWidth || innerWidth, el.clientHeight || innerHeight]; if (el.clientWidth) SZ.set(el, s); } return s; };
const RO = window.ResizeObserver ? new ResizeObserver(es => { for (const e of es) { const r = e.contentRect; if (r.width > 0 && r.height > 0) SZ.set(e.target, [r.width, r.height]); else SZ.delete(e.target); if (e.target === cv0) onGameResize(); } }) : null;
const cv0 = $('#cv'); let onGameResize = () => { };
const fit = cv => { const [w, h] = szOf(cv); if (cv.width !== Math.round(w * DPR) || cv.height !== Math.round(h * DPR)) { cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR); } return [w, h]; };
const mh = $('#mascotHome'), mhc = mh.getContext('2d'); let mascotMood = 'idle', moodUntil = 0, menuLast = 0;
if (RO) { RO.observe(bg); RO.observe(mh); }
function menuLoop(ts) {
  requestAnimationFrame(menuLoop);
  if (G.on || document.hidden || ts - menuLast < 31 || $('#mLoad').classList.contains('on')) return; menuLast = ts; // menus: 30 fps cap, idle while loading/hidden
  const t = ts / 1000, [w, h] = szOf(bg), d = Math.max(1, Math.min(DPR, Math.sqrt(1.6e6 / (w * h))));
  if (bg.width !== Math.round(w * d) || bg.height !== Math.round(h * d)) { bg.width = Math.round(w * d); bg.height = Math.round(h * d); }
  bgc.setTransform(1, 0, 0, 1, 0, 0); bgc.drawImage(Art.scene(menuTheme, w, h, d, 'menu'), 0, 0); bgc.setTransform(d, 0, 0, d, 0, 0);
  if (Art.parallax && !S.set.calm) Art.parallax(bgc, menuTheme, w, h, t, t * 1.6, 1); Art.bg(bgc, menuTheme, w, h, t, t * 1.6, 0.4, true);
  if (cur === 'shop' && !S.set.calm) animPreviews(ts);
  if (cur === 'home') { const [mw, mhh] = fit(mh); mhc.setTransform(1, 0, 0, 1, 0, 0); mhc.clearRect(0, 0, mh.width, mh.height); Art.mascotFast(mhc, mw / 2 * DPR, mhh * 0.58 * DPR, Math.min(mw, mhh) * 0.75 * DPR, ts < moodUntil ? mascotMood : 'idle', S.eq.outfit, t); } // cached sprite at device pixels

}

// ---------- screens ----------
let cur = 'home';
function go(id) { if (id === 'closet') { shopTab = 'outfit'; id = 'shop'; } if (id === 'worlds') { shopTab = 'theme'; id = 'shop'; }
  if (cur === 'calib' && id !== 'calib' && CAL.on) { CAL.on = false; clearTimeout(CAL.timer); } // leaving the tap test cancels it (never applies a half test)
  $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); cur = id; menuTheme = Art.THEMES[S.lastWorld] ? S.lastWorld : 'pinkgold'; // menus show the last-played world
  ({ home: renderHome, songs: renderSongs, shop: renderShop, album: renderAlbum, badges: renderBadges, settings: renderSettings, add: resetAdd, lab: () => renderLab() }[id] || (() => { }))(); }
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; A.init(); A.sfx('tap');
  if (b.dataset.go === 'songs' && cur === 'home' && !S.tut) { startTutorial(); return; } // very first ▶ Play: guided, no-reading tutorial
  go(b.dataset.go); });
function renderHome() { $('#hStars').textContent = totalStars(); $('#hCoins').textContent = S.coins; const got = S.daily.last === today(); $('#giftBtn').innerHTML = ic(got ? 'check' : 'gift') + `<span>${esc(tr('gift'))}${S.daily.streak ? ` · ${S.daily.streak}` : ''}</span>` + (S.daily.streak ? ic('fire') : ''); }

// ---------- songs list ----------
const allSongs = () => window.TILE_SONGS.map(s => ({ ...s, builtin: true })).concat(customs.map(c => ({ ...c, custom: true })));
function renderSongs() {
  const ts = totalStars(); $('#sStars').textContent = ts;
  $$('#diffSeg button').forEach(b => b.classList.toggle('on', b.dataset.d === S.set.diff)); $('#practiceBtn').classList.toggle('on', S.set.practice);
  const L = $('#songList'); L.innerHTML = '';
  // next-unlock goal strip (no reading needed: stars, a bar and the song's picture)
  const next = window.TILE_SONGS.filter(s => s.cost > ts).sort((a, b) => a.cost - b.cost)[0], nu = $('#nextUnlock');
  if (nu) nu.innerHTML = next ? `<span>${ic('lock', 'c-pink')}${esc(tx('nextUnlock', ts, next.cost, next.emoji + ' ' + next.title))}</span><div class="bar"><i style="width:${Math.round(ts / next.cost * 100)}%"></i></div>` : `<span>${ic('crown', 'c-gold')}${esc(tx('allUnlocked'))}</span>`;
  const dots = id => ['easy', 'normal', 'hard'].map(df => { const st = ((S.best[id] || {})[df] || {}).stars || 0; return `<span class="dd ${df}${df === S.set.diff ? ' cur' : ''}">${df[0].toUpperCase()}<i>${'●'.repeat(st)}${'○'.repeat(3 - st)}</i></span>`; }).join('');
  allSongs().forEach(s => {
    const locked = s.builtin && ts < s.cost, b = (S.best[s.id] || {})[S.set.diff] || {}, cr = crownsOf(s.id), pr = ((S.best[s.id] || {}).practiced || {})[S.set.diff], d = document.createElement('div');
    d.className = 'card song' + (locked ? ' locked' : ''); d.dataset.id = s.id;
    const col = s.color || ({ moon: '#b9a6ff', pinkgold: '#ffb3d9', ocean: '#8fe3ff', galaxy: '#c08cff', candy: '#ffd6ec', disco: '#ff7ce0', festival: '#ffc04d', rainbow: '#bfe9ff' })[s.theme] || '#ffb3d9';
    const st = b.stars || 0, stars = [0, 1, 2].map(i => ic(i < st ? 'star' : 'starO', i < st ? 'c-gold' : 'c-grey')).join('');
    d.innerHTML = `<div class="em" style="background:${esc(col)}">${esc(s.emoji || '🎵')}</div><div class="info"><div class="ti" dir="auto">${esc(s.title)}</div>
      <div class="sub">${s.custom ? ic('music') + esc(tx('mySong').replace(/^\S+\s/, '')) + ' · ' + Math.round(s.bpm) + ' BPM' : esc(s.by)}${locked ? ` · ${ic('lock')} ${s.cost}` + ic('star', 'c-gold') : ''}</div>
      <div class="stars">${stars}${cr ? `<span class="crown">${ic('crown')}${cr > 1 ? '×' + cr : ''}</span>` : ''}${pr ? ic('heart', 'c-pink') : ''}</div><div class="dots">${dots(s.id)}</div></div>` + (s.custom ? `<button class="btn icon silver edit" data-edit="${s.id}" aria-label="Edit">${ic('edit')}</button>` : locked ? '' : `<button class="btn icon silver edit" data-theme="${s.id}" aria-label="Theme">${ic('palette', 'c-pink')}</button>`);
    L.appendChild(d);
  });
}
$('#diffSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.diff = b.dataset.d; save(); renderSongs(); });
$('#practiceBtn').addEventListener('click', () => { S.set.practice = !S.set.practice; save(); renderSongs(); toast(tx(S.set.practice ? 'practiceOn' : 'practiceOff')); });
$('#songList').addEventListener('click', e => {
  const ed = e.target.closest('[data-edit]'); if (ed) { e.stopPropagation(); openEdit(ed.dataset.edit); return; }
  const th = e.target.closest('[data-theme]'); if (th) { e.stopPropagation(); const id = th.dataset.theme, song = window.TILE_SONGS.find(x => x.id === id), curT = S.songTheme[id] || song.theme;
    msg(`<h2>${tx('themeFor')}</h2><div class="row">${Object.keys(Art.THEMES).map(k => `<button class="btn small ${k === curT ? 'gold' : 'silver'}" data-pick="${k}" data-song="${id}">${esc(themeName(k))}${S.owned.theme.includes(k) || k === song.theme ? '' : ' 🔒'}</button>`).join('')}</div><button class="btn" onclick="this.closest('.modal').classList.remove('on')">${tx('done')}</button>`); return; }
  const c = e.target.closest('.song'); if (!c) return; A.init(); const s = allSongs().find(x => x.id === c.dataset.id);
  if (s.builtin && totalStars() < s.cost) { toast(tx('earnMore', s.cost - totalStars())); return; }
  LAB = null; startGame(s, S.set.diff);
});

// ---------- daily gift ----------
$('#giftBtn').addEventListener('click', () => {
  A.init(); if (S.daily.last === today()) { toast(tx('giftTomorrow')); return; }
  const y = new Date(); y.setDate(y.getDate() - 1); const yk = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
  S.daily.streak = S.daily.last === yk ? S.daily.streak + 1 : 1; S.daily.last = today();
  const coins = 20 + Math.min(6, S.daily.streak - 1) * 5, pack = S.daily.streak % 3 === 0 ? 1 : 0; S.coins += coins; S.packs += pack; save();
  if (S.daily.streak >= 3) award('streak3'); if (S.daily.streak >= 7) award('streak7');
  A.sfx('gift'); mascotMood = 'wow'; moodUntil = performance.now() + 2500;
  msg(`<div style="font-size:64px">🎁</div><h2>${tx('giftTitle')}</h2><p style="font-size:22px;font-weight:800">+${coins} 🪙 ${pack ? tx('giftPack') : ''}</p><p>${tx('giftDay', S.daily.streak)}</p><button class="btn" onclick="this.closest('.modal').classList.remove('on')">${tx('yay')}</button>`);
  renderHome();
});
const msg = html => { $('#msgCard').innerHTML = html; $('#mMsg').classList.add('on'); };

// ---------- shop / closet ----------
let shopTab = 'skin';
const TABN = { skin: ['gem', 'tabSkin'], glitter: ['sparkle', 'tabGlitter'], frame: ['sticker', 'tabFrame'], theme: ['rainbow', 'tabTheme'], outfit: ['bow', 'tabOutfit'] };
function renderShop() {
  $('#shCoins').textContent = S.coins;
  $('#shopTabs').innerHTML = Object.keys(TABN).map(k => `<button class="btn small ${k === shopTab ? 'gold' : 'silver'}" data-tab="${k}">${ic(TABN[k][0])}<span>${tx(TABN[k][1])}</span></button>`).join('');
  const g = $('#shopGrid'); g.innerHTML = '';
  SHOP[shopTab].forEach(([id, name, price]) => {
    const own = S.owned[shopTab].includes(id), eq = shopTab === 'theme' ? false : S.eq[shopTab] === id, d = document.createElement('div');
    d.className = 'card item' + (eq ? ' eq' : ''); d.dataset.id = id;
    d.innerHTML = `<canvas></canvas><div class="nm">${esc(shopTab === 'theme' ? nm(id, name) : nm(shopTab + '|' + id, name))}</div><div class="pr">${eq ? ic('check', 'c-pink') + esc(tx('wearing').replace(/^\S+\s/, '')) : own ? (shopTab === 'theme' ? ic('check', 'c-pink') + esc(tx('yoursT').replace(/^\S+\s/, '')) : esc(tx('tapToUse'))) : ic('coin', 'c-gold') + price}</div>`;
    g.appendChild(d); const cv = d.querySelector('canvas'); requestAnimationFrame(() => drawPreview(cv, shopTab, id));
  });
}
function drawPreview(cv, kind, id) {
  const [w, h] = fit(cv), c = cv.getContext('2d'); if (w < 20 || h < 40) return; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, w, h); const t = performance.now() / 1000;
  if (kind === 'theme') { Art.bg(c, id, w, h, t, t, 0.5); return; }
  if (kind === 'outfit') { Art.mascotFast(c, w / 2, h * 0.6, h * 0.8, 'happy', id, t); return; }
  const eq = { ...S.eq, [kind]: id }, tw = Math.min(w * 0.4, 70), th = h - 26;
  [0, 1].forEach(i => { const im = Art.tileImg(eq.skin, eq.glitter, eq.frame, Art.SHAPE_OF[eq.skin] || Art.MIX[i * 2], tw, th, Math.floor(t * 5 + i) % 3), k = tw / (im.width - 24);
    c.drawImage(im, w / 2 - tw - 4 + i * (tw + 8) - 12 * k, 8 + i * 10 - 12 * k, im.width * k, im.height * k); });
}
let prevLast = 0; // shop previews twinkle (~6 fps, cached sprites only)
const animPreviews = ts => { if (ts - prevLast < 160) return; prevLast = ts; $$('#shopGrid canvas').forEach(cv => { const id = cv.parentNode.dataset.id; if (id) drawPreview(cv, shopTab, id); }); };
$('#shopTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { shopTab = b.dataset.tab; renderShop(); } });
$('#shopGrid').addEventListener('click', e => {
  const it = e.target.closest('.item'); if (!it) return; A.init(); const id = it.dataset.id, [, name, price] = SHOP[shopTab].find(x => x[0] === id);
  if (!S.owned[shopTab].includes(id)) {
    if (S.coins < price) { toast(tx('needCoins', price - S.coins)); A.sfx('miss'); return; }
    S.coins -= price; S.owned[shopTab].push(id); award('shop'); A.sfx('unlock'); toast(esc(tx('yours', shopTab === 'theme' ? nm(id, name) : nm(shopTab + '|' + id, name))));
  }
  if (shopTab === 'theme') { menuTheme = id; toast(tx('themeHint'), 2600); }
  else { S.eq[shopTab] = id; if (shopTab === 'outfit') { mascotMood = 'happy'; moodUntil = performance.now() + 1500; } }
  save(); renderShop();
});

// ---------- stickers ----------
function renderAlbum() {
  const have = STICKERS.filter(s => S.stickers[s[0]]).length; $('#alCount').textContent = `${have} / ${STICKERS.length}`; $('#packN').textContent = S.packs;
  $('#albumGrid').innerHTML = STICKERS.map(([e, r]) => { const n = S.stickers[e] || 0; return `<div class="sticker ${n ? (r === 'g' ? 'golden' : r === 'r' ? 'rare' : '') : 'none'}">${n ? e : ic('sticker')}${n > 1 ? `<small>×${n}</small>` : ''}</div>`; }).join('');
}
function openPack() {
  if (S.packs < 1) { toast(tx('packsHow')); return; }
  S.packs--; const got = [];
  for (let i = 0; i < 3; i++) { const r = Math.random(), tier = r < 0.04 ? 'g' : r < 0.26 ? 'r' : 'c', pool = STICKERS.filter(s => s[1] === tier), s = pool[Math.floor(Math.random() * pool.length)]; got.push(s); S.stickers[s[0]] = (S.stickers[s[0]] || 0) + 1; }
  if (got.some(s => s[1] === 'g')) award('golden'); if (STICKERS.filter(s => S.stickers[s[0]]).length >= 10) award('stick10'); save(); A.sfx('gift');
  msg(`<h2>${tx('packTitle')}</h2><div class="row">${got.map(([e, r]) => `<div class="sticker ${r === 'g' ? 'golden' : r === 'r' ? 'rare' : ''}" style="width:90px;font-size:52px">${e}</div>`).join('')}</div>
    <p style="font-weight:800">${tx(got.some(s => s[1] === 'g') ? 'golden' : got.some(s => s[1] === 'r') ? 'rare' : 'cute')}</p><button class="btn" onclick="this.closest('.modal').classList.remove('on')">${tx('addAlbum')}</button>`);
  renderAlbum();
}
$('#openPack').addEventListener('click', () => { A.init(); openPack(); });
$('#buyPack').addEventListener('click', () => { A.init(); if (S.coins < 40) { toast(tx('need40')); return; } S.coins -= 40; S.packs++; save(); renderAlbum(); A.sfx('coin'); });
function renderBadges() { $('#badgeGrid').innerHTML = BADGES.map(([id, e, n]) => `<div class="card badge ${S.badges[id] ? '' : 'off'}"><div class="b">${e}</div><div class="nm" style="font-weight:800">${esc(nm('b|' + id, n))}</div></div>`).join(''); }

// ---------- settings + calibration ----------
function renderSettings() {
  const segOn = (sel, v) => $$(sel + ' button').forEach(b => b.classList.toggle('on', b.dataset.v === String(v)));
  segOn('#soundSeg', S.set.sound ? 1 : 0); segOn('#speedSeg', S.set.speed || 'slow'); segOn('#obsSeg', S.set.obstacles !== false ? 1 : 0); segOn('#obsPSeg', S.set.obsPractice ? 1 : 0); segOn('#puSeg', S.set.powerups !== false ? 1 : 0); segOn('#shakeSeg', S.set.shake !== false ? 1 : 0); segOn('#fxSeg', S.set.fxOn !== false ? 1 : 0); segOn('#intSeg', S.set.intensity || 'med'); $('#fxVol').value = Math.round((S.set.fxVol == null ? 0.5 : S.set.fxVol) * 100); segOn('#beatSeg', S.set.missFx !== false ? 1 : 0); $('#visVal').textContent = S.set.vis || 0; segOn('#langSeg', S.set.lang); $('#offRange').value = S.set.offset; $('#offVal').textContent = S.set.offset; segOn('#calmSeg', S.set.calm ? 1 : 0); document.body.classList.toggle('calm', !!S.set.calm);
}
[['obsSeg', 'obstacles'], ['obsPSeg', 'obsPractice'], ['puSeg', 'powerups'], ['shakeSeg', 'shake'], ['fxSeg', 'fxOn'], ['calmSeg', 'calm']].forEach(([id, k]) => $('#' + id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set[k] = b.dataset.v === '1'; save(); renderSettings(); }));
$('#intSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.intensity = b.dataset.v; save(); renderSettings(); });
$('#fxVol').addEventListener('input', e => { S.set.fxVol = +e.target.value / 100; save(); A.init(); A.setFx(S.set.fxOn !== false, S.set.fxVol); });
$('#fxVol').addEventListener('change', () => A.fx('powerup'));
// ---------- test lab ----------
const LABS = { world: null, obs: null, pu: null, song: 'ode', diff: 'easy', dens: '1.6' }; // Test lab runs never touch real progress (see finishGame)
function renderLab() { const w = Object.keys(Art.THEMES), ob = ['bomb', 'car', 'spiky', 'cloud', 'snowball', 'lava', 'crab'], pu = Object.keys(PU);
  const btns = (arr, key, lab) => arr.map(x => `<button class="btn small ${LABS[key] === x ? 'gold' : 'silver'}" data-lab="${key}" data-v="${esc(x)}">${esc(lab(x))}</button>`).join('');
  $('#labBody').innerHTML = `<div class="lbl">${ic('music')}<span>${tx('labSong')}</span></div><div class="row">${btns(allSongs().map(s => s.id), 'song', x => { const s = allSongs().find(q => q.id === x); return (s.emoji || '🎵') + ' ' + s.title; })}</div>
  <div class="lbl">${ic('speed')}<span>${tx('labDiff')}</span></div><div class="row">${btns(['easy', 'normal', 'hard'], 'diff', x => tr(x))}</div><div class="lbl">${ic('list')}<span>${tx('labDens')}</span></div><div class="row">${btns(['2.6', '1.6', '0.9'], 'dens', x => tx({ '2.6': 'sparse', '1.6': 'normalD', '0.9': 'dense' }[x]))}</div>
  <div class="lbl">${ic('rainbow')}<span>${tx('labWorld')}</span></div><div class="row">${btns(w, 'world', themeName)}</div><div class="lbl">${ic('bomb')}<span>${tx('labObs')}</span></div><div class="row">${btns(ob, 'obs', x => ({ bomb: '💣', car: '🚗', spiky: '🦔', cloud: '⛈️', snowball: '☃️', lava: '🌋', crab: '🦀' }[x] || x))}<button class="btn small ${!LABS.obs ? 'gold' : 'silver'}" data-lab="obs" data-v="">${tx('labOwn')}</button></div>
  <div class="lbl">${ic('magnet')}<span>${tx('labPu')}</span></div><div class="row">${btns(pu, 'pu', x => PU[x].e + ' ' + PU[x].name)}<button class="btn small ${!LABS.pu ? 'gold' : 'silver'}" data-lab="pu" data-v="">${tx('labMix')}</button></div>
  <div class="lbl">${ic('sound')}<span>${tx('labFx')}</span></div><div class="row">${['powerup', 'poof', 'combo', 'starpower', 'intro', 'fanfare'].map(k => `<button class="btn small silver" data-fx="${k}">${k}</button>`).join('')}</div>
  <div class="row" style="margin-top:var(--s3)"><button class="btn gold" id="labGo">${ic('play')}<span>${tx('labGo')}</span></button></div>`; }
$('#labBody').addEventListener('click', e => { const b = e.target.closest('[data-lab]'); if (b) { const k = b.dataset.lab; LABS[k] = b.dataset.v || (k === 'song' || k === 'diff' || k === 'dens' ? LABS[k] : null); renderLab(); return; }
  const f = e.target.closest('[data-fx]'); if (f) { const ctx = A.init(); A.setFx(true, S.set.fxVol == null ? 0.5 : S.set.fxVol); ctx.resume().then(() => A.fx(f.dataset.fx), () => { }); return; } // wait for resume: the first tap used to be silent
  if (e.target.closest('#labGo')) { const song = allSongs().find(s => s.id === LABS.song) || window.TILE_SONGS.find(s => s.id === 'ode'); LAB = { world: LABS.world || 'rainbowroad', obs: LABS.obs, pu: LABS.pu, dens: +LABS.dens || 1.6 }; startGame(song, LABS.diff || 'easy'); } });
window.__lab = LABS; window.__renderLab = renderLab;
$('#speedSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.speed = b.dataset.v; save(); renderSettings(); });
$('#soundSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.sound = b.dataset.v === '1'; A.setMuted(!S.set.sound); save(); renderSettings(); });
$('#beatSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.missFx = b.dataset.v === '1'; save(); renderSettings(); });
$('#langSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.set.lang = b.dataset.v; save(); applyLang(); renderSettings(); });
$('#offRange').addEventListener('input', e => { S.set.offset = +e.target.value; S.set.calibrated = true; $('#offVal').textContent = S.set.offset; save(); });
$('#calibBtn').addEventListener('click', () => { go('calib'); $('#calOut').textContent = ''; $('#calBar').style.width = '0'; });
const CAL = { on: false, clicks: [], taps: [], mode: 'audio' };
$('#calStart').addEventListener('click', () => startCal('audio'));
$('#calVis').addEventListener('click', () => startCal('visual'));
function startCal(mode) {
  const ctx = A.init(); clearTimeout(CAL.timer); CAL.on = true; CAL.mode = mode; CAL.taps = []; CAL.clicks = []; $('#calBar').style.width = '0';
  clock.off = null; updateClock(); const t0 = ctx.currentTime + 0.8;
  if (mode === 'audio') { for (let i = 0; i < 12; i++) { CAL.clicks.push(t0 + i * 0.6); A.click(t0 + i * 0.6, i % 4 === 0); } $('#calOut').textContent = tx('listen'); }
  else { const p0 = performance.now() + 800; for (let i = 0; i < 12; i++) CAL.clicks.push((p0 + i * 600) / 1000); $('#calOut').textContent = tx('watch'); visAnim(p0); }
  CAL.timer = setTimeout(finishCal, (0.8 + 12 * 0.6 + 0.6) * 1000);
}
function visAnim(p0) { const cvv = $('#calCv'), cc = cvv.getContext('2d'); cvv.classList.remove('hidden');
  (function f() { if (!CAL.on) { cvv.classList.add('hidden'); return; } const [w, h] = fit(cvv); cc.setTransform(DPR, 0, 0, DPR, 0, 0); cc.clearRect(0, 0, w, h);
    const e = performance.now() - p0, ph = ((e % 600) + 600) % 600 / 600, line = h - 20, y0 = 16, rest = e >= 0 && ph < 0.15, fall = e < 0 ? 0 : (ph - 0.15) / 0.85, y = rest ? line : y0 + (line - y0) * fall * fall; // falls and lands ON the line exactly at each beat (ph = 0), rests briefly
    cc.fillStyle = '#ff4fa3'; cc.fillRect(0, line - 2, w, 4); if (rest) { cc.globalAlpha = 0.5 * (1 - ph / 0.15); cc.beginPath(); cc.arc(w / 2, line, 26, 0, Math.PI * 2); cc.fillStyle = '#ffd76a'; cc.fill(); cc.globalAlpha = 1; } Art.gem(cc, 'heart', w / 2, y, 30, '#fff', '#ff4fa3'); requestAnimationFrame(f); })(); }
$('#tapPad').addEventListener('pointerdown', e => { if (!CAL.on) return; updateClock(); const p = perfOf(e); CAL.taps.push(CAL.mode === 'audio' ? p / 1000 + clock.off : p / 1000); $('#calBar').style.width = Math.min(100, CAL.taps.length / 12 * 100) + '%'; });
function finishCal() {
  if (!CAL.on) return; CAL.on = false;
  const d = CAL.taps.map(t => { let best = 9; for (const c of CAL.clicks) if (Math.abs(t - c) < Math.abs(best)) best = t - c; return best; }).filter(v => Math.abs(v) < 0.3).sort((a, b) => a - b);
  if (d.length < 6) { $('#calOut').textContent = tx('notEnough'); return; }
  const med = Math.round(d[Math.floor(d.length / 2)] * 1000 / 5) * 5;
  if (CAL.mode === 'audio') { S.set.offset = med; S.set.calibrated = true; } else { S.set.vis = Math.max(-100, Math.min(200, med)); S.set.visCal = true; } save();
  $('#calOut').textContent = CAL.mode === 'audio' ? tx('soundSynced', S.set.offset) : tx('screenSynced', S.set.vis); A.sfx('star');
}
CAL.finish = finishCal;

// ---------- add my song ----------
function resetAdd() { $('#addBusy').classList.add('hidden'); $('#addErr').textContent = ''; $('#fileIn').value = ''; }
$('#fileIn').addEventListener('change', async e => { const f = e.target.files && e.target.files[0]; if (f) await addSongFile(f); });
async function addSongFile(file) {
  const err = m => { $('#addErr').textContent = m; $('#addBusy').classList.add('hidden'); };
  if (file.size > 60 * 1024 * 1024) return err(tx('tooBig'));
  $('#addBusy').classList.remove('hidden'); $('#addErr').textContent = ''; const bar = $('#addBar'), m = $('#addMsg');
  const step = (p, t) => { bar.style.width = (p * 100) + '%'; m.textContent = t; return new Promise(r => setTimeout(r, 30)); };
  try {
    await step(0.1, tx('opening')); const buf = await file.arrayBuffer();
    await step(0.25, tx('listening')); const { mono, duration } = await AN.decodeToMono(buf);
    if (duration < 8) return err(tx('tooShort')); if (duration > 600) return err(tx('tooLong'));
    await step(0.5, tx('finding')); const an = AN.analyzeMono(mono);
    await step(0.85, tx('making'));
    const energy = Math.min(1, an.onsets.length / duration / 4), theme = Art.suggestTheme(an.bpm, energy);
    const title = file.name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 60) || 'My song';
    const rec = { id: 'c' + Date.now().toString(36), title, emoji: '🎵', color: '#ffb3d9', theme, suggested: theme, energy, bpm: an.bpm, duration, an, seed: 1, offset: 0, created: Date.now(), type: file.type || 'audio/mpeg', blob: new Blob([buf], { type: file.type || 'audio/mpeg' }) };
    rec.anv = AN.VERSION; rec.charts = { easy: AN.makeChart(an, 'easy', 1), normal: AN.makeChart(an, 'normal', 1), hard: AN.makeChart(an, 'hard', 1) };
    await DB.put(rec); decoded.set(rec.id, null); await loadCustoms(); award('custom'); await step(1, tx('doneAdd'));
    A.sfx('unlock'); openEdit(rec.id, true);
  } catch (ex) { console.warn(ex); err(tx('cantPlay')); }
}
window.__addSongFile = addSongFile;

// ---------- edit custom song ----------
const EMO = ['🎵', '💖', '💎', '👑', '🦄', '🌈', '⭐', '🌙', '🪩', '🪔', '🌸', '🎀', '🐱', '🦋', '🔥', '🎤', '💃', '🍭'];
const COLS = ['#ffb3d9', '#ff7cb8', '#ffd76a', '#c9d1de', '#b98cff', '#8fe3ff', '#9ff0c8', '#ffb38a'];
let editing = null;
async function openEdit(id, fresh) {
  const r = customs.find(c => c.id === id); if (!r) return; editing = { ...r }; go('edit');
  $('#edTitle').value = r.title; $('#edOff').value = r.offset || 0; $('#edOffVal').textContent = r.offset || 0;
  $('#edSuggest').textContent = tx('suggested', themeName(r.suggested), Math.round(r.bpm));
  const nt = r.nt || { easy: 0, normal: 0, hard: 0 }; $('#edInfo').textContent = tx('edInfo', Math.round(r.bpm), `${Math.floor(r.duration / 60)}:${String(Math.round(r.duration % 60)).padStart(2, '0')}`, nt.easy, nt.normal, nt.hard) + (fresh ? tx('nameIt') : '');
  renderEditPickers();
}
function renderEditPickers() {
  $('#edEmoji').innerHTML = EMO.map(e => `<button class="${e === editing.emoji ? 'on' : ''}" data-e="${e}">${e}</button>`).join('');
  $('#edColor').innerHTML = COLS.map(c => `<div class="swatch ${c === editing.color ? 'on' : ''}" data-c="${c}" style="background:${c}"></div>`).join('');
  $('#edTheme').innerHTML = Object.keys(Art.THEMES).map(k => `<button class="btn small ${k === editing.theme ? 'gold' : 'silver'}" data-th="${k}" style="width:auto">${esc(themeName(k))}${S.owned.theme.includes(k) ? '' : ' 🔒'}</button>`).join('');
}
$('#edEmoji').addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (b) { editing.emoji = b.dataset.e; renderEditPickers(); } });
$('#edColor').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { editing.color = b.dataset.c; renderEditPickers(); } });
$('#edTheme').addEventListener('click', e => { const b = e.target.closest('[data-th]'); if (!b) return; if (!S.owned.theme.includes(b.dataset.th) && b.dataset.th !== editing.suggested) { toast(tx('lockedTheme')); return; } editing.theme = b.dataset.th; renderEditPickers(); });
$('#edOff').addEventListener('input', e => { editing.offset = +e.target.value; $('#edOffVal').textContent = editing.offset; });
$('#edSave').addEventListener('click', async () => { const full = await DB.get(editing.id); Object.assign(full, { title: $('#edTitle').value.trim() || 'My song', emoji: editing.emoji, color: editing.color, theme: editing.theme, offset: editing.offset }); await DB.put(full); await loadCustoms(); A.sfx('coin'); toast(tx('saved')); go('songs'); });
$('#edRegen').addEventListener('click', async () => { const full = await DB.get(editing.id); full.seed = (full.seed || 1) + 1; full.charts = { easy: AN.makeChart(full.an, 'easy', full.seed), normal: AN.makeChart(full.an, 'normal', full.seed), hard: AN.makeChart(full.an, 'hard', full.seed) }; await DB.put(full); await loadCustoms(); toast(tx('fresh')); openEdit(full.id); });
$('#edDel').addEventListener('click', () => msg(`<h2>${tx('delQ')}</h2><p dir="auto">${esc(editing.title)}</p><div class="row"><button class="btn" id="delYes">${tx('delYes')}</button><button class="btn silver" onclick="this.closest('.modal').classList.remove('on')">${tx('keepIt')}</button></div>`));
document.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b) return; const id = b.dataset.song, k = b.dataset.pick, song = window.TILE_SONGS.find(x => x.id === id);
  if (!S.owned.theme.includes(k) && k !== song.theme) { toast(tx('lockedTheme')); return; } if (k === song.theme) delete S.songTheme[id]; else S.songTheme[id] = k; save(); A.sfx('coin'); $$('[data-pick]').forEach(x => x.className = 'btn small ' + (x === b ? 'gold' : 'silver')); });
document.addEventListener('click', async e => { if (e.target.closest('#delYes')) { await DB.del(editing.id); delete S.best[editing.id]; save(); await loadCustoms(); $('#mMsg').classList.remove('on'); toast(tx('deleted')); go('songs'); } });

// =================== GAME ENGINE (v2: Guitar-Hero model) ===================
// The song is ONE continuous audio track. Taps never create sounds or AudioNodes. Every note position and every
// judgement comes from the audio clock (getOutputTimestamp), never from accumulated frame deltas.
const cv = $('#cv'), c = cv.getContext('2d'), bcv = $('#bgcv'), bc = bcv.getContext('2d', { alpha: false });
// v3: browser gestures in the game area are blocked by CSS (touch-action:none, overscroll-behavior, user-select, touch-callout), so there are
// no blocking touch listeners for the compositor to wait on; only the long-press menu / iOS pinch need a handler (not on the tap path)
$('#game').addEventListener('contextmenu', e => e.preventDefault()); document.addEventListener('gesturestart', e => e.preventDefault());
const G = { on: false };
const decoded = new Map(), rendered = new Map();
const DIFF = { easy: { lead: 2.3, gap: 0.4, hearts: 6, mul: 0.85, ramp: 0.06, win: 0.2, great: 0.11, perf: 0.065, heal: 15 }, // v3: Easy/Normal a little more forgiving
  normal: { lead: 1.8, gap: 0.25, hearts: 3, mul: 1, ramp: 0.12, win: 0.14, great: 0.07, perf: 0.036, heal: 25 },
  hard: { lead: 1.35, gap: 0, hearts: 3, mul: 1.12, ramp: 0.22, win: 0.09, great: 0.055, perf: 0.028 } };
let LAB = null; const COUNT = 2.0, PAD = 0.35; // countdown seconds; silence at the start of rendered built-in tracks
// ---------- audio clock ----------
const clock = { off: null };
function updateClock() { // off = (audio time being HEARD) - (performance time)
  const ctx = A.ctx(); let est = null;
  // getOutputTimestamp already includes the output latency, so it is NOT subtracted again; the fallback subtracts it once.
  // A stale pair (right after resume() it can still describe the moment of suspend) would put the heard time ahead of the render clock: reject it.
  const nowP = performance.now() / 1000;
  if (ctx.getOutputTimestamp) { const ts = ctx.getOutputTimestamp(); if (ts && ts.contextTime > 0 && ts.performanceTime > 0) { const e = ts.contextTime - ts.performanceTime / 1000, ahead = ctx.currentTime - (e + nowP); if (ahead > -0.01 && ahead < 0.5) est = e; } }
  if (est == null) est = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0) - nowP;
  if (clock.off == null || Math.abs(est - clock.off) > 0.04) clock.off = est; else clock.off += (est - clock.off) * 0.08;
}
const perfOf = e => { const t = e && e.timeStamp, n = performance.now(); return t > 0 && t <= n + 5 && n - t < 1000 ? t : n; };
const songAt = perfMs => perfMs / 1000 + clock.off - G.startAt; // audio-track position heard at that moment
const judgeAt = perfMs => songAt(perfMs) - S.set.offset / 1000;
const songTime = () => songAt(performance.now());
// ---------- built-in arrangement (melody + chords/bass + drums), the same note list drives the chart ----------
const KEYS = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
function chordsFor(key) { const minor = /m$/.test(key), tonic = KEYS[key.replace(/m$/, '')] || 0;
  const deg = minor ? [[0, 'm', 1.1], [3, '', 1], [5, 'm', 1.05], [7, '', 1.1], [8, '', 1], [10, '', 0.95]] : [[0, '', 1.15], [2, 'm', 0.95], [4, 'm', 0.9], [5, '', 1.1], [7, '', 1.12], [9, 'm', 1]];
  return deg.map(([d, q, w]) => { const r = (tonic + d) % 12; return { root: r, pcs: [r, (r + (q ? 3 : 4)) % 12, (r + 7) % 12], w }; }); }
function parseMelody(m) { let b = 0; const out = []; for (const tok of m.trim().split(/\s+/)) { const [n, d] = tok.split(':'), dur = d ? parseFloat(d) : 1; if (n !== 'R') out.push({ b, midi: A.midi(n), dur }); b += dur; } return { notes: out, beats: b }; }
function arrange(song, diff) {
  const D = DIFF[diff], { notes, beats } = parseMelody(song.m), bpm0 = song.bpm * D.mul, k = D.ramp / beats, bar = song.bar || 4;
  const tOf = b => PAD + (k ? 60 / (bpm0 * k) * Math.log(1 + k * b) : 60 * b / bpm0);
  const mel = notes.map(n => ({ type: 'piano', m: n.midi, t: tOf(n.b), d: tOf(n.b + n.dur) - tOf(n.b), v: 0.85, wet: 1 }));
  const back = [], CH = chordsFor(song.key || 'C'), nb = Math.ceil(beats / bar);
  for (let i = 0; i < nb; i++) { const b0 = i * bar, b1 = b0 + bar, w = new Array(12).fill(0);
    for (const n of notes) { const ov = Math.min(b1, n.b + n.dur) - Math.max(b0, n.b); if (ov > 0) w[n.midi % 12] += ov * (n.b >= b0 && n.b < b0 + 1 ? 1.5 : 1); }
    let best = CH[0], bs = -1; for (const ch of CH) { const s = ch.pcs.reduce((a, p) => a + w[p], 0) * ch.w; if (s > bs) { bs = s; best = ch; } }
    const t0 = tOf(b0), t1 = tOf(Math.min(b1, beats)), root = 36 + best.root, pad = best.pcs.map(p => 55 + ((p - 7 + 12) % 12));
    back.push({ type: 'pad', ms: pad, t: t0, d: t1 - t0, v: diff === 'easy' ? 0.8 : 1, wet: 1 });
    back.push({ type: 'bass', m: root, t: t0, d: (bar >= 4 ? tOf(b0 + bar / 2) : t1) - t0 - 0.02, v: 0.7 });
    if (bar >= 4) back.push({ type: 'bass', m: root + 7, t: tOf(b0 + bar / 2), d: t1 - tOf(b0 + bar / 2) - 0.02, v: 0.6 });
    for (let b = b0; b < Math.min(b1, beats); b += 0.5) { const t = tOf(b), pos = b - b0;
      if (pos === 0 || (bar >= 4 && pos === bar / 2)) back.push({ type: 'kick', t, v: 0.55 }); else if (Number.isInteger(pos) && (bar === 2 || (bar === 4 && pos % 2 === 1))) back.push({ type: 'clap', t, v: 0.16 });
      back.push({ type: 'hat', t, v: Number.isInteger(pos) ? 0.06 : 0.035 }); } }
  // tiles: one per melody note (Easy pairs very short notes), so every tap IS a note you hear
  // merge notes closer than the difficulty's minimum gap into one tile (the tile lands on the first, musically strongest-placed note)
  const groups = []; for (const n of notes) { const g = groups[groups.length - 1]; if (g && D.gap && tOf(n.b) - tOf(g[0].b) < D.gap) g.push(n); else groups.push([n]); }
  const tiles = []; let lane = 1, prev = null, flip = 1;
  groups.forEach((g, i) => { const n = g[0], t = tOf(n.b);
    if (prev) { const dp = n.midi - prev.midi; if (dp > 0) lane += dp > 4 ? 2 : 1; else if (dp < 0) lane -= dp < -4 ? 2 : 1; else { lane += flip; flip = -flip; } if (lane > 3) lane = 6 - lane; if (lane < 0) lane = -lane; lane = Math.max(0, Math.min(3, lane)); if (lane === prev.lane && t - prev.t < 0.45) lane = (lane + 2) % 4; }
    const holdB = diff === 'easy' ? 2 : 1.5, isHold = g.length === 1 && n.dur >= holdB;
    tiles.push({ t, lane, dur: isHold ? (tOf(n.b + n.dur) - t) * 0.85 : 0, shapeI: i });
    if (diff !== 'easy' && !isHold && n.dur >= 1 && i > 0 && (diff === 'hard' ? n.b % 2 === 0 : n.b % 4 === 0)) tiles.push({ t, lane: (lane + 2) % 4, dur: 0, shapeI: i + 1, pair: true });
    prev = { midi: g[g.length - 1].midi, lane, t }; });
  const beatTimes = []; for (let b = 0; b <= Math.ceil(beats); b++) beatTimes.push([tOf(b), b]);
  return { tiles, mel, back, end: tOf(beats) + 0.6, beatTimes, bpm: bpm0, melTimes: mel.map(e => e.t) };
}
async function prepare(song, diff, onP) { // onP(progress, text)
  const ctx = A.init();
  if (song.custom) {
    let full = await DB.get(song.id); if (!full) throw new Error('missing');
    if ((full.anv || 1) < AN.VERSION) { onP(0.2, tx('remaking')); full = await reanalyze(full); }
    if (!decoded.get(song.id)) { onP(0.5, tx('gettingReady')); decoded.set(song.id, await ctx.decodeAudioData(await full.blob.arrayBuffer())); }
    const tiles = full.charts[diff].map((n, i) => ({ t: n.t, lane: n.lane, dur: n.dur || 0, shapeI: i, lane2: n.lane2 }));
    tiles.slice().forEach(t => { if (t.lane2 != null) tiles.push({ ...t, lane: t.lane2, pair: true, shapeI: t.shapeI + 1 }); });
    tiles.sort((a, b) => a.t - b.t);
    if (DIFF[diff].gap) { const kept = []; let p = null; for (const t of tiles) { if (p && !t.pair && t.t - p.t < DIFF[diff].gap) continue; if (t.pair && p && Math.abs(t.t - p.t) > 0.001) continue; kept.push(t); if (!t.pair) p = t; } // O(n): track the last kept non-pair tile
      for (let i = 0; i < kept.length - 1; i++) if (kept[i].dur && kept[i].t + kept[i].dur > kept[i + 1].t - DIFF[diff].gap) kept[i].dur = Math.max(0, kept[i + 1].t - DIFF[diff].gap - kept[i].t); tiles.length = 0; tiles.push(...kept); }
    return { tiles, end: full.duration + 0.3, bpm: full.bpm, beatTimes: (full.an.grid || full.an.beats.map(b => b.t)).map((t, i) => [t, i]), stems: { full: decoded.get(song.id) }, energy: full.energy, theme: full.theme, songOffset: (full.offset || 0) / 1000 };
  }
  const key = song.id + '|' + diff; let r = rendered.get(key);
  if (!r) { const ar = arrange(song, diff); onP(0.3, tx('warm'));
    const [mel, back] = await Promise.all([A.renderStem(ar.mel, ar.end + 2.2, 0.22), A.renderStem(ar.back, ar.end + 2.2, 0.12)]);
    r = { ...ar, stems: { mel, back } }; rendered.set(key, r); }
  rendered.delete(key); rendered.set(key, r); // LRU: bounded by total PCM bytes (~192 MB) instead of a fixed 4 entries
  let bytes = 0; for (const v of rendered.values()) bytes += (v.stems.mel.length * v.stems.mel.numberOfChannels + v.stems.back.length * v.stems.back.numberOfChannels) * 4;
  for (const k of rendered.keys()) { if (bytes <= 192e6 || rendered.size <= 1) break; const v = rendered.get(k); bytes -= (v.stems.mel.length * v.stems.mel.numberOfChannels + v.stems.back.length * v.stems.back.numberOfChannels) * 4; rendered.delete(k); }
  return r;
}
async function reanalyze(full) { const { mono } = await AN.decodeToMono(await full.blob.arrayBuffer()); const an = AN.analyzeMono(mono);
  Object.assign(full, { an, bpm: an.bpm, anv: AN.VERSION, charts: { easy: AN.makeChart(an, 'easy', full.seed || 1), normal: AN.makeChart(an, 'normal', full.seed || 1), hard: AN.makeChart(an, 'hard', full.seed || 1) } });
  await DB.put(full); return full; }
// ---------- start ----------
const loadUI = (p, t) => { $('#mLoad').classList.add('on'); $('#loadBar').style.width = (p * 100) + '%'; $('#loadMsg').textContent = t; };
let STARTING = false;
async function startGame(song, diff) { if (STARTING) return; STARTING = true; try { await startGame0(song, diff); } finally { STARTING = false; } }
async function startGame0(song, diff) {
  LOOP++; G.on = false; (G.srcs || []).forEach(s => { try { s.stop(); } catch (e) { } }); G.srcs = []; // kill any previous loop/audio before starting
  const ctx = A.init(); await ctx.resume(); A.inGame = true;
  if (!ctx.__watch) { ctx.__watch = 1; ctx.addEventListener('statechange', () => { if (ctx.state !== 'running' && G.on && !G.paused && !G.ended) pauseGame(); }); }
  let b; try { loadUI(0.05, tx('loading')); b = await prepare(song, diff, loadUI); } catch (e) { console.warn(e); $('#mLoad').classList.remove('on'); A.inGame = false; toast(tx('couldNotLoad')); if (!$$('.screen.on').length) go(LAB ? 'lab' : 'songs'); return; }
  loadUI(1, tx('ready'));
  const tiles = b.tiles.map((t, i) => ({ ...t, id: i, state: 0, holdP: 0, bead: 0 })), tut = TUT.pending; TUT.pending = false;
  let theme = (LAB && LAB.world) || S.songTheme[song.id] || b.theme || song.theme || 'pinkgold';
  if (!LAB && !tut && Art.THEMES[theme] && S.lastWorld !== theme) { S.lastWorld = theme; save(); } // menus show the last-played world (additive key)
  const practice = S.set.practice || tut;
  Object.assign(G, { on: true, song, diff, D: DIFF[diff], b, tiles, theme, score: 0, combo: 0, maxCombo: 0, hearts: practice ? Infinity : DIFF[diff].hearts, practice, usedPractice: practice,
    j: { perfect: 0, great: 0, good: 0, miss: 0 }, holds: new Map(), press: new Map(), mood: 'idle', moodT: 0, paused: false, ended: false, sp: 0, spUntil: -1, laneFlash: [0, 0, 0, 0], laneHit: [0, 0, 0, 0],
    flares: [0, 0, 0, 0], flareJ: [0, 0, 0, 0], streak: [0, 0, 0, 0], missFx: [0, 0, 0, 0], pu: {}, shield: 0, poofs: [], shake: 0, slow: 1, nowS: 0, win: DIFF[diff].win, lead: DIFF[diff].lead, stats: { pu: {}, dodged: 0, rainbow: false }, items: [], lab: LAB, _bi: 0, qLog: [],
    bgDirty: true, bgLast: 0, Q: null, first: 0, hudDirty: true, hudT: 0, lastProg: -1, pops: [], ft: new Float32Array(4096), fi: new Float32Array(4096), fN: 0, lastFrame: 0, ivl: [], pendingTap: null, nodesAtStart: 0,
    resuming: 0, pausedDrawn: false, missRun: 0, medal: 0, medalT: -9, holdEmitT: 0, dly: 4, cap60: false, skipTog: false, tut: tut ? { step: 0, wait: null, hand: 0, done: false } : null, seenObs: G.seenObs || new Set(), edgeA: -1, edgeCol: '' });
  // build the playback graph ONCE (no nodes are created after this until the song ends)
  const master = A.master(); G.nodes = [];
  if (b.stems.full) { const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(); src.buffer = b.stems.full; lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = 0.5; src.connect(lp); lp.connect(master); G.srcs = [src]; G.muffle = lp; G.duck = null; }
  else { const m = ctx.createBufferSource(), bk = ctx.createBufferSource(), mg = ctx.createGain(); m.buffer = b.stems.mel; bk.buffer = b.stems.back; m.connect(mg); mg.connect(master); bk.connect(master); G.srcs = [m, bk]; G.duck = mg; G.muffle = null; }
  G.lat = b.songOffset || 0; G.startAt = ctx.currentTime + COUNT + 0.1 + G.lat; G.srcs.forEach(s => s.start(G.startAt - G.lat));
  clock.off = null; updateClock();
  $('#mLoad').classList.remove('on'); $('#game').classList.add('on'); $$('.screen').forEach(s => s.classList.remove('on')); wipe();
  $('#skipTut').classList.toggle('hidden', !G.tut); measureGame(); buildHearts();
  A.setFx(S.set.fxOn !== false, S.set.fxVol == null ? 0.5 : S.set.fxVol); G.items = buildItems(b, diff); layout(); warmSprites(); setTimeout(() => A.fx('intro'), 300); updHud(); startLoop();
  if (document.hidden) pauseGame(); // she switched apps while the song was loading: start paused (resume gets a 3-2-1)
}
function warmSprites() { try { resolveSprites(); for (const it of G.items) it.kind === 'pu' ? puImg(it.pu) : obsImg(it.ob); cloudPuff(); greyPuff(); edgeGlow(); for (const k of ['3', '2', '1', 'go']) countImg(k);
  Art.scene(G.theme, L.W, L.H, 1, 'hw', h => { h.save(); h.translate(HWX(), 0); h.drawImage(highway(), 0, 0); h.restore(); }); } catch (e) { console.warn(e); } }
// HUD: gem hearts (crack on a miss) + score. Only touched when the shown value changes, at most ~10x/s (no per-frame DOM writes during holds)
const NF = window.Intl ? new Intl.NumberFormat() : { format: n => String(n) }, HUD = { s: '', h: -2, n: 0 };
function buildHearts() { const el = $('#hHearts'); HUD.h = -2; if (G.hearts === Infinity) { el.innerHTML = '<span class="gh"></span> ∞'; HUD.n = 0; return; }
  HUD.n = G.D.hearts; el.innerHTML = '<span class="gh"></span>'.repeat(HUD.n); }
function updHud() { const el = $('#hHearts'); if (G.hearts === Infinity && HUD.n) buildHearts();
  if (G.hearts !== HUD.h && G.hearts !== Infinity) { const hs = el.children; for (let i = 0; i < hs.length; i++) { const on = i < G.hearts; if (hs[i].classList.contains('off') === on) { hs[i].classList.toggle('off', !on); hs[i].classList.toggle('crack', !on && HUD.h !== -2); } } }
  HUD.h = G.hearts; const s = NF.format(G.score); if (s !== HUD.s) { $('#hScore').textContent = HUD.s = s; } G.hudDirty = false; }
// ---------- layout + perspective highway ----------
let L = {};
let GDPR = 2;
let BDPR = 1;
const VIEW = { w: 0, h: 0, left: 0, top: 0 }; // game canvas size + offset, refreshed by the ResizeObserver (never read per frame / per tap)
function measureGame() { const r = cv.getBoundingClientRect(); if (r.width > 0 && r.height > 0) Object.assign(VIEW, { w: r.width, h: r.height, left: r.left, top: r.top }); }
function fitGame() { if (!VIEW.w) measureGame(); const w = VIEW.w || innerWidth, h = VIEW.h || innerHeight, q = G.qual || 0;
  GDPR = Math.max(1, Math.min(window.devicePixelRatio || 1, [2, 1.75, 1.25, 1][q], Math.sqrt([2.0e6, 1.4e6, 1.0e6, 0.75e6][q] / (w * h))));
  BDPR = Math.max(0.5, Math.min(GDPR, [1.25, 1, 0.8, 0.6][q]));
  const cw = Math.round(w * GDPR), ch = Math.round(h * GDPR); if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; G.bgDirty = true; G.pausedDrawn = false; }
  const bw = Math.round(w * BDPR), bh = Math.round(h * BDPR); if (bcv.width !== bw || bcv.height !== bh) { bcv.width = bw; bcv.height = bh; G.bgDirty = true; } return [w, h]; }
function layout() { const [W, H] = fitGame(); if (L.W === W && L.H === H) return false; G.bgDirty = true; G.pausedDrawn = false; const bw = Math.min(W * 0.98, H * 1.25, 860), P = 0.9;
  L = { W, H, cx: W / 2, bw, lw: bw / 4, strikeY: H * 0.8, horizonY: H * 0.08, P, sFar: 1 / (1 + P) }; L.span = L.strikeY - L.horizonY; G.spr = null; return true; }
// fold/unfold, rotation or a big resize mid-song: pause (resume gets a 3-2-1) and pre-build the new size's sprites now, not on the next game frame
onGameResize = () => { const pw = VIEW.w, ph = VIEW.h; measureGame(); if (!G.on) return;
  const big = pw && (Math.abs(VIEW.w - pw) / pw > 0.15 || Math.abs(VIEW.h - ph) / ph > 0.15);
  if (big && !G.paused && !G.ended) { pauseGame(); G.pops.length = 0; G.poofs.length = 0; }
  if (layout()) warmSprites(); };
if (RO) RO.observe(cv0); window.addEventListener('orientationchange', () => setTimeout(onGameResize, 250));
let PS = 1, PY = 0; // projection scratch (no per-call array allocation)
const projS = u => { PS = 1 / (1 + L.P * Math.max(-0.12, u)); PY = L.strikeY - L.span * (1 - PS) / (1 - L.sFar); };
const proj = u => { projS(u); return [PS, PY]; }; // (allocating form kept for tests/tools)
const laneX = (l, s) => L.cx + (l - 1.5) * L.lw * s;
function laneAt(x, y) { const fr = Math.max(0, Math.min(1, (L.strikeY - L.lw * 0.9 - y) / L.span)), s = 1 - fr * (1 - L.sFar), v = (x - L.cx) / (L.lw * s) + 2; // generous: full-width lanes near the strike line
  return v >= -0.5 && v < 0 ? 0 : v >= 4 && v < 4.5 ? 3 : Math.floor(v); }
const HWX = () => Math.max(0, Math.floor(L.cx - L.bw * 0.62)); const highway = () => Art.spr(`hw|${L.W}|${L.H}|${Art.highwayStyle(G.theme)}`, Math.ceil(L.bw * 1.24), L.H, (h) => { h.translate(-HWX(), 0); const HS = Art.highwayStyle(G.theme);
  const s1 = 1, s0 = L.sFar, y0 = L.horizonY, y1 = L.H, sB = 1 / (1 + L.P * -0.12);
  const pts = [[laneX(-0.5, s0), y0], [laneX(3.5, s0), y0], [L.cx + 2 * L.lw * sB, y1], [L.cx - 2 * L.lw * sB, y1]];
  const g = h.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(40,0,40,.05)'); g.addColorStop(0.6, 'rgba(60,0,50,.32)'); g.addColorStop(1, 'rgba(60,0,50,.45)');
  const surf = { neon: ['rgba(5,0,30,.25)', 'rgba(10,0,40,.75)'], ice: ['rgba(200,235,255,.2)', 'rgba(180,225,255,.65)'], lava: ['rgba(40,5,5,.3)', 'rgba(50,10,5,.8)'], reef: ['rgba(0,60,90,.2)', 'rgba(0,80,110,.55)'], candy: ['rgba(255,190,225,.25)', 'rgba(255,170,215,.65)'], stone: ['rgba(60,70,50,.3)', 'rgba(70,80,55,.75)'], cloud: ['rgba(255,255,255,.25)', 'rgba(255,255,255,.7)'] }[HS];
  if (surf) { g.addColorStop(0, surf[0]); g.addColorStop(1, surf[1]); }
  h.fillStyle = g; h.beginPath(); pts.forEach(([x, y], i) => i ? h.lineTo(x, y) : h.moveTo(x, y)); h.fill();
  if (HS === 'rainbow') ['#ff4d6d', '#ff9f1c', '#ffe14d', '#4ade80', '#38bdf8', '#a78bfa'].forEach((col, i) => { const a0 = -0.5 + i * 4 / 6, a1 = a0 + 4 / 6; h.fillStyle = col; h.globalAlpha = 0.55; h.beginPath(); h.moveTo(laneX(a0, s0), y0); h.lineTo(laneX(a1, s0), y0); h.lineTo(L.cx + (a1 - 1.5) * L.lw * sB, y1); h.lineTo(L.cx + (a0 - 1.5) * L.lw * sB, y1); h.fill(); h.globalAlpha = 1; });
  if (HS === 'lava') { h.strokeStyle = 'rgba(255,120,0,.7)'; h.lineWidth = 2; for (let i = 0; i < 14; i++) { const u = i / 14, s = 1 / (1 + L.P * u), y = L.strikeY - L.span * (1 - s) / (1 - L.sFar); h.beginPath(); h.moveTo(laneX(-0.3 + (i % 4), s), y); h.lineTo(laneX(0.2 + (i % 4), s), y + 8 * s); h.stroke(); } }
  if (HS === 'rainbow' || HS === 'neon') for (let i = 0; i < 16; i++) { const u = i / 16, s = 1 / (1 + L.P * u), y = L.strikeY - L.span * (1 - s) / (1 - L.sFar); [-0.5, 3.5].forEach(a => { h.fillStyle = HS === 'neon' ? '#3dfcff' : ['#ff4d6d', '#ffe14d', '#38bdf8'][i % 3]; h.beginPath(); h.arc(laneX(a, s), y, 4 * s + 1, 0, 7); h.fill(); }); }
  h.strokeStyle = 'rgba(255,255,255,.35)'; h.lineWidth = 1.5; for (let l = 0; l <= 4; l++) { h.beginPath(); h.moveTo(laneX(l - 0.5, s0), y0); h.lineTo(L.cx + (l - 2) * L.lw * sB, y1); h.stroke(); }
  const rail = h.createLinearGradient(0, y0, 0, y1); rail.addColorStop(0, 'rgba(255,241,176,.2)'); rail.addColorStop(1, '#ffd76a'); h.strokeStyle = rail; h.lineWidth = 5;
  [[-0.5, -2], [3.5, 2]].forEach(([a, b]) => { h.beginPath(); h.moveTo(laneX(a, s0), y0); h.lineTo(L.cx + b * L.lw * sB, y1); h.stroke(); });
  const sl = h.createLinearGradient(L.cx - L.bw / 2, 0, L.cx + L.bw / 2, 0); sl.addColorStop(0, '#fff1b0'); sl.addColorStop(0.5, '#fff'); sl.addColorStop(1, '#f0b84a'); h.fillStyle = sl; h.fillRect(L.cx - L.bw / 2, L.strikeY - 3, L.bw, 6); });
const LANECOL = ['#ff5fae', '#b98cff', '#5ad1ff', '#ffc94d'];
const flareImg = l => Art.spr('flare|' + l, 128, 128, f => { f.strokeStyle = LANECOL[l]; f.lineWidth = 10; f.beginPath(); f.arc(64, 64, 52, 0, Math.PI * 2); f.stroke(); f.strokeStyle = '#fff'; f.lineWidth = 4; f.beginPath(); f.arc(64, 64, 52, 0, Math.PI * 2); f.stroke();
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; Art.sparkle(f, 64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52, 9, '#fff'); } });
// jewel-socket lane buttons: silver bezel, dark socket, the lane gem seated inside; pressed = gold bezel and the gem lights up from inside
const btnImg = (l, on) => Art.spr(`btn|${l}|${on}|${Math.round(L.lw)}`, L.lw, L.lw * 0.7, (b, w, h) => { const cx = w / 2, cy = h / 2, rx = w * 0.4, ry = h * 0.38;
  const bz = b.createLinearGradient(0, cy - ry, 0, cy + ry); (on ? ['#fff8d6', '#f0b84a', '#b57800'] : ['#ffffff', '#c9d1de', '#8f9bb0']).forEach((c, i) => bz.addColorStop(i / 2, c));
  b.fillStyle = bz; b.beginPath(); b.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); b.fill();
  const sk = b.createRadialGradient(cx, cy - ry * 0.2, 2, cx, cy, rx * 0.8); sk.addColorStop(0, on ? LANECOL[l] : 'rgba(70,20,60,.55)'); sk.addColorStop(1, on ? '#ffffff' : 'rgba(30,5,30,.75)');
  b.fillStyle = sk; b.beginPath(); b.ellipse(cx, cy, rx * 0.8, ry * 0.76, 0, 0, Math.PI * 2); b.fill(); b.lineWidth = Math.max(2, w * 0.025); b.strokeStyle = LANECOL[l]; b.stroke();
  b.globalAlpha = 0.7; b.fillStyle = '#fff'; b.beginPath(); b.ellipse(cx - rx * 0.35, cy - ry * 0.62, rx * 0.28, ry * 0.12, -0.2, 0, Math.PI * 2); b.fill(); b.globalAlpha = 1;
  Art.gem(b, ['heart', 'star', 'diamond', 'crown'][l], cx, cy, h * (on ? 0.58 : 0.48), '#fff', LANECOL[l], on ? '#fff' : null); });
const glowBar = () => Art.spr('glowbar', 256, 32, g => { const gr = g.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, 'rgba(255,241,176,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,241,176,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 32);
  const hz = g.createLinearGradient(0, 0, 256, 0); hz.addColorStop(0, 'rgba(0,0,0,1)'); hz.addColorStop(0.15, 'rgba(0,0,0,0)'); hz.addColorStop(0.85, 'rgba(0,0,0,0)'); hz.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = hz; g.fillRect(0, 0, 256, 32); });
const streakImg = gold => Art.spr('streak|' + gold, 256, 48, g => { const gr = g.createRadialGradient(128, 24, 2, 128, 24, 128); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, gold ? 'rgba(255,215,106,.9)' : 'rgba(255,230,245,.85)'); gr.addColorStop(1, 'rgba(255,215,106,0)');
  g.fillStyle = gr; g.save(); g.scale(1, 0.19); g.beginPath(); g.arc(128, 126, 128, 0, Math.PI * 2); g.fill(); g.restore(); });
const shadowImg = () => Art.spr('tshadow', 128, 40, g => { const gr = g.createRadialGradient(64, 20, 2, 64, 20, 64); gr.addColorStop(0, 'rgba(60,0,40,.45)'); gr.addColorStop(1, 'rgba(60,0,40,0)'); g.fillStyle = gr; g.save(); g.scale(1, 0.31); g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill(); g.restore(); });
const dashRing = () => Art.spr('dashring', 128, 128, g => { g.setLineDash([12, 10]); g.lineWidth = 7; g.strokeStyle = 'rgba(120,130,150,.95)'; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke(); });
const greyPuff = () => Art.spr('greypuff', 120, 96, p => { p.fillStyle = '#9aa3b5'; p.beginPath(); p.arc(60, 40, 24, 0, 7); p.arc(36, 46, 18, 0, 7); p.arc(84, 46, 18, 0, 7); p.arc(60, 24, 16, 0, 7); p.fill();
  p.strokeStyle = '#7fb4ff'; p.lineWidth = 4; p.lineCap = 'round'; for (let i = 0; i < 4; i++) { p.beginPath(); p.moveTo(36 + i * 16, 66); p.lineTo(32 + i * 16, 82); p.stroke(); } });
const laneGrey = () => Art.spr('lanegrey', 64, 256, g => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(110,118,135,0)'); gr.addColorStop(1, 'rgba(110,118,135,.55)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); });
// missed tile: a grey, cracked copy of the tile sprite (made once per tile sprite)
const greyTile = im => Art.spr('grey|' + (im.__k || (im.__k = Math.random().toString(36).slice(2))), im.width, im.height, g => { g.filter = 'grayscale(1) brightness(1.1)'; g.drawImage(im, 0, 0); g.filter = 'none';
  g.globalCompositeOperation = 'source-atop'; g.strokeStyle = 'rgba(60,60,80,.75)'; g.lineWidth = Math.max(2, im.width * 0.025); const w = im.width, h = im.height; g.beginPath(); g.moveTo(w * 0.3, h * 0.15); g.lineTo(w * 0.45, h * 0.45); g.lineTo(w * 0.38, h * 0.6); g.lineTo(w * 0.55, h * 0.88); g.moveTo(w * 0.45, h * 0.45); g.lineTo(w * 0.68, h * 0.4); g.stroke(); });
// pre-rendered text sprites (judgements, combos, power-up labels, countdown): gradient fill, white outline, a sparkle; no per-frame fillText
const POPC = new Map();
function popMake(txt, col, big) { const k = txt + '|' + col + '|' + (big ? 1 : 0); let im = POPC.get(k); if (im) return im;
  const fs = big ? 34 : 22, sc = 2, pad = 10, m = document.createElement('canvas').getContext('2d'); m.font = `800 ${fs}px ${FONT || 'sans-serif'}`; const w = Math.ceil(m.measureText(txt).width) + pad * 2 + 8, h = Math.ceil(fs * 1.5) + pad;
  im = document.createElement('canvas'); im.width = w * sc; im.height = h * sc; const g = im.getContext('2d'); g.scale(sc, sc); g.font = m.font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const gr = g.createLinearGradient(0, pad, 0, h - pad); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, col); gr.addColorStop(1, col);
  g.lineWidth = big ? 7 : 5; g.strokeStyle = '#fff'; g.strokeText(txt, w / 2, h / 2); g.lineWidth = 1.5; g.strokeStyle = 'rgba(90,23,71,.45)'; g.strokeText(txt, w / 2, h / 2); g.fillStyle = gr; g.fillText(txt, w / 2, h / 2);
  Art.sparkle(g, w - pad - 2, pad + 2, big ? 8 : 6, '#fff'); im.cw = w; im.ch = h; if (POPC.size > 160) POPC.delete(POPC.keys().next().value); POPC.set(k, im); return im; }
const countImg = k => popMake(k === 'go' ? tx('go') : k, k === 'go' ? '#f0a91c' : '#ff4fa3', true);
// ---------- particles (fixed pools, no per-frame allocation; budget scales with quality) ----------
let DT = 1 / 60; const BGMS = [33, 33, 66, 1e9], PBUDGET = [140, 100, 60, 30];
const POOL = Array.from({ length: 140 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, s: 1, col: '', gem: null, im: null })); let poolI = 0, poolOn = 0;
function emit(x, y, n, big) { const GL = Art.GLITTER[G.spUntil > 0 ? 'gold' : S.eq.glitter], shape = Art.SHAPE_OF[S.eq.skin] || 'heart', q = G.qual || 0;
  if (q >= 2) n = Math.ceil(n / 2); n = Math.min(n, Math.max(0, PBUDGET[q] - poolOn)); for (let i = 0; i < n; i++) { const p = POOL[poolI = (poolI + 1) % POOL.length], a = Math.random() * Math.PI * 2, v = (big ? 220 : 120) + Math.random() * 260;
    if (!p.on) poolOn++; p.on = true; p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 160; p.age = 0; p.life = 0.45 + Math.random() * 0.35; p.s = 3 + Math.random() * 7; p.col = GL[i % GL.length]; p.gem = i % 5 === 0 ? (i % 10 === 0 ? 'star' : shape) : null;
    p.im = p.gem ? Art.gemImg(p.gem, '#fff', p.col, 24) : Art.sparkleImg(p.col); } }
// gem-shard burst (Perfect 8, Great 4, Good 0; halved at low quality): drawImage + setTransform only
const SHARDS = Array.from({ length: 48 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, age: 0, life: 1, k: 1, im: null })); let shardI = 0;
function shardBurst(x, y, n, gold) { if ((G.qual || 0) >= 2) n >>= 1; if ((G.qual || 0) >= 3 || !Art.shardImg) return; const GL = Art.GLITTER[gold ? 'gold' : S.eq.glitter];
  for (let i = 0; i < n; i++) { const p = SHARDS[shardI = (shardI + 1) % SHARDS.length], a = -Math.PI / 2 + (i / n - 0.5) * 2.6 + (Math.random() - 0.5) * 0.4, v = 260 + Math.random() * 220;
    p.on = true; p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.r = a + Math.PI / 2; p.vr = (Math.random() - 0.5) * 12; p.age = 0; p.life = 0.5 + Math.random() * 0.25; p.k = 0.7 + Math.random() * 0.6; p.im = Art.shardImg(GL[i % GL.length]); } }
// ---------- judging ----------
const mult = () => Math.min(4, 1 + Math.floor(G.combo / 10)) * (G.spUntil > 0 ? 2 : 1) * (G.pu.double > G.nowS ? 2 : 1);
const PTS = { perfect: 100, great: 70, good: 40 }, JCOL = { perfect: '#ff4fa3', great: '#a66bff', good: '#3aa0d8' }, MILES = [10, 25, 50, 75, 100, 150, 200];
const pop = (x, y, txt, col, a, big) => { if (G.pops.length > 6) G.pops.shift(); G.pops.push({ x, y, im: popMake(txt, col, big), a, a0: a, big }); };
function hitTile(t, dt, pid) {
  const a = Math.abs(dt), j = a <= G.D.perf ? 'perfect' : a <= G.D.great ? 'great' : 'good';
  G.j[j]++; G.combo++; G.missRun = 0; G.maxCombo = Math.max(G.maxCombo, G.combo); G.score += PTS[j] * mult(); t.judge = j; t.dt = dt;
  const x = laneX(t.lane, 1); G.laneHit[t.lane] = 1; G.flares[t.lane] = 1; G.flareJ[t.lane] = j === 'perfect' ? 2 : j === 'great' ? 1 : 0; G.streak[t.lane] = j === 'good' ? 0.5 : 1;
  emit(x, L.strikeY, j === 'perfect' ? 12 : 8, j === 'perfect'); shardBurst(x, L.strikeY, j === 'perfect' ? 8 : j === 'great' ? 4 : 0, j === 'perfect');
  pop(x, L.strikeY - L.lw * 0.6, tx(j), JCOL[j], 1, false);
  if (G.spUntil < 0) { G.sp = Math.min(1, G.sp + (j === 'perfect' ? 0.045 : 0.03)); }
  if (t.dur > 0) { t.state = 3; G.holds.set(pid, t); } else t.state = 1;
  // combo milestones: visual only (medallion shine + fireworks). No sound here: a tile tap never makes a sound.
  if (MILES.includes(G.combo)) { G.mood = 'wow'; G.moodT = performance.now() + 1400; pop(L.cx, L.H * 0.3, tx('combo', G.combo), '#ff4fa3', 1.5, true); firework(G.combo >= 50 ? 4 : 2); G.medalT = G.nowS; if (G.combo >= 25) G.shake = Math.max(G.shake, 0.5); }
  else if (G.combo % 5 === 0) { G.mood = 'happy'; G.moodT = performance.now() + 600; }
  if (G.D.heal && G.combo % G.D.heal === 0 && G.hearts !== Infinity && G.hearts < G.D.hearts) { G.hearts++; pop(L.cx, L.H * 0.45, tx('heartPlus'), '#ff4fa3', 1.2, false); } // Easy (15) / Normal (25): streaks heal
  G.hudDirty = true; if (pid !== -1) G.pendingTap = G.pendingTap || { perf: G.tapPerf };
}
function missTile(t, now) {
  t.state = 2; G.j.miss++; G.combo = 0; G.mood = 'oops'; G.moodT = performance.now() + 800; G.hudDirty = true; G.missFx[t.lane] = 1; // in-lane miss: grey cloud + dashed ring + grey stripe, no full-screen flash
  pop(laneX(t.lane, 1), L.strikeY - L.lw * 0.75, tx('miss'), '#7a8396', 0.9, false);
  if (S.set.missFx !== false) { const ctx = A.ctx(), n = ctx.currentTime; // subtle GH-style miss: duck the melody stem / muffle the track (~200 ms). Param automation only, no new nodes.
    if (G.duck) { const g = G.duck.gain; g.cancelScheduledValues(n); g.setValueAtTime(g.value, n); g.linearRampToValueAtTime(0.35, n + 0.03); g.linearRampToValueAtTime(1, n + 0.25); }
    if (G.muffle) { const f = G.muffle.frequency; f.cancelScheduledValues(n); f.setValueAtTime(f.value, n); f.exponentialRampToValueAtTime(900, n + 0.03); f.exponentialRampToValueAtTime(20000, n + 0.28); } }
  if (!t.pair && ++G.missRun >= 3 && G.diff !== 'hard' && !(G.pu.slowmo > now)) { G.missRun = 0; G.pu.slowmo = now + 5; pop(L.cx, L.H * 0.36, tx('slowHelp'), '#22a37f', 1.4, true); } // Easy/Normal assist: 3 misses in a row -> automatic slow-mo
  if (G.shield > 0 && !t.pair) { G.shield--; pop(L.cx, L.H * 0.4, tx('savedPop'), '#3aa0d8', 1.2, false); G.combo = 0; return; }
  if (G.hearts !== Infinity && !t.pair) { G.hearts--; if (G.hearts <= 0) outOfHearts(); }
}
// input: pointerdown (no click delay), multi-touch, judged at the event's own timestamp mapped to the audio clock
cv.addEventListener('pointerdown', e => {
  if (!G.on || G.ended) return; if (e.pointerType === 'mouse' && e.button !== 0) return;
  const x = e.clientX - VIEW.left, y = e.clientY - VIEW.top, lane = laneAt(x, y); // cached offset: no layout read on the tap path
  if (G.tut && G.tut.wait) { tutTap(lane, e.pointerId); return; } if (G.paused) return; try { cv.setPointerCapture(e.pointerId); } catch (_) { } if (lane < 0 || lane > 3) return;
  const perf = perfOf(e), now = judgeAt(perf); G.press.set(e.pointerId, lane); G.tapPerf = perf;
  let best = null, bd = 1e9; for (let i = G.first; i < G.tiles.length; i++) { const t = G.tiles[i]; if (t.t - now > G.win) break; if (t.state || t.lane !== lane) continue; const d = Math.abs(now - t.t); if (d <= G.win && d < bd) { bd = d; best = t; } }
  if (!best) { const fr = Math.max(0, Math.min(1, (L.strikeY - L.lw * 0.9 - y) / L.span)), s = 1 - fr * (1 - L.sFar), v = (x - L.cx) / (L.lw * s) + 2, f = v - Math.floor(v), nb = f < 0.3 ? lane - 1 : f > 0.7 ? lane + 1 : -1;
    if (nb >= 0 && nb <= 3) for (let i = G.first; i < G.tiles.length; i++) { const t = G.tiles[i]; if (t.t - now > G.win) break; if (t.state || t.lane !== nb) continue; const d = Math.abs(now - t.t); if (d <= G.win * 0.8 && d < bd) { bd = d; best = t; } }
    if (best) G.press.set(e.pointerId, best.lane); }
  let it = null; if (!best) for (const x of G.items) { if (x.t - now > G.win) break; if (!x.state && x.lane === lane && Math.abs(x.t - now) <= G.win * (x.kind === 'obs' ? 0.7 : 1.3)) { it = x; break; } }
  if (best) hitTile(best, now - best.t, e.pointerId); else if (it) { if (it.kind === 'pu') collect(it); else hitObstacle(it); } else { G.laneFlash[lane] = 0.6; if (G.diff === 'hard') { G.combo = 0; G.hudDirty = true; } }
}, { passive: true });
const endHold = e => { G.press.delete(e.pointerId); const t = G.holds.get(e.pointerId); if (!t) return; G.holds.delete(e.pointerId); if (t.holdP >= 0.85) { t.holdP = 1; G.score += 50 * mult(); emit(laneX(t.lane, 1), L.strikeY, 12, true); } t.state = 1; };
cv.addEventListener('pointerup', endHold, { passive: true }); cv.addEventListener('pointercancel', endHold, { passive: true });
// ---------- v2b: power-ups, obstacles, immersive reactions ----------
const PU = { magnet: { e: '🧲', col: '#ff4fa3', name: 'Magnet', dur: 5 }, shield: { e: '🛡️', col: '#5ad1ff', name: 'Shield', dur: 0 }, slowmo: { e: '🐢', col: '#9ff0c8', name: 'Slow-Mo', dur: 6 },
  double: { e: '✖️2', col: '#ffd76a', name: 'Double Points', dur: 8 }, rainbow: { e: '🌈', col: '#b98cff', name: 'Rainbow Blast', dur: 0 }, heart: { e: '💗', col: '#ff7cb8', name: 'Heart', dur: 0 } };
const OBS = ['bomb', 'car', 'spiky', 'cloud'];
const puImg = k => Art.spr('pu|' + k, 120, 120, (p) => { const g = p.createRadialGradient(60, 60, 4, 60, 60, 58); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, PU[k].col); g.addColorStop(1, PU[k].col + '00'); p.fillStyle = g; p.fillRect(0, 0, 120, 120);
  p.fillStyle = '#fff'; p.beginPath(); p.arc(60, 60, 34, 0, 7); p.fill(); p.lineWidth = 6; p.strokeStyle = PU[k].col; p.stroke(); p.font = '800 36px sans-serif'; p.textAlign = 'center'; p.textBaseline = 'middle'; p.fillStyle = '#5a1747'; p.fillText(PU[k].e, 60, 62);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; Art.sparkle(p, 60 + Math.cos(a) * 46, 60 + Math.sin(a) * 46, 7, '#fff'); } });
const obsImg = k => Art.spr('ob|' + k, 128, 128, (o) => { const g = o.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, 'rgba(255,40,40,.55)'); g.addColorStop(1, 'rgba(255,40,40,0)'); o.fillStyle = g; o.fillRect(0, 0, 128, 128); // warning glow
  o.lineWidth = 4; o.strokeStyle = '#2b0a1e';
  if (k === 'bomb') { o.fillStyle = '#2d2d3a'; o.beginPath(); o.arc(60, 70, 32, 0, 7); o.fill(); o.fillStyle = '#555'; o.fillRect(52, 32, 18, 10); o.strokeStyle = '#a0522d'; o.beginPath(); o.moveTo(61, 32); o.quadraticCurveTo(70, 14, 86, 18); o.stroke(); o.fillStyle = '#fff'; o.beginPath(); o.arc(50, 62, 7, 0, 7); o.arc(70, 62, 7, 0, 7); o.fill(); o.fillStyle = '#000'; o.beginPath(); o.arc(52, 64, 3, 0, 7); o.arc(72, 64, 3, 0, 7); o.fill(); o.strokeStyle = '#fff'; o.beginPath(); o.arc(60, 84, 8, 3.6, 5.8); o.stroke(); }
  if (k === 'car') { o.fillStyle = '#ff3b3b'; Art.rr(o, 22, 50, 84, 34, 12); o.fill(); o.stroke(); o.fillStyle = '#ffd1d1'; Art.rr(o, 40, 36, 46, 24, 8); o.fill(); o.fillStyle = '#222'; [38, 90].forEach(x => { o.beginPath(); o.arc(x, 88, 11, 0, 7); o.fill(); }); o.fillStyle = '#fff7a8'; o.fillRect(100, 58, 8, 10); o.fillStyle = '#fff'; o.font = '800 18px sans-serif'; o.fillText('7', 58, 76); }
  if (k === 'spiky') { o.fillStyle = '#8a3ffc'; o.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 26 : 42; o.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } o.closePath(); o.fill(); o.stroke(); o.fillStyle = '#fff'; o.beginPath(); o.arc(55, 58, 7, 0, 7); o.arc(73, 58, 7, 0, 7); o.fill(); o.fillStyle = '#000'; o.beginPath(); o.arc(55, 60, 3, 0, 7); o.arc(73, 60, 3, 0, 7); o.fill(); o.strokeStyle = '#000'; o.beginPath(); o.moveTo(48, 50); o.lineTo(60, 54); o.moveTo(80, 50); o.lineTo(68, 54); o.stroke(); }
  if (k === 'snowball') { o.fillStyle = '#ffffff'; o.beginPath(); o.arc(64, 66, 34, 0, 7); o.fill(); o.strokeStyle = '#9ccfff'; o.stroke(); o.fillStyle = '#2b0a1e'; o.beginPath(); o.arc(54, 60, 4, 0, 7); o.arc(74, 60, 4, 0, 7); o.fill(); o.fillStyle = '#ff8a2a'; o.beginPath(); o.moveTo(64, 66); o.lineTo(84, 70); o.lineTo(64, 72); o.fill(); }
  if (k === 'lava') { o.fillStyle = '#ff5a00'; o.beginPath(); o.moveTo(30, 96); o.quadraticCurveTo(28, 40, 64, 30); o.quadraticCurveTo(100, 40, 98, 96); o.closePath(); o.fill(); o.fillStyle = '#ffd23f'; o.beginPath(); o.arc(52, 70, 9, 0, 7); o.arc(78, 58, 6, 0, 7); o.fill(); o.fillStyle = '#2b0a1e'; o.beginPath(); o.arc(56, 56, 4, 0, 7); o.arc(74, 56, 4, 0, 7); o.fill(); }
  if (k === 'crab') { o.fillStyle = '#ff4d4d'; o.beginPath(); o.ellipse(64, 72, 34, 22, 0, 0, 7); o.fill(); o.stroke(); [[26, 50], [102, 50]].forEach(([x, y]) => { o.beginPath(); o.arc(x, y, 12, 0.3, 5.9); o.lineTo(x, y); o.fill(); o.stroke(); }); o.fillStyle = '#fff'; o.beginPath(); o.arc(54, 50, 7, 0, 7); o.arc(74, 50, 7, 0, 7); o.fill(); o.fillStyle = '#000'; o.beginPath(); o.arc(54, 50, 3, 0, 7); o.arc(74, 50, 3, 0, 7); o.fill(); }
  if (k === 'cloud') { o.fillStyle = '#6b7280'; o.beginPath(); o.arc(64, 60, 26, 0, 7); o.arc(40, 70, 20, 0, 7); o.arc(88, 70, 20, 0, 7); o.fill(); o.fillStyle = '#ffe14d'; o.beginPath(); o.moveTo(62, 84); o.lineTo(52, 108); o.lineTo(64, 104); o.lineTo(58, 124); o.lineTo(78, 96); o.lineTo(66, 98); o.lineTo(72, 84); o.fill(); o.fillStyle = '#fff'; o.beginPath(); o.arc(54, 62, 5, 0, 7); o.arc(74, 62, 5, 0, 7); o.fill(); o.strokeStyle = '#111'; o.beginPath(); o.moveTo(46, 52); o.lineTo(58, 57); o.moveTo(82, 52); o.lineTo(70, 57); o.stroke(); } });
let OB_SET = OBS; const PU_HI = { magnet: 'चुंबक', shield: 'ढाल', slowmo: 'धीमी चाल', double: 'दुगने अंक', rainbow: 'इंद्रधनुष धमाका', heart: 'दिल' };
const puName = k => S.set.lang === 'hi' ? PU_HI[k] : PU[k].name;
function buildItems(b, diff) {
  // per-lane note lists + binary search: "is this lane free at time t?" without scanning every note (was O(beats x lanes x notes))
  const byLane = [[], [], [], []], maxDur = [0, 0, 0, 0]; for (const n of G.tiles) { byLane[n.lane].push(n); maxDur[n.lane] = Math.max(maxDur[n.lane], n.dur || 0); }
  const items = [], laneFree = (t, lane, pad) => { const a = byLane[lane], lo0 = t - pad - maxDur[lane]; let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m].t < lo0) lo = m + 1; else hi = m; }
    for (let i = lo; i < a.length && a[i].t < t + pad; i++) if (t > a[i].t - pad && t < a[i].t + (a[i].dur || 0) + pad) return false; return true; };
  const free = (t, lane, pad) => laneFree(t, lane, pad) && !items.some(i => Math.abs(i.t - t) < 0.6);
  if (G.lab) { const it = [], step = G.lab.dens || 1.6; let k = 0; for (let t = 2.5; t < b.end - 1; t += step, k++) { const lane = k % 4; if (!laneFree(t, lane, 0.35)) continue; it.push(k % 2 ? { t, lane, kind: 'obs', ob: G.lab.obs || ((Art.THEMES[G.theme] || {}).obs || OBS)[k % 2], state: 0 } : { t, lane, kind: 'pu', pu: G.lab.pu || Object.keys(PU)[k % 6], state: 0 }); } return it; }
  const beats = (b.beatTimes || []).map(x => x[0]).filter(t => t > 1.5 && t < b.end - 2);
  if (G.tut) { // tutorial: one power-up to tap, then one obstacle to leave alone, after the first 3 guided tiles
    const t3 = (G.tiles.filter(n => !n.pair && !n.dur)[2] || { t: 6 }).t, put = (t0, kind) => { for (const t of beats) if (t > t0) for (const l of [1, 2, 0, 3]) if (free(t, l, 0.6)) { items.push(kind === 'pu' ? { t, lane: l, kind, pu: 'double', state: 0 } : { t, lane: l, kind, ob: ((Art.THEMES[G.theme] || {}).obs || OBS)[0], state: 0 }); return t; } return t0; };
    put(put(t3 + 1.2, 'pu') + 2.5, 'obs'); return items.sort((a, b) => a.t - b.t); }
  let rs = 7; const R = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  // power-ups on beats every ~10-14 s
  const kinds = Object.keys(PU); let nextP = 6 + R() * 4;
  if (S.set.powerups !== false) for (const t of beats) if (t >= nextP) { const lanes = [0, 1, 2, 3].filter(l => free(t, l, 0.35)); if (lanes.length) { items.push({ t, lane: lanes[Math.floor(R() * lanes.length)], kind: 'pu', pu: kinds[Math.floor(R() * kinds.length)], state: 0 }); nextP = t + (diff === 'easy' ? 9 : 12) + R() * 4; } }
  const obsOn = S.set.obstacles !== false && (!G.practice || S.set.obsPractice);
  if (obsOn) { const per10 = diff === 'easy' ? 0.5 : diff === 'normal' ? 1.6 : 2.6; let nextO = 5 + R() * 3;
    for (let i = 0; i < beats.length - 1; i++) { const t = (beats[i] + beats[i + 1]) / 2; if (t < nextO) continue; // between beats, off the notes
      const lanes = [0, 1, 2, 3].filter(l => free(t, l, diff === 'easy' ? 0.5 : 0.4)); if (!lanes.length) continue;
      items.push({ t, lane: lanes[Math.floor(R() * lanes.length)], kind: 'obs', ob: (OB_SET = (Art.THEMES[G.theme] || {}).obs || OBS, (G.lab && G.lab.obs) || OB_SET[Math.floor(R() * OB_SET.length)]), state: 0 }); nextO = t + 10 / per10 * (0.7 + R() * 0.6); } }
  return items.sort((a, b) => a.t - b.t);
}
function collect(it) {
  it.state = 1; const k = it.pu, P = PU[k], now = G.nowS; G.stats.pu[k] = (G.stats.pu[k] || 0) + 1; A.fx('powerup'); G.shake = 0.4; // tapping a power-up (not a tile) plays its effect sound
  pop(L.cx, L.H * 0.34, P.e + ' ' + puName(k) + '!', P.col, 1.6, true); emit(laneX(it.lane, 1), L.strikeY, 18, true);
  if (k === 'shield') G.shield = Math.min(5, G.shield + 3); else if (k === 'heart') { if (G.hearts !== Infinity) G.hearts = Math.min(G.D.hearts, G.hearts + 1); G.hudDirty = true; }
  else if (k === 'rainbow') { let n = 0; for (let i = G.first; i < G.tiles.length; i++) { const t = G.tiles[i]; if (t.t - now > G.lead) break; if (!t.state && !t.dur) { t.state = 1; n++; G.j.perfect++; G.combo++; emit(laneX(t.lane, 0.8), L.H * 0.5, 4); } }
    G.maxCombo = Math.max(G.maxCombo, G.combo); G.score += 300 + n * 150; cssFx('fxRainbow'); G.stats.rainbow = true; }
  else G.pu[k] = Math.min(now + P.dur * 2, Math.max(now, G.pu[k] || 0) + P.dur);
}
function hitObstacle(it) {
  A.fx('poof'); it.state = 2; G.poofs.push({ x: laneX(it.lane, 1), y: L.strikeY - L.lw * 0.4, a: 1 }); G.shake = 0.7;
  if (G.shield > 0) { G.shield--; pop(L.cx, L.H * 0.4, tx('blocked'), '#3aa0d8', 1.2, false); return; }
  G.combo = 0; cssFx('fxFlash'); G.mood = 'oops'; G.moodT = performance.now() + 900; pop(laneX(it.lane, 1), L.strikeY - L.lw, tx('poof'), '#6b7280', 1.3, false);
  if (G.hearts !== Infinity && !(G.diff === 'easy' && G.hearts <= 1)) { G.hearts--; G.hudDirty = true; if (G.hearts <= 0) outOfHearts(); } // Easy: an obstacle never takes the last heart
}
function updItems(jnow) {
  for (const it of G.items) { if (it.t > jnow + 0.2) break; if (it.state) continue; const late = jnow - it.t;
    if (it.kind === 'obs' && late > G.win) { it.state = 3; G.stats.dodged++; G.score += 50; A.fx('dodge'); G.seenObs.add(it.ob); pop(laneX(it.lane, 1), L.strikeY - L.lw * 0.8, tx('dodged'), '#22a37f', 1, false); if (G.tut && !G.tut.done) tutFinish(); }
    if (it.kind === 'pu' && late > G.win) it.state = 3; }
}
// first time an obstacle type shows up this session it wears a big "🚫 don't tap" badge; power-ups get a bobbing 👆
const badgeImg = () => popMake('🚫 ' + tx('dontTap'), '#e0285a', false), fingerImg = () => Art.spr('finger', 64, 64, g => { g.font = '44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('👆', 32, 36); });
function drawItems(vnow, lead, T) {
  for (const it of G.items) { const u = (it.t - vnow) / lead; if (u > 1.02) break; if (it.state === 1 || it.state === 2 || u < -0.15) continue;
    projS(u); const s = PS, y = PY, sz = L.lw * 0.8 * s, x = laneX(it.lane, s) + (it.ob === 'car' ? Math.sin(T * 30) * 2 : 0), bob = it.kind === 'pu' ? Math.sin(T * 6) * 4 * s : 0;
    c.drawImage(it.kind === 'pu' ? puImg(it.pu) : obsImg(it.ob), x - sz / 2, y - sz / 2 + bob, sz, sz);
    if (it.ob === 'bomb') spark(SPR.sparkGold, x + sz * 0.17, y - sz * 0.62, 6 * s * (1 + 0.5 * Math.sin(T * 25)), 1); // fuse spark
    if (it.ob === 'car') { c.globalAlpha = 0.5; c.fillStyle = '#fff'; c.fillRect(x - sz * 0.05, y - sz * 0.95, sz * 0.1, sz * 0.25 * s); c.globalAlpha = 1; }
    if (it.kind === 'obs' && it.state === 0 && (!G.seenObs.has(it.ob) || (G.tut && !G.tut.done)) && u < 0.9) { const im = badgeImg(), k = Math.max(0.55, s) * 0.9; c.drawImage(im, x - im.cw * k / 2, y - sz * 0.7 - im.ch * k, im.cw * k, im.ch * k); }
    if (it.kind === 'pu' && it.state === 0 && (G.qual || 0) < 2) { const f = fingerImg(), k = sz * 0.45; c.globalAlpha = 0.65 + 0.35 * Math.sin(T * 8); c.drawImage(f, x + sz * 0.25, y - sz * 0.35 + Math.abs(Math.sin(T * 5)) * 6 * s, k, k); c.globalAlpha = 1; } }
  for (let i = G.poofs.length - 1; i >= 0; i--) { const p = G.poofs[i]; p.a -= 2.4 * DT; if (p.a <= 0) { G.poofs.splice(i, 1); continue; } c.globalAlpha = p.a; c.drawImage(cloudPuff(), p.x - 60 * (2 - p.a), p.y - 40 * (2 - p.a), 120 * (2 - p.a), 80 * (2 - p.a)); c.globalAlpha = 1; }
}
const cloudPuff = () => Art.spr('puff', 120, 80, p => { p.fillStyle = '#eef'; p.beginPath(); p.arc(60, 44, 26, 0, 7); p.arc(34, 50, 20, 0, 7); p.arc(86, 50, 20, 0, 7); p.arc(60, 26, 18, 0, 7); p.fill(); });
// power-up HUD timers (top right, under the score): jewel capsules, label sprites
const capsuleImg = col => Art.spr('cap|' + col, 240, 68, g => { const gr = g.createLinearGradient(0, 0, 0, 68); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e6dcf0'); g.fillStyle = gr; Art.rr(g, 3, 3, 234, 62, 31); g.fill(); g.lineWidth = 5; g.strokeStyle = col; g.stroke();
  g.globalAlpha = 0.6; g.fillStyle = '#fff'; Art.rr(g, 18, 9, 180, 14, 7); g.fill(); g.globalAlpha = 1; g.fillStyle = 'rgba(90,23,71,.15)'; Art.rr(g, 88, 26, 136, 16, 8); g.fill(); });
function drawPuHud(now) { let y = 74; const x = L.W - 132;
  const row = (lab, frac, col) => { c.drawImage(capsuleImg(col), x, y, 120, 34); const im = popMake(lab, '#5a1747', false), k = 26 / im.ch; c.drawImage(im, x + 4, y + 4, im.cw * k, 26); c.fillStyle = col; c.fillRect(x + 46, y + 14, 64 * Math.max(0, Math.min(1, frac)), 6); y += 40; };
  for (const k in G.pu) { const left = G.pu[k] - now; if (left > 0) row(PU[k].e, left / PU[k].dur, PU[k].col); }
  if (G.shield > 0) row('🛡️×' + G.shield, 1, '#5ad1ff'); }
// immersive extras: skyline/parallax silhouettes with beat lights, combo fireworks, star-power rays, edge glow
const skyline = (theme, W, H) => Art.spr(`sky|${theme}|${W}|${H}`, W * 1.5, H * 0.32, (k, w, h) => {
  const col = { disco: '#1a0533', moon: '#2b2d6e', galaxy: '#140733', ocean: '#03305a', festival: '#5a0c18', candy: '#ffb3d9', rainbow: '#9fd8ff', pinkgold: '#ff8cc6' }[theme] || '#5a1747';
  k.fillStyle = col; let x = 0, i = 0; while (x < w) { const bw = 30 + ((i * 37) % 50), bh = h * (0.35 + ((i * 53) % 60) / 100); if (theme === 'ocean' || theme === 'candy' || theme === 'rainbow' || theme === 'pinkgold') { k.beginPath(); k.arc(x + bw / 2, h, bw * 0.9, Math.PI, 0); k.fill(); } else k.fillRect(x, h - bh, bw, bh); x += bw + 4; i++; } });
const lights = (theme, W, H) => Art.spr(`lights|${theme}|${W}|${H}`, W * 1.5, H * 0.32, (k, w, h) => { let x = 0, i = 0; while (x < w) { const bw = 30 + ((i * 37) % 50), bh = h * (0.35 + ((i * 53) % 60) / 100);
  for (let yy = h - bh + 8; yy < h - 6; yy += 12) for (let xx = x + 5; xx < x + bw - 5; xx += 9) if (((xx * 7 + yy * 3) | 0) % 5 < 2) { k.fillStyle = ['#ffe066', '#ff7ce0', '#7dfcff'][(xx + yy) % 3]; k.fillRect(xx, yy, 4, 5); } x += bw + 4; i++; } });
const rays = () => Art.spr('rays', 512, 512, r => { r.translate(256, 256); for (let i = 0; i < 16; i++) { r.rotate(Math.PI / 8); r.fillStyle = i % 2 ? 'rgba(255,215,106,.35)' : 'rgba(255,255,255,.18)'; r.beginPath(); r.moveTo(0, 0); r.lineTo(-30, -256); r.lineTo(30, -256); r.fill(); } });
const FW = Array.from({ length: 60 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, im: null }));
function firework(n) { if ((G.qual || 0) >= 3 || S.set.calm) return; let j = 0; for (let k = 0; k < n; k++) { const cx = L.W * (0.15 + Math.random() * 0.7), cy = L.H * (0.12 + Math.random() * 0.25), im = Art.sparkleImg(['#ff4fa3', '#ffd76a', '#7dfcff', '#b98cff', '#9ff0c8'][k % 5]);
  for (let i = 0; i < 12; i++) { while (j < FW.length && FW[j].on) j++; if (j >= FW.length) return; const p = FW[j], a = i / 12 * Math.PI * 2; p.on = true; p.x = cx; p.y = cy; p.vx = Math.cos(a) * 140; p.vy = Math.sin(a) * 140; p.age = 0; p.im = im; } } }
// background-layer extras (drawn at the time-based background rate): city skyline with beat lights, star-power rays, fireworks
function drawImmersive(T, beat, energy, spOn, c, bdt) { const pulse = Math.pow(1 - (beat % 1 + 1) % 1, 3);
  const city = G.theme === 'disco' || (G.theme === 'neon' && !Art.parallax); if (city) { const sk = skyline(G.theme, L.W, L.H), off = -((T * 12) % (L.W * 0.5)), y = L.H * 0.68 - pulse * 3; c.globalAlpha = 0.55; c.drawImage(sk, off, y); c.globalAlpha = 0.25 + 0.6 * pulse * (0.5 + energy); c.drawImage(lights(G.theme, L.W, L.H), off, y); c.globalAlpha = 1; }
  if (spOn) { c.save(); c.translate(L.cx, L.H * 0.3); c.rotate(S.set.calm ? 0 : T * 0.4); const R = Math.max(L.W, L.H); c.globalAlpha = S.set.calm ? 0.5 : 1; c.drawImage(rays(), -R, -R, R * 2, R * 2); c.restore(); }
  for (const p of FW) { if (!p.on) continue; p.age += bdt; if (p.age > 1.1) { p.on = false; continue; } p.vy += 60 * bdt; p.x += p.vx * bdt; p.y += p.vy * bdt; const a = 1 - p.age / 1.1, s = 4; c.globalAlpha = a; c.drawImage(p.im, p.x - s * 1.33, p.y - s * 1.33, s * 2.67, s * 2.67); }
  c.globalAlpha = 1; }
// full-screen effects live in CSS layers (#fxEdge / #fxFlash / #fxRainbow): the compositor animates opacity, the canvas never fills the whole screen
const FX = { edge: $('#fxEdge') };
function edgeUpdate(pulse, energy, spOn, q) { const col = spOn ? '#ffd76a' : G.pu.double > G.nowS ? '#ffd76a' : G.shield > 0 ? '#5ad1ff' : (Art.THEMES[G.theme] || {}).ui || '#ff4fa3';
  if (col !== G.edgeCol) { G.edgeCol = col; FX.edge.style.setProperty('--ec', col); }
  const a = q >= 3 ? 0 : Math.round(Math.min(0.9, (S.set.calm ? 0.16 : 0.18 + 0.35 * pulse * (0.4 + energy)) + (spOn ? 0.25 : 0)) * 40) / 40; if (a !== G.edgeA) { G.edgeA = a; FX.edge.style.opacity = a; } }
const cssFx = id => { const el = document.getElementById(id); if (!el || !el.animate) return; const rb = id === 'fxRainbow', calm = S.set.calm;
  el.animate([{ opacity: rb ? (calm ? 0.12 : 0.45) : (calm ? 0.05 : 0.16) }, { opacity: 0 }], { duration: rb ? 900 : 450, easing: 'ease-out' }); };
const wipe = () => { const w = $('#wipe'); if (S.set.calm || !w || !w.animate) return; w.animate([{ transform: 'translateX(-110%)', opacity: 1 }, { transform: 'translateX(110%)', opacity: 1 }], { duration: 700, easing: 'ease-in-out' }); };

// ---------- frame ----------
let FONT = '', F18; const DOWN = [0, 0, 0, 0], markDown = l => { DOWN[l] = 1; }, SPEEDK = { slow: 1, normal: 0.82, fast: 0.66 }, NOSKIP = {}, RESUME = 2100, TAU = Math.PI * 2;
const initFont = () => { if (!FONT) { FONT = getComputedStyle(document.body).fontFamily; F18 = `800 18px ${FONT}`; } };
let LOOP = 0, LOOPS = 0; // exactly one gameplay rAF loop at a time
function startLoop() { const id = ++LOOP; LOOPS++; const step = ts => { if (id !== LOOP || !G.on) { LOOPS--; return; } requestAnimationFrame(step); if (G.cap60 && (G.skipTog = !G.skipTog)) return; frame(ts); }; requestAnimationFrame(step); }
function autoQuality(dtMs) { // adaptive quality: drop on sustained long frames, recover after a calm stretch. Ring buffer, percentile ~1x/s (no per-frame sort/alloc)
  const Q = G.Q || (G.Q = { base: 16.7, ema: 16.7, bad: 0, good: 0, ring: new Float32Array(120), srt: new Float32Array(120), n: 0, lastP: 0 }); if (G.paused || dtMs > 250) return;
  Q.ring[Q.n % 120] = dtMs; Q.n++; if (Q.n >= 30 && (Q.n === 30 || Q.n - Q.lastP >= 60)) { Q.lastP = Q.n; const m = Math.min(Q.n, 120); Q.srt.set(Q.ring.subarray(0, m)); const v = Q.srt.subarray(0, m).sort(); Q.base = Math.max(6, v[Math.floor(m * 0.1)]); }
  const base = Q.base * (G.cap60 ? 2 : 1); Q.ema += (dtMs - Q.ema) * 0.1; if (Q.ema > base * 1.3) { Q.bad += dtMs; Q.good = 0; } else if (Q.ema < base * 1.08) { Q.good += dtMs; Q.bad = 0; }
  if (Q.bad > 700) { Q.bad = 0; Q.ema = base; Q.hold = Math.min(60000, (Q.hold || 5000) * 2); // first step on a 120 Hz panel: even 60 fps pacing before lowering resolution
    if (!G.cap60 && Q.base < 12 && (G.qual || 0) === (G.qMin || 0)) { G.cap60 = true; G.qLog.push(['cap60', G.qual || 0, Math.round(G.nowS)]); }
    else if ((G.qual || 0) < 3) { G.qual = (G.qual || 0) + 1; G.bgDirty = true; G.spr = null; G.qLog.push(['down', G.qual, Math.round(G.nowS)]); } }
  if (Q.good > (Q.hold || 5000)) { Q.good = 0; if ((G.qual || 0) > (G.qMin || 0)) { G.qual--; G.bgDirty = true; G.spr = null; G.qLog.push(['up', G.qual, Math.round(G.nowS)]); } else if (G.cap60) { G.cap60 = false; G.qLog.push(['uncap', G.qual || 0, Math.round(G.nowS)]); } } }
function finishTail(now) { if (G.pendingTap) { G.ivl.push(performance.now() - G.pendingTap.perf); G.pendingTap = null; } }
// sprite references resolved once per layout / quality change (no template-string keys + Map lookups per tile per frame)
const SPR = {};
const ribbonImg = (a, b) => Art.spr('ribbon|' + a + b, 64, 256, g => { const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, b); h.addColorStop(0.3, a); h.addColorStop(0.5, '#ffffff'); h.addColorStop(0.7, a); h.addColorStop(1, b); g.fillStyle = h; g.fillRect(0, 0, 64, 256);
  g.globalAlpha = 0.35; g.fillStyle = '#fff'; for (let y = -64; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y + 20); g.lineTo(64, y); g.lineTo(64, y + 10); g.lineTo(0, y + 30); g.fill(); } g.globalAlpha = 1; });
const MEDAL = [['#ffffff', '#c9d1de', '#8f9bb0'], ['#ffe0d6', '#d98a7a', '#a8564e'], ['#fff1b0', '#f0b84a', '#b57800'], null];
const medalImg = tier => Art.spr('medal|' + tier, 96, 96, g => { const cx = 48, R = 44; if (MEDAL[tier]) { const gr = g.createLinearGradient(0, 4, 0, 92); MEDAL[tier].forEach((c, i) => gr.addColorStop(i / 2, c)); g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, R, 0, TAU); g.fill(); }
  else ['#ff6b9e', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#ff6b9e'].forEach((c, i, a) => { g.fillStyle = c; g.beginPath(); g.moveTo(cx, cx); g.arc(cx, cx, R, i / (a.length - 1) * TAU, (i + 1) / (a.length - 1) * TAU + 0.02); g.fill(); });
  const sk = g.createRadialGradient(cx, 40, 4, cx, cx, 34); sk.addColorStop(0, '#ff8cc6'); sk.addColorStop(1, '#a3135f'); g.fillStyle = sk; g.beginPath(); g.arc(cx, cx, 33, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.8)'; g.stroke();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; Art.sparkle(g, cx + Math.cos(a) * 39, cx + Math.sin(a) * 39, 3.5, '#fff', 0.9); } g.globalAlpha = 0.5; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(36, 26, 14, 6, -0.5, 0, TAU); g.fill(); });
function resolveSprites() { initFont(); const tw = L.lw * 0.92, th = L.lw * 0.74, sk = S.eq.skin, gl = S.eq.glitter, fr = S.eq.frame, P1 = Art.PAL[sk] || Art.PAL.pinkgem;
  SPR.tw = tw; SPR.th = th; SPR.tile = [0, 1, 2, 3, 4, 5].map(i => [0, 1, 2].map(f => Art.tileImg(sk, gl, fr, Art.SHAPE_OF[sk] || Art.MIX[i], tw, th, f))); SPR.star = [0, 1, 2].map(f => Art.tileImg('stars', 'gold', fr, 'star', tw, th, f));
  SPR.acc = Art.accentImg ? Art.accentImg(Art.highwayStyle(G.theme), tw, th) : null; SPR.btn = [0, 1, 2, 3].map(l => [btnImg(l, 0), btnImg(l, 1)]); SPR.glow = LANECOL.map(col => Art.glowImg(col)); SPR.flare = [0, 1, 2, 3].map(flareImg);
  SPR.bloom = Art.bloomImg ? LANECOL.map(col => Art.bloomImg(col)) : null; SPR.bloomGold = Art.bloomImg ? Art.bloomImg('#ffd76a') : SPR.flare[3]; SPR.streak = [streakImg(0), streakImg(1)]; SPR.sparkW = Art.sparkleImg('#ffffff'); SPR.sparkGold = Art.sparkleImg('#ffd76a');
  SPR.glowGold = Art.glowImg('#ffd76a'); SPR.ribbon = ribbonImg(P1[0], P1[1]); SPR.ribbonStar = ribbonImg('#fff2c4', '#f5b82e'); SPR.bead = Art.gemImg('diamond', '#ffffff', P1[1], 24); SPR.beadStar = Art.gemImg('star', '#ffffff', '#f5b82e', 24);
  SPR.scene = Art.scene(G.theme, L.W, L.H, 1, 'plain'); SPR.hw = highway(); SPR.grey = laneGrey(); SPR.dash = dashRing(); SPR.gpuff = greyPuff(); SPR.shadow = shadowImg(); SPR.bar = glowBar(); SPR.medal = [0, 1, 2, 3].map(medalImg);
  G.spr = SPR; }
const spark = (im, x, y, s, a) => { if (s < 0.5 || a <= 0.02) return; c.globalAlpha = a > 1 ? 1 : a; c.drawImage(im, x - s * 1.33, y - s * 1.33, s * 2.67, s * 2.67); c.globalAlpha = 1; };
const easeBack = x => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
function drawSpriteC(im, x, y, h, a) { let k = h / im.ch; const maxW = L.W * 0.94; if (im.cw * k > maxW) { k = maxW / im.cw; h = im.ch * k; } const w = im.cw * k; x = Math.max(w / 2 + L.W * 0.03, Math.min(L.W * 0.97 - w / 2, x)); // big pops shrink / shift to stay on screen
  c.globalAlpha = a; c.drawImage(im, x - w / 2, y - h / 2, w, h); c.globalAlpha = 1; }
function frame(ts) {
  const f0 = performance.now(); if (G.lastFrame) { const d = ts - G.lastFrame; G.fi[G.fN & 4095] = d; DT = Math.min(0.05, Math.max(0.001, d / 1000)); if (S.set.autoQ !== false) autoQuality(d); } G.lastFrame = ts;
  if (layout() || !G.spr) resolveSprites();
  if (G.resuming && performance.now() >= G.resuming) doResume();
  if (G.paused && !G.resuming && G.pausedDrawn && !(G.tut && G.tut.wait)) return; // paused: the last frame stays on screen, nothing to redraw
  // draw time = rAF vsync timestamp + smoothed callback delay: same average sync as before, without main-thread jitter. Positions still come from the audio clock.
  const lag = f0 - ts; if (lag >= 0 && lag < 50) G.dly += (lag - G.dly) * 0.05; const tv = lag >= -2 && lag < 100 ? ts + G.dly : f0;
  if (!G.paused) updateClock();
  const calm = !!S.set.calm, q = G.qual || 0, T = ts / 1000, now = G.paused ? G.pauseAt : songAt(tv), jnow = now - S.set.offset / 1000, vnow = jnow + (S.set.vis || 0) / 1000, lead0 = G.D.lead * (SPEEDK[S.set.speed || 'slow'] || 1);
  G.nowS = now; G.slow += ((G.pu.slowmo > now ? 1.5 : 1) - G.slow) * (1 - Math.pow(0.94, DT * 60)); const lead = lead0 * G.slow; G.lead = lead; G.win = G.D.win * (G.pu.slowmo > now ? 1.4 : 1);
  if (!G.paused && G.tut && !G.tut.done) tutCheck(jnow);
  if (!G.paused) {
    while (G.first < G.tiles.length && G.tiles[G.first].state && G.tiles[G.first].state !== 3 && G.tiles[G.first].t < jnow - 1) G.first++;
    for (let i = G.first; i < G.tiles.length; i++) { const t = G.tiles[i]; if (t.t > jnow + 0.2) break;
      if (t.state === 0 && G.pu.magnet > now && !t.dur && jnow >= t.t) { hitTile(t, 0, -1); continue; }
      if (t.state === 0 && jnow - t.t > G.win) missTile(t, jnow);
      else if (t.state === 3) { t.holdP = Math.min(1, (jnow - t.t) / t.dur); t.hacc = (t.hacc || 0) + mult() * DT * 60; const w = t.hacc | 0; if (w) { G.score += w; t.hacc -= w; G.hudDirty = true; } // time-based hold points (same at 60 and 120 Hz)
        const nb = Math.floor(t.holdP * t.dur / 0.3); while (t.bead < nb) { t.bead++; emit(laneX(t.lane, 1), L.strikeY, 3); } // gem beads pop as the hold eats them
        if (t.holdP >= 1) { t.state = 1; for (const [k, v] of G.holds) if (v === t) G.holds.delete(k); G.score += 50 * mult(); emit(laneX(t.lane, 1), L.strikeY, 12, true); } } }
    updItems(jnow);
    if (G.sp >= 1 && G.spUntil < 0) { G.spUntil = now + 8; G.sp = 1; pop(L.cx, L.H * 0.38, tx('starPower'), '#d4a017', 1.8, true); A.fx('starpower'); firework(5); G.shake = 0.6; }
    if (G.spUntil > 0) { G.sp = Math.max(0, (G.spUntil - now) / 8); if (now > G.spUntil) { G.spUntil = -1; G.sp = 0; } }
    const prog = Math.max(0, Math.min(1, now / G.b.end)); if (Math.abs(prog - G.lastProg) > 0.004) { $('#prog').style.transform = `scaleX(${prog.toFixed(3)})`; $('#progGem').style.transform = `translateX(${Math.round(prog * L.W)}px)`; G.lastProg = prog; }
    if (now > G.b.end && !G.ended) { G.ended = true; const tok = LOOP; setTimeout(() => { if (tok === LOOP) finishGame(); }, 250); }
  }
  if (G.hudDirty && ts - G.hudT >= 100) { updHud(); G.hudT = ts; } // at most ~10 DOM writes/s, only when the text changes
  // beat phase (drives background pulse/speed)
  let beat = Math.max(0, now) * (G.b.bpm || 100) / 60; const bt = G.b.beatTimes; if (bt && bt.length > 1) { let i = Math.min(G._bi || 0, bt.length - 2); while (i < bt.length - 1 && bt[i + 1][0] <= now) i++; while (i > 0 && bt[i][0] > now) i--; G._bi = i; if (bt[i + 1] && now >= bt[0][0]) beat = i + Math.min(1, (now - bt[i][0]) / (bt[i + 1][0] - bt[i][0])); }
  const pulse = calm ? 0.3 : Math.pow(1 - (beat % 1 + 1) % 1, 3);
  const SK = window.__skip || NOSKIP, shOn = S.set.shake !== false && !calm, shk = G.shake > 0.02 ? G.shake * 6 : 0; G.shake *= Math.pow(0.88, DT * 60); const sx = shk ? (Math.random() - 0.5) * shk : 0, sy = shk ? (Math.random() - 0.5) * shk : 0;
  const spOn = G.spUntil > 0, energy = G.b.energy != null ? G.b.energy : 0.5;
  // background layer: separate low-res canvas redrawn on a TIME budget (~30 fps, ~15 at low quality) so a 120 Hz panel doesn't redraw it 60x/s
  if (G.bgSp !== spOn) { G.bgSp = spOn; G.bgDirty = true; }
  if (!SK.nobg && (G.bgDirty || ts - G.bgLast >= BGMS[q] - 4)) { const bdt = Math.min(0.1, G.bgLast ? (ts - G.bgLast) / 1000 : DT); G.bgLast = ts; G.bgDirty = false; Art.intensity = { low: 0.4, med: 0.75, high: 1.2 }[calm ? 'low' : S.set.intensity || 'med'] * [1, 0.7, 0.5, 0.3][q];
    bc.setTransform(BDPR, 0, 0, BDPR, 0, 0); bc.drawImage(SPR.scene, 0, 0, L.W, L.H); if (Art.parallax && q < 2) Art.parallax(bc, G.theme, L.W, L.H, T, calm ? 0 : beat, q === 0 ? 2 : 1); bc.drawImage(SPR.hw, HWX(), 0);
    if (!SK.bg && q < 3) Art.bg(bc, G.theme, L.W, L.H, T, beat, energy, true); if (q < 3) drawImmersive(T, beat, energy, spOn, bc, bdt); edgeUpdate(pulse, energy, spOn, q);
    if (spOn) { bc.globalAlpha = 0.35 + 0.25 * Math.sin(T * 8); bc.drawImage(SPR.glowGold, L.cx - L.bw * 0.6, L.strikeY - L.span * 0.5, L.bw * 1.2, L.span * 0.7); bc.globalAlpha = 1; } }
  // gameplay layer
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); if (SK.all) return; const ox = shOn ? sx * GDPR : 0, oy = shOn ? sy * GDPR : 0; c.setTransform(GDPR, 0, 0, GDPR, ox, oy); window.__gc = c;
  if (SK.part1) { finishTail(now); return; }
  // strike line breathes on the beat; beat lines brighten as they reach it
  c.globalAlpha = 0.25 + 0.45 * pulse; c.drawImage(SPR.bar, L.cx - L.bw * 0.56, L.strikeY - L.lw * 0.14, L.bw * 1.12, L.lw * 0.28);
  c.strokeStyle = '#fff'; c.lineWidth = 2;
  if (bt) for (let i = Math.max(0, (G._bi || 0) - 1); i < bt.length; i++) { const u = (bt[i][0] - vnow) / lead; if (u > 1) break; if (u < -0.1) continue; projS(u); const k = 1 - Math.max(0, u); c.globalAlpha = 0.1 + 0.5 * k * k; c.beginPath(); c.moveTo(L.cx - 2 * L.lw * PS, PY); c.lineTo(L.cx + 2 * L.lw * PS, PY); c.stroke(); }
  c.globalAlpha = 1;
  if (SK.p1b) { finishTail(now); return; }
  // lane flashes + in-lane miss stripe
  for (let l = 0; l < 4; l++) { const f = Math.max(G.laneFlash[l], G.laneHit[l]); if (f > 0.02) { c.globalAlpha = f * 0.55; if (q < 2) c.drawImage(SPR.glow[l], laneX(l, 1) - L.lw * 0.7, L.strikeY - L.lw * 1.6, L.lw * 1.4, L.lw * 2.2); c.globalAlpha = 1; G.laneFlash[l] *= Math.pow(0.85, DT * 60); G.laneHit[l] *= Math.pow(0.88, DT * 60); }
    const m = G.missFx[l]; if (m > 0.02) { c.globalAlpha = m * 0.8; c.drawImage(SPR.grey, laneX(l, 1) - L.lw * 0.46, L.strikeY - L.lw * 2.4, L.lw * 0.92, L.lw * 2.4); c.globalAlpha = 1; } }
  if (SK.p1c) { finishTail(now); return; }
  // jewel-socket lane buttons at the strike line (a tiny bounce on each beat), drawn under the notes so each tile lands in its socket
  const down = DOWN; down.fill(0); G.press.forEach(markDown); const bs = 1 + 0.03 * pulse * (calm ? 0 : 1);
  for (let l = 0; l < 4; l++) { const im = SPR.btn[l][down[l] || G.laneHit[l] > 0.4 ? 1 : 0]; c.drawImage(im, laneX(l, 1) - L.lw * 0.52 * bs, L.strikeY - L.lw * 0.45 * bs, L.lw * 1.04 * bs, L.lw * 0.9 * bs); }
  // notes: far to near so nearer draw on top
  const tileSet = spOn ? null : SPR.tile, tw = SPR.tw, th = SPR.th, rib = spOn ? SPR.ribbonStar : SPR.ribbon, bead = spOn ? SPR.beadStar : SPR.bead;
  let last = G.first; while (last < G.tiles.length && (G.tiles[last].t - vnow) / lead <= 1.02) last++;
  if (!SK.notes) for (let i = last - 1; i >= G.first; i--) { const t = G.tiles[i]; if (t.state === 1 && !(t.dur > 0)) continue; if (t.state === 2 && vnow - t.t > 0.35) continue;
    const u = (t.t - vnow) / lead;
    if (t.dur > 0 && t.state !== 2 && !(t.state === 1 && t.holdP >= 1)) { // glossy hold ribbon, drawn slice by slice in perspective, with gem beads
      const u1 = Math.min(1.02, (t.t + t.dur - vnow) / lead); if (u1 > -0.1) { const ua = t.state === 3 ? 0 : Math.max(-0.1, u), x = laneX(t.lane, 1), held = t.state === 3, N = q < 2 ? 8 : 4;
        c.globalAlpha = held ? 0.95 : 0.85; projS(ua); let pS = PS, pY = PY;
        for (let k = 1; k <= N; k++) { projS(ua + (u1 - ua) * k / N); const sm = (pS + PS) / 2, w = L.lw * 0.34 * sm, xm = laneX(t.lane, sm); c.drawImage(rib, 0, ((k * 24 + T * 90) % 192) | 0, 64, 64, xm - w / 2, PY, w, pY - PY + 1); pS = PS; pY = PY; }
        c.globalAlpha = 1; const nb = Math.floor(t.dur / 0.3);
        for (let b = t.bead + 1; b <= nb; b++) { const ub = (t.t + b * 0.3 - vnow) / lead; if (ub > 1.02) break; if (ub < -0.05) continue; projS(ub); const bs = L.lw * 0.24 * PS; c.drawImage(bead, laneX(t.lane, PS) - bs * 0.8, PY - bs * 0.8, bs * 1.6, bs * 1.6); }
        if (held) { c.globalAlpha = calm ? 0.7 : 0.6 + 0.3 * Math.sin(T * 20); c.drawImage(SPR.glow[t.lane], x - L.lw * 0.5, L.strikeY - L.lw * 0.5, L.lw, L.lw); c.globalAlpha = 1; } } }
    if (t.state === 3 || (t.state === 1 && t.dur > 0)) continue;
    if (u > 1.02) continue; projS(u); const s = PS, y = PY, w = tw * s, h = th * s, fi = Math.floor(T * 6 + t.id) % 3;
    let im = tileSet ? tileSet[t.shapeI % 6][fi] : SPR.star[fi]; const k = w / tw, x0 = laneX(t.lane, s) - (tw / 2 + 12) * k, y0 = y - (th / 2 + 12) * k; // tile CENTRE sits on the strike line at its hit time
    if (q < 2 && u < 0.4 && u > -0.1 && t.state === 0) { c.globalAlpha = 0.55 * (1 - Math.max(0, u) / 0.4); c.drawImage(SPR.shadow, laneX(t.lane, s) - w * 0.6, y + h * 0.36, w * 1.2, h * 0.4); c.globalAlpha = 1; } // soft shadow near the strike line
    if (t.state === 2) { im = greyTile(im); c.globalAlpha = Math.max(0, 0.75 * (1 - (vnow - t.t) / 0.35)); } // missed: grey, cracked, fades
    c.drawImage(im, x0, y0, im.width * k, im.height * k);
    if (SPR.acc && q < 2 && t.state !== 2) c.drawImage(SPR.acc, x0, y0, SPR.acc.width * k, SPR.acc.height * k); // world accent (frost, embers, bubbles…)
    c.globalAlpha = 1; if (q < 1 && t.state !== 2) spark(SPR.sparkW, laneX(t.lane, s) + w * 0.3, y - h * 0.7, 4 * s, 0.5 + 0.5 * Math.sin(T * 7 + t.id)); }
  // hit feedback: gem ring + soft bloom + light streak across the strike line (bigger and gold on Perfect)
  for (let l = 0; l < 4; l++) { const f = G.flares[l], x = laneX(l, 1), jj = G.flareJ[l], sc = jj === 2 ? 1.25 : jj === 1 ? 1 : 0.85;
    if (f > 0.03) { const r = L.lw * (0.35 + (1 - f) * 0.45) * sc; c.globalAlpha = f; c.drawImage(SPR.flare[l], x - r, L.strikeY - r * 0.7, r * 2, r * 1.4);
      if (q < 2 && SPR.bloom) { const br = r * 1.5; c.globalAlpha = f * 0.8; c.drawImage(jj === 2 ? SPR.bloomGold : SPR.bloom[l], x - br, L.strikeY - br * 0.7, br * 2, br * 1.4); } c.globalAlpha = 1; G.flares[l] *= Math.pow(0.86, DT * 60); }
    const st = G.streak[l]; if (st > 0.03) { const sw = L.lw * (1.3 + (1 - st) * 0.9) * sc; c.globalAlpha = st; c.drawImage(SPR.streak[jj === 2 ? 1 : 0], x - sw / 2, L.strikeY - L.lw * 0.13, sw, L.lw * 0.26); c.globalAlpha = 1; G.streak[l] *= Math.pow(0.8, DT * 60); } }
  drawItems(vnow, lead, T);
  if (SK.part2) { finishTail(now); return; }
  // in-lane miss marks over the sockets
  for (let l = 0; l < 4; l++) {
    const m = G.missFx[l]; if (m > 0.02) { const x = laneX(l, 1), r = L.lw * (0.5 + 0.08 * (1 - m)); c.globalAlpha = m; c.drawImage(SPR.dash, x - r, L.strikeY - r * 0.7, r * 2, r * 1.4); c.drawImage(SPR.gpuff, x - L.lw * 0.32, L.strikeY - L.lw * (1.2 + 0.15 * (1 - m)), L.lw * 0.64, L.lw * 0.51); c.globalAlpha = 1; G.missFx[l] *= Math.pow(0.93, DT * 60); } }
  if (G.tut && !G.tut.done) drawTutorial(T, lead, vnow);
  // particles + gem shards
  if (!SK.fx) { for (const p of POOL) { if (!p.on) continue; p.age += DT; if (p.age >= p.life) { p.on = false; poolOn--; continue; } const k = 1 - p.age / p.life; p.vy += 900 * DT; p.x += p.vx * DT; p.y += p.vy * DT;
      if (p.gem) { const d = p.s * 2.4 * 1.6; c.globalAlpha = k; c.drawImage(p.im, p.x - d / 2, p.y - d / 2, d, d); c.globalAlpha = 1; } else spark(p.im, p.x, p.y, p.s * k + 1, k); }
    const sk = L.lw / 110 * GDPR; for (const p of SHARDS) { if (!p.on) continue; p.age += DT; if (p.age >= p.life) { p.on = false; continue; } p.vy += 700 * DT; p.x += p.vx * DT; p.y += p.vy * DT; p.r += p.vr * DT;
      const kk = sk * p.k, cs = Math.cos(p.r) * kk, sn = Math.sin(p.r) * kk; c.globalAlpha = 1 - p.age / p.life; c.setTransform(cs, sn, -sn, cs, ox + GDPR * p.x, oy + GDPR * p.y); c.drawImage(p.im, -16, -16); }
    c.setTransform(GDPR, 0, 0, GDPR, ox, oy); c.globalAlpha = 1; }
  if (SK.part3) { finishTail(now); return; }
  // judgement / combo pops: cached sprites with an easeOutBack scale pop
  for (let i = G.pops.length - 1; i >= 0; i--) { const p = G.pops[i]; p.a -= 1.8 * DT; if (p.a <= 0) { G.pops.splice(i, 1); continue; } const age = p.a0 - p.a, sc = calm ? 1 : age < 0.22 ? Math.max(0.2, easeBack(age / 0.22)) : 1, hh = p.im.ch * sc * (p.big ? 1 : 0.95) * Math.min(1.25, L.lw / 100 + 0.35);
    drawSpriteC(p.im, p.x, p.y - Math.max(0, age - 0.2) * 40, hh, Math.min(1, p.a)); }
  // gem combo medallion: silver x1, rose-gold x2, gold x3, rainbow x4; beats pulse it, milestones send sparkles round it
  const side = L.cx - L.bw / 2 > 90, mx = side ? L.cx - L.bw / 2 - 50 : 44, my = side ? L.H * 0.62 : Math.max(96, L.H * 0.12), m = mult(), seg = G.combo % 10 / 10, tier = Math.min(4, 1 + Math.floor(G.combo / 10)) - 1, ps = 1 + 0.06 * pulse;
  c.drawImage(SPR.medal[tier], mx - 37 * ps, my - 37 * ps, 74 * ps, 74 * ps);
  c.lineWidth = 5; c.strokeStyle = m >= 4 ? '#ffd76a' : '#ffffff'; c.beginPath(); c.arc(mx, my, 27, -Math.PI / 2, -Math.PI / 2 + TAU * (m >= 4 && !spOn ? 1 : seg)); c.stroke();
  drawSpriteC(popMake('x' + m, '#ffd76a', false), mx, my + 1, 30, 1);
  const md = G.nowS - G.medalT; if (md >= 0 && md < 0.9) { const k = md / 0.9; for (let i = 0; i < 6; i++) { const a = k * TAU + i * TAU / 6; spark(SPR.sparkGold, mx + Math.cos(a) * 40, my + Math.sin(a) * 40, 7 * (1 - k) + 2, 1 - k); } }
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(mx - 30, my + 44, 60, 8); c.fillStyle = spOn ? '#ffd76a' : '#b98cff'; c.fillRect(mx - 30, my + 44, 60 * G.sp, 8);
  if (G.combo >= 3) { const ni = popMake(String(G.combo), '#ff4fa3', false), li = popMake(tx('comboWord'), '#ff4fa3', false), hh = 24, kn = hh / ni.ch, kl = hh / li.ch, wn = ni.cw * kn, wl = li.cw * kl, x0 = mx - (wn + wl) / 2;
    c.drawImage(ni, x0, my + 60, wn, hh); c.drawImage(li, x0 + wn - 6, my + 60, wl, hh); }
  // gem countdown (start of song, and 3-2-1 after a pause)
  let ck = null, cf = 0; if (G.resuming) { const left = Math.max(0, G.resuming - performance.now()) / 1000, per = RESUME / 3000, n = Math.min(3, Math.ceil(left / per)); if (n >= 1) { ck = String(n); cf = 1 - (left / per - (n - 1)); } }
  else if (now < 0) { const per = COUNT / 3, n = Math.ceil(-now / per); if (n <= 3) { ck = String(n); cf = 1 - (-now / per - (n - 1)); } } else if (now < 0.45 && !G.paused) { ck = 'go'; cf = now / 0.45; }
  if (ck) { const im = countImg(ck), sc = calm ? 1 : easeBack(Math.min(1, cf / 0.35)), a = cf > 0.75 ? (1 - cf) / 0.25 : 1, hh = L.lw * 1.15 * sc;
    if (q < 2) { const br = L.lw * (0.6 + cf * 0.9); c.globalAlpha = (1 - cf) * 0.8; c.drawImage(SPR.bloomGold, L.cx - br, L.H * 0.45 - br, br * 2, br * 2); c.globalAlpha = 1; } drawSpriteC(im, L.cx, L.H * 0.45, hh, Math.max(0, a)); }
  if (SK.part4) { finishTail(now); return; }
  // mascot (cached sprite, drawn at device pixels so it stays sharp)
  const ms = Math.min(84, L.H * 0.11); if (!SK.mascot) { const mxx = L.cx - L.bw / 2 > ms * 1.2 ? L.cx - L.bw / 2 - ms * 0.6 : L.W - ms * 0.55, myy = L.cx - L.bw / 2 > ms * 1.2 ? L.H * 0.35 : L.H - ms * 0.6;
    c.setTransform(1, 0, 0, 1, ox, oy); Art.mascotFast(c, mxx * GDPR, myy * GDPR, ms * GDPR, performance.now() < G.moodT ? G.mood : 'idle', S.eq.outfit, T); c.setTransform(GDPR, 0, 0, GDPR, ox, oy); }
  drawPuHud(now);
  if (G.pendingTap) { G.ivl.push(performance.now() - G.pendingTap.perf); G.pendingTap = null; if (G.ivl.length > 600) G.ivl.splice(0, 300); }
  G.ft[G.fN & 4095] = performance.now() - f0; G.fN++; G.pausedDrawn = G.paused;
}
function outOfHearts() { pauseGame(true); $('#mOut').classList.add('on'); const mc = $('#mascotOut').getContext('2d'); mc.clearRect(0, 0, 160, 130); Art.mascot(mc, 80, 75, 100, 'oops', S.eq.outfit, 0); }
// pause shows a legend: what to tap and what to leave alone
function renderLegend() { const el = $('#legend'); if (!el || !G.on) return; const obs = [...new Set(G.items.filter(i => i.kind === 'obs').map(i => i.ob))], pus = [...new Set(G.items.filter(i => i.kind === 'pu').map(i => i.pu))];
  el.innerHTML = (pus.length ? `<div class="lg"><b>${ic('hand', 'c-pink')}${tx('legendTap')}</b> ${pus.map(k => `<span title="${esc(puName(k))}">${PU[k].e}</span>`).join(' ')}</div>` : '') + (obs.length ? `<div class="lg"><b>${ic('close', 'c-pink')}${tx('legendDont')}</b> ${obs.map(k => `<canvas data-ob="${k}" width="96" height="96"></canvas>`).join('')}</div>` : '');
  el.querySelectorAll('canvas').forEach(x => x.getContext('2d').drawImage(obsImg(x.dataset.ob), 0, 0, 96, 96)); }
function pauseGame(noModal) {
  if (!G.on || G.ended) return; // the song is over: the results card is on its way
  if (G.paused) { if (noModal) return; if (G.resuming) G.resuming = 0; renderLegend(); $('#mPause').classList.add('on'); return; } // pausing again during the 3-2-1 (or a tutorial wait) shows the menu again
  G.paused = true; G.pauseN = (G.pauseN || 0) + 1; G.resuming = 0; G.pauseAt = songTime(); A.ctx().suspend(); if (!noModal) { renderLegend(); $('#mPause').classList.add('on'); } }
// resume = a 3-2-1 gem countdown with the song still paused, then the audio continues (no lost heart right after resuming)
function resumeGame() { $('#mPause').classList.remove('on'); $('#mOut').classList.remove('on'); if (!G.on || !G.paused || G.resuming || (G.tut && G.tut.wait)) return; G.resuming = performance.now() + RESUME; G.pausedDrawn = false; }
function doResume() { const n = G.pauseN; G.resuming = 0; const go2 = () => { if (!G.on || G.pauseN !== n || !G.paused) return; clock.off = null; updateClock(); G.lastFrame = 0; G.paused = false; G.bgDirty = true; }; A.ctx().resume().then(go2, go2); }
$('#pauseBtn').addEventListener('click', () => pauseGame());
$('#resumeBtn').addEventListener('click', resumeGame);
$('#contBtn').addEventListener('click', () => { G.hearts = Infinity; G.practice = true; G.usedPractice = true; G.hudDirty = true; resumeGame(); });
const stopAudio = () => { (G.srcs || []).forEach(s => { try { s.stop(); s.disconnect(); } catch (e) { } }); G.srcs = []; if (G.duck) try { G.duck.disconnect(); } catch (e) { } if (G.muffle) try { G.muffle.disconnect(); } catch (e) { } A.ctx().resume(); A.inGame = false; };
const restart = () => { $('#mPause').classList.remove('on'); $('#mOut').classList.remove('on'); stopAudio(); G.on = false; $('#game').classList.remove('on'); startGame(G.song, G.diff); };
$('#restartBtn').addEventListener('click', restart); $('#outRetry').addEventListener('click', restart);
$('#quitBtn').addEventListener('click', () => { $('#mPause').classList.remove('on'); finishGame({ quit: true }); }); // stopping a song shows the results card (nothing saved)
$('#outEnd').addEventListener('click', () => { $('#mOut').classList.remove('on'); A.ctx().resume(); finishGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.on && !G.ended && (!G.paused || G.resuming)) pauseGame(); }); window.addEventListener('pagehide', () => { if (G.on && !G.ended && (!G.paused || G.resuming)) pauseGame(); });

// ---------- first-play tutorial (no reading: a hand shows where, the first tiles wait for her, then one power-up and one obstacle) ----------
const TUT = { pending: false };
function startTutorial() { const s = window.TILE_SONGS.find(x => x.id === 'twinkle') || window.TILE_SONGS[0]; LAB = null; TUT.pending = true; startGame(s, 'easy'); }
function tutCheck(jnow) { const tu = G.tut; if (tu.wait) return;
  if (tu.step < 3) { for (let i = G.first; i < G.tiles.length; i++) { const t = G.tiles[i]; if (t.t > jnow) break; if (t.state || t.pair || t.dur) continue; tutWait({ tile: t, lane: t.lane, at: t.t }); return; } }
  else if (tu.step === 3) for (const it of G.items) { if (it.t > jnow) break; if (it.kind === 'pu' && !it.state) { tutWait({ it, lane: it.lane, at: it.t }); return; } } }
function tutWait(w) { G.tut.wait = w; G.tut.hand = performance.now(); G.paused = true; G.pauseN = (G.pauseN || 0) + 1; G.pauseAt = w.at + S.set.offset / 1000; A.ctx().suspend(); } // the song waits for her tap
function tutTap(lane, pid) { const w = G.tut.wait; if (lane !== w.lane) { if (lane >= 0 && lane <= 3) G.laneFlash[lane] = 0.6; G.tut.wrong = performance.now(); return; }
  if (w.tile) { G.press.set(pid, lane); G.tapPerf = performance.now(); hitTile(w.tile, 0, pid); G.tut.step++; } else { collect(w.it); G.tut.step = 4; } tutResume(); }
function tutResume() { G.tut.wait = null; const n = G.pauseN; const go2 = () => { if (!G.on || G.pauseN !== n) return; clock.off = null; updateClock(); G.lastFrame = 0; G.paused = false; }; A.ctx().resume().then(go2, go2); }
function tutFinish(skipped) { if (!G.tut || G.tut.done) return; G.tut.done = true; S.tut = 1; save(); $('#skipTut').classList.add('hidden'); if (!skipped) { pop(L.cx, L.H * 0.33, tx('tutDone'), '#ff4fa3', 2.2, true); firework(3); } }
function drawTutorial(T, lead, vnow) { const tu = G.tut, w = tu.wait; let lane = w ? w.lane : -1;
  if (!w && tu.step < 3) for (let i = G.first; i < G.tiles.length; i++) { const t = G.tiles[i]; if ((t.t - vnow) / lead > 0.55) break; if (!t.state && !t.pair && !t.dur) { lane = t.lane; break; } }
  if (!w && tu.step === 3) for (const it of G.items) if (it.kind === 'pu' && !it.state && (it.t - vnow) / lead < 0.55) { lane = it.lane; break; }
  if (lane < 0) return; const x = laneX(lane, 1) + (tu.wrong && performance.now() - tu.wrong < 400 ? Math.sin(T * 60) * 6 : 0), hs = L.lw * 0.75, bob = Math.abs(Math.sin(T * 5)) * L.lw * 0.15;
  if (w) { const r = L.lw * (0.7 + 0.12 * Math.sin(T * 6)); c.globalAlpha = 0.7; c.drawImage(SPR.bloomGold, x - r, L.strikeY - r * 0.75, r * 2, r * 1.5); c.globalAlpha = 1; }
  c.drawImage(fingerImg(), x - hs / 2, L.strikeY + L.lw * 0.2 + bob, hs, hs);
  if (w && w.it) drawSpriteC(popMake(tx('tapIt'), '#ff4fa3', true), L.cx, L.strikeY - L.lw * 1.9, L.lw * 0.6, 1); }
$('#skipTut').addEventListener('click', e => { e.stopPropagation(); if (!G.tut) return; const w = G.tut.wait; tutFinish(true); if (w) tutResume(); });
$('#howToBtn').addEventListener('click', () => { A.init(); startTutorial(); });

// ---------- results ----------
const RES = { raf: 0 };
// The results card ALWAYS ends with big actions: Next song, Replay, Song list, Home (+ Open pack). It is shown after a full combo, a pass,
// a fail (out of hearts -> Finish), practice, custom songs, Lab runs and when a song is stopped from the pause menu.
// v3 bug: the card was ~850 px tall inside a fixed, centred, non-scrolling modal, so on the Fold cover screen (browser bars) and in
// landscape the buttons sat below the bottom edge and could not be reached; badge toasts also covered them. Now the stats scroll inside
// the card and the action bar is pinned to its bottom, toasts move to the top while it is open.
function finishGame(opts) {
  if (!G.on) return; const quitRun = !!(opts && opts.quit);
  G.ended = true; G.resuming = 0; ['mPause', 'mOut', 'mLoad'].forEach(id => $('#' + id).classList.remove('on')); // never leave a game modal stacked under (or over) the results
  if (quitRun && G.tut && !G.tut.done) tutFinish(true);
  stopAudio(); if (!quitRun) G.tiles.forEach(t => { if (t.state === 0) { t.state = 2; G.j.miss++; } }); window.__lastItems = G.items.map(i => ({ kind: i.kind, k: i.pu || i.ob, state: i.state, t: i.t, lane: i.lane }));
  const j = G.j, n = quitRun ? j.perfect + j.great + j.good + j.miss : G.tiles.length, acc = n ? (j.perfect + j.great * 0.85 + j.good * 0.6) / n : 0;
  const fc = !quitRun && j.miss === 0 && n > 0; let stars = quitRun ? 0 : acc >= 0.88 ? 3 : acc >= 0.7 ? 2 : acc >= 0.3 ? 1 : 0;
  const id = G.song.id, lab = !!G.lab, noSave = lab || quitRun; let coins = 0, packs = 0, newBest = false, firstClear = null, practiceStar = false;
  if (!noSave) { // Test lab runs and stopped songs never touch real progress (best, coins, packs, plays, badges, stickers)
    const before = totalStars(), crownsBefore = crownsOf(id), hadClear = Object.keys(S.best[id] || {}).some(d => ((S.best[id] || {})[d] || {}).stars > 0); S.best[id] = S.best[id] || {}; const prev = S.best[id][G.diff] || { stars: 0, score: 0 };
    newBest = G.score > (prev.score || 0);
    S.best[id][G.diff] = { stars: Math.max(prev.stars || 0, stars), score: Math.max(prev.score || 0, G.score), fc: prev.fc || (fc && !G.usedPractice) };
    if (G.usedPractice && stars > 0) { const pr = S.best[id].practiced = isObj(S.best[id].practiced) ? S.best[id].practiced : {}; practiceStar = !pr[G.diff]; pr[G.diff] = 1; } // additive: S.best[id].practiced
    packs = totalStars() - before + crownsOf(id) - crownsBefore;
    coins = Math.round(G.score / 400) + stars * 5 + (fc ? 10 : 0) + 2; S.coins += coins; S.packs += packs; S.plays++; S.maxCombo = Math.max(S.maxCombo || 0, G.maxCombo);
    if (!hadClear && stars > 0) { const commons = STICKERS.filter(s => s[1] === 'c'), fresh = commons.filter(s => !S.stickers[s[0]]), pick = (fresh.length ? fresh : commons)[Math.floor(Math.random() * (fresh.length || commons.length))]; S.stickers[pick[0]] = (S.stickers[pick[0]] || 0) + 1; firstClear = pick[0]; if (STICKERS.filter(s => S.stickers[s[0]]).length >= 10) award('stick10'); } // a song's first clear always gives a sticker
    award('first'); if (stars === 3) award('star3'); if (fc) award('fc'); if (crownsOf(id) > 0) award('crown'); if (S.plays >= 10) award('p10'); if (S.plays >= 50) award('p50');
    if (G.maxCombo >= 50) award('combo50'); if (G.maxCombo >= 100) award('combo100'); if (G.diff === 'hard' && stars > 0) award('hard'); if (totalStars() >= 50) award('allstars');
    S.stats = isObj(S.stats) ? S.stats : { pu: {}, dodged: 0 }; S.stats.pu = S.stats.pu || {}; S.stats.dodged = S.stats.dodged || 0; for (const k in G.stats.pu) S.stats.pu[k] = (S.stats.pu[k] || 0) + G.stats.pu[k]; S.stats.dodged += G.stats.dodged;
    if (Object.keys(S.stats.pu).length) award('pu1'); if (Object.keys(S.stats.pu).length >= 6) award('puall'); if (G.stats.rainbow) award('rainbow'); if (S.stats.dodged >= 25) award('dodge25'); if (G.stats.dodged >= 5 && G.j.miss === 0) award('dodgeperfect');
    if (G.tut) S.tut = 1; save(); }
  if (!quitRun) { A.setFx(S.set.fxOn !== false, S.set.fxVol == null ? 0.5 : S.set.fxVol); A.ctx().resume().then(() => A.fx('fanfare'), () => { }); }
  const rib = (cls, icn, t) => `<div class="ribbon ${cls}">${ic(icn)}<span>${esc(t)}</span></div>`, chip = (icn, cls, v, lbl) => `<div class="chip">${ic(icn, cls)}<b>${v}</b><span>${esc(lbl)}</span></div>`;
  const ribbons = (lab ? rib('lab', 'flask', tx('labRun')) : '') + (quitRun && !lab ? rib('quit', 'flag', tx('stopped')) : '') + (fc ? rib('fc', 'gem', tx('fullCombo')) : '') + (newBest && !noSave && G.score > 0 ? rib('nb', 'trophy', tx('newBest')) : '') + (crownsOf(id) && !noSave ? `<div class="ribbon nb">${ic('crown')}<span>×${crownsOf(id)}</span></div>` : '');
  $('#resCard').innerHTML = `<div class="res-main"><div class="res-hero"><canvas id="resMascot" width="${Math.round(120 * DPR)}" height="${Math.round(96 * DPR)}"></canvas><h2 dir="auto">${esc(G.song.title)}</h2>
      ${quitRun ? '' : `<div class="big-stars">${[0, 1, 2].map(i => `<span class="${i < stars ? 'won' : ''}" style="animation-delay:${0.3 + i * 0.3}s">${ic('star')}</span>`).join('')}</div>`}${ribbons ? `<div class="ribbons">${ribbons}</div>` : ''}</div>
    <div class="res-side"><p class="res-msg">${esc(quitRun ? tx('msgQuit') : tx('msg' + stars))}</p><div class="res-score"><small>${tx('score')}</small><span id="resScore">0</span></div>
      <div class="res-stats">${chip('gem', 'c-pink', j.perfect, tx('perfect2'))}${chip('sparkle', 'c-lilac', j.great, tx('great2'))}${chip('thumb', 'c-sky', j.good, tx('good2'))}${chip('rain', 'c-grey', j.miss, tx('missed2'))}${chip('fire', 'c-fire', G.maxCombo, tx('combo2'))}${chip('target', 'c-pink', Math.round(acc * 100) + '%', tx('accuracy'))}</div>
      ${noSave ? '' : `<p class="res-gain">+${coins} ${ic('coin', 'c-gold')}${packs ? ` · ${esc(tx('packsWon', packs).replace(/\s*🎴$/, ''))} ${ic('cards', 'c-lilac')}` : ''}</p>`}${firstClear ? `<p class="gotst"><span class="flyst">${firstClear}</span>${esc(tx('firstClear', firstClear))}</p>` : ''}${practiceStar ? `<p class="gotst">${esc(tx('practiceStar'))}</p>` : ''}</div></div>
    <div class="res-actions"><button class="btn" id="resNext">${ic('next')}<span>${tx('nextSong')}</span></button><button class="btn silver" id="resAgain">${ic('replay')}<span>${tx('replay')}</span></button>
      <button class="btn silver" id="resSongs">${ic(lab ? 'flask' : 'list')}<span>${lab ? tx('labBack') : tx('songList')}</span></button><button class="btn silver" id="resHome">${ic('home')}<span>${tx('homeBtn')}</span></button>
      ${S.packs && !noSave ? `<button class="btn gold" id="resPack">${ic('cards')}<span>${tx('openPackBtn')} (${S.packs})</span></button>` : ''}</div>`;
  $('#mRes').classList.add('on'); $('#mRes').scrollTop = 0; document.body.classList.add('res-open');
  const rm = $('#resMascot').getContext('2d'), sEl = $('#resScore'), fx = $('#resFx'), fc2 = fx.getContext('2d'), t0 = performance.now(), final = G.score, mood = quitRun ? 'happy' : stars >= 2 ? 'wow' : 'happy';
  const [fw, fh] = [innerWidth, innerHeight], fd = Math.min(DPR, 1.5); fx.width = Math.round(fw * fd); fx.height = Math.round(fh * fd); let shown = -1;
  const nGems = S.set.calm ? 8 : 10 + stars * 10, gems = Array.from({ length: nGems }, (_, i) => ({ x: Math.random() * fw, y: -Math.random() * fh, v: 60 + Math.random() * 120, r: Math.random() * 6, s: 14 + Math.random() * 18, im: i % 3 ? Art.gemImg(Art.MIX[i % 6], '#ffffff', ['#ff5fae', '#ffd76a', '#b98cff', '#5ad1ff'][i % 4], 32) : Art.sparkleImg(['#ffd76a', '#ffffff', '#ff8ccf'][i % 3]) }));
  cancelAnimationFrame(RES.raf); let lt = t0;
  (function anim() { if (!$('#mRes').classList.contains('on')) { fc2.clearRect(0, 0, fx.width, fx.height); document.body.classList.remove('res-open'); return; } const now = performance.now(), dt = Math.min(0.05, (now - lt) / 1000); lt = now;
    const k = Math.min(1, (now - t0) / 1000), v = Math.round(final * (1 - Math.pow(1 - k, 3))); if (v !== shown) { shown = v; sEl.textContent = NF.format(v); } // score counts up over ~1 s
    rm.setTransform(1, 0, 0, 1, 0, 0); rm.clearRect(0, 0, rm.canvas.width, rm.canvas.height); Art.mascotFast(rm, 60 * DPR, 56 * DPR, 76 * DPR, mood, S.eq.outfit, (now - t0) / 1000);
    fc2.setTransform(fd, 0, 0, fd, 0, 0); fc2.clearRect(0, 0, fw, fh); for (const g of gems) { g.y += g.v * dt * (S.set.calm ? 0.5 : 1); if (g.y > fh + 20) { g.y = -20; g.x = Math.random() * fw; } g.r += dt; fc2.save(); fc2.translate(g.x + Math.sin(g.r * 2) * 10, g.y); fc2.rotate(g.r); fc2.drawImage(g.im, -g.s / 2, -g.s / 2, g.s, g.s); fc2.restore(); }
    RES.raf = requestAnimationFrame(anim); })();
  G.on = false; LOOP++; $('#game').classList.remove('on'); $$('.screen').forEach(s => s.classList.remove('on')); window.__lastResult = { stars, score: G.score, j: { ...j }, n, fc, maxCombo: G.maxCombo, dodged: G.stats.dodged, powerups: G.stats.pu, items: G.items.length, lab, quit: quitRun };
}
// next playable song after this one (locked built-ins skipped, wraps round; custom songs included)
const nextSongOf = song => { const ts = totalStars(), list = allSongs().filter(s => !(s.builtin && ts < s.cost)); if (!list.length) return song; const i = list.findIndex(s => s.id === song.id); return list[(i + 1) % list.length]; };
const closeRes = () => { $('#mRes').classList.remove('on'); document.body.classList.remove('res-open'); };
document.addEventListener('click', e => {
  const b = e.target.closest('#resNext,#resAgain,#resSongs,#resHome,#resPack'); if (!b || STARTING) return; A.init(); A.sfx('tap'); closeRes();
  if (b.id === 'resNext') { LAB = G.lab || null; startGame(nextSongOf(G.song), G.tut ? S.set.diff : G.diff); }
  else if (b.id === 'resAgain') { LAB = G.lab || null; startGame(G.song, G.diff); }
  else if (b.id === 'resSongs') go(G.lab ? 'lab' : 'songs');
  else if (b.id === 'resHome') go('home');
  else if (b.id === 'resPack') { go('album'); openPack(); }
});

// ---------- boot ----------
window.__tiles = { S: () => S, G: () => G, loops: () => LOOPS, stopAll: () => { stopAudio(); G.on = false; LOOP++; $('#game').classList.remove('on'); }, go, startGame, setLab: l => { LAB = l; }, allSongs, loadCustoms, DB, songTime, judgeAt, finishGame, layout: () => L, outOfHearts, nextSongOf,
  // test hooks: jump the game clock forward (optionally scoring the skipped tiles as Perfect) to reach the natural end of a song quickly
  ff: (sec, hit) => { if (!G.on) return; const to = songTime() + sec; if (hit) for (const t of G.tiles) if (!t.state && t.t < to + 0.05) { t.state = 1; G.j.perfect++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); G.score += 100; } G.startAt -= sec; },
  toEnd: hit => { if (G.on) window.__tiles.ff(G.b.end - songTime() - 0.4, hit); }, laneX, proj, save, openPack, CAL, arrange, rendered, clock, updateClock, prepare, reanalyze };
applyLang(); document.body.classList.toggle('calm', !!S.set.calm); loadCustoms().then(async () => { go('home');
  const old = customs.filter(c => (c.anv || 1) < AN.VERSION); if (!old.length) return; toast(esc(tx('updating', old.length)), 2500);
  for (const c of old) { try { const full = await DB.get(c.id); if (full) await reanalyze(full); } catch (e) { console.warn('re-chart failed', e); } }
  await loadCustoms(); if (cur === 'songs') renderSongs(); });
requestAnimationFrame(menuLoop);
window.addEventListener('resize', () => { DPR = Math.min(2, window.devicePixelRatio || 1); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadSW = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(r => r.update()).catch(() => { });
}
})();
