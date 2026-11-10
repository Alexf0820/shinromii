const CACHE_NAME = "shinromii-v106-static";
const PUBLIC_PAGES = new Set(["/", "/grades", "/universities", "/open-campus", "/ai-notes", "/profile", "/guide"]);
const PUBLIC_FILES = new Set(["/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/images/shinromii-home-hero.png", "/images/data-protection-guide-confirmed.jpg", "/brand/shinromii-mark.png"]);

function isCacheableRequest(request) {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.search || request.headers.has("authorization") || request.headers.has("range") || request.headers.has("rsc") || request.headers.has("next-router-prefetch")) return false;
  return request.mode === "navigate" ? PUBLIC_PAGES.has(url.pathname)
    : PUBLIC_FILES.has(url.pathname) || /^\/_next\/static\/.+\.(?:js|css|woff2?|png|jpg|jpeg|webp)$/.test(url.pathname);
}
function isCacheableResponse(response) {
  return response.ok && response.status === 200 && !response.redirected
    && !/\b(?:no-store|private)\b/i.test(response.headers.get("cache-control") || "")
    && !response.headers.has("set-cookie");
}
self.addEventListener("install", event => {
  // Failure to precache a public shell must not prevent removal of the old unsafe cache.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all([...PUBLIC_PAGES, ...PUBLIC_FILES].map(async path => {
      try {
        const response = await fetch(path, { cache: "reload", credentials: "omit" });
        if (isCacheableResponse(response)) await cache.put(path, response);
      } catch { /* Offline or unavailable: update still installs. */ }
    }));
    // No storage schema change. Activate promptly to remove cached admin/API responses.
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("shinromii-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", event => {
  const { request } = event;
  if (!isCacheableRequest(request)) return; // Admin/API/query/RSC always reach the network, even offline.
  const operation = (async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (isCacheableResponse(response)) await cache.put(request, response.clone());
      else await cache.delete(request); // Never reuse an old copy after policy changes.
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") return new Response("<!doctype html><html lang='ja'><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>オフライン</title><p>接続を確認して、もう一度開いてください。保存済みの進路データはこの端末に残っています。</p></html>", { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
      return Response.error();
    }
  })();
  event.respondWith(operation);
  event.waitUntil(operation.then(() => undefined));
});
