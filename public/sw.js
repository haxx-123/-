
const CACHE_NAME = 'stockwise-v7-prism-webapk';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/Signature.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/screenshots/mobile.png',
  '/screenshots/desktop.png'
];

// 26.3.4 Immediate Control
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching resources including screenshots');
      return cache.addAll(URLS_TO_CACHE).catch(err => {
          console.warn('SW: Pre-cache warning', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// 26.3.3 Cache Strategies
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. API / Supabase -> Network Only
  if (url.includes('/api') || url.includes('supabase.co')) {
    return;
  }

  // 2. Static Resources (JS/CSS/Images) -> Cache First
  if (url.match(/\.(js|css|png|jpg|jpeg|svg|json|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) return response;
        return fetch(event.request).then((networkResponse) => {
           if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
             return networkResponse;
           }
           const responseToCache = networkResponse.clone();
           caches.open(CACHE_NAME).then((cache) => {
             cache.put(event.request, responseToCache);
           });
           return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Navigation -> Network First with Cache Fallback (for SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
  }
});
