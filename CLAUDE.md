# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CulturiaQuests is a geolocation-based RPG web application with a headless CMS architecture. Users interact with Points of Interest (POIs), museums, NPCs, quests, and collect items through location-based gameplay.

## Tech Stack

- **Backend**: Strapi 5.31.1 (headless CMS) with TypeScript, PostgreSQL 14
- **Frontend**: Nuxt.js 4.2.1 (Vue 3) with Tailwind CSS and Pinia
- **Infrastructure**: Docker Compose orchestration

## Development Commands

### Docker (Recommended)
```bash
docker-compose up --build        # Start all services
docker-compose up -d --build     # Start in background
docker-compose down              # Stop services
```

### Backend (Strapi)
```bash
cd backend
npm run develop    # Development server (port 1337)
npm run build      # Build admin panel (required on first setup)
npm run console    # Strapi console
```

### Frontend (Nuxt)
```bash
cd frontend
npm run dev        # Development server (port 3000)
npm run build      # Production build
npm run generate   # Static site generation
```

### First-Time Setup
Run `./install.sh` or manually:
1. Copy `.env.exemple` to `.env` (root)
2. Copy `backend/.env.example` to `backend/.env`
3. In `backend/`: `npm install && npm run build`
4. In `frontend/`: `npm install`

## Architecture

### Backend Content Types (in `backend/src/api/`)
The Strapi API defines these content types with relationships:
- **character** - Player game characters
- **npc** - Non-player characters (7 seeded on bootstrap)
- **quest** - Quest definitions
- **dialog** - NPC dialogue/quest text
- **poi** - Points of Interest with geolocation (lat/lng)
- **museum** - Museum locations/exhibits
- **visit** - User museum visit tracking
- **item** - Game inventory items
- **rarity** - Item rarity levels (seeded: Common, Rare, Epic, Legendary)
- **tag** - Content categorization (seeded: Histoire, Art, Sciences, Nature, Société, Savoir Faire)
- **guild** - Player guilds
- **friendship** - Character relationships
- **run** - Game sessions

### Frontend Structure
- `frontend/app/` - Application root with Vue components
- `frontend/app/pages/` - Nuxt file-based routing
- Uses `@nuxtjs/strapi` module for API integration

### Database Seeding
On first startup, `backend/src/index.ts` bootstrap function auto-creates:
- Rarity entries (Common, Rare, Epic, Legendary)
- Tag entries (Histoire, Art, Sciences, Nature, Société, Savoir Faire)
- 7 default NPCs

## Scripts

### POI Importer (`scripts/pois_importer/`)
Imports Points of Interest from Google Maps. Output files: `pois-output-*.json`

### Database Populator (`scripts/populate_db/`)
Populates Strapi with data. Run with TypeScript (tsx or ts-node).

### AI Code Reviewer (`scripts/ai_reviewer.py`)
GitHub Actions workflow runs on push to `main`/`develop`. Analyzes code changes and posts to Discord.

## Environment Variables

Key variables (see `.env.exemple`):
- `POSTGRES_*` - Database credentials
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET` - Strapi security keys
- `NUXT_PUBLIC_API_URL` - Frontend API base URL (default: http://localhost:1337)

## Access Points

- Frontend: http://localhost:3000
- Strapi API: http://localhost:1337/api
- Strapi Admin: http://localhost:1337/admin

## Troubleshooting

**"reading 'tours' undefined" error**: Admin panel build is corrupted. In `backend/`, delete `.strapi`, `dist`, `node_modules`, then run `npm install && npm run build`.

**Strapi v5 note**: Always run `npm run build` in backend before first Docker deployment.
