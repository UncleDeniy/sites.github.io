const CACHE_NAME = 'web-hub-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './minsk-plan/index.html',
  './sonya-plan/index.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
