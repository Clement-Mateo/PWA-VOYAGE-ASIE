/**
 * Composant Destinations - Module Pattern
 * Gère le bandeau des destinations avec édition
 */

console.log('🔍 Destinations.js: Début du chargement');

const Destinations = {
    isVisible: false,
    isSaving: false, // État de sauvegarde pour éviter les clics multiples
    isDeleting: false, // État de suppression pour éviter les clics multiples
    isReordering: false, // État de réorganisation pour éviter les doubles appels
    
    /**
     * Initialiser le composant
     */
    init() {
        console.log('Destinations: Initialisation...');
    },
    
    /**
     * Afficher/Masquer le panneau
     */
    toggle() {
        this.isVisible = !this.isVisible;
        this.updatePanelVisibility();
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
     * Obtenir ou créer le panneau
     */
    getPanel() {
        let panel = document.getElementById('destinationsPanel');
        if (!panel) {
            panel = this.createPanel();
            document.body.appendChild(panel);
        }
        return panel;
    },
    
    /**
     * Créer le panneau HTML
     */
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'destinationsPanel';
        panel.className = 'destinations-panel';
        
        panel.innerHTML = `
            <div class="destinations-header">    
                <h2 class="destinations-title">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="var(--font-color-white)" style="transform: translateY(2px); margin-right: 8px;">
                        <path d="M440-400h80v-120h120v-80H520v-120h-80v120H320v80h120v120Zm40 214q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z"/>
                    </svg>
                    Destinations
                </h2>
                <button class="close-panel-btn" onclick="Destinations.hide()">×</button>
            </div>
            <div class="destinations-list" id="destinationsList"></div>
`;
        return panel;
    },
    
    /**
     * Masquer le panneau
     */
    hide() {
        this.isVisible = false;
        // Annuler toute création en cours lors de la fermeture
        this.cancelCreation();
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
     * Créer une card de destination en mode lecture seule
     * (utilisée dans la popup au clic sur un marqueur)
     */
    createDestinationReadCard(destination, index = null) {
        const duration = destination.duration || { days: 0, hours: 0, minutes: 0 };
        const durationText = this.formatDuration(duration);
        
        return `
            <div class="destination-card">
                <div class="destination-header">
                    <h3 class="destination-title">${destination.name || 'Destination sans nom'}</h3>
                    ${index !== null ? `
                        <div class="destination-actions">
                            <button class="btn-edit" onclick="Destinations.show(); setTimeout(() => Destinations.editDestination(${index}), 300)">
                                <span class="material-icons">edit</span>
                            </button>
                            <button class="btn-delete" onclick="Destinations.show(); setTimeout(() => Destinations.deleteDestination(${index}), 300)">
                                <span class="material-icons">delete</span>
                            </button>
                            <button class="btn-expand" onclick="Destinations.show(); setTimeout(() => Destinations.toggleDestinationCard(${index}), 300)">
                                <span class="material-icons">expand_more</span>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <p class="destination-address">${destination.address ? destination.address.address : 'Adresse non spécifiée'}</p>
                <p class="destination-duration">⏱️ ${durationText}</p>
            </div>
        `;
    },
    
    /**
     * Créer une card de destination
     */
    createDestinationCard(destination, index) {
        console.log('🔍 Destinations: Création card pour', destination.name);
        
        // Vérifier si la police est disponible maintenant
        const testElement = document.createElement('span');
        testElement.className = 'material-symbols-outlined';
        testElement.textContent = 'edit';
        testElement.style.fontFamily = "'Material Symbols Outlined', sans-serif";
        document.body.appendChild(testElement);
        
        const computedStyle = window.getComputedStyle(testElement);
        const fontLoaded = computedStyle.fontFamily.includes('Material Symbols');
        document.body.removeChild(testElement);
        
        if (!fontLoaded) {
            console.warn('⚠️ Destinations: Police Material Symbols pas encore chargée, utilisation du fallback');
        }
        
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
        const durationText = this.formatDuration(duration);
                
        card.innerHTML = `
            <div class="destination-header flex-between">
                <h3 class="destination-title">${destination.name || 'Nouvelle destination'}</h3>
                <div class="destination-actions">
                    ${destination.id ? `
                        <button class="btn-edit" onclick="Destinations.editDestination(${index})">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn-delete" onclick="Destinations.deleteDestination(${index})">
                            <span class="material-icons">delete</span>
                        </button>
                        <button class="btn-expand" onclick="Destinations.toggleDestinationCard(${index})" title="Déplier">
                            <span class="material-icons">expand_more</span>
                        </button>
                    ` : ''}
                </div>
            </div>
            <p class="destination-address">${destination.address ? destination.address.address : 'Adresse à spécifier'}</p>
            <p class="destination-duration">⏱️ ${durationText}</p>
            
            <!-- Section des activités (visible quand dépliée) -->
            <div class="destination-activities" id="activities-${index}" style="display: none;">
                <div class="activities-header flex-between">
                    <h4>Activités</h4>
                </div>
                <div class="activities-list" id="activities-list-${index}">
                    <!-- Les activités seront chargées ici -->
                </div>
                <button class="add-activity-btn" onclick="Destinations.addActivity(${index})" title="Ajouter une activité">
                    <span class="material-icons">add_circle</span>
                    Ajouter une activité
                </button>
            </div>
            
            <div class="destination-form" id="form-${index}">
                <div class="form-group">
                    <label class="form-label">Adresse</label>
                    <div class="address-input-container flex-center">
                        <input type="text" class="form-input address-input" id="address-${index}" value="${destination.address ? destination.address.address : ''}" placeholder="Adresse" readonly>
                        <button class="btn-icon address-search-btn" onclick="Destinations.openAddressSearch(${index}, event)">
                            <span class="material-icons">search</span>
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Nom</label>
                    <input type="text" class="form-input" id="title-${index}" value="${destination.name || ''}" placeholder="Nom de la destination">
                </div>
                <div class="form-group">
                    <label class="form-label">Durée</label>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <input type="number" class="form-input" id="days-${index}" value="${duration.days || 0}" min="0" style="flex: 1;" onchange="Destinations.validateDurationInput(${index}, 'days')">
                        <span style="font-size: 12px; color: var(--gray-light); min-width: 12px;">j</span>
                        <input type="number" class="form-input" id="hours-${index}" value="${duration.hours || 0}" min="0" style="flex: 1;" onchange="Destinations.validateDurationInput(${index}, 'hours')">
                        <span style="font-size: 12px; color: var(--gray-light); min-width: 12px;">h</span>
                        <input type="number" class="form-input" id="minutes-${index}" value="${duration.minutes || 0}" min="0" style="flex: 1;" onchange="Destinations.validateDurationInput(${index}, 'minutes')">
                        <span style="font-size: 12px; color: var(--gray-light); min-width: 12px;">m</span>
                    </div>
                </div>
                <div class="form-actions flex-center">
                    <button class="btn-save" onclick="Destinations.saveDestination(${index})"><span class="material-icons">save</span> Enregistrer</button>
                    <button class="btn-cancel" onclick="Destinations.cancelEdit(${index})"><span class="material-icons">close</span> Annuler</button>
                </div>
            </div>
        `;
        
        console.log('🔍 Destinations: Card HTML créé, icône utilisé:', fontLoaded ? 'Material Symbols' : 'Emoji fallback');
        
        // Ajouter les événements drag and drop
        this.addDragAndDropEvents(card, index);
        
        return card;
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
            console.log('🔧 Drag start:', destination.name);
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', card.innerHTML);
            this.draggedIndex = index;
        });
        
        card.addEventListener('dragend', (e) => {
            console.log('🔧 Drag end:', destination.name);
            card.classList.remove('dragging');
        });
        
        card.addEventListener('dragover', (e) => {
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
            e.preventDefault();
            card.classList.remove('drag-over');
            
            if (this.draggedIndex !== undefined && this.draggedIndex !== index && !this.isReordering) {
                this.isReordering = true; // Éviter les doubles appels
                console.log('🔧 Drop:', window.firebaseService.getDestinationsOfCurrentItinerary()[this.draggedIndex].name, '->', destination.name);
                this.reorderDestinations(this.draggedIndex, index).finally(() => {
                    this.isReordering = false;
                });
            }
        });
    },
    
    /**
     * Réorganiser les destinations
     */
    async reorderDestinations(fromIndex, toIndex) {
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        const draggedDestination = destinations[fromIndex];
        const targetDestination = destinations[toIndex];
        
        if (!draggedDestination.id || !targetDestination.id) {
            console.warn('⚠️ Impossible de réorganiser : destination sans id');
            return;
        }
        
        console.log('🔧 Réorganisation:', draggedDestination.name, '-> position', toIndex);
        
        try {
            // Récupérer l'itinéraire actuel
            const itineraries = window.firebaseService.itineraries;
            if (itineraries.length === 0) {
                console.error('Impossible de réorganiser: aucun itinéraire trouvé');
                return;
            }
            const currentItinerary = itineraries[0];
            
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
            });
            
            console.log('🔧 Nouveaux ordres:', sortedDestinations.map(d => ({name: d.name, order: d.order})));
            
            // Mettre à jour l'itinéraire complet en une seule fois
            await window.firebaseService.updateItinerary(currentItinerary);
            await this.loadDestinations();
            
            console.log('✅ Réorganisation sauvegardée avec succès');            
        } catch (error) {
            console.error('❌ Erreur réorganisation destinations:', error);
            showErrorSnackBar('Erreur lors de la réorganisation.');

            await this.loadDestinations();
        }
        
        this.draggedIndex = undefined;
    },

    // Valider les entrées de durée
    validateDurationInput(index, type) {
        const input = document.getElementById(type + '-' + index);
        const value = parseInt(input.value);
        
        if (type === 'days' && value > 365) {
            input.value = 365;
        } else if (type === 'hours' && value > 23) {
            input.value = 23;
        } else if (type === 'minutes' && value > 59) {
            input.value = 59;
        }
        
        if (value < 0) {
            input.value = 0;
        }
    },
    
    /**
     * Formater la durée
     */
    formatDuration(duration) {
        const parts = [];
        if (duration.days > 0) parts.push(`${duration.days}j`);
        if (duration.hours > 0) parts.push(`${duration.hours}h`);
        if (duration.minutes > 0) parts.push(`${duration.minutes}min`);
        return parts.length > 0 ? parts.join(' ') : 'Aucune durée';
    },
    
    /**
     * Éditer une destination
     */
    async editDestination(index) {
        // Annuler d'abord toute création en cours
        await this.cancelCreation();
        
        const card = document.getElementById(`destination-${index}`);
        const form = document.getElementById(`form-${index}`);
        
        // Fermer les autres formulaires
        document.querySelectorAll('.destination-form.show').forEach(f => {
            f.classList.remove('show');
        });
        document.querySelectorAll('.destination-card.editing').forEach(c => {
            c.classList.remove('editing');
        });
        
        // Ouvrir ce formulaire
        form.classList.add('show');
        card.classList.add('editing');
    },
    
    /**
     * Ajouter une activité à une destination
     */
    addActivity(index) {
        const destination = window.firebaseService.getDestinationsOfCurrentItinerary()[index];
        if (!destination || !destination.id) {
            console.error('❌ Destination invalide pour ajouter une activité');
            return;
        }
        
        console.log('🔧 Ajout d\'activité pour la destination:', destination.name);
        
        // Définir la destination actuelle pour l'activité
        if (window.Activity) {
            window.Activity.setCurrentDestination(destination);
            window.Activity.showActivityPopup();
        } else {
            console.error('❌ Activity non disponible');
        }
    },
    
    /**
     * Annuler la création d'une destination
     */
    async cancelCreation() {
        console.log('🔧 cancelCreation() appelée');
        
        // Trouver l'index de la destination en cours de création (sans ID)
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        const creatingIndex = destinations.findIndex(dest => !dest.id);
        
        console.log('🔍 creatingIndex:', creatingIndex, 'destinations.length:', destinations.length);
        console.log('🔍 destinations avant suppression:', destinations.map(d => ({id: d.id, name: d.name})));
        
        if (creatingIndex !== -1) {
            const card = document.getElementById(`destination-${creatingIndex}`);
            
            // Supprimer la destination de la liste Firebase
            destinations.splice(creatingIndex, 1);
            console.log('🔍 destinations après splice:', destinations.map(d => ({id: d.id, name: d.name})));
            
            // Supprimer la card du DOM
            if (card) {
                card.remove();
            }
            
            console.log('🗑️ Destination en cours de création supprimée');
        }
        
        // Attendre un peu pour s'assurer que le DOM est bien nettoyé
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Mettre à jour la visibilité du bouton "Ajouter"
        this.updateAddDestinationButtonVisibility();
    },
    
    /**
     * Annuler l'édition
     */
    cancelEdit(index) {
        const card = document.getElementById(`destination-${index}`);
        if (card) {
            const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
            const destination = destinations[index];
            
            // Si la destination n'existe pas ou n'a pas d'ID, supprimer simplement la card
            if (!destination || !destination.id) {
                this.cancelCreation();
            } else {
                // Destination existante : restaurer les valeurs et masquer le formulaire
                const form = card.querySelector('.destination-form');
                if (form) {
                    form.classList.remove('show');
                }
                card.classList.remove('editing');
                
                // Restaurer les valeurs originales
                const nameInput = card.querySelector('.destination-name');
                const addressInput = card.querySelector('.destination-address');
                const durationInputs = card.querySelectorAll('.duration-input');
                
                if (nameInput) nameInput.value = destination.name || '';
                if (addressInput) addressInput.value = destination.address ? destination.address.address : '';
                
                if (destination.duration) {
                    if (durationInputs[0]) durationInputs[0].value = destination.duration.days || 0;
                    if (durationInputs[1]) durationInputs[1].value = destination.duration.hours || 0;
                    if (durationInputs[2]) durationInputs[2].value = destination.duration.minutes || 0;
                }
            }
        }
    },
    
    /**
     * Ouvrir la recherche d'adresse
     */
    openAddressSearch(index, event) {
        console.log('🔍 Destinations: openAddressSearch appelé pour index', index);
        this.currentEditIndex = index;
        
        // Empêcher la propagation du clic
        if (event) {
            event.stopPropagation();
        }
        
        if (window.ChooseAddress) {
            console.log('✅ ChooseAddress disponible, ouverture de la popup');
            window.ChooseAddress.show((selectedAddress) => {
                this.selectAddress(selectedAddress, index);
            });
        } else {
            console.error('❌ ChooseAddress non disponible');
        }
    },
    
    /**
     * Sélectionner une adresse
     */
    selectAddress(selectedAddress, index) {
        // Mettre à jour le champ adresse
        const addressInput = document.getElementById(`address-${index}`);
        if (addressInput) {
            addressInput.value = selectedAddress.address;
        }
        
        // Auto-remplir le nom si vide avec le nom du lieu ou de la ville
        const titleInput = document.getElementById(`title-${index}`);
        if (titleInput && !titleInput.value.trim() && selectedAddress.name) {
            titleInput.value = selectedAddress.name;
        }
        
        // Stocker les données complètes de l'adresse
        this.selectedAddress = selectedAddress;
    },
    
    /**
     * Supprimer une destination
     */
    async deleteDestination(index) {
        console.log('🔧 deleteDestination() appelée avec index:', index);
        
        // Récupérer la destination AVANT cancelCreation pour l'ID
        const destinationsBefore = window.firebaseService.getDestinationsOfCurrentItinerary();
        const destination = destinationsBefore[index];
        
        if (!destination) {
            console.error('❌ Destination non trouvée à l\'index', index);
            return;
        }
        
        // Si déjà en cours de suppression, ignorer
        if (this.isDeleting) {
            console.log('🚫 Suppression déjà en cours, ignore le clic');
            return;
        }
                
        // Marquer comme en cours de suppression
        this.isDeleting = true;
        
        // Trouver le bouton de suppression et le mettre en loading (AVANT cancelCreation)
        const deleteButton = document.querySelector(`#destination-${index} .btn-delete`);
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<svg class="loading-spinner-small" viewBox="0 0 24 24" style="overflow: visible;"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--error-red)" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416 31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dashoffset" from="31.416" to="0" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>';
        }
        
        // Annuler d'abord toute création en cours
        await this.cancelCreation();
        
        console.log('🔍 Après cancelCreation, récupération des destinations...');
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        console.log('🔍 destinations après cancelCreation:', destinations.length, destinations.map(d => ({id: d.id, name: d.name})));
        
        // Récupérer à nouveau la destination (l'index a peut-être changé)
        const updatedDestination = destinations.find(d => d.id === destination.id);
        console.log('🔍 destination trouvée par ID:', updatedDestination);
        
        if (!updatedDestination) {
            console.error('❌ Destination non trouvée après cancelCreation');
            this.isDeleting = false;
            return;
        }
        
        if (!updatedDestination.id) {
            console.log('ℹ️ Destination sans ID (création en cours), suppression simple');
            // Supprimer la card du DOM sans passer par Firebase
            const card = document.getElementById(`destination-${index}`);
            if (card) {
                card.remove();
            }
            // Mettre à jour la visibilité du bouton "Ajouter"
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
            const success = await window.firebaseService.deleteDestination(
                destination, currentItinerary
            );
            
            if (success) {
                console.log('✅ Destination supprimée:', destination);
                
                // Recharger les destinations
                await this.loadDestinations();
                
                // Nettoyer la carte
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
            showErrorSnackBar('Erreur lors de la suppression de la destination: ' + error.message);
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
        console.log('🔧 Mise à jour des ordres après suppression de order:', deletedOrder);
        
        try {
            // Récupérer l'itinéraire actuel
            const itineraries = window.firebaseService.itineraries;
            if (itineraries.length === 0) {
                console.error('❌ Aucun itinéraire trouvé');
                return;
            }
            
            const currentItinerary = itineraries[0];
            const destinations = currentItinerary.destinations || [];
            
            // Mettre à jour les ordres : toutes les destinations après la supprimée voient leur order diminué de 1
            destinations.forEach(dest => {
                if (dest.order > deletedOrder) {
                    dest.order = dest.order - 1;
                }
            });
            
            // Mettre à jour l'itinéraire complet en une seule fois
            await window.firebaseService.updateItinerary(currentItinerary);
            
            console.log('✅ Ordres mis à jour avec succès');
            
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour des ordres:', error);
            showErrorSnackBar('Erreur lors de la réorganisation. Veuillez rafraîchir la page.');
        }
    },
    
    /**
     * Afficher les destinations
     */
    render() {
        const container = document.getElementById('destinationsList');
        if (!container) {
            console.error('❌ Conteneur destinationsList non trouvé');
            return;
        }
        
        container.innerHTML = '';
        
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        if (destinations.length === 0) {
            const list = document.createElement('div');
            list.className = 'destinations-list';
            
            // Ajouter le bouton "Ajouter une destination" même s'il n'y a pas de destinations
            const addButton = document.createElement('button');
            addButton.className = 'add-destination-btn';
            addButton.onclick = () => this.showAddForm();
            addButton.textContent = '+ Ajouter une destination';
            list.appendChild(addButton);
            
            container.appendChild(list);
        } else {
            const list = document.createElement('div');
            list.className = 'destinations-list';
            
            // Trier les destinations par order
            const sortedDestinations = [...destinations].sort((a, b) => {
                const orderA = a.order || 0;
                const orderB = b.order || 0;
                return orderA - orderB;
            });
            
            sortedDestinations.forEach((destination, sortedIndex) => {
                const card = this.createDestinationCard(destination, sortedIndex);
                list.appendChild(card);
                
                // Réactiver le drag & drop sur les cartes existantes (si la dernière destination a un ID)
                const lastDestination = destinations[destinations.length - 1];
                if (!lastDestination || lastDestination.id) {
                    this.addDragAndDropEvents(card, sortedIndex);
                }
            });
            
            // Ajouter le bouton "Ajouter une destination" à la fin
            const addButton = document.createElement('button');
            addButton.className = 'add-destination-btn';
            addButton.onclick = () => this.showAddForm();
            addButton.textContent = '+ Ajouter une destination';
            list.appendChild(addButton);
            
            container.appendChild(list);
        }
        
        // Mettre à jour la visibilité du bouton "Ajouter"
        this.updateAddDestinationButtonVisibility();
    },
    
    /**
     * Mettre à jour la visibilité du bouton "Ajouter une destination"
     */
    updateAddDestinationButtonVisibility() {
        const addButton = document.querySelector('.add-destination-btn');
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        const lastDestination = destinations[destinations.length - 1];
        
        if (addButton) {
            if(destinations.length == 0 || (lastDestination && lastDestination.id)) {
                addButton.style.display = 'block';
            } else {
                addButton.style.display = 'none';
            }
        } else {
            console.log('  -> addButton non trouvé');
        }
    },
    
    /**
     * Charger les destinations
     */
    async loadDestinations() {
        try {
            console.log('🔍 Chargement des destinations...');
            
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

    // Obtenir le pays depuis les coordonnées (API Nominatim)
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
     * Sauvegarder une destination modifiée
     */
    async saveDestination(index) {
        const saveButton = document.querySelector(`#form-${index} .btn-save`);
        
        // Si déjà en cours de sauvegarde, ignorer
        if (this.isSaving) {
            console.log('🚫 Sauvegarde déjà en cours, ignore le clic');
            return;
        }
        
        // Marquer comme en cours de sauvegarde
        this.isSaving = true;
        let saveButtonOldHtml = saveButton.innerHTML;
        
        // Désactiver le bouton et afficher le loading
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerHTML = '<svg class="loading-spinner" viewBox="0 0 24 24" style="overflow: visible;"><circle cx="12" cy="12" r="8" fill="none" stroke="var(--white)" stroke-width="2" stroke-linecap="round" stroke-dasharray="25.133 25.133" stroke-dashoffset="25.133"><animate attributeName="stroke-dashoffset" from="25.133" to="0" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg> Enregistrement...';
        }
        
        try {
            // Récupérer les valeurs du formulaire
            const title = document.getElementById(`title-${index}`).value;
            const address = document.getElementById(`address-${index}`).value;
            const days = parseInt(document.getElementById(`days-${index}`).value) || 0;
            const hours = parseInt(document.getElementById(`hours-${index}`).value) || 0;
            const minutes = parseInt(document.getElementById(`minutes-${index}`).value) || 0;
            
            // Validation : l'adresse est obligatoire
            if (!address || !address.trim()) {
                showErrorSnackBar('L\'adresse est obligatoire pour créer une destination');
                return;
            }
            
            // Récupérer les destinations actuelles
            const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
            
            // Utiliser l'index pour les destinations existantes
            let destination = destinations[index];
            destination.name = title;
            destination.duration = { days, hours, minutes };
            
            // Préserver les propriétés existantes de address (country, etc.)
            destination.address = {
                ...destination.address, // Préserver les propriétés existantes
                address: address,
                location: this.selectedAddress ? this.selectedAddress.location : (destination.address?.location || null)
            };

            const currentItinerary = window.firebaseService.getCurrentItinerary();

            if (!destination.id) {
                // Si la destination n'existe pas (nouvelle destination), la créer
                destination.id = `dest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                destination.order = destinations.length;

                if(!currentItinerary.desstinations) currentItinerary.desstinations = [];
                currentItinerary.desstinations.push(destination);
                
                await window.firebaseService.updateItinerary(currentItinerary);
                console.log('✅ Destination crée', destination);
            } else {
                // sinon maj la destination
                await window.firebaseService.updateDestination(destination, currentItinerary);
                console.log('✅ Destination mise à jour:', destination);
            }
            
            // Détecter le pays via les coordonnées et le stocker
            if (destination.address.location) {
                const country = await this.getCountryFromCoordinates(
                    destination.address.location.lat, 
                    destination.address.location.lng
                );
                if (country) {
                    destination.address.country = country;
                    console.log(`🌍 Pays détecté et stocké: ${country}`);
                }
            }
            
            // Fermer le formulaire
            this.cancelEdit(index);
            
            // Recharger les destinations
            await this.loadDestinations();

        } catch (error) {
            console.error('❌ Erreur sauvegarde destination:', error);
            showErrorSnackBar('Erreur lors de la sauvegarde de la destination');
        } finally {
            // Réactiver le bouton et restaurer le texte
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = saveButtonOldHtml;
            }

            // Marquer comme terminé
            this.isSaving = false;
    
        }
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
        
        // Créer une destination vide pour l'ajout
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
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
        
        // Créer une card pour la nouvelle destination
        const container = document.getElementById('destinationsList');
        if (container) {
            const list = container.querySelector('.destinations-list') || document.createElement('div');
            list.className = 'destinations-list';
            
            // L'index de la nouvelle destination est le dernier
            const newIndex = destinations.length - 1; // Maintenant c'est destinations.length - 1
            const card = this.createDestinationCard(newDestination, newIndex);
            card.classList.add('editing');
            list.appendChild(card); // Ajouter à la fin
            
            if (!container.querySelector('.destinations-list')) {
                container.appendChild(list);
            }
            
            // Ouvrir automatiquement le formulaire
            const form = document.getElementById(`form-${newIndex}`);
            if (form) {
                form.classList.add('show');
            }
            
            // Mettre à jour la visibilité du bouton "Ajouter"
            this.updateAddDestinationButtonVisibility();
        }
    },

    // Déplier/Replier une carte destination
    toggleDestinationCard(index) {
        const card = document.getElementById(`destination-${index}`);
        const activitiesSection = document.getElementById(`activities-${index}`);
        const expandBtn = card.querySelector('.btn-expand span');
        
        if (!card || !activitiesSection || !expandBtn) return;
        
        const isExpanded = activitiesSection.style.display !== 'none';
        
        if (isExpanded) {
            // Replier
            activitiesSection.style.display = 'none';
            expandBtn.textContent = 'expand_more';
            card.classList.remove('expanded');
        } else {
            // Déplier
            activitiesSection.style.display = 'block';
            expandBtn.textContent = 'expand_less';
            card.classList.add('expanded');
            
            // Charger les activités pour cette destination
            this.displayActivitiesOfDestination(index);
        }
    },

    // Charger les activités pour une destination spécifique
    async displayActivitiesOfDestination(index) {
        const destination = window.firebaseService.getDestinationsOfCurrentItinerary()[index];
        if (!destination || !destination.id) return;
        
        try {
            // Récupérer le premier itinéraire de l'utilisateur
            const itineraries = window.firebaseService.itineraries;
            if (itineraries.length === 0) {
                console.error('❌ Aucun itinéraire trouvé');
                return;
            }
            
            const currentItinerary = itineraries[0];
            
            // Utiliser le nouveau service pour charger les activités
            const activities = window.firebaseService.getActivities(destination, currentItinerary);
            
            console.log('🔍 Activités chargées depuis la mémoire:', activities);
            
            const activitiesList = document.getElementById(`activities-list-${index}`);
            activitiesList.innerHTML = '';
            
            if (activities.length === 0) {
                activitiesList.innerHTML = '<p style="color: var(--gray-light); padding: 10px;">Aucune activité pour cette destination</p>';
            } else {
                activities.forEach(activity => {
                    console.log('🔍 Activité trouvée:', { id: activity.id, name: activity.name });
                    
                    const activityElement = document.createElement('div');
                    activityElement.className = 'activity-item';
                    
                    // Créer le contenu HTML proprement
                    let activityHTML = `
                        <div class="activity-info">
                            <div class="activity-header flex-between">
                                <strong>${activity.name}</strong>
                                <div class="activity-actions">
                                    <button class="btn-edit" onclick="window.Activity.editActivity('${activity.id}', ${index})" title="Modifier l'activité">
                                        <span class="material-icons">edit</span>
                                    </button>
                                    <button class="btn-delete" onclick="window.Destinations.deleteActivity('${activity.id}', ${index}, this)" title="Supprimer l'activité">
                                        <span class="material-icons">delete</span>
                                    </button>
                                </div>
                            </div>
                    `;
                    
                    if (activity.arrivalTime && activity.departureTime) {
                        activityHTML += `<span class="activity-time">${activity.arrivalTime} - ${activity.departureTime}</span>`;
                    }
                    
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
            }
            
        } catch (error) {
            console.error('Erreur lors du chargement des activités:', error);
            const activitiesList = document.getElementById(`activities-list-${index}`);
            if (activitiesList) {
                activitiesList.innerHTML = '<p style="color: red;">Erreur lors du chargement des activités</p>';
            }
        }
    },

    // Supprimer une activité
    async deleteActivity(activityId, destinationIndex, buttonElement) {
        const destination = window.firebaseService.getDestinationsOfCurrentItinerary()[destinationIndex];
        if (!destination || !destination.id) return;

        // Désactiver le bouton et afficher le loading
        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<svg class="loading-spinner-small" viewBox="0 0 24 24" style="overflow: visible;"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--error-red)" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416 31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dashoffset" from="31.416" to="0" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>';
        }

        try {
            // Récupérer le premier itinéraire de l'utilisateur
            const itineraries = window.firebaseService.itineraries;
            if (itineraries.length === 0) {
                console.error('❌ Aucun itinéraire trouvé pour supprimer l\'activité');
                return;
            }
            
            const currentItinerary = itineraries[0];
            
            // Créer l'objet activité à supprimer
            const activityToDelete = { id: activityId };
            
            // Utiliser le nouveau service pour supprimer l'activité
            const success = await window.firebaseService.deleteActivity(activityToDelete, destination, currentItinerary);
            
            if (success) {
                console.log('✅ Activité supprimée:', activityId);
                
                // Recharger la liste des activités
                await this.displayActivitiesOfDestination(destinationIndex);
            } else {
                console.error('❌ Échec de la suppression de l\'activité');
            }
            
        } catch (error) {
            console.error('❌ Erreur suppression activité:', error);
            showErrorSnackBar('Erreur lors de la suppression de l\'activité');
        } finally {
            // Réactiver le bouton et restaurer l'icône
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.innerHTML = '<span class="material-icons">delete</span>';
            }
        }
    },
    
    };

// Le composant est disponible globalement via window.Destinations
window.Destinations = Destinations;
