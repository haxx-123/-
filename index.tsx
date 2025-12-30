
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- 关键新增代码 START ---
// Global capture of install prompt
// This must happen before anything else to catch the event early
// @ts-ignore
window.deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  // 1. Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // 2. Stash the event so it can be triggered later.
  // @ts-ignore
  window.deferredPrompt = e;
  
  // 3. 【核心修复】广播自定义事件，通知 React 组件更新状态
  // 解决了组件加载晚于事件触发导致的状态不同步问题
  window.dispatchEvent(new Event('pwa-install-ready'));
  
  console.log('[Global] PWA install prompt event captured & broadcasted!');
});
// --- 关键新增代码 END ---

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
