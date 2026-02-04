/**
 * Composant Itineraries - Gère l'affichage et les interactions de la modal des itinéraires
 */
class Itineraries {
    constructor() {
        this.isOpen = false;
        this.editingItineraryId = null; // Suivre l'itinéraire en cours d'édition
        this.init();
    }

    /**
     * Initialiser le composant
     */
    init() {
        console.log('Itineraries: Initialisation');
    }

    /**
     * Mettre à jour la visibilité du bouton d'ajout d'itinéraire
     */
    updateAddItineraryButtonVisibility() {
        const addButton = document.getElementById('add-itinerary-btn');
        if (addButton) {
            const isOnline = navigator.onLine;
            if (isOnline) {
                addButton.style.display = 'block';
                addButton.title = "Ajouter un itinéraire";
            } else {
                addButton.style.display = 'none';
            }
        } else {
            console.log('erreur updateAddItineraryButtonVisibility -> addButton non trouvé');
        }
    }

    /**
     * Ouvrir la modal des itinéraires
     */
    open() {
        if (this.isOpen) return;
        
        console.log('Itineraries: Ouverture de la modal');
        this.isOpen = true;
        
        this.createModal();
        this.renderItineraries();
        this.updateAddItineraryButtonVisibility();
        // Attacher les événements à chaque ouverture pour s'assurer qu'ils fonctionnent
        this.bindEvents();
    }

