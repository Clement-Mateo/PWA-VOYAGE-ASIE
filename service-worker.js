// Service Worker mis à jour avec gestion de version

const CACHE_NAME = 'voyage-asie-v1.2.0'; // DOIT correspondre à la version dans cache-version-manager.js
const urlsToCache = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/components/app.js',
    '/firebase-config.js',
    '/cache-version-manager.js'
];

// Installation
self.addEventListener('install', event => {
    console.log('🔧 Service Worker installation...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('✅ Cache ouvert, mise en cache des assets');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('❌ Erreur mise en cache:', error);
            })
    );
});

// Activation - Nettoie les anciens caches
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker activation...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Supprimer tous les caches sauf le courant
                        if (cacheName !== CACHE_NAME) {
                            console.log(`🗑️ Suppression ancien cache: ${cacheName}`);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Anciens caches nettoyés');
                // Forcer la prise de contrôle immédiate
                return self.clients.claim();
            })
    );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - retourner la réponse en cache
                if (response) {
                    return response;
                }
                
                // Pas de cache - faire la requête réseau
                return fetch(event.request)
                    .then(response => {
                        // Vérifier si la réponse est valide
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Cloner la réponse pour la mettre en cache
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    });
            })
            .catch(() => {
                // Fallback pour les requêtes qui échouent
                if (event.request.destination === 'image') {
                    return new Response('<svg>...</svg>', { 
                        headers: { 'Content-Type': 'image/svg+xml' } 
                    });
                }
            })
    );
});
