// TheSC-MSO Service Worker
// Strategy:
//  - index.html: network-first (always try fresh; fall back to cache when offline)
//  - icons / manifest / favicon: cache-first
//  - 3rd-party CDN scripts: stale-while-revalidate
// Bump CACHE_VERSION on each release to invalidate old caches.

const CACHE_VERSION = 'mso-v36';
const CORE_CACHE  = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Helper: network-first with cache fallback (네트워크 우선 + 캐시 백업)
async function networkFirst(request) {
  try {
    // PWA navigation은 캐시 우회 강제 (HTML 항상 최신)
    const isNav = request.mode === 'navigate';
    const fresh = await fetch(request, isNav ? { cache: 'no-store' } : {});
    if (fresh && fresh.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Last resort: cached index for navigations
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}

// Helper: stale-while-revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res && res.status === 200) cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip Supabase API / realtime — must always be live
  if (url.hostname.endsWith('supabase.co')) return;
  // Skip Google APIs (OAuth / Calendar) — never cache auth flows
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('google.com') || url.hostname.includes('gstatic.com')) return;
  // version.json은 절대 캐시 안 함 — 항상 네트워크에서 최신
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(()=>new Response('{}',{headers:{'Content-Type':'application/json'}})));
    return;
  }

  // Navigation requests → network-first
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }

  // Same-origin core assets / pages → network-first
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 3rd-party CDN (Plotly / Supabase JS / XLSX / PptxGen, etc.) → SWR
  event.respondWith(staleWhileRevalidate(req));
});

// ── Push notifications (Phase 5-B placeholder) ─────────────────────────
self.addEventListener('push', (event) => {
  let payload = { title: 'The SC(MSO)', body: '새 알림이 있습니다.', url: './index.html' };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      data: { url: payload.url || './index.html' },
      vibrate: [80, 40, 80]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes(self.location.origin)) { c.focus(); c.navigate(target).catch(()=>{}); return; }
    }
    self.clients.openWindow(target);
  })());
});

// Allow page to force update
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
