#!/bin/bash

# Configuration
CONTAINER_NAME="postgres_db"
DB_USER="strapi"
DB_NAME="strapi"
BACKUP_DIR="$(dirname "$0")/../backups"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Vérifier que le conteneur PostgreSQL est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Erreur: Le conteneur ${CONTAINER_NAME} n'est pas en cours d'exécution.${NC}"
    echo "Lance d'abord: docker-compose up -d database"
    exit 1
fi

# Si un argument est fourni, l'utiliser comme fichier de backup
if [ -n "$1" ]; then
    BACKUP_FILE="$1"
else
    # Sinon, lister les backups disponibles et demander à l'utilisateur
    echo -e "${CYAN}Backups disponibles:${NC}"
    echo ""

    BACKUPS=($(ls -1t "$BACKUP_DIR"/*.sql 2>/dev/null))

    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}Aucun backup trouvé dans $BACKUP_DIR${NC}"
        exit 1
    fi

    for i in "${!BACKUPS[@]}"; do
        FILE="${BACKUPS[$i]}"
        FILE_NAME=$(basename "$FILE")
        FILE_SIZE=$(du -h "$FILE" | cut -f1)
        FILE_DATE=$(echo "$FILE_NAME" | grep -oP '\d{8}_\d{6}' | sed 's/_/ /' | sed 's/\(....\)\(..\)\(..\) \(..\)\(..\)\(..\)/\1-\2-\3 \4:\5:\6/')
        echo "  [$i] $FILE_NAME ($FILE_SIZE) - $FILE_DATE"
    done

    echo ""
    read -p "Numéro du backup à restaurer (ou 'q' pour quitter): " CHOICE

    if [ "$CHOICE" = "q" ]; then
        echo "Annulé."
        exit 0
    fi

    if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -ge ${#BACKUPS[@]} ]; then
        echo -e "${RED}Choix invalide.${NC}"
        exit 1
    fi

    BACKUP_FILE="${BACKUPS[$CHOICE]}"
fi

# Vérifier que le fichier existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Erreur: Le fichier $BACKUP_FILE n'existe pas.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}ATTENTION: Cette opération va écraser toutes les données actuelles!${NC}"
read -p "Confirmer la restauration de $(basename "$BACKUP_FILE")? [y/N]: " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Annulé."
    exit 0
fi

echo ""
echo -e "${YELLOW}Restauration en cours...${NC}"

# Supprimer et recréer le schema public
echo "  - Nettoyage de la base..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null 2>&1

# Restaurer le backup
echo "  - Importation des données..."
if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE" > /dev/null 2>&1; then
    echo ""
    echo -e "${GREEN}Restauration terminée avec succès!${NC}"
    echo ""
    echo -e "${YELLOW}Note: Redémarre Strapi pour prendre en compte les changements:${NC}"
    echo "  docker-compose restart backend"
else
    echo -e "${RED}Erreur lors de la restauration.${NC}"
    exit 1
fi
