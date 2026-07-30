// Commute PWA service worker — caches only the static shell.
// Live proxy data (cross-origin) is always fetched from the network.
const CACHE = 'commute-shell-v6';
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
  // Network-first so the shell updates when online, cache as offline fallback.
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
