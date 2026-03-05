/**
 * Composant Itineraries - Gère l'affichage et les interactions de la modal des itinéraires
 */
class Itineraries {
    constructor() {
        this.editingItineraryId = null; // Suivre l'itinéraire en cours d'édition
        this.init();
    }

    /**
     * Vérifier si un itinéraire est en cours d'édition
     */
    isEditingItinerary() {
        return this.editingItineraryId !== null;
    }

    /**
     * Initialiser le composant
     */
    init() {
        console.log('Itineraries: Initialisation');
        
        // Écouter les mises à jour d'itinéraires pour rafraîchir automatiquement
        window.addEventListener('itinerary:updated', (event) => {
            console.log('Itineraries: Mise à jour détectée, rafraîchissement de la liste');
            this.renderItineraries();
        });
    }

    /**
     * Rendre le contenu HTML des itinéraires (pour affichage dans le menu)
     */
    render() {
        return `
            <h3 class="itineraries-title">
                <span class="material-icons">list</span>
                Mes itinéraires
            </h3>
            <div class="itineraries-list" id="itinerariesList">
                <!-- Les itinéraires seront chargés dynamiquement -->
            </div>
            
            <!-- Bouton Ajouter un itinéraire -->
            <button class="btn-add" id="add-itinerary-btn" onclick="window.Itineraries.addItinerary()">
                Ajouter un itinéraire
            </button>
        `;
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
        
        // Formater la date de début pour l'affichage
        let startDateText = 'Non définie';
        let startDateValue = '';
        
        if (itinerary.startDate) {
            try {
                const date = new Date(itinerary.startDate);
                if (!isNaN(date.getTime())) {
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    startDateText = `${day}/${month}/${year}`;
                    startDateValue = date.toISOString().split('T')[0];
                } else {
                    console.warn('Date invalide dans l\'itinéraire:', itinerary.startDate);
                }
            } catch (error) {
                console.warn('Date invalide dans l\'itinéraire:', itinerary.startDate);
            }
        }
        
        return `
            <div class="card ${isActive ? 'card-active' : ''}" data-id="${itinerary.id}" onclick="if(!window.Itineraries.isEditingItinerary()) { window.Itineraries.setActiveItinerary('${itinerary.id}') }">
                <div class="card-content">
                    <div class="card-header">
                        <h4 class="card-title" id="itinerary-name-${itinerary.id}">${window.escapeHtml(itinerary.name)}</h4>
                        <div class="card-actions">
                            <button class="btn-edit" onclick="window.Itineraries.editItinerary('${itinerary.id}')" title="Modifier">
                                <span class="material-icons">edit</span>
                            </button>
                            ${hasMultipleItineraries ? `
                            <button class="btn-delete" onclick="window.Itineraries.deleteItinerary('${itinerary.id}')" title="Supprimer">
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
                                Date de début: ${startDateText}
                            </span>
                        </div>
                        <div class="card-meta">
                            <span class="meta-item">
                                <span class="material-icons">event</span>
                                Date de création: ${itinerary.createdAt ? new Date(itinerary.createdAt).toLocaleString('fr-FR') : 'Date inconnue'}
                            </span>
                        </div>
                        ${itinerary.updatedAt ? `
                        <div class="card-meta">
                            <span class="meta-item">
                                <span class="material-icons">update</span>
                                Dernière modification: ${new Date(itinerary.updatedAt).toLocaleString('fr-FR')}
                            </span>
                        </div>
                        ` : ''}
                        
                        <!-- Afficher les notes si présentes -->
                        ${itinerary.notes && itinerary.notes.trim() ? `
                            <div class="itinerary-notes">${itinerary.notes.replace(/\n/g, '<br>')}</div>
                        ` : ''}
                    </div>
                    
                    <!-- Formulaire d'édition -->
                    <div class="itinerary-form" id="form-${itinerary.id}" style="display: none;">
                        <div class="form-group full-width">
                            <label class="form-label">Nom de l'itinéraire</label>
                            <input type="text" class="form-input" id="name-${itinerary.id}" value="${itinerary.name || ''}" placeholder="Nom de l'itinéraire">
                        </div>
                        <div class="form-group full-width">
                            <label class="form-label">Date de début</label>
                            <input type="date" class="form-input" id="startDate-${itinerary.id}" value="${startDateValue}">
                        </div>
                        <div class="form-group full-width">
                            <label class="form-label">Notes</label>
                            <textarea class="form-input" id="notes-${itinerary.id}" placeholder="Ajouter des notes ou remarques..." rows="3">${itinerary.notes || ''}</textarea>
                        </div>
                        <div class="form-actions flex-center">
                            <button class="btn-save" onclick="window.Itineraries.saveItinerary('${itinerary.id}')"><span class="material-icons">save</span> Enregistrer</button>
                            <button class="btn-cancel" onclick="window.Itineraries.cancelEdit('${itinerary.id}')"><span class="material-icons">close</span> Annuler</button>
                        </div>
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
            
            // Nettoyer les destinations temporaires avant de créer un nouvel itinéraire
            if (window.localStorageService && window.localStorageService.removeTempDestination) {
                await window.localStorageService.removeTempDestination();
            }
            
            // Nettoyer les destinations temporaires avant de créer un nouvel itinéraire
            if (window.localStorageService && window.localStorageService.removeTempDestination) {
                await window.localStorageService.removeTempDestination();
            }
            
            // Créer l'itinéraire via localStorage (avec logique par défaut intégrée)
            if (window.localStorageService && window.localStorageService.createItinerary) {
                const newItinerary = await window.localStorageService.createItinerary(); // Plus besoin d'arguments
                    
                if (newItinerary) {
                    // Petit délai pour laisser le temps à IndexedDB de se mettre à jour
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // Utiliser setActiveItinerary pour une mise à jour complète avec loading
                    await this.setActiveItinerary(newItinerary.id);
                    
                    showSuccessSnackBar(`Itinéraire "${newItinerary.name}" créé avec succès`);
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
     * Déplier le formulaire d'édition d'un itinéraire
     */
    expandItineraryForm(itineraryId) {
        const card = document.querySelector(`[data-id="${itineraryId}"]`);
        const form = document.getElementById(`form-${itineraryId}`);
        
        if (!card || !form) return;
        
        // Fermer les autres formulaires
        document.querySelectorAll('.itinerary-form').forEach(f => {
            if (f.id !== `form-${itineraryId}`) {
                f.style.display = 'none';
                const otherCard = f.closest('.card');
                if (otherCard) {
                    otherCard.classList.remove('editing');
                }
            }
        });
        
        // Forcer le dépliage
        form.style.display = 'block';
        card.classList.add('editing');
        
        // Focus automatique sur le champ nom
        setTimeout(() => {
            const nameInput = document.getElementById(`name-${itineraryId}`);
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }, 100);
    }

    /**
     * Replier le formulaire d'édition d'un itinéraire
     */
    collapseItineraryForm(itineraryId) {
        const card = document.querySelector(`[data-id="${itineraryId}"]`);
        const form = document.getElementById(`form-${itineraryId}`);
        
        if (!card || !form) return;
        
        // Forcer le repli
        form.style.display = 'none';
        card.classList.remove('editing');
    }

    /**
     * Éditer un itinéraire (ouvre le formulaire)
     */
    async editItinerary(itineraryId) {
        const card = document.querySelector(`[data-id="${itineraryId}"]`);
        const form = document.getElementById(`form-${itineraryId}`);
        
        if (!card || !form) return;
        
        // Si le formulaire est déjà visible, ne rien faire
        if (form.style.display !== 'none') {
            return;
        }
        
        // Marquer comme en édition
        this.editingItineraryId = itineraryId;
        
        // Déplier le formulaire
        this.expandItineraryForm(itineraryId);
    }

    /**
     * Sauvegarder les modifications d'un itinéraire
     */
    async saveItinerary(itineraryId) {
        try {
            const itineraries = await window.localStorageService.getItineraries();
            const itinerary = itineraries.find(i => i.id === itineraryId);
            
            if (!itinerary) {
                showErrorSnackBar('Itinéraire non trouvé');
                return;
            }

            // Récupérer les valeurs du formulaire
            const nameInput = document.getElementById(`name-${itineraryId}`);
            const startDateInput = document.getElementById(`startDate-${itineraryId}`);
            const notesInput = document.getElementById(`notes-${itineraryId}`);
            
            const newName = nameInput ? nameInput.value.trim() : itinerary.name;
            const newStartDate = startDateInput ? startDateInput.value : null;
            const newNotes = notesInput ? notesInput.value.trim() : '';
            
            // Valider le nom
            if (!newName) {
                showErrorSnackBar('Le nom de l\'itinéraire est requis');
                return;
            }
            
            // Vérifier si le nom existe déjà (pour un autre itinéraire)
            const nameExists = itineraries.some(i => i.id !== itineraryId && i.name === newName);
            if (nameExists) {
                showErrorSnackBar('Un itinéraire avec ce nom existe déjà');
                return;
            }

            // Mettre à jour l'itinéraire
            itinerary.name = newName;
            itinerary.notes = newNotes;
            
            if (newStartDate) {
                try {
                    const parsedDate = new Date(newStartDate);
                    // Validation de la date avant sauvegarde
                    if (isNaN(parsedDate.getTime()) || 
                        parsedDate.getFullYear() < 1970 || 
                        parsedDate.getFullYear() > 9999) {
                        console.error('❌ Date invalide lors de la sauvegarde:', newStartDate);
                        showErrorSnackBar('La date de début est invalide');
                        return;
                    }
                    // Sauvegarder comme chaîne ISO pour garantir la consistance
                    itinerary.startDate = parsedDate.toISOString();
                } catch (error) {
                    console.error('❌ Erreur parsing date lors de la sauvegarde:', error);
                    showErrorSnackBar('La date de début est invalide');
                    return;
                }
            } else if (itinerary.startDate) {
                delete itinerary.startDate;
            }
            
            // Mettre à jour via localStorage
            await window.localStorageService.updateItinerary(itineraryId, itinerary);
            
            // Replier le formulaire
            this.collapseItineraryForm(itineraryId);
            
            // Fin du mode édition
            this.editingItineraryId = null;
            
            // Rafraîchir l'affichage
            this.renderItineraries();
            
            // Mettre à jour le sidebar si c'est l'itinéraire actuel
            if (window.Sidebar && window.Sidebar.updateItineraryName) {
                window.Sidebar.updateItineraryName();
            }
            
            showSuccessSnackBar('Itinéraire mis à jour avec succès');
        } catch (error) {
            console.error('Erreur sauvegarde itinéraire:', error);
            showErrorSnackBar('Erreur lors de la sauvegarde de l\'itinéraire');
        }
    }

    /**
     * Annuler l'édition d'un itinéraire
     */
    async cancelEdit(itineraryId) {
        try {
            const itineraries = await window.localStorageService.getItineraries();
            const itinerary = itineraries.find(i => i.id === itineraryId);
            
            if (!itinerary) return;
            
            // Replier le formulaire
            this.collapseItineraryForm(itineraryId);
            
            // Restaurer les valeurs originales dans le formulaire
            const nameInput = document.getElementById(`name-${itineraryId}`);
            const startDateInput = document.getElementById(`startDate-${itineraryId}`);
            const notesInput = document.getElementById(`notes-${itineraryId}`);
            
            if (nameInput) nameInput.value = itinerary.name || '';
            
            const startDate = itinerary.startDate ? new Date(itinerary.startDate) : null;
            if (startDateInput) {
                startDateInput.value = startDate ? startDate.toISOString().split('T')[0] : '';
            }
            
            if (notesInput) notesInput.value = itinerary.notes || '';
            
            // Fin du mode édition
            this.editingItineraryId = null;
        } catch (error) {
            console.error('Erreur annulation édition:', error);
        }
    }

    /**
     * Sauvegarder les modifications d'un itinéraire
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

            // Nettoyer les destinations temporaires avant de changer d'itinéraire
            if (window.localStorageService && window.localStorageService.removeTempDestination) {
                await window.localStorageService.removeTempDestination();
            }

            // Nettoyer les destinations temporaires avant de changer d'itinéraire
            if (window.localStorageService && window.localStorageService.removeTempDestination) {
                await window.localStorageService.removeTempDestination();
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
}

// Exporter globalement
window.Itineraries = new Itineraries();
