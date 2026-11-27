// ВАЖНО: При каждом обновлении сайта меняй v3 на v3, v3 и т.д.
const CACHE_VERSION = 'v3';
const CACHE_NAME = 'minsk-pwa-' + CACHE_VERSION;

// Файлы, которые кэшируются при установке (оболочка приложения)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

// 1. Установка: кэшируем файлы и сразу активируем новый SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting(); // Заставляет новый SW активироваться немедленно
    })
  );
});

// 2. Активация: удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Чистим старьё
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Берем контроль над страницей сразу
    })
  );
});

// 3. Перехват запросов (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Курс валют (API ЦБ) всегда запрашиваем из сети. 
  // Если сети нет, fetch упадет с ошибкой, а index.html (функция catch) подставит сохраненный курс.
  if (url.hostname === 'cbr-xml-daily.ru' || url.hostname === 'www.cbr-xml-daily.ru') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Для всех остальных файлов (HTML, CSS, картинки) — сначала ищем в кэше, потом в сети
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Если есть в кэше — отдаем мгновенно (работает офлайн)
      }
      
      // Если нет в кэше — качаем из сети
      return fetch(event.request).then((response) => {
        // Если это картинка или другой ресурс, можем закэшировать на лету
        if (response.ok && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Если сети нет и файла нет в кэше, а запрос идет на открытие страницы — отдаем index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
