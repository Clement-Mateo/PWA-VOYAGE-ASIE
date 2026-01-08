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
     * Initialiser tous les composants enregistrés
     */
    async initAll() {
        const loadPromises = [];
        
        for (const [name] of this.components) {
            if (this.containers[name]) {
                loadPromises.push(this.load(name));
            }
        }
        
        try {
            const results = await Promise.all(loadPromises);
            console.log('Tous les composants chargés:', results.length);
            return results;
        } catch (error) {
            console.error('Erreur lors du chargement des composants:', error);
            return [];
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
