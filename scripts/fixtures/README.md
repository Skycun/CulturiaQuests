# Générateur de Fixtures CulturiaQuests

Script de génération de fixtures pour simuler une base d'utilisateurs avec historique d'activité réaliste.

## Installation

```bash
cd scripts/fixtures
npm install
```

## Prérequis

### 1. Variables d'environnement

Assurez-vous que le fichier `.env` à la racine du projet contient :

```env
STRAPI_BASE_URL=http://localhost:1337
STRAPI_API_TOKEN=votre_token_api_full_access
```

**Créer un token API** :
1. Connectez-vous au Strapi Admin : http://localhost:1337/admin
2. Allez dans **Settings > API Tokens**
3. Créez un nouveau token avec **Full access**
4. Copiez le token dans votre `.env`

### 2. Permissions Strapi

Les utilisateurs authentifiés doivent avoir les permissions suivantes :

#### Dans Settings > Users & Permissions Plugin > Roles > Authenticated :

**Guild**:
- [x] `create`
- [x] `update`
- [x] `find`
- [x] `findOne`

**Character**:
- [x] `create`
- [x] `find`
- [x] `findOne`

**Item**:
- [x] `create`
- [x] `find`
- [x] `findOne`

**Visit**:
- [x] `create`

**Run**:
- [x] `create`

**Quest**:
- [x] `create`

**Quiz-Attempt**:
- [x] `create`

**Friendship**:
- [x] `create`

**NPC-Friendship**:
- [x] `create`

### 3. Données de référence

Le script nécessite les données suivantes en base :

- **Tags** : Au moins 5 (Art, History, Science, etc.)
- **Rarities** : Au moins 4 (basic, common, rare, epic, legendary)
- **NPCs** : Au moins 5
- **POIs** : Au moins 10
- **Museums** : Au moins 3
- **Icons** (images) : Au moins 1 dans la media library

## Utilisation

### Vérifier les données de référence

```bash
npm run check
```

Affiche l'état des données de référence nécessaires.

### Générer des utilisateurs

**Mode interactif** :
```bash
npm run generate
```

**Mode direct** :
```bash
npm run generate -- --users 50
```

Génère 50 utilisateurs avec :
- Guildes et personnages
- Items starter + items générés
- Activités sur les 30 derniers jours (visits, runs, quests, quiz attempts)
- Friendships entre joueurs
- NPC friendships

### Supprimer les fixtures

```bash
npm run cleanup
```

Supprime tous les utilisateurs avec le préfixe `fixture_`.

## Architecture

```
scripts/fixtures/
├── generate-user-base.ts          # Point d'entrée CLI
├── lib/
│   ├── strapi-client.ts           # Client API Strapi
│   ├── data-generator.ts          # Générateur de données
│   ├── activity-distributor.ts    # Distribution temporelle
│   └── user-persona.ts            # Profils d'utilisateurs
└── config/
    └── generation-config.ts       # Paramètres configurables
```

## Personas

Le script génère 4 types d'utilisateurs :

| Persona | Distribution | Activités/mois | Description |
|---------|-------------|----------------|-------------|
| **Hardcore** | 10% | 30-50 | Joue quotidiennement, scores élevés |
| **Regular** | 30% | 15-30 | Joue 3-4×/semaine, bon engagement |
| **Casual** | 45% | 5-15 | Joue 1-2×/semaine, activité légère |
| **Dormant** | 15% | 1-5 | Compte inactif, connexions rares |

## Métriques Dashboard Peuplées

Le script remplit toutes les sections du dashboard admin :

- ✅ **Overview** : Users, guilds, items, gold, XP
- ✅ **Players** : Liste des joueurs avec statistiques
- ✅ **Map** : Visites POI, expéditions musées
- ✅ **Economy** : Sources de gold/XP, distribution items
- ✅ **Expeditions** : Stats musées et quêtes
- ✅ **Quiz** : Sessions, scores, leaderboard
- ✅ **Social** : Friendships joueurs et NPCs
- ✅ **Connections** : Logs hebdomadaires et heures de pointe

## Configuration

Modifiez `config/generation-config.ts` pour ajuster :

- Distribution des personas
- Nombre d'activités par persona
- Récompenses (gold, XP)
- Distribution des rarités
- Rate limiting

## Temps d'exécution

| Utilisateurs | Temps estimé |
|-------------|--------------|
| 10 | ~30 secondes |
| 50 | ~3 minutes |
| 100 | ~6 minutes |
| 200 | ~12 minutes |

## Dépannage

### Erreur 403 Forbidden

→ Les utilisateurs n'ont pas les permissions nécessaires. Vérifiez la section "Permissions Strapi" ci-dessus.

### Erreur "Email or Username are already taken"

→ Les fixtures existent déjà. Lancez `npm run cleanup` avant de régénérer.

### Erreur "No matching data found"

→ Les données de référence sont manquantes. Vérifiez avec `npm run check`.

## Rollback

En cas d'erreur pendant la génération, utilisez :

```bash
npm run cleanup
```

La suppression d'une guild supprime automatiquement (cascade) :
- Characters
- Items
- Visits, Runs, Quests, Quiz Attempts
- Friendships

## Notes

- Tous les utilisateurs générés ont le mot de passe : `TestPass123!`
- Les usernames sont préfixés par `fixture_` pour faciliter l'identification
- Les activités sont distribuées sur les 30 derniers jours avec des heures de pointe réalistes
- Les scores de quiz suivent une distribution gaussienne selon le persona
