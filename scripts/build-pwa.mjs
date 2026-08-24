/**
 * `expo export --platform web` の後始末をして、dist を PWA として完成させる。
 *
 *  1. manifest.webmanifest とアイコンを置く
 *  2. index.html に PWA 用の meta タグと Service Worker 登録を差し込む
 *  3. dist の中身から Service Worker のキャッシュ一覧を生成する（オフライン対応）
 *  4. GitHub Pages 用に .nojekyll と 404.html を置く
 *
 * 使い方: npm run build:web
 */
import { createHash } from 'node:crypto';
import { copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const appJson = JSON.parse(await readFile(path.join(ROOT, 'app.json'), 'utf8'));
const APP_NAME = appJson.expo.name;
const THEME_BG = appJson.expo.backgroundColor ?? '#0E1116';
/** 例: "/workout-log"。GitHub Pages のサブパス */
const BASE = (appJson.expo.experiments?.baseUrl ?? '').replace(/\/$/, '');

const url = (p) => `${BASE}/${p.replace(/^\//, '')}`;

/** dist 以下の全ファイルを、dist からの相対パスで返す */
async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listFiles(full)));
    } else {
      out.push(path.relative(DIST, full).split(path.sep).join('/'));
    }
  }
  return out;
}

// ── 1. アイコンと manifest ────────────────────────────────
// icon.png は 1024x1024。iOS は apple-touch-icon を自動で縮小するので 1枚で足りる。
await copyFile(path.join(ROOT, 'assets', 'icon.png'), path.join(DIST, 'app-icon.png'));

const manifest = {
  name: APP_NAME,
  short_name: APP_NAME,
  description: '前回の重量と回数がすぐ分かる筋トレ記録',
  start_url: `${BASE}/`,
  scope: `${BASE}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: THEME_BG,
  theme_color: THEME_BG,
  icons: [
    { src: url('app-icon.png'), sizes: '1024x1024', type: 'image/png', purpose: 'any' },
    { src: url('app-icon.png'), sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
  ],
};
await writeFile(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// ── 2. Service Worker（オフライン対応）────────────────────
// ビルドのたびに中身が変わるので、ファイル一覧のハッシュをキャッシュ名にする。
// こうすると内容が変わったときだけ古いキャッシュが捨てられる。
const files = await listFiles(DIST);
const precache = [
  `${BASE}/`,
  ...files
    .filter((f) => f !== 'sw.js' && !f.endsWith('.map'))
    .map((f) => url(f)),
];
const version = createHash('sha1').update(precache.join('\n')).digest('hex').slice(0, 12);

const sw = `// 自動生成 — scripts/build-pwa.mjs が作ります。直接編集しないでください。
const CACHE = 'workout-log-${version}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};

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
        .catch(() => caches.match('${BASE}/'));
    })
  );
});
`;
await writeFile(path.join(DIST, 'sw.js'), sw);

// ── 3. index.html に PWA 用のタグを差し込む ────────────────
const indexPath = path.join(DIST, 'index.html');
let html = await readFile(indexPath, 'utf8');

const head = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="${APP_NAME}" />
    <meta name="theme-color" content="${THEME_BG}" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <link rel="manifest" href="${url('manifest.webmanifest')}" />
    <link rel="apple-touch-icon" href="${url('app-icon.png')}" />
    <style>
      /* ホーム画面から起動したときに背景が白く光らないようにする */
      html, body { background-color: ${THEME_BG}; overscroll-behavior: none; }
    </style>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('${url('sw.js')}', { scope: '${BASE}/' });
        });
      }
    </script>
`;

// Expo が生成する viewport タグは user-scalable を含まないので、重複しないよう先に消す
html = html.replace(/<meta name="viewport"[^>]*>/gi, '');
html = html.replace('</head>', `${head}  </head>`);
await writeFile(indexPath, html);

// ── 4. GitHub Pages 用のファイル ──────────────────────────
// Jekyll は "_" で始まるディレクトリを無視する。Expo の出力は _expo/ なので必須。
await writeFile(path.join(DIST, '.nojekyll'), '');
// SPA なので、どのパスで再読み込みされてもトップを返す
await copyFile(indexPath, path.join(DIST, '404.html'));

console.log(`PWA ビルド完了`);
console.log(`  ベースパス   : ${BASE || '(ルート)'}`);
console.log(`  キャッシュ対象: ${precache.length} ファイル`);
console.log(`  SW バージョン : ${version}`);
