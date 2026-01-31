/**
 * Composant Synthèse - Module Pattern
 * Gère la vue globale de l'itinéraire
 */

const Synthèse = {
    /**
     * Initialiser le composant Synthèse
     */
    init() {
        // Initialisation silencieuse
        this.render();
    },
    
    /**
     * Calculer la durée totale de l'itinéraire
     */
    calculateTotalDuration() {
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        let totalMinutes = 0;
        
        destinations.forEach(destination => {
            if (destination.duration) {
                totalMinutes += 
                    (destination.duration.days || 0) * 24 * 60 +
                    (destination.duration.hours || 0) * 60 +
                    (destination.duration.minutes || 0);
            }
        });
        
        const days = Math.floor(totalMinutes / (24 * 60));
        const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
        const minutes = totalMinutes % 60;
        
        return { days, hours, minutes, totalMinutes };
    },
    
    /**
     * Calculer le coût total de l'itinéraire
     */
    async calculateTotalCost() {
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        
        let totalCost = 0;
        let activitiesByType = {};
        
        for (const destination of destinations) {
            // Vérifier que la destination a un ID avant de chercher ses activités
            if (!destination.id) {
                continue;
            }
            
            if (window.firebaseService) {
                try {
                    // Récupérer les activités de cette destination
                    const activities = await window.firebaseService.getActivities(destination);
                    
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
                        
                        // Calculer la durée à partir de startTime et endTime
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
     * Formater la durée pour l'affichage
     */
    formatDuration(duration) {
        const parts = [];
        if (duration.days > 0) parts.push(`${duration.days}j`);
        if (duration.hours > 0) parts.push(`${duration.hours}h`);
        if (duration.minutes > 0) parts.push(`${duration.minutes}min`);
        return parts.length > 0 ? parts.join(' ') : 'Aucune durée';
    },
    
    /**
     * Calculer la distance totale du voyage
     */
    async calculateTotalDistance() {
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
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
        const destinations = window.firebaseService.getDestinationsOfCurrentItinerary();
        let totalMinutes = 0;
        
        for (const destination of destinations) {
            // Ignorer la première destination (pas de transport)
            if (destination.transportation && destination.transportation.duration) {
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
        const costData = await this.calculateTotalCost();
        const totalMinutes = Object.values(costData.activitiesByType)
            .reduce((sum, type) => sum + type.duration, 0);
        
        return {
            hours: Math.floor(totalMinutes / 60),
            minutes: Math.round(totalMinutes % 60)
        };
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
     * Créer le contenu HTML de la synthèse
     */
    async createSyntheseContent() {
        // Calculer les statistiques
        const duration = this.calculateTotalDuration();
        const costData = await this.calculateTotalCost();
        const totalDistance = await this.calculateTotalDistance();
        const transportTime = await this.calculateTransportTime();
        const activitiesTime = await this.calculateActivitiesTime();
        
        return `
            <div class="synthese-content">
                <div class="synthese-header">
                    <h2>Synthèse du voyage</h2>
                    
                    <!-- Conteneurs de statistiques principaux -->
                    <div class="synthese-main-stats">
                        <!-- Conteneur gauche : Temps -->
                        <div class="stats-left">
                            <div class="stat-card">
                                <div class="stat-icon">
                                    <span class="material-icons">schedule</span>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">${this.formatDuration(duration)}</div>
                                    <div class="stat-label">Durée totale</div>
                                </div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-icon">
                                    <span class="material-icons">directions_car</span>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">${transportTime.hours}h${transportTime.minutes > 0 ? transportTime.minutes : ''}</div>
                                    <div class="stat-label">Transport</div>
                                </div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-icon">
                                    <span class="material-icons">event</span>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">${activitiesTime.hours}h${activitiesTime.minutes > 0 ? activitiesTime.minutes : ''}</div>
                                    <div class="stat-label">Activités</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Conteneur droit : Coût et Distance -->
                        <div class="stats-right">
                            <div class="stat-card">
                                <div class="stat-icon">
                                    <span class="material-icons">euro</span>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">${this.formatCost(costData.totalCost)}</div>
                                    <div class="stat-label">Coût total</div>
                                </div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-icon">
                                    <span class="material-icons">map</span>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">${totalDistance.toFixed(0)} km</div>
                                    <div class="stat-label">Distance totale</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="synthese-charts">
                    <div class="chart-section">
                        <div class="chart-header">
                            <h3>Répartition du budget</h3>
                        </div>
                        <div class="chart-container">
                            <canvas id="budgetChart" width="300" height="300"></canvas>
                        </div>
                    </div>
                    
                    <div class="chart-section">
                        <div class="chart-header">
                            <h3>Répartition du temps</h3>
                        </div>
                        <div class="chart-container">
                            <canvas id="durationChart" width="300" height="300"></canvas>
                        </div>
                    </div>
                </div>
                
                <div class="synthese-details">
                    <div class="details-section">
                        <h3>Détail par type d'activité</h3>
                        <div class="activities-breakdown" id="activitiesBreakdown">
                            <!-- Détail des activités par type -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Générer le détail des activités par type
     */
    generateActivitiesBreakdown(activitiesByType) {
        let html = '';
        
        for (const [type, data] of Object.entries(activitiesByType)) {
            const avgCost = data.count > 0 ? data.cost / data.count : 0;
            
            html += `
                <div class="activity-type-item">
                    <div class="activity-type-header">
                        <h4>${type}</h4>
                        <span class="activity-count">${data.count} activité${data.count > 1 ? 's' : ''}</span>
                    </div>
                    <div class="activity-type-stats">
                        <div class="activity-stat">
                            <span class="stat-label">Coût total:</span>
                            <span class="stat-value">${this.formatCost(data.cost)}</span>
                        </div>
                        <div class="activity-stat">
                            <span class="stat-label">Coût moyen:</span>
                            <span class="stat-value">${this.formatCost(avgCost)}</span>
                        </div>
                        ${data.duration > 0 ? `
                        <div class="activity-stat">
                            <span class="stat-label">Durée totale:</span>
                            <span class="stat-value">${this.formatDuration({
                                days: Math.floor(data.duration / (24 * 60)),
                                hours: Math.floor((data.duration % (24 * 60)) / 60),
                                minutes: data.duration % 60
                            })}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        return html || '<p>Aucune activité trouvée</p>';
    },
    
    /**
     * Créer le graphique camembert pour le budget
     */
    createBudgetChart(activitiesByType) {
        const ctx = document.getElementById('budgetChart');
        if (!ctx) return null;
        
        // Préparer les données - trier les types par ordre alphabétique pour la consistance
        const labels = Object.keys(activitiesByType).sort();
        const data = labels.map(type => activitiesByType[type].cost);
        
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
        
        this.budgetChart = new Chart(ctx.getContext('2d'), {
            type: 'pie',
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
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value}€ (${percentage}%)`;
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const type = labels[index];
                        // TODO: Filtrer les activités par type
                    }
                }
            }
        });
        
        return this.budgetChart;
    },
    
    /**
     * Créer le graphique camembert pour la durée
     */
    createDurationChart(activitiesByType) {
        const ctx = document.getElementById('durationChart');
        if (!ctx) return null;
        
        // Préparer les données - utiliser le même ordre trié que le graphique budget
        const labels = Object.keys(activitiesByType).sort();
        const data = labels.map(type => {
            const minutes = activitiesByType[type].duration;
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h${mins > 0 ? mins : ''}`;
        });
        
        // Utiliser les mêmes couleurs consistantes que le graphique budget (même ordre trié)
        const colors = labels.map((type, index) => {
            const color = this.getActivityTypeColor(type, index);
            return color;
        });
        const hoverColors = colors.map(color => color + 'CC');
        
        // Détruire le graphique existant s'il y en a un
        if (this.durationChart) {
            this.durationChart.destroy();
        }
        
        this.durationChart = new Chart(ctx.getContext('2d'), {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: labels.map(type => activitiesByType[type].duration),
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverBackgroundColor: hoverColors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const minutes = context.parsed || 0;
                                const hours = Math.floor(minutes / 60);
                                const mins = minutes % 60;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((minutes / total) * 100).toFixed(1);
                                
                                let durationStr = '';
                                if (hours > 0) durationStr += `${hours}h`;
                                if (mins > 0) durationStr += `${mins}min`;
                                if (durationStr === '') durationStr = '0min';
                                
                                return `${label}: ${durationStr} (${percentage}%)`;
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const type = labels[index];
                        // TODO: Filtrer les activités par type
                    }
                }
            }
        });
        
        return this.durationChart;
    },
    
    /**
     * Rendre le composant Synthèse
     */
    async render() {
        const container = document.querySelector('#sidebar-synthese-content .synthese-container');
        
        if (!container) {
            console.error('Synthèse: Conteneur non trouvé');
            return;
        }
        
        try {
            // Afficher le loading pendant le calcul
            container.innerHTML = `
                <div class="synthese-loading">
                    <div class="loading-spinner"></div>
                    <p>Calcul de la synthèse...</p>
                </div>
            `;
            
            // Générer le contenu
            const content = await this.createSyntheseContent();
            container.innerHTML = content;
            
            // Générer le détail des activités
            const costData = await this.calculateTotalCost();
            const breakdownContainer = document.getElementById('activitiesBreakdown');
            if (breakdownContainer) {
                breakdownContainer.innerHTML = this.generateActivitiesBreakdown(costData.activitiesByType);
            }
            
            // Créer les graphiques
            setTimeout(() => {
                this.createBudgetChart(costData.activitiesByType);
                this.createDurationChart(costData.activitiesByType);
            }, 100); // Petit délai pour s'assurer que le DOM est prêt
            
        } catch (error) {
            console.error('Erreur lors du rendu de la synthèse:', error);
            container.innerHTML = `
                <div class="synthese-error">
                    <span class="material-icons">error</span>
                    <p>Erreur lors du chargement de la synthèse</p>
                </div>
            `;
        }
    },
    
    /**
     * Rafraîchir la synthèse
     */
    async refresh() {
        await this.render();
    }
};

// Exporter globalement
window.Synthèse = Synthèse;
