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
        
        popup.classList.add('open');
        
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
        popup.classList.remove('open');
        
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
        popup.className = 'modal';
        
        popup.innerHTML = `
            <div class="modal-backdrop" onclick="ChooseAddress.hide()"></div>
            <div class="modal-content" style="width: 90%; max-width: 500px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3 class="modal-title">🔍 Rechercher une adresse</h3>
                    <button class="btn-close" onclick="ChooseAddress.hide()">×</button>
                </div>
                <div class="modal-body">
                    <div class="search-input-container">
                        <input type="text" id="addressSearchInput" class="address-search-input"
                            placeholder="Saisissez une adresse..." oninput="ChooseAddress.searchAddress()" onclick="event.stopPropagation()">
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
                        },
                        types: place.types || []
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
    
    // Fonction pour obtenir la traduction française du type
    getFrenchType(type) {
        const translations = {
            'restaurant': 'Restaurant',
            'food': 'Restaurant',
            'cafe': 'Café',
            'bakery': 'Boulangerie',
            'bar': 'Bar',
            'night_club': 'Boîte de nuit',
            'store': 'Magasin',
            'shopping_mall': 'Centre commercial',
            'supermarket': 'Supermarché',
            'pharmacy': 'Pharmacie',
            'hospital': 'Hôpital',
            'doctor': 'Médecin',
            'school': 'École',
            'university': 'Université',
            'library': 'Bibliothèque',
            'bank': 'Banque',
            'atm': 'DAB',
            'gas_station': 'Station-service',
            'parking': 'Parking',
            'airport': 'Aéroport',
            'train_station': 'Gare',
            'bus_station': 'Gare routière',
            'subway_station': 'Station de métro',
            'hotel': 'Hôtel',
            'lodging': 'Hébergement',
            'museum': 'Musée',
            'art_gallery': 'Galerie d\'art',
            'movie_theater': 'Cinéma',
            'gym': 'Salle de sport',
            'spa': 'Spa',
            'park': 'Parc',
            'stadium': 'Stade',
            'church': 'Église',
            'mosque': 'Mosquée',
            'hindu_temple': 'Temple hindou',
            'synagogue': 'Synagogue',
            'government': 'Gouvernement',
            'post_office': 'Bureau de poste',
            'police': 'Police',
            'fire_station': 'Pompier',
            'embassy': 'Ambassade',
            'tourist_attraction': 'Attraction touristique',
            'point_of_interest': 'Lieu d\'intérêt',
            'establishment': 'Établissement',
            'generic_business': 'Entreprise',
            'finance': 'Finance',
            'insurance': 'Assurance',
            'lawyer': 'Avocat',
            'real_estate': 'Immobilier',
            'travel_agency': 'Agence de voyages',
            'car_rental': 'Location de voiture',
            'taxi_stand': 'Station de taxi',
            'car_repair': 'Garage',
            'beauty_salon': 'Salon de beauté',
            'hair_care': 'Coiffeur',
            'electronics_store': 'Magasin d\'électronique',
            'clothing_store': 'Magasin de vêtements',
            'furniture_store': 'Magasin de meubles',
            'hardware_store': 'Quincaillerie',
            'pet_store': 'Animalerie',
            'florist': 'Fleuriste',
            'book_store': 'Librairie',
            'music_store': 'Magasin de musique',
            'toy_store': 'Magasin de jouets',
            'jewelry_store': 'Bijouterie',
            'liquor_store': 'Cave',
            'convenience_store': 'Supérette',
            'grocery_or_supermarket': 'Épicerie',
            'health': 'Santé',
            'medical': 'Médical',
            'fitness': 'Fitness',
            'sports': 'Sports',
            'recreation': 'Loisirs'
        };
        
        return translations[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
    },

    // Fonction pour obtenir l'icône Google Font en fonction du type
    getIconForType(type) {
        const iconMap = {
            'restaurant': 'restaurant',
            'food': 'restaurant',
            'cafe': 'local_cafe',
            'bakery': 'bakery_dining',
            'bar': 'bar',
            'night_club': 'nightlife',
            'store': 'store',
            'shopping_mall': 'shopping_mall',
            'supermarket': 'local_grocery_store',
            'pharmacy': 'local_pharmacy',
            'hospital': 'local_hospital',
            'doctor': 'local_hospital',
            'school': 'school',
            'university': 'school',
            'library': 'local_library',
            'bank': 'account_balance',
            'atm': 'atm',
            'gas_station': 'local_gas_station',
            'parking': 'local_parking',
            'airport': 'flight',
            'train_station': 'train',
            'bus_station': 'directions_bus',
            'subway_station': 'subway',
            'hotel': 'hotel',
            'lodging': 'hotel',
            'museum': 'museum',
            'art_gallery': 'museum',
            'movie_theater': 'theater_comedy',
            'gym': 'fitness_center',
            'spa': 'spa',
            'park': 'park',
            'stadium': 'stadium',
            'church': 'church',
            'mosque': 'mosque',
            'hindu_temple': 'temple_hindu',
            'synagogue': 'synagogue',
            'government': 'account_balance',
            'post_office': 'local_post_office',
            'police': 'local_police',
            'fire_station': 'local_fire_department',
            'embassy': 'account_balance',
            'tourist_attraction': 'photo_camera',
            'point_of_interest': 'place',
            'establishment': 'business',
            'generic_business': 'business',
            'finance': 'account_balance',
            'insurance': 'policy',
            'lawyer': 'gavel',
            'real_estate': 'home',
            'travel_agency': 'luggage',
            'car_rental': 'directions_car',
            'taxi_stand': 'local_taxi',
            'car_repair': 'car_repair',
            'gas_station': 'local_gas_station',
            'parking': 'local_parking',
            'beauty_salon': 'content_cut',
            'hair_care': 'content_cut',
            'electronics_store': 'devices',
            'clothing_store': 'checkroom',
            'furniture_store': 'chair',
            'hardware_store': 'hardware',
            'pet_store': 'pets',
            'florist': 'local_florist',
            'book_store': 'menu_book',
            'music_store': 'music_note',
            'toy_store': 'toys',
            'jewelry_store': 'diamond',
            'bakery': 'bakery_dining',
            'liquor_store': 'local_bar',
            'convenience_store': 'store',
            'grocery_or_supermarket': 'local_grocery_store',
            'health': 'local_hospital',
            'medical': 'local_hospital',
            'gym': 'fitness_center',
            'fitness': 'fitness_center',
            'sports': 'fitness_center',
            'recreation': 'sports_soccer'
        };
        
        // Normaliser le type (enlever les underscores et mettre en minuscule)
        const normalizedType = type ? type.toLowerCase().replace(/_/g, ' ') : '';
        
        // Chercher une correspondance exacte
        if (iconMap[normalizedType]) {
            return iconMap[normalizedType];
        }
        
        // Chercher une correspondance partielle
        for (const [key, value] of Object.entries(iconMap)) {
            if (normalizedType.includes(key) || key.includes(normalizedType)) {
                return value;
            }
        }
        
        // Par défaut, retourner l'icône de localisation
        return 'place';
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
        
        resultsContainer.innerHTML = results.map((result, index) => {
            const icon = result.types && result.types.length > 0 ? 
                this.getIconForType(result.types[0]) : 'place';
            
            const iconHtml = `<div class="address-result-icon" style="background: var(--primary-blue);">
                <span class="material-icons" style="color: white; font-size: 20px;">${icon}</span>
            </div>`;
            
            const typeText = result.types && result.types.length > 0 ? 
                this.getFrenchType(result.types[0]) : '';
            
            return `
            <div class="address-result-item" onclick="ChooseAddress.selectAddress(${index})">
                <div class="address-result-header">
                    ${iconHtml}
                    <div class="address-result-info">
                        <div class="address-name">${result.name}</div>
                        ${typeText ? `<div class="address-type">${typeText}</div>` : ''}
                    </div>
                </div>
                <div class="address-details">${result.address}</div>
            </div>
            `;
        }).join('');
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

// Le composant est disponible globalement via window.ChooseAddress
window.ChooseAddress = ChooseAddress;
