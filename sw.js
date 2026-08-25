const CACHE_NAME = "school-bell-pwa-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache Pico API calls. The page handles Pico/API failures and
  // reads its schedule from IndexedDB when the Pico is unavailable.
  if (url.hostname === "192.168.4.1") return;

  // CDN/font-awesome: cache after first successful load, otherwise let the
  // page work without it.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (response && response.ok && url.origin === location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return response;
      }).catch(() => {
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("", {status: 503});
      });
    })
  );
});
