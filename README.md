# Carte du Monde Interactive - PWA Offline-First

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

## 📋 Structure des fichiers

```
carte-monde-interactive/
├── index.html                    # Application principale
├── manifest.json                 # Configuration PWA
├── services/                     # Services de l'architecture
│   ├── firebaseService.js        # Service Firebase (auth + sync)
│   ├── localStorage.js           # Service IndexedDB (données locales)
│   ├── syncService.js            # Service de synchronisation
│   ├── networkManager.js         # Gestionnaire de réseau
│   ├── offlineFirstApp.js        # Application principale
│   ├── service-worker.js         # Service Worker (PWA)
│   └── serviceUtil.js            # Utilitaires de services
├── components/                   # Composants UI
├── styles/                       # Styles CSS
├── version-management/           # Gestion de version
├── searchService.js              # Service de recherche (Places + Geocoding)
├── places_server.py              # Serveur proxy (développement local)
├── .env.local                   # Variables d'environnement locales (à créer)
├── .gitignore                   # Fichiers ignorés par Git
├── DEPLOYMENT.md                # Guide de déploiement
└── README.md                    # Ce fichier
```

## 🔧 Architecture Offline-First

### Vue d'ensemble

L'application utilise une architecture **offline-first** complète :

- **🔐 Authentification** : Firebase Auth uniquement
- **💾 Stockage local** : IndexedDB via Dexie.js
- **🔄 Synchronisation** : Service de sync automatique
- **📱 PWA** : Service Worker pour le cache

### Flux de données

1. **Utilisateur connecté** → Authentification Firebase
2. **Opérations CRUD** → IndexedDB (immédiat)
3. **Synchronisation** → Firebase (en arrière-plan)
4. **Mode hors ligne** → IndexedDB (pleinement fonctionnel)

### Services principaux

#### localStorage.js
- **Rôle** : Gestion des données locales (IndexedDB)
- **Fonctionnalités** : CRUD itinéraires, destinations, activités
- **API simplifiée** : Pas besoin de passer les IDs utilisateur/itinéraire

#### firebaseService.js
- **Rôle** : Authentification et synchronisation Firebase
- **Fonctionnalités** : Login, register, sync des données
- **Sécurité** : Uniquement les opérations d'authentification

#### syncService.js
- **Rôle** : Synchronisation automatique
- **Fonctionnalités** : Détection des changements, sync en arrière-plan
- **Intelligence** : Gestion des conflits, retry automatique

### Avantages de l'architecture

- **⚡ Performance** : Données accessibles instantanément
- **📱 Expérience** : Application utilisable hors ligne
- **🔄 Fiabilité** : Synchronisation transparente
- **🔒 Sécurité** : Isolation des données locales

## 🔧 Configuration

### Variables d'environnement

1. **Créez le fichier `.env.local`** (non versionné) :
   ```
   GOOGLE_API_KEY=votre_clé_api_ici
   ```

2. **Remplacez** `votre_clé_api_ici` par votre vraie clé Google Maps

3. **Le serveur Python** lira automatiquement cette clé au démarrage

### Architecture du service de recherche

Le système utilise une architecture simple et sécurisée :

- **`searchService.js`** : Gère les requêtes Places + Geocoding
- **`places_server.py`** : Proxy pour Places API (dev local uniquement)
- **Détection automatique** de l'environnement

### Flux de configuration

1. **Développement local** :
   - `places_server.py` lit `.env.local`
   - `searchService.js` utilise la clé codée (dev)
   - Places API + Geocoding API disponibles

2. **Production (GitHub Pages)** :
   - Clé API remplacée par les secrets GitHub Actions
   - Geocoding API uniquement
   - Aucune clé exposée dans le code

### Modes de fonctionnement

#### Développement local (`python places_server.py`)
- ✅ **Places API** : recherche d'établissements
- ✅ **Geocoding API** : recherche d'adresses
- 🔧 **Proxy Python** : évite les CORS

#### Production (GitHub Pages)
- ✅ **Geocoding API** : recherche d'adresses
- ❌ **Places API** : désactivée (pas de proxy)
- 🔒 **Sécurité** : pas de clé API exposée

### Mode hors ligne

- ✅ **Carte** : disponible (cache)
- ✅ **Données** : itinéraires, destinations, activités (IndexedDB)
- ✅ **CRUD** : création, modification, suppression (local)
- ✅ **Navigation** : entre tous les écrans
- ❌ **Recherche** : désactivée (nécessite internet)
- 📱 **Message** : "Mode hors ligne - Synchronisation en attente"

## 🌍 Déploiement

### GitHub Pages (production)

1. **Uploadez** les fichiers sur GitHub
2. **Activez** GitHub Pages dans Settings
3. **URL** : `https://votrenom.github.io/NOM-REPO`

### Fichiers à uploader (production)

- ✅ `index.html`
- ✅ `manifest.json`
- ✅ `services/service-worker.js`
- ✅ `services/` (tous les services)
- ✅ `components/` (tous les composants)
- ✅ `styles/` (tous les styles)
- ❌ `places_server.py` (inutile en production)