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
            
            // Essayer le proxy Vercel d'abord
            try {
                url = `https://carte-monde-interactive.vercel.app/api/places-search?query=${encodeURIComponent(query)}`;
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.status === 'OK') {
                    return data.results.map(place => ({
                        placeId: place.place_id,
                        name: place.name,
                        address: place.formatted_address,
                        location: {
                            lat: place.geometry.location.lat,
                            lng: place.geometry.location.lng
                        }
                    }));
                }
            } catch (proxyError) {
                console.warn('Proxy Vercel non disponible, fallback en développement:', proxyError.message);
                
                // Fallback : utiliser Geocoding API pour le développement
                if (!this.isProduction && apiKey && apiKey !== 'GOOGLE_API_KEY_PLACEHOLDER') {
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
            // TODO: Ajouter la destination à l'itinéraire
            console.log('Destination à ajouter:', {
                address,
                duration: { days, hours, minutes },
                location: this.currentSelectedResult.location
            });
            
            this.hide();
        } catch (error) {
            console.error('Erreur lors de l\'ajout:', error);
            alert('Erreur lors de l\'ajout de la destination');
        }
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
        if (this.tempMarker) {
            window.map.removeLayer(this.tempMarker);
            this.tempMarker = null;
        }
    }
};
