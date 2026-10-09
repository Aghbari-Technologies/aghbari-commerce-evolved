/* Aghbari offline shell. Financial data, auth responses and Supabase traffic are never cached. */
const CACHE_NAME = 'aghbari-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('aghbari-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (/\/(rest|auth|api|rpc|storage|functions)\//i.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const routeResponse = response.clone();
          const homeResponse = response.clone();
          void caches.open(CACHE_NAME).then(async (cache) => {
            await cache.put(request, routeResponse);
            if (new URL(request.url).pathname === '/') {
              await cache.put('/', homeResponse);
            }
          });
        }
        return response;
      }).catch(async () => (await caches.match(request)) || (await caches.match('/')) || Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === 'basic' && /\.(js|css|svg|png|jpe?g|webp|woff2?|ico)$/i.test(url.pathname)) {
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      });
      return cached || network;
    }),
  );
});
