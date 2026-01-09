/**
 * Service Firebase Firestore v12
 * Gère la synchronisation multi-appareils des itinéraires
 */

class FirebaseService {
    constructor() {
        this.db = null;
        this.auth = null;
        this.user = null;
        this.isInitialized = false;
    }

    /**
     * Initialise Firebase avec votre configuration
     */
    async initialize() {
        try {
            // Attendre que Firebase soit disponible
            if (typeof window.firebase === 'undefined') {
                console.error('Firebase non encore chargé, nouvel essai dans 500ms...');
                setTimeout(() => this.initialize(), 500);
                return;
            }

            // Configuration Firebase v12 (vos vraies clés)
            const firebaseConfig = {
                apiKey: "AIzaSyBdO1hs92ZlaVNeefwu2Yqhdb-2nDLo4Vk",
                authDomain: "pwa-voyage-asie.firebaseapp.com",
                projectId: "pwa-voyage-asie",
                storageBucket: "pwa-voyage-asie.firebasestorage.app",
                messagingSenderId: "952612056038",
                appId: "1:952612056038:web:318e446aa787783f77c427",
                measurementId: "G-E0WFHDHCST"
            };

            // Initialiser Firebase (v12 - modules)
            const app = window.firebase.initializeApp(firebaseConfig);
            this.db = window.firebase.getFirestore(app);
            this.auth = window.firebase.getAuth(app);
            this.isInitialized = true;
            console.log('Firebase v12 initialisé avec succès');
        } catch (error) {
            console.error('Erreur initialisation Firebase:', error);
        }
    }

