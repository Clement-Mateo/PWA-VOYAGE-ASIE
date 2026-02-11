// ========================================
// CLASSE MENU
// ========================================

class Menu {
    constructor() {
        this.isLoaded = false;
        this.isOpen = false;
        this.element = null;
        this.isMobile = window.innerWidth <= 768;
        this.currentState = this.isMobile ? 'navigation' : 'content'; // 'navigation' | 'content'
        this.currentAction = 'synthese';
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.content = {
            synthese: '<h4>Synthèse</h4><p>Analyse et statistiques de vos voyages</p>',
            calendar: '<h4>Calendrier</h4><p>Planification et gestion de votre emploi du temps</p>',
            notifications: '<h4>Notifications</h4><p>Alertes et messages importants</p>',
        };
    }

    async load() {
        if (this.isLoaded) return this.element;

        try {
            const response = await fetch('components/Menu/menu.html');
            const html = await response.text();
            
            const container = document.createElement('div');
            container.innerHTML = html;
            document.body.appendChild(container);
            
            this.element = document.getElementById('menuModal');
            this.isLoaded = true;
            this.bindEvents();
            
            console.log('Menu chargé');
            return this.element;
        } catch (error) {
            console.error('Erreur chargement menu:', error);
            throw error;
        }
    }

    async open() {
        await this.load();
        
        if (this.element) {
            this.element.classList.add('open');
            document.body.style.overflow = 'hidden';
            this.isOpen = true;
            
            if (this.isMobile) {
                // Mobile : afficher la navigation par défaut SANS bouton actif
                this.showNavigation();
                // Réinitialiser tous les boutons comme non-actifs
                this.element.querySelectorAll('.menu-option-btn').forEach(btn => btn.classList.remove('active'));
            } else {
                // Desktop : comportement normal
                const activeBtn = this.element.querySelector('.menu-option-btn.active');
                if (!activeBtn) {
                    const syntheseBtn = this.element.querySelector('[data-action="synthese"]');
                    if (syntheseBtn) {
                        syntheseBtn.classList.add('active');
                        this.handleAction('synthese', syntheseBtn);
                    }
                }
            }
        }
    }

