/**
 * Destination Module - Gère le formulaire destination et la sauvegarde
 */

const Destination = {
    isSaving: false,
    links: [], // Liste des liens de la destination en cours d'édition
    currentDestinationId: null, // ID de la destination en cours d'édition

    /**
     * Mettre à jour le style des champs adresse selon l'état de connexion
     */
    updateAddressInputStyle(isOnline) {
        const addressContainers = document.querySelectorAll('.address-input-container');
        addressContainers.forEach(container => {
            if (isOnline) {
                container.classList.remove('offline');
            } else {
                container.classList.add('offline');
            }
        });
    },
    
    /**
     * Éditer une destination
     */
    async editDestination(destinationId) {
        // Annuler d'abord toute création en cours
        await this.cancelCreation();
        
        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        const destination = destinations.find(d => d.id === destinationId);
        
        if (!destination) {
            console.error('❌ Destination non trouvée avec l\'ID', destinationId);
            return;
        }
        
                
        const card = document.getElementById(`destination-${destinationId}`);
        const form = document.getElementById(`form-${destinationId}`);
        const activitiesSection = document.getElementById(`activities-${destinationId}`);
        const expandBtn = card.querySelector('.btn-expand span');
        
        // Replier la destination avant l'édition
        if (activitiesSection && activitiesSection.style.display !== 'none') {
            activitiesSection.style.display = 'none';
            if (expandBtn) {
                expandBtn.textContent = 'keyboard_arrow_down';
            }
        }
        
        // Mettre à jour l'icône selon les activités
        this.updateActivityIcon(destinationId);
        
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
        
        // Désactiver le hover sur les autres destinations
        this.disableOtherCardsHover(destinationId);
        
        // Scroll vers la destination
        this.scrollToDestination(destinationId);
        
        // Remplir les champs avec les données actuelles
        const nameInput = document.getElementById(`name-${destinationId}`);
        const addressInput = document.getElementById(`address-${destinationId}`);
        const daysInput = document.getElementById(`days-${destinationId}`);
        const hoursInput = document.getElementById(`hours-${destinationId}`);
        const minutesInput = document.getElementById(`minutes-${destinationId}`);
        
        if (nameInput) nameInput.value = destination.name || '';
        if (addressInput) {
            addressInput.value = destination.address ? destination.address.address : '';
            
            // Mettre à jour le style selon l'état de connexion
            this.updateAddressInputStyle(navigator.onLine);
        }
        
        // Remplir les champs de durée
        if (destination.duration) {
            if (daysInput) daysInput.value = destination.duration.days || 0;
            if (hoursInput) hoursInput.value = destination.duration.hours || 0;
            if (minutesInput) minutesInput.value = destination.duration.minutes || 0;
        }
        
        // Définir la destination en cours d'édition
        this.currentDestinationId = destinationId;
        
        // Charger les liens dans la variable de classe
        this.links = destination.links ? [...destination.links] : [];
        
        // Restaurer les liens sauvegardés
        LinksService.reloadLinksList(destinationId, this.links);
        
        // Focus automatique sur le champ nom pour l'édition
        setTimeout(() => {
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }, 100);
    },

    /**
     * Sélectionner une adresse (avec auto-remplissage du nom)
     */
    selectAddress(selectedAddress, destinationId) {
        // Mettre à jour le champ adresse
        const addressInput = document.getElementById(`address-${destinationId}`);
        if (addressInput) {
            addressInput.value = selectedAddress.address;
        }
        
        // Auto-remplir le nom si vide avec le nom du lieu ou de la ville
        const nameInput = document.getElementById(`name-${destinationId}`);
        if (nameInput && !nameInput.value.trim() && selectedAddress.name) {
            nameInput.value = selectedAddress.name;
        }
        
        // Stocker les données complètes de l'adresse
        this.selectedAddress = selectedAddress;
    },

    /**
     * Scroll vers une destination spécifique
     */
    scrollToDestination(destinationId) {
        const card = document.getElementById(`destination-${destinationId}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    /**
     * Sauvegarder une destination modifiée
     */
    async saveDestination(destinationId) {
        const saveButton = document.querySelector(`#form-${destinationId} .btn-save`);
        
        // Si déjà en cours de sauvegarde, ignorer
        if (this.isSaving) {
            console.log('⏳ Sauvegarde déjà en cours, ignore...');
            return;
        }
        
        try {
            this.isSaving = true;
            
            // Afficher le spinner de chargement
            window.showButtonLoading(`#form-${destinationId} .btn-save`, 'Enregistrement...');

            // Récupérer l'itinéraire courant
            const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
            let destination = destinations.find(d => d.id === destinationId);
            
            // Si c'est une destination temporaire et qu'elle n'est pas trouvée, la créer
            if (!destination && destinationId === 'temp_destination') {
                destination = {
                    id: 'temp_destination',
                    name: '',
                    address: '',
                    duration: { days: 3, hours: 0, minutes: 0 },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            }
            
            if (!destination) {
                console.error('❌ Destination non trouvée avec l\'ID', destinationId);
                window.restoreButton(`#form-${destinationId} .btn-save`, 'Enregistrer', 'save');
                return;
            }
            
            // Récupérer les valeurs du formulaire
            const name = document.getElementById(`name-${destinationId}`).value.trim();
            const addressInput = document.getElementById(`address-${destinationId}`);
            const address = addressInput ? addressInput.value.trim() : '';
            const notes = document.getElementById(`notes-${destinationId}`).value.trim();
            
            // Récupérer les liens depuis la variable de classe
            const links = this.links || [];
            
            // Récupérer les valeurs de durée
            const days = parseInt(document.getElementById(`days-${destinationId}`).value) || 0;
            const hours = parseInt(document.getElementById(`hours-${destinationId}`).value) || 0;
            const minutes = parseInt(document.getElementById(`minutes-${destinationId}`).value) || 0;
            
            if (!name) {
                window.showErrorSnackBar('Le nom de la destination est requis');
                window.restoreButton(`#form-${destinationId} .btn-save`, 'Enregistrer', 'save');
                return;
            }
            
            if (!address) {
                window.showErrorSnackBar('L\'adresse de la destination est requise');
                window.restoreButton(`#form-${destinationId} .btn-save`, 'Enregistrer', 'save');
                return;
            }
            
                        
            // Préparer les données mises à jour (structure correcte)
            const updatedDestination = {
                ...destination,
                name: name,
                notes: notes || '',
                links: links, // Ajout des liens
                address: {
                    address: address,
                    country: destination.address?.country || null,
                    location: destination.address?.location || {
                        lat: destination.address?.latitude || null,
                        lng: destination.address?.longitude || null
                    }
                },
                duration: {
                    days: days,
                    hours: hours,
                    minutes: minutes
                }
            };
            
            // Nettoyer les valeurs undefined pour éviter l'erreur Firebase
            if (!updatedDestination.address.location.lat || !updatedDestination.address.location.lng) {
                delete updatedDestination.address.location;
            }
            if (!updatedDestination.address.country) {
                delete updatedDestination.address.country;
            }
            
            // Si c'est une nouvelle destination (ID temporaire), la créer
            if (destination.id === 'temp_destination') {
                
                // Générer un ID aléatoire pour la destination sauvegardée
                updatedDestination.id = `destination_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Géocoder l'adresse pour obtenir les coordonnées
                try {
                    const coords = await window.LocationService.geocodeAddress(address);
                    if (coords) {
                        updatedDestination.address.location = {
                            lat: coords.lat,
                            lng: coords.lng
                        };
                        
                        // Obtenir le pays depuis les coordonnées
                        try {
                            const country = await window.LocationService.getCountryFromCoordinates(coords.lat, coords.lng);
                            if (country) {
                                updatedDestination.address.country = country;
                            }
                        } catch (error) {
                            console.warn('⚠️ Impossible d\'obtenir le pays depuis les coordonnées:', error);
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ Impossible de géocoder l\'adresse:', error);
                }
                                
                // Générer un ID aléatoire pour la destination sauvegardée
                updatedDestination.id = `destination_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            }

            // Obtenir et stocker la devise locale
            try {
                if (updatedDestination.address.country && !updatedDestination.address.countryCurrency) {
                    const currency = await window.LocationService.getCountryCurrency(updatedDestination.address.country);
                    updatedDestination.address.countryCurrency = currency;
                }
            } catch (error) {
                console.warn('⚠️ Impossible d\'obtenir la devise:', error);
                // Fallback sur EUR
                updatedDestination.address.countryCurrency = { code: 'EUR', name: 'Euro', symbol: '€' };
            }
            
            // Mettre à jour la destination via localStorage
            await window.localStorageService.updateDestination(destinationId, updatedDestination);
            
            if(destinationId === 'temp_destination') {
                window.showSuccessSnackBar('Destination créée avec succès');
            } else {
                window.showSuccessSnackBar('Destination mise à jour avec succès');
            }
            
            // Réactiver le hover sur les autres destinations
            this.enableOtherCardsHover();
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde de la destination:', error);
            window.showErrorSnackBar('Erreur lors de la sauvegarde: ' + error.message);
        } finally {
            this.isSaving = false;
            window.restoreButton(`#form-${destinationId} .btn-save`, 'Enregistrer', 'save');
        }
    },

    /**
     * Annuler l'édition
     */
    async cancelEdit(destinationId) {
        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        const destination = destinations.find(d => d.id === destinationId);
        
        // Si la destination n'existe pas, n'a pas d'ID, ou est temporaire, supprimer simplement la card
        if (!destination || !destination.id || destination.id === 'temp_destination') {
            this.cancelCreation();
        } else {
            // Destination existante : restaurer les valeurs et masquer le formulaire
            const form = document.querySelector(`#form-${destinationId}`);
            if (form) {
                form.classList.remove('show');
            }
            
            const card = document.querySelector(`#destination-${destinationId}`);
            if (card) {
                card.classList.remove('editing');
            }
            
            // Réactiver le hover sur les autres destinations
            this.enableOtherCardsHover();
            
            // Nettoyer la variable de classe
            this.links = [];
            this.currentDestinationId = null;
            
            // Restaurer les liens sauvegardés (supprimer les liens temporaires)
            LinksService.reloadLinksList(destinationId, destination.links || []);
            
            // Restaurer les valeurs originales
            const nameInput = document.getElementById(`name-${destinationId}`);
            const addressInput = document.getElementById(`address-${destinationId}`);
            const durationInputs = document.querySelectorAll('#form-' + destinationId + ' .duration-inputs input');
            
            if (nameInput) nameInput.value = destination.name || '';
            if (addressInput) addressInput.value = destination.address ? destination.address.address : '';
            
            if (durationInputs.length >= 3) {
                const duration = destination.duration || { days: 0, hours: 0, minutes: 0 };
                durationInputs[0].value = duration.days || 0;
                durationInputs[1].value = duration.hours || 0;
                durationInputs[2].value = duration.minutes || 0;
            }
        }
    },

    /**
     * Annuler la création d'une destination
     */
    async cancelCreation() {
        // Trouver l'itinéraire actuel
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        if (!currentItinerary) {
            console.warn('⚠️ Aucun itinéraire courant trouvé');
            return;
        }
        
        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        
        // Trouver et supprimer les destinations avec l'ID temporaire
        const tempDestination = destinations.find(d => d.id === 'temp_destination');
        if (tempDestination) {
            await window.localStorageService.deleteDestination('temp_destination');
            
            // Supprimer la card du DOM (chercher par classe ou attribut)
            const tempCard = document.querySelector('[data-temp-destination="true"]');
            if (tempCard) {
                tempCard.remove();
            } else {
                // Fallback : supprimer la dernière card (celle en création)
                const allCards = document.querySelectorAll('.destination-card');
                if (allCards.length > 0) {
                    allCards[allCards.length - 1].remove();
                }
            }
        }
        
        console.log('✅ Création de destination annulée, destinations non sauvegardées supprimées');
        
        // Mettre à jour la visibilité du bouton ajouter
        if (window.Destinations && window.Destinations.updateAddDestinationButtonVisibility) {
            await window.Destinations.updateAddDestinationButtonVisibility();
        }
    },

    /**
     * Valider les entrées de durée
     */
    validateDurationInput(destinationId, type) {
        const input = document.getElementById(type + '-' + destinationId);
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
     * Vérifier si une destination a des activités et mettre à jour l'icône
     */
    async updateActivityIcon(destinationId) {
        const activities = await window.localStorageService.getActivities(destinationId);
        const expandBtn = document.querySelector(`#destination-${destinationId} .btn-expand span`);
        
        if (!expandBtn) return;
        
        if (activities.length === 0) {
            // Pas d'activités : afficher l'icône add avec tooltip
            expandBtn.textContent = 'add';
            expandBtn.title = 'Ajouter une activité';
            expandBtn.parentElement.title = 'Ajouter une activité';
        } else {
            // Des activités existent : afficher l'icône flèche
            expandBtn.textContent = 'keyboard_arrow_down';
            expandBtn.title = 'Déplier';
            expandBtn.parentElement.title = 'Déplier';
        }
    },

    /**
     * Déplier la section des activités (sans vérifier l'icône)
     */
    expandActivitiesSection(destinationId) {
        const card = document.getElementById(`destination-${destinationId}`);
        const activitiesSection = document.getElementById(`activities-${destinationId}`);
        const expandBtn = card.querySelector('.btn-expand span');
        
        if (!card || !activitiesSection || !expandBtn) return;
        
        // Forcer le dépliage
        activitiesSection.style.display = 'block';
        expandBtn.textContent = 'keyboard_arrow_up';
        expandBtn.title = 'Masquer les activités';
        expandBtn.parentElement.title = 'Masquer les activités';
        card.classList.add('expanded');
        
        // Charger les activités si pas encore chargées
        if (activitiesSection.querySelector('.activities-list').children.length === 0) {
            Activities.displayActivitiesOfDestination(destinationId);
        }
    },

    /**
     * Replier la section des activités (sans vérifier l'icône)
     */
    collapseActivitiesSection(destinationId) {
        const card = document.getElementById(`destination-${destinationId}`);
        const activitiesSection = document.getElementById(`activities-${destinationId}`);
        const expandBtn = card.querySelector('.btn-expand span');
        
        if (!card || !activitiesSection || !expandBtn) return;
        
        // Forcer le repli
        activitiesSection.style.display = 'none';
        card.classList.remove('expanded');
        
        // Mettre à jour l'icône selon les activités
        this.updateActivityIcon(destinationId);
    },

    /**
     * Toggle l'affichage des activités d'une destination
     */
    toggleDestinationCard(destinationId) {
        const card = document.getElementById(`destination-${destinationId}`);
        const activitiesSection = document.getElementById(`activities-${destinationId}`);
        const expandBtn = card.querySelector('.btn-expand span');
        
        if (!card || !activitiesSection || !expandBtn) return;
        
        // Si l'icône est "add", appeler Activities.addActivity
        if (expandBtn.textContent === 'add') {
            Activities.addActivity(destinationId);
            return;
        }
        
        const isExpanded = activitiesSection.style.display !== 'none';
        
        if (isExpanded) {
            // Replier
            this.collapseActivitiesSection(destinationId);
        } else {
            // Déplier
            this.expandActivitiesSection(destinationId);
        }
    },

    /**
     * Zoomer sur une destination dans la carte
     */
    async zoomToDestination(destinationId) {
        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        const destination = destinations.find(d => d.id === destinationId);
        
        if (!destination || !destination.address || !destination.address.location.lat || !destination.address.location.lng) {
            console.warn('⚠️ Destination sans coordonnées, impossible de zoomer');
            if (window.showToast) {
                window.showToast('Destination sans localisation définie', 'warning');
            }
            return;
        }
        
        console.log('🎯 Zoom sur la destination:', destination.name);
        
        // Utiliser le service de carte pour zoomer
        if (window.mapService && window.mapService.flyTo) {
            window.mapService.flyTo([destination.address.location.lat, destination.address.location.lng], 15);
        } else if (window.L && window.map) {
            window.map.flyTo([destination.address.location.lat, destination.address.location.lng], 15);
        } else {
            console.warn('⚠️ Service de carte non disponible');
        }
    },

    /**
     * Ouvrir la recherche d'adresse
     */
    openAddressSearch(destinationId, event) {
        event.stopPropagation();
        
        if (window.ChooseAddress && window.ChooseAddress.show) {
            window.ChooseAddress.show((selectedAddress) => {
                this.selectAddress(selectedAddress, destinationId);
            });
        } else {
            console.error('❌ Module ChooseAddress non disponible');
        }
    },

    /**
     * Désactiver le hover sur les autres destinations pendant l'édition
     */
    disableOtherCardsHover(editingDestinationId) {
        const allCards = document.querySelectorAll('.destination-card');
        allCards.forEach((card) => {
            const cardDestinationId = card.id.replace('destination-', '');
            if (cardDestinationId !== editingDestinationId) {
                card.classList.add('no-hover');
            } else {
                card.classList.remove('no-hover');
            }
        });
    },

    /**
     * Réactiver le hover sur toutes les destinations
     */
    enableOtherCardsHover() {
        const allCards = document.querySelectorAll('.destination-card');
        allCards.forEach(card => {
            card.classList.remove('destination-edit-disabled');
        });
    }
};

// Exporter pour utilisation globale
window.Destination = Destination;
