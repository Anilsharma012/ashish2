const CACHE_NAME = "aashish-property-v1";
const CACHE_NAME = "app-cache-v1";
const urlsToCache = [
  "/",
  "/static/js/bundle.js",
  "/static/css/main.css",
  "/manifest.json",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
  );
});

self.addEventListener("fetch", (event) => {
  try {
    const req = event.request;
    const url = new URL(req.url);

    // Bypass SW for API and non-GET requests
    if (req.method !== "GET" || url.pathname.startsWith("/api/")) {
      return; // let the network handle it directly
    }

    // Network-first for navigation requests (HTML)
    if (req.mode === "navigate") {
      event.respondWith(
        fetch(req)
          .then((res) => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            return res;
          })
          .catch(() => caches.match(req)),
      );
      return;
    }

    // Cache-first for static assets
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
  } catch (e) {
    // In case of any unexpected errors, fall back to default fetch behavior
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      ),
    ),
  );
});
