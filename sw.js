// アプリの外枠だけキャッシュする簡易 Service Worker
const CACHE = 'meal-log-v2';
const SHELL = [
  './', './meallog.html', './css/style.css',
  './js/app.js', './js/presets.js', './js/firebase-config.js',
  './manifest.webmanifest', './icons/icon-192.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Firebase や CDN への通信はキャッシュしない
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./meallog.html')))
  );
});
