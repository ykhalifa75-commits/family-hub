const CACHE = 'family-hub-v16-backup-reports';
const CORE = ['./data-format.js', './data-management.js', './assets/family-pixar-final.webp', './', './index.html', './months.js', './month-controls.js', './vendor/supabase-2.118.0.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './family-hub-apple-v14.png', './apple-touch-icon-precomposed.png'];
const CORE_URLS = new Set(CORE.map(path => new URL(path, self.location.href).href));
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});
self.addEventListener('activate', event => event.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('family-hub-') && key !== CACHE).map(key => caches.delete(key))))
])));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Only cache the app shell. Account, family and authentication responses must never be cached.
  if (request.method !== 'GET' || url.origin !== self.location.origin || (!CORE_URLS.has(url.href) && request.mode !== 'navigate')) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok && !response.redirected && CORE_URLS.has(url.href)) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
    return Response.error();
  }));
});
