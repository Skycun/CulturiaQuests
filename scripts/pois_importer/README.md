# 🗺️ Importateur de POIs (Points d'Intérêt)

Ce dossier contient les outils pour peupler la base de données CulturiaQuests avec des lieux culturels réels (Musées, Monuments, Parcs, etc.) en utilisant **Google Maps** et **Gemini AI**.

## 🚀 Fonctionnalités Clés

- **Maillage Territorial** : Import par Communauté de Communes (EPCI) pour une couverture exhaustive.
- **Intelligence Artificielle** : Qualification automatique des lieux (Catégorie RPG, Accessibilité, Horaires, Rayon d'action) via Gemini 2.0 Flash.
- **Anti-Doublon** : Vérification géographique stricte (distance < 20m) avant appel API coûteux.
- **Reprise sur Erreur** : Sauvegarde locale (JSON) et possibilité de ré-importer sans refaire les appels API.

## 📦 Prérequis

1.  **Clés API** (dans le `.env` racine) :
    - `GOOGLE_MAPS_API_KEY` : Places API, Geocoding API.
    - `GEMINI_API_KEY` : Google AI Studio.
    - `STRAPI_API_TOKEN` : Token "Full Access" pour écrire dans la base.

2.  **Base de Données** :
    - Les collections `pois`, `museums`, `tags`, `regions`, `departments`, `comcoms` doivent exister dans Strapi.

## 🛠️ Utilisation

### 1. Générer les Données Géographiques (Initialisation)
Avant toute chose, générez le fichier de référence des EPCI.
*(Requis une seule fois ou lors de la mise à jour des contours administratifs)*

```bash
npx tsx scripts/pois_importer/generate-comcoms-data.ts
```
> Cela crée `scripts/pois_importer/comcoms-data.json` à partir des données INSEE.

### 2. Lancer l'Importateur Principal
C'est le script principal pour scanner de nouveaux territoires.

```bash
npx tsx scripts/pois_importer/comcom-import.ts
```

**Déroulement interactif :**
1.  Sélectionnez un ou plusieurs **Départements**.
2.  Sélectionnez les **Communautés de Communes (EPCI)** à scanner.
3.  Le script scanne chaque commune de l'EPCI via Google Maps.
4.  Gemini analyse et filtre les lieux (exclut les lieux privés/fermés).
5.  Un rapport JSON est généré dans `scripts/pois_importer/exports/`.
6.  (Optionnel) Import direct dans Strapi.

### 3. Ré-importer depuis une Sauvegarde
Si vous avez déjà scanné une zone (fichier JSON existant) mais que l'import Strapi a échoué ou que vous voulez rejouer les données :

```bash
npx tsx scripts/pois_importer/import-from-json.ts
```
Ce script ne consomme **aucun quota API** (ni Google, ni Gemini).

### 4. Synchroniser les États (Tracking)
Si vous avez déjà des POIs en base mais que le système ne les "voit" pas comme faits (pas de coche ✅), lancez ce script pour mettre à jour le fichier de suivi `import-state.json` :

```bash
npx tsx scripts/pois_importer/sync-state.ts
```

### 5. Réinitialiser la Base de Données (Danger ⚠️)
Pour supprimer **tous** les POIs et Musées de la base (utile en développement) :

```bash
npx tsx scripts/pois_importer/nuke-pois.ts
```

## 📂 Structure des Fichiers

| Fichier | Rôle |
| :--- | :--- |
| `comcom-import.ts` | **Point d'entrée principal**. Orchestre le scan et l'analyse IA. |
| `utils.ts` | **Cœur logique**. Contient le client Strapi, les appels API et les calculs géo. |
| `generate-comcoms-data.ts` | Prépare les données administratives (EPCI/Communes). |
| `import-from-json.ts` | Import "offline" depuis les fichiers du dossier `exports/`. |
| `nuke-pois.ts` | Vide les collections POIs et Museums. |
| `exports/` | Dossier où sont stockés les résultats des scans (JSON). |

## 🧠 Logique de Détection des Doublons

Le système utilise une stratégie à double étage pour éviter les doublons et économiser les coûts API :

1.  **Niveau Local (Scan)** : Si un lieu est trouvé plusieurs fois lors du scan de communes voisines (via son `place_id` Google), il n'est traité qu'une seule fois.
2.  **Niveau Base de Données (Strapi)** : Avant d'envoyer un lieu à l'IA, on vérifie si un POI existe déjà dans Strapi à moins de **20 mètres** des coordonnées trouvées. Si oui, on l'ignore.

## 🤖 Prompt Gemini

Le prompt utilisé pour qualifier les lieux se trouve dans `utils.ts`. Il demande à l'IA de :
- Choisir une catégorie RPG (Art, Histoire, Nature...).
- Vérifier l'accessibilité publique (ex: rejeter les écoles ou les lieux privés).
- Estimer le rayon d'interaction (taille du lieu).
