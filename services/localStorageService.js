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
                itineraries: 'id, userId, name, active, createdAt_string, updatedAt_string, [userId+active]',
                toDelete: 'id, type, firebaseId, userId, createdAt_string',
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
            
            // Créer un itinéraire par défaut
            itineraryData = {
                name: itineraryName,
                startDate: window.DateService.todayISOString(), // Date du jour par défaut
                notes: ''
            };
        } else if (itineraryData.startDate) {
            // Valider la date si fournie
            if (!window.DateService.isValidDate(itineraryData.startDate)) {
                console.warn('⚠️ Date invalide dans createItinerary, utilisation de la date du jour');
                itineraryData.startDate = window.DateService.todayISOString();
            } else {
                itineraryData.startDate = window.DateService.dateToISOString(itineraryData.startDate);
            }
        }
        
        // Vérifier s'il y a déjà des itinéraires pour déterminer si celui-ci doit être actif
        const existingItineraries = await this.db.itineraries.where('userId').equals(userId).toArray();
        const active = existingItineraries.length === 0;
        
        const itinerary = {
            id: `itineraryToCreate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: itineraryData.name || 'Nouvel Itinéraire',
            startDate: window.DateService.dateToISOString(itineraryData.startDate) || null,
            notes: itineraryData.notes || '',
            userId: userId,
            active: active,
            destinations: [],
            createdAt_string: window.DateService.todayISOString(),
            updatedAt_string: window.DateService.todayISOString()
        };

        await this.db.itineraries.add(itinerary);
        
        console.log(`✅ Itinéraire créé en local: ${itinerary.id} (actif: ${active})`);
        
        // Émettre événement pour sync
        this.emit('itinerary:created', itinerary);
        
        return itinerary;
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
            if (itinerary.startDate) {
                itinerary.startDate = window.DateService.isoStringToDate(itinerary.startDate);
            }
            if (itinerary.createdAt_string) {
                itinerary.createdAt = window.DateService.isoStringToDate(itinerary.createdAt_string);
            }
            if (itinerary.updatedAt_string) {
                itinerary.updatedAt = window.DateService.isoStringToDate(itinerary.updatedAt_string);
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
                if (current.startDate) {
                    current.startDate = window.DateService.isoStringToDate(current.startDate);
                }
                if (current.createdAt_string) {
                    current.createdAt = window.DateService.isoStringToDate(current.createdAt_string);
                }
                if (current.updatedAt_string) {
                    current.updatedAt = window.DateService.isoStringToDate(current.updatedAt_string);
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
            updatedAt_string: window.DateService.todayISOString()
        };

        // Si la date de début change, recalculer toutes les dates des destinations
        if (updates.startDate && updates.startDate !== currentItinerary.startDate) {
            if (currentItinerary.destinations && currentItinerary.destinations.length > 0) {
                let currentDate = window.DateService.isoStringToDate(updates.startDate);
                
                if (!currentDate) {
                    console.error('❌ Date invalide dans updateItinerary:', updates.startDate);
                    return;
                }

                for (let i = 0; i < currentItinerary.destinations.length; i++) {
                    const destination = currentItinerary.destinations[i];
                    
                    // Première destination : nouvelle date de début de l'itinéraire
                    if (i === 0) {
                        destination.arrivalDate = window.DateService.dateToISOString(currentDate).split('T')[0];
                    } else {
                        // Destinations suivantes : date de départ de la précédente + temps de transport
                        const prevDestination = currentItinerary.destinations[i - 1];
                        const prevDeparture = window.DateService.isoStringToDate(prevDestination.departureDate);
                        
                        // Calculer le décalage selon le type et durée du transport
                        const daysToAdd = window.distanceService.calculateArrivalDayOffset(prevDestination.transportation);
                        
                        // Créer une copie pour éviter de modifier l'original
                        const newArrivalDate = new Date(prevDeparture);
                        newArrivalDate.setDate(newArrivalDate.getDate() + daysToAdd);
                        destination.arrivalDate = window.DateService.dateToISOString(newArrivalDate).split('T')[0];
                    }

                    // Recalculer la date de départ
                    const departureDate = window.DateService.isoStringToDate(destination.arrivalDate);
                    const durationInDays = window.extractDurationInDays(destination.duration);
                    
                    // Créer une copie pour éviter de modifier l'original
                    const newDepartureDate = new Date(departureDate);
                    newDepartureDate.setDate(newDepartureDate.getDate() + durationInDays - 1);
                    destination.departureDate = window.DateService.dateToISOString(newDepartureDate).split('T')[0];
                }

                updateData.destinations = currentItinerary.destinations;
            }
        }

        await this.db.itineraries.update(id, updateData);
        
        // Émettre événement pour la synchronisation
        this.emit('itinerary:updated', { id, ...updateData });
        
        // Recharger la liste des destinations pour mettre à jour les dates (après la mise à jour DB)
        if (updates.startDate && updates.startDate !== currentItinerary.startDate) {
            if (window.Destinations && window.Destinations.loadDestinations) {
                await window.Destinations.loadDestinations();
            }
        }
        
        console.log('✅ Itinéraire mis à jour:', id);
    }

    /**
     * Supprimer un itinéraire
     */
    async deleteItinerary(id) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const itinerary = await this.db.itineraries.get(id);
        
        // Ajouter toujours à la liste des suppressions à sync
        await this.db.toDelete.add({
            id: this.generateTempId('toDelete'),
            type: 'itinerary',
            firebaseId: id,
            userId: itinerary.userId,
            createdAt_string: window.DateService.todayISOString()
        });

        // Supprimer de IndexedDB
        await this.db.itineraries.delete(id);
        
        // Émettre événement pour sync
        this.emit('itinerary:deleted', { id, wasSynced: true });
        
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
        let arrivalDate;
        
        if (existingDestinations.length === 0) {
            // Première destination = date de début de l'itinéraire
            if (itineraryStartDate) {
                if (typeof itineraryStartDate === 'string') {
                    arrivalDate = window.DateService.isoStringToDate(itineraryStartDate);
                } else if (itineraryStartDate instanceof Date) {
                    arrivalDate = itineraryStartDate;
                } else {
                    arrivalDate = window.DateService.isoStringToDate(window.DateService.todayISOString());
                }
            } else {
                arrivalDate = window.DateService.isoStringToDate(window.DateService.todayISOString());
            }
        } else {
            // Destinations suivantes = date de départ de la précédente
            const lastDestination = existingDestinations[existingDestinations.length - 1];
            const lastDepartureDate = lastDestination.departureDate;
            
            // Convertir la date en Date JavaScript si nécessaire
            if (typeof lastDepartureDate === 'string') {
                arrivalDate = window.DateService.isoStringToDate(lastDepartureDate);
            } else if (lastDepartureDate instanceof Date) {
                arrivalDate = lastDepartureDate;
            } else {
                arrivalDate = window.DateService.isoStringToDate(window.DateService.todayISOString());
            }
            
            // Utiliser le transport de la destination actuelle pour déterminer l'arrivée
            const daysToAdd = window.distanceService.calculateArrivalDayOffset(currentDestination?.transportation);
            
            // Créer une copie pour éviter de modifier l'original
            const newArrivalDate = new Date(arrivalDate);
            newArrivalDate.setDate(newArrivalDate.getDate() + daysToAdd);
            arrivalDate = newArrivalDate;
        }
        
        // Calculer la date de départ = arrivée + durée - 1 jour
        let departureDate = new Date(arrivalDate);
        const durationInDays = window.extractDurationInDays(duration);
        
        // Créer une copie pour éviter de modifier l'original
        const newDepartureDate = new Date(departureDate);
        newDepartureDate.setDate(newDepartureDate.getDate() + durationInDays - 1);
        departureDate = newDepartureDate;
        
        // Formater les dates en YYYY-MM-DD pour le stockage
        const formatDate = (date) => {
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
            createdAt: window.DateService.todayISOString(),
            updatedAt_string: window.DateService.todayISOString()
        };

        // Ajouter la destination à l'itinéraire
        currentItinerary.destinations.push(newDestination);
        
        await this.db.itineraries.update(currentItinerary.id, {
            destinations: currentItinerary.destinations,
            updatedAt_string: window.DateService.todayISOString()
        });
        
        // NE PAS émettre d'événement pour les destinations temporaires
        if (newDestination.id !== 'temp_destination') {
            // Émettre événement pour sync de l'itinéraire
            this.emit('itinerary:updated', currentItinerary);
        }
        
        return newDestination;
    }

    /**
     * Mettre à jour une destination (dans l'itinéraire actuel)
     */
    async updateDestination(destinationId, updates, options = {}) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const currentItinerary = await this.getCurrentItinerary();
        if (!currentItinerary) throw new Error('Aucun itinéraire actif');

        // Mettre à jour la destination dans l'itinéraire
        let destinationIndex = currentItinerary.destinations.findIndex(d => d.id === destinationId);
        
        if (destinationIndex === -1) {
            // Si c'est une destination temporaire, l'ajouter à l'itinéraire
            if (destinationId === 'temp_destination') {
                const tempDestination = {
                    id: destinationId,
                    ...updates,
                    createdAt: window.DateService.todayISOString(),
                    updatedAt_string: window.DateService.todayISOString()
                };
                currentItinerary.destinations.push(tempDestination);
                destinationIndex = currentItinerary.destinations.length - 1;
            } else {
                throw new Error('Destination non trouvée');
            }
        }

        const currentDestination = currentItinerary.destinations[destinationIndex];
        const updatedDestination = {
            ...currentDestination,
            ...updates,
            updatedAt_string: window.DateService.todayISOString()
        };
        
        const currentAddress = currentDestination.address?.address || '';
        const newAddress = updates.address?.address || '';

        // Si l'adresse est mise à jour et qu'elle a réellement changé, calculer le transport
        if (destinationIndex > 0 && updates.address && currentAddress != newAddress) {
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

        // Recalculer les dates pour cette destination
        const calculatedDates = this.calculateDestinationDates(
            currentItinerary.destinations.slice(0, destinationIndex), // Destinations précédentes
            currentItinerary.startDate,
            updatedDestination.duration,
            updatedDestination // Passer la destination actuelle pour son transport
        );
        
        updatedDestination.arrivalDate = calculatedDates.arrivalDate;
        updatedDestination.departureDate = calculatedDates.departureDate;
        currentItinerary.destinations[destinationIndex] = updatedDestination;

        // Si la durée a changé, recalculer les dates des destinations suivantes
        const hasDurationChanged = updates.duration && JSON.stringify(currentDestination.duration) !== JSON.stringify(updates.duration);
        
        if (hasDurationChanged && destinationIndex < currentItinerary.destinations.length - 1) {
            // Recalculer les dates de toutes les destinations suivantes
            for (let i = destinationIndex + 1; i < currentItinerary.destinations.length; i++) {
                const nextDestination = currentItinerary.destinations[i];
                const prevDestination = currentItinerary.destinations[i - 1];
                
                // Date d'arrivée = date de départ de la destination précédente + temps de transport
                const prevDeparture = window.DateService.isoStringToDate(prevDestination.departureDate);
                const daysToAdd = window.distanceService.calculateArrivalDayOffset(prevDestination.transportation);
                
                const newArrivalDate = new Date(prevDeparture);
                newArrivalDate.setDate(newArrivalDate.getDate() + daysToAdd);
                nextDestination.arrivalDate = window.DateService.dateToISOString(newArrivalDate).split('T')[0];
                
                // Recalculer la date de départ
                const departureDate = window.DateService.isoStringToDate(nextDestination.arrivalDate);
                const durationInDays = window.extractDurationInDays(nextDestination.duration);
                
                const newDepartureDate = new Date(departureDate);
                newDepartureDate.setDate(newDepartureDate.getDate() + durationInDays - 1);
                nextDestination.departureDate = window.DateService.dateToISOString(newDepartureDate).split('T')[0];
            }
        }

        await this.db.itineraries.update(currentItinerary.id, {
            destinations: currentItinerary.destinations,
            updatedAt_string: window.DateService.todayISOString()
        });
        
        // Émettre événement pour sync de l'itinéraire
        this.emit('itinerary:updated', currentItinerary);
        
        // Si c'était une destination temporaire, supprimer sa card avant le rechargement
        if (destinationId === 'temp_destination') {
            const tempCard = document.querySelector('[data-temp-destination="true"]');
            if (tempCard) {
                tempCard.remove();
            }
        }
        
        // Recharger la liste des destinations
        if (window.Destinations && window.Destinations.loadDestinations) {
            await window.Destinations.loadDestinations();
        }
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
            ? window.DateService.isoStringToDate(currentItinerary.startDate) 
            : window.DateService.isoStringToDate(window.DateService.todayISOString());

        for (let i = 0; i < reorderedDestinations.length; i++) {
            const destination = reorderedDestinations[i];
            
            // Première destination : date de début de l'itinéraire
            if (i === 0) {
                destination.arrivalDate = window.DateService.dateToISOString(currentDate).split('T')[0];
            } else {
                // Destinations suivantes : date de départ de la précédente + temps de transport
                const prevDestination = reorderedDestinations[i - 1];
                const prevDeparture = window.DateService.isoStringToDate(prevDestination.departureDate);
                
                // Calculer le décalage selon le type et durée du transport
                const daysToAdd = window.distanceService.calculateArrivalDayOffset(prevDestination.transportation);
                
                // Créer une copie pour éviter de modifier l'original
                const newArrivalDate = new Date(prevDeparture);
                newArrivalDate.setDate(newArrivalDate.getDate() + daysToAdd);
                destination.arrivalDate = window.DateService.dateToISOString(newArrivalDate).split('T')[0];
            }

            // Recalculer la date de départ
            const departureDate = window.DateService.isoStringToDate(destination.arrivalDate);
            const durationInDays = window.extractDurationInDays(destination.duration);
            
            // Créer une copie pour éviter de modifier l'original
            const newDepartureDate = new Date(departureDate);
            newDepartureDate.setDate(newDepartureDate.getDate() + durationInDays - 1);
            destination.departureDate = window.DateService.dateToISOString(newDepartureDate).split('T')[0];
        }

        // Mettre à jour l'itinéraire
        currentItinerary.destinations = reorderedDestinations;
        
        await this.db.itineraries.update(currentItinerary.id, {
            destinations: currentItinerary.destinations,
            updatedAt_string: window.DateService.todayISOString()
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
            // Récupérer la date de début de l'itinéraire
            let currentDate = currentItinerary.startDate && window.DateService.isValidDate(currentItinerary.startDate)
                ? window.DateService.dateToISOString(window.DateService.isoStringToDate(currentItinerary.startDate)).split('T')[0] 
                : window.DateService.todayISOString().split('T')[0];

            for (let i = 0; i < currentItinerary.destinations.length; i++) {
                const destination = currentItinerary.destinations[i];
                
                // Première destination : date de début de l'itinéraire
                if (i === 0) {
                    destination.arrivalDate = currentDate;
                } else {
                    // Destinations suivantes : date de départ de la précédente + temps de transport
                    const prevDestination = currentItinerary.destinations[i - 1];
                    const prevDeparture = window.DateService.isoStringToDate(prevDestination.departureDate);
                    
                    // Calculer le décalage selon le type et durée du transport
                    const daysToAdd = window.distanceService.calculateArrivalDayOffset(prevDestination.transportation);
                    
                    // Créer une copie pour éviter de modifier l'original
                    const newArrivalDate = new Date(prevDeparture);
                    newArrivalDate.setDate(newArrivalDate.getDate() + daysToAdd);
                    destination.arrivalDate = window.DateService.dateToISOString(newArrivalDate).split('T')[0];
                }

                // Recalculer la date de départ
                const departureDate = window.DateService.isoStringToDate(destination.arrivalDate);
                const durationInDays = window.extractDurationInDays(destination.duration);
                
                // Créer une copie pour éviter de modifier l'original
                const newDepartureDate = new Date(departureDate);
                newDepartureDate.setDate(newDepartureDate.getDate() + durationInDays - 1);
                destination.departureDate = window.DateService.dateToISOString(newDepartureDate).split('T')[0];
            }
        }

        await this.db.itineraries.update(currentItinerary.id, {
            destinations: currentItinerary.destinations,
            updatedAt_string: window.DateService.todayISOString()
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
    async deleteActivity(activityId, destinationId) {
        if (!this.isInitialized) throw new Error('LocalStorage non initialisé');

        const currentItinerary = await this.getCurrentItinerary();
        if (!currentItinerary) throw new Error('Aucun itinéraire actif');

        const destinationIndex = currentItinerary.destinations.findIndex(d => d.id === destinationId);
        if (destinationIndex === -1) throw new Error('Destination non trouvée');

        // Supprimer l'activité de la destination
        const destination = currentItinerary.destinations[destinationIndex];
        destination.activities = (destination.activities || []).filter(a => a.id !== activityId);
        
        await this.db.itineraries.update(currentItinerary.id, {
            destinations: currentItinerary.destinations,
            updatedAt_string: window.DateService.todayISOString()
        });
        
        // Émettre événement pour sync de l'itinéraire
        this.emit('itinerary:updated', currentItinerary);
        
        console.log('✅ Activité supprimée:', activityId);
    }

    // ========================================
    // FIN - Plus de méthodes de synchronisation basées sur isSync
    // ========================================

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
                    updatedAt_string: window.DateService.todayISOString()
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
