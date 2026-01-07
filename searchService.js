/**
 * Service de recherche d'adresses
 * Gère les requêtes vers Places API et Geocoding API
 */

class SearchService {
    constructor() {
        // Détection de l'environnement
        this.isProduction = window.location.hostname.includes('github.io');
        
        // Configuration de la clé API selon l'environnement
        this.apiKey = this.getApiKey();
    }

    /**
     * Récupère la clé API selon l'environnement
     * @returns {string} Clé API Google Maps
     */
    getApiKey() {
        if (this.isProduction) {
            // En production : clé depuis les secrets GitHub (remplacée automatiquement)
            return 'GOOGLE_API_KEY_PLACEHOLDER';
        } else {
            // En développement : clé depuis la variable globale injectée par le serveur
            return window.GOOGLE_API_KEY;
        }
    }

    /**
     * Effectue une requête vers Google Places API
     * @param {string} query - Texte de recherche
     * @returns {Promise<Array>} Résultats de Places API
     */
    async queryPlacesAPI(query) {
        // Places API disponible uniquement en développement local (via proxy)
        if (this.isProduction) {
            console.warn('Places API non disponible en production (pas de proxy)');
            return [];
        }

        try {
            // En développement local, utilise le proxy Python
            const response = await fetch(`http://localhost:8000/places-search?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                return data.results.map(result => ({
                    display_name: result.name + ', ' + result.formatted_address,
                    lat: result.geometry.location.lat,
                    lng: result.geometry.location.lng,
                    address: {},
                    source: 'places'
                }));
            }
            return [];
        } catch (error) {
            console.error('Erreur Places API:', error);
            return [];
        }
    }

    /**
     * Effectue une requête vers Google Geocoding API
     * @param {string} query - Texte de recherche
     * @returns {Promise<Array>} Résultats de Geocoding API
     */
    async queryGeocodeAPI(query) {
        if (this.apiKey === 'GOOGLE_API_KEY_PLACEHOLDER') {
            console.warn('Geocoding API nécessite une clé API valide');
            return [{
                display_name: 'Recherche API non configurée en production',
                lat: null,
                lng: null,
                address: {},
                source: 'error'
            }];
        }

        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${this.apiKey}`
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
                        lat: result.geometry.location.lat,
                        lng: result.geometry.location.lng,
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
    }

    /**
     * Recherche complète avec stratégie optimisée
     * @param {string} query - Texte de recherche
     * @returns {Promise<Array>} Résultats combinés
     */
    async search(query) {
        if (!query || query.trim().length < 3) {
            return [];
        }

        const trimmedQuery = query.trim();
        let allResults = [];

        try {
            // Places API
            const placesResults = await this.queryPlacesAPI(trimmedQuery);
            allResults = allResults.concat(placesResults);

            // Si Places n'a rien trouvé, essayer Geocoding
            if (placesResults.length === 0) {
                const geocodeResults = await this.queryGeocodeAPI(trimmedQuery);
                allResults = allResults.concat(geocodeResults);
            }

            return allResults;
        } catch (error) {
            console.error('Erreur recherche:', error);
            return [{
                display_name: 'Erreur de recherche',
                lat: null,
                lng: null,
                address: {},
                source: 'error'
            }];
        }
    }

    /**
     * Vérifie si le service est disponible
     * @returns {boolean} True si le service peut faire des recherches
     */
    isAvailable() {
        return this.apiKey !== 'GOOGLE_API_KEY_PLACEHOLDER' || !this.isProduction;
    }
}

// Export du service pour utilisation globale
window.searchService = new SearchService();
