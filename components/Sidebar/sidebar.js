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
        
        // Charger le contenu de tous les onglets une seule fois
        this.loadDestinationsContent();
        this.loadSyntheseContent(); // Créer le conteneur synthèse maintenant
        
        // Initialiser le premier onglet
        this.switchTab('destinations');
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
                <button class="settings-left settings-btn" onclick="Sidebar.showMoreOptions()" title="Plus d'options">
                    <h2 class="itinerary-name" id="sidebar-itinerary-name">${window.escapeHtml(itineraryName)}</h2>
                    <span class="material-icons">more_vert</span>
                </button>
                <div class="settings-right">
                    <button class="settings-btn" onclick="Sidebar.openSettings()" title="Paramètres">
                        <span class="material-icons">settings</span>
                    </button>
                </div>
            </div>
            
            <!-- Menu à onglets -->
            <div class="sidebar-tabs">
                <button class="tab-btn active" data-tab="destinations" onclick="Sidebar.switchTab('destinations')">
                    <span>Destinations</span>
                </button>
                <button class="tab-btn" data-tab="synthese" onclick="Sidebar.switchTab('synthese')">
                    <span>Synthèse</span>
                </button>
            </div>
            
            <!-- Contenu des onglets -->
            <div class="sidebar-content">
                <div class="tab-panel active" id="sidebar-destinations-content">
                    <!-- Le contenu destinations sera chargé ici -->
                </div>
                <div class="tab-panel" id="sidebar-synthese-content">
                    <!-- Le contenu synthèse sera chargé ici -->
                </div>
            </div>
        `;
        return container;
    },
    
    /**
     * Changer d'onglet avec animation one tap directe
     */
    switchTab(tabName) {
        // Récupérer tous les boutons
        const allTabs = document.querySelectorAll('.tab-btn');
        const previousActiveTab = document.querySelector('.tab-btn.active');
        const newActiveTab = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (!newActiveTab || newActiveTab.classList.contains('active')) {
            return; // Pas de changement nécessaire
        }
        
        // Désactiver le bouton précédent et activer le nouveau immédiatement
        if (previousActiveTab) {
            previousActiveTab.classList.remove('active');
        }
        newActiveTab.classList.add('active');
        
        // Mettre à jour les panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        const activePanel = document.getElementById(`sidebar-${tabName}-content`);
        if (activePanel) {
            activePanel.classList.add('active');
        }
        
        // Mettre à jour l'onglet courant
        this.currentTab = tabName;
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
     * Charger le contenu de la synthèse
     */
    loadSyntheseContent() {
        const container = document.getElementById('sidebar-synthese-content');
        if (!container) return;
        
        // Créer le conteneur pour le composant Synthèse
        container.innerHTML = '<div class="synthese-container"></div>';
        
        // Intégrer le composant Synthèse (vérification explicite pour éviter le falsy object problem)
        if (window.Synthèse) {
            window.Synthèse.render();
        } else {
            // Contenu par défaut en attendant le composant
            container.innerHTML = `
                <div class="sidebar-synthese">
                    <h2>Synthèse du voyage</h2>
                    <p>Le composant Synthèse est en cours de développement...</p>
                    <p>Cette page affichera un résumé complet de votre itinéraire.</p>
                </div>
            `;
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
    
    /**
     * Méthodes du header
     */
    showMoreOptions() {       
        // Ouvrir la modal de gestion des itinéraires
        if (window.Itineraries && typeof window.Itineraries.open === 'function') {
            window.Itineraries.open();
        } else {
            showInfoSnackBar('Gestion des itinéraires en cours de chargement...');
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
