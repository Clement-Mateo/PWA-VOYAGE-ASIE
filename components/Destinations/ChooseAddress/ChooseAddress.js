/**
 * Composant ChooseAddress - Module Pattern
 * Gère la popup de recherche et sélection d'adresse
 */

const ChooseAddress = {
    isVisible: false,
    currentCallback: null,
    searchResults: [],
    searchTimeout: null,
    
    /**
     * Initialiser le composant
     */
    init() {
        console.log('ChooseAddress: Initialisation...');
        this.setupEventListeners();
    },
    
    /**
     * Configurer les écouteurs d'événements
     */
    setupEventListeners() {
        // Fermer la popup en cliquant à l'extérieur (avec délai)
        document.addEventListener('click', (e) => {
            if (this.isVisible && !e.target.closest('.choose-address-popup')) {
                // Retarder la fermeture pour éviter les conflits
                setTimeout(() => {
                    if (this.isVisible) {
                        this.hide();
                    }
                }, 100);
            }
        });
        
        // Fermer avec la touche Escape
        document.addEventListener('keydown', (e) => {
            if (this.isVisible && e.key === 'Escape') {
                this.hide();
            }
        });
    },
    
    /**
     * Afficher la popup
     */
    show(callback) {
        console.log('🔍 ChooseAddress.show appelé avec callback:', callback);
        this.currentCallback = callback;
        this.isVisible = true;
        
        const popup = this.getPopup();
        
        popup.classList.add('show');
        
        // Focus sur le champ de recherche
        setTimeout(() => {
            const searchInput = document.getElementById('addressSearchInput');
            if (searchInput) {
                searchInput.focus();
                console.log('🔍 Focus sur le champ de recherche');
            }
        }, 100);
    },
    
    /**
     * Masquer la popup
     */
    hide() {
        this.isVisible = false;
        const popup = this.getPopup();
        popup.classList.remove('show');
        
        // Vider le champ de recherche
        const searchInput = document.getElementById('addressSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Vider les résultats
        const resultsContainer = document.getElementById('addressResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
        
        // Réinitialiser (après la sélection potentielle)
        setTimeout(() => {
            console.log('🔍 Réinitialisation de searchResults et currentCallback');
            this.searchResults = [];
            this.currentCallback = null;
        }, 100);
    },
    
    /**
     * Obtenir ou créer la popup
     */
    getPopup() {
        let popup = document.getElementById('chooseAddressPopup');
        
        if (!popup) {
            console.log('🔍 Création de la popup...');
            popup = this.createPopup();
            document.body.appendChild(popup);
            console.log('🔍 Popup créée et ajoutée au body');
        }
        return popup;
    },
    
    /**
     * Créer la popup HTML
     */
    createPopup() {
        const popup = document.createElement('div');
        popup.id = 'chooseAddressPopup';
        popup.className = 'choose-address-popup';
        
        popup.innerHTML = `
            <div class="choose-address-content">
                <div class="choose-address-header">
                    <h3>🔍 Rechercher une adresse</h3>
                    <button class="close-btn" onclick="ChooseAddress.hide()">×</button>
                </div>
                <div class="choose-address-body">
                    <div class="search-input-container">
                        <input type="text" id="addressSearchInput" class="address-search-input"
                            placeholder="Saisissez une adresse..." oninput="ChooseAddress.searchAddress()">
                    </div>
                    <div id="addressResults" class="address-results"></div>
                </div>
            </div>
        `;
        
        return popup;
    },
    
    /**
     * Rechercher une adresse avec timeout (logique de AddDestination.js)
     */
    async searchAddress() {
        const query = document.getElementById('addressSearchInput').value;
        
        clearTimeout(this.searchTimeout);
        
        if (query.length < 3) {
            this.showResults([]);
            return;
        }
        
        this.searchTimeout = setTimeout(async () => {
            try {
                console.log('🔍 Recherche de:', query);
                const results = await this.performSearch(query);
                console.log('✅ Résultats trouvés:', results);
                this.showResults(results);
            } catch (error) {
                console.error('❌ Erreur de recherche:', error);
                this.showResults([]);
            }
        }, 500);
    },
    
    /**
     * Effectuer la recherche réelle
     */
    async performSearch(query) {
        if (!query || query.length < 3) {
            return [];
        }
        
        try {
            // Utiliser le proxy Vercel, avec fallback pour le développement
            const apiKey = window.googleMapsApiKey;
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
    
    /**
     * Afficher les résultats de recherche
     */
    showResults(results) {
        console.log('🔍 showResults appelé avec', results.length, 'résultats');
        this.searchResults = results;
        console.log('🔍 searchResults mis à jour:', this.searchResults.length);
        
        const resultsContainer = document.getElementById('addressResults');
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">Aucune adresse trouvée</div>';
            return;
        }
        
        resultsContainer.innerHTML = results.map((result, index) => `
            <div class="address-result-item" onclick="ChooseAddress.selectAddress(${index})">
                <div class="address-name">${result.name}</div>
                <div class="address-details">${result.address}</div>
            </div>
        `).join('');
    },
    
    /**
     * Sélectionner une adresse
     */
    async selectAddress(index) {
        console.log('🔍 ChooseAddress.selectAddress appelé avec index:', index);
        console.log('🔍 searchResults disponibles:', this.searchResults.length);
        
        const result = this.searchResults[index];
        
        if (!result) {
            console.error('❌ Aucun résultat trouvé pour l\'index', index);
            return;
        }
        
        console.log('🔍 Résultat sélectionné:', result);
        
        // Si nous n'avons pas les coordonnées, les récupérer
        if (!result.location) {
            try {
                console.log('🔍 Récupération des coordonnées pour placeId:', result.placeId);
                const detailedResult = await this.getPlaceDetails(result.placeId);
                result.location = detailedResult.location;
                console.log('✅ Coordonnées récupérées:', result.location);
            } catch (error) {
                console.error('❌ Erreur récupération détails:', error);
            }
        }
        
        // Appeler le callback avec l'adresse sélectionnée
        if (this.currentCallback) {
            console.log('🔍 Appel du callback avec:', result);
            this.currentCallback(result);
        } else {
            console.error('❌ Aucun callback défini');
        }
        
        this.hide();
    },
    
    /**
     * Obtenir les détails d'un lieu
     */
    async getPlaceDetails(placeId) {
        const apiKey = window.googleMapsApiKey;
        
        if (!apiKey || apiKey === 'GOOGLE_API_KEY_PLACEHOLDER') {
            throw new Error('Clé API Google Maps non configurée');
        }
        
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.result && data.result.geometry) {
            return {
                location: {
                    lat: data.result.geometry.location.lat,
                    lng: data.result.geometry.location.lng
                }
            };
        }
        
        throw new Error('Impossible de récupérer les coordonnées');
    }
};

// Exporter globalement
window.ChooseAddress = ChooseAddress;
