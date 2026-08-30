// TheSC-MSO Service Worker — Web Push 지원
// (이전 버전은 자기 자신을 unregister 하는 킬스위치였음 → 푸시용으로 교체)
const SW_VERSION = 'mso-push-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// PWA installability를 위한 no-op fetch 핸들러 (네트워크 기본 처리, 캐시 안 함)
self.addEventListener('fetch', () => {});

// 서버 푸시 수신 → 알림 표시
self.addEventListener('push', (event) => {
  let data = { title: 'The SC(MSO)', body: '새 알림이 있습니다.', url: './index.html#report' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      data: { url: data.url || './index.html#report' },
      vibrate: [80, 40, 80],
      tag: data.tag || 'mso-push',
      renotify: true
    })
  );
});

// 알림 클릭 → 앱 포커스/이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './index.html#report';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) {
        try { await c.focus(); if ('navigate' in c) c.navigate(target).catch(() => {}); } catch (_) {}
        return;
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
