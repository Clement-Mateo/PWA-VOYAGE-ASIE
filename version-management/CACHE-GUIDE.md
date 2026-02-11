# Guide d'utilisation du Cache Version Manager (Automatique)

## 🎯 Comment ça marche ?

Le système gère automatiquement la version à chaque merge sur `main` et vérifie le cache au chargement de l'appli.

## 🔄 Gestion automatique des versions

### 1. Version automatique (GitHub Actions)
À chaque merge sur `main`, la version est automatiquement incrémentée :
- **Patch** : `1.2.0` → `1.2.1` (corrections)
- **Minor** : `1.2.0` → `1.3.0` (nouvelles fonctionnalités)
- **Major** : `1.2.0` → `2.0.0` (changements majeurs)

### 2. Version manuelle (locale)
```bash
# Incrémenter version patch (correction)
npm run version:patch

# Incrémenter version minor (nouvelle fonctionnalité)
npm run version:minor

# Incrémenter version major (changement majeur)
npm run version:major
```

## 📝 Fichiers de configuration

### 1. GitHub Actions (`.github/workflows/auto-version.yml`)
- Détecte la version actuelle
- Incrémente automatiquement (patch par défaut)
- Met à jour les 2 fichiers
- Commit les changements

### 2. Scripts locaux (`version.js`)
- Gestion manuelle des versions
- Met à jour les 2 fichiers simultanément
- Supporte patch/minor/major

## 🚀 Résultat pour les utilisateurs

- **Version identique** : cache préservé
- **Version différente** : Cache vidé → Rechargement automatique
- **Navigation privée** : Toujours fonctionnel (pas de cache)

## 🔧 Fonctionnalités

### Cache intelligent
- **LocalStorage** : Conserve `auth_token` et `user_data`
- **SessionStorage** : Vidé complètement
- **HTTP Cache** : Vidé via Service Worker
- **Rechargement** : Automatique et unique (après connexion seulement)

## ⚠️ Notes importantes

- **Pas de modification manuelle** des numéros de version
- **GitHub Actions** gère tout automatiquement
- **Scripts locaux** disponibles pour les cas exceptionnels
- **Version synchronisée** dans les 2 fichiers automatiquement

## 🔄 Flux de fonctionnement

1. **Merge sur main** → GitHub Actions s'exécute
2. **Version incrémentée** → Fichiers mis à jour
3. **Commit automatique** → Nouvelle version disponible
4. **App démarre** → Vérification de version au démarrage
5. **Version différente** → Cache vidé → Rechargement automatique
6. **Navigation privée** → Toujours fonctionne (pas de cache)
