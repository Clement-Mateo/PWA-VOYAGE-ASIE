// Service Worker avec versionnement automatique synchronisé

// Importer la version depuis le gestionnaire de version
const CACHE_VERSION = "1.2.35";
const CACHE_NAME = `voyage-asie-v${CACHE_VERSION}`;

// Fichiers essentiels à mettre en cache (uniquement ceux qui existent)
const urlsToCache = [
    '/',
    '/index.html'
];

// Installation
self.addEventListener('install', event => {
    console.log('🔧 Service Worker installation...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('✅ Cache ouvert, mise en cache des fichiers essentiels');
                // Mettre en cache uniquement les fichiers qui existent
                return Promise.allSettled(
                    urlsToCache.map(url => {
                        return cache.add(url)
                            .then(() => {
                                console.log(`✅ Mis en cache: ${url}`);
                            })
                            .catch(error => {
                                console.warn(`⚠️ Fichier non trouvé: ${url}`);
                                // Ignorer les fichiers manquants
                            });
                    })
                );
            })
            .then(() => {
                console.log('✅ Installation terminée');
                // Forcer l'activation immédiate
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Erreur installation:', error);
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
                // Prendre le contrôle de toutes les pages
                return self.clients.claim();
            })
    );
});

// Interception des requêtes - Stratégie "Network First" pour les requêtes API
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si c'est une requête API ou Firebase, toujours essayer le réseau d'abord
                if (event.request.url.includes('firebase') || 
                    event.request.url.includes('api') ||
                    event.request.url.includes('nominatim')) {
                    return fetch(event.request)
                        .catch(() => {
                            // En cas d'échec réseau, retourner le cache si disponible
                            return response || new Response('Offline', { 
                                status: 503,
                                statusText: 'Service Unavailable'
                            });
                        });
                }
                
                // Pour les autres requêtes, utiliser le cache d'abord
                if (response) {
                    return response;
                }
                
                // Pas de cache - faire la requête réseau
                return fetch(event.request)
                    .then(response => {
                        // Vérifier si la réponse est valide
                        if (!response || response.status !== 200) {
                            return response;
                        }
                        
                        // Mettre en cache uniquement les réponses valides
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Fallback pour les requêtes qui échouent
                        console.warn(`⚠️ Requête échouée: ${event.request.url}`);
                        return new Response('Offline', { 
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});
