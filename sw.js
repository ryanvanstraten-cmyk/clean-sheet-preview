// Clean Sheet service worker v3 - caches the app so it opens with no internet.
// The page, manifest and this file are fetched from the network first (so published fixes arrive),
// falling back to the saved copy when offline. Icons are served from the cache first.
const CACHE = 'clean-sheet-preview-v3';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png',
  './fonts/Barlow-400.woff2', './fonts/Barlow-600.woff2', './fonts/Barlow-700.woff2', './fonts/BarlowCondensed-600.woff2', './fonts/BarlowCondensed-700.woff2', './fonts/BarlowCondensed-800.woff2', './fonts/BarlowCondensed-900.woff2'];
const NETWORK_FIRST = /(\/|index\.html|manifest\.webmanifest|sw\.js)$/;
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) { e.respondWith(fetch(e.request).catch(() => new Response('', {status: 504}))); return; }
  const fromCache = () => caches.match(e.request, {ignoreSearch: true}).then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined));
  const fromNetwork = () => fetch(e.request).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; });
  if (e.request.mode === 'navigate' || NETWORK_FIRST.test(url.pathname)) {
    e.respondWith(withTimeout(fromNetwork(), 4000).catch(() => fromCache().then(r => r || new Response('', {status: 504}))));
  } else {
    e.respondWith(fromCache().then(r => r || fromNetwork()));
  }
});
