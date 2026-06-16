/* Evolve service worker — v3.31 security-hardening test build.
   Network-first for navigations, tightly-scoped caching for shell assets, and
   Google Fonts-only cross-origin caching. Bump CACHE whenever shell files change. */
const CACHE = "evolve-v3-64";
const SHELL = [
  "./", "./index.html", "./styles.css", "./data.js", "./food-packs.js", "./app.js",
  "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./favicon.png"
];
const SAME_ORIGIN_CACHE_RE = /\.(?:css|js|json|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf)$/i;
const FONT_ORIGINS = new Set(["https://fonts.googleapis.com", "https://fonts.gstatic.com"]);

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING" || (e.data && e.data.type === "SKIP_WAITING")) {
    self.skipWaiting();
  }
});

function shouldCacheSameOrigin(req, url, res) {
  if (!res || !res.ok || res.type !== "basic") return false;
  if (req.mode === "navigate") return url.pathname === "/" || /(?:\/index\.html)?$/.test(url.pathname);
  return SAME_ORIGIN_CACHE_RE.test(url.pathname);
}

function shouldCacheCrossOrigin(url, res) {
  if (!res || !res.ok) return false;
  return FONT_ORIGINS.has(url.origin) && (res.type === "cors" || res.type === "default");
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (shouldCacheSameOrigin(req, url, res)) {
            caches.open(CACHE).then((c) => c.put("./index.html", res.clone())).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  if (sameOrigin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (shouldCacheSameOrigin(req, url, res)) {
            caches.open(CACHE).then((c) => c.put(req, res.clone())).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  if (FONT_ORIGINS.has(url.origin)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (shouldCacheCrossOrigin(url, res)) {
            caches.open(CACHE).then((c) => c.put(req, res.clone())).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  e.respondWith(fetch(req));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow("./");
    })
  );
});
