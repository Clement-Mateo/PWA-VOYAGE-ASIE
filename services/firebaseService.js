/**
 * Service Firebase - Communication avec la base de données uniquement
 * Plus de stockage local, utilise IndexedDB via LocalStorage
 */

class FirebaseService {
    constructor() {
        this.app = null;
        this.db = null;
        this.auth = null;
        this.user = null;
        this.isInitialized = false;
    }

    /**
     * Initialisation de Firebase
     */
    async init() {
        try {
            // Vérifier si Firebase est déjà initialisé
            if (!window.firebase || !window.firebaseConfig) {
                throw new Error('Firebase ou firebaseConfig non disponible');
            }

            // Vérifier si l'app n'est pas déjà initialisée
            if (!window.firebase.apps || window.firebase.apps.length === 0) {
                this.app = window.firebase.initializeApp(window.firebaseConfig);
            } else {
                this.app = window.firebase.apps[0];
            }
            
            this.db = window.firebase.getFirestore(this.app);
            this.auth = window.firebase.getAuth(this.app);
            
            this.isInitialized = true;
            console.log('✅ Firebase initialisé');
            
        } catch (error) {
            console.error('❌ Erreur initialisation Firebase:', error);
            throw error;
        }
    }

    /**
     * Configuration de l'observateur d'authentification
     */
    setupAuthObserver() {
        if (!this.isInitialized) return;

        this.auth.onAuthStateChanged((user) => {
            this.user = user;
            console.log(user ? `✅ Utilisateur connecté: ${user.email}` : '🔒 Utilisateur déconnecté');
            
            // Déclencher un événement personnalisé
            window.dispatchEvent(new CustomEvent('firebaseAuthReady', { 
                detail: { 
                    user: user,
                    isAuthenticated: !!user 
                } 
            }));
        });
        
        // Déclencher manuellement l'événement si l'utilisateur est déjà connecté
        // (utile au chargement de la page quand l'utilisateur est déjà authentifié)
        if (this.auth.currentUser) {
            this.user = this.auth.currentUser;
            console.log(`✅ Utilisateur déjà connecté: ${this.user.email}`);
            
            window.dispatchEvent(new CustomEvent('firebaseAuthReady', { 
                detail: { 
                    user: this.user,
                    isAuthenticated: !!this.user 
                } 
            }));
        }
    }

    /**
     * Connexion utilisateur
     */
    async signIn(email, password) {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }

        try {
            const result = await window.firebase.signInWithEmailAndPassword(this.auth, email, password);
            this.user = result.user;
            console.log('✅ Utilisateur connecté:', this.user.email);
            
            return this.user;
        } catch (error) {
            console.error('❌ Erreur connexion:', error);
            throw error;
        }
    }

    /**
     * Inscription utilisateur
     */
    async signUp(email, password) {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }

        try {
            const result = await window.firebase.createUserWithEmailAndPassword(this.auth, email, password);
            this.user = result.user;
            console.log('✅ Utilisateur inscrit:', this.user.email);
            
            return this.user;
        } catch (error) {
            console.error('❌ Erreur inscription:', error);
            throw error;
        }
    }

    /**
     * Déconnexion utilisateur
     */
    async signOut() {
        if (!this.isInitialized) return;
        
        try {
            await window.firebase.signOut(this.auth);
            this.user = null;
            console.log('Déconnecté');
        } catch (error) {
            console.error('Erreur déconnexion:', error);
            throw error;
        }
    }

    /**
     * Réinitialisation du mot de passe
     */
    async resetPassword(email) {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }
        
        try {
            await window.firebase.sendPasswordResetEmail(this.auth, email);
            console.log('✅ Email de réinitialisation envoyé');
            return true;
        } catch (error) {
            console.error('❌ Erreur réinitialisation mot de passe:', error);
            throw error;
        }
    }

    /**
     * Vérifier si l'utilisateur est authentifié
     */
    isAuthenticated() {
        return this.user !== null;
    }

    /**
     * Obtenir l'utilisateur actuel
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Vérifier si Firebase est initialisé
     */
    isReady() {
        return this.isInitialized;
    }

    // ========================================
    // CRUD ITINERARIES (Firebase uniquement)
    // ========================================

    /**
     * Créer un itinéraire dans Firebase
     */
    async createItinerary(name, manageLoading = false) {
        if (!this.user) {
            throw new Error('Utilisateur non connecté');
        }
        
        try {
            const itinerary = {
                name: name,
                userId: this.user.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                destinations: [],
            };
            
            const docRef = await window.firebase.addDoc(window.firebase.collection(this.db, 'itineraries'), itinerary);
            const newItinerary = { id: docRef.id, ...itinerary };
            
            console.log('✅ Itinéraire créé dans Firebase:', newItinerary.id);
            return newItinerary.id;
            
        } catch (error) {
            console.error('❌ Erreur création itinéraire Firebase:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour un itinéraire dans Firebase
     */
    async updateItinerary(id, updates) {
        if (!this.user) {
            throw new Error('Utilisateur non connecté');
        }
        
        try {
            const updateData = {
                ...updates,
                updatedAt: window.firebase.serverTimestamp()
            };
            
            await window.firebase.updateDoc(window.firebase.doc(this.db, 'itineraries', id), updateData);
            console.log('✅ Itinéraire mis à jour dans Firebase:', id);
            
        } catch (error) {
            console.error('❌ Erreur mise à jour itinéraire Firebase:', error);
            throw error;
        }
    }

    /**
     * Supprimer un itinéraire dans Firebase
     */
    async deleteItinerary(itinerary) {
        if (!this.user) {
            throw new Error('Utilisateur non connecté');
        }
        
        try {
            await window.firebase.deleteDoc(window.firebase.doc(this.db, 'itineraries', itinerary.id));
            console.log('✅ Itinéraire supprimé dans Firebase:', itinerary.id);
            
        } catch (error) {
            console.error('❌ Erreur suppression itinéraire Firebase:', error);
            throw error;
        }
    }

    /**
     * Récupérer tous les itinéraires d'un utilisateur depuis Firebase
     */
    async getItineraries() {
        if (!this.user) {
            console.error('getItineraries: Utilisateur non connecté');
            return [];
        }
        
        try {
            const q = window.firebase.query(
                window.firebase.collection(this.db, 'itineraries'),
                window.firebase.where('userId', '==', this.user.uid),
                window.firebase.orderBy('createdAt', 'asc')
            );
            
            const querySnapshot = await window.firebase.getDocs(q);
            const itineraries = [];
            
            querySnapshot.forEach((doc) => {
                itineraries.push({ id: doc.id, ...doc.data() });
            });
            
            console.log(`✅ ${itineraries.length} itinéraires chargés depuis Firebase`);
            return itineraries;
            
        } catch (error) {
            console.error('❌ Erreur chargement itinéraires Firebase:', error);
            return [];
        }
    }

    // ========================================
    // FIN - Seuls les itinéraires sont gérés
    // ========================================
}

// Initialiser immédiatement le service Firebase pour utilisation globale
window.firebaseService = new FirebaseService();
