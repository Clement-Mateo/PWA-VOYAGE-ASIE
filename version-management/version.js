#!/usr/bin/env node

/**
 * Script de gestion de version manuelle
 * Usage: node version.js [patch|minor|major]
 * À utiliser uniquement si GitHub Actions ne fonctionne pas
 */

const fs = require('fs');
const path = require('path');

function getCurrentVersion() {
    const content = fs.readFileSync('cache-version-manager.js', 'utf8');
    const match = content.match(/this\.currentVersion = '([^']+)'/);
    return match ? match[1] : null;
}

function updateVersion(newVersion) {
    // Mettre à jour cache-version-manager.js
    let content = fs.readFileSync('cache-version-manager.js', 'utf8');
    content = content.replace(
        /this\.currentVersion = '[^']+'/,
        `this.currentVersion = '${newVersion}'`
    );
    fs.writeFileSync('cache-version-manager.js', content);
    
    // Mettre à jour service-worker.js
    content = fs.readFileSync('service-worker.js', 'utf8');
    content = content.replace(
        /const CACHE_NAME = 'voyage-asie-v[^']+'/,
        `const CACHE_NAME = 'voyage-asie-v${newVersion}'`
    );
    fs.writeFileSync('service-worker.js', content);
    
    console.log(`✅ Version mise à jour: ${newVersion}`);
    console.log(`📝 Fichiers modifiés: cache-version-manager.js, service-worker.js`);
}

function incrementVersion(currentVersion, type = 'patch') {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch (type) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
        default:
            return `${major}.${minor}.${patch + 1}`;
    }
}

// Script principal
const args = process.argv.slice(2);
const type = args[0] || 'patch';

const currentVersion = getCurrentVersion();
if (!currentVersion) {
    console.error('❌ Version actuelle non trouvée');
    process.exit(1);
}

const newVersion = incrementVersion(currentVersion, type);
updateVersion(newVersion);

console.log(`📦 Version incrémentée: ${currentVersion} → ${newVersion} (${type})`);
console.log(`⚠️  Normalement, GitHub Actions gère ça automatiquement !`);
