const CACHE = 'ozamapay-static-v1';
const STATIC = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-192-maskable.png', '/icons/icon-512-maskable.png', '/icons/apple-touch-icon.png', '/faveiconozamapay.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // Cache-first for static assets (icons, manifest)
  if (STATIC.includes(url.pathname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
    return;
  }

  // Network-first for everything else
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
