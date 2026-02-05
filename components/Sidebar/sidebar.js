const Sidebar = {
    currentTab: 'destinations',
    
    /**
     * Initialiser le composant Sidebar
     */
    async init() {
        await this.render();
    },
    
    /**
     * Rendre le composant Sidebar
     */
    async render() {
        // Créer le conteneur principal
        let sidebarContainer = document.getElementById('sidebarContainer');
        if (!sidebarContainer) {
            sidebarContainer = await this.createContainer();
            document.body.appendChild(sidebarContainer);
        }
        
        // Mettre à jour le nom de l'itinéraire
        await this.updateItineraryName();
        
        // Charger le contenu des destinations
        this.loadDestinationsContent();
    },
    
    /**
     * Créer le conteneur principal
     */
    async createContainer() {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const itineraryName = currentItinerary?.name || 'Mon Itinéraire';
        
        const container = document.createElement('div');
        container.id = 'sidebarContainer'; // Ajouter l'ID pour la vérification
        container.className = 'sidebar-container';
        container.innerHTML = `
            <!-- En-tête Settings intégré -->
            <div class="sidebar-header">
                <div class="itinerary-title">
                    <h2 class="itinerary-name" id="sidebar-itinerary-name">${window.escapeHtml(itineraryName)}</h2>
                </div>
                <div class="settings-right">
                    <button class="menu-btn" onclick="Sidebar.openSettings()" title="Paramètres">
                        <span class="material-icons">menu</span>
                    </button>
                </div>
            </div>
            
            <!-- Contenu direct des destinations -->
            <div class="sidebar-content">
                <div id="sidebar-destinations-content">
                    <!-- Le contenu destinations sera chargé ici -->
                </div>
            </div>
            
            <!-- Footer avec bouton ajouter -->
            <div class="sidebar-footer">
                <button class="btn-add" onclick="Destinations.showAddForm()">
                    <span class="material-icons">add</span>
                    Ajouter une destination
                </button>
            </div>
        `;
        return container;
    },
    
    /**
     * Charger le contenu des destinations
     */
    loadDestinationsContent() {
        const container = document.getElementById('sidebar-destinations-content');
        if (!container) return;
        
        // Vider le conteneur
        container.innerHTML = '';
        
        // Créer le conteneur pour Destinations
        if (window.Destinations) {
            const destinationsContainer = document.createElement('div');
            destinationsContainer.id = 'destinationsPanel';
            destinationsContainer.className = 'destinations-panel';
            
            // Ajouter le conteneur pour les destinations
            const destinationsList = document.createElement('div');
            destinationsList.className = 'destinations-list';
            destinationsContainer.appendChild(destinationsList);
            
            container.appendChild(destinationsContainer);
        } else {
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Chargement des destinations...</p>';
        }
    },
    
    /**
     * Mettre à jour le nom de l'itinéraire
     */
    async updateItineraryName() {
        const nameElement = document.getElementById('sidebar-itinerary-name');
        if (nameElement && window.localStorageService) {
            const currentItinerary = await window.localStorageService.getCurrentItinerary();
            const itineraryName = currentItinerary?.name || 'Nouvel Itinéraire';
            nameElement.textContent = window.escapeHtml(itineraryName);
        }
    },
    
    openSettings() {
        // Ouvrir la modal Settings
        console.log('Sidebar: openSettings appelé');
        if (window.Settings) {
            window.Settings.open();
        } else {
            console.error('Settings component non disponible');
            showInfoSnackBar('Paramètres en cours de chargement...');
        }
    },
};

// Exporter globalement
window.Sidebar = Sidebar;
