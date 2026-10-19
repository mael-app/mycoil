self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(self.registration.showNotification(data.title ?? 'mycoil', {
    body: data.body ?? 'Your coil is due for a change.',
    icon: data.icon ?? '/favicon.svg',
    badge: data.badge ?? '/favicon.svg',
    tag: data.tag ?? 'coil-change',
    data: { url: data.url ?? '/' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((window) => window.url.startsWith(self.location.origin));
    return existing ? existing.focus() : clients.openWindow(url);
  }));
});
