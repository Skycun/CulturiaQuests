# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CulturiaQuests is a geolocation-based RPG web application with a headless CMS architecture. Users interact with Points of Interest (POIs), museums, NPCs, quests, and collect items through location-based gameplay.

## Tech Stack

- **Backend**: Strapi 5.31.1 (headless CMS) with TypeScript, PostgreSQL 14
- **Frontend**: Nuxt.js 4.2.1 (Vue 3) with Tailwind CSS, Pinia, and @nuxtjs/strapi
- **Infrastructure**: Docker Compose orchestration with hot-reload volumes

## Development Commands

### Docker (Recommended)
```bash
docker-compose up --build        # Start all services
docker-compose up -d --build     # Start in background
docker-compose down              # Stop services
docker-compose down -v           # Stop and remove volumes (clean slate)
docker-compose logs -f           # View logs
docker-compose logs -f backend   # View backend logs only
```

### Backend (Strapi)
```bash
cd backend
npm run develop    # Development server (port 1337)
npm run build      # Build admin panel (required on first setup and after schema changes)
npm run console    # Strapi console for manual operations
```

### Frontend (Nuxt)
```bash
cd frontend
npm run dev        # Development server (port 3000)
npm run build      # Production build
npm run generate   # Static site generation
```

### Database Operations
```bash
bash scripts/backup-db.sh                           # Create database backup
bash scripts/restore-db.sh backups/backup_*.tar.gz  # Restore from backup
bash scripts/restore-db.sh backups/initial_data.tar.gz  # Restore initial seed data
```

### First-Time Setup
Use the automated installer:
```bash
./install.sh                # Full setup with database restore
./install.sh --skip-db-restore  # Setup without database
./install.sh --clean        # Clean install (removes all volumes)
```

Or manually:
1. Copy `.env.exemple` to `.env` (root)
2. Copy `backend/.env.example` to `backend/.env`
3. In `backend/`: `npm install && npm run build`
4. In `frontend/`: `npm install`
5. `docker-compose up -d --build`

## Architecture

### Backend Structure (Strapi 5)

**Content Types** (`backend/src/api/`):
Each folder contains `content-types/`, `controllers/`, `routes/`, and `services/` subdirectories.

Core entities:
- **guild** - Player guilds (one per user). Custom controller filters to ensure users only access their own guild
- **character** - Player game characters. Belongs to a guild. Custom controller automatically creates starter items on creation
- **item** - Game inventory items. Belongs to character or guild
- **npc** - Non-player characters with dialogue trees
- **quest** - Quest definitions linked to NPCs and dialogs
- **dialog** - NPC dialogue/quest text
- **poi** - Points of Interest with geolocation (lat/lng)
- **museum** - Museum locations/exhibits
- **visit** - User museum visit tracking
- **friendship** - Character relationships
- **run** - Game sessions
- **rarity** - Item rarity levels (basic, common, rare, epic, legendary)
- **tag** - Content categorization (Histoire, Art, Sciences, Nature, Société, Savoir Faire)

**Custom Controllers**:
- `character.controller` - Auto-filters by user's guild, creates starter items, provides `getCharacterIcons()` endpoint
- `guild.controller` - Auto-filters by user, provides `setup()` endpoint for guild/character creation, handles cascading deletion
- `item.controller` - Provides `getItemIcons()` endpoint from media library

**Bootstrap Process** (`backend/src/index.ts`):
On startup, automatically grants permissions:
- Public role: `auth.register`, `character.getCharacterIcons`
- Authenticated role: `guild.setup`, `item.getItemIcons`

### Frontend Structure (Nuxt 4)

**Directory Layout**:
- `app/pages/` - File-based routing (Vue 3 Composition API)
- `app/components/` - Reusable Vue components
- `app/stores/` - Pinia stores for state management (character, friendship, guild, inventory, quest, run, visit)
- `app/layouts/` - Page layout templates
- `app/middleware/` - Route middleware
- `app/types/` - TypeScript type definitions
- `app/assets/css/` - Tailwind CSS and custom styles

**API Integration**:
- Uses `@nuxtjs/strapi` module with JWT cookie authentication (`culturia_jwt`)
- Internal SSR calls: `http://backend:1337` (Docker network)
- Client-side calls: `http://localhost:1337` (browser to host)
- Configuration in `nuxt.config.ts` with runtime environment handling

## Scripts

### POI Importer (`scripts/pois_importer/`)
TypeScript tool to import Points of Interest from Google Maps API. Output JSON files are generated as `pois-output-*.json` for seeding the database.

### Database Populator (`scripts/populate_db/`)
TypeScript scripts to populate Strapi with initial game data (NPCs, items, POIs, dialogs). Run with `tsx` or `ts-node`.

