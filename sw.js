
const CACHE_NAME = 'stockwise-v9-offline';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 26.1.3 Service Worker Logic
// Install: Cache core files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v9...');
    // We wait for the client to send SKIP_WAITING to activate, implementing the "Toast update" flow.
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE).catch(err => {
                console.warn('[SW] Caching warning:', err);
            });
        })
    );
});

// Activate: Cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v9...');
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

// Message Handler for Skip Waiting (Triggered by UI Toast)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 26.1.4 Caching Strategy
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. API Requests (Supabase): Network Only (Ensure real-time inventory)
    if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) {
        return; // Fallback to browser default (Network)
    }

    // 2. Static Assets (JS/CSS/Images): Cache First
    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico)$/)) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
        return;
    }

    // 3. HTML Navigation: Network First (Fallback to cached offline page/index)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
            .catch(() => {
                return caches.match('/index.html');
            })
        );
        return;
    }
});
