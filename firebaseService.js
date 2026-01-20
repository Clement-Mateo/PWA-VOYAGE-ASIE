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
            
            const itinerary = {
                nom: nom,
                userId: this.user.uid,
                createdAt: window.firebase.serverTimestamp(),
                updatedAt: window.firebase.serverTimestamp()
            };
            
            const docRef = await window.firebase.addDoc(
                window.firebase.collection(this.db, 'itineraries'),
                itinerary
            );
            
            const createdItinerary = { id: docRef.id, ...itinerary };
            console.log('✅ Itinéraire créé:', createdItinerary.id);
            
            return createdItinerary;
        } catch (error) {
            console.error('Erreur création itinéraire:', error);
            return null;
        }
    }

    /**
     * Ajouter une destination à la sous-collection destinations d'un itinéraire
     */
    async addDestination(itineraryId, destinationData) {
        if (!this.user) return null;
        
        try {
            console.log('Ajout destination à itinéraire:', itineraryId);
            console.log('Données destination:', destinationData);
            
            // Vérifier que l'itinéraire existe
            const itineraryRef = window.firebase.doc(this.db, 'itineraries', itineraryId);
            const itinerarySnap = await window.firebase.getDoc(itineraryRef);
            
            if (!itinerarySnap.exists()) {
                console.error('Itinéraire non trouvé:', itineraryId);
                return null;
            }
            
            console.log('Itinéraire trouvé, création de la destination dans la sous-collection...');
            
            // Créer la destination dans la sous-collection destinations de l'itinéraire
            const destinationsCollection = window.firebase.collection(this.db, 'itineraries', itineraryId, 'destinations');
            const newDestinationRef = await window.firebase.addDoc(destinationsCollection, {
                ...destinationData,
                createdAt: window.firebase.serverTimestamp(),
                order: destinationData.order || 0
            });
            
            // Mettre à jour le timestamp de l'itinéraire
            await window.firebase.updateDoc(itineraryRef, {
                updatedAt: window.firebase.serverTimestamp()
            });
            
            const newDestination = {
                firestoreId: newDestinationRef.id,
                ...destinationData,
                createdAt: new Date(),
                order: destinationData.order || 0
            };
            
            console.log('Destination ajoutée avec succès dans la sous-collection:', newDestination);
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
     * Récupérer toutes les destinations de l'utilisateur depuis la sous-collection de son itinéraire
     */
    async getDestinations() {
        if (!this.user) return [];
        
        try {
            console.log('🔍 Recherche destinations pour userId:', this.user.uid);
            
            // D'abord récupérer l'itinéraire de l'utilisateur
            const itineraries = await this.getItineraries();
            
            if (itineraries.length === 0) {
                console.log('📭 Aucun itinéraire trouvé pour cet utilisateur');
                return [];
            }
            
            const itineraryId = itineraries[0].id;
            console.log('🗺️ Itinéraire trouvé:', itineraryId);
            
            // Récupérer les destinations depuis la sous-collection destinations de l'itinéraire
            const destinationsCollection = window.firebase.collection(this.db, 'itineraries', itineraryId, 'destinations');
            const q = window.firebase.query(
                destinationsCollection,
                window.firebase.orderBy('order', 'asc')
            );
            
            console.log('🔍 Requête Firestore créée pour la sous-collection');
            
            const snapshot = await window.firebase.getDocs(q);
            
            console.log('🔍 Snapshot obtenu, nombre de documents:', snapshot.docs.length);
            
            const destinations = snapshot.docs.map((doc, index) => ({ 
                firestoreId: doc.id, 
                ...doc.data(),
                order: doc.data().order !== undefined ? doc.data().order : index
            }));
            
            console.log('✅ Destinations récupérées depuis la sous-collection:', destinations.length);
            console.log('🔍 Détails des destinations:', destinations);
            
            return destinations;
        } catch (error) {
            console.error('❌ Erreur récupération destinations depuis la sous-collection:', error.message);
            console.error('❌ Code erreur:', error.code);
            return [];
        }
    }

    /**
     * Ajouter une activité à la sous-collection activities d'une destination
     */
    async addActivity(itineraryId, destinationId, activityData) {
        if (!this.user) return null;
        
        try {
            console.log('Ajout activité à destination:', destinationId, 'dans itinéraire:', itineraryId);
            console.log('Données activité:', activityData);
            
            // Créer l'activité dans la sous-collection activities de la destination
            const activitiesCollection = window.firebase.collection(
                this.db, 
                'itineraries', 
                itineraryId, 
                'destinations', 
                destinationId, 
                'activities'
            );
            
            const newActivityRef = await window.firebase.addDoc(activitiesCollection, {
                ...activityData,
                // Ne plus ajouter userId - il vient de l'itinéraire
                createdAt: window.firebase.serverTimestamp(),
                order: activityData.order || 0
            });

            const newActivity = {
                firestoreId: newActivityRef.id,
                ...activityData,
                createdAt: new Date()
            };
            
            console.log('Activité ajoutée avec succès dans la sous-collection:', newActivity);
            return newActivity;
        } catch (error) {
            console.error('Erreur ajout activité:', error);
            return null;
        }
    }

    /**
     * Récupérer toutes les activités d'une destination
     */
    async getActivitiesForDestination(itineraryId, destinationId) {
        if (!this.user) return [];
        
        try {
            console.log('🔍 Recherche activités pour destination:', destinationId);
            
            // Récupérer les activités depuis la sous-collection activities de la destination
            const activitiesCollection = window.firebase.collection(
                this.db, 
                'itineraries', 
                itineraryId, 
                'destinations', 
                destinationId, 
                'activities'
            );
            
            const q = window.firebase.query(
                activitiesCollection,
                window.firebase.orderBy('createdAt', 'desc')
            );
            
            const snapshot = await window.firebase.getDocs(q);
            
            const activities = snapshot.docs.map(doc => ({ 
                firestoreId: doc.id, 
                ...doc.data()
            }));
            
            console.log('✅ Activités récupérées depuis la sous-collection:', activities.length);
            return activities;
        } catch (error) {
            console.error('❌ Erreur récupération activités depuis la sous-collection:', error.message);
            return [];
        }
    }

    /**
     * Mettre à jour une activité
     */
    async updateActivity(itineraryId, destinationId, activityId, activityData) {
        if (!this.user) return false;
        
        try {
            const activityRef = window.firebase.doc(
                this.db, 
                'itineraries', 
                itineraryId, 
                'destinations', 
                destinationId, 
                'activities', 
                activityId
            );
        
            await window.firebase.updateDoc(activityRef, activityData);
            
            console.log('✅ Activité mise à jour avec succès:', activityId);
            return true;
        } catch (error) {
            console.error('❌ Erreur mise à jour activité:', error);
            return false;
        }
    }

    /**
     * Supprimer une activité
     */
    async deleteActivity(itineraryId, destinationId, activityId) {
        if (!this.user) return false;
        
        try {
            console.log('Suppression activité:', activityId);
            
            const activityRef = window.firebase.doc(
                this.db, 
                'itineraries', 
                itineraryId, 
                'destinations', 
                destinationId, 
                'activities', 
                activityId
            );
            
            await window.firebase.deleteDoc(activityRef);
            
            console.log('✅ Activité supprimée avec succès:', activityId);
            return true;
        } catch (error) {
            console.error('❌ Erreur suppression activité:', error);
            return false;
        }
    }

    /**
     * Supprimer une destination et toutes ses activités
     */
    async deleteDestination(itineraryId, destinationId) {
        if (!this.user) return false;
        
        try {
            console.log('Suppression destination:', destinationId, 'et ses activités');
            
            // D'abord supprimer toutes les activités de cette destination
            const activities = await this.getActivitiesForDestination(itineraryId, destinationId);
            
            for (const activity of activities) {
                await this.deleteActivity(itineraryId, destinationId, activity.firestoreId);
            }
            
            // Ensuite supprimer la destination
            const destinationRef = window.firebase.doc(
                this.db, 
                'itineraries', 
                itineraryId, 
                'destinations', 
                destinationId
            );
            
            await window.firebase.deleteDoc(destinationRef);
            
            // Mettre à jour le timestamp de l'itinéraire
            const itineraryRef = window.firebase.doc(this.db, 'itineraries', itineraryId);
            await window.firebase.updateDoc(itineraryRef, {
                updatedAt: window.firebase.serverTimestamp()
            });
            
            console.log('Destination et ses activités supprimées avec succès:', destinationId);
            return true;
        } catch (error) {
            console.error('Erreur suppression destination:', error);
            return false;
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
     * Ajouter une destination à l'itinéraire actuel (nouvelle architecture)
     */
    async addDestinationToItinerary(destination) {
        if (!this.user) {
            throw new Error('Utilisateur non connecté');
        }
        
        try {
            const itineraries = await this.getItineraries();
            
            if (itineraries.length > 0) {
                const currentItinerary = itineraries[0];
                
                // Utiliser la nouvelle méthode addDestination qui crée dans la sous-collection
                const destinationData = {
                    ...destination,
                    order: destination.order || 0
                };
                
                const newDestination = await this.addDestination(currentItinerary.id, destinationData);
                
                if (newDestination) {
                    console.log('✅ Destination ajoutée à l\'itinéraire:', newDestination);
                    return newDestination;
                } else {
                    throw new Error('Échec de l\'ajout de la destination');
                }
            } else {
                throw new Error('Aucun itinéraire trouvé');
            }
        } catch (error) {
            console.error('❌ Erreur ajout destination à l\'itinéraire:', error);
            throw error;
        }
    }

    // Méthodes utilitaires

    /**
     * Obtenir l'itinéraire actuel de l'utilisateur
     */
    async getCurrentItinerary() {
        if (!this.user) return null;
        
        try {
            const itineraries = await this.getItineraries();
            return itineraries.length > 0 ? itineraries[0] : null;
        } catch (error) {
            console.error('Erreur récupération itinéraire actuel:', error);
            return null;
        }
    }

    /**
     * Mettre à jour une destination existante (nouvelle architecture)
     */
    async updateDestination(destination) {
        if (!this.user) {
            throw new Error('Utilisateur non connecté');
        }
        
        try {
            // Obtenir l'itinéraire actuel
            const currentItinerary = await this.getCurrentItinerary();
            if (!currentItinerary) {
                throw new Error('Aucun itinéraire trouvé');
            }
            
            // Mettre à jour la destination dans la sous-collection
            const destinationRef = window.firebase.doc(
                this.db, 
                'itineraries', 
                currentItinerary.id, 
                'destinations', 
                destination.firestoreId
            );
            
            await window.firebase.updateDoc(destinationRef, {
                ...destination,
                updatedAt: window.firebase.serverTimestamp()
            });
            
            // Mettre à jour le timestamp de l'itinéraire
            const itineraryRef = window.firebase.doc(this.db, 'itineraries', currentItinerary.id);
            await window.firebase.updateDoc(itineraryRef, {
                updatedAt: window.firebase.serverTimestamp()
            });
            
            console.log('✅ Destination mise à jour avec succès:', destination.firestoreId);
            return true;
        } catch (error) {
            console.error('❌ Erreur mise à jour destination:', error);
            throw error;
        }
    }

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
}

// Export du service pour utilisation globale
window.firebaseService = new FirebaseService();
