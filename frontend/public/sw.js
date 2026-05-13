// frontend/public/sw.js

const CACHE_NAME = 'gymcore-v2'; 

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

// 1. При установке приложения кэшируем файлы
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Кэширование файлов оболочки PWA...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// 2. Очистка старого кэша при обновлении (если мы поменяем версию на v2)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. Перехват запросов (Магия оффлайна)
self.addEventListener('fetch', event => {
    // Если запрос идет к нашему API (за упражнениями), пока пропускаем его в сеть
    if (event.request.url.includes('/api/')) {
        return; 
    }

    // Для стилей, скриптов и HTML сначала ищем в кэше, если нет — идем в интернет
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                return cachedResponse || fetch(event.request);
            })
    );
});