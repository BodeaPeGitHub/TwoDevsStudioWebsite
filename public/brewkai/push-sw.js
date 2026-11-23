/* This worker only handles notifications. It does not cache pages or intercept requests. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let message = {};
  try { message = event.data?.json() || {}; } catch { /* Still show a visible notification. */ }
  event.waitUntil(self.registration.showNotification(
    typeof message.title === 'string' ? message.title.slice(0, 60) : 'Brewkai Coffee Club',
    {
      body: typeof message.body === 'string' ? message.body.slice(0, 1000) : 'Ai noutăți de la BREWKAI.',
      icon: '/brewkai/assets/brewkai-logo.png',
      badge: '/brewkai/push-badge.svg',
      tag: typeof message.tag === 'string' ? message.tag : 'brewkai-news',
      // A stable tag replaces retries of the same campaign in the notification tray.
      renotify: false,
      data: { url: '/brewkai' },
    },
  ));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = new URL('/brewkai', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url === destination || client.url.startsWith(`${destination}?`));
    if (existing) return existing.focus();
    return self.clients.openWindow(destination);
  })());
});
