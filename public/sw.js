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
  // Exclude Firebase, Google APIs, and chrome extensions from SW cache
  if (
    url.origin.includes("googleapis.com") || 
    url.origin.includes("gstatic.com") || 
    url.protocol === 'chrome-extension:' ||
    url.pathname.includes('/api/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache the new response
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // If network fetch fails (offline), try the cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If it's a navigation request and we don't have it, we could return the root
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        
        throw new Error("Network error and no cache available");
      })
  );
});
