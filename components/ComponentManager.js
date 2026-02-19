/**
 * ComponentManager - Gestionnaire central des composants
 * Pattern Module avec Lazy Loading
 */

export const ComponentManager = {
    // Registre des composants
    components: new Map(),
    
    // Conteneurs disponibles
    containers: {
        menuPopup: 'menuPopupContainer',
        addDestination: 'addPanelContainer'
    },
    
    // Ordre d'initialisation des composants
    initializationOrder: [
        'versionManager',
        'offlineFirstApp', 
        'login',
        'settings',
        'leafletMap',
        'sidebar',
        'chooseAddress',
        'destinations',
        'activity'
    ],

    /**
     * Enregistrer un composant
     * @param {string} name - Nom du composant
     * @param {Function} module - Module du composant
     */
    register(name, module) {
        this.components.set(name, module);
        console.log(`Composant ${name} enregistré`);
    },

    /**
     * Charger un composant de manière asynchrone
     * @param {string} name - Nom du composant
     * @returns {Promise<Object>} Composant chargé
     */
    async load(name) {
        console.log(`ComponentManager.load() appelé pour: ${name}`);
        
        if (this.components.has(name)) {
            const component = this.components.get(name);
            const containerId = this.containers[name];
            
            console.log(`Container ID pour ${name}: ${containerId}`);
            
            if (containerId) {
                component.init(containerId);
                console.log(`Composant ${name} initialisé avec succès`);
                return component;
            } else {
                console.error(`Container non trouvé pour ${name}`);
                return null;
            }
        } else {
            console.error(`Composant ${name} non enregistré`);
            return null;
        }
    },

    /**
     * Charger plusieurs composants
     * @param {Array} names - Noms des composants à charger
     */
    async loadMultiple(names) {
        const results = [];
        for (const name of names) {
            const component = await this.load(name);
            if (component) {
                results.push({ name, component });
            }
        }
        return results;
    },

    /**
     * Initialiser l'application complète dans le bon ordre
     */
    async initAll() {
        console.log('🚀 ComponentManager: Démarrage de l\'initialisation séquentielle...');
        
        try {
            // 1. Vérifier la version
            if (window.CacheVersionManager) {
                console.log('📋 1/13 Vérification de la version...');
                const versionManager = new window.CacheVersionManager();
                await versionManager.init();
            }
            
            // 2. Initialiser l'architecture offline-first
            if (window.OfflineFirstApp) {
                console.log('🏗️ 2/13 Initialisation de l\'architecture offline-first...');
                const app = new window.OfflineFirstApp();
                await app.init();
                window.offlineFirstApp = app;
            }
            
            // 3. Initialiser Login
            if (window.Login) {
                console.log('🔐 3/13 Initialisation de Login...');
                window.Login.init();
            }
            
            // 4. Initialiser Settings
            if (window.Settings) {
                console.log('⚙️ 4/13 Initialisation de Settings...');
                window.Settings.init();
            }
            
            // 5. Initialiser LeafletMap
            if (window.LeafletMap) {
                console.log('🗺️ 5/13 Initialisation de LeafletMap...');
                const mapInstance = new window.LeafletMap();
                mapInstance.init();
                mapInstance.exportForLegacy();
                window.MapInstance = mapInstance;
                console.log('✅ LeafletMap initialisée et exportée');
            }
            
            // 6. Vérifier les taux de change
            if (window.LocationService && navigator.onLine) {
                console.log('💱 6/13 Vérification des taux de change...');
                try {
                    await window.LocationService.loadExchangeRates();
                    console.log('✅ Taux de change vérifiés au démarrage');
                } catch (error) {
                    console.warn('⚠️ Impossible de vérifier les taux de change au démarrage:', error);
                }
            }
            
            // 7. Initialiser Sidebar
            if (window.Sidebar) {
                console.log('📋 7/13 Initialisation de Sidebar...');
                await window.Sidebar.init();
            }
            
            // 8. Initialiser ChooseAddress
            if (window.ChooseAddress) {
                console.log('📍 8/13 Initialisation de ChooseAddress...');
                window.ChooseAddress.init();
            }
            
            // 9. Initialiser Destinations
            if (window.Destinations) {
                console.log('🎯 9/13 Initialisation de Destinations...');
                await window.Destinations.loadDestinations();
            }
            
            // 10. Initialiser Activity
            if (window.Activity) {
                console.log('🎪 10/13 Initialisation de Activity...');
                window.Activity.init();
            }
            
            // 11. Initialiser Menu
            if (window.Menu) {
                console.log('📱 11/13 Initialisation de Menu...');
                // Menu est déjà initialisé globalement, pas besoin de .init()
            }
            
            // 12. Initialiser Itineraries
            if (window.Itineraries) {
                console.log('🗂️ 12/13 Initialisation de Itineraries...');
                // Itineraries est déjà initialisé globalement, pas besoin de .init()
            }
            
            // 13. Mettre à jour le panneau utilisateur une fois tout initialisé
            await this.updateUserPanel();
            
            console.log('✅ ComponentManager: Initialisation complète terminée');
            
        } catch (error) {
            console.error('❌ ComponentManager: Erreur lors de l\'initialisation:', error);
            throw error;
        }
    },

    /**
     * Mettre à jour le panneau utilisateur après initialisation complète
     */
    async updateUserPanel() {
        console.log('🔄 ComponentManager: Mise à jour du panneau utilisateur...');
        
        if (!window.firebaseService || !window.firebaseService.isReady()) {
            console.warn('⚠️ FirebaseService non prêt, attente...');
            return;
        }
        
        if (window.firebaseService.isAuthenticated()) {
            // Utilisateur connecté
            console.log('✅ Utilisateur connecté');
            
            if (window.offlineFirstApp && window.offlineFirstApp.loadUserDataFromFirebase) {
                console.log('📥 Chargement des données utilisateur depuis Firebase...');
                await window.offlineFirstApp.loadUserDataFromFirebase();
            } else {
                console.warn('⚠️ loadUserDataFromFirebase non disponible');
            }
            
            // Masquer la page de connexion
            if (window.Login) {
                window.Login.hide();
            } else {
                console.error('❌ Login non trouvé');
            }

            // Utiliser IndexedDB comme source de données principale
            const itineraries = await window.localStorageService.getItineraries();
            
            // Créer un itinéraire si aucun n'existe
            if (itineraries.length === 0) {
                await window.localStorageService.createItinerary();
            }
            
            // Vérifier et supprimer la destination temporaire
            await window.localStorageService.removeTempDestination();
            
            // Vérifier s'il y a un itinéraire actif
            const currentItinerary = await window.localStorageService.getCurrentItinerary();
            if (!currentItinerary && itineraries.length > 0 && window.Itineraries) {
                console.log('🔄 Aucun itinéraire actif trouvé, activation du premier disponible');
                await window.Itineraries.setActiveItinerary(itineraries[0].id, false);
            }

            // Afficher la carte
            if (window.MapInstance) {
                window.MapInstance.show();
            }
        } else {
            // Utilisateur déconnecté
            console.log('🔒 Utilisateur déconnecté');
            
            // Afficher la page de connexion
            if (window.Login) {
                window.Login.show();
            } else {
                console.error('❌ Login non trouvé');
            }
            
            // Effacer les marqueurs lors de la déconnexion
            if (window.MapInstance && window.MapInstance.cleanMap) {
                window.MapInstance.cleanMap();
            }
            
            // Masquer la carte
            if (window.MapInstance) {
                window.MapInstance.hide();
            } else {
                console.error('❌ MapInstance non trouvé');
            }
        }

        // Cacher le loading global
        if (window.hideLoading) {
            window.hideLoading();
        }
    },

    /**
     * Obtenir un composant par son nom
     * @param {string} name - Nom du composant
     */
    get(name) {
        return this.components.get(name);
    },

    /**
     * Vérifier si un composant est chargé
     * @param {string} name - Nom du composant
     */
    isLoaded(name) {
        const component = this.components.get(name);
        return component && component.container !== null;
    },

    /**
     * Lister tous les composants enregistrés
     */
    list() {
        return Array.from(this.components.keys());
    },

    /**
     * Désinitialiser un composant
     * @param {string} name - Nom du composant
     */
    unload(name) {
        const component = this.components.get(name);
        if (component && component.container) {
            component.container.innerHTML = '';
            component.container = null;
            console.log(`Composant ${name} déchargé`);
        }
    },

    /**
     * Désinitialiser tous les composants
     */
    unloadAll() {
        for (const name of this.components.keys()) {
            this.unload(name);
        }
    }
};
