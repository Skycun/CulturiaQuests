# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CulturiaQuests is a geolocation-based RPG web application with a headless CMS architecture. Users interact with Points of Interest (POIs), museums, NPCs, quests, and collect items through location-based gameplay. The app features a daily quiz system (AI-generated), an expedition/combat system, a fog-of-war map, player friendships, and an admin dashboard.

## Tech Stack

- **Backend**: Strapi 5.31.1 (headless CMS) with TypeScript, PostgreSQL 14
- **Frontend**: Nuxt.js 4.2.1 (Vue 3) with Tailwind CSS, Pinia, and @nuxtjs/strapi
- **Mobile**: Capacitor (Android) for native app packaging
- **Infrastructure**: Docker Compose orchestration (dev + prod), GitHub Actions CI/CD
- **AI**: OpenAI API for daily quiz question generation

## Development Commands

### Docker (Recommended)
```bash
docker-compose up --build        # Start all services (dev)
docker-compose up -d --build     # Start in background
docker-compose down              # Stop services
docker-compose down -v           # Stop and remove volumes (clean slate)
docker-compose logs -f           # View logs
docker-compose logs -f backend   # View backend logs only
```

### Production Docker
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
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

Core game entities:
- **guild** - Player guilds (one per user). Custom controller filters to ensure users only access their own guild. Has gold, exp, quiz_streak fields.
- **character** - Player game characters. Belongs to a guild. Custom controller automatically creates starter items on creation
- **item** - Game inventory items. Belongs to character or guild. Has slot (weapon/helmet/charm), level, index_damage, rarity, tags
- **npc** - Non-player characters with dialogue trees
- **quest** - Quest definitions linked to NPCs and dialogs
- **dialog** - NPC dialogue/quest text. Types: quest_description, expedition_appear, expedition_fail, quest_complete, journal_entries
- **poi** - Points of Interest with geolocation (lat/lng)
- **museum** - Museum locations/exhibits
- **visit** - User museum visit tracking with chest opening mechanic
- **run** - Game expedition sessions with DPS calculation, tier rewards, and quest chance rolls
- **rarity** - Item rarity levels (basic, common, rare, epic, legendary)
- **tag** - Content categorization (Histoire, Art, Sciences, Nature, Société, Savoir Faire)

Administrative zones (hierarchical: Region > Department > Comcom):
- **region** - Administrative regions with GeoJSON geometry
- **department** - Administrative departments, linked to a region
- **comcom** - Communautés de communes (EPCI), linked to a department

Progression & fog-of-war:
- **progression** - Guild progression tracking per zone (region/department/comcom)
- **statistic** - Player statistics summary endpoint

Quiz system:
- **quiz-session** - Daily quiz sessions with generation status (pending/generating/completed/failed). One per day.
- **quiz-question** - Quiz questions (QCM or timeline type), linked to a session and a tag. 10 questions per session.
- **quiz-attempt** - Player quiz attempts with score (0-2500), detailed answers, rewards (gold/exp/items), and tier system (bronze/silver/gold/platinum)

Social & admin:
- **player-friendship** - Player friendship system with request/accept/reject flow between guilds
- **friendship** - Legacy character relationships
- **user-settings** - User settings with avatar upload
- **admin-dashboard** - Admin dashboard API (overview, players, map, economy, expeditions, quiz analytics, social stats, connection analytics)
- **admin-action-log** - Audit log for admin actions (block/unblock user, role changes)
- **connection-log** - User connection tracking

**Custom Controllers**:
- `character.controller` - Auto-filters by user's guild, creates starter items, provides `getCharacterIcons()` endpoint
- `guild.controller` - Auto-filters by user, provides `setup()` endpoint for guild/character creation, handles cascading deletion
- `item.controller` - Provides `getItemIcons()` endpoint and `generateRandomItem()` service for loot generation
- `run.controller` - `startExpedition()`, `endExpedition()`, `getActiveRun()` endpoints with DPS calculation and reward generation
- `visit.controller` - `openChest()` endpoint for museum visit rewards
- `quiz-attempt.controller` - `getTodayQuiz()`, `submitQuiz()`, `getTodayLeaderboard()`, `getMyHistory()` endpoints
- `player-friendship.controller` - `searchUser()`, `sendRequest()`, `acceptRequest()`, `rejectRequest()`, `removeFriend()`, `toggleFriendRequests()`
- `user-settings.controller` - `getSettings()`, `updateSettings()`, `uploadAvatar()`, `removeAvatar()`
- `admin-dashboard.controller` - Full admin panel API with player management, analytics, and moderation
- `statistic.controller` - `getSummary()` endpoint for player stats

