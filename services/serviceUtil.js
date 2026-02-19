// ========================================
// SERVICES UTILITAIRES CENTRALISÉS
// ========================================

/**
 * Affiche un snackbar d'erreur avec le style de l'application
 * @param {string} errorMessage - Message d'erreur à afficher
 */
function showErrorSnackBar(errorMessage) {
    // Créer l'élément snackbar s'il n'existe pas
    let snackbar = document.getElementById('errorSnackBar');
    if (!snackbar) {
        snackbar = document.createElement('div');
        snackbar.id = 'errorSnackBar';
        snackbar.className = 'snackbar error-snackbar';
        
        // Ajouter le HTML du snackbar
        snackbar.innerHTML = `
            <div class="snackbar-content">
                <span class="material-icons snackbar-icon">error</span>
                <span class="snackbar-message"></span>
            </div>
        `;
        
        // Ajouter au body
        document.body.appendChild(snackbar);
        
        // Ajouter l'événement de clic pour fermer instantanément
        snackbar.addEventListener('click', () => {
            snackbar.classList.remove('show');
        });
    }
    
    // Mettre à jour le message
    const messageElement = snackbar.querySelector('.snackbar-message');
    if (messageElement) {
        messageElement.textContent = errorMessage;
    }
    
    // Afficher le snackbar
    snackbar.classList.add('show');
    
    // Masquer automatiquement après 4 secondes
    setTimeout(() => {
        snackbar.classList.remove('show');
    }, 4000);
}

/**
 * Affiche un snackbar de succès avec le style de l'application
 * @param {string} successMessage - Message de succès à afficher
 */
function showSuccessSnackBar(successMessage) {
    // Créer l'élément snackbar s'il n'existe pas
    let snackbar = document.getElementById('successSnackBar');
    if (!snackbar) {
        snackbar = document.createElement('div');
        snackbar.id = 'successSnackBar';
        snackbar.className = 'snackbar success-snackbar';
        
        // Ajouter le HTML du snackbar
        snackbar.innerHTML = `
            <div class="snackbar-content">
                <span class="material-icons snackbar-icon">check_circle</span>
                <span class="snackbar-message"></span>
            </div>
        `;
        
        // Ajouter au body
        document.body.appendChild(snackbar);
        
        // Ajouter l'événement de clic pour fermer instantanément
        snackbar.addEventListener('click', () => {
            snackbar.classList.remove('show');
        });
    }
    
    // Mettre à jour le message
    const messageElement = snackbar.querySelector('.snackbar-message');
    if (messageElement) {
        messageElement.textContent = successMessage;
    }
    
    // Afficher le snackbar
    snackbar.classList.add('show');
    
    // Masquer automatiquement après 3 secondes
    setTimeout(() => {
        snackbar.classList.remove('show');
    }, 3000);
}

/**
 * Affiche un snackbar d'information avec le style de l'application
 * @param {string} infoMessage - Message d'information à afficher
 */
function showInfoSnackBar(infoMessage) {
    // Créer l'élément snackbar s'il n'existe pas
    let snackbar = document.getElementById('infoSnackBar');
    if (!snackbar) {
        snackbar = document.createElement('div');
        snackbar.id = 'infoSnackBar';
        snackbar.className = 'snackbar info-snackbar';
        
        // Ajouter le HTML du snackbar
        snackbar.innerHTML = `
            <div class="snackbar-content">
                <span class="material-icons snackbar-icon">info</span>
                <span class="snackbar-message"></span>
            </div>
        `;
        
        // Ajouter au body
        document.body.appendChild(snackbar);
        
        // Ajouter l'événement de clic pour fermer instantanément
        snackbar.addEventListener('click', () => {
            snackbar.classList.remove('show');
        });
    }
    
    // Mettre à jour le message
    const messageElement = snackbar.querySelector('.snackbar-message');
    messageElement.textContent = infoMessage;
    
    // Afficher le snackbar
    snackbar.classList.add('show');
    
    // Masquer automatiquement après 3.5 secondes
    setTimeout(() => {
        snackbar.classList.remove('show');
    }, 3500);
}

// Exporter globalement pour utilisation dans toute l'application
window.showErrorSnackBar = showErrorSnackBar;
window.showSuccessSnackBar = showSuccessSnackBar;
window.showInfoSnackBar = showInfoSnackBar;

/**
 * Affiche l'overlay de loading global
 */
function showLoading() {
    console.log('GLOBAL LOADING : ON');

    const overlay = document.getElementById('loadingOverlay');
    const body = document.body;
    
    if (overlay) {
        // Ajouter les classes seulement si elles ne sont pas déjà présentes
        if (!overlay.classList.contains('active')) {
            overlay.classList.add('active');
        }
        
        if (!body.classList.contains('loading-active')) {
            body.classList.add('loading-active');
        }
    } else {
        console.error('❌ Overlay de loading non trouvé dans le DOM');
    }
}

