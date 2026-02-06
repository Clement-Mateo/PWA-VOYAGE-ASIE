const Settings = {

    isOpen: false,

    

    /**

     * Initialiser le composant Settings

     */

    init() {

        this.createModal();

    },

    

    /**

     * Créer la modal Settings

     */

    createModal() {

        // Vérifier si la modal existe déjà

        if (document.getElementById('settingsModal')) {

            return;

        }

        

        const modal = document.createElement('div');

        modal.id = 'settingsModal';

        modal.className = 'modal';

        modal.innerHTML = `

            <div class="modal-backdrop" onclick="Settings.close()"></div>

            <div class="modal-content">

                <div class="modal-header">

                    <h2 class="modal-title">

                        <span class="material-icons">settings</span>

                        Paramètres

                    </h2>

                    <button class="btn-close" onclick="Settings.close()" title="Fermer">

                        <span class="material-icons">close</span>

                    </button>

                </div>

                

                <div class="modal-body">

                    <!-- Section Style de carte -->

                    <div class="modal-section">

                        <h3 class="modal-section-title">

                            <span class="material-icons">map</span>

                            Style de carte

                        </h3>

                        <div class="settings-map-styles">

                            <div class="map-style-option" data-style="maptiler">

                                <input type="radio" id="style-maptiler" name="mapStyle" value="maptiler" checked>

                                <label for="style-maptiler">

                                    <span class="map-style-preview maptiler-preview"></span>

                                    <span class="map-style-name">MapTiler Streets</span>

                                </label>

                            </div>

                            <div class="map-style-option" data-style="osm">

                                <input type="radio" id="style-osm" name="mapStyle" value="osm">

                                <label for="style-osm">

                                    <span class="map-style-preview osm-preview"></span>

                                    <span class="map-style-name">OpenStreetMap</span>

                                </label>

                            </div>

                            <div class="map-style-option" data-style="humanitarian">

                                <input type="radio" id="style-humanitarian" name="mapStyle" value="humanitarian">

                                <label for="style-humanitarian">

                                    <span class="map-style-preview humanitarian-preview"></span>

                                    <span class="map-style-name">Humanitarian</span>

                                </label>

                            </div>

                            <div class="map-style-option" data-style="dark">

                                <input type="radio" id="style-dark" name="mapStyle" value="dark">

                                <label for="style-dark">

                                    <span class="map-style-preview dark-preview"></span>

                                    <span class="map-style-name">Dark</span>

                                </label>

                            </div>

                            <div class="map-style-option" data-style="satellite">

                                <input type="radio" id="style-satellite" name="mapStyle" value="satellite">

                                <label for="style-satellite">

                                    <span class="map-style-preview satellite-preview"></span>

                                    <span class="map-style-name">Satellite</span>

                                </label>

                            </div>

                            <div class="map-style-option" data-style="terrain">

                                <input type="radio" id="style-terrain" name="mapStyle" value="terrain">

                                <label for="style-terrain">

                                    <span class="map-style-preview terrain-preview"></span>

                                    <span class="map-style-name">Topo</span>

                                </label>

                            </div>

                            <div class="map-style-option" data-style="relief">

                                <input type="radio" id="style-relief" name="mapStyle" value="relief">

                                <label for="style-relief">

                                    <span class="map-style-preview relief-preview"></span>

                                    <span class="map-style-name">Relief</span>

                                </label>

                            </div>

                            <div class="map-style-option" data-style="watercolor">

                                <input type="radio" id="style-watercolor" name="mapStyle" value="watercolor">

                                <label for="style-watercolor">

                                    <span class="map-style-preview watercolor-preview"></span>

                                    <span class="map-style-name">Aquarelle</span>

                                </label>

                            </div>

                        </div>

                        

                        <!-- Message d'avertissement -->

                        <div class="settings-warning">

                            <span class="material-icons warning-icon">warning</span>

                            <div class="warning-text">

                                <strong>Performance :</strong> Certaines cartes peuvent être plus lentes ou occasionnellement indisponibles selon la charge des serveurs.

                            </div>

                        </div>

                    </div>

                    

                    <!-- Section Utilisateur -->

                    <div class="modal-section">

                        <h3 class="modal-section-title">

                            <span class="material-icons">account_circle</span>

                            Informations utilisateur

                        </h3>

                        <div class="user-info">

                            <div class="user-avatar">

                                <span class="material-icons">person</span>

                            </div>

                            <div class="user-details">

                                <div class="user-email" id="settingsUserEmail">Chargement...</div>

                                <div class="user-status" id="settingsUserStatus">Connecté</div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        `;

        

        document.body.appendChild(modal);

        

        // Initialiser les écouteurs d'événements

        this.initEventListeners();

    },

    

    /**

     * Initialiser les écouteurs d'événements

     */

    initEventListeners() {

        // Écouteurs pour les styles de carte

        document.querySelectorAll('input[name="mapStyle"]').forEach(radio => {

            radio.addEventListener('change', (e) => {

                this.changeMapStyle(e.target.value);

            });

        });

        

        // Écouteur pour la touche Échap

        document.addEventListener('keydown', (e) => {

            if (e.key === 'Escape' && this.isOpen) {

                this.close();

            }

        });

    },

    

    /**

     * Ouvrir la modal Settings

     */

    open() {

        this.isOpen = true;

        const modal = document.getElementById('settingsModal');

        if (modal) {

            modal.classList.add('open');

            this.loadUserInfo();

            this.loadCurrentMapStyle();

        }

    },

    

    /**

     * Fermer la modal Settings

     */

    close() {

        this.isOpen = false;

        const modal = document.getElementById('settingsModal');

        if (modal) {

            modal.classList.remove('open');

        }

    },

    

    /**

     * Charger les informations utilisateur

     */

    loadUserInfo() {

        if (window.firebaseService && window.firebaseService.isAuthenticated()) {

            const user = window.firebaseService.auth.currentUser;

            if (user) {

                const emailElement = document.getElementById('settingsUserEmail');

                if (emailElement) {

                    emailElement.textContent = user.email;

                }

            }

        }

    },

    

    /**

     * Charger le style de carte actuel

     */

    loadCurrentMapStyle() {

        if (window.MapInstance && window.MapInstance.currentLayer) {

            const currentStyle = this.getCurrentMapStyle();

            const radio = document.querySelector(`input[name="mapStyle"][value="${currentStyle}"]`);

            if (radio) {

                radio.checked = true;

            }

        }

    },

    

    /**

     * Obtenir le style de carte actuel

     */

    getCurrentMapStyle() {

        if (!window.MapInstance || !window.MapInstance.currentLayer) {

            return 'osm';

        }

        

        const currentLayer = window.MapInstance.currentLayer;

        const mapStyles = window.MapInstance.mapStyles;

        

        for (const [styleName, layer] of Object.entries(mapStyles)) {

            if (layer === currentLayer) {

                return styleName;

            }

        }

        

        return 'osm';

    },

    

    /**

     * Changer le style de carte

     */

    changeMapStyle(styleName) {

        if (window.MapInstance && window.MapInstance.changeMapStyle) {

            window.MapInstance.changeMapStyle(styleName);

            // Le message de succès est maintenant géré par LeafletMap

        }

    },

    

    /**

     * Obtenir le nom d'affichage du style

     */

    getStyleDisplayName(styleName) {

        // Utiliser la méthode de LeafletMap pour éviter la duplication

        if (window.MapInstance && window.MapInstance.getStyleDisplayName) {

            return window.MapInstance.getStyleDisplayName(styleName);

        }

        

        // Fallback si LeafletMap n'est pas disponible

        const names = {

            'maptiler': 'MapTiler Streets',

            'osm': 'OpenStreetMap',

            'humanitarian': 'Humanitarian',

            'dark': 'Dark',

            'satellite': 'Satellite',

            'terrain': 'Topo',

            'relief': 'Relief',

            'watercolor': 'Aquarelle'

        };

        return names[styleName] || styleName;

    },

    

    /**

     * Gérer la déconnexion

     */

    handleLogout() {

        console.log('Settings: Déconnexion demandée');

        this.close();

        

        if (window.handleLogout) {

            window.handleLogout();

        }

    }

};



// Exporter globalement

window.Settings = Settings;

