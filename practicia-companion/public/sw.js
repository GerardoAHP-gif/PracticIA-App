/* PracticIA · Service Worker
 * - Precachea el "cascarón" mínimo y una página sin conexión.
 * - Archivos estáticos (/assets, íconos, fuentes): caché primero.
 * - Navegación: red primero; si no hay internet, muestra /offline.html.
 * - NUNCA cachea datos: ni Supabase, ni el backend, ni peticiones que no sean GET.
 * Sube VERSION cuando cambies este archivo.
 */
const VERSION = "v2";
const STATIC_CACHE = `practicia-static-${VERSION}`;
const PRECACHE = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192x192.png", "/icons/icon-512x512.png", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("practicia-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith("/assets/") ||
  url.pathname.startsWith("/icons/") ||
  /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Solo el mismo origen: Supabase, el backend de Render, OpenStreetMap, etc. pasan directo a la red.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navegación (abrir/recargar una pantalla)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/offline.html").then((r) => r || new Response("Sin conexión", { status: 503 }))),
    );
    return;
  }

  // Estáticos con nombre con hash → caché primero
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
