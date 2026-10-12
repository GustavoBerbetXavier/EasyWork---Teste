// Service worker do EASY WORK: mostra as notificações de mensagens novas no navegador.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'EASY WORK', body: event.data ? event.data.text() : '' };
  }
  const url = data.url || '/mensagens';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Se a pessoa já está com essa conversa aberta na tela, não precisa avisar.
      const viewing = windows.some((client) => client.visibilityState === 'visible' && new URL(client.url).pathname === url);
      if (viewing) return undefined;
      return self.registration.showNotification(data.title || 'Nova mensagem', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || url,
        renotify: true,
        data: { url },
      });
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/mensagens';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client);
      if (open) {
        open.navigate(url).catch(() => {});
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
