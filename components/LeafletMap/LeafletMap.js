/**
 * Composant LeafletMap - Gère l'affichage et les interactions de la carte Leaflet
 */
class LeafletMap {
    constructor() {
        this.leafletMap = null;
        this.currentLayer = null;
        this.destinationMarkers = [];
        this.arrowDecorators = [];
        this.mapStyles = {
            maptiler: L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YSAwtO41576Mnmte3DQN', {
                attribution: '© MapTiler © OpenStreetMap contributors'
            }),
            osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }),
            humanitarian: L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team'
            }),
            dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© CartoDB'
            }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri'
            }),
            terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenTopoMap'
            }),
            relief: L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png', {
                attribution: '© Stamen Design, © Stadia Maps, © OpenStreetMap contributors'
            }),
            watercolor: L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg', {
                attribution: '© Stamen Design, © Stadia Maps, © OpenStreetMap contributors'
            })
        };
    }

    /**
     * Initialiser la carte
     */
    init() {
        console.log('🗺️ Initialisation de la carte...');
        
        // Initialisation de la carte
        this.leafletMap = L.map('map', {
            center: [20, 0],
            zoom: 2,
            minZoom: 2,
            maxZoom: 18,
            worldCopyJump: false,
            continuousWorld: true,
            zoomControl: false,
            maxBounds: [[-85, -Infinity], [85, Infinity]],
            maxBoundsViscosity: 0.0,
            inertia: true,
            bounceAtZoomLimits: false
        });

        // Style par défaut
        this.currentLayer = this.mapStyles.maptiler;
        this.currentLayer.addTo(this.leafletMap);

        // Ajouter les contrôles de zoom
        L.control.zoom({
            position: 'bottomleft'
        }).addTo(this.leafletMap);

        // Ajouter les écouteurs d'événements
        this.setupEventListeners();

        // Support tactile pour mobile
        this.setupTouchSupport();

        console.log('✅ Carte initialisée avec succès');
    }

    /**
     * Configurer les écouteurs d'événements
     */
    setupEventListeners() {
        // Écouteur pour le zoom
        this.leafletMap.on('zoomend', () => {
            this.updateArrowsOnZoom();
            this.controlZoom();
        });

        // Écouteurs pour le drag
        this.leafletMap.on('dragend', () => {
            this.handleDragEnd();
        });

        this.leafletMap.on('drag', () => {
            this.handleDrag();
        });

        console.log('🎧 Écouteurs d\'événements configurés');
    }

    /**
     * Configurer le support tactile
     */
    setupTouchSupport() {
        if ('ontouchstart' in window) {
            this.leafletMap.dragging.enable();
            this.leafletMap.touchZoom.enable();
            this.leafletMap.doubleClickZoom.enable();
            this.leafletMap.scrollWheelZoom.enable();
        }
    }

    /**
     * Calculer les patterns de fl
     */
    calculateArrowPatterns(fromCoords, toCoords, zoomLevel) {
        const point1 = this.leafletMap.latLngToContainerPoint(fromCoords);
        const point2 = this.leafletMap.latLngToContainerPoint(toCoords);
        const pixelDistance = Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
        );
        
        const maxArrows = Math.max(1, Math.min(Math.floor(zoomLevel), 8));
        
        if (pixelDistance < 200) {
            return [{
                offset: '50%',
                repeat: 0,
                symbol: L.Symbol.arrowHead({
                    pixelSize: 16,
                    polygon: true,
                    pathOptions: {
                        stroke: false,
                        fill: true,
                        fillColor: 'var(--primary-blue)',
                        fillOpacity: 0.6
                    }
                })
            }];
        } else {
            const patterns = [];
            const segmentCount = Math.min(Math.floor(pixelDistance / 100), maxArrows);
            
            for (let i = 0; i < segmentCount; i++) {
                const percentageOffset = ((i + 1) / (segmentCount + 1)) * 100;
                
                patterns.push({
                    offset: percentageOffset + '%',
                    repeat: 0,
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 16,
                        polygon: true,
                        pathOptions: {
                            stroke: false,
                            fill: true,
                            fillColor: 'var(--primary-blue)',
                            fillOpacity: 0.6
                        }
                    })
                });
            }
            
            return patterns;
        }
    }

    /**
     * Cr
     */
    createArrowsOnLine(line, fromCoords, toCoords, zoomLevel) {
        const patterns = this.calculateArrowPatterns(fromCoords, toCoords, zoomLevel);
        const arrowDecorator = L.polylineDecorator(line, {
            patterns: patterns,
            map: this.leafletMap
        }).addTo(this.leafletMap);
        
        return arrowDecorator;
    }

    /**
     * Mettre 
     */
    updateArrowsOnZoom() {
        // Effacer les d
        this.arrowDecorators.forEach(decorator => this.leafletMap.removeLayer(decorator));
        this.arrowDecorators = [];
        
        // Recr
        this.destinationMarkers.forEach(marker => {
            if (marker instanceof L.Polyline) {
                const fromCoords = marker.getLatLngs()[0];
                const toCoords = marker.getLatLngs()[1];
                const arrowDecorator = this.createArrowsOnLine(marker, fromCoords, toCoords, this.leafletMap.getZoom());
                this.arrowDecorators.push(arrowDecorator);
            }
        });
    }

    /**
     * Contr
     */
    controlZoom() {
        const zoom = this.leafletMap.getZoom();
        if (zoom < 2) this.leafletMap.setZoom(2);
        if (zoom > 18) this.leafletMap.setZoom(18);
    }

    /**
     * G
     */
    handleDragEnd() {
        const center = this.leafletMap.getCenter();
        const zoom = this.leafletMap.getZoom();
        const bounds = this.getScreenBounds();
        
        if (center.lat < bounds.south) center.lat = bounds.south;
        if (center.lat > bounds.north) center.lat = bounds.north;
        
        this.leafletMap.setView([center.lat, center.lng], zoom, { animate: false });
    }

    /**
     * G
     */
    handleDrag() {
        const center = this.leafletMap.getCenter();
        const bounds = this.getScreenBounds();
        
        if (center.lat < bounds.south || center.lat > bounds.north) {
            const correctedLat = Math.max(bounds.south, Math.min(bounds.north, center.lat));
            this.leafletMap.setView([correctedLat, center.lng], this.leafletMap.getZoom(), { animate: false });
        }
    }

    /**
     * Calculer les limites 
     */
    getScreenBounds() {
        const bounds = this.leafletMap.getBounds();
        const screenLatRange = bounds.getNorth() - bounds.getSouth();
        const centerLat = this.leafletMap.getCenter().lat;
        
        const maxNorth = centerLat + (screenLatRange / 2);
        const maxSouth = centerLat - (screenLatRange / 2);
        
        return {
            north: Math.min(maxNorth, 85),
            south: Math.max(maxSouth, -85)
        };
    }

    /**
     * Nettoyer la carte
     */
    cleanMap() {
        console.log('🧹 Nettoyage complet de la carte');
        
        if (this.leafletMap && typeof this.leafletMap === 'object') {
            const layersToRemove = [];
            this.leafletMap.eachLayer((layer) => {
                const isTileLayer = layer._tile || layer._url || layer._html;
                const isGridLayer = layer._cells || layer._s;
                
                if (!isTileLayer && !isGridLayer) {
                    layersToRemove.push(layer);
                }
            });
            
            layersToRemove.forEach((layer) => {
                this.leafletMap.removeLayer(layer);
            });
            
            this.destinationMarkers = [];
            this.arrowDecorators = [];
            
            console.log(`✅ ${layersToRemove.length} layers supprimés universellement`);
        } else {
            console.warn('⚠️ leafletMap est null ou non initialisé, impossible de nettoyer la carte');
        }
    }

    /**
     * Afficher les destinations sur la carte
     */
    async displayDestinations() {
        console.log('🗺️ Affichage des destinations sur la carte');
        
        
        this.cleanMap();

        // Attendre un peu pour s'assurer que les données sont synchronisées
        await new Promise(resolve => setTimeout(resolve, 100));

        let destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        console.log('🔍 Destinations récupérées:', destinations.length, destinations);
        
        if (destinations.length > 0) {
            const sortedDestinations = destinations.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            const validDestinations = sortedDestinations.filter(destination => 
                typeof destination === 'object' && 
                destination.address && 
                destination.address.location && 
                destination.address.location.lat && 
                destination.address.location.lng
            );
            
            console.log('🔍 Destinations valides avec coordonnées:', validDestinations.length, validDestinations);
            
            // Créer les traits directionnels
            for (let i = 0; i < validDestinations.length - 1; i++) {
                const fromDest = validDestinations[i];
                const toDest = validDestinations[i + 1];
                
                const fromCoords = [fromDest.address.location.lat, fromDest.address.location.lng];
                const toCoords = [toDest.address.location.lat, toDest.address.location.lng];
                
                const line = L.polyline([fromCoords, toCoords], {
                    color: 'var(--primary-blue)',
                    weight: 3,
                    opacity: 0.8,
                    dashArray: '10, 5'
                }).addTo(this.leafletMap);
                
                const arrowDecorator = this.createArrowsOnLine(line, fromCoords, toCoords, this.leafletMap.getZoom());
                
                this.destinationMarkers.push(line);
                this.destinationMarkers.push(arrowDecorator);
                this.arrowDecorators.push(arrowDecorator);
            }
            
            // Créer les marqueurs
            validDestinations.forEach((destination, index) => {
                // Utiliser la méthode de Destinations.js pour créer la card complète avec boutons
                const popupContent = window.Destinations.createDestinationReadCard(destination, index);
                
                const marker = L.marker([destination.address.location.lat, destination.address.location.lng])
                    .addTo(this.leafletMap)
                    .bindPopup(popupContent)
                    .on('click', () => {
                        // Scroll vers la destination si le panneau est déjà ouvert
                        if (window.Destinations && window.Destinations.isVisible) {
                            window.Destinations.scrollToDestination(index);
                        }
                    });
                
                this.destinationMarkers.push(marker);
            });
            
            console.log(`✅ ${this.destinationMarkers.length} marqueur(s) et trait(s) affiché(s)`);
            
            // Ajuster la vue
            const group = new L.featureGroup(this.destinationMarkers);
            this.leafletMap.fitBounds(group.getBounds().pad(0.1));
        } else {
            console.log('❌ Aucune destination à afficher');
            // Revenir à la vue initiale de la carte
            this.leafletMap.setView([20, 0], 2, { animate: true });
        }
    }

    /**
     * Changer le style de la carte
     */
    changeMapStyle(style) {
        if (this.mapStyles[style]) {
            // Écouter les erreurs de chargement de tiles
            const errorHandler = (error) => {
                console.error(`❌ Erreur de chargement pour le style ${style}:`, error);
                
                // Afficher un message d'erreur
                if (window.showErrorSnackBar) {
                    showErrorSnackBar(`Erreur de chargement pour ${this.getStyleDisplayName(style)}. Retour au style par défaut.`);
                }
                
                // Revenir au style par défaut (MapTiler)
                this.fallbackToDefaultStyle();
            };
            
            // Ajouter l'écouteur d'erreurs sur le nouveau layer
            this.mapStyles[style].on('tileerror', errorHandler);
            
            // Changer le layer
            this.leafletMap.removeLayer(this.currentLayer);
            this.currentLayer = this.mapStyles[style];
            this.currentLayer.addTo(this.leafletMap);
            
            // Afficher le message de succès
            if (window.showSuccessSnackBar) {
                showSuccessSnackBar(`Style de carte changé vers ${this.getStyleDisplayName(style)}`);
            }
            
            console.log(`🎨 Style de carte changé vers: ${style}`);
            
            // Nettoyer l'écouteur après un certain temps pour éviter les fuites mémoire
            setTimeout(() => {
                this.mapStyles[style].off('tileerror', errorHandler);
            }, 10000); // 10 secondes
        }
    }
    
    /**
     * Revenir au style par défaut en cas d'erreur
     */
    fallbackToDefaultStyle() {
        if (this.currentLayer) {
            this.leafletMap.removeLayer(this.currentLayer);
        }
        
        this.currentLayer = this.mapStyles.maptiler;
        this.currentLayer.addTo(this.leafletMap);
        
        console.log('🔄 Retour au style par défaut (MapTiler)');
        
        // Mettre à jour les settings si la modal est ouverte
        if (window.Settings && window.Settings.isOpen) {
            const defaultRadio = document.querySelector('input[name="mapStyle"][value="maptiler"]');
            if (defaultRadio) {
                defaultRadio.checked = true;
            }
        }
    }
    
    /**
     * Obtenir le nom d'affichage du style (utilisé pour les messages)
     */
    getStyleDisplayName(styleName) {
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
    }

    /**
     * Afficher la carte
     */
    show() {
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.display = 'block';
        }
    }

    /**
     * Masquer la carte
     */
    hide() {
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.display = 'none';
        }
    }

    /**
     * Obtenir l'instance de la carte
     */
    getMap() {
        return this.leafletMap;
    }

    /**
     * Exporter pour compatibilite
     */
    exportForLegacy() {
        window.map = this.leafletMap;
        window.destinationMarkers = this.destinationMarkers;
        window.arrowDecorators = this.arrowDecorators;
        window.cleanMap = () => this.cleanMap();
        window.changeMapStyle = (style) => this.changeMapStyle(style);
    }
}

// La classe est disponible globalement via window.LeafletMap
window.LeafletMap = LeafletMap;
