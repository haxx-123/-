
const CACHE_NAME = 'stockwise-v5-offline';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. INSTALL: Cache core assets to pass PWA "offline capability" check
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v5...');
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching core files');
            // We use a catch block here so one missing file doesn't break the whole install
            return cache.addAll(URLS_TO_CACHE).catch(err => {
                console.warn('[SW] Caching warning (non-fatal):', err);
            });
        })
    );
});

// 2. ACTIVATE: Cleanup old caches and claim clients
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v5...');
    event.waitUntil(clients.claim());
    
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

// 3. FETCH: Network First, falling back to Cache, falling back to /index.html (SPA)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
        .catch(() => {
            // Network failed, try cache
            return caches.match(event.request).then((response) => {
                if (response) {
                    return response;
                }
                // If asking for a page (navigation) and not in cache, return index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
