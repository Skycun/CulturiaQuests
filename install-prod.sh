#!/bin/bash
set -e

# ============================================================
# CulturiaQuests - Installation Production
# Usage: ./install-prod.sh <backup_file.tar.gz>
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

COMPOSE_CMD="docker compose -f docker-compose.prod.yml --env-file .env.production"
CONTAINER_DB="postgres_db_prod"
CONTAINER_BACKEND="strapi_backend_prod"

# --- Vérification des arguments ---
if [ -z "$1" ]; then
    echo -e "${RED}Usage: ./install-prod.sh <backup_file.tar.gz>${NC}"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Erreur: Le fichier $BACKUP_FILE n'existe pas.${NC}"
    exit 1
fi

echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  CulturiaQuests - Installation Production  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# --- 1. Vérification prérequis ---
echo -e "${YELLOW}[1/7] Vérification des prérequis...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}  ✗ Docker n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Docker trouvé${NC}"

if ! docker compose version &> /dev/null; then
    echo -e "${RED}  ✗ Docker Compose n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Docker Compose trouvé${NC}"

# --- 2. Vérification .env.production ---
echo -e "${YELLOW}[2/7] Vérification de .env.production...${NC}"

if [ ! -f ".env.production" ]; then
    echo -e "${RED}  ✗ .env.production n'existe pas${NC}"
    echo -e "  Copier .env.production.exemple vers .env.production et modifier les valeurs"
    exit 1
fi

# Vérifier que les valeurs par défaut ont été changées
if grep -q "CHANGE_ME" .env.production; then
    echo -e "${RED}  ✗ .env.production contient des valeurs par défaut (CHANGE_ME)${NC}"
    echo -e "  Veuillez régénérer tous les secrets avant de déployer"
    exit 1
fi
echo -e "${GREEN}  ✓ .env.production configuré${NC}"

# --- 3. Démarrage des services ---
echo -e "${YELLOW}[3/7] Démarrage des services Docker...${NC}"
$COMPOSE_CMD up -d --build
echo -e "${GREEN}  ✓ Services démarrés${NC}"

# --- 4. Attente PostgreSQL ---
echo -e "${YELLOW}[4/7] Attente de PostgreSQL...${NC}"
RETRIES=30
until docker exec "$CONTAINER_DB" pg_isready -U strapi -d strapi > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ "$RETRIES" -le 0 ]; then
        echo -e "${RED}  ✗ PostgreSQL n'a pas démarré à temps${NC}"
        exit 1
    fi
    sleep 2
done
echo -e "${GREEN}  ✓ PostgreSQL prêt${NC}"

# --- 5. Attente Strapi ---
echo -e "${YELLOW}[5/7] Attente de Strapi...${NC}"
RETRIES=60
until curl -sf http://127.0.0.1:1337/_health > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ "$RETRIES" -le 0 ]; then
        echo -e "${YELLOW}  ⚠ Strapi n'a pas répondu (normal au premier démarrage, on continue)${NC}"
        break
    fi
    sleep 3
done
if [ "$RETRIES" -gt 0 ]; then
    echo -e "${GREEN}  ✓ Strapi prêt${NC}"
fi

# --- 6. Restauration DB ---
echo -e "${YELLOW}[6/7] Restauration de la base de données depuis $BACKUP_FILE...${NC}"

IS_ARCHIVE=false
if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    IS_ARCHIVE=true
fi

UPLOADS_DIR="./backend/public/uploads"

if [ "$IS_ARCHIVE" = true ]; then
    TEMP_DIR="/tmp/cq_restore_$$"
    mkdir -p "$TEMP_DIR"

    echo -e "  Extraction de l'archive..."
    if ! tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR" 2>/dev/null; then
        echo -e "${RED}  ✗ Erreur lors de l'extraction${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    SQL_FILE="$TEMP_DIR/database.sql"

    # Restaurer les uploads
    if [ -d "$TEMP_DIR/uploads" ]; then
        mkdir -p "$UPLOADS_DIR"
        cp -r "$TEMP_DIR/uploads/"* "$UPLOADS_DIR/" 2>/dev/null || true
        echo -e "${GREEN}  ✓ Fichiers uploadés restaurés${NC}"
    fi
else
    SQL_FILE="$BACKUP_FILE"
fi

# Nettoyage et restauration de la DB
echo -e "  Nettoyage de la base de données..."
docker exec -i "$CONTAINER_DB" psql -U strapi -d strapi -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null 2>&1

echo -e "  Import du dump SQL..."
if docker exec -i "$CONTAINER_DB" psql -U strapi -d strapi < "$SQL_FILE" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Base de données restaurée${NC}"
else
    echo -e "${RED}  ✗ Erreur lors de la restauration SQL${NC}"
    [ "$IS_ARCHIVE" = true ] && rm -rf "$TEMP_DIR"
    exit 1
fi

[ "$IS_ARCHIVE" = true ] && rm -rf "$TEMP_DIR"

# --- 7. Restart backend post-restore ---
echo -e "${YELLOW}[7/7] Redémarrage de Strapi...${NC}"
$COMPOSE_CMD restart backend
sleep 5

# Validation finale
RETRIES=60
until curl -sf http://127.0.0.1:1337/_health > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ "$RETRIES" -le 0 ]; then
        echo -e "${YELLOW}  ⚠ Strapi n'a pas répondu après le restart${NC}"
        break
    fi
    sleep 3
done

if [ "$RETRIES" -gt 0 ]; then
    echo -e "${GREEN}  ✓ Strapi opérationnel${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Installation terminée avec succès!        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  API disponible sur: ${CYAN}http://127.0.0.1:1337${NC}"
echo -e "  Admin panel:        ${CYAN}http://127.0.0.1:1337/admin${NC}"
echo ""
