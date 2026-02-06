const Profile = {
    /**
     * Initialiser le composant Profile
     */
    init() {
        // Initialisation si nécessaire
    },

    /**
     * Retourner le HTML complet du profil pour le menu
     */
    render() {
        return `
            <div class="menu-section profile-section">
                <div class="profile-avatar">
                    <img src="https://picsum.photos/seed/user-profile/150/150.jpg" alt="Photo de profil" class="avatar-large" id="profileAvatar">
                </div>
            </div>
            <div class="menu-section profile-section">
                <div class="menu-section-content">
                    <div class="profile-form">
                        <div class="form-group">
                            <h5 class="input-title">Prénom</h5>
                            <input type="text" id="profileFirstName" class="form-input profile-input" value="Jean" oninput="validateProfileForm()">
                        </div>
                        
                        <div class="form-group">
                            <h5 class="input-title">Nom</h5>
                            <input type="text" id="profileLastName" class="form-input profile-input" value="Dupont" oninput="validateProfileForm()">
                        </div>
                        
                        <div class="form-group">
                            <h5 class="input-title">Pseudo</h5>
                            <input type="text" id="profilePseudo" class="form-input" value="JeanD24" oninput="validateProfileForm()">
                        </div>
                        
                        <div class="form-group">
                            <h5 class="input-title">Email</h5>
                            <input type="email" id="profileEmail" class="form-input" value="jean.dupont@email.com" oninput="validateProfileForm()">
                        </div>
                        
                        <div class="form-group">
                            <h5 class="input-title">Mot de passe</h5>
                            <div class="password-input">
                                <input type="password" id="profilePassword" class="form-input" value="password123" oninput="validateProfileForm()">
                                <button class="btn-toggle-password" onclick="togglePasswordVisibility()">
                                    <span class="material-icons" id="passwordIcon">visibility</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-actions">
                        <button class="btn-save" onclick="saveProfile()" id="saveProfileBtn">
                            <span class="material-icons">save</span>
                            Enregistrer le profil
                        </button>
                        <button class="btn-cancel" onclick="cancelProfile()">
                            <span class="material-icons">close</span>
                            Annuler
                        </button>
                    </div>
                    
                    <div class="profile-status" id="profileStatus"></div>
                </div>
            </div>
        `;
    },

    /**
     * Initialiser les événements du profil
     */
    initEventListeners() {
        // Ajouter les écouteurs d'événements si nécessaire
    },

    /**
     * Charger les données du profil
     */
    loadProfileData() {
        // Charger les données depuis Firebase ou localStorage
    }
};

// Exporter globalement
window.Profile = Profile;
