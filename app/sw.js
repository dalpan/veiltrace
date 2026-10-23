"use strict";
(() => {
  // src/pwa/sw.ts
  var sw = self, CACHE = "veiltrace-pwa-0.8.0-eab85acc5d73", SHARED_CACHE = "veiltrace-share", ASSETS = ["./", "index.html", "app.js", "style.css", "manifest.webmanifest", "icon-192.png", "icon-512.png"], MAX_SHARED_CHARS = 2e4, MAX_SHARED_IMAGE_BYTES = 15 * 1024 * 1024;
  sw.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => sw.skipWaiting()));
  });
  sw.addEventListener("activate", (e) => {
    e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== SHARED_CACHE).map((k) => caches.delete(k)))).then(() => sw.clients.claim()));
  });
  async function receiveShare(req) {
    let form = await req.formData(), parts = ["title", "text", "url"].map((k) => form.get(k)).filter((v) => typeof v == "string" && v.trim().length > 0), text = [...new Set(parts)].join(`
`).slice(0, MAX_SHARED_CHARS), cache = await caches.open(SHARED_CACHE);
    await cache.put("./__shared__", new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } }));
    let image = form.get("image");
    return image instanceof File && image.type.startsWith("image/") && image.size <= MAX_SHARED_IMAGE_BYTES && await cache.put("./__shared_image__", new Response(image, { headers: { "content-type": image.type } })), Response.redirect("./?shared=1", 303);
  }
  sw.addEventListener("fetch", (e) => {
    let url = new URL(e.request.url);
    if (url.origin === sw.location.origin) {
      if (e.request.method === "POST" && url.pathname.endsWith("/share")) {
        e.respondWith(receiveShare(e.request));
        return;
      }
      if (e.request.method === "GET") {
        if (url.pathname.includes("/ocr/")) {
          e.respondWith(caches.open(CACHE).then(async (c) => await c.match(e.request) ?? fetch(e.request).then((res) => (res.ok && c.put(e.request, res.clone()), res))));
          return;
        }
        e.respondWith(caches.match(e.request, { ignoreSearch: !0 }).then((hit) => hit ?? fetch(e.request)));
      }
    }
  });
})();
