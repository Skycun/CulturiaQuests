# CulturiaQuests - Project Context

## Project Overview

**CulturiaQuests** is a geolocation-based RPG web application that gamifies cultural visits. It employs a headless CMS architecture to manage game content (Quests, NPCs, Items, POIs) and a modern frontend for the player experience.

- **Type:** Full-stack Web Application (PWA capabilities potential).
- **Core Concept:** Users interact with real-world locations (Museums, Points of Interest) to complete quests, earn experience/items, and progress their character.

## Technology Stack

### Backend (`/backend`)
- **Framework:** [Strapi v5](https://strapi.io/) (Headless CMS).
- **Language:** TypeScript (Node.js).
- **Database:** PostgreSQL (via Docker).
- **Key Plugins:** `strapi-geodata` (for geolocation management), `users-permissions`.
- **API Style:** REST API.

### Frontend (`/frontend`)
- **Framework:** [Nuxt 4](https://nuxt.com/) (Vue.js 3).
- **Styling:** Tailwind CSS.
- **State Management:** Pinia.
- **Language:** TypeScript.
- **API Integration:** `@nuxtjs/strapi`.

### Infrastructure & Tools
- **Containerization:** Docker & Docker Compose.
- **Scripts:** Python (`ai_reviewer.py`) and TypeScript (`pois_importer`, `populate_db`) utilities in `/scripts`.

## Directory Structure

```
/
├── backend/            # Strapi application (API & Admin Panel)
├── frontend/           # Nuxt application (Client)
├── scripts/            # Utility scripts (POI import, AI review, DB population)
├── docker-compose.yml  # Main orchestration file
├── IMPLEMENTATION_PLAN.md # Detailed plan for Content-Type implementation
└── README.md           # General entry point
```

## Development Workflow

### Prerequisites
- Node.js (v20+ recommended)
- Docker & Docker Compose

### Initial Setup (Critical Steps)
Strapi v5 requires a manual build of the admin panel before the first Docker launch to avoid runtime errors.

1.  **Environment Variables:**
    - Copy `.env.exemple` to `.env` (Project Root).
    - Copy `backend/.env.example` to `backend/.env`.

2.  **First-Time Build (Backend):**
    ```bash
    cd backend
    npm install
    npm run build  # CRITICAL: Generates admin panel files
    cd ..
    ```

3.  **Start Services:**
    ```bash
    docker-compose up --build
    ```

### Access Points
- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Strapi Admin:** [http://localhost:1337/admin](http://localhost:1337/admin)
- **Strapi API:** [http://localhost:1337/api](http://localhost:1337/api)

## Key Commands

### Docker
- **Start all:** `docker-compose up` (add `-d` for background)
- **Rebuild:** `docker-compose up --build`
- **Stop:** `docker-compose down`

### Backend (Local)
- **Develop:** `npm run develop` (starts on port 1337)
- **Build:** `npm run build`
- **Console:** `npm run console`

### Frontend (Local)
- **Develop:** `npm run dev` (starts on port 3000)
- **Build:** `npm run build`

## Current Development Status
- **Content Types:** A major refactor of Strapi Content Types is in progress (see `IMPLEMENTATION_PLAN.md`).
- **Database:** `scripts/populate_db` handles initial seeding of NPCs, POIs, and Items.
- **Geolocation:** `strapi-geodata` is configured for `museum` and `poi` types.

## Conventions
- **Code Style:** Follow existing ESLint configurations (`eslint.config.mjs`).
- **TypeScript:** Strictly used across both backend and frontend.
- **Strapi:** Use the Factory pattern for Controllers/Services/Routes.
- **Commits:** Follow the `scripts/ai_reviewer.py` guidelines (likely Conventional Commits).
