// Color Magic service worker. Scope: this color/ folder only; touches only its own color-magic-* caches.
// Shell cache is CACHE-FIRST on an explicit allowlist. Full pack photos live in a separate runtime cache,
// filled on first open, only for URLs in photos/manifest.json, LRU 24. Never caches blob:, data:, or user pictures.
const CACHE = 'color-magic-v10';
const PHOTO = 'color-magic-photos-v10';
const PHOTO_MAX = 24;
const CLIPS = ["00342552","032500fa","037e7b72","05537a1b","05ea5a44","0878c6e9","0d3e35d5","0deab724","0dfdaa51","0e3d6cab","149fc4ef","15290210","183f9498","1872a932","18c82b37","19a6cfe8","19ca96e7","19fde81e","1fbb94da","25bae6f5","265b762b","27f1f49c","295bdc0a","29b99835","2a9cbe16","2b018ed8","2b17add7","2c9b5c03","36217717","36779ca8","37118ad1","375014a8","384dabb9","38741ad5","3977ee66","3ace5d57","3c6692a4","3cd7bd99","3e84a4f4","3ead2e02","490a331f","4ab8f9d2","52b87b6e","52efd071","52f7cf50","544a2573","567dd678","59653e8e","5b48a7ee","5d0480fb","5e218016","5f09ee1c","60bcb16c","61bc1755","63f1336c","643b38fb","66f69591","6787fa4f","690aa0d5","6aea6f48","6b3afd56","6f99c25e","6fe250ef","71ed6f5e","74858851","7486c1a5","77daf6b8","786bd707","7882518c","7cb6b48f","7ccce931","7cf7d467","7fce80a4","821ab4a6","83a19b69","83bcc405","8defec07","94fb832c","9586649a","9756f4ee","9a3fc475","9b2ccfae","9cb5a3f1","9ebbccab","9fa070b3","a0ac0e8a","a4e5aee8","a50a8f2c","a55881ac","ab3add27","af15011e","b20ee6f3","b987bd55","bd0b0ffc","bdb8fb9a","c36a2b52","c443cb57","c4bb620c","c6de7400","c9a342c4","cc4a3938","cef23b3d","cf024170","d0274d7b","d02f1764","d058200b","d40ce8ba","d7d7382f","d908f7b9","dd76aafb","dfbc03cd","e3498d3b","e4c35bdc","e5b4df3a","e7accee4","eb07f863","eb3239e0","eeefe561","f04dc110","f3a599fa","f40b6ccf","f83c75ce","f85a0760","f8cd3f7f","fce32734"];   // voice clip keys (ttsKey hashes)
const THUMBS = ["./photos/flowers/dahlias.t.webp","./photos/flowers/hydrangea.t.webp","./photos/flowers/lavender.t.webp","./photos/flowers/lotus.t.webp","./photos/flowers/orchid.t.webp","./photos/flowers/pansies.t.webp","./photos/flowers/peony.t.webp","./photos/flowers/poppies.t.webp","./photos/fall/apples.t.webp","./photos/fall/bridge.t.webp","./photos/fall/hedgehog.t.webp","./photos/fall/lake.t.webp","./photos/fall/leaf.t.webp","./photos/fall/path.t.webp","./photos/fall/pumpkinpatch.t.webp","./photos/fall/squirrel.t.webp","./photos/winter/aurora.t.webp","./photos/winter/cabin.t.webp","./photos/winter/cardinal.t.webp","./photos/winter/cocoa.t.webp","./photos/winter/fox.t.webp","./photos/winter/penguins.t.webp","./photos/winter/snowflakes.t.webp","./photos/winter/snowman.t.webp","./photos/spring/bunny.t.webp","./photos/spring/butterfly.t.webp","./photos/spring/cherry.t.webp","./photos/spring/ducklings.t.webp","./photos/spring/ladybug.t.webp","./photos/spring/nest.t.webp","./photos/spring/rainbow.t.webp","./photos/spring/tulips.t.webp","./photos/summer/balloons.t.webp","./photos/summer/beach.t.webp","./photos/summer/dolphin.t.webp","./photos/summer/lighthouse.t.webp","./photos/summer/meadow.t.webp","./photos/summer/picnic.t.webp","./photos/summer/reef.t.webp","./photos/summer/sunflowers.t.webp","./photos/holidays/christmas.t.webp","./photos/holidays/diwali.t.webp","./photos/holidays/easter.t.webp","./photos/holidays/halloween.t.webp","./photos/holidays/july4.t.webp","./photos/holidays/newyear.t.webp","./photos/holidays/thanksgiving.t.webp","./photos/holidays/valentines.t.webp"];
const PHOTOS = ["./photos/flowers/dahlias.webp","./photos/flowers/hydrangea.webp","./photos/flowers/lavender.webp","./photos/flowers/lotus.webp","./photos/flowers/orchid.webp","./photos/flowers/pansies.webp","./photos/flowers/peony.webp","./photos/flowers/poppies.webp","./photos/fall/apples.webp","./photos/fall/bridge.webp","./photos/fall/hedgehog.webp","./photos/fall/lake.webp","./photos/fall/leaf.webp","./photos/fall/path.webp","./photos/fall/pumpkinpatch.webp","./photos/fall/squirrel.webp","./photos/winter/aurora.webp","./photos/winter/cabin.webp","./photos/winter/cardinal.webp","./photos/winter/cocoa.webp","./photos/winter/fox.webp","./photos/winter/penguins.webp","./photos/winter/snowflakes.webp","./photos/winter/snowman.webp","./photos/spring/bunny.webp","./photos/spring/butterfly.webp","./photos/spring/cherry.webp","./photos/spring/ducklings.webp","./photos/spring/ladybug.webp","./photos/spring/nest.webp","./photos/spring/rainbow.webp","./photos/spring/tulips.webp","./photos/summer/balloons.webp","./photos/summer/beach.webp","./photos/summer/dolphin.webp","./photos/summer/lighthouse.webp","./photos/summer/meadow.webp","./photos/summer/picnic.webp","./photos/summer/reef.webp","./photos/summer/sunflowers.webp","./photos/holidays/christmas.webp","./photos/holidays/diwali.webp","./photos/holidays/easter.webp","./photos/holidays/halloween.webp","./photos/holidays/july4.webp","./photos/holidays/newyear.webp","./photos/holidays/thanksgiving.webp","./photos/holidays/valentines.webp"];
const SHELL = ['./', './index.html', './fsbtn.js', './app.js', './render.js', './cbn-core.js', './worker.js', './pipe.js', './photo.js', './save.js', './art.js', './audio.js', './funzone.js', './packs/kit.js', './packs/kit2.js', './packs/kit3.js', './packs/gems.js', './packs/meadow.js', './packs/ocean.js', './packs/treats.js', './packs/pets.js', './packs/friends.js', './packs/rainbow.js', './packs/garden.js', './packs/space.js', './packs/farm.js', './packs/dino.js', './packs/seasons.js', './photos/packs.js', './photos/manifest.json', './photos/CREDITS.json', ...THUMBS, './manifest.json', './audio/manifest.json', ...CLIPS.map(k => './audio/' + k + '.ogg'), './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const SCOPE = new URL('./', self.location).pathname;
const ALLOW = new Set(SHELL.map(u => new URL(u, self.location).pathname));
const PHOTO_ALLOW = new Set(PHOTOS.map(u => new URL(u, self.location).pathname));
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('color-magic-') && k !== CACHE && k !== PHOTO).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
async function trimPhoto(cache) {
  const reqs = await cache.keys(); if (reqs.length <= PHOTO_MAX) return;
  const rows = [];
  for (const rq of reqs) { const rs = await cache.match(rq); rows.push([+(rs.headers.get('x-cm-used') || 0), rq]); }
  rows.sort((a, b) => a[0] - b[0]);
  while (rows.length > PHOTO_MAX) await cache.delete(rows.shift()[1]);
}
async function photoGet(req) {
  const cache = await caches.open(PHOTO);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) {
    const buf = await hit.arrayBuffer(), h = new Headers(hit.headers); h.set('x-cm-used', String(Date.now()));
    await cache.put(req, new Response(buf, { status: hit.status, headers: h }));
    return new Response(buf, { status: hit.status, headers: h });
  }
  const res = await fetch(req);
  if (res && res.ok) {
    const buf = await res.clone().arrayBuffer(), h = new Headers(res.headers); h.set('x-cm-used', String(Date.now()));
    await cache.put(req, new Response(buf, { status: 200, headers: h }));
    await trimPhoto(cache);
    return new Response(buf, { status: res.status, headers: h });
  }
  return res;
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol === 'blob:' || url.protocol === 'data:') return;
  if (url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (PHOTO_ALLOW.has(url.pathname)) { e.respondWith(photoGet(req)); return; }
  const nav = req.mode === 'navigate', path = nav ? new URL('./index.html', self.location).pathname : url.pathname;
  if (!nav && !ALLOW.has(path) && url.pathname !== SCOPE) return;
  e.respondWith(caches.open(CACHE).then(c => c.match(nav ? './index.html' : req, { ignoreSearch: true })).then(r => r || fetch(req)));
});
