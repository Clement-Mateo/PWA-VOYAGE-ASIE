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
            this.syncPendingChanges();
        }
    }

    /**
     * Configuration des écouteurs d'événements
     */
    setupEventListeners() {
        // Écouter les événements de LocalStorage pour les itinéraires
        window.addEventListener('itinerary:created', (e) => {
            // Synchroniser uniquement si utilisateur connecté et en ligne
            if (this.isOnline && window.firebaseService && window.firebaseService.user) {
                this.syncCreatedItinerary(e.detail);
            }
        });

        window.addEventListener('itinerary:updated', (e) => {
            // Synchroniser uniquement si utilisateur connecté et en ligne
            if (this.isOnline && window.firebaseService && window.firebaseService.user) {
                this.syncUpdatedItinerary(e.detail);
            }
        });

        window.addEventListener('itinerary:deleted', (e) => {
            // Synchroniser uniquement si utilisateur connecté et en ligne
            if (this.isOnline && window.firebaseService && window.firebaseService.user) {
                this.syncDeletedItinerary(e.detail);
            }
        });

        // Écouter les changements de connexion
        window.addEventListener('online', () => {
            console.log('🌐 Connexion rétablie - Démarrage sync');
            this.isOnline = true;
            this.syncPendingChanges();
        });

        window.addEventListener('offline', () => {
            console.log('📱 Hors ligne - Mode local uniquement');
            this.isOnline = false;
        });
    }

    /**
     * Synchroniser toutes les modifications en attente
     */
    async syncPendingChanges() {
        if (!this.isOnline || this.syncInProgress) return;

        // Vérification simple avec this.user
        if (!window.firebaseService || !window.firebaseService.user) {
            console.log('⏸️ Synchronisation ignorée: utilisateur non connecté');
            return;
        }

        this.syncInProgress = true;
        console.log('🔄 Début de la synchronisation...');

        try {
            const unsyncedItineraries = await window.localStorageService.getUnsyncedItineraries();
            
            // Synchroniser les itinéraires
            for (const itinerary of unsyncedItineraries) {
                if (itinerary.id.startsWith('itineraryToCreate_')) {
                    await this.syncCreatedItinerary(itinerary);
                } else {
                    await this.syncUpdatedItinerary(itinerary);
                }
            }

            // Synchroniser les suppressions en attente
            await this.syncPendingDeletions();

            console.log('✅ Synchronisation terminée');
            
        } catch (error) {
            console.error('❌ Erreur lors de la synchronisation:', error);
        } finally {
            this.syncInProgress = false;
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
     * Synchroniser un itinéraire créé
     */
    async syncCreatedItinerary(itinerary) {
        if (!this.isOnline) return;

        // Vérification simple avec this.user
        if (!window.firebaseService || !window.firebaseService.user) {
            console.log('⏸️ Sync itinéraire créé ignoré: utilisateur non connecté');
            return;
        }

        try {
            // Si c'est un itinéraire temporaire, le créer sur Firebase
            if (itinerary.id.startsWith('itineraryToCreate_')) {
                const firebaseId = await window.firebaseService.createItinerary(itinerary.name, false);
                
                // Mettre à jour l'ID local et marquer comme synchronisé
                await window.localStorageService.db.itineraries.update(itinerary.id, {
                    id: firebaseId,
                    isSync: true,
                    updatedAt: new Date()
                });
                
                console.log(`✅ Itinéraire synchronisé: ${itinerary.id} → ${firebaseId}`);
                
                // Rafraîchir le composant Itineraries pour mettre à jour les IDs
                if (window.Itineraries && window.Itineraries.renderItineraries) {
                    await window.Itineraries.renderItineraries();
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur sync itinéraire créé:', error);
            // Reste en isSync: false pour réessayer plus tard
        }
    }

    /**
     * Synchroniser un itinéraire mis à jour
     */
    async syncUpdatedItinerary(itinerary) {
        if (!this.isOnline) return;

        // Vérification simple avec this.user
        if (!window.firebaseService || !window.firebaseService.user) {
            console.log('⏸️ Sync itinéraire mis à jour ignoré: utilisateur non connecté');
            return;
        }

        try {
            await window.firebaseService.updateItinerary(itinerary.id, itinerary);
            
            // Marquer comme synchronisé
            await window.localStorageService.db.itineraries.update(itinerary.id, {
                isSync: true,
                updatedAt: new Date()
            });
            
            console.log(`✅ Itinéraire mis à jour synchronisé: ${itinerary.id}`);
            
        } catch (error) {
            console.error('❌ Erreur sync itinéraire mis à jour:', error);
        }
    }

    /**
     * Synchroniser un itinéraire supprimé
     */
    async syncDeletedItinerary(data) {
        if (!this.isOnline || !data.wasSynced) return;

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
     * Forcer la synchronisation manuelle
     */
    async forceSync() {
        console.log('🔄 Synchronisation forcée...');
        await this.syncPendingChanges();
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
