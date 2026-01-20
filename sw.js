const CACHE_NAME = 'carte-monde-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/firebaseService.js',
  '/serviceUtil.js',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Si on est en développement (localhost/127.0.0.1), pas de cache
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Sinon (production) : utiliser le cache normalement
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
