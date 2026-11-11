/* ONDAS – IRONWAVE Technical Help service worker.
   App & content.json: network first (fresh when online). Media & libraries: cache first (offline). */
const SHELL = "ondas-shell-v3";
const MEDIA = "ondas-media";
const SHELL_FILES = ["./", "index.html", "content.json", "manifest.webmanifest", "icon-192.png", "icon-512.png",
  "media/ondas-logo.png", "media/ondas-lockup-white.png", "media/ondas-symbol.png", "lib/pdf.min.js", "lib/pdf.worker.min.js", "lib/html2canvas.min.js", "lib/jspdf.umd.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(SHELL_FILES.map(u =>
    fetch(u, { cache: "no-store" }).then(r => r.ok && c.put(u, r)).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const p = url.pathname;
  const fresh = req.mode === "navigate" || p.endsWith("/") || p.endsWith("index.html") ||
                p.endsWith("content.json") || p.endsWith("manifest.webmanifest");
  if (fresh) {
    const key = req.mode === "navigate" ? "index.html" : req;
    e.respondWith(fetch(req, { cache: "no-store" }).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(SHELL).then(c => c.put(key, cp)); }
      return r;
    }).catch(() => caches.match(key, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(MEDIA).then(c => c.put(req, cp)); }
    return res;
  })));
});
