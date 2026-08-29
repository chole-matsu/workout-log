// 自動生成 — scripts/build-pwa.mjs が作ります。直接編集しないでください。
const CACHE = 'workout-log-361cef734093';
const PRECACHE = [
  "/workout-log/",
  "/workout-log/app-icon.png",
  "/workout-log/favicon.ico",
  "/workout-log/index.html",
  "/workout-log/manifest.webmanifest",
  "/workout-log/metadata.json",
  "/workout-log/_expo/static/js/web/index-94fa6580e6782165cb4e572a1af34f8a.js"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // 1つ失敗しても全体を巻き添えにしない
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// キャッシュ優先。ジムで電波が無くても開けるようにする。
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        // オフラインで未キャッシュの画面を開こうとしたときはトップを返す
        .catch(() => caches.match('/workout-log/'));
    })
  );
});
