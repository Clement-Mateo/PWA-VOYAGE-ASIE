# Carte du Monde Interactive - PWA

## 🚀 Démonstration en ligne

**URL de production :**
```
https://clement-mateo.github.io/PWA-VOYAGE-ASIE/
```

## 📱 Installation sur mobile

1. **Ouvrez l'URL** sur votre mobile : `https://clement-mateo.github.io/PWA-VOYAGE-ASIE/`
2. **Menu** du navigateur → "Ajouter à l'écran d'accueil"
3. **L'icône** apparaîtra sur votre écran d'accueil
4. **Lancez** l'application comme une app native

## 🛠️ Développement local

### Prérequis

- Python 3.x installé sur votre machine
- Terminal/PowerShell

### Lancement du serveur local

1. **Ouvrez un terminal** dans le dossier du projet
2. **Lancez le serveur** :
   ```bash
   python places_server.py
   ```

3. **Messages attendus** :
   ```
   Serving at http://localhost:8000
   Appuyez sur Ctrl+C pour arrêter le serveur
   ```

### Accès depuis le PC

**URL locale :**
```
http://localhost:8000
```
## 🔧 Configuration

### API Google Maps

La recherche utilise Google Geocoding API avec la clé intégrée.
- **Places API** : disponible uniquement en développement local (via proxy)
- **Geocoding API** : fonctionne partout (production et local)

### Mode hors ligne

- ✅ **Carte** : disponible (cache)
- ❌ **Recherche** : désactivée (nécessite internet)
- 📱 **Message** : "Recherche indisponible hors ligne"

## 🌍 Déploiement

### GitHub Pages (production)

1. **Uploadez** les fichiers sur GitHub
2. **Activez** GitHub Pages dans Settings
3. **URL** : `https://votrenom.github.io/NOM-REPO`

### Fichiers à uploader (production)

- ✅ `index.html`
- ✅ `manifest.json`
- ✅ `sw.js`
- ❌ `places_server.py` (inutile en production)