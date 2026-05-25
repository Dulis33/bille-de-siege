const BDS_CACHE = 'bds-theft-one-bonus-castle-hp-20260525-1';
const BDS_FILES = [
  './index.html',
  './style.css?v=theft-one-bonus-castle-hp-20260525-1',
  './game.js?v=theft-one-bonus-castle-hp-20260525-1',
  './style.css',
  './game.js',
  './manifest.webmanifest',
  './manifest.json',
  './logo-bds-192.png',
  './logo-bds-512.png',
  './musiques/music-bds-menu.mp3',
  './musiques/music-bds-ambiance.mp3',
  './musiques/music-bds-marche.mp3',
  './bruitages/click.mp3',
  './bruitages/confirm.mp3',
  './bruitages/launch.mp3',
  './bruitages/impact.mp3',
  './bruitages/gain.mp3',
  './bruitages/jackpot.mp3',
  './bruitages/marche-echange.mp3',
  './bruitages/marche-btn-1.mp3',
  './bruitages/marche-btn-2.mp3',
  './bruitages/marche-btn-3.mp3',
  './bruitages/marche-btn-4.mp3',
  './bruitages/marche-btn-5.mp3',
  './bruitages/marche-btn-6.mp3',
  './bruitages/marche-btn-7.mp3',
  './bruitages/marche-btn-8.mp3',
  './bruitages/bille-roule.mp3',
  './bruitages/trap.mp3',
  './bruitages/damage.mp3',
  './bruitages/destroy.mp3',
  './bruitages/build.mp3',
  './bruitages/repair.mp3',
  './bruitages/victory.mp3'
];
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(BDS_CACHE).then((cache) =>
      Promise.all(BDS_FILES.map((file) => cache.add(file).catch(() => null)))
    )
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith('bds-') && key !== BDS_CACHE)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(BDS_CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(BDS_CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
