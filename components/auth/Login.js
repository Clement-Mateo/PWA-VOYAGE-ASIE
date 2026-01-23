// Composant Login pour la connexion
const Login = {
    // État du composant
    isInitialized: false,

    // Template HTML
    template: `
        <div class="auth-container" id="loginContainer">
            <div class="auth-card">
                <div class="auth-content">
                    <h1 class="auth-title">Connexion</h1>
                    <p class="auth-subtitle">Connectez-vous pour planifier vos aventures</p>
                    
                    <div class="auth-form-container">
                        <div class="login-form" id="loginForm">
                            <input type="email" class="auth-form-input" id="loginEmail" placeholder="votre@email.com" autocomplete="email">
                            
                            <input type="password" class="auth-form-input" id="loginPassword" placeholder="••••••••" autocomplete="current-password">
                            
                            <button class="auth-btn-primary" onclick="Login.login()">Se connecter</button>
                        </div>
                    </div>
                    
                    <div class="auth-links">
                        <p class="auth-text">
                            Pas encore de compte ? 
                            <a href="#" class="auth-link" onclick="Login.goToRegister()">S'inscrire</a>
                        </p>
                        
                        <p class="auth-text">
                            <a href="#" class="auth-link" onclick="Login.goToResetPassword()">Mot de passe oublié ?</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Initialisation du composant
    init() {
        console.log('Login.init() appelé');
        
        if (this.isInitialized) {
            console.log('Login déjà initialisé');
            return;
        }
        
        // Créer le conteneur de login s'il n'existe pas
        let container = document.getElementById('loginContainerWrapper');
        if (!container) {
            container = document.createElement('div');
            container.id = 'loginContainerWrapper';
            document.body.appendChild(container);
        }
        
        container.innerHTML = this.template;
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('Login initialisé avec succès');
    },

    // Configuration des écouteurs d'événements
    setupEventListeners() {
        // Gérer la soumission avec la touche Entrée
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');

        if (loginEmail) loginEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        if (loginPassword) loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });

        console.log('Écouteurs d\'événements Login configurés');
    },

    // Afficher la page de connexion
    show() {
        console.log('Login.show() appelé');
        
        if (!this.isInitialized) {
            this.init();
        }
        
        const container = document.getElementById('loginContainerWrapper');
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

    // Masquer la page de connexion
    hide() {
        console.log('Login.hide() appelé');
        
        const container = document.getElementById('loginContainerWrapper');
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

    // Aller à la page d'inscription
    goToRegister() {
        console.log('Aller à la page d\'inscription');
        
        // Masquer la page de connexion
        this.hide();
        
        // Afficher la page d'inscription
        if (window.Register) {
            window.Register.show();
        } else {
            console.error('Composant Register non disponible');
        }
    },

    // Aller à la page de réinitialisation
    goToResetPassword() {
        console.log('Aller à la page de réinitialisation');
        
        // Masquer la page de connexion
        this.hide();
        
        // Afficher la page de réinitialisation
        if (window.ResetPassword) {
            window.ResetPassword.show();
        } else {
            console.error('Composant ResetPassword non disponible');
        }
    },

    // Connexion
    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        console.log('Tentative de connexion avec:', email);
        
        if (!email || !password) {
            showErrorSnackBar('Veuillez remplir tous les champs');
            return;
        }
        
        // Désactiver le bouton pendant la connexion
        this.setLoadingState(true);
        
        try {
            // Utiliser firebaseService pour la connexion
            if (window.firebaseService) {
                console.log('Appel de firebaseService.signIn...');
                const user = await window.firebaseService.signIn(email, password);
                
                if (user) {
                    console.log('Connexion réussie:', user.email);
                    
                    // Masquer la page de connexion
                    this.hide();
                    
                    // Afficher un message de succès avec snackbar
                    showSuccessSnackBar('Connexion réussie !');
                } else {
                    console.error('Échec de connexion');
                    showErrorSnackBar('Échec de connexion. Vérifiez vos identifiants.');
                }
            } else {
                console.error('FirebaseService non disponible');
                showErrorSnackBar('Service Firebase non disponible');
            }
            
        } catch (error) {
            console.error('Erreur de connexion:', error);
            let errorMessage = 'Erreur de connexion';
            
            // Gérer les erreurs Firebase spécifiques
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'Utilisateur non trouvé';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Mot de passe incorrect';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email invalide';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'Compte désactivé';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Trop de tentatives. Réessayez plus tard';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            showErrorSnackBar(errorMessage);
        } finally {
            // Réactiver le bouton
            this.setLoadingState(false);
        }
    },

    // Réinitialiser le formulaire
    resetForm() {
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
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

// Le composant est disponible globalement via window.Login
window.Login = Login;
