
const CACHE_NAME = 'stockwise-v10-offline';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // 26.1.4 Cache specific external assets required for PWA
  'https://i.ibb.co/93cvPv7p/maskable-icon-x192.png',
  'https://i.ibb.co/HLWPZQNX/maskable-icon-x512.png',
  'https://i.ibb.co/vxq7QfYd/retouch-2025121423241826.png'
];

// 26.1.3 Service Worker Logic
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v10...');
    // We do NOT force skipWaiting here immediately if we want the "Update Toast" flow.
    // The user will click the toast to trigger skipWaiting via message.
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE).catch(err => {
                console.warn('[SW] Caching warning:', err);
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v10...');
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
        return;
    }

    // 2. Static Assets (JS/CSS/Images): Cache First
    // matches local assets or the specific external images we cached
    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico)$/) || URLS_TO_CACHE.includes(event.request.url)) {
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