    close() {
        if (this.element && this.isOpen) {
            this.element.classList.remove('open');
            document.body.style.overflow = '';
            this.isOpen = false;
        }
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    bindEvents() {        
        // Arrière-plan
        this.element.querySelector('.modal-backdrop').addEventListener('click', () => this.close());
        
        // Boutons du menu principal
        this.element.querySelectorAll('.menu-option-btn, .logout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAction(btn.dataset.action, btn);
            });
        });

        // Bouton menu mobile (toujours visible en mobile)
        const backBtn = document.getElementById('menuBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showNavigation();
            });
        }

        // Empêcher la propagation
        this.element.querySelector('.menu-container').addEventListener('click', e => e.stopPropagation());

        // Clavier
        document.addEventListener('keydown', (e) => {
            if (this.isOpen && e.key === 'Escape') this.close();
        });
        
        // Gestes tactiles pour mobile
        if (this.isMobile) {
            this.setupTouchGestures();
        }
    }

    setupTouchGestures() {
        const menuRight = this.element.querySelector('.menu-right');
        
        menuRight.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        menuRight.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
    }

    showNavigation() {
        if (!this.isMobile) return;
        
        const menuLeft = this.element.querySelector('.menu-left');
        const menuRight = this.element.querySelector('.menu-right');
        
        // Afficher menu-left avec animation
        menuLeft.classList.add('visible');
        menuRight.classList.add('hidden');

        this.element.querySelectorAll('.menu-option-btn').forEach(btn => btn.classList.remove('active'));
        
        this.currentState = 'navigation';
    }

    showContentView() {
        if (!this.isMobile) return;
        
        const menuLeft = this.element.querySelector('.menu-left');
        const menuRight = this.element.querySelector('.menu-right');
        const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
        
        // Cacher menu-left, afficher menu-right avec animation
        menuLeft.classList.remove('visible');
        menuRight.classList.remove('hidden');
        
        // Mettre à jour le titre du breadcrumb
        breadcrumbCurrent.textContent = this.getActionTitle(this.currentAction);
        
        this.currentState = 'content';
    }
    
    handleSwipe() {
        const swipeThreshold = 50;
        const diff = this.touchStartX - this.touchEndX;
        
        if (Math.abs(diff) < swipeThreshold) return;
        
        if (diff > 0) {
            // Swipe gauche -> fermer le menu
            if (this.currentState === 'navigation') {
                this.showContentView();
            }
        } else {
            // Swipe droit -> ouvrir le menu
            if (this.currentState === 'content') {
                this.showNavigation();
            }
        }
    }

    getActionTitle(action) {
        const titles = {
            synthese: 'Synthèse',
            itineraries: 'Mes Itinéraires',
            calendar: 'Calendrier',
            notifications: 'Notifications',
            profile: 'Profile',
            settings: 'Paramètres'
        };
        return titles[action] || 'Menu';
    }

    handleAction(action, button) {
        // Gérer les classes actives
        this.element.querySelectorAll('.menu-option-btn').forEach(btn => btn.classList.remove('active'));
        if (button && button.classList.contains('menu-option-btn')) {
            button.classList.add('active');
        }
        this.currentAction = action;

        // Forcer le chargement du contenu immédiatement
        switch(action) {
            case 'synthese':
                this.loadSynthese();
                break;
            case 'itineraries':
                this.loadItineraries();
                break;
            case 'settings':
                this.loadSettings();
                break;
            case 'profile':
                this.loadProfile();
                break;
            case 'logout':
                this.handleLogout();
                return; // Ne pas afficher le contenu pour logout
            default:
                // Pour calendar, notifications, etc.
                this.loadContent(action);
                break;
        }
        
        // Mobile : après sélection d'une option (sauf logout), afficher le contenu
        if (this.isMobile && action !== 'logout') {
            setTimeout(() => this.showContentView(), 100);
        }
    }

    loadContent(type = null) {
        const menuContent = this.element.querySelector('#menuContent');
        const contentType = type || this.currentAction;
        
        if (menuContent && this.content[contentType]) {
            menuContent.innerHTML = `<div class="menu-section"><div class="section-content">${this.content[contentType]}</div></div>`;
        }
    }

    loadSynthese() {
        const menuContent = this.element.querySelector('#menuContent');
        
        // Utiliser Synthèse.render() pour obtenir le HTML directement
        if (window.Synthèse && window.Synthèse.render) {
            // Afficher un loading pendant le calcul
            menuContent.innerHTML = `
                <div class="menu-section">
                    <div class="section-content">
                        <div class="synthese-loading">
                            <div class="loading-spinner"></div>
                            <p>Calcul de la synthèse...</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Charger le contenu de la synthèse de manière asynchrone
            window.Synthèse.render().then(content => {
                menuContent.innerHTML = `<div class="menu-section"><div class="section-content">${content}</div></div>`;
                
                // Initialiser les graphiques après l'affichage
                setTimeout(() => {
                    if (window.Synthèse && window.Synthèse.initCharts) {
                        window.Synthèse.initCharts();
                    }
                }, 100);
            }).catch(error => {
                console.error('Erreur lors du chargement de la synthèse:', error);
                menuContent.innerHTML = `
                    <div class="menu-section">
                        <div class="section-content">
                            <div class="synthese-error">
                                <span class="material-icons">error</span>
                                <p>Erreur lors du chargement de la synthèse</p>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            menuContent.innerHTML = '<p>Erreur de chargement du composant Synthèse</p>';
        }
    }

    loadItineraries() {
        const menuContent = this.element.querySelector('#menuContent');
        
        // Utiliser Itineraries.render() pour obtenir le HTML directement
        if (window.Itineraries && window.Itineraries.render) {
            menuContent.innerHTML = window.Itineraries.render();
            
            // Charger les données des itinéraires après l'affichage
            setTimeout(() => {
                if (window.Itineraries && window.Itineraries.renderItineraries) {
                    window.Itineraries.renderItineraries();
                    window.Itineraries.updateAddItineraryButtonVisibility();
                }
            }, 100);
        } else {
            menuContent.innerHTML = '<p>Erreur de chargement du composant Itineraries</p>';
        }
    }

    loadSettings() {
        const menuContent = this.element.querySelector('#menuContent');
        
        // Utiliser Settings.render() pour obtenir le HTML directement
        if (window.Settings && window.Settings.render) {
            menuContent.innerHTML = window.Settings.render();
            
            // Initialiser les événements et charger les données après l'affichage
            setTimeout(() => {
                if (window.Settings) {
                    window.Settings.initEventListeners();
                    window.Settings.loadUserInfo();
                    window.Settings.loadCurrentMapStyle();
                }
            }, 100);
        } else {
            menuContent.innerHTML = '<p>Erreur de chargement du composant Settings</p>';
        }
    }

    loadProfile() {
        const menuContent = this.element.querySelector('#menuContent');
        menuContent.innerHTML = `
            <div class="menu-section" id="profile-avatar-section"></div>
            <div class="menu-section" id="profile-content"></div>
        `;
        
        // Charger avatar
        fetch('components/Menu/profile/avatar.html')
            .then(r => r.ok ? r.text() : Promise.reject('Avatar non trouvé'))
            .then(html => {
                document.getElementById('profile-avatar-section').innerHTML = html;
            })
            .catch(console.error);
            
        // Charger profil
        fetch('components/Menu/profile/profile.html')
            .then(r => r.ok ? r.text() : Promise.reject('Profil non trouvé'))
            .then(html => {
                document.getElementById('profile-content').innerHTML = html;
            })
            .catch(console.error);
    }

    handleLogout() {
        this.close();
        if (window.handleLogout) window.handleLogout();
    }
}

// Instance globale
window.Menu = new Menu();
