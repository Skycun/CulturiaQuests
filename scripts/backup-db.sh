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
NC='\033[0m' # No Color

# Créer le dossier de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Vérifier que le conteneur PostgreSQL est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Erreur: Le conteneur ${CONTAINER_NAME} n'est pas en cours d'exécution.${NC}"
    echo "Lance d'abord: docker-compose up -d database"
    exit 1
fi

# Générer le nom du fichier avec timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo -e "${YELLOW}Sauvegarde de la base de données en cours...${NC}"

# Effectuer le backup
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
    # Vérifier que le fichier n'est pas vide
    if [ -s "$BACKUP_FILE" ]; then
        FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}Backup créé avec succès!${NC}"
        echo "  Fichier: $BACKUP_FILE"
        echo "  Taille: $FILE_SIZE"

        # Afficher le nombre de backups existants
        BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql 2>/dev/null | wc -l)
        echo "  Total backups: $BACKUP_COUNT"
    else
        echo -e "${RED}Erreur: Le fichier de backup est vide.${NC}"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
else
    echo -e "${RED}Erreur lors de la création du backup.${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi
