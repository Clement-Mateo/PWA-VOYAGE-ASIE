/**
 * Service de gestion des dates pour éviter les conversions Firebase
 * Conversion standardisée entre Date JavaScript et string ISO
 */

class DateService {
    /**
     * Convertir une date en string ISO pour éviter la conversion Firebase
     * @param {Date|string|null} date - Date à convertir
     * @returns {string|null} - Date au format ISO ou null
     */
    static dateToISOString(date) {
        if (!date) return null;
        if (typeof date === 'string') {
            // Vérifier si c'est déjà une date valide
            const parsed = new Date(date);
            return isNaN(parsed.getTime()) ? null : date;
        }
        if (date instanceof Date) {
            return isNaN(date.getTime()) ? null : date.toISOString();
        }
        // Pour les nombres (timestamps) ou autres types
        const converted = new Date(date);
        return isNaN(converted.getTime()) ? null : converted.toISOString();
    }

    /**
     * Convertir une string ISO en Date JavaScript
     * @param {string|null} isoString - Date ISO à convertir
     * @returns {Date|null} - Date JavaScript ou null
     */
    static isoStringToDate(isoString) {
        if (!isoString) return null;
        if (typeof isoString !== 'string') return null;
        
        const date = new Date(isoString);
        return isNaN(date.getTime()) ? null : date;
    }

    /**
     * Formater une date pour l'affichage (format français)
     * @param {Date|string|null} date - Date à formater
     * @returns {string} - Date formatée ou "Non définie"
     */
    static formatDateForDisplay(date) {
        const jsDate = this.isoStringToDate(this.dateToISOString(date));
        if (!jsDate) return 'Non définie';
        
        const day = String(jsDate.getDate()).padStart(2, '0');
        const month = String(jsDate.getMonth() + 1).padStart(2, '0');
        const year = jsDate.getFullYear();
        
        return `${day}/${month}/${year}`;
    }

    /**
     * Obtenir la date du jour au format ISO
     * @returns {string} - Date du jour au format ISO
     */
    static todayISOString() {
        return new Date().toISOString();
    }

    /**
     * Valider si une date est valide
     * @param {any} date - Date à valider
     * @returns {boolean} - True si la date est valide
     */
    static isValidDate(date) {
        if (!date) return false;
        const jsDate = this.isoStringToDate(this.dateToISOString(date));
        return jsDate !== null;
    }

    /**
     * Comparer deux dates
     * @param {Date|string} date1 - Première date
     * @param {Date|string} date2 - Deuxième date
     * @returns {number} - -1 si date1 < date2, 0 si égal, 1 si date1 > date2
     */
    static compareDates(date1, date2) {
        const d1 = this.isoStringToDate(this.dateToISOString(date1));
        const d2 = this.isoStringToDate(this.dateToISOString(date2));
        
        if (!d1 && !d2) return 0;
        if (!d1) return -1;
        if (!d2) return 1;
        
        return d1.getTime() - d2.getTime();
    }
}

// Export pour utilisation globale
window.DateService = DateService;
