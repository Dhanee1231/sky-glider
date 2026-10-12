// Gem Tiles service worker. Scope: this tiles/ folder only. Touches only its own 'tiles-*' caches.
const CACHE = 'tiles-v6e';
const SHELL = ['./', './index.html', './app.js', './art.js', './audio.js', './analyze.js', './analyze-worker.js', './songs.js', './icons.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png',
  './records.js', './learn.js', './audio/manifest.json', './audio/548beca9.ogg', './audio/cb07e4ed.ogg', './audio/21f15e94.ogg', './audio/7e56e9f5.ogg', './audio/2587fe25.ogg', './audio/d34e3a57.ogg']; // records + NEW RECORD cheers (v4b), learning record (v5)
const SCOPE = new URL('./', self.location).pathname;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tiles-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  const nav = req.mode === 'navigate', key = nav ? './index.html' : req;
  const fallback = () => caches.match(key, { ignoreSearch: true });
  // network first (revalidated with the server); only OK answers are ever cached, so an error page never becomes the offline copy.
  // On Wi-Fi with no internet the cached copy is shown after a few seconds instead of a blank screen (v5).
  e.respondWith(new Promise(resolve => {
    let done = false; const finish = r => { if (!done && r) { done = true; resolve(r); } };
    fetch(req, { cache: 'no-cache' }).then(r => {
      if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(key, cp)).catch(() => { }); finish(r); }
      else fallback().then(c => finish(c || r));
    }).catch(() => fallback().then(c => finish(c || Response.error())));
    setTimeout(() => { if (!done) fallback().then(c => { if (c) finish(c); }); }, nav ? 3500 : 5000);
  }));
});
