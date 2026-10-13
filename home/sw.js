// Our Fun Zone service worker: only handles requests under /home/, only touches its own caches.
const CACHE='home-v6';
const FILES=['./','./index.html','./learn.js','./funzone.js','./audio/manifest.json','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const SCOPE=new URL('./',self.location).pathname;
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('home-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url); if(url.origin!==location.origin||!url.pathname.startsWith(SCOPE))return;
  const nav=req.mode==='navigate';
  const fallback=()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(nav?caches.match('./index.html'):undefined));
  // network first; only OK answers are cached; on Wi-Fi with no internet the cached copy shows after a few seconds (v3)
  e.respondWith(new Promise(resolve=>{
    let done=false;const finish=r=>{if(!done&&r){done=true;resolve(r);}};
    fetch(req,{cache:'no-cache'}).then(r=>{
      if(r&&r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp)).catch(()=>{});finish(r);}
      else fallback().then(c=>finish(c||r));
    }).catch(()=>fallback().then(c=>finish(c||Response.error())));
    setTimeout(()=>{if(!done)fallback().then(c=>{if(c)finish(c);});},nav?3500:5000);
  }));
});
