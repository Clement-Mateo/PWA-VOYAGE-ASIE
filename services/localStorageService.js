/**
 * Gestionnaire de stockage local avec IndexedDB (Dexie.js)
 * Source de vérité pour toutes les données de l'application
 */

class LocalStorageService {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.Dexie = null;
    }

    /**
     * Initialisation de la base de données
     */
    async init() {
        try {
            // Attendre que Dexie soit disponible globalement
            if (!window.Dexie) {
                // Charger Dexie si pas déjà chargé
                await this.loadDexie();
            }
            
            this.db = new window.Dexie('VoyageAsieDB');
            
            // Définition des schémas
            this.db.version(3).stores({
                itineraries: 'id, userId, name, active, isSync, createdAt, updatedAt, [userId+active]',
                toDelete: 'id, type, firebaseId, userId, createdAt',
                exchangeRates: 'id, lastUpdated, base'
            });

            this.isInitialized = true;
            console.log('✅ IndexedDB initialisée avec Dexie.js');
            
        } catch (error) {
            console.error('❌ Erreur initialisation IndexedDB:', error);
            throw error;
        }
    }

    /**
     * Charger Dexie dynamiquement
     */
    async loadDexie() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js';
            script.onload = () => {
                console.log('✅ Dexie chargé avec succès');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Impossible de charger Dexie'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Génère un ID temporaire pour les créations locales
     */
    generateTempId(prefix = 'temp') {
        const random = Math.random().toString(36).substring(2, 12);
        return `${prefix}_${random}`;
    }

    /**
     * Émet un événement pour la synchronisation
     */
    emit(event, data) {
        window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }

    // ========================================
    // CRUD ITINERARIES
    // ========================================

    /**
     * Créer un itinéraire en local (pour l'utilisateur connecté)
     */
    async createItinerary(itineraryData = null) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const userId = window.firebaseService.getCurrentUser().uid;
        
        // Si pas de données, utiliser les valeurs par défaut
        if (!itineraryData) {
            const baseName = 'Nouvel Itinéraire';
            let itineraryName = baseName;
            let counter = 1;
            
            // Récupérer les itinéraires existants pour générer un nom unique
            const itineraries = await this.getItineraries();
            while (itineraries.some(i => i.name === itineraryName)) {
                counter++;
                itineraryName = `${baseName} ${counter}`;
            }
            
            itineraryData = {
                name: itineraryName,
                startDate: new Date(), // Date du jour par défaut
                notes: ''
            };
        }
        
        const newItinerary = {
            id: this.generateTempId('itineraryToCreate'),
            userId: userId,
            name: itineraryData.name || 'Nouvel Itinéraire',
            startDate: itineraryData.startDate || null,
            notes: itineraryData.notes || '',
            active: false,
            isSync: false,
            destinations: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.db.itineraries.add(newItinerary);
        
        // Émettre événement pour sync
        this.emit('itinerary:created', newItinerary);
        
        console.log('✅ Itinéraire créé en local:', newItinerary.id);
        return newItinerary;
    }

    /**
     * Récupérer tous les itinéraires de l'utilisateur connecté
     */
    async getItineraries() {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const userId = window.firebaseService.getCurrentUser().uid;
        
        // Recharger depuis IndexedDB à chaque fois
        const itineraries = await this.db.itineraries
            .where('userId')
            .equals(userId)
            .toArray();
        
        console.log(`📋 ${itineraries.length} itinéraires chargés depuis IndexedDB`);
        return itineraries.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    /**
     * Récupérer l'itinéraire actif de l'utilisateur connecté
     */
    async getCurrentItinerary() {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const currentUser = window.firebaseService.getCurrentUser();
        if (!currentUser || !currentUser.uid) {
            console.warn('⚠️ getCurrentItinerary: Utilisateur non connecté ou UID invalide');
            return null;
        }

        const userId = currentUser.uid;
        
        try {
            // Utiliser une approche plus simple : filtrer par userId puis trouver le premier actif
            const userItineraries = await this.db.itineraries
                .where('userId')
                .equals(userId)
                .toArray();
            
            const current = userItineraries.find(itinerary => itinerary.active === true);
            
            return current || null;
            
        } catch (error) {
            console.error('❌ Erreur getCurrentItinerary:', error);
            return null;
        }
    }

    /**
     * Mettre à jour un itinéraire
     */
    async updateItinerary(id, updates) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const updateData = {
            ...updates,
            isSync: false, // Marquer comme non synchronisé pour forcer la sync
            updatedAt: new Date()
        };

        await this.db.itineraries.update(id, updateData);
        
        // Émettre événement pour la synchronisation
        this.emit('itinerary:updated', { id, ...updateData });
        
        console.log('✅ Itinéraire mis à jour:', id);
    }

    /**
     * Supprimer un itinéraire
     */
    async deleteItinerary(id) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const itinerary = await this.db.itineraries.get(id);
        
        if (itinerary.isSync) {
            // Ajouter à la liste des suppressions à sync
            await this.db.toDelete.add({
                id: this.generateTempId('toDelete'),
                type: 'itinerary',
                firebaseId: id,
                userId: itinerary.userId,
                createdAt: new Date()
            });
        }

        // Supprimer de IndexedDB
        await this.db.itineraries.delete(id);
        
        // Émettre événement pour sync
        this.emit('itinerary:deleted', { id, wasSynced: itinerary.isSync });
        
        console.log('✅ Itinéraire supprimé:', id);
    }

    // ========================================
    // CRUD DESTINATIONS (simplifié - pas de sync individuelle)
    // ========================================

    /**
     * Récupérer les destinations de l'itinéraire actuel
     */
    async getDestinationsOfCurrentItinerary() {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const currentItinerary = await this.getCurrentItinerary();
        return currentItinerary ? currentItinerary.destinations : [];
    }

    /**
     * Créer une destination (dans l'itinéraire actuel)
     */
    async createDestination(destinationData) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const currentItinerary = await this.getCurrentItinerary();
        if (!currentItinerary) throw new Error('Aucun itinéraire actif');

        const newDestination = {
            id: 'temp_destination', // ID temporaire pour les destinations en création
            ...destinationData,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Ajouter la destination à l'itinéraire
        currentItinerary.destinations.push(newDestination);
        currentItinerary.isSync = false; // Marquer l'itinéraire comme non sync
        
        await this.db.itineraries.update(currentItinerary.id, {
            destinations: currentItinerary.destinations,
            isSync: false,
            updatedAt: new Date()
        });
        
        // NE PAS émettre d'événement pour les destinations temporaires
        if (newDestination.id !== 'temp_destination') {
            // Émettre événement pour sync de l'itinéraire
            this.emit('itinerary:updated', currentItinerary);
        }
        
        console.log('✅ Destination créée dans itinéraire:', newDestination.id);
        return newDestination;
    }

    /**
     * Mettre à jour une destination (dans l'itinéraire actuel)
     */
    async updateDestination(destinationId, updates) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const currentItinerary = await this.getCurrentItinerary();
        if (!currentItinerary) throw new Error('Aucun itinéraire actif');

        // Mettre à jour la destination dans l'itinéraire
        const destinationIndex = currentItinerary.destinations.findIndex(d => d.id === destinationId);
        if (destinationIndex === -1) throw new Error('Destination non trouvée');

        currentItinerary.destinations[destinationIndex] = {
            ...currentItinerary.destinations[destinationIndex],
            ...updates,
            updatedAt: new Date()
        };

        currentItinerary.isSync = false; // Marquer l'itinéraire comme non sync
        
        await this.db.itineraries.update(currentItinerary.id, {
            destinations: currentItinerary.destinations,
            isSync: false,
            updatedAt: new Date()
        });
        
        // Émettre événement pour sync de l'itinéraire
        this.emit('itinerary:updated', currentItinerary);
        
        console.log('✅ Destination mise à jour:', destinationId);
    }

    /**
     * Supprimer une destination (dans l'itinéraire actuel)
     */
    async deleteDestination(destinationId) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const currentItinerary = await this.getCurrentItinerary();
        if (!currentItinerary) throw new Error('Aucun itinéraire actif');

        // Supprimer la destination de l'itinéraire
        currentItinerary.destinations = currentItinerary.destinations.filter(d => d.id !== destinationId);
        currentItinerary.isSync = false; // Marquer l'itinéraire comme non sync
        
        await this.db.itineraries.update(currentItinerary.id, {
            destinations: currentItinerary.destinations,
            isSync: false,
            updatedAt: new Date()
        });
        
        // Émettre événement pour sync de l'itinéraire
        this.emit('itinerary:updated', currentItinerary);
        
        console.log('✅ Destination supprimée:', destinationId);
    }

    /**
     * Récupérer une destination (dans l'itinéraire actuel)
     */
    async getDestination(destinationId) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const currentItinerary = await this.getCurrentItinerary();
        if (!currentItinerary) return null;

        return currentItinerary.destinations.find(d => d.id === destinationId) || null;
    }

    // ========================================
    // CRUD ACTIVITIES (simplifié - dans les destinations)
    // ========================================

    /**
     * Récupérer les activités d'une destination (dans l'itinéraire actuel)
     */
    async getActivities(destinationId) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const destination = await this.getDestination(destinationId);
        
        if (!destination) {
            console.warn('⚠️ Destination non trouvée pour l\'ID:', destinationId);
            return [];
        }
        
        return destination.activities || [];
    }

    /**
     * Supprimer une activité (dans la destination de l'itinéraire actuel)
     */
    async deleteActivity(destinationId, activityId) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const currentItinerary = await this.getCurrentItinerary();
        if (!currentItinerary) throw new Error('Aucun itinéraire actif');

        const destinationIndex = currentItinerary.destinations.findIndex(d => d.id === destinationId);
        if (destinationIndex === -1) throw new Error('Destination non trouvée');

        // Supprimer l'activité de la destination
        const destination = currentItinerary.destinations[destinationIndex];
        destination.activities = (destination.activities || []).filter(a => a.id !== activityId);
        
        currentItinerary.isSync = false; // Marquer l'itinéraire comme non sync
        
        await this.db.itineraries.update(currentItinerary.id, {
            destinations: currentItinerary.destinations,
            isSync: false,
            updatedAt: new Date()
        });
        
        // Émettre événement pour sync de l'itinéraire
        this.emit('itinerary:updated', currentItinerary);
        
        console.log('✅ Activité supprimée:', activityId);
    }

    // ========================================
    // SYNCHRONISATION
    // ========================================

    /**
     * Récupérer les itinéraires non synchronisés
     */
    async getUnsyncedItineraries() {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        try {
            // Éviter la requête where() qui cause l'erreur et utiliser toArray() + filtrage
            console.log('🔄 Récupération de tous les itinéraires pour filtrage...');
            const allItineraries = await this.db.itineraries.toArray();
            const unsynced = allItineraries.filter(itinerary => itinerary.isSync === false);
            console.log(`📋 ${unsynced.length} itinéraires non synchronisés trouvés`);
            return unsynced;
            
        } catch (error) {
            console.error('❌ Erreur getUnsyncedItineraries:', error);
            
            // En cas d'erreur grave, retourner un tableau vide pour ne pas bloquer l'application
            console.warn('⚠️ Retour d\'un tableau vide pour éviter le blocage');
            return [];
        }
    }

    /**
     * Sauvegarder les taux de change globaux
     */
    async saveExchangeRates(exchangeRates) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        try {
            const ratesData = {
                id: 'global_rates',
                base: 'EUR',
                rates: exchangeRates.rates,
                lastUpdated: exchangeRates.lastUpdated || Date.now()
            };

            await this.db.exchangeRates.put(ratesData);
            console.log('✅ Taux de change globaux sauvegardés');
            return ratesData;
        } catch (error) {
            console.error('❌ Erreur saveExchangeRates:', error);
            throw error;
        }
    }

    /**
     * Récupérer les taux de change globaux
     */
    async getExchangeRates() {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        try {
            const rates = await this.db.exchangeRates.get('global_rates');
            console.log('📊 Taux de change globaux récupérés:', rates ? 'trouvés' : 'non trouvés');
            return rates;
        } catch (error) {
            console.error('❌ Erreur getExchangeRates:', error);
            return null;
        }
    }

    /**
     * Supprimer la destination temporaire si elle existe
     */
    async removeTempDestination() {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        try {
            const currentItinerary = await this.getCurrentItinerary();
            if (!currentItinerary) {
                return; // Pas d'itinéraire actif, rien à faire
            }

            // Chercher la destination temporaire
            const tempDestinationIndex = currentItinerary.destinations.findIndex(
                dest => dest.id === 'temp_destination'
            );

            if (tempDestinationIndex !== -1) {
                // Supprimer la destination temporaire
                currentItinerary.destinations.splice(tempDestinationIndex, 1);
                
                // Mettre à jour l'itinéraire
                await this.db.itineraries.update(currentItinerary.id, {
                    destinations: currentItinerary.destinations,
                    updatedAt: new Date()
                });

                console.log('🗑️ Destination temporaire supprimée de l\'itinéraire');
            }
        } catch (error) {
            console.error('❌ Erreur removeTempDestination:', error);
        }
    }
}

// Export pour utilisation globale
window.LocalStorageService = LocalStorageService;
