// Yoga Coach service worker. Scope: this yoga/ folder only. Touches only its own 'yoga-coach-*' caches.
const CACHE = 'yoga-coach-v3';
const SHELL = ['./', './index.html', './style.css', './app.js', './poses.js', './figure.js', './store.js', './coach.js', './voice.js', './speechtext.js', './lines.js', './media.js', './body.js', './rules.js', './camera.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './voice-kid.json', './media/voice/af_heart/index.json', './media/voice/am_michael/index.json'];
const MODEL = ['./vendor/vision_bundle.mjs', './vendor/vision_wasm_internal.js', './vendor/vision_wasm_internal.wasm', './vendor/pose_landmarker_lite.task'];
const VOICE_LIST = './voice-kid.json';
const SCOPE = new URL('./', self.location).pathname;
// Precache the kid clips (ids listed in voice-kid.json) for one voice. Each clip is best effort.
async function precacheVoice(c, voice) {
  try {
    const list = await (await fetch(VOICE_LIST, { cache: 'no-cache' })).json();
    const urls = list.ids.map(id => new URL('./media/voice/' + voice + '/' + id + '.ogg', self.location).href);
    const have = new Set((await c.keys()).map(r => r.url));
    const todo = urls.filter(u => !have.has(u));
    for (let i = 0; i < todo.length; i += 8) await Promise.allSettled(todo.slice(i, i + 8).map(u => c.add(u)));
  } catch (e) { }
}
self.addEventListener('message', e => {
  const d = e.data; if (d && d.type === 'precache-voice' && /^[a-z_]+$/.test(d.voice || '')) e.waitUntil(caches.open(CACHE).then(c => precacheVoice(c, d.voice)));
});
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
    // camera coach files (~19 MB): reuse the copies saved by v1 if present, else download (best effort)
    const olds = []; for (const n of ['yoga-coach-v2b', 'yoga-coach-v2', 'yoga-coach-v1']) if (await caches.has(n)) olds.push(await caches.open(n));
    await Promise.all(MODEL.map(async u => { const href = new URL(u, self.location).href; let hit = null; for (const o of olds) { hit = await o.match(href); if (hit) break; } if (hit) return c.put(u, hit); return c.add(u).catch(() => { }); }));
    await precacheVoice(c, 'af_heart');   // kid voice clips for offline use; best effort, never fails the install
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('yoga-coach-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  const rel = url.pathname.slice(SCOPE.length);
  // big, versioned files: model, real-person media, voice clips. Cache-first, saved on demand (not precached).
  if (rel.startsWith('vendor/') || (rel.startsWith('media/') && !rel.endsWith('index.json'))) {
    if (req.headers.has('range')) return; // let the network handle partial requests (the app fetches whole files)
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(n => { if (n.ok && n.status === 200) { const cp = n.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return n; })));
    return;
  }
  // app files: network first (fresh updates), fall back to cache offline
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(n => { if (n.ok) { const cp = n.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return n; }).catch(() => caches.match(req)));
});
