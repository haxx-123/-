const CACHE_NAME = 'stockwise-v3-minimal';

// 1. INSTALL: Do NOT cache anything critical here. Just install immediately.
self.addEventListener('install', (event) => {
    // Skip waiting to force the new SW to become active immediately
    self.skipWaiting();
    console.log('SW: Installed (Minimal Version)');
});

// 2. ACTIVATE: Take control of all clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
    console.log('SW: Activated and claiming clients');
});

// 3. FETCH: Basic Network-First Strategy
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
        .catch(() => {
            return caches.match(event.request);
        })
    );
});