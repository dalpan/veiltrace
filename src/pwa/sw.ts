/// <reference lib="webworker" />
// Service worker of the "Cek Pesan" PWA (D-084). It caches the app for offline use and receives Android share-sheet
// POSTs: the shared text is stored once in Cache Storage and the app reads and deletes it, so it never appears in a URL,
// the history or a server log. Shared screenshots (D-104) are handled the same way. Apart from the app's own files on this
// origin (the OCR files are fetched the first time an image is checked), it makes no network request.
const sw = self as unknown as ServiceWorkerGlobalScope;
declare const __VT_VERSION__: string;

const CACHE = `veiltrace-pwa-${__VT_VERSION__}`;
const SHARED_CACHE = 'veiltrace-share';
const ASSETS = ['./', 'index.html', 'app.js', 'style.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const MAX_SHARED_CHARS = 20000;
/** Larger shared images are not kept (a phone screenshot is well below this). */
const MAX_SHARED_IMAGE_BYTES = 15 * 1024 * 1024;

sw.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== SHARED_CACHE).map((k) => caches.delete(k))))
    .then(() => sw.clients.claim()));
});

async function receiveShare(req: Request): Promise<Response> {
  const form = await req.formData();
  const parts = ['title', 'text', 'url'].map((k) => form.get(k)).filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  const text = [...new Set(parts)].join('\n').slice(0, MAX_SHARED_CHARS);
  const cache = await caches.open(SHARED_CACHE);
  await cache.put('./__shared__', new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8' } }));
  // A shared screenshot (D-104) is stored the same way, once, for the app to read on the device and delete.
  const image = form.get('image');
  if (image instanceof File && image.type.startsWith('image/') && image.size <= MAX_SHARED_IMAGE_BYTES) {
    await cache.put('./__shared_image__', new Response(image, { headers: { 'content-type': image.type } }));
  }
  return Response.redirect('./?shared=1', 303);
}

sw.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== sw.location.origin) return;
  if (e.request.method === 'POST' && url.pathname.endsWith('/share')) {
    e.respondWith(receiveShare(e.request));
    return;
  }
  if (e.request.method !== 'GET') return;
  // The OCR files (ocr/…, several MB) are not part of the install: they are fetched from this origin the first time an image
  // is checked and kept for offline use.
  if (url.pathname.includes('/ocr/')) {
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(e.request)) ?? fetch(e.request).then((res) => {
      if (res.ok) void c.put(e.request, res.clone());
      return res;
    })));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit ?? fetch(e.request)));
});
