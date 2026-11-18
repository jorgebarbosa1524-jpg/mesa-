const CACHE_NAME = 'xr18-studio-v9';
const ASSETS = ['./', './index.html', './style.css', './main.js', './ai.js', './audio.js', './core.js', './ui.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(res => res || fetch(e.request))));
