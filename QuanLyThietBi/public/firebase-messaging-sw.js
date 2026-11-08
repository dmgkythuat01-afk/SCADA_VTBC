/* Only public application shell is cached; equipment data and photos are never cached. */
importScripts("/config.js");
importScripts(
  "https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging-compat.js",
);
firebase.initializeApp(APP_CONFIG.firebase);
firebase.messaging();
const CACHE = "dmg-equipment-shell-v1",
  SHELL = [
    "/",
    "/index.html",
    "/style.css",
    "/app.js",
    "/icon.svg",
    "/manifest.webmanifest",
  ];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !SHELL.includes(url.pathname)
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok)
          caches
            .open(CACHE)
            .then((c) => c.put(event.request, response.clone()));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
