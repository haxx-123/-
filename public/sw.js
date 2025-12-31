self.addEventListener('install', (event) => {
  self.skipWaiting(); // 强制立即激活
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // 立即接管页面
});

self.addEventListener('fetch', (event) => {
  // 必须有 fetch 监听，浏览器才认为这是 PWA
  // 这里做简单的透传，不做复杂缓存，避免逻辑错误
  event.respondWith(fetch(event.request));
});