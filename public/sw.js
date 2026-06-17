const CACHE_NAME = "eyas-drapist-v2";

const urlsToCache = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/eyas-logo.png',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Ignore cache.addAll errors if some files are missing
      return cache.addAll(urlsToCache).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  
  const url = new URL(event.request.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  
  // Exclude Firebase, Google Maps APIs, and chrome extensions from SW cache
  // BUT make sure we DO cache Google Fonts so they work offline!
  if (
    (!isFont && (url.origin.includes("googleapis.com") || url.origin.includes("gstatic.com"))) || 
    url.protocol === 'chrome-extension:' ||
    url.pathname.includes('/api/')
  ) {
    return;
  }

  // Navigation requests (HTML) -> Network First, fallback to Cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          return caches.match("/"); // Fallback to root HTML
        })
    );
    return;
  }

  // Assets (JS, CSS, Images) -> Cache First, fallback to Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Instantly load from cache to prevent blank screens!
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          // Silent fallback for missing assets
          return new Response("", { status: 408, statusText: "Offline" });
        });
    })
  );
});
