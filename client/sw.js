const CACHE_NAME = 'securechat-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/crypto.js',
  './js/storage.js',
  './js/identity.js',
  './js/websocket.js',
  './js/ui/screen-invite.js',
  './js/ui/screen-verify.js',
  './js/ui/screen-chats.js',
  './js/ui/screen-chat.js',
  './js/ui/screen-new-contact.js',
  './js/ui/screen-requests.js',
  './js/ui/screen-security.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache first for static assets, network first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip WebSocket and external requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.googleapis.com')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200) return response;
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        return response;
      });
    })
  );
});
