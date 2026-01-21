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
        console.log('Activity initialisé');
        // Précharger les taux de change
        this.loadExchangeRates();
    },

    // Définir la destination actuelle
    setCurrentDestination(destination) {
        console.log('Destination actuelle définie:', destination);
        this.currentDestination = destination;
    },

    // Charger les taux de change depuis l'API
    async loadExchangeRates() {
        // Pas de cache - charger les taux à chaque fois
        const now = Date.now();
        
        try {
            console.log('Chargement des taux de change depuis l\'API...');
            // Utiliser l'API gratuite exchangerate-api.com (pas de clé API requise)
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/eur');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Réponse brute de l\'API:', data); // Debug pour voir la structure
            
            if (data.rates) {
                this.exchangeRatesCache = data.rates;
                this.exchangeRatesCacheTime = now;
                console.log('Taux de change chargés:', this.exchangeRatesCache);
            } else if (data.conversion_rates) {
                // Alternative : certains API utilisent conversion_rates
                this.exchangeRatesCache = data.conversion_rates;
                this.exchangeRatesCacheTime = now;
                console.log('Taux de change chargés (conversion_rates):', this.exchangeRatesCache);
            } else {
                // Si aucun format connu, essayer d'extraire les taux directement
                console.log('Structure de la réponse:', Object.keys(data));
                this.exchangeRatesCache = data;
                this.exchangeRatesCacheTime = now;
                console.log('Taux de change chargés (fallback):', this.exchangeRatesCache);
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

        console.log('this.currentDestination.address:', this.currentDestination.address);
        console.log('this.currentDestination.address.country:', this.currentDestination.address.country);

        // Utiliser le pays stocké dans address.country
        if (this.currentDestination.address && this.currentDestination.address.country) {
            const country = this.currentDestination.address.country;
            console.log('✅ Utilisation du pays stocké dans address.country:', country);
            return this.getCountryCurrency(country);
        }

        console.log('❌ Impossible de détecter le pays, utilisation de EUR par défaut');
        return { code: 'EUR', name: 'EUR' };
    },

    // Obtenir la devise pour un pays donné (via API REST Countries)
    async getCountryCurrency(country) {
        console.log('🔍 Recherche de devise pour le pays:', country);
        
        // Mapping de secours pour les pays non disponibles dans REST Countries
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
            console.log('🔍 Réponse brute de REST Countries:', data);
            
            if (data && data.length > 0 && data[0].currencies) {
                const currencies = data[0].currencies;
                
                // Structure: {KPW: {name: "North Korean won"}}
                const currencyCodes = Object.keys(currencies);
                if (currencyCodes.length > 0) {
                    const firstCode = currencyCodes[0];
                    const currency = {
                        code: firstCode,
                        name: currencies[firstCode].name || firstCode
                    };
                    
                    console.log(`✅ Devise trouvée via API: ${country} -> ${currency.code} (${currency.name})`);
                    return { 
                        code: currency.code, 
                        name: currency.name 
                    };
                }
            }
            
            // Si l'API ne trouve pas le pays, essayer le mapping de secours
            if (fallbackMapping[country]) {
                const currencyCode = fallbackMapping[country];
                console.log(`✅ Devise trouvée via fallback: ${country} -> ${currencyCode}`);
                return { 
                    code: currencyCode, 
                    name: currencyCode 
                };
            }
            
            console.log(`❌ Aucune devise trouvée pour: ${country}, utilisation de EUR`);
            console.log('Structure de la réponse:', data ? {
                hasData: !!data,
                isArray: Array.isArray(data),
                length: data?.length,
                firstItem: data?.[0],
                hasCurrencies: !!data?.[0]?.currencies,
                currenciesLength: data?.[0]?.currencies?.length
            } : 'null');
            
            return { code: 'EUR', name: 'EUR' };
            
        } catch (error) {
            console.error('❌ Erreur lors de la recherche de devise:', error);
            
            // En cas d'erreur API, essayer le mapping de secours
            if (fallbackMapping[country]) {
                const currencyCode = fallbackMapping[country];
                console.log(`✅ Devise trouvée via fallback (erreur API): ${country} -> ${currencyCode}`);
                return { 
                    code: currencyCode, 
                    name: currencyCode 
                };
            }
            
            console.log(`🔄 Utilisation de EUR par défaut pour: ${country}`);
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
                const countryName = data.address.country;
                console.log(`🌍 Pays retourné par l'API (anglais forcé): ${countryName}`);
                return countryName;
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
        console.log(`🌍 Mapping existant pour: ${countryName}`);
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

            popup.classList.add('active');

            // Réinitialiser le formulaire pour une nouvelle activité
            const form = document.getElementById('activityForm');
            if (form) {
                form.reset();
            }
            
            // Réinitialiser tous les champs manuellement pour être sûr
            const nameField = document.getElementById('activityName');
            const arrivalField = document.getElementById('arrivalTime');
            const departureField = document.getElementById('departureTime');
            const priceAmount = document.getElementById('priceAmount');
            const localCurrencyField = document.getElementById('localCurrency');
            const typeField = document.getElementById('activityType');
            
            // En mode ajout, réinitialiser tout
            if (!this.currentActivity) {
                if (nameField) nameField.value = '';
                if (arrivalField) arrivalField.value = '';
                if (departureField) departureField.value = '';
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
            const title = popup.querySelector('.activity-popup-title');
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
                console.log(`🏷️ Label mis à jour: Prix (${localCurrency.name})`);
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
        popup.className = 'activity-popup';
        
        popup.innerHTML = `
            <div class="activity-popup-content">
                <div class="activity-popup-header">
                    <h3 class="activity-popup-title">${this.currentActivity ? 'Modifier une activité' :  'Ajouter une activité'}</h3>
                    <button class="btn-close-activity" onclick="Activity.hideActivityPopup()">×</button>
                </div>
                <div class="activity-form">
                    <div class="form-group">
                        <label class="form-label" for="activityName">Nom de l'activité</label>
                        <input type="text" class="form-input" id="activityName" placeholder="Ex: Visite du temple, dégustation..." />
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="arrivalTime">Heure d'arrivée</label>
                            <input type="time" class="form-input" id="arrivalTime" />
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="departureTime">Heure de départ</label>
                            <input type="time" class="form-input" id="departureTime" />
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
                            <option value="transport">Transport</option>
                            <option value="hebergement">Hébergement</option>
                            <option value="autre">Autre</option>
                        </select>
                    </div>
                </div>
                <div class="activity-popup-footer">
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
            popup.classList.remove('active');
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
        const arrivalTime = document.getElementById('arrivalTime').value;
        const departureTime = document.getElementById('departureTime').value;
        const priceAmount = document.getElementById('priceAmount').value;
        let localCurrency = document.getElementById('localCurrency').value;
        const activityType = document.getElementById('activityType').value;

        if (!name.trim()) {
            showErrorSnackBar('Veuillez saisir un nom d\'activité');
            return;
        }

        // Si le champ devise locale est vide, le calculer automatiquement
        if (!localCurrency && priceAmount) {
            const eurAmount = parseFloat(priceAmount) || 0;
            localCurrency = (await this.convertEurToLocalCurrency(eurAmount)).toFixed(2);
        }

        const localCurrencyInfo = await this.getLocalCurrency();
        const activity = {
            id: this.currentActivity?.id || `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            arrivalTime: arrivalTime,
            departureTime: departureTime,
            price: parseFloat(priceAmount) || 0, // TOUJOURS une simple valeur
            type: activityType
        };
        
        // Ajouter les champs de devise locale seulement si ce n'est pas EUR
        if (localCurrencyInfo.code !== 'EUR') {
            activity.localCurrency = parseFloat(localCurrency) || 0;
            activity.localCurrencyCode = localCurrencyInfo.code;
            console.log('🔍 Activité (devise étrangère) - structure complète:', activity);
        } else {
            console.log('🔍 Activité (EUR) - structure simplifiée:', activity);
        }

        console.log('🔍 activity à sauvegarder:', activity);

        // Récupérer l'itinéraire actuel
        const itineraries = window.firebaseService.itineraries;
        if (itineraries.length === 0) {
            console.error('❌ Aucun itinéraire trouvé pour sauvegarder l\'activité');
            return;
        }
        
        const currentItinerary = itineraries[0];
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

    // Ajouter un spinner au bouton save
    showSaveButtonLoading() {
        const saveButton = document.querySelector('.activity-popup-footer .btn-save');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerHTML = '<svg class="loading-spinner-small" viewBox="0 0 24 24" style="overflow: visible;"><circle cx="12" cy="12" r="10" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416 31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dashoffset" from="31.416" to="0" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg> Enregistrer';
        }
    },

    // Restaurer le bouton save
    restoreSaveButton() {
        const saveButton = document.querySelector('.activity-popup-footer .btn-save');
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
                const arrivalField = document.getElementById('arrivalTime');
                const departureField = document.getElementById('departureTime');
                const priceField = document.getElementById('priceAmount');
                const localCurrencyField = document.getElementById('localCurrency');
                const typeField = document.getElementById('activityType');
                
                if (nameField) nameField.value = this.currentActivity.name || '';
                if (arrivalField) arrivalField.value = this.currentActivity.arrivalTime || '';
                if (departureField) departureField.value = this.currentActivity.departureTime || '';
                
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
        document.getElementById('arrivalTime').value = '';
        document.getElementById('departureTime').value = '';
        document.getElementById('priceAmount').value = '';
        document.getElementById('localCurrency').value = '';
        document.getElementById('activityType').value = '';
    },
};

// Le composant est disponible globalement via window.Activity
window.Activity = Activity;
