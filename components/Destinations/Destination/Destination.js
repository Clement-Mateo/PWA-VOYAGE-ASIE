/**
 * Destination Module - Gère le formulaire destination et la sauvegarde
 * Méthodes extraites de Destinations.js
 */

const Destination = {
    
    /**
     * Éditer une destination
     */
    async editDestination(index) {
        // Annuler d'abord toute création en cours
        await this.cancelCreation();
        
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        const destination = destinations[index];
        
        if (!destination) {
            console.error('❌ Destination non trouvée à l\'index', index);
            return;
        }
        
        console.log('✅ Édition de la destination:', destination.name);
        
        const card = document.getElementById(`destination-${index}`);
        const form = document.getElementById(`form-${index}`);
        const activitiesSection = document.getElementById(`activities-${index}`);
        const expandBtn = card.querySelector('.btn-expand span');
        
        // Replier la destination avant l'édition
        if (activitiesSection && activitiesSection.style.display !== 'none') {
            activitiesSection.style.display = 'none';
            if (expandBtn) {
                expandBtn.textContent = 'expand_more';
            }
        }
        
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
        this.disableOtherCardsHover(index);
        
        // Scroll vers la destination
        this.scrollToDestination(index);
        
        // Remplir les champs avec les données actuelles
        const nameInput = document.getElementById(`name-${index}`);
        const addressInput = document.getElementById(`address-${index}`);
        const daysInput = document.getElementById(`days-${index}`);
        const hoursInput = document.getElementById(`hours-${index}`);
        const minutesInput = document.getElementById(`minutes-${index}`);
        
        if (nameInput) nameInput.value = destination.name || '';
        if (addressInput) addressInput.value = destination.address ? destination.address.address : '';
        
        // Remplir les champs de durée
        if (destination.duration) {
            if (daysInput) daysInput.value = destination.duration.days || 0;
            if (hoursInput) hoursInput.value = destination.duration.hours || 0;
            if (minutesInput) minutesInput.value = destination.duration.minutes || 0;
        }
    },

    /**
     * Sélectionner une adresse (avec auto-remplissage du nom)
     */
    selectAddress(selectedAddress, index) {
        // Mettre à jour le champ adresse
        const addressInput = document.getElementById(`address-${index}`);
        if (addressInput) {
            addressInput.value = selectedAddress.address;
        }
        
        // Auto-remplir le nom si vide avec le nom du lieu ou de la ville
        const nameInput = document.getElementById(`name-${index}`);
        if (nameInput && !nameInput.value.trim() && selectedAddress.name) {
            nameInput.value = selectedAddress.name;
        }
        
        // Stocker les données complètes de l'adresse
        this.selectedAddress = selectedAddress;
    },

    /**
     * Scroll vers une destination spécifique
     */
    scrollToDestination(index) {
        const card = document.getElementById(`destination-${index}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    /**
     * Sauvegarder une destination modifiée
     */
    async saveDestination(index) {
        const saveButton = document.querySelector(`#form-${index} .btn-save`);
        
        // Si déjà en cours de sauvegarde, ignorer
        if (this.isSaving) {
            console.log('⏳ Sauvegarde déjà en cours, ignore...');
            return;
        }
        
        try {
            this.isSaving = true;
            
            // Afficher le spinner de chargement
            window.showButtonLoading(`#form-${index} .btn-save`, 'Enregistrement...');
            
            const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
            const destination = destinations[index];
            
            if (!destination) {
                console.error('❌ Destination non trouvée à l\'index', index);
                window.restoreButton(`#form-${index} .btn-save`, 'Enregistrer', 'save');
                return;
            }
            
            // Récupérer les valeurs du formulaire
            const name = document.getElementById(`name-${index}`).value.trim();
            const addressInput = document.getElementById(`address-${index}`);
            const address = addressInput ? addressInput.value.trim() : '';
            
            // Récupérer les valeurs de durée
            const days = parseInt(document.getElementById(`days-${index}`).value) || 0;
            const hours = parseInt(document.getElementById(`hours-${index}`).value) || 0;
            const minutes = parseInt(document.getElementById(`minutes-${index}`).value) || 0;
            
            if (!name) {
                window.showErrorSnackBar('Le nom de la destination est requis');
                window.restoreButton(`#form-${index} .btn-save`, 'Enregistrer', 'save');
                return;
            }
            
            if (!address) {
                window.showErrorSnackBar('L\'adresse de la destination est requise');
                window.restoreButton(`#form-${index} .btn-save`, 'Enregistrer', 'save');
                return;
            }
            
            console.log('📝 Sauvegarde de la destination:', { name, address, duration: { days, hours, minutes } });
            
            // Préparer les données mises à jour (structure correcte)
            const updatedDestination = {
                ...destination,
                name: name,
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
            
            // Si c'est une nouvelle destination (sans ID), la créer
            if (!destination.id) {
                console.log('🆕 Création d\'une nouvelle destination');
                
                // Géocoder l'adresse pour obtenir les coordonnées
                try {
                    const coords = await this.geocodeAddress(address);
                    if (coords) {
                        updatedDestination.address.location = {
                            lat: coords.lat,
                            lng: coords.lng
                        };
                        
                        // Obtenir le pays depuis les coordonnées
                        try {
                            const country = await this.getCountryFromCoordinates(coords.lat, coords.lng);
                            if (country) {
                                updatedDestination.address.country = country;
                                console.log('🌍 Pays ajouté depuis coordonnées:', country);
                            }
                        } catch (error) {
                            console.warn('⚠️ Impossible d\'obtenir le pays depuis les coordonnées:', error);
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ Impossible de géocoder l\'adresse:', error);
                }
                
                // Générer un ID pour la nouvelle destination
                updatedDestination.id = `destination_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Récupérer l'itinéraire courant
                const currentItinerary = window.firebaseService.getCurrentItinerary();
                if (currentItinerary) {
                    // Remplacer la dernière destination (vide) par la nouvelle destination
                    const lastIndex = currentItinerary.destinations.length - 1;
                    currentItinerary.destinations[lastIndex] = updatedDestination;
                    
                    // Mettre à jour l'itinéraire en base
                    const success = await window.firebaseService.updateItinerary(currentItinerary);
                    
                    if (success) {
                        console.log('✅ Destination créée avec succès');
                        window.showSuccessSnackBar('Destination créée avec succès');
                        
                        // Réactiver le hover sur les autres destinations
                        this.enableOtherCardsHover();
                        
                        Destinations.loadDestinations();
                    } else {
                        throw new Error('Échec de la création de la destination');
                    }
                } else {
                    throw new Error('Aucun itinéraire courant trouvé');
                }
            } else {
                // Mettre à jour la destination existante
                console.log('🔄 Mise à jour de la destination existante');
                
                // Géocoder la nouvelle adresse pour obtenir les coordonnées
                try {
                    const coords = await this.geocodeAddress(address);
                    if (coords) {
                        updatedDestination.address.location = {
                            lat: coords.lat,
                            lng: coords.lng
                        };
                        
                        // Obtenir le pays depuis les coordonnées
                        try {
                            const country = await this.getCountryFromCoordinates(coords.lat, coords.lng);
                            if (country) {
                                updatedDestination.address.country = country;
                                console.log('🌍 Pays mis à jour depuis coordonnées:', country);
                            }
                        } catch (error) {
                            console.warn('⚠️ Impossible d\'obtenir le pays depuis les coordonnées:', error);
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ Impossible de géocoder l\'adresse lors de la mise à jour:', error);
                }
                
                const success = await window.firebaseService.updateDestination(updatedDestination);
                
                if (success) {
                    console.log('✅ Destination mise à jour avec succès');
                    window.showSuccessSnackBar('Destination mise à jour avec succès');
                    
                    // Réactiver le hover sur les autres destinations
                    this.enableOtherCardsHover();
                    
                    // Mettre à jour l'affichage
                    Destinations.loadDestinations();
                } else {
                    throw new Error('Échec de la mise à jour de la destination');
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde de la destination:', error);
            window.showErrorSnackBar('Erreur lors de la sauvegarde: ' + error.message);
        } finally {
            this.isSaving = false;
            window.restoreButton(`#form-${index} .btn-save`, 'Enregistrer', 'save');
        }
    },

    /**
     * Géocoder une adresse pour obtenir les coordonnées
     */
    async geocodeAddress(address) {
        return new Promise((resolve, reject) => {
            if (!window.L || !window.L.Control.Geocoder) {
                reject(new Error('Geocoder non disponible'));
                return;
            }
            
            const geocoder = window.L.Control.Geocoder.nominatim();
            
            geocoder.geocode(address, (results) => {
                if (results && results.length > 0) {
                    const result = results[0];
                    resolve({
                        lat: result.center.lat,
                        lng: result.center.lng
                    });
                } else {
                    reject(new Error('Adresse non trouvée'));
                }
            });
        });
    },

    /**
     * Afficher un message de succès
     */
    showSuccess(message) {
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            console.log('✅', message);
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
     * Formater la durée
     */
    formatDuration(duration) {
        if (!duration) return '';
        
        const parts = [];
        if (duration.days > 0) parts.push(`${duration.days}j`);
        if (duration.hours > 0) parts.push(`${duration.hours}h`);
        if (duration.minutes > 0) parts.push(`${duration.minutes}min`);
        
        return parts.length > 0 ? parts.join(' ') : '';
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
                
                // Réactiver le hover sur les autres destinations
                this.enableOtherCardsHover();
                
                // Restaurer les valeurs originales
                const nameInput = card.querySelector(`#name-${index}`);
                const addressInput = card.querySelector(`#address-${index}`);
                const durationInputs = card.querySelectorAll('.duration-inputs input');
                
                if (nameInput) nameInput.value = destination.name || '';
                if (addressInput) addressInput.value = destination.address ? destination.address.address : '';
                
                if (durationInputs.length >= 3) {
                    const duration = destination.duration || { days: 0, hours: 0, minutes: 0 };
                    durationInputs[0].value = duration.days || 0;
                    durationInputs[1].value = duration.hours || 0;
                    durationInputs[2].value = duration.minutes || 0;
                }
            }
        }
    },

    /**
     * Annuler la création d'une destination
     */
    async cancelCreation() {
        // Trouver l'itinéraire actuel
        const currentItinerary = window.firebaseService.getCurrentItinerary();
        if (!currentItinerary) {
            console.warn('⚠️ Aucun itinéraire courant trouvé');
            return;
        }
        
        // Trouver et supprimer les destinations sans ID de l'itinéraire
        const unsavedDestinations = currentItinerary.destinations.filter(d => !d.id);
        unsavedDestinations.forEach(destination => {
            const index = currentItinerary.destinations.indexOf(destination);
            if (index > -1) {
                currentItinerary.destinations.splice(index, 1);
                
                // Supprimer la card du DOM
                const card = document.getElementById(`destination-${index}`);
                if (card) {
                    card.remove();
                }
            }
        });
        
        console.log('✅ Création de destination annulée, destinations non sauvegardées supprimées');
        
        // Mettre à jour la visibilité du bouton ajouter
        if (window.Destinations && window.Destinations.updateAddDestinationButtonVisibility) {
            window.Destinations.updateAddDestinationButtonVisibility();
        }
    },

    /**
     * Valider les entrées de durée
     */
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
     * Toggle l'affichage des activités d'une destination
     */
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
            
            // Charger les activités si pas encore chargées
            if (activitiesSection.querySelector('.activities-list').children.length === 0) {
                Activities.loadActivities(index);
            }
        }
    },

    /**
     * Zoomer sur une destination dans la carte
     */
    zoomToDestination(index) {
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        const destination = destinations[index];
        
        if (!destination || !destination.address || !destination.address.latitude || !destination.address.longitude) {
            console.warn('⚠️ Destination sans coordonnées, impossible de zoomer');
            if (window.showToast) {
                window.showToast('Destination sans localisation définie', 'warning');
            }
            return;
        }
        
        console.log('🎯 Zoom sur la destination:', destination.name);
        
        // Utiliser le service de carte pour zoomer
        if (window.mapService && window.mapService.flyTo) {
            window.mapService.flyTo([destination.address.latitude, destination.address.longitude], 15);
        } else if (window.L && window.map) {
            window.map.flyTo([destination.address.latitude, destination.address.longitude], 15);
        } else {
            console.warn('⚠️ Service de carte non disponible');
        }
    },

    /**
     * Ouvrir la recherche d'adresse
     */
    openAddressSearch(destinationIndex, event) {
        event.stopPropagation();
        
        if (window.ChooseAddress && window.ChooseAddress.show) {
            window.ChooseAddress.show((selectedAddress) => {
                this.selectAddress(selectedAddress, destinationIndex);
            });
        } else {
            console.error('❌ Module ChooseAddress non disponible');
        }
    },

    /**
     * Désactiver le hover sur les autres destinations pendant l'édition
     */
    disableOtherCardsHover(editingIndex) {
        const allCards = document.querySelectorAll('.destination-card');
        allCards.forEach((card, index) => {
            if (index !== editingIndex) {
                card.classList.add('destination-edit-disabled');
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
