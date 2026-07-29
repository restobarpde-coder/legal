// Bumping this name purges older caches on activate. It was bumped to v2 to
// evict entries poisoned by precaching "/" and "/dashboard": with no session
// /dashboard answers 307 -> /login, so addAll (which follows redirects) stored
// a response flagged `redirected` under the /dashboard key. The old offline
// fallback handed that entry to navigations, and a navigation's redirect mode
// is "manual", which fails the response with a network error.
const CACHE_NAME = 'ca-legal-v2';

// Static assets only. HTML routes are intentionally absent: they are gated by
// middleware on the session, so a cached copy is both redirect-derived and
// stale the moment the session changes.
const urlsToCache = [
  '/manifest.json',
  '/placeholder-logo.png',
  '/placeholder-logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch(() => {
        console.log('Cache failed for some resources');
      })
      // Take over immediately so a client stuck on a broken worker recovers on
      // the next load instead of waiting for every tab to close.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheable(request) {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);

  // Same-origin http(s) only: Cache.put rejects other schemes.
  if (url.origin !== self.location.origin) return false;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  // Never cache API responses, RSC payloads or route data: they are
  // session-dependent and go stale silently.
  if (url.pathname.startsWith('/api/')) return false;
  if (url.pathname.startsWith('/_next/data/')) return false;
  if (url.searchParams.has('_rsc')) return false;

  return true;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Let navigations go straight to the network. Their redirect mode is
  // "manual", so serving them anything the worker produced from a followed
  // redirect fails the response with a network error.
  if (request.mode === 'navigate') return;

  if (!isCacheable(request)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (
          !response ||
          response.status !== 200 ||
          response.type === 'error' ||
          response.type === 'opaque' ||
          response.type === 'opaqueredirect' ||
          // A redirected response must never be replayed from the cache, so
          // don't store it in the first place.
          response.redirected
        ) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache).catch(() => {
            // Ignore quota / unsupported-response failures.
          });
        });

        return response;
      });
    })
  );
});
