#!/bin/bash

# Script pour appliquer automatiquement les corrections des tests Playwright
# CulturiaQuests - Système d'amis
# Date: 2 février 2026

set -e

echo "🔧 Application des corrections des tests Playwright..."
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
print_step() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "frontend/tests/e2e/friends.spec.ts" ]; then
    print_error "Erreur: Ce script doit être exécuté depuis la racine du projet CulturiaQuests"
    exit 1
fi

print_step "Répertoire de projet validé"

# Créer une backup du fichier de test
BACKUP_FILE="frontend/tests/e2e/friends.spec.ts.backup.$(date +%Y%m%d_%H%M%S)"
cp frontend/tests/e2e/friends.spec.ts "$BACKUP_FILE"
print_step "Backup créé: $BACKUP_FILE"

echo ""
echo "📝 Application des corrections..."
echo ""

# Correction 1: Changer input[type="email"] en input[type="text"]
sed -i "s/input\[type=\"email\"\]/input[type=\"text\"]/g" frontend/tests/e2e/friends.spec.ts
print_step "Correction 1: Sélecteurs input type='email' → type='text'"

# Correction 2: Utiliser une regex pour la correspondance de texte
sed -i "s/text=You must be logged in/text=\/You must be logged in\//g" frontend/tests/e2e/friends.spec.ts
print_step "Correction 2: Correspondance de texte partielle pour authentification"

echo ""
echo "✅ Corrections appliquées avec succès!"
echo ""
echo "📊 Résumé des modifications:"
echo "   - Ligne 37:  input[type=\"email\"] → input[type=\"text\"]"
echo "   - Ligne 157: input[type=\"email\"] → input[type=\"text\"]"
echo "   - Ligne 186: input[type=\"email\"] → input[type=\"text\"]"
echo "   - Ligne 21:  text=... → text=/.../ (regex)"
echo ""
echo "💾 Backup disponible: $BACKUP_FILE"
echo ""
echo "🧪 Pour vérifier les corrections:"
echo "   git diff frontend/tests/e2e/friends.spec.ts"
echo ""
echo "🚀 Pour lancer les tests:"
echo "   cd frontend && npm test"
echo ""
echo "↩️  Pour restaurer le fichier original:"
echo "   cp $BACKUP_FILE frontend/tests/e2e/friends.spec.ts"
echo ""
