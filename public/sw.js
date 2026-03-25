// SafeRoute Service Worker — caches last 10 minutes of threat intelligence data
const CACHE_NAME = "saferoute-intel-v1";
const INTEL_ROUTES = [
  "/api/firms",
  "/api/seismic",
  "/api/opensky",
  "/api/gdelt",
  "/api/acled",
  "/api/overpass",
];
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only intercept our intelligence API routes
  const isIntelRoute = INTEL_ROUTES.some((r) => url.pathname.startsWith(r));
  if (!isIntelRoute) return;

  event.respondWith(
    (async () => {
      try {
        // Network first
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          // Store with timestamp header for expiry check
          const headers = new Headers(networkResponse.headers);
          headers.set("x-sw-cached-at", String(Date.now()));
          const body = await networkResponse.clone().arrayBuffer();
          const cachedResponse = new Response(body, {
            status: networkResponse.status,
            statusText: networkResponse.statusText,
            headers,
          });
          await cache.put(event.request, cachedResponse);
        }
        return networkResponse;
      } catch {
        // Offline — serve from cache if fresh enough
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request);
        if (cached) {
          const cachedAt = Number(cached.headers.get("x-sw-cached-at") || "0");
          if (Date.now() - cachedAt < MAX_AGE_MS) {
            return cached;
          }
        }
        // No cache or too old
        return new Response(JSON.stringify({ error: "Offline", cached: false }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
    })()
  );
});