/**
 * Masque l'overlay de loading global
 */
function hideLoading() {
    console.log('GLOBAL LOADING : OFF');

    const overlay = document.getElementById('loadingOverlay');
    const body = document.body;
    
    if (overlay) {
        // Supprimer les classes seulement si elles sont présentes
        if (overlay.classList.contains('active')) {
            overlay.classList.remove('active');
        }
        
        if (body.classList.contains('loading-active')) {
            body.classList.remove('loading-active');
        }
    }
}

// Exporter les fonctions de loading
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// ========================================
// UTILITAIRES UI CENTRALISÉS
// ========================================

/**
 * Affiche un spinner de chargement sur un bouton (méthode universelle)
 * @param {HTMLElement|string} target - Élément bouton ou sélecteur CSS
 * @param {string} text - Texte à afficher pendant le chargement
 */
function showButtonLoading(target, text = 'Chargement...') {
    let button;
    
    // Si c'est un sélecteur, trouver l'élément
    if (typeof target === 'string') {
        button = document.querySelector(target);
    } else {
        button = target;
    }
    
    if (!button) return;
    
    button.disabled = true;
    button.innerHTML = `<svg class="loading-spinner-small" viewBox="0 0 24 24" style="overflow: visible;"><circle cx="12" cy="12" r="10" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416 31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dashoffset" from="31.416" to="0" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg> ${text}`;
}

/**
 * Restaure l'état normal d'un bouton (méthode universelle)
 * @param {HTMLElement|string} target - Élément bouton ou sélecteur CSS
 * @param {string} text - Texte à afficher après restauration
 * @param {string} icon - Icône Material Icons
 */
function restoreButton(target, text = 'Bouton', icon = 'save') {
    let button;
    
    // Si c'est un sélecteur, trouver l'élément
    if (typeof target === 'string') {
        button = document.querySelector(target);
    } else {
        button = target;
    }
    
    if (!button) return;
    
    button.disabled = false;
    button.innerHTML = `<span class="material-icons">${icon}</span> ${text}`;
}

// Exporter les fonctions utilitaires
window.showButtonLoading = showButtonLoading;
window.restoreButton = restoreButton;

/**
 * Échapper les caractères HTML pour éviter les attaques XSS
 * @param {string} text - Texte à échapper
 * @returns {string} - Texte échappé
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Exporter la fonction escapeHtml
window.escapeHtml = escapeHtml;

/**
 * Valider une adresse email
 * @param {string} email - Email à valider
 * @returns {boolean} - True si l'email est valide
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Exporter la fonction validateEmail
window.validateEmail = validateEmail;

/**
 * Formater une durée pour l'affichage
 * @param {Object} duration - Objet durée avec days, hours, minutes
 * @param {boolean} includeDays - Inclure les jours dans le formatage (défaut: true)
 * @returns {string} - Durée formatée
 */
function formatDuration(duration, includeDays = true) {
    if (!duration) return 'Aucune durée';
    
    const parts = [];
    if (includeDays && duration.days > 0) parts.push(`${duration.days}j`);
    if (duration.hours > 0) parts.push(`${duration.hours}h`);
    if (duration.minutes > 0) parts.push(`${duration.minutes}min`);
    
    return parts.length > 0 ? parts.join(' ') : 'Aucune durée';
}

// Exporter la fonction formatDuration
window.formatDuration = formatDuration;

/**
 * Parser une durée au format "2h30" en heures et minutes
 * @param {string} duration - Durée au format texte
 * @returns {Object} - Objet { hours, minutes }
 */
function parseDuration(duration) {
    if (!duration || typeof duration !== 'string') {
        return { hours: 0, minutes: 0 };
    }
    
    // Chercher le format "XhY" ou "Xh" ou "Y"
    const hoursMatch = duration.match(/(\d+)h/);
    const minutesMatch = duration.match(/h(\d+)|(\d+)$/);
    
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1] || minutesMatch[2], 10) : 0;
    
    return { hours, minutes };
}

// Exporter la fonction parseDuration
window.parseDuration = parseDuration;

/**
 * Extraire la durée en jours depuis l'objet duration
 * @param {Object} duration - Objet duration {days, hours, minutes}
 * @returns {Number} Durée en jours (minimum 3 si non spécifié ou 0)
 */
function extractDurationInDays(duration) {
    let durationInDays;
    
    if (duration && typeof duration === 'object' && duration.days !== undefined) {
        durationInDays = duration.days;
    }
    
    // Si pas de durée ou durée = 0, utiliser 3 jours par défaut
    if (!durationInDays || durationInDays === 0) {
        durationInDays = 3;
    }
    
    return durationInDays;
}

// Exporter la fonction extractDurationInDays
window.extractDurationInDays = extractDurationInDays;
