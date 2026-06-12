const CACHE_NAME = "bi-corp-v1";

// Rutas que se cachean en la instalación inicial
const PRECACHE = [
  "/dashboard",
  "/retencion",
  "/comercial",
  "/margen",
  "/carga",
  "/login",
];

// ── Install: pre-cachea rutas principales ───────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll puede fallar si alguna URL devuelve error; usamos add individual
      return Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

// ── Activate: elimina cachés antiguas ───────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Push: recibe mensaje del servidor y muestra notificación ────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const d = event.data.json();
  event.waitUntil(
    self.registration.showNotification(d.titulo ?? "BI-Corp", {
      body:  d.mensaje ?? "",
      icon:  "/icon-192.png",
      badge: "/icon-192.png",
      tag:   d.id ?? "bi-corp",
      data:  { url: d.href ?? "/dashboard" },
    })
  );
});

// ── Notificationclick: abre/enfoca la URL del dato ──────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";
  const fullUrl = self.location.origin + url;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const appClient = clients.find((c) => c.url.startsWith(self.location.origin));
      if (appClient) {
        // Decirle al app que navegue al anchor via postMessage, luego enfocar
        appClient.postMessage({ type: "SW_NAVIGATE", url });
        return appClient.focus();
      }
      // Sin pestaña abierta: abrir nueva con la URL completa
      return self.clients.openWindow(fullUrl);
    })
  );
});

// ── Fetch: Network-first, fallback a caché ──────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Solo interceptar GETs de la misma origin (no requests de Supabase)
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (!url.origin.startsWith(self.location.origin)) return;

  // Para llamadas a la API de Next.js y Supabase: siempre red
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar y guardar en caché si la respuesta es válida
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        // Si no hay red, sirve desde caché
        caches.match(event.request).then(
          (cached) => cached ?? new Response("Sin conexión", { status: 503 })
        )
      )
  );
});
