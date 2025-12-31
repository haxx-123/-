
const CACHE_NAME = 'stockwise-v12-pwa-fix';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: 强制跳过等待，立即接管
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE).catch(err => {
                console.warn('[SW] Cache add warning:', err);
            });
        })
    );
});

// Activate: 清理旧缓存并立即控制客户端
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch: 拦截请求
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. API & Supabase: 网络优先 (Network Only/First)
    if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) {
        return; 
    }

    // 2. 静态资源: 缓存优先
    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|json|woff2)$/)) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
        return;
    }

    // 3. 页面导航: 网络优先，失败则回退到 index.html (SPA支持)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match('/index.html');
            })
        );
        return;
    }
});
