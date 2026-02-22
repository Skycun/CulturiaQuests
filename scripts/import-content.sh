#!/bin/bash

# ============================================================
# Import sélectif du contenu (POIs, museums, zones, NPCs, etc.)
# Mode UPSERT : ajoute les nouveaux, met à jour les existants,
# ne supprime RIEN → les données joueurs sont 100% préservées
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

# Vérifier qu'un fichier SQL est fourni
if [ -z "$1" ]; then
    echo -e "${CYAN}Usage: bash scripts/import-content.sh <fichier_export.sql>${NC}"
    echo ""

    EXPORTS=($(ls -1t "$BACKUP_DIR"/content_export_*.sql 2>/dev/null))
    if [ ${#EXPORTS[@]} -gt 0 ]; then
        echo -e "${YELLOW}Exports disponibles :${NC}"
        for i in "${!EXPORTS[@]}"; do
            FILE="${EXPORTS[$i]}"
            FILE_NAME=$(basename "$FILE")
            FILE_SIZE=$(du -h "$FILE" | cut -f1)
            echo -e "  [$i] $FILE_NAME ($FILE_SIZE)"
        done
        echo ""
        read -p "Numéro de l'export à importer (ou 'q' pour quitter): " CHOICE

        if [ "$CHOICE" = "q" ]; then
            echo "Annulé."
            exit 0
        fi

        if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -ge ${#EXPORTS[@]} ]; then
            echo -e "${RED}Choix invalide.${NC}"
            exit 1
        fi

        IMPORT_FILE="${EXPORTS[$CHOICE]}"
    else
        echo -e "${RED}Aucun export trouvé dans $BACKUP_DIR${NC}"
        exit 1
    fi
else
    IMPORT_FILE="$1"
fi

if [ ! -f "$IMPORT_FILE" ]; then
    echo -e "${RED}Erreur: Le fichier $IMPORT_FILE n'existe pas.${NC}"
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Erreur: Le conteneur ${CONTAINER_NAME} n'est pas en cours d'exécution.${NC}"
    echo "Lance d'abord: docker-compose up -d database"
    exit 1
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Import sélectif du contenu (mode UPSERT)          ║${NC}"
echo -e "${CYAN}║  Ajoute les nouveaux, met à jour les existants     ║${NC}"
echo -e "${CYAN}║  Ne supprime RIEN                                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Fichier: ${CYAN}$(basename "$IMPORT_FILE")${NC}"
echo ""

echo -e "${YELLOW}Contenu actuel sur ce serveur :${NC}"
for TABLE in "pois" "museums" "npcs" "dialogs" "tags" "rarities" "regions" "departments" "comcoms" "badges"; do
    COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $TABLE;" 2>/dev/null | tr -d ' ')
    echo -e "  ${CYAN}$TABLE${NC}: $COUNT"
done
echo ""

echo -e "${GREEN}Données joueurs (ne seront PAS touchées) :${NC}"
for TABLE in "guilds" "characters" "items" "runs" "visits" "quests" "quiz_attempts" "progressions" "player_friendships"; do
    COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $TABLE;" 2>/dev/null | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} $TABLE: $COUNT"
done
echo ""

echo -e "${YELLOW}Ce script va :${NC}"
echo -e "  ${GREEN}+${NC} Ajouter les nouveaux POIs, museums, zones, etc."
echo -e "  ${CYAN}~${NC} Mettre à jour les existants (même document_id)"
echo -e "  ${GREEN}✓${NC} Ne rien supprimer"
echo ""
read -p "Confirmer l'import ? [y/N]: " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Annulé."
    exit 0
fi

echo ""

# Étape 1 : Backup de sécurité
echo -e "${YELLOW}[1/3] Backup de sécurité avant import...${NC}"
SAFETY_BACKUP="$BACKUP_DIR/pre_import_$(date +%Y%m%d_%H%M%S).sql"
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" > "$SAFETY_BACKUP" 2>/dev/null; then
    SAFETY_SIZE=$(du -h "$SAFETY_BACKUP" | cut -f1)
    echo -e "${GREEN}      ✓ Backup de sécurité créé ($SAFETY_SIZE)${NC}"
else
    echo -e "${RED}      ✗ Impossible de créer le backup de sécurité${NC}"
    read -p "Continuer sans backup ? [y/N]: " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        exit 1
    fi
fi

# Étape 2 : Préparer le script SQL complet
echo -e "${YELLOW}[2/3] Préparation du script UPSERT...${NC}"

FULL_SCRIPT="$BACKUP_DIR/_temp_full_import_$$.sql"

# Partie 1 : Créer les tables temporaires
cat > "$FULL_SCRIPT" << 'SQLEOF'
SET search_path TO public;
SET session_replication_role = 'replica';

-- Supprimer les tables temporaires si elles existent
DROP TABLE IF EXISTS public._tmp_dialogs_npc_lnk;
DROP TABLE IF EXISTS public._tmp_museums_tags_lnk;
DROP TABLE IF EXISTS public._tmp_museums_comcom_lnk;
DROP TABLE IF EXISTS public._tmp_museums_department_lnk;
DROP TABLE IF EXISTS public._tmp_museums_region_lnk;
DROP TABLE IF EXISTS public._tmp_pois_comcom_lnk;
DROP TABLE IF EXISTS public._tmp_pois_department_lnk;
DROP TABLE IF EXISTS public._tmp_pois_region_lnk;
DROP TABLE IF EXISTS public._tmp_comcoms_department_lnk;
DROP TABLE IF EXISTS public._tmp_departments_region_lnk;
DROP TABLE IF EXISTS public._tmp_dialogs;
DROP TABLE IF EXISTS public._tmp_museums;
DROP TABLE IF EXISTS public._tmp_pois;
DROP TABLE IF EXISTS public._tmp_comcoms;
DROP TABLE IF EXISTS public._tmp_departments;
DROP TABLE IF EXISTS public._tmp_npcs;
DROP TABLE IF EXISTS public._tmp_badges;
DROP TABLE IF EXISTS public._tmp_rarities;
DROP TABLE IF EXISTS public._tmp_tags;
DROP TABLE IF EXISTS public._tmp_regions;

CREATE TABLE public._tmp_tags        (LIKE public.tags INCLUDING DEFAULTS);
CREATE TABLE public._tmp_rarities    (LIKE public.rarities INCLUDING DEFAULTS);
CREATE TABLE public._tmp_badges      (LIKE public.badges INCLUDING DEFAULTS);
CREATE TABLE public._tmp_regions     (LIKE public.regions INCLUDING DEFAULTS);
CREATE TABLE public._tmp_departments (LIKE public.departments INCLUDING DEFAULTS);
CREATE TABLE public._tmp_departments_region_lnk (LIKE public.departments_region_lnk INCLUDING DEFAULTS);
CREATE TABLE public._tmp_comcoms     (LIKE public.comcoms INCLUDING DEFAULTS);
CREATE TABLE public._tmp_comcoms_department_lnk (LIKE public.comcoms_department_lnk INCLUDING DEFAULTS);
CREATE TABLE public._tmp_npcs        (LIKE public.npcs INCLUDING DEFAULTS);
CREATE TABLE public._tmp_pois        (LIKE public.pois INCLUDING DEFAULTS);
CREATE TABLE public._tmp_pois_region_lnk     (LIKE public.pois_region_lnk INCLUDING DEFAULTS);
CREATE TABLE public._tmp_pois_department_lnk (LIKE public.pois_department_lnk INCLUDING DEFAULTS);
CREATE TABLE public._tmp_pois_comcom_lnk     (LIKE public.pois_comcom_lnk INCLUDING DEFAULTS);
CREATE TABLE public._tmp_museums     (LIKE public.museums INCLUDING DEFAULTS);
CREATE TABLE public._tmp_museums_region_lnk     (LIKE public.museums_region_lnk INCLUDING DEFAULTS);
CREATE TABLE public._tmp_museums_department_lnk (LIKE public.museums_department_lnk INCLUDING DEFAULTS);
CREATE TABLE public._tmp_museums_comcom_lnk     (LIKE public.museums_comcom_lnk INCLUDING DEFAULTS);
CREATE TABLE public._tmp_museums_tags_lnk       (LIKE public.museums_tags_lnk INCLUDING DEFAULTS);
CREATE TABLE public._tmp_dialogs     (LIKE public.dialogs INCLUDING DEFAULTS);
CREATE TABLE public._tmp_dialogs_npc_lnk (LIKE public.dialogs_npc_lnk INCLUDING DEFAULTS);

SQLEOF

# Partie 2 : Nettoyer et transformer le fichier d'export pour les tables _tmp_
# On supprime : \restrict, SET SESSION AUTHORIZATION, ALTER TABLE ... TRIGGER
# On remplace : COPY public.<table> → COPY public._tmp_<table>
sed \
    -e '/^\\restrict/d' \
    -e '/^\\allow_restricted/d' \
    -e '/^SET SESSION AUTHORIZATION/d' \
    -e '/ALTER TABLE.*DISABLE TRIGGER/d' \
    -e '/ALTER TABLE.*ENABLE TRIGGER/d' \
    -e 's/COPY public\.dialogs_npc_lnk /COPY public._tmp_dialogs_npc_lnk /g' \
    -e 's/COPY public\.dialogs /COPY public._tmp_dialogs /g' \
    -e 's/COPY public\.museums_tags_lnk /COPY public._tmp_museums_tags_lnk /g' \
    -e 's/COPY public\.museums_comcom_lnk /COPY public._tmp_museums_comcom_lnk /g' \
    -e 's/COPY public\.museums_department_lnk /COPY public._tmp_museums_department_lnk /g' \
    -e 's/COPY public\.museums_region_lnk /COPY public._tmp_museums_region_lnk /g' \
    -e 's/COPY public\.museums /COPY public._tmp_museums /g' \
    -e 's/COPY public\.pois_comcom_lnk /COPY public._tmp_pois_comcom_lnk /g' \
    -e 's/COPY public\.pois_department_lnk /COPY public._tmp_pois_department_lnk /g' \
    -e 's/COPY public\.pois_region_lnk /COPY public._tmp_pois_region_lnk /g' \
    -e 's/COPY public\.pois /COPY public._tmp_pois /g' \
    -e 's/COPY public\.comcoms_department_lnk /COPY public._tmp_comcoms_department_lnk /g' \
    -e 's/COPY public\.comcoms /COPY public._tmp_comcoms /g' \
    -e 's/COPY public\.departments_region_lnk /COPY public._tmp_departments_region_lnk /g' \
    -e 's/COPY public\.departments /COPY public._tmp_departments /g' \
    -e 's/COPY public\.regions /COPY public._tmp_regions /g' \
    -e 's/COPY public\.npcs /COPY public._tmp_npcs /g' \
    -e 's/COPY public\.tags /COPY public._tmp_tags /g' \
    -e 's/COPY public\.rarities /COPY public._tmp_rarities /g' \
    -e 's/COPY public\.badges /COPY public._tmp_badges /g' \
    "$IMPORT_FILE" >> "$FULL_SCRIPT"

# Partie 3 : Commandes UPSERT
cat >> "$FULL_SCRIPT" << 'UPSERT_SQL'

-- ============================================================
-- UPSERT : UPDATE existants + INSERT nouveaux
-- Clé de déduplication : document_id
-- Mapping des IDs via document_id pour les tables de liaison
-- ============================================================

SET search_path TO public;
SET session_replication_role = 'replica';

-- ========== TAGS ==========
UPDATE tags SET
    name = t.name, updated_at = t.updated_at
FROM _tmp_tags t WHERE tags.document_id = t.document_id;

INSERT INTO tags (document_id, name, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
SELECT t.document_id, t.name, t.created_at, t.updated_at, t.published_at, t.created_by_id, t.updated_by_id, t.locale
FROM _tmp_tags t
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE tags.document_id = t.document_id);

-- ========== RARITIES ==========
UPDATE rarities SET
    name = t.name, updated_at = t.updated_at
FROM _tmp_rarities t WHERE rarities.document_id = t.document_id;

INSERT INTO rarities (document_id, name, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
SELECT t.document_id, t.name, t.created_at, t.updated_at, t.published_at, t.created_by_id, t.updated_by_id, t.locale
FROM _tmp_rarities t
WHERE NOT EXISTS (SELECT 1 FROM rarities WHERE rarities.document_id = t.document_id);

-- ========== BADGES ==========
UPDATE badges SET
    name = t.name, description = t.description, category = t.category, updated_at = t.updated_at
FROM _tmp_badges t WHERE badges.document_id = t.document_id;

INSERT INTO badges (document_id, name, description, category, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
SELECT t.document_id, t.name, t.description, t.category, t.created_at, t.updated_at, t.published_at, t.created_by_id, t.updated_by_id, t.locale
FROM _tmp_badges t
WHERE t.document_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM badges WHERE badges.document_id = t.document_id);

-- ========== REGIONS ==========
UPDATE regions SET
    name = t.name, code = t.code, geometry = t.geometry, updated_at = t.updated_at
FROM _tmp_regions t WHERE regions.document_id = t.document_id;

INSERT INTO regions (document_id, name, code, geometry, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
SELECT t.document_id, t.name, t.code, t.geometry, t.created_at, t.updated_at, t.published_at, t.created_by_id, t.updated_by_id, t.locale
FROM _tmp_regions t
WHERE NOT EXISTS (SELECT 1 FROM regions WHERE regions.document_id = t.document_id);

-- ========== DEPARTMENTS ==========
UPDATE departments SET
    name = t.name, code = t.code, geometry = t.geometry, updated_at = t.updated_at
FROM _tmp_departments t WHERE departments.document_id = t.document_id;

INSERT INTO departments (document_id, name, code, geometry, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
SELECT t.document_id, t.name, t.code, t.geometry, t.created_at, t.updated_at, t.published_at, t.created_by_id, t.updated_by_id, t.locale
FROM _tmp_departments t
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE departments.document_id = t.document_id);

-- Liaison departments → regions
INSERT INTO departments_region_lnk (department_id, region_id, department_ord)
SELECT d_real.id, r_real.id, lnk.department_ord
FROM _tmp_departments_region_lnk lnk
JOIN _tmp_departments d_tmp ON d_tmp.id = lnk.department_id
JOIN departments d_real ON d_real.document_id = d_tmp.document_id
JOIN _tmp_regions r_tmp ON r_tmp.id = lnk.region_id
JOIN regions r_real ON r_real.document_id = r_tmp.document_id
WHERE NOT EXISTS (
    SELECT 1 FROM departments_region_lnk e
    WHERE e.department_id = d_real.id AND e.region_id = r_real.id
);

-- ========== COMCOMS ==========
UPDATE comcoms SET
    name = t.name, code = t.code, geometry = t.geometry, updated_at = t.updated_at
FROM _tmp_comcoms t WHERE comcoms.document_id = t.document_id;

INSERT INTO comcoms (document_id, name, code, geometry, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
SELECT t.document_id, t.name, t.code, t.geometry, t.created_at, t.updated_at, t.published_at, t.created_by_id, t.updated_by_id, t.locale
FROM _tmp_comcoms t
WHERE NOT EXISTS (SELECT 1 FROM comcoms WHERE comcoms.document_id = t.document_id);

-- Liaison comcoms → departments
INSERT INTO comcoms_department_lnk (comcom_id, department_id)
SELECT c_real.id, d_real.id
FROM _tmp_comcoms_department_lnk lnk
JOIN _tmp_comcoms c_tmp ON c_tmp.id = lnk.comcom_id
JOIN comcoms c_real ON c_real.document_id = c_tmp.document_id
JOIN _tmp_departments d_tmp ON d_tmp.id = lnk.department_id
JOIN departments d_real ON d_real.document_id = d_tmp.document_id
WHERE NOT EXISTS (
    SELECT 1 FROM comcoms_department_lnk e
    WHERE e.comcom_id = c_real.id AND e.department_id = d_real.id
);

-- ========== NPCS ==========
UPDATE npcs SET
    firstname = t.firstname, lastname = t.lastname, pronouns = t.pronouns,
    nickname = t.nickname, quests_entry_available = t.quests_entry_available,
    expedition_entry_available = t.expedition_entry_available, updated_at = t.updated_at
FROM _tmp_npcs t WHERE npcs.document_id = t.document_id;

INSERT INTO npcs (document_id, firstname, lastname, pronouns, nickname, quests_entry_available, expedition_entry_available, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
SELECT t.document_id, t.firstname, t.lastname, t.pronouns, t.nickname, t.quests_entry_available, t.expedition_entry_available, t.created_at, t.updated_at, t.published_at, t.created_by_id, t.updated_by_id, t.locale
FROM _tmp_npcs t
WHERE NOT EXISTS (SELECT 1 FROM npcs WHERE npcs.document_id = t.document_id);

-- ========== POIS ==========
UPDATE pois SET
    name = t.name, lat = t.lat, lng = t.lng, geohash = t.geohash, updated_at = t.updated_at
FROM _tmp_pois t WHERE pois.document_id = t.document_id;

INSERT INTO pois (document_id, name, lat, lng, geohash, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
SELECT t.document_id, t.name, t.lat, t.lng, t.geohash, t.created_at, t.updated_at, t.published_at, t.created_by_id, t.updated_by_id, t.locale
FROM _tmp_pois t
WHERE NOT EXISTS (SELECT 1 FROM pois WHERE pois.document_id = t.document_id);

-- Liaisons POIs → zones
INSERT INTO pois_region_lnk (poi_id, region_id)
SELECT p_real.id, r_real.id
FROM _tmp_pois_region_lnk lnk
JOIN _tmp_pois p_tmp ON p_tmp.id = lnk.poi_id
JOIN pois p_real ON p_real.document_id = p_tmp.document_id
JOIN _tmp_regions r_tmp ON r_tmp.id = lnk.region_id
JOIN regions r_real ON r_real.document_id = r_tmp.document_id
WHERE NOT EXISTS (
    SELECT 1 FROM pois_region_lnk e WHERE e.poi_id = p_real.id AND e.region_id = r_real.id
);

INSERT INTO pois_department_lnk (poi_id, department_id)
SELECT p_real.id, d_real.id
FROM _tmp_pois_department_lnk lnk
JOIN _tmp_pois p_tmp ON p_tmp.id = lnk.poi_id
JOIN pois p_real ON p_real.document_id = p_tmp.document_id
JOIN _tmp_departments d_tmp ON d_tmp.id = lnk.department_id
JOIN departments d_real ON d_real.document_id = d_tmp.document_id
WHERE NOT EXISTS (
    SELECT 1 FROM pois_department_lnk e WHERE e.poi_id = p_real.id AND e.department_id = d_real.id
);

INSERT INTO pois_comcom_lnk (poi_id, comcom_id)
SELECT p_real.id, c_real.id
FROM _tmp_pois_comcom_lnk lnk
JOIN _tmp_pois p_tmp ON p_tmp.id = lnk.poi_id
JOIN pois p_real ON p_real.document_id = p_tmp.document_id
JOIN _tmp_comcoms c_tmp ON c_tmp.id = lnk.comcom_id
JOIN comcoms c_real ON c_real.document_id = c_tmp.document_id
WHERE NOT EXISTS (
    SELECT 1 FROM pois_comcom_lnk e WHERE e.poi_id = p_real.id AND e.comcom_id = c_real.id
);

-- ========== MUSEUMS ==========
UPDATE museums SET
    name = t.name, lat = t.lat, lng = t.lng, geohash = t.geohash,
    radius = t.radius, updated_at = t.updated_at
FROM _tmp_museums t WHERE museums.document_id = t.document_id;

INSERT INTO museums (document_id, name, lat, lng, geohash, radius, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
SELECT t.document_id, t.name, t.lat, t.lng, t.geohash, t.radius, t.created_at, t.updated_at, t.published_at, t.created_by_id, t.updated_by_id, t.locale
FROM _tmp_museums t
WHERE NOT EXISTS (SELECT 1 FROM museums WHERE museums.document_id = t.document_id);

-- Liaisons museums → zones
INSERT INTO museums_region_lnk (museum_id, region_id)
SELECT m_real.id, r_real.id
FROM _tmp_museums_region_lnk lnk
JOIN _tmp_museums m_tmp ON m_tmp.id = lnk.museum_id
JOIN museums m_real ON m_real.document_id = m_tmp.document_id
JOIN _tmp_regions r_tmp ON r_tmp.id = lnk.region_id
JOIN regions r_real ON r_real.document_id = r_tmp.document_id
WHERE NOT EXISTS (
    SELECT 1 FROM museums_region_lnk e WHERE e.museum_id = m_real.id AND e.region_id = r_real.id
);

INSERT INTO museums_department_lnk (museum_id, department_id)
SELECT m_real.id, d_real.id
FROM _tmp_museums_department_lnk lnk
JOIN _tmp_museums m_tmp ON m_tmp.id = lnk.museum_id
JOIN museums m_real ON m_real.document_id = m_tmp.document_id
JOIN _tmp_departments d_tmp ON d_tmp.id = lnk.department_id
JOIN departments d_real ON d_real.document_id = d_tmp.document_id
WHERE NOT EXISTS (
    SELECT 1 FROM museums_department_lnk e WHERE e.museum_id = m_real.id AND e.department_id = d_real.id
);

INSERT INTO museums_comcom_lnk (museum_id, comcom_id)
SELECT m_real.id, c_real.id
FROM _tmp_museums_comcom_lnk lnk
JOIN _tmp_museums m_tmp ON m_tmp.id = lnk.museum_id
JOIN museums m_real ON m_real.document_id = m_tmp.document_id
JOIN _tmp_comcoms c_tmp ON c_tmp.id = lnk.comcom_id
JOIN comcoms c_real ON c_real.document_id = c_tmp.document_id
WHERE NOT EXISTS (
    SELECT 1 FROM museums_comcom_lnk e WHERE e.museum_id = m_real.id AND e.comcom_id = c_real.id
);

-- Liaisons museums → tags
INSERT INTO museums_tags_lnk (museum_id, tag_id, tag_ord, museum_ord)
SELECT m_real.id, t_real.id, lnk.tag_ord, lnk.museum_ord
FROM _tmp_museums_tags_lnk lnk
JOIN _tmp_museums m_tmp ON m_tmp.id = lnk.museum_id
JOIN museums m_real ON m_real.document_id = m_tmp.document_id
JOIN _tmp_tags t_tmp ON t_tmp.id = lnk.tag_id
JOIN tags t_real ON t_real.document_id = t_tmp.document_id
WHERE NOT EXISTS (
    SELECT 1 FROM museums_tags_lnk e WHERE e.museum_id = m_real.id AND e.tag_id = t_real.id
);

-- ========== DIALOGS ==========
UPDATE dialogs SET
    text_type = t.text_type, dialogues = t.dialogues, updated_at = t.updated_at
FROM _tmp_dialogs t WHERE dialogs.document_id = t.document_id;

INSERT INTO dialogs (document_id, text_type, dialogues, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
SELECT t.document_id, t.text_type, t.dialogues, t.created_at, t.updated_at, t.published_at, t.created_by_id, t.updated_by_id, t.locale
FROM _tmp_dialogs t
WHERE NOT EXISTS (SELECT 1 FROM dialogs WHERE dialogs.document_id = t.document_id);

-- Liaison dialogs → npcs
INSERT INTO dialogs_npc_lnk (dialog_id, npc_id, dialog_ord)
SELECT d_real.id, n_real.id, lnk.dialog_ord
FROM _tmp_dialogs_npc_lnk lnk
JOIN _tmp_dialogs d_tmp ON d_tmp.id = lnk.dialog_id
JOIN dialogs d_real ON d_real.document_id = d_tmp.document_id
JOIN _tmp_npcs n_tmp ON n_tmp.id = lnk.npc_id
JOIN npcs n_real ON n_real.document_id = n_tmp.document_id
WHERE NOT EXISTS (
    SELECT 1 FROM dialogs_npc_lnk e WHERE e.dialog_id = d_real.id AND e.npc_id = n_real.id
);

-- Réactiver les triggers
SET session_replication_role = 'origin';

-- Mettre à jour les séquences auto-increment
SELECT setval('tags_id_seq', COALESCE((SELECT MAX(id) FROM tags), 1));
SELECT setval('rarities_id_seq', COALESCE((SELECT MAX(id) FROM rarities), 1));
SELECT setval('badges_id_seq', COALESCE((SELECT MAX(id) FROM badges), 1));
SELECT setval('regions_id_seq', COALESCE((SELECT MAX(id) FROM regions), 1));
SELECT setval('departments_id_seq', COALESCE((SELECT MAX(id) FROM departments), 1));
SELECT setval('comcoms_id_seq', COALESCE((SELECT MAX(id) FROM comcoms), 1));
SELECT setval('npcs_id_seq', COALESCE((SELECT MAX(id) FROM npcs), 1));
SELECT setval('pois_id_seq', COALESCE((SELECT MAX(id) FROM pois), 1));
SELECT setval('museums_id_seq', COALESCE((SELECT MAX(id) FROM museums), 1));
SELECT setval('dialogs_id_seq', COALESCE((SELECT MAX(id) FROM dialogs), 1));
SELECT setval('departments_region_lnk_id_seq', COALESCE((SELECT MAX(id) FROM departments_region_lnk), 1));
SELECT setval('comcoms_department_lnk_id_seq', COALESCE((SELECT MAX(id) FROM comcoms_department_lnk), 1));
SELECT setval('pois_region_lnk_id_seq', COALESCE((SELECT MAX(id) FROM pois_region_lnk), 1));
SELECT setval('pois_department_lnk_id_seq', COALESCE((SELECT MAX(id) FROM pois_department_lnk), 1));
SELECT setval('pois_comcom_lnk_id_seq', COALESCE((SELECT MAX(id) FROM pois_comcom_lnk), 1));
SELECT setval('museums_region_lnk_id_seq', COALESCE((SELECT MAX(id) FROM museums_region_lnk), 1));
SELECT setval('museums_department_lnk_id_seq', COALESCE((SELECT MAX(id) FROM museums_department_lnk), 1));
SELECT setval('museums_comcom_lnk_id_seq', COALESCE((SELECT MAX(id) FROM museums_comcom_lnk), 1));
SELECT setval('museums_tags_lnk_id_seq', COALESCE((SELECT MAX(id) FROM museums_tags_lnk), 1));
SELECT setval('dialogs_npc_lnk_id_seq', COALESCE((SELECT MAX(id) FROM dialogs_npc_lnk), 1));

-- Nettoyage des tables temporaires
DROP TABLE IF EXISTS _tmp_dialogs_npc_lnk;
DROP TABLE IF EXISTS _tmp_museums_tags_lnk;
DROP TABLE IF EXISTS _tmp_museums_comcom_lnk;
DROP TABLE IF EXISTS _tmp_museums_department_lnk;
DROP TABLE IF EXISTS _tmp_museums_region_lnk;
DROP TABLE IF EXISTS _tmp_pois_comcom_lnk;
DROP TABLE IF EXISTS _tmp_pois_department_lnk;
DROP TABLE IF EXISTS _tmp_pois_region_lnk;
DROP TABLE IF EXISTS _tmp_comcoms_department_lnk;
DROP TABLE IF EXISTS _tmp_departments_region_lnk;
DROP TABLE IF EXISTS _tmp_dialogs;
DROP TABLE IF EXISTS _tmp_museums;
DROP TABLE IF EXISTS _tmp_pois;
DROP TABLE IF EXISTS _tmp_comcoms;
DROP TABLE IF EXISTS _tmp_departments;
DROP TABLE IF EXISTS _tmp_npcs;
DROP TABLE IF EXISTS _tmp_badges;
DROP TABLE IF EXISTS _tmp_rarities;
DROP TABLE IF EXISTS _tmp_tags;
DROP TABLE IF EXISTS _tmp_regions;

UPSERT_SQL

echo -e "${GREEN}      ✓ Script UPSERT préparé${NC}"

# Étape 3 : Exécuter
echo -e "${YELLOW}[3/3] Import en cours (peut prendre quelques minutes)...${NC}"

IMPORT_OUTPUT=$(docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$FULL_SCRIPT" 2>&1)
IMPORT_EXIT=$?

ERROR_COUNT=$(echo "$IMPORT_OUTPUT" | grep -c "^ERROR:" 2>/dev/null)
ERROR_COUNT=$(echo "$ERROR_COUNT" | tr -d '[:space:]')
ERROR_COUNT=${ERROR_COUNT:-0}

if [ "$IMPORT_EXIT" -eq 0 ] && [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}      ✓ Import UPSERT réussi sans erreur${NC}"
elif [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}      ⚠ Import terminé avec $ERROR_COUNT erreur(s) :${NC}"
    echo "$IMPORT_OUTPUT" | grep "^ERROR:" | head -10
else
    echo -e "${GREEN}      ✓ Import terminé${NC}"
fi

# Nettoyage
rm -f "$FULL_SCRIPT"

# Résultats
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Import terminé!                                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Contenu après import :${NC}"
for TABLE in "pois" "museums" "npcs" "dialogs" "tags" "rarities" "regions" "departments" "comcoms" "badges"; do
    COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $TABLE;" 2>/dev/null | tr -d ' ')
    echo -e "  ${CYAN}$TABLE${NC}: $COUNT"
done

echo ""
echo -e "${GREEN}Données joueurs (vérification - doivent être inchangées) :${NC}"
for TABLE in "guilds" "characters" "items" "runs" "visits" "quests" "quiz_attempts" "progressions" "player_friendships"; do
    COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $TABLE;" 2>/dev/null | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} $TABLE: $COUNT"
done

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Redémarre Strapi pour prendre en compte les changements:${NC}"
echo -e "   ${CYAN}docker-compose restart backend${NC}"
echo ""
