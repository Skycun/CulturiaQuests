#!/bin/bash

# ============================================================
# Export sélectif du contenu (POIs, museums, zones, NPCs, etc.)
# Exporte UNIQUEMENT les tables de contenu, PAS les données joueurs
# ============================================================

# Configuration
CONTAINER_NAME="postgres_db"
DB_USER="strapi"
DB_NAME="strapi"
BACKUP_DIR="$(dirname "$0")/../backups"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Tables de contenu à exporter (ordre respectant les dépendances FK)
CONTENT_TABLES=(
    # 1. Tables de référence (pas de FK vers d'autres tables de contenu)
    "tags"
    "rarities"
    "badges"
    "regions"

    # 2. Tables avec FK vers les tables de référence
    "departments"
    "departments_region_lnk"

    # 3. Tables avec FK vers departments
    "comcoms"
    "comcoms_department_lnk"

    # 4. Tables de contenu principal
    "npcs"
    "pois"
    "pois_region_lnk"
    "pois_department_lnk"
    "pois_comcom_lnk"
    "museums"
    "museums_region_lnk"
    "museums_department_lnk"
    "museums_comcom_lnk"
    "museums_tags_lnk"

    # 5. Tables dépendantes du contenu
    "dialogs"
    "dialogs_npc_lnk"
)

# Créer le dossier de backup
mkdir -p "$BACKUP_DIR"

# Vérifier que le conteneur PostgreSQL tourne
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Erreur: Le conteneur ${CONTAINER_NAME} n'est pas en cours d'exécution.${NC}"
    echo "Lance d'abord: docker-compose up -d database"
    exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_FILE="$BACKUP_DIR/content_export_$TIMESTAMP.sql"

echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Export sélectif du contenu                    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Afficher les comptages avant export
echo -e "${YELLOW}Contenu à exporter :${NC}"
for TABLE in "pois" "museums" "npcs" "dialogs" "tags" "rarities" "regions" "departments" "comcoms" "badges"; do
    COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $TABLE;" 2>/dev/null | tr -d ' ')
    echo -e "  ${CYAN}$TABLE${NC}: $COUNT enregistrements"
done
echo ""

# Construire la commande pg_dump avec les tables sélectionnées
TABLE_ARGS=""
for TABLE in "${CONTENT_TABLES[@]}"; do
    TABLE_ARGS="$TABLE_ARGS --table=$TABLE"
done

echo -e "${YELLOW}Export en cours...${NC}"

# Export avec pg_dump : --data-only pour ne pas toucher au schéma,
# --disable-triggers pour éviter les erreurs FK pendant l'import
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" \
    --data-only \
    --disable-triggers \
    --no-owner \
    --no-privileges \
    $TABLE_ARGS > "$EXPORT_FILE" 2>/dev/null; then

    if [ -s "$EXPORT_FILE" ]; then
        FILE_SIZE=$(du -h "$EXPORT_FILE" | cut -f1)
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  Export terminé avec succès!                   ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "  Fichier: ${CYAN}$(basename "$EXPORT_FILE")${NC}"
        echo -e "  Taille:  ${CYAN}$FILE_SIZE${NC}"
        echo -e "  Chemin:  ${CYAN}$EXPORT_FILE${NC}"
        echo ""
        echo -e "${YELLOW}Tables exportées :${NC}"
        for TABLE in "${CONTENT_TABLES[@]}"; do
            echo -e "  ${GREEN}✓${NC} $TABLE"
        done
        echo ""
        echo -e "${YELLOW}Tables NON exportées (données joueurs) :${NC}"
        echo -e "  ${RED}✗${NC} guilds, characters, items, runs, visits, quests"
        echo -e "  ${RED}✗${NC} quiz_attempts, progressions, friendships"
        echo -e "  ${RED}✗${NC} player_friendships, posts, connection_logs"
        echo ""
        echo -e "${CYAN}Pour importer sur le serveur de prod :${NC}"
        echo -e "  1. Copier le fichier sur le serveur"
        echo -e "  2. Lancer: ${CYAN}bash scripts/import-content.sh backups/$(basename "$EXPORT_FILE")${NC}"
    else
        echo -e "${RED}Erreur: Le fichier exporté est vide${NC}"
        rm -f "$EXPORT_FILE"
        exit 1
    fi
else
    echo -e "${RED}Erreur lors de l'export${NC}"
    rm -f "$EXPORT_FILE"
    exit 1
fi
