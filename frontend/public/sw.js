// frontend/public/sw.js

// Повышаем версию до v3, чтобы при первой загрузке гарантированно сбросить старый "зависший" кэш
const CACHE_NAME = 'gymcore-v3'; 

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/assets/css/style.css',
    '/assets/icons/icon.png',
    '/js/app.js',
    '/js/router.js',
    '/js/api/api.js',
    '/js/utils/constants.js',
    '/js/utils/helpers.js',
    '/manifest.json'
];

// 1. При установке приложения кэшируем файлы и заставляем новый SW активироваться сразу
self.addEventListener('install', event => {
    self.skipWaiting(); // Принудительно переключаем на новый SW, не дожидаясь закрытия вкладок
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Кэширование файлов оболочки PWA...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// 2. Очистка старого кэша при обновлении
self.addEventListener('activate', event => {
    self.clients.claim(); // Мгновенно берем под контроль все открытые вкладки приложения
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Удаление старого кэша:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. Перехват запросов (Умная стратегия NETWORK FIRST)
self.addEventListener('fetch', event => {
    // Если запрос идет к нашему бэкенд API или к сторонним ресурсам, пускаем напрямую в сеть
    if (event.request.url.includes('/api/') || !event.request.url.startsWith(self.location.origin)) {
        return; 
    }

    // Для стилей, скриптов и HTML сначала ВСЕГДА идем в интернет за свежей версией
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Если файл успешно скачался из сети (код 200), обновляем его копию в кэше
                if (networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Если интернета нет (оффлайн в зале), достаем этот файл из сохраненного кэша
                return caches.match(event.request).then(cachedResponse => {
                    // Если даже в кэше файла нет (например, какой-то новый роут), открываем index.html
                    return cachedResponse || caches.match('/index.html');
                });
            })
    );
});