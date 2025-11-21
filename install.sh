#!/bin/bash

# Arrêter le script si une commande échoue
set -e

echo "🚀 Démarrage de l'installation propre pour CulturiaQuests..."

# --- 1. CONFIGURATION RACINE ---
echo "📂 Vérification de la configuration racine..."
if [ ! -f .env ]; then
    echo "   -> Création du .env racine depuis .env.exemple"
    # Note: J'utilise .env.exemple car c'est le nom du fichier dans ton repo
    cp .env.exemple .env 
else
    echo "   -> .env racine existe déjà."
fi

# --- 2. BACKEND (STRAPI) ---
echo "🐘 Configuration du Backend (Strapi)..."
cd backend

# Nettoyage pour éviter le bug "undefined reading tours" et les problèmes de droits
echo "   -> Nettoyage des dossiers temporaires et de build..."
rm -rf .strapi dist node_modules .cache build

# Gestion du .env backend
if [ ! -f .env ]; then
    echo "   -> Création du backend/.env depuis .env.example"
    cp .env.example .env
else
    echo "   -> backend/.env existe déjà."
fi

# Installation et Build
echo "   -> Installation des dépendances (npm install)..."
npm install

echo "   -> Construction de l'admin panel (npm run build)..."
# C'est cette étape qui répare l'erreur "tours"
npm run build 

cd ..

# --- 3. FRONTEND (NUXT) ---
echo "✨ Configuration du Frontend (Nuxt)..."
cd frontend

echo "   -> Nettoyage rapide..."
rm -rf node_modules .nuxt .output

echo "   -> Installation des dépendances..."
npm install

cd ..

# --- FIN ---
echo "✅ Installation terminée avec succès !"
echo "---------------------------------------------------"
echo "Tu peux maintenant lancer le projet :"
echo "   - Soit localement : cd backend && npm run develop"
echo "   - Soit via Docker : docker compose up --build"
echo "---------------------------------------------------"