#!/bin/bash

# ============================================================================
# CulturiaQuests - Script d'installation automatisé
# ============================================================================
# Ce script installe et configure l'environnement complet du projet:
# - Vérification des prérequis (Docker, Node.js, ports)
# - Configuration des fichiers d'environnement
# - Build du backend (Strapi) et frontend (Nuxt)
# - Démarrage des services Docker
# - Restauration de la base de données depuis backups/initial_data.tar.gz
# - Validation finale et affichage des URLs
#
# Usage: ./install.sh [OPTIONS]
# Options:
#   --skip-db-restore    Ne pas restaurer la base de données
#   --clean              Suppression complète (volumes inclus) avant install
#   --help               Afficher cette aide
# ============================================================================

set -e  # Exit on error

# Configuration
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKUP_FILE="$PROJECT_ROOT/backups/initial_data.tar.gz"
RESTORE_SCRIPT="$PROJECT_ROOT/scripts/restore-db.sh"

# Couleurs pour les messages (pattern du restore-db.sh)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Détection de la commande Docker Compose (V1 ou V2)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE=""
fi

# Options
SKIP_DB_RESTORE=false
CLEAN_INSTALL=false

# ============================================================================
# Fonctions
# ============================================================================

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --skip-db-restore    Ne pas restaurer la base de données"
    echo "  --clean              Suppression complète (volumes inclus) avant install"
    echo "  --help               Afficher cette aide"
    echo ""
}

check_prerequisites() {
    echo ""
    echo "Vérification de Docker..."

    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker n'est pas installé${NC}"
        echo "  Installez Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # Vérifier daemon Docker
    if ! docker ps &> /dev/null; then
        echo -e "${RED}✗ Le daemon Docker n'est pas actif${NC}"
        echo "  Démarrez Docker et réessayez"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker installé et actif${NC}"

    # Vérifier Docker Compose
    echo ""
    echo "Vérification de Docker Compose..."
    if [ -z "$DOCKER_COMPOSE" ]; then
        echo -e "${RED}✗ Docker Compose n'est pas installé${NC}"
        echo "  Installez Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker Compose détecté ($DOCKER_COMPOSE)${NC}"

    # Vérifier Node.js
    echo ""
    echo "Vérification de Node.js..."
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js n'est pas installé${NC}"
        echo "  Installez Node.js 20-24: https://nodejs.org/"
        exit 1
    fi

    # Vérifier version Node.js (format: v22.20.0)
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

    if [ "$NODE_MAJOR" -lt 20 ] || [ "$NODE_MAJOR" -ge 25 ]; then
        echo -e "${RED}✗ Node.js version $NODE_VERSION non supportée${NC}"
        echo "  Version requise: 20.x - 24.x"

        # Vérifier si NVM est disponible
        if command -v nvm &> /dev/null || [ -f "$HOME/.nvm/nvm.sh" ]; then
            echo ""
            echo "  Avec NVM, utilisez:"
            echo "    nvm install 22"
            echo "    nvm use 22"
        fi
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js v$NODE_VERSION${NC}"

    # Vérifier les ports (warning seulement)
    echo ""
    echo "Vérification des ports..."

    for PORT in 1337 3000 5432; do
        if command -v lsof &> /dev/null && lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠ Port $PORT déjà utilisé:${NC}"
            lsof -Pi :$PORT -sTCP:LISTEN 2>/dev/null || true
            echo "  Docker pourrait échouer si ce port est nécessaire"
        else
            echo -e "${GREEN}✓ Port $PORT disponible${NC}"
        fi
    done

    echo ""
    echo -e "${GREEN}✓ Tous les prérequis sont satisfaits${NC}"
}

setup_environment() {
    echo ""

    # .env racine
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        cp "$PROJECT_ROOT/.env.exemple" "$PROJECT_ROOT/.env"
        echo -e "${GREEN}✓ .env créé depuis .env.exemple${NC}"
    else
        echo -e "${CYAN}ℹ .env existe déjà (conservé)${NC}"
    fi

    # backend/.env
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        echo -e "${GREEN}✓ backend/.env créé depuis .env.example${NC}"
    else
        echo -e "${CYAN}ℹ backend/.env existe déjà (conservé)${NC}"
    fi

    echo ""
    echo -e "${GREEN}✓ Fichiers d'environnement configurés${NC}"
}

