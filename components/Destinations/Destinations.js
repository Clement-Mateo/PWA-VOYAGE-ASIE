/**
 * Composant Destinations - Module Pattern
 * Gère le bandeau des destinations avec édition
 * Architecture modulaire avec fichiers séparés
 */

const Destinations = {
    isSaving: false, // État de sauvegarde pour éviter les clics multiples
    isDeleting: false, // État de suppression pour éviter les clics multiples
    isReordering: false, // État de réorganisation pour éviter les doubles appels
    eventListenersInitialized: false, // Flag pour éviter d'initialiser les écouteurs plusieurs fois
    
    /**
     * Obtenir ou créer le panneau
     */
    getPanel() {
        return document.querySelector('#sidebar-destinations-content #destinationsPanel');
    },
    
    /**
     * Créer le panneau HTML (sans header)
     */
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'destinationsPanel';
        panel.className = 'destinations-panel';
        
        // Plus de header - géré par la sidebar
        
        // Créer la liste des destinations
        const list = document.createElement('div');
        list.className = 'destinations-list';
        panel.appendChild(list);
        
        return panel;
    },
    
    /**
     * Masquer le panneau
     */
    hide() {
        this.isVisible = false;
        // Annuler toute création en cours lors de la fermeture
        Destination.cancelCreation();
        this.updatePanelVisibility();
    },
    
    /**
     * Afficher le panneau
     */
    show() {
        this.isVisible = true;
        this.updatePanelVisibility();
    },

    /**
     * Créer une card de destination
     */
    createDestinationCard(destination) {
        
        const card = document.createElement('div');
        card.className = 'destination-card';
        card.id = `destination-${destination.id}`; // Utiliser l'ID de la destination
        
        // Ajouter la classe 'editing' si c'est une destination temporaire
        if (destination.id === 'temp_destination') {
            card.classList.add('editing');
        } else {
            // Rendre draggable seulement si la destination existe et n'est pas temporaire
            card.draggable = true;
            card.classList.add('draggable');
        }
        
        const duration = destination.duration || { days: 0, hours: 0, minutes: 0 };
        const durationText = window.formatDuration(duration, true);
                
        card.innerHTML = `
            <div class="destination-header flex-between">
                <h3 class="destination-title">${destination.name || 'Nouvelle destination'}</h3>
                <div class="destination-actions">
                    ${destination.id !== 'temp_destination' ? `
                        <button class="btn-location" onclick="Destination.zoomToDestination('${destination.id}')" title="Localiser sur la carte">
                            <span class="material-icons">place</span>
                        </button>
                        <button class="btn-edit" onclick="Destination.editDestination('${destination.id}')">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn-delete" onclick="Destinations.deleteDestination('${destination.id}')">
                            <span class="material-icons">delete</span>
                        </button>
                        ${destination.activities && destination.activities.length > 0 ? `
                        <button class="btn-activities" onclick="Activities.showActivitiesPopup('${destination.id}')" title="Voir les activités">
                            <span class="material-icons">attractions</span>
                        </button>
                    ` : `
                        <button class="btn-add-activity" onclick="Activities.addActivity('${destination.id}')" title="Ajouter une activité">
                            <span class="material-icons">add</span>
                        </button>
                    `}
                    ` : ''}
                </div>
            </div>
            <div class="destination-address">${destination.address ? destination.address.address : 'Adresse non définie'}</div>
            <div class="destination-duration">${durationText || "Aucune durée"}</div>
            
            <!-- Afficher les dates calculées -->
            ${destination.arrivalDate && destination.departureDate ? `
                <div class="destination-dates">
                    <div class="date-item">
                        <span class="material-icons">event</span>
                        <span class="date-label">Arrivée:</span>
                        <span class="date-value">${window.DateService.formatDateForDisplay(destination.arrivalDate)}</span>
                    </div>
                    <div class="date-item">
                        <span class="material-icons">event</span>
                        <span class="date-label">Départ:</span>
                        <span class="date-value">${window.DateService.formatDateForDisplay(destination.departureDate)}</span>
                    </div>
                </div>
            ` : ''}
            
            <!-- Afficher les notes si présentes -->
            ${destination.notes && destination.notes.trim() ? `
                <div class="destination-notes">${destination.notes.replace(/\n/g, '<br>')}</div>
            ` : ''}
            
            <!-- Afficher les liens si présents -->
            ${destination.links && destination.links.length > 0 ? `
                <div class="links-list">
                    ${destination.links.map(link => LinksService.createLinkCard(link, true)).join('')}
                </div>
            ` : ''}
            
            <!-- Formulaire d'édition -->
            <div class="destination-form" id="form-${destination.id}">
                <div class="form-group full-width">
                    <label class="form-label">Nom de la destination</label>
                    <input type="text" class="form-input" id="name-${destination.id}" value="${destination.name || ''}" placeholder="Nom de la destination">
                </div>
                <div class="form-group full-width">
                    <label class="form-label">Adresse</label>
                    <div class="address-input-container flex-center" onclick="Destination.openAddressSearch('${destination.id}', event)">
                        <input type="text" class="form-input address-input" id="address-${destination.id}" value="${destination.address ? destination.address.address : ''}" placeholder="Adresse" readonly>
                        <button class="btn-icon address-search-btn">
                            <span class="material-icons">search</span>
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Durée</label>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <input type="number" class="form-input" id="days-${destination.id}" value="${duration.days || 0}" min="0" style="flex: 1;" onchange="Destination.validateDurationInput('${destination.id}', 'days')">
                        <span style="font-size: 12px; color: var(--gray-light); min-width: 12px;">j</span>
                        <input type="number" class="form-input" id="hours-${destination.id}" value="${duration.hours || 0}" min="0" style="flex: 1;" onchange="Destination.validateDurationInput('${destination.id}', 'hours')">
                        <span style="font-size: 12px; color: var(--gray-light); min-width: 12px;">h</span>
                        <input type="number" class="form-input" id="minutes-${destination.id}" value="${duration.minutes || 0}" min="0" style="flex: 1;" onchange="Destination.validateDurationInput('${destination.id}', 'minutes')">
                        <span style="font-size: 12px; color: var(--gray-light); min-width: 12px;">m</span>
                    </div>
                </div>
                <div class="form-group full-width">
                    <label class="form-label">Notes</label>
                    <textarea class="form-input" id="notes-${destination.id}" placeholder="Ajouter des notes ou remarques..." rows="3">${destination.notes || ''}</textarea>
                </div>
                
                <!-- Section des liens -->
                <div class="form-group full-width">
                    <div class="links-header flex-between">
                        <label class="form-label">Liens utiles</label>
                        <button class="btn-add-link" onclick="LinksService.openModal('${destination.id}')" title="Ajouter un lien">
                            <span class="material-icons">add_link</span> Ajouter un lien
                        </button>
                    </div>
                    <div class="links-list" id="links-${destination.id}">
                        ${destination.links ? destination.links.map(link => LinksService.createLinkCard(link)).join('') : ''}
                    </div>
                </div>
                <div class="form-actions flex-center">
                    <button class="btn-save" onclick="Destination.saveDestination('${destination.id}')"><span class="material-icons">save</span> Enregistrer</button>
                    <button class="btn-cancel" onclick="Destination.cancelEdit('${destination.id}')"><span class="material-icons">close</span> Annuler</button>
                </div>
            </div>
        `;
        
        // Ajouter les écouteurs d'événements pour le drag & drop
        this.addDragAndDropEvents(card, destination.id);
        
        return card;
    },

    /**
     * Supprimer une destination
     */
    async deleteDestination(destinationId) {
        const destinationsBefore = await window.localStorageService.getDestinationsOfCurrentItinerary();
        const destination = destinationsBefore.find(d => d.id === destinationId);
        
        if (!destination) {
            console.error('❌ Destination non trouvée avec l\'ID', destinationId);
            return;
        }

        this.scrollToDestination(destinationId);
        
        if (this.isDeleting) {
            return;
        }

        this.isDeleting = true;

        const deleteButton = document.querySelector(`#destination-${destinationId} .btn-delete`);
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<svg class="loading-spinner-small" viewBox="0 0 24 24" style="overflow: visible;"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--error-red)" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416 31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dashoffset" from="31.416" to="0" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>';
        }
        
        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        const updatedDestination = destinations.find(d => d.id === destination.id);
        
        if (!updatedDestination) {
            console.error('❌ Destination non trouvée après cancelCreation');
            this.isDeleting = false;
            return;
        }

        if (!updatedDestination.id) {
            const card = document.getElementById(`destination-${destinationId}`);
            if (card) {
                card.remove();
            }
            this.updateAddDestinationButtonVisibility();
            this.isDeleting = false;
            return;
        }

        try {
            // Utiliser localStorageService pour supprimer la destination
            await window.localStorageService.deleteDestination(destination.id);
            
            console.log('✅ Destination supprimée');
            await this.loadDestinations();
            
            if (window.MapInstance && window.MapInstance.cleanMap) {
                window.MapInstance.cleanMap();
            }

            // Mettre à jour les ordres des destinations suivantes
            await this.updateOrdersAfterDeletion(destination.order);
            
            // Recalculer les transports après suppression
            await this.recalculateTransportsAfterDeletion(destination.order);
            
            // Nettoyer le transport de la nouvelle première destination si nécessaire
            if (window.Destinations && window.Destinations.cleanFirstDestinationTransport) {
                await window.Destinations.cleanFirstDestinationTransport();
            }
            
        } catch (error) {
            console.error('❌ Erreur suppression destination:', error);
            window.showErrorSnackBar('Erreur lors de la suppression de la destination: ' + error.message);
        } finally {
            // Réactiver le bouton
            if (deleteButton) {
                deleteButton.disabled = false;
                deleteButton.innerHTML = '<span class="material-icons">delete</span>';
            }

            // Marquer comme terminé
            this.isDeleting = false;
        }
    },

    /**
     * Mettre à jour les ordres après suppression d'une destination
     */
    async updateOrdersAfterDeletion(deletedOrder) {
        try {
            // Récupérer l'itinéraire actuel depuis IndexedDB
            const itineraries = await window.localStorageService.getItineraries();
            if (itineraries.length === 0) {
                console.error('❌ Aucun itinéraire trouvé');
                return;
            }

            const currentItinerary = await window.localStorageService.getCurrentItinerary();
            const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
            
            // Mettre à jour les ordres : toutes les destinations après la supprimée voient leur order diminué de 1
            destinations.forEach(destination => {
                if (destination.order > deletedOrder) {
                    destination.order = destination.order - 1;
                }
            });

            // Sauvegarder l'itinéraire mis à jour
            await window.firebaseService.updateItinerary(currentItinerary);
            console.log('✅ Ordres mis à jour après suppression');
            
        } catch (error) {
            console.error('❌ Erreur mise à jour des ordres après suppression:', error);
        }
    },

    /**
     * Obtenir l'élément après lequel glisser
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.destination-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    /**
     * Nettoyer les transports des destinations en première position
     * La première destination (order = 0) ne doit pas avoir de transport
     */
    async cleanFirstDestinationTransport() {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        
        for (const destination of destinations) {
            // Si c'est la première destination (order = 0) et qu'elle a un transport
            if (destination.order === 0 && destination.transportation) {
                console.log(`🧹 Suppression du transport de la première destination: ${destination.name}`);
                
                // Mettre à jour la destination sans transport (supprimer la propriété)
                const updatedDestination = { ...destination };
                delete updatedDestination.transportation;
                
                await window.localStorageService.updateDestination(destination.id, updatedDestination);
                hasChanges = true;
            }
        }
        
        console.log('✅ Nettoyage des transports de première destination terminé');
    },

    /**
     * Réorganiser les destinations
     */
    async reorderDestinations(draggedId, targetId) {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        const draggedDestination = destinations.find(d => d.id === draggedId);
        const targetDestination = destinations.find(d => d.id === targetId);
        
        if (!draggedDestination || !targetDestination) {
            console.error('❌ Destinations non trouvées pour la réorganisation');
            return;
        }
        
        try {
            // Récupérer les ordres actuels
            const draggedOrder = draggedDestination.order || 0;
            const targetOrder = targetDestination.order || 0;
            
            console.log('🔄 Réorganisation:', { draggedId, targetId, draggedOrder, targetOrder });
            
            // Si même ordre, rien à faire
            if (draggedOrder === targetOrder) {
                return;
            }
            
            // Mettre à jour les ordres de toutes les destinations
            destinations.forEach(destination => {
                const currentOrder = destination.order || 0;
                
                if (currentOrder === draggedOrder) {
                    // La destination déplacée prend l'ordre de la cible
                    destination.order = targetOrder;
                } else if (draggedOrder < targetOrder) {
                    // Déplacement vers le bas : incrémenter les destinations entre
                    if (currentOrder > draggedOrder && currentOrder <= targetOrder) {
                        destination.order = currentOrder - 1;
                    }
                } else {
                    // Déplacement vers le haut : décrémenter les destinations entre
                    if (currentOrder >= targetOrder && currentOrder < draggedOrder) {
                        destination.order = currentOrder + 1;
                    }
                }
            });
            
            // Sauvegarder toutes les destinations mises à jour
            for (const destination of destinations) {
                await window.localStorageService.updateDestination(destination.id, destination);
            }
            
            console.log('✅ Destinations réorganisées avec succès');
            
            // Recalculer les transports affectés par le réorganisation
            await this.recalculateTransportsAfterReorder(destinations, draggedOrder, targetOrder);
            
            // Recharger l'affichage
            await this.loadDestinations();
            
            // Nettoyer le transport de la nouvelle première destination si nécessaire
            if (window.Destinations && window.Destinations.cleanFirstDestinationTransport) {
                await window.Destinations.cleanFirstDestinationTransport();
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la réorganisation des destinations:', error);
        }
    },

    /**
     * Mettre à jour les ordres après suppression d'une destination
     */
    async updateOrdersAfterDeletion(deletedOrder) {
        try {
            const currentItinerary = await window.localStorageService.getCurrentItinerary();
            if (!currentItinerary) {
                console.error('❌ Aucun itinéraire trouvé');
                return;
            }

            const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
            
            // Mettre à jour les ordres : toutes les destinations après la supprimée voient leur order diminué de 1
            destinations.forEach(dest => {
                if (dest.order > deletedOrder) {
                    dest.order = dest.order - 1;
                }
            });

            // Sauvegarder les changements via localStorage (qui déclenchera la sync)
            await window.localStorageService.updateItinerary(currentItinerary.id, {
                destinations: destinations
            });
            console.log('✅ Ordres mis à jour après suppression');
            
        } catch (error) {
            console.error('❌ Erreur mise à jour ordres après suppression:', error);
        }
    },

    /**
     * Rafraîchir la liste des destinations
     */
    async refreshDestinationsList() {
        if (window.localStorageService) {
            const currentItinerary = await window.localStorageService.getCurrentItinerary();
            if (currentItinerary) {
                this.getPanel();
                this.render();
            }
        }
    },

    /**
     * Mettre à jour la visibilité du bouton "Ajouter une destination"
     */
    async updateAddDestinationButtonVisibility() {
        const addButton = document.querySelector('.sidebar-footer .btn-add');
        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        const lastDestination = destinations[destinations.length - 1];
        
        
        if (addButton) {
            // Le bouton doit être visible si :
            // - L'utilisateur est en ligne (pour la géocodification)
            // - ET il n'y a aucune destination
            // - OU la dernière destination n'a pas l'ID temporaire (elle est complètement sauvegardée)
            const isOnline = navigator.onLine;
            const shouldEnable = isOnline && (destinations.length === 0 || (lastDestination && lastDestination.id !== 'temp_destination'));
            
            if (shouldEnable) {
                addButton.disabled = false;
            } else {
                addButton.disabled = true;
            }
            
            // Ajouter un indicateur visuel si hors ligne
            if (!isOnline) {
                addButton.title = "Ajout de destination indisponible en mode hors ligne (géocodification requise)";
            } else {
                addButton.title = "Ajouter une destination";
            }
        } else {
            console.log('erreur updateAddDestinationButtonVisibility -> bouton sidebar footer non trouvé');
        }
    },

    /**
     * Afficher les destinations
     */
    async render() {
        // Obtenir ou créer le panneau destinations
        const panel = this.getPanel();
        if (!panel) {
            console.error('❌ Panneau destinations non trouvé');
            return;
        }
        
        // Trouver le conteneur de liste dans le panneau
        let container = panel.querySelector('.destinations-list');
        if (!container) {
            container = document.createElement('div');
            container.className = 'destinations-list';
            panel.appendChild(container);
        }
        
        container.innerHTML = '';

        // Pas de bouton ajouter ici - il est dans le sidebar footer
        
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        if (destinations.length === 0) {
            // Contenu vide - le bouton ajouter est dans le footer
        } else {
            // Trier les destinations par order
            const sortedDestinations = [...destinations].sort((a, b) => {
                const orderA = a.order || 0;
                const orderB = b.order || 0;
                return orderA - orderB;
            });
            
            console.log('🔄 Début du traitement des destinations, nombre:', sortedDestinations.length);
            sortedDestinations.forEach(async (destination, sortedIndex) => {
                console.log(`📍 Traitement destination ${sortedIndex}: ${destination.name}, transport existant:`, !!destination.transportation);
                // Ajouter un connecteur pointillé si ce n'est pas la première destination
                if (sortedIndex > 0) {
                    const connector = document.createElement('div');
                    connector.className = 'destination-connector';
                    
                    // Le transport est maintenant calculé dans updateDestination
                    const transportation = destination.transportation;
                    
                    const transportCard = Transportation.createTransportationCard(transportation, destination.id);
                    if (transportation.notes && transportation.notes.trim()) {                        
                        // Calculer le nombre de lignes dans les notes
                        const noteLines = transportation.notes.split('\n').filter(line => line.trim()).length;
                        const extraMargin = (noteLines - 1) * 10; // 10px par ligne supplémentaire
                        const totalMargin = 25 + extraMargin; // 25px de base + extra
                        
                        // Appliquer les marges dynamiques
                        connector.style.marginTop = `${totalMargin}px`;
                        connector.style.marginBottom = `${totalMargin}px`;
                    }
                    connector.appendChild(transportCard);
                    container.appendChild(connector);
                }
                
                const card = this.createDestinationCard(destination);
                container.appendChild(card);
                
                // Réactiver le drag & drop sur les cartes existantes (si la dernière destination a un ID)
                const lastDestination = destinations[destinations.length - 1];
                if (!lastDestination || lastDestination.id) {
                    await this.addDragAndDropEvents(card, destination.id);
                }
            });
            // Pas de bouton ajouter ici - il est dans le sidebar footer
        }
        
        // Mettre à jour la visibilité du bouton "Ajouter"
        await this.updateAddDestinationButtonVisibility();
    },

    /**
     * Afficher le formulaire d'ajout
     */
    async showAddForm() {
        // Masquer tous les formulaires d'édition
        document.querySelectorAll('.destination-form.show').forEach(f => {
            f.classList.remove('show');
        });
        document.querySelectorAll('.destination-card.editing').forEach(c => {
            c.classList.remove('editing');
        });

        // Créer une destination vide pour l'ajout
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        const destinationData = {
            name: '',
            address: '',
            duration: { days: 3, hours: 0, minutes: 0 },
            order: destinations.length // Order = position dans la liste
        };

        // Ajouter la nouvelle destination avec ID temporaire
        let newDestination;
        if (currentItinerary) {
            newDestination = await window.localStorageService.createDestination(destinationData);
        }

        // Créer la card pour la nouvelle destination
        const card = this.createDestinationCard(newDestination);
        card.classList.add('editing');
        
        // Ajouter un attribut pour identifier la destination temporaire
        if (newDestination.id === 'temp_destination') {
            card.setAttribute('data-temp-destination', 'true');
        }

        // Trouver où insérer la card (panneau principal ou sidebar)
        let list, addButton;
        
        // Essayer d'abord le panneau principal
        const panel = this.getPanel();
        if (panel) {
            list = panel.querySelector('.destinations-list');
        }
        
        // Si le panneau principal n'existe pas, essayer la sidebar
        if (!list || !addButton) {
            const container = document.getElementById('sidebar-destinations-content');
            if (container) {
                const destinationsPanel = container.querySelector('.destinations-panel');
                if (destinationsPanel) {
                    list = destinationsPanel.querySelector('.destinations-list');
                }
            }
        }
        
        // Ajouter la carte à la fin de la liste
        list.appendChild(card);
        
        // Ouvrir automatiquement le formulaire
        const form = document.getElementById(`form-${newDestination.id}`);
        if (form) {
            form.classList.add('show');
            
            // Focus automatique sur le champ nom
            setTimeout(() => {
                const nameInput = document.getElementById(`name-${newDestination.id}`);
                if (nameInput) {
                    nameInput.focus();
                    nameInput.select();
                }
            }, 100);
        }

        // Mettre à jour la visibilité du bouton "Ajouter"
        await this.updateAddDestinationButtonVisibility();
        
        // Scroller vers la nouvelle destination
        setTimeout(() => {
            this.scrollToDestination(newDestination.id);
        }, 100);
    },

    /**
     * Faire défiler jusqu'à une destination
     */
    scrollToDestination(destinationId) {
        const card = document.getElementById(`destination-${destinationId}`);
        if (card) {
            // Attendre un peu que le panneau soit visible
            setTimeout(() => {
                card.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 350);
        }
    },

    /**
     * Charger les destinations (version corrigée comme l'ancien système)
     */
    async loadDestinations() {
        try {
            // Éviter les chargements multiples
            if (this.isLoading) {
                return;
            }
            
            this.isLoading = true;
            
            // Initialiser les écouteurs d'événements (première fois seulement)
            if (!this.eventListenersInitialized) {
                // Écouter les mises à jour d'itinéraires pour recharger les destinations
                window.addEventListener('itinerary:updated', (event) => {
                    if (!this.isLoading) {
                        this.loadDestinations();
                    }
                });
                
                // Écouter les changements d'itinéraire actif
                window.addEventListener('itinerary:activated', (event) => {
                    this.loadDestinations();
                });
                
                this.eventListenersInitialized = true;
            }
            
            // S'assurer que le panneau existe avant de faire le rendu
            this.getPanel();
            await this.render();

            // Afficher les destinations sur la carte
            if (window.MapInstance && window.MapInstance.displayDestinations) {
                window.MapInstance.displayDestinations();
            }

        } catch (error) {
            console.error('❌ Erreur chargement destinations:', error);
            await this.render();
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Mettre à jour la visibilité du panneau
     */
    updatePanelVisibility() {
        const panel = this.getPanel();
        if (this.isVisible) {
            panel.classList.add('show');
        } else {
            panel.classList.remove('show');
        }
    },


    /**
     * Ajouter les événements drag and drop à une card
     */
    async addDragAndDropEvents(card, destinationId) {
        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        const destination = destinations.find(d => d.id === destinationId);
        
        // Si la destination n'existe pas ou si la dernière destination n'a pas d'ID, ne pas ajouter drag & drop
        const lastDestination = destinations[destinations.length - 1];
        if (!destination || !destination.id || (lastDestination && !lastDestination.id)) return;
        
        card.addEventListener('dragstart', (e) => {
            // Désactiver le drag si une destination est en édition
            const editingCard = document.querySelector('.destination-card.editing');
            if (editingCard) {
                e.preventDefault();
                return;
            }
            
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', card.innerHTML);
            
            // Stocker l'ID de la destination déplacée
            this.draggedId = destinationId;
        });
        
        card.addEventListener('dragend', (e) => {
            card.classList.remove('dragging');
        });
        
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            card.classList.add('drag-over');
        });
        
        card.addEventListener('dragleave', (e) => {
            card.classList.remove('drag-over');
        });
        
        card.addEventListener('drop', (e) => {
            // Désactiver le drop si une destination est en édition
            const editingCard = document.querySelector('.destination-card.editing');
            if (editingCard) {
                e.preventDefault();
                return;
            }
            
            e.preventDefault();
            card.classList.remove('drag-over');
            
            // Trouver l'ID de la destination cible
            const targetCard = e.currentTarget;
            const targetId = this.getDestinationIdFromCard(targetCard);
            
            if (this.draggedId && this.draggedId !== targetId && !this.isReordering) {
                this.isReordering = true;
                this.reorderDestinations(this.draggedId, targetId).finally(() => {
                    this.isReordering = false;
                });
            }
        });
    },

    /**
     * Obtenir l'ID de la destination depuis une card DOM
     */
    getDestinationIdFromCard(card) {
        // L'ID de la destination est directement dans l'ID de la card
        return card.id.replace('destination-', '');
    },

    /**
     * Gérer le début du drag
     */
    handleDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
        e.target.classList.add('dragging');
    },

    /**
     * Gérer la fin du drag
     */
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    },

    /**
     * Gérer le survol pendant le drag
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    /**
     * Recalculer les transports affectés par une réorganisation
     */
    async recalculateTransportsAfterReorder(destinations, draggedOrder, targetOrder) {
        console.log('🔄 Recalcul des transports après réorganisation');
        
        // Trier les destinations par ordre pour travailler avec la nouvelle séquence
        const sortedDestinations = [...destinations].sort((a, b) => {
            const orderA = a.order || 0;
            const orderB = b.order || 0;
            return orderA - orderB;
        });

        // Déterminer quelles destinations ont besoin d'un recalcul
        const affectedOrders = new Set();
        
        // Pour un drag & drop, toutes les destinations dont les voisins changent sont affectées
        // La destination déplacée affecte sa nouvelle position
        affectedOrders.add(targetOrder);
        if (targetOrder > 0) affectedOrders.add(targetOrder - 1);
        
        // L'ancienne position affecte aussi les destinations restantes
        affectedOrders.add(draggedOrder);
        if (draggedOrder > 0) affectedOrders.add(draggedOrder - 1);
        
        // Si on déplace vers le bas, il faut aussi affecter la destination qui suit l'ancienne position
        if (draggedOrder < targetOrder) {
            affectedOrders.add(draggedOrder + 1);
        }
        // Si on déplace vers le haut, il faut affecter la destination qui suit la nouvelle position
        else if (targetOrder < draggedOrder) {
            affectedOrders.add(targetOrder + 1);
        }

        console.log('🎯 Ordres affectés:', Array.from(affectedOrders));

        // Recalculer les transports pour les destinations affectées
        for (let i = 0; i < sortedDestinations.length; i++) {
            const destination = sortedDestinations[i];
            const currentOrder = destination.order || 0;
            
            // Si cette destination est affectée et n'est pas la première
            if (affectedOrders.has(currentOrder) && i > 0) {
                const previousDestination = sortedDestinations[i - 1];
                
                if (previousDestination && previousDestination.address?.location?.lat && 
                    previousDestination.address?.location?.lng && 
                    destination.address?.location?.lat && 
                    destination.address?.location?.lng) {
                    
                    try {
                        console.log(`🔄 Recalcul transport pour ${destination.name} (ordre ${currentOrder})`);
                        
                        const prevCoords = [
                            previousDestination.address.location.lat, 
                            previousDestination.address.location.lng
                        ];
                        const coords = [
                            destination.address.location.lat, 
                            destination.address.location.lng
                        ];
                        
                        // Calculer le nouveau transport
                        const newTransport = await window.distanceService.determineDefaultTransport(
                            prevCoords[0], prevCoords[1],
                            coords[0], coords[1]
                        );
                        
                        // Mettre à jour le transport de la destination
                        const updatedDestination = {
                            ...destination,
                            transportation: {
                                type: newTransport.type,
                                cost: destination.transportation?.cost || 0,
                                duration: newTransport.duration,
                                distance: newTransport.distance,
                                isStraightLine: newTransport.isStraightLine,
                                notes: destination.transportation?.notes || null
                            }
                        };
                        
                        await window.localStorageService.updateDestination(destination.id, updatedDestination);
                        console.log(`✅ Transport mis à jour pour ${destination.name}: ${newTransport.type} - ${newTransport.distance}km`);
                        
                    } catch (error) {
                        console.error(`❌ Erreur recalcul transport pour ${destination.name}:`, error);
                    }
                }
            }
        }
        
        console.log('✅ Recalcul des transports terminé');
    },

    /**
     * Recalculer les transports après suppression d'une destination
     */
    async recalculateTransportsAfterDeletion(deletedOrder) {
        console.log('🔄 Recalcul des transports après suppression de la destination d\'ordre', deletedOrder);
        
        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        const sortedDestinations = [...destinations].sort((a, b) => {
            const orderA = a.order || 0;
            const orderB = b.order || 0;
            return orderA - orderB;
        });

        // Les destinations dont l'ordre a changé (celles qui suivaient la destination supprimée)
        for (let i = 0; i < sortedDestinations.length; i++) {
            const destination = sortedDestinations[i];
            const currentOrder = destination.order || 0;
            
            // Si cette destination n'est pas la première et que son ordre a changé
            if (i > 0 && currentOrder >= deletedOrder) {
                const previousDestination = sortedDestinations[i - 1];
                
                if (previousDestination && previousDestination.address?.location?.lat && 
                    previousDestination.address?.location?.lng && 
                    destination.address?.location?.lat && 
                    destination.address?.location?.lng) {
                    
                    try {
                        console.log(`🔄 Recalcul transport pour ${destination.name} (ordre ${currentOrder}) après suppression`);
                        
                        const prevCoords = [
                            previousDestination.address.location.lat, 
                            previousDestination.address.location.lng
                        ];
                        const coords = [
                            destination.address.location.lat, 
                            destination.address.location.lng
                        ];
                        
                        // Calculer le nouveau transport
                        const newTransport = await window.distanceService.determineDefaultTransport(
                            prevCoords[0], prevCoords[1],
                            coords[0], coords[1]
                        );
                        
                        // Mettre à jour le transport de la destination
                        const updatedDestination = {
                            ...destination,
                            transportation: {
                                type: newTransport.type,
                                cost: destination.transportation?.cost || 0,
                                duration: newTransport.duration,
                                distance: newTransport.distance,
                                isStraightLine: newTransport.isStraightLine,
                                notes: destination.transportation?.notes || null
                            }
                        };
                        
                        await window.localStorageService.updateDestination(destination.id, updatedDestination);
                        console.log(`✅ Transport mis à jour pour ${destination.name}: ${newTransport.type} - ${newTransport.distance}km`);
                        
                    } catch (error) {
                        console.error(`❌ Erreur recalcul transport pour ${destination.name}:`, error);
                    }
                }
            }
        }
        
        console.log('✅ Recalcul des transports après suppression terminé');
    }
};

// Exporter pour utilisation globale
window.Destinations = Destinations;
