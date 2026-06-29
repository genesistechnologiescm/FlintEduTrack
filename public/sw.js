// EduTrack service worker — Phase 1 starter.
// Purpose now: make the app installable + a basic app-shell cache.
// The real offline attendance write-queue is added with the attendance feature.

const SHELL_CACHE = "edutrack-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop old shell caches on version bump.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// Push notifications — show the alert even when the app is closed.
self.addEventListener("push", (event) => {
  let payload = { title: "EduTrack", body: "", url: "/parent" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/parent";
  event.waitUntil(self.clients.openWindow(url));
});

// Network-first, fall back to cache. Keeps the app usable on flaky 3G.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error("offline and not cached");
      }
    })(),
  );
});
