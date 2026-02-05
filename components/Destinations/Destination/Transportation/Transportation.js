/**
 * Transportation Module - Gère les transports entre destinations
 */

const Transportation = {
    
    /**
     * Créer une card de transport
     */
    createTransportationCard(transportation, destinationId) {
        const card = document.createElement('div');
        card.className = 'transportation-card';
        card.id = `transportation-${destinationId}`;
        
        // Définir les types de transport avec Material Icons
        const transportTypes = {
            'train': '<span class="material-icons">train</span> Train',
            'avion': '<span class="material-icons">flight</span> Avion', 
            'bus': '<span class="material-icons">directions_bus</span> Bus',
            'voiture': '<span class="material-icons">directions_car</span> Voiture',
            'velo': '<span class="material-icons">directions_bike</span> Vélo',
            'a pied': '<span class="material-icons">directions_walk</span> À pied'
        };
        
        // Obtenir le libellé du type de transport
        const typeLabel = transportTypes[transportation.type] || transportation.type;
        
        // Formater la durée
        const duration = transportation.duration || { hours: 0, minutes: 0 };
        const durationText = window.formatDuration(duration, false);
        
        // Créer le contenu de la carte
        card.innerHTML = `
            <div class="transportation-header">
                <div class="transportation-info">
                    <div class="transportation-type">
                        <span class="material-icons">${this.getTransportIcon(transportation.type)}</span>
                        <span>${this.getTransportLabel(transportation.type)}</span>
                    </div>
                    <div class="transportation-details">
                        ${transportation.cost ? `${transportation.cost}€` : 'Non défini'} - ${durationText}
                    </div>
                </div>
                <div class="transportation-actions">
                    <button class="btn-edit" title="Modifier le transport">
                        <span class="material-icons">edit</span>
                    </button>
                </div>
            </div>
        `;
        
        // Ajouter l'événement de clic sur le bouton d'édition
        const editBtn = card.querySelector('.btn-edit');
        editBtn.onclick = () => this.editTransportation(destinationId);
        
        return card;
    },

    /**
     * Éditer le transport d'une destination
     */
    async editTransportation(destinationId) {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        const destination = destinations.find(d => d.id === destinationId);
        
        if (!destination) {
            console.error('❌ Destination non trouvée avec l\'ID', destinationId);
            return;
        }
        
        const transportation = destination.transportation || {};
        
        // Créer la modale d'édition
        const modal = document.createElement('div');
        modal.className = 'modal open';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="this.closest('.modal.open').remove()"></div>
            <div class="modal-content transport-modal">
                <div class="modal-header">
                    <h3>Modifier le transport</h3>
                    <button class="btn-close" onclick="this.closest('.modal.open').remove()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Type de transport</label>
                        <div class="custom-select" id="transportTypeSelect">
                            <div class="select-trigger" onclick="Transportation.openTransportModal()">
                                <span class="select-value">
                                    <span class="material-icons">${this.getTransportIcon(transportation.type)}</span>
                                    <span>${this.getTransportLabel(transportation.type)}</span>
                                </span>
                                <span class="material-icons select-arrow">expand_more</span>
                            </div>
                        </div>
                        <input type="hidden" id="transportType" value="${transportation.type || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Coût (€)</label>
                        <input type="number" class="form-input" id="transportCost" 
                               value="${transportation.cost || ''}" 
                               placeholder="0.00" step="0.01" min="0">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Durée</label>
                        <div class="duration-inputs">
                            <input type="number" class="form-input" id="transportHours" 
                                   value="${transportation.duration?.hours || 0}" 
                                   placeholder="0" min="0" max="23" 
                                   oninput="this.value = Math.max(0, Math.min(23, parseInt(this.value) || 0))">
                            <span class="duration-separator">h</span>
                            <input type="number" class="form-input" id="transportMinutes" 
                                   value="${transportation.duration?.minutes || 0}" 
                                   placeholder="0" min="0" max="59" 
                                   oninput="this.value = Math.max(0, Math.min(59, parseInt(this.value) || 0))">
                            <span class="duration-separator">min</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" onclick="this.closest('.modal.open').remove()">Annuler</button>
                    <button class="btn-save" onclick="Transportation.saveTransportation('${destinationId}')">Enregistrer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus automatique sur le champ coût
        setTimeout(() => {
            const costInput = document.getElementById('transportCost');
            if (costInput) {
                costInput.focus();
                costInput.select();
            }
        }, 100);
        
        // La modale est déjà ouverte avec la classe 'open'
    },

    /**
     * Sauvegarder le transport d'une destination
     */
    async saveTransportation(destinationId) {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        const destination = destinations.find(d => d.id === destinationId);
        
        if (!destination) {
            console.error('❌ Destination non trouvée avec l\'ID', destinationId);
            return;
        }
        
        // Récupérer les valeurs du formulaire
        const type = document.getElementById('transportType').value;
        const cost = document.getElementById('transportCost').value;
        let hours = document.getElementById('transportHours').value;
        let minutes = document.getElementById('transportMinutes').value;
        
        console.log('saveTransportation - Valeurs récupérées:', { type, cost, hours, minutes });
        
        // Afficher le spinner de chargement
        window.showButtonLoading('.modal-footer .btn-save', 'Enregistrement');
        
        try {
            // Convertir en nombres
            hours = parseInt(hours) || 0;
            minutes = parseInt(minutes) || 0;
            
            // Validation des contraintes de temps
            const hoursNum = parseInt(hours) || 0;
            const minutesNum = parseInt(minutes) || 0;
            
            if (hoursNum < 0 || hoursNum > 23) {
                window.showErrorSnackBar('Les heures doivent être comprises entre 0 et 23');
                window.restoreButton('.modal-footer .btn-save', 'Enregistrer', 'save');
                return;
            }
            
            if (minutesNum < 0 || minutesNum > 59) {
                window.showErrorSnackBar('Les minutes doivent être comprises entre 0 et 59');
                window.restoreButton('.modal-footer .btn-save', 'Enregistrer', 'save');
                return;
            }
            
            // Préparer les données du transport
            const transportationData = {
                type: type || null,
                cost: cost ? parseFloat(cost) : null,
                duration: {
                    hours: hours,
                    minutes: minutes
                }
            };
            
            // Mettre à jour la destination avec le nouveau transport
            const updatedDestination = {
                ...destination,
                transportation: transportationData
            };
            
            // Sauvegarder via localStorage
            await window.localStorageService.updateDestination(destination.id, updatedDestination);
            
            window.showSuccessSnackBar('Transport mis à jour avec succès');
            
            // Fermer la modale principale (plus spécifique)
            document.querySelector('.modal.open').remove();
            
            // Mettre à jour l'affichage
            this.refreshTransportationCard(destinationId, transportationData);
            
            // Rafraîchir la synthèse pour mettre à jour les temps en temps réel
            if (window.Synthèse && window.Synthèse.refresh) {
                await window.Synthèse.refresh();
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde du transport:', error);
            window.showErrorSnackBar('Erreur lors de la sauvegarde: ' + error.message);
        } finally {
            window.restoreButton('.modal-footer .btn-save', 'Enregistrer', 'save');
        }
    },

    /**
     * Ouvrir la modale flottante des types de transport
     */
    openTransportModal() {
        // Fermer la modale si elle existe déjà
        this.closeTransportModal();
        
        const modal = document.createElement('div');
        modal.id = 'transportTypeModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content transport-type-modal">
                <div class="modal-header">
                    <h4>Type de transport</h4>
                    <button class="btn-close" onclick="Transportation.closeTransportModal()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="transport-option" onclick="Transportation.selectTransportType('train')">
                        <span class="material-icons">train</span>
                        <span>Train</span>
                    </div>
                    <div class="transport-option" onclick="Transportation.selectTransportType('avion')">
                        <span class="material-icons">flight</span>
                        <span>Avion</span>
                    </div>
                    <div class="transport-option" onclick="Transportation.selectTransportType('bus')">
                        <span class="material-icons">directions_bus</span>
                        <span>Bus</span>
                    </div>
                    <div class="transport-option" onclick="Transportation.selectTransportType('voiture')">
                        <span class="material-icons">directions_car</span>
                        <span>Voiture</span>
                    </div>
                    <div class="transport-option" onclick="Transportation.selectTransportType('velo')">
                        <span class="material-icons">directions_bike</span>
                        <span>Vélo</span>
                    </div>
                    <div class="transport-option" onclick="Transportation.selectTransportType('a pied')">
                        <span class="material-icons">directions_walk</span>
                        <span>À pied</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animation d'ouverture
        setTimeout(() => {
            modal.classList.add('open');
        }, 10);
        
        // Fermer au clic sur le backdrop
        const backdrop = modal.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => this.closeTransportModal());
        }
    },

    /**
     * Fermer la modale flottante
     */
    closeTransportModal() {
        const modal = document.getElementById('transportTypeModal');
        if (modal) {
            modal.classList.remove('open');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    },

    /**
     * Sélectionner un type de transport
     */
    selectTransportType(type) {
        const hiddenInput = document.getElementById('transportType');
        const selectValue = document.querySelector('.select-value');
        
        if (hiddenInput) hiddenInput.value = type;
        
        if (selectValue) {
            selectValue.innerHTML = `
                <span class="material-icons">${this.getTransportIcon(type)}</span>
                <span>${this.getTransportLabel(type)}</span>
            `;
        }
        
        this.closeTransportModal();
    },

    /**
     * Obtenir l'icône Material Icons pour un type de transport
     */
    getTransportIcon(type) {
        const icons = {
            'train': 'train',
            'avion': 'flight',
            'bus': 'directions_bus',
            'voiture': 'directions_car',
            'velo': 'directions_bike',
            'a pied': 'directions_walk'
        };
        return icons[type] || 'help_outline';
    },

    /**
     * Obtenir le libellé pour un type de transport
     */
    getTransportLabel(type) {
        const labels = {
            'train': 'Train',
            'avion': 'Avion',
            'bus': 'Bus',
            'voiture': 'Voiture',
            'velo': 'Vélo',
            'a pied': 'À pied'
        };
        return labels[type] || type;
    },

    
    /**
     * Mettre à jour la carte de transport
     */
    refreshTransportationCard(destinationId, transportationData) {
        const card = document.getElementById(`transportation-${destinationId}`);
        if (card) {
            const newCard = this.createTransportationCard(transportationData, destinationId);
            card.replaceWith(newCard);
        }
    }
};

// Exporter pour utilisation globale
window.Transportation = Transportation;
