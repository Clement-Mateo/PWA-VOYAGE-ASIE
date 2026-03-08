/**
 * Composant Synthèse - Module Pattern
 * Gère la vue globale de l'itinéraire
 */

const Synthèse = {
    // Cache pour les données fréquemment utilisées
    _cache: {
        destinations: null,
        lastFetch: null,
        cacheTimeout: 5000 // 5 secondes
    },

    // État pour suivre les onglets déjà initialisés
    _initializedTabs: new Set(),

    /**
     * Initialiser le composant Synthèse
     */
    init() {
        // Initialisation du composant
    },

    /**
     * Récupérer les destinations avec cache
     */
    async getDestinations() {
        const now = Date.now();
        
        // Vérifier si le cache est valide
        if (this._cache.destinations && 
            this._cache.lastFetch && 
            (now - this._cache.lastFetch) < this._cache.cacheTimeout) {
            return this._cache.destinations;
        }
        
        // Récupérer et mettre en cache
        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        this._cache.destinations = destinations;
        this._cache.lastFetch = now;
        
        return destinations;
    },

    /**
     * Vider le cache (utile après modification des données)
     */
    clearCache() {
        this._cache.destinations = null;
        this._cache.lastFetch = null;
        this._initializedTabs.clear(); // Réinitialiser aussi les onglets
    },
    
    /**
     * Valider les données d'une destination
     */
    validateDestination(destination) {
        if (!destination) return false;
        
        // Vérifier les champs essentiels
        if (!destination.name || typeof destination.name !== 'string') return false;
        
        // Valider la durée si présente
        if (destination.duration) {
            const duration = this.convertDurationToMinutes(destination.duration);
            if (isNaN(duration) || duration < 0) return false;
        }
        
        return true;
    },

    /**
     * Valider les données d'une activité
     */
    validateActivity(activity) {
        if (!activity) return false;
        
        // Vérifier les champs essentiels
        if (!activity.name || typeof activity.name !== 'string') return false;
        
        // Valider le prix si présent
        if (activity.price !== undefined && activity.price !== null) {
            const price = parseFloat(activity.price);
            if (isNaN(price) || price < 0) return false;
        }
        
        return true;
    },

    /**
     * Valider les données de transport
     */
    validateTransport(transport) {
        if (!transport) return false;
        
        // Vérifier le type
        if (!transport.type || typeof transport.type !== 'string') return false;
        
        // Valider le coût si présent
        if (transport.cost !== undefined && transport.cost !== null) {
            const cost = parseFloat(transport.cost);
            if (isNaN(cost) || cost < 0) return false;
        }
        
        return true;
    },

    /**
     * Calculer la durée totale de l'itinéraire (destinations + transports)
     */
    async calculateTotalDuration() {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await this.getDestinations() : [];
        let totalMinutes = 0;
        
        // Ajouter les durées des destinations
        destinations.forEach(destination => {
            if (!this.validateDestination(destination)) {
                console.warn('Destination invalide ignorée:', destination);
                return;
            }
            
            if (destination.duration) {
                const destMinutes = this.convertDurationToMinutes(destination.duration);
                if (!isNaN(destMinutes) && destMinutes > 0) {
                    totalMinutes += destMinutes;
                }
            }
            
            // Ajouter les durées de transport (sauf pour la première destination)
            if (destination.order > 0 && destination.transportation) {
                if (this.validateTransport(destination.transportation)) {
                    const transportMinutes = this.convertDurationToMinutes(destination.transportation.duration);
                    if (!isNaN(transportMinutes) && transportMinutes > 0) {
                        totalMinutes += transportMinutes;
                    }
                }
            }
        });
        
        const days = Math.floor(totalMinutes / (24 * 60));
        const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
        const minutes = totalMinutes % 60;
        
        return { days, hours, minutes, totalMinutes };
    },
    
    /**
     * Convertir une durée en minutes (supporte plusieurs formats)
     */
    convertDurationToMinutes(duration) {
        if (!duration) return 0;
        
        // Format objet {days, hours, minutes}
        if (typeof duration === 'object' && duration !== null) {
            return (duration.days || 0) * 24 * 60 +
                   (duration.hours || 0) * 60 +
                   (duration.minutes || 0);
        }
        
        // Format chaîne "Xh Ymin" ou "XhYmin" - utiliser window.parseDuration si disponible
        if (typeof duration === 'string') {
            if (window.parseDuration) {
                const parsed = window.parseDuration(duration);
                return parsed ? (parsed.hours || 0) * 60 + (parsed.minutes || 0) : 0;
            } else {
                // Fallback manuel si window.parseDuration n'existe pas
                const hoursMatch = duration.match(/(\d+)h/);
                const minutesMatch = duration.match(/(\d+)min/);
                
                const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
                const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
                
                return hours * 60 + minutes;
            }
        }
        
        return 0;
    },
    
    /**
     * Formater un coût en euros
     */
    formatCost(cost) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(cost);
    },
    
    /**
     * Calculer le coût total des activités
     */
    async calculateActivitiesTotalCost() {
        const destinations = await this.getDestinations();
        let totalCost = 0;
        
        for (const destination of destinations) {
            if (destination.id) {
                const activities = await window.localStorageService.getActivities(destination.id);
                for (const activity of activities) {
                    if (activity.price) {
                        totalCost += parseFloat(activity.price) || 0;
                    }
                }
            }
        }
        
        return totalCost;
    },
    
    /**
     * Calculer la durée d'une activité à partir de startTime et endTime
     */
    calculateActivityDuration(activity) {
        let activityDuration = 0;
        if (activity.startTime && activity.endTime) {
            const start = this.parseTime(activity.startTime);
            const end = this.parseTime(activity.endTime);
            
            if (start !== null && end !== null) {
                let durationMinutes = end - start;
                
                // Gérer le cas où l'heure de fin est le jour suivant (ex: 22:00 -> 01:00)
                if (durationMinutes < 0) {
                    durationMinutes += 24 * 60; // Ajouter 24h
                }
                
                activityDuration = durationMinutes;
            }
        }
        return activityDuration;
    },
    
    /**
     * Convertir une heure au format "HH:MM" en minutes
     */
    parseTime(timeString) {
        if (!timeString) return null;
        
        const parts = timeString.split(':');
        if (parts.length !== 2) return null;
        
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        
        if (isNaN(hours) || isNaN(minutes)) return null;
        
        return hours * 60 + minutes;
    },
    
    /**
     * Calculer la distance totale du voyage
     */
    async calculateTotalDistance() {
        const destinations = await this.getDestinations();
        let totalDistance = 0;
        
        for (let i = 0; i < destinations.length - 1; i++) {
            const current = destinations[i];
            const next = destinations[i + 1];
            
            if (current.address?.location && next.address?.location) {
                const distance = this.calculateDistance(
                    current.address.location.lat,
                    current.address.location.lng,
                    next.address.location.lat,
                    next.address.location.lng
                );
                totalDistance += distance;
            }
        }
        
        return totalDistance;
    },
    
    /**
     * Calculer la distance entre deux points (formule de Haversine)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Rayon de la Terre en km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },
    
    /**
     * Convertir degrés en radians
     */
    toRad(deg) {
        return deg * (Math.PI/180);
    },
    
    /**
     * Obtenir une couleur consistante pour un type d'activité
     */
    getActivityTypeColor(type, index) {
        const typeColorMap = {
            'culture': '#FF6384',
            'gastronomie': '#36A2EB',
            'nature': '#27AE60',
            'sport': '#FFCE56',
            'shopping': '#9966FF',
            'hebergement': '#4BC0C0',
            'autre': '#95A5A6'
        };
        
        const normalizedType = (type || '').toLowerCase().trim();
        
        if (typeColorMap[normalizedType]) {
            return typeColorMap[normalizedType];
        }
        
        const fallbackColors = ['#E74C3C', '#34495E', '#16A085', '#F39C12'];
        return fallbackColors[index % fallbackColors.length];
    },
    
    /**
     * Obtenir une couleur consistante pour un type de transport
     */
    getTransportTypeColor(type, index) {
        const transportColorMap = {
            'avion': '#FF6384',
            'train': '#36A2EB',
            'voiture': '#27AE60',
            'bus': '#FFCE56',
            'bateau': '#9966FF',
            'métro': '#4BC0C0',
            'taxi': '#E74C3C',
            'vélo': '#95A5A6',
            'non spécifié': '#BDC3C7'
        };
        
        const normalizedType = (type || '').toLowerCase().trim();
        
        if (transportColorMap[normalizedType]) {
            return transportColorMap[normalizedType];
        }
        
        const fallbackColors = ['#E67E22', '#34495E', '#16A085', '#F39C12', '#D35400', '#2C3E50'];
        return fallbackColors[index % fallbackColors.length];
    },
    
    /**
     * Créer le contenu HTML de l'onglet Itinéraire
     */
    async createItinerarySynthese() {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        if (!currentItinerary) {
            return '<p>Aucun itinéraire sélectionné</p>';
        }

        const destinations = await this.getDestinations();
        const duration = await this.calculateTotalDuration();
        const totalDistance = await this.calculateTotalDistance();
        const activitiesTime = await this.calculateActivitiesTime();
        const activitiesCost = await this.calculateActivitiesTotalCost();
        
        // Calculer date de fin (dernière date de départ)
        let endDate = currentItinerary.startDate;
        if (destinations.length > 0) {
            const lastDestination = destinations[destinations.length - 1];
            if (lastDestination.departureDate) {
                endDate = lastDestination.departureDate;
            }
        }
        
        // Utiliser les services existants avec fallbacks
        const formatDuration = (duration) => {
            if (window.formatDuration) {
                return window.formatDuration(duration, true);
            } else {
                // Fallback manuel
                if (!duration) return '0h';
                const days = duration.days || 0;
                const hours = duration.hours || 0;
                const minutes = duration.minutes || 0;
                
                if (days > 0) {
                    return `${days}j ${hours}h${minutes > 0 ? minutes + 'min' : ''}`;
                } else if (hours > 0) {
                    return `${hours}h${minutes > 0 ? minutes + 'min' : ''}`;
                } else {
                    return `${minutes}min`;
                }
            }
        };
        
        const formatDate = (dateString) => {
            if (window.DateService && window.DateService.formatDateForDisplay) {
                return window.DateService.formatDateForDisplay(dateString);
            } else {
                // Fallback manuel
                if (!dateString) return 'Date inconnue';
                try {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                    });
                } catch (error) {
                    return dateString;
                }
            }
        };
        
        return `
            <div class="itinerary-synthese">
                <!-- Première ligne : 3 cartes -->
                <div class="stats-row">
                    <div class="stat-card">
                        <div class="card-icon">
                            <span class="material-icons">flight_takeoff</span>
                        </div>
                        <div class="card-content">
                            <div class="card-title">Date de Début</div>
                            <div class="card-value">${formatDate(currentItinerary.startDate)}</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="card-icon">
                            <span class="material-icons">flight_land</span>
                        </div>
                        <div class="card-content">
                            <div class="card-title">Date de Fin</div>
                            <div class="card-value">${formatDate(endDate)}</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="card-icon">
                            <span class="material-icons">schedule</span>
                        </div>
                        <div class="card-content">
                            <div class="card-title">Durée Total</div>
                            <div class="card-value">${formatDuration(duration)}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Deuxième ligne : 2 cartes larges -->
                <div class="stats-row wide">
                    <div class="stat-card">
                        <div class="card-icon">
                            <span class="material-icons">straighten</span>
                        </div>
                        <div class="card-content">
                            <div class="card-title">Distance Total</div>
                            <div class="card-value">${totalDistance.toFixed(0)} km</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="card-icon">
                            <span class="material-icons">euro</span>
                        </div>
                        <div class="card-content">
                            <div class="card-title">Coût Total</div>
                            <div class="card-value">${this.formatCost(activitiesCost)}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Troisième ligne : 2 cartes -->
                <div class="stats-row">
                    <div class="stat-card">
                        <div class="card-icon">
                            <span class="material-icons">event</span>
                        </div>
                        <div class="card-content">
                            <div class="card-title">Temps total des Activités</div>
                            <div class="card-value">${activitiesTime.hours}h${activitiesTime.minutes > 0 ? activitiesTime.minutes : ''}</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="card-icon">
                            <span class="material-icons">euro</span>
                        </div>
                        <div class="card-content">
                            <div class="card-title">Coût total des Activités</div>
                            <div class="card-value">${this.formatCost(activitiesCost)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Créer le contenu HTML de l'onglet Destinations
     */
    async createDestinationSynthese() {
        const destinations = await this.getDestinations();
        
        // Calculer les statistiques pour toutes les destinations
        let totalDuration = 0;
        let totalCost = 0;
        let destinationStats = [];
        
        for (const destination of destinations) {
            let destDuration = 0;
            let destCost = 0;
            let accommodationCost = 0;
            let activityCost = 0;
            let transportCost = 0;
            let accommodationDuration = 0;
            let activityDuration = 0;
            let transportDuration = 0;
            
            // Durée de la destination
            if (destination.duration) {
                destDuration = this.convertDurationToMinutes(destination.duration);
                totalDuration += destDuration;
            }
            
            // Coût du transport
            if (destination.transportation && destination.transportation.cost) {
                transportCost = destination.transportation.cost;
                destCost += transportCost;
                totalCost += transportCost;
            }
            
            // Durée du transport
            if (destination.transportation && destination.transportation.duration) {
                transportDuration = this.convertDurationToMinutes(destination.transportation.duration);
                destDuration += transportDuration;
                totalDuration += transportDuration;
            }
            
            // Activités de la destination
            if (destination.id) {
                const activities = await window.localStorageService.getActivities(destination.id);
                for (const activity of activities) {
                    // Coût de l'activité
                    const activityPrice = parseFloat(activity.price) || 0;
                    activityCost += activityPrice;
                    destCost += activityPrice;
                    totalCost += activityPrice;
                    
                    // Durée de l'activité
                    const activityDur = this.calculateActivityDuration(activity);
                    activityDuration += activityDur;
                    destDuration += activityDur;
                    totalDuration += activityDur;
                }
            }
            
            // Coût et durée de l'hébergement (pas de données disponibles = 0)
            accommodationDuration = Math.max(0, destDuration - activityDuration - transportDuration);
            accommodationCost = 0; // Pas de coût de logement renseigné
            destCost += accommodationCost;
            totalCost += accommodationCost;
            
            destinationStats.push({
                name: destination.name,
                duration: destDuration,
                cost: destCost,
                accommodationDuration,
                activityDuration,
                transportDuration,
                accommodationCost,
                activityCost,
                transportCost
            });
        }
        
        const avgDuration = destinations.length > 0 ? totalDuration / destinations.length : 0;
        const avgCost = destinations.length > 0 ? totalCost / destinations.length : 0;
        
        return `
            <div class="destination-synthese">
                <!-- Section 1 : Durée par destination -->
                <div class="destination-section">
                    <div class="section-header">
                        <h3>Durée par destination</h3>
                        <div class="section-indicators">
                            <div class="value-card">
                                <h4>Durée Totale des Destination</h4>
                                <div>${Math.floor(totalDuration / 60)}H</div>
                            </div>
                            <div class="value-card">
                                <h4>Durée Moyenne des Destination</h4>
                                <div>${Math.floor(avgDuration / 60)}H</div>
                            </div>
                        </div>
                    </div>
                    <div class="charts-container">
                        <canvas id="duration-by-destination-chart"></canvas>
                    </div>
                </div>
                
                <!-- Section 2 : Coût par destination -->
                <div class="destination-section">
                    <div class="section-header">
                        <h3>Coût par destination</h3>
                        <div class="section-indicators">
                            <div class="value-card">
                                <h4>Coût Total</h4>
                                <div>${this.formatCost(totalCost)}</div>
                            </div>
                            <div class="value-card">
                                <h4>Coût Moyen</h4>
                                <div>${this.formatCost(avgCost)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="charts-container">
                        <canvas id="cost-by-destination-chart"></canvas>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Créer le contenu HTML de l'onglet Activités
     */
    async createActivitiesSynthese() {
        const destinations = await this.getDestinations();
        
        // Calculer les statistiques par type
        const statsByType = {};
        let totalDuration = 0;
        let totalCost = 0;
        
        for (const destination of destinations) {
            if (destination.id) {
                const activities = await window.localStorageService.getActivities(destination.id);
                
                activities.forEach(activity => {
                    const type = activity.type || 'Autre';
                    if (!statsByType[type]) {
                        statsByType[type] = {
                            count: 0,
                            totalDuration: 0,
                            totalCost: 0,
                            activities: []
                        };
                    }
                    
                    statsByType[type].count++;
                    statsByType[type].activities.push(activity);
                    
                    const cost = activity.price || 0;
                    statsByType[type].totalCost += cost;
                    totalCost += cost;
                    
                    const activityDuration = this.calculateActivityDuration(activity);
                    statsByType[type].totalDuration += activityDuration;
                    totalDuration += activityDuration;
                });
            }
        }
        
        // Préparer les données pour les graphiques
        const chartData = Object.keys(statsByType).map(type => {
            const stats = statsByType[type];
            return {
                type,
                count: stats.count,
                duration: stats.totalDuration,
                cost: stats.totalCost,
                avgDuration: stats.count > 0 ? stats.totalDuration / stats.count : 0,
                avgCost: stats.count > 0 ? stats.totalCost / stats.count : 0,
                color: this.getActivityTypeColor(type, 0)
            };
        });
        
        return `
            <div class="activities-synthese">
                <!-- Première ligne : Répartitions -->
                <div class="stats-grid">
                    <div class="chart-card">
                        <h4>Répartition durée type</h4>
                        <div class="chart-container">
                            <canvas id="duration-distribution-chart" width="120" height="120"></canvas>
                            <div class="chart-legend">
                                ${chartData.map(item => `
                                    <div class="legend-item">
                                        <span class="legend-color" style="background-color: ${item.color}"></span>
                                        <span class="legend-label">${item.type}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="chart-card">
                        <h4>Répartition budget type</h4>
                        <div class="chart-container">
                            <canvas id="budget-distribution-chart" width="120" height="120"></canvas>
                            <div class="chart-legend">
                                ${chartData.map(item => `
                                    <div class="legend-item">
                                        <span class="legend-color" style="background-color: ${item.color}"></span>
                                        <span class="legend-label">${item.type}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Deuxième ligne : Totaux -->
                <div class="stats-grid">
                    <div class="value-card">
                        <h4>Durée totale activités</h4>
                        <div>${Math.floor(totalDuration / 60)}H</div>
                    </div>
                    
                    <div class="value-card">
                        <h4>Coût total activités</h4>
                        <div>${this.formatCost(totalCost)}</div>
                    </div>
                </div>
                
                <!-- Troisième ligne : Moyennes -->
                <div class="stats-grid">
                    <div class="chart-card">
                        <h4>Durée moyenne par type</h4>
                        <div class="chart-container">
                            <canvas id="avg-duration-chart" width="120" height="120"></canvas>
                            <div class="chart-legend">
                                ${chartData.map(item => `
                                    <div class="legend-item">
                                        <span class="legend-color" style="background-color: ${item.color}"></span>
                                        <span class="legend-label">${item.type}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="chart-card">
                        <h4>Coût moyen par type</h4>
                        <div class="chart-container">
                            <canvas id="avg-cost-chart" width="120" height="120"></canvas>
                            <div class="chart-legend">
                                ${chartData.map(item => `
                                    <div class="legend-item">
                                        <span class="legend-color" style="background-color: ${item.color}"></span>
                                        <span class="legend-label">${item.type}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Créer le contenu HTML de l'onglet Transport
     */
    async createTransportSynthese() {
        return `
            <div class="activities-synthese">
                <!-- Zone principale : Statistiques -->
                <div class="stats-area-full">
                    <!-- Première ligne : Répartitions -->
                    <div class="stats-grid">
                        <div class="chart-card">
                            <h4>Répartition durée par type</h4>
                            <div class="chart-container">
                                <canvas id="transport-duration-chart" width="120" height="120"></canvas>
                                <div class="chart-legend" id="transport-duration-legend">
                                    <!-- La légende sera générée dynamiquement -->
                                </div>
                            </div>
                        </div>
                        
                        <div class="chart-card">
                            <h4>Répartition coût par type</h4>
                            <div class="chart-container">
                                <canvas id="transport-cost-chart" width="120" height="120"></canvas>
                                <div class="chart-legend" id="transport-cost-legend">
                                    <!-- La légende sera générée dynamiquement -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Deuxième ligne : Totaux -->
                    <div class="stats-grid">
                        <div class="value-card">
                            <h4>Durée totale transports</h4>
                            <div id="transport-total-duration">-</div>
                        </div>
                        
                        <div class="value-card">
                            <h4>Coût total transports</h4>
                            <div id="transport-total-cost">-</div>
                        </div>
                    </div>
                    
                    <!-- Troisième ligne : Moyennes -->
                    <div class="stats-grid">
                        <div class="chart-card">
                            <h4>Durée moyenne par type</h4>
                            <div class="chart-container">
                                <canvas id="transport-avg-duration-chart" width="120" height="120"></canvas>
                                <div class="chart-legend" id="transport-avg-duration-legend">
                                    <!-- La légende sera générée dynamiquement -->
                                </div>
                            </div>
                        </div>
                        
                        <div class="chart-card">
                            <h4>Coût moyen par type</h4>
                            <div class="chart-container">
                                <canvas id="transport-avg-cost-chart" width="120" height="120"></canvas>
                                <div class="chart-legend" id="transport-avg-cost-legend">
                                    <!-- La légende sera générée dynamiquement -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quatrième ligne : Récapitulatif moyen -->
                    <div class="stats-grid">
                        <div class="value-card">
                            <h4>Durée moyenne transports</h4>
                            <div id="transport-avg-duration-total">-</div>
                        </div>
                        
                        <div class="value-card">
                            <h4>Coût moyen transports</h4>
                            <div id="transport-avg-cost-total">-</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Créer le nouveau contenu HTML de la synthèse avec 4 onglets
     */
    async createSyntheseContent() {
        const itineraryContent = await this.createItinerarySynthese();
        const destinationContent = await this.createDestinationSynthese();
        const activitiesContent = await this.createActivitiesSynthese();
        const transportContent = await this.createTransportSynthese();
        
        return `
            <div class="synthese-content">
                <div class="synthese-header">
                    <h2>Synthèse du voyage</h2>
                </div>
                
                <!-- Onglets -->
                <div class="synthese-tabs">
                    <div class="tab-header">
                        <button class="tab-button active" data-tab="itinerary">
                            <span class="material-icons">map</span>
                            Itinéraire
                        </button>
                        <button class="tab-button" data-tab="destinations">
                            <span class="material-icons">place</span>
                            Destinations
                        </button>
                        <button class="tab-button" data-tab="activities">
                            <span class="material-icons">event</span>
                            Activités
                        </button>
                        <button class="tab-button" data-tab="transport">
                            <span class="material-icons">directions_car</span>
                            Transports
                        </button>
                    </div>
                    
                    <!-- Contenu des onglets -->
                    <div class="tab-content">
                        <div class="tab-pane active" id="itinerary-tab">
                            ${itineraryContent || '<p>Chargement...</p>'}
                        </div>
                        <div class="tab-pane" id="destinations-tab">
                            ${destinationContent || '<p>Chargement...</p>'}
                        </div>
                        <div class="tab-pane" id="activities-tab">
                            ${activitiesContent || '<p>Chargement...</p>'}
                        </div>
                        <div class="tab-pane" id="transport-tab">
                            ${transportContent || '<p>Chargement...</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Initialiser les événements des onglets
     */
    initTabEvents() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Retirer la classe active de tous les boutons et panneaux
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Ajouter la classe active au bouton cliqué et au panneau correspondant
                button.classList.add('active');
                const targetPane = document.getElementById(`${targetTab}-tab`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
                
                // Initialiser les graphiques spécifiques à l'onglet cliqué (lazy loading)
                if (targetTab === 'transport') {
                    if (!this._initializedTabs.has('transport')) {
                        requestAnimationFrame(() => this.initTransportsCharts());
                        this._initializedTabs.add('transport');
                    }
                } else if (targetTab === 'activities') {
                    if (!this._initializedTabs.has('activities')) {
                        requestAnimationFrame(() => this.initActivitiesCharts());
                        this._initializedTabs.add('activities');
                    }
                } else if (targetTab === 'destinations') {
                    if (!this._initializedTabs.has('destinations')) {
                        requestAnimationFrame(() => this.initDestinationCharts());
                        this._initializedTabs.add('destinations');
                    }
                }
            });
        });
    },
    
    /**
     * Initialiser les graphiques après l'affichage
     */
    async initCharts() {
        try {
            // Initialiser les événements des onglets
            this.initTabEvents();
            
            // Initialiser uniquement l'onglet actif par défaut (destinations)
            requestAnimationFrame(() => {
                if (!this._initializedTabs.has('destinations')) {
                    this.initDestinationCharts();
                    this._initializedTabs.add('destinations');
                }
            });
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des graphiques:', error);
        }
    },
    
    /**
     * Initialiser les graphiques de l'onglet Destinations
     */
    async initDestinationCharts() {
        try {
            // Récupérer les données pour l'onglet Destinations
            const destinations = await this.getDestinations();
            let destinationStats = [];
            
            for (const destination of destinations) {
                let destDuration = 0;
                let destCost = 0;
                let accommodationCost = 0;
                let activityCost = 0;
                let transportCost = 0;
                let accommodationDuration = 0;
                let activityDuration = 0;
                let transportDuration = 0;
                
                // Durée de la destination
                if (destination.duration) {
                    destDuration = this.convertDurationToMinutes(destination.duration);
                }
                
                // Coût du transport
                if (destination.transportation && destination.transportation.cost) {
                    transportCost = destination.transportation.cost;
                    destCost += transportCost;
                }
                
                // Durée du transport
                if (destination.transportation && destination.transportation.duration) {
                    transportDuration = this.convertDurationToMinutes(destination.transportation.duration);
                    destDuration += transportDuration;
                }
                
                // Activités de la destination
                if (destination.id) {
                    const activities = await window.localStorageService.getActivities(destination.id);
                    for (const activity of activities) {
                        const activityPrice = parseFloat(activity.price) || 0;
                        activityCost += activityPrice;
                        destCost += activityPrice;
                        
                        const activityDur = this.calculateActivityDuration(activity);
                        activityDuration += activityDur;
                        destDuration += activityDur;
                    }
                }
                
                // Coût et durée de l'hébergement (pas de données disponibles = 0)
                accommodationDuration = Math.max(0, destDuration - activityDuration - transportDuration);
                accommodationCost = 0;
                destCost += accommodationCost;
                
                destinationStats.push({
                    name: destination.name,
                    duration: destDuration,
                    cost: destCost,
                    accommodationDuration,
                    activityDuration,
                    transportDuration,
                    accommodationCost,
                    activityCost,
                    transportCost
                });
            }
            
            // Créer les graphiques de l'onglet Destinations
            this.createDurationByDestinationChart(destinationStats);
            this.createCostByDestinationChart(destinationStats);
            
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des graphiques destinations:', error);
        }
    },
    
    /**
     * Initialiser les graphiques de l'onglet Activités
     */
    async initActivitiesCharts() {
        try {
            // Récupérer les données pour l'onglet Activités
            const destinations = await this.getDestinations();
            const statsByType = {};
            let totalDuration = 0;
            let totalCost = 0;
            
            for (const destination of destinations) {
                if (destination.id) {
                    const activities = await window.localStorageService.getActivities(destination.id);
                    
                    activities.forEach(activity => {
                        const type = activity.type || 'Autre';
                        if (!statsByType[type]) {
                            statsByType[type] = { count: 0, totalDuration: 0, totalCost: 0, activities: [] };
                        }
                        
                        statsByType[type].count++;
                        statsByType[type].activities.push(activity);
                        
                        const cost = activity.price || 0;
                        statsByType[type].totalCost += cost;
                        totalCost += cost;
                        
                        const activityDuration = this.calculateActivityDuration(activity);
                        statsByType[type].totalDuration += activityDuration;
                        totalDuration += activityDuration;
                    });
                }
            }
            
            // Créer les graphiques de l'onglet Activités
            this.createBudgetByActivityTypeChart(statsByType, 'budget-distribution-chart');
            this.createDurationByActivityTypeChart(statsByType, 'duration-distribution-chart');
            this.createAverageDurationByActivityTypeChart(statsByType);
            this.createAverageBudgetByActivityTypeChart(statsByType);
            
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des graphiques activités:', error);
        }
    },
    
    /**
     * Initialiser les graphiques de l'onglet Transports
     */
    async initTransportsCharts() {
        try {
            // Récupérer les données pour l'onglet Transports
            const destinations = await this.getDestinations();
            let transportStats = {};
            let transportCount = 0;

            // Récupérer tous les transports de toutes les destinations
            for (const destination of destinations) {
                if (destination.transportation) {
                    const type = destination.transportation.type || 'voiture';
                    const cost = parseFloat(destination.transportation.cost) || 0;
                    let duration = 0;

                    // Calculer la durée du transport
                    if (destination.transportation.duration) {
                        const transportDuration = destination.transportation.duration;
                        duration = (transportDuration.hours || 0) * 60 + (transportDuration.minutes || 0);
                    }

                    if (!transportStats[type]) {
                        transportStats[type] = {
                            totalDuration: 0,
                            totalCost: 0,
                            count: 0
                        };
                    }

                    transportStats[type].totalDuration += duration;
                    transportStats[type].totalCost += cost;
                    transportStats[type].count++;
                    transportCount++;
                }
            }

            // Générer les légendes pour les graphiques
            const labels = Object.keys(transportStats).sort();
            const colors = labels.map((type, index) => this.getTransportTypeColor(type, index));
            
            // Générer le HTML des légendes
            const legendHTML = labels.map((type, index) => `
                <div class="legend-item">
                    <span class="legend-color" style="background-color: ${colors[index]}"></span>
                    <span class="legend-label">${type}</span>
                </div>
            `).join('');

            // Mettre à jour les légendes dans le HTML
            const durationLegend = document.getElementById('transport-duration-legend');
            const costLegend = document.getElementById('transport-cost-legend');
            const avgDurationLegend = document.getElementById('transport-avg-duration-legend');
            const avgCostLegend = document.getElementById('transport-avg-cost-legend');

            if (durationLegend) durationLegend.innerHTML = legendHTML;
            if (costLegend) costLegend.innerHTML = legendHTML;
            if (avgDurationLegend) avgDurationLegend.innerHTML = legendHTML;
            if (avgCostLegend) avgCostLegend.innerHTML = legendHTML;

            // Calculer les totaux et moyennes générales
            let totalDuration = 0;
            let totalCost = 0;
            let totalTransportCount = 0;

            Object.values(transportStats).forEach(stats => {
                totalDuration += stats.totalDuration;
                totalCost += stats.totalCost;
                totalTransportCount += stats.count;
            });

            const avgDurationTotal = totalTransportCount > 0 ? totalDuration / totalTransportCount : 0;
            const avgCostTotal = totalTransportCount > 0 ? totalCost / totalTransportCount : 0;

            // Mettre à jour les valeurs totales et moyennes
            const totalDurationEl = document.getElementById('transport-total-duration');
            const totalCostEl = document.getElementById('transport-total-cost');
            const avgDurationTotalEl = document.getElementById('transport-avg-duration-total');
            const avgCostTotalEl = document.getElementById('transport-avg-cost-total');

            if (totalDurationEl) {
                const hours = Math.floor(totalDuration / 60);
                const minutes = Math.round(totalDuration % 60);
                totalDurationEl.textContent = hours > 0 ? `${hours}h${minutes > 0 ? minutes + 'min' : ''}` : `${minutes}min`;
            }

            if (totalCostEl) {
                totalCostEl.textContent = this.formatCost(totalCost);
            }

            if (avgDurationTotalEl) {
                const hours = Math.floor(avgDurationTotal / 60);
                const minutes = Math.round(avgDurationTotal % 60);
                avgDurationTotalEl.textContent = hours > 0 ? `${hours}h${minutes > 0 ? minutes + 'min' : ''}` : `${minutes}min`;
            }

            if (avgCostTotalEl) {
                avgCostTotalEl.textContent = this.formatCost(avgCostTotal);
            }

            // Créer les 4 graphiques de l'onglet Transports
            this.createTotalDurationByTransportTypeChart(transportStats, 'transport-duration-chart');
            this.createTotalCostByTransportTypeChart(transportStats, 'transport-cost-chart');
            this.createAverageDurationByTransportTypeChart(transportStats, 'transport-avg-duration-chart');
            this.createAverageCostByTransportTypeChart(transportStats, 'transport-avg-cost-chart');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation des graphiques transports:', error);
        }
    },

    /**
     * Créer le graphique camembert pour la durée totale par type de transport
     */
    createTotalDurationByTransportTypeChart(transportStats, canvasId = 'transport-duration-chart') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        // Préparer les données - trier les types par ordre alphabétique pour la consistance
        const labels = Object.keys(transportStats).sort();
        const data = labels.map(type => transportStats[type].totalDuration); // Garder en minutes
        
        // Vérifier s'il y a des données de durée
        const hasData = data.some(duration => duration > 0);
        if (!hasData) {
            // Afficher "aucune donnée" à la place du graphique
            const container = ctx.parentElement;
            container.innerHTML = '<div class="no-data">Aucune donnée</div>';
            return null;
        }
        
        // Générer des couleurs consistantes basées sur l'index trié
        const colors = labels.map((type, index) => {
            const color = this.getTransportTypeColor(type, index);
            return color;
        });
        const hoverColors = colors.map(color => color + 'CC');
        
        // Détruire le graphique existant s'il y en a un
        if (this.transportDurationChart) {
            this.transportDurationChart.destroy();
        }
        
        // Créer le nouveau graphique
        this.transportDurationChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverBackgroundColor: hoverColors
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const hours = Math.floor(value / 60);
                                const minutes = Math.round(value % 60);
                                const duration = hours > 0 ? `${hours}h${minutes > 0 ? minutes + 'min' : ''}` : `${minutes}min`;
                                return `${label}: ${duration}`;
                            }
                        }
                    }
                }
            }
        });
        
        return this.transportDurationChart;
    },

    /**
     * Créer le graphique camembert pour le coût total par type de transport
     */
    createTotalCostByTransportTypeChart(transportStats, canvasId = 'transport-cost-chart') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        // Préparer les données - trier les types par ordre alphabétique pour la consistance
        const labels = Object.keys(transportStats).sort();
        const data = labels.map(type => transportStats[type].totalCost || 0);
        
        // Vérifier s'il y a des données de coût
        const hasData = data.length > 0; // Y a-t-il des types de transport ?
        if (!hasData) {
            // Afficher "aucune donnée" à la place du graphique
            const container = ctx.parentElement;
            container.innerHTML = '<div class="no-data">Aucune donnée</div>';
            return null;
        }
        
        // Générer des couleurs consistantes basées sur l'index trié
        const colors = labels.map((type, index) => {
            const color = this.getTransportTypeColor(type, index);
            return color;
        });
        const hoverColors = colors.map(color => color + 'CC');
        
        // Détruire le graphique existant s'il y en a un
        if (this.transportCostChart) {
            this.transportCostChart.destroy();
        }
        
        // Créer le nouveau graphique
        this.transportCostChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverBackgroundColor: hoverColors
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR'
                                }).format(value)}`;
                            }
                        }
                    }
                }
            }
        });
        
        return this.transportCostChart;
    },

    /**
     * Créer le graphique camembert pour la durée moyenne par type de transport
     */
    createAverageDurationByTransportTypeChart(transportStats, canvasId = 'transport-avg-duration-chart') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        // Préparer les données - trier les types par ordre alphabétique pour la consistance
        const labels = Object.keys(transportStats).sort();
        const data = labels.map(type => {
            const stats = transportStats[type];
            return stats.count > 0 ? stats.totalDuration / stats.count : 0;
        });
        
        // Vérifier s'il y a des données de durée moyenne
        const hasData = data.some(duration => duration > 0);
        if (!hasData) {
            // Afficher "aucune donnée" à la place du graphique
            const container = ctx.parentElement;
            container.innerHTML = '<div class="no-data">Aucune donnée</div>';
            return null;
        }
        
        // Générer des couleurs consistantes basées sur l'index trié
        const colors = labels.map((type, index) => {
            const color = this.getTransportTypeColor(type, index);
            return color;
        });
        const hoverColors = colors.map(color => color + 'CC');
        
        // Détruire le graphique existant s'il y en a un
        if (this.transportAvgDurationChart) {
            this.transportAvgDurationChart.destroy();
        }
        
        // Créer le nouveau graphique
        this.transportAvgDurationChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverBackgroundColor: hoverColors
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const hours = Math.floor(value / 60);
                                const minutes = Math.round(value % 60);
                                const duration = hours > 0 ? `${hours}h${minutes > 0 ? minutes + 'min' : ''}` : `${minutes}min`;
                                return `${label}: ${duration} (moyenne)`;
                            }
                        }
                    }
                }
            }
        });
        
        return this.transportAvgDurationChart;
    },

    /**
     * Créer le graphique camembert pour le coût moyen par type de transport
     */
    createAverageCostByTransportTypeChart(transportStats, canvasId = 'transport-avg-cost-chart') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        // Préparer les données - trier les types par ordre alphabétique pour la consistance
        const labels = Object.keys(transportStats).sort();
        const data = labels.map(type => {
            const stats = transportStats[type];
            return stats.count > 0 ? stats.totalCost / stats.count : 0;
        });
        
        // Vérifier s'il y a des données de coût moyen
        const hasData = data.length > 0; // Y a-t-il des types de transport ?
        if (!hasData) {
            // Afficher "aucune donnée" à la place du graphique
            const container = ctx.parentElement;
            container.innerHTML = '<div class="no-data">Aucune donnée</div>';
            return null;
        }
        
        // Générer des couleurs consistantes basées sur l'index trié
        const colors = labels.map((type, index) => {
            const color = this.getTransportTypeColor(type, index);
            return color;
        });
        const hoverColors = colors.map(color => color + 'CC');
        
        // Détruire le graphique existant s'il y en a un
        if (this.transportAvgCostChart) {
            this.transportAvgCostChart.destroy();
        }
        
        // Créer le nouveau graphique
        this.transportAvgCostChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverBackgroundColor: hoverColors
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR'
                                }).format(value)} (moyenne)`;
                            }
                        }
                    }
                }
            }
        });
        
        return this.transportAvgCostChart;
    },

    /**
     * Créer le graphique en barres simples pour la durée par destination
     */
    createDurationByDestinationChart(destinationStats) {
        const ctx = document.getElementById('duration-by-destination-chart');
        if (!ctx) return null;

        const labels = destinationStats.map(d => d.name);
        const durationData = destinationStats.map(d => d.duration / 60); // Convertir en heures

        if (this.durationByDestinationChart) {
            this.durationByDestinationChart.destroy();
        }

        this.durationByDestinationChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Durée (heures)',
                    data: durationData,
                    backgroundColor: '#3B82F6',
                    borderColor: '#3B82F6',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Légende personnalisée dans le HTML
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                return `${label}: ${value.toFixed(1)}h`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Durée (heures)',
                            font: {
                                size: 14
                            }
                        }
                    }
                }
            }
        });

        return this.durationByDestinationChart;
    },

    /**
     * Créer le graphique en barres empilées pour le coût par destination
     */
    createCostByDestinationChart(destinationStats) {
        const ctx = document.getElementById('cost-by-destination-chart');
        if (!ctx) return null;

        const labels = destinationStats.map(d => d.name);
        const accommodationData = destinationStats.map(d => d.accommodationCost || 0);
        const activityData = destinationStats.map(d => d.activityCost || 0);
        const transportData = destinationStats.map(d => d.transportCost || 0);

        if (this.costByDestinationChart) {
            this.costByDestinationChart.destroy();
        }

        this.costByDestinationChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Hébergement',
                        data: accommodationData,
                        backgroundColor: '#10B981',
                        borderColor: '#10B981',
                        borderWidth: 1
                    },
                    {
                        label: 'Activité',
                        data: activityData,
                        backgroundColor: '#EC4899',
                        borderColor: '#EC4899',
                        borderWidth: 1
                    },
                    {
                        label: 'Transport',
                        data: transportData,
                        backgroundColor: '#F59E0B',
                        borderColor: '#F59E0B',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Légende personnalisée dans le HTML
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                return `${label}: ${new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR'
                                }).format(value)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Coût (€)',
                            font: {
                                size: 14
                            }
                        }
                    }
                }
            }
        });

        return this.costByDestinationChart;
    },

    /**
     * Créer le graphique camembert pour le budget par type d'activité
     */
    createBudgetByActivityTypeChart(activitiesByType, canvasId = 'budgetChart') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        // Préparer les données - trier les types par ordre alphabétique pour la consistance
        const labels = Object.keys(activitiesByType).sort();
        const data = labels.map(type => activitiesByType[type].totalCost || 0);
        
        // Vérifier s'il y a des données de coût
        const hasData = data.length > 0; // Y a-t-il des types d'activités ?
        if (!hasData) {
            // Afficher "aucune donnée" à la place du graphique
            const container = ctx.parentElement;
            container.innerHTML = '<div class="no-data">Aucune donnée</div>';
            return null;
        }
        
        // Générer des couleurs consistantes basées sur l'index trié
        const colors = labels.map((type, index) => {
            const color = this.getActivityTypeColor(type, index);
            return color;
        });
        const hoverColors = colors.map(color => color + 'CC');
        
        // Détruire le graphique existant s'il y en a un
        if (this.budgetChart) {
            this.budgetChart.destroy();
        }
        
        // Créer le nouveau graphique
        this.budgetChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverBackgroundColor: hoverColors
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR'
                                }).format(value)}`;
                            }
                        }
                    }
                }
            }
        });
        
        return this.budgetChart;
    },

    /**
     * Créer le graphique camembert pour la durée par type d'activité
     */
    createDurationByActivityTypeChart(activitiesByType, canvasId = 'durationChart') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        // Préparer les données - trier les types par ordre alphabétique pour la consistance
        const labels = Object.keys(activitiesByType).sort();
        const data = labels.map(type => activitiesByType[type].totalDuration || 0);
        
        // Vérifier s'il y a des données de durée
        const hasData = data.some(duration => duration > 0);
        if (!hasData) {
            // Afficher "aucune donnée" à la place du graphique
            const container = ctx.parentElement;
            container.innerHTML = '<div class="no-data">Aucune donnée</div>';
            return null;
        }
        
        // Générer des couleurs consistantes basées sur l'index trié
        const colors = labels.map((type, index) => {
            const color = this.getActivityTypeColor(type, index);
            return color;
        });
        const hoverColors = colors.map(color => color + 'CC');
        
        // Détruire le graphique existant s'il y en a un
        if (this.durationChart) {
            this.durationChart.destroy();
        }
        
        // Créer le nouveau graphique
        this.durationChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverBackgroundColor: hoverColors
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const hours = Math.floor(value / 60);
                                const minutes = value % 60;
                                const duration = hours > 0 ? `${hours}h${minutes > 0 ? minutes + 'min' : ''}` : `${minutes}min`;
                                return `${label}: ${duration}`;
                            }
                        }
                    }
                }
            }
        });
        
        return this.durationChart;
    },

    /**
     * Créer le graphique camembert pour la durée moyenne par type d'activité
     */
    createAverageDurationByActivityTypeChart(activitiesByType) {
        const ctx = document.getElementById('avg-duration-chart');
        if (!ctx) return null;
        
        // Préparer les données - trier les types par ordre alphabétique pour la consistance
        const labels = Object.keys(activitiesByType).sort();
        const data = labels.map(type => {
            const stats = activitiesByType[type];
            return stats.count > 0 ? (stats.totalDuration || 0) / stats.count : 0;
        });
        
        // Vérifier s'il y a des données de durée moyenne
        const hasData = data.some(duration => duration > 0);
        if (!hasData) {
            // Afficher "aucune donnée" à la place du graphique
            const container = ctx.parentElement;
            container.innerHTML = '<div class="no-data">Aucune donnée</div>';
            return null;
        }
        
        // Générer des couleurs consistantes basées sur l'index trié
        const colors = labels.map((type, index) => {
            const color = this.getActivityTypeColor(type, index);
            return color;
        });
        const hoverColors = colors.map(color => color + 'CC');
        
        // Détruire le graphique existant s'il y en a un
        if (this.avgDurationChart) {
            this.avgDurationChart.destroy();
        }
        
        // Créer le nouveau graphique
        this.avgDurationChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverBackgroundColor: hoverColors
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const hours = Math.floor(value / 60);
                                const minutes = Math.round(value % 60);
                                const duration = hours > 0 ? `${hours}h${minutes > 0 ? minutes + 'min' : ''}` : `${minutes}min`;
                                return `${label}: ${duration} (moyenne)`;
                            }
                        }
                    }
                }
            }
        });
        
        return this.avgDurationChart;
    },

    /**
     * Créer le graphique camembert pour le budget moyen par type d'activité
     */
    createAverageBudgetByActivityTypeChart(activitiesByType) {
        const ctx = document.getElementById('avg-cost-chart');
        if (!ctx) return null;
        
        // Préparer les données - trier les types par ordre alphabétique pour la consistance
        const labels = Object.keys(activitiesByType).sort();
        const data = labels.map(type => {
            const stats = activitiesByType[type];
            return stats.count > 0 ? (stats.totalCost || 0) / stats.count : 0;
        });
        
        // Vérifier s'il y a des données de coût moyen
        const hasData = data.length > 0; // Y a-t-il des types d'activités ?
        if (!hasData) {
            // Afficher "aucune donnée" à la place du graphique
            const container = ctx.parentElement;
            container.innerHTML = '<div class="no-data">Aucune donnée</div>';
            return null;
        }
        
        // Générer des couleurs consistantes basées sur l'index trié
        const colors = labels.map((type, index) => {
            const color = this.getActivityTypeColor(type, index);
            return color;
        });
        const hoverColors = colors.map(color => color + 'CC');
        
        // Détruire le graphique existant s'il y en a un
        if (this.avgCostChart) {
            this.avgCostChart.destroy();
        }
        
        // Créer le nouveau graphique
        this.avgCostChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverBackgroundColor: hoverColors
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR'
                                }).format(value)} (moyenne)`;
                            }
                        }
                    }
                }
            }
        });
        
        return this.avgCostChart;
    },

    /**
     * Calculer le temps total des activités
     */
    async calculateActivitiesTime() {
        const destinations = await this.getDestinations();
        let totalMinutes = 0;
        
        for (const destination of destinations) {
            if (destination.id) {
                const activities = await window.localStorageService.getActivities(destination.id);
                for (const activity of activities) {
                    const activityDuration = this.calculateActivityDuration(activity);
                    totalMinutes += activityDuration;
                }
            }
        }
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return { hours, minutes };
    },

    /**
     * Rendre le composant Synthèse
     */
    async render() {
        try {
            const content = await this.createSyntheseContent();
            // Retourner le contenu avec le container pour que les graphiques puissent s'initialiser
            return `<div id="synthese-container">${content}</div>`;
        } catch (error) {
            console.error('Erreur lors du rendu de la synthèse:', error);
            return '<div class="synthese-error">Erreur lors du chargement de la synthèse</div>';
        }
    }
};

// Export pour utilisation globale
window.Synthèse = Synthèse;
