import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

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

// PWA Service Worker Registration Simulation
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // In a real build, this would point to the actual sw.js file
    // navigator.serviceWorker.register('/sw.js').then(...)
    console.log('Service Worker registered (simulated)');
  });
}