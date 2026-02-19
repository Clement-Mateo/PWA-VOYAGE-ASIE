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
            startDate: (itineraryData.startDate || new Date()).toISOString(), // Toujours stocker en string
            notes: itineraryData.notes || '',
            active: false,
            isSync: false,
            destinations: [],
            createdAt: new Date().toISOString(), // Toujours stocker en string
            updatedAt: new Date().toISOString() // Toujours stocker en string
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
        
        // Convertir les dates en Date JavaScript si nécessaire
        itineraries.forEach(itinerary => {
            if (itinerary.startDate && typeof itinerary.startDate === 'string') {
                itinerary.startDate = new Date(itinerary.startDate);
            }
            if (itinerary.createdAt && typeof itinerary.createdAt === 'string') {
                itinerary.createdAt = new Date(itinerary.createdAt);
            }
            if (itinerary.updatedAt && typeof itinerary.updatedAt === 'string') {
                itinerary.updatedAt = new Date(itinerary.updatedAt);
            }
        });
        
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
            
            // Convertir les dates en Date JavaScript si nécessaire
            if (current) {
                if (current.startDate && typeof current.startDate === 'string') {
                    current.startDate = new Date(current.startDate);
                }
                if (current.createdAt && typeof current.createdAt === 'string') {
                    current.createdAt = new Date(current.createdAt);
                }
                if (current.updatedAt && typeof current.updatedAt === 'string') {
                    current.updatedAt = new Date(current.updatedAt);
                }
            }
            
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

        // Récupérer l'itinéraire actuel pour comparer les dates
        const currentItinerary = await this.db.itineraries.get(id);
        if (!currentItinerary) throw new Error('Itinéraire non trouvé');

        const updateData = {
            ...updates,
            isSync: false, // Marquer comme non synchronisé pour forcer la sync
            updatedAt: new Date().toISOString() // Toujours stocker en string
        };

        // Si la date de début change, recalculer toutes les dates des destinations
        if (updates.startDate && updates.startDate !== currentItinerary.startDate) {
            if (currentItinerary.destinations && currentItinerary.destinations.length > 0) {
                let currentDate = new Date(updates.startDate);

                for (let i = 0; i < currentItinerary.destinations.length; i++) {
                    const destination = currentItinerary.destinations[i];
                    
                    // Première destination : nouvelle date de début de l'itinéraire
                    if (i === 0) {
                        destination.arrivalDate = currentDate.toISOString().split('T')[0];
                    } else {
                        // Destinations suivantes : date de départ de la précédente + temps de transport
                        const prevDestination = currentItinerary.destinations[i - 1];
                        const prevDeparture = new Date(prevDestination.departureDate);
                        
                        // Calculer le décalage selon le type et durée du transport
                        const daysToAdd = window.distanceService.calculateArrivalDayOffset(prevDestination.transportation);
                        
                        prevDeparture.setDate(prevDeparture.getDate() + daysToAdd);
                        destination.arrivalDate = prevDeparture.toISOString().split('T')[0];
                    }

                    // Recalculer la date de départ
                    const departureDate = new Date(destination.arrivalDate);
                    const durationInDays = window.extractDurationInDays(destination.duration);
                    departureDate.setDate(departureDate.getDate() + durationInDays - 1);
                    destination.departureDate = departureDate.toISOString().split('T')[0];
                }

                updateData.destinations = currentItinerary.destinations;
            }
        }

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
        return currentItinerary ? currentItinerary.destinations || [] : [];
    }

    /**
     * Calculer les dates d'arrivée et de départ pour une destination
     * @param {Array} existingDestinations - Destinations existantes dans l'itinéraire
     * @param {Date|Object} itineraryStartDate - Date de début de l'itinéraire
     * @param {Object|Number} duration - Durée de la destination
     * @param {Object} currentDestination - Destination actuelle (pour son transport)
     * @returns {Object} { arrivalDate, departureDate } au format YYYY-MM-DD
     */
    calculateDestinationDates(existingDestinations, itineraryStartDate, duration, currentDestination = null) {
        console.log('🔍 Debug calculateDestinationDates:', {
            existingDestinationsCount: existingDestinations.length,
            itineraryStartDate,
            duration,
            currentDestination: currentDestination?.name,
            currentDestinationTransport: currentDestination?.transportation
        });
        
        let arrivalDate;
        
        if (existingDestinations.length === 0) {
            // Première destination = date de début de l'itinéraire
            console.log('📅 Première destination, itineraryStartDate:', itineraryStartDate);
            
            // Convertir le Timestamp Firestore en Date JavaScript si nécessaire
            if (itineraryStartDate) {
                if (typeof itineraryStartDate === 'object' && itineraryStartDate.seconds !== undefined) {
                    // Timestamp Firestore
                    arrivalDate = new Date(itineraryStartDate.seconds * 1000 + (itineraryStartDate.nanoseconds || 0) / 1000000);
                } else if (typeof itineraryStartDate === 'string') {
                    // Chaîne de date
                    arrivalDate = new Date(itineraryStartDate);
                } else if (itineraryStartDate instanceof Date) {
                    // Objet Date déjà
                    arrivalDate = itineraryStartDate;
                } else {
                    console.warn('⚠️ Format de date non reconnu, utilisation de la date actuelle');
                    arrivalDate = new Date();
                }
            } else {
                console.warn('⚠️ Aucune date de début d\'itinéraire, utilisation de la date actuelle');
                arrivalDate = new Date();
            }
            console.log('📅 arrivalDate calculée:', arrivalDate, 'isValid:', !isNaN(arrivalDate.getTime()));
        } else {
            // Destinations suivantes = date de départ de la précédente
            const lastDestination = existingDestinations[existingDestinations.length - 1];
            const lastDepartureDate = lastDestination.departureDate;
            console.log('📅 Destination suivante, lastDestination:', lastDestination, 'lastDepartureDate:', lastDepartureDate);
            
            // Convertir le Timestamp Firestore en Date JavaScript si nécessaire
            if (typeof lastDepartureDate === 'object' && lastDepartureDate.seconds !== undefined) {
                // Timestamp Firestore
                arrivalDate = new Date(lastDepartureDate.seconds * 1000 + (lastDepartureDate.nanoseconds || 0) / 1000000);
            } else if (typeof lastDepartureDate === 'string') {
                // Chaîne de date
                arrivalDate = new Date(lastDepartureDate);
            } else if (lastDepartureDate instanceof Date) {
                // Objet Date déjà
                arrivalDate = lastDepartureDate;
            } else {
                console.warn('⚠️ Format de date de départ non reconnu, utilisation de la date actuelle');
                arrivalDate = new Date();
            }
            
            console.log('📅 arrivalDate depuis lastDepartureDate:', arrivalDate, 'isValid:', !isNaN(arrivalDate.getTime()));
            
            // Utiliser le transport de la destination actuelle pour déterminer l'arrivée
            const daysToAdd = window.distanceService.calculateArrivalDayOffset(currentDestination?.transportation);
            
            // Ajouter le nombre de jours calculé
            arrivalDate.setDate(arrivalDate.getDate() + daysToAdd);
        }
        
        // Calculer la date de départ = arrivée + durée - 1 jour
        const departureDate = new Date(arrivalDate);
        const durationInDays = window.extractDurationInDays(duration);
        
        console.log('📅 Duration utilisée:', durationInDays, 'duration original:', duration);
        departureDate.setDate(departureDate.getDate() + durationInDays - 1);
        
        console.log('📅 Dates finales:', { arrivalDate, departureDate });
        
        // Formater les dates en YYYY-MM-DD pour le stockage
        const formatDate = (date) => {
            console.log('🔍 formatDate input:', date, 'isValid:', !isNaN(date.getTime()));
            return date.toISOString().split('T')[0];
        };
        
        return {
            arrivalDate: formatDate(arrivalDate),
            departureDate: formatDate(departureDate)
        };
    }

    /**
     * Créer une destination (dans l'itinéraire actuel)
     */
    async createDestination(destinationData) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const currentItinerary = await this.getCurrentItinerary();
        if (!currentItinerary) throw new Error('Aucun itinéraire actif');

        // Ne pas calculer les dates maintenant - elles seront calculées après la création du transport
        const newDestination = {
            id: 'temp_destination', // ID temporaire pour les destinations en création
            ...destinationData,
            // Les dates seront calculées plus tard dans loadDestinations après le calcul du transport
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
        
        console.log('✅ Destination créée dans itinéraire (sans calcul de dates):', newDestination.id);
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

        const currentDestination = currentItinerary.destinations[destinationIndex];
        const updatedDestination = {
            ...currentDestination,
            ...updates,
            updatedAt: new Date()
        };
        
        const currentAddress = currentDestination.address?.address || '';
        const newAddress = updates.address?.address || '';

        // Si l'adresse est mise à jour et qu'elle a réellement changé, calculer le transport
        if (destinationIndex > 0 && updates.address && currentAddress != newAddress) {
            console.log('🚦 Adresse changée, calcul du transport par défaut...');
            try {
                // Récupérer la destination précédente
                const previousDestination = currentItinerary.destinations[destinationIndex - 1];
                
                if (previousDestination && previousDestination.address?.location && updatedDestination.address?.location) {
                    const coords = [updatedDestination.address.location.lat, updatedDestination.address.location.lng];
                    const prevCoords = [previousDestination.address.location.lat, previousDestination.address.location.lng];
                    
                    // Déterminer le transport par défaut
                    const defaultTransport = await window.distanceService.determineDefaultTransport(
                        prevCoords[0], prevCoords[1],
                        coords[0], coords[1]
                    );
                    
                    updatedDestination.transportation = {
                        type: defaultTransport.type,
                        cost: 0,
                        duration: defaultTransport.duration, // Garder le format {days, hours, minutes}
                        distance: defaultTransport.distance,
                        isStraightLine: defaultTransport.isStraightLine,
                        notes: null
                    };
                    
                    console.log(`🚗 Transport calculé pour ${updatedDestination.name}: ${defaultTransport.type} - ${defaultTransport.distance}km`);
                }
            } catch (error) {
                console.error('Erreur calcul transport par défaut:', error);
                // Fallback en cas d'erreur
                updatedDestination.transportation = {
                    type: 'voiture',
                    cost: 0,
                    duration: null,
                    distance: null,
                    notes: null
                };
            }
        }

        // Vérifier les changements réels pour décider du recalcul des dates
        const hasAddressChanged = updates.address && currentDestination.address?.address !== updates.address?.address;
        const hasDurationChanged = updates.duration && JSON.stringify(currentDestination.duration) !== JSON.stringify(updates.duration);
        const hasTransportTypeChanged = updates.transportation && updates.transportation.type !== currentDestination.transportation?.type;

        const shouldRecalculateDates = hasAddressChanged || hasDurationChanged || hasTransportTypeChanged;

        if (shouldRecalculateDates) {
            const reason = hasAddressChanged ? 'adresse' : hasDurationChanged ? 'durée' : 'transport';
            console.log(`🔄 Recalcul des dates pour ${updatedDestination.name} (raison: ${reason})`);
            
            // Récupérer les destinations précédentes pour le calcul
            const previousDestinations = currentItinerary.destinations.slice(0, destinationIndex);
            
            // Calculer les dates avec les données actuelles
            const calculatedDates = this.calculateDestinationDates(
                previousDestinations, 
                currentItinerary.startDate, 
                updatedDestination.duration,
                updatedDestination // Passer la destination actuelle pour son transport
            );
            
            updatedDestination.arrivalDate = calculatedDates.arrivalDate;
            updatedDestination.departureDate = calculatedDates.departureDate;
        }

        currentItinerary.destinations[destinationIndex] = updatedDestination;

        currentItinerary.isSync = false; // Marquer l'itinéraire comme non sync
        
        await this.db.itineraries.update(currentItinerary.id, {
            destinations: currentItinerary.destinations,
            isSync: false,
            updatedAt: new Date()
        });
        
        // Émettre événement pour sync de l'itinéraire
        this.emit('itinerary:updated', currentItinerary);
        
        // Recharger toujours la liste des destinations pour voir les changements
        console.log(`📅 Rechargement de la liste après mise à jour de la destination`);
        
        // Appeler direct car tous les process sont terminés (sauvegarde DB faite)
        if (window.Destinations && window.Destinations.loadDestinations) {
            await window.Destinations.loadDestinations();
        }
        
        console.log('✅ Destination mise à jour:', destinationId);
    }

    /**
     * Réorganiser les destinations et recalculer les dates en cascade
     * @param {Array} newOrder - Nouvel ordre des destinations (tableau d'IDs)
     */
    async reorderDestinations(newOrder) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const currentItinerary = await this.getCurrentItinerary();
        if (!currentItinerary) throw new Error('Aucun itinéraire actif');

        // Réorganiser les destinations selon le nouvel ordre
        const reorderedDestinations = [];
        const destinationsMap = new Map(currentItinerary.destinations.map(d => [d.id, d]));

        for (const destinationId of newOrder) {
            const destination = destinationsMap.get(destinationId);
            if (destination) {
                reorderedDestinations.push(destination);
            }
        }

        // Recalculer les dates pour toutes les destinations
        let currentDate = currentItinerary.startDate 
            ? new Date(currentItinerary.startDate) 
            : new Date();

        for (let i = 0; i < reorderedDestinations.length; i++) {
            const destination = reorderedDestinations[i];
            
            // Première destination : date de début de l'itinéraire
            if (i === 0) {
                destination.arrivalDate = currentDate.toISOString().split('T')[0];
            } else {
                // Destinations suivantes : date de départ de la précédente + temps de transport
                const prevDestination = reorderedDestinations[i - 1];
                const prevDeparture = new Date(prevDestination.departureDate);
                
                // Calculer le décalage selon le type et durée du transport
                const daysToAdd = window.distanceService.calculateArrivalDayOffset(prevDestination.transportation);
                
                prevDeparture.setDate(prevDeparture.getDate() + daysToAdd);
                destination.arrivalDate = prevDeparture.toISOString().split('T')[0];
            }

            // Recalculer la date de départ
            const departureDate = new Date(destination.arrivalDate);
            const durationInDays = window.extractDurationInDays(destination.duration);
            departureDate.setDate(departureDate.getDate() + durationInDays - 1);
            destination.departureDate = departureDate.toISOString().split('T')[0];
        }

        // Mettre à jour l'itinéraire
        currentItinerary.destinations = reorderedDestinations;
        currentItinerary.isSync = false;
        
        await this.db.itineraries.update(currentItinerary.id, {
            destinations: currentItinerary.destinations,
            isSync: false,
            updatedAt: new Date()
        });
        
        // Émettre événement pour sync de l'itinéraire
        this.emit('itinerary:updated', currentItinerary);
        
        console.log('✅ Destinations réorganisées et dates recalculées');
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
        
        // Recalculer les dates des destinations restantes
        if (currentItinerary.destinations.length > 0) {
            // Convertir le Timestamp Firestore en Date JavaScript si nécessaire
            let currentDate;
            if (currentItinerary.startDate) {
                if (typeof currentItinerary.startDate === 'object' && currentItinerary.startDate.seconds !== undefined) {
                    // Timestamp Firestore
                    currentDate = new Date(currentItinerary.startDate.seconds * 1000 + (currentItinerary.startDate.nanoseconds || 0) / 1000000);
                } else if (typeof currentItinerary.startDate === 'string') {
                    // Chaîne de date
                    currentDate = new Date(currentItinerary.startDate);
                } else if (currentItinerary.startDate instanceof Date) {
                    // Objet Date déjà
                    currentDate = currentItinerary.startDate;
                } else {
                    console.warn('⚠️ Format de date non reconnu, utilisation de la date actuelle');
                    currentDate = new Date();
                }
            } else {
                console.warn('⚠️ Aucune date de début d\'itinéraire, utilisation de la date actuelle');
                currentDate = new Date();
            }

            for (let i = 0; i < currentItinerary.destinations.length; i++) {
                const destination = currentItinerary.destinations[i];
                
                // Première destination : date de début de l'itinéraire
                if (i === 0) {
                    destination.arrivalDate = currentDate.toISOString().split('T')[0];
                } else {
                    // Destinations suivantes : date de départ de la précédente + temps de transport
                    const prevDestination = currentItinerary.destinations[i - 1];
                    const prevDeparture = new Date(prevDestination.departureDate);
                    
                    // Calculer le décalage selon le type et durée du transport
                    const daysToAdd = window.distanceService.calculateArrivalDayOffset(prevDestination.transportation);
                    
                    prevDeparture.setDate(prevDeparture.getDate() + daysToAdd);
                    destination.arrivalDate = prevDeparture.toISOString().split('T')[0];
                }

                // Recalculer la date de départ
                const departureDate = new Date(destination.arrivalDate);
                const durationInDays = window.extractDurationInDays(destination.duration);
                departureDate.setDate(departureDate.getDate() + durationInDays - 1);
                destination.departureDate = departureDate.toISOString().split('T')[0];
            }
        }

        currentItinerary.isSync = false; // Marquer l'itinéraire comme non sync
        
        await this.db.itineraries.update(currentItinerary.id, {
            destinations: currentItinerary.destinations,
            isSync: false,
            updatedAt: new Date()
        });
        
        // Émettre événement pour sync de l'itinéraire
        this.emit('itinerary:updated', currentItinerary);
        
        console.log('✅ Destination supprimée et dates recalculées:', destinationId);
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
