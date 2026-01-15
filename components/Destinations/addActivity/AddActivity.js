// Composant AddActivity
const AddActivity = {
    // État du composant
    activities: [],

    // Initialiser le composant
    init() {
        console.log('AddActivity initialisé');
    },

    // Afficher le popup d'activité
    showActivityPopup() {
        const popup = document.getElementById('activityPopup');
        if (popup) {
            popup.classList.add('active');
        }
    },

    // Cacher le popup d'activité
    hideActivityPopup() {
        const popup = document.getElementById('activityPopup');
        if (popup) {
            popup.classList.remove('active');
            this.clearActivityForm();
        }
    },

    // Sauvegarder une activité
    saveActivity() {
        const name = document.getElementById('activityName').value;
        const arrivalTime = document.getElementById('arrivalTime').value;
        const departureTime = document.getElementById('departureTime').value;
        const priceAmount = document.getElementById('priceAmount').value;
        const priceCurrency = document.getElementById('priceCurrency').value;
        const activityType = document.getElementById('activityType').value;

        if (!name.trim()) {
            alert('Veuillez saisir un nom d\'activité');
            return;
        }

        const activity = {
            name: name.trim(),
            arrivalTime: arrivalTime,
            departureTime: departureTime,
            price: {
                amount: parseFloat(priceAmount) || 0,
                currency: priceCurrency
            },
            type: activityType
        };

        this.activities.push(activity);
        this.loadActivities();
        this.hideActivityPopup();
        
        // Cocher automatiquement la case
        const checkbox = document.getElementById('showActivities');
        if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
        }

        console.log('Activité ajoutée:', activity);
    },

    // Vider le formulaire d'activité
    clearActivityForm() {
        document.getElementById('activityName').value = '';
        document.getElementById('arrivalTime').value = '';
        document.getElementById('departureTime').value = '';
        document.getElementById('priceAmount').value = '';
        document.getElementById('priceCurrency').value = 'EUR';
        document.getElementById('activityType').value = '';
    },

    // Basculer l'affichage de la liste des activités
    toggleActivityList() {
        const checkbox = document.getElementById('showActivities');
        const activityList = document.getElementById('activityList');
        
        if (checkbox && activityList) {
            if (checkbox.checked) {
                // Afficher les activités existantes
                this.loadActivities();
                activityList.style.display = 'block';
            } else {
                activityList.style.display = 'none';
            }
        }
    },

    // Charger les activités existantes
    loadActivities() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        // Pour l'instant, afficher un message par défaut
        // TODO: Charger les activités depuis Firebase
        if (this.activities && this.activities.length > 0) {
            activityList.innerHTML = this.activities.map(activity => 
                `<div class="activity-item">• ${activity}</div>`
            ).join('');
        } else {
            activityList.innerHTML = '<div class="no-activities">Aucune activité ajoutée pour cette destination</div>';
        }
    },

    // Ajouter une activité
    addActivity(activity) {
        if (activity && activity.trim()) {
            this.activities.push(activity.trim());
            this.loadActivities();
            
            // Cocher automatiquement la case
            const checkbox = document.getElementById('showActivities');
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
            }
        }
    },

    // Obtenir la liste des activités
    getActivities() {
        return this.activities || [];
    },

    // Vider toutes les activités
    clearActivities() {
        this.activities = [];
        this.loadActivities();
        
        // Décocher la case
        const checkbox = document.getElementById('showActivities');
        if (checkbox) {
            checkbox.checked = false;
        }
    }
};

// Exporter le composant
window.AddActivity = AddActivity;