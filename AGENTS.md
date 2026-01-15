# AGENTS.md

Guide for agentic coding agents working in the CulturiaQuests repository.

## Build, Lint, and Test Commands

### Docker (Recommended)
```bash
docker-compose up --build        # Start all services
docker-compose up -d --build     # Start in background
docker-compose down              # Stop services
docker-compose logs -f backend   # View backend logs
docker-compose logs -f frontend  # View frontend logs
```

### Backend (Strapi)
```bash
cd backend
npm run build      # Build admin panel (required after schema changes)
npm run develop    # Development server (port 1337)
npm run start      # Production server
npm run console    # Strapi console for manual operations
```

**Important**: Always run `npm run build` after:
- Content-Type schema changes
- Plugin installations
- First installation

### Frontend (Nuxt)
```bash
cd frontend
npm run dev        # Development server (port 3000)
npm run build      # Production build
npm run generate   # Static site generation
npm run preview    # Preview production build
```

### Linting
```bash
cd frontend
npx eslint .       # Lint all files
npx eslint --fix . # Auto-fix linting issues
```

### Testing
**No test framework is currently configured.** Tests should be added using:
- Backend: Jest or Vitest
- Frontend: Vitest (recommended for Nuxt 4)

## Code Style Guidelines

### TypeScript Configuration

**Backend**: Permissive settings (strict: false), CommonJS modules, ES2019 target
**Frontend**: Nuxt-managed config, ESM modules

### Import Order and Style

**Backend** (`backend/src/`):
```typescript
// 1. Strapi core imports
import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';

// 2. No path aliases - use relative imports if needed
// 3. Use 'type' keyword for type-only imports
```

**Frontend** (`frontend/app/`):
```typescript
// 1. Vue/Nuxt core imports
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// 2. Type imports (with 'type' keyword)
import type { Guild } from '~/types/guild'
import type { Character } from '~/types/character'

// 3. Stores (using ~ alias)
import { useGuildStore } from '~/stores/guild'
import { useCharacterStore } from '~/stores/character'

// 4. Composables (using ~ alias)
import { useGeolocation } from '~/composables/useGeolocation'

// 5. Components (using ~ alias)
import PixelButton from '~/components/form/PixelButton.vue'
```

**Key Rules**:
- Frontend: Use `~` alias for all app-level imports
- Always use `type` keyword for type-only imports
- Group imports by category (core → types → stores → composables → components)
- No semicolons in frontend files
- Semicolons required in backend files

### Formatting

- **Indentation**: 2 spaces (both frontend and backend)
- **Semicolons**: Backend yes, Frontend no
- **Quotes**: Single quotes preferred
- **Line Length**: No strict limit, use reasonable judgment
- **Trailing Commas**: Yes (ES5 style)

### Naming Conventions

| Type | Convention | Examples |
|------|-----------|----------|
| **Files: Backend** | kebab-case.ts | `guild.ts`, `character.ts` |
| **Files: Frontend Pages** | kebab-case.vue | `map.vue`, `npc-interaction.vue` |
| **Files: Frontend Components** | PascalCase.vue | `AppHeader.vue`, `PixelButton.vue` |
| **Files: Stores/Composables/Types** | kebab-case.ts | `guild.ts`, `useGeolocation.ts` |
| **Variables/Functions** | camelCase | `userLat`, `fetchGuild()`, `selectedItem` |
| **Constants** | SCREAMING_SNAKE_CASE | `RARITY_MULTIPLIERS`, `BASE_XP_PER_TIER` |
| **Types/Interfaces** | PascalCase | `Character`, `Guild`, `ItemAttributes` |
| **Database Fields** | snake_case | `debug_mode`, `last_opened_at` |

### Type Usage

**Prefer**:
- Interfaces for object shapes: `export interface Character { ... }`
- Type keyword for unions: `type LocationItem = Museum | Poi`
- Explicit type annotations for function parameters and returns
- `any` over `unknown` when type is unclear (project convention)

**Avoid**:
- Using `unknown` (use `any` instead per project convention)
- Implicit `any` without reason
- Overly complex type definitions

### Vue Component Structure

Always use **Composition API with `<script setup>`**:

```vue
<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { Character } from '~/types/character'

// Props
const props = defineProps({
  variant: {
    type: String,
    default: 'filled',
    validator: (v: string) => ['filled', 'outline'].includes(v)
  }
})

// Emits
const emit = defineEmits(['click-item', 'update:modelValue'])

// Composables
const router = useRouter()
const guildStore = useGuildStore()

// State
const loading = ref(false)
const error = ref<string | null>(null)

// Computed
const isValid = computed(() => /* ... */)

// Functions
async function handleSubmit() {
  // Implementation
}

// Lifecycle
onMounted(async () => {
  await guildStore.fetchGuild()
})
</script>

<template>
  <div class="container">
    <!-- Use v-if/v-else, :class with arrays, @event shorthand -->
  </div>
</template>
```

