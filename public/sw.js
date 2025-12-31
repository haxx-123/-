
const CACHE_NAME = 'stockwise-v2'; // 升级版本号以强制更新
const URLS_TO_CACHE = [
  '/',
  '/index.html'
  // 注意：不再强制在此处缓存 icons，防止因为图片加载失败导致整个 App 无法安装
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // 强制立即激活
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(URLS_TO_CACHE).catch(err => {
          console.warn('部分资源缓存失败，但允许 SW 继续安装:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // 清理旧缓存
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // 仅处理 http/https 请求
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // 动态缓存：成功加载的资源（包括图标）会自动被加入缓存
        const responseToCache = response.clone();
        if (event.request.url.match(/\.(js|css|png|jpg|svg|json)$/)) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }

        return response;
      });
    }).catch(() => {
        // 离线兜底（可选）
        return caches.match('/index.html'); 
    })
  );
});
