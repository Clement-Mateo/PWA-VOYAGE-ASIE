// ========================================
// CLASSE MENU
// ========================================

class Menu {
    constructor() {
        this.isLoaded = false;
        this.isOpen = false;
        this.element = null;
        this.content = {
            synthese: '<h4>Synthèse</h4><p>Analyse et statistiques de vos voyages</p>',
            calendar: '<h4>Calendrier</h4><p>Planification et gestion de votre emploi du temps</p>',
            notifications: '<h4>Notifications</h4><p>Alertes et messages importants</p>',
            settings: '<h4>Paramètres</h4><p>Configuration de l\'application</p>'
        };
    }

    async load() {
        if (this.isLoaded) return this.element;

        try {
            const response = await fetch('menu/menu.html');
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
            console.log('Menu ouvert');
            
            // Activer le bouton synthèse par défaut si aucun bouton n'est actif
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

    close() {
        if (this.element && this.isOpen) {
            this.element.classList.remove('open');
            document.body.style.overflow = '';
            this.isOpen = false;
            console.log('Menu fermé');
        }
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    bindEvents() {        
        // Arrière-plan
        this.element.querySelector('.modal-backdrop').addEventListener('click', () => this.close());
        
        // Boutons du menu
        this.element.querySelectorAll('.menu-option-btn, .logout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAction(btn.dataset.action, btn);
            });
        });

        // Empêcher la propagation
        this.element.querySelector('.menu-container').addEventListener('click', e => e.stopPropagation());

        // Clavier
        document.addEventListener('keydown', (e) => {
            if (this.isOpen && e.key === 'Escape') this.close();
        });
    }

    handleAction(action, button) {
        // Gérer les classes actives
        this.element.querySelectorAll('.menu-option-btn').forEach(btn => btn.classList.remove('active'));
        if (button && button.classList.contains('menu-option-btn')) button.classList.add('active');

        switch(action) {
            case 'itineraries':
                this.loadItineraries();
                break;
            case 'profile':
                this.loadProfile();
                break;
            case 'logout':
                this.handleLogout();
                break;
            default:
                this.showContent(action);
        }
    }

    showContent(type) {
        const rightContent = this.element.querySelector('.menu-right');
        if (rightContent && this.content[type]) {
            rightContent.innerHTML = `<div class="menu-section"><div class="section-content">${this.content[type]}</div></div>`;
        }
    }

    loadItineraries() {
        const rightContent = this.element.querySelector('.menu-right');
        
        // Utiliser Itineraries.render() pour obtenir le HTML directement
        if (window.Itineraries && window.Itineraries.render) {
            rightContent.innerHTML = window.Itineraries.render();
            
            // Charger les données des itinéraires après l'affichage
            setTimeout(() => {
                if (window.Itineraries && window.Itineraries.renderItineraries) {
                    window.Itineraries.renderItineraries();
                    this.updateAddItineraryButtonVisibility();
                }
            }, 100);
        } else {
            rightContent.innerHTML = '<p>Erreur de chargement du composant Itineraries</p>';
        }
    }

    loadProfile() {
        const rightContent = this.element.querySelector('.menu-right');
        rightContent.innerHTML = `
            <div class="menu-section" id="profile-avatar-section"></div>
            <div class="menu-section" id="profile-content"></div>
        `;
        
        // Charger avatar
        fetch('menu/profile/avatar.html')
            .then(r => r.ok ? r.text() : Promise.reject('Avatar non trouvé'))
            .then(html => {
                document.getElementById('profile-avatar-section').innerHTML = html;
            })
            .catch(console.error);
            
        // Charger profil
        fetch('menu/profile/profile.html')
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
