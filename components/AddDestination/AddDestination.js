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
            // En développement, charger le fichier env.local (sans le point)
            try {
                const response = await fetch('./public/env.local');
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
        }
    },
    
    async search(query) {
        if (!query || query.trim().length < 3) {
            return [];
        }
        
        try {
            // Utiliser Geocoding API (plus simple que Places API)
            const apiKey = await this.getApiKey();
            if (!apiKey || apiKey === 'GOOGLE_API_KEY_PLACEHOLDER') {
                return [{
                    display_name: 'API Key non configurée',
                    lat: null,
                    lng: null,
                    address: {},
                    source: 'error'
                }];
            }
            
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
            );
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                return data.results.map(result => {
                    const components = {};
                    result.address_components.forEach(comp => {
                        comp.types.forEach(type => {
                            components[type] = comp.long_name || comp.short_name;
                        });
                    });
                    
                    return {
                        display_name: result.formatted_address,
                        name: result.formatted_address,
                        formatted_address: result.formatted_address,
                        lat: result.geometry.location.lat,
                        lng: result.geometry.location.lng,
                        geometry: {
                            location: {
                                lat: result.geometry.location.lat,
                                lng: result.geometry.location.lng
                            }
                        },
                        address: components,
                        source: 'geocode'
                    };
                });
            }
            return [];
        } catch (error) {
            console.error('Erreur Geocoding API:', error);
            return [{
                display_name: 'Erreur de connexion à l\'API',
                lat: null,
                lng: null,
                address: {},
                source: 'error'
            }];
        }
    },
};

// Charger le CSS du composant
const cssLink = document.createElement('link');
cssLink.rel = 'stylesheet';
cssLink.href = './components/AddDestination/AddDestination.css';
document.head.appendChild(cssLink);

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
                    <div class="popup-actions">
                        <button class="btn-cancel" onclick="AddDestination.hide()">Annuler</button>
                        <button class="btn-validate" onclick="AddDestination.validate()">Valider</button>
                    </div>
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
        }, 300);
    },

    // Afficher les résultats
    displayResults(results) {
        const resultsDiv = document.getElementById('searchResults');
        
        if (results.length === 0) {
            resultsDiv.innerHTML = '<div class="search-error">Aucun résultat trouvé</div>';
            resultsDiv.classList.add('active');
            return;
        }
        
        const html = results.map(result => `
            <div class="search-result-item" onclick="AddDestination.selectResult(${JSON.stringify(result).replace(/"/g, '&quot;')})">
                <strong>${result.name || result.formatted_address}</strong><br>
                <small>${result.formatted_address}</small>
            </div>
        `).join('');
        
        resultsDiv.innerHTML = html;
        resultsDiv.classList.add('active');
    },

    // Sélectionner un résultat
    selectResult(result) {
        this.currentSelectedResult = result;
        document.getElementById('addressField').value = result.formatted_address;
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
            // Récupérer ou créer l'itinéraire
            const itinerary = await this.getCurrentItinerary();
            if (!itinerary) {
                alert('Erreur lors de la création de l\'itinéraire');
                return;
            }
            
            // Préparer les données de destination
            const destinationData = {
                nom: this.currentSelectedResult.name || address,
                adresse: address,
                location: {
                    lat: this.currentSelectedResult.geometry.location.lat,
                    lng: this.currentSelectedResult.geometry.location.lng
                },
                duree: {
                    jours: parseInt(days),
                    heures: parseInt(hours),
                    minutes: parseInt(minutes)
                },
                street_number: this.currentSelectedResult.street_number || '',
                route: this.currentSelectedResult.route || '',
                locality: this.currentSelectedResult.locality || '',
                administrative_area_level_1: this.currentSelectedResult.administrative_area_level_1 || '',
                country: this.currentSelectedResult.country || '',
                postal_code: this.currentSelectedResult.postal_code || ''
            };
            
            console.log('Préparation des données de destination...');
            console.log('Données destination:', destinationData);
            console.log('Itinéraire ID:', itinerary.id);
            
            // Ajouter la destination
            const addedDestination = await window.firebaseService.addDestination(itinerary.id, destinationData);
            
            if (addedDestination) {
                console.log('Destination ajoutée avec succès:', addedDestination);
                alert('Destination ajoutée avec succès !');
                
                // Nettoyer le formulaire
                this.clearForm();
                this.hide();
                
                // Afficher les destinations sur la carte
                if (window.displayDestinationsOnMap) {
                    window.displayDestinationsOnMap();
                }
            } else {
                alert('Erreur lors de l\'ajout de la destination');
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'ajout:', error);
            alert('Erreur lors de l\'ajout: ' + error.message);
        }
    },

    // Récupérer l'itinéraire actuel
    async getCurrentItinerary() {
        try {
            console.log('Recherche itinéraire existant...');
            const itineraries = await window.firebaseService.getItineraries();
            
            if (itineraries.length > 0) {
                console.log('Itinéraire existant trouvé:', itineraries[0]);
                return itineraries[0];
            } else {
                console.log('Aucun itinéraire, création du premier...');
                const today = new Date().toLocaleDateString('fr-FR');
                const newItinerary = await window.firebaseService.createItinerary(`Voyage du ${today}`);
                console.log('Nouvel itinéraire créé:', newItinerary);
                return newItinerary;
            }
        } catch (error) {
            console.error('Erreur récupération itinéraire:', error);
            return null;
        }
    },

    // Valider les entrées de durée
    validateDurationInput(type) {
        let input;
        let max;
        
        switch(type) {
            case 'hours':
                input = document.getElementById('hoursInput');
                max = 23;
                break;
            case 'minutes':
                input = document.getElementById('minutesInput');
                max = 59;
                break;
            case 'days':
                input = document.getElementById('daysInput');
                max = 365;
                break;
        }
        
        if (input && input.value > max) {
            input.value = max;
        }
    },

    // Vider le formulaire
    clearForm() {
        document.getElementById('searchInput').value = '';
        document.getElementById('addressField').value = '';
        document.getElementById('searchResults').classList.remove('active');
        document.getElementById('daysInput').value = '0';
        document.getElementById('hoursInput').value = '0';
        document.getElementById('minutesInput').value = '0';
        this.currentSelectedResult = null;
        
        if (this.tempMarker && window.map) {
            window.map.removeLayer(this.tempMarker);
            this.tempMarker = null;
        }
    },

    // Configuration des écouteurs d'événements
    setupEventListeners() {
        // Événements gérés directement dans le template avec onclick
        console.log('AddDestination initialisé');
    }
};
