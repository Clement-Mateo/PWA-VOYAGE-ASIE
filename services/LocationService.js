/**
 * Service de localisation et gestion des devises
 * Centralise toutes les fonctionnalités liées à la géolocalisation et aux devises
 */

const LocationService = {

    /**
     * Géocoder une adresse avec l'API Nominatim (OpenStreetMap)
     */

    async geocodeAddress(address) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = data[0];
                
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                
                // Utiliser getCountryFromCoordinates pour obtenir le nom anglais du pays
                const countryName = await this.getCountryFromCoordinates(lat, lng);
                
                const geocodedResult = {
                    lat: lat,
                    lng: lng,
                    address: result.display_name,
                    country: countryName || result.display_name.split(',').pop().trim()
                };
                
                console.log('✅ Adresse géocodée:', address, '→', geocodedResult.country);
                return geocodedResult;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erreur géocodage:', error);
            return null;
        }
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
        if (!localCurrencyCode || localCurrencyCode === 'EUR') {
            return amountInLocal;
        }
        
        const rates = await this.loadExchangeRates();
        if (!rates) {
            return amountInLocal;
        }
        
        const rate = rates[localCurrencyCode];
        if (rate && rate > 0) {
            return amountInLocal / rate;
        }
        
        return amountInLocal;
    },

    /**
     * Mettre à jour le champ EUR depuis la devise locale
     */

    async updateEurFromLocalCurrency(localAmount, localCurrencyCode) {
        const eurAmount = await this.convertLocalCurrencyToEur(localAmount, localCurrencyCode);
        const eurField = document.getElementById('priceAmount');
        
        if (eurField) {
            eurField.value = eurAmount.toFixed(2);
            eurField.dispatchEvent(new Event('input'));
        }
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

