class LoadingAnimation {
    constructor() {
        this.currentFrame = 1;
        this.totalFrames = 399;
        this.animationElement = document.getElementById('loadingAnimation');
        this.interval = null;
        this.fps = 24;
        this.frameDuration = 1000 / this.fps; // ~41.67ms pour 24fps
    }

    start() {
        if (!this.animationElement) return;
        
        this.interval = setInterval(() => {
            const frameNumber = this.currentFrame.toString().padStart(4, '0');
            this.animationElement.src = `Images/Ecran_chargement/${frameNumber}.png`;
            
            this.currentFrame++;
            if (this.currentFrame > this.totalFrames) {
                this.currentFrame = 1; // Boucle de l'animation
            }
        }, this.frameDuration);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

// Exporter la classe
window.LoadingAnimation = LoadingAnimation;

// Initialisation automatique quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser et contrôler l'animation
    const loadingAnimation = new LoadingAnimation();

    // Démarrer/arrêter l'animation selon l'état du loading
    const loadingOverlay = document.getElementById('loadingOverlay');

    function updateAnimationState() {
        if (loadingOverlay.classList.contains('active')) {
            loadingAnimation.start();
        } else {
            loadingAnimation.stop();
        }
    }

    // Observer les changements de classe
    const observer = new MutationObserver(updateAnimationState);
    observer.observe(loadingOverlay, { attributes: true, attributeFilter: ['class'] });

    // Vérifier l'état initial
    updateAnimationState();
});