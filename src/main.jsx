import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// In dev, unregister any previously-installed service workers so stale
// cached responses (e.g. 500s) don't shadow the live Vite dev server.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length) {
      regs.forEach((r) => r.unregister());
      if (window.caches) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
      // Reload once so the page is no longer controlled by the old SW.
      if (!sessionStorage.getItem('sw-cleared')) {
        sessionStorage.setItem('sw-cleared', '1');
        window.location.reload();
      }
    }
  }).catch(() => {});
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
