/* Finale des Rallyes 2026 – service worker : application et cartes disponibles hors-ligne */
const SHELL = "fr26-shell-v32", TILES = "fr26-tiles", FONTS = "fr26-fonts";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("fr26-shell") && k !== SHELL).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url);
  // Application : réseau d'abord (pour recevoir les mises à jour), cache si hors-ligne
  if (u.origin === location.origin) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(SHELL).then(ca => ca.put(req, c)); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
    return;
  }
  // Tuiles IGN : cache d'abord, puis réseau (et mise en cache)
  if (u.hostname === "data.geopf.fr" && u.pathname.startsWith("/wmts") && req.mode === "cors") {
    e.respondWith(caches.open(TILES).then(ca => ca.match(req.url).then(hit => hit || fetch(req).then(r => { if (r.ok) ca.put(req.url, r.clone()); return r; }))));
    return;
  }
  // Polices
  if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(ca => ca.match(req).then(hit => hit || fetch(req).then(r => { ca.put(req, r.clone()); return r; }))));
  }
  // Le reste (météo, classement, géocodage) passe directement par le réseau
});
// Un clic sur une alarme rouvre l'application
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow("./index.html")));
});
