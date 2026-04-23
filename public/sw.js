self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return { title: "Notification", body: event.data ? event.data.text() : "" };
    }
  })();

  const title = payload.title || "Todo Reminder";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/globe.svg",
    badge: payload.badge || "/globe.svg",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.endsWith(target) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
