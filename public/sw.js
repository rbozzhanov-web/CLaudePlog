// Minimal, hand-rolled — Expo's own docs warn that web service workers are prone to surprising
// behavior, so this deliberately skips Workbox and precaching in favor of one predictable rule:
// same-origin GETs are network-first, falling back to whatever was last cached when offline.
// Cross-origin requests (the NBRK rate fetch) are left alone entirely — a stale exchange rate
// served from cache would be silently wrong in a way the app has no way to detect.
const CACHE_NAME = 'pilot-logbook-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw error;
      }
    }),
  );
});
