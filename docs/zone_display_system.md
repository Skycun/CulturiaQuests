# Système d'Affichage des Zones (Frontend)

Ce document décrit l'architecture technique permettant d'afficher les contours administratifs (ComCom, Départements, Régions) sur la carte du jeu de manière performante et "Offline-First".

## 🏗️ Architecture

Le système repose sur une stratégie **Offline-First** utilisant IndexedDB pour stocker la totalité des données géographiques (~1400 zones réparties en 3 collections) côté client, évitant ainsi les chargements réseau répétitifs.

### Composants Clés

1.  **Store Pinia (`stores/zone.ts`)** : Cerveau du système, gère désormais 3 états distincts.
2.  **IndexedDB (via `idb-keyval`)** : Stockage persistant.
3.  **Leaflet Layer (`ZoneLayer.vue`)** : Rendu visuel (SVG).
4.  **Labels (`ZoneLabels.vue`)** : Affichage des noms.

---

## 1. Gestion des Données (Store)

### Initialisation (`init()`)
Au lancement de l'application (`app.vue`), le store s'initialise et charge parallèlement les 3 types de territoires :
1.  Vérifie la présence des données dans **IndexedDB** (`regions-data`, `departments-data`, `comcoms-data`).
2.  **Si présent** : Charge les données en mémoire instantanément (RAM).
3.  **Si absent** : Déclenche le téléchargement complet depuis l'API Strapi via 3 requêtes distinctes (ou boucles de pagination).

### Téléchargement Multi-Collection
Le store interroge désormais trois endpoints distincts :
- `/api/regions`
- `/api/departments`
- `/api/comcoms`

Chaque collection est stockée séparément pour optimiser l'accès et la gestion des relations.

---

## 2. Affichage et Performance

### Filtrage par Zoom
Les zones affichées dépendent du niveau de zoom. Le store sélectionne la collection active appropriée :

| Niveau de Zoom | Collection Active | Description |
| :--- | :--- | :--- |
| **Zoom >= 9** | `comcoms` | Communautés de Communes (Détail) |
| **Zoom 6 - 8** | `departments` | Départements (Vue régionale) |
| **Zoom < 6** | `regions` | Régions (Vue nationale) |

### Rendu Visuel
- **`ZoneLayer.vue`** : Utilise `<LGeoJson>` pour dessiner les contours de la collection active.
    - Style : Blanc, contour gras, sans fond (transparent).
- **`ZoneLabels.vue`** : Affiche les noms des zones.

---

## 3. Configuration Requise (Backend)

Le système attend désormais 3 Content-Types distincts avec des relations hiérarchiques :

### 1. Region (`api::region.region`)
- `name` (String)
- `code` (String, Unique)
- `geometry` (JSON GeoJSON)
- `is_completed` (Boolean, def: false)
- `departments` (Relation: One-to-Many)

### 2. Department (`api::department.department`)
- `name` (String)
- `code` (String, Unique)
- `geometry` (JSON GeoJSON)
- `is_completed` (Boolean, def: false)
- `region` (Relation: Many-to-One)
- `comcoms` (Relation: One-to-Many)

### 3. Comcom (`api::comcom.comcom`)
- `name` (String)
- `code` (String, Unique)
- `geometry` (JSON GeoJSON)
- `is_completed` (Boolean, def: false)
- `department` (Relation: Many-to-One)

**Permissions** : L'accès `find` sur ces 3 collections doit être autorisé pour le rôle **Public**.