**Custom Services**:
- `run.service` - `calculateGuildDPS()` (rarity multipliers), `calculateTierFromDamage()`, `calculateRewards()` (gold, XP with Gaussian time curve, item count), `rollQuestChance()`
- `quiz-attempt.service` - Score calculation (QCM: 200pts, Timeline: proximity-based), tier determination, reward generation with item drops
- `quiz-session.service` - `getTodaySession()` helper
- `item.service` - `generateRandomItem()` for loot drops

**Bootstrap Process** (`backend/src/index.ts`):
On startup, automatically grants permissions:
- Public role: `auth.register`, `character.getCharacterIcons`
- Authenticated role: `guild.setup`, `item.getItemIcons`, museum/poi/tag find, `statistic.getSummary`, `visit.openChest`, run endpoints, player-friendship endpoints, user-settings endpoints, quiz endpoints, upload
- Admin role: inherits all Authenticated permissions + admin-dashboard endpoints

**Middleware** (`backend/config/middlewares.ts`):
- CORS configured for localhost:3000, Capacitor origins (`capacitor://localhost`, `http://localhost`, `https://localhost`), and production domain
- Body parser with 6mb JSON/form limit
- CSP configured for Leaflet tiles (OpenStreetMap, CartoDB)

### Frontend Structure (Nuxt 4)

**Directory Layout**:
- `app/pages/` - File-based routing (Vue 3 Composition API)
- `app/components/` - Reusable Vue components
- `app/composables/` - Vue composables for shared logic
- `app/stores/` - Pinia stores for state management
- `app/layouts/` - Page layout templates
- `app/middleware/` - Route middleware
- `app/types/` - TypeScript type definitions
- `app/utils/` - Utility functions
- `app/assets/css/` - Tailwind CSS and custom styles

**Pages**:
- `/` - Landing page
- `/account/login`, `/account/register`, `/account/settings` - Authentication & user settings
- `/guild` - Guild management
- `/map` - Interactive map with fog-of-war, POI markers, museum markers
- `/equipement` - Equipment/inventory management
- `/expedition`, `/expedition-summary` - Expedition gameplay and results
- `/chest` - Loot chest opening animation
- `/quests` - Quest listing
- `/npc-interaction` - NPC dialogue interface
- `/sociale` - Social hub
- `/social/quiz/`, `/social/quiz/question`, `/social/quiz/results` - Daily quiz flow
- `/stories/`, `/stories/[id]` - Journal/story entries
- `/dashboard/` - Admin dashboard (index, map, economy, expeditions, quiz, social, players, players/[id])
- `/tests/*` - Development test pages

**Pinia Stores**:
- `guild` - Guild data and setup
- `character` - Character management
- `inventory` - Item inventory
- `run` - Expedition state
- `quest` - Quest tracking
- `visit` - Museum visits
- `friendship` - Character friendships
- `fog` - Fog-of-war state
- `progression` - Zone progression tracking
- `zone` - Zone data management
- `museum` - Museum data
- `npc` - NPC data
- `poi` - POI data
- `quiz` - Daily quiz state
- `statistics` - Player statistics
- `admin` - Admin dashboard data

**Composables**:
- `useGeolocation` - GPS location tracking
- `useMapInteraction` - Map click/drag interactions
- `useDrawerLogic` - Bottom drawer UI logic
- `useDamageCalculator` - DPS calculation for UI
- `useExpeditionLogic` - Expedition gameplay logic
- `useChestState` / `useChestAnimation` - Chest opening UI
- `useFooterVisibility` - Footer show/hide logic
- `useUserAvatar` - User avatar management
- `useAdmin` - Admin role checking
- `useLogout` - Logout flow
- `useZoneCompletion` - Zone completion percentage

