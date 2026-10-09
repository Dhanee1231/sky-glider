// Sky Glider service worker: offline support, no network calls beyond its own files.
const CACHE='sky-glider-v3c';
// Only Sky Glider's own root files are handled here. Everything else (e.g. ./crystal-cave/, ./yoga/ and any
// future sub-apps, which have their own service workers and caches) is ignored and never touched.
const FILES=['./','./index.html','./SkyGlider.html','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const OWN=new Set(FILES.map(f=>new URL(f,self.location).pathname));
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('sky-glider')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url); if(url.origin!==location.origin||!OWN.has(url.pathname))return; // not ours: let the browser / other workers handle it
  if(req.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/SkyGlider.html')){
    // network first so updates show up, fall back to cache when offline
    e.respondWith(fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp));}return r;}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(n=>{if(n.ok){const cp=n.clone();caches.open(CACHE).then(c=>c.put(req,cp));}return n;})));
});
