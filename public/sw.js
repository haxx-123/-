
const CACHE_NAME = 'stockwise-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // 强制立即激活
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // 立即接管页面
});

self.addEventListener('fetch', (event) => {
  // 仅处理 http/https 请求，忽略 chrome-extension 等
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // 1. 如果缓存里有，直接返回缓存 (Cache First 策略，保证离线能开)
      if (response) {
        return response;
      }
      
      // 2. 如果缓存没有，去网络请求
      return fetch(event.request).then((response) => {
        // 检查是否是有效响应
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // 3. 将新请求到的资源放入缓存 (动态缓存)
        // 注意：只缓存静态资源，API 请求通常不缓存或由前端逻辑控制
        const responseToCache = response.clone();
        if (event.request.url.match(/\.(js|css|png|jpg|svg)$/)) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }

        return response;
      });
    })
  );
});