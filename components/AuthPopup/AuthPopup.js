// Composant AuthPopup pour la connexion/inscription
const AuthPopup = {
    // État du composant
    isVisible: false,
    currentMode: 'login', // 'login' ou 'register'

    // Template HTML
    template: `
        <div class="auth-popup" id="authPopup">
            <div class="auth-popup-content">
                <div class="auth-popup-header">
                    <h3 class="auth-popup-title" id="authTitle">Connexion</h3>
                    <button class="btn-close-auth" onclick="AuthPopup.hide()">×</button>
                </div>
                
                <div class="auth-form">
                    <!-- Formulaire de connexion -->
                    <div class="login-form" id="loginForm">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" id="loginEmail" placeholder="votre@email.com">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Mot de passe</label>
                            <input type="password" class="form-input" id="loginPassword" placeholder="••••••••">
                        </div>
                        
                        <button class="btn-auth-primary" onclick="AuthPopup.login()">Se connecter</button>
                    </div>
                    
                    <!-- Formulaire d'inscription -->
                    <div class="register-form" id="registerForm" style="display: none;">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" id="registerEmail" placeholder="votre@email.com">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Mot de passe</label>
                            <input type="password" class="form-input" id="registerPassword" placeholder="••••••••">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Confirmer le mot de passe</label>
                            <input type="password" class="form-input" id="confirmPassword" placeholder="••••••••">
                        </div>
                        
                        <button class="btn-auth-primary" onclick="AuthPopup.register()">S'inscrire</button>
                    </div>
                    
                    <!-- Lien pour basculer -->
                    <div class="auth-switch">
                        <span id="authSwitchText">Pas encore de compte ?</span>
                        <button class="btn-link" id="authSwitchBtn" onclick="AuthPopup.switchMode()">S'inscrire</button>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Initialisation du composant
    init(containerId) {
        console.log('AuthPopup.init() appelé avec containerId:', containerId);
        this.container = document.getElementById(containerId);
        console.log('Container trouvé:', !!this.container);
        
        if (!this.container) {
            console.error('Container AuthPopup non trouvé:', containerId);
            return;
        }
        
        this.container.innerHTML = this.template;
        this.setupEventListeners();
        console.log('AuthPopup initialisé avec succès');
        
        // Vérifier que le popup est bien créé
        const popup = document.getElementById('authPopup');
        console.log('Popup créé:', !!popup);
    },

    // Configuration des écouteurs d'événements
    setupEventListeners() {
        // Événements gérés directement dans le template avec onclick
        console.log('AuthPopup initialisé');
    },

    // Afficher le popup
    show() {
        console.log('AuthPopup.show() appelé - bouton cliqué !');
        
        if (!this.isVisible) {
            this.isVisible = true;
            
            // Ajouter la classe pour masquer les autres boutons
            document.body.classList.add('has-popup');
            console.log('Classe has-popup ajoutée');
            
            // Afficher le popup
            const popup = document.getElementById('authPopup');
            if (popup) {
                popup.classList.add('active');
                console.log('Popup affiché');
            } else {
                console.error('Popup non trouvé');
            }
            
            // Réinitialiser le formulaire
            this.resetForm();
        } else {
            console.log('Popup déjà visible');
        }
    },

    // Cacher le popup
    hide() {
        console.log('AuthPopup.hide() appelé, isVisible:', this.isVisible);
        
        if (this.isVisible) {
            this.isVisible = false;
            
            // Retirer la classe pour réafficher les boutons
            document.body.classList.remove('has-popup');
            console.log('Classe has-popup retirée');
            
            // Masquer le popup
            const popup = document.getElementById('authPopup');
            if (popup) {
                popup.classList.remove('active');
                console.log('Popup masqué avec succès');
            } else {
                console.error('Popup non trouvé pour masquage');
            }
        } else {
            console.log('Popup déjà caché');
        }
    },

    // Basculer entre connexion et inscription
    switchMode() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const title = document.getElementById('authTitle');
        const switchText = document.getElementById('authSwitchText');
        const switchBtn = document.getElementById('authSwitchBtn');
        
        if (this.currentMode === 'login') {
            this.currentMode = 'register';
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            title.textContent = 'Inscription';
            switchText.textContent = 'Déjà un compte ?';
            switchBtn.textContent = 'Se connecter';
        } else {
            this.currentMode = 'login';
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            title.textContent = 'Connexion';
            switchText.textContent = 'Pas encore de compte ?';
            switchBtn.textContent = 'S\'inscrire';
        }
    },

    // Connexion
    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        console.log('Tentative de connexion avec:', email);
        console.log('Firebase disponible:', !!window.firebase);
        console.log('Firebase.auth disponible:', !!window.firebase?.auth);
        console.log('signInWithEmailAndPassword disponible:', !!window.firebase?.signInWithEmailAndPassword);
        
        if (!email || !password) {
            alert('Veuillez remplir tous les champs');
            return;
        }
        
        try {
            // Utiliser Firebase pour la connexion
            if (window.firebase && window.firebase.auth && window.firebase.signInWithEmailAndPassword) {
                console.log('Appel de signInWithEmailAndPassword...');
                const userCredential = await window.firebase.signInWithEmailAndPassword(window.firebase.auth, email, password);
                console.log('Connexion réussie:', userCredential.user);
                
                // Fermer le popup immédiatement
                console.log('Fermeture du popup...');
                this.hide();
                
                // Mettre à jour l'interface utilisateur
                this.updateUserInterface(email);
                
                // Afficher un message de succès plus court
                console.log('Connexion terminée avec succès');
            } else {
                console.error('Firebase non disponible:', {
                    firebase: !!window.firebase,
                    auth: !!window.firebase?.auth,
                    signIn: !!window.firebase?.signInWithEmailAndPassword
                });
                alert('Service Firebase non disponible');
            }
            
        } catch (error) {
            console.error('Erreur de connexion:', error);
            alert('Erreur de connexion: ' + error.message);
        }
    },

    // Inscription
    async register() {
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        console.log('Tentative d\'inscription avec:', email);
        
        if (!email || !password || !confirmPassword) {
            alert('Veuillez remplir tous les champs');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }
        
        if (password.length < 6) {
            alert('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }
        
        try {
            // Utiliser Firebase pour l'inscription
            if (window.firebase && window.firebase.auth && window.firebase.createUserWithEmailAndPassword) {
                console.log('Appel de createUserWithEmailAndPassword...');
                const userCredential = await window.firebase.createUserWithEmailAndPassword(window.firebase.auth, email, password);
                console.log('Inscription réussie:', userCredential.user);
                
                // Fermer le popup immédiatement
                console.log('Fermeture du popup après inscription...');
                this.hide();
                
                // Mettre à jour l'interface utilisateur
                this.updateUserInterface(email);
                
                // Afficher un message de succès plus court
                console.log('Inscription terminée avec succès');
            } else {
                console.error('Firebase non disponible pour l\'inscription');
                alert('Service Firebase non disponible');
            }
            
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            alert('Erreur d\'inscription: ' + error.message);
        }
    },

    // Mettre à jour l'interface après connexion
    updateUserInterface(email) {
        // Cacher le bouton de connexion
        const authBtn = document.querySelector('.auth-btn');
        if (authBtn) {
            authBtn.style.display = 'none';
        }
        
        // Afficher le panneau utilisateur
        const userPanel = document.getElementById('userPanel');
        if (userPanel) {
            userPanel.style.display = 'flex';
        }
        
        console.log('Interface utilisateur mise à jour pour:', email);
    },

    // Réinitialiser le formulaire
    resetForm() {
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        // Revenir au mode connexion
        if (this.currentMode === 'register') {
            this.switchMode();
        }
    }
};

// Exporter globalement
window.AuthPopup = AuthPopup;
