const CACHE_NAME = "thunder-buddies-pwa-v8";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/site.js",
  "/manifest.webmanifest",
  "/offline.html",
  "/assets/tbs-emblem.svg",
  "/assets/showcase/mid-pacific-reveal.png",
  "/assets/showcase/naval-gap.png",
  "/assets/showcase/goal-change.png",
  "/assets/showcase/living-battlefield.png",
  "/assets/showcase/fleet-operations.png",
  "/assets/showcase/progress-updates.png",
  "/assets/showcase/open-ocean-patrol.png",
  "/assets/showcase/missile-flight.png",
  "/assets/showcase/carrier-group.png",
  "/assets/showcase/air-wing-dusk.png",
  "/assets/showcase/rain-missile-launch.png",
  "/assets/showcase/sunset-destroyer.png",
  "/assets/showcase/storm-barrage.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") return caches.match("/offline.html");
        throw new Error("Offline and not cached");
      })
  );
});
