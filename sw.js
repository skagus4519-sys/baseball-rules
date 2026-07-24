/* 야구 룰 사전 — 서비스워커 (오프라인 캐시)
   룰을 바꾼 뒤 배포할 때는 아래 CACHE 버전을 올리세요 (예: v1 -> v2). */
const CACHE = 'baseball-rules-v2';
const ASSETS = [
  './',
  './index.html',
  './rules-data.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './sprite-baseball.png',
  './sprite-bat.png',
  './sprite-glove.png',
  './sprite-jersey.png',
  './sprite-cap.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
