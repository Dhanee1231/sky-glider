// Crystal Cave Quest service worker: offline support for /crystal-cave/ only. No network calls beyond its own files.
const CACHE='crystal-cave-v11b';
const PREFIX='crystal-cave-';
const FILES=['./','./index.html','./manifest.json','./audio/manifest.json',
  // the NEW RECORD cheers are precached so the party has its voice offline too
  './audio/548beca9.ogg','./audio/cb07e4ed.ogg','./audio/21f15e94.ogg','./audio/7e56e9f5.ogg','./audio/2587fe25.ogg','./audio/d34e3a57.ogg',
  './icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const SCOPE=new URL('./',self.location).pathname; // e.g. /sky-glider/crystal-cave/
// install: fresh copies of the app files, and voice clips she already heard are carried over from the older caches (a clip's
// name is a hash of its words, so an old clip is still right), so a new version never has to download them again
const keepClips=c=>caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.open(k).then(o=>o.keys().then(rs=>
  Promise.all(rs.filter(r=>/\/audio\/[^/]+\.ogg$/.test(new URL(r.url).pathname)).map(r=>o.match(r).then(m=>m&&c.put(new URL(r.url).pathname,m)))))))));
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'}))).then(()=>keepClips(c).catch(()=>{}))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys()
  // only ever delete OUR old caches; Sky Glider's caches live on the same origin
  .then(ks=>Promise.all(ks.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k))))
  .then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  if(req.headers.has('range'))return; // review fix 9: media Range requests go straight to the network (a full 200 breaks <audio> seeking)
  const url=new URL(req.url);if(url.origin!==location.origin||!url.pathname.startsWith(SCOPE))return;
  const page=req.mode==='navigate'||url.pathname===SCOPE||url.pathname.endsWith('/index.html'),key=page?'./index.html':req;
  // voice clips (not precached): cache-first, saved the first time they are played; the manifest falls through to network-first below
  // review fix 9: a cache miss on a dead network gives up after 4 s (Response.error -> the app falls back to the phone voice) instead of hanging
  if(/\/audio\/[^/]+\.ogg$/.test(url.pathname)){e.respondWith(caches.open(CACHE).then(c=>c.match(url.pathname).then(r=>r||new Promise(res=>{let d=false;const fin=x=>{if(!d){d=true;res(x);}};
    const ac=self.AbortController?new AbortController():null;setTimeout(()=>{if(!d){if(ac)ac.abort();fin(Response.error());}},4000);
    fetch(url.pathname,ac?{signal:ac.signal}:{}).then(n=>{if(n&&n.ok&&n.status===200)c.put(url.pathname,n.clone()).catch(()=>{});fin(n);},()=>fin(Response.error()));}))).catch(()=>Response.error()));return;}
  // network first for every file so updates show up right away; only OK answers are cached; the cached copy is the offline
  // fallback, and on Wi-Fi with no internet it is shown after a few seconds instead of a blank screen (v5)
  const fallback=()=>caches.match(key,{ignoreSearch:true});
  e.respondWith(new Promise(resolve=>{
    let done=false;const finish=r=>{if(!done&&r){done=true;resolve(r);}};
    fetch(req.url,{cache:'no-cache'}).then(r=>{
      if(r&&r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(key,cp)).catch(()=>{});finish(r);}
      else fallback().then(c=>finish(c||r));
    }).catch(()=>fallback().then(c=>finish(c||Response.error())));
    // review fix 9: the timeout ALWAYS settles (cache, else a network error), so a dead Wi-Fi can never spin forever
    setTimeout(()=>{if(!done)fallback().then(c=>finish(c||Response.error()),()=>finish(Response.error()));},page?3500:5000);
  }));
});
