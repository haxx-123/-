
const CACHE_NAME = 'stockwise-v3'; // Version incremented
// 26.3.2 Pre-cache list
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/Signature.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  // 26.3.4 Immediate Control
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching resources');
      return cache.addAll(URLS_TO_CACHE).catch(err => {
          console.warn('SW: Pre-cache warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  // 26.3.4 Immediate Control
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

// 26.3.1 & 26.3.3 Cache Strategies
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. API Requests & Supabase -> Network Only (Real-time data)
  if (url.includes('/api') || url.includes('supabase.co')) {
      return; // Default to network
  }

  // 2. Static Resources -> Cache First
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; // Return from cache
      }
      
      // Network fallback
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Cache new static assets dynamically
        if (url.match(/\.(js|css|png|jpg|svg|json)$/)) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }

        return response;
      }).catch(() => {
          // Offline fallback for navigation
          if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
          }
      });
    })
  );
});