    /**
     * Créer la modal HTML
     */
    createModal() {
        // Vérifier si la modal existe déjà
        if (document.getElementById('itinerariesModal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'itinerariesModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">
                        <span class="material-icons">route</span>
                        Gestion des itinéraires
                    </h2>
                    <button class="btn-close" onclick="window.Itineraries.close()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                
                <div class="modal-body">
                    <!-- Section Liste des itinéraires -->
                    <div class="modal-section">
                        <h3 class="modal-section-title">
                            <span class="material-icons">list</span>
                            Mes itinéraires
                        </h3>
                        <div class="itineraries-list" id="itinerariesList">
                            <!-- Les itinéraires seront chargés dynamiquement -->
                        </div>
                        
                        <!-- Bouton Ajouter un itinéraire -->
                        <button class="btn-add" id="add-itinerary-btn" onclick="window.Itineraries.addItinerary()">
                            <span class="material-icons">add</span>
                            Ajouter un itinéraire
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animation d'ouverture
        setTimeout(() => {
            modal.classList.add('open');
        }, 10);
    }

    /**
     * Afficher les itinéraires
     */
    async renderItineraries() {
        const listContainer = document.getElementById('itinerariesList');
        
        if (!listContainer) {
            return;
        }
        
        // Utiliser les itinéraires depuis IndexedDB
        const itineraries = await window.localStorageService.getItineraries();
        
        if (!itineraries || itineraries.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Trier pour mettre l'itinéraire actif en premier
        const sortedItineraries = [...itineraries].sort((a, b) => {
            if (a.active === true && b.active !== true) return -1;
            if (a.active !== true && b.active === true) return 1;
            return 0;
        });

        // Créer toutes les cartes en parallèle
        const cards = await Promise.all(sortedItineraries.map(itinerary => this.createItineraryCard(itinerary)));
        listContainer.innerHTML = cards.join('');
    }

    /**
     * Afficher l'état vide
     */
    renderEmptyState() {
        const listContainer = document.getElementById('itinerariesList');
        
        if (!listContainer) {
            return;
        }
        
        listContainer.innerHTML = `
            <div class="empty-state">
                <span class="material-icons empty-icon">route</span>
                <h3>Aucun itinéraire</h3>
                <p>Créez votre premier itinéraire pour commencer</p>
            </div>
        `;
    }

    /**
     * Créer une carte d'itinéraire
     */
    async createItineraryCard(itinerary) {
        const currentItinerary = await window.localStorageService.getCurrentItinerary(window.firebaseService.getCurrentUser().uid);
        const isActive = currentItinerary && currentItinerary.id === itinerary.id;
        
        // Vérifier s'il y a plus d'un itinéraire
        const itineraries = currentItinerary ? await window.localStorageService.getItineraries(currentItinerary.userId) : [];
        const hasMultipleItineraries = itineraries.length > 1;
        
        return `
            <div class="card ${isActive ? 'card-active' : ''}" data-id="${itinerary.id}" onclick="window.Itineraries.setActiveItinerary('${itinerary.id}')">
                <div class="card-content">
                    <div class="card-header">
                        <h4 class="card-title" id="itinerary-name-${itinerary.id}" onclick="event.stopPropagation(); window.Itineraries.editItineraryName('${itinerary.id}')" title="Modifier le nom">${window.escapeHtml(itinerary.name)}</h4>
                        <div class="card-actions">
                            <button class="btn-edit" onclick="event.stopPropagation(); window.Itineraries.editItineraryName('${itinerary.id}')" title="Modifier le nom">
                                <span class="material-icons">edit</span>
                            </button>
                            ${hasMultipleItineraries ? `
                            <button class="btn-delete" onclick="event.stopPropagation(); window.Itineraries.deleteItinerary('${itinerary.id}')" title="Supprimer">
                                <span class="material-icons">delete</span>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="card-meta">
                            <span class="meta-item">
                                <span class="material-icons">place</span>
                                ${itinerary.destinations ? itinerary.destinations.length : 0} destinations
                            </span>
                        </div>
                        <div class="card-meta">
                            <span class="meta-item">
                                <span class="material-icons">calendar_today</span>
                                Date de création: ${itinerary.createdAt ? (itinerary.createdAt.toDate ? new Date(itinerary.createdAt.toDate()).toLocaleDateString('fr-FR') : new Date(itinerary.createdAt).toLocaleDateString('fr-FR')) : 'Date inconnue'}
                            </span>
                        </div>
                        ${itinerary.updatedAt ? `
                        <div class="card-meta">
                            <span class="meta-item">
                                <span class="material-icons">update</span>
                                Dernière modification: ${itinerary.updatedAt.toDate ? new Date(itinerary.updatedAt.toDate()).toLocaleDateString('fr-FR') : new Date(itinerary.updatedAt).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Ajouter un itinéraire
     */
    async addItinerary() {
        try {
            console.log('Itineraries: Ajout d\'un itinéraire');
            
            // Afficher le loading global
            window.showLoading();
            
            // Générer un nom unique pour le nouvel itinéraire
            const baseName = 'Nouvel Itinéraire';
            let itineraryName = baseName;
            let counter = 1;
            
            // Vérifier si un itinéraire avec ce nom existe déjà
            const currentItinerary = await window.localStorageService.getCurrentItinerary();
            const itineraries = currentItinerary ? await window.localStorageService.getItineraries() : [];
            while (itineraries.some(i => i.name === itineraryName)) {
                counter++;
                itineraryName = `${baseName} ${counter}`;
            }
            
            // Créer l'itinéraire via localStorage
            if (window.localStorageService && window.localStorageService.createItinerary) {
                const newItinerary = await window.localStorageService.createItinerary(itineraryName);
                    
                if (newItinerary) {
                    // Petit délai pour laisser le temps à IndexedDB de se mettre à jour
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // Utiliser setActiveItinerary pour une mise à jour complète avec loading
                    await this.setActiveItinerary(newItinerary.id);
                    
                    showSuccessSnackBar(`Itinéraire "${itineraryName}" créé avec succès`);
                } else {
                    showErrorSnackBar('Erreur lors de la création de l\'itinéraire');
                }
            } else {
                console.error('Itineraries: localStorage non disponible');
                showErrorSnackBar('Service non disponible');
            }
        } catch (error) {
            console.error('Itineraries: Erreur lors de l\'ajout d\'itinéraire:', error);
            showErrorSnackBar('Erreur lors de la création de l\'itinéraire');
        } finally {
            // Masquer le loading global dans tous les cas
            window.hideLoading();
        }
    }

    /**
     * Éditer le nom d'un itinéraire (inline)
     */
    async editItineraryName(itineraryId) {
        const currentItinerary = await window.localStorageService.getCurrentItinerary(window.firebaseService.getCurrentUser().uid);
        const itineraries = currentItinerary ? await window.localStorageService.getItineraries(currentItinerary.userId) : [];
        const itinerary = itineraries.find(i => i.id === itineraryId);
        if (!itinerary) return;

        const titleElement = document.getElementById(`itinerary-name-${itineraryId}`);
        if (!titleElement) return;

        // Si déjà en édition, ne rien faire
        if (this.editingItineraryId === itineraryId) {
            return;
        }

        // Marquer comme en édition
        this.editingItineraryId = itineraryId;
        let cancelled = false; // Flag pour empêcher la sauvegarde après Échap

        const currentName = window.escapeHtml(itinerary.name);
        
        // Créer le conteneur pour l'input (position relative pour l'icône)
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = `
            position: relative;
            width: 100%;
            display: flex;
            align-items: center;
        `;

        // Créer l'input avec padding pour l'icône
        const input = document.createElement('input');
        input.type = 'text';
        input.value = itinerary.name;
        input.className = 'itinerary-name-input';
        input.style.cssText = `
            background: transparent;
            border: 1px solid var(--primary-blue);
            border-radius: 4px;
            padding: 2px 30px 2px 6px;  // Padding droit pour l'icône
            font-size: 16px;
            font-weight: 600;
            color: var(--font-color-gray-dark);
            width: 100%;
            outline: none;
            box-sizing: border-box;
        `;

        // Créer l'icône de validation (positionnée à l'intérieur)
        const validationIcon = document.createElement('span');
        validationIcon.className = 'material-icons';
        validationIcon.textContent = 'check';
        validationIcon.style.cssText = `
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--success-green);
            cursor: pointer;
            font-size: 16px;
            display: none;
            transition: all 0.2s ease;
            background: transparent;
        `;

        // Ajouter les éléments au conteneur
        inputContainer.appendChild(input);
        inputContainer.appendChild(validationIcon);

        // Remplacer le titre par le conteneur d'input
        titleElement.innerHTML = '';
        titleElement.appendChild(inputContainer);
        input.focus();
        input.select();

        // Fonction pour restaurer le titre
        const restoreTitle = (finalName) => {
            // Recréer l'élément h4
            const newTitle = document.createElement('h4');
            newTitle.className = 'card-title';
            newTitle.id = `itinerary-name-${itineraryId}`;
            newTitle.textContent = window.escapeHtml(finalName);
            newTitle.onclick = () => this.editItineraryName(itineraryId);
            newTitle.title = 'Modifier le nom';
            newTitle.style.cursor = 'pointer';
            
            // Remplacer le conteneur d'input par le titre
            inputContainer.replaceWith(newTitle);
            
            this.editingItineraryId = null; // Fin du mode édition
        };

        // Fonction de sauvegarde
        const saveName = async () => {
            const newName = input.value.trim();
            
            // Si pas de changement, restaurer simplement
            if (!newName || newName === currentName) {
                restoreTitle(currentName);
                return;
            }

            // Vérifier si le nom existe déjà
            const nameExists = itineraries.some(i => i.id !== itineraryId && i.name === newName);
            if (nameExists) {
                showErrorSnackBar('Un itinéraire avec ce nom existe déjà');
                restoreTitle(currentName);
                return;
            }

            try {
                // Mettre à jour le nom (instantané dans IndexedDB)
                itinerary.name = newName;
                await this.updateItineraryName(itineraryId, newName);
                restoreTitle(newName);
            } catch (error) {
                // En cas d'erreur, restaurer l'état d'édition
                input.focus();
                console.error('Erreur sauvegarde nom:', error);
            }
        };

        // Afficher l'icône de validation quand le contenu change
        const showValidationIcon = () => {
            const hasChanges = input.value.trim() && input.value.trim() !== currentName;
            if (hasChanges) {
                validationIcon.style.display = 'block';
            } else {
                validationIcon.style.display = 'none';
            }
        };

        // Écouteurs d'événements
        input.addEventListener('input', showValidationIcon);
        showValidationIcon(); // État initial

        // Sauvegarder au clic sur l'icône de validation
        validationIcon.addEventListener('click', saveName);

        // Sauvegarder au blur ou à la touche Entrée
        input.addEventListener('blur', (e) => {
            // Ne pas sauvegarder si annulé avec Échap
            if (cancelled) return;
            
            // Ne pas sauvegarder au blur si on clique sur l'icône de validation
            if (e.relatedTarget !== validationIcon) {
                setTimeout(saveName, 150); // Petit délai pour permettre le clic sur l'icône
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveName();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelled = true; // Marquer comme annulé
                restoreTitle(currentName);
            }
        });
    }

    /**
     * Mettre à jour le nom d'un itinéraire en base
     */
    async updateItineraryName(itineraryId, newName) {
        try {
            const currentItinerary = await window.localStorageService.getCurrentItinerary();
            const itineraries = currentItinerary ? await window.localStorageService.getItineraries() : [];
            const itinerary = itineraries.find(i => i.id === itineraryId);
            if (!itinerary) return;

            // Mettre à jour le nom
            itinerary.name = newName;
            
            // Mettre à jour via localStorage
            await window.localStorageService.updateItinerary(itineraryId, itinerary);
            
            showSuccessSnackBar('Nom de l\'itinéraire mis à jour');
            
            // Mettre à jour le nom dans le sidebar si c'est l'itinéraire actuel
            if (window.Sidebar && window.Sidebar.updateItineraryName) {
                window.Sidebar.updateItineraryName();
            }
        } catch (error) {
            console.error('Erreur mise à jour nom itinéraire:', error);
            showErrorSnackBar('Erreur lors de la mise à jour du nom');
        }
    }

    /**
     * Rendre un itinéraire actif
     */
    async setActiveItinerary(itineraryId, manageLoading = true) {
        try {
            // Ne pas activer si une carte est en mode édition
            if (this.editingItineraryId) {
                console.log('setActiveItinerary: Mode édition actif, activation ignorée');
                return;
            }

            // Gérer le loading si demandé
            if (manageLoading) {
                window.showLoading();
            }

            const itineraries = await window.localStorageService.getItineraries();
            const targetItinerary = itineraries.find(i => i.id === itineraryId);
            
            if (!targetItinerary) {
                console.error('setActiveItinerary: Itinéraire non trouvé:', itineraryId);
                console.log('📋 Nombre total d\'itinéraires:', itineraries.length);
                console.log('📋 IDs des itinéraires disponibles:', itineraries.map(i => i.id));
                console.log('📋 Noms des itinéraires disponibles:', itineraries.map(i => i.name));
                if (manageLoading) {
                    window.hideLoading();
                }
                // Rafraîchir l'affichage pour corriger les IDs invalides
                await this.renderItineraries();
                return;
            }

            // Si l'itinéraire est déjà actif, ne rien faire
            if (targetItinerary.active === true) {
                if (manageLoading) {
                    window.hideLoading();
                }
                return;
            }

            // Désactiver tous les itinéraires en local ET dans IndexedDB
            for (const item of itineraries) {
                if (item.id !== targetItinerary.id) {
                    item.active = false;
                    await window.localStorageService.updateItinerary(item.id, item);
                }
            }

            // Activer l'itinéraire cible en local
            targetItinerary.active = true;

            // Mettre à jour l'itinéraire cible via localStorage
            await window.localStorageService.updateItinerary(targetItinerary.id, targetItinerary);

            // Mettre à jour l'affichage
            this.renderItineraries();
            
            // Mettre à jour le sidebar
            if (window.Sidebar && window.Sidebar.updateItineraryName) {
                window.Sidebar.updateItineraryName();
            }

            // Mettre à jour les destinations si nécessaire
            if (window.Destinations && window.Destinations.loadDestinations) {
                await window.Destinations.loadDestinations();
            }

            showSuccessSnackBar(`Itinéraire "${targetItinerary.name}" activé`);
        } catch (error) {
            console.error('Erreur activation itinéraire:', error);
            showErrorSnackBar('Erreur lors de l\'activation de l\'itinéraire');
        } finally {
            // Masquer le loading si géré
            if (manageLoading) {
                window.hideLoading();
            }
        }
    }

    
    /**
     * Supprimer un itinéraire
     */
    async deleteItinerary(itineraryId) {
        console.log('🗑️ deleteItinerary appelé avec ID:', itineraryId);
        const itineraries = await window.localStorageService.getItineraries();
        const itinerary = itineraries.find(i => i.id === itineraryId);
        if (!itinerary) {
            console.log('❌ Itinéraire non trouvé pour la suppression');
            console.log('📋 Itinéraires disponibles:', itineraries.map(i => ({ id: i.id, name: i.name })));
            return;
        }

        console.log('✅ Itinéraire trouvé pour suppression:', itinerary.name);
        // Afficher la popup de confirmation
        this.showDeleteConfirmation(itineraryId, itinerary.name);
    }

    /**
     * Afficher la popup de confirmation de suppression
     */
    showDeleteConfirmation(itineraryId, itineraryName) {
        // Créer la popup de confirmation
        const confirmationModal = document.createElement('div');
        confirmationModal.id = 'deleteConfirmationModal';
        confirmationModal.className = 'modal';

        confirmationModal.innerHTML = `
            <div class="modal-backdrop" onclick="window.Itineraries.cancelDelete()"></div>
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2 class="modal-title">
                        <span class="material-icons" style="color: var(--error-red);">warning</span>
                        Confirmation de suppression
                    </h2>
                </div>
                
                <div class="modal-body">
                    <div class="modal-section">
                        <p style="margin-bottom: 20px; line-height: 1.5;">
                            Êtes-vous sûr de vouloir supprimer l'itinéraire <strong>"${window.escapeHtml(itineraryName)}"</strong> ?
                        </p>
                        <p style="margin-bottom: 24px; color: var(--gray-darker); font-size: 14px;">
                            Cette action est irréversible et toutes les destinations associées seront perdues.
                        </p>
                        
                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button class="btn-cancel" onclick="window.Itineraries.cancelDelete()" style="padding: 10px 20px;">
                                <span class="material-icons" style="font-size: 16px; margin-right: 6px;">close</span>
                                Annuler
                            </button>
                            <button class="btn-save" onclick="window.Itineraries.confirmDelete('${itineraryId}')" style="padding: 10px 20px;">
                                <span class="material-icons" style="font-size: 16px; margin-right: 6px;">delete</span>
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmationModal);
        
        // Animation d'ouverture
        setTimeout(() => {
            confirmationModal.classList.add('open');
            confirmationModal.style.opacity = '1';
            confirmationModal.style.visibility = 'visible';
        }, 10);
    }

    /**
     * Annuler la suppression
     */
    cancelDelete() {
        const modal = document.getElementById('deleteConfirmationModal');
        if (modal) {
            modal.classList.remove('open');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    /**
     * Confirmer la suppression
     */
    async confirmDelete(itineraryId) {
        try {
            // Afficher le loading global
            window.showLoading();
            
            // Fermer la popup de confirmation
            this.cancelDelete();
            
            // Supprimer via localStorage
            if (window.localStorageService && window.localStorageService.deleteItinerary) {
                const itineraries = await window.localStorageService.getItineraries();
                const itineraryToDelete = itineraries.find(i => i.id === itineraryId);
                if (itineraryToDelete) {
                    // Vérifier si l'itinéraire à supprimer est l'itinéraire actif
                    const wasActive = itineraryToDelete.active;
                    
                    await window.localStorageService.deleteItinerary(itineraryId);
                    
                    // Si l'itinéraire supprimé était l'itinéraire actif, activer le premier itinéraire restant
                    if (wasActive) {
                        const remainingItineraries = await window.localStorageService.getItineraries();
                        if (remainingItineraries.length > 0) {                             
                            console.log('🔄 Activation du premier itinéraire restant:', remainingItineraries[0].id);
                            // Utiliser setActiveItinerary pour une mise à jour complète avec loading
                            await this.setActiveItinerary(remainingItineraries[0].id);
                        }
                    } else {
                        // Mettre à jour l'affichage si l'itinéraire supprimé n'était pas actif
                        console.log('🔄 Appel de renderItineraries depuis confirmDelete (itinéraire non actif)');
                        await this.renderItineraries();
                        
                        // Mettre à jour le sidebar si nécessaire
                        if (window.Sidebar && window.Sidebar.updateItineraryName) {
                            window.Sidebar.updateItineraryName();
                        }
                    }
                    
                    showSuccessSnackBar('Itinéraire supprimé avec succès');
                } else {
                    showErrorSnackBar('Itinéraire non trouvé');
                }
            } else {
                showErrorSnackBar('Service non disponible');
            }
        } catch (error) {
            console.error('Itineraries: Erreur lors de la suppression:', error);
            showErrorSnackBar('Erreur lors de la suppression de l\'itinéraire');
        } finally {
            // Masquer le loading global dans tous les cas
            window.hideLoading();
        }
    }

    /**
     * Lier les événements
     */
    bindEvents() {
        // Écouteur pour la touche Échap (un seul listener global)
        if (!this.escapeHandler) {
            this.escapeHandler = (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            };
            document.addEventListener('keydown', this.escapeHandler);
        }

        // Écouteur pour le clic sur le backdrop (spécifique à ce modal)
        const modal = document.getElementById('itinerariesModal');
        if (modal) {
            // Retirer l'ancien listener s'il existe
            if (this.backdropHandler) {
                const backdrop = modal.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.removeEventListener('click', this.backdropHandler);
                }
            }
            
            // Ajouter le nouveau listener
            const backdrop = modal.querySelector('.modal-backdrop');
            if (backdrop) {
                this.backdropHandler = () => {
                    this.close();
                };
                backdrop.addEventListener('click', this.backdropHandler);
            }
        }
    }

    /**
     * Fermer la modal
     */
    close() {
        if (!this.isOpen) return;
        
        console.log('Itineraries: Fermeture de la modal');
        this.isOpen = false;
        
        const modal = document.getElementById('itinerariesModal');
        if (modal) {
            modal.classList.remove('open');
            
            // Nettoyer les événements du backdrop
            if (this.backdropHandler) {
                const backdrop = modal.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.removeEventListener('click', this.backdropHandler);
                }
                this.backdropHandler = null;
            }
            
            // Supprimer la modal après l'animation
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }
}

// Exporter globalement
window.Itineraries = new Itineraries();