**Components** (organized by feature):
- `map/` - FogLayer, MapMarkers, DrawerContent, POIDrawer, MuseumDrawer, SynergyBadge, MapLoadingState
- `chest/` - ChestLootDisplay, LootBadges, LootItemCard
- `equipment/` - InventoryGrid, TopPanelEquip/Recycle/Upgrade, ActionFooter, OverlayHeader
- `quiz/` - QuizQuestionCard, QuizResults, QuizLeaderboard, QuizConfirmSubmit
- `quest/` - QuestBox, QuestButton
- `stories/` - JournalGrid, JournalDetail
- `dashboard/` - KpiCard, StatBlock
- `guild/` - GuildStatRow
- `form/` - PixelButton, PixelInput, PixelSwitch, Alert, IconPicker, ProgressIndicator
- `tag/` - Category
- `ui/` - OverlayPanel, ProgressBar

**Utils**:
- `geometry.ts` - Geometric calculations (point-in-polygon, distances)
- `geolocation.ts` - Geolocation helpers
- `storage.ts` - LocalStorage helpers
- `strapiHelpers.ts` - Strapi API utilities

**Middleware**:
- `00-device-check.global.ts` - Global mobile device check (redirects desktop unless `NUXT_PUBLIC_ALLOW_DESKTOP=true`)
- `admin.ts` - Admin route guard

**Layouts**:
- `default` - Main game layout with header/footer
- `blank` - No chrome layout (login, register)
- `dashboard` - Admin dashboard layout
- `test` - Test pages layout

**Types**: character, quest, rarity, strapi, dialog, geojson, poi, run, tag, npc, friendship, item, museum, loot, guild, quiz, visit

**Nuxt Modules**: eslint, fonts, icon, pinia, tailwindcss, anime (animations), strapi, pinia-plugin-persistedstate (localStorage), leaflet, nuxt-charts

**API Integration**:
- Uses `@nuxtjs/strapi` module with JWT cookie authentication (`culturia_jwt`)
- Internal SSR calls: `http://backend:1337` (Docker network)
- Client-side calls: `http://localhost:1337` (browser to host)
- Pinia state persisted in localStorage (avoids 431 cookie size errors)

### Mobile (Capacitor)

**Configuration** (`frontend/capacitor.config.ts`):
- App ID: `fr.briceledanois.culturiaquests`
- Web dir: `.output/public`
- Android scheme: HTTPS
- SplashScreen plugin configured

**Android** (`frontend/android/`):
- Gradle-based Android project
- Build with standard Capacitor Android workflow

## Scripts

### Quiz Generator (`scripts/generate-quiz-questions.ts`)
TypeScript script using OpenAI API to generate daily quiz questions (10 per day, mix of QCM and timeline types). Supports `--save` to insert into database and `--force` to overwrite existing sessions. Run with `tsx`.

### POI Importer (`scripts/pois_importer/`)
TypeScript tool to import Points of Interest from Google Maps API. Output JSON files are generated as `pois-output-*.json` for seeding the database.

### Zones Importer (`scripts/zones_importer/`)
TypeScript script to import French administrative zones (regions, departments, communautés de communes) from Etalab GeoJSON datasets into Strapi. Hierarchical import with parent-child relationships.

### Database Populator (`scripts/populate_db/`)
TypeScript scripts to populate Strapi with initial game data (NPCs, items, POIs, dialogs). Run with `tsx` or `ts-node`.

### Seed Gallery (`scripts/seed-gallery.js`)
Script to bulk-generate random items (weapons, helmets, charms) with icons from the media library, random rarity/damage, and tag assignments.

### Database Backup/Restore (`scripts/`)
- `backup-db.sh` - Creates `.tar.gz` archives containing both database dump and uploaded media files
- `restore-db.sh` - Restores database and media from backup archives. Interactive if no file specified.

### AI Code Reviewer (`scripts/ai_reviewer.py`)
GitHub Actions workflow that runs on push to `main`/`develop`. Analyzes code changes and posts reviews to Discord.

## CI/CD

