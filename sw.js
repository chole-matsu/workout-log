// 自動生成 — scripts/build-pwa.mjs が作ります。直接編集しないでください。
const CACHE = 'workout-log-f857957d83c6';
const PRECACHE = [
  "/workout-log/",
  "/workout-log/app-icon.png",
  "/workout-log/favicon.ico",
  "/workout-log/index.html",
  "/workout-log/manifest.webmanifest",
  "/workout-log/metadata.json",
  "/workout-log/_expo/static/js/web/index-26fa3c46cfd386f991278ea2082f46d3.js"
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

const SHELL = '/workout-log/';

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // ページ本体はネットワーク優先。
  // ここをキャッシュ優先にすると、公開し直しても古い画面が出続けてしまう。
  // 読み込めたら控えを取っておき、電波が無いときはそれを返す。
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy));
          return res;
        })
        .catch(() => caches.match(SHELL).then((hit) => hit || caches.match(req)))
    );
    return;
  }

  // JS や画像はファイル名にハッシュが入っていて、中身が変われば名前も変わる。
  // 古いものを返す心配が無いのでキャッシュ優先でよい。
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
        .catch(() => caches.match(SHELL));
    })
  );
});
