/* This worker only handles notifications. It does not cache pages or intercept requests. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let message = {};
  try { message = event.data?.json() || {}; } catch { /* Still show a visible notification. */ }
  event.waitUntil(self.registration.showNotification(
    typeof message.title === 'string' ? message.title.slice(0, 60) : 'CUC Coffee Club',
    {
      body: typeof message.body === 'string' ? message.body.slice(0, 1000) : 'Ai noutăți de la CUC.',
      icon: '/cuc/assets/cuc-logo.png',
      badge: '/cuc/push-badge.svg',
      tag: typeof message.tag === 'string' ? message.tag : 'cuc-news',
      // A stable tag replaces retries of the same campaign in the notification tray.
      renotify: false,
      data: { url: '/cuc' },
    },
  ));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = new URL('/cuc', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url === destination || client.url.startsWith(`${destination}?`));
    if (existing) return existing.focus();
    return self.clients.openWindow(destination);
  })());
});
