
const CACHE_NAME = 'stockwise-v9-offline';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // Caching the icons defined in manifest.json to ensure offline availability
  // These must match the src in manifest.json exactly to avoid 404s during install
  'https://i.ibb.co/93cvPv7p/maskable-icon-x192.png',
  'https://i.ibb.co/HLWPZQNX/maskable-icon-x512.png'
];

// 26.1.3 Service Worker Logic
// Install: Cache core files & FORCE ACTIVATE
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v9 (Forced Activation)...');
    
    // 1. Force Immediate Activation (Skipping Wait)
    // This ensures the SW takes control immediately for the first install,
    // which is crucial for WebAPK generation criteria.
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE).catch(err => {
                console.warn('[SW] Caching warning:', err);
            });
        })
    );
});

// Activate: Cleanup old caches & Claim Clients
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v9...');
    event.waitUntil(clients.claim()); // Take control immediately
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

    // 4. Default Fallback (Explicitly allowing network for anything else)
    // This covers any other requests not matched above.
    // return fetch(event.request); // Implicit in SW if no respondWith is called
});
