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
            
            // Configurer l'observateur d'authentification pour détecter la session existante
            this.auth.onAuthStateChanged((user) => {
                this.user = user;
                console.log(user ? `✅ Utilisateur connecté: ${user.email}` : '🔒 Utilisateur déconnecté');
                
                // Déclencher un événement personnalisé pour notifier que l'auth est prête
                window.dispatchEvent(new CustomEvent('firebaseAuthReady', { 
                    detail: { 
                        user: user,
                        isAuthenticated: !!user 
                    } 
                }));
            });
            
            this.isInitialized = true;
            console.log('✅ Firebase initialisé');
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
            const result = await window.firebase.signInWithEmailAndPassword(this.auth, email, password);
            this.user = result.user;
            console.log('✅ Utilisateur connecté:', this.user.email);
            
            return this.user;
        } catch (error) {
            console.error('Erreur connexion:', error.message);
            hideLoading(); // Cacher le loading en cas d'échec
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
            const result = await window.firebase.createUserWithEmailAndPassword(this.auth, email, password);
            this.user = result.user;
            console.log('✅ Compte créé');
            return this.user;
        } catch (error) {
            console.error('Erreur inscription:', error.message);
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
            
            // Appeler updateUserPanel après déconnexion
            await window.updateUserPanel();
        } catch (error) {
            console.error('Erreur déconnexion:', error);
            hideLoading(); // Cacher le loading en cas d'échec
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
            await window.firebase.sendPasswordResetEmail(this.auth, email);
            console.log('✅ Email de réinitialisation envoyé');
            return true;
        } catch (error) {
            console.error('Erreur envoi email réinitialisation:', error.message);
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
     * Obtenir l'itinéraire actuel (celui avec active=true)
     */
    getCurrentItinerary() {
        const activeItinerary = this.itineraries.find(item => item.active === true);
        return activeItinerary || null;
    }

    /**
     * Créer un itinéraire en base et l'ajouter dans itineraries
     */
    async createItinerary(name, manageLoading = true) {
        if (!this.user) {
            console.error('createItinerary: Utilisateur non connecté');
            return null;
        }
        
        if (manageLoading) {
            showLoading();
        }
        
        try {
            const itinerary = {
                name: name,
                userId: this.user.uid,
                createdAt: window.firebase.serverTimestamp(),
                updatedAt: window.firebase.serverTimestamp(),
                destinations: [],
            };
            
            // Ajouter à la base de données
            const docRef = await window.firebase.addDoc(window.firebase.collection(this.db, 'itineraries'), itinerary);
            const newItinerary = { id: docRef.id, ...itinerary };
            
            // Mettre à jour la liste en mémoire
            // Désactiver tous les autres itinéraires
            this.itineraries.forEach(item => {
                item.active = false;
            });
            
            // Ajouter le nouvel itinéraire actif
            this.itineraries.push(newItinerary);
            
            // Mettre à jour les autres itinéraires en base pour les désactiver
            for (const item of this.itineraries) {
                if (item.id !== newItinerary.id) {
                    const itemRef = window.firebase.doc(this.db, 'itineraries', item.id);
                    await window.firebase.updateDoc(itemRef, { active: false });
                }
            }
            
            console.log('✅ Itinéraire créé:', name);
            return newItinerary;
        } catch (error) {
            console.error('❌ Erreur création itinéraire:', error);
            if (manageLoading) {
                hideLoading();
            }
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
            const itineraryRef = window.firebase.doc(this.db, 'itineraries', itinerary.id);
            await window.firebase.updateDoc(itineraryRef, {
                name: itinerary.name,
                destinations: itinerary.destinations,
                updatedAt: window.firebase.serverTimestamp()
            });
            
            console.log('✅ Itinéraire mis à jour');
            
            // Rafraîchir la synthèse après toute modification d'itinéraire
            if (window.Synthèse) {
                window.Synthèse.refresh();
            }
            
            return true;
        } catch (error) {
            console.error('Erreur mise à jour itinéraire:', error);
            return false;
        }
    }

    /**
     * Mettre à jour un itinéraire dans itineraries et en BDD
     */
    async updateCurrentItinerary() {
        return this.updateItinerary(this.getCurrentItinerary());
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
            
            console.log('✅ Itinéraire supprimé');
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
            
            // S'assurer qu'au moins un itinéraire est actif
            const hasActiveItinerary = itineraries.some(item => item.active === true);
            if (!hasActiveItinerary && itineraries.length > 0) {
                itineraries[0].active = true;
                console.log('📍 Premier itinéraire défini comme actif par défaut');
            }
            
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
     * Récupérer les destinations de l'itinéraire actuel
     */
    getDestinationsOfCurrentItinerary() {
        try {
            const itineraries = this.itineraries;
            if (itineraries.length === 0) {
                return [];
            }
            
            const currentItinerary = this.getCurrentItinerary();
            if (!currentItinerary) {
                return [];
            }
            
            return currentItinerary.destinations || [];
        } catch (error) {
            console.error('Erreur récupération destinations itinéraire actuel:', error);
            return [];
        }
    }

    /**
     * Mettre à jour une destination dans un itinéraire
     */
    async updateDestination(destination) {
        try {
            const foundItinerary = this.getCurrentItinerary();
            
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
            return await this.updateCurrentItinerary();;
        } catch (error) {
            console.error('Erreur mise à jour destination:', error);
            return false;
        }
    }

    /**
     * Supprimer une destination d'un itinéraire
     */
    async deleteDestination(destination) {
        try {
            const foundItinerary = this.getCurrentItinerary();
            
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
            return await this.updateCurrentItinerary();;
        } catch (error) {
            console.error('Erreur suppression destination:', error);
            return false;
        }
    }

    /**
     * Retrouver une destination dans un itinéraire
     */
    getDestination(destination) {
        return this.getCurrentItinerary().destinations.find(dest => dest.id === destination.id);
    }

    /**
     * Retourner la liste des activités d'une destination
     */
    getActivities(destination) {
        try {
            const foundDestination = this.getDestination(destination);
            
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
     * Supprimer une activité d'une destination
     */
    async deleteActivity(activity, destination) {
        try {
            const foundDestination = this.getDestination(destination);
            
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
            const updateSuccess = await this.updateCurrentItinerary();
            if (!updateSuccess) {
                console.error('deleteActivity: Échec de la mise à jour de l\'itinéraire');
                return false;
            }
            
            console.log('✅ Activité supprimée');
            return true;
        } catch (error) {
            console.error('Erreur suppression activité:', error);
            return false;
        }
    }
}

// Export du service pour utilisation globale
window.firebaseService = new FirebaseService();
