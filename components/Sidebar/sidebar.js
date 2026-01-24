const Sidebar = {
    currentTab: 'destinations',
    
    /**
     * Initialiser le composant Sidebar
     */
    init() {
        console.log('Sidebar: Initialisation...');
        this.render();
    },
    
    /**
     * Rendre le composant Sidebar
     */
    render() {
        // Créer le conteneur principal
        let sidebarContainer = document.getElementById('sidebarContainer');
        if (!sidebarContainer) {
            sidebarContainer = this.createContainer();
            document.body.appendChild(sidebarContainer);
        }
        
        // Mettre à jour le nom de l'itinéraire
        this.updateItineraryName();
        
        // Initialiser le premier onglet
        this.switchTab('destinations');
    },
    
    /**
     * Créer le conteneur principal
     */
    createContainer() {
        const container = document.createElement('div');
        container.className = 'sidebar-container';
        container.innerHTML = `
            <!-- En-tête Settings intégré -->
            <div class="sidebar-header">
                <div class="settings-left">
                    <h2 class="itinerary-name" id="sidebar-itinerary-name">Mon Itinéraire</h2>
                    <button class="settings-btn" onclick="Sidebar.showMoreOptions()" title="Plus d'options">
                        <span class="material-icons">more_vert</span>
                    </button>
                </div>
                <div class="settings-right">
                    <button class="settings-btn" onclick="Sidebar.openSettings()" title="Paramètres">
                        <span class="material-icons">settings</span>
                    </button>
                </div>
            </div>
            
            <!-- Menu à onglets -->
            <div class="sidebar-tabs">
                <button class="tab-btn active" data-tab="destinations" onclick="Sidebar.switchTab('destinations')">
                    Destinations
                </button>
                <button class="tab-btn" data-tab="synthese" onclick="Sidebar.switchTab('synthese')">
                    Synthèse
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
     * Changer d'onglet
     */
    switchTab(tabName) {
        console.log('Sidebar: Changement d\'onglet vers', tabName);
        
        // Mettre à jour les classes des onglets
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });
        
        // Mettre à jour les panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        const activePanel = document.getElementById(`sidebar-${tabName}-content`);
        if (activePanel) {
            activePanel.classList.add('active');
        }
        
        // Gérer le contenu spécifique à chaque onglet
        this.currentTab = tabName;
        
        if (tabName === 'destinations') {
            this.loadDestinationsContent();
        } else if (tabName === 'synthese') {
            this.loadSyntheseContent();
        }
    },
    
    /**
     * Charger le contenu des destinations
     */
    loadDestinationsContent() {
        const container = document.getElementById('sidebar-destinations-content');
        if (!container) return;
        
        // Vider le conteneur
        container.innerHTML = '';
        
        // Intégrer le contenu du composant Destinations (sans le header)
        if (window.Destinations) {
            // Créer le panneau destinations sans le header
            const destinationsPanel = this.createDestinationsPanel();
            container.appendChild(destinationsPanel);
            
            // Charger les destinations
            window.Destinations.loadDestinations();
        }
    },
    
    /**
     * Charger le contenu de la synthèse
     */
    loadSyntheseContent() {
        const container = document.getElementById('sidebar-synthese-content');
        if (!container) return;
        
        // Vider le conteneur
        container.innerHTML = '';
        
        // Intégrer le composant Synthèse
        if (window.Synthese) {
            window.Synthese.render(container);
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
     * Créer le panneau destinations sans le header
     */
    createDestinationsPanel() {
        const panel = document.createElement('div');
        panel.className = 'destinations-panel';
        panel.id = 'destinationsPanel';
        
        // Créer la liste des destinations
        const list = document.createElement('div');
        list.className = 'destinations-list';
        panel.appendChild(list);
        
        return panel;
    },
    
    /**
     * Mettre à jour le nom de l'itinéraire
     */
    updateItineraryName() {
        const nameElement = document.getElementById('sidebar-itinerary-name');
        if (nameElement && window.firebaseService) {
            const currentItinerary = window.firebaseService.getCurrentItinerary();
            const itineraryName = currentItinerary?.name || 'Mon Itinéraire';
            nameElement.textContent = this.escapeHtml(itineraryName);
        }
    },
    
    /**
     * Méthodes du header
     */
    showMoreOptions() {
        // TODO: Implémenter le menu "plus d'options"
        console.log('Sidebar: showMoreOptions appelé');
        showInfoSnackBar('Options supplémentaires bientôt disponibles');
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
    
    /**
     * Échapper les caractères HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Exporter globalement
window.Sidebar = Sidebar;
