
const CACHE_NAME = 'stockwise-v8-offline';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. INSTALL
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v8...');
    // We do NOT call skipWaiting() automatically here to avoid disrupting active sessions.
    // Instead, we wait for the client to send a SKIP_WAITING message via the Update Toast.
});

// Message handler for manual skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 2. ACTIVATE
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v8...');
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

// 3. FETCH
self.addEventListener('fetch', (event) => {
    // 26.1.4 Cache Strategy: Network First for critical content
    event.respondWith(
        fetch(event.request)
        .catch(() => {
            return caches.match(event.request).then((response) => {
                if (response) {
                    return response;
                }
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
