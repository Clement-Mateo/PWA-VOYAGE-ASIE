/**
 * Gestionnaire de réseau et d'état de connexion
 * Gère l'affichage hors ligne et la détection de connexion
 */

class NetworkManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.isInitialized = false;
        this.setupEventListeners();
    }

    /**
     * Initialisation du gestionnaire
     */
    async init() {
        this.isInitialized = true;
        console.log('✅ NetworkManager initialisé');
        
        // Afficher l'état initial
        this.updateNetworkStatus();
    }

    /**
     * Configuration des écouteurs d'événements
     */
    setupEventListeners() {
        window.addEventListener('online', () => {
            console.log('🌐 Connexion rétablie');
            this.isOnline = true;
            this.updateNetworkStatus();
            this.showOnlineMessage();
        });

        window.addEventListener('offline', () => {
            console.log('📱 Hors ligne');
            this.isOnline = false;
            this.updateNetworkStatus();
            this.showOfflineMessage();
        });
    }

    /**
     * Mettre à jour l'interface selon l'état de connexion
     */
    updateNetworkStatus() {
        const statusElement = document.getElementById('networkStatus');
        const offlineOverlay = document.getElementById('offlineOverlay');

        if (this.isOnline) {
            // Masquer les indicateurs hors ligne
            if (statusElement) statusElement.style.display = 'none';
            if (offlineOverlay) offlineOverlay.style.display = 'none';
            
            // Retirer la classe offline du body
            document.body.classList.remove('offline');
        } else {
            // Vérifier si l'utilisateur est authentifié avant d'afficher l'overlay
            const isAuthenticated = window.firebaseService && window.firebaseService.isAuthenticated();
            
            if (!isAuthenticated) {
                // Afficher l'overlay seulement si l'utilisateur n'est pas connecté
                if (statusElement) statusElement.style.display = 'block';
                if (offlineOverlay) offlineOverlay.style.display = 'flex';
                
                // Ajouter la classe offline au body
                document.body.classList.add('offline');
            } else {
                // Utilisateur connecté mais hors ligne : masquer l'overlay
                if (statusElement) statusElement.style.display = 'none';
                if (offlineOverlay) offlineOverlay.style.display = 'none';
                
                // Retirer la classe offline du body
                document.body.classList.remove('offline');
            }
        }
    }

    /**
     * Afficher un message de retour en ligne
     */
    showOnlineMessage() {
        if (window.showSuccessSnackBar) {
            window.showSuccessSnackBar('Connexion rétablie ! Synchronisation en cours...');
        }
    }

    /**
     * Afficher un message hors ligne
     */
    showOfflineMessage() {
        if (window.showInfoSnackBar) {
            window.showInfoSnackBar('Mode hors ligne - Les modifications seront synchronisées ultérieurement');
        }
    }

    /**
     * Vérifier si l'utilisateur est connecté et hors ligne
     */
    async checkOfflineAuth() {
        if (!this.isOnline && window.firebaseService) {
            const isAuthenticated = window.firebaseService.isAuthenticated();
            
            if (!isAuthenticated) {
                this.showOfflineAuthError();
                return false;
            }
        }
        return true;
    }

    /**
     * Afficher une page d'erreur hors ligne pour les non-connectés
     */
    showOfflineAuthError() {
        const errorHTML = `
            <div id="offlineAuthError" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                color: white;
                text-align: center;
                font-family: Arial, sans-serif;
            ">
                <div style="max-width: 400px; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📱</div>
                    <h1 style="margin-bottom: 20px;">Hors ligne</h1>
                    <p style="margin-bottom: 20px; opacity: 0.9;">
                        Vous êtes actuellement hors ligne et n'êtes pas connecté.
                    </p>
                    <p style="margin-bottom: 30px; opacity: 0.8;">
                        Veuillez vous connecter lorsque vous aurez une connexion internet
                        pour utiliser l'application.
                    </p>
                    <button onclick="location.reload()" style="
                        background: white;
                        color: #667eea;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 25px;
                        font-size: 16px;
                        cursor: pointer;
                        font-weight: bold;
                    ">
                        Actualiser
                    </button>
                </div>
            </div>
        `;
        
        document.body.innerHTML = errorHTML;
    }

    /**
     * Ajouter les éléments HTML pour l'état réseau
     */
    addNetworkElements() {
        // Indicateur de statut réseau
        const statusHTML = `
            <div id="networkStatus" style="
                position: fixed;
                top: 10px;
                right: 10px;
                background: #ff6b6b;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                z-index: 1000;
                display: none;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            ">
                📱 Hors ligne
            </div>
        `;

        // Overlay hors ligne
        const overlayHTML = `
            <div id="offlineOverlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9998;
                color: white;
                text-align: center;
            ">
                <div style="max-width: 400px; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📱</div>
                    <h2 style="margin-bottom: 20px;">Mode hors ligne</h2>
                    <p style="margin-bottom: 20px; opacity: 0.9;">
                        Vous êtes actuellement hors ligne.
                    </p>
                    <p style="margin-bottom: 20px; opacity: 0.8;">
                        Vos modifications seront synchronisées automatiquement
                        lorsque la connexion sera rétablie.
                    </p>
                    <div style="
                        display: inline-block;
                        padding: 8px 16px;
                        background: rgba(255,255,255,0.2);
                        border-radius: 20px;
                        font-size: 14px;
                    ">
                        ⏳ En attente de connexion...
                    </div>
                </div>
            </div>
        `;

        // Ajouter les éléments au body
        document.body.insertAdjacentHTML('beforeend', statusHTML);
        document.body.insertAdjacentHTML('beforeend', overlayHTML);
    }

    /**
     * Obtenir l'état actuel du réseau
     */
    getStatus() {
        return {
            isOnline: this.isOnline,
            isInitialized: this.isInitialized
        };
    }
}

// Export pour utilisation globale
window.NetworkManager = NetworkManager;
