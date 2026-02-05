/**
 * Initialisation de l'architecture offline-first
 * Orchestre tous les services de la nouvelle architecture
 */

class OfflineFirstApp {
    constructor() {
        this.localStorage = null;
        this.firebaseService = null;
        this.syncService = null;
        this.networkManager = null;
        this.isInitialized = false;
    }

    /**
     * Initialisation complète de l'application
     */
    async init() {
        console.log('🚀 Initialisation de l\'architecture offline-first...');
        
        try {
            // 1. Initialiser le gestionnaire de réseau
            this.networkManager = new window.NetworkManager();
            await this.networkManager.init();
            this.networkManager.addNetworkElements();
            
            // 2. Initialiser IndexedDB (LocalStorageService)
            this.localStorage = new window.LocalStorageService();
            await this.localStorage.init();
            
            // 3. Initialiser Firebase
            this.firebaseService = new window.FirebaseService();
            await this.firebaseService.init();
            this.firebaseService.setupAuthObserver();
            
            // 4. Configurer les références globales (avant syncService)
            this.setupGlobalReferences();
            
            // 5. Initialiser le service de synchronisation
            this.syncService = new window.SyncService();
            await this.syncService.init();
            
            this.isInitialized = true;
            console.log('✅ Architecture offline-first initialisée avec succès');
            
        } catch (error) {
            console.error('❌ Erreur initialisation architecture:', error);
            throw error;
        }
    }

    /**
     * Configurer les références globales pour la compatibilité
     */
    setupGlobalReferences() {
        // Références vers les services pour la compatibilité existante
        window.localStorageService = this.localStorage;
        window.firebaseService = this.firebaseService;
        window.syncService = this.syncService;
        window.networkManager = this.networkManager;
        
        console.log('✅ Références globales configurées');
    }

    /**
     * Charger les données depuis Firebase vers IndexedDB
     */
    async loadUserDataFromFirebase() {
        try {
            console.log('📥 Chargement des données depuis Firebase...');
            
            // Charger les itinéraires
            const firebaseItineraries = await this.firebaseService.getItineraries();
            
            // Mettre à jour IndexedDB avec les données de Firebase
            for (const itinerary of firebaseItineraries) {
                const existingItinerary = await this.localStorage.db.itineraries.get(itinerary.id);
                
                if (!existingItinerary) {
                    // Ajouter à IndexedDB comme synchronisé
                    await this.localStorage.db.itineraries.add({
                        ...itinerary,
                        isSync: true,
                        destinations: itinerary.destinations || []
                    });
                }
            }
            
            console.log(`✅ ${firebaseItineraries.length} itinéraires chargés dans IndexedDB`);
            
        } catch (error) {
            console.error('❌ Erreur chargement données Firebase:', error);
            // Continuer avec les données locales si erreur
        }
    }

    /**
     * Obtenir le statut de l'application
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            network: this.networkManager?.getStatus(),
            sync: this.syncService?.getSyncStatus(),
            firebase: {
                isReady: this.firebaseService?.isReady(),
                isAuthenticated: this.firebaseService?.isAuthenticated()
            }
        };
    }

    /**
     * Forcer la synchronisation manuelle
     */
    async forceSync() {
        if (this.syncService) {
            await this.syncService.forceSync();
        }
    }

    /**
     * Nettoyer les données locales (développement)
     */
    async clearLocalData() {
        if (this.localStorage) {
            await this.localStorage.db.delete();
            console.log('🗑️ Données locales supprimées');
        }
    }
}

// Export pour utilisation globale
window.OfflineFirstApp = OfflineFirstApp;
