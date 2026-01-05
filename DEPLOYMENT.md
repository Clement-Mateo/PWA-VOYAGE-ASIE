# Carte du Monde Interactive - Déploiement

## Option 1 : Développement Local (pour tester)

### Étapes :
1. **Lancer le serveur sur PC** :
   ```bash
   python places_server.py
   ```

2. **Trouver votre IP locale** :
   ```bash
   ipconfig
   ```
   Notez l'adresse (ex: `192.168.1.100`)

3. **Sur mobile (même WiFi)** :
   - Ouvrir : `http://192.168.1.100:8000`
   - Menu → "Ajouter à l'écran d'accueil"

## Option 2 : Déploiement en Ligne (recommandé)

### GitHub Pages (gratuit) :
1. Créez un repo GitHub : `carte-monde-interactive`
2. Uploadez tous les fichiers
3. Settings → Pages → Activez
4. URL : `https://votrenom.github.io/carte-monde-interactive`

### Netlify (gratuit) :
1. Uploadez les fichiers sur netlify.com
2. URL automatique : `https://nom-aleatoire.netlify.app`

### Vercel (gratuit) :
1. Uploadez les fichiers sur vercel.com
2. URL automatique

## Option 3 : Application Native (avancé)

Pour une vraie app mobile sans serveur :
- Utiliser **Capacitor** ou **Cordova**
- Convertit la PWA en app native
- Plus complexe, nécessite compilation

## Recommandation

**Pour tester** : Option 1 (développement local)
**Pour production** : Option 2 (GitHub Pages/Netlify)
**Pour app native** : Option 3 (Capacitor)

## Limitations

- **Recherche API** nécessite internet
- **Hors ligne** : carte fonctionnelle, recherche désactivée
- **Installation** : nécessite HTTPS en production
