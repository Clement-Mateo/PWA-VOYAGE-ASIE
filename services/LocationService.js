/**
 * Service de localisation et gestion des devises
 * Centralise toutes les fonctionnalités liées à la géolocalisation et aux devises
 */

const LocationService = {

    lastGeocodeTime: 0,
    geocodeAttempts: 0,
    
    /**
     * Géocoder une adresse avec plusieurs APIs de secours
     */
    async geocodeAddress(address) {
        try {
            // Rate limiting : minimum 1 seconde entre les requêtes
            if (this.lastGeocodeTime && Date.now() - this.lastGeocodeTime < 1000) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            this.lastGeocodeTime = Date.now();
            this.geocodeAttempts++;
            
            // Essayer Nominatim en premier avec headers personnalisés
            try {
                const result = await this.geocodeWithNominatim(address);
                this.geocodeAttempts = 0; // Reset en cas de succès
                return result;
            } catch (error) {
                console.warn('⚠️ Nominatim échoué, tentative avec alternative...');
                
                // Si trop de requêtes, attendre plus longtemps
                if (error.message.includes('Trop de requêtes')) {
                    const waitTime = Math.min(5000, 1000 * this.geocodeAttempts);
                    console.log(`⏱️ Attente de ${waitTime}ms avant de réessayer...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
                
                // Alternative : OpenCage Geocoder (gratuit, 2500 req/jour)
                try {
                    return await this.geocodeWithOpenCage(address);
                } catch (altError) {
                    console.warn('⚠️ OpenCage échoué, tentative avec MapBox...');
                    
                    // Alternative : MapBox (nécessite une clé, mais plus généreux)
                    try {
                        return await this.geocodeWithMapBox(address);
                    } catch (mapBoxError) {
                        throw new Error('Tous les services de géocodage sont indisponibles');
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur géocodage:', error);
            throw error;
        }
    },

    /**
     * Géocoder avec Nominatim (OpenStreetMap)
     */
    async geocodeWithNominatim(address) {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
            method: 'GET',
            headers: {
                'User-Agent': 'PWA-Voyage-Asie/1.0 (contact@voyage-asie.com)',
                'Referer': window.location.origin,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 425) {
                throw new Error('Trop de requêtes trop rapides - Veuillez patienter quelques secondes');
            }
            throw new Error(`Erreur HTTP Nominatim: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            throw new Error('Aucun résultat trouvé');
        }
        
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        // Utiliser getCountryFromCoordinates pour obtenir le nom anglais du pays
        const countryName = await this.getCountryFromCoordinates(lat, lng);
        
        return {
            lat: lat,
            lng: lng,
            address: result.display_name,
            country: countryName || result.display_name.split(',').pop().trim()
        };
    },

    /**
     * Géocoder avec OpenCage Geocoder (alternative)
     */
    async geocodeWithOpenCage(address) {
        // Note : Pour la production, il faudrait une clé API
        const apiKey = '4f326dfe3dda4bc6939cc1f727976a7c'; // Clé de démonstration
        const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${apiKey}&limit=1`);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP OpenCage: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status.code !== 200 || !data.results || data.results.length === 0) {
            throw new Error('OpenCage: Aucun résultat trouvé');
        }
        
        const result = data.results[0];
        const countryName = await this.getCountryFromCoordinates(result.geometry.lat, result.geometry.lng);
        
        return {
            lat: result.geometry.lat,
            lng: result.geometry.lng,
            address: result.formatted,
            country: countryName || result.components.country
        };
    },

    /**
     * Géocoder avec MapBox (alternative avec clé)
     */
    async geocodeWithMapBox(address) {
        const apiKey = 'votre_mapbox_api_key'; // TODO je recois pas le mail de validation
        if (apiKey === 'votre_mapbox_api_key') {
            throw new Error('MapBox nécessite une clé API configurée');
        }
        
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}&limit=1`);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP MapBox: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.features || data.features.length === 0) {
            throw new Error('MapBox: Aucun résultat trouvé');
        }
        
        const result = data.features[0];
        const [lng, lat] = result.center;
        const countryName = await this.getCountryFromCoordinates(lat, lng);
        
        return {
            lat: lat,
            lng: lng,
            address: result.place_name,
            country: countryName || result.context?.find(c => c.id.startsWith('country'))?.text
        };
    },

    /**
     * Obtenir le pays à partir des coordonnées (reverse geocoding)
     */
    async getCountryFromCoordinates(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1&accept-language=en`);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.address) {
                const country = data.address.country || '';
                console.log('🌍 Pays trouvé:', country);
                return country;
            }
            
            return '';
        } catch (error) {
            console.error('❌ Erreur reverse geocoding:', error);
            return '';
        }
    },

    /**
     * Charger les taux de change depuis l'API ou le cache global
     */

    async loadExchangeRates() {
        try {
            const globalRates = await window.localStorageService.getExchangeRates();
            if (globalRates) {
                const now = Date.now();
                const lastUpdated = globalRates.lastUpdated || 0;
                const oneDay = 24 * 60 * 60 * 1000;
                
                if ((now - lastUpdated) < oneDay) {
                    return globalRates.rates;
                }
                
                if (navigator.onLine) {
                    console.log('🔄 Taux de change expirés, rafraîchissement...');
                    const freshRates = await this.fetchFreshExchangeRates();
                    await window.localStorageService.saveExchangeRates(freshRates);
                    return freshRates.rates;
                } else {
                    console.log('⚠️ Taux de change expirés mais utilisés (offline)');
                    return globalRates.rates;
                }
            }
            
            if (navigator.onLine) {
                console.log('🔄 Chargement des taux de change depuis API...');
                const freshRates = await this.fetchFreshExchangeRates();
                await window.localStorageService.saveExchangeRates(freshRates);
                return freshRates.rates;
            }
            
            console.log('❌ Aucun taux de charge disponible');
            return null;
        } catch (error) {
            console.error('❌ Erreur loadExchangeRates:', error);
            return null;
        }
    },

    /**
     * Récupérer les taux de change frais depuis l'API
     */

    async fetchFreshExchangeRates() {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
        
        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            ...data,
            lastUpdated: Date.now()
        };
    },

    /**
     * Obtenir la devise locale pour une destination
     */

    async getLocalCurrency(destinationId) {
        try {
            // 1. Essayer de récupérer la devise depuis la destination
            if (destinationId) {
                const destination = await window.localStorageService.getDestination(destinationId);
                if (destination && destination.address && destination.address.countryCurrency) {
                    return destination.address.countryCurrency;
                }
            }
            
            // 2. Si pas de destination ou pas de devise stockée, retourner EUR par défaut
            return { code: 'EUR', name: 'Euro', symbol: '€' };
            
        } catch (error) {
            console.error('❌ Erreur récupération devise locale:', error);
            return { code: 'EUR', name: 'Euro', symbol: '€' };
        }
    },

    /**
     * Obtenir la devise pour un pays donné (avec cache)
     */

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
            const fallbackCode = fallbackMapping[country];
            if (fallbackCode) {
                return { code: fallbackCode, name: fallbackCode, symbol: fallbackCode, lastUpdated: Date.now() };
            }
            
            const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fullText=false`);
            
            if (!response.ok) {
                console.log('⚠️ Pays non trouvé:', country);
                return { code: 'EUR', name: 'Euro', symbol: '€', lastUpdated: Date.now() };
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const countryData = data[0];
                const currencies = countryData.currencies;
                
                if (currencies && Object.keys(currencies).length > 0) {
                    const currencyKey = Object.keys(currencies)[0];
                    const currency = currencies[currencyKey];
                    
                    const result = {
                        code: currency.code || currencyKey || 'EUR',
                        name: currency.name || 'Euro',
                        symbol: currency.symbol || '€',
                        lastUpdated: Date.now()
                    };
                    
                    return result;
                }
            }
            
            return { code: 'EUR', name: 'Euro', symbol: '€', lastUpdated: Date.now() };
            
        } catch (error) {
            console.error('❌ Erreur devise:', error);
            return { code: 'EUR', name: 'Euro', symbol: '€', lastUpdated: Date.now() };
        }
    },

    /**
     * Convertir un montant de EUR vers la devise locale
     */

    async convertEurToLocalCurrency(amountInEur, localCurrencyCode) {
        if (!localCurrencyCode || localCurrencyCode === 'EUR') {
            return amountInEur;
        }
        
        const rates = await this.loadExchangeRates();
        if (!rates) {
            return amountInEur;
        }
        
        const rate = rates[localCurrencyCode];
        if (rate) {
            return amountInEur * rate;
        }
        
        return amountInEur;
    },

    /**
     * Convertir un montant de la devise locale vers EUR
     */

    async convertLocalCurrencyToEur(amountInLocal, localCurrencyCode) {
        // Conversion en nombre avec fallback à 0
        const amount = parseFloat(amountInLocal) || 0;
        
        if (!localCurrencyCode || localCurrencyCode === 'EUR') {
            return amount;
        }
        
        const rates = await this.loadExchangeRates();
        if (!rates) {
            return 0;
        }
        
        const rate = rates[localCurrencyCode];
        if (rate && typeof rate === 'number' && rate > 0) {
            return amount / rate;
        }
        
        return 0;
    },

    /**
     * Mettre à jour le champ EUR depuis la devise locale
     */

    // Flag pour éviter les conversions en boucle
    isConverting: false,

    async updateEurFromLocalCurrency(localAmount, localCurrencyCode) {
        // Éviter les conversions en boucle
        if (this.isConverting) {
            return;
        }
        
        this.isConverting = true;
        
        const eurAmount = await this.convertLocalCurrencyToEur(localAmount, localCurrencyCode);
        const eurField = document.getElementById('priceAmount');
        
        if (eurField) {
            eurField.value = eurAmount.toFixed(2);
            // Ne pas déclencher l'événement input pour éviter la boucle
            eurField.dispatchEvent(new Event('input', { bubbles: false }));
        }
        
        this.isConverting = false;
    },

    /**
     * Initialiser le service
     */
    init() {
        // Plus de cache mémoire - tout est dans IndexedDB
    }
};

// Initialiser le service
LocationService.init();

// Exporter globalement
window.LocationService = LocationService;

