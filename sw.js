/*
 * Offline cache: after the first visit the game opens instantly, even on a slow
 * connection. Bump VERSION whenever you change any file so visitors get the update.
 * Ads and other outside requests are never cached.
 */
var VERSION = 'nonni-v9';
var FILES = [
  './', 'index.html', 'privacy.html', 'css/style.css',
  'js/config.js', 'js/engine.js', 'js/skins.js', 'js/sound.js', 'js/game.js', 'js/ads.js',
  'manifest.webmanifest', 'icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // let ads go straight to the network
  // serve from cache immediately, refresh the cache in the background
  e.respondWith(caches.open(VERSION).then(function (cache) {
    return cache.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