build_dependencies() {
    echo ""

    # Backend (CRITIQUE pour Strapi v5)
    echo -e "${CYAN}=== Backend (Strapi) ===${NC}"
    echo "Installation des dépendances backend..."

    cd "$BACKEND_DIR" || exit 1

    if ! npm install; then
        echo -e "${RED}✗ Échec de npm install backend${NC}"
        echo "  Essayez: rm -rf backend/node_modules && cd backend && npm install"
        exit 1
    fi

    echo ""
    echo "Build de l'admin panel Strapi (requis pour v5)..."
    if ! npm run build; then
        echo -e "${RED}✗ Échec du build backend${NC}"
        echo "  Essayez: rm -rf backend/.strapi backend/dist"
        exit 1
    fi

    cd "$PROJECT_ROOT" || exit 1
    echo -e "${GREEN}✓ Backend buildé avec succès${NC}"

    # Frontend
    echo ""
    echo -e "${CYAN}=== Frontend (Nuxt) ===${NC}"
    echo "Installation des dépendances frontend..."

    cd "$FRONTEND_DIR" || exit 1

    if ! npm install; then
        echo -e "${RED}✗ Échec de npm install frontend${NC}"
        echo "  Essayez: rm -rf frontend/node_modules && cd frontend && npm install"
        exit 1
    fi

    cd "$PROJECT_ROOT" || exit 1
    echo -e "${GREEN}✓ Frontend configuré avec succès${NC}"

    echo ""
    echo -e "${GREEN}✓ Toutes les dépendances sont installées${NC}"
}

start_docker_services() {
    echo ""

    # Nettoyage gracieux
    echo "Arrêt des conteneurs existants (si présents)..."
    $DOCKER_COMPOSE down 2>/dev/null || true

    # Si --clean, supprimer aussi les volumes
    if [ "$CLEAN_INSTALL" = true ]; then
        echo -e "${YELLOW}Mode clean: suppression des volumes...${NC}"
        $DOCKER_COMPOSE down -v 2>/dev/null || true
    fi

    # Démarrage
    echo ""
    echo "Démarrage des services Docker..."
    if ! $DOCKER_COMPOSE up -d --build; then
        echo -e "${RED}✗ Échec du démarrage Docker${NC}"
        echo "  Vérifiez les logs: $DOCKER_COMPOSE logs"
        exit 1
    fi

    # Attente de PostgreSQL (healthcheck)
    echo ""
    echo "Attente de PostgreSQL..."
    for i in {1..60}; do
        if docker exec postgres_db pg_isready -U strapi >/dev/null 2>&1; then
            echo -e "${GREEN}✓ PostgreSQL prêt${NC}"
            break
        fi

        if [ $i -eq 60 ]; then
            echo -e "${RED}✗ Timeout: PostgreSQL ne démarre pas${NC}"
            echo "  Logs: docker logs postgres_db"
            exit 1
        fi

        sleep 1
    done

    # Attente du backend (port 1337)
    echo ""
    echo "Attente du backend Strapi..."
    for i in {1..120}; do
        if curl -f http://localhost:1337 >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend prêt${NC}"
            break
        fi

        if [ $i -eq 120 ]; then
            echo -e "${RED}✗ Timeout: Backend ne démarre pas${NC}"
            echo "  Logs: docker logs strapi_backend"
            exit 1
        fi

        sleep 1
    done

    echo ""
    echo -e "${GREEN}✓ Tous les services Docker sont actifs${NC}"
}

