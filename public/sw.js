
const CACHE_NAME = 'stockwise-v3'; 
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/Signature.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
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

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (url.includes('/api') || url.includes('supabase.co')) {
      return; 
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; 
      }
      
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Added 'bin' to regex to support FaceAPI model shards caching
        if (url.match(/\.(js|css|png|jpg|svg|json|bin)$/)) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }

        return response;
      }).catch(() => {
          if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
          }
      });
    })
  );
});
