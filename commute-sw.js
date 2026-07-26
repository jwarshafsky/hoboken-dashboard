// Commute PWA service worker — caches only the static shell.
// Live proxy data (cross-origin) is always fetched from the network.
const CACHE = 'commute-shell-v2';
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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
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
