// GSTLens Offline Service Worker
// Enables 100% offline access to Invoicing, POS, Inventory, Clients, and Returns

const CACHE_NAME = "gstlens-cache-v2";
const OFFLINE_URL = "/offline.html";

// Static routes to precache for offline operation
const PRECACHE_ASSETS = [
  "/",
  "/dashboard",
  "/invoices",
  "/invoices/new",
  "/inventory",
  "/clients",
  "/purchases",
  "/expenses",
  "/receipts",
  "/recurring",
  "/gstr-2b",
  "/reconcile",
  "/returns",
  "/return",
  "/reports",
  "/gstr-1",
  "/gstr-3b",
  "/profile",
  "/credits",
  "/settings",
  "/login",
  "/terms",
  "/privacy",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  OFFLINE_URL,
];

// Install Event: Precache essential routes
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn("[SW] Precache asset failed for:", url, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clear old caches & take control immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-First for static assets, Network-First for HTML navigation
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin external API requests
  if (request.method !== "GET" || !url.origin.includes(self.location.origin)) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // 1a. Try matching with ignoreSearch to handle query params (?tab=..., ?setup=1, etc.)
          const cachedWithIgnoreSearch = await caches.match(request, { ignoreSearch: true });
          if (cachedWithIgnoreSearch) {
            return cachedWithIgnoreSearch;
          }

          // 1b. Try matching normalized pathname without trailing slash
          const cleanPath = url.pathname.replace(/\/$/, "") || "/";
          const cachedPath = await caches.match(cleanPath);
          if (cachedPath) {
            return cachedPath;
          }

          // 1c. Fallback to offline page, dashboard, or invoice hub
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;

          const dashboardPage = await caches.match("/dashboard");
          if (dashboardPage) return dashboardPage;

          const invoicesPage = await caches.match("/invoices");
          if (invoicesPage) return invoicesPage;

          return new Response("You are offline. Please navigate to /invoices or /dashboard.", {
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // 2. Next.js Static Chunks, Images, Fonts, CSS: Stale-while-revalidate / Cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".ttf")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Next.js App Router RSC payload requests (?_rsc=...)
  if (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // When offline, Next.js falls back to hard browser navigation if RSC fetch fails
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response("", { status: 503, statusText: "Offline RSC Fallback" });
        })
    );
    return;
  }

  // 4. All other requests: Network with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
