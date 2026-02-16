// Composant Activity
const Activity = {
    // État du composant
    currentDestination: null,
    currentActivity: null,

    // Initialiser le composant
    init() {
        // Les taux de change seront chargés via LocationService
    },

    // Définir la destination actuelle
    setCurrentDestination(destination) {
        this.currentDestination = destination;
    },

    // Afficher le popup d'activité
    async showActivityPopup() {
        try {
            // Vérifier si le popup existe déjà
            let popup = document.getElementById('activityPopup');
            
            if (!popup) {
                await this.createActivityPopup(); // Créer le popup s'il n'existe pas
                popup = document.getElementById('activityPopup'); // Réassigner popup

            }

            popup.classList.add('open');

            // Réinitialiser le formulaire pour une nouvelle activité
            const form = document.getElementById('activityForm');
            if (form) {
                form.reset();
            }
            
            // Réinitialiser tous les champs manuellement pour être sûr
            const nameField = document.getElementById('activityName');
            const startTime = document.getElementById('startTime');
            const endTime = document.getElementById('endTime');
            const priceAmount = document.getElementById('priceAmount');
            const localCurrencyField = document.getElementById('localCurrency');
            const typeField = document.getElementById('activityType');
            const notesField = document.getElementById('activityNotes');
            
            // En mode ajout, réinitialiser tout
            if (!this.currentActivity) {
                if (nameField) nameField.value = '';
                if (startTime) startTime.value = '';
                if (endTime) endTime.value = '';
                if (priceAmount) priceAmount.value = '';
                if (localCurrencyField) localCurrencyField.value = '';
                if (typeField) typeField.value = '';
                if (notesField) notesField.value = '';
                
                // Focus automatique sur le champ nom pour la création
                setTimeout(() => {
                    if (nameField) {
                        nameField.focus();
                        nameField.select();
                    }
                }, 100);
            }
            // En mode édition, les champs seront pré-remplis dans editActivity
            
            // Mettre à jour le titre
            const title = popup.querySelector('.modal-title');
            if (title && !this.currentActivity) {
                title.textContent = 'Ajouter une activité';
            } else {
                title.textContent = 'Modifier une activité';
            }
            
            // Récupérer la devise locale
            const localCurrency = await window.LocationService.getLocalCurrency(this.currentDestination.id);
            
            // Charger les taux de change et vérifier si on a le taux pour cette devise spécifique
            const rates = await window.LocationService.loadExchangeRates();
            const hasExchangeRate = rates && rates[localCurrency.code];
            const hasCurrencyName = localCurrency.name && localCurrency.name !== localCurrency.code;
            const isNotEuro = localCurrency.code !== 'EUR'; // Masquer si c'est EUR
            const showCurrencyField = hasExchangeRate && hasCurrencyName && isNotEuro;
                        
            // Mettre à jour le label de la devise locale
            const label = popup.querySelector('label[for="localCurrency"]');
            if (label) {
                label.textContent = `Prix (${localCurrency.symbol} - ${localCurrency.name})`;
            }
            
            // Masquer uniquement le champ de devise locale, garder le champ €
            const currencyRow = popup.querySelector('#currencyRow');
            const localCurrencyLabel = popup.querySelector('label[for="localCurrency"]');

            console.log('localCurrencyField : ' + localCurrencyField);
            console.log('currencyRow : ' + currencyRow);
            console.log('localCurrencyLabel : ' + localCurrencyLabel);
            console.log('hasExchangeRate : ' + hasExchangeRate);
            console.log('hasCurrencyName : ' + hasCurrencyName);
            console.log('localCurrency.code : ' + localCurrency.code);
            console.log('showCurrencyField : ' + showCurrencyField);
            
            if (localCurrencyField && currencyRow && localCurrencyLabel) {
                if (showCurrencyField) {
                    localCurrencyField.style.display = 'block';
                    currencyRow.style.display = 'flex';
                    localCurrencyLabel.style.display = 'block';
                    currencyRow.classList.add('has-currency');
                } else {
                    localCurrencyField.style.display = 'none';
                    localCurrencyLabel.style.display = 'none';
                    currencyRow.style.display = 'flex';
                    currencyRow.classList.remove('has-currency');
                    // Le champ € prend toute la largeur
                    const priceAmount = popup.querySelector('#priceAmount');
                    if (priceAmount) {
                        priceAmount.style.display = 'block';
                        priceAmount.style.flex = '1';
                    }
                }
            }

        } catch (error) {
            console.error('Erreur lors de l\'ouverture du popup d\'activité:', error);
            showErrorSnackBar('Impossible d\'ouvrir le formulaire d\'activité. Veuillez réessayer.');
        }
    },

    // Créer le popup d'activité
    async createActivityPopup() {
        if (document.getElementById('activityPopup')) {
            return; // Le popup existe déjà
        }

        // S'assurer que les taux de change sont chargés
        const localCurrency = await window.LocationService.getLocalCurrency(this.currentDestination.id);
        
        const popup = document.createElement('div');
        popup.id = 'activityPopup';
        popup.className = 'modal';
        
        popup.innerHTML = `
            <div class="modal-backdrop" onclick="Activity.hideActivityPopup()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${this.currentActivity ? 'Modifier une activité' :  'Ajouter une activité'}</h3>
                    <button class="btn-close" onclick="Activity.hideActivityPopup()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group full-width">
                        <label class="form-label" for="activityName">Nom de l'activité</label>
                        <input type="text" class="form-input" id="activityName" placeholder="Ex: Visite du temple, dégustation..." />
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="startTime">Début</label>
                            <div class="time-input-custom">
                                <input type="number" id="startTimeHours" class="time-input-hours" placeholder="HH" min="0" max="23" oninput="Activity.validateTimeInput(this, 'hours')">
                                <span class="time-separator">:</span>
                                <input type="number" id="startTimeMinutes" class="time-input-minutes" placeholder="MM" min="0" max="59" oninput="Activity.validateTimeInput(this, 'minutes')">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="endTime">Fin</label>
                            <div class="time-input-custom">
                                <input type="number" id="endTimeHours" class="time-input-hours" placeholder="HH" min="0" max="23" oninput="Activity.validateTimeInput(this, 'hours')">
                                <span class="time-separator">:</span>
                                <input type="number" id="endTimeMinutes" class="time-input-minutes" placeholder="MM" min="0" max="59" oninput="Activity.validateTimeInput(this, 'minutes')">
                            </div>
                        </div>
                    </div>
                    <div class="form-row" id="currencyRow">
                        <div class="form-group">
                            <label class="form-label" for="priceAmount">Prix (€)</label>
                            <input type="number" class="form-input" id="priceAmount" placeholder="0" min="0" step="1" oninput="Activity.updateLocalCurrency()" />
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="localCurrency">Prix (${localCurrency.symbol} - ${localCurrency.name})</label>
                            <input type="number" class="form-input" id="localCurrency" placeholder="0" min="0" step="1" oninput="LocationService.updateEurFromLocalCurrency(this.value, localCurrency.code)" style="display: none;" />
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label" for="activityType">Type d'activité</label>
                        <select class="form-input" id="activityType">
                            <option value="">Sélectionner...</option>
                            <option value="culture">Culture</option>
                            <option value="gastronomie">Gastronomie</option>
                            <option value="nature">Nature</option>
                            <option value="sport">Sport</option>
                            <option value="shopping">Shopping</option>
                            <option value="hebergement">Hébergement</option>
                            <option value="autre">Autre</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label" for="activityNotes">Notes</label>
                        <textarea class="form-input" id="activityNotes" placeholder="Ajouter des notes ou remarques..." rows="3"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" onclick="Activity.hideActivityPopup()">Annuler</button>
                    <button class="btn-save" onclick="Activity.saveActivity()">Enregistrer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
    },

    // Mettre à jour le champ de devise locale lors de la saisie du prix en euros
    async updateLocalCurrency() {
        const priceAmount = document.getElementById('priceAmount');
        const localCurrencyField = document.getElementById('localCurrency');
        
        // Ne faire la conversion que si le champ devise locale existe
        if (!localCurrencyField) {
            return;
        }
        
        if (priceAmount && !isNaN(priceAmount.value) && priceAmount.value) {
            const eurAmount = parseFloat(priceAmount.value) || 0;
            const localCurrency = await window.LocationService.getLocalCurrency(this.currentDestination.id);
            const localAmount = await window.LocationService.convertEurToLocalCurrency(eurAmount, localCurrency.code);
            localCurrencyField.value = localAmount.toFixed(2);
        } else {
            localCurrencyField.value = '';
        }
    },

    // Cacher le popup d'activité
    hideActivityPopup() {
        const popup = document.getElementById('activityPopup');
        if (popup) {
            popup.classList.remove('open');
        }
        
        // Réinitialiser l'activité actuelle
        this.currentActivity = null;
        
        // Réinitialiser le formulaire
        const form = document.getElementById('activityForm');
        if (form) {
            form.reset();
        }
        
        // Réinitialiser manuellement les champs custom time
        const startTimeHours = document.getElementById('startTimeHours');
        const startTimeMinutes = document.getElementById('startTimeMinutes');
        const endTimeHours = document.getElementById('endTimeHours');
        const endTimeMinutes = document.getElementById('endTimeMinutes');
        
        if (startTimeHours) startTimeHours.value = '';
        if (startTimeMinutes) startTimeMinutes.value = '';
        if (endTimeHours) endTimeHours.value = '';
        if (endTimeMinutes) endTimeMinutes.value = '';
    },

    // Sauvegarder une activité
    async saveActivity() {
        if (!this.currentDestination) {
            console.error('❌ Aucune destination définie');
            return;
        }

        // Afficher le spinner sur le bouton save
        window.showButtonLoading('.modal-footer .btn-save', 'Enregistrement...');

        try {
        const name = document.getElementById('activityName').value;
        
        // Récupérer les valeurs depuis les inputs custom
        const startTime = this.getTimeFromInputs('startTime');
        const endTime = this.getTimeFromInputs('endTime');
        const priceAmount = document.getElementById('priceAmount').value;
        let localCurrency = document.getElementById('localCurrency').value;
        const activityType = document.getElementById('activityType').value;
        const notes = document.getElementById('activityNotes').value;

        if (!name.trim()) {
            showErrorSnackBar('Veuillez saisir un nom d\'activité');
            return;
        }

        // Valider et formater les temps
        const { startTime: formattedStart, endTime: formattedEnd } = this.validateAndFormatTimes(startTime, endTime);

        // Si le champ devise locale est vide, le calculer automatiquement
        if (!localCurrency && priceAmount) {
            const eurAmount = parseFloat(priceAmount) || 0;
            localCurrency = (window.LocationService.convertEurToLocalCurrency(eurAmount, localCurrency.code)).toFixed(2);
        }

        const localCurrencyInfo = await window.LocationService.getLocalCurrency(this.currentDestination.id);
        const activity = {
            id: this.currentActivity?.id || `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            startTime: formattedStart,
            endTime: formattedEnd,
            price: parseFloat(priceAmount) || 0, // TOUJOURS une simple valeur
            type: activityType || '',
            notes: notes.trim() || ''
        };
        
        // Ajouter les champs de devise locale seulement si ce n'est pas EUR
        if (localCurrencyInfo.code !== 'EUR') {
            activity.localCurrency = parseFloat(localCurrency) || 0;
            activity.localCurrencyCode = localCurrencyInfo.code;
        }

        // Récupérer l'itinéraire actuel
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        if (!currentItinerary) {
            console.error('❌ Aucun itinéraire trouvé pour sauvegarder l\'activité');
            return;
        }
        
        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        const destination = destinations.find(dest => dest.id === this.currentDestination.id);
        
        if (!destination) {
            console.error('❌ Destination non trouvée dans l\'itinéraire');
            return;
        }

        // Initialiser les activités si nécessaire
        if (!destination.activities) {
            destination.activities = [];
        }

        if (this.currentActivity) {
            // Mode modification : mettre à jour l'activité existante
            const activityIndex = destination.activities.findIndex(act => act.id === this.currentActivity.id);
            if (activityIndex !== -1) {
                destination.activities[activityIndex] = activity;
            }
        } else {
            // Mode création : ajouter une nouvelle activité
            destination.activities.push(activity);
        }

        // Sauvegarder la destination mise à jour via localStorage
        await window.localStorageService.updateDestination(destination.id, destination);
        
        this.hideActivityPopup();
        
        // Recharger les activités pour la destination actuelle
        if (this.currentDestination && this.currentDestination.id) {
            await window.Activities.displayActivitiesOfDestination(this.currentDestination.id);
            
            // Déplier automatiquement la liste des activités si ce n'est pas déjà le cas
            const activitiesSection = document.getElementById(`activities-${this.currentDestination.id}`);
            if (activitiesSection && activitiesSection.style.display === 'none') {
                window.Destination.expandActivitiesSection(this.currentDestination.id);
            }
        }
        
        // Mettre à jour l'icône d'activité selon les activités existantes
        if (window.Destination && window.Destination.updateActivityIcon) {
            await window.Destination.updateActivityIcon(this.currentDestination.id);
        }
        
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde de l\'activité:', error);
            showErrorSnackBar('Erreur lors de la sauvegarde de l\'activité');
        } finally {
            // Restaurer le bouton save
            window.restoreButton('.modal-footer .btn-save', 'Enregistrer', 'save');
        }
    },

    // Valider et compléter automatiquement les temps au moment de la sauvegarde
    validateAndFormatTimes(startTime, endTime) {
        let formattedStart = startTime;
        let formattedEnd = endTime;
        
        // Parser les temps
        const parseTime = (timeStr) => {
            if (!timeStr || timeStr.trim() === '') return { hours: null, minutes: null };
            const parts = timeStr.split(':');
            return {
                hours: parseInt(parts[0]) || null,
                minutes: parseInt(parts[1]) || null
            };
        };
        
        const start = parseTime(startTime);
        const end = parseTime(endTime);
        
        // --- Validation du temps de début ---
        if (start.hours !== null && start.minutes === null) {
            // Heures remplies, minutes vides → minutes = 0
            formattedStart = `${start.hours.toString().padStart(2, '0')}:00`;
        } else if (start.hours === null && start.minutes !== null) {
            // Heures vides, minutes remplies → heures = 0
            formattedStart = `00:${start.minutes.toString().padStart(2, '0')}`;
        }
        
        // --- Validation du temps de fin ---
        if (end.hours !== null && end.minutes === null) {
            // Heures remplies, minutes vides
            if (end.hours === start.hours) {
                // Même heure que début → minutes = mêmes minutes que début
                const startMinutes = start.minutes || 0;
                formattedEnd = `${end.hours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
            } else {
                // Heure différente → minutes = 0
                formattedEnd = `${end.hours.toString().padStart(2, '0')}:00`;
            }
        } else if (end.hours === null && end.minutes !== null) {
            // Heures vides, minutes remplies
            if (start.hours !== null && end.minutes < start.minutes) {
                // Si minutes < minutes de début → heures = mêmes heures que début
                formattedEnd = `${start.hours.toString().padStart(2, '0')}:${end.minutes.toString().padStart(2, '0')}`;
            } else {
                // Sinon → heures = 0
                formattedEnd = `00:${end.minutes.toString().padStart(2, '0')}`;
            }
        }
        
        // --- Validation finale pour éviter que fin < début ---
        const finalStart = parseTime(formattedStart);
        const finalEnd = parseTime(formattedEnd);
        
        if (finalStart.hours !== null && finalEnd.hours !== null) {
            if (finalEnd.hours < finalStart.hours || 
                (finalEnd.hours === finalStart.hours && finalEnd.minutes < finalStart.minutes)) {
                // Fin est avant début → ajuster fin
                if (finalEnd.hours < finalStart.hours) {
                    // Heures de fin < heures de début → mettre fin = début
                    formattedEnd = formattedStart;
                } else {
                    // Mêmes heures mais minutes de fin < minutes de début → minutes de fin = minutes de début
                    formattedEnd = `${finalStart.hours.toString().padStart(2, '0')}:${finalStart.minutes.toString().padStart(2, '0')}`;
                }
            }
        }
        
        return { startTime: formattedStart, endTime: formattedEnd };
    },

    // Valider les inputs de temps
    validateTimeInput(input, type) {
        const value = parseInt(input.value) || 0;
        
        if (type === 'hours') {
            // Limiter entre 0 et 23
            if (value > 23) {
                input.value = 23;
            } else if (value < 0) {
                input.value = 0;
            }
        } else if (type === 'minutes') {
            // Limiter entre 0 et 59
            if (value > 59) {
                input.value = 59;
            } else if (value < 0) {
                input.value = 0;
            }
        }
    },

    // Obtenir la valeur formatée du temps depuis les inputs séparés
    getTimeFromInputs(timeId) {
        const hoursInput = document.getElementById(`${timeId}Hours`);
        const minutesInput = document.getElementById(`${timeId}Minutes`);
        
        if (!hoursInput || !minutesInput) return '';
        
        const hours = parseInt(hoursInput.value) || 0;
        const minutes = parseInt(minutesInput.value) || 0;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    },

    // Définir les valeurs des inputs depuis une chaîne de temps
    setTimeFromValue(timeId, timeString) {
        const hoursInput = document.getElementById(`${timeId}Hours`);
        const minutesInput = document.getElementById(`${timeId}Minutes`);
        
        if (!hoursInput || !minutesInput || !timeString) return;
        
        const parts = timeString.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        
        hoursInput.value = hours;
        minutesInput.value = minutes;
    },

    // Modifier une activité existante
    async editActivity(activityId, destinationId) {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        const destination = destinations.find(d => d.id === destinationId);
        if (!destination || !destination.id) return;

        try {        
            // Définir la destination actuelle AVANT d'afficher le popup
            this.setCurrentDestination(destination);

            // Trouver l'activité dans les activités de la destination
            const activity = destination.activities?.find(act => act.id === activityId);
            if (!activity) {
                console.error('❌ Activité non trouvée dans la destination:', activityId);
                return;
            }

            // Pré-remplir le formulaire avec les données de l'activité (après que le popup soit créé)
            setTimeout(() => {
                const nameField = document.getElementById('activityName');
                const priceField = document.getElementById('priceAmount');
                const localCurrencyField = document.getElementById('localCurrency');
                const typeField = document.getElementById('activityType');
                const notesField = document.getElementById('activityNotes');
                
                if (nameField) {
                    nameField.value = this.currentActivity.name || '';
                    nameField.focus();
                    nameField.select();
                }
                
                // Utiliser les inputs custom pour les temps
                this.setTimeFromValue('startTime', this.currentActivity.startTime || '');
                this.setTimeFromValue('endTime', this.currentActivity.endTime || '');
                
                // Gérer le prix (TOUJOURS simple valeur) et devise locale
                if (this.currentActivity.price) {
                    if (priceField) priceField.value = this.currentActivity.price || 0;
                    
                    // Si devise locale présente, l'afficher, sinon vide
                    if (this.currentActivity.localCurrency !== undefined) {
                        if (localCurrencyField) localCurrencyField.value = this.currentActivity.localCurrency || 0;
                    } else {
                        if (localCurrencyField) localCurrencyField.value = ''; // Pas de devise locale pour EUR
                    }
                }
                
                if (typeField) typeField.value = this.currentActivity.type || '';
                if (notesField) notesField.value = this.currentActivity.notes || '';
                
            }, 100);

            // Stocker l'activité actuelle
            this.currentActivity = activity;
            
            // Afficher le popup
            await this.showActivityPopup();
            
        } catch (error) {
            console.error('❌ Erreur chargement activité pour modification:', error);
            showErrorSnackBar('Erreur lors du chargement de l\'activité');
        }
    },

    // Vider le formulaire d'activité
    clearActivityForm() {
        document.getElementById('activityName').value = '';
        
        // Vider les inputs custom de temps
        document.getElementById('startTimeHours').value = '';
        document.getElementById('startTimeMinutes').value = '';
        document.getElementById('endTimeHours').value = '';
        document.getElementById('endTimeMinutes').value = '';
        
        document.getElementById('priceAmount').value = '';
        document.getElementById('localCurrency').value = '';
        document.getElementById('activityType').value = '';
        document.getElementById('activityNotes').value = '';
    },
};

// Exporter pour utilisation globale (même système que les autres modules)
window.Activity = Activity;
