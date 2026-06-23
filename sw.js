// TheSC-MSO Service Worker — Web Push 지원
// (이전 버전은 자기 자신을 unregister 하는 킬스위치였음 → 푸시용으로 교체)
const SW_VERSION = 'mso-push-v1';

self.addEventListener('install', () => self.skipWaiting());

self.ad