### Pinia Store Structure

Always use **Composition API**:

```typescript
import { defineStore } from 'pinia'
import type { Guild } from '~/types/guild'

export const useGuildStore = defineStore('guild', () => {
  // State (refs)
  const guild = ref<Guild | null>(null)
  const loading = ref(false)
  
  // Getters (computed)
  const hasGuild = computed(() => guild.value !== null)
  
  // Actions (functions)
  function setGuild(data: Guild) {
    guild.value = data
  }
  
  async function fetchGuild() {
    // Implementation
  }
  
  // Return all public API
  return { 
    guild, 
    loading, 
    hasGuild, 
    setGuild, 
    fetchGuild 
  }
}, {
  persist: {
    pick: ['guild']  // Persistence config
  }
})
```

### Error Handling

**Backend Controllers**:
```typescript
async findOne(ctx) {
  const user = ctx.state.user;
  
  if (!user) {
    return ctx.unauthorized('You must be logged in');
  }
  
  if (!document) {
    return ctx.notFound('Guild not found');
  }
  
  // No try/catch in controllers - let Strapi handle errors
}
```

**Backend Services**:
```typescript
async deleteGuildWithRelations(guildDocumentId: string) {
  if (!guild) {
    throw new Error('Guild not found'); // Throw errors in services
  }
  // Use try/catch only when needed
}
```

**Frontend**:
```typescript
const error = ref<string | null>(null)
const loading = ref(false)

try {
  loading.value = true
  error.value = null
  await someOperation()
} catch (e: any) {
  console.error('Operation failed:', e)
  error.value = e?.error?.message || e?.message || 'Default error message'
} finally {
  loading.value = false
}
```

**Error Response Methods** (Backend):
- `ctx.unauthorized(message)` - 401
- `ctx.badRequest(message)` - 400
- `ctx.notFound(message)` - 404
- `ctx.internalServerError(message)` - 500

**Logging**:
- Backend: `strapi.log.error()`, `strapi.log.info()`, `strapi.log.warn()`
- Frontend: `console.error()`, `console.log()`, `console.warn()`

### Strapi v5 Patterns

**ALWAYS use Document Service API** (not Entity Service):

```typescript
// CRUD operations
await strapi.documents('api::guild.guild').findOne({ documentId, ...options })
await strapi.documents('api::guild.guild').findMany(query)
await strapi.documents('api::guild.guild').create({ data: { ... } })
await strapi.documents('api::guild.guild').update({ documentId, data: { ... } })
await strapi.documents('api::guild.guild').delete({ documentId })

// Use strapi.db.query() for complex filters/counts
await strapi.db.query('api::guild.guild').findOne({ where: { ... } })
```

**Controller Structure**:
```typescript
export default factories.createCoreController('api::guild.guild', ({ strapi }) => ({
  async customAction(ctx) {
    const user = ctx.state.user;
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const results = await strapi.documents('api::guild.guild').findMany(sanitizedQuery);
    const sanitizedEntity = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedEntity);
  }
}));
```

### Documentation Style

Use JSDoc for exported functions:

```typescript
/**
 * Fetches the guild data for the current authenticated user
 * @returns Promise that resolves when fetch completes
 */
async function fetchGuild() {
  // Implementation
}
```

**Comment Guidelines**:
- English for technical documentation
- French for user-facing messages and game logic explanations
- Use numbered steps (1., 2., 3.) for complex multi-step operations
- Inline comments for complex logic only

### Additional Best Practices

1. **User Data Isolation**: Controllers MUST filter by authenticated user to prevent cross-user data access
2. **Populate Relations**: Always specify populate parameters for related data
3. **Sanitize I/O**: Use `sanitizeQuery()` and `sanitizeOutput()` in controllers
4. **Environment Variables**: Use `.env` files, never commit secrets
5. **Media Library**: Store character/item icons in specific folders (`characters/`, `items/`)
6. **Database Fields**: Use snake_case for custom fields in Strapi schemas
7. **Tailwind Classes**: Extensively used in frontend templates

### Common Gotchas

- **Admin panel corruption**: Delete `.strapi`, `dist`, `node_modules` in backend, then `npm install && npm run build`
- **Hot reload issues**: Set `CHOKIDAR_USEPOLLING=true` for frontend in Docker
- **Database connection fails**: Ensure PostgreSQL healthcheck passes before backend starts
- **Type errors**: Backend uses `strict: false`, so be careful with implicit any
- **Document vs Entity Service**: Strapi v5 requires `strapi.documents()`, not `strapi.entityService()`
