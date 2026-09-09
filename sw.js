// Tradalytics service worker — offline caching + update-available signaling.
//
// Keep CACHE_VERSION in sync with APP_VERSION in index.html: bump both together whenever you
// re-upload a changed index.html, so the browser knows to fetch the new file instead of serving
// a stale cached copy forever.
var CACHE_VERSION = 'tradalytics-v21.0.0';
var APP_SHELL = ['./', './index.html'];

self.addEventListener('install', function (event) {
    event.waitUntil(
          caches.open(CACHE_VERSION).then(function (cache) {
                  return cache.addAll(APP_SHELL);
          })
        );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
          caches.keys().then(function (keys) {
                  return Promise.all(
                            keys
                              .filter(function (key) { return key !== CACHE_VERSION; })
                              .map(function (key) { return caches.delete(key); })
                          );
          }).then(function () {
                  return self.clients.claim();
          })
        );
});

self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
          self.skipWaiting();
    }
});

self.addEventListener('fetch', function (event) {
    var req = event.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

                        event.respondWith(
                              caches.match(req).then(function (cached) {
                                      var networkFetch = fetch(req).then(function (res) {
                                                if (res && res.ok) {
                                                            var copy = res.clone();
                                                            caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, copy); });
                                                }
                                                return res;
                                      }).catch(function () {
                                                if (cached) return cached;
                                                if (req.mode === 'navigate') return caches.match('./index.html');
                                                throw new Error('offline and not cached: ' + req.url);
                                      });
                                      return cached || networkFetch;
                              })
                            );
});