### Database Backup/Restore (`scripts/`)
- `backup-db.sh` - Creates `.tar.gz` archives containing both database dump and uploaded media files
- `restore-db.sh` - Restores database and media from backup archives. Interactive if no file specified.

### AI Code Reviewer (`scripts/ai_reviewer.py`)
GitHub Actions workflow that runs on push to `main`/`develop`. Analyzes code changes and posts reviews to Discord.

## Environment Variables

**Root `.env`** (Docker Compose):
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` - PostgreSQL credentials
- `PORT` - Strapi backend port (default: 1337)
- `NUXT_PORT` - Frontend port (default: 3000)
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET` - Strapi security keys
- `NUXT_PUBLIC_API_URL` - Public API URL for browser (default: http://localhost:1337)
- `NUXT_PUBLIC_ALLOW_DESKTOP` - Allow desktop access (default: false, mobile-only)

**Backend `.env.example`** (Strapi):
Contains same security keys as root `.env`. Needed for building admin panel outside Docker.

## Access Points

- Frontend: http://localhost:3000
- Strapi Admin: http://localhost:1337/admin (create first admin on initial access)
- Strapi API: http://localhost:1337/api

## Strapi v5 Specifics

**Document Service API**: Strapi 5 uses `strapi.documents()` instead of entity services. Controllers use `documentId` for references.

**Build Requirement**: Always run `npm run build` in backend after:
- First installation
- Content-Type schema changes
- Plugin installations

**Common Issues**:
- **"reading 'tours' undefined" error**: Admin panel build corruption. Solution: In `backend/`, delete `.strapi`, `dist`, `node_modules`, then run `npm install && npm run build`
- **Database connection fails**: Ensure Docker PostgreSQL healthcheck passes before backend starts (configured in `docker-compose.yml`)
- **Hot reload not working**: Check that volume mounts are correct in `docker-compose.yml` and `CHOKIDAR_USEPOLLING=true` is set for frontend

## Key Development Patterns

**User Data Isolation**: Custom controllers filter queries by authenticated user's guild to prevent cross-user data access.

**Starter Items**: When creating a character, the system automatically generates starter items via `character.service.createStarterItems()`.

**Media Library Integration**: Character and item icons are stored in specific folders in the Strapi media library (`characters/`, `items/`). Custom endpoints expose these for selection during creation.

# mgrep - Ton assistant de recherche de code

**mgrep est ton outil principal pour explorer le codebase.** Il te donne la réponse en langage naturel + la source pertinente, tout servi.

## Commande de base

```bash
mgrep "ta question en langage naturel" --store "nom-projet" -a -m <nombre>
```

Ici le store est "culturia-quests"

## Paramètres essentiels

| Paramètre | Description |
|-----------|-------------|
| `--store "nom-projet"` | **Obligatoire** - le store indexé du projet |
| `-a` | Active la réponse en langage naturel |
| `-m <n>` | Nombre de résultats du retrieval (minimum 10) |

## Ajuster `-m` selon la complexité

| Type de requête | `-m` recommandé |
|-----------------|-----------------|
| Question simple (1-2 fichiers) | 10 |
| Question moyenne (flow, feature) | 20-30 |
| Question complexe (debug, architecture) | 30-50 |

## Stratégie pour requêtes complexes

Si la requête touche **plusieurs parties du codebase**, lance plusieurs mgrep en parallèle plutôt qu'une seule requête surchargée :

```bash
# Exemple : comprendre le système d'auth complet
mgrep "comment fonctionne l'authentification LinkedIn côté frontend" --store "nom-projet" -a -m <n>
mgrep "comment le token LinkedIn est géré côté Convex" --store "nom-projet" -a -m <n>
mgrep "comment le background script gère les sessions" --store "nom-projet" -a -m <n>
```

## Règles

- **OBLIGATOIRE** : Utilise mgrep pour TOUTE recherche de code. N'utilise JAMAIS grep, Grep tool, ou Glob pour chercher du code.
- **Langage naturel** : mgrep est un agent IA comme toi. Parle-lui comme à un collègue, pas comme à un moteur de recherche.
  - ❌ `"architecture block icon color complete status"` (mots-clés robotiques)
  - ✅ `"Quelle est la couleur de l'icône des blocs d'architecture quand ils sont complétés ?"` (question naturelle)
  
  
---

# Subagents (Task tool)

**Les subagents n'héritent PAS des instructions de ce fichier.**

Quand tu lances un subagent Explore, copie-colle les instructions sur mgrep de ce CLAUDE.md dans le prompt du subagent.
