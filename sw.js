
const CACHE_NAME = 'stockwise-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_NAME);
  
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened');
        // Attempt to cache files, but don't fail installation if non-criticals fail
        return cache.addAll(URLS_TO_CACHE).catch(err => {
            console.warn('[SW] Some files failed to cache, but continuing installation:', err);
        });
      })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_NAME);
  
  // Take control of all clients immediately (fast PWA start)
  event.waitUntil(clients.claim());

  // Cleanup old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cache if found
        if (response) {
          return response;
        }
        // Clone request for fetch
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Don't cache API calls or external resources automatically to avoid staleness logic complexity here
            // (Optional: Implement runtime caching here if needed)
            
            return response;
          }
        ).catch(() => {
           // Fallback for offline (optional)
        });
      })
  );
});
