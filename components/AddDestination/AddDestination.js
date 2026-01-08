/**
 * Composant AddDestination - Module Pattern
 * Gère le panneau d'ajout de destination
 */

// Service de recherche intégré pour éviter les problèmes de chargement
const SearchService = {
    isProduction: window.location.hostname.includes('github.io'),
    
    async getApiKey() {
        if (this.isProduction) {
            return 'GOOGLE_API_KEY_PLACEHOLDER';
        } else {
            // En développement local seulement, charger le fichier env.local
            if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
                try {
                    const response = await fetch('./env.local');
                    const text = await response.text();
                    const lines = text.split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('GOOGLE_API_KEY=')) {
                            return line.split('=')[1];
                        }
                    }
                    return null;
                } catch (error) {
                    console.error('Erreur lors du chargement de env.local:', error);
                    return null;
                }
            } else {
                // En production Vercel, ne pas essayer de charger env.local
                return null;
            }
        }
    },
    
    async search(query) {
        if (!query || query.trim().length < 3) {
            return [];
        }
        
        try {
            // Utiliser le proxy Vercel, avec fallback pour le développement
            const apiKey = await this.getApiKey();
            let url;
            
            // Détection de l'environnement et construction de l'URL
            const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
            
            if (isProduction) {
                // En production : utiliser une URL relative (fonctionne avec le domaine actuel)
                url = `/api/places-search?query=${encodeURIComponent(query)}`;
                console.log('🌐 Mode production - URL relative:', url);
            } else {
                // En local : tester l'URL absolue de production
                url = `https://pwa-voyage-asie.vercel.app/api/places-search?query=${encodeURIComponent(query)}`;
                console.log('🏠 Mode local - URL absolue:', url);
            }
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.status === 'OK' && data.results.length > 0) {
                    return data.results.map(place => ({
                        placeId: place.place_id,
                        name: place.name,
                        address: place.formatted_address,
                        location: {
                            lat: place.geometry.location.lat,
                            lng: place.geometry.location.lng
                        }
                    }));
                } else {
                    // Si Places API ne retourne aucun résultat, essayer Geocoding
                    console.warn('Places API sans résultats, fallback avec Geocoding API');
                    if (apiKey && apiKey !== 'GOOGLE_API_KEY_PLACEHOLDER') {
                        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
                        const geoResponse = await fetch(geoUrl);
                        const geoData = await geoResponse.json();
                        
                        if (geoData.results && geoData.results.length > 0) {
                            return geoData.results.map(result => ({
                                placeId: result.place_id,
                                name: result.formatted_address,
                                address: result.formatted_address,
                                location: {
                                    lat: result.geometry.location.lat,
                                    lng: result.geometry.location.lng
                                }
                            }));
                        }
                    }
                }
            } catch (proxyError) {
                console.warn('Proxy Vercel indisponible ou erreur, fallback avec Geocoding API:', proxyError.message);
                
                // Fallback : utiliser Geocoding API pour le développement ET en production
                if (apiKey && apiKey !== 'GOOGLE_API_KEY_PLACEHOLDER') {
                    url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    if (data.results && data.results.length > 0) {
                        return data.results.map(result => ({
                            placeId: result.place_id,
                            name: result.formatted_address,
                            address: result.formatted_address,
                            location: {
                                lat: result.geometry.location.lat,
                                lng: result.geometry.location.lng
                            }
                        }));
                    }
                }
            }
            
            console.error('Aucun résultat disponible');
            return [];
            
        } catch (error) {
            console.error('Erreur de recherche:', error);
            return [];
        }
    },
};

// Charger le CSS du composant
const cssLink = document.createElement('link');
cssLink.rel = 'stylesheet';
cssLink.href = './components/AddDestination/AddDestination.css';
document.head.appendChild(cssLink);

// Importer dynamiquement le composant AddActivity
const script = document.createElement('script');
script.src = './components/AddDestination/addActivity/AddActivity.js';
script.onload = function() {
    console.log('AddActivity.js chargé');
    console.log('AddActivity disponible:', typeof window.AddActivity !== 'undefined');
};
script.onerror = function() {
    console.error('Erreur lors du chargement de AddActivity.js');
};
document.head.appendChild(script);

