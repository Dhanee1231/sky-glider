// Sky Glider service worker: offline support, no network calls beyond its own files.
const CACHE='sky-glider-v4b';
// Only Sky Glider's own root files are handled here. Everything else (e.g. ./crystal-cave/, ./home/, ./yoga/ and any
// future sub-apps, which have their own service workers and caches) is ignored and never touched.
const FILES=['./','./index.html','./SkyGlider.html','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const OWN=new Set(FILES.map(f=>new URL(f,self.location).pathname));
// install: fetch fresh copies (skip the HTTP cache) so a new version never caches stale files
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('sky-glider')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url); if(url.origin!==location.origin||!OWN.has(url.pathname))return; // not ours: let the browser / other workers handle it
  const nav=req.mode==='navigate';
  const fallback=()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(nav?caches.match('./index.html'):undefined));
  // network first for every own file (revalidated with the server), cache when offline;
  // on a very slow connection the cached copy is shown after a few seconds instead of a blank screen
  e.respondWith(new Promise(resolve=>{
    let done=false;const finish=r=>{if(!done&&r){done=true;resolve(r);}};
    const net=fetch(req,{cache:'no-cache'}).then(r=>{
      if(r&&r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp)).catch(()=>{});}
      return r;});
    net.then(r=>{if(r&&r.ok)finish(r);else fallback().then(c=>finish(c||r));})
       .catch(()=>fallback().then(c=>finish(c||Response.error())));
    setTimeout(()=>{if(!done)fallback().then(c=>{if(c)finish(c);});},nav?3500:5000);
  }));
});
