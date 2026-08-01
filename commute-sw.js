// Commute PWA service worker — caches only the static shell.
// Live proxy data (cross-origin) is always fetched from the network.
const CACHE = 'commute-shell-v10';
const SHELL = [
  './',
  'manifest.json',
  'icons/pwa/icon-180.png',
  'icons/pwa/icon-192.png',
  'icons/pwa/icon-512.png',
  'icons/pwa/maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      // Only our own old shells. Caches are per-ORIGIN, and on the launcher
      // origin this SW shares that origin with every other tile — an unfiltered
      // sweep here would silently delete their caches too.
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('commute-shell-') && k !== CACHE)
            .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Only handle same-origin GETs; let the proxy calls hit the network untouched.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Stale-while-revalidate. Network-first meant every navigation waited on the
  // network before painting anything, so the cache only ever earned its keep
  // offline — it never made an open faster, which is most of the point.
  //
  // Safe here specifically because of the guard above: live bus data is
  // cross-origin and has already returned, so nothing time-sensitive can be
  // served stale. The worst case is one open painting the previous shell while
  // the new one downloads, and skipWaiting + clients.claim means it is at most
  // one open behind.
  e.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => { c.put(req, res.clone()); return res; })
          .catch(() => hit);
        return hit || net;
      })
    )
  );
});
