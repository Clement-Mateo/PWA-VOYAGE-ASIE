/**
 * Service de gestion des itinéraires
 * Stocke et gère les destinations ajoutées par l'utilisateur
 */

class ItinerariesService {
    constructor() {
        // Liste des points de destination
        this.points = [];
    }

    /**
     * Ajoute une destination à l'itinéraire
     * @param {Object} addressData - Données de l'adresse depuis l'API
     * @param {number} days - Nombre de jours
     * @param {number} hours - Nombre d'heures
     * @param {number} minutes - Nombre de minutes
     * @returns {Object} Le point ajouté
     */
    addDestination(addressData, days, hours, minutes) {
        const point = {
            Address: {
                street_number: addressData.address.street_number || '',
                route: addressData.address.route || '',
                locality: addressData.address.locality || '',
                administrative_area_level_2: addressData.address.administrative_area_level_2 || '',
                administrative_area_level_1: addressData.address.administrative_area_level_1 || '',
                country: addressData.address.country || '',
                postal_code: addressData.address.postal_code || '',
                formatted_address: addressData.display_name || '',
                location: {
                    lat: parseFloat(addressData.lat),
                    lng: parseFloat(addressData.lng)
                }
            },
            days: parseInt(days) || 0,
            hours: parseInt(hours) || 0,
            minutes: parseInt(minutes) || 0
        };

        this.points.push(point);
        console.log('Destination ajoutée:', point);
        console.log('Total des destinations:', this.points.length);
        
        return point;
    }

    /**
     * Récupère tous les points de l'itinéraire
     * @returns {Array} Liste des points
     */
    getAllPoints() {
        return this.points;
    }

    /**
     * Supprime un point de l'itinéraire
     * @param {number} index - Index du point à supprimer
     * @returns {boolean} True si supprimé, false sinon
     */
    removePoint(index) {
        if (index >= 0 && index < this.points.length) {
            const removed = this.points.splice(index, 1);
            console.log('Point supprimé:', removed[0]);
            return true;
        }
        return false;
    }

    /**
     * Vide tous les points de l'itinéraire
     */
    clearAllPoints() {
        this.points = [];
        console.log('Tous les points ont été supprimés');
    }

    /**
     * Calcule la durée totale de l'itinéraire
     * @returns {Object} Durée totale en jours, heures, minutes
     */
    getTotalDuration() {
        const totalMinutes = this.points.reduce((total, point) => {
            return total + (point.days * 24 * 60) + (point.hours * 60) + point.minutes;
        }, 0);

        return {
            days: Math.floor(totalMinutes / (24 * 60)),
            hours: Math.floor((totalMinutes % (24 * 60)) / 60),
            minutes: totalMinutes % 60
        };
    }

    /**
     * Exporte l'itinéraire au format JSON
     * @returns {string} JSON de l'itinéraire
     */
    exportToJSON() {
        return JSON.stringify(this.points, null, 2);
    }

    /**
     * Importe un itinéraire depuis du JSON
     * @param {string} jsonData - JSON à importer
     * @returns {boolean} True si importé avec succès
     */
    importFromJSON(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (Array.isArray(imported)) {
                this.points = imported;
                console.log('Itinéraire importé avec succès');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erreur lors de l\'import:', error);
            return false;
        }
    }
}

// Export du service pour utilisation globale
window.itinerariesService = new ItinerariesService();
