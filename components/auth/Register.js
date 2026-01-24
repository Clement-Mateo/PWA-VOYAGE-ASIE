// Composant Register pour l'inscription
const Register = {
    // État du composant
    isInitialized: false,

    // Template HTML
    template: `
        <div class="auth-container" id="registerContainer">
            <div class="auth-card">
                <div class="auth-content">
                    <h1 class="auth-title">Inscription</h1>
                    
                    <div class="auth-form-container">
                        <div class="register-form" id="registerForm">
                            <input type="text" class="auth-form-input" id="registerName" placeholder="Votre nom complet" autocomplete="name">
                            
                            <input type="email" class="auth-form-input" id="registerEmail" placeholder="votre@email.com" autocomplete="email">
                            
                            <input type="password" class="auth-form-input" id="registerPassword" placeholder="••••••••" autocomplete="new-password">
                            
                            <input type="password" class="auth-form-input" id="confirmPassword" placeholder="Confirmer le mot de passe" autocomplete="new-password">
                            
                            <button class="auth-btn-primary" onclick="Register.register()">S'inscrire</button>
                        </div>
                    </div>
                    
                    <div class="auth-links">
                        <p class="auth-text">
                            Déjà un compte ? 
                            <a href="#" class="auth-link" onclick="Register.backToLogin()">Se connecter</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Initialisation du composant
    init() {
        console.log('Register.init() appelé');
        
        if (this.isInitialized) {
            console.log('Register déjà initialisé');
            return;
        }
        
        // Créer le conteneur d'inscription s'il n'existe pas
        let container = document.getElementById('registerContainerWrapper');
        if (!container) {
            container = document.createElement('div');
            container.id = 'registerContainerWrapper';
            document.body.appendChild(container);
        }
        
        container.innerHTML = this.template;
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('Register initialisé avec succès');
    },

    // Configuration des écouteurs d'événements
    setupEventListeners() {
        // Gérer la soumission avec la touche Entrée
        const registerName = document.getElementById('registerName');
        const registerEmail = document.getElementById('registerEmail');
        const registerPassword = document.getElementById('registerPassword');
        const confirmPassword = document.getElementById('confirmPassword');

        if (registerName) registerName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.register();
        });
        if (registerEmail) registerEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.register();
        });
        if (registerPassword) registerPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.register();
        });
        if (confirmPassword) confirmPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.register();
        });

        console.log('Écouteurs d\'événements Register configurés');
    },

    // Afficher la page d'inscription
    show() {
        console.log('Register.show() appelé');
        
        if (!this.isInitialized) {
            this.init();
        }
        
        const container = document.getElementById('registerContainerWrapper');
        if (container) {
            container.style.display = 'flex';
        }
        
        // Masquer la carte
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.display = 'none';
        }
        
        this.resetForm();
    },

    // Masquer la page d'inscription
    hide() {
        console.log('Register.hide() appelé');
        
        const container = document.getElementById('registerContainerWrapper');
        if (container) {
            container.style.display = 'none';
        }
        
        // Afficher la carte
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.display = 'block';
        }
    },

    // Inscription
    async register() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        console.log('Tentative d\'inscription avec:', email);
        
        if (!name || !email || !password || !confirmPassword) {
            showErrorSnackBar('Veuillez remplir tous les champs');
            return;
        }
        
        if (password !== confirmPassword) {
            showErrorSnackBar('Les mots de passe ne correspondent pas');
            return;
        }
        
        if (password.length < 6) {
            showErrorSnackBar('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }
        
        if (!this.validateEmail(email)) {
            showErrorSnackBar('Veuillez entrer une adresse email valide');
            return;
        }
        
        // Désactiver le bouton et afficher le loading
        const button = document.querySelector('.auth-btn-primary');
        if (button) button.disabled = true;
        window.showLoading();
        
        try {
            // Utiliser firebaseService pour l'inscription
            if (window.firebaseService) {
                console.log('Appel de firebaseService.signUp...');
                const user = await window.firebaseService.signUp(email, password);
                
                if (user) {
                    console.log('Inscription réussie:', user.email);
                    
                    // Masquer la page d'inscription
                    this.hide();
                    
                    // Afficher un message de succès avec snackbar
                    showSuccessSnackBar('Inscription réussie ! Bienvenue');
                } else {
                    console.error('Échec de l\'inscription');
                    showErrorSnackBar('Échec de l\'inscription');
                }
            } else {
                console.error('FirebaseService non disponible pour l\'inscription');
                showErrorSnackBar('Service Firebase non disponible');
            }
            
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            let errorMessage = 'Erreur d\'inscription';
            
            // Gérer les erreurs Firebase spécifiques
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Cet email est déjà utilisé';
                showErrorSnackBar(errorMessage);
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email invalide';
                showErrorSnackBar(errorMessage);
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'Opération non autorisée';
                showErrorSnackBar(errorMessage);
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Mot de passe trop faible';
                showErrorSnackBar(errorMessage);
            } else if (error.message) {
                errorMessage = error.message;
                showErrorSnackBar(errorMessage);
            } else {
                showErrorSnackBar(errorMessage);
            }
        } finally {
            // Réactiver le bouton et masquer le loading
            const button = document.querySelector('.auth-btn-primary');
            if (button) button.disabled = false;
            window.hideLoading();
        }
    },

    // Retour à la connexion
    backToLogin() {
        console.log('Retour à la page de connexion');
        
        // Masquer la page d'inscription
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
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        // Effacer les messages d'erreur
        this.clearMessages();
    },

    // Effacer tous les messages
    clearMessages() {
        const errors = document.querySelectorAll('.auth-error');
        const successes = document.querySelectorAll('.auth-success');
        
        errors.forEach(error => error.remove());
        successes.forEach(success => success.remove());
    }
};

// Le composant est disponible globalement via window.Register
window.Register = Register;
