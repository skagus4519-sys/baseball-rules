/* 야구 룰 사전 — 서비스워커 (오프라인 캐시)
   전략
   - 페이지 이동(navigate): 네트워크 우선 → 실패하면 캐시된 index.html (오프라인)
   - 그 외 같은 출처 GET: 캐시 즉시 응답 + 뒤에서 갱신(stale-while-revalidate)
   → 파일을 고쳐 배포하면 다음 방문 때 새 버전을 받아 앱이 '새 버전' 알림을 띄웁니다.
     CACHE 버전은 캐시를 통째로 비우고 싶을 때만 올리면 됩니다. */
const CACHE = 'baseball-rules-v3';
const ASSETS = [
  './',
  './index.html',
  './rules-data.js',
  './manifest.webmanifest',
  './favicon-64.png',
  './apple-touch-icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './sprite-baseball.png',
  './sprite-bat.png',
  './sprite-glove.png',
  './sprite-jersey.png',
  './sprite-cap.png'
];

self.addEventListener('install', (e) => {
  // 한 파일이라도 404면 addAll이 통째로 실패하므로 개별로 담는다
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(ASSETS.map((u) => c.add(u).catch(() => null)))
    )
  );
  // skipWaiting은 앱의 '새로고침' 버튼(SKIP_WAITING 메시지)이 호출합니다.
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 외부 요청은 그대로 통과

  // 페이지 이동: 네트워크 우선 (새 HTML을 바로 받도록)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // 그 외 정적 파일: 캐시 먼저 주고, 뒤에서 조용히 갱신
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
