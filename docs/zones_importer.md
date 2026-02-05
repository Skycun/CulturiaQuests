# Documentation Import des Zones (Régions, Départements, EPCI)

Ce document décrit l'utilisation du script `scripts/zones_importer/import-zones.ts`.
Ce script permet d'importer les contours administratifs français (3 niveaux) et de créer les **relations hiérarchiques** dans la base de données Strapi.

## 📁 Architecture

Contrairement aux anciennes versions, les zones sont stockées dans **3 collections distinctes** :
- `regions`
- `departments` (liés à une Region)
- `comcoms` (liés à un Department)

## 🗺️ Données Importées

Le script utilise les fichiers GeoJSON "Simplifiés 100m" d'Etalab (Millésime 2024) et l'API Geo Gouv pour le mapping.

| Niveau | Collection Strapi | Source | Préfixe Code | Relations |
| :--- | :--- | :--- | :--- | :--- |
| **Région** | `regions` | `regions-100m.geojson` | `REG-` (ex: `REG-11`) | Parent racine |
| **Département** | `departments` | `departements-100m.geojson` | `DEP-` (ex: `DEP-75`) | → Region (`manyToOne`) |
| **EPCI** (ComCom) | `comcoms` | `epci-100m.geojson` | `EPCI-2000...` | → Department (`manyToOne`) |

## 🛠️ Prérequis

- Node.js (v18+)
- Strapi lancé localement (`http://localhost:1337`)
- **API Token Full Access** configuré dans `.env`.

## ⚙️ Installation

1. Naviguez dans le dossier :
   ```bash
   cd scripts/zones_importer
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Configurez `.env` :
   ```env
   STRAPI_URL=http://localhost:1337
   STRAPI_TOKEN=votre_token_full_access
   ```

## 🚀 Lancement de l'Import

```bash
npx tsx import-zones.ts
```

### Fonctionnement Détaillé

Le script s'exécute en 3 phases séquentielles pour garantir l'intégrité des relations :

1.  **Import des Régions** :
    - Télécharge le GeoJSON.
    - Crée les régions si elles n'existent pas.
    - Met en cache les IDs (`Map<Code, ID>`).

2.  **Import des Départements** :
    - Télécharge le GeoJSON.
    - Pour chaque département, lit la propriété `region` (code INSEE).
    - Trouve l'ID de la région parente dans le cache.
    - Crée ou met à jour le département avec le lien `region`.

3.  **Import des Comcoms (EPCI)** :
    - **Pré-chargement** : Interroge l'API `geo.api.gouv.fr` pour récupérer le mapping `Code EPCI -> Code Département` (car absent du GeoJSON).
    - Pour chaque EPCI, trouve son département parent via le mapping + cache.
    - Crée ou met à jour la comcom avec le lien `department`.

### Mise à jour (Update)
Le script est **idempotent**. Si vous le relancez :
- Il détecte les zones existantes (`.` point affiché).
- Il **force la mise à jour** des relations si elles sont manquantes (`u` affiché).

## ⚠️ Dépannage

- **Erreur 404 sur Update** : Strapi v5 requiert `documentId` pour les mises à jour (géré par le script).
- **Comcoms orphelines** : Vérifiez que l'API `geo.api.gouv.fr` répond bien au début du script (Logs `✅ Mapping chargé...`).
- **Timeout** : Si le téléchargement des GeoJSON échoue, vérifiez votre connexion ou augmentez le timeout axios dans le script.
