const Synthèse = {
    /**
     * Initialiser le composant Synthèse
     */
    init() {
        console.log('Synthèse: Initialisation...');
    },
    
    /**
     * Rendre le composant Synthèse
     */
    render(container) {
        if (!container) {
            console.error('Synthèse: Conteneur non fourni');
            return;
        }
        
        container.innerHTML = `
            <div class="synthèse-content">
                <h2>Synthèse du voyage</h2>
                <p>Contenu à développer...</p>
            </div>
        `;
    }
};

// Exporter globalement
window.Synthèse = Synthèse;
