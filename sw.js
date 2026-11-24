const CACHE_VERSION = 'v2';
const ASSETS_CACHE  = 'minsk-assets-' + CACHE_VERSION;
const RUNTIME_CACHE = 'minsk-runtime-' + CACHE_VERSION;

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

const FONT_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'unpkg.com'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(ASSETS_CACHE)
      .then(c => c.addAll(PRECACHE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== ASSETS_CACHE && k !== RUNTIME_CACHE)
          .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // 1) API ЦБ РФ — только сеть, офлайн-фоллбэк уже в самом приложении
  if (url.hostname === 'cbr-xml-daily.ru' || url.hostname === 'www.cbr-xml-daily.ru') {
    e.respondWith(fetch(req).catch(() => new Response('', { status: 503 })));
    return;
  }

  // 2) Свои файлы — cache-first + пополнение рантайм-кэша + fallback на index.html для навигации
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          if (resp.ok && req.method === 'GET') {
            const clone = resp.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
          }
          return resp;
        }).catch(() => {
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 503 });
        });
      })
    );
    return;
  }

  // 3) Шрифты и иконки из внешних CDN — stale-while-revalidate
  if (FONT_HOSTS.includes(url.hostname) || /\.(woff2?|ttf|otf|eot|png|svg|jpg|jpeg|webp|ico)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
          }
          return resp;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 4) Всё остальное — сеть, потом кэш
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});

const CACHE_VERSION = 'v2'; // было v1 → стало v2
