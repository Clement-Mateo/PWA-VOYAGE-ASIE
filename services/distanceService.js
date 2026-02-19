/**
 * Service de calcul de distances entre destinations
 */

class DistanceService {
    constructor() {
        this.openRouteServiceKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImViMmFhNzZiYWM3MjQyYTliNzI1NDY2OWE3ZWQzODg4IiwiaCI6Im11cm11cjY0In0=';
    }

    /**
     * Calculer la distance à vol d'oiseau entre deux points
     * Utilise la formule de Haversine
     */
    calculateStraightDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Rayon de la Terre en km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance en km
    }

    /**
     * Convertir degrés en radians
     */
    toRad(deg) {
        return deg * (Math.PI/180);
    }

    /**
     * Calculer la distance et la durée par route avec OpenRouteService
     */
    async calculateRouteDistance(lat1, lon1, lat2, lon2, transportType = 'driving-car') {
        try {
            const url = `https://api.openrouteservice.org/v2/directions/${transportType}`;
            const body = JSON.stringify({
                coordinates: [[lon1, lat1], [lon2, lat2]],
                units: 'km'
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openRouteServiceKey || 'demo'}`
                },
                body: body
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('📄 Réponse API OpenRouteService:', data);
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                console.log('🛣️ Route trouvée:', route.summary);
                return {
                    distance: route.summary.distance, // en km
                    duration: route.summary.duration, // en secondes
                    type: transportType
                };
            }
            
            console.warn('⚠️ Aucune route trouvée dans la réponse');
            return null;
        } catch (error) {
            console.error('Erreur calcul route distance:', error);
            return null;
        }
    }

    /**
     * Déterminer le type de transport par défaut et calculer la distance
     */
    async determineDefaultTransport(lat1, lon1, lat2, lon2) {
        console.log('🧭 determineDefaultTransport appelé avec:', { lat1, lon1, lat2, lon2 });
        
        // Calculer distance à vol d'oiseau pour déterminer le type
        const straightDistance = this.calculateStraightDistance(lat1, lon1, lat2, lon2);
        console.log(`📏 Distance calculée: ${straightDistance} km`);
        
        // Déterminer le type de transport par défaut
        const defaultType = straightDistance > 200 ? 'avion' : 'voiture';
        console.log(`${straightDistance > 200 ? '✈️' : '🚗'} Distance ${straightDistance > 200 ? '>' : '≤'} 200km, choix ${defaultType}`);
        
        // Calculer distance et durée avec le type déterminé
        return await this.calculateDistanceAndDuration(lat1, lon1, lat2, lon2, defaultType);
    }

    /**
     * Estimer la durée selon le type de transport (fallback)
     */
    estimateDurationByType(distanceKm, type) {
        console.log('🧭 estimateDurationByType appelé avec:', { distanceKm, type });
        
        const speeds = {
            'voiture': 80,    // km/h moyen
            'velo': 15,      // km/h moyen
            'a pied': 5      // km/h moyen
        };
        
        if (type === 'avion') {
            // Temps de vol moyen : 800km/h + 1h au sol (décollage/atterrissage)
            const flightHours = distanceKm / 800;
            const totalHours = flightHours + 1;
            
            const hours = Math.floor(totalHours);
            const minutes = Math.round((totalHours - hours) * 60);
            
            // Retourner un format cohérent avec days=0 pour les transports
            return { days: 0, hours: hours, minutes: minutes };
        } else {
            const speed = speeds[type] || 80;
            const hours = Math.floor(distanceKm / speed);
            const minutes = Math.round((distanceKm / speed - hours) * 60);
            
            // Retourner un format cohérent avec days=0 pour les transports
            return { days: 0, hours: hours, minutes: minutes };
        }
    }

    /**
     * Calculer distance et durée pour un type de transport spécifique
     */
    async calculateDistanceAndDuration(lat1, lon1, lat2, lon2, transportType) {
        console.log('🧭 calculateDistanceAndDuration appelé avec:', { lat1, lon1, lat2, lon2, transportType });
        
        // Calculer distance à vol d'oiseau
        const straightDistance = this.calculateStraightDistance(lat1, lon1, lat2, lon2);
        console.log(`📏 Distance calculée: ${straightDistance} km`);
        
        let distance, duration, isStraightLine;
        
        if (transportType === 'avion') {
            // Avion : distance vol d'oiseau + temps de vol
            distance = Math.round(straightDistance);
            duration = this.estimateDurationByType(straightDistance, 'avion');
            isStraightLine = true;
            console.log(`✈️ Calcul avion: ${distance}km, ${duration.hours}h${duration.minutes}min`);
        } else if (transportType === 'train' || transportType === 'bus') {
            // Transport en commun : estimations réalistes
            const transitData = await this.calculateTransitDistance(lat1, lon1, lat2, lon2, transportType);
            if (transitData) {
                distance = transitData.distance;
                duration = transitData.duration;
                isStraightLine = false; // Distance réelle estimée
                console.log(`🚌 ${transportType}: ${distance}km, ${duration.hours}h${duration.minutes}min`);
            }
            
            // Fallback si calcul échoue
            if (!distance) {
                distance = Math.round(straightDistance);
                duration = this.estimateDurationByType(straightDistance, transportType);
                isStraightLine = true;
                console.log(`🔄 Fallback ${transportType}: ${distance}km, ${duration.hours}h${duration.minutes}min`);
            }
        } else {
            // Transport terrestre : essayer API route, sinon vol d'oiseau
            try {
                console.log('🌐 Tentative API OpenRouteService...');
                const apiProfile = this.getApiProfile(transportType);
                const routeData = await this.calculateRouteDistance(lat1, lon1, lat2, lon2, apiProfile);
                if (routeData) {
                    distance = Math.round(routeData.distance);
                    duration = this.secondsToDuration(routeData.duration);
                    isStraightLine = false;
                    console.log(`🛣️ Calcul route (${transportType}): ${distance}km, ${duration.hours}h${duration.minutes}min`);
                }
            } catch (error) {
                console.warn('⚠️ API route indisponible, utilisation vol d\'oiseau:', error.message);
            }
            
            // Fallback si API a échoué
            if (!distance) {
                distance = Math.round(straightDistance);
                duration = this.estimateDurationByType(straightDistance, transportType);
                isStraightLine = true;
                console.log(`🔄 Fallback (${transportType}): ${distance}km, ${duration.hours}h${duration.minutes}min`);
            }
        }
        
        return {
            type: transportType,
            distance: distance,
            duration: duration,
            isStraightLine: isStraightLine
        };
    }

    /**
     * Estimer distance et durée pour transport en commun (train/bus)
     */
    async calculateTransitDistance(lat1, lon1, lat2, lon2, transportType) {
        try {
            console.log(`🚌 Calcul ${transportType} avec estimations réalistes`);
            
            // Calculer distance à vol d'oiseau
            const straightDistance = this.calculateStraightDistance(lat1, lon1, lat2, lon2);
            
            // Facteurs de distance réelle vs vol d'oiseau selon le type
            const distanceFactors = {
                'train': 1.2,  // Les trains sont assez directs
                'bus': 1.5     // Les bus suivent les routes, moins directs
            };
            
            // Vitesses moyennes réelles
            const averageSpeeds = {
                'train': {
                    short: 80,   // km/h pour les trajets courts (<100km)
                    medium: 120, // km/h pour les trajets moyens (100-300km) 
                    long: 160    // km/h pour les trajets longs (>300km)
                },
                'bus': {
                    short: 40,   // km/h pour les trajets courts (avec arrêts fréquents)
                    medium: 50,  // km/h pour les trajets moyens
                    long: 60     // km/h pour les trajets longue distance
                }
            };
            
            // Calculer la distance réelle estimée
            const realDistance = straightDistance * (distanceFactors[transportType] || 1.3);
            
            // Déterminer la vitesse selon la distance
            const speeds = averageSpeeds[transportType];
            let speed;
            if (realDistance < 100) {
                speed = speeds.short;
            } else if (realDistance < 300) {
                speed = speeds.medium;
            } else {
                speed = speeds.long;
            }
            
            // Calculer la durée (avec temps d'attente)
            const travelTimeHours = realDistance / speed;
            const waitingTimeHours = transportType === 'train' ? 0.5 : 0.25; // 30min train, 15min bus
            const totalHours = travelTimeHours + waitingTimeHours;
            
            const hours = Math.floor(totalHours);
            const minutes = Math.round((totalHours - hours) * 60);
            
            console.log(`🚌 ${transportType}: ${realDistance.toFixed(1)}km réels, ${speed}km/h moyen, ${hours}h${minutes}min trajet`);
            
            return {
                distance: Math.round(realDistance),
                duration: { hours, minutes },
                type: transportType
            };
            
        } catch (error) {
            console.warn('⚠️ Erreur calcul transport en commun:', error.message);
            return null;
        }
    }

    /**
     * Obtenir le profil API OpenRouteService selon le type de transport
     */
    getApiProfile(transportType) {
        const profiles = {
            'voiture': 'driving-car',
            'velo': 'cycling-regular',
            'a pied': 'foot-walking',
            'train': 'driving-car',    // Pas de profil train, fallback vers voiture
            'bus': 'driving-car'       // Pas de profil bus, fallback vers voiture
        };
        return profiles[transportType] || 'driving-car';
    }

    /**
     * Convertir les secondes en objet durée
     */
    secondsToDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.round((seconds % 3600) / 60);
        
        return { hours, minutes };
    }

    /**
     * Calculer le décalage en jours pour l'arrivée selon le type et durée du transport
     * @param {Object} transportation - Objet transport avec type et duration {days, hours, minutes}
     * @returns {number} - 0 pour arrivée même jour, 1 pour lendemain
     */
    calculateArrivalDayOffset(transportation) {
        // Si la case "Arrivée le lendemain" est explicitement cochée, utiliser cette valeur
        if (transportation && typeof transportation.arrivalNextDay === 'boolean') {
            const offset = transportation.arrivalNextDay ? 1 : 0;
            console.log(`📅 Case "Arrivée le lendemain": ${transportation.arrivalNextDay ? 'cochée' : 'décochée'} → offset: ${offset}`);
            return offset;
        }
        
        // Si pas de transport, arrivée lendemain par défaut
        if (!transportation || !transportation.duration) {
            console.log('⚠️ Aucun temps de transport disponible, arrivée lendemain par défaut');
            return 1;
        }

        // Convertir la durée en heures depuis le format {days, hours, minutes}
        let transportHours;
        if (typeof transportation.duration === 'object' && transportation.duration.hours !== undefined) {
            // Format {days, hours, minutes}
            transportHours = transportation.duration.hours + (transportation.duration.minutes || 0) / 60;
        } else {
            console.log('⚠️ Format de durée non reconnu, arrivée lendemain par défaut');
            return 1;
        }
        
        const transportType = transportation.type;

        console.log(`🚗 Analyse du transport: ${transportType} - ${transportHours.toFixed(1)}h`);

        // Définir les seuils selon le type de transport
        let maxHoursForSameDay;
        
        if (['avion', 'bus', 'train'].includes(transportType)) {
            maxHoursForSameDay = 19; // Transports publics : 19h max
        } else if (['voiture', 'velo', 'a pied'].includes(transportType)) {
            maxHoursForSameDay = 10; // Transports individuels : 10h max
        } else {
            maxHoursForSameDay = 18; // Autres types : 18h par défaut
        }

        const offset = transportHours <= maxHoursForSameDay ? 0 : 1;
        
        if (offset === 0) {
            console.log(`✅ Trajet ${transportType} ≤ ${maxHoursForSameDay}h : arrivée même jour`);
        } else {
            console.log(`🌙 Trajet ${transportType} > ${maxHoursForSameDay}h : arrivée lendemain`);
        }

        return offset;
    }
}

// Export pour utilisation globale
window.DistanceService = DistanceService;
window.distanceService = new DistanceService();
