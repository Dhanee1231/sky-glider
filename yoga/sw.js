// Yoga Coach service worker. Scope: this yoga/ folder only. Touches only its own 'yoga-coach-*' caches.
const CACHE = 'yoga-coach-v1';
const SHELL = ['./', './index.html', './style.css', './app.js', './poses.js', './figure.js', './store.js', './coach.js', './body.js', './rules.js', './camera.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const MODEL = ['./vendor/vision_bundle.mjs', './vendor/vision_wasm_internal.js', './vendor/vision_wasm_internal.wasm', './vendor/pose_landmarker_lite.task'];
const SCOPE = new URL('./', self.location).pathname;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(SHELL);
    // camera coach files (~19 MB): best effort so the app still installs if this fails
    await Promise.all(MODEL.map(u => c.add(u).catch(() => { })));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('yoga-coach-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  const isModel = url.pathname.includes('/vendor/');
  if (isModel) { // cache-first for the big, versioned model files
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { if (n.ok) { const cp = n.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return n; })));
    return;
  }
  // app files: network first (fresh updates), fall back to cache offline
  e.respondWith(fetch(req).then(n => { if (n.ok) { const cp = n.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return n; }).catch(() => caches.match(req)));
});
