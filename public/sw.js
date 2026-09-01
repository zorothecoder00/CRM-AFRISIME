// Service worker minimal dédié au canal PUSH (NotificationChannel.PUSH,
// voir src/lib/notifications/push.ts). Volontairement distinct d'un service
// worker Serwist/Workbox complet (précache, rechargement hors-ligne — voir
// le commentaire dans next.config.ts sur useOffline) : ce fichier ne fait
// que recevoir et afficher les notifications push, rien d'autre.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "AfriSime Work-Space", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "AfriSime Work-Space", {
      body: data.body,
      icon: "/logo.png",
      badge: "/logo.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
