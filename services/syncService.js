/**
 * Service de synchronisation avec Firebase
 * Gère la synchronisation asynchrone des données locales
 */

class SyncService {
    constructor() {
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.setupEventListeners();
    }

    /**
     * Initialisation du service
     */
    async init() {
        this.isInitialized = true;
        console.log('✅ SyncService initialisé');
        
        // Démarrer la synchronisation si en ligne
        if (this.isOnline) {
            this.sync();
        }
    }

    /**
     * Configuration des écouteurs d'événements
     */
    setupEventListeners() {
        // Écouter les événements de LocalStorage pour les itinéraires
        // Tous les événements CRUD déclenchent la synchronisation intelligente
        const triggerSync = (eventName, data) => {
            console.log(`📝 ${eventName} détecté, déclenchement de la synchronisation intelligente`);
            if (this.isOnline && window.firebaseService && window.firebaseService.user) {
                // Délai court pour éviter les appels multiples lors de modifications rapides
                setTimeout(() => this.sync(), 500);
            }
        };

        window.addEventListener('itinerary:created', (e) => triggerSync('Itinéraire créé', e.detail));
        window.addEventListener('itinerary:updated', (e) => triggerSync('Itinéraire mis à jour', e.detail));
        window.addEventListener('itinerary:deleted', (e) => triggerSync('Itinéraire supprimé', e.detail));

        // Écouter les changements de connexion
        window.addEventListener('online', () => {
            console.log('🌐 Connexion rétablie - Démarrage sync intelligente');
            this.isOnline = true;
            this.sync();
        });

        window.addEventListener('offline', () => {
            console.log('📱 Hors ligne - Mode local uniquement');
            this.isOnline = false;
        });
    }

