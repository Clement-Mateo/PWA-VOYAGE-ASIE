/**
 * Composant Destinations - Module Pattern
 * Gère le bandeau des destinations avec édition
 * Architecture modulaire avec fichiers séparés
 */

const Destinations = {
    isSaving: false, // État de sauvegarde pour éviter les clics multiples
    isDeleting: false, // État de suppression pour éviter les clics multiples
    isReordering: false, // État de réorganisation pour éviter les doubles appels
    
    /**
     * Initialiser le composant
     */
    init() {
        // Initialisation silencieuse
    },
    
    /**
     * Obtenir ou créer le panneau
     */
    getPanel() {
        // Chercher d'abord dans la sidebar
        let panel = document.querySelector('#sidebar-destinations-content #destinationsPanel');
        
        // Si toujours pas trouvé, en créer un nouveau
        if (!panel) {
            panel = this.createPanel();
            document.body.appendChild(panel);
        }
        
        return panel;
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
    createDestinationCard(destination, index) {
        
        const card = document.createElement('div');
        card.className = 'destination-card';
        card.id = `destination-${index}`;
        
        // Rendre draggable seulement si la destination existe (destination.id)
        if (destination.id) {
            card.draggable = true;
            card.classList.add('draggable');
        }
        
        // Ajouter la classe 'editing' si c'est une nouvelle destination
        if (!destination.id) {
            card.classList.add('editing');
        }
        
        const duration = destination.duration || { days: 0, hours: 0, minutes: 0 };
        const durationText = Destination.formatDuration(duration);
                
        card.innerHTML = `
            <div class="destination-header flex-between">
                <h3 class="destination-title">${destination.name || 'Nouvelle destination'}</h3>
                <div class="destination-actions">
                    ${destination.id ? `
                        <button class="btn-location" onclick="Destination.zoomToDestination(${index})" title="Localiser sur la carte">
                            <span class="material-icons">my_location</span>
                        </button>
                        <button class="btn-edit" onclick="Destination.editDestination(${index})">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn-delete" onclick="Destinations.deleteDestination(${index})">
                            <span class="material-icons">delete</span>
                        </button>
                        <button class="btn-expand" onclick="Destination.toggleDestinationCard(${index})" title="Déplier">
                            <span class="material-icons">expand_more</span>
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="destination-address">${destination.address ? destination.address.address : 'Adresse non définie'}</div>
            <div class="destination-duration">Durée: ${durationText}</div>
            
            <!-- Formulaire d'édition -->
            <div class="destination-form" id="form-${index}">
                <div class="form-group">
                    <label class="form-label">Nom de la destination</label>
                    <input type="text" class="form-input" id="name-${index}" value="${destination.name || ''}" placeholder="Nom de la destination">
                </div>
                <div class="form-group">
                    <label class="form-label">Adresse</label>
                    <div class="address-input-container flex-center" onclick="Destination.openAddressSearch(${index}, event)">
                        <input type="text" class="form-input address-input" id="address-${index}" value="${destination.address ? destination.address.address : ''}" placeholder="Adresse" readonly>
                        <button class="btn-icon address-search-btn">
                            <span class="material-icons">search</span>
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Durée</label>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <input type="number" class="form-input" id="days-${index}" value="${duration.days || 0}" min="0" style="flex: 1;" onchange="Destination.validateDurationInput(${index}, 'days')">
                        <span style="font-size: 12px; color: var(--gray-light); min-width: 12px;">j</span>
                        <input type="number" class="form-input" id="hours-${index}" value="${duration.hours || 0}" min="0" style="flex: 1;" onchange="Destination.validateDurationInput(${index}, 'hours')">
                        <span style="font-size: 12px; color: var(--gray-light); min-width: 12px;">h</span>
                        <input type="number" class="form-input" id="minutes-${index}" value="${duration.minutes || 0}" min="0" style="flex: 1;" onchange="Destination.validateDurationInput(${index}, 'minutes')">
                        <span style="font-size: 12px; color: var(--gray-light); min-width: 12px;">m</span>
                    </div>
                </div>
                <div class="form-actions flex-center">
                    <button class="btn-save" onclick="Destination.saveDestination(${index})"><span class="material-icons">save</span> Enregistrer</button>
                    <button class="btn-cancel" onclick="Destination.cancelEdit(${index})"><span class="material-icons">close</span> Annuler</button>
                </div>
            </div>
            
            <!-- Section des activités -->
            <div class="destination-activities" id="activities-${index}" style="display: none;">
                <div class="activities-header">
                    <h4>Activités</h4>
                </div>
                <div class="activities-list" id="activities-list-${index}">
                    <!-- Les activités seront chargées ici -->
                </div>
                <button class="btn-add" onclick="Activities.addActivity(${index})" title="Ajouter une activité">
                    <span class="material-icons">add_circle</span>
                    Ajouter une activité
                </button>
            </div>
        `;
        
        // Ajouter les écouteurs d'événements pour le drag & drop
        this.addDragAndDropEvents(card, index);
        
        return card;
    },

    /**
     * Supprimer une destination
     */
    async deleteDestination(index) {
        const destinationsBefore = window.firebaseService.getDestinationsOfCurrentItinerary();
        const destination = destinationsBefore[index];
        
        if (!destination) {
            console.error('❌ Destination non trouvée à l\'index', index);
            return;
        }

        this.scrollToDestination(index);
        
        if (this.isDeleting) {
            return;
        }

        this.isDeleting = true;

        const deleteButton = document.querySelector(`#destination-${index} .btn-delete`);
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<svg class="loading-spinner-small" viewBox="0 0 24 24" style="overflow: visible;"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--error-red)" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416 31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dashoffset" from="31.416" to="0" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>';
        }
        
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        const updatedDestination = destinations.find(d => d.id === destination.id);
        
        if (!updatedDestination) {
            console.error('❌ Destination non trouvée après cancelCreation');
            this.isDeleting = false;
            return;
        }

        if (!updatedDestination.id) {
            const card = document.getElementById(`destination-${index}`);
            if (card) {
                card.remove();
            }
            this.updateAddDestinationButtonVisibility();
            this.isDeleting = false;
            return;
        }

        try {
            // Obtenir l'itinéraire actuel
            const currentItinerary = await window.firebaseService.getCurrentItinerary();
            if (!currentItinerary) {
                console.error('❌ Aucun itinéraire trouvé pour supprimer la destination');
                return;
            }

            // Utiliser firebaseService pour supprimer la destination
            const success = await window.firebaseService.deleteDestination(destination);
            
            if (success) {
                console.log('✅ Destination supprimée');
                await this.loadDestinations();
                
                if (window.MapInstance && window.MapInstance.cleanMap) {
                    window.MapInstance.cleanMap();
                }
            } else {
                console.error('❌ Échec de la suppression de la destination');
            }

            // Mettre à jour les ordres des destinations suivantes
            await this.updateOrdersAfterDeletion(destination.order);
            
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
            // Récupérer l'itinéraire actuel
            const itineraries = window.firebaseService.itineraries;
            if (itineraries.length === 0) {
                console.error('❌ Aucun itinéraire trouvé');
                return;
            }

            const currentItinerary = window.firebaseService.getCurrentItinerary();
            const destinations = currentItinerary.destinations || [];
            
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
     * Réorganiser les destinations
     */
    async reorderDestinations(fromIndex, toIndex) {
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        const draggedDestination = destinations[fromIndex];
        const targetDestination = destinations[toIndex];
        
        if (!draggedDestination.id || !targetDestination.id) {
            return;
        }
        
        try {
            // Récupérer l'itinéraire actuel
            const itineraries = window.firebaseService.itineraries;
            if (itineraries.length === 0) {
                console.error('Impossible de réorganiser: aucun itinéraire trouvé');
                return;
            }
            const currentItinerary = window.firebaseService.getCurrentItinerary();
            
            // Trier les destinations par ordre actuel
            const sortedDestinations = [...currentItinerary.destinations].sort((a, b) => {
                const orderA = a.order || 0;
                const orderB = b.order || 0;
                return orderA - orderB;
            });
            
            // Trouver les positions dans la liste triée
            const draggedPosition = sortedDestinations.findIndex(d => d.id === draggedDestination.id);
            const targetPosition = sortedDestinations.findIndex(d => d.id === targetDestination.id);
            
            // Extraire la destination déplacée
            const [movedDestination] = sortedDestinations.splice(draggedPosition, 1);
            
            // Si on déplace vers le bas, insérer après la cible
            // Si on déplace vers le haut, insérer avant la cible
            if (draggedPosition < targetPosition) {
                // Déplacement vers le bas : insérer après la cible
                sortedDestinations.splice(targetPosition, 0, movedDestination);
            } else {
                // Déplacement vers le haut : insérer avant la cible
                sortedDestinations.splice(targetPosition, 0, movedDestination);
            }
            
            // Réassigner les ordres consécutifs à toutes les destinations
            sortedDestinations.forEach((dest, index) => {
                dest.order = index;
                
                // Gérer les transports selon la position
                if (index === 0) {
                    // Première destination : ne doit pas avoir de transport
                    if (dest.transportation) {
                        console.log(`Suppression du transport pour la première destination: ${dest.name}`);
                        delete dest.transportation;
                    }
                } else {
                    // Destinations suivantes : doivent avoir un transport par défaut si elles n'en ont pas
                    if (!dest.transportation) {
                        console.log(`Ajout du transport par défaut pour la destination #${index}: ${dest.name}`);
                        dest.transportation = {
                            type: 'avion',
                            cost: null,
                            duration: null
                        };
                    }
                    // Si la destination a déjà un transport, on le conserve tel quel
                }
            });
            
            await window.firebaseService.updateItinerary(currentItinerary);
            await this.loadDestinations();
            
            console.log('✅ Destinations réorganisées avec gestion des transports');            
        } catch (error) {
            console.error('❌ Erreur réorganisation destinations:', error);
            if (window.showErrorSnackBar) {
                window.showErrorSnackBar('Erreur lors de la réorganisation.');
            }

            await this.loadDestinations();
        }
        
        this.draggedIndex = undefined;
    },

    /**
     * Mettre à jour les ordres après suppression d'une destination
     */
    async updateOrdersAfterDeletion(deletedOrder) {
        try {
            // Récupérer l'itinéraire actuel
            const itineraries = window.firebaseService.itineraries;
            if (itineraries.length === 0) {
                console.error('❌ Aucun itinéraire trouvé');
                return;
            }

            const currentItinerary = window.firebaseService.getCurrentItinerary();
            const destinations = currentItinerary.destinations || [];
            
            // Mettre à jour les ordres : toutes les destinations après la supprimée voient leur order diminué de 1
            destinations.forEach(dest => {
                if (dest.order > deletedOrder) {
                    dest.order = dest.order - 1;
                }
            });

            // Sauvegarder les changements
            await window.firebaseService.updateItinerary(currentItinerary);
            console.log('✅ Ordres mis à jour après suppression');
            
        } catch (error) {
            console.error('❌ Erreur mise à jour ordres après suppression:', error);
        }
    },

    /**
     * Rafraîchir la liste des destinations
     */
    refreshDestinationsList() {
        if (window.firebaseService && window.firebaseService.loadDestinations) {
            window.firebaseService.loadDestinations();
        }
    },

    /**
     * Mettre à jour la visibilité du bouton "Ajouter une destination"
     */
    updateAddDestinationButtonVisibility() {
        const addButton = document.getElementById('add-destination-btn');
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        const lastDestination = destinations[destinations.length - 1];
        
        if (addButton) {
            // Le bouton doit être visible si :
            // - Il n'y a aucune destination
            // - OU la dernière destination a un ID (elle est complètement sauvegardée)
            const shouldShow = destinations.length === 0 || (lastDestination && lastDestination.id);
            if (shouldShow) {
                addButton.style.display = 'block';
            } else {
                addButton.style.display = 'none';
            }
        } else {
            console.log('erreur updateAddDestinationButtonVisibility -> addButton non trouvé');
        }
    },

    /**
     * Afficher les destinations
     */
    render() {
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

        const addButton = document.createElement('button');
        addButton.className = 'btn-add';
        addButton.id = 'add-destination-btn';
        addButton.onclick = () => this.showAddForm();
        addButton.textContent = 'Ajouter une destination';
        
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        if (destinations.length === 0) {
            container.appendChild(addButton);
        } else {
            // Trier les destinations par order
            const sortedDestinations = [...destinations].sort((a, b) => {
                const orderA = a.order || 0;
                const orderB = b.order || 0;
                return orderA - orderB;
            });
            
            sortedDestinations.forEach((destination, sortedIndex) => {
                // Ajouter une carte de transport si ce n'est pas la première destination
                if (sortedIndex > 0) {
                    const transportation = destination.transportation || {
                        type: 'avion',
                        cost: null,
                        duration: null
                    };
                    const transportCard = Transportation.createTransportationCard(transportation, sortedIndex);
                    container.appendChild(transportCard);
                }
                
                const card = this.createDestinationCard(destination, sortedIndex);
                container.appendChild(card);
                
                // Réactiver le drag & drop sur les cartes existantes (si la dernière destination a un ID)
                const lastDestination = destinations[destinations.length - 1];
                if (!lastDestination || lastDestination.id) {
                    this.addDragAndDropEvents(card, sortedIndex);
                }
            });
            
            container.appendChild(addButton);
        }
        
        // Mettre à jour la visibilité du bouton "Ajouter"
        this.updateAddDestinationButtonVisibility();
    },

    /**
     * Afficher le formulaire d'ajout
     */
    showAddForm() {
        // Masquer tous les formulaires d'édition
        document.querySelectorAll('.destination-form.show').forEach(f => {
            f.classList.remove('show');
        });
        document.querySelectorAll('.destination-card.editing').forEach(c => {
            c.classList.remove('editing');
        });

        // Créer une destination vide pour l'ajout (ajouter à l'itinéraire mais pas sauvegarder en base)
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        const newDestination = {
            name: '',
            address: '',
            duration: { days: 0, hours: 0, minutes: 0 },
            order: destinations.length // Order = position dans la liste
        };

        // Ajouter la nouvelle destination à l'itinéraire courant (sans sauvegarder en base)
        const currentItinerary = window.firebaseService.getCurrentItinerary();
        if (currentItinerary) {
            currentItinerary.destinations.push(newDestination);
        }

        // Créer une card pour la nouvelle destination dans la sidebar
        const panel = this.getPanel();
        if (!panel) {
            console.error('❌ Panneau destinations non trouvé');
            return;
        }

        const list = panel.querySelector('.destinations-list');
        if (!list) {
            console.error('❌ Liste destinations non trouvée');
            return;
        }

        // Trouver le bouton "Ajouter une destination"
        const addButton = document.getElementById('add-destination-btn');
        
        // L'index de la nouvelle destination est le dernier (après ajout)
        const newIndex = currentItinerary.destinations.length - 1;
        const card = this.createDestinationCard(newDestination, newIndex);
        card.classList.add('editing');
        
        list.insertBefore(card, addButton);
        
        // Ouvrir automatiquement le formulaire
        const form = document.getElementById(`form-${newIndex}`);
        if (form) {
            form.classList.add('show');
        }

        // Mettre à jour la visibilité du bouton "Ajouter"
        this.updateAddDestinationButtonVisibility();
        
        // Scroller vers la nouvelle destination
        setTimeout(() => {
            this.scrollToDestination(newIndex);
        }, 100);
    },

    /**
     * Faire défiler jusqu'à une destination
     */
    scrollToDestination(index) {
        const card = document.getElementById(`destination-${index}`);
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
            console.log('🔁 Chargement des destinations...');
            const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
            
            // S'assurer que le panneau existe avant de faire le rendu
            this.getPanel();
            this.render();

            // Afficher les destinations sur la carte
            if (window.MapInstance && window.MapInstance.displayDestinations) {
                window.MapInstance.displayDestinations();
            }

        } catch (error) {
            console.error('❌ Erreur chargement destinations:', error);
            this.render();
        }
    },

    /**
     * Rendre les destinations (méthode manquante de l'ancien système)
     */
    render() {
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

        const addButton = document.createElement('button');
        addButton.className = 'btn-add';
        addButton.id = 'add-destination-btn';
        addButton.onclick = () => this.showAddForm();
        addButton.textContent = 'Ajouter une destination';
        
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        if (destinations.length === 0) {
            container.appendChild(addButton);
        } else {
            // Trier les destinations par order
            const sortedDestinations = [...destinations].sort((a, b) => {
                const orderA = a.order || 0;
                const orderB = b.order || 0;
                return orderA - orderB;
            });

            sortedDestinations.forEach((destination, sortedIndex) => {
                // Ajouter une carte de transport si ce n'est pas la première destination
                if (sortedIndex > 0) {
                    const transportation = destination.transportation || {
                        type: 'avion',
                        cost: null,
                        duration: null
                    };
                    const transportCard = Transportation.createTransportationCard(transportation, sortedIndex);
                    container.appendChild(transportCard);
                }
                
                // Ajouter la carte de destination
                const card = this.createDestinationCard(destination, sortedIndex);
                container.appendChild(card);
            });

            // Ajouter le bouton à la fin
            container.appendChild(addButton);
        }
    },

    /**
     * Afficher le formulaire d'ajout (version complète de l'ancien système)
        const newDestination = {
            name: '',
            address: '',
            duration: { days: 0, hours: 0, minutes: 0 },
            order: destinations.length // Order = position dans la liste
        };
        
        // Ajouter la nouvelle destination à la liste (sans ID pour l'instant)
        const currentItinerary = window.firebaseService.getCurrentItinerary();
        if (currentItinerary) {
            currentItinerary.destinations.push(newDestination);
        }
        
        // Créer une card pour la nouvelle destination dans la sidebar
        const container = document.getElementById('sidebar-destinations-content');
        if (container) {
            // Trouver le panneau destinations dans la sidebar
            const destinationsPanel = container.querySelector('.destinations-panel');
            if (!destinationsPanel) {
                console.error('❌ Panneau destinations non trouvé dans la sidebar');
                return;
            }
            
            const list = destinationsPanel.querySelector('.destinations-list');
            if (!list) {
                console.error('❌ Liste destinations non trouvée dans la sidebar');
                return;
            }
            
            // Trouver le bouton "Ajouter une destination"
            const addButton = list.querySelector('.add-destination-btn');
            
            // L'index de la nouvelle destination est le dernier
            const newIndex = destinations.length - 1;
            const card = this.createDestinationCard(newDestination, newIndex);
            card.classList.add('editing');
            
            list.insertBefore(card, addButton);
            
            // Ouvrir automatiquement le formulaire
            const form = document.getElementById(`form-${newIndex}`);
            if (form) {
                form.classList.add('show');
            }
            
            // Mettre à jour la visibilité du bouton "Ajouter"
            this.updateAddDestinationButtonVisibility();
            
            // Scroller vers la nouvelle destination
            setTimeout(() => {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else {
            console.error('❌ Conteneur sidebar-destinations-content non trouvé');
        }
    },

    /**
     * Obtenir le pays depuis les coordonnées (API Nominatim)
     */
    async getCountryFromCoordinates(lat, lng) {
        try {
            // Utiliser l'API Nominatim en anglais (standard et fiable)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1&accept-language=en` 
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.address && data.address.country) {
                const countryName = data.address.country;
                console.log(`🌍 Pays retourné par l'API (anglais): ${countryName}`);
                return countryName;
            }
            
            return null;
        } catch (error) {
            console.error('Erreur lors du géocodage inverse:', error);
            return null;
        }
    },

    /**
     * Afficher les activités d'une destination spécifique
     */
    displayActivitiesOfDestination(index) {
        const destination = window.firebaseService.getDestinationsOfCurrentItinerary()[index];
        if (!destination || !destination.id) return;
        
        try {
            // Utiliser le nouveau service pour charger les activités
            const activities = window.firebaseService.getActivities(destination);
            
            console.log('🔍 Activités chargées depuis la mémoire:', activities);
            
            const activitiesList = document.getElementById(`activities-list-${index}`);
            activitiesList.innerHTML = '';
            
            if (activities.length === 0) {
                activitiesList.innerHTML = '<p style="color: var(--gray-light); padding: 10px;">Aucune activité pour cette destination</p>';
            return;
            }
            
            // Trier les activités par ordre
            activities.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            activities.forEach(activity => {
                console.log('🔍 Activité trouvée:', { id: activity.id, name: activity.name });
                
                const activityElement = document.createElement('div');
                activityElement.className = 'activity-item';
                
                // Créer le contenu HTML proprement
                let activityHTML = `
                    <div class="activity-info">
                        <div class="activity-header flex-between">
                        <div class="activity-name-and-price">
                            <strong>${activity.name}</strong>`;
                            
                            // Afficher le prix (TOUJOURS simple valeur) et devise locale si présente
                            if (activity.price) {
                                const displayPrice = activity.price || 0;
                                
                                if (activity.localCurrency !== undefined && activity.localCurrencyCode) {
                                    // Devise étrangère : afficher conversion
                                    const displayCurrency = activity.localCurrency || 0;
                                    const displayCurrencyCode = activity.localCurrencyCode || '';
                                    
                                    if (displayPrice > 0 || displayCurrency > 0) {
                                        activityHTML += `
                                            <span class="activity-price">${displayPrice}€ → ${displayCurrency} ${displayCurrencyCode}</span>
                                            `;
                                    }
                                } else {
                                    // EUR : afficher seulement le prix en euros
                                    if (displayPrice > 0) {
                                        activityHTML += `
                                            <span class="activity-price">${displayPrice}€</span>
                                            `;
                                    }
                                }
                            }
                        
                        activityHTML += `
                            </div> <!-- Fin activity-name-and-price -->
                            <div class="activity-actions">
                                <button class="btn-edit" onclick="window.Activity.editActivity('${activity.id}', ${index})" title="Modifier l'activité">
                                    <span class="material-icons">edit</span>
                                </button>
                                <button class="btn-delete" onclick="Activities.deleteActivity('${activity.id}', ${index}, this)" title="Supprimer l'activité">
                                    <span class="material-icons">delete</span>
                                </button>
                            </div>
                        </div>
                `;
                
                if (activity.startTime && activity.endTime) {
                    activityHTML += `<span class="activity-time">${activity.startTime} - ${activity.endTime}</span>`;
                }
                
                // Afficher le type d'activité si présent
                if (activity.type) {
                    activityHTML += `
                        <span class="activity-type">${activity.type}</span>
                        `;
                }
                
                activityHTML += `
                    </div>
                `;
                
                activityElement.innerHTML = activityHTML;
                activitiesList.appendChild(activityElement);
            });
            
        } catch (error) {
            console.error('Erreur lors du chargement des activités:', error);
            const activitiesList = document.getElementById(`activities-list-${index}`);
            if (activitiesList) {
                activitiesList.innerHTML = '<p class="no-activities">Erreur lors du chargement des activités</p>';
            }
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
    addDragAndDropEvents(card, index) {
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        const destination = destinations[index];
        
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
											   
            this.draggedIndex = index;
        });
        
        card.addEventListener('dragend', (e) => {
            card.classList.remove('dragging');
										  
        });
        
        card.addEventListener('dragover', (e) => {
            // Désactiver le drop si une destination est en édition
            const editingCard = document.querySelector('.destination-card.editing');
            if (editingCard) {
                e.preventDefault();
                return;
            }
            
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (this.draggedIndex !== undefined && this.draggedIndex !== index) {
                card.classList.add('drag-over');
            }
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
            
            if (this.draggedIndex !== undefined && this.draggedIndex !== index && !this.isReordering) {
                this.isReordering = true;
                this.reorderDestinations(this.draggedIndex, index).finally(() => {
                    this.isReordering = false;
                });
            }
        });
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
    }
};

// Exporter pour utilisation globale
window.Destinations = Destinations;
