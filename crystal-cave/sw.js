// Crystal Cave Quest service worker: offline support for /crystal-cave/ only. No network calls beyond its own files.
const CACHE='crystal-cave-v3';
const PREFIX='crystal-cave-';
const FILES=['./','./index.html','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const SCOPE=new URL('./',self.location).pathname; // e.g. /sky-glider/crystal-cave/
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys()
  // only ever delete OUR old caches; Sky Glider's caches live on the same origin
  .then(ks=>Promise.all(ks.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k))))
  .then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==location.origin||!url.pathname.startsWith(SCOPE))return;
  const page=req.mode==='navigate'||url.pathname===SCOPE||url.pathname.endsWith('/index.html'),key=page?'./index.html':req;
  // network first for every file so updates show up right away; the cached copy is the offline fallback
  e.respondWith(fetch(req.url,{cache:'no-cache'}).then(r=>{if(r&&r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(key,cp)).catch(()=>{});}return r;})
    .catch(()=>caches.match(key,{ignoreSearch:true}).then(r=>r||Response.error())));
});
