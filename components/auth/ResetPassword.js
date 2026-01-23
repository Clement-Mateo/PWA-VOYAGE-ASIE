// Composant ResetPassword pour la réinitialisation du mot de passe
const ResetPassword = {
    // État du composant
    isInitialized: false,

    // Template HTML
    template: `
        <div class="auth-container" id="resetPasswordContainer">
            <div class="auth-card">
                <div class="auth-content">
                    <h1 class="auth-title">Mot de passe oublié</h1>
                    <p class="auth-subtitle">Entrez votre adresse email pour recevoir un lien de réinitialisation</p>
                    
                    <div class="auth-form-container">
                        <div class="reset-password-form" id="resetPasswordForm">
                            <input type="email" class="auth-form-input" id="resetEmail" placeholder="votre@email.com" autocomplete="email">
                            
                            <button class="auth-btn-primary" onclick="ResetPassword.resetPassword()">Envoyer le lien</button>
                        </div>
                    </div>
                    
                    <div class="auth-links">
                        <p class="auth-text">
                            <a href="#" class="auth-link" onclick="ResetPassword.backToLogin()">Retour à la connexion</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Initialisation du composant
    init() {
        console.log('ResetPassword.init() appelé');
        
        if (this.isInitialized) {
            console.log('ResetPassword déjà initialisé');
            return;
        }
        
        // Créer le conteneur de réinitialisation s'il n'existe pas
        let container = document.getElementById('resetPasswordContainerWrapper');
        if (!container) {
            container = document.createElement('div');
            container.id = 'resetPasswordContainerWrapper';
            document.body.appendChild(container);
        }
        
        container.innerHTML = this.template;
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('ResetPassword initialisé avec succès');
    },

    // Configuration des écouteurs d'événements
    setupEventListeners() {
        // Gérer la soumission avec la touche Entrée
        const resetEmail = document.getElementById('resetEmail');

        if (resetEmail) resetEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.resetPassword();
        });

        console.log('Écouteurs d\'événements ResetPassword configurés');
    },

    // Afficher la page de réinitialisation
    show() {
        console.log('ResetPassword.show() appelé');
        
        if (!this.isInitialized) {
            this.init();
        }
        
        const container = document.getElementById('resetPasswordContainerWrapper');
        if (container) {
            container.style.display = 'flex';
        }
        
        // Masquer la carte
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.display = 'none';
        }
        
        // Masquer les boutons flottants
        const authBtn = document.querySelector('.auth-btn');
        const destinationsBtn = document.querySelector('.destinations-toggle-btn');
        if (authBtn) authBtn.style.display = 'none';
        if (destinationsBtn) destinationsBtn.style.display = 'none';
        
        this.resetForm();
    },

    // Masquer la page de réinitialisation
    hide() {
        console.log('ResetPassword.hide() appelé');
        
        const container = document.getElementById('resetPasswordContainerWrapper');
        if (container) {
            container.style.display = 'none';
        }
        
        // Afficher la carte
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.display = 'block';
        }
        
        // Afficher les boutons flottants si l'utilisateur est connecté
        if (window.firebaseService && window.firebaseService.isAuthenticated()) {
            const authBtn = document.querySelector('.auth-btn');
            const destinationsBtn = document.querySelector('.destinations-toggle-btn');
            if (authBtn) authBtn.style.display = 'flex';
            if (destinationsBtn) destinationsBtn.style.display = 'block';
        }
    },

    // Réinitialiser le mot de passe
    async resetPassword() {
        const email = document.getElementById('resetEmail').value;
        
        console.log('Tentative de réinitialisation pour:', email);
        
        if (!email) {
            showErrorSnackBar('Veuillez entrer votre adresse email');
            return;
        }
        
        if (!this.validateEmail(email)) {
            showErrorSnackBar('Veuillez entrer une adresse email valide');
            return;
        }
        
        // Désactiver le bouton pendant l'envoi
        this.setLoadingState(true);
        
        try {
            // Utiliser firebaseService pour la réinitialisation
            if (window.firebaseService) {
                console.log('Appel de firebaseService.resetPassword...');
                const success = await window.firebaseService.resetPassword(email);
                
                if (success) {
                    console.log('Email de réinitialisation envoyé à:', email);
                    
                    // Afficher un message de succès
                    showSuccessSnackBar('Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.');
                    
                    // Réinitialiser le champ email
                    document.getElementById('resetEmail').value = '';
                    
                    // Revenir à la connexion après 3 secondes
                    setTimeout(() => {
                        this.backToLogin();
                    }, 3000);
                } else {
                    console.error('Échec de l\'envoi de l\'email de réinitialisation');
                    showErrorSnackBar('Échec de l\'envoi de l\'email. Vérifiez l\'adresse email.');
                }
            } else {
                console.error('FirebaseService non disponible pour la réinitialisation');
                showErrorSnackBar('Service Firebase non disponible');
            }
            
        } catch (error) {
            console.error('Erreur de réinitialisation:', error);
            let errorMessage = 'Erreur lors de la réinitialisation';
            
            // Gérer les erreurs Firebase spécifiques
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email invalide';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'Aucun compte trouvé avec cet email';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Trop de demandes. Réessayez plus tard';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            showErrorSnackBar(errorMessage);
        } finally {
            // Réactiver le bouton
            this.setLoadingState(false);
        }
    },

    // Retour à la connexion
    backToLogin() {
        console.log('Retour à la page de connexion');
        
        // Masquer la page de réinitialisation
        this.hide();
        
        // Afficher la page de connexion
        if (window.Login) {
            window.Login.show();
        }
    },

    // Valider un email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Réinitialiser le formulaire
    resetForm() {
        document.getElementById('resetEmail').value = '';
        
        // Effacer les messages d'erreur
        this.clearMessages();
    },

    // Gérer l'état de chargement
    setLoadingState(isLoading) {
        const button = document.querySelector('.auth-btn-primary');
        
        if (isLoading) {
            button.disabled = true;
            showLoading();
        } else {
            button.disabled = false;
            hideLoading();
        }
    },

    // Effacer tous les messages
    clearMessages() {
        const errors = document.querySelectorAll('.auth-error');
        const successes = document.querySelectorAll('.auth-success');
        
        errors.forEach(error => error.remove());
        successes.forEach(success => success.remove());
    }
};

// Le composant est disponible globalement via window.ResetPassword
window.ResetPassword = ResetPassword;
