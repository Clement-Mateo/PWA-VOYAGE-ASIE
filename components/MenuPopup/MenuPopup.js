/**
 * Composant MenuPopup - Module Pattern
 * Gère le menu popup d'authentification
 */

// Charger le CSS du composant
const cssLink = document.createElement('link');
cssLink.rel = 'stylesheet';
cssLink.href = './components/MenuPopup/MenuPopup.css';
document.head.appendChild(cssLink);

export const MenuPopup = {
    // État du composant
    isVisible: false,
    container: null,
    
    // Template HTML
    template: `
        <div class="popup-overlay" id="menuPopup" onclick="MenuPopup.handleOutsideClick(event)">
            <div class="popup-menu">
                <button class="close-btn" onclick="MenuPopup.hide()">×</button>
                <h3 class="popup-title">Menu</h3>
                <div class="menu-items">
                    <button class="menu-item" onclick="MenuPopup.openAuth()">
                        🔐 Connexion / Inscription
                    </button>
                    <button class="menu-item" onclick="MenuPopup.hide()">
                        ❌ Fermer
                    </button>
                </div>
                
                <!-- Modal d'authentification -->
                <div id="authModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Connexion / Inscription</h2>
                            <span class="close-btn" onclick="MenuPopup.closeAuthModal()">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="auth-tabs">
                                <button class="tab-btn active" onclick="MenuPopup.switchTab('login')">Connexion</button>
                                <button class="tab-btn" onclick="MenuPopup.switchTab('register')">Inscription</button>
                            </div>
                            
                            <!-- Formulaire de connexion -->
                            <div id="loginForm" class="auth-form">
                                <div class="form-group">
                                    <label>Email:</label>
                                    <input type="email" id="loginEmail" placeholder="votre@email.com">
                                </div>
                                <div class="form-group">
                                    <label>Mot de passe:</label>
                                    <input type="password" id="loginPassword" placeholder="Votre mot de passe">
                                </div>
                                <button class="btn-primary" onclick="MenuPopup.handleLogin()">Se connecter</button>
                            </div>
                            
                            <!-- Formulaire d'inscription -->
                            <div id="registerForm" class="auth-form" style="display: none;">
                                <div class="form-group">
                                    <label>Email:</label>
                                    <input type="email" id="registerEmail" placeholder="votre@email.com">
                                </div>
                                <div class="form-group">
                                    <label>Mot de passe:</label>
                                    <input type="password" id="registerPassword" placeholder="Min 6 caractères">
                                </div>
                                <div class="form-group">
                                    <label>Confirmer mot de passe:</label>
                                    <input type="password" id="confirmPassword" placeholder="Confirmez le mot de passe">
                                </div>
                                <button class="btn-primary" onclick="MenuPopup.handleRegister()">S'inscrire</button>
                            </div>
                            
                            <div id="authMessage" class="auth-message"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Initialisation du composant
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container ${containerId} non trouvé`);
            return;
        }
        
        this.render();
        this.setupEventListeners();
    },

    // Rendu du template
    render() {
        if (this.container) {
            this.container.innerHTML = this.template;
        }
    },

    // Afficher le menu
    show() {
        const popup = document.getElementById('menuPopup');
        if (popup) {
            popup.style.display = 'flex';
            this.isVisible = true;
        }
    },

    // Cacher le menu
    hide() {
        const popup = document.getElementById('menuPopup');
        if (popup) {
            popup.style.display = 'none';
            this.isVisible = false;
        }
    },

    // Gérer clic extérieur
    handleOutsideClick(event) {
        if (event.target === event.currentTarget) {
            this.hide();
        }
    },

    // Ouvrir modal d'auth
    openAuth() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    // Fermer modal d'auth
    closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
            this.clearAuthForms();
        }
    },

    // Changer d'onglet
    switchTab(tab) {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const tabBtns = document.querySelectorAll('.tab-btn');
        
        // Réinitialiser les classes
        tabBtns.forEach(btn => btn.classList.remove('active'));
        
        if (tab === 'login') {
            loginForm.style.display = 'flex';
            registerForm.style.display = 'none';
            tabBtns[0].classList.add('active');
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'flex';
            tabBtns[1].classList.add('active');
        }
    },

    // Gérer connexion
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showAuthMessage('Veuillez remplir tous les champs', 'error');
            return;
        }

        try {
            const user = await window.firebaseService.signIn(email, password);
            if (user) {
                this.showAuthMessage('Connexion réussie !', 'success');
                setTimeout(() => {
                    this.closeAuthModal();
                    this.hide();
                    window.updateUserPanel();
                }, 1500);
            } else {
                this.showAuthMessage('Erreur de connexion', 'error');
            }
        } catch (error) {
            this.showAuthMessage('Erreur de connexion: ' + error.message, 'error');
        }
    },

    // Gérer inscription
    async handleRegister() {
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!email || !password || !confirmPassword) {
            this.showAuthMessage('Veuillez remplir tous les champs', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showAuthMessage('Les mots de passe ne correspondent pas', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAuthMessage('Le mot de passe doit contenir au moins 6 caractères', 'error');
            return;
        }

        try {
            const user = await window.firebaseService.signUp(email, password);
            if (user) {
                this.showAuthMessage('Compte créé avec succès !', 'success');
                setTimeout(() => {
                    this.closeAuthModal();
                    this.hide();
                    window.updateUserPanel();
                }, 1500);
            } else {
                this.showAuthMessage('Erreur de création de compte', 'error');
            }
        } catch (error) {
            this.showAuthMessage('Erreur de création: ' + error.message, 'error');
        }
    },

    // Afficher message d'auth
    showAuthMessage(message, type) {
        const messageDiv = document.getElementById('authMessage');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `auth-message ${type}`;
            messageDiv.style.display = 'block';
            
            // Masquer après 3 secondes
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
    },

    // Vider les formulaires
    clearAuthForms() {
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        document.getElementById('authMessage').style.display = 'none';
    },

    // Configuration des écouteurs d'événements
    setupEventListeners() {
        // Événements gérés directement dans le template avec onclick
        console.log('MenuPopup initialisé');
    },

    // Gérer la déconnexion
    handleLogout() {
        console.log('Tentative de déconnexion...');
        
        if (!window.firebaseService) {
            console.error('Firebase Service non disponible');
            return;
        }
        
        try {
            console.log('Appel à firebaseService.signOut...');
            await window.firebaseService.signOut();
            console.log('Déconnexion réussie');
            
            // Mettre à jour l'interface
            if (window.updateUserPanel) {
                window.updateUserPanel();
            }
            
            // Fermer le menu
            this.hide();
            
            // Afficher message de succès
            this.showAuthMessage('Déconnexion réussie', 'success');
            
            // Masquer le message après 3 secondes
            setTimeout(() => {
                this.hideAuthMessage();
            }, 3000);
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            this.showAuthMessage('Erreur lors de la déconnexion: ' + error.message, 'error');
        }
    },
};
