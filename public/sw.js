// «Убийца» старого Service Worker'а PWA-версии: если у кого-то он остался установлен
// на этом домене — удаляет кэши и снимает регистрацию. Новому приложению SW не нужен.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.navigate(c.url));
    })(),
  );
});
