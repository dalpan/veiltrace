// Retires the service worker that served "Cek Pesan" from the site root before the app moved to /app/. It deletes only the
// root app's caches (the ones holding /app.js), unregisters itself and reloads open pages so the landing page shows.
// The app's own service worker (scope /app/) and its caches are untouched.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (!key.startsWith('veiltrace-pwa-')) continue;
      const cache = await caches.open(key);
      if (await cache.match(new URL('/app.js', self.location.origin).href)) await caches.delete(key);
    }
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
