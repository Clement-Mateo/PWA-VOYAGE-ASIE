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
        // Bouton fermeture
        this.element.querySelector('.btn-close').addEventListener('click', () => this.close());
        
        // Arrière-plan
        this.element.querySelector('.modal-backdrop').addEventListener('click', () => this.close());
        
        // Boutons du menu
        this.element.querySelectorAll('.menu-btn, .logout-btn').forEach(btn => {
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
        this.element.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
        if (button && button.classList.contains('menu-btn')) button.classList.add('active');

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
        rightContent.innerHTML = `
            <div class="menu-section">
                <div class="section-content" id="itineraries-container">
                    <!-- Chargement... -->
                </div>
            </div>
        `;
        
        setTimeout(() => {
            const container = document.getElementById('itineraries-container');
            if (container && window.Itineraries) {
                window.Itineraries.open();
            } else {
                container.innerHTML = '<p>Erreur de chargement</p>';
            }
        }, 100);
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
