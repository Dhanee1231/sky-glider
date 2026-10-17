// Our Fun Zone service worker: only handles requests under /home/, only touches its own caches.
const CACHE='home-v12';
const FILES=['./','./index.html','./learn.js','./funzone.js','./audio/manifest.json','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const SCOPE=new URL('./',self.location).pathname;
// review fix 5: the hub's greeting clips (Kokoro af_heart, ~0.5 MB) are precached from audio/manifest.json (best effort), so the first offline visit has a voice
const CLIPS=c=>fetch('./audio/manifest.json',{cache:'reload'}).then(r=>r.ok?r.json():null).then(j=>j&&j.clips&&typeof j.clips==='object'?Promise.all(Object.keys(j.clips).filter(k=>/^[0-9a-f]{8}$/.test(k)).map(k=>c.add(new Request('./audio/'+k+'.ogg',{cache:'reload'})).catch(()=>{}))):0).catch(()=>{});
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'}))).then(()=>CLIPS(c))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('home-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url); if(url.origin!==location.origin||!url.pathname.startsWith(SCOPE))return;
  if(req.headers.has('range'))return; // media Range requests go straight to the network
  // review fix 5: greeting clips are cache-first (their names are hashes of the words, so a cached clip is never stale)
  if(/\/audio\/[0-9a-f]{8}\.ogg$/.test(url.pathname)){e.respondWith(caches.open(CACHE).then(c=>c.match(url.pathname).then(r=>r||new Promise(res=>{let d=false;const fin=x=>{if(!d){d=true;res(x);}};
    const ac=self.AbortController?new AbortController():null;setTimeout(()=>{if(!d){if(ac)ac.abort();fin(Response.error());}},4000);
    fetch(url.pathname,ac?{signal:ac.signal}:{}).then(n=>{if(n&&n.status===200)c.put(url.pathname,n.clone()).catch(()=>{});fin(n);},()=>fin(Response.error()));}))).catch(()=>Response.error()));return;}
  const nav=req.mode==='navigate';
  const fallback=()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(nav?caches.match('./index.html'):undefined));
  // network first; only OK answers are cached; on Wi-Fi with no internet the cached copy shows after a few seconds (v3)
  e.respondWith(new Promise(resolve=>{
    let done=false;const finish=r=>{if(!done&&r){done=true;resolve(r);}};
    fetch(req,{cache:'no-cache'}).then(r=>{
      if(r&&r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp)).catch(()=>{});finish(r);}
      else fallback().then(c=>finish(c||r));
    }).catch(()=>fallback().then(c=>finish(c||Response.error())));
    setTimeout(()=>{if(!done)fallback().then(c=>finish(c||Response.error()),()=>finish(Response.error()));},nav?3500:5000); // review fix 5: always settles
  }));
});
