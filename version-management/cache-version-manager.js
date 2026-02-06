/**
 * Gestionnaire de version automatique
 * Vérifie la version seulement après connexion
 * La version est gérée automatiquement par GitHub Actions
 */

class CacheVersionManager {
    constructor() {
        this.versionKey = 'app_version';
        // La version est mise à jour automatiquement par GitHub Actions
        this.currentVersion = '1.2.2'; 
    }

    /**
     * Vérifie si une mise à jour du cache est nécessaire
     */
    async checkAndUpdateCache() {
        const storedVersion = localStorage.getItem(this.versionKey);

        // Si la version a changé, vider le cache
        if (storedVersion !== this.currentVersion) {
            console.log(`🔄 Mise à jour automatique: ${storedVersion} → ${this.currentVersion}`);
            await this.clearCache();
            this.updateVersionInfo();
            return true; // Cache vidé
        }

        return false; // Pas de vidage nécessaire
    }

    /**
     * Vide tous les caches de manière sélective
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

            // 4. Forcer le rechargement une seule fois
            if (!sessionStorage.getItem('version_reloaded')) {
                sessionStorage.setItem('version_reloaded', 'true');
                setTimeout(() => window.location.reload(true), 100);
            }

        } catch (error) {
            console.error('❌ Erreur vidage cache:', error);
        }
    }

    /**
     * Met à jour la version en localStorage
     */
    updateVersionInfo() {
        localStorage.setItem(this.versionKey, this.currentVersion);
    }
}

window.CacheVersionManager = CacheVersionManager;