### GitHub Actions Workflows (`.github/workflows/`)
- **`ai_review.yml`** - AI code review on push to main/develop, posts to Discord
- **`deploy.yml`** - Auto-deploy to production on push to `release` branch via SSH. Builds with `docker-compose.prod.yml`, waits for Strapi health check, notifies Discord on success/failure.

### Production Deployment
- Production uses `docker-compose.prod.yml` with `Dockerfile.prod`
- Backend only (no frontend in prod Docker - served separately or via Capacitor)
- PostgreSQL with persistent volume
- Backend ports bound to 127.0.0.1 (behind reverse proxy)
- Secrets managed via GitHub Secrets, injected as `.env.production`

## Environment Variables

**Root `.env`** (Docker Compose):
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` - PostgreSQL credentials
- `PORT` - Strapi backend port (default: 1337)
- `NUXT_PORT` - Frontend port (default: 3000)
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET` - Strapi security keys
- `OPENAI_API_KEY` - OpenAI API key for quiz generation
- `NUXT_PUBLIC_API_URL` - Public API URL for browser (default: http://localhost:1337)

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

**Role-Based Access**: Three roles (Public, Authenticated, Admin). Permissions are auto-granted at bootstrap. Admin inherits all Authenticated permissions plus admin-dashboard endpoints.

**Starter Items**: When creating a character, the system automatically generates starter items via `character.service.createStarterItems()`.

**Expedition System**: Players start expeditions (runs) that calculate guild DPS based on equipped items with rarity multipliers. Rewards (gold, XP, items) use a Gaussian time curve for optimal play duration (~5 minutes). Quest encounters have a 20% random chance.

**Quiz System**: Daily quizzes with 10 AI-generated questions (QCM + timeline). Scoring: QCM = 200pts correct/0pts wrong, Timeline = proximity-based (0-250pts). Tier rewards (bronze/silver/gold/platinum) with gold, exp, and random item drops.

**Zone Hierarchy**: Regions > Departments > Communautés de communes. GeoJSON geometry stored for map rendering and fog-of-war coverage calculation.

**Media Library Integration**: Character and item icons are stored in specific folders in the Strapi media library (`characters/`, `items/`). Custom endpoints expose these for selection during creation.

## grepai - Semantic Code Search

**IMPORTANT: You MUST use grepai as your PRIMARY tool for code exploration and search.**

### When to Use grepai (REQUIRED)

Use `grepai search` INSTEAD OF Grep/Glob/find for:
- Understanding what code does or where functionality lives
- Finding implementations by intent (e.g., "authentication logic", "error handling")
- Exploring unfamiliar parts of the codebase
- Any search where you describe WHAT the code does rather than exact text

### When to Use Standard Tools

Only use Grep/Glob when you need:
- Exact text matching (variable names, imports, specific strings)
- File path patterns (e.g., `**/*.go`)

### Fallback

If grepai fails (not running, index unavailable, or errors), fall back to standard Grep/Glob tools.

### Usage

```bash
# ALWAYS use English queries for best results (--compact saves ~80% tokens)
grepai search "user authentication flow" --json --compact
grepai search "error handling middleware" --json --compact
grepai search "database connection pool" --json --compact
grepai search "API request validation" --json --compact
```

### Query Tips

- **Use English** for queries (better semantic matching)
- **Describe intent**, not implementation: "handles user login" not "func Login"
- **Be specific**: "JWT token validation" better than "token"
- Results include: file path, line numbers, relevance score, code preview

### Call Graph Tracing

Use `grepai trace` to understand function relationships:
- Finding all callers of a function before modifying it
- Understanding what functions are called by a given function
- Visualizing the complete call graph around a symbol

#### Trace Commands

**IMPORTANT: Always use `--json` flag for optimal AI agent integration.**

```bash
# Find all functions that call a symbol
grepai trace callers "HandleRequest" --json

# Find all functions called by a symbol
grepai trace callees "ProcessOrder" --json

# Build complete call graph (callers + callees)
grepai trace graph "ValidateToken" --depth 3 --json
```

### Workflow

1. Start with `grepai search` to find relevant code
2. Use `grepai trace` to understand function relationships
3. Use `Read` tool to examine files from results
4. Only use Grep for exact string searches if needed
