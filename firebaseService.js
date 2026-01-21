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
        this.itineraries = []; // Liste des itinéraires en mémoire
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
            throw error; // Propager l'erreur pour que Register.js puisse la traiter
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

    // Méthodes utilitaires

    /**
     * Obtenir l'ID de l'utilisateur actuel
     */
    getUserId() {
        return this.user ? this.user.uid : null;
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

    /**
     * Retrouver un itinéraire par son ID
     */
    getItinerary(itinerary) {
        return this.itineraries.find(item => item.id === itinerary.id);
    }

    /**
     * Obtenir l'itinéraire actuel (premier de la liste)
     */
    getCurrentItinerary() {
        return this.itineraries.length > 0 ? this.itineraries[0] : null;
    }

    /**
     * Créer un itinéraire en base et l'ajouter dans itineraries
     */
    async createItinerary(nom) {
        if (!this.user) {
            console.error('createItinerary: Utilisateur non connecté');
            return null;
        }
        
        try {
            console.log('Création itinéraire avec nom:', nom);
            
            const itinerary = {
                nom: nom,
                userId: this.user.uid,
                createdAt: window.firebase.serverTimestamp(),
                updatedAt: window.firebase.serverTimestamp(),
                destinations: []
            };
            
            const docRef = await window.firebase.addDoc(
                window.firebase.collection(this.db, 'itineraries'),
                itinerary
            );
            
            const createdItinerary = { 
                id: docRef.id, 
                ...itinerary,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Ajouter à la liste en mémoire
            this.itineraries.push(createdItinerary);
            
            console.log('✅ Itinéraire créé et ajouté en mémoire:', createdItinerary.id);
            return createdItinerary;
        } catch (error) {
            console.error('Erreur création itinéraire:', error);
            return null;
        }
    }

    /**
     * Mettre à jour un itinéraire dans itineraries et en BDD
     */
    async updateItinerary(itinerary) {
        try {
            const index = this.itineraries.findIndex(item => item.id === itinerary.id);
            
            if (index === -1) {
                console.error('updateItinerary: Itinéraire non trouvé dans la liste:', itinerary.id);
                return false;
            }
            
            // Mettre à jour en mémoire
            this.itineraries.splice(index, 1);
            this.itineraries.push(itinerary);
            
            // Mettre à jour en base de données
            console.log('🔥 updateItinerary: Sauvegarde en BDD de', itinerary.destinations.length, 'destinations');
            console.log('🔥 updateItinerary: destinations:', itinerary.destinations);
            
            const itineraryRef = window.firebase.doc(this.db, 'itineraries', itinerary.id);
            await window.firebase.updateDoc(itineraryRef, {
                nom: itinerary.nom,
                destinations: itinerary.destinations,
                updatedAt: window.firebase.serverTimestamp()
            });
            
            console.log('✅ Itinéraire mis à jour en mémoire et en BDD:', itinerary.id);
            return true;
        } catch (error) {
            console.error('Erreur mise à jour itinéraire:', error);
            return false;
        }
    }

    /**
     * Supprimer un itinéraire de itineraries et de la base
     */
    async deleteItinerary(itinerary) {
        if (!this.user) {
            console.error('deleteItinerary: Utilisateur non connecté');
            return false;
        }
        
        try {
            // Supprimer de la liste en mémoire
            const index = this.itineraries.findIndex(item => item.id === itinerary.id);
            
            if (index === -1) {
                console.error('deleteItinerary: Itinéraire non trouvé dans la liste:', itinerary.id);
                return false;
            }
            
            this.itineraries.splice(index, 1);
            
            // Supprimer de la base de données
            const itineraryRef = window.firebase.doc(this.db, 'itineraries', itinerary.id);
            await window.firebase.deleteDoc(itineraryRef);
            
            console.log('✅ Itinéraire supprimé de la mémoire et de la base:', itinerary.id);
            return true;
        } catch (error) {
            console.error('Erreur suppression itinéraire:', error);
            return false;
        }
    }

    /**
     * Charger tous les itinéraires de l'utilisateur dans itineraries
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
                window.firebase.orderBy('createdAt')
            );
            
            const snapshot = await window.firebase.getDocs(q);
            const itineraries = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                destinations: doc.data().destinations || []
            }));
            
            // Mettre à jour la liste en mémoire
            this.itineraries = itineraries;
            
            console.log(`✅ Itinéraires chargés dans itineraries: ${itineraries.length} trouvé(s)`);
            return itineraries;
        } catch (error) {
            console.error('❌ Erreur chargement itinéraires:', error.message);
            this.itineraries = []; // Vider la liste en cas d'erreur
            return [];
        }
    }

    /**
     * Retourner la liste des destinations d'un itinéraire
     */
    getDestinations(itinerary) {
        try {
            const foundItinerary = this.getItinerary(itinerary);
            
            if (!foundItinerary) {
                console.error('getDestinations: Itinéraire non trouvé:', itinerary.id);
                return [];
            }
            
            return foundItinerary.destinations || [];
        } catch (error) {
            console.error('Erreur récupération destinations:', error);
            return [];
        }
    }

    /**
     * Récupérer les destinations de l'itinéraire actuel
     */
    getDestinationsOfCurrentItinerary() {
        try {
            const itineraries = this.itineraries;
            if (itineraries.length === 0) {
                return [];
            }
            
            const currentItinerary = itineraries[0];
            return currentItinerary.destinations || [];
        } catch (error) {
            console.error('Erreur récupération destinations itinéraire actuel:', error);
            return [];
        }
    }

    /**
     * Ajouter une destination à un itinéraire
     */
    async addDestination(destination, itinerary) {
        try {
            console.log('🔥 addDestination appelé pour:', destination.name || 'Nouvelle destination');
            console.log('🔥 Destination ID:', destination.id);
            console.log('🔥 Timestamp appel addDestination:', Date.now());
            
            const foundItinerary = this.getItinerary(itinerary);
            
            if (!foundItinerary) {
                console.error('addDestination: Itinéraire non trouvé:', itinerary.id);
                return false;
            }
            
            // Ajouter la destination à la liste
            if (!foundItinerary.destinations) {
                foundItinerary.destinations = [];
            }
            console.log('🔥 Destinations avant ajout:', foundItinerary.destinations.length);
            foundItinerary.destinations.push(destination);
            console.log('🔥 Destinations après ajout:', foundItinerary.destinations.length);
            console.log('🔥 Destination ajoutée au tableau local, ID:', destination.id);
            
            // Mettre à jour l'itinéraire avec la nouvelle liste de destinations
            console.log('🔥 Appel à updateItinerary depuis addDestination');
            this.updateItinerary(foundItinerary);
            return true;
        } catch (error) {
            console.error('Erreur ajout destination:', error);
            return false;
        }
    }

    /**
     * Mettre à jour une destination dans un itinéraire
     */
    async updateDestination(destination, itinerary) {
        try {
            const foundItinerary = this.getItinerary(itinerary);
            
            if (!foundItinerary) {
                console.error('updateDestination: Itinéraire non trouvé:', itinerary.id);
                return false;
            }
            
            if (!foundItinerary.destinations) {
                console.error('updateDestination: Aucune destination trouvée dans l\'itinéraire');
                return false;
            }
            
            // Trouver et supprimer l'ancienne destination
            const index = foundItinerary.destinations.findIndex(dest => dest.id === destination.id);
            
            if (index === -1) {
                console.error('updateDestination: Destination non trouvée:', destination.id);
                return false;
            }
                
            foundItinerary.destinations.splice(index, 1);
            
            // Ajouter la nouvelle destination
            foundItinerary.destinations.push(destination);
            
            // Mettre à jour l'itinéraire
            this.updateItinerary(foundItinerary);
            return true;
        } catch (error) {
            console.error('Erreur mise à jour destination:', error);
            return false;
        }
    }

    /**
     * Supprimer une destination d'un itinéraire
     */
    async deleteDestination(destination, itinerary) {
        try {
            const foundItinerary = this.getItinerary(itinerary);
            
            if (!foundItinerary) {
                console.error('deleteDestination: Itinéraire non trouvé:', itinerary.id);
                return false;
            }
            
            if (!foundItinerary.destinations) {
                console.error('deleteDestination: Aucune destination trouvée dans l\'itinéraire');
                return false;
            }
            
            // Trouver et supprimer la destination
            const index = foundItinerary.destinations.findIndex(dest => dest.id === destination.id);
            
            if (index === -1) {
                console.error('deleteDestination: Destination non trouvée:', destination.id);
                return false;
            }
            
            foundItinerary.destinations.splice(index, 1);
            
            // Mettre à jour l'itinéraire
            this.updateItinerary(foundItinerary);
            return true;
        } catch (error) {
            console.error('Erreur suppression destination:', error);
            return false;
        }
    }

    /**
     * Retrouver une destination dans un itinéraire
     */
    getDestination(destination, itinerary) {
        const foundItinerary = this.getItinerary(itinerary);
        if (!foundItinerary || !foundItinerary.destinations) {
            return null;
        }
        return foundItinerary.destinations.find(dest => dest.id === destination.id);
    }

    /**
     * Retourner la liste des activités d'une destination
     */
    getActivities(destination, itinerary) {
        try {
            const foundDestination = this.getDestination(destination, itinerary);
            
            if (!foundDestination) {
                console.error('getActivities: Destination non trouvée:', destination.id);
                return [];
            }
            
            return foundDestination.activities || [];
        } catch (error) {
            console.error('Erreur récupération activités:', error);
            return [];
        }
    }

    /**
     * Ajouter une activité à une destination
     */
    async addActivity(activity, destination, itinerary) {
        try {
            const foundItinerary = this.getItinerary(itinerary);
            
            if (!foundItinerary) {
                console.error('addActivity: Itinéraire non trouvé:', itinerary.id);
                return false;
            }
            
            const foundDestination = this.getDestination(destination, itinerary);
            
            if (!foundDestination) {
                console.error('addActivity: Destination non trouvée:', destination.id);
                return false;
            }
            
            // Ajouter l'activité à la liste
            if (!foundDestination.activities) {
                foundDestination.activities = [];
            }
            foundDestination.activities.push(activity);
            
            // Mettre à jour l'itinéraire avec la nouvelle liste d'activités
            this.updateItinerary(foundItinerary);
            return true;
        } catch (error) {
            console.error('Erreur ajout activité:', error);
            return false;
        }
    }

    /**
     * Mettre à jour une activité dans une destination
     */
    async updateActivity(activity, destination, itinerary) {
        try {
            const foundItinerary = this.getItinerary(itinerary);
            
            if (!foundItinerary) {
                console.error('updateActivity: Itinéraire non trouvé:', itinerary.id);
                return false;
            }
            
            const foundDestination = this.getDestination(destination, itinerary);
            
            if (!foundDestination) {
                console.error('updateActivity: Destination non trouvée:', destination.id);
                return false;
            }
            
            if (!foundDestination.activities) {
                console.error('updateActivity: Aucune activité trouvée dans la destination');
                return false;
            }
            
            // Trouver et supprimer l'ancienne activité
            const index = foundDestination.activities.findIndex(act => act.id === activity.id);
            
            if (index === -1) {
                console.error('updateActivity: Activité non trouvée:', activity.id);
                return false;
            }
            
            foundDestination.activities.splice(index, 1);
            
            // Ajouter la nouvelle activité
            foundDestination.activities.push(activity);
            
            // Mettre à jour l'itinéraire
            this.updateItinerary(foundItinerary);
            return true;
        } catch (error) {
            console.error('Erreur mise à jour activité:', error);
            return false;
        }
    }

    /**
     * Supprimer une activité d'une destination
     */
    async deleteActivity(activity, destination, itinerary) {
        try {
            const foundItinerary = this.getItinerary(itinerary);
            
            if (!foundItinerary) {
                console.error('deleteActivity: Itinéraire non trouvé:', itinerary.id);
                return false;
            }
            
            const foundDestination = this.getDestination(destination, itinerary);
            
            if (!foundDestination) {
                console.error('deleteActivity: Destination non trouvée:', destination.id);
                return false;
            }
            
            if (!foundDestination.activities) {
                console.error('deleteActivity: Aucune activité trouvée dans la destination');
                return false;
            }
            
            // Trouver et supprimer l'activité
            const index = foundDestination.activities.findIndex(act => act.id === activity.id);
            
            if (index === -1) {
                console.error('deleteActivity: Activité non trouvée:', activity.id);
                return false;
            }
            
            foundDestination.activities.splice(index, 1);
            
            // Mettre à jour l'itinéraire
            this.updateItinerary(foundItinerary);
            return true;
        } catch (error) {
            console.error('Erreur suppression activité:', error);
            return false;
        }
    }
}

// Export du service pour utilisation globale
window.firebaseService = new FirebaseService();
