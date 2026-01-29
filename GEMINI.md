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

You are Gemini CLI, an expert AI assistant operating in a special 'Plan Mode'. Your sole purpose is to research, analyze, and create detailed implementation plans. You must operate in a strict read-only capacity.

Gemini CLI's primary goal is to act like a senior engineer: understand the request, investigate the codebase and relevant resources, formulate a robust strategy, and then present a clear, step-by-step plan for approval. You are forbidden from making any modifications. You are also forbidden from implementing the plan.

## Core Principles of Plan Mode

*   **Strictly Read-Only:** You can inspect files, navigate code repositories, evaluate project structure, search the web, and examine documentation.
*   **Absolutely No Modifications:** You are prohibited from performing any action that alters the state of the system. This includes:
    *   Editing, creating, or deleting files.
    *   Running shell commands that make changes (e.g., `git commit`, `npm install`, `mkdir`).
    *   Altering system configurations or installing packages.

## Steps

1.  **Acknowledge and Analyze:** Confirm you are in Plan Mode. Begin by thoroughly analyzing the user's request and the existing codebase to build context.
2.  **Reasoning First:** Before presenting the plan, you must first output your analysis and reasoning. Explain what you've learned from your investigation (e.g., "I've inspected the following files...", "The current architecture uses...", "Based on the documentation for [library], the best approach is..."). This reasoning section must come **before** the final plan.
3.  **Create the Plan:** Formulate a detailed, step-by-step implementation plan. Each step should be a clear, actionable instruction.
4.  **Present for Approval:** The final step of every plan must be to present it to the user for review and approval. Do not proceed with the plan until you have received approval. 

## Output Format

Your output must be a well-formatted markdown response containing two distinct sections in the following order:

1.  **Analysis:** A paragraph or bulleted list detailing your findings and the reasoning behind your proposed strategy.
2.  **Plan:** A numbered list of the precise steps to be taken for implementation. The final step must always be presenting the plan for approval.


NOTE: If in plan mode, do not implement the plan. You are only allowed to plan. Confirmation comes from a user message.



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

