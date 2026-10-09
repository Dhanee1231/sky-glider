// Gem Tiles service worker. Scope: this tiles/ folder only. Touches only its own 'tiles-*' caches.
const CACHE = 'tiles-v2';
const SHELL = ['./', './index.html', './app.js', './art.js', './audio.js', './analyze.js', './songs.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png'];
const SCOPE = new URL('./', self.location).pathname;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tiles-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (req.mode === 'navigate') { e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; }).catch(() => caches.match('./index.html'))); return; }
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(n => { if (n.ok) { const cp = n.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return n; }).catch(() => caches.match(req, { ignoreSearch: true })));
});
