// Minimal service worker for PWA installability + cached shell.
// Strategy: network-first with a cached '/' fallback so the app
// shows something useful when offline. API and auth routes are
// always passed through to the network — never cached, since they
// carry per-user state and auth cookies.

const CACHE = 'cleanmaxxing-v1';
const SHELL_URLS = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => null),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pass through API, auth, and Next.js internals — these must always
  // hit the network (per-user state, auth cookies, hot-loaded chunks).
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/_next/data/')
  ) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cache successful HTML navigations so reopens work offline.
        if (res.ok && req.mode === 'navigate') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('/')),
      ),
  );
});
