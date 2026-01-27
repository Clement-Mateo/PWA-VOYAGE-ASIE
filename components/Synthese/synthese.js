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
        console.log('Synthèse: Destinations trouvées:', destinations.length);
        
        let totalCost = 0;
        let activitiesByType = {};
        
        for (const destination of destinations) {
            console.log('Synthèse: Destination:', destination.name || 'Sans nom', 'ID:', destination.id);
            
            // Vérifier que la destination a un ID avant de chercher ses activités
            if (!destination.id) {
                console.log('Synthèse: Destination sans ID ignorée:', destination.name || 'Destination sans nom');
                continue;
            }
            
            if (window.firebaseService) {
                try {
                    // Récupérer les activités de cette destination
                    const activities = await window.firebaseService.getActivities(destination);
                    console.log('Synthèse: Activités trouvées pour', destination.name, ':', activities.length);
                    
                    activities.forEach(activity => {
                        const cost = activity.price || 0; // Les activités utilisent 'price' pas 'cost'
                        totalCost += cost;
                        console.log('Synthèse: Activité:', activity.name || 'Sans nom', 'Coût:', cost, 'Total partiel:', totalCost);
                        
                        // Regrouper par type d'activité
                        const type = activity.type || 'Autre';
                        if (!activitiesByType[type]) {
                            activitiesByType[type] = { count: 0, cost: 0, duration: 0 };
                        }
                        activitiesByType[type].count++;
                        activitiesByType[type].cost += cost;
                        
                        // Ajouter la durée si disponible
                        if (activity.duration) {
                            activitiesByType[type].duration += 
                                (activity.duration.days || 0) * 24 * 60 +
                                (activity.duration.hours || 0) * 60 +
                                (activity.duration.minutes || 0);
                        }
                    });
                } catch (error) {
                    console.error('Erreur lors du chargement des activités:', error);
                }
            }
        }
        
        console.log('Synthèse: Coût total final:', totalCost);
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
     * Formater le coût pour l'affichage
     */
    formatCost(cost) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(cost);
    },
    
    /**
     * Créer le contenu HTML de la synthèse
     */
    async createSyntheseContent() {
        // Calculer les statistiques
        const duration = this.calculateTotalDuration();
        const costData = await this.calculateTotalCost();
        
        return `
            <div class="synthese-content">
                <div class="synthese-header">
                    <h2>Synthèse du voyage</h2>
                    <div class="synthese-stats">
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
                                <span class="material-icons">euro</span>
                            </div>
                            <div class="stat-info">
                                <div class="stat-value">${this.formatCost(costData.totalCost)}</div>
                                <div class="stat-label">Coût total</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="synthese-charts">
                    <div class="chart-section">
                        <div class="chart-header">
                            <h3>Répartition du budget</h3>
                            <div class="chart-controls">
                                <select class="chart-type-select" id="budgetChartType">
                                    <option value="budget">Budget</option>
                                    <option value="duration">Durée</option>
                                </select>
                                <button class="chart-config-btn" onclick="Synthèse.showChartConfig()">
                                    <span class="material-icons">settings</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="chart-container">
                            <div class="chart-placeholder">
                                <div class="chart-placeholder-content">
                                    <span class="material-icons">pie_chart</span>
                                    <p>Graphique de répartition</p>
                                    <small>Configuration des graphiques à venir</small>
                                </div>
                            </div>
                            
                            <!-- Conteneur pour le graphique futur -->
                            <div class="chart-canvas" id="syntheseChart" style="display: none;">
                                <!-- Le graphique sera inséré ici -->
                            </div>
                        </div>
                        
                        <div class="chart-legend" id="chartLegend">
                            <!-- Légende générée dynamiquement -->
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
     * Afficher la configuration des graphiques
     */
    showChartConfig() {
        showInfoSnackBar('Configuration des graphiques à venir');
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
