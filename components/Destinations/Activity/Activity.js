// Composant Activity
const Activity = {
    // État du composant
    currentDestination: null,
    currentActivity: null,

    // Cache pour les taux de change (valide 1 heure)
    exchangeRatesCache: null,
    exchangeRatesCacheTime: null,

    // Initialiser le composant
    init() {
        this.loadExchangeRates();
    },

    // Définir la destination actuelle
    setCurrentDestination(destination) {
        this.currentDestination = destination;
    },

    // Charger les taux de change depuis l'API
    async loadExchangeRates() {
        // Pas de cache - charger les taux à chaque fois
        const now = Date.now();
        
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/eur');
            
            if (!response.ok) {
                throw new Error('Erreur API taux de change');
            }
            
            const data = await response.json();
            
            if (data.rates) {
                this.exchangeRatesCache = data.rates;
                this.exchangeRatesCacheTime = now;
            } else if (data.conversion_rates) {
                this.exchangeRatesCache = data.conversion_rates;
                this.exchangeRatesCacheTime = now;
            } else {
                this.exchangeRatesCache = data;
                this.exchangeRatesCacheTime = now;
            }
        } catch (error) {
            console.error('Erreur lors du chargement des taux de change:', error);
            // En cas d'erreur, utiliser des taux de secours basiques
            this.exchangeRatesCache = {
                'USD': 1.08,
                'JPY': 160,
                'KRW': 1450,
                'CNY': 7.8,
                'THB': 37,
                'VND': 27000
            };
        }
    },

    // Obtenir la devise locale en fonction du pays de la destination
    async getLocalCurrency() {
        if (this.currentDestination.address && this.currentDestination.address.country) {
            const country = this.currentDestination.address.country;
            return this.getCountryCurrency(country);
        }
        
        return { code: 'EUR', name: 'EUR' };
    },

    // Obtenir la devise pour un pays donné (via API REST Countries)
    async getCountryCurrency(country) {
        const fallbackMapping = {
            'North Korea': 'KPW',
            'South Korea': 'KRW',
            'Taiwan': 'TWD',
            'Palestine': 'ILS',
            'Western Sahara': 'MAD',
            'Kosovo': 'EUR'
        };
        
        try {
            // Utiliser l'API REST Countries pour obtenir la devise
            const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fullText=false`);
            
            if (!response.ok) {
                console.log(`❌ Pays non trouvé dans REST Countries: ${country}, utilisation de EUR`);
                return { code: 'EUR', name: 'EUR' };
            }
            
            const data = await response.json();
            
            if (data && data.length > 0 && data[0].currencies) {
                const currencies = data[0].currencies;
                
                const currencyCodes = Object.keys(currencies);
                if (currencyCodes.length > 0) {
                    const firstCode = currencyCodes[0];
                    return { 
                        code: firstCode,
                        name: currencies[firstCode].name || firstCode
                    };
                }
            }
            
            if (fallbackMapping[country]) {
                const currencyCode = fallbackMapping[country];
                return { 
                    code: currencyCode, 
                    name: currencyCode 
                };
            }
            
            return { code: 'EUR', name: 'EUR' };
            
        } catch (error) {
            console.error('❌ Erreur lors de la recherche de devise:', error);
            
            if (fallbackMapping[country]) {
                const currencyCode = fallbackMapping[country];
                return { 
                    code: currencyCode, 
                    name: currencyCode 
                };
            }
            
            return { code: 'EUR', name: 'EUR' };
        }
    },

    // Obtenir le pays depuis les coordonnées (API Nominatim)
    async getCountryFromCoordinates(lat, lng) {
        try {
            // Forcer l'API Nominatim à retourner l'anglais
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1&accept-language=en`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.address && data.address.country) {
                return data.address.country;
            }
            
            return null;
        } catch (error) {
            console.error('Erreur lors du géocodage inverse:', error);
            return null;
        }
    },

    // Mettre à jour le tableau de mapping avec un nouveau pays
    updateCountryMapping(countryName) {
        // Cette méthode n'est plus nécessaire avec l'API anglaise
    },

    // Convertir les euros en devise locale
    async convertEurToLocalCurrency(eurAmount) {
        if (!this.exchangeRatesCache) {
            console.warn('Taux de change pas encore chargés');
            return eurAmount;
        }

        const localCurrency = await this.getLocalCurrency();
        const rate = this.exchangeRatesCache[localCurrency.code] || 1;
        return eurAmount * rate;
    },

    // Afficher le popup d'activité
    async showActivityPopup() {
        try {
            // S'assurer que les taux de change sont chargés avant d'ouvrir le popup
            await this.loadExchangeRates();
            
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
            
            // En mode ajout, réinitialiser tout
            if (!this.currentActivity) {
                if (nameField) nameField.value = '';
                if (startTime) startTime.value = '';
                if (endTime) endTime.value = '';
                if (priceAmount) priceAmount.value = '';
                if (localCurrencyField) localCurrencyField.value = '';
                if (typeField) typeField.value = '';
            }
            // En mode édition, ne pas réinitialiser car les champs seront pré-remplis dans editActivity
            
            // Réinitialiser l'activité actuelle si on n'est pas en mode édition
            if (!this.currentActivity) {
                this.currentActivity = null;
            }
            
            // Mettre à jour le titre
            const title = popup.querySelector('.modal-title');
            if (title && !this.currentActivity) {
                title.textContent = 'Ajouter une activité';
            } else {
                title.textContent = 'Modifier une activité';
            }
            
            // Récupérer la devise locale et valider à chaque ouverture
            const localCurrency = await this.getLocalCurrency();
            
            // Vérifier si on a le taux de change pour cette devise spécifique
            const hasExchangeRate = this.exchangeRatesCache && this.exchangeRatesCache[localCurrency.code];
            const hasCurrencyName = localCurrency.name && localCurrency.name !== localCurrency.code;
            const isNotEuro = localCurrency.code !== 'EUR'; // Masquer si c'est EUR
            const showCurrencyField = hasExchangeRate && hasCurrencyName && isNotEuro;
            
            console.log('🔍 Validation devise locale:', {
                currency: localCurrency,
                hasExchangeRate: !!hasExchangeRate,
                hasCurrencyName: !!hasCurrencyName,
                isNotEuro: !!isNotEuro,
                showCurrencyField: showCurrencyField,
                exchangeRate: hasExchangeRate ? this.exchangeRatesCache[localCurrency.code] : null
            });
            
            // Mettre à jour le label de la devise locale
            const label = popup.querySelector('label[for="localCurrency"]');
            if (label) {
                label.textContent = `Prix (${localCurrency.name})`;
            }
            
            // Masquer uniquement le champ de devise locale, garder le champ €
            const currencyRow = popup.querySelector('#currencyRow');
            const localCurrencyLabel = popup.querySelector('label[for="localCurrency"]');
            
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
        await this.loadExchangeRates();
        const localCurrency = await this.getLocalCurrency();
        
        const popup = document.createElement('div');
        popup.id = 'activityPopup';
        popup.className = 'modal';
        
        popup.innerHTML = `
            <style>
                /* ===== COMPOSANT CUSTOM TIME INPUT ===== */
                .time-input-custom {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    position: relative;
                }

                .time-input-hours,
                .time-input-minutes {
                    width: 80px;
                    padding: 12px 16px;
                    border: 1px solid var(--gray-light);
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 500;
                    text-align: center;
                    background: var(--white);
                    color: var(--font-color-gray-dark);
                    transition: all 0.2s ease;
                    box-sizing: border-box;
                    box-shadow: var(--box-shadow-1);
                }

                .time-input-hours:focus,
                .time-input-minutes:focus {
                    outline: none;
                    border-color: var(--primary-blue);
                    box-shadow: 0 0 0 3px rgba(25, 102, 179, 0.1);
                }

                .time-input-hours::placeholder,
                .time-input-minutes::placeholder {
                    color: var(--gray-light);
                    font-weight: 400;
                }

                .time-separator {
                    font-size: 20px;
                    font-weight: 600;
                    color: var(--gray-medium);
                    user-select: none;
                    padding: 0 4px;
                }
            </style>
            <div class="modal-backdrop" onclick="Activity.hideActivityPopup()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${this.currentActivity ? 'Modifier une activité' :  'Ajouter une activité'}</h3>
                    <button class="btn-close" onclick="Activity.hideActivityPopup()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
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
                            <input type="number" class="form-input" id="priceAmount" placeholder="0" min="0" step="0.01" oninput="Activity.updateLocalCurrency()" />
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="localCurrency">Prix (${localCurrency.name})</label>
                            <input type="number" class="form-input" id="localCurrency" placeholder="0" min="0" step="0.01" oninput="Activity.updateEurFromLocalCurrency()" style="display: none;" />
                        </div>
                    </div>
                    <div class="form-group">
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
            const localAmount = await this.convertEurToLocalCurrency(eurAmount);
            localCurrencyField.value = localAmount.toFixed(2);
        } else {
            localCurrencyField.value = '';
        }
    },

    // Mettre à jour le champ en euros à partir de la devise locale
    async updateEurFromLocalCurrency() {
        const localCurrencyField = document.getElementById('localCurrency');
        const priceAmount = document.getElementById('priceAmount');
        
        if (localCurrencyField && !isNaN(localCurrencyField.value) && localCurrencyField.value) {
            const localAmount = parseFloat(localCurrencyField.value) || 0;
            const localCurrencyInfo = await this.getLocalCurrency();
            const rate = this.exchangeRatesCache[localCurrencyInfo.code] || 1;
            const eurAmount = localAmount / rate;
            priceAmount.value = eurAmount.toFixed(2);
        } else {
            priceAmount.value = '';
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
    },

    // Sauvegarder une activité
    async saveActivity() {
        if (!this.currentDestination) {
            console.error('❌ Aucune destination définie');
            return;
        }

        // Afficher le spinner sur le bouton save
        this.showSaveButtonLoading();

        try {
            // S'assurer que les taux de change sont chargés
            await this.loadExchangeRates();

        const name = document.getElementById('activityName').value;
        
        // Récupérer les valeurs depuis les inputs custom
        const startTime = this.getTimeFromInputs('startTime');
        const endTime = this.getTimeFromInputs('endTime');
        const priceAmount = document.getElementById('priceAmount').value;
        let localCurrency = document.getElementById('localCurrency').value;
        const activityType = document.getElementById('activityType').value;

        if (!name.trim()) {
            showErrorSnackBar('Veuillez saisir un nom d\'activité');
            return;
        }

        // Valider et formater les temps
        const { startTime: formattedStart, endTime: formattedEnd } = this.validateAndFormatTimes(startTime, endTime);

        // Si le champ devise locale est vide, le calculer automatiquement
        if (!localCurrency && priceAmount) {
            const eurAmount = parseFloat(priceAmount) || 0;
            localCurrency = (await this.convertEurToLocalCurrency(eurAmount)).toFixed(2);
        }

        const localCurrencyInfo = await this.getLocalCurrency();
        const activity = {
            id: this.currentActivity?.id || `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            startTime: formattedStart,
            endTime: formattedEnd,
            price: parseFloat(priceAmount) || 0, // TOUJOURS une simple valeur
            type: activityType
        };
        
        // Ajouter les champs de devise locale seulement si ce n'est pas EUR
        if (localCurrencyInfo.code !== 'EUR') {
            activity.localCurrency = parseFloat(localCurrency) || 0;
            activity.localCurrencyCode = localCurrencyInfo.code;
        }

        // Récupérer l'itinéraire actuel
        const itineraries = window.firebaseService.itineraries;
        if (itineraries.length === 0) {
            console.error('❌ Aucun itinéraire trouvé pour sauvegarder l\'activité');
            return;
        }
        
        const currentItinerary = window.firebaseService.getCurrentItinerary();;
        const destination = currentItinerary.destinations.find(dest => dest.id === this.currentDestination.id);
        
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
                console.log('✅ Activité mise à jour:', activity);
            }
        } else {
            // Mode création : ajouter une nouvelle activité
            destination.activities.push(activity);
            console.log('✅ Activité ajoutée:', activity);
        }

        // Sauvegarder l'itinéraire complet
        await window.firebaseService.updateItinerary(currentItinerary);
        
        this.hideActivityPopup();
        
        // Recharger les activités pour la destination actuelle
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        const destinationIndex = destinations.findIndex(dest => dest.id === this.currentDestination.id);
        
        if (destinationIndex !== -1) {
            console.log('🔄 Rechargement des activités pour la destination:', destinationIndex);
            await window.Destinations.displayActivitiesOfDestination(destinationIndex);
        }
        
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde de l\'activité:', error);
            showErrorSnackBar('Erreur lors de la sauvegarde de l\'activité');
        } finally {
            // Restaurer le bouton save
            this.restoreSaveButton();
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
    
    // Ajouter un spinner au bouton save
    showSaveButtonLoading() {
        const saveButton = document.querySelector('.modal-footer .btn-save');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerHTML = '<svg class="loading-spinner-small" viewBox="0 0 24 24" style="overflow: visible;"><circle cx="12" cy="12" r="10" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416 31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dashoffset" from="31.416" to="0" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg> Enregistrer';
        }
    },

    // Restaurer le bouton save
    restoreSaveButton() {
        const saveButton = document.querySelector('.modal-footer .btn-save');
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = '<span class="material-icons">save</span> Enregistrer';
        }
    },

    // Modifier une activité existante
    async editActivity(activityId, destinationIndex) {
        const destination = window.firebaseService.getDestinationsOfCurrentItinerary()[destinationIndex];
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
            
            // Stocker l'activité actuelle
            this.currentActivity = activity;
            console.log('Activité actuelle en cours d\'edition:', this.currentActivity);
            
            // Afficher le popup
            await this.showActivityPopup();
            
            // Pré-remplir le formulaire avec les données de l'activité (après que le popup soit créé)
            setTimeout(() => {
                const nameField = document.getElementById('activityName');
                const priceField = document.getElementById('priceAmount');
                const localCurrencyField = document.getElementById('localCurrency');
                const typeField = document.getElementById('activityType');
                
                if (nameField) nameField.value = this.currentActivity.name || '';
                
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
                
                console.log('✅ Formulaire pré-rempli avec les données de l\'activité');
            }, 100);
            
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
    },
};

// Le composant est disponible globalement via window.Activity
window.Activity = Activity;