restore_database() {
    echo ""

    # Vérifier que le backup existe
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}✗ Fichier de backup introuvable: $BACKUP_FILE${NC}"
        exit 1
    fi

    echo "Restauration de la base de données..."
    echo -e "${CYAN}Fichier: $(basename "$BACKUP_FILE") ($(du -h "$BACKUP_FILE" | cut -f1))${NC}"
    echo ""

    # Appel du script de restauration
    if ! "$RESTORE_SCRIPT" "$BACKUP_FILE"; then
        echo -e "${RED}✗ Échec de la restauration${NC}"
        exit 1
    fi

    # Redémarrage du backend post-restauration
    echo ""
    echo "Redémarrage du backend..."
    $DOCKER_COMPOSE restart backend >/dev/null 2>&1

    # Re-wait pour backend
    for i in {1..60}; do
        if curl -f http://localhost:1337 >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend redémarré${NC}"
            break
        fi

        if [ $i -eq 60 ]; then
            echo -e "${RED}✗ Timeout: Backend ne redémarre pas${NC}"
            exit 1
        fi

        sleep 1
    done
}

validate_installation() {
    echo ""
    echo "Validation de l'installation..."

    # Vérifier que les 3 conteneurs tournent
    RUNNING=$(docker ps --format '{{.Names}}' | grep -E '^(postgres_db|strapi_backend|nuxt_frontend)$' | wc -l)

    if [ "$RUNNING" -ne 3 ]; then
        echo -e "${RED}✗ Tous les conteneurs ne sont pas actifs${NC}"
        echo ""
        docker ps
        exit 1
    fi
    echo -e "${GREEN}✓ 3 conteneurs actifs${NC}"

    # Health check backend API
    if ! curl -f http://localhost:1337/api >/dev/null 2>&1; then
        echo -e "${RED}✗ Backend API ne répond pas${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Backend API opérationnel${NC}"

    # Health check frontend
    if ! curl -f http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${RED}✗ Frontend ne répond pas${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Frontend opérationnel${NC}"

    echo ""
    echo -e "${GREEN}✓ Tous les services sont opérationnels${NC}"
}

show_success_message() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  Installation terminée avec succès!    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Points d'accès:${NC}"
    echo "  Frontend:      http://localhost:3000"
    echo "  Admin Strapi:  http://localhost:1337/admin"
    echo "  API Backend:   http://localhost:1337/api"
    echo ""
    echo -e "${YELLOW}Prochaines étapes:${NC}"
    echo "  1. Créer votre premier compte admin sur http://localhost:1337/admin"
    echo "  2. Voir les logs: $DOCKER_COMPOSE logs -f"
    echo "  3. Arrêter:      $DOCKER_COMPOSE down"
    echo ""
}

# ============================================================================
# Main
# ============================================================================

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-db-restore)
                SKIP_DB_RESTORE=true
                shift
                ;;
            --clean)
                CLEAN_INSTALL=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                echo -e "${RED}Option inconnue: $1${NC}"
                echo ""
                show_help
                exit 1
                ;;
        esac
    done

    # En-tête
    echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  CulturiaQuests - Installation         ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
    echo ""

    # Étapes d'installation
    echo -e "${YELLOW}[1/6] Vérification des prérequis...${NC}"
    check_prerequisites

    echo ""
    echo -e "${YELLOW}[2/6] Configuration des fichiers .env...${NC}"
    setup_environment

    echo ""
    echo -e "${YELLOW}[3/6] Build des dépendances (Backend + Frontend)...${NC}"
    build_dependencies

    echo ""
    echo -e "${YELLOW}[4/6] Démarrage Docker...${NC}"
    start_docker_services

    echo ""
    echo -e "${YELLOW}[5/6] Restauration de la base de données...${NC}"
    if [ "$SKIP_DB_RESTORE" = false ]; then
        restore_database
    else
        echo -e "${CYAN}Restauration ignorée (--skip-db-restore)${NC}"
    fi

    echo ""
    echo -e "${YELLOW}[6/6] Validation...${NC}"
    validate_installation

    # Message de succès
    show_success_message
}

# Trap errors
trap 'echo ""; echo -e "${RED}✗ Erreur détectée. Installation interrompue.${NC}"; exit 1' ERR

# Run
main "$@"