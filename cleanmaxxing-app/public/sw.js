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

// Web-push handler. The cron sends JSON with { title, body, url,
// tag }; we render a notification and stash the url so click
// routes the user to the right surface. Falls back to a generic
// nudge if the payload can't be parsed (the push spec allows
// empty payloads from some servers, which we still want to act on
// rather than drop).
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Cleanmaxxing', body: event.data.text() };
    }
  }
  const title = data.title || 'Cleanmaxxing';
  const options = {
    body: data.body || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || 'cleanmaxxing',
    data: { url: data.url || '/today' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — focus an existing window if one's open at
// the target URL, otherwise open a new one. The `tag`-based
// dedup means clicking a stale notification still drives the
// user to a useful place.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/today';
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        const url = new URL(client.url);
        if (url.pathname === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
