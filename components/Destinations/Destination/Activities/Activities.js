/**
 * Activities Module - Gère la liste des activités, suppression et ouverture Activity.js
 * Méthodes extraites de Destinations.js
 */

const Activities = {
    
    /**
     * Ajouter une activité à une destination
     */
    addActivity(index) {
        const destination = window.firebaseService.getDestinationsOfCurrentItinerary()[index];
        if (!destination || !destination.id) {
            console.error('❌ Destination invalide pour ajouter une activité');
            return;
        }
        
        console.log('✅ Ajout d\'une activité à la destination:', destination.name);
        
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
    async deleteActivity(activityId, destinationIndex, buttonElement) {
        const destination = window.firebaseService.getDestinationsOfCurrentItinerary()[destinationIndex];
        if (!destination || !destination.id) return;

        try {
            console.log('🗑️ Suppression de l\'activité:', activityId);

            // Désactiver le bouton et afficher le loading
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '<svg class="loading-spinner-small" viewBox="0 0 24 24" style="overflow: visible;"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--error-red)" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416 31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dashoffset" from="31.416" to="0" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>';
            }

            // Créer l'objet activité à supprimer
            const activityToDelete = { id: activityId };
            
            // Utiliser le service pour supprimer l'activité
            const success = await window.firebaseService.deleteActivity(activityToDelete, destination);
            
            if (success) {
                console.log('✅ Activité supprimée:', activityId);
                if (window.showSuccessSnackBar) {
                    window.showSuccessSnackBar('Activité supprimée avec succès');
                }
                
                // Recharger la liste des activités
                this.displayActivitiesOfDestination(destinationIndex);
            } else {
                console.error('❌ Échec de la suppression de l\'activité');
                if (window.showErrorSnackBar) {
                    window.showErrorSnackBar('Échec de la suppression de l\'activité');
                }
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
    createActivityHTML(activity, destinationIndex) {
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
                        <button class="btn-edit" onclick="window.Activity.editActivity('${activity.id}', ${destinationIndex})" title="Modifier l'activité">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn-delete" onclick="Activities.deleteActivity('${activity.id}', ${destinationIndex}, this)" title="Supprimer l'activité">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return activityHTML;
    },

    /**
     * Charger et afficher les activités d'une destination
     */
    loadActivities(destinationIndex) {
        const destination = window.firebaseService.getDestinationsOfCurrentItinerary()[destinationIndex];
        if (!destination || !destination.id) {
            console.warn('⚠️ Destination invalide pour charger les activités');
            return;
        }

        const activitiesList = document.getElementById(`activities-list-${destinationIndex}`);
        if (!activitiesList) {
            console.warn('⚠️ Conteneur d\'activités non trouvé');
            return;
        }

        // Vider la liste actuelle
        activitiesList.innerHTML = '';

        // Charger les activités depuis Firebase
        const activities = window.firebaseService.getActivities(destination);
        console.log(`📋 ${activities.length} activités chargées pour la destination ${destination.name}`);
        
        if (activities.length === 0) {
            activitiesList.innerHTML = '<div class="no-activities">Aucune activité pour cette destination</div>';
            return;
        }

        // Trier les activités par ordre
        activities.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Créer le HTML pour chaque activité
        activities.forEach(activity => {
            const activityHTML = this.createActivityHTML(activity, destinationIndex);
            activitiesList.innerHTML += activityHTML;
        });
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
                activitiesList.innerHTML = '<p style="color: red;">Erreur lors du chargement des activités</p>';
            }
        }
    }
};

// Exporter pour utilisation globale
window.Activities = Activities;
