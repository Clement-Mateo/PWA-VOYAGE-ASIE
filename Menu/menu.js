// ========================================
// FONCTIONNALITÉS DU MENU MODAL
// ========================================

// Variables globales
let menuModal = null;
let isMenuOpen = false;

// Initialisation lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    menuModal = document.getElementById('menuModal');
    
    // Empêcher la propagation du clic depuis le conteneur
    const menuContainer = document.querySelector('.menu-container');
    if (menuContainer) {
        menuContainer.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Gérer les touches du clavier
    document.addEventListener('keydown', handleKeyPress);
});

// Ouvrir le menu
function openMenu() {
    if (!menuModal) {
        menuModal = document.getElementById('menuModal');
    }
    
    if (menuModal && !isMenuOpen) {
        menuModal.classList.add('open');
        isMenuOpen = true;
        document.body.style.overflow = 'hidden'; // Empêcher le scroll du body
        
        // Focus sur le premier élément interactif
        const firstMenuItem = document.querySelector('.menu-item');
        if (firstMenuItem) {
            firstMenuItem.focus();
        }
        
        console.log('Menu ouvert');
    }
}

// Fermer le menu
function closeMenu() {
    if (menuModal && isMenuOpen) {
        menuModal.classList.remove('open');
        isMenuOpen = false;
        document.body.style.overflow = ''; // Rétablir le scroll du body
        
        console.log('Menu fermé');
    }
}

// Gérer les actions du menu
function handleMenuAction(action) {
    console.log('Action du menu:', action);
    
    switch(action) {
        case 'map':
            // Action pour afficher la carte
            showSnackbar('Affichage de la carte...', 'info');
            closeMenu();
            // Ici vous pouvez ajouter la logique pour afficher la carte
            break;
            
        case 'search':
            // Action pour rechercher
            showSnackbar('Ouverture de la recherche...', 'info');
            closeMenu();
            // Ici vous pouvez ajouter la logique pour la recherche
            break;
            
        case 'itinerary':
            // Action pour les itinéraires
            showSnackbar('Gestion des itinéraires...', 'info');
            closeMenu();
            // Ici vous pouvez ajouter la logique pour les itinéraires
            break;
            
        case 'profile':
            // Action pour le profil
            showSnackbar('Ouverture du profil...', 'info');
            closeMenu();
            // Ici vous pouvez ajouter la logique pour le profil
            break;
            
        case 'preferences':
            // Action pour les préférences
            showSnackbar('Ouverture des préférences...', 'info');
            closeMenu();
            // Ici vous pouvez ajouter la logique pour les préférences
            break;
            
        case 'help':
            // Action pour l'aide
            showSnackbar('Ouverture de l\'aide...', 'info');
            closeMenu();
            // Ici vous pouvez ajouter la logique pour l'aide
            break;
            
        default:
            console.warn('Action non reconnue:', action);
            showSnackbar('Action non disponible', 'error');
    }
}

// Gérer les touches du clavier
function handleKeyPress(event) {
    if (!isMenuOpen) return;
    
    switch(event.key) {
        case 'Escape':
            closeMenu();
            break;
            
        case 'Enter':
            // Si l'élément focusé est un menu-item, déclencher l'action
            if (event.target.classList.contains('menu-item')) {
                const action = event.target.getAttribute('onclick').match(/'([^']+)'/)[1];
                handleMenuAction(action);
            }
            break;
    }
}

// Navigation au clavier dans le menu
document.addEventListener('keydown', function(event) {
    if (!isMenuOpen) return;
    
    const menuItems = Array.from(document.querySelectorAll('.menu-item'));
    const currentIndex = menuItems.indexOf(document.activeElement);
    
    switch(event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (currentIndex < menuItems.length - 1) {
                menuItems[currentIndex + 1].focus();
            } else {
                menuItems[0].focus(); // Retour au début
            }
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            if (currentIndex > 0) {
                menuItems[currentIndex - 1].focus();
            } else {
                menuItems[menuItems.length - 1].focus(); // Aller à la fin
            }
            break;
            
        case 'Tab':
            event.preventDefault();
            // Navigation personnalisée avec Tab
            if (event.shiftKey) {
                // Shift+Tab : navigation arrière
                if (currentIndex > 0) {
                    menuItems[currentIndex - 1].focus();
                } else {
                    document.querySelector('.btn-close').focus();
                }
            }
            break;
    }
});

