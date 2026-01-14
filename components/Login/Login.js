// Composant Login pour la connexion/inscription (remplace AuthPopup)
const Login = {
    // État du composant
    currentMode: 'login', // 'login', 'register' ou 'reset'
    isInitialized: false,

    // Template HTML
    template: `
        <div class="login-container" id="loginContainer">
            <div class="login-card">
                <div class="login-header">
                    <h1 class="login-title" id="loginTitle">Voyage Asie</h1>
                    <p class="login-subtitle" id="loginSubtitle">Connectez-vous pour planifier vos aventures</p>
                </div>
                
                <div class="login-form-container">
                    <!-- Formulaire de connexion -->
                    <div class="login-form" id="loginForm">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" id="loginEmail" placeholder="votre@email.com" autocomplete="email">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Mot de passe</label>
                            <input type="password" class="form-input" id="loginPassword" placeholder="••••••••" autocomplete="current-password">
                        </div>
                        
                        <button class="btn-login-primary" onclick="Login.login()">Se connecter</button>
                    </div>
                    
                    <!-- Formulaire d'inscription -->
                    <div class="register-form" id="registerForm" style="display: none;">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" id="registerEmail" placeholder="votre@email.com" autocomplete="email">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Mot de passe</label>
                            <input type="password" class="form-input" id="registerPassword" placeholder="••••••••" autocomplete="new-password">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Confirmer le mot de passe</label>
                            <input type="password" class="form-input" id="confirmPassword" placeholder="••••••••" autocomplete="new-password">
                        </div>
                        
                        <button class="btn-login-primary" onclick="Login.register()">S'inscrire</button>
                    </div>
                    
                    <!-- Lien pour basculer -->
                    <div class="login-switch">
                        <span id="loginSwitchText">Pas encore de compte ?</span>
                        <button class="btn-link" id="loginSwitchBtn" onclick="Login.switchMode()">S'inscrire</button>
                    </div>
                    
                    <!-- Lien mot de passe oublié (uniquement en mode login) -->
                    <div class="login-forgot-password" id="forgotPasswordSection">
                        <button class="btn-link btn-forgot-password" onclick="Login.showResetForm()">Mot de passe oublié ?</button>
                    </div>
                    
                    <!-- Formulaire de réinitialisation -->
                    <div class="reset-form" id="resetForm" style="display: none;">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" id="resetEmail" placeholder="votre@email.com" autocomplete="email">
                        </div>
                        
                        <button class="btn-login-primary" onclick="Login.resetPassword()">Envoyer le lien</button>
                        
                        <div class="reset-back">
                            <button class="btn-link" onclick="Login.backToLogin()">← Retour à la connexion</button>
                        </div>
                    </div>
                </div>
                
                <div class="login-footer">
                    <p class="login-footer-text">Application de voyage interactive</p>
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
        let container = document.getElementById('loginContainer');
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
        const registerEmail = document.getElementById('registerEmail');
        const registerPassword = document.getElementById('registerPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        const resetEmail = document.getElementById('resetEmail');

        if (loginEmail) loginEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        if (loginPassword) loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
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
        if (resetEmail) resetEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.resetPassword();
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

    // Basculer entre connexion et inscription
    switchMode() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const resetForm = document.getElementById('resetForm');
        const title = document.getElementById('loginTitle');
        const subtitle = document.getElementById('loginSubtitle');
        const switchText = document.getElementById('loginSwitchText');
        const switchBtn = document.getElementById('loginSwitchBtn');
        const forgotPasswordSection = document.getElementById('forgotPasswordSection');
        
        if (this.currentMode === 'login') {
            this.currentMode = 'register';
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            resetForm.style.display = 'none';
            title.textContent = 'Inscription';
            subtitle.textContent = 'Créez votre compte pour commencer';
            switchText.textContent = 'Déjà un compte ?';
            switchBtn.textContent = 'Se connecter';
            forgotPasswordSection.style.display = 'none';
        } else if (this.currentMode === 'register') {
            this.currentMode = 'login';
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            resetForm.style.display = 'none';
            title.textContent = 'Voyage Asie';
            subtitle.textContent = 'Connectez-vous pour planifier vos aventures';
            switchText.textContent = 'Pas encore de compte ?';
            switchBtn.textContent = 'S\'inscrire';
            forgotPasswordSection.style.display = 'block';
        } else if (this.currentMode === 'reset') {
            this.currentMode = 'login';
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            resetForm.style.display = 'none';
            title.textContent = 'Voyage Asie';
            subtitle.textContent = 'Connectez-vous pour planifier vos aventures';
            switchText.textContent = 'Pas encore de compte ?';
            switchBtn.textContent = 'S\'inscrire';
            forgotPasswordSection.style.display = 'block';
        }
    },

    // Connexion
    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        console.log('Tentative de connexion avec:', email);
        
        if (!email || !password) {
            this.showError('Veuillez remplir tous les champs');
            return;
        }
        
        // Désactiver le bouton pendant la connexion
        this.setLoadingState('login', true);
        
        try {
            // Utiliser firebaseService pour la connexion
            if (window.firebaseService) {
                console.log('Appel de firebaseService.signIn...');
                const user = await window.firebaseService.signIn(email, password);
                
                if (user) {
                    console.log('Connexion réussie:', user.email);
                    
                    // Masquer la page de connexion
                    this.hide();
                    
                    // Mettre à jour l'interface utilisateur
                    if (window.updateUserPanel) {
                        window.updateUserPanel();
                    }
                    
                    // Afficher un message de succès
                    this.showSuccess('Connexion réussie !');
                } else {
                    console.error('Échec de connexion');
                    this.showError('Échec de connexion. Vérifiez vos identifiants.');
                }
            } else {
                console.error('FirebaseService non disponible');
                this.showError('Service Firebase non disponible');
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
            
            this.showError(errorMessage);
        } finally {
            // Réactiver le bouton
            this.setLoadingState('login', false);
        }
    },

    // Inscription
    async register() {
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        console.log('Tentative d\'inscription avec:', email);
        
        if (!email || !password || !confirmPassword) {
            this.showError('Veuillez remplir tous les champs');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError('Les mots de passe ne correspondent pas');
            return;
        }
        
        if (password.length < 6) {
            this.showError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }
        
        // Désactiver le bouton pendant l'inscription
        this.setLoadingState('register', true);
        
        try {
            // Utiliser firebaseService pour l'inscription
            if (window.firebaseService) {
                console.log('Appel de firebaseService.signUp...');
                const user = await window.firebaseService.signUp(email, password);
                
                if (user) {
                    console.log('Inscription réussie:', user.email);
                    
                    // Masquer la page de connexion
                    this.hide();
                    
                    // Mettre à jour l'interface utilisateur
                    if (window.updateUserPanel) {
                        window.updateUserPanel();
                    }
                    
                    // Afficher un message de succès
                    this.showSuccess('Inscription réussie !');
                } else {
                    console.error('Échec de l\'inscription');
                    this.showError('Échec de l\'inscription');
                }
            } else {
                console.error('FirebaseService non disponible pour l\'inscription');
                this.showError('Service Firebase non disponible');
            }
            
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            let errorMessage = 'Erreur d\'inscription';
            
            // Gérer les erreurs Firebase spécifiques
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Cet email est déjà utilisé';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email invalide';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'Opération non autorisée';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Mot de passe trop faible';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showError(errorMessage);
        } finally {
            // Réactiver le bouton
            this.setLoadingState('register', false);
        }
    },

    // Afficher le formulaire de réinitialisation
    showResetForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const resetForm = document.getElementById('resetForm');
        const title = document.getElementById('loginTitle');
        const subtitle = document.getElementById('loginSubtitle');
        const forgotPasswordSection = document.getElementById('forgotPasswordSection');
        
        this.currentMode = 'reset';
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        resetForm.style.display = 'block';
        title.textContent = 'Réinitialisation';
        subtitle.textContent = 'Entrez votre email pour recevoir un lien de réinitialisation';
        forgotPasswordSection.style.display = 'none';
        
        this.clearMessages();
    },

    // Retour à la connexion
    backToLogin() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const resetForm = document.getElementById('resetForm');
        const title = document.getElementById('loginTitle');
        const subtitle = document.getElementById('loginSubtitle');
        const switchText = document.getElementById('loginSwitchText');
        const switchBtn = document.getElementById('loginSwitchBtn');
        const forgotPasswordSection = document.getElementById('forgotPasswordSection');
        
        this.currentMode = 'login';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        resetForm.style.display = 'none';
        title.textContent = 'Voyage Asie';
        subtitle.textContent = 'Connectez-vous pour planifier vos aventures';
        switchText.textContent = 'Pas encore de compte ?';
        switchBtn.textContent = 'S\'inscrire';
        forgotPasswordSection.style.display = 'block';
        
        this.clearMessages();
    },

    // Réinitialiser le mot de passe
    async resetPassword() {
        const email = document.getElementById('resetEmail').value;
        
        console.log('Tentative de réinitialisation pour:', email);
        
        if (!email) {
            this.showError('Veuillez entrer votre adresse email');
            return;
        }
        
        if (!this.validateEmail(email)) {
            this.showError('Veuillez entrer une adresse email valide');
            return;
        }
        
        // Désactiver le bouton pendant l'envoi
        this.setLoadingState('reset', true);
        
        try {
            // Utiliser firebaseService pour la réinitialisation
            if (window.firebaseService) {
                console.log('Appel de firebaseService.resetPassword...');
                const success = await window.firebaseService.resetPassword(email);
                
                if (success) {
                    console.log('Email de réinitialisation envoyé à:', email);
                    
                    // Afficher un message de succès
                    this.showSuccess('Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.');
                    
                    // Réinitialiser le champ email
                    document.getElementById('resetEmail').value = '';
                    
                    // Revenir à la connexion après 3 secondes
                    setTimeout(() => {
                        this.backToLogin();
                    }, 3000);
                } else {
                    console.error('Échec de l\'envoi de l\'email de réinitialisation');
                    this.showError('Échec de l\'envoi de l\'email. Vérifiez l\'adresse email.');
                }
            } else {
                console.error('FirebaseService non disponible pour la réinitialisation');
                this.showError('Service Firebase non disponible');
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
            
            this.showError(errorMessage);
        } finally {
            // Réactiver le bouton
            this.setLoadingState('reset', false);
        }
    },

    // Valider un email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Réinitialiser le formulaire
    resetForm() {
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        document.getElementById('resetEmail').value = '';
        
        // Revenir au mode connexion
        if (this.currentMode !== 'login') {
            this.backToLogin();
        }
        
        // Effacer les messages d'erreur
        this.clearMessages();
    },

    // Gérer l'état de chargement
    setLoadingState(mode, isLoading) {
        let button;
        
        if (mode === 'reset') {
            const form = document.getElementById('resetForm');
            button = form.querySelector('.btn-login-primary');
        } else {
            const buttonId = mode === 'login' ? 'loginForm' : 'registerForm';
            const form = document.getElementById(buttonId);
            button = form.querySelector('.btn-login-primary');
        }
        
        if (isLoading) {
            button.disabled = true;
            if (mode === 'reset') {
                button.textContent = 'Envoi en cours...';
            } else {
                button.textContent = mode === 'login' ? 'Connexion...' : 'Inscription...';
            }
        } else {
            button.disabled = false;
            if (mode === 'reset') {
                button.textContent = 'Envoyer le lien';
            } else {
                button.textContent = mode === 'login' ? 'Se connecter' : 'S\'inscrire';
            }
        }
    },

    // Afficher un message d'erreur
    showError(message) {
        this.clearMessages();
        
        let form;
        if (this.currentMode === 'reset') {
            form = document.getElementById('resetForm');
        } else {
            form = document.getElementById(this.currentMode === 'login' ? 'loginForm' : 'registerForm');
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'login-error';
        errorDiv.textContent = message;
        
        form.insertBefore(errorDiv, form.firstChild);
        
        // Auto-suppression après 5 secondes
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    },

    // Afficher un message de succès
    showSuccess(message) {
        this.clearMessages();
        
        const container = document.querySelector('.login-card');
        const successDiv = document.createElement('div');
        successDiv.className = 'login-success';
        successDiv.textContent = message;
        
        container.insertBefore(successDiv, container.firstChild);
        
        // Auto-suppression après 3 secondes
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    },

    // Effacer tous les messages
    clearMessages() {
        const errors = document.querySelectorAll('.login-error');
        const successes = document.querySelectorAll('.login-success');
        
        errors.forEach(error => error.remove());
        successes.forEach(success => success.remove());
    }
};

// Exporter globalement
window.Login = Login;