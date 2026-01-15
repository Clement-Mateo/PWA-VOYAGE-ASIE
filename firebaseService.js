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
     * Obtenir les fonctions Firebase nécessaires
     */
    getFirebaseFunctions() {
        if (!window.firebase) {
            throw new Error('Firebase non disponible');
        }
        
        console.log('🔍 Disponibilité des fonctions Firebase:');
        console.log('- deleteDoc:', typeof window.firebase.deleteDoc);
        console.log('- doc:', typeof window.firebase.doc);
        console.log('- getDoc:', typeof window.firebase.getDoc);
        console.log('- updateDoc:', typeof window.firebase.updateDoc);
        
        return {
            doc: window.firebase.doc,
            getDoc: window.firebase.getDoc,
            updateDoc: window.firebase.updateDoc,
            deleteDoc: window.firebase.deleteDoc,
            serverTimestamp: window.firebase.serverTimestamp
        };
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
            
            // Activer la persistance de session (Firebase Auth est persistant par défaut)
            // Firebase Auth v12 maintient automatiquement la session
            console.log('✅ Persistance de session Firebase activée (par défaut)');
            
            // Configurer l'observateur d'authentification pour détecter la session existante
            this.auth.onAuthStateChanged((user) => {
                this.user = user;
                if (user) {
                    console.log('✅ Utilisateur connecté automatiquement:', user.email);
                    window.updateUserPanel();
                } else {
                    console.log('🔒 Utilisateur déconnecté');
                    window.updateUserPanel();
                }
            });
            
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
     * Réinitialisation du mot de passe
     */
    async resetPassword(email) {
        if (!this.isInitialized) {
            console.error('resetPassword: Firebase non initialisé');
            return false;
        }
        
        try {
            console.log('Envoi de l\'email de réinitialisation à:', email);
            await window.firebase.sendPasswordResetEmail(this.auth, email);
            console.log('Email de réinitialisation envoyé avec succès');
            return true;
        } catch (error) {
            console.error('Erreur envoi email réinitialisation:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            return false;
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
            console.log('🔍 Recherche destinations pour userId:', this.user.uid);
            
            // Requête filtrée SANS orderBy (car orderBy nécessite un index)
            const q = window.firebase.query(
                window.firebase.collection(this.db, 'destinations'),
                window.firebase.where('userId', '==', this.user.uid)
            );
            
            console.log('🔍 Requête Firestore créée');
            
            const snapshot = await window.firebase.getDocs(q);
            
            console.log('🔍 Snapshot obtenu, nombre de documents:', snapshot.docs.length);
            
            const destinations = snapshot.docs.map((doc, index) => ({ 
                firestoreId: doc.id, 
                ...doc.data(),
                order: doc.data().order !== undefined ? doc.data().order : index // Ajouter order si manquant
            }));
            
            console.log('✅ Destinations récupérées:', destinations.length);
            console.log('🔍 Détails des destinations:', destinations);
            
            return destinations;
        } catch (error) {
            console.error('❌ Erreur récupération destinations:', error.message);
            console.error('❌ Code erreur:', error.code);
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
                
                const docRef = await window.firebase.addDoc(
                    window.firebase.collection(this.db, 'destinations'),
                    destinationWithItineraryId
                );
                
                // Stocker l'ID Firestore dans l'objet destination
                const destinationWithId = {
                    ...destinationWithItineraryId,
                    firestoreId: docRef.id
                };
                
                console.log('✅ Destination ajoutée à Firebase avec ID:', docRef.id);
                console.log('✅ Destination complète:', destinationWithId);
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
     * Mettre à jour une destination existante
     */
    async updateDestination(destination) {
        if (!this.user) {
            throw new Error('Utilisateur non connecté');
        }
        
        try {
            // Mettre à jour directement le document par son firestoreId
            const docRef = window.firebase.doc(this.db, 'destinations', destination.firestoreId);
            
            await window.firebase.updateDoc(docRef, {
                name: destination.name,
                address: destination.address,
                duration: destination.duration,
                order: destination.order,
                updatedAt: new Date()
            });

            console.log('✅ Destination mise à jour dans Firebase:', destination.name);
        } catch (error) {
            console.error('❌ Erreur mise à jour destination:', error.message);
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

    /**
     * Supprimer une destination directement par son ID (méthode alternative)
     */
    async deleteDestinationById(destinationId) {
        if (!this.isAuthenticated()) {
            throw new Error('Utilisateur non authentifié');
        }

        if (!destinationId) {
            throw new Error('ID de destination invalide');
        }

        try {
            const { doc, deleteDoc } = this.getFirebaseFunctions();
            const userId = this.getUserId();
            
            console.log('🔧 Suppression directe par ID:', destinationId);
            console.log('🔍 UserId de l\'utilisateur:', userId);
            
            // Supprimer directement le document de destination
            const destinationRef = doc(this.db, 'destinations', destinationId);
            await deleteDoc(destinationRef);

            console.log('✅ Destination supprimée directement par ID:', destinationId);
            return true;

        } catch (error) {
            console.error('❌ Erreur suppression directe destination:', error);
            throw error;
        }
    }
}

// Export du service pour utilisation globale
window.firebaseService = new FirebaseService();