    /**
     * Authentification simple avec email
     */
    async signIn(email, password) {
        if (!this.isInitialized) {
            console.error('signIn: Firebase non initialisé');
            return null;
        }
        
        try {
            console.log('Tentative de connexion avec:', email);
            const result = await window.firebase.signInWithEmailAndPassword(this.auth, email, password);
            this.user = result.user;
            console.log('Utilisateur connecté:', this.user.email);
            return this.user;
        } catch (error) {
            console.error('Erreur connexion:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            return null;
        }
    }

    /**
     * Création de compte
     */
    async signUp(email, password) {
        if (!this.isInitialized) {
            console.error('signUp: Firebase non initialisé');
            return null;
        }
        
        try {
            console.log('Tentative d\'inscription avec:', email);
            const result = await window.firebase.createUserWithEmailAndPassword(this.auth, email, password);
            this.user = result.user;
            console.log('Compte créé:', this.user.email);
            return this.user;
        } catch (error) {
            console.error('Erreur création compte:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            return null;
        }
    }

    /**
     * Déconnexion
     */
    async signOut() {
        if (!this.isInitialized) return;
        
        try {
            await window.firebase.signOut(this.auth);
            this.user = null;
            console.log('Déconnecté');
        } catch (error) {
            console.error('Erreur déconnexion:', error);
        }
    }

    /**
     * Créer un itinéraire
     */
    async createItinerary(nom) {
        if (!this.user) {
            console.error('createItinerary: Utilisateur non connecté');
            return null;
        }
        
        try {
            console.log('Création itinéraire avec nom:', nom);
            console.log('User ID:', this.user.uid);
            
            const itinerary = {
                nom: nom,
                userId: this.user.uid,
                createdAt: new Date(),
                updatedAt: new Date(),
                destinations: []
            };
            
            console.log('Données itinéraire:', itinerary);
            
            const docRef = await window.firebase.addDoc(window.firebase.collection(this.db, 'itineraries'), itinerary);
            console.log('Itinéraire créé avec ID:', docRef.id);
            return { id: docRef.id, ...itinerary };
        } catch (error) {
            console.error('Erreur création itinéraire:', error);
            console.error('Error details:', error.code, error.message);
            return null;
        }
    }

    async addDestination(itineraryId, destinationData) {
    if (!this.user) return null;
    
    try {
        console.log('Ajout destination à itinéraire:', itineraryId);
        console.log('Données destination:', destinationData);
        
        // Récupérer l'itinéraire actuel
        const itineraryRef = window.firebase.doc(this.db, 'itineraries', itineraryId);
        const itinerarySnap = await window.firebase.getDoc(itineraryRef);
        
        if (!itinerarySnap.exists()) {
            console.error('Itinéraire non trouvé:', itineraryId);
            return null;
        }
        
        const itineraryData = itinerarySnap.data();
        console.log('Itinéraire actuel:', itineraryData);
        
        // Ajouter la destination avec toutes ses données
            const newDestination = {
                id: Math.random().toString(36).substr(2, 9),
                ...destinationData,
                userId: this.user.uid,
                createdAt: new Date()
            };
        
        console.log('Nouvelle destination complète:', newDestination);
        
        // Mettre à jour l'itinéraire avec la nouvelle destination
            const updatedDestinations = itineraryData.destinations || [];
            updatedDestinations.push(newDestination);
            
            await window.firebase.updateDoc(itineraryRef, {
                destinations: updatedDestinations,
                updatedAt: new Date()
            });
        
        console.log('Destination ajoutée avec succès:', newDestination);
        return newDestination;
    } catch (error) {
        console.error('Erreur ajout destination:', error);
        return null;
    }
}

    /**
     * Récupérer tous les itinéraires de l'utilisateur connecté
     */
    async getItineraries() {
        if (!this.user) return [];
        
        try {
            const q = window.firebase.query(
                window.firebase.collection(this.db, 'itineraries'),
                window.firebase.where('userId', '==', this.user.uid),
                window.firebase.orderBy('createdAt')
            );
            
            const snapshot = await window.firebase.getDocs(q);
            const itineraries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            console.log(`✅ Récupération itinéraires: ${itineraries.length} trouvé(s)`);
            return itineraries;
        } catch (error) {
            console.error('❌ Erreur récupération itinéraires:', error.message);
            return [];
        }
    }

    /**
     * Récupérer les destinations d'un itinéraire
     */
    async getDestinations(itineraryId) {
        if (!this.user) return [];
        
        try {
            const q = window.firebase.query(
                window.firebase.collection(this.db, 'destinations'),
                window.firebase.where('itineraryId', '==', itineraryId),
                window.firebase.where('userId', '==', this.user.uid),
                window.firebase.orderBy('createdAt')
            );
            const snapshot = await window.firebase.getDocs(q);
            
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Erreur récupération destinations:', error);
            return [];
        }
    }

    /**
     * Récupérer toutes les destinations de l'utilisateur connecté
     */
    async getDirectDestinations() {
        if (!this.user) return [];
        
        try {
            const q = window.firebase.query(
                window.firebase.collection(this.db, 'destinations'),
                window.firebase.where('userId', '==', this.user.uid),
                window.firebase.orderBy('createdAt')
            );
            const snapshot = await window.firebase.getDocs(q);
            
            const destinations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`✅ Destinations récupérées: ${destinations.length}`);
            
            return destinations;
        } catch (error) {
            console.error('❌ Erreur récupération destinations:', error.message);
            return [];
        }
    }

    /**
     * Vérifier et créer un itinéraire si nécessaire
     */
    async ensureUserItinerary() {
        if (!this.user) {
            throw new Error('Utilisateur non connecté');
        }
        
        try {
            const itineraries = await this.getItineraries();
            
            if (itineraries.length === 0) {
                console.log('🆕 Aucun itinéraire trouvé, création...');
                const newItinerary = await this.createItineraryForUser(this.user.uid);
                console.log('✅ Itinéraire créé:', newItinerary.id);
                return newItinerary;
            } else {
                console.log('✅ Itinéraire existant réutilisé:', itineraries[0].id);
                return itineraries[0];
            }
        } catch (error) {
            console.error('❌ Erreur gestion itinéraire:', error.message);
            throw error;
        }
    }

    /**
     * Créer un itinéraire pour un nouvel utilisateur
     */
    async createItineraryForUser(userId) {
        try {
            const newItinerary = {
                nom: 'Mon itinéraire',
                userId: userId,
                createdAt: window.firebase.serverTimestamp()
            };
            
            const docRef = await window.firebase.addDoc(
                window.firebase.collection(this.db, 'itineraries'),
                newItinerary
            );
            
            const createdItinerary = { id: docRef.id, ...newItinerary };
            console.log('✅ Itinéraire créé en BDD:', createdItinerary.id);
            
            return createdItinerary;
        } catch (error) {
            console.error('❌ Erreur création itinéraire:', error.message);
            throw error;
        }
    }

    /**
     * Ajouter une destination à l'itinéraire actuel
     */
    async addDestinationToItinerary(destination) {
        if (!this.user) {
            throw new Error('Utilisateur non connecté');
        }
        
        try {
            const itineraries = await this.getItineraries();
            
            if (itineraries.length > 0) {
                const currentItinerary = itineraries[0];
                
                const destinationWithItineraryId = {
                    ...destination,
                    itineraryId: currentItinerary.id,
                    userId: this.user.uid
                };
                
                await window.firebase.addDoc(
                    window.firebase.collection(this.db, 'destinations'),
                    destinationWithItineraryId
                );
                
                console.log('✅ Destination ajoutée à Firebase:', destination.name);
                return currentItinerary.id;
            } else {
                throw new Error('Aucun itinéraire trouvé');
            }
        } catch (error) {
            console.error('❌ Erreur ajout destination:', error.message);
            throw error;
        }
    }

    /**
     * Vérifier si l'utilisateur est connecté
     */
    isAuthenticated() {
        return this.user !== null;
    }

    /**
     * Obtenir l'ID de l'utilisateur actuel
     */
    getUserId() {
        return this.user ? this.user.uid : null;
    }
}

// Export du service pour utilisation globale
window.firebaseService = new FirebaseService();
