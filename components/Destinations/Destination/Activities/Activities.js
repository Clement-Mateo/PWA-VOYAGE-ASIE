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
            await window.localStorageService.deleteActivity(activityId, destination.id);
            
            if (window.showSuccessSnackBar) {
                window.showSuccessSnackBar('Activité supprimée avec succès');
            }
            
            // Rafraîchir la popup après suppression
            this.refreshActivityList(destination);
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
    createActivityItem(activity, destination) {
        const currencySymbol = destination?.address?.symbol || destination?.address?.countryCurrency?.symbol;

        return `
            <div class="activity-item" data-activity-id="${activity.id}">
                <div class="activity-header">
                    <h4>${activity.name}</h4>
                    <div class="activity-actions">
                        <button class="btn-edit" onclick="Activity.editActivity('${activity.id}', '${destination.id}')" title="Modifier">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn-delete" onclick="Activities.deleteActivity('${activity.id}', '${destination.id}')" title="Supprimer">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
                <div class="activity-info">
                    ${activity.price ? `
                        <div class="activity-price">
                            ${activity.price}€
                            ${activity.localCurrency && activity.localCurrencyCode ? ` / ${activity.localCurrency}${currencySymbol || activity.localCurrencyCode}` : ''}
                        </div>
                    ` : ''}
                    ${activity.startTime && activity.endTime && (activity.startTime !== '00:00' || activity.endTime !== '00:00') ? `
                        <div class="activity-time">
                            <span class="material-icons">schedule</span>
                            ${activity.startTime} - ${activity.endTime}
                        </div>
                    ` : ''}
                    ${activity.type ? `
                        <div class="activity-type">
                            <span class="material-icons">${this.getActivityIcon(activity.type)}</span>
                            ${activity.type}
                        </div>
                    ` : ''}
                    ${activity.notes ? `
                        <div class="activity-notes">${activity.notes}</div>
                    ` : ''}
                    ${activity.links && activity.links.length > 0 ? `
                        <div class="links-list">
                            ${activity.links.map(link => LinksService.createLinkCard(link, true)).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Créer le HTML pour la liste des activités
     */
    createActivityList(activities, destination) {
        if (activities.length === 0) {
            return `
                <div class="no-activities">
                    <span class="material-icons">attractions</span>
                    <p>Aucune activité pour cette destination</p>
                </div>
            `;
        }
        
        return activities.map(activity => this.createActivityItem(activity, destination)).join('');
    },

    /**
     * Afficher la popup des activités
     */
    async showActivitiesPopup(destinationId) {
        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        const destination = destinations.find(d => d.id === destinationId);
        
        if (!destination) {
            console.error('❌ Destination non trouvée avec l\'ID', destinationId);
            return;
        }

        // Charger les activités à l'ouverture de la popup
        const activities = await window.localStorageService.getActivities(destinationId);
        
        // Créer la popup
        const popup = document.createElement('div');
        popup.className = 'modal-overlay';
        popup.id = 'activitiesPopup';
        
        popup.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Activités - ${destination.name}</h3>
                    <button class="btn-close" onclick="Activities.hideActivitiesPopup()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    ${this.createActivityList(activities, destination)}
                </div>
                <div class="modal-footer">
                    <button class="btn-add" onclick="Activities.addActivity('${destinationId}')">
                        <span class="material-icons">add</span>
                        Ajouter une activité
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Afficher la popup avec animation
        setTimeout(() => {
            popup.classList.add('open');
        }, 10);
    },

    /**
     * Rafraîchir le contenu de la popup des activités
     */
    async refreshActivityList(destination, scrollToActivityId = null) {
        const popup = document.getElementById('activitiesPopup');
        if (!popup) return;
        
        // Charger les activités fraîches
        const activities = await window.localStorageService.getActivities(destinationId);
        
        // Mettre à jour le contenu de la popup
        const modalBody = popup.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = this.createActivityList(activities, destination);
            
            // Si un ID d'activité est fourni, faire défiler jusqu'à cette activité
            if (scrollToActivityId) {
                this.scrollToActivity(scrollToActivityId);
            }
        }
    },

    /**
     * Faire défiler jusqu'à une activité spécifique
     */
    scrollToActivity(activityId) {
        const popup = document.getElementById('activitiesPopup');
        if (!popup) return;
        
        // Attendre que le DOM soit mis à jour
        setTimeout(() => {
            // Chercher l'élément de l'activité par son ID
            const activityElement = popup.querySelector(`[data-activity-id="${activityId}"]`);
            if (activityElement) {
                // Faire défiler jusqu'à l'élément
                activityElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 100);
    },

    /**
     * Cacher la popup des activités
     */
    hideActivitiesPopup() {
        const popup = document.getElementById('activitiesPopup');
        if (popup) {
            popup.classList.remove('open');
            setTimeout(() => {
                popup.remove();
            }, 300);
        }
    },

    /**
     * Obtenir l'icône pour un type d'activité
     */
    getActivityIcon(type) {
        const icons = {
            culture: 'museum',
            gastronomie: 'restaurant',
            nature: 'nature',
            sport: 'fitness_center'
        };
        return icons[type] || 'event';
    }
};

// Exporter pour utilisation globale
window.Activities = Activities;
