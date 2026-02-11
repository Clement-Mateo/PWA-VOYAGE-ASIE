/**
 * Gestionnaire de version simplifié
 * Se base uniquement sur la détection de mise à jour du service worker
 */

class CacheVersionManager {
    /**
     * Initialise le gestionnaire de version au chargement de l'app
     */
    async init() {
        console.log('🔍 Vérification de mise à jour du service worker...');
        
        // Éviter les rechargements multiples
        if (sessionStorage.getItem('version_check_in_progress')) {
            console.log('⏳ Vérification déjà en cours...');
            return;
        }
        sessionStorage.setItem('version_check_in_progress', 'true');
        
        try {
            // Vérifier si le service worker doit être mis à jour
            const serviceWorkerUpdated = await this.checkServiceWorkerUpdate();
            
            // Si mise à jour détectée, vider le cache et recharger
            if (serviceWorkerUpdated) {
                console.log('🔄 Mise à jour détectée, vidage du cache...');
                await this.clearCache();
                setTimeout(() => {
                    sessionStorage.removeItem('version_check_in_progress');
                    window.location.reload(true);
                }, 1000);
            }
        } finally {
            sessionStorage.removeItem('version_check_in_progress');
        }
    }

    /**
     * Vérifie et force la mise à jour du service worker
     */
    async checkServiceWorkerUpdate() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                
                // Forcer la vérification de mise à jour
                registration.update();
                
                // Vérifier si une mise à jour est déjà en cours
                if (registration.installing) {
                    console.log('🔄 Service worker en cours d\'installation...');
                    return true;
                }
                
                // Écouter les mises à jour avec timeout
                return new Promise((resolve) => {
                    let updateFound = false;
                    
                    registration.addEventListener('updatefound', () => {
                        console.log('🔄 Nouveau service worker détecté !');
                        updateFound = true;
                        resolve(true);
                    });
                    
                    // Timeout au cas où aucune mise à jour n'est trouvée
                    setTimeout(() => {
                        if (!updateFound) {
                            console.log('✅ Aucune mise à jour détectée');
                            resolve(false);
                        }
                    }, 2000);
                });
                
            } catch (error) {
                console.error('❌ Erreur vérification service worker:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * Vide tous les caches
     */
    async clearCache() {
        try {
            // 1. Vider localStorage (sauf données essentielles)
            const essentialKeys = ['auth_token', 'user_data'];
            
            Object.keys(localStorage).forEach(key => {
                if (!essentialKeys.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            // 2. Vider sessionStorage
            sessionStorage.clear();

            // 3. Vider les caches HTTP
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
            }

            console.log('✅ Cache vidé avec succès');

        } catch (error) {
            console.error('❌ Erreur vidage cache:', error);
        }
    }
}

window.CacheVersionManager = CacheVersionManager;
