/**
 * Activities Module - Gère la liste des activités, suppression et ouverture Activity.js
 */

const Activities = {
    
    /**
     * Ajouter une activité à une destination
     */
    async addActivity(destinationId) {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        const destination = destinations.find(d => d.id === destinationId);
        if (!destination || !destination.id) {
            console.error('❌ Destination invalide pour ajouter une activité');
            return;
        }
        
                
        // Ouvrir le composant Activity pour créer une nouvelle activité
        if (window.Activity && window.Activity.showActivityPopup) {
            // Préparer les données pour une nouvelle activité
            window.Activity.setCurrentDestination(destination);
            window.Activity.currentActivity = null; // null = nouvelle activité
            window.Activity.showActivityPopup();
        } else {
            console.error('❌ Module Activity ou méthode showActivityPopup non disponible');
        }
    },

    /**
     * Supprimer une activité
     */
    async deleteActivity(activityId, destinationId, buttonElement) {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        const destination = destinations.find(d => d.id === destinationId);
        if (!destination || !destination.id) return;

        try {

            // Désactiver le bouton et afficher le loading
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '<svg class="loading-spinner-small" viewBox="0 0 24 24" style="overflow: visible;"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--error-red)" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416 31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dashoffset" from="31.416" to="0" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>';
            }

            // Créer l'objet activité à supprimer
            const activityToDelete = { id: activityId };
            
            // Utiliser le service pour supprimer l'activité
            await window.localStorageService.deleteActivity(destination.id, activityId);
            
            if (window.showSuccessSnackBar) {
                window.showSuccessSnackBar('Activité supprimée avec succès');
            }
            
            // Recharger la liste des activités
            await this.displayActivitiesOfDestination(destinationId);
            
            // Mettre à jour l'icône d'activité selon les activités existantes
            if (window.Destination && window.Destination.updateActivityIcon) {
                await window.Destination.updateActivityIcon(destinationId);
            }
            
            // Vérifier s'il reste des activités après suppression
            const activities = await window.localStorageService.getActivities(destinationId);
            if (activities.length === 0) {
                // Plus d'activités : replier la section si elle est dépliée
                const activitiesSection = document.getElementById(`activities-${destinationId}`);
                if (activitiesSection && activitiesSection.style.display !== 'none') {
                    window.Destination.collapseActivitiesSection(destinationId);
                }
            }
            
            // Rafraîchir la synthèse pour mettre à jour les coûts en temps réel
            if (window.Synthèse && window.Synthèse.refresh) {
                await window.Synthèse.refresh();
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la suppression de l\'activité:', error);
            if (window.showErrorSnackBar) {
                window.showErrorSnackBar('Erreur lors de la suppression de l\'activité');
            }
        } finally {
            // Restaurer le bouton
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.innerHTML = '<span class="material-icons">delete</span>';
            }
        }
    },

    /**
     * Créer le HTML pour une activité
     */
    createActivityHTML(activity, destinationId) {
        const time = activity.time || '';
        const price = activity.price ? `${activity.price}€` : '';
        
        let activityHTML = `
            <div class="activity-item" data-activity-id="${activity.id}">
                <div class="activity-header">
                    <div class="activity-info">
                        <div class="activity-name-and-price">
                            <strong>${activity.name}</strong>
                            ${price ? `<span class="activity-price">${price}</span>` : ''}
                        </div>
                        ${time ? `<div class="activity-time"><span class="material-icons">schedule</span> ${time}</div>` : ''}
                    </div>
                    <div class="activity-actions">
                        <button class="btn-edit" onclick="window.Activity.editActivity('${activity.id}', '${destinationId}')" title="Modifier l'activité">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn-delete" onclick="Activities.deleteActivity('${activity.id}', '${destinationId}', this)" title="Supprimer l'activité">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return activityHTML;
    },

    /**
     * Afficher les activités d'une destination spécifique
     */
    async displayActivitiesOfDestination(destinationId) {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        const destination = destinations.find(d => d.id === destinationId);
        if (!destination || !destination.id) return;
        
        try {
            // Utiliser le nouveau service pour charger les activités
            const activities = await window.localStorageService.getActivities(destination.id);
            console.log('🔍 Activités chargées pour destination', destination.id, ':', activities);
            
            const activitiesList = document.getElementById(`activities-list-${destinationId}`);
            activitiesList.innerHTML = '';
            
            if (activities.length === 0) {
                activitiesList.innerHTML = '<p style="color: var(--gray-light); padding: 10px;">Aucune activité pour cette destination</p>';
                return;
            }
            
            // Trier les activités par ordre
            activities.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            activities.forEach(activity => {
                
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
                                <button class="btn-edit" onclick="window.Activity.editActivity('${activity.id}', '${destinationId}')" title="Modifier l'activité">
                                    <span class="material-icons">edit</span>
                                </button>
                                <button class="btn-delete" onclick="Activities.deleteActivity('${activity.id}', '${destinationId}', this)" title="Supprimer l'activité">
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
                
                // Afficher les notes si présentes
                if (activity.notes && activity.notes.trim()) {
                    activityHTML += `
                        <div class="activity-notes">${activity.notes.replace(/\n/g, '<br>')}</div>
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
            const activitiesList = document.getElementById(`activities-list-${destinationId}`);
            if (activitiesList) {
                activitiesList.innerHTML = '<p style="color: red;">Erreur lors du chargement des activités</p>';
            }
        }
    }
};

// Exporter pour utilisation globale
window.Activities = Activities;