// Fonction pour afficher des snackbar (si disponible dans le projet principal)
function showSnackbar(message, type = 'info') {
    // Vérifier si la fonction showSnackbar existe dans le projet principal
    if (typeof window.showSnackbar === 'function') {
        window.showSnackbar(message, type);
    } else {
        // Créer une notification simple si la fonction n'existe pas
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Créer un élément de notification temporaire
        const notification = document.createElement('div');
        notification.className = `temp-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? 'var(--accent-red)' : 'var(--info-blue)'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Afficher la notification
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);
        
        // Masquer et supprimer après 3 secondes
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Fonction pour basculer le menu
function toggleMenu() {
    if (isMenuOpen) {
        closeMenu();
    } else {
        openMenu();
    }
}

// Exporter les fonctions pour utilisation externe
window.MenuManager = {
    open: openMenu,
    close: closeMenu,
    toggle: toggleMenu,
    isOpen: () => isMenuOpen
};

// Fonction pour charger les itinéraires
function loadItineraries() {
    console.log('Chargement des itinéraires...');
    
    // Fermer le menu
    closeMenu();
    
    // Afficher un message de chargement
    if (typeof showSnackbar === 'function') {
        showSnackbar('Chargement des itinéraires...', 'info');
    }
    
    // Vérifier si le service itinéraires existe
    if (window.itinerariesService && window.itinerariesService.loadItineraries) {
        // Charger les itinéraires depuis le service
        window.itinerariesService.loadItineraries().then(itineraries => {
            console.log('Itinéraires chargés:', itineraries);
            if (typeof showSnackbar === 'function') {
                showSnackbar(`${itineraries.length} itinéraire(s) trouvé(s)`, 'success');
            }
        }).catch(error => {
            console.error('Erreur lors du chargement des itinéraires:', error);
            if (typeof showSnackbar === 'function') {
                showSnackbar('Erreur lors du chargement des itinéraires', 'error');
            }
        });
    } else {
        // Alternative : charger directement depuis Firestore
        if (window.firebase && window.firebase.db) {
            const db = window.firebase.db;
            const userId = window.firebase.auth ? window.firebase.auth.currentUser?.uid : null;
            
            if (userId) {
                const itinerariesRef = window.firebase.collection(db, 'users', userId, 'itineraries');
                window.firebase.getDocs(itinerariesRef).then(snapshot => {
                    const itineraries = [];
                    snapshot.forEach(doc => {
                        itineraries.push({ id: doc.id, ...doc.data() });
                    });
                    console.log('Itinéraires chargés depuis Firestore:', itineraries);
                    if (typeof showSnackbar === 'function') {
                        showSnackbar(`${itineraries.length} itinéraire(s) trouvé(s)`, 'success');
                    }
                }).catch(error => {
                    console.error('Erreur Firestore:', error);
                    if (typeof showSnackbar === 'function') {
                        showSnackbar('Erreur lors du chargement', 'error');
                    }
                });
            } else {
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Veuillez vous connecter pour voir vos itinéraires', 'warning');
                }
            }
        } else {
            if (typeof showSnackbar === 'function') {
                showSnackbar('Service itinéraires non disponible', 'error');
            }
        }
    }
}

// Fonction pour gérer la sélection des items du menu
function selectMenuItem(itemType, buttonElement) {
    console.log('Sélection:', itemType);
    
    // Retirer la classe active de tous les boutons
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Ajouter la classe active au bouton cliqué
    buttonElement.classList.add('active');
    
    // Fermer le menu
    closeMenu();
    
    // Mettre à jour le contenu de droite selon le type
    updateRightContent(itemType);
}

// Fonction pour charger dynamiquement un fichier CSS
function loadCSS(cssPath) {
    console.log('Chargement CSS:', cssPath);
    
    // Vérifier si le CSS est déjà chargé
    const existingLink = document.querySelector(`link[href="${cssPath}"]`);
    if (existingLink) {
        console.log('CSS existant trouvé, suppression...');
        existingLink.remove();
    }
    
    // Créer et ajouter le nouveau lien CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssPath;
    link.type = 'text/css';
    document.head.appendChild(link);
    console.log('CSS ajouté au head');
}

// Fonction pour mettre à jour le contenu de droite
function updateRightContent(itemType) {
    const profileContent = document.getElementById('profile-content');
    if (!profileContent) return;
    
    let contentHTML = '';
    
    switch(itemType) {
        case 'itineraries':
            contentHTML = `
                <h4>Mes Itinéraires</h4>
                <p>Gestion de vos itinéraires de voyage</p>
            `;
            break;
            
        case 'synthese':
            contentHTML = `
                <h4>Synthèse</h4>
                <p>Analyse et statistiques de vos voyages</p>
            `;
            break;
            
        case 'calendar':
            contentHTML = `
                <h4>Calendrier</h4>
                <p>Planification et gestion de votre emploi du temps</p>
            `;
            break;
            
        case 'notifications':
            contentHTML = `
                <h4>Notifications</h4>
                <p>Alertes et messages importants</p>
            `;
            break;
            
        case 'profile':
            console.log('Chargement du profil...');
            // Charger le contenu HTML depuis le fichier profile
            fetch('menu/profile/profile.html')
                .then(response => {
                    console.log('Réponse profile:', response.status, response.statusText);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    return response.text();
                })
                .then(html => {
                    console.log('HTML profile chargé avec succès');
                    profileContent.innerHTML = html;
                    loadCSS('menu/profile/profile.css');
                    
                    // Charger le JavaScript du profil après un court délai
                    setTimeout(() => {
                        const script = document.createElement('script');
                        script.src = 'menu/profile/profile.js';
                        script.onload = () => {
                            console.log('JavaScript du profil chargé');
                        };
                        script.onerror = (error) => {
                            console.error('Erreur chargement JS profil:', error);
                        };
                        document.head.appendChild(script);
                    }, 100);
                })
                .catch(error => {
                    console.error('Erreur détaillée chargement profile:', error);
                    console.error('Stack trace:', error.stack);
                    profileContent.innerHTML = `<p>Erreur de chargement: ${error.message}</p>`;
                });
            return; // Sortir de la fonction pour ne pas exécuter le reste
            
        case 'settings':
            contentHTML = `
                <h4>Paramètres</h4>
                <p>Configuration de l'application</p>
                <ul>
                    <li>Carte et navigation</li>
                    <li>Préférences d'affichage</li>
                    <li>Paramètres de compte</li>
                    <li>Confidentialité et sécurité</li>
                </ul>
            `;
            break;
            
        default:
            contentHTML = `
                <h4>Paramètres</h4>
                <p>Choisissez une option dans le menu</p>
            `;
    }
    
    // Mettre à jour le contenu
    profileContent.innerHTML = contentHTML;
}

// Exporter les fonctions globalement
window.openMenuModal = openMenuModal;
window.closeMenuModal = closeMenuModal;
window.handleMenuAction = handleMenuAction;
window.loadItineraries = loadItineraries;
window.selectMenuItem = selectMenuItem;
window.updateRightContent = updateRightContent;
