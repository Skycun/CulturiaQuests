#!/bin/bash

# Configuration
CONTAINER_NAME="postgres_db"
DB_USER="strapi"
DB_NAME="strapi"
BACKUP_DIR="$(dirname "$0")/../backups"
UPLOADS_DIR="$(dirname "$0")/../backend/public/uploads"

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

    # Chercher les deux formats: .tar.gz (nouveaux) et .sql (anciens)
    BACKUPS=($(ls -1t "$BACKUP_DIR"/backup_*.{tar.gz,sql} 2>/dev/null | sort -r))

    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}Aucun backup trouvé dans $BACKUP_DIR${NC}"
        exit 1
    fi

    for i in "${!BACKUPS[@]}"; do
        FILE="${BACKUPS[$i]}"
        FILE_NAME=$(basename "$FILE")
        FILE_SIZE=$(du -h "$FILE" | cut -f1)
        FILE_DATE=$(echo "$FILE_NAME" | grep -oP '\d{8}_\d{6}' | sed 's/_/ /' | sed 's/\(....\)\(..\)\(..\) \(..\)\(..\)\(..\)/\1-\2-\3 \4:\5:\6/')

        # Indiquer le type de backup
        if [[ "$FILE_NAME" == *.tar.gz ]]; then
            TYPE="${GREEN}[Complet: DB+Uploads]${NC}"
        else
            TYPE="${YELLOW}[DB seulement]${NC}"
        fi

        echo -e "  [$i] $FILE_NAME ($FILE_SIZE) - $FILE_DATE $TYPE"
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

# Déterminer le type de backup
IS_ARCHIVE=false
if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    IS_ARCHIVE=true
fi

echo ""
echo -e "${YELLOW}ATTENTION: Cette opération va écraser toutes les données actuelles!${NC}"
if [ "$IS_ARCHIVE" = true ]; then
    echo -e "${YELLOW}           Base de données ET fichiers uploadés seront restaurés.${NC}"
else
    echo -e "${YELLOW}           Base de données uniquement (ancien format sans uploads).${NC}"
fi
read -p "Confirmer la restauration de $(basename "$BACKUP_FILE")? [y/N]: " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Annulé."
    exit 0
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Restauration en cours...              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Créer un dossier temporaire si c'est une archive
if [ "$IS_ARCHIVE" = true ]; then
    TEMP_DIR="$BACKUP_DIR/temp_restore_$$"
    mkdir -p "$TEMP_DIR"

    echo -e "${YELLOW}[1/4] Extraction de l'archive...${NC}"
    if tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR" 2>/dev/null; then
        echo -e "${GREEN}      ✓ Archive extraite${NC}"
        SQL_FILE="$TEMP_DIR/database.sql"
    else
        echo -e "${RED}      ✗ Erreur lors de l'extraction${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
else
    SQL_FILE="$BACKUP_FILE"
    echo -e "${YELLOW}[1/3] Backup SQL détecté (ancien format)${NC}"
fi

# Supprimer et recréer le schema public
if [ "$IS_ARCHIVE" = true ]; then
    echo -e "${YELLOW}[2/4] Nettoyage de la base de données...${NC}"
else
    echo -e "${YELLOW}[2/3] Nettoyage de la base de données...${NC}"
fi

if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null 2>&1; then
    echo -e "${GREEN}      ✓ Base nettoyée${NC}"
else
    echo -e "${RED}      ✗ Erreur lors du nettoyage${NC}"
    [ "$IS_ARCHIVE" = true ] && rm -rf "$TEMP_DIR"
    exit 1
fi

# Restaurer le backup SQL
if [ "$IS_ARCHIVE" = true ]; then
    echo -e "${YELLOW}[3/4] Restauration de la base de données...${NC}"
else
    echo -e "${YELLOW}[3/3] Restauration de la base de données...${NC}"
fi

if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$SQL_FILE" > /dev/null 2>&1; then
    echo -e "${GREEN}      ✓ Base de données restaurée${NC}"
else
    echo -e "${RED}      ✗ Erreur lors de la restauration SQL${NC}"
    [ "$IS_ARCHIVE" = true ] && rm -rf "$TEMP_DIR"
    exit 1
fi

# Restaurer les fichiers uploadés si c'est une archive
if [ "$IS_ARCHIVE" = true ]; then
    echo -e "${YELLOW}[4/4] Restauration des fichiers uploadés...${NC}"

    if [ -d "$TEMP_DIR/uploads" ]; then
        # Sauvegarder les uploads actuels (au cas où)
        if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
            BACKUP_UPLOADS="$UPLOADS_DIR.backup_$(date +%Y%m%d_%H%M%S)"
            mv "$UPLOADS_DIR" "$BACKUP_UPLOADS"
            echo -e "${CYAN}      ℹ Anciens uploads sauvegardés dans: $(basename "$BACKUP_UPLOADS")${NC}"
        fi

        # Créer le dossier parent si nécessaire
        mkdir -p "$(dirname "$UPLOADS_DIR")"

        # Restaurer les nouveaux uploads
        cp -r "$TEMP_DIR/uploads" "$UPLOADS_DIR"
        UPLOAD_COUNT=$(find "$UPLOADS_DIR" -type f 2>/dev/null | wc -l)
        echo -e "${GREEN}      ✓ $UPLOAD_COUNT fichier(s) restauré(s)${NC}"
    else
        echo -e "${YELLOW}      ⚠ Aucun fichier uploadé dans cette archive${NC}"
    fi

    # Nettoyage
    rm -rf "$TEMP_DIR"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Restauration terminée avec succès!    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Redémarre Strapi pour prendre en compte les changements:${NC}"
echo -e "   ${CYAN}docker-compose restart backend${NC}"
echo ""
