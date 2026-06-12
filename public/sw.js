const CACHE = "calendar-hero-v1";
const PRECACHE = ["/kalender", "/", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE.filter((u) => !u.includes("icon"))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener("push", (e) => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: "Calendar Hero", body: e.data.text() }; }

  const { title = "Calendar Hero", body = "", icon = "/icon-192.png", badge = "/icon-72.png", data: extra = {} } = data;

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: extra,
      vibrate: [200, 100, 200],
      actions: [{ action: "open", title: "Öffnen" }],
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      const existing = list.find((c) => c.url.includes("/kalender"));
      if (existing) return existing.focus();
      return clients.openWindow("/kalender");
    })
  );
});
