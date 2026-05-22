const CACHE_NAME = 'bonus-tracker-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install — pre-cache all assets, then wait for explicit SKIP_WAITING message
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Skip waiting when the app explicitly requests it (via update banner)
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — cache-first with background update
self.addEventListener('fetch', (e) => {
  // Only handle same-origin GET requests
  const requestUrl = new URL(e.request.url);
  if (e.request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request);
      const cacheUpdatePromise = fetchPromise.then(response => {
        if (response.ok) {
          const responseCopy = response.clone();
          return caches.open(CACHE_NAME)
            .then(cache => cache.put(e.request, responseCopy))
            .then(() => response);
        }
        return response;
      });

      if (cached) {
        e.waitUntil(cacheUpdatePromise.catch(() => undefined));
        return cached;
      }

      return cacheUpdatePromise.catch(async () => {
        if (e.request.mode === 'navigate') {
          const fallback = await caches.match('./index.html');
          if (fallback) return fallback;
        }

        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
