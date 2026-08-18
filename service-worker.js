/* ==========================================================================
   SERVICE WORKER
   Minimal offline support: precache the app shell on install, then serve
   same-origin requests cache-first (falling back to network + caching the
   response), with a network-first strategy for page navigations so content
   edited in /admin is picked up quickly while still working offline.
   ========================================================================== */

const CACHE_VERSION = 'v24';
const CACHE_NAME = `portfolio-shell-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './blog.html',
  './resume.html',
  './404.html',
  './privacy.html',
  './admin/index.html',
  './manifest.json',
  './rss.xml',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/sections.css',
  './css/animations.css',
  './css/responsive.css',
  './css/premium.css',
  './css/print.css',
  './admin/css/admin.css',
  './js/data-store.js',
  './js/validation.js',
  './js/i18n.js',
  './js/main.js',
  './js/blog.js',
  './js/resume.js',
  './admin/js/admin.js',
  './assets/images/profile/profile.png',
  './assets/images/profile/favicon.svg',
  './assets/images/profile/favicon-32.png',
  './assets/images/profile/apple-touch-icon.png',
  './assets/images/profile/icon-192.png',
  './assets/images/profile/icon-512.png',
  './assets/images/og-image.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        /* If any single asset 404s the whole precache would otherwise fail —
           don't let that block install; runtime caching still covers us. */
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isNavigation = req.mode === 'navigate';

  if (isNavigation) {
    // Network-first for page loads so content edits show up immediately;
    // fall back to the cached shell (or cached page) when offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  if (url.origin === location.origin) {
    // Cache-first for same-origin static assets (CSS/JS/images).
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        }).catch(() => cached);
      })
    );
  } else {
    // Stale-while-revalidate for cross-origin CDN assets (fonts/icons).
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
