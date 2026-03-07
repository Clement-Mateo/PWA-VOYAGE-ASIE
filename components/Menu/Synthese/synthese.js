/**
 * Composant Synthèse - Module Pattern
 * Gère la vue globale de l'itinéraire
 */

const Synthèse = {
    /**
     * Initialiser le composant Synthèse
     */
    init() {
    },
    
    /**
     * Calculer la durée totale de l'itinéraire (destinations + transports)
     */
    async calculateTotalDuration() {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        let totalMinutes = 0;
        
        console.log('🧮 Calcul durée totale - destinations:', destinations);
        
        // Ajouter les durées des destinations
        destinations.forEach(destination => {
            console.log(`📍 Destination ${destination.name} (order: ${destination.order})`);
            
            if (destination.duration) {
                const destMinutes = 
                    (destination.duration.days || 0) * 24 * 60 +
                    (destination.duration.hours || 0) * 60 +
                    (destination.duration.minutes || 0);
                totalMinutes += destMinutes;
                console.log(`  ⏱️ Durée destination: ${destMinutes}min`);
            }
            
            // Ajouter les durées de transport (sauf pour la première destination)
            if (destination.order > 0 && destination.transportation && destination.transportation.duration) {
                const transportDuration = destination.transportation.duration;
                console.log(`  🚗 Transport trouvé:`, transportDuration);
                
                // Gérer le format objet {hours, minutes}
                if (typeof transportDuration === 'object' && transportDuration !== null) {
                    const hours = transportDuration.hours || 0;
                    const minutes = transportDuration.minutes || 0;
                    const transportMinutes = hours * 60 + minutes;
                    totalMinutes += transportMinutes;
                    console.log(`  ⏱️ Durée transport: ${transportMinutes}min (${hours}h ${minutes}min)`);
                } else if (typeof transportDuration === 'string') {
                    // Ancien format chaîne
                    const parsed = window.parseDuration(transportDuration);
                    totalMinutes += parsed.hours * 60 + parsed.minutes;
                    console.log(`  ⏱️ Durée transport (chaîne): ${parsed.hours * 60 + parsed.minutes}min`);
                }
            } else {
                console.log(`  ❌ Pas de transport (order: ${destination.order}, transportation: ${!!destination.transportation})`);
            }
        });
        
        const days = Math.floor(totalMinutes / (24 * 60));
        const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
        const minutes = totalMinutes % 60;
        
        console.log(`🎯 Durée totale calculée: ${days}j ${hours}h ${minutes}min (${totalMinutes}min total)`);
        
        return { days, hours, minutes, totalMinutes };
    },
    
    /**
     * Calculer le coût total de l'itinéraire
     */
    async calculateTotalCost() {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        
        let totalCost = 0;
        let activitiesByType = {};
        
        for (const destination of destinations) {
            // Vérifier que la destination a un ID avant de chercher ses activités
            if (!destination.id) {
                continue;
            }
            
            // Ajouter le coût du transport s'il existe
            if (destination.transportation && destination.transportation.cost) {
                totalCost += destination.transportation.cost;
            }
            
            if (window.localStorageService) {
                try {
                    // Récupérer les activités de cette destination
                    const activities = await window.localStorageService.getActivities(destination.id);
                    
                    activities.forEach(activity => {
                        const cost = activity.price || 0; // Les activités utilisent 'price' pas 'cost'
                        totalCost += cost;
                        
                        // Regrouper par type d'activité
                        const type = activity.type || 'Autre';
                        if (!activitiesByType[type]) {
                            activitiesByType[type] = { count: 0, cost: 0, duration: 0 };
                        }
                        activitiesByType[type].count++;
                        activitiesByType[type].cost += cost;
                        
                        // Calculer la durée avec la nouvelle méthode
                        const activityDuration = this.calculateActivityDuration(activity);
                        activitiesByType[type].duration += activityDuration;
                    });
                } catch (error) {
                    console.error('Erreur lors du chargement des activités:', error);
                }
            }
        }
        
        return { totalCost, activitiesByType };
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
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        let totalDistance = 0;
        
        for (let i = 0; i < destinations.length - 1; i++) {
            const current = destinations[i];
            const next = destinations[i + 1];
            
            if (current.address?.location && next.address?.location) {
                // Calcul de distance avec la formule de Haversine
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
     * Calculer le temps de transport total à partir des données réelles
     */
    async calculateTransportTime() {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        const destinations = currentItinerary ? await window.localStorageService.getDestinationsOfCurrentItinerary() : [];
        let totalMinutes = 0;
        
        for (const destination of destinations) {
            // Ignorer la première destination (pas de transport) - CORRECTION
            if (destination.order > 0 && destination.transportation && destination.transportation.duration) {
                const duration = destination.transportation.duration;
                
                // Gérer le nouveau format objet {hours, minutes} ou l'ancien format chaîne
                if (typeof duration === 'object' && duration !== null) {
                    // Nouveau format : objet {hours, minutes}
                    const hours = duration.hours || 0;
                    const minutes = duration.minutes || 0;
                    totalMinutes += hours * 60 + minutes;
                } else if (typeof duration === 'string') {
                    // Ancien format : chaîne "Xh Ymin" ou "XhYmin" ou "Xh" ou "Ymin"
                    const durationStr = duration;
                    
                    if (durationStr.includes('h')) {
                        const parts = durationStr.split('h');
                        const hours = parseInt(parts[0]) || 0;
                        const minutes = parts[1] ? parseInt(parts[1].replace('min', '').trim()) : 0;
                        totalMinutes += hours * 60 + minutes;
                    } else if (durationStr.includes('min')) {
                        const minutes = parseInt(durationStr.replace('min', '')) || 0;
                        totalMinutes += minutes;
                    } else {
                        // Si c'est juste un nombre, considérer comme des minutes
                        const minutes = parseInt(durationStr) || 0;
                        totalMinutes += minutes;
                    }
                }
            }
        }
        
        return {
            hours: Math.floor(totalMinutes / 60),
            minutes: Math.round(totalMinutes % 60)
        };
    },
    
    /**
     * Calculer le temps total des activités
     */
    async calculateActivitiesTime() {
        try {
            const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
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
        } catch (error) {
            console.error('Erreur calcul temps activités:', error);
            return { hours: 0, minutes: 0 };
        }
    },
    
    /**
     * Calculer le coût total des activités
     */
    async calculateActivitiesTotalCost() {
        try {
            const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
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
        } catch (error) {
            console.error('Erreur calcul coût activités:', error);
            return 0;
        }
    },
    
    /**
     * Formater le coût pour l'affichage
     */
    formatCost(cost) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(cost);
    },
    
    /**
     * Obtenir une couleur consistante pour un type d'activité
     */
    getActivityTypeColor(type, index) {
        // Mapping fixe pour les types d'activités disponibles
        const typeColorMap = {
            'culture': '#FF6384',         // Rose
            'gastronomie': '#36A2EB',     // Bleu
            'nature': '#27AE60',          // Vert
            'sport': '#FFCE56',           // Jaune
            'shopping': '#9966FF',        // Violet
            'hebergement': '#4BC0C0',     // Turquoise
            'autre': '#95A5A6'            // Gris
        };
        
        // Normaliser le type pour la comparaison (trim + casse)
        const normalizedType = type.trim();
                
        // Retourner la couleur fixe si le type est connu
        if (typeColorMap[normalizedType]) {
            return typeColorMap[normalizedType];
        }
        
        // Pour les types non prévus, utiliser l'index avec une palette de secours
        const fallbackColors = ['#E74C3C', '#34495E', '#16A085', '#F39C12'];
        const fallbackColor = fallbackColors[index % fallbackColors.length];
        return fallbackColor;
    },
    
    /**
     * Convertir une heure au format "HH:MM" en minutes depuis minuit
     */
    parseTime(timeString) {
        if (!timeString || typeof timeString !== 'string') {
            return null;
        }
        
        const parts = timeString.split(':');
        if (parts.length !== 2) {
            return null;
        }
        
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            return null;
        }
        
        return hours * 60 + minutes;
    },
    
    /**
     * Créer le contenu HTML de l'onglet Itinéraire
     */
    async createItinerarySynthese() {
        const currentItinerary = await window.localStorageService.getCurrentItinerary();
        if (!currentItinerary) {
            return '<p>Aucun itinéraire sélectionné</p>';
        }

        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        const duration = await this.calculateTotalDuration();
        const totalDistance = await this.calculateTotalDistance();
        const costData = await this.calculateTotalCost();
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
                            <div class="card-value">${window.DateService.formatDateForDisplay(currentItinerary.startDate)}</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="card-icon">
                            <span class="material-icons">flight_land</span>
                        </div>
                        <div class="card-content">
                            <div class="card-title">Date de Fin</div>
                            <div class="card-value">${window.DateService.formatDateForDisplay(endDate)}</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="card-icon">
                            <span class="material-icons">schedule</span>
                        </div>
                        <div class="card-content">
                            <div class="card-title">Durée Total</div>
                            <div class="card-value">${window.formatDuration(duration, true)}</div>
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
                            <div class="card-value">${this.formatCost(costData.totalCost)}</div>
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
        return ''; // Vide pour le moment
    },
    
    /**
     * Créer le contenu HTML de l'onglet Activités
     */
    async createActivitiesSynthese() {
        const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
        let allActivities = [];
        
        // Récupérer toutes les activités de toutes les destinations
        for (const destination of destinations) {
            if (destination.id) {
                const activities = await window.localStorageService.getActivities(destination.id);
                allActivities = allActivities.concat(activities.map(activity => ({
                    ...activity,
                    destinationName: destination.name
                })));
            }
        }
        
        // Calculer les statistiques par type
        const statsByType = {};
        let totalDuration = 0;
        let totalCost = 0;
        
        allActivities.forEach(activity => {
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
            
            // Calculer la durée
            if (activity.duration) {
                const duration = window.durationToMinutes(activity.duration);
                statsByType[type].totalDuration += duration;
                totalDuration += duration;
            }
            
            // Calculer le coût
            const cost = parseFloat(activity.price) || 0;
            statsByType[type].totalCost += cost;
            totalCost += cost;
        });
        
        // Préparer les données pour les graphiques
        const chartData = Object.entries(statsByType).map(([type, stats]) => ({
            type,
            count: stats.count,
            duration: stats.totalDuration,
            cost: stats.totalCost,
            avgDuration: stats.count > 0 ? stats.totalDuration / stats.count : 0,
            avgCost: stats.count > 0 ? stats.totalCost / stats.count : 0,
            color: this.getActivityTypeColor(type, 0)
        }));
        
        return `
            <div class="activities-synthese">
                <!-- Zone principale : Statistiques -->
                <div class="stats-area-full">
                    <!-- Première ligne : Répartitions -->
                    <div class="stats-grid">
                        <div class="chart-card">
                            <h4>Répartition temps par type</h4>
                            <div class="chart-container">
                                <canvas id="time-distribution-chart" width="120" height="120"></canvas>
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
            </div>
        `;
    },
    
    /**
     * Créer le contenu HTML de l'onglet Transport
     */
    async createTransportSynthese() {
        return ''; // Vide pour le moment
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
                            Transport
                        </button>
                    </div>
                    
                    <!-- Contenu des onglets -->
                    <div class="tab-content">
                        <div class="tab-pane active" id="itinerary-tab">
                            ${itineraryContent}
                        </div>
                        <div class="tab-pane" id="destinations-tab">
                            ${destinationContent}
                        </div>
                        <div class="tab-pane" id="activities-tab">
                            ${activitiesContent}
                        </div>
                        <div class="tab-pane" id="transport-tab">
                            ${transportContent}
                        </div>
                    </div>
                </div>
            </div>
        `;
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
        // Considérer que toutes les activités ont un coût (même 0€ pour les gratuites)
        const hasData = data.length > 0; // Y a-t-il des types d'activités ?
        console.log('Budget chart - hasData:', hasData, 'data:', data);
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
        console.log('Duration chart - hasData:', hasData, 'data:', data);
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
        console.log('Avg duration chart - hasData:', hasData, 'data:', data);
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
        // Considérer que toutes les activités ont un coût (même 0€ pour les gratuites)
        const hasData = data.length > 0; // Y a-t-il des types d'activités ?
        console.log('Avg budget chart - hasData:', hasData, 'data:', data);
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
        if (this.avgBudgetChart) {
            this.avgBudgetChart.destroy();
        }
        
        // Créer le nouveau graphique
        this.avgBudgetChart = new Chart(ctx.getContext('2d'), {
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
        
        return this.avgBudgetChart;
    },
    
    /**
     * Rendre le composant Synthèse
     */
    async render() {
        try {
            // Utiliser la nouvelle méthode avec les onglets
            let content = await this.createSyntheseContent();
            
            return content;
            
        } catch (error) {
            console.error('Erreur lors du rendu de la synthèse:', error);
            return `
                <div class="synthese-error">
                    <span class="material-icons">error</span>
                    <p>Erreur lors du chargement de la synthèse</p>
                </div>
            `;
        }
    },
    
    /**
     * Initialiser les événements des onglets
     */
    initTabEvents() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
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
            
            const costData = await this.calculateTotalCost();
            
            // Créer les graphiques avec un petit délai pour s'assurer que le DOM est prêt
            setTimeout(() => {                
                // Graphiques de l'onglet Destinations
                this.initDestinationCharts();
            }, 100);
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
            const destinations = await window.localStorageService.getDestinationsOfCurrentItinerary();
            let allActivities = [];
            
            // Récupérer toutes les activités de toutes les destinations
            for (const destination of destinations) {
                if (destination.id) {
                    const activities = await window.localStorageService.getActivities(destination.id);
                    allActivities = allActivities.concat(activities.map(activity => ({
                        ...activity,
                        destinationName: destination.name
                    })));
                }
            }
            
            // Calculer les statistiques par type
            const statsByType = {};
            allActivities.forEach(activity => {
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
                
                // Calculer la durée avec la nouvelle méthode
                const activityDuration = this.calculateActivityDuration(activity);
                if (activityDuration > 0) {
                    statsByType[type].totalDuration += activityDuration;
                    console.log(`Activité ${activity.name} - durée: ${activity.startTime} -> ${activity.endTime} = ${activityDuration}min`);
                } else {
                    console.log(`Activité ${activity.name} - PAS de durée (startTime: ${activity.startTime}, endTime: ${activity.endTime})`);
                }
                
                // Calculer le coût
                const cost = parseFloat(activity.price) || 0;
                statsByType[type].totalCost += cost;
            });
            
            console.log('Destination charts - statsByType:', statsByType);
            console.log('Destination charts - allActivities count:', allActivities.length);
            
            // Créer les 4 graphiques de l'onglet Destinations
            this.createBudgetByActivityTypeChart(statsByType, 'budget-distribution-chart');
            this.createDurationByActivityTypeChart(statsByType, 'time-distribution-chart');
            this.createAverageBudgetByActivityTypeChart(statsByType);
            this.createAverageDurationByActivityTypeChart(statsByType);
            
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des graphiques destinations:', error);
        }
    },
    
};


// Exporter globalement
window.Synthèse = Synthèse;
