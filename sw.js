const CACHE_NAME = 'carte-monde-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Vérifier si c'est une requête API (hors ligne = pas de recherche)
        if (event.request.url.includes('maps.googleapis.com') || 
            event.request.url.includes('localhost:8000')) {
          return new Response(
            JSON.stringify({ error: 'Recherche API indisponible hors ligne' }), 
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