export const AddDestination = {
    // État du composant
    isVisible: false,
    container: null,
    currentSelectedResult: null,
    
    // Template HTML
    template: `
        <div class="side-panel" id="addDestinationPanel">
            <div class="side-panel-content">
                <div class="popup-header">
                    <h3 class="popup-title">Ajouter une destination</h3>
                </div>
                
                <div class="search-container">
                    <input type="text" class="search-input" id="searchInput" placeholder="Rechercher une adresse..." oninput="AddDestination.searchAddress()">
                    <div class="search-results" id="searchResults"></div>
                </div>
                
                <input type="text" class="address-field" id="addressField" placeholder="Adresse sélectionnée" readonly>
                
                <div class="duration-container">
                    <div class="duration-field">
                        <div class="duration-label">Jours</div>
                        <div class="duration-input-group">
                            <input type="number" class="duration-input" id="daysInput" value="0" min="0" onchange="AddDestination.validateDurationInput('days')">
                        </div>
                    </div>
                    
                    <div class="duration-field">
                        <div class="duration-label">Heures</div>
                        <div class="duration-input-group">
                            <input type="number" class="duration-input" id="hoursInput" value="0" min="0" max="23" onchange="AddDestination.validateDurationInput('hours')">
                        </div>
                    </div>
                    
                    <div class="duration-field">
                        <div class="duration-label">Minutes</div>
                        <div class="duration-input-group">
                            <input type="number" class="duration-input" id="minutesInput" value="0" min="0" max="59" onchange="AddDestination.validateDurationInput('minutes')">
                        </div>
                    </div>
                </div>
                
                <button class="btn-activity" onclick="if (typeof AddActivity !== 'undefined') { AddActivity.showActivityPopup(); } else { console.error('AddActivity non disponible'); alert('AddActivity en cours de chargement...'); }">Ajouter une activité</button>
                
                <div class="activity-section" id="activitySection" style="display: none;">
                    <div class="activity-checkbox">
                        <input type="checkbox" id="showActivities" onchange="if (typeof AddActivity !== 'undefined') { AddActivity.toggleActivityList(); } else { console.error('AddActivity non disponible'); }">
                        <label for="showActivities">Afficher les activités ajoutées</label>
                    </div>
                    <div class="activity-list" id="activityList"></div>
                </div>
                
                <div class="popup-footer">
                    <button class="btn-cancel" onclick="AddDestination.hide()">Annuler</button>
                    <button class="btn-validate" onclick="AddDestination.validate()">Valider</button>
                </div>
            </div>
        </div>
        
        <!-- Popup pour ajouter une activité -->
        <div class="activity-popup" id="activityPopup">
            <div class="activity-popup-content">
                <div class="activity-popup-header">
                    <h3 class="activity-popup-title">Ajouter une activité</h3>
                    <button class="btn-close-activity" onclick="if (typeof AddActivity !== 'undefined') { AddActivity.hideActivityPopup(); } else { console.error('AddActivity non disponible'); }">×</button>
                </div>
                
                <div class="activity-form">
                    <div class="form-group">
                        <label class="form-label">Nom</label>
                        <input type="text" class="form-input" id="activityName" placeholder="Nom de l'activité">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group half">
                            <label class="form-label">Heure arrivée</label>
                            <input type="time" class="form-input" id="arrivalTime">
                        </div>
                        <div class="form-group half">
                            <label class="form-label">Heure départ</label>
                            <input type="time" class="form-input" id="departureTime">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Prix</label>
                        <div class="price-inputs">
                            <div class="price-amount">
                                <input type="number" class="form-input" id="priceAmount1" placeholder="0">
                                <select class="form-input" id="priceCurrency1">
                                    <option value="EUR">€</option>
                                    <option value="USD">$</option>
                                    <option value="GBP">£</option>
                                    <option value="JPY">¥</option>
                                </select>
                            </div>
                            <div class="price-currency">
                                <input type="number" class="form-input" id="priceAmount2" placeholder="0">
                                <select class="form-input" id="priceCurrency2">
                                    <option value="EUR">€</option>
                                    <option value="USD">$</option>
                                    <option value="GBP">£</option>
                                    <option value="JPY">¥</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Type d'activité</label>
                        <select class="form-input" id="activityType">
                            <option value="">Sélectionner...</option>
                            <option value="visite">Visite touristique</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="shopping">Shopping</option>
                            <option value="transport">Transport</option>
                            <option value="sport">Sport</option>
                            <option value="culture">Culture</option>
                            <option value="nature">Nature</option>
                            <option value="autre">Autre</option>
                        </select>
                    </div>
                </div>
                
                <div class="activity-popup-footer">
                    <button class="btn-cancel-activity" onclick="if (typeof AddActivity !== 'undefined') { AddActivity.hideActivityPopup(); } else { console.error('AddActivity non disponible'); }">Annuler</button>
                    <button class="btn-validate-activity" onclick="if (typeof AddActivity !== 'undefined') { AddActivity.saveActivity(); } else { console.error('AddActivity non disponible'); }">Valider</button>
                </div>
            </div>
        </div>
    `,

    // Initialisation du composant
    init(containerId) {
        console.log('AddDestination.init() appelé avec containerId:', containerId);
        this.container = document.getElementById(containerId);
        console.log('Container trouvé:', !!this.container);
        console.log('CSS chargé:', document.querySelector('link[href*="AddDestination.css"]'));
        
        if (!this.container) {
            console.error(`Container ${containerId} non trouvé`);
            return;
        }
        
        console.log('Appel du render...');
        this.render();
        console.log('Appel du setupEventListeners...');
        this.setupEventListeners();
        console.log('AddDestination initialisé avec succès');
    },

    // Rendu du template
    render() {
        if (this.container) {
            this.container.innerHTML = this.template;
        }
    },

    // Afficher le panneau
    show() {
        console.log('AddDestination.show() appelé');
        const panel = document.getElementById('addDestinationPanel');
        console.log('Panel trouvé:', !!panel);
        
        if (panel) {
            panel.classList.add('active');
            this.isVisible = true;
            console.log('Panel rendu visible');
            
            // Ajouter la classe pour masquer les boutons
            document.body.classList.add('has-popup');
            console.log('Boutons masqués');
        } else {
            console.error('Panel addDestinationPanel non trouvé dans le DOM');
        }
    },

    // Cacher le panneau
    hide() {
        const panel = document.getElementById('addDestinationPanel');
        if (panel) {
            panel.classList.remove('active');
            this.isVisible = false;
            
            // Retirer la classe pour réafficher les boutons
            document.body.classList.remove('has-popup');
            console.log('Boutons réaffichés');
            
            this.clearForm();
        }
    },

    // Recherche d'adresse
    async searchAddress() {
        const query = document.getElementById('searchInput').value;
        const resultsDiv = document.getElementById('searchResults');
        
        clearTimeout(this.searchTimeout);
        
        if (query.length < 3) {
            resultsDiv.classList.remove('active');
            return;
        }
        
        this.searchTimeout = setTimeout(async () => {
            try {
                console.log('Recherche de:', query);
                const results = await SearchService.search(query);
                console.log('Résultats trouvés:', results);
                this.displayResults(results);
            } catch (error) {
                console.error('Erreur de recherche:', error);
                resultsDiv.innerHTML = '<div class="search-error">Erreur de recherche: ' + error.message + '</div>';
                resultsDiv.classList.add('active');
            }
        }, 1000);
    },

    // Afficher les résultats
    displayResults(results) {
        const resultsDiv = document.getElementById('searchResults');
        
        if (results.length === 0) {
            resultsDiv.innerHTML = '<div class="search-error">Aucun résultat trouvé</div>';
            resultsDiv.classList.add('active');
            return;
        }
        
        const html = results.map(result => {
            let html = `<div class="search-result-item" onclick="AddDestination.selectResult(${JSON.stringify(result).replace(/"/g, '&quot;')})">
                <strong>${result.name || result.formatted_address}</strong>`;
            
            if (result.address && result.address.trim() !== '') {
                html += `<br><small>${result.address}</small>`;
            }
            
            html += `<br><small>${result.location.lat}, ${result.location.lng}</small>
            </div>`;
            
            return html;
        }).join('');
        
        resultsDiv.innerHTML = html;
        resultsDiv.classList.add('active');
    },

    // Sélectionner un résultat
    selectResult(result) {
        this.currentSelectedResult = result;
        document.getElementById('addressField').value = result.name || result.formatted_address;
        document.getElementById('searchResults').classList.remove('active');
        
        // Centrer la carte sur la destination
        if (window.map && result.geometry && result.geometry.location) {
            const lat = result.geometry.location.lat;
            const lng = result.geometry.location.lng;
            window.map.setView([lat, lng], 15);
            
            // Ajouter un marqueur temporaire
            if (this.tempMarker) {
                window.map.removeLayer(this.tempMarker);
            }
            this.tempMarker = L.marker([lat, lng]).addTo(window.map);
        }
    },

    // Valider l'ajout
    async validate() {
        const address = document.getElementById('addressField').value;
        const days = document.getElementById('daysInput').value;
        const hours = document.getElementById('hoursInput').value;
        const minutes = document.getElementById('minutesInput').value;
        
        if (!address) {
            alert('Veuillez sélectionner une adresse');
            return;
        }
        
        if (!this.currentSelectedResult) {
            alert('Veuillez sélectionner une adresse dans les résultats');
            return;
        }
        
        try {
            // Créer la destination
            const destination = {
                id: Date.now().toString(), // ID temporaire
                name: this.currentSelectedResult.name || this.currentSelectedResult.formatted_address,
                address: address,
                duration: { days: parseInt(days) || 0, hours: parseInt(hours) || 0, minutes: parseInt(minutes) || 0 },
                location: this.currentSelectedResult.location,
                createdAt: new Date().toISOString()
            };
            
            // Ajouter à Firebase
            if (window.firebaseService && window.firebaseService.isAuthenticated()) {
                await window.firebaseService.addDestinationToItinerary(destination);
                console.log('Destination ajoutée à Firebase:', destination);
            } else {
                // Fallback localStorage si non connecté
                if (window.userItinerary) {
                    window.userItinerary.destinations.push(destination);
                } else {
                    window.userItinerary = {
                        destinations: [destination],
                        createdAt: new Date().toISOString()
                    };
                }
                localStorage.setItem('userItinerary', JSON.stringify(window.userItinerary));
                console.log('Destination ajoutée en localStorage:', destination);
            }
            
            // Mettre à jour l'affichage
            if (window.displayDestinationsOnMap) {
                window.displayDestinationsOnMap();
            }
            
            this.hide();
        } catch (error) {
            console.error('Erreur lors de l\'ajout:', error);
            alert('Erreur lors de l\'ajout de la destination');
        }
    },

    // Valider les entrées de durée
    validateDurationInput(type) {
        const input = document.getElementById(`${type}Input`);
        let value = parseInt(input.value) || 0;
        
        switch(type) {
            case 'days':
                value = Math.max(0, value); // Minimum 0
                break;
            case 'hours':
                value = Math.max(0, Math.min(23, value)); // Entre 0 et 23
                break;
            case 'minutes':
                value = Math.max(0, Math.min(59, value)); // Entre 0 et 59
                break;
        }
        
        input.value = value;
    },

    // Configuration des écouteurs d'événements
    setupEventListeners() {
        // Événements gérés directement dans le template avec onclick
        console.log('AddDestination setupEventListeners complété');
    },

    // Vider le formulaire
    clearForm() {
        document.getElementById('searchInput').value = '';
        document.getElementById('addressField').value = '';
        document.getElementById('daysInput').value = '0';
        document.getElementById('hoursInput').value = '0';
        document.getElementById('minutesInput').value = '0';
        document.getElementById('searchResults').classList.remove('active');
        document.getElementById('searchResults').innerHTML = '';
        this.currentSelectedResult = null;
        
        // Supprimer le marqueur temporaire
        if (this.tempMarker && window.map) {
            window.map.removeLayer(this.tempMarker);
            this.tempMarker = null;
        }
    },

    // Valider les entrées de durée
    validateDurationInput(type) {
        const input = document.getElementById(type + 'Input');
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
    }
};
