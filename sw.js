// Force a new version to kick out the stuck worker
const CACHE_NAME = 'stockwise-v4-emergency-fix';

// 1. INSTALL: Do absolutely NOTHING complex. Just skip waiting.
self.addEventListener('install', (event) => {
    console.log('SW: Force installing...');
    self.skipWaiting();
});

// 2. ACTIVATE: Claim clients immediately.
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
    console.log('SW: Activated!');
});

// 3. FETCH: Simple Network-First strategy
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
        .catch(() => caches.match(event.request))
    );
});