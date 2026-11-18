// Offline-Cache: App-Dateien beim Installieren, Bibliotheken von CDNs beim ersten Abruf
const VERSION = "abrcheck-1.1.0";
const SHELL = ["./", "index.html", "style.css", "lohnsteuer.js", "netto.js", "logic.js", "abrocr.js", "ocr.js", "app.js",
  "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const CDN = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL))); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== "abrcheck-runtime").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // eigene Dateien: erst Cache, Sprachdaten für die Texterkennung beim ersten Abruf ablegen
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok && url.pathname.endsWith(".traineddata")) { const cp = res.clone(); caches.open("abrcheck-runtime").then(c => c.put(req, cp)); }
      return res;
    })));
  } else if (CDN.test(req.url)) {
    e.respondWith(caches.open("abrcheck-runtime").then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }))));
  }
});
