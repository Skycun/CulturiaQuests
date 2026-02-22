# Synchronisation du contenu Dev → Prod

Ce document explique comment transférer le contenu (POIs, museums, zones, NPCs, etc.) du serveur de **développement** vers le serveur de **production**, sans perdre les données des joueurs.

## Principe

Le système utilise deux scripts :

| Script | Rôle | Où l'exécuter |
| :--- | :--- | :--- |
| `scripts/export-content.sh` | Exporte les tables de contenu dans un fichier SQL | Serveur de **dev** |
| `scripts/import-content.sh` | Importe le contenu en mode UPSERT (ajout/mise à jour) | Serveur de **prod** |

L'import fonctionne en mode **UPSERT** :
- Les enregistrements **nouveaux** (document_id inconnu en prod) sont **ajoutés**
- Les enregistrements **existants** (même document_id) sont **mis à jour**
- **Rien n'est supprimé** — les POIs/museums déjà visités par les joueurs restent intacts

## Tables concernées

### Tables exportées (contenu)

| Table | Description |
| :--- | :--- |
| `pois` | Points d'intérêt (+ liaisons zones) |
| `museums` | Musées (+ liaisons zones et tags) |
| `npcs` | Personnages non-joueurs |
| `dialogs` | Dialogues des NPCs |
| `tags` | Catégories (Histoire, Art, Sciences...) |
| `rarities` | Niveaux de rareté |
| `badges` | Badges |
| `regions` | Régions administratives |
| `departments` | Départements |
| `comcoms` | Communautés de communes |

### Tables NON exportées (données joueurs)

`guilds`, `characters`, `items`, `runs`, `visits`, `quests`, `quiz_attempts`, `progressions`, `player_friendships`, `posts`, `connection_logs`

Ces tables ne sont **jamais touchées** par les scripts.

## Prérequis

- Docker et le conteneur `postgres_db` doivent tourner sur les deux serveurs
- Accès SSH au serveur de production
- Les deux serveurs doivent avoir le **même schéma de base de données** (même version de Strapi)

## Procédure pas à pas

### Etape 1 — Exporter depuis le serveur de dev

Sur le serveur de développement (ta machine locale) :

```bash
bash scripts/export-content.sh
```

Le script affiche un résumé du contenu à exporter, puis génère un fichier :

```
backups/content_export_YYYYMMDD_HHMMSS.sql
```

**Exemple de sortie :**
```
Contenu à exporter :
  pois: 3406 enregistrements
  museums: 299 enregistrements
  npcs: 7 enregistrements
  ...

Export terminé avec succès!
  Fichier: content_export_20260222_170057.sql
  Taille:  13M
```

### Etape 2 — Copier le fichier sur le serveur de prod

Envoyer le fichier SQL sur le serveur de production via `scp` :

```bash
scp backups/content_export_YYYYMMDD_HHMMSS.sql user@prod-server:/chemin/vers/CulturiaQuests/backups/
```

> Adapter `user`, `prod-server` et le chemin selon ta configuration.

### Etape 3 — Importer sur le serveur de prod

Se connecter en SSH au serveur de production, puis :

```bash
cd /chemin/vers/CulturiaQuests
bash scripts/import-content.sh backups/content_export_YYYYMMDD_HHMMSS.sql
```

Le script effectue les actions suivantes dans cet ordre :

1. **Affiche l'état actuel** — comptage des tables de contenu ET des données joueurs
2. **Demande confirmation** — l'import ne démarre pas sans validation manuelle
3. **Crée un backup de sécurité** — dump complet de la base dans `backups/pre_import_YYYYMMDD_HHMMSS.sql`
4. **Charge les données dans des tables temporaires** — aucune modification sur les vraies tables à ce stade
5. **Exécute les UPSERT** — UPDATE des existants, INSERT des nouveaux, via le `document_id` de Strapi
6. **Met à jour les séquences auto-increment**
7. **Nettoie les tables temporaires**
8. **Affiche un comparatif avant/après** — vérifie que les données joueurs sont inchangées

> Si aucun argument n'est passé, le script affiche la liste des exports disponibles et propose de choisir.

### Etape 4 — Redémarrer Strapi

```bash
docker-compose restart backend
```

Strapi doit être redémarré pour recharger les données en cache.

## Mode interactif

Le script d'import peut être lancé sans argument :

```bash
bash scripts/import-content.sh
```

Il affichera la liste des fichiers `content_export_*.sql` disponibles dans `backups/` et demandera lequel utiliser.

## En cas de problème

### Restaurer le backup de sécurité

Si quelque chose se passe mal, un backup complet a été créé automatiquement avant l'import :

```bash
# Trouver le backup de sécurité
ls -la backups/pre_import_*.sql

# Restaurer (ATTENTION : cela écrase TOUTE la base)
docker exec -i postgres_db psql -U strapi -d strapi -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i postgres_db psql -U strapi -d strapi < backups/pre_import_YYYYMMDD_HHMMSS.sql
docker-compose restart backend
```

### Erreurs courantes

| Erreur | Cause | Solution |
| :--- | :--- | :--- |
| `conteneur postgres_db n'est pas en cours d'exécution` | Docker n'est pas lancé | `docker-compose up -d database` |
| `Le fichier n'existe pas` | Mauvais chemin vers le fichier SQL | Vérifier le chemin et le nom du fichier |
| Erreurs SQL pendant l'import | Schéma différent entre dev et prod | S'assurer que les deux serveurs sont sur la même version |

## Fonctionnement technique

Le script d'import utilise une stratégie de **tables temporaires + UPSERT** :

1. Crée des tables `_tmp_*` (copies de la structure des vraies tables)
2. Charge les données du fichier d'export dans ces tables temporaires
3. Pour chaque table de contenu : `UPDATE` les lignes qui ont le même `document_id`, puis `INSERT` celles qui n'existent pas
4. Pour les tables de liaison (ex: `pois_region_lnk`), les IDs sont **remappés** : l'ancien ID local est converti en ID prod via le `document_id`

Cette approche garantit que les IDs (integer) en production restent stables, ce qui préserve toutes les références des données joueurs (visits → poi, runs → museum, etc.).
