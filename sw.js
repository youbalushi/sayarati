// سيارتي — service worker: يعمل التطبيق بدون إنترنت
// Bump CACHE whenever shipped files change.
const CACHE = 'sayarati-v19';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './css/tokens.css', './css/components.css', './css/home.css', './css/car.css', './css/entry.css', './css/reports.css', './css/settings.css', './css/log.css',
  './js/ui.js', './js/vehicle.js', './js/i18n.js', './js/screens/home.js', './js/screens/car.js', './js/screens/entry.js', './js/screens/reminder.js', './js/screens/reports.js', './js/screens/settings.js', './js/screens/log.js', './js/screens/reminders.js', './js/screens/maint.js',
  './assets/icons/lucide-sprite.svg',
  './assets/fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2', './assets/fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2',
  './assets/fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2', './assets/fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-400-normal.woff2', './assets/fonts/ibm-plex-sans-latin-500-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-600-normal.woff2', './assets/fonts/ibm-plex-sans-latin-700-normal.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // الصفحة: الشبكة أولًا (لتصل التحديثات) ثم النسخة المحفوظة
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // CSS/JS/الخطوط/الأيقونات: المحفوظ فورًا، مع تحديثه في الخلفية للمرة القادمة
  e.respondWith(caches.open(CACHE).then(cache => cache.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })));
});
