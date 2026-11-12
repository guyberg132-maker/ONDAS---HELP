const CACHE_NAME = 'ironwave-cache-v1';

// משיכת בקשות מהרשת, ואם אין קליטה - שליפה מהזיכרון
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// עדכון הזיכרון כשמתקינים גרסה חדשה
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});