    /**
     * Synchroniser toutes les modifications en attente
     */
    async sync() {
        if (!this.isOnline || this.syncInProgress) return;

        // Vérification simple avec this.user
        if (!window.firebaseService || !window.firebaseService.user) {
            console.log('⏸️ Synchronisation ignorée: utilisateur non connecté');
            return;
        }

        this.syncInProgress = true;
        console.log('🔄 Début de la synchronisation intelligente...');

        try {
            // Nouvelle logique de synchronisation basée sur updatedAt
            await this.intelligentSync();

            // Synchroniser les suppressions en attente
            await this.syncPendingDeletions();

            console.log('✅ Synchronisation intelligente terminée');
            
        } catch (error) {
            console.error('❌ Erreur lors de la synchronisation:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Synchronisation intelligente basée sur updatedAt
     */
    async intelligentSync() {
        console.log('🧠 Synchronisation intelligente en cours...');
        
        // Récupérer les itinéraires depuis le cache et Firebase
        const cacheItineraries = await window.localStorageService.getItineraries();
        const firebaseItineraries = await window.firebaseService.getItineraries();
        const pendingDeletions = await window.localStorageService.db.toDelete.toArray();
        const deletedFirebaseIds = new Set(pendingDeletions.filter(d => d.type === 'itinerary').map(d => d.firebaseId));
        
        console.log(`📊 Cache: ${cacheItineraries.length} itinéraires, Firebase: ${firebaseItineraries.length} itinéraires, Suppressions: ${deletedFirebaseIds.size}`);
        
        // Créer des maps pour faciliter les comparaisons
        const cacheMap = new Map(cacheItineraries.map(i => [i.id, i]));
        const firebaseMap = new Map(firebaseItineraries.map(i => [i.id, i]));
        
        // 1. Itinéraires en cache mais pas dans Firebase -> créer dans Firebase
        for (const [id, cacheItinerary] of cacheMap) {
            if (!firebaseMap.has(id)) {
                console.log(`☁️  Cache → Firebase: ${cacheItinerary.name}`);
                await this.createItineraryInFirebase(cacheItinerary);
            }
        }
        
        // 2. Itinéraires dans Firebase mais pas dans le cache -> créer dans le cache
        for (const [id, firebaseItinerary] of firebaseMap) {
            if (!cacheMap.has(id) && !deletedFirebaseIds.has(id)) {
                console.log(`💾 Firebase → Cache: ${firebaseItinerary.name}`);
                await this.createItineraryInCache(firebaseItinerary);
            }
        }
        
        // 3. Itinéraires présents dans les deux -> comparer updatedAt et garder le plus récent
        for (const [id, cacheItinerary] of cacheMap) {
            const firebaseItinerary = firebaseMap.get(id);
            if (!firebaseItinerary) continue; // Déjà traité dans l'étape 1
            
            const cacheUpdatedAt = new Date(cacheItinerary.updatedAt);
            const firebaseUpdatedAt = new Date(firebaseItinerary.updatedAt);
            
            if (cacheUpdatedAt > firebaseUpdatedAt) {
                console.log(`⬆️  Cache plus récent: ${cacheItinerary.name} (${cacheUpdatedAt} > ${firebaseUpdatedAt})`);
                await this.updateItineraryInFirebase(cacheItinerary);
            } else if (firebaseUpdatedAt > cacheUpdatedAt) {
                console.log(`⬇️  Firebase plus récent: ${firebaseItinerary.name} (${firebaseUpdatedAt} > ${cacheUpdatedAt})`);
                await this.updateItineraryInCache(firebaseItinerary);
            } else {
                console.log(`✅ Identique: ${cacheItinerary.name}`);
            }
        }
    }

    /**
     * Synchroniser les suppressions en attente
     */
    async syncPendingDeletions() {
        try {
            // Récupérer les suppressions en attente depuis la table toDelete
            const pendingDeletions = await window.localStorageService.db.toDelete.toArray();
            
            for (const deletion of pendingDeletions) {
                if (deletion.type === 'itinerary') {
                    await this.syncDeletedItinerary({ 
                        id: deletion.firebaseId, 
                        wasSynced: true,
                        deletionId: deletion.id 
                    });
                }
            }
        } catch (error) {
            console.error('❌ Erreur sync suppressions:', error);
        }
    }

    /**
     * Synchroniser un itinéraire supprimé
     */
    async syncDeletedItinerary(data) {
        if (!this.isOnline) return;

        // Vérification simple avec this.user
        if (!window.firebaseService || !window.firebaseService.user) {
            console.log('⏸️ Sync itinéraire supprimé ignoré: utilisateur non connecté');
            return;
        }

        try {
            // Vérifier si l'entrée de suppression existe encore avant de traiter
            if (data.deletionId) {
                const deletionEntry = await window.localStorageService.db.toDelete.get(data.deletionId);
                if (!deletionEntry) {
                    console.log(`ℹ️ Entrée de suppression déjà traitée: ${data.deletionId}`);
                    return;
                }
            }

            await window.firebaseService.deleteItinerary({ id: data.id });
            console.log(`✅ Itinéraire supprimé synchronisé: ${data.id}`);
            
            // Nettoyer l'entrée dans la table toDelete après synchronisation réussie
            if (data.deletionId) {
                await window.localStorageService.db.toDelete.delete(data.deletionId);
                console.log(`🗑️ Entrée de suppression nettoyée: ${data.deletionId}`);
            }
            
        } catch (error) {
            console.error('❌ Erreur sync itinéraire supprimé:', error);
            // En cas d'erreur de permissions, nettoyer quand même l'entrée pour éviter les boucles
            if (error.message && error.message.includes('Missing or insufficient permissions')) {
                console.log('🔧 Erreur de permissions détectée, nettoyage de l\'entrée pour éviter les boucles');
                if (data.deletionId) {
                    await window.localStorageService.db.toDelete.delete(data.deletionId);
                    console.log(`🗑️ Entrée de suppression nettoyée (erreur permissions): ${data.deletionId}`);
                }
            }
        }
    }

    /**
     * Créer un itinéraire dans Firebase
     */
    async createItineraryInFirebase(itinerary) {
        try {
            const firebaseId = await window.firebaseService.createItinerary({
                name: itinerary.name,
                startDate: itinerary.startDate,
                notes: itinerary.notes,
                destinations: itinerary.destinations || []
            });
            
            // Mettre à jour l'ID dans le cache
            if (itinerary.id.startsWith('itineraryToCreate_')) {
                // Supprimer l'ancien itinéraire temporaire
                await window.localStorageService.db.itineraries.delete(itinerary.id);
                
                // Créer le nouvel itinéraire avec l'ID Firebase
                await window.localStorageService.db.itineraries.add({
                    ...itinerary,
                    id: firebaseId,
                    updatedAt: new Date().toISOString()
                });
                
                console.log(`✅ Itinéraire créé dans Firebase: ${itinerary.name} (${itinerary.id} → ${firebaseId})`);
                
                // Rafraîchir l'interface
                if (window.Itineraries && window.Itineraries.renderItineraries) {
                    await window.Itineraries.renderItineraries();
                }
            }
        } catch (error) {
            console.error('❌ Erreur création itinéraire dans Firebase:', error);
        }
    }

    /**
     * Créer un itinéraire dans le cache
     */
    async createItineraryInCache(itinerary) {
        try {
            await window.localStorageService.db.itineraries.add({
                ...itinerary,
                updatedAt: new Date().toISOString()
            });
            
            console.log(`✅ Itinéraire créé dans le cache: ${itinerary.name}`);
            
            // Rafraîchir l'interface
            if (window.Itineraries && window.Itineraries.renderItineraries) {
                await window.Itineraries.renderItineraries();
            }
        } catch (error) {
            console.error('❌ Erreur création itinéraire dans le cache:', error);
        }
    }

    /**
     * Mettre à jour un itinéraire dans Firebase
     */
    async updateItineraryInFirebase(itinerary) {
        try {
            await window.firebaseService.updateItinerary(itinerary.id, itinerary);
            
            // Mettre à jour le cache avec la nouvelle date de modification
            await window.localStorageService.db.itineraries.update(itinerary.id, {
                updatedAt: new Date().toISOString()
            });
            
            console.log(`✅ Itinéraire mis à jour dans Firebase: ${itinerary.name}`);
        } catch (error) {
            console.error('❌ Erreur mise à jour itinéraire dans Firebase:', error);
        }
    }

    /**
     * Mettre à jour un itinéraire dans le cache
     */
    async updateItineraryInCache(itinerary) {
        try {
            await window.localStorageService.db.itineraries.update(itinerary.id, {
                ...itinerary,
                updatedAt: new Date().toISOString()
            });
            
            console.log(`✅ Itinéraire mis à jour dans le cache: ${itinerary.name}`);
            
            // Rafraîchir l'interface
            if (window.Itineraries && window.Itineraries.renderItineraries) {
                await window.Itineraries.renderItineraries();
            }
        } catch (error) {
            console.error('❌ Erreur mise à jour itinéraire dans le cache:', error);
        }
    }

    /**
     * Forcer la synchronisation manuelle
     */
    async forceSync() {
        console.log('🔄 Synchronisation forcée...');
        await this.sync();
    }

    /**
     * Obtenir le statut de synchronisation
     */
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            syncInProgress: this.syncInProgress,
            lastSync: new Date()
        };
    }
}

// Export pour utilisation globale
window.SyncService = SyncService;
