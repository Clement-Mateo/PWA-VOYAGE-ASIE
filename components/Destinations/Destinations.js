/**
 * Composant Destinations - Module Pattern
 * Gère le bandeau des destinations avec édition
 */

console.log('🔍 Destinations.js: Début du chargement');

// Attendre que la police soit chargée
function waitForFont() {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('🔍 Destinations: Vérification du chargement de la police...');
            const testElement = document.createElement('span');
            testElement.className = 'material-symbols-outlined';
            testElement.textContent = 'edit';
            testElement.style.fontFamily = "'Material Symbols Outlined', sans-serif";
            document.body.appendChild(testElement);
            
            const computedStyle = window.getComputedStyle(testElement);
            const fontLoaded = computedStyle.fontFamily.includes('Material Symbols');
            
            document.body.removeChild(testElement);
            
            if (fontLoaded) {
                console.log('✅ Destinations: Police Material Symbols chargée');
                resolve();
            } else {
                console.log('⏳ Destinations: Police pas encore chargée, nouvelle tentative...');
                setTimeout(waitForFont, 100);
            }
        }, 100);
    });
}

const Destinations = {
    isVisible: false,
    destinations: [],
    
    /**
     * Initialiser le composant
     */
    init() {
        console.log('Destinations: Initialisation...');
        this.setupEventListeners();
        
        // Ne charger les destinations que si connecté
        if (window.firebaseService && window.firebaseService.isAuthenticated()) {
            this.loadDestinations();
        }
    },
    
    /**
     * Configurer les écouteurs d'événements
     */
    setupEventListeners() {
        // Ne pas créer le bouton ici, il sera géré par updateUserPanel
        console.log('Destinations: setupEventListeners appelé - bouton géré par updateUserPanel');
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
            <div class="destinations-header"    
                <h2 class="destinations-title">📍 Destinations</h2>
                <button class="close-panel-btn" onclick="Destinations.hide()">×</button>
            </div>
            <div class="destinations-list" id="destinationsList"></div>
            <button class="add-destination-btn" onclick="Destinations.showAddForm()">
                + Ajouter une destination
            </button>
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
     * Charger les destinations depuis Firebase
     */
    async loadDestinations() {
        if (!window.firebaseService || !window.firebaseService.isAuthenticated()) {
            console.log('🔒 Utilisateur non connecté');
            return;
        }
        
        try {
            const destinations = await window.firebaseService.getDirectDestinations();
            this.destinations = destinations;
            this.renderDestinations();
            console.log('✅ Destinations chargées:', destinations.length);
        } catch (error) {
            console.error('❌ Erreur chargement destinations:', error);
        }
    },
    
    /**
     * Afficher les destinations dans le panneau
     */
    renderDestinations() {
        const list = document.getElementById('destinationsList');
        if (!list) return;
        
        list.innerHTML = '';
        
        // Trier les destinations par order
        const sortedDestinations = [...this.destinations].sort((a, b) => {
            const orderA = a.order || 0;
            const orderB = b.order || 0;
            return orderA - orderB;
        });
        
        sortedDestinations.forEach((destination, sortedIndex) => {
            // Trouver l'index original dans le tableau destinations
            const originalIndex = this.destinations.indexOf(destination);
            const card = this.createDestinationCard(destination, originalIndex);
            list.appendChild(card);
        });
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
        
        // Rendre draggable seulement si la destination existe (firestoreId)
        if (destination.firestoreId) {
            card.draggable = true;
            card.classList.add('draggable');
        }
        
        // Ajouter la classe 'editing' si c'est une nouvelle destination
        if (!destination.firestoreId) {
            card.classList.add('editing');
        }
        
        const duration = destination.duration || { days: 0, hours: 0, minutes: 0 };
        const durationText = this.formatDuration(duration);
                
        card.innerHTML = `
            <div class="destination-header">
                <h3 class="destination-title">${destination.name || 'Nouvelle destination'}</h3>
                <div class="destination-actions">
                    ${destination.firestoreId ? `
                        <button class="edit-btn" onclick="Destinations.editDestination(${index})">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="delete-btn" onclick="Destinations.deleteDestination(${index})">
                            <span class="material-icons">delete</span>
                        </button>
                    ` : ''}
                </div>
            </div>
            <p class="destination-address">${destination.address || 'Adresse à spécifier'}</p>
            <p class="destination-duration">⏱️ ${durationText}</p>
            <div class="destination-form" id="form-${index}">
                <div class="form-group">
                    <label class="form-label">Adresse</label>
                    <div class="address-input-container">
                        <input type="text" class="form-input address-input" id="address-${index}" value="${destination.address || ''}" placeholder="Adresse" readonly>
                        <button class="address-search-btn" onclick="Destinations.openAddressSearch(${index}, event)">
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
                        <span style="font-size: 12px; color: #666; min-width: 12px;">j</span>
                        <input type="number" class="form-input" id="hours-${index}" value="${duration.hours || 0}" min="0" style="flex: 1;" onchange="Destinations.validateDurationInput(${index}, 'hours')">
                        <span style="font-size: 12px; color: #666; min-width: 12px;">h</span>
                        <input type="number" class="form-input" id="minutes-${index}" value="${duration.minutes || 0}" min="0" style="flex: 1;" onchange="Destinations.validateDurationInput(${index}, 'minutes')">
                        <span style="font-size: 12px; color: #666; min-width: 12px;">m</span>
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn-save" onclick="Destinations.saveDestination(${index})">💾 Enregistrer</button>
                    <button class="btn-cancel" onclick="Destinations.cancelEdit(${index})">❌ Annuler</button>
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
        const destination = this.destinations[index];
        
        // Seulement pour les destinations existantes
        if (!destination.firestoreId) return;
        
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
            
            if (this.draggedIndex !== undefined && this.draggedIndex !== index) {
                console.log('🔧 Drop:', this.destinations[this.draggedIndex].name, '->', destination.name);
                this.reorderDestinations(this.draggedIndex, index);
            }
        });
    },
    
    /**
     * Réorganiser les destinations
     */
    async reorderDestinations(fromIndex, toIndex) {
        const draggedDestination = this.destinations[fromIndex];
        const targetDestination = this.destinations[toIndex];
        
        if (!draggedDestination.firestoreId || !targetDestination.firestoreId) {
            console.warn('⚠️ Impossible de réorganiser : destination sans firestoreId');
            return;
        }
        
        console.log('🔧 Réorganisation:', draggedDestination.name, '-> position', toIndex);
        
        // Sauvegarder les ordres originaux pour restauration si erreur
        const originalDraggedOrder = draggedDestination.order;
        const originalTargetOrder = targetDestination.order;
        
        // MISE À JOUR IMMÉDIATE DE L'UI (Optimistic UI)
        const tempOrder = draggedDestination.order;
        draggedDestination.order = targetDestination.order;
        targetDestination.order = tempOrder;
        
        // Re-render immédiatement pour le feedback visuel
        this.render();
        
        // Sauvegarder en arrière-plan
        try {
            await Promise.all([
                window.firebaseService.updateDestination(draggedDestination),
                window.firebaseService.updateDestination(targetDestination)
            ]);
            
            console.log('✅ Réorganisation sauvegardée avec succès');
            
        } catch (error) {
            console.error('❌ Erreur réorganisation:', error);
            
            // RESTAURATION si erreur
            draggedDestination.order = originalDraggedOrder;
            targetDestination.order = originalTargetOrder;
            
            // Re-render pour restaurer l'ordre original
            this.render();
            
            // Notification à l'utilisateur
            alert('Erreur lors de la réorganisation. L\'ordre a été restauré.');
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
    editDestination(index) {
        // Annuler d'abord toute création en cours
        this.cancelCreation();
        
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
     * Annuler la création d'une destination
     */
    cancelCreation() {
        // Trouver l'index de la destination en cours de création (sans firestoreId)
        const creatingIndex = this.destinations.findIndex(dest => !dest.firestoreId);
        
        if (creatingIndex !== -1) {
            const card = document.getElementById(`destination-${creatingIndex}`);
            
            // Supprimer la card du DOM
            if (card) {
                card.remove();
            }
            
            // Supprimer la destination du tableau
            this.destinations.splice(creatingIndex, 1);
            
            console.log('🗑️ Destination en cours de création supprimée');
        }
        
        // Mettre à jour la visibilité du bouton "Ajouter"
        this.updateAddButtonVisibility();
        
        // Re-render pour mettre à jour les index
        this.render();
    },
    
    /**
     * Annuler l'édition
     */
    cancelEdit(index) {
        const card = document.getElementById(`destination-${index}`);
        if (card) {
            const destination = this.destinations[index];
            
            // Si c'est une nouvelle destination (pas de firestoreId), utiliser cancelCreation
            if (!destination.firestoreId) {
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
                if (addressInput) addressInput.value = destination.address || '';
                
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
        
        console.log('Adresse sélectionnée:', selectedAddress);
        console.log('Nom auto-rempli:', selectedAddress.name);
    },
    
    /**
     * Supprimer une destination
     */
    async deleteDestination(index) {
        const destination = this.destinations[index];
        
        if (!destination) {
            console.error('❌ Destination non trouvée à l\'index', index);
            return;
        }
        
        const destinationId = destination.firestoreId;
        
        if (!destinationId) {
            console.error('❌ FirestoreId non trouvé pour la destination');
            return;
        }
        
        console.log('🔧 Suppression directe par FirestoreId:', destinationId);
        
        // Confirmation de suppression
        const confirmDelete = confirm(`Êtes-vous sûr de vouloir supprimer "${destination.name || 'cette destination'}" ?`);
        
        if (!confirmDelete) {
            console.log('🚫 Suppression annulée par l\'utilisateur');
            return;
        }
        
        try {
            // Supprimer la destination
            await window.firebaseService.deleteDestinationById(destinationId);
            
            console.log('✅ Destination supprimée:', destination);
            
            // Mettre à jour les ordres des destinations suivantes
            await this.updateOrdersAfterDeletion(destination.order);
            
            // Recharger les destinations
            await this.loadDestinations();
            
            // Mettre à jour la carte
            if (window.displayDestinationsOnMap) {
                window.displayDestinationsOnMap();
            }
            
        } catch (error) {
            console.error('❌ Erreur suppression destination:', error);
            alert('Erreur lors de la suppression de la destination: ' + error.message);
        }
    },
    
    /**
     * Mettre à jour les ordres après suppression d'une destination
     */
    async updateOrdersAfterDeletion(deletedOrder) {
        console.log('🔧 Mise à jour des ordres après suppression de order:', deletedOrder);
        
        // Trouver toutes les destinations avec un order supérieur à celui supprimé
        const destinationsToUpdate = this.destinations.filter(dest => 
            dest.firestoreId && dest.order > deletedOrder
        );
        
        console.log('🔧 Destinations à mettre à jour:', destinationsToUpdate.length);
        
        // Mettre à jour leur order (diminuer de 1)
        const updatePromises = destinationsToUpdate.map(async dest => {
            const oldOrder = dest.order;
            dest.order = oldOrder - 1;
            
            console.log(`🔧 Mise à jour: ${dest.name} order ${oldOrder} -> ${dest.order}`);
            
            try {
                await window.firebaseService.updateDestination(dest);
                return { success: true, destination: dest.name };
            } catch (error) {
                console.error(`❌ Erreur mise à jour ${dest.name}:`, error);
                // Restaurer l'ordre original en cas d'erreur
                dest.order = oldOrder;
                return { success: false, destination: dest.name, error };
            }
        });
        
        // Exécuter toutes les mises à jour en parallèle
        const results = await Promise.all(updatePromises);
        
        // Vérifier les résultats
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
            console.error('❌ Erreurs lors de la mise à jour des ordres:', failures);
            alert('Certaines destinations n\'ont pas pu être réordonnées. Veuillez rafraîchir la page.');
        } else {
            console.log('✅ Tous les ordres mis à jour avec succès');
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
        
        if (this.destinations.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Aucune destination</p>';
        } else {
            const list = document.createElement('div');
            list.className = 'destinations-list';
            
            // Trier les destinations par order
            const sortedDestinations = [...this.destinations].sort((a, b) => {
                const orderA = a.order || 0;
                const orderB = b.order || 0;
                return orderA - orderB;
            });
            
            sortedDestinations.forEach((destination, sortedIndex) => {
                // Trouver l'index original dans le tableau destinations
                const originalIndex = this.destinations.indexOf(destination);
                const card = this.createDestinationCard(destination, originalIndex);
                list.appendChild(card);
            });
            
            container.appendChild(list);
        }
        
        // Mettre à jour la visibilité du bouton "Ajouter"
        this.updateAddButtonVisibility();
    },
    
    /**
     * Mettre à jour la visibilité du bouton "Ajouter une destination"
     */
    updateAddButtonVisibility() {
        const addButton = document.querySelector('.add-destination-btn');
        if (addButton) {
            // Vérifier s'il y a une destination en cours de création (sans firestoreId)
            const hasCreatingDestination = this.destinations.some(dest => !dest.firestoreId);
            addButton.style.display = hasCreatingDestination ? 'none' : 'block';
        }
    },
    
    /**
     * Charger les destinations
     */
    async loadDestinations() {
        try {
            if (!window.firebaseService.isAuthenticated()) {
                console.log('🔒 Utilisateur non connecté');
                this.destinations = [];
                this.render();
                return;
            }

            console.log('🔍 Chargement des destinations...');
            const destinations = await window.firebaseService.getDirectDestinations();
            
            console.log('🔍 Destinations chargées:', destinations);
            console.log('🔍 Analyse des IDs:');
            destinations.forEach((dest, index) => {
                console.log(`Destination ${index}:`, {
                    id: dest.id,
                    firestoreId: dest.firestoreId,
                    name: dest.name,
                    hasFirestoreId: !!dest.firestoreId
                });
            });
            
            this.destinations = destinations;
            this.render();
            
            // Afficher les destinations sur la carte
            if (window.displayDestinationsOnMap) {
                window.displayDestinationsOnMap();
            }
            
        } catch (error) {
            console.error('❌ Erreur chargement destinations:', error);
            this.destinations = [];
            this.render();
        }
    },
    
    /**
     * Sauvegarder une destination modifiée
     */
    async saveDestination(index) {
        const destination = this.destinations[index];
        
        // Récupérer les valeurs du formulaire
        const title = document.getElementById(`title-${index}`).value;
        const address = document.getElementById(`address-${index}`).value;
        const days = parseInt(document.getElementById(`days-${index}`).value) || 0;
        const hours = parseInt(document.getElementById(`hours-${index}`).value) || 0;
        const minutes = parseInt(document.getElementById(`minutes-${index}`).value) || 0;
        
        // Mettre à jour l'objet destination
        destination.name = title;
        destination.address = address;
        destination.duration = { days, hours, minutes };
        
        // Si une adresse a été sélectionnée via la recherche, utiliser ses données
        if (this.selectedAddress && this.selectedAddress.address === address) {
            destination.placeId = this.selectedAddress.placeId;
            destination.location = this.selectedAddress.location;
        }
        
        try {
            if (!destination.firestoreId) {
                // C'est une nouvelle destination (pas d'ID Firestore), l'ajouter à Firebase
                await window.firebaseService.addDestinationToItinerary(destination);
                console.log('✅ Nouvelle destination créée:', destination);
            } else {
                // C'est une destination existante, la mettre à jour
                await window.firebaseService.updateDestination(destination);
                console.log('✅ Destination mise à jour:', destination);
            }
            
            // Fermer le formulaire
            this.cancelEdit(index);
            
            // Recharger les destinations
            await this.loadDestinations();
            
            // Mettre à jour la carte
            if (window.displayDestinationsOnMap) {
                window.displayDestinationsOnMap();
            }
        } catch (error) {
            console.error('❌ Erreur sauvegarde destination:', error);
            alert('Erreur lors de la sauvegarde de la destination');
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
        const newDestination = {
            name: '',
            address: '',
            duration: { days: 0, hours: 0, minutes: 0 },
            order: this.destinations.length // Order = position dans la liste
        };
        
        // Ajouter la nouvelle destination à la FIN du tableau
        this.destinations.push(newDestination);
        
        // Créer une card pour la nouvelle destination
        const container = document.getElementById('destinationsList');
        if (container) {
            const list = container.querySelector('.destinations-list') || document.createElement('div');
            list.className = 'destinations-list';
            
            // L'index de la nouvelle destination est le dernier
            const newIndex = this.destinations.length - 1;
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
            this.updateAddButtonVisibility();
        }
    },
    
    /**
     * Ajouter une nouvelle destination
     */
    async addDestination(destinationData) {
        try {
            // Ajouter à Firebase
            await window.firebaseService.addDestinationToItinerary(destinationData);
            console.log('✅ Destination ajoutée:', destinationData);
            
            // Recharger les destinations
            await this.loadDestinations();
            
            // Mettre à jour la carte
            if (window.displayDestinationsOnMap) {
                window.displayDestinationsOnMap();
            }
        } catch (error) {
            console.error('❌ Erreur ajout destination:', error);
            alert('Erreur lors de l\'ajout de la destination');
        }
    }
};

// Exporter globalement
window.Destinations = Destinations;
