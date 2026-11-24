/* GMG Admin app — service worker (scope /admin/)
   - shows new-order notifications sent by the server (Web Push), even when the app is closed
   - opens the order when the notification is tapped
   - keeps a copy of the app shell so it opens instantly; orders always come live from the server */
const SHELL = 'gmg-admin-v2';
const FILES = ['/admin/', '/admin/login.html', '/images/brand/admin-icon-192.png?v=2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Pages: network first (always the latest admin), cached copy only when offline. API calls are never cached.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {}); return res; })
    .catch(() => caches.match(req).then(r => r || caches.match('/admin/'))));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'GMG Admin', {
      body: d.body || 'New order received',
      tag: d.tag || 'gmg-order',
      renotify: true,
      icon: '/images/brand/admin-icon-192.png?v=2',
      badge: '/images/brand/admin-icon-192.png?v=2',
      data: { url: d.url || '/admin/#/orders' },
      requireInteraction: true
    });
    if (self.navigator && self.navigator.setAppBadge) { try { await self.navigator.setAppBadge(); } catch (err) { /* ignore */ } }
    const wins = await self.clients.matchAll({ type: 'window' });
    wins.forEach(w => w.postMessage({ type: 'new-order' }));
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/admin/#/orders';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find(c => new URL(c.url).pathname.startsWith('/admin'));
    if (w) { await w.focus(); w.postMessage({ type: 'open', url }); return; }
    await self.clients.openWindow(url);
  })());
});